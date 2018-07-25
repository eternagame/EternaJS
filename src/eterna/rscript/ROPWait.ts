import {ROPTextbox} from "./ROPTextbox";
import {RScriptEnv} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";

export class ROPWait extends RScriptOp {
    public static ClearROPWait(): void {
        ROPWait._allROPWaitOps = [];
    }

    // Manage all of the ROP Waits -- ROPWait (Static) will manage it self.
    // This way we can notify ROPWait directly from the EteRNA code (easiest way to do this).

    public static RegisterROPWait(op: ROPWait): void {
        let iType: number = op.GetWaitType();
        if (ROPWait._allROPWaitOps[iType] == null) {
            ROPWait._allROPWaitOps[iType] = [];
        }
        ROPWait._allROPWaitOps[iType].push(op);
    }

    public static BatchDeregister(ops: ROPWait[]): void {
        for (let op of ops) {
            ROPWait.DeregisterROPWait(op);
        }
    }

    public static DeregisterROPWait(op: ROPWait): void {
        let iType: number = op.GetWaitType();
        let idx: number = ROPWait._allROPWaitOps[iType].indexOf(op);
        ROPWait._allROPWaitOps[iType].splice(idx, 1);
    }

    public static NotifyMoveCamera(): void {
        ROPWait.GenericNotifyClear(0, (): boolean => {
            return true;
        });
    }

    public static NotifyClickUI(key: string): void {
        if (key == "") {
            return;
        }
        ROPWait.GenericNotifyClear(1, (op: ROPWait): boolean => {
            return (op.GetElements().indexOf(key) != -1);
        });
    }

    public static NotifyNucleotideChange(i: number, inColor: number): void {
        if (i == -1) {
            return;
        }
        let newColor: string = RScriptEnv.ConvertNucleotideIntToString(inColor);

        ROPWait.GenericNotifyClear(2, (op: ROPWait): boolean => {
            return op.AddNucleotideCompletion(i, newColor);
        });
        ROPWait.GenericNotifyClear(6, (op: ROPWait): boolean => {
            return op.AddNucleotideCompletion(i, newColor);
        });
    }

    public static NotifyBlackMark(i: number, marked: boolean): void {
        ROPWait.NotifyMark(8, i, marked);
    }

    public static NotifyBlueMark(i: number, marked: boolean): void {
        ROPWait.NotifyMark(9, i, marked);
    }

    public static NotifyPaint(i: number, inColor: number, newColor: number): void {
        let previousColor: string = RScriptEnv.ConvertNucleotideIntToString(inColor);
        let changeColor: string = RScriptEnv.ConvertNucleotideIntToString(newColor);
        ROPWait.GenericNotifyClear(3, (op: ROPWait): boolean => {
            op.AddPreviousColor(previousColor, i);
            return op.AddNucleotideCompletion(i, changeColor);
        });
    }

    public static NotifyEndPaint(): void {
        // When we finish painting, if not everything we wanted to be painted was painted,
        // then reset the player's progress on those nucleotides. And (if specified), show
        // a textbox.
        if (!ROPWait._allROPWaitOps || !ROPWait._allROPWaitOps[3]) {
            return;
        }

        for (let i: number = 0; i < ROPWait._allROPWaitOps[3].length; ++i) {
            if (!ROPWait._allROPWaitOps[3][i].IsWaitActive()) {
                continue;
            }

            if (ROPWait._allROPWaitOps[3][i].IsPaused()) {
                ROPWait._allROPWaitOps[3][i].ResetPaint();
            } else {
                ROPWait._allROPWaitOps[3][i].PassPaint();
            }
        }
    }

    public static NotifyTextboxProgress(id: string): void {
        ROPWait.GenericNotifyClear(4, (op: ROPWait): boolean => {
            return (op.GetId() + ROPTextbox.id_postfix == id);
        });
    }

    public static NotifyFinishRNA(): void {
        ROPWait.GenericNotifyClear(5, (): boolean => {
            return true;
        });
    }

    /*
     * waitType - Which event to wait for.
     *	0 - Camera Move
     * 	1 - Click UI
     * 	2 - Nucleotide change (single range)
     *	3 - Paint
     * 	4 - Textbox Progress.
     * 	5 - Nucleotide Pair.
     *  6 - Mutation (list of indices)
     *  7 - Delay (ms)
     *  8 - Black mark
     *  9 - Blue mark ('magic glue')
     */
    constructor(waitType: number, env: RScriptEnv) {
        super(env);
        this._elements = [];
        this._waitType = waitType;
        this._condition_clear = false;
        this._id = "";
        this._start_time = -1;
        ROPWait.RegisterROPWait(this);
    }

