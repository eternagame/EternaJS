import HelpToolTip, {HelpToolTipSide} from 'eterna/ui/help/HelpToolTip';
import {GameObject} from 'flashbang';
import Assert from 'flashbang/util/Assert';
import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';

export default class ROPUITooltip extends RScriptOp {
    private static id = 'uiTooltip';
    private _uiElementId: string;
    private _text: string;
    private _tailLength: number;
    private _side: string;
    private _show: boolean;

    constructor(env: RScriptEnv, show: boolean) {
        super(env);
        this._show = show;
    }

    public exec(): void {
        if (this._show) {
            this.clear();
            const getBounds = () => this._env.getUIElementBounds(this._uiElementId);
            if (getBounds()) {
                const tooltip = new HelpToolTip({
                    text: this._text,
                    tailLength: this._tailLength,
                    side: this._side as HelpToolTipSide,
                    positioner: [getBounds, 0]
                });
                const updatePosition = () => tooltip.updatePosition();

                updatePosition();
                this._env.addObject(tooltip, this._env.container);
                this._env.setVar(ROPUITooltip.id, tooltip);
                Assert.assertIsDefined(this._env.mode);
                tooltip.regs.add(this._env.mode.resized.connect(updatePosition));
            }
        } else {
            this.clear();
        }
    }

    /* override */
    protected parseArgument(arg: string, i: number) {
        // ShowUIArrow uiElementId, [text], [top|bottom], [tailLength];
        if (i === 0) {
            // uiElementId
            this._uiElementId = arg.toUpperCase();
        } else if (i === 1) {
            // text
            this._text = this._env.getVar(arg) as string;
        } else if (i === 2) {
            // top|bottom
            this._side = arg;
        } else if (i === 3) {
            // tailLength
            this._tailLength = parseInt(arg, 10);
        }
    }

    private clear() {
        const elem = (this._env.getVar(ROPUITooltip.id) as GameObject);
        if (elem) {
            elem.destroySelf();
        }
    }
}
