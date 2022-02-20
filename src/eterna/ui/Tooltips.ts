import {TextStyleExtended} from 'pixi-multistyle-text';
import {
    Container, DisplayObject, Graphics, Point, Rectangle, Text
} from 'pixi.js';
import {Registration, RegistrationGroup} from 'signals';
import {
    StyledTextBuilder,
    GameObject,
    Flashbang,
    SerialTask,
    Easing,
    AlphaTask,
    DelayTask,
    GameObjectRef,
    Button,
    Assert,
    ContainerObject,
    DisplayObjectPointerTarget
} from 'flashbang';
import {PaletteTarget} from 'eterna/ui/NucleotidePalette';
import Fonts from 'eterna/util/Fonts';
import GraphicsObject from 'flashbang/objects/GraphicsObject';

/** A tooltip can be a string, styled text, or a function that creates a DisplayObject */
export type Tooltip = (() => DisplayObject) | string | StyledTextBuilder;

export default class Tooltips extends GameObject {
    /** Default text style for tooltips */
    public static readonly DEFAULT_STYLE: TextStyleExtended = {
        fontFamily: Fonts.STDFONT,
        fontSize: 15,
        fill: 0xC0DCE7
    };

    public static get instance(): Tooltips | undefined {
        Assert.assertIsDefined(Flashbang.curMode);
        return (Flashbang.curMode.getObjectWithId(Tooltips) as Tooltips);
    }

    constructor(layer: Container) {
        super();
        this._layer = layer;
    }

    public get ids(): [typeof Tooltips] {
        return [Tooltips];
    }

    protected removed(): void {
        this.removeCurTooltip();
        super.removed();
    }

    public showTooltip(
        key: Button | PaletteTarget | ContainerObject | GraphicsObject | DisplayObjectPointerTarget,
        loc: Point, tooltip: Tooltip
    ): void {
        if (this._curTooltipKey === key) {
            return;
        }

        this.removeCurTooltip();

        this._curTooltipKey = key;
        this._curTooltip = Tooltips.createTooltip(tooltip);

        const layerLoc = this._layer.toLocal(loc);
        this._curTooltip.x = layerLoc.x;
        this._curTooltip.y = layerLoc.y;
        this._curTooltip.alpha = 0;

        this._layer.addChild(this._curTooltip);

        this._curTooltipFader = this.addObject(new SerialTask(
            new DelayTask(Tooltips.TOOLTIP_DELAY),
            new AlphaTask(1, 0.1, Easing.linear, this._curTooltip)
        ));

        Assert.assertIsDefined(this.mode);
        Assert.assertIsDefined(this.mode.container);
        this.mode.container.removeChild(this._curTooltip);
        this.mode.container.addChild(this._curTooltip);
    }

    public showTooltipFor(
        target: DisplayObject,
        key: Button | PaletteTarget | ContainerObject | GraphicsObject | DisplayObjectPointerTarget,
        tooltip: Tooltip
    ): void {
        if (this._curTooltipKey === key) {
            return;
        }

        const r = target.getBounds(false, Tooltips.TARGET_BOUNDS);
        const p = Tooltips.P;
        p.set(r.x + (r.width * 0.5), r.y + (r.height * 0.5));
        this.showTooltip(key, p, tooltip);
    }

    public removeTooltip(
        key: Button | PaletteTarget | ContainerObject | GraphicsObject | DisplayObjectPointerTarget
    ): void {
        if (this._curTooltipKey === key) {
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

    public addTooltip(
        ele: Button | ContainerObject | GraphicsObject | DisplayObjectPointerTarget,
        tooltip: Tooltip
    ): Registration {
        const show = (): void => {
            if ((ele instanceof Button && ele.enabled) || !(ele instanceof Button)) {
                if (ele instanceof DisplayObjectPointerTarget) {
                    this.showTooltipFor(ele.target, ele, tooltip);
                } else {
                    this.showTooltipFor(ele.display, ele, tooltip);
                }
            }
        };

        const hide = (): void => {
            this.removeTooltip(ele);
        };

        const regs = new RegistrationGroup();

        regs.add(ele.pointerDown.connect(show));
        if (ele instanceof Button) {
            regs.add(ele.clicked.connect(hide));
            regs.add(ele.clickCanceled.connect(hide));
        }

        regs.add(ele.pointerOver.connect(show));
        regs.add(ele.pointerOut.connect(hide));

        if (!(ele instanceof DisplayObjectPointerTarget)) {
            regs.add(ele.destroyed.connect(hide));
        }

        return regs;
    }

    private static createTooltip(tooltip: Tooltip): DisplayObject {
        if (typeof (tooltip) === 'string' || tooltip instanceof StyledTextBuilder) {
            const textField: Container = (typeof (tooltip) === 'string')
                ? new Text(tooltip, Tooltips.DEFAULT_STYLE)
                : tooltip.build();

            const disp = new Graphics()
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

    private _curTooltipKey: Button |
    PaletteTarget |
    ContainerObject |
    GraphicsObject |
    DisplayObjectPointerTarget |
    null;

    private _curTooltip: DisplayObject | null;
    private _curTooltipFader: GameObjectRef = GameObjectRef.NULL;

    private static readonly TARGET_BOUNDS = new Rectangle();
    private static readonly P = new Point();

    private static readonly TOOLTIP_DELAY = 0.5;
}
