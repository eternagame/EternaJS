import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import EPars from 'eterna/EPars';
import {Assert} from 'flashbang';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface BoostConstraintStatus extends BaseConstraintStatus {
    boostCount: number;
}

class Loop {
    public isBoosted: boolean[];
    public strands: EPars[][];
    public pairs: [number, number][];

    constructor(boosted: boolean[], strands: EPars[][], pairs: [number, number][]) {
        this.isBoosted = boosted;
        this.strands = strands;
        this.pairs = pairs;
    }

    public clone() {
        return new Loop(
            this.isBoosted.slice(),
            this.strands.slice(),
            this.pairs.slice()
        );
    }
}

function detectLoops(targetPairs: number[], loops: Loop[]) {
    loops.splice(0);
    let loopStack: Loop[] = [];
    let tmpPairs = targetPairs.slice();
    let lastPair: [number, number] | null = null;
    let examiningLoops = false;

    const clonePair = (obj: [number, number]) => [obj[0], obj[1]] as [number, number];

    for (let i = 0; i < tmpPairs.length; ++i) {
        if (tmpPairs[i] === -1 && !examiningLoops && lastPair !== null) {
            // Found a loop!
            let l: Loop = new Loop([false], [], [clonePair(lastPair)]);
            lastPair = null;

            // Find the rest of the unpaired bases in the first strand.
            let arr = [];
            for (i; i < tmpPairs.length; ++i) {
                if (tmpPairs[i] !== -1) break;
                arr.push(i);
            }
            --i;
            l.strands.push(arr.slice());
            loopStack.push(l);
            examiningLoops = true;
        } else if (tmpPairs[i] >= 0 && tmpPairs[i + 1] >= 0
                     && Math.abs(tmpPairs[i] - tmpPairs[i + 1]) > 1 && lastPair !== null && !examiningLoops) {
            // Special case where the free bases are on the OTHER side while on initial strand, we have
            // two pairs in a row.
            const l: Loop = new Loop([false], [], [[i, tmpPairs[i]]]);
            lastPair = null;
            loopStack.push(l);
            examiningLoops = true;
        } else if (tmpPairs[i] === -1 && examiningLoops) {
            // Add bases to a new strand in the current loop.
            let arr = [];
            for (i; i < tmpPairs.length; ++i) {
                if (tmpPairs[i] !== -1) break;
                arr.push(i);
            }
            --i;
            loopStack[loopStack.length - 1].strands.push(arr.slice());
        } else if (i < tmpPairs[i]) { // Make sure we don't count pairs twice
            lastPair = [i, tmpPairs[i]];
            if (examiningLoops) {
                loopStack[loopStack.length - 1].pairs.push(clonePair(lastPair));
            }
            examiningLoops = false;
        } else if (loopStack.length > 0) {
            if (i === loopStack[loopStack.length - 1].pairs[0][1]) {
                // Found last pair that needs to be encountered - loop finished.
                const loop: Loop | undefined = loopStack.pop();
                // This should never happen, given that we check loopStack.length > 0
                Assert.assertIsDefined(loop);
                loops.push(loop.clone());
                examiningLoops = false;
            }
            if (loopStack.length > 0) {
                for (let j = 0; j < loopStack[loopStack.length - 1].pairs.length; ++j) {
                    // Closing off a pair that is part of the loop but is not the last loop.
                    if (i === loopStack[loopStack.length - 1].pairs[j][1]) {
                        examiningLoops = true;
                        break;
                    }
                }
            }
        }
    }

    return loops;
}

let loops: Loop[][] = [];
function countLoops(targetPairs: number[], currentTargetIndex: number, sequence: number[]) {
    if (!targetPairs) {
        return 0;
    }

    let ret = 0;
    if (!loops[currentTargetIndex]) {
        loops[currentTargetIndex] = [];
        detectLoops(targetPairs, loops[currentTargetIndex]);
    }

    for (let i = 0; i < loops[currentTargetIndex].length; ++i) {
        // Check that the pairs are made first.
        const loop = loops[currentTargetIndex][i];

        // There has to be at least one strand.
        if (loop.strands.length <= 0) {
            continue;
        }

        let pairs = loop.pairs;
        if (loop.strands.length === 2 && loop.strands[0].length === 1 && loop.strands[1].length === 1) {
            // 1-1 Loops. Need G-G terminal mismatch.
            if (sequence[loop.strands[0][0] as number] === EPars.RNABASE_GUANINE
                    && sequence[loop.strands[1][0] as number] === EPars.RNABASE_GUANINE) {
                ++ret;
                loop.isBoosted[0] = true;
            } else {
                loop.isBoosted[0] = false;
            }
        } else if (pairs.length === 1 && loop.strands.length === 1) {
            // Hairpin loops. G-A terminal mismatch (with the G at the lowest index).
            if (sequence[loop.strands[0][0] as number] === EPars.RNABASE_GUANINE
                    && sequence[loop.strands[0][loop.strands[0].length - 1] as number] === EPars.RNABASE_ADENINE) {
                ++ret;
                loop.isBoosted[0] = true;
            } else {
                loop.isBoosted[0] = false;
            }
        } else if (pairs.length >= 2 && loop.strands.length >= 2) {
            // Internal Loop and Multiloop. G-A terminal mismatches at both stack locations.
            for (let j = 0; j < pairs.length; ++j) {
                let idx1 = -1;
                let idx2 = -1;
                if (j === 0) {
                    idx1 = pairs[j][0] + 1;
                    idx2 = pairs[j][1] - 1;
                } else {
                    idx1 = pairs[j][0] - 1;
                    idx2 = pairs[j][1] + 1;
                }

                // Make sure that both of these indices are unpaired in target mode.
                if (targetPairs[idx1] !== -1
                         || targetPairs[idx2] !== -1) {
                    continue;
                }

                // Check for G-A mismatch.
                if ((sequence[idx1] === EPars.RNABASE_GUANINE && sequence[idx2] === EPars.RNABASE_ADENINE)
                    || (sequence[idx2] === EPars.RNABASE_GUANINE && sequence[idx1] === EPars.RNABASE_ADENINE)) {
                    ++ret;
                    loop.isBoosted[j] = true;
                } else {
                    loop.isBoosted[j] = false;
                }
            }
        }
    }
    return ret;
}

export default class BoostConstraint extends Constraint<BaseConstraintStatus> {
    public static readonly NAME = 'BOOST';
    public readonly minBoosts: number;

    constructor(minBoosts: number) {
        super();
        this.minBoosts = minBoosts;
    }

    public evaluate(context: ConstraintContext): BoostConstraintStatus {
        const {targetPairs, sequence} = context.undoBlocks[0];
        const boostCount = countLoops(targetPairs, 0, sequence);
        return {
            satisfied: (boostCount >= this.minBoosts),
            boostCount
        };
    }

    public getConstraintBoxConfig(
        status: BoostConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();
        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }
        tooltip.append(`You must have ${this.minBoosts.toString()} or `);

        if (forMissionScreen) {
            tooltip.append('more', 'altText');
        } else {
            tooltip.append('more');
        }

        tooltip.append('boosted loops.');

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            tooltip,
            satisfied: status.satisfied,
            clarificationText: `${this.minBoosts} OR MORE`,
            statText: status.boostCount.toString(),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaBoostMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaBoostReq),
            showOutline: true
        };
    }

    public serialize(): [string, string] {
        return [
            BoostConstraint.NAME,
            this.minBoosts.toString()
        ];
    }
}
