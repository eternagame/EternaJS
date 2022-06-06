import Puzzle from 'eterna/puzzle/Puzzle';
import PoseEditMode from 'eterna/mode/PoseEdit/PoseEditMode';
import ROPHighlight, {ROPHighlightMode} from './ROPHighlight';
import ROPHint from './ROPHint';
import ROPPre from './ROPPre';
import ROPRNA, {ROPRNAType} from './ROPRNA';
import ROPTextbox, {ROPTextboxMode} from './ROPTextbox';
import ROPUI from './ROPUI';
import ROPWait, {ROPWaitType} from './ROPWait';
import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';
import RScriptOpTree from './RScriptOpTree';
import ROPPopPuzzle from './ROPPopPuzzle';
import ROPShowMissionScreen from './ROPShowMissionScreen';
import ROPUIArrow from './ROPUIArrow';
import ROPUITooltip from './ROPUITooltip';

export default class RNAScript {
    constructor(puz: Puzzle, ui: PoseEditMode) {
        const strData: string = puz.rscript;

        this._env = new RScriptEnv(ui, puz);
        ui.addObject(this._env, ui.container);

        this._ops = new RScriptOpTree();

        // Convert string into instructions by splitting at semicolons.
        // If we ever make "Blocks" (i.e for IF conditionals), we'll need to make this a little
        // more complex
        const instructions: string[] = strData.split(';');
        for (let instruction of instructions) {
            instruction = instruction.replace(/^\s*/, '');
            instruction = instruction.replace(/\s*$/, '');
        }

        const newInstructions: string[] = [];
        const showUIInstructions: string[] = [];
        let bShowUI = false;
        for (const instruction of instructions) {
            const instRegex = /(#PRE-)?(\w+)\s*(.*)/gi;
            const regResult = instRegex.exec(instruction);
            if (regResult) {
                if (regResult[2] === 'ShowUIHighlight') {
                    showUIInstructions.push(instruction);
                    newInstructions.push(instruction);
                    bShowUI = true;
                } else if (regResult[2] === 'ShowUIArrow') {
                    showUIInstructions.push(instruction);
                    newInstructions.push(instruction);
                    bShowUI = true;
                } else if (regResult[2] === 'ShowUITooltip') {
                    showUIInstructions.push(instruction);
                    newInstructions.push(instruction);
                    bShowUI = true;
                } else {
                    if (bShowUI) {
                        const cmds = this._env.checkShowUI(showUIInstructions);
                        for (const cmd of cmds) {
                            newInstructions.push(cmd);
                        }
                    }
                    bShowUI = false;
                    newInstructions.push(instruction);
                }
            }
        }
        if (bShowUI) {
            const cmds = this._env.checkShowUI(showUIInstructions);
            for (const cmd of cmds) {
                newInstructions.push(cmd);
            }
        }
        bShowUI = false;

        // For each instruction, make it into an RScriptOp (OP).
        // Give it to the OpTree to handle placing it where it should go.
        for (const instruction of newInstructions) {
            this._ops.addNode(this.createOpFromInstruction(instruction));
        }
        this._ops.finishCreation();
    }

    /** Notify us when RNA is completed (or puzzle finishes). */
    public finishLevel(): void {
        ROPWait.notifyFinishRNA();
        ROPWait.clearRopWait();
        if (this._env) {
            this._env.cleanup();
        }
    }

    /** Executes an instruction from the RScript Instruction Stream. */
    public tick(): void {
        // Do not allow us to start executing instructions until the RNA loads properly
        // Also serves to prevent us from positioning anything in relation to the RNA when
        // the RNA bases are in the middle of folding.
        if (this._env.pose.isFolding || !this._env.ui.isPlaying) {
            return;
        }

        let node: RScriptOp | null = this._ops.next();
        while (node) {
            node.exec();

            if (this._env.pose.isFolding || !this._env.ui.isPlaying) {
                return;
            }

            node = this._ops.next();
        }
    }

    private createOpFromInstruction(instruction: string): RScriptOp | null {
        instruction = instruction.replace(/^\s*/, '');
        instruction = instruction.replace(/\s*$/, '');
        if (instruction === '') {
            return null;
        }

        const instRegex = /(#PRE-)?(\w+)\s*(.*)/gi;
        let regResult: RegExpExecArray | null;
        if ((regResult = instRegex.exec(instruction)) != null) {
            const op: string = (regResult[1] ? regResult[1] : '') + regResult[2];
            const args: string = regResult[3];
            // Based on the OP, create the proper RScriptOp.
            const ret: RScriptOp | null = this.opToRScriptOp(op, args);
            if (ret) {
                ret.initialize(op, args);
            }
            return ret;
        } else {
            throw new Error(`Invalid instruction format :: ${instruction}`);
        }
    }

    private opToRScriptOp(op: string, args: string): RScriptOp | null {
        // Strip op of any pre/post white space
        op = op.replace(/^\s*/, '');
        op = op.replace(/\s*$/, '');

        // Regex to detect the various commands
        const textboxRegex = /(Show|Hide)(Textbox|Arrow)(Location|Nucleotide|Energy)?/gi;
        const highlightRegex = /(Show|Hide)(UI)?Highlight/gi;
        const uiRegex = /(Show|Hide|Enable|Disable)UI$/gi;
        const hintRegex = /(Show|Hide)(Paint)?Hint/gi;
        const waitRegex = /WaitFor(.*)/gi;
        const preRegex = /#PRE-(.*)/g;
        const rnaRegex = /^RNA(SetBase|ChangeMode|EnableModification|SetPainter|ChangeState|SetZoom|SetPIP)$/gi;
        const popPuzzle = /PopPuzzle/;
        const showMissionScreen = /ShowMissionScreen/;
        const uiArrow = /(Show|Hide)UIArrow/;
        const uiTooltip = /(Show|Hide)UITooltip/;

        let regResult: RegExpExecArray | null;
        if ((regResult = preRegex.exec(op)) != null) {
            const rop: ROPPre = new ROPPre(regResult[1], this._env);
            rop.initArgs(args);
            rop.exec();
            // DOES NOT RETURN. WE DO NOT ADD THIS TO THE OP TREE.
            return null;
        } else if ((regResult = textboxRegex.exec(op))) {
            let textboxMode: ROPTextboxMode;
            if (regResult[2].toUpperCase() === 'ARROW') {
                if (regResult[3]) {
                    switch (regResult[3].toUpperCase()) {
                        case 'LOCATION':
                            textboxMode = ROPTextboxMode.ARROW_LOCATION;
                            break;
                        case 'NUCLEOTIDE':
                            textboxMode = ROPTextboxMode.ARROW_NUCLEOTIDE;
                            break;
                        case 'ENERGY':
                            textboxMode = ROPTextboxMode.ARROW_ENERGY;
                            break;
                        default:
                            throw new Error(
                                `Invalid arrow type: ${regResult[3]}`
                            );
                    }
                } else {
                    textboxMode = ROPTextboxMode.ARROW_DEFAULT;
                }
            } else if (regResult[3]) {
                textboxMode = regResult[3].toUpperCase() === 'LOCATION'
                    ? ROPTextboxMode.TEXTBOX_LOCATION
                    : ROPTextboxMode.TEXTBOX_NUCLEOTIDE;
            } else {
                textboxMode = ROPTextboxMode.TEXTBOX_DEFAULT;
            }

            const show: boolean = regResult[1].toUpperCase() === 'SHOW';
            return new ROPTextbox(this._env, show, textboxMode);
        } else if ((regResult = highlightRegex.exec(op))) {
            return new ROPHighlight(
                regResult[1].toUpperCase() === 'SHOW',
                regResult[2] ? ROPHighlightMode.UI : ROPHighlightMode.RNA,
                this._env
            );
        } else if ((regResult = uiRegex.exec(op))) {
            return new ROPUI(
                this._env,
                regResult[1].toUpperCase() !== 'HIDE',
                regResult[1].toUpperCase() === 'DISABLE'
            );
        } else if ((regResult = hintRegex.exec(op))) {
            return new ROPHint(
                regResult[1].toUpperCase() === 'SHOW',
                this._env
            );
        } else if ((regResult = waitRegex.exec(op))) {
            // AMW: We have to coerce this string. I wish this regResult[1] was provably
            // coercable!
            const waitType: ROPWaitType = regResult[1].toUpperCase() as ROPWaitType;
            return new ROPWait(waitType, this._env);
        } else if ((regResult = rnaRegex.exec(op))) {
            // AMW: We have to coerce this string. I wish this regResult[1] was provably
            // coercable!
            const ropRNAType: ROPRNAType = regResult[1].toUpperCase() as ROPRNAType;
            return new ROPRNA(ropRNAType, this._env);
        } else if ((regResult = popPuzzle.exec(op))) {
            return new ROPPopPuzzle(this._env);
        } else if ((regResult = showMissionScreen.exec(op))) {
            return new ROPShowMissionScreen(this._env);
        } else if ((regResult = uiArrow.exec(op))) {
            const [, show] = regResult;
            return new ROPUIArrow(this._env, show.toUpperCase() === 'SHOW');
        } else if ((regResult = uiTooltip.exec(op))) {
            const [, show] = regResult;
            return new ROPUITooltip(this._env, show.toUpperCase() === 'SHOW');
        }
        // Shouldn't reach here ever.
        throw new Error(`Invalid operation: ${op}`);
    }

    private readonly _env: RScriptEnv;
    private _ops: RScriptOpTree;
}
