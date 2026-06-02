import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import Folder, {CacheKey} from './Folder';

/**
 * RNAPro folding engine for the local demo.
 *
 * Instead of folding in-browser, this asks an external bridge service (rnapro_bridge.py) to run
 * the RNAPro 3D-structure daemon and derive the secondary structure from the predicted 3D with
 * x3dna-dssr. foldSequence returns that dssr-derived secondary structure (so Eterna renders it as
 * 2D); the predicted PDB + C1' coordinates are stashed on `window.__rnaproLatest` and broadcast via
 * a `rnapro:structure` event so the 3D viewer and the download button can pick them up.
 */
export const RNAPRO_BRIDGE_URL = (
    (typeof process !== 'undefined' && process.env && process.env.RNAPRO_BRIDGE_URL)
    || 'http://localhost:8788/fold'
);

export interface RNAProResult {
    sequence: string;
    secstruct: string;
    pdb: string;
    c1Coords: number[][] | null;
    walltimeS: number | null;
}

const RNAPRO_MORPH_URL = RNAPRO_BRIDGE_URL.replace(/\/fold$/, '/morph');

/**
 * Ask the bridge to superpose `toPdb` onto `fromPdb` (USalign) and return morph endpoints for a
 * smooth transition. Computed on demand so ANY structure change morphs — fresh fold, cached
 * structure, undo/redo. Returns the aligned target PDB plus flat [x,y,z,...] from/to arrays.
 */
export async function requestMorph(
    fromPdb: string, toPdb: string
): Promise<{pdb: string; morphFrom: number[] | null; morphTo: number[] | null}> {
    const resp = await fetch(RNAPRO_MORPH_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({from_pdb: fromPdb, to_pdb: toPdb})
    });
    const data = await resp.json();
    if (!data || !data.ok) throw new Error((data && data.error) || `morph HTTP ${resp.status}`);
    return {pdb: data.pdb, morphFrom: data.morph_from ?? null, morphTo: data.morph_to ?? null};
}

const _store = new Map<string, RNAProResult>();

export function getRNAProResult(seqStr: string): RNAProResult | undefined {
    return _store.get(seqStr);
}

/** Download the latest predicted PDB as a file (used by the demo's 3D-panel button and tests). */
export function downloadRNAProPDB(): void {
    if (typeof window === 'undefined') return;
    const r = (window as unknown as {__rnaproLatest?: RNAProResult}).__rnaproLatest;
    if (!r || !r.pdb) return;
    const blob = new Blob([r.pdb], {type: 'chemical/x-pdb'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rnapro_${r.sequence}.pdb`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
}

function publishResult(result: RNAProResult): void {
    _store.set(result.sequence, result);
    if (typeof window !== 'undefined') {
        (window as unknown as {__rnaproLatest?: RNAProResult}).__rnaproLatest = result;
        window.dispatchEvent(new CustomEvent('rnapro:structure', {detail: result}));
    }
}

export default class RNAProFolder extends Folder<false> {
    public static readonly NAME: string = 'RNAPro';

    public static async create(): Promise<RNAProFolder | null> {
        return new RNAProFolder();
    }

    public get name(): string {
        return RNAProFolder.NAME;
    }

    public get isFunctional(): boolean {
        return true;
    }

    public canScoreStructures(): boolean {
        return false;
    }

    public get canDotPlot(): boolean {
        return false;
    }

    public get canPseudoknot(): boolean {
        return true;
    }

    protected readonly _isSync = false;

    public async foldSequence(seq: Sequence): Promise<SecStruct> {
        const seqStr = seq.sequenceString();
        const key: CacheKey = {primitive: 'fold', seq: seqStr};
        const cached = this.getCache(key) as SecStruct;
        if (cached != null) {
            const prev = _store.get(seqStr);
            // Re-broadcast so the latest-pointer/status re-sync. The 3D morph is driven by the pose
            // update (PoseEditMode.updateScore), which morphs from the shown structure to this one.
            if (prev) publishResult(prev);
            return cached.slice(0);
        }

        try {
            const url = `${RNAPRO_BRIDGE_URL}?id=eterna&seq=${encodeURIComponent(seqStr)}`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (!data || !data.ok) {
                throw new Error((data && data.error) || `bridge HTTP ${resp.status}`);
            }
            const dotBracket: string = data.secstruct || '.'.repeat(seq.length);
            publishResult({
                sequence: seqStr,
                secstruct: dotBracket,
                pdb: data.pdb,
                c1Coords: data.c1_coords ?? null,
                walltimeS: data.walltime_s ?? null
            });
            const ss = SecStruct.fromParens(dotBracket, true);
            this.putCache(key, ss.slice(0));
            return ss;
        } catch (e) {
            // Don't break the game if the daemon/bridge is down: render everything unpaired.
            // eslint-disable-next-line no-console
            console.error('[RNAProFolder] fold failed:', e);
            return SecStruct.fromParens('.'.repeat(seq.length), false);
        }
    }
}
