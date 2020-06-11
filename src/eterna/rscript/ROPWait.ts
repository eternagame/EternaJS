import {Assert} from 'flashbang';
import ROPTextbox from './ROPTextbox';
import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';
import {RScriptUIElementID} from './RScriptUIElement';

export enum ROPWaitType {
    MOVECAMERA = 'MOVECAMERA',
    CLICKUI = 'CLICKUI',
    NUCLEOTIDECHANGE = 'NUCLEOTIDECHANGE', // single range
    PAINT = 'PAINT',
    TEXTBOX = 'TEXTBOX',
    NUCLEOTIDEPAIR = 'NUCLEOTIDEPAIR',
    MUTATION = 'MUTATION', // list of indices
    TIME = 'TIME',
    BLACKMARK = 'BLACKMARK',
    BLUEMARK = 'BLUEMARK', // 'magic glue'
}

export default class ROPWait extends RScriptOp {
    public static clearRopWait(): void {
        ROPWait._allROPWaitOps = new Map();
    }

    public static notifyMoveCamera(): void {
        ROPWait.genericNotifyClear(ROPWaitType.MOVECAMERA, (): boolean => true);
    }

    public static notifyClickUI(id: RScriptUIElementID): void {
        ROPWait.genericNotifyClear(ROPWaitType.CLICKUI, (op: ROPWait): boolean => (op.elements.indexOf(id) !== -1));
    }

    public static notifyNucleotideChange(i: number, inColor: number): void {
        if (i === -1) {
            return;
        }

        let newColor: string = RScriptEnv.convertNucleotideIntToString(inColor);

        ROPWait.genericNotifyClear(
            ROPWaitType.NUCLEOTIDECHANGE, (op: ROPWait): boolean => op.addNucleotideCompletion(i, newColor)
        );

        ROPWait.genericNotifyClear(
            ROPWaitType.MUTATION, (op: ROPWait): boolean => op.addNucleotideCompletion(i, newColor)
        );
    }

    public static notifyBlackMark(i: number, marked: boolean): void {
        ROPWait.notifyMark(ROPWaitType.BLACKMARK, i, marked);
    }

    public static notifyBlueMark(i: number, marked: boolean): void {
        ROPWait.notifyMark(ROPWaitType.BLUEMARK, i, marked);
    }

    public static notifyPaint(i: number, inColor: number, newColor: number): void {
        let previousColor: string = RScriptEnv.convertNucleotideIntToString(inColor);
        let changeColor: string = RScriptEnv.convertNucleotideIntToString(newColor);
        ROPWait.genericNotifyClear(ROPWaitType.PAINT, (op: ROPWait): boolean => {
            op.addPreviousColor(previousColor, i);
            return op.addNucleotideCompletion(i, changeColor);
        });
    }

    public static notifyEndPaint(): void {
        // When we finish painting, if not everything we wanted to be painted was painted,
        // then reset the player's progress on those nucleotides. And (if specified), show
        // a textbox.
        Assert.assertIsDefined(ROPWait._allROPWaitOps);
        let list: ROPWait[] | undefined = ROPWait._allROPWaitOps.get(ROPWaitType.PAINT);
        if (list === undefined) {
            return;
        }

        for (let op of list) {
            if (!op.isWaitActive()) {
                continue;
            }

            if (op.isPaused()) {
                op.resetPaint();
            } else {
                op.passPaint();
            }
        }
    }

    public static notifyTextboxProgress(id: string): void {
        ROPWait.genericNotifyClear(
            ROPWaitType.TEXTBOX, (op: ROPWait): boolean => (op.id + ROPTextbox.ID_POSTFIX === id)
        );
    }

    public static notifyFinishRNA(): void {
        ROPWait.genericNotifyClear(ROPWaitType.NUCLEOTIDEPAIR, (): boolean => true);
    }

    constructor(waitType: ROPWaitType, env: RScriptEnv) {
        super(env);
        this._waitType = waitType;
        ROPWait.registerROPWait(this);
    }

    /* override */
    public getPauseNext(): RScriptOp {
        return (this._children[0] instanceof ROPWait) ? this._children[0] : this;
    }

    public isWaitActive(): boolean {
        return this._isWaitActive;
    }

    public resetPaint(): void {
        if (!this._prevColorIndex || !this._prevColors || !this._allNucleotidesCompleted) {
            return;
        }

        for (let i = 0; i < this._prevColorIndex.length; ++i) {
            this._env.pose.setBaseColor(this._prevColorIndex[i],
                RScriptEnv.convertNucleotideStringToInt(this._prevColors[i]));
        }

        this._prevColors.splice(0);
        this._prevColorIndex.splice(0);
        this._allNucleotidesCompleted.splice(0);
        this._env.setTextboxVisible(this._id + ROPTextbox.ID_POSTFIX, true);
    }

