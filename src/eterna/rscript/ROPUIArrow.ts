import {GameObject, Assert} from 'flashbang';
import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';
import RScriptArrow from './RScriptArrow';

export default class ROPUIArrow extends RScriptOp {
    private static readonly theme = {
        thickness: 35,
        length: 55,
        colors: {
            outline: 0x000000,
            fill: 0xFFFF00
        }
    };

    private static id = 'uiArrow';
    private _uiElementId: string;
    private _side: string;
    private _show: boolean;

    constructor(env: RScriptEnv, show: boolean) {
        super(env);
        this._show = show;
    }

    public exec(): void {
        if (this._show) {
            const {theme} = ROPUIArrow;
            this.clear();
            const getBounds = () => this._env.getUIElementBounds(this._uiElementId);
            if (getBounds()) {
                const arrow = new RScriptArrow(
                    theme.thickness,
                    theme.length,
                    theme.colors.outline,
                    theme.colors.fill
                );

                const updatePosition = () => {
                    const bounds = getBounds();
                    Assert.assertIsDefined(bounds);
                    arrow.display.position.x = bounds.x + bounds.width / 2;
                    if (this._side === 'bottom') {
                        arrow.display.position.y = bounds.y + bounds.height;
                        arrow.rotation = 90;
                    } else {
                        arrow.display.position.y = bounds.y;
                        arrow.rotation = -90;
                    }
                };

                updatePosition();
                this._env.addObject(arrow, this._env.container);
                this._env.setVar(ROPUIArrow.id, arrow);
                Assert.assertIsDefined(this._env.mode);
                arrow.regs.add(this._env.mode.resized.connect(updatePosition));
            }
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
        const elem = this._env.getVar(ROPUIArrow.id) as GameObject;
        if (elem) {
            elem.destroySelf();
        }
    }
}
