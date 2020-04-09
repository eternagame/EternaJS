import EPars from 'eterna/EPars';
import Pose2D from 'eterna/pose2D/Pose2D';

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
        return new Loop(this.isBoosted, this.strands, this.pairs);
    }
}

export default class BoostLoops {
    private allLoops: Loop[][] = [];

    public count(targetPairs: number[][], currentTargetIndex: number, poses: Pose2D[]) {
        if (!targetPairs) {
            return 0;
        }

        let ret = 0;
        if (!this.allLoops[currentTargetIndex]) {
            this.detectLoops(targetPairs, currentTargetIndex);
        }

        for (let i = 0; i < this.allLoops[currentTargetIndex].length; ++i) {
            // Check that the pairs are made first.
            let loop = this.allLoops[currentTargetIndex][i];
            // There has to be at least one strand.
            if (loop.strands.length <= 0) {
                continue;
            }

            let seq = poses[currentTargetIndex].sequence;
            let pairs = loop.pairs;
            if (loop.strands.length === 2 && loop.strands[0].length === 1 && loop.strands[1].length === 1) {
                // 1-1 Loops. Need G-G terminal mismatch.
                if (seq[loop.strands[0][0] as number] === EPars.RNABASE_GUANINE
                        && seq[loop.strands[1][0] as number] === EPars.RNABASE_GUANINE) {
                    ++ret;
                    this.allLoops[currentTargetIndex][i].isBoosted[0] = true;
                } else {
                    this.allLoops[currentTargetIndex][i].isBoosted[0] = false;
                }
            } else if (pairs.length === 1 && loop.strands.length === 1) {
                // Hairpin loops. G-A terminal mismatch (with the G at the lowest index).
                if (seq[loop.strands[0][0] as number] === EPars.RNABASE_GUANINE
                        && seq[loop.strands[0][loop.strands[0].length - 1] as number] === EPars.RNABASE_ADENINE) {
                    ++ret;
                    this.allLoops[currentTargetIndex][i].isBoosted[0] = true;
                } else {
                    this.allLoops[currentTargetIndex][i].isBoosted[0] = false;
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
                    if (targetPairs[currentTargetIndex][idx1] !== -1
                             || targetPairs[currentTargetIndex][idx2] !== -1) {
                        continue;
                    }

                    // Check for G-A mismatch.
                    if ((seq[idx1] === EPars.RNABASE_GUANINE && seq[idx2] === EPars.RNABASE_ADENINE)
                             || (seq[idx2] === EPars.RNABASE_GUANINE && seq[idx1] === EPars.RNABASE_ADENINE)) {
                        ++ret;
                        this.allLoops[currentTargetIndex][i].isBoosted[j] = true;
                    } else {
                        this.allLoops[currentTargetIndex][i].isBoosted[j] = false;
                    }
                }
            }
        }
        return ret;
    }

    private detectLoops(targetPairs: number[][], currentTargetIndex: number) {
        if (!this.allLoops[currentTargetIndex]) {
            this.allLoops[currentTargetIndex] = [];
        }
        this.allLoops[currentTargetIndex].splice(0);
        let loopStack = [];
        let tmpPairs = targetPairs[currentTargetIndex].slice();
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
                    this.allLoops[currentTargetIndex].push(loopStack.pop().clone());
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
    }
}
