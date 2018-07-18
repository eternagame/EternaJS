import {Setting} from "../../flashbang/settings/Setting";
import {Settings} from "../../flashbang/settings/Settings";

export class EternaSettings extends Settings {
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

    public readonly soundMute: Setting<boolean>;
    public readonly soundVolume: Setting<number>;

    // TODO: recreate settings when playerID changes?
    public constructor() {
        super(`EternaSettings`);

        this.showNumbers = this.setting("showNumbers", true);
        this.showLetters = this.setting("showLetters", false);
        this.displayFreeEnergies = this.setting("displayFreeEnergies", false);
        this.highlightRestricted = this.setting("highlightRestricted", true);
        this.autohideToolbar = this.setting("autohideToolbar", false);
        this.freezeButtonAlwaysVisible = this.setting("freezeButtonAlwaysVisible", false);
        this.multipleFoldingEngines = this.setting("multipleFoldingEngines", false);
        this.useContinuousColors = this.setting("useContinuousColors", false);
        this.useExtendedColors = this.setting("useExtendedColors", false);
        this.displayAuxInfo = this.setting("displayAuxInfo", false);
        this.soundMute = this.setting("soundMute", false);
        this.soundVolume = this.setting("soundVolume", 0.6);
        this.lastUsedFolder = this.setting("lastUsedFolder", null);
        this.pipEnabled = this.setting("pipEnabled", false);
    }
}
