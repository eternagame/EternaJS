import {Assert} from 'flashbang';
import {RNABase} from 'eterna/EPars';
import Plot, {PlotType} from 'eterna/Plot';
import {AnnotationData} from 'eterna/AnnotationManager';
import Folder from './folding/Folder';
import Utility from './util/Utility';
import Vienna from './folding/Vienna';
import Vienna2 from './folding/Vienna2';
import FolderManager from './folding/FolderManager';
import DotPlot from './rnatypes/DotPlot';
import {Oligo, OligoMode} from './rnatypes/Oligo';
import SecStruct from './rnatypes/SecStruct';
import Sequence from './rnatypes/Sequence';
import {TargetType} from './puzzle/Puzzle';

/**
 * FoldData is a schema for JSON-ified UndoBlocks.
 */
export interface FoldData {
    folderName_: string;
    sequence_: number[];
    pairs_array_: [boolean, number[][]][] | number[][];
    params_array_: [boolean, Param[][]][] | Param[][];
    stable_: boolean;
    target_oligo_?: number[];
    target_oligos_?: Oligo[];
    oligo_order_?: number[];
    oligos_paired_: number;
    target_pairs_: number[];
    target_oligo_order_?: number[];
    puzzle_locks_?: boolean[];
    forced_struct_: number[];
    library_selections_?: number[];
    target_conditions_?: TargetConditions;
}

// amw fuck a lot of these are optional
export interface TargetConditions {
    type: TargetType;
    secstruct: string;
    sequence?: string;
    IUPAC?: string;
    'custom-layout'?: ([number, number] | [null, null])[];
    'custom-reference'?: string;
    'custom-numbering'?: string;
    annotations?: AnnotationData[];
    oligo_concentration?: string | number; // the strings have to be convertible
    oligo_bind?: boolean;
    oligo_sequence?: string;
    oligo_label?: string; // really, 'T' | 'R'
    oligo_name?: string;
    concentration?: number;
    oligos?: OligoDef[];
    shift_locks?: string;
    shift_limit?: number;
    anti_secstruct?: string;
    structure_constrained_bases?: number[];
    anti_structure_constrained_bases?: number[];
    structure_constraints?: boolean[];
    anti_structure_constraints?: boolean[];
    site?: number[];
    fold_version?: number;
    fold_mode?: string; // this time it's '3'
    state_name?: string;
    force_struct?: string;
    binding_pairs?: number[];
    bonus?: number;
    malus?: number;
}

export interface OligoDef {
    sequence: string;
    malus: number;
    name: string;
    bind?: boolean;
    concentration?: string; // a Numberable one
    label?: string;
}

export enum UndoBlockParam {
    GU = 0,
    GC = 1,
    AU = 2,
    MFE = 3,
    REPETITION = 4,
    STACK = 5,
    FE = 6,
    DOTPLOT = 7,
    DOTPLOT_BITMAP = 8,
    MELTPLOT_BITMAP = 9,
    PROB_SCORE = 10,
    MELTING_POINT = 11,
    PAIR_SCORE = 12,
    NNFE_ARRAY = 13,
    MAX = 14,
    ANY_PAIR = 15,
    MEANPUNP = 16,
    SUMPUNP = 17,
    BRANCHINESS = 18,
    TARGET_EXPECTED_ACCURACY = 19,
}

export enum BasePairProbabilityTransform {
    LEAVE_ALONE,
    SQUARE
}

type Param = (number | number[] | DotPlot | null);

export default class UndoBlock {
    constructor(seq: Sequence, folderName: string) {
        this._folderName = folderName;
        this._sequence = seq.slice(0);
        this._pairsArray.set(false, []);
        this._pairsArray.set(true, []);
        this._paramsArray.set(false, []);
        this._paramsArray.set(true, []);
    }

    public pairsOfPairs(pa: Map<boolean, SecStruct[]>) {
        // Map an array of secondary structures to just pairs because then it
        // can be nicely serialized.
        const m = new Map<boolean, number[][]>();
        pa.forEach((v: SecStruct[], k: boolean) => {
            m.set(k, v.map((it) => it.pairs));
        });
        return m;
    }

