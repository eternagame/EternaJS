#!/usr/bin/env bash
# Bring up the Eterna <-> RNAPro 3D demo stack:
#   1) RNAPro daemon  (:8765)   - resident structure-prediction model (external; see README)
#   2) bridge         (:8788)   - daemon + x3dna-dssr + USalign glue, CORS for the browser
#   3) EternaJS dev   (:63343)  - the game client (webpack dev server, from the repo root)
# Then prints the demo URL. Re-running is safe: it only starts what isn't already up.
#
# This script lives at <EternaJS>/demos/rnapro/ and launches the dev server from the repo root.
# The RNAPro daemon is machine-specific; override the paths below with env vars as needed.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"     # the EternaJS checkout (this branch)
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

# --- RNAPro daemon location (override per machine) ---
RNAPRO_PYTHON="${RNAPRO_PYTHON:-/opt/miniconda3/envs/rnapro/bin/python}"
RNAPRO_SERVE="${RNAPRO_SERVE:-$HOME/rnapro_work/rnapro_serve.py}"
RNAPRO_CWD="${RNAPRO_CWD:-$HOME/src/RNAPro}"

up() { curl -s --max-time 3 "$1" >/dev/null 2>&1; }

echo "== 1) RNAPro daemon (:8765) =="
if up http://127.0.0.1:8765/health; then
    echo "   already running"
elif [ -f "$RNAPRO_SERVE" ] && [ -x "$RNAPRO_PYTHON" ]; then
    echo "   starting (model build ~25-30s)…"
    ( cd "$RNAPRO_CWD" && nohup "$RNAPRO_PYTHON" "$RNAPRO_SERVE" > /tmp/rnapro_daemon.log 2>&1 & )
    for i in $(seq 1 60); do up http://127.0.0.1:8765/health && break; sleep 2; done
    up http://127.0.0.1:8765/health && echo "   up" || echo "   FAILED — see /tmp/rnapro_daemon.log"
else
    echo "   NOT FOUND ($RNAPRO_SERVE). Set up RNAPro and/or RNAPRO_PYTHON/RNAPRO_SERVE/RNAPRO_CWD."
fi

echo "== 2) bridge (:8788) =="
if up http://127.0.0.1:8788/health; then
    echo "   already running"
else
    nohup python3 "$HERE/rnapro_bridge.py" > /tmp/rnapro_bridge.log 2>&1 &
    sleep 2
    up http://127.0.0.1:8788/health && echo "   up" || echo "   FAILED — see /tmp/rnapro_bridge.log"
fi

echo "== 3) EternaJS dev server (:63343) =="
if up http://localhost:63343/; then
    echo "   already running"
else
    echo "   starting webpack (first compile ~30-60s)…"
    ( cd "$REPO_ROOT" && NODE_OPTIONS=--max_old_space_size=4096 nohup npm run start \
        > /tmp/eterna_dev.log 2>&1 & )
    for i in $(seq 1 120); do
        grep -q "compiled successfully" /tmp/eterna_dev.log 2>/dev/null && break; sleep 2;
    done
    up http://localhost:63343/ && echo "   up" || echo "   FAILED — see /tmp/eterna_dev.log"
fi

echo
echo "Demo ready:"
echo "   RNAPro demo : http://localhost:63343/?rnaprodemo=1"
echo "   Baseline    : http://localhost:63343/?puzzle=4350940"
echo "Served/downloaded structures land in: $HERE/structures/"
