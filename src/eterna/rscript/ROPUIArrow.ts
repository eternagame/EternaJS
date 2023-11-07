import {
    GameObject, CallbackTask, DelayTask, RepeatingTask, SerialTask
} from 'flashbang';
import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';
import RScriptArrow from './RScriptArrow';

export default class ROPUIArrow extends RScriptOp {
    private static readonly theme = {
        thickness: 35,
        length: 55,
        colors: {
            outline: 0x000000,
            fill: 0xffff00
        }
    };

    private _uiElementId: string;
    private _side: string;
    private _show: boolean;
    private static _lastId: string = 'uiArrowLast';

    constructor(env: RScriptEnv, show: boolean) {
        super(env);
        this._show = show;
    }

    public exec(): void {
        if (this._show) {
            const {theme} = ROPUIArrow;
            this.clear();

            const arrow = new RScriptArrow(
                theme.thickness,
                theme.length,
                theme.colors.outline,
                theme.colors.fill
            );

            const repositionArrow = () => {
                const bounds = this._env.getUIElementBounds(this._uiElementId);
                if (!bounds) {
                    arrow.display.visible = false;
                    return;
                }
                arrow.display.position.x = bounds.x + bounds.width / 2;
                if (this._side === 'bottom') {
                    arrow.display.position.y = bounds.y + bounds.height;
                    arrow.rotation = 90;
                } else {
                    arrow.display.position.y = bounds.y;
                    arrow.rotation = -90;
                }
            };
            repositionArrow();

            this._env.addObject(arrow, this._env.container);
            this._env.setVar(this.id, arrow);
            this._env.setVar(ROPUIArrow._lastId, arrow);
            // We could listen for pose resizes, but that wouldn't tell us about things
            // like items being dragged around, scroll containers with items being scrolled,
            // the hotbar contents changing, etc. So instead we just reposition the thing
            // every frame
            arrow.addObject(
                new RepeatingTask(
                    () => new SerialTask(
                        new DelayTask(0.01),
                        new CallbackTask(repositionArrow)
                    )
                )
            );
        } else {
            this.clear();
        }
    }

    /* override */
    protected parseArgument(arg: string, i: number) {
        // ShowUIArrow uiElementId, [top|bottom]
        if (i === 0) {
            // uiElementId
            this._uiElementId = arg.toUpperCase();
        } else if (i === 1) {
            // top|bottom
            this._side = arg;
        }
    }

    private clear() {
        if (this._uiElementId) {
            const elem = this._env.getVar(this.id) as GameObject;
            if (elem) {
                elem.destroySelf();
            }
        } else {
            // Backwards compat
            const elem = this._env.getVar(ROPUIArrow._lastId) as GameObject;
            if (elem) {
                elem.destroySelf();
            }
        }
    }

    private get id(): string {
        return `uiArrow_${this._uiElementId}`;
    }
}