    /**
     * Converts a map to a format that is able to be stringified.
     * The format used is the one defined in https://github.com/DavidBruant/Map-Set.prototype.toJSON,
     * as that is the one that was previously present in core-js, so that we maintain backwards compatbibility
     * with old saves
     *
     * @param map Map to be serialized
     * @returns Map suitable for stringification
     */
    private mapToJSON<K, V>(map: Map<K, V>): [K, V][] {
        return [...map.entries()];
    }

    /**
     * Converts a map to a format that is able to be stringified.
     * The format used is the one defined in https://github.com/DavidBruant/Map-Set.prototype.toJSON,
     * as that is the one that was previously present in core-js, so that we maintain backwards compatbibility
     * with old saves
     *
     * @param map Map to be serialized
     * @returns Map suitable for stringification
     */
    private mapFromJSON<K, V>(json: [K, V][]): Map<K, V> {
        const map = new Map<K, V>(json);
        return map;
    }

    private isSerializedBooleanMap<K>(arr: [boolean, K[][]][] | K[][]): arr is [boolean, K[][]][] {
        const entry: [boolean, K[][]] | K[] = arr[0];

        // The first check is to ensure we can check the second element (guarding against a [K])
        // The second check is verifying that the first entry could actually be our boolean key
        // The third check is verifying that we don't have a [boolean, boolean]
        return entry.length === 2 && typeof entry[0] === 'boolean' && Array.isArray(entry[1]);
    }

    public toJSON(): FoldData {
        // TODO: Updating this requires changing all content in the DB AND
        // migrating all autosave content on boot for however long we want to allow
        // players to migrate their autosaves
        /* eslint-disable @typescript-eslint/naming-convention */
        return {
            folderName_: this._folderName,
            sequence_: this._sequence.baseArray,
            pairs_array_: this.mapToJSON(this.pairsOfPairs(this._pairsArray)),
            params_array_: this.mapToJSON(this._paramsArray),
            stable_: this._stable,
            target_oligo_: this._targetOligo,
            target_oligos_: this._targetOligos,
            oligo_order_: this._oligoOrder,
            oligos_paired_: this._oligosPaired,
            target_pairs_: this._targetPairs.pairs,
            target_oligo_order_: this._targetOligoOrder,
            puzzle_locks_: this._puzzleLocks,
            forced_struct_: this._forcedStruct,
            target_conditions_: this._targetConditions,
            library_selections_: this._librarySelections
        };
        /* eslint-enable camelcase */
    }

    public fromJSON(json: FoldData): void {
        try {
            this._folderName = json.folderName_;
            this._sequence.baseArray = json.sequence_;

            // Legacy -- this wasn't always a map. So check typeof and put nonmaps
            // into the pseudoknots false field.
            if (!this.isSerializedBooleanMap(json.pairs_array_)) {
                this._pairsArray = new Map<boolean, SecStruct[]>();
                this._pairsArray.set(false, json.pairs_array_.map((v) => (v ? new SecStruct(v) : v)));
            } else {
                this._pairsArray = new Map<boolean, SecStruct[]>();
                const pairsArray = this.mapFromJSON<boolean, number[][]>(json.pairs_array_);
                const f = pairsArray.get(false);
                if (f) {
                    this._pairsArray.set(false, f.map((v) => (v ? new SecStruct(v) : v)));
                }
                const g = pairsArray.get(true);
                if (g) {
                    this._pairsArray.set(true, g.map((v) => (v ? new SecStruct(v) : v)));
                }
            }
            if (!this.isSerializedBooleanMap(json.params_array_)) {
                this._paramsArray = new Map<boolean, Param[][]>();
                this._paramsArray.set(false, json.params_array_);
            } else {
                this._paramsArray = this.mapFromJSON(json.params_array_);
            }
            this._stable = json.stable_;
            this._targetOligo = json.target_oligo_;
            this._targetOligos = json.target_oligos_;
            this._oligoOrder = json.oligo_order_;
            this._oligosPaired = json.oligos_paired_;
            this._targetPairs = new SecStruct(json.target_pairs_);
            this._targetOligoOrder = json.target_oligo_order_;
            this._puzzleLocks = json.puzzle_locks_;
            this._forcedStruct = json.forced_struct_;
            this._librarySelections = json.library_selections_;
            this._targetConditions = json.target_conditions_
                ? json.target_conditions_
                : undefined;
        } catch (e) {
            throw new Error(`Error parsing UndoBlock JSON: ${e}`);
        }
    }

