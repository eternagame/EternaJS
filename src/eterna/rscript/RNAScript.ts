import {PoseEditMode} from 'eterna/mode';
import {Puzzle} from 'eterna/puzzle';
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

export default class RNAScript {
    constructor(puz: Puzzle, ui: PoseEditMode) {
        let strData: string = puz.rscript;

        this._env = new RScriptEnv(ui, puz);
        ui.addObject(this._env, ui.container);

        ROPWait.clearRopWait();
        this._ops = new RScriptOpTree();

        // Convert string into instructions by splitting at semicolons.
        // If we ever make "Blocks" (i.e for IF conditionals), we'll need to make this a little
        // more complex
        let instructions: string[] = strData.split(';');

        // For each instruction, make it into an RScriptOp (OP).
        // Give it to the OpTree to handle placing it where it should go.
        for (let instruction of instructions) {
            this._ops.addNode(this.createOpFromInstruction(instruction));
        }
        this._ops.finishCreation();
    }

    /** Notify us when RNA is completed (or puzzle finishes). */
    public finishLevel(): void {
        ROPWait.notifyFinishRNA();
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

        let node: RScriptOp = this._ops.next();
        while (node) {
            node.exec();

            if (this._env.pose.isFolding || !this._env.ui.isPlaying) {
                return;
            }

            node = this._ops.next();
        }
    }

    private createOpFromInstruction(instruction: string): RScriptOp {
        instruction = instruction.replace(/^\s*/, '');
        instruction = instruction.replace(/\s*$/, '');
        if (instruction === '') {
            return null;
        }

        const instRegex = /(#PRE-)?(\w+)\s*(.*)/ig;
        let regResult: RegExpExecArray;
        if ((regResult = instRegex.exec(instruction)) != null) {
            let op: string = (regResult[1] ? regResult[1] : '') + regResult[2];
            let args: string = regResult[3];
            // Based on the OP, create the proper RScriptOp.
            let ret: RScriptOp = this.opToRScriptOp(op, args);
            if (ret) {
                ret.initialize(op, args);
            }
            return ret;
        } else {
            throw new Error(`Invalid instruction format :: ${instruction}`);
        }
    }

    private opToRScriptOp(op: string, args: string): RScriptOp {
        // Strip op of any pre/post white space
        op = op.replace(/^\s*/, '');
        op = op.replace(/\s*$/, '');

        // Regex to detect the various commands
        let textboxRegex = /(Show|Hide)(Textbox|Arrow)(Location|Nucleotide)?/ig;
        let highlightRegex = /(Show|Hide)(UI)?Highlight/ig;
        let uiRegex = /(Show|Hide|Enable|Disable)UI$/ig;
        let hintRegex = /(Show|Hide)(Paint)?Hint/ig;
        let waitRegex = /WaitFor(.*)/ig;
        let preRegex = /#PRE-(.*)/g;
        let rnaRegex = /^RNA(SetBase|ChangeMode|EnableModification|SetPainter|ChangeState|SetZoom|SetPIP)$/ig;

        let regResult: any[];
        if ((regResult = preRegex.exec(op)) != null) {
            let rop: ROPPre = new ROPPre(regResult[1], this._env);
            rop.initArgs(args);
            rop.exec();
            // DOES NOT RETURN. WE DO NOT ADD THIS TO THE OP TREE.
            return null;
        } else if ((regResult = textboxRegex.exec(op))) {
            let textboxMode: ROPTextboxMode;
            if (regResult[2].toUpperCase() === 'ARROW') {
                if (regResult[3]) {
                    textboxMode = regResult[3].toUpperCase() === 'LOCATION'
                        ? ROPTextboxMode.ARROW_LOCATION
                        : ROPTextboxMode.ARROW_NUCLEOTIDE;
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

            let show: boolean = regResult[1].toUpperCase() === 'SHOW';
            return new ROPTextbox(this._env, show, textboxMode);
        } else if ((regResult = highlightRegex.exec(op))) {
            return new ROPHighlight(
                regResult[1].toUpperCase() === 'SHOW',
                regResult[2] ? ROPHighlightMode.UI : ROPHighlightMode.RNA,
                this._env
            );
        } else if ((regResult = uiRegex.exec(op))) {
            return new ROPUI(
                this._env, regResult[1].toUpperCase() !== 'HIDE', regResult[1].toUpperCase() === 'DISABLE'
            );
        } else if ((regResult = hintRegex.exec(op))) {
            return new ROPHint(regResult[1].toUpperCase() === 'SHOW', this._env);
        } else if ((regResult = waitRegex.exec(op))) {
            let waitType: ROPWaitType = regResult[1].toUpperCase();
            return new ROPWait(waitType, this._env);
        } else if ((regResult = rnaRegex.exec(op))) {
            let ropRNAType: ROPRNAType = regResult[1].toUpperCase();
            return new ROPRNA(ropRNAType, this._env);
        }
        // Shouldn't reach here ever.
        throw new Error(`Invalid operation: ${op}`);
    }

    private readonly _env: RScriptEnv;
    private _ops: RScriptOpTree;
}
