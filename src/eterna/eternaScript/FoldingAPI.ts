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

    public registerToScriptInterface(scriptInterface: ExternalInterfaceCtx) {
    }
}