    public targetExpectedAccuracy(
        targetPairs: SecStruct,
        dotArray: DotPlot | null,
        behavior: BasePairProbabilityTransform
    ): number {
        if (dotArray === null || dotArray.data.length === 0) return 0;
        const dotMap: Map<string, number> = new Map<string, number>();
        const pairedPer: Map<number, number> = new Map<number, number>();

        for (let jj = 0; jj < dotArray.data.length; jj += 3) {
            const prob: number = behavior === BasePairProbabilityTransform.LEAVE_ALONE
                ? dotArray.data[jj + 2]
                : (dotArray.data[jj + 2] * dotArray.data[jj + 2]);

            if (dotArray.data[jj] < dotArray.data[jj + 1]) {
                dotMap.set([dotArray.data[jj], dotArray.data[jj + 1]].join(','), prob);
            } else if (dotArray.data[jj] > dotArray.data[jj + 1]) {
                dotMap.set([dotArray.data[jj + 1], dotArray.data[jj]].join(','), prob);
            }

            const jjprob = pairedPer.get(dotArray.data[jj]);
            pairedPer.set(dotArray.data[jj], jjprob ? jjprob + prob : prob);

            const jjp1prob = pairedPer.get(dotArray.data[jj + 1]);
            pairedPer.set(dotArray.data[jj + 1], jjp1prob ? jjp1prob + prob : prob);
        }

        let TP = 1e-6;
        // this is the remnant of a clever closed form solution irrelevant here
        let TN = /* 0.5 * targetPairs.length * targetPairs.length - 1 + */ 1e-6;
        let FP = 1e-6;
        let FN = 1e-6;
        const cFP = 1e-6;

        // TP = np.sum(np.multiply(pred_m, probs)) + 1e-6
        // TN = 0.5*N*N-1 - np.sum(pred_m) - np.sum(probs) + TP + 1e-6
        // FP = np.sum(np.multiply(pred_m, 1-probs)) + 1e-6
        // FN = np.sum(np.multiply(1-pred_m, probs)) + 1e-6

        for (let ii = 0; ii < targetPairs.length; ++ii) {
            for (let jj = ii + 1; jj < targetPairs.length; ++jj) {
                const prob = dotMap.get([ii + 1, jj + 1].join(',')) ?? 0;
                // Are ii and jj paired?
                if (targetPairs.pairingPartner(ii) === jj) {
                    TP += prob;
                    FN += 1 - prob;
                } else {
                    FP += prob;
                    TN += 1 - prob;
                }
            }
        }

        return (TP * TN - (FP - cFP) * FN) / Math.sqrt((TP + FP - cFP) * (TP + FN) * (TN + FP - cFP) * (TN + FN));
    }

    public get targetOligos(): Oligo[] | undefined {
        return this._targetOligos;
    }

    public set targetOligos(targetOligos: Oligo[] | undefined) {
        this._targetOligos = targetOligos === undefined ? undefined : JSON.parse(JSON.stringify(targetOligos));
    }

    public get targetOligo(): number[] | undefined {
        return this._targetOligo;
    }

    public set targetOligo(targetOligo: number[] | undefined) {
        this._targetOligo = targetOligo === undefined ? undefined : targetOligo.slice();
    }

    public get oligoMode(): number {
        const tc: TargetConditions | undefined = this.targetConditions;
        if (tc === undefined) return 0;
        return tc['fold_mode'] === undefined ? OligoMode.DIMER : Number(tc['fold_mode']);
    }

    public get oligoName(): string | undefined {
        const tc: TargetConditions | undefined = this.targetConditions;
        if (tc === undefined) {
            return undefined;
        }
        return Object.prototype.hasOwnProperty.call(tc, 'oligo_name') ? tc['oligo_name'] : undefined;
    }

    public get oligoOrder(): number[] | undefined {
        return this._oligoOrder;
    }

    public set oligoOrder(oligoOrder: number[] | undefined) {
        this._oligoOrder = oligoOrder === undefined ? undefined : oligoOrder.slice();
    }

    public get oligosPaired(): number {
        return this._oligosPaired;
    }

    public set oligosPaired(oligosPaired: number) {
        this._oligosPaired = oligosPaired;
    }

    public get targetPairs(): SecStruct {
        return this._targetPairs;
    }

