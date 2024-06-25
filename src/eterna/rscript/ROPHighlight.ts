import log from 'loglevel';
import {Graphics} from 'pixi.js';
import {
    GameObject,
    RepeatingTask,
    SceneObject,
    SerialTask,
    Easing,
    AlphaTask,
    ColorUtil,
    CallbackTask,
    DelayTask
} from 'flashbang';
import {RNAHighlightState} from 'eterna/pose2D/Pose2D';
import {
    RScriptUIElementID
} from './RScriptUIElement';
import RScriptOp from './RScriptOp';
import RScriptEnv, {RScriptVarType} from './RScriptEnv';

export enum ROPHighlightMode {
    RNA = 'RNA',
    UI = 'UI',
}

export default class ROPHighlight extends RScriptOp {
    public static readonly ID_POSTFIX = '_highlight_';

    constructor(isVisible: boolean, inMode: ROPHighlightMode, env: RScriptEnv) {
        super(env);
        this._opVisible = isVisible;
        this._mode = inMode;
    }

    /* override */
    public initialize(op: string, args: string): void {
        super.initialize(op, args);
        this._id = ROPHighlight.processId(this._id);
    }

    /* override */
    public exec(): void {
        if (
            this._uiElementString?.toUpperCase() === RScriptUIElementID.ENERGY
        ) {
            this._env.pose.showEnergyHighlight = this._opVisible;
            return;
        }

        // Remove highlight with ID.
        if (this._env.hasVar(this._id)) {
            const existing: RScriptVarType | undefined = this._env.getVar(
                this._id
            );
            if (existing instanceof GameObject) {
                existing.destroySelf();
            } else if (existing instanceof RNAHighlightState) {
                this.removeHighlight(existing);
            }
            this._env.deleteVar(this._id);
        }

        if (this._opVisible && this._mode === ROPHighlightMode.RNA) {
            // Highlight nucleotides.
            const res: number[] = [];
            for (let i: number = this._startIdx; i <= this._endIdx; ++i) {
                res.push(i);
            }
            const rnaHighlight: RNAHighlightState = this._env.pose.createNewHighlight(res);
            this._env.setVar(this._id, rnaHighlight);
        } else if (this._opVisible && this._mode === ROPHighlightMode.UI) {
            // Draw highlight around the UI element.
            const highlight = new Graphics();
            highlight.alpha = 0;

            const highlightObj = new SceneObject(highlight);

            const redrawHighlight = () => {
                const bounds = this._env.getUIElementBounds(this._uiElementString);
                if (!bounds) {
                    highlightObj.display.visible = false;
                    return;
                }
                // Give it a bit of padding so the highlight isn't so tight.
                const padding = 5;

                highlight.clear();
                highlight.lineStyle(5, this._color, 0.7);
                highlight.drawRoundedRect(0, 0, bounds.width + 2 * padding, bounds.height + 2 * padding, 4);
                highlightObj.display.x = bounds.x - padding;
                highlightObj.display.y = bounds.y - padding;
            };
            redrawHighlight();

            highlightObj.addObject(
                new RepeatingTask(
                    () => new SerialTask(
                        new AlphaTask(0.2, 0.75, Easing.easeInOut),
                        new AlphaTask(1.0, 0.75, Easing.easeInOut)
                    )
                )
            );
            // We could listen for pose resizes, but that wouldn't tell us about things
            // like items being dragged around, scroll containers with items being scrolled,
            // the hotbar contents changing, etc. So instead we just reposition the thing
            // every frame
            highlightObj.addObject(
                new RepeatingTask(
                    () => new SerialTask(
                        new DelayTask(0.01),
                        new CallbackTask(redrawHighlight)
                    )
                )
            );

            this._env.addObject(highlightObj, this._env.container);
            this._env.setVar(this._id, highlightObj);
        }
    }

    /* override */
    protected parseArgument(arg: string, i: number): void {
        switch (i) {
            case 0:
                if (!this._opVisible) {
                    this._id = this._env.getStringRef(arg);
                } else if (this._mode === ROPHighlightMode.RNA) {
                    this._startIdx = Number(arg) - 1;
                } else if (this._mode === ROPHighlightMode.UI) {
                    this._uiElementString = this._env
                        .getStringRef(arg)
                        .toUpperCase() as RScriptUIElementID;
                }
                break;
            case 1:
                if (this._mode === ROPHighlightMode.RNA) {
                    this._endIdx = Number(arg) - 1;
                } else if (this._mode === ROPHighlightMode.UI) {
                    this._id = this._env.getStringRef(arg);
                }
                break;
            case 2:
                if (this._mode === ROPHighlightMode.RNA) {
                    this._id = this._env.getStringRef(arg);
                } else if (this._mode === ROPHighlightMode.UI) {
                    this._color = ColorUtil.fromString(
                        `#${this._env.getStringRef(arg)}`
                    );
                }
                break;
            case 3:
                this._color = ColorUtil.fromString(
                    `#${this._env.getStringRef(arg)}`
                );
                break;
            default:
                log.warn(`ROPHighlight has no argument at position ${i}`);
        }
    }

    private removeHighlight(obj: RNAHighlightState): void {
        this._env.pose.removeNewHighlight(obj);
    }

    private static processId(inId: string): string {
        if (!inId) return ROPHighlight.ID_POSTFIX;
        return inId + ROPHighlight.ID_POSTFIX;
    }

    private readonly _opVisible: boolean;
    private readonly _mode: ROPHighlightMode;

    private _startIdx: number = -1;
    private _endIdx: number = -1;
    private _id: string = '';
    private _color: number = 0xffffff;
    private _uiElementString: string;
}
