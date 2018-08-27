import {ROPTextbox} from "./ROPTextbox";
import {RScriptEnv} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";
import {RScriptUIElementID} from "./RScriptUIElement";

export enum ROPWaitType {
    MOVECAMERA = "MOVECAMERA",
    CLICKUI = "CLICKUI",
    NUCLEOTIDECHANGE = "NUCLEOTIDECHANGE",  // single range
    PAINT = "PAINT",
    TEXTBOX = "TEXTBOX",
    NUCLEOTIDEPAIR = "NUCLEOTIDEPAIR",
    MUTATION = "MUTATION",                  // list of indices
    TIME = "TIME",
    BLACKMARK = "BLACKMARK",
    BLUEMARK = "BLUEMARK",                  // 'magic glue'
}

export class ROPWait extends RScriptOp {
    public static ClearROPWait(): void {
        ROPWait._allROPWaitOps = new Map();
    }

    public static NotifyMoveCamera(): void {
        ROPWait.GenericNotifyClear(ROPWaitType.MOVECAMERA, (): boolean => true);
    }

    public static NotifyClickUI(id: RScriptUIElementID): void {
        ROPWait.GenericNotifyClear(ROPWaitType.CLICKUI, (op: ROPWait): boolean => (op.GetElements().indexOf(id) !== -1));
    }

    public static NotifyNucleotideChange(i: number, inColor: number): void {
        if (i === -1) {
            return;
        }

        let newColor: string = RScriptEnv.ConvertNucleotideIntToString(inColor);

        ROPWait.GenericNotifyClear(ROPWaitType.NUCLEOTIDECHANGE, (op: ROPWait): boolean => op.AddNucleotideCompletion(i, newColor));

        ROPWait.GenericNotifyClear(ROPWaitType.MUTATION, (op: ROPWait): boolean => op.AddNucleotideCompletion(i, newColor));
    }

    public static NotifyBlackMark(i: number, marked: boolean): void {
        ROPWait.NotifyMark(ROPWaitType.BLACKMARK, i, marked);
    }

    public static NotifyBlueMark(i: number, marked: boolean): void {
        ROPWait.NotifyMark(ROPWaitType.BLUEMARK, i, marked);
    }

    public static NotifyPaint(i: number, inColor: number, newColor: number): void {
        let previousColor: string = RScriptEnv.ConvertNucleotideIntToString(inColor);
        let changeColor: string = RScriptEnv.ConvertNucleotideIntToString(newColor);
        ROPWait.GenericNotifyClear(ROPWaitType.PAINT, (op: ROPWait): boolean => {
            op.AddPreviousColor(previousColor, i);
            return op.AddNucleotideCompletion(i, changeColor);
        });
    }

    public static NotifyEndPaint(): void {
        // When we finish painting, if not everything we wanted to be painted was painted,
        // then reset the player's progress on those nucleotides. And (if specified), show
        // a textbox.
        let list: ROPWait[] = ROPWait._allROPWaitOps.get(ROPWaitType.PAINT);
        if (list == null) {
            return;
        }

        for (let op of list) {
            if (!op.IsWaitActive()) {
                continue;
            }

            if (op.IsPaused()) {
                op.ResetPaint();
            } else {
                op.PassPaint();
            }
        }
    }

    public static NotifyTextboxProgress(id: string): void {
        ROPWait.GenericNotifyClear(ROPWaitType.TEXTBOX, (op: ROPWait): boolean => (op.GetId() + ROPTextbox.id_postfix === id));
    }

    public static NotifyFinishRNA(): void {
        ROPWait.GenericNotifyClear(ROPWaitType.NUCLEOTIDEPAIR, (): boolean => true);
    }

    public constructor(waitType: ROPWaitType, env: RScriptEnv) {
        super(env);
        this._waitType = waitType;
        ROPWait.RegisterROPWait(this);
    }

    /* override */
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

    public GetWaitType(): ROPWaitType {
        return this._waitType;
    }

    public GetElements(): (number | string)[] {
        return this._elements;
    }

    public GetId(): string {
        return this._id;
    }