    /*override*/
    public get_pause_next(): RScriptOp {
        return (this._children[0] instanceof ROPWait) ? this._children[0] : this;
    }

    public IsWaitActive(): boolean {
        return this.isWaitActive;
    }

    public ResetPaint(): void {
        if (!this._previous_color_idx || !this._previous_colors || !this._all_nucleotides_completed) {
            return;
        }

        for (let i: number = 0; i < this._previous_color_idx.length; ++i) {
            this._env.GetRNA().set_base_color(this._previous_color_idx[i],
                RScriptEnv.ConvertNucleotideStringToInt(this._previous_colors[i]));
        }

        this._previous_colors.splice(0);
        this._previous_color_idx.splice(0);
        this._all_nucleotides_completed.splice(0);
        this._env.SetTextboxVisible(this._id + ROPTextbox.id_postfix, true);
    }

    public PassPaint(): void {
        this._env.SetTextboxVisible(this._id + ROPTextbox.id_postfix, false);
    }

    public GetWaitType(): number {
        return this._waitType;
    }

    public GetElements(): any[] {
        return this._elements;
    }

    public GetId(): string {
        return this._id;
    }

    public GetStartIdx(): number {
        return this._start_idx;
    }

    public GetEndIdx(): number {
        return this._end_idx;
    }

    /*override*/
    public IsPaused(): boolean {
        if (this._waitType == 5) {
            let paired: number = this._env.GetRNA().get_pairs()[this._start_idx];
            if (paired < 0) return true;
            let t1: string = RScriptEnv.ConvertNucleotideIntToString(
                this._env.GetRNA().get_base(this._start_idx).get_type()).toUpperCase();
            let t2: string = RScriptEnv.ConvertNucleotideIntToString(
                this._env.GetRNA().get_base(paired).get_type()).toUpperCase();
            // console.log(t1 + " " + t2);
            if (t1 == this._color1) {
                if (t2 == this._color2) {
                    return false;
                }
            } else if (t2 == this._color1) {
                if (t1 == this._color2) {
                    return false;
                }
            }
            return true;
        } else if (this._waitType == 2 && !this._condition_clear) {
            for (let ii = this._start_idx; ii <= this._end_idx; ++ii) {
                if (RScriptEnv.ConvertNucleotideIntToString(
                    this._env.GetRNA().get_base(ii).get_type()).toUpperCase() != this._expected_color) {
                    return true;
                }
            }
            return false;
        } else if (this._waitType == 7 && !this._condition_clear) {
            let now: number = new Date().getTime();
            if (now < this._start_time + this._delay) {
                return true;
            }
            this.ClearCondition();
        } else if (this._waitType == 8 && !this._condition_clear) {
            for (let ii = this._start_idx; ii <= this._end_idx; ++ii) {
                if (!this._env.GetRNA().is_tracked_index(ii)) {
                    return true;
                }
            }
            this.ClearCondition();
        } else if (this._waitType == 9 && !this._condition_clear) {
            for (let ii = this._start_idx; ii <= this._end_idx; ++ii) {
                if (!this._env.GetRNA().is_design_structure_highlighted(ii)) {
                    return true;
                }
            }
            this.ClearCondition();
        }
        return !this._condition_clear;
    }

    public ClearCondition(): void {
        this._condition_clear = true;
    }

    public AddNucleotideCompletion(i: number, color: string): boolean {
        if (this._all_nucleotides_completed == null) {
            this._all_nucleotides_completed = [];
        }

        if (this._expected_color && color != this._expected_color && color != "") {
            return false;
        }

        if (this._waitType == 6) {
            return (this._elements.indexOf(i) != -1);
        }

        this._all_nucleotides_completed.push(i);
        for (let x: number = this._start_idx; x <= this._end_idx; ++x) {
            if (this._all_nucleotides_completed.indexOf(x) == -1) {
                return false;
            }
        }
        return true;
    }

