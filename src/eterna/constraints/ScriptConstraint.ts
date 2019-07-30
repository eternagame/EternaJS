import UndoBlock from 'eterna/UndoBlock';
import Puzzle from 'eterna/puzzle/Puzzle';
import ExternalInterface from 'eterna/util/ExternalInterface';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Constraint, {BaseConstraintStatus, HighlightInfo} from './Constraint';
import ConstraintBox, {ConstraintBoxConfig} from './ConstraintBox';

interface ScriptConstraintStatus extends BaseConstraintStatus {
    goal: string;
    resultValue: string;
    stateIndex: number;
    dataPNG: string;
}

export default class ScriptConstraint extends Constraint<ScriptConstraintStatus> {
    public static readonly NAME = 'SCRIPT';
    public scriptID: number;

    constructor(scriptID: number) {
        super();
        this.scriptID = scriptID;
    }

    public evaluate(_1: UndoBlock[], _2: any[], puzzle?: Puzzle): ScriptConstraintStatus {
        let satisfied = false;

        const scriptID = this.scriptID;
        const scriptResult = ExternalInterface.runScriptSync(
            scriptID,
            {params: {puzzleInfo: puzzle.toJSON() || null}}
        ).result;

        let goal = '';
        let resultValue = '';
        let index = null;
        let dataPNG = '';
        if (scriptResult && scriptResult.cause) {
            if (scriptResult.cause.satisfied) satisfied = scriptResult.cause.satisfied;
            if (scriptResult.cause.goal != null) goal = scriptResult.cause.goal;
            if (scriptResult.cause.value != null) resultValue = scriptResult.cause.value;
            if (scriptResult.cause.index != null) {
                index = scriptResult.cause.index;
            }

            if (scriptResult.cause.icon_b64) {
                dataPNG = scriptResult.cause.icon_b64;
            }
        }

        return {
            goal,
            resultValue,
            stateIndex: index,
            dataPNG,
            satisfied
        };
    }

    public getConstraintBoxConfig(
        status: ScriptConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[],
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        return {
            satisfied: status.satisfied,
            drawBG: true,
            showOutline: true,
            iconTexture: status.dataPNG,
            stateNumber: status.stateIndex + 1,
            statText: !forMissionScreen ? status.resultValue : null,
            tooltip: ConstraintBox.createTextStyle().append(status.goal || `Your puzzle must satisfy script ${this.scriptID}`)
        };
    }

    public getHighlight(status: ScriptConstraintStatus): HighlightInfo {
        return {
            ranges: [],
            color: HighlightType.USER_DEFINED,
            stateIndex: status.stateIndex
        };
    }
}
