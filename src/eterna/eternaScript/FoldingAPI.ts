import EPars from 'eterna/EPars';
import Folder, {SuboptEnsembleResult} from 'eterna/folding/Folder';
import DotPlot from 'eterna/rnatypes/DotPlot';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import {ExternalInterfaceCtx} from 'eterna/util/ExternalInterface';
import {Assert} from 'flashbang';

/**
 * An EternaScript API exposing all functions that handle folding an arbitrary
 * RNA sequence, and aren't dependent on what's the RNA in the puzzle.
 *
 * It adds itself to an existing script API (`ExternalInterfaceCtx`) from
 * `this.registerToScriptInterface`.
 *
 * Note: The API in this class is still affected by the selected folder
 * and the pseudoknot mode of the puzzle - just not the sequence.
 */
export default class FoldingAPI {
    private readonly _getFolder: () => Folder | null;
    private readonly _getIsPseudoknot: () => boolean;

    private get _folder(): Folder | null {
        return this._getFolder();
    }

    private get _isPseudoknot(): boolean {
        return this._getIsPseudoknot();
    }

    constructor(params: { getFolder: () => Folder, getIsPseudoknot: () => boolean }) {
        this._getIsPseudoknot = params.getIsPseudoknot;
        this._getFolder = params.getFolder;
    }

    public registerToScriptInterface(scriptInterfaceCtx: ExternalInterfaceCtx) {
        scriptInterfaceCtx.addCallback(
            'fold',
            (seq: string, constraint: string | null = null): string | null => {
                if (this._folder === null) {
                    return null;
                }
                if (!this._folder.isSync()) {
                    throw new Error('Attempted to use asynchronous folding engine synchronously');
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._isPseudoknot;
                const folded: SecStruct | null = this._folder.foldSequence(seqArr, null, constraint, pseudoknots);
                Assert.assertIsDefined(folded);
                return folded.getParenthesis({pseudoknots});
            }
        );

        scriptInterfaceCtx.addCallback(
            'fold_async',
            async (seq: string, constraint: string | null = null): Promise<string | null> => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._isPseudoknot;
                const folded: SecStruct | null = await this._folder.foldSequence(seqArr, null, constraint, pseudoknots);
                Assert.assertIsDefined(folded);
                return folded.getParenthesis({pseudoknots});
            }
        );

        scriptInterfaceCtx.addCallback(
            'fold_with_binding_site',
            (seq: string, site: number[], bonus: number): string | null => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._isPseudoknot;
                const folded: SecStruct | null = this._folder.foldSequenceWithBindingSite(
                    seqArr, null, site, Math.floor(bonus * 100), 2.5
                );
                if (folded === null) {
                    return null;
                }
                return folded.getParenthesis({pseudoknots});
            }
        );

