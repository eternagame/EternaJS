import {Settings, Setting} from 'flashbang';
import Eterna from 'eterna/Eterna';
import {DesignCategory} from 'eterna/mode/DesignBrowser/DesignBrowserMode';

type BaseStyle = 'linear' | 'linearBright' | 'linearBrighter' | 'cel';

export default class EternaSettings extends Settings {
    public readonly showChat: Setting<boolean>;
    public readonly showNumbers: Setting<boolean>;
    public readonly showLetters: Setting<boolean>;
    public readonly showRope: Setting<boolean>;
    public readonly displayFreeEnergies: Setting<boolean>;
    public readonly highlightRestricted: Setting<boolean>;
    public readonly autohideToolbar: Setting<boolean>;
    public readonly freezeButtonAlwaysVisible: Setting<boolean>;
    public readonly useContinuousColors: Setting<boolean>;
    public readonly useExtendedColors: Setting<boolean>;
    public readonly lastUsedFolder: Setting<string> | Setting<null>;
    public readonly pipEnabled: Setting<boolean>;
    public readonly simpleGraphics: Setting<boolean>;
    public readonly usePuzzlerLayout: Setting<boolean>;

    public readonly soundMute: Setting<boolean>;
    public readonly soundVolume: Setting<number>;

    public readonly designBrowserColumnNames: Setting<DesignCategory[]> | Setting<null>;
    public readonly designBrowserSelectedSolutionIDs: Setting<number[]> | Setting<null>;

    public readonly puzzleSolvingHotbarTools: Setting<{left: string[]; right: string[]}> | Setting<null>;
    public readonly puzzlemakerHotbarTools: Setting<{left: string[]; right: string[]}> | Setting<null>;

    public readonly saveGamesTransfered: Setting<boolean>;
    public readonly puzzlemakerEternafoldNoticeDismissed: Setting<boolean>;

    public readonly baseStyle: Setting<BaseStyle>;
    public readonly colorblindTheme: Setting<boolean>;

    constructor() {
        super('EternaSettings');
        this.showChat = this.setting<boolean>('showChat', !Eterna.MOBILE_APP);
        this.showNumbers = this.setting<boolean>('showNumbers', true);
        this.showLetters = this.setting<boolean>('showLetters', true);
        this.showRope = this.setting<boolean>('showRope', false);
        this.displayFreeEnergies = this.setting<boolean>('displayFreeEnergies', false);
        this.highlightRestricted = this.setting<boolean>('highlightRestricted', true);
        this.autohideToolbar = this.setting<boolean>('autohideToolbar', false);
        this.freezeButtonAlwaysVisible = this.setting<boolean>('freezeButtonAlwaysVisible', false);
        this.useContinuousColors = this.setting<boolean>('useContinuousColors', false);
        this.useExtendedColors = this.setting<boolean>('useExtendedColors', false);
        this.soundMute = this.setting<boolean>('soundMute', false);
        this.soundVolume = this.setting('soundVolume', 0.6);
        this.lastUsedFolder = this.setting('lastUsedFolder', null);
        this.pipEnabled = this.setting<boolean>('pipEnabled', false);
        this.simpleGraphics = this.setting<boolean>('simpleGraphics', false);
        this.usePuzzlerLayout = this.setting<boolean>('usePuzzlerLayout', false);
        this.designBrowserColumnNames = this.setting('designBrowserColumnNames-3', null);
        this.designBrowserSelectedSolutionIDs = this.setting('designBrowserSelectedSolutionIDs', null);

        this.puzzleSolvingHotbarTools = this.setting('puzzleSolvingHotbarTools', null);
        this.puzzlemakerHotbarTools = this.setting('puzzlemakerHotbarTools', null);

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

        this.puzzlemakerEternafoldNoticeDismissed = this.setting<boolean>(
            'puzzlemakerEternafoldNoticeDismissed',
            false
        );

        this.colorblindTheme = this.setting<boolean>('colorblindTheme', false);
    }
}