    /* override */
    public IsPaused(): boolean {
        if (this._waitType === ROPWaitType.NUCLEOTIDEPAIR) {
            let paired: number = this._env.GetRNA().get_pairs()[this._start_idx];
            if (paired < 0) {
                return true;
            }

            let t1: string = RScriptEnv.ConvertNucleotideIntToString(
                this._env.GetRNA().get_base(this._start_idx).type
            ).toUpperCase();
            let t2: string = RScriptEnv.ConvertNucleotideIntToString(
                this._env.GetRNA().get_base(paired).type
            ).toUpperCase();

            return !((t1 === this._color1 && t2 === this._color2) || (t2 === this._color1 && t1 === this._color2));
        } else if (this._waitType === ROPWaitType.NUCLEOTIDECHANGE && !this._condition_clear) {
            for (let ii = this._start_idx; ii <= this._end_idx; ++ii) {
                if (RScriptEnv.ConvertNucleotideIntToString(
                    this._env.GetRNA().get_base(ii).type
                ).toUpperCase() !== this._expected_color) {
                    return true;
                }
            }
            return false;
        } else if (this._waitType === ROPWaitType.TIME && !this._condition_clear) {
            let now: number = new Date().getTime();
            if (now < this._start_time + this._delay) {
                return true;
            }
            this.ClearCondition();
        } else if (this._waitType === ROPWaitType.BLACKMARK && !this._condition_clear) {
            for (let ii = this._start_idx; ii <= this._end_idx; ++ii) {
                if (!this._env.GetRNA().is_tracked_index(ii)) {
                    return true;
                }
            }
            this.ClearCondition();
        } else if (this._waitType === ROPWaitType.BLUEMARK && !this._condition_clear) {
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

        if (this._expected_color && color !== this._expected_color && color !== "") {
            return false;
        }

        if (this._waitType === ROPWaitType.MUTATION) {
            return (this._elements.indexOf(i) !== -1);
        }

        this._all_nucleotides_completed.push(i);
        for (let x: number = this._start_idx; x <= this._end_idx; ++x) {
            if (this._all_nucleotides_completed.indexOf(x) === -1) {
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
            while (pos !== -1) {
                this._all_nucleotides_completed.splice(pos, 1);
                pos = this._all_nucleotides_completed.indexOf(i);
            }
        }

        for (let x: number = this._start_idx; x <= this._end_idx; ++x) {
            if (this._all_nucleotides_completed.indexOf(x) === -1) {
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

    /* override */
    public exec(): void {
        this.isWaitActive = true;
        if (this._start_time < 0) this._start_time = new Date().getTime();
    }

    /* override */
    protected ParseArgument(arg: string, i: number): void {
        switch (i) {
        case 0:
            if (this._waitType === ROPWaitType.CLICKUI) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType === ROPWaitType.TEXTBOX) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._waitType === ROPWaitType.MUTATION) {
                if ("AUGC".indexOf(arg.toUpperCase()) !== -1) {
                    this._expected_color = this._env.GetStringRef(arg).toUpperCase().replace(" ", "");
                } else {
                    this._elements.push(Number(arg) - 1);
                }
            } else if (this._waitType === ROPWaitType.TIME) {
                this._delay = Number(arg);
            } else {
                this._start_idx = Number(arg) - 1;
            }
            break;
        case 1:
            if (this._waitType === ROPWaitType.CLICKUI) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType === ROPWaitType.NUCLEOTIDEPAIR) {
                this._color1 = this._env.GetStringRef(arg).toUpperCase().replace(" ", "");
            } else if (this._waitType === ROPWaitType.MUTATION) {
                this._elements.push(Number(arg) - 1);
            } else {
                this._end_idx = Number(arg) - 1;
            }

            break;
        case 2:
            if (this._waitType === ROPWaitType.CLICKUI) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType === ROPWaitType.NUCLEOTIDECHANGE) {
                this._expected_color = this._env.GetStringRef(arg);
            } else if (this._waitType === ROPWaitType.PAINT) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._waitType === ROPWaitType.NUCLEOTIDEPAIR) {
                this._color2 = this._env.GetStringRef(arg).toUpperCase().replace(" ", "");
            } else if (this._waitType === ROPWaitType.MUTATION) {
                this._elements.push(Number(arg) - 1);
            }
            break;
        case 3:
            if (this._waitType === ROPWaitType.CLICKUI) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType === ROPWaitType.MUTATION) {
                this._elements.push(Number(arg) - 1);
            } else {
                this._expected_color = this._env.GetStringRef(arg).toUpperCase().replace(" ", "");
            }
            break;
        default:
            if (this._waitType === ROPWaitType.CLICKUI) {
                this._elements.push(this._env.GetStringRef(arg).toUpperCase());
            } else if (this._waitType === ROPWaitType.MUTATION) {
                this._elements.push(Number(arg) - 1);
            } else {
                throw new Error("Too many arguments for a ROP Wait Instruction");
            }
            break;
        }
    }

    private static RegisterROPWait(op: ROPWait): void {
        let list: ROPWait[] = ROPWait._allROPWaitOps.get(op.GetWaitType());
        if (list == null) {
            list = [];
            ROPWait._allROPWaitOps.set(op.GetWaitType(), list);
        }
        list.push(op);
    }

    private static BatchDeregister(ops: ROPWait[]): void {
        for (let op of ops) {
            ROPWait.DeregisterROPWait(op);
        }
    }

    private static DeregisterROPWait(op: ROPWait): void {
        let array: ROPWait[] = ROPWait._allROPWaitOps.get(op.GetWaitType());
        if (array != null) {
            let idx: number = array.indexOf(op);
            array.splice(idx, 1);
        }
    }

    private static NotifyMark(mark_type: ROPWaitType, i: number, marked: boolean): void {
        if (i === -1) {
            return;
        }

        ROPWait.GenericNotifyClear(mark_type, (op: ROPWait): boolean => op.AddMarkCompletion(i, marked));
    }

    private static GenericNotifyClear(inType: ROPWaitType, clear_check: (op: ROPWait) => boolean): void {
        if (ROPWait._allROPWaitOps == null || ROPWait._allROPWaitOps.get(inType) == null) {
            return;
        }

        let list: ROPWait[] = ROPWait._allROPWaitOps.get(inType);
        let clearOps: ROPWait[] = [];

        for (let op of list) {
            if (op.IsWaitActive() && clear_check(op)) {
                clearOps.push(op);
                op.ClearCondition();
            }
        }
        ROPWait.BatchDeregister(clearOps);
    }

    private readonly _waitType: ROPWaitType;
    private readonly _elements: (number | string)[] = [];

    private isWaitActive: boolean = false;
    private _start_time: number = -1;
    private _delay: number = 0;

    private _start_idx: number = 0;
    private _end_idx: number = 0;
    private _expected_color: string;

    private _color1: string;
    private _color2: string;
    private _id: string = "";

    private _condition_clear: boolean = false;

    private _previous_colors: string[];
    private _previous_color_idx: number[];
    private _all_nucleotides_completed: number[];

    private static _allROPWaitOps: Map<ROPWaitType, ROPWait[]> = new Map();
}