    public AddMarkCompletion(i: number, marked: boolean): boolean {
        if (this._all_nucleotides_completed == null) {
            this._all_nucleotides_completed = [];
        }

        if (marked) {
            this._all_nucleotides_completed.push(i);
        } else {
            let pos: number = this._all_nucleotides_completed.indexOf(i);
            while (pos != -1) {
                this._all_nucleotides_completed.splice(pos, 1);
                pos = this._all_nucleotides_completed.indexOf(i);
            }
        }

        for (let x: number = this._start_idx; x <= this._end_idx; ++x) {
            if (this._all_nucleotides_completed.indexOf(x) == -1) {
                return false;
            }
        }
        return true;
    }

    public AddPreviousColor(color: string, i: number): void {
        if (this._previous_colors == null) {
            this._previous_colors = [];
        }

        if (this._previous_color_idx == null) {
            this._previous_color_idx = [];
        }
        this._previous_colors.push(color);
        this._previous_color_idx.push(i);
    }

    /*override*/
    public exec(): void {
        this.isWaitActive = true;
        if (this._start_time < 0) this._start_time = new Date().getTime();
    }

    /*override*/
    protected ParseArgument(arg: string, i: number): void {
        switch (i) {
        case 0:
            if (this._waitType == 1) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType == 4) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._waitType == 6) {
                if ("AUGC".indexOf(arg.toUpperCase()) != -1) {
                    this._expected_color = this._env.GetStringRef(arg).toUpperCase().replace(" ", "");
                } else {
                    this._elements.push(Number(arg) - 1);
                }
            } else if (this._waitType == 7) {
                this._delay = Number(arg);
            } else {
                this._start_idx = Number(arg) - 1;
            }
            break;
        case 1:
            if (this._waitType == 1) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType == 5) {
                this._color1 = this._env.GetStringRef(arg).toUpperCase().replace(" ", "");
            } else if (this._waitType == 6) {
                this._elements.push(Number(arg) - 1);
            } else {
                this._end_idx = Number(arg) - 1;
            }

            break;
        case 2:
            if (this._waitType == 1) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType == 2) {
                this._expected_color = this._env.GetStringRef(arg);
            } else if (this._waitType == 3) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._waitType == 5) {
                this._color2 = this._env.GetStringRef(arg).toUpperCase().replace(" ", "");
            } else if (this._waitType == 6) {
                this._elements.push(Number(arg) - 1);
            }
            break;
        case 3:
            if (this._waitType == 1) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType == 6) {
                this._elements.push(Number(arg) - 1);
            } else {
                this._expected_color = this._env.GetStringRef(arg).toUpperCase().replace(" ", "");
            }
            break;
        default:
            if (this._waitType == 1) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType == 6) {
                this._elements.push(Number(arg) - 1);
            } else {
                throw new Error("Too many arguments for a ROP Wait Instruction");
            }
            break;
        }
    }

    private static NotifyMark(mark_type: number, i: number, marked: boolean): void {
        if (i == -1) {
            return;
        }

        ROPWait.GenericNotifyClear(mark_type, (op: ROPWait): boolean => {
            return op.AddMarkCompletion(i, marked);
        });
    }

    private static GenericNotifyClear(inType: number, clear_check: (op: ROPWait) => boolean): void {
        if (!ROPWait._allROPWaitOps || !ROPWait._allROPWaitOps[inType]) {
            return;
        }

        let clearOps: ROPWait[] = [];
        for (let op of ROPWait._allROPWaitOps[inType]) {
            if (op.IsWaitActive() && clear_check(op)) {
                clearOps.push(op);
                op.ClearCondition();
            }
        }
        ROPWait.BatchDeregister(clearOps);
    }

    private isWaitActive: boolean = false;
    private _start_time: number;
    private _delay: number;
    // Instruction Parameters
    private _waitType: number;
    // Argument Parameters
    private _elements: any[];
    private _start_idx: number;
    private _end_idx: number;
    private _expected_color: string;
    // Pair Colors
    private _color1: string;
    private _color2: string;
    private _id: string;
    // Whether or not the wait condition has been passed.
    private _condition_clear: boolean;
    // Previous Colors and All Nucleotides Completed are the same size when dealing with painting
    private _previous_colors: any[];
    private _previous_color_idx: any[];
    private _all_nucleotides_completed: any[];
    //		-- No need to setup a publish/subscribe model. Less expandable but oh well.
    private static _allROPWaitOps: ROPWait[][] = [];
}
