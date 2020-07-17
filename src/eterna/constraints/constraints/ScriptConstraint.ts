import ExternalInterface from 'eterna/util/ExternalInterface';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Constraint, {BaseConstraintStatus, HighlightInfo, ConstraintContext} from '../Constraint';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';

interface ScriptConstraintStatus extends BaseConstraintStatus {
    goal: string;
    resultValue: string;
    stateIndex: number;
    dataPNG: string;
    highlightRanges: number[];
}

export default class ScriptConstraint extends Constraint<ScriptConstraintStatus> {
    public static readonly NAME = 'SCRIPT';
    public readonly scriptID: number;

    constructor(scriptID: number) {
        super();
        this.scriptID = scriptID;
    }

    public evaluate(context: ConstraintContext): ScriptConstraintStatus {
        const result = ExternalInterface.runScriptSync(this.scriptID, {});

        return {
            goal: result.cause.goal != null ? result.cause.goal : '',
            resultValue: result.cause.value != null ? result.cause.value : '',
            stateIndex: result.cause.index != null && result.cause.index >= 0
                ? result.cause.index : null,
            highlightRanges: result.cause.highlight ? result.cause.highlight : [],
            dataPNG: result.cause.icon_b64 != null ? result.cause.icon_b64 : '',
            satisfied: !!result.cause.satisfied
        };
    }

    public getConstraintBoxConfig(
        status: ScriptConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        return {
            satisfied: status.satisfied,
            showOutline: true,
            drawBG: true,
            icon: status.dataPNG,
            stateNumber: status.stateIndex + 1,
            statText: !forMissionScreen ? status.resultValue : undefined,
            tooltip: ConstraintBox.createTextStyle().append(status.goal || `Your puzzle must satisfy script ${this.scriptID}`)
        };
    }

    public getHighlight(status: ScriptConstraintStatus): HighlightInfo {
        return {
            ranges: status.highlightRanges,
            color: HighlightType.USER_DEFINED,
            stateIndex: status.stateIndex
        };
    }

    public serialize(): [string, string] {
        return [
            ScriptConstraint.NAME,
            this.scriptID.toString()
        ];
    }
}
