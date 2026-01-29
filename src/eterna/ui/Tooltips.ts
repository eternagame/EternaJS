import {PaletteTarget} from 'eterna/ui/toolbar/NucleotidePalette';
import Fonts from 'eterna/util/Fonts';
import {
    AlphaTask,
    Assert,
    Button,
    ContainerObject,
    DelayTask,
    DisplayObjectPointerTarget,
    Easing,
    Flashbang,
    GameObject,
    GameObjectRef,
    PointerCapture,
    SerialTask,
    StyledTextBuilder,
    TextUtil
} from 'flashbang';
import GraphicsObject from 'flashbang/objects/GraphicsObject';
import {
    Container, Graphics, Point, Rectangle, Text,
    TextStyleOptions
} from 'pixi.js';
import {Registration, RegistrationGroup} from 'signals';

/** A tooltip can be a string, styled text, or a function that creates a DisplayObject */
export type Tooltip = (() => Container) | string | StyledTextBuilder;

export default class Tooltips extends GameObject {
    /** Default text style for tooltips */
    public static readonly DEFAULT_STYLE: TextStyleOptions = {
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

        this._curTooltipPointerCapture = new PointerCapture(null, (e) => {
            if (e.type === 'pointerup' || e.type === 'pointercancel' || e.type === 'pointerupoutside') {
                this.removeTooltip(key);
            }
        });
        this.mode?.addObject(this._curTooltipPointerCapture);

        Assert.assertIsDefined(this.mode);
        Assert.assertIsDefined(this.mode.container);
        this.mode.container.removeChild(this._curTooltip);
        this.mode.container.addChild(this._curTooltip);
    }

    public showTooltipFor(
        target: Container,
        key: Button | PaletteTarget | ContainerObject | GraphicsObject | DisplayObjectPointerTarget,
        tooltip: Tooltip
    ): void {
        if (this._curTooltipKey === key) {
            return;
        }

        const r = target.getBounds(false);
        const p = new Point();
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
        if (this._curTooltip != null && !this._curTooltip.destroyed) {
            this._curTooltip.destroy();
            this._curTooltip = null;
            this._curTooltipKey = null;
            this._curTooltipFader.destroyObject();
            this._curTooltipPointerCapture?.destroySelf();
            this._curTooltipPointerCapture = null;
        }
    }

    public addTooltip(
        ele: Button | ContainerObject | GraphicsObject | DisplayObjectPointerTarget,
        tooltip: Tooltip
    ): Registration {
        const hide = (): void => {
            this.removeTooltip(ele);
        };

        const show = (): void => {
            if ((ele instanceof Button && ele.enabled) || !(ele instanceof Button)) {
                if (ele instanceof DisplayObjectPointerTarget) {
                    this.showTooltipFor(ele.target, ele, tooltip);
                } else {
                    this.showTooltipFor(ele.display, ele, tooltip);
                }
            }
        };

        const regs = new RegistrationGroup();

        regs.add(ele.pointerDown.connect(show));
        regs.add(ele.pointerOver.connect(show));
        regs.add(ele.pointerOut.connect(hide));

        if (!(ele instanceof DisplayObjectPointerTarget)) {
            regs.add(ele.destroyed.connect(hide));
        }

        return regs;
    }

    private static createTooltip(tooltip: Tooltip): Container {
        if (typeof tooltip === 'string' || tooltip instanceof StyledTextBuilder) {
            const textField = typeof tooltip === 'string'
                ? new Text({text: tooltip, style: Tooltips.DEFAULT_STYLE})
                : tooltip.build();

            const {height, width} = TextUtil.getTextDimensions(textField);
            const container = new Container();
            const backdrop = new Graphics()
                .roundRect(0, 0, width + 20, height + 20, 5)
                .fill({color: 0x0, alpha: 0.8});
            textField.x = 10;
            textField.y = 10;
            container.addChild(backdrop);
            container.addChild(textField);
            container.hitArea = new Rectangle();
            return container;
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

    private _curTooltip: Container | null = null;
    private _curTooltipFader: GameObjectRef = GameObjectRef.NULL;
    private _curTooltipPointerCapture: PointerCapture | null = null;

    private static readonly TOOLTIP_DELAY = 0.5;
}
