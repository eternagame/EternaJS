import RScriptEnv from './RScriptEnv';

/**
 * RScript Operation.
 * One instruction in RScript.
 * A node in RScriptOpTree.
 */
export default abstract class RScriptOp {
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
        args = args.replace(/<newline>/g, '\n');
        args = this.createStrings(args);

        let param: string[] = args.split(',');
        for (let i = 0; i < param.length; ++i) {
            let arg: string = param[i];
            arg = arg.replace(/^\s*/, '');
            arg = arg.replace(/\s*$/, '');
            if (arg === '') {
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
            let sIdx: number = arg.indexOf("'");
            let sMatchIdx: number = arg.indexOf("'", sIdx + 1);

            let dIdx: number = arg.indexOf('"');
            let dMatchIdx: number = arg.indexOf('"', dIdx + 1);

            let idx = -1;
            let matchIdx = -1;
            if ((sIdx < dIdx || dIdx === -1) && sIdx >= 0 && sMatchIdx >= 0) {
                idx = sIdx;
                matchIdx = sMatchIdx;
            } else if ((dIdx < sIdx || sIdx === -1) && dIdx >= 0 && dMatchIdx >= 0) {
                idx = dIdx;
                matchIdx = dMatchIdx;
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