        scriptInterfaceCtx.addCallback(
            'fold_with_binding_site_async',
            async (seq: string, site: number[], bonus: number): Promise<string | null> => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._isPseudoknot;
                const folded: SecStruct | null = this._folder.foldSequenceWithBindingSite(
                    seqArr, null, site, Math.floor(bonus * 100), 2.5
                );
                if (folded === null) {
                    return null;
                }
                return folded.getParenthesis({pseudoknots});
            }
        );

        scriptInterfaceCtx.addCallback(
            'energy_of_structure',
            (seq: string, secstruct: string): number | null => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._isPseudoknot;
                const structArr: SecStruct = SecStruct.fromParens(secstruct, pseudoknots);
                const freeEnergy = this._isPseudoknot
                    ? this._folder.scoreStructures(seqArr, structArr, true)
                    : this._folder.scoreStructures(seqArr, structArr);
                return 0.01 * freeEnergy;
            }
        );

        scriptInterfaceCtx.addCallback(
            'energy_of_structure_async',
            async (seq: string, secstruct: string): Promise<number | null> => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._isPseudoknot;
                const structArr: SecStruct = SecStruct.fromParens(secstruct, pseudoknots);
                const freeEnergy = this._isPseudoknot
                    ? this._folder.scoreStructures(seqArr, structArr, true)
                    : this._folder.scoreStructures(seqArr, structArr);
                return 0.01 * freeEnergy;
            }
        );

        scriptInterfaceCtx.addCallback(
            'pairing_probabilities',
            (seq: string, secstruct: string | null = null): number[] | null => {
                if (this._folder === null) {
                    return null;
                }
                if (!this._folder.isSync()) {
                    throw new Error('Attempted to use asynchronous folding engine synchronously');
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._isPseudoknot;
                let folded: SecStruct | null;
                if (secstruct) {
                    folded = SecStruct.fromParens(secstruct, pseudoknots);
                } else {
                    folded = this._folder.foldSequence(seqArr, null, null);
                    if (folded === null) {
                        return null;
                    }
                }
                const pp: DotPlot | null = this._folder.getDotPlot(seqArr, folded);
                Assert.assertIsDefined(pp);
                return pp.data;
            }
        );

        scriptInterfaceCtx.addCallback(
            'pairing_probabilities_async',
            async (seq: string, secstruct: string | null = null): Promise<number[] | null> => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._isPseudoknot;
                let folded: SecStruct | null;
                if (secstruct) {
                    folded = SecStruct.fromParens(secstruct, pseudoknots);
                } else {
                    folded = await this._folder.foldSequence(seqArr, null, null);
                    if (folded === null) {
                        return null;
                    }
                }
                const pp: DotPlot | null = await this._folder.getDotPlot(seqArr, folded);
                Assert.assertIsDefined(pp);
                return pp.data;
            }
        );

        scriptInterfaceCtx.addCallback(
            'subopt_single_sequence',
            (
                seq: string, kcalDelta: number,
                pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): SuboptEnsembleResult | null => {
                if (this._folder === null) {
                    return null;
                }
                // now get subopt stuff
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                return this._folder.getSuboptEnsembleNoBindingSite(seqArr,
                    kcalDelta, pseudoknotted, temp);
            }
        );

        scriptInterfaceCtx.addCallback(
            'subopt_single_sequence_async',
            async (
                seq: string, kcalDelta: number,
                pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): Promise<SuboptEnsembleResult | null> => {
                if (this._folder === null) {
                    return null;
                }
                // now get subopt stuff
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                return this._folder.getSuboptEnsembleNoBindingSite(seqArr,
                    kcalDelta, pseudoknotted, temp);
            }
        );

        scriptInterfaceCtx.addCallback(
            'subopt_oligos',
            (
                seq: string, oligoStrings: string[], kcalDelta: number,
                pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): SuboptEnsembleResult | null => {
                if (this._folder === null) {
                    return null;
                }
                // make the sequence string from the oligos
                let newSequence: string = seq;
                for (let oligoIndex = 0; oligoIndex < oligoStrings.length; oligoIndex++) {
                    const oligoSequence: string = oligoStrings[oligoIndex];
                    newSequence = `${newSequence}&${oligoSequence}`;
                }

                // now get subopt stuff
                const seqArr: Sequence = Sequence.fromSequenceString(newSequence);
                return this._folder.getSuboptEnsembleWithOligos(seqArr,
                    oligoStrings, kcalDelta, pseudoknotted, temp);
            }
        );

        scriptInterfaceCtx.addCallback(
            'subopt_oligos_async',
            async (
                seq: string, oligoStrings: string[], kcalDelta: number,
                pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): Promise<SuboptEnsembleResult | null> => {
                if (this._folder === null) {
                    return null;
                }
                // make the sequence string from the oligos
                let newSequence: string = seq;
                for (let oligoIndex = 0; oligoIndex < oligoStrings.length; oligoIndex++) {
                    const oligoSequence: string = oligoStrings[oligoIndex];
                    newSequence = `${newSequence}&${oligoSequence}`;
                }

                // now get subopt stuff
                const seqArr: Sequence = Sequence.fromSequenceString(newSequence);
                return this._folder.getSuboptEnsembleWithOligos(seqArr,
                    oligoStrings, kcalDelta, pseudoknotted, temp);
            }
        );

        scriptInterfaceCtx.addCallback(
            'cofold',
            (
                seq: string, oligo: string, malus: number = 0.0, constraint: string | null = null
            ): string | null => {
                if (this._folder === null) {
                    return null;
                }
                const len: number = seq.length;
                const cseq = `${seq}&${oligo}`;
                const seqArr: Sequence = Sequence.fromSequenceString(cseq);
                const pseudoknots = this._isPseudoknot;
                const folded: SecStruct | null = this._folder.cofoldSequence(
                    seqArr, null, Math.floor(malus * 100), constraint
                );
                if (folded === null) {
                    return null;
                }
                return `${folded.slice(0, len).getParenthesis({pseudoknots})
                }&${folded.slice(len).getParenthesis({pseudoknots})}`;
            }
        );

        scriptInterfaceCtx.addCallback(
            'cofold_async',
            async (
                seq: string, oligo: string, malus: number = 0.0, constraint: string | null = null
            ): Promise<string | null> => {
                if (this._folder === null) {
                    return null;
                }
                const len: number = seq.length;
                const cseq = `${seq}&${oligo}`;
                const seqArr: Sequence = Sequence.fromSequenceString(cseq);
                const pseudoknots = this._isPseudoknot;
                const folded: SecStruct | null = this._folder.cofoldSequence(
                    seqArr, null, Math.floor(malus * 100), constraint
                );
                if (folded === null) {
                    return null;
                }
                return `${folded.slice(0, len).getParenthesis({pseudoknots})
                }&${folded.slice(len).getParenthesis({pseudoknots})}`;
            }
        );

        scriptInterfaceCtx.addCallback(
            'get_defect',
            (
                seq: string, secstruct: string, pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): number | null => {
                if (this._folder === null) {
                    return null;
                }
                return this._folder.getDefect(
                    Sequence.fromSequenceString(seq),
                    SecStruct.fromParens(secstruct, pseudoknotted),
                    temp, pseudoknotted
                );
            }
        );

        scriptInterfaceCtx.addCallback(
            'get_defect_async',
            async (
                seq: string, secstruct: string, pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): Promise<number | null> => {
                if (this._folder === null) {
                    return null;
                }
                return this._folder.getDefect(
                    Sequence.fromSequenceString(seq),
                    SecStruct.fromParens(secstruct, pseudoknotted),
                    temp, pseudoknotted
                );
            }
        );
    }
}