    public set targetPairs(targetPairs: SecStruct) {
        this._targetPairs = targetPairs.slice(0);
    }

    public get targetOligoOrder(): number[] | undefined {
        return this._targetOligoOrder;
    }

    public set targetOligoOrder(oligoOrder: number[] | undefined) {
        this._targetOligoOrder = oligoOrder === undefined || !oligoOrder ? undefined : oligoOrder.slice();
    }

    public get sequence(): Sequence {
        return this._sequence.slice(0);
    }

    public set sequence(seq: Sequence) {
        this._sequence = seq;
    }

    public get puzzleLocks(): boolean[] | undefined {
        return this._puzzleLocks;
    }

    public set puzzleLocks(locks: boolean[] | undefined) {
        this._puzzleLocks = locks;
    }

    public get forcedStruct(): number[] {
        return this._forcedStruct;
    }

    public set forcedStruct(forced: number[]) {
        this._forcedStruct = forced;
    }

    public get librarySelections() {
        return this._librarySelections;
    }

    public set librarySelections(selections: number[] | undefined) {
        this._librarySelections = selections;
    }

    public get targetConditions(): TargetConditions | undefined {
        return (this._targetConditions === undefined ? undefined : this._targetConditions);
    }

    public set targetConditions(conditions: TargetConditions | undefined) {
        this._targetConditions = conditions;
    }

    public get stable(): boolean {
        return this._stable;
    }

    public set stable(stable: boolean) {
        this._stable = stable;
    }

    public getPairs(temp: number = 37, pseudoknots: boolean = false): SecStruct {
        const pairsArray = this._pairsArray.get(pseudoknots);
        Assert.assertIsDefined(pairsArray);
        return new SecStruct(pairsArray[temp]?.pairs) ?? null;
    }

    public getParam(
        index: UndoBlockParam,
        temp: number = 37,
        pseudoknots: boolean = false
    ): number | number[] | DotPlot | null {
        const paramsArray = this._paramsArray.get(pseudoknots);
        Assert.assertIsDefined(paramsArray);
        if (paramsArray[temp] != null) {
            return paramsArray[temp][index];
        } else {
            return null;
        }
    }

    public setPairs(pairs: SecStruct, temp: number = 37, pseudoknots: boolean = false): void {
        const pairsArray = this._pairsArray.get(pseudoknots);
        Assert.assertIsDefined(pairsArray);
        pairsArray[temp] = pairs.slice(0);
    }

    public setParam(
        index: UndoBlockParam,
        val: Param,
        temp: number = 37,
        pseudoknots: boolean = false
    ): void {
        const paramsArray = this._paramsArray.get(pseudoknots);
        Assert.assertIsDefined(paramsArray);
        if (paramsArray[temp] == null) {
            paramsArray[temp] = [];
        }
        paramsArray[temp][index] = val;
    }

    public setBasics(temp: number = 37, pseudoknots: boolean = false): void {
        const folder: Folder | null = FolderManager.instance.getFolder(this._folderName);
        if (!folder) {
            throw new Error(`Critical error: can't create a ${this._folderName} folder instance by name`);
        }
        const seq: Sequence = this._sequence;
        const bestPairs = this.getPairs(temp, pseudoknots);
        this.setParam(UndoBlockParam.GU, seq.numGUPairs(bestPairs), temp, pseudoknots);
        this.setParam(UndoBlockParam.GC, seq.numGCPairs(bestPairs), temp, pseudoknots);
        this.setParam(UndoBlockParam.AU, seq.numUAPairs(bestPairs), temp, pseudoknots);
        this.setParam(UndoBlockParam.ANY_PAIR, bestPairs.numPairs(), temp, pseudoknots);
        this.setParam(UndoBlockParam.STACK, bestPairs.getLongestStackLength(), temp, pseudoknots);
        this.setParam(UndoBlockParam.REPETITION, seq.getSequenceRepetition(5), temp, pseudoknots);

        let fullSeq: RNABase[] = seq.baseArray.slice();
        if (this._targetOligo) {
            if (this.oligoMode === OligoMode.DIMER) fullSeq.push(RNABase.CUT);
            if (this.oligoMode === OligoMode.EXT5P) {
                fullSeq = this._targetOligo.concat(fullSeq);
            } else {
                fullSeq = fullSeq.concat(this._targetOligo);
            }
        } else if (this._targetOligos) {
            Assert.assertIsDefined(this._oligoOrder);
            for (let ii = 0; ii < this._targetOligos.length; ii++) {
                fullSeq.push(RNABase.CUT);
                fullSeq = fullSeq.concat(this._targetOligos[this._oligoOrder[ii]].sequence);
            }
        }
        const nnfe: number[] = [];
        const totalFE = folder.scoreStructures(new Sequence(fullSeq), bestPairs, pseudoknots, temp, nnfe);

        this.setParam(UndoBlockParam.FE, totalFE, temp, pseudoknots);
        this.setParam(UndoBlockParam.NNFE_ARRAY, nnfe, temp, pseudoknots);
    }

