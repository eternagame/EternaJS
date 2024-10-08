import {Assert} from 'flashbang';
import EPars, {RNABase} from 'eterna/EPars';
import Plot, {PlotType} from 'eterna/Plot';
import {BundledAnnotationData} from 'eterna/AnnotationManager';
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
import FoldUtil, {BasePairProbabilityTransform} from './folding/FoldUtil';

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
    annotations?: BundledAnnotationData[];
    oligo_concentration?: string | number; // the strings have to be convertible
    oligo_bind?: boolean;
    oligo_sequence?: string;
    oligo_label?: string;
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
    // EF1 = 20,
    // EF1_CROSS_PAIR = 21,
    BPP_F1_TARGET = 22,
    BPP_F1_NATIVE = 23,
    BPP_F1_TARGET_PKMASK = 24,
    BPP_F1_NATIVE_PKMASK = 25,
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
            m.set(k, v.map((it) => (it ? it.pairs : it)));
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

    private isSerializedBooleanMap<K>(arr: [boolean, (K[] | null)[]][] | (K[] | null)[]): arr is [boolean, K[][]][] {
        const entry = arr[0];

        // The first check is to guard against a (K[] | null)[] where the first entry is null
        //   (in the case of a [boolean, (K[] | null)[]][] it would never be null)
        // The second check is to ensure we can check the second element (guarding against a [K])
        // The third check is verifying that the first entry could actually be our boolean key
        // The fourth check is verifying that we don't have a [boolean, boolean]
        return entry !== null && entry.length === 2 && typeof entry[0] === 'boolean' && Array.isArray(entry[1]);
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
            params_array_: this.mapToJSON(this._paramsArray).map<[boolean, Param[][]]>(
                // Limit the amount of data that gets cached. Not only is the dot plot potentially
                // very large, but a handful of parameters are recomputed at multiple temperatures
                // in order to service the melt plot. The aggregate size of the cache causes us
                // some perf issues, so we're going to say it's OK for these to be recalculated
                // if they're actually needed
                ([pks, paramsAtTemps]) => [
                    pks,
                    paramsAtTemps.map<Param[]>(
                        (params, temp) => (
                            temp === EPars.DEFAULT_TEMPERATURE
                                ? params.map<Param>(
                                    (param, id) => (
                                        id !== UndoBlockParam.DOTPLOT
                                        && id !== UndoBlockParam.DOTPLOT_BITMAP
                                        && id !== UndoBlockParam.MELTPLOT_BITMAP
                                            ? param
                                            : null
                                    )
                                )
                                : []
                        )
                    )
                ]
            ),
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

    public fromJSON(json: FoldData, currTargetConditions?: TargetConditions): void {
        // Note: autosaves may have some fields as null rather than undefined, hence the coercion to undefined
        try {
            // In the cases of older autosaves/designs, they won't have a folder name specified.
            // They should instead default to whatever the current folder is
            this._folderName = json.folderName_ || this._folderName;
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
            this._targetOligo = json.target_oligo_ ?? undefined;
            this._targetOligos = json.target_oligos_ ?? undefined;
            // For some reason, in PoseEditMode when we initialize targetOligos, we don't include all
            // the fields from targetConditions. We later started including label in addition to name
            // so that Pose2D can tie annotations to strand by strand label. If loading an older
            // cached fold data that is missing the oligo label, annotations on secondary strands
            // will fail because it can't figure out which oligo each strand refers to.
            //
            // We did however already cache the name, and if we should be able to know if we find an oligo
            // with some name, the label attached to it should be "correct".
            // Technically it's possible that two oligos share the same name but different labels, or
            // are missing a name or something, but in practice that shouldn't happen - worst case,
            // this is a best effort that does better, and there isn't really much more we can do.
            //
            // Note that we have the target conditions being passed by the puzzle here instead of using
            // the target conditions used by the undo block, because it used to be that the oligo label
            // wasn't required, but it is now. We now autogenerate labels as part of parsing the puzzle,
            // but if this cached fold data came from before we did that, it wouldn't have the autogenerated
            // label. I'm not sure if there is actually any instance where that happens, but I figure it's
            // better to be safe than sorry. It should be perfectly valid to do this, as target conditions
            // should never change during the course of the puzzle (frankly I don't know why target conditions
            // are ever tied to the undo block, but that's another matter).
            if (this._targetOligos && currTargetConditions) {
                for (const oligo of this._targetOligos) {
                    if (!oligo['label'] && oligo['name']) {
                        oligo['label'] = currTargetConditions.oligos?.find(
                            (targetOligo) => targetOligo['name'] === oligo['name']
                        )?.['label'];
                    }
                }
            }
            this._oligoOrder = json.oligo_order_ ?? undefined;
            this._oligosPaired = json.oligos_paired_ ?? undefined;
            this._targetPairs = new SecStruct(json.target_pairs_);
            this._targetOligoOrder = json.target_oligo_order_ ?? undefined;
            this._puzzleLocks = json.puzzle_locks_;
            this._forcedStruct = json.forced_struct_;
            this._librarySelections = json.library_selections_;
            if (json.target_conditions_) {
                if (typeof json.target_conditions_ === 'string') {
                    // When returned from the server, it may be double-encoded
                    this._targetConditions = JSON.parse(json.target_conditions_);
                } else {
                    this._targetConditions = json.target_conditions_;
                }
            } else {
                this._targetConditions = undefined;
            }
        } catch (e) {
            throw new Error(`Error parsing UndoBlock JSON: ${e}`);
        }
    }

    public get targetOligos(): Oligo[] | undefined {
        return this._targetOligos;
    }

    public set targetOligos(targetOligos: Oligo[] | undefined) {
        // Note: autosaves may have this field as null rather than undefined
        this._targetOligos = targetOligos ? JSON.parse(JSON.stringify(targetOligos)) : undefined;
    }

    public get targetOligo(): number[] | undefined {
        return this._targetOligo;
    }

    public set targetOligo(targetOligo: number[] | undefined) {
        // Note: autosaves may have this field as null rather than undefined
        this._targetOligo = targetOligo ? targetOligo.slice() : undefined;
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

    public get oligoLabel(): string | undefined {
        const tc: TargetConditions | undefined = this.targetConditions;
        if (tc === undefined) {
            return undefined;
        }
        return Object.prototype.hasOwnProperty.call(tc, 'oligo_label') ? tc['oligo_label'] : undefined;
    }

    public get oligoOrder(): number[] | undefined {
        return this._oligoOrder;
    }

    public set oligoOrder(oligoOrder: number[] | undefined) {
        // Note: autosaves may have this field as null rather than undefined
        this._oligoOrder = oligoOrder ? oligoOrder.slice() : undefined;
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
        // Note: autosaves may have this field as null rather than undefined
        this._targetOligoOrder = oligoOrder ? oligoOrder.slice() : undefined;
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

    public getPairs(temp: number = EPars.DEFAULT_TEMPERATURE, pseudoknots: boolean = false): SecStruct {
        const pairsArray = this._pairsArray.get(pseudoknots);
        Assert.assertIsDefined(pairsArray);
        return new SecStruct(pairsArray[temp]?.pairs);
    }

    public getParam(
        index: UndoBlockParam,
        temp: number = EPars.DEFAULT_TEMPERATURE,
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

    public setPairs(pairs: SecStruct, temp: number = EPars.DEFAULT_TEMPERATURE, pseudoknots: boolean = false): void {
        const pairsArray = this._pairsArray.get(pseudoknots);
        Assert.assertIsDefined(pairsArray);
        pairsArray[temp] = pairs.slice(0);
    }

    public setParam(
        index: UndoBlockParam,
        val: Param,
        temp: number = EPars.DEFAULT_TEMPERATURE,
        pseudoknots: boolean = false
    ): void {
        const paramsArray = this._paramsArray.get(pseudoknots);
        Assert.assertIsDefined(paramsArray);
        if (paramsArray[temp] == null) {
            paramsArray[temp] = [];
        }
        paramsArray[temp][index] = val;
    }

    public setBasics(temp: number = EPars.DEFAULT_TEMPERATURE, pseudoknots: boolean = false): void {
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
        const probUnpaired = FoldUtil.pUnpaired(dotArray, this.sequence, behavior);
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

    public updateMeltingPointAndDotPlot(
        args: {sync: true; pseudoknots: boolean, skipMelt?: boolean}
    ): void;

    public async updateMeltingPointAndDotPlot(
        args: {sync: false; pseudoknots: boolean, skipMelt?: boolean}
    ): Promise<void>;

    public async updateMeltingPointAndDotPlot(
        {sync, pseudoknots, skipMelt}:{sync: boolean; pseudoknots: boolean, skipMelt?: boolean}
    ): Promise<void> {
        let bppStatisticBehavior: BasePairProbabilityTransform = BasePairProbabilityTransform.LEAVE_ALONE;
        if (this._folderName === Vienna.NAME || this._folderName === Vienna2.NAME) {
            bppStatisticBehavior = BasePairProbabilityTransform.SQUARE;
        }
        const folder = FolderManager.instance.getFolder(this._folderName);
        if (folder === null) {
            throw new Error(`Critical error: can't create a ${this._folderName} folder instance by name`);
        }

        const currDotPlot = this.getParam(UndoBlockParam.DOTPLOT, EPars.DEFAULT_TEMPERATURE, pseudoknots);
        if (currDotPlot == null) {
            let dotArray: DotPlot | null;
            if (sync) {
                if (!folder.isSync()) throw new Error('Tried to use asynchronous folder synchronously');
                dotArray = folder.getDotPlot(
                    this.sequence, this.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots),
                    EPars.DEFAULT_TEMPERATURE, pseudoknots
                );
            } else {
                dotArray = await folder.getDotPlot(
                    this.sequence, this.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots),
                    EPars.DEFAULT_TEMPERATURE, pseudoknots
                );
            }
            this._dotPlotData = dotArray;
        } else if (Array.isArray(currDotPlot)) {
            this._dotPlotData = new DotPlot(currDotPlot);
        }

        this.setParam(UndoBlockParam.DOTPLOT, this._dotPlotData?.data ?? null, EPars.DEFAULT_TEMPERATURE, pseudoknots);
        this.setParam(
            UndoBlockParam.SUMPUNP,
            this.sumProbUnpaired(this._dotPlotData, bppStatisticBehavior),
            EPars.DEFAULT_TEMPERATURE, pseudoknots
        );
        this.setParam(
            UndoBlockParam.MEANPUNP,
            this.sumProbUnpaired(this._dotPlotData, bppStatisticBehavior) / this.sequence.length,
            EPars.DEFAULT_TEMPERATURE, pseudoknots
        );
        this.setParam(
            UndoBlockParam.BRANCHINESS,
            this.ensembleBranchiness(this._dotPlotData, bppStatisticBehavior),
            EPars.DEFAULT_TEMPERATURE, pseudoknots
        );
        this.setParam(
            UndoBlockParam.TARGET_EXPECTED_ACCURACY,
            FoldUtil.bppConfidence(
                this.targetPairs,
                this._dotPlotData,
                bppStatisticBehavior
            ).mcc,
            EPars.DEFAULT_TEMPERATURE, pseudoknots
        );

        this.setParam(
            UndoBlockParam.BPP_F1_TARGET,
            FoldUtil.bppConfidence(
                this._targetPairs,
                this._dotPlotData,
                bppStatisticBehavior
            ).f1,
            EPars.DEFAULT_TEMPERATURE, pseudoknots
        );
        this.setParam(
            UndoBlockParam.BPP_F1_NATIVE,
            FoldUtil.bppConfidence(
                this.targetAlignedNaturalPairs,
                this._dotPlotData,
                bppStatisticBehavior
            ).f1,
            EPars.DEFAULT_TEMPERATURE, pseudoknots
        );
        this.setParam(
            UndoBlockParam.BPP_F1_TARGET_PKMASK,
            FoldUtil.pkMaskedBppConfidence(
                this._targetPairs,
                this._dotPlotData,
                bppStatisticBehavior
            ).f1,
            EPars.DEFAULT_TEMPERATURE, pseudoknots
        );
        this.setParam(
            UndoBlockParam.BPP_F1_NATIVE_PKMASK,
            FoldUtil.pkMaskedBppConfidence(
                this.targetAlignedNaturalPairs,
                this._dotPlotData,
                bppStatisticBehavior
            ).f1,
            EPars.DEFAULT_TEMPERATURE, pseudoknots
        );

        if (!skipMelt) {
            for (let ii = EPars.DEFAULT_TEMPERATURE; ii < 100; ii += 10) {
                if (this.getPairs(ii, pseudoknots).length === 0) {
                    let pairs: SecStruct | null;
                    if (sync) {
                        if (!folder.isSync()) throw new Error('Tried to use asynchronous folder synchronously');
                        pairs = folder.foldSequence(this.sequence, null, null, pseudoknots, ii);
                    } else {
                        // eslint-disable-next-line no-await-in-loop
                        pairs = await folder.foldSequence(this.sequence, null, null, pseudoknots, ii);
                    }
                    Assert.assertIsDefined(pairs);
                    this.setPairs(pairs, ii, pseudoknots);
                }

                if (this.getParam(UndoBlockParam.DOTPLOT, ii, pseudoknots) == null) {
                    let dotTempArray: DotPlot | null;
                    if (sync) {
                        if (!folder.isSync()) throw new Error('Tried to use asynchronous folder synchronously');
                        dotTempArray = folder.getDotPlot(
                            this.sequence,
                            this.getPairs(ii, pseudoknots),
                            ii,
                            pseudoknots
                        );
                    } else {
                        // eslint-disable-next-line no-await-in-loop
                        dotTempArray = await folder.getDotPlot(
                            this.sequence,
                            this.getPairs(ii, pseudoknots),
                            ii,
                            pseudoknots
                        );
                    }

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

            const refPairs: SecStruct = this.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots);
            const pairScores: number[] = [];
            const maxPairScores: number[] = [];

            for (let ii = EPars.DEFAULT_TEMPERATURE; ii < 100; ii += 10) {
                if (this.getParam(UndoBlockParam.PROB_SCORE, ii, pseudoknots)) {
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

            const initScore: number = this.getParam(
                UndoBlockParam.PROB_SCORE, EPars.DEFAULT_TEMPERATURE, pseudoknots
            ) as number;

            let meltpoint = 107;
            for (let ii = 47; ii < 100; ii += 10) {
                const currentScore: number = this.getParam(UndoBlockParam.PROB_SCORE, ii, pseudoknots) as number;
                if (currentScore < initScore * 0.5) {
                    meltpoint = ii;
                    break;
                }
            }

            this.setParam(UndoBlockParam.MELTING_POINT, meltpoint, EPars.DEFAULT_TEMPERATURE, pseudoknots);
        }
    }

    public createDotPlot(): Plot {
        const plot = new Plot(PlotType.SCATTER);
        const data = this._dotPlotData?.data.slice() ?? null;
        if (data) {
            // JAR: Apparently we get dot plot data back 1-indexed, not zero-indexed, but nobody happened
            // to notice the mismatch between that and what plots expect. TBD whether this should be handled
            // differently, or if this is the correct place to translate. Also worth doing further validation
            // (I did a visual check of the plots on Vienna1 and Nupack)
            for (let ii = 0; ii < data.length; ii += 3) {
                data[ii + 1]--;
                data[ii]--;
            }
        }
        plot.set2DData(data, this._sequence.length);
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

    /**
     * Given the constraints for the "raw" indices of bases (oligo order defined by targetOligos)
     * get the constraints for each base with the "target structure" indices of bases
     * (oligo order defined by the target structure, user-modifiable with magic glue)
     */
    private _targetAlignedConstraints(constraints: boolean[]) {
        const targetMap = this.reorderedOligosIndexMap(this.targetOligoOrder);

        if (targetMap != null) {
            const targetAlignedConstraints: boolean[] = [];
            for (const [targetIndex, rawIndex] of targetMap.entries()) {
                targetAlignedConstraints[targetIndex] = constraints[Number(rawIndex)];
            }
            return targetAlignedConstraints;
        } else {
            return constraints;
        }
    }

    public get targetAlignedStructureConstraints() {
        if (this.targetConditions !== undefined) {
            const structureConstraints = this.targetConditions['structure_constraints'];
            if (structureConstraints) {
                return this._targetAlignedConstraints(structureConstraints);
            }
        }
        return undefined;
    }

    public get targetAlignedAntiStructureConstraints() {
        if (this.targetConditions !== undefined) {
            const antiStructureConstraints = this.targetConditions['anti_structure_constraints'];
            if (antiStructureConstraints) {
                return this._targetAlignedConstraints(antiStructureConstraints);
            }
        }
        return undefined;
    }

    /**
     * Given the pair map for the "natural mode" indices of bases (oligo order defined by the natural mode folding)
     * get the pair map for using the "target structure" indices of bases
     * (oligo order defined by the target structure, user-modifiable with magic glue)
     * so that the pair map for natural mode can be compared to the pair map for target mode
     */
    public get targetAlignedNaturalPairs() {
        const pseudoknots = (this.targetConditions !== undefined && this.targetConditions['type'] === 'pseudoknot');
        const naturalPairs = this.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots);

        // targetAlignedIndex => rawIndex
        const targetMap = this.reorderedOligosIndexMap(this.targetOligoOrder);
        if (targetMap != null) {
            // naturalAlignedIndex => rawIndex
            const naturalMap = this.reorderedOligosIndexMap(this.oligoOrder);
            if (naturalMap !== undefined) {
                const targetAlignedNaturalPairs: SecStruct = new SecStruct();
                for (const [targetIndex, rawIndex] of targetMap.entries()) {
                    const naturalIndex = naturalMap.indexOf(rawIndex);
                    // If unpaired, it's unpaired, otherwise we need to get the index of the paired base
                    // according to target mode
                    if (!naturalPairs.isPaired(naturalIndex)) {
                        targetAlignedNaturalPairs.setUnpaired(targetIndex);
                    } else {
                        const naturalPairedIndex = naturalPairs.pairingPartner(naturalIndex);
                        const rawPairedIndex = naturalMap[naturalPairedIndex];
                        targetAlignedNaturalPairs.setPairingPartner(targetIndex, targetMap.indexOf(rawPairedIndex));
                    }
                }

                return targetAlignedNaturalPairs;
            } else {
                return naturalPairs;
            }
        } else {
            return naturalPairs;
        }
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