    public passPaint(): void {
        this._env.setTextboxVisible(this._id + ROPTextbox.ID_POSTFIX, false);
    }

    public get waitType(): ROPWaitType {
        return this._waitType;
    }

    public get elements(): (number | string)[] {
        return this._elements;
    }

    public get id(): string {
        return this._id;
    }

    /* override */
    public isPaused(): boolean {
        if (this._waitType === ROPWaitType.NUCLEOTIDEPAIR) {
            let paired: number = this._env.pose.pairs[this._startIdx];
            if (paired < 0) {
                return true;
            }

            let t1: string = RScriptEnv.convertNucleotideIntToString(
                this._env.pose.getBase(this._startIdx).type
            ).toUpperCase();
            let t2: string = RScriptEnv.convertNucleotideIntToString(
                this._env.pose.getBase(paired).type
            ).toUpperCase();

            return !((t1 === this._color1 && t2 === this._color2) || (t2 === this._color1 && t1 === this._color2));
        } else if (this._waitType === ROPWaitType.NUCLEOTIDECHANGE && !this._conditionClear) {
            for (let ii = this._startIdx; ii <= this._endIdx; ++ii) {
                if (RScriptEnv.convertNucleotideIntToString(
                    this._env.pose.getBase(ii).type
                ).toUpperCase() !== this._expectedColor) {
                    return true;
                }
            }
            return false;
        } else if (this._waitType === ROPWaitType.TIME && !this._conditionClear) {
            let now: number = new Date().getTime();
            if (now < this._startTime + this._delay) {
                return true;
            }
            this.clearCondition();
        } else if (this._waitType === ROPWaitType.BLACKMARK && !this._conditionClear) {
            for (let ii = this._startIdx; ii <= this._endIdx; ++ii) {
                if (!this._env.pose.isTrackedIndex(ii)) {
                    return true;
                }
            }
            this.clearCondition();
        } else if (this._waitType === ROPWaitType.BLUEMARK && !this._conditionClear) {
            for (let ii = this._startIdx; ii <= this._endIdx; ++ii) {
                if (!this._env.pose.isDesignStructureHighlighted(ii)) {
                    return true;
                }
            }
            this.clearCondition();
        }
        return !this._conditionClear;
    }

    public clearCondition(): void {
        this._conditionClear = true;
    }

    public addNucleotideCompletion(i: number, color: string): boolean {
        if (this._allNucleotidesCompleted == null) {
            this._allNucleotidesCompleted = [];
        }

        if (this._expectedColor && color !== this._expectedColor && color !== '') {
            return false;
        }

        if (this._waitType === ROPWaitType.MUTATION) {
            return (this._elements.indexOf(i) !== -1);
        }

        this._allNucleotidesCompleted.push(i);
        for (let x: number = this._startIdx; x <= this._endIdx; ++x) {
            if (this._allNucleotidesCompleted.indexOf(x) === -1) {
                return false;
            }
        }
        return true;
    }

    public addMarkCompletion(i: number, marked: boolean): boolean {
        if (this._allNucleotidesCompleted == null) {
            this._allNucleotidesCompleted = [];
        }

        if (marked) {
            this._allNucleotidesCompleted.push(i);
        } else {
            let pos: number = this._allNucleotidesCompleted.indexOf(i);
            while (pos !== -1) {
                this._allNucleotidesCompleted.splice(pos, 1);
                pos = this._allNucleotidesCompleted.indexOf(i);
            }
        }

        for (let x: number = this._startIdx; x <= this._endIdx; ++x) {
            if (this._allNucleotidesCompleted.indexOf(x) === -1) {
                return false;
            }
        }
        return true;
    }

    public addPreviousColor(color: string, i: number): void {
        if (this._prevColors == null) {
            this._prevColors = [];
        }

        if (this._prevColorIndex == null) {
            this._prevColorIndex = [];
        }
        this._prevColors.push(color);
        this._prevColorIndex.push(i);
    }

    /* override */
    public exec(): void {
        this._isWaitActive = true;
        if (this._startTime < 0) this._startTime = new Date().getTime();
    }