    public sumProbUnpaired(dotArray: DotPlot | null, behavior: BasePairProbabilityTransform): number {
        if (dotArray === null || dotArray.data.length === 0) return 0;
        // dotArray is organized as idx, idx, pairprob.
        const probUnpaired: number[] = Array<number>(this.sequence.length);
        for (let idx = 0; idx < this.sequence.length; ++idx) {
            probUnpaired[idx] = 1;
            for (let ii = 0; ii < dotArray.data.length; ii += 3) {
                if (dotArray.data[ii] === idx + 1 || dotArray.data[ii + 1] === idx + 1) {
                    if (behavior === BasePairProbabilityTransform.LEAVE_ALONE) {
                        probUnpaired[idx] -= (dotArray.data[ii + 2]);
                    } else {
                        probUnpaired[idx] -= (dotArray.data[ii + 2] * dotArray.data[ii + 2]);
                    }
                }
            }
        }
        // for (let idx = 0; idx < this.sequence.length; ++idx) {
        //     if (probUnpaired[idx] < 0) {
        //         probUnpaired[idx] = 0;
        //     }
        // }

        // mean prob unpaired
        return probUnpaired.reduce((a, b) => a + b, 0);// / this.sequence.length;
    }

    public branchiness(pairs: SecStruct) {
        // format of pairs is
        // '((.))' -> [4,3,-1,1,0]
        // note that if you calculate this average, it's fine to double count
        // pairs for obvious reasons!
        // so this is the average difference between idx and val
        // over n-1
        // 1- that

        let totDist = 0;
        let count = 0;
        for (let ii = 0; ii < pairs.length; ++ii) {
            if (!pairs.isPaired(ii)) {
                continue;
            }

            if (pairs.pairingPartner(ii) > ii) {
                totDist += pairs.pairingPartner(ii) - ii;
            } else {
                totDist += ii - pairs.pairingPartner(ii);
            }
            ++count;
        }

        return 1 - ((totDist / count) / (pairs.length - 1));
    }

    public ensembleBranchiness(dotArray: DotPlot | null, behavior: BasePairProbabilityTransform) {
        if (dotArray === null || dotArray.data.length === 0) return 0;
        // format of pairs is
        // '((.))' -> [4,3,-1,1,0]
        // note that if you calculate this average, it's fine to double count
        // pairs for obvious reasons! so this is the average difference between
        // idx and val

        let totDist = 0;

        // every bp adds jj - ii to totDist and prob to count.
        let count = 0;

        // dotArray is organized as idx, idx, pairprob.
        if (behavior === BasePairProbabilityTransform.LEAVE_ALONE) {
            for (let ii = 0; ii < dotArray.data.length; ii += 3) {
                if (dotArray.data[ii] > dotArray.data[ii + 1]) {
                    totDist += (dotArray.data[ii] - dotArray.data[ii + 1]) * dotArray.data[ii + 2];
                } else {
                    totDist += (dotArray.data[ii + 1] - dotArray.data[ii]) * dotArray.data[ii + 2];
                }
                count += (dotArray.data[ii + 2]);
            }
        } else {
            for (let ii = 0; ii < dotArray.data.length; ii += 3) {
                if (dotArray.data[ii] > dotArray.data[ii + 1]) {
                    totDist += (dotArray.data[ii] - dotArray.data[ii + 1])
                        * dotArray.data[ii + 2] * dotArray.data[ii + 2];
                } else {
                    totDist += (dotArray.data[ii + 1] - dotArray.data[ii])
                        * dotArray.data[ii + 2] * dotArray.data[ii + 2];
                }
                count += (dotArray.data[ii + 2] * dotArray.data[ii + 2]);
            }
        }
        return 1 - ((totDist / count) / (this.sequence.length - 1));
    }

