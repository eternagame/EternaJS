#!/usr/bin/env python3
"""
Bridge service for the Eterna <-> RNAPro 3D-structure demo.

The browser (EternaJS at http://localhost:63343) cannot (a) call the RNAPro daemon directly
(no CORS), (b) read the daemon's returned file *paths*, or (c) run the x3dna-dssr binary. This
bridge owns all three: it forwards a sequence to the RNAPro daemon, derives secondary structure
from the predicted 3D with x3dna-dssr (same logic as daslab_tools/structure/dssr.py), reads the
PDB into text, and returns everything the client needs as JSON.

Run:
    python3 rnapro_bridge.py            # serves on http://127.0.0.1:8788
Fold (the client does this):
    curl -s 'http://localhost:8788/fold?id=puzzle8&seq=GGGAAACC'
Health:
    curl -s http://localhost:8788/health
"""
import os
import json
import shutil
import tempfile
import subprocess
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("BRIDGE_PORT", "8788"))
DAEMON_URL = os.environ.get("RNAPRO_DAEMON_URL", "http://127.0.0.1:8765/predict")
DSSR = shutil.which("x3dna-dssr") or "/Users/rhiju/src/x3dna-v2.4/bin/x3dna-dssr"
STRUCTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "structures")
os.makedirs(STRUCTURES_DIR, exist_ok=True)

# Defaults tuned for fast turnaround on a tiny (~8 nt) puzzle on the CPU daemon.
DEFAULT_N_CYCLE = int(os.environ.get("RNAPRO_N_CYCLE", "4"))
DEFAULT_N_STEP = int(os.environ.get("RNAPRO_N_STEP", "50"))

USALIGN = shutil.which("USalign") or "/Users/rhiju/src/USalign/USalign"
# Previous predicted PDB (already aligned into a stable frame) per target_id, for morphing.
_prev_pdb_by_id: dict[str, str] = {}


def _parse_atoms(pdb_text: str):
    """Return list of (resseq:str, atomname:str, x, y, z) for ATOM/HETATM records, in file order."""
    out = []
    for line in pdb_text.splitlines():
        if line.startswith(("ATOM", "HETATM")) and len(line) >= 54:
            try:
                out.append((
                    line[22:26].strip(), line[12:16].strip(),
                    float(line[30:38]), float(line[38:46]), float(line[46:54]),
                ))
            except ValueError:
                pass
    return out


def _apply_matrix(pdb_text: str, t, u) -> str:
    """Rewrite ATOM/HETATM coordinates by X = t + u·x (USalign's Structure_1 -> Structure_2)."""
    lines = []
    for line in pdb_text.splitlines():
        if line.startswith(("ATOM", "HETATM")) and len(line) >= 54:
            try:
                x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])
                nx = t[0] + u[0][0] * x + u[0][1] * y + u[0][2] * z
                ny = t[1] + u[1][0] * x + u[1][1] * y + u[1][2] * z
                nz = t[2] + u[2][0] * x + u[2][1] * y + u[2][2] * z
                line = f"{line[:30]}{nx:8.3f}{ny:8.3f}{nz:8.3f}{line[54:]}"
            except ValueError:
                pass
        lines.append(line)
    return "\n".join(lines) + "\n"


