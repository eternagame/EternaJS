import Constraint from "./Constraint";

export default class ScriptConstraint extends Constraint {
    public static readonly NAME = "SCRIPT";

    constructor(scriptID: number) {
        super();
        this._scriptID = scriptID;
    }

    private _scriptID: number;
}