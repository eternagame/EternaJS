import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import SecStruct from 'eterna/rnatypes/SecStruct';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface CrossedJunctionStatus extends BaseConstraintStatus{
    totalJunctions: number;
    crossedJunctions: number;
}

// See SecStruct.getCrossedPairs
function crosses(a: [number, number], b: [number, number]): boolean {
    return (a[0] < b[0] && b[0] < a[1] && a[1] < b[1])
        || (b[0] < a[0] && a[0] < b[1] && b[1] < a[1]);
}

// Residues that participate in any crossed pair, from the full structure.
function crossedResidues(pairs: SecStruct): Set<number> {
    const crossed = pairs.getCrossedPairs();
    const res = new Set<number>();
    for (let i = 0; i < crossed.length; i++) {
        if (crossed.pairingPartner(i) >= 0) res.add(i);
    }
    return res;
}

// Split pairs into non-crossing layers, longest stems first, so the nested
// backbone occupies layer 0 and pseudoknot stems fall to later layers.
function separateLayers(pairs: SecStruct): SecStruct[] {
    const stems: [number, number][][] = pairs.stems();
    // Sort stems first by length, then by which stem is positioned first
    stems.sort(
        (s1, s2) => (s2.length - s1.length) || Math.min(...s1.flat()) - Math.min(...s2.flat())
    );

    const layers: [number, number][][] = [];
    for (const stem of stems) {
        let placed = false;
        for (const layer of layers) {
            if (stem.every((bp) => layer.every((o) => !crosses(bp, o)))) {
                layer.push(...stem);
                placed = true;
                break;
            }
        }
        if (!placed) layers.push([...stem]);
    }

    return layers.map((layer) => {
        const ss = new SecStruct(new Array<number>(pairs.length).fill(-1));
        for (const [a, b] of layer) ss.setPairingPartner(a, b);
        return ss;
    });
}

// Adjacent pairs and unpaired bases in the loop or quad spanning the open interval (lo, hi).
function immediateChildren(layer: SecStruct, lo: number, hi: number): [[number, number][], number[]] {
    const pairs: [number, number][] = [];
    const unpaired: number[] = [];
    let k = lo + 1;
    while (k < hi) {
        const partner = layer.pairingPartner(k);
        if (partner === -1) {
            unpaired.push(k);
            k += 1;
        } else if (partner > k) {
            pairs.push([k, partner]);
            // We want to continue around the loop/quad, so we skip to the pairing partner of this base
            k = partner + 1;
        } else {
            // Skip pseudoknotted pairs (which in this case, we should have filtered out anyways)
            k += 1;
        }
    }
    return [pairs, unpaired];
}

// Qualifying junctions (>=3-way multiloops + >=3-stem exterior loop) in one layer.
function findJunctions(layer: SecStruct) {
    const junctions = [];

    for (let i = 0; i < layer.length; i++) {
        const partner = layer.pairingPartner(i);
        if (partner <= i) continue;

        // For every pair in the structure, we find its child elements, which might be a single pair
        // (if we're in the middle of a stack), or some unpaired bases and a pair (internal loop/bulge),
        // or a bunch of pairs and maybe some unpaired bases (a multiloop, what we're looking for)
        const [pairs, unpaired] = immediateChildren(layer, i, partner);
        if (pairs.length >= 2) {
            junctions.push(new Set([
                i, partner,
                ...pairs.flat(),
                ...unpaired
            ]));
        }
    }

    const [extPairs, extUnpaired] = immediateChildren(layer, -1, layer.length);
    if (extPairs.length >= 3) {
        junctions.push(new Set([
            ...extPairs.flat(),
            ...extUnpaired
        ]));
    }

    return junctions;
}

export default class CrossedJunctionConstraint extends Constraint<CrossedJunctionStatus> {
    public static readonly NAME = 'CROSSED_JUNCTION_PERCENT';
    public readonly minPercent: number;

    constructor(minPercent: number) {
        super();
        this.minPercent = minPercent;
    }

    public evaluate(context: ConstraintContext): CrossedJunctionStatus {
        // TODO: Multistate?
        const undoBlock = context.undoBlocks[0];
        const pseudoknots = (undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot');

        const pairs = undoBlock.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots);
        const crossed = crossedResidues(pairs);
        const layers = separateLayers(pairs);

        let total = 0;
        let ok = 0;
        for (const layer of layers) {
            for (const junction of findJunctions(layer)) {
                total += 1;
                for (const residue of junction) {
                    if (crossed.has(residue)) {
                        ok += 1;
                        break;
                    }
                }
            }
        }

        return {
            // No qualifying junction => trivially satisfied.
            satisfied: total === 0 ? true : (ok / total) * 100 >= this.minPercent,
            totalJunctions: total,
            crossedJunctions: ok
        };
    }

    public getConstraintBoxConfig(status: CrossedJunctionStatus): ConstraintBoxConfig {
        const statText = ConstraintBox.createTextStyle()
            .append(`${status.crossedJunctions}`, {fill: status.satisfied ? 0x00aa00 : 0xaa0000})
            .append(`/${status.totalJunctions}`);

        return {
            satisfied: status.satisfied,
            tooltip: `${this.minPercent}% of all multiway junctions must be crossed by a pseudoknot.`,
            statText,
            icon: BitmapManager.getBitmap(Bitmaps.CrossedJunctionReqIcon),
            drawBG: true,
            showOutline: true
        };
    }

    public serialize(): [string, string] {
        return [
            CrossedJunctionConstraint.NAME,
            this.minPercent.toString()
        ];
    }
}