    public updateMeltingPointAndDotPlot(pseudoknots: boolean = false): void {
        let bppStatisticBehavior: BasePairProbabilityTransform = BasePairProbabilityTransform.LEAVE_ALONE;
        if (this._folderName === Vienna.NAME || this._folderName === Vienna2.NAME) {
            bppStatisticBehavior = BasePairProbabilityTransform.SQUARE;
        }
        const folder = FolderManager.instance.getFolder(this._folderName);
        if (folder === null) {
            throw new Error(`Critical error: can't create a ${this._folderName} folder instance by name`);
        }

        if (this.getParam(UndoBlockParam.DOTPLOT, 37, pseudoknots) === undefined) {
            const dotArray: DotPlot | null = folder.getDotPlot(
                this.sequence, this.getPairs(37), 37, pseudoknots
            );
            this.setParam(UndoBlockParam.DOTPLOT, dotArray?.data ?? null, 37, pseudoknots);
            // mean+sum prob unpaired
            this.setParam(UndoBlockParam.SUMPUNP,
                this.sumProbUnpaired(dotArray, bppStatisticBehavior), 37, pseudoknots);
            this.setParam(UndoBlockParam.MEANPUNP,
                this.sumProbUnpaired(dotArray, bppStatisticBehavior) / this.sequence.length, 37, pseudoknots);
            // branchiness
            this.setParam(UndoBlockParam.BRANCHINESS,
                this.ensembleBranchiness(dotArray, bppStatisticBehavior), 37, pseudoknots);
            this.setParam(
                UndoBlockParam.TARGET_EXPECTED_ACCURACY,
                this.targetExpectedAccuracy(this._targetPairs, dotArray, bppStatisticBehavior),
                37,
                pseudoknots
            );
            this._dotPlotData = dotArray;
        }

        for (let ii = 37; ii < 100; ii += 10) {
            if (this.getPairs(ii) == null) {
                const pairs: SecStruct | null = folder.foldSequence(this.sequence, null, null, pseudoknots, ii);
                Assert.assertIsDefined(pairs);
                this.setPairs(pairs, ii, pseudoknots);
            }

            if (this.getParam(UndoBlockParam.DOTPLOT, ii) == null) {
                const dotTempArray: DotPlot | null = folder.getDotPlot(
                    this.sequence,
                    this.getPairs(ii),
                    ii,
                    pseudoknots
                );
                Assert.assertIsDefined(dotTempArray);
                // mean+sum prob unpaired
                this.setParam(UndoBlockParam.SUMPUNP,
                    this.sumProbUnpaired(dotTempArray, bppStatisticBehavior), ii, pseudoknots);
                this.setParam(UndoBlockParam.MEANPUNP,
                    this.sumProbUnpaired(
                        dotTempArray, bppStatisticBehavior
                    ) / this.sequence.length, ii, pseudoknots);
                // branchiness
                this.setParam(UndoBlockParam.BRANCHINESS,
                    this.ensembleBranchiness(dotTempArray, bppStatisticBehavior), ii, pseudoknots);
                this.setParam(UndoBlockParam.DOTPLOT, dotTempArray.data, ii, pseudoknots);
            }
        }

        const refPairs: SecStruct = this.getPairs(37, pseudoknots);
        const pairScores: number[] = [];
        const maxPairScores: number[] = [];

        for (let ii = 37; ii < 100; ii += 10) {
            if (this.getParam(UndoBlockParam.PROB_SCORE, ii)) {
                pairScores.push(1 - (this.getParam(UndoBlockParam.PAIR_SCORE, ii, pseudoknots) as number));
                maxPairScores.push(1.0);
                continue;
            }
            const curDat: DotPlot = new DotPlot(this.getParam(UndoBlockParam.DOTPLOT, ii, pseudoknots) as number[]);
            const curPairs: SecStruct = this.getPairs(ii, pseudoknots);
            let probScore = 0;
            let scoreCount = 0;

            for (let jj = 0; jj < curDat.data.length; jj += 3) {
                const indexI: number = curDat.data[jj] - 1;
                const indexJ: number = curDat.data[jj + 1] - 1;

                if (indexI < indexJ) {
                    if (refPairs.pairingPartner(indexI) === indexJ) {
                        probScore += Number(curDat.data[jj + 2]);
                        scoreCount++;
                    }
                } else if (indexJ < indexI) {
                    if (refPairs.pairingPartner(indexJ) === indexI) {
                        probScore += Number(curDat.data[jj + 2]);
                        scoreCount++;
                    }
                }
            }

            if (scoreCount > 0) {
                probScore /= scoreCount;
            }

            let numPaired = 0;
            for (let jj = 0; jj < curPairs.length; jj++) {
                if (curPairs.pairingPartner(jj) > jj) {
                    numPaired += 2;
                }
            }
            const pairScore: number = Number(numPaired) / refPairs.length;

            pairScores.push(1 - pairScore);
            maxPairScores.push(1.0);

            this.setParam(UndoBlockParam.PROB_SCORE, probScore, ii, pseudoknots);
            this.setParam(UndoBlockParam.PAIR_SCORE, pairScore, ii, pseudoknots);
        }

        this._meltPlotPairScores = pairScores;
        this._meltPlotMaxPairScores = maxPairScores;

        const initScore: number = this.getParam(UndoBlockParam.PROB_SCORE, 37, pseudoknots) as number;

        let meltpoint = 107;
        for (let ii = 47; ii < 100; ii += 10) {
            const currentScore: number = this.getParam(UndoBlockParam.PROB_SCORE, ii, pseudoknots) as number;
            if (currentScore < initScore * 0.5) {
                meltpoint = ii;
                break;
            }
        }

        this.setParam(UndoBlockParam.MELTING_POINT, meltpoint, 37, pseudoknots);
    }

