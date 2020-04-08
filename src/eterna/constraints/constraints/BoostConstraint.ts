import UndoBlock from 'eterna/UndoBlock';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus} from '../Constraint';
import Puzzle from 'eterna/puzzle/Puzzle';
import EPars from 'eterna/EPars';

interface BoostConstraintStatus extends BaseConstraintStatus {
    boostCount: number;
}

export default class BoostConstraint extends Constraint<BoostConstraintStatus> {
    public static readonly NAME = 'BOOST';
    public readonly minBoosts: number;

    constructor(minBoosts: number) {
        super();
        this.minBoosts = minBoosts;
    }

    public evaluate(undoBlocks: UndoBlock[], targetConditions?: any[], puzzle?: Puzzle): BoostConstraintStatus {
        const boostCount = count_boosted_loops();
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

    private countBoostedLoops() {
        let ret = 0;
        if (!all_loops[current_target_index_]) {
            detect_loops();
        }

        for (let i = 0; i < all_loops[current_target_index_].length; ++i) {
            // Check that the pairs are made first.
            let loop = all_loops[current_target_index_][i];
            // There has to be at least one strand.
            if (loop.strands.length <= 0)
                continue;

            let seq = poses_[current_target_index_].get_sequence();
            let pairs = loop.pairs;
            if (loop.strands.length == 2 && loop.strands[0].length == 1 && loop.strands[1].length == 1) {
                // 1-1 Loops. Need G-G terminal mismatch.
                if (seq[loop.strands[0][0]] == EPars.RNABASE_GUANINE &&
                        seq[loop.strands[1][0]] == EPars.RNABASE_GUANINE) {
                    ++ret;                    
                    all_loops[current_target_index_][i].isBoosted[0] = true;
                } else {
                    all_loops[current_target_index_][i].isBoosted[0] = false;
                }
            } else if (pairs.length == 1 && loop.strands.length == 1) {
                // Hairpin loops. G-A terminal mismatch (with the G at the lowest index).
                if (seq[loop.strands[0][0]] == EPars.RNABASE_GUANINE &&
                        seq[loop.strands[0][loop.strands[0].length - 1]] == EPars.RNABASE_ADENINE) {
                    ++ret;                    
                    all_loops[current_target_index_][i].isBoosted[0] = true;
                } else {
                    all_loops[current_target_index_][i].isBoosted[0] = false;
                }
            } else if (pairs.length >= 2 && loop.strands.length >= 2) {
                // Internal Loop and Multiloop. G-A terminal mismatches at both stack locations.
                for (let j = 0; j < pairs.length; ++j) {
                    let idx1 = -1;
                    let idx2 = -1;
                    if (j == 0) {
                        idx1 = pairs[j].p1+1;
                        idx2 = pairs[j].p2-1;
                     } else {
                         idx1 = pairs[j].p1-1;
                        idx2 = pairs[j].p2+1;
                     }

                     // Make sure that both of these indices are unpaired in target mode.
                     if (target_pairs_[current_target_index_][idx1] != -1 ||
                             target_pairs_[current_target_index_][idx2] != -1) {
                         continue;
                     }

                     // Check for G-A mismatch.
                     if ((seq[idx1] == EPars.RNABASE_GUANINE && seq[idx2] == EPars.RNABASE_ADENINE) ||
                             (seq[idx2] == EPars.RNABASE_GUANINE && seq[idx1] == EPars.RNABASE_ADENINE)) {
                         ++ret;                         
                        all_loops[current_target_index_][i].isBoosted[j] = true;
                     } else {
                        all_loops[current_target_index_][i].isBoosted[j] = false;
                    }
                }
            }
        }
        return ret;
    }

    private detect_loops() {
        if (!target_pairs_) {
            return -1;
        }            
        if (!all_loops) {
            all_loops = new Object();
        }
        if (!all_loops[current_target_index_]) {
            all_loops[current_target_index_] = new Array();
        }
        all_loops[current_target_index_].splice(0);
        var loop_stack:Array = new Array();
        var tmpPairs:Array = target_pairs_[current_target_index_].slice();
        var last_pair:Object = null;
        var examining_loop:Boolean = false;

        const clone_pair = (obj:Object) => {
            var no:Object = new Object();
            no.p1 = obj.p1;
            no.p2 = obj.p2;
            return no;
        };

        for (var i:int = 0; i < tmpPairs.length; ++i) {
            if (tmpPairs[i] == -1 && !examining_loop && last_pair != null) {
                // Found a loop!
                var l:Loop = new Loop();
                l.pairs.push(clone_pair(last_pair));
                l.isBoosted.push(false);
                last_pair = null;

                // Find the rest of the unpaired bases in the first strand.
                var arr:Array = new Array();
                for(i; i < tmpPairs.length; ++i) {
                    if (tmpPairs[i] != -1)
                        break;
                    arr.push(i);
                }
                --i;
                l.strands.push(arr.slice());
                loop_stack.push(l);
                examining_loop = true;
            } else if (tmpPairs[i] >= 0 && tmpPairs[i+1] >= 0 &&
                         Math.abs(tmpPairs[i]-tmpPairs[i+1]) > 1 && last_pair != null && !examining_loop) {
                // Special case where the free bases are on the OTHER side while on initial strand, we have
                // two pairs in a row.
                var l:Loop = new Loop();
                var pair = new Object();
                pair.p1 = i;
                pair.p2 = tmpPairs[i];
                l.pairs.push(pair);
                l.isBoosted.push(false);
                last_pair = null;
                loop_stack.push(l);
                examining_loop = true;
            } else if (tmpPairs[i] == -1 && examining_loop) {
                // Add bases to a new strand in the current loop.
                var arr:Array = new Array();
                for(i; i < tmpPairs.length; ++i) {
                    if (tmpPairs[i] != -1)
                        break;
                    arr.push(i);
                }
                --i;
                loop_stack[loop_stack.length - 1].strands.push(arr.slice());
            } else if (i < tmpPairs[i]) { // Make sure we don't count pairs twice
                last_pair = new Object();
                last_pair.p1 = i;
                last_pair.p2 = tmpPairs[i];
                if (examining_loop) {
                    loop_stack[loop_stack.length - 1].pairs.push(clone_pair(last_pair));
                }
                examining_loop = false;
            } else if (loop_stack.length > 0) {
                if (i == loop_stack[loop_stack.length - 1].pairs[0].p2) {
                    // Found last pair that needs to be encountered - loop finished.
                    all_loops[current_target_index_].push(loop_stack.pop().clone());
                    examining_loop = false;
                }
                if (loop_stack.length > 0) {
                    for (var j:int = 0; j < loop_stack[loop_stack.length - 1].pairs.length; ++j) {
                        // Closing off a pair that is part of the loop but is not the last loop.
                        if (i == loop_stack[loop_stack.length - 1].pairs[j].p2) {
                            examining_loop = true;
                            break;
                        }
                    }
                }
            }
        }
    }
}
