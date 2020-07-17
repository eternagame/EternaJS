import {MathUtil} from 'flashbang';
import {StringToPaletteTargetType} from 'eterna/ui/NucleotidePalette';
import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';

export enum ROPRNAType {
    SETBASE = 'SETBASE',
    CHANGEMODE = 'CHANGEMODE',
    ENABLEMODIFICATION = 'ENABLEMODIFICATION',
    SETPAINTER = 'SETPAINTER',
    CHANGESTATE = 'CHANGESTATE',
    SETZOOM = 'SETZOOM',
    SETPIP = 'SETPIP',
}

export default class ROPRNA extends RScriptOp {
    constructor(type: ROPRNAType, env: RScriptEnv) {
        super(env);
        this._type = type;
    }

    /* override */
    public exec(): void {
        if (this._type === ROPRNAType.SETBASE) {
            this._env.pose.setBaseColor(this._nucIdx,
                RScriptEnv.convertNucleotideStringToInt(this._color));
        } else if (this._type === ROPRNAType.CHANGEMODE) {
            if (this._foldMode === 0) {
                this._env.ui.ropSetToNativeMode();
            } else {
                this._env.ui.ropSetToTargetMode();
            }
        } else if (this._type === ROPRNAType.ENABLEMODIFICATION) {
            this._env.pose.forceEditable(this._enabled, this._scope);
        } else if (this._type === ROPRNAType.SETPAINTER) {
            let {ui} = this._env;
            if (this._color === 'SWAP') {
                ui.toolbar.pairSwapButton.click();
            } else {
                let paletteTargetType = StringToPaletteTargetType(this._color);
                if (paletteTargetType != null) {
                    ui.toolbar.palette.clickTarget(paletteTargetType);
                }
            }
        } else if (this._type === ROPRNAType.CHANGESTATE) {
            this._env.ui.ropChangeTarget(this._state);
        } else if (this._type === ROPRNAType.SETZOOM) {
            this._env.pose.setZoomLevel(this._zoomLevel, this._animate, this._center);
        } else if (this._type === ROPRNAType.SETPIP) {
            this._env.ui.ropSetPip(this._enabled);
        }
    }

    /* override */
    protected parseArgument(arg: string, i: number): void {
        switch (i) {
            case 0: // Nucleotide index when changing nucleotide color. Fold mode in Mode 1.
                if (this._type === ROPRNAType.SETBASE) {
                    this._nucIdx = Number(arg) - 1;
                } else if (this._type === ROPRNAType.CHANGEMODE) {
                    this._foldMode = Number(arg);
                } else if (this._type === ROPRNAType.ENABLEMODIFICATION || this._type === ROPRNAType.SETPIP) {
                    this._enabled = (arg.toUpperCase() === 'TRUE');
                } else if (this._type === ROPRNAType.SETPAINTER) {
                    this._color = this._env.getStringRef(arg);
                } else if (this._type === ROPRNAType.CHANGESTATE) {
                    this._state = Number(arg) - 1;
                } else if (this._type === ROPRNAType.SETZOOM) {
                    this._zoomLevel = MathUtil.clamp(Number(arg), 0, 4);
                }
                break;
            case 1:
                if (this._type === ROPRNAType.SETBASE) {
                    this._color = this._env.getStringRef(arg);
                } else if (this._type === ROPRNAType.ENABLEMODIFICATION) {
                    this._scope = [];
                    this._scope.push(Number(arg) - 1);
                } else if (this._type === ROPRNAType.SETZOOM) {
                    this._animate = (arg.toUpperCase() === 'TRUE');
                }
                break;
            default:
                if (this._type === ROPRNAType.ENABLEMODIFICATION) {
                    if (this._scope) this._scope.push(Number(arg) - 1);
                } else if (this._type === ROPRNAType.SETZOOM) {
                    this._center = (arg.toUpperCase() === 'TRUE');
                } else {
                    throw new Error(`Invalid argument for ROP: RNA -- ${this._env.getStringRef(arg)}`);
                }
                break;
        }
    }

    private readonly _type: ROPRNAType;

    private _nucIdx: number = 0;
    private _color: string;
    private _foldMode: number;
    private _enabled: boolean;
    private _scope: number[] | null = null;
    private _state: number;
    private _zoomLevel: number;
    private _animate: boolean = true;
    private _center: boolean = false;
}