    public createDotPlot(): Plot {
        const plot = new Plot(PlotType.SCATTER);
        plot.set2DData(this._dotPlotData?.data ?? null, this._sequence.length);
        return plot;
    }

    public createMeltPlot(): Plot {
        const plot = new Plot(PlotType.LINE);
        plot.setData(this._meltPlotPairScores, this._meltPlotMaxPairScores);
        return plot;
    }

    /**
     * Return map of adjusted base indices to original base indices when oligos are rearranged
     * according to otherorder
     * @param otherOrder An array of indexes, where the index refers to the new index
     * the oligo at the given position in the old array should be placed at.
     * E.g., given oligos in order A B C, [1,2,0] means their new order should be C, A, B
     * (oligo A, with the old index of 0, should be at new index 1)
     */
    public reorderedOligosIndexMap(otherOrder: number[] | undefined): number[] | undefined {
        if (this._targetOligos === undefined) return undefined;

        const originalIndices: number[][] = [];
        let oligoFirstBaseIndex = this._sequence.length;

        for (const oligo of this._targetOligos) {
            // The + 1 is used to account for the "cut" base denoting split points between strands
            originalIndices.push(Utility.range(oligoFirstBaseIndex, oligoFirstBaseIndex + oligo.sequence.length + 1));
            oligoFirstBaseIndex += oligo.sequence.length + 1;
        }

        const newOrder = otherOrder || Utility.range(this._targetOligos.length);

        return Utility.range(this._sequence.length).concat(
            ...Utility.range(this._targetOligos.length).map((idx) => originalIndices[newOrder.indexOf(idx)])
        );
    }

    public get folderName(): string {
        return this._folderName;
    }

    private _sequence: Sequence = new Sequence([]);
    private _pairsArray: Map<boolean, SecStruct[]> = new Map<boolean, SecStruct[]>();
    private _paramsArray: Map<boolean, Param[][]> = new Map<boolean, Param[][]>();
    private _stable: boolean = false;
    private _targetOligo: number[] | undefined = undefined;
    private _targetOligos: Oligo[] | undefined = undefined;
    private _oligoOrder: number[] | undefined = undefined;
    private _oligosPaired: number = 0;
    private _targetPairs: SecStruct = new SecStruct();
    private _targetOligoOrder: number[] | undefined = undefined;
    private _puzzleLocks: boolean[] | undefined = [];
    private _forcedStruct: number[] = [];
    private _targetConditions: TargetConditions | undefined = undefined;
    private _librarySelections: number[] | undefined = undefined;

    private _dotPlotData: DotPlot | null;
    private _meltPlotPairScores: number[];
    private _meltPlotMaxPairScores: number[];
    private _folderName: string;
}
