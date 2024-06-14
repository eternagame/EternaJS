import * as log from 'loglevel';
import ExternalInterface, {ExternalInterfaceCtx} from './util/ExternalInterface';
import Vienna from './folding/Vienna';
import Vienna2 from './folding/Vienna2';
import NuPACK from './folding/NuPACK';
import Contrafold from './folding/Contrafold';
import EternaFold from './folding/Eternafold';
import EternaFoldThreshknot from './folding/EternafoldThreshknot';
import RNAFoldBasic from './folding/RNAFoldBasic';
import FolderManager from './folding/FolderManager';
import LinearFoldC from './folding/LinearFoldC';
import LinearFoldE from './folding/LinearFoldE';
import LinearFoldV from './folding/LinearFoldV';
import Folder from './folding/Folder';
import FoldingAPI from './eternaScript/FoldingAPI';
import addSelectFolderAPIToInterface from './eternaScript/SelectFolderAPI';

interface FoldingAppParams {
    containerID?: string;
    folderName?: string;
}

interface ProcessedFoldingAppParams {
    containerID: string;
    folderName: string;
}

export class WasmNotSupportedError extends Error {}

export class ContainerElementNotFound extends Error {}

/**
 * Entry point for the folding API provider.
 *
 * This is an alternate version of EternaJS, only exposing the API needed for scripts to work
 * (e.g. `Lib.fold` via `document.getElementById("maingame").fold`).
 * */
export default class FoldingAPIApp {
    constructor(params: FoldingAppParams) {
        // Default param values
        params.containerID = params.containerID || 'maingame';
        params.folderName = 'vienna';

        this._params = {containerID: params.containerID, folderName: params.folderName};

        const appContainer: HTMLElement | null = document.getElementById(params.containerID);
        if (!appContainer) {
            throw new ContainerElementNotFound(`Could not find HTML element with ID ${params.containerID}`);
        }
        this._appContainer = appContainer;

        ExternalInterface.init(appContainer);
    }

    private static isWebAssemblySupported() {
        return typeof WebAssembly === 'object';
    }

    public async run(): Promise<void> {
        if (!FoldingAPIApp.isWebAssemblySupported()) {
            throw new WasmNotSupportedError(
                "Can't initialize the folding API app, since the browser doesn't support WASM"
            );
        }

        await this.initFoldingEngines();
        this.initScriptInterface();
    }

    public disposeNow(): void {
        this._appContainer.innerHTML = '';

        FolderManager.dispose();
        ExternalInterface.dispose();
    }

    private async initFoldingEngines(): Promise<void> {
        log.info('Initializing folding engines...');
        const folders: (Folder | null)[] = await Promise.all([
            Vienna.create(),
            Vienna2.create(),
            NuPACK.create(),
            LinearFoldC.create(),
            LinearFoldE.create(),
            LinearFoldV.create(),
            Contrafold.create(),
            EternaFold.create(),
            EternaFoldThreshknot.create(),
            RNAFoldBasic.create()]);

        log.info('Folding engines intialized');
        for (const folder of folders) {
            if (folder !== null) {
                FolderManager.instance.addFolder(folder);
            }
        }

        const folder = FolderManager.instance.getFolder(this._params.folderName);
        if (folder === null) {
            log.warn(`No such folder '${this._params.folderName}'`);
        } else {
            this._folder = folder;
        }
    }

    private trySelectFolder(folderName: string): boolean {
        const folder = FolderManager.instance.getFolder(folderName);
        if (folder === null) {
            log.warn(`No such folder '${this._params.folderName}'`);
            return false;
        } else {
            return true;
        }
    }

    private initScriptInterface(): void {
        new FoldingAPI({
            getFolder: () => this._folder,
            getIsPseudoknot: () => false
        }).registerToScriptInterface(this._scriptInterface);
        addSelectFolderAPIToInterface({
            selectFolder: (folderName) => this.trySelectFolder(folderName),
            scriptInterface: this._scriptInterface
        });

        ExternalInterface.pushContext(this._scriptInterface);
    }

    private readonly _params: ProcessedFoldingAppParams;
    private readonly _scriptInterface: ExternalInterfaceCtx = new ExternalInterfaceCtx();
    private readonly _appContainer: HTMLElement;
    private _folder: Folder;
}
