import {RScriptEnv} from "./RScriptEnv";

/**
 * RScript Operation.
 * One instruction in RScript.
 * A node in RScriptOpTree.
 */
export abstract class RScriptOp {
    protected constructor(env: RScriptEnv) {
        this._children = [];
        this._env = env;
    }

    public addChildOp(op: RScriptOp): void {
        this._children.push(op);
    }

    // Children operations. Most operations will only have one but

    public next(): RScriptOp {
        return this._children[0];
    }

    public getPauseNext(): RScriptOp {
        return this;
    }

    public exec(): void {
    }

    public initialize(op: string, args: string): void {
        this._originalOp = op;
        this._originalArgs = args;

        // Replace <newline> with \n regardless of where it is.
        args = args.replace(/\<newline\>/g, "\n");
        args = this.createStrings(args);

        let param: string[] = args.split(",");
        for (let i = 0; i < param.length; ++i) {
            let arg: string = param[i];
            arg = arg.replace(/^\s*/, "");
            arg = arg.replace(/\s*$/, "");
            if (arg === "") {
                continue;
            }
            this.parseArgument(arg, i);
        }
        this.verifyArguments();
    }

    /** Allows us to delay execution if necessary. */
    public isPaused(): boolean {
        return false;
    }

    /** Meant to throw an error if some argument is invalid. */
    protected verifyArguments(): void {
    }

    protected createStrings(arg: string): string {
        // Identify strings marked by "" or '' and store them in the environment.
        while (true) {
            // Find the first matching pair of quotation marks. Single or double.
            let s_idx: number = arg.indexOf("'");
            let s_matchIdx: number = arg.indexOf("'", s_idx + 1);

            let d_idx: number = arg.indexOf("\"");
            let d_matchIdx: number = arg.indexOf("\"", d_idx + 1);

            let idx = -1;
            let matchIdx = -1;
            if ((s_idx < d_idx || d_idx === -1) && s_idx >= 0 && s_matchIdx >= 0) {
                idx = s_idx;
                matchIdx = s_matchIdx;
            } else if ((d_idx < s_idx || s_idx === -1) && d_idx >= 0 && d_matchIdx >= 0) {
                idx = d_idx;
                matchIdx = d_matchIdx;
            }

            if (idx === -1 || matchIdx === -1) {
                break;
            }

            let refStr: string = arg.slice(idx, matchIdx + 1);
            let storeStr: string = arg.slice(idx + 1, matchIdx);
            let key: string = this._env.generateStringRefName();
            this._env.setVar(key, storeStr);
            // TSC: string.replace is dropping the first $ in the $$STRINGREF token... ???
            // arg = arg.replace(refStr, key);
            arg = arg.split(refStr).join(key);
        }
        return arg;
    }

    protected parseArgument(arg: string, i: number): void {
    }

    protected readonly _env: RScriptEnv;
    protected readonly _children: RScriptOp[];

    // Store original text of the inpute op and arguments.
    protected _originalOp: string;
    protected _originalArgs: string;
}
