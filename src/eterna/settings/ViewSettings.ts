import {AbstractSettings} from "../../flashbang/settings/AbstractSettings";
import {Setting} from "../../flashbang/settings/Setting";

export class ViewSettings extends AbstractSettings {
    public readonly playerID: number;

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

    public constructor(playerId: number) {
        super(`ViewSettings-${playerId}`);
        this.playerID = playerId;

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
    }
}
