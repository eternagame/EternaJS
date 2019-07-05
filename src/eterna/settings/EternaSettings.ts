import {Setting, Settings} from 'flashbang/settings';
import {DesignCategory} from 'eterna/mode/DesignBrowser';
import Eterna from 'eterna/Eterna';

export default class EternaSettings extends Settings {
    public readonly showChat: Setting<boolean>;
    public readonly showNumbers: Setting<boolean>;
    public readonly showLetters: Setting<boolean>;
    public readonly displayFreeEnergies: Setting<boolean>;
    public readonly highlightRestricted: Setting<boolean>;
    public readonly autohideToolbar: Setting<boolean>;
    public readonly freezeButtonAlwaysVisible: Setting<boolean>;
    public readonly multipleFoldingEngines: Setting<boolean>;
    public readonly useContinuousColors: Setting<boolean>;
    public readonly useExtendedColors: Setting<boolean>;
    public readonly displayAuxInfo: Setting<boolean>;
    public readonly lastUsedFolder: Setting<string>;
    public readonly pipEnabled: Setting<boolean>;
    public readonly simpleGraphics: Setting<boolean>;

    public readonly soundMute: Setting<boolean>;
    public readonly soundVolume: Setting<number>;

    public readonly designBrowserColumnNames: Setting<DesignCategory[]>;
    public readonly designBrowserSelectedSolutionIDs: Setting<number[]>;

    public readonly saveGamesTransfered: Setting<boolean>;

    constructor() {
        super('EternaSettings');

        this.showChat = this.setting<boolean>('showChat', true);
        this.showNumbers = this.setting<boolean>('showNumbers', true);
        this.showLetters = this.setting<boolean>('showLetters', false);
        this.displayFreeEnergies = this.setting<boolean>('displayFreeEnergies', false);
        this.highlightRestricted = this.setting<boolean>('highlightRestricted', true);
        this.autohideToolbar = this.setting<boolean>('autohideToolbar', false);
        this.freezeButtonAlwaysVisible = this.setting<boolean>('freezeButtonAlwaysVisible', false);
        this.multipleFoldingEngines = this.setting<boolean>('multipleFoldingEngines', false);
        this.useContinuousColors = this.setting<boolean>('useContinuousColors', false);
        this.useExtendedColors = this.setting<boolean>('useExtendedColors', false);
        this.displayAuxInfo = this.setting<boolean>('displayAuxInfo', false);
        this.soundMute = this.setting<boolean>('soundMute', false);
        this.soundVolume = this.setting('soundVolume', 0.6);
        this.lastUsedFolder = this.setting('lastUsedFolder', null);
        this.pipEnabled = this.setting<boolean>('pipEnabled', false);
        this.simpleGraphics = this.setting<boolean>('simpleGraphics', false);

        this.designBrowserColumnNames = this.setting('designBrowserColumnNames', null);
        this.designBrowserSelectedSolutionIDs = this.setting('designBrowserSelectedSolutionIDs', null);

        // Denotes whether savegames have been transfered from localstorage/storeJS/EternaSettings to
        // indexedDB/localforage/SaveGameManager - eventually this might be able to be dropped,
        // but anyone who hasn't run Eterna between the EternaJS launch and the time it was
        // introduced will loose any autosaves
        this.saveGamesTransfered = this.setting<boolean>('saveGamesTransfered', false);

        if (this.saveGamesTransfered.value === false) {
            this._namespace.each((val, key) => {
                if (key.match(/^(puz|puzedit)_.*$/)) {
                    Eterna.saveManager.save(key, val);
                    this.removeObject(key);
                }
            });
            this.saveGamesTransfered.value = true;
        }
    }
}
