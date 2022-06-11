import {
    Container, Graphics, Point, Sprite, InteractionEvent, Text
} from 'pixi.js';
import {
    ContainerObject,
    KeyboardListener,
    MouseWheelListener,
    DisplayObjectPointerTarget,
    Flashbang,
    Assert,
    VLayoutContainer, HLayoutContainer,
    VAlign, HAlign, SpriteObject, SceneObject, Dragger, MathUtil
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import BitmapManager from 'eterna/resources/BitmapManager';
import Eterna from 'eterna/Eterna';
import GameButton from './GameButton';
import FloatSliderBar from './FloatSliderBar';
import ScrollContainer from './ScrollContainer';

const frameColor = 0x2f94d1;
const titleBackColor = 0x043468;
const backColor = 0x152843;
const THUMB_WIDTH = 18;
const THUMB_MARGIN = 26;

/** FloatDialogs that expose a "confirmed" promise will reject with this error if the dialog is canceled */
export class FloatDialogCanceledError extends Error {}

/** Convenience base class for dialog objects. */
export default abstract class FloatDialog<T> extends ContainerObject implements KeyboardListener, MouseWheelListener {
    /** A Promise that will resolve when the dialog is closed. */
    public readonly closed: Promise<T | null>;
    private title: string;
    public titleArea: Container;
    private _titleDraggerLeft: SpriteObject;
    private _titleText: SceneObject<Text>;
    private _titleDraggerRight: SpriteObject;
    private readonly GAP: number = 4;
    private closeButton: GameButton;
    private normalButton: GameButton;
    private frameContainer: Container;
    private contentHLay: HLayoutContainer;
    public contentVLay: VLayoutContainer;
    private contentLay: VLayoutContainer;
    // private _scrollView: VScrollBox;
    private scrollContainer: ScrollContainer;
    private vSlider: FloatSliderBar;
    private hSlider: FloatSliderBar;
    private closeIconSize: number = 24;
    private titleBackground: Graphics;
    private background: Graphics;
    private frameMask: Graphics;
    private frame: Graphics;
    private frameBackground: Graphics;
    private iconSize: number = 20;
    private rbSprite: SpriteObject;
    private lbSprite: SpriteObject;
    private dragLeftPrevPt: Point = new Point();
    private dragRightPrevPt: Point = new Point();

    constructor(title:string = '') {
        super();
        this.title = title;
        this.closed = new Promise((resolve) => { this._resolvePromise = resolve; });
    }

    private setScrollHorizontal(progress: number): void {
        const contentW = this.contentLay.width;
        const containerW = this.scrollContainer.container.width;
        this.scrollContainer.scrollX = (contentW > containerW)
            ? (contentW - containerW) * progress : 0;
    }

    private setScrollVertical(progress: number): void {
        const contentH = this.contentLay.height;
        const containerH = this.scrollContainer.container.height;
        this.scrollContainer.scrollY = (contentH > containerH)
            ? (contentH - containerH) * progress : 0;
    }

    protected added() {
        super.added();

        this.setupModalBackground();

        this.frameContainer = new Container();
        this.frameMask = new Graphics();
        this.frameBackground = new Graphics();
        this.frameBackground.beginFill(backColor, 1)
            .drawRect(0, 0, 2048, 2048)
            .endFill();

        this.frameContainer.addChild(this.frameMask);
        this.frameContainer.addChild(this.frameBackground);
        this.frameContainer.mask = this.frameMask;

        this.contentLay = new VLayoutContainer(0, HAlign.LEFT);

        this.lbSprite = new SpriteObject(
            new Sprite(BitmapManager.getBitmap(Bitmaps.Img3DLeft))
        );
        this.lbSprite.display.width = this.iconSize;
        this.lbSprite.display.height = this.iconSize;

        this.rbSprite = new SpriteObject(
            new Sprite(BitmapManager.getBitmap(Bitmaps.Img3DRight))
        );
        this.rbSprite.display.width = this.iconSize;
        this.rbSprite.display.height = this.iconSize;

        this.titleArea = new Container();
        this.titleBackground = new Graphics();
        this.titleBackground
            .beginFill(titleBackColor)
            .drawRect(0, 0, 10, this.closeIconSize)
            .endFill();
        this.titleArea.addChild(this.titleBackground);

        this._titleDraggerLeft = new SpriteObject(Sprite.from(Bitmaps.Img3DTitle));
        this._titleDraggerLeft.display.height = this.closeIconSize;
        this.addObject(this._titleDraggerLeft, this.titleArea);
        this._titleDraggerLeft.display.position.x = this.closeIconSize + this.GAP;

        this._titleText = new SceneObject<Text>(Fonts.std(this.title, 14).color(0xffffff).build());
        this.addObject(this._titleText, this.titleArea);
        this._titleText.display.position.y = (this.closeIconSize - this._titleText.display.height) / 2;

        this._titleDraggerRight = new SpriteObject(Sprite.from(Bitmaps.Img3DTitle));
        this._titleDraggerRight.display.height = this.closeIconSize;
        this.addObject(this._titleDraggerRight, this.titleArea);

        this.titleArea.interactive = true;
        this.titleArea.height = this.closeIconSize;

        this.closeButton = new GameButton()
            .up(Bitmaps.Img3DMin)
            .over(Bitmaps.Img3DMinHover)
            .down(Bitmaps.Img3DMin)
            .tooltip('Close');
        this.addObject(this.closeButton, this.titleArea);
        this.closeButton.display.width = this.closeIconSize - 4;
        this.closeButton.display.height = this.closeIconSize - 4;
        this.closeButton.display.position.y = 2;

        this.normalButton = new GameButton()
            .up(Bitmaps.Img3DMaxRestore)
            .over(Bitmaps.Img3DMaxRestoreHover)
            .down(Bitmaps.Img3DMaxRestore)
            .tooltip('Normalize');
        this.addObject(this.normalButton, this.titleArea);
        this.normalButton.display.width = this.closeIconSize - 4;
        this.normalButton.display.height = this.closeIconSize - 4;
        this.normalButton.display.position.y = 2;
        this.normalButton.enabled = false;

        this.closeButton.clicked.connect(() => {
            this.close(null);
        });
        this.normalButton.clicked.connect(() => {
            this.normalize();
        });

        this.frameContainer.addChild(this.titleArea);

        this.contentLay.addVSpacer(10);
        this.contentHLay = new HLayoutContainer(0, VAlign.CENTER);
        this.contentHLay.addHSpacer(10);
        this.contentVLay = new VLayoutContainer(0, HAlign.LEFT);
        this.contentHLay.addChild(this.contentVLay);
        this.contentHLay.addHSpacer(10);

        this.contentLay.addChild(this.contentHLay);
        this.contentLay.addVSpacer(10);

        this.scrollContainer = new ScrollContainer(1, 1);
        this.scrollContainer.display.position.set(0, this.closeIconSize);
        this.addObject(this.scrollContainer, this.frameContainer);
        this.scrollContainer.content.addChild(this.contentLay);

        this.vSlider = new FloatSliderBar(true);
        this.vSlider.setProgress(0);
        this.vSlider.scrollChanged.connect((scrollValue) => this.setScrollVertical(scrollValue));
        this.addObject(this.vSlider, this.frameContainer);

        this.hSlider = new FloatSliderBar(false);
        this.hSlider.setProgress(0);
        this.hSlider.scrollChanged.connect((scrollValue) => this.setScrollHorizontal(scrollValue));
        this.addObject(this.hSlider, this.frameContainer);

        this.frameContainer.addChild(this.lbSprite.display);
        this.frameContainer.addChild(this.rbSprite.display);

        this.frame = new Graphics();
        this.frameContainer.addChild(this.frame);

        this.container.addChild(this.frameContainer);

        this.updateFloatLocation();

        this.regs.add(this._titleDraggerLeft.pointerDown.connect((e) => this.handleMove(e)));
        this.regs.add(this._titleDraggerRight.pointerDown.connect((e) => this.handleMove(e)));
        this.regs.add(this._titleText.pointerDown.connect((e) => this.handleMove(e)));

        this.regs.add(this.lbSprite.pointerDown.connect((e) => this.handleResizeLeft(e)));
        this.regs.add(this.lbSprite.pointerOver.connect(() => {
            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) doc.style.cursor = 'sw-resize';
        }));
        this.regs.add(this.lbSprite.pointerOut.connect(() => {
            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) doc.style.cursor = '';
        }));

        this.regs.add(this.rbSprite.pointerDown.connect((e) => this.handleResizeRight(e)));
        this.regs.add(this.rbSprite.pointerOver.connect(() => {
            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) doc.style.cursor = 'nw-resize';
        }));
        this.regs.add(this.rbSprite.pointerOut.connect(() => {
            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) doc.style.cursor = '';
        }));
    }

    private handleMove(e: InteractionEvent) {
        const dragger = new Dragger();
        this.addObject(dragger);

        const dragStartingPoint = e.data.global.clone();
        const Y0 = this.frameContainer.position.y;
        const X0 = this.frameContainer.position.x;

        this.regs.add(dragger.dragged.connect((p: Point) => {
            this.frameContainer.position.y = Y0 + (p.y - dragStartingPoint.y);
            this.frameContainer.position.x = X0 + (p.x - dragStartingPoint.x);
        }));
    }

    private handleResizeLeft(e: InteractionEvent) {
        const dragger = new Dragger();
        this.addObject(dragger);

        this.dragLeftPrevPt.x = e.data.global.x;
        this.dragLeftPrevPt.y = e.data.global.y;
        this.regs.add(dragger.dragged.connect((p: Point) => {
            const dx = p.x - this.dragLeftPrevPt.x;
            const dy = p.y - this.dragLeftPrevPt.y;

            const w = this.frameMask.width - dx;
            const h = this.frameMask.height + dy;
            if (w > 100 && h > 100) {
                this.frameContainer.position.x += dx;
                this.resize(w, h);
                this.dragLeftPrevPt.x = p.x;
                this.dragLeftPrevPt.y = p.y;
            }
        }));
    }

    private handleResizeRight(e: InteractionEvent) {
        const dragger = new Dragger();
        this.addObject(dragger);

        this.dragRightPrevPt.x = e.data.global.x;
        this.dragRightPrevPt.y = e.data.global.y;
        this.regs.add(dragger.dragged.connect((p: Point) => {
            const dx = p.x - this.dragRightPrevPt.x;
            const dy = p.y - this.dragRightPrevPt.y;

            const w = this.frameMask.width + dx;
            const h = this.frameMask.height + dy;
            if (w > 100 && h > 100) {
                this.resize(w, h);
                this.dragRightPrevPt.x = p.x;
                this.dragRightPrevPt.y = p.y;
            }
        }));
    }

    public resize(w: number, h: number) {
        this.frameMask.clear().beginFill(0, 1)
            .drawRect(0, 0, w, h)
            .endFill();

        this.frame.clear()
            .lineStyle(2, frameColor)
            .drawRect(0, 0, w, h);

        this.lbSprite.display.x = 0;
        this.lbSprite.display.y = 0 + h - this.iconSize;
        this.rbSprite.display.x = 0 + w - this.iconSize;
        this.rbSprite.display.y = this.lbSprite.display.y;

        const containerW = w - THUMB_WIDTH;
        const containerH = h - THUMB_WIDTH - this.titleArea.height;
        this.scrollContainer.setSize(containerW, containerH);
        this.scrollContainer.doLayout();

        const contentW = this.contentLay.width;
        // const containerW = this.scrollContainer.container.width;
        const contentH = this.contentLay.height;
        // const containerH = this.scrollContainer.container.height;

        // this.vSlider.display.position.set(w - THUMB_WIDTH, THUMB_MARGIN + this.titleArea.height);
        this.vSlider.display.position.set(w - THUMB_WIDTH, this.titleArea.height);
        // this.vSlider.setSize(0, h - THUMB_WIDTH - this.titleArea.height - THUMB_MARGIN * 2);
        this.vSlider.setSize(h - this.titleArea.height - this.iconSize, contentH, containerH);
        this.vSlider.display.visible = (contentH > containerH);

        // this.hSlider.display.position.set(THUMB_MARGIN, h - THUMB_WIDTH);
        this.hSlider.display.position.set(this.iconSize, h - THUMB_WIDTH);
        // this.hSlider.setSize(w - THUMB_MARGIN * 2, 0);
        this.hSlider.setSize(w - 2 * this.iconSize, contentW, containerW);
        this.hSlider.display.visible = (contentW > containerW);

        this.titleBackground.width = w;
        this.layoutTitleArea(w);

        this.normalButton.enabled = true;
    }

    private layoutTitleArea(w: number) {
        this.closeButton.display.position.x = w - this.closeIconSize;
        this.normalButton.display.position.x = 2;
        if (w > this._titleText.display.width + this.closeIconSize * 2 + this.GAP * 4) {
            const leftW = w / 2 - (this.closeIconSize + this._titleText.display.width / 2 + this.GAP * 2);
            this._titleDraggerLeft.display.width = leftW;
            this._titleDraggerLeft.display.height = this.closeIconSize;
            this._titleDraggerLeft.display.position.x = this.closeIconSize + this.GAP;

            const textX = this._titleDraggerLeft.display.position.x + this._titleDraggerLeft.display.width + this.GAP;
            this._titleText.display.position.x = textX;

            const rightW = w / 2 - (this.closeIconSize + this._titleText.display.width / 2 + this.GAP * 2);
            this._titleDraggerRight.display.width = rightW;
            this._titleDraggerRight.display.height = this.closeIconSize;
            this._titleDraggerRight.display.position.x = w / 2 + this._titleText.display.width / 2 + this.GAP;
        } else {
            this._titleDraggerLeft.display.width = 0;
            this._titleDraggerLeft.display.height = this.closeIconSize;
            this._titleDraggerLeft.display.position.x = this.closeIconSize;

            this._titleText.display.position.x = this.closeIconSize + this.GAP;

            this._titleDraggerRight.display.width = 0;
            this._titleDraggerRight.display.height = this.closeIconSize;
            this._titleDraggerRight.display.position.x = w - this.closeIconSize;
        }
    }

    private normalize() {
        const w = this.contentLay.width + THUMB_WIDTH;
        const h = this.contentLay.height + this.titleArea.height + THUMB_WIDTH;

        this.scrollContainer.setSize(this.contentLay.width, this.contentLay.height);
        this.scrollContainer.doLayout();

        this.vSlider.display.visible = false;
        this.hSlider.display.visible = false;

        this.frameMask.clear().beginFill(0, 1)
            .drawRect(0, 0, w, h)
            .endFill();

        this.frame.clear()
            .lineStyle(2, frameColor)
            .drawRect(0, 0, w, h);

        this.lbSprite.display.x = 0;
        this.lbSprite.display.y = 0 + h - this.iconSize;
        this.rbSprite.display.x = 0 + w - this.iconSize;
        this.rbSprite.display.y = this.lbSprite.display.y;

        this.titleBackground.width = w;
        this.layoutTitleArea(w);

        this.normalButton.enabled = false;
    }

    public updateFloatLocation() {
        Assert.assertIsDefined(Flashbang.stageHeight);
        Assert.assertIsDefined(Flashbang.stageWidth);
        this.background
            .clear()
            .beginFill(0x0, 0)
            .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
            .endFill();

        this.contentVLay.layout(true);
        this.contentHLay.layout(true);
        this.contentLay.layout(true);

        const w = this.contentLay.width + THUMB_WIDTH;
        const h = this.contentLay.height + THUMB_WIDTH + this.closeIconSize;

        this.frameContainer.position.x = (Flashbang.stageWidth - w) * 0.5;
        this.frameContainer.position.y = (Flashbang.stageHeight - h) * 0.5;

        this.frameMask.clear().beginFill(0, 1)
            .drawRect(0, 0, w, h)
            .endFill();

        this.frame.clear()
            .lineStyle(2, frameColor)
            .drawRect(0, 0, w, h);

        this.lbSprite.display.x = 0;
        this.lbSprite.display.y = 0 + h - this.iconSize;
        this.rbSprite.display.x = 0 + w - this.iconSize;
        this.rbSprite.display.y = this.lbSprite.display.y;

        this.titleBackground.width = w;
        this.layoutTitleArea(w);

        this.scrollContainer.setSize(this.contentLay.width, this.contentLay.height);
        this.scrollContainer.doLayout();

        this.vSlider.display.visible = false;
        this.hSlider.display.visible = false;
    }

    protected setupModalBackground(): void {
        this.background = new Graphics();
        this.container.addChild(this.background);

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.keyboardInput.pushListener(this));
        this.regs.add(this.mode.mouseWheelInput.pushListener(this));

        this.updateFrameBackground();
        this.regs.add(this.mode.resized.connect(this.onResize.bind(this)));
    }

    protected onResize() {
        this.updateFrameBackground();
    }

    private updateFrameBackground() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        this.background
            .clear()
            .beginFill(0x0, 0.1)
            .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
            .endFill();
    }

    protected close(value: T | null) {
        if (this._isClosed) {
            return;
        }
        this._isClosed = true;
        this._resolvePromise(value);
        this.destroySelf();
    }

    protected removed() {
        this.close(null);
        super.removed();
    }

    public onKeyboardEvent(_e: KeyboardEvent): boolean {
        // By default, dialogs eat all keyboard input
        return true;
    }

    public onMouseWheelEvent(_e: WheelEvent): boolean {
        // By default, dialogs eat all mousewheel input
        return true;
    }

    public get ContentLay() {
        return this.contentLay;
    }

    public get Container() {
        return this.frameContainer;
    }

    protected _resolvePromise: (value: T | null) => void;
    protected _isClosed: boolean;
}
