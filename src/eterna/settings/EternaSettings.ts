import {ViewSettings} from "./ViewSettings";

export class EternaSettings {
    public readonly viewSettings: ViewSettings;

    // TODO: recreate settings when playerID changes?
    public constructor(playerID: number) {
        this.viewSettings = new ViewSettings(playerID);
    }
}