def _usalign_matrix(mobile_pdb: str, target_pdb: str):
    """Run USalign(mobile -> target); return (t[3], u[3][3]) or None on failure."""
    with tempfile.TemporaryDirectory() as td:
        mp, tp = os.path.join(td, "m.pdb"), os.path.join(td, "t.pdb")
        mat = os.path.join(td, "mat.txt")
        open(mp, "w").write(mobile_pdb)
        open(tp, "w").write(target_pdb)
        subprocess.run([USALIGN, mp, tp, "-m", mat, "-ter", "0"], cwd=td,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        if not os.path.isfile(mat):
            return None
        rows = []
        for line in open(mat):
            parts = line.split()
            if len(parts) == 5 and parts[0] in ("0", "1", "2"):
                try:
                    rows.append([float(p) for p in parts[1:]])
                except ValueError:
                    return None
        if len(rows) != 3:
            return None
        t = [rows[0][0], rows[1][0], rows[2][0]]
        u = [rows[0][1:], rows[1][1:], rows[2][1:]]
        return t, u


def build_morph(prev_pdb: str, new_pdb: str):
    """Align new onto prev (USalign), then return (aligned_new_pdb, morph_from, morph_to) where the
    morph arrays are flat [x,y,z,...] in aligned-new atom order: matched atoms (same resseq+name)
    interpolate from their previous position; unmatched (e.g. a mutated base) stay put (snap)."""
    mat = _usalign_matrix(new_pdb, prev_pdb)
    if mat is None:
        return new_pdb, None, None
    aligned = _apply_matrix(new_pdb, mat[0], mat[1])
    prev_pos = {(r, a): (x, y, z) for (r, a, x, y, z) in _parse_atoms(prev_pdb)}
    morph_from, morph_to = [], []
    for (r, a, x, y, z) in _parse_atoms(aligned):
        morph_to += [x, y, z]
        fx, fy, fz = prev_pos.get((r, a), (x, y, z))
        morph_from += [fx, fy, fz]
    return aligned, morph_from, morph_to


def call_daemon(target_id: str, sequence: str, n_cycle: int, n_step: int) -> dict:
    """POST the sequence to the resident RNAPro daemon; returns its JSON response."""
    body = json.dumps({
        "target_id": target_id,
        "sequence": sequence,
        "use_template": "None",   # de novo, correct for a short design puzzle
        "n_cycle": n_cycle,
        "n_step": n_step,
    }).encode()
    req = urllib.request.Request(DAEMON_URL, data=body,
                                 headers={"Content-Type": "application/json"})
    # Daemon is ~5-6s warm for 8 nt, but allow generous slack for longer seqs / first call.
    with urllib.request.urlopen(req, timeout=600) as resp:
        return json.loads(resp.read())


def dssr_secstruct(pdb_path: str, seq_len: int) -> tuple[str, str]:
    """Run x3dna-dssr on a PDB and return (dot_bracket, sequence). Mirrors dssr.py:
    x3dna-dssr writes dssr-2ndstrs.dbn with line[1]=sequence, line[2]=dot-bracket. We run it
    in a temp dir to avoid polluting CWD and to be safe under concurrency."""
    with tempfile.TemporaryDirectory() as td:
        subprocess.run([DSSR, f"-i={pdb_path}"], cwd=td,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        dbn = os.path.join(td, "dssr-2ndstrs.dbn")
        if os.path.isfile(dbn):
            lines = open(dbn).read().splitlines()
            if len(lines) >= 3:
                return lines[2].strip(), lines[1].strip()
    # Fallback: dssr found nothing (plausible for a tiny structure) -> all-unpaired so the
    # client still renders something of the right length.
    return "." * seq_len, ""


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, obj: dict):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/morph":
            return self._send(404, {"ok": False, "error": "POST /morph {from_pdb,to_pdb}"})
        try:
            n = int(self.headers.get("Content-Length", 0))
            req = json.loads(self.rfile.read(n) or b"{}")
            from_pdb = req.get("from_pdb") or ""
            to_pdb = req.get("to_pdb") or ""
            if not from_pdb or not to_pdb:
                return self._send(400, {"ok": False, "error": "need from_pdb and to_pdb"})
            # Superpose `to` onto `from` (USalign) and build interpolation endpoints in to-atom order.
            aligned, morph_from, morph_to = build_morph(from_pdb, to_pdb)
            print(f"[bridge] /morph -> morph={'yes' if morph_from else 'no'}", flush=True)
            return self._send(200, {
                "ok": True, "pdb": aligned, "morph_from": morph_from, "morph_to": morph_to,
            })
        except Exception as e:  # noqa: BLE001
            import traceback
            traceback.print_exc()
            return self._send(500, {"ok": False, "error": f"{type(e).__name__}: {e}"})

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            return self._send(200, {"ok": True, "daemon": DAEMON_URL, "dssr": DSSR})
        if parsed.path != "/fold":
            return self._send(404, {"ok": False, "error": "use GET /fold?seq=...&id=... or /health"})

        q = parse_qs(parsed.query)
        seq = (q.get("seq", [""])[0] or "").strip().upper().replace("T", "U")
        target_id = (q.get("id", ["eterna"])[0] or "eterna").strip()
        # keep target_id filesystem/daemon safe
        target_id = "".join(c for c in target_id if c.isalnum() or c in "_-") or "eterna"
        n_cycle = int(q.get("n_cycle", [DEFAULT_N_CYCLE])[0])
        n_step = int(q.get("n_step", [DEFAULT_N_STEP])[0])

        if not seq or any(c not in "ACGU" for c in seq):
            return self._send(400, {"ok": False, "error": f"invalid sequence: {seq!r}"})

        try:
            print(f"[bridge] /fold id={target_id} seq={seq} ({len(seq)} nt) "
                  f"n_cycle={n_cycle} n_step={n_step}", flush=True)
            dres = call_daemon(target_id, seq, n_cycle, n_step)
            if not dres.get("ok"):
                return self._send(502, {"ok": False, "error": f"daemon: {dres.get('error')}"})
            pdb_path = dres.get("pdb")
            if not pdb_path or not os.path.exists(pdb_path):
                return self._send(502, {"ok": False, "error": f"daemon returned no pdb ({pdb_path})"})

            secstruct, dssr_seq = dssr_secstruct(pdb_path, len(seq))
            pdb_text = open(pdb_path).read()

            # keep a local copy of every prediction for inspection / download. Alignment + morphing
            # between structures is handled on demand by POST /morph (so undo/redo and cached
            # structures morph too), not here.
            saved = os.path.join(STRUCTURES_DIR, f"{target_id}.pdb")
            try:
                open(saved, "w").write(pdb_text)
            except OSError:
                saved = None

            print(f"[bridge]  -> dssr={secstruct} walltime={dres.get('walltime_s')}s", flush=True)
            return self._send(200, {
                "ok": True,
                "target_id": target_id,
                "sequence": seq,
                "secstruct": secstruct,
                "dssr_sequence": dssr_seq,
                "pdb": pdb_text,
                "c1_coords": dres.get("c1_coords"),
                "walltime_s": dres.get("walltime_s"),
                "saved_pdb": saved,
            })
        except Exception as e:  # noqa: BLE001 - surface any failure to the client
            import traceback
            traceback.print_exc()
            return self._send(500, {"ok": False, "error": f"{type(e).__name__}: {e}"})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"[bridge] listening on http://127.0.0.1:{PORT}  (daemon={DAEMON_URL}, dssr={DSSR})",
          flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
