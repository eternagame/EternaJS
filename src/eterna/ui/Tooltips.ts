import {ExtendedTextStyle} from "pixi-multistyle-text";
import {Container, DisplayObject, Graphics, Point, Rectangle, Text} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GameObject} from "../../flashbang/core/GameObject";
import {GameObjectRef} from "../../flashbang/core/GameObjectRef";
import {Button} from "../../flashbang/objects/Button";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {DelayTask} from "../../flashbang/tasks/DelayTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {Easing} from "../../flashbang/util/Easing";
import {StyledTextBuilder} from "../../flashbang/util/StyledTextBuilder";
import {Registration} from "../../signals/Registration";
import {RegistrationGroup} from "../../signals/RegistrationGroup";
import {Fonts} from "../util/Fonts";

/** A tooltip can be a string, styled text, or a function that creates a DisplayObject */
export type Tooltip = (() => DisplayObject) | string | StyledTextBuilder;

export class Tooltips extends GameObject {
    /** Default text style for tooltips */
    public static readonly DEFAULT_STYLE: ExtendedTextStyle = {
        fontFamily: Fonts.ARIAL,
        fontSize: 15,
        fill: 0xC0DCE7
    };

    public static get instance(): Tooltips {
        return Flashbang.curMode.getObjectWithId(Tooltips);
    }

    public constructor(layer: Container) {
        super();
        this._layer = layer;
    }

    public get ids(): any[] {
        return [Tooltips];
    }

    protected removed(): void {
        this.removeCurTooltip();
        super.removed();
    }

    public showTooltip(key: any, loc: Point, tooltip: Tooltip): void {
        if (this._curTooltipKey == key) {
            return;
        }

        this.removeCurTooltip();

        this._curTooltipKey = key;
        this._curTooltip = Tooltips.createTooltip(tooltip);

        let layerLoc = this._layer.toLocal(loc);
        this._curTooltip.x = layerLoc.x;
        this._curTooltip.y = layerLoc.y;
        this._curTooltip.alpha = 0;

        this._layer.addChild(this._curTooltip);

        this._curTooltipFader = this.addObject(new SerialTask(
            new DelayTask(Tooltips.TOOLTIP_DELAY),
            new AlphaTask(1, 0.1, Easing.linear, this._curTooltip),
        ));
    }

    public showTooltipFor(target: DisplayObject, key: any, tooltip: Tooltip): void {
        if (this._curTooltipKey == key) {
            return;
        }

        let r = target.getBounds(false, Tooltips.TARGET_BOUNDS);
        let p = Tooltips.P;
        p.set(r.x + (r.width * 0.5), r.y + (r.height * 0.5));
        this.showTooltip(key, p, tooltip);
    }

    public removeTooltip(key: any): void {
        if (this._curTooltipKey == key) {
            this.removeCurTooltip();
        }
    }

    public removeCurTooltip(): void {
        if (this._curTooltip != null) {
            this._curTooltip.destroy();
            this._curTooltip = null;
            this._curTooltipKey = null;
            this._curTooltipFader.destroyObject();
        }
    }

    public addButtonTooltip(button: Button, tooltip: Tooltip): Registration {
        let show = (): void => {
            if (button.enabled ) {
                this.showTooltipFor(button.display, button, tooltip);
            }
        };

        let hide = (): void => this.removeTooltip(button);

        let regs = new RegistrationGroup();

        regs.add(button.pointerDown.connect(show));
        regs.add(button.clickCanceled.connect(hide));

        regs.add(button.pointerOver.connect(show));
        regs.add(button.pointerOut.connect(hide));

        return regs;
    }

    private static createTooltip(tooltip: Tooltip): DisplayObject {
        if (typeof(tooltip) === "string" || tooltip instanceof StyledTextBuilder) {
            let textField: Container;
            if (typeof(tooltip) === "string") {
                textField = new Text(tooltip, Tooltips.DEFAULT_STYLE);
            } else {
                textField = tooltip.build();
            }

            let disp = new Graphics()
                .beginFill(0x0, 0.8)
                .drawRoundedRect(0, 0, textField.width + 20, textField.height + 20, 5)
                .endFill();
            textField.x = 10;
            textField.y = 10;
            disp.addChild(textField);
            return disp;

        } else {
            return tooltip();
        }
    }

    private readonly _layer: Container;

    private _curTooltipKey: any;
    private _curTooltip: DisplayObject;
    private _curTooltipFader: GameObjectRef = GameObjectRef.NULL;

    private static readonly TARGET_BOUNDS = new Rectangle();
    private static readonly P = new Point();

    private static readonly TOOLTIP_DELAY = 0.5;
}
