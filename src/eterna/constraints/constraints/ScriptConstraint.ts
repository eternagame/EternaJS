import UndoBlock from 'eterna/UndoBlock';
import Puzzle from 'eterna/puzzle/Puzzle';
import ExternalInterface from 'eterna/util/ExternalInterface';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Constraint, {BaseConstraintStatus, HighlightInfo} from '../Constraint';
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

    public evaluate(undoBlocks: UndoBlock[], targetConditions: any[], puzzle: Puzzle): ScriptConstraintStatus {
        const scriptResult = ExternalInterface.runScriptSync(
            this.scriptID,
            {params: {puzzleInfo: puzzle.toJSON() || null}}
        ).result;

        return {
            goal: scriptResult.cause.goal != null ? scriptResult.cause.goal : '',
            resultValue: scriptResult.cause.value != null ? scriptResult.cause.value : '',
            stateIndex: scriptResult.cause.index != null && scriptResult.cause.index >= 0
                ? scriptResult.cause.index : null,
            highlightRanges: scriptResult.cause.highlight ? scriptResult.cause.highlight : [],
            dataPNG: scriptResult.cause.icon_b64 != null ? scriptResult.cause.icon_b64 : '',
            satisfied: !!scriptResult.cause.satisfied
        };
    }

    public getConstraintBoxConfig(
        status: ScriptConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        return {
            satisfied: status.satisfied,
            drawBG: true,
            showOutline: true,
            icon: status.dataPNG,
            stateNumber: status.stateIndex + 1,
            statText: !forMissionScreen ? status.resultValue : null,
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
}
