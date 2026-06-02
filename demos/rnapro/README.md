# RNAPro 3D-structure demo

Edit an RNA sequence in EternaJS → the sequence is folded by an external **RNAPro** 3D-structure
daemon → the predicted 3D is converted to secondary structure with **x3dna-dssr** → the game shows
**both the 2D and the 3D**. The 3D view auto-opens, **morphs smoothly** between structures as you
edit (USalign-aligned), and has a **Download PDB** button. Pilot puzzle: a single 8-nt design.

This folder is the glue + tests; the EternaJS-side code is in the repo (`src/eterna/...`, this branch).
A screen recording of the working demo is available on request (kept out of git for size).

## Architecture

```
Browser: EternaJS (localhost:63343, ?rnaprodemo=1)
  ├─ inline 8-nt puzzle (no server/DB), engine = "RNAPro", natural mode
  ├─ edit → RNAProFolder.foldSequence() → GET bridge /fold → dssr dot-bracket → 2D
  ├─ 3D auto-opens (NGL Pose3DDialog) with status + "Download PDB" INSIDE it
  └─ any pose change (edit / cached seq / undo / redo) → PoseEditMode.updateScore() →
       refresh3DForCurrentPose() → bridge POST /morph → smooth ~0.7s coordinate morph
                         │
                         ▼
Bridge  rnapro_bridge.py (localhost:8788, CORS)
  GET  /fold   → POST daemon /predict → read pdb path → x3dna-dssr → {secstruct, pdb text, c1_coords}
  POST /morph  → USalign-superpose target onto current → {aligned pdb, morph_from, morph_to}
                         │
                         ▼
RNAPro daemon (localhost:8765)  → predicts 3D, returns cif/pdb paths   (external; see Prerequisites)
```

The bridge exists because the browser can't call the no-CORS daemon, can't read the daemon's
returned file *paths*, and can't run `x3dna-dssr` / `USalign`.

### EternaJS-side changes (this branch)
- New `src/eterna/folding/RNAProFolder.ts` — async folding engine; folds via the bridge, returns the
  dssr 2D, and exposes `requestMorph()` + a download helper.
- `src/eterna/pose3D/Pose3DDialog.ts` — `updateStructure()` reloads + morphs (NGL `updatePosition`),
  with an in-window status line + Download button.
- `src/eterna/mode/PoseEdit/PoseEditMode.ts` — `openRNAPro3D()` (auto-shown) and
  `refresh3DForCurrentPose()` (called from `updateScore()`, the same hook that drives the 2D).
- `src/eterna/pose3D/BaseHighlightGroup.ts` — `repositionChangedHighlights()` so changed-base
  outlines travel with their bases during the morph.
- `src/eterna/EternaApp.ts` — registers the engine, adds the `rnapro_demo` app mode +
  `loadRNAProDemo()` (inline 8-nt puzzle, no server), and `__eternaDemo` console/test hooks.
- `src/index.html.tmpl` — `?rnaprodemo` launches the demo and hides chat.

## Prerequisites

| Need | Notes |
|------|-------|
| **RNAPro daemon** | External, machine-specific. A resident process on `:8765` exposing `POST /predict {target_id,sequence,n_cycle,n_step}` → `{ok,pdb,cif,c1_coords}`. `run_demo.sh` launches it via `RNAPRO_PYTHON` / `RNAPRO_SERVE` / `RNAPRO_CWD` (defaults point at the original dev box). |
| **x3dna-dssr** | on `PATH` (or edit the fallback in `rnapro_bridge.py`). |
| **USalign** | on `PATH` (or edit the fallback in `rnapro_bridge.py`). |
| **Node 22** | `brew install node@22`. |
| **EternaJS deps** | from the repo root: `npm install` (pulls the prebuilt private folding engines), then create `.env.local` with `ENGINE_LOCATION=package` (the non-obvious gotcha — `local` points at empty stubs). |

## Run

```bash
# from the repo root, once:
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install
printf 'ENGINE_LOCATION=package\nDEBUG_PLAYER_ID=\nDEBUG_PLAYER_PASSWORD=\n' > .env.local

# then:
demos/rnapro/run_demo.sh      # starts daemon(:8765) + bridge(:8788) + dev server(:63343)
```
Open **http://localhost:63343/?rnaprodemo=1**. Edit bases, or from the JS console:
```js
__eternaDemo.setSequence('GGGAAACC')   // fold + morph
__eternaDemo.undo(); __eternaDemo.redo(); __eternaDemo.downloadPDB()
window.__rnaproMorphMs = 2000          // slow the morph (default 700 ms)
```
Logs: `/tmp/rnapro_daemon.log`, `/tmp/rnapro_bridge.log`, `/tmp/eterna_dev.log`.

## Tests (Playwright, real Chrome)

```bash
cd demos/rnapro/e2e && npm install
npx playwright test            # HEADFUL=1 to watch
```
- `baseline.spec.ts` — stock EternaJS loads/renders (toolchain gate)
- `rnapro.spec.ts` — RNAPro path end-to-end (daemon → bridge → 2D consistency → 3D → download → 2nd seq)
- `morph.spec.ts` — 3D auto-shows + auto-refreshes on edit
- `sync.spec.ts` — 3D stays in sync with 2D across edit / cached seq / undo / redo

## Notes / limitations (pilot)

- RNAPro folds each new sequence (~5–12 s on CPU for 8 nt); cached sequences skip the daemon but still morph.
- 3D refresh is gated to **natural mode** (the RNAPro structure *is* the natural fold; target mode has no 3D).
- The morph interpolates the backbone smoothly; atoms unique to a *mutated* base snap. Alignment uses
  USalign (a Kabsch fallback would be a small drop-in).
- The demo puzzle is `EXPERIMENTAL` type so solving doesn't try to submit to the (absent) server.
- `GameWindow` has no minimize, so the 3D panel has none.
