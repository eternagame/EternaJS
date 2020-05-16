import {PoseState} from 'eterna/puzzle/Puzzle';
import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';
import RSignals from './RSignals';

enum ROPPreType {
    DISABLE_MISSION_SCREEN = 'DISABLE_MISSION_SCREEN',
    USE_ALTERNATE_PALETTE = 'USE_ALTERNATE_PALETTE',
    DISABLE_HINTS = 'DISABLE_HINTS',
    DISABLE_OBJECTIVES = 'DISABLE_OBJECTIVES',
    DISABLE_UI_ELEMENT = 'DISABLE_UI_ELEMENT',
    DISABLE_RNA_CHANGE = 'DISABLE_RNA_CHANGE',
    SET_DEFAULT_FOLD_MODE = 'SET_DEFAULT_FOLD_MODE',
    PUSH_PUZZLE = 'PUSH_PUZZLE'
}

export default class ROPPre extends RScriptOp {
    constructor(command: string, env: RScriptEnv) {
        super(env);
        this._type = null;

        const disMissionScreenRegex = /DisableMissionScreen/ig;
        const altPaletteRegex = /UseAlternatePalette/ig;
        const disableHintRegex = /DisableHintSystem/ig;
        const hideObjRegex = /HideObjectives/ig;
        const hideUIRegex = /(Hide|Show|Disable|Enable)UI/ig;
        const disableRNAMod = /(DisableRNAModification)/ig;
        const modeRegex = /^(Native|Target)Mode$/ig;
        const pushPuzzleRegex = /PushPuzzle/;

        let regResult: RegExpExecArray | null;
        if ((regResult = disMissionScreenRegex.exec(command)) != null) {
            this._type = ROPPreType.DISABLE_MISSION_SCREEN;
        } else if ((regResult = altPaletteRegex.exec(command)) != null) {
            this._type = ROPPreType.USE_ALTERNATE_PALETTE;
        } else if ((regResult = disableHintRegex.exec(command)) != null) {
            this._type = ROPPreType.DISABLE_HINTS;
        } else if ((regResult = hideObjRegex.exec(command)) != null) {
            this._type = ROPPreType.DISABLE_OBJECTIVES;
        } else if ((regResult = hideUIRegex.exec(command)) != null) {
            this._type = ROPPreType.DISABLE_UI_ELEMENT;
            this._doVisible = (regResult[1].toUpperCase() !== 'HIDE');
            this._doDisable = (regResult[1].toUpperCase() === 'DISABLE');
        } else if ((regResult = disableRNAMod.exec(command))) {
            this._type = ROPPreType.DISABLE_RNA_CHANGE;
        } else if ((regResult = modeRegex.exec(command)) != null) {
            this._type = ROPPreType.SET_DEFAULT_FOLD_MODE;
            this._foldMode = (regResult[1].toUpperCase() === 'NATIVE' ? PoseState.NATIVE : PoseState.TARGET);
        } else if ((regResult = pushPuzzleRegex.exec(command)) != null) {
            this._type = ROPPreType.PUSH_PUZZLE;
        }
    }

    public initArgs(args: string): void {
        this._allArgs = args.split(',');
        for (let i = 0; i < this._allArgs.length; ++i) {
            this._allArgs[i] = this._allArgs[i].replace(/^\s*/, '');
            this._allArgs[i] = this._allArgs[i].replace(/\s*$/, '');
        }
    }

    /* override */
    public exec(): void {
        switch (this._type) {
            case ROPPreType.DISABLE_MISSION_SCREEN:
                this._env.ui.showMissionScreen(false);
                break;
            case ROPPreType.USE_ALTERNATE_PALETTE:
                this._env.ui.toolbar.palette.setOverrideNoPair();
                this._env.ui.toolbar.palette.changeNoPairMode();
                break;
            case ROPPreType.DISABLE_HINTS:
                // _env.GetUI().remove_hint_system(true);
                break;
            case ROPPreType.DISABLE_OBJECTIVES:
                this._env.ui.showConstraints(false);
                break;
            case ROPPreType.DISABLE_UI_ELEMENT:
                for (let i = 0; i < this._allArgs.length; ++i) {
                    if (this._allArgs[i].toUpperCase() === 'ENERGY') {
                        this._env.ui.ropSetDisplayScoreTexts(this._doVisible);
                        continue;
                    }
                    if (this._allArgs[i].toUpperCase() === 'BASENUMBERING') {
                        this._env.ui.ropSetShowNumbering(this._doVisible);
                        continue;
                    }
                    if (this._allArgs[i].toUpperCase() === 'TOTALENERGY') {
                        this._env.ui.ropSetShowTotalEnergy(this._doVisible);
                        continue;
                    }
                    this._env.showHideUI(this._allArgs[i], this._doVisible, this._doDisable);
                    if (!this._doVisible) {
                        if (this._allArgs[i].toUpperCase() === 'OBJECTIVES') {
                            this._env.ui.showConstraints(false);
                        }
                    }
                }
                break;
            case ROPPreType.DISABLE_RNA_CHANGE:
                // no-op. What was this for?
                break;
            case ROPPreType.SET_DEFAULT_FOLD_MODE:
                this._env.puzzle.defaultMode = this._foldMode;
                break;
            case ROPPreType.PUSH_PUZZLE: {
                const puzzleId = parseInt(this._allArgs[0], 10);
                RSignals.pushPuzzle.emit(puzzleId);
                break;
            }
            default:
                throw new Error(`Invalid Preprocessing Command: ${this._type}`);
        }
    }

    private readonly _type: ROPPreType | null;
    private readonly _doVisible: boolean;
    private readonly _doDisable: boolean;
    private readonly _foldMode: PoseState;
    private _allArgs: string[];
}