    /* override */
    protected parseArgument(arg: string, i: number): void {
        switch (i) {
            case 0:
                if (this._waitType === ROPWaitType.CLICKUI) {
                    this._elements.push(this._env.getStringRef(arg).toUpperCase());
                } else if (this._waitType === ROPWaitType.TEXTBOX) {
                    this._id = this._env.getStringRef(arg);
                } else if (this._waitType === ROPWaitType.MUTATION) {
                    if ('AUGC'.indexOf(arg.toUpperCase()) !== -1) {
                        this._expectedColor = this._env.getStringRef(arg).toUpperCase().replace(' ', '');
                    } else {
                        this._elements.push(Number(arg) - 1);
                    }
                } else if (this._waitType === ROPWaitType.TIME) {
                    this._delay = Number(arg);
                } else {
                    this._startIdx = Number(arg) - 1;
                }
                break;
            case 1:
                if (this._waitType === ROPWaitType.CLICKUI) {
                    this._elements.push(this._env.getStringRef(arg).toUpperCase());
                } else if (this._waitType === ROPWaitType.NUCLEOTIDEPAIR) {
                    this._color1 = this._env.getStringRef(arg).toUpperCase().replace(' ', '');
                } else if (this._waitType === ROPWaitType.MUTATION) {
                    this._elements.push(Number(arg) - 1);
                } else {
                    this._endIdx = Number(arg) - 1;
                }

                break;
            case 2:
                if (this._waitType === ROPWaitType.CLICKUI) {
                    this._elements.push(this._env.getStringRef(arg).toUpperCase());
                } else if (this._waitType === ROPWaitType.NUCLEOTIDECHANGE) {
                    this._expectedColor = this._env.getStringRef(arg);
                } else if (this._waitType === ROPWaitType.PAINT) {
                    this._id = this._env.getStringRef(arg);
                } else if (this._waitType === ROPWaitType.NUCLEOTIDEPAIR) {
                    this._color2 = this._env.getStringRef(arg).toUpperCase().replace(' ', '');
                } else if (this._waitType === ROPWaitType.MUTATION) {
                    this._elements.push(Number(arg) - 1);
                }
                break;
            case 3:
                if (this._waitType === ROPWaitType.CLICKUI) {
                    this._elements.push(this._env.getStringRef(arg).toUpperCase());
                } else if (this._waitType === ROPWaitType.MUTATION) {
                    this._elements.push(Number(arg) - 1);
                } else {
                    this._expectedColor = this._env.getStringRef(arg).toUpperCase().replace(' ', '');
                }
                break;
            default:
                if (this._waitType === ROPWaitType.CLICKUI) {
                    this._elements.push(this._env.getStringRef(arg).toUpperCase());
                } else if (this._waitType === ROPWaitType.MUTATION) {
                    this._elements.push(Number(arg) - 1);
                } else {
                    throw new Error('Too many arguments for a ROP Wait Instruction');
                }
                break;
        }
    }

    private static registerROPWait(op: ROPWait): void {
        Assert.assertIsDefined(ROPWait._allROPWaitOps);
        let list: ROPWait[] | undefined = ROPWait._allROPWaitOps.get(op.waitType);
        if (list === undefined) {
            list = [];
            ROPWait._allROPWaitOps.set(op.waitType, list);
        }
        list.push(op);
    }

    private static batchDeregister(ops: ROPWait[]): void {
        for (let op of ops) {
            ROPWait.deregisterROPWait(op);
        }
    }

    private static deregisterROPWait(op: ROPWait): void {
        Assert.assertIsDefined(ROPWait._allROPWaitOps);
        let array: ROPWait[] | undefined = ROPWait._allROPWaitOps.get(op.waitType);
        if (array !== undefined) {
            let idx: number = array.indexOf(op);
            array.splice(idx, 1);
        }
    }

    private static notifyMark(markType: ROPWaitType, i: number, marked: boolean): void {
        if (i === -1) {
            return;
        }

        ROPWait.genericNotifyClear(markType, (op: ROPWait): boolean => op.addMarkCompletion(i, marked));
    }

    private static genericNotifyClear(inType: ROPWaitType, clearCheck: (op: ROPWait) => boolean): void {
        if (ROPWait._allROPWaitOps == null || ROPWait._allROPWaitOps.get(inType) === undefined) {
            return;
        }

        let list: ROPWait[] | undefined = ROPWait._allROPWaitOps.get(inType);
        let clearOps: ROPWait[] = [];

        if (list !== undefined) {
            for (let op of list) {
                if (op.isWaitActive() && clearCheck(op)) {
                    clearOps.push(op);
                    op.clearCondition();
                }
            }
        }
        ROPWait.batchDeregister(clearOps);
    }

    private readonly _waitType: ROPWaitType;
    private readonly _elements: (number | string)[] = [];

    private _isWaitActive: boolean = false;
    private _startTime: number = -1;
    private _delay: number = 0;

    private _startIdx: number = 0;
    private _endIdx: number = 0;
    private _expectedColor: string;

    private _color1: string;
    private _color2: string;
    private _id: string = '';

    private _conditionClear: boolean = false;

    private _prevColors: string[];
    private _prevColorIndex: number[];
    private _allNucleotidesCompleted: number[];

    private static _allROPWaitOps: Map<ROPWaitType, ROPWait[]> | null = new Map();
}
