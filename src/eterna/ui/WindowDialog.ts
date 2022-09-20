import {
    Container, Graphics, Point, Sprite, InteractionEvent, Text
} from 'pixi.js';
import {
    Flashbang,
    Assert,
    VLayoutContainer, HLayoutContainer,
    VAlign, HAlign, SpriteObject, SceneObject, Dragger
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import BitmapManager from 'eterna/resources/BitmapManager';
import Eterna from 'eterna/Eterna';
import GameButton from './GameButton';
import FloatSliderBar from './FloatSliderBar';
import ScrollContainer from './ScrollContainer';
import Dialog from './Dialog';

const frameColor = 0x2f94d1;
const THUMB_WIDTH = 18;
const roundRadius = 5;

/** Convenience base class for dialog objects. */
export default abstract class WindowDialog<T> extends Dialog<T> {
    private title: string;
    public titleArea: Container;
    private _titleDragger: SpriteObject;
    private _textBg: Graphics;
    private _titleText: SceneObject<Text>;
    private readonly GAP: number = 4;
    private closeButton: GameButton;
    private normalButton: GameButton;
    private frameContainer: Container;
    private contentHLay: HLayoutContainer;
    public contentVLay: VLayoutContainer;
    private contentLay: VLayoutContainer;
    private scrollContainer: ScrollContainer;
    private vSlider: FloatSliderBar;
    private hSlider: FloatSliderBar;
    private closeIconSize: number = 24;
    private titleBackground: Graphics;
    private frameMask: Graphics;
    private frame: Graphics;
    private frameBackground: Graphics;
    private iconSize: number = 20;
    private rbSprite: SpriteObject;
    private lbSprite: SpriteObject;
    private _minWidth = 100;
    private _minHeight = 100;
    private padding = {
        left: 12, right: 12, top: 12, bottom: 12
    };

    private titleBackColor = 0x043468;
    private backColor = 0x152843;

    constructor(title:string = '', modal: boolean = false) {
        super(modal);
        this.title = title;
    }

    public setTitle(title: string) {
        this.title = title;
    }

    public setPadding(l: number, r?:number, t?:number, b?: number) {
        this.padding.left = l;
        this.padding.right = r || l;
        this.padding.top = t || l;
        this.padding.bottom = b || l;
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

    public isModal() {
        return this._modal;
    }

    protected added() {
        super.added();

        this.frameContainer = new Container();
        this.frameMask = new Graphics();
        this.frameBackground = new Graphics();
        this.frameBackground.beginFill(this.backColor, 1)
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
            .beginFill(this.titleBackColor)
            .drawRect(0, 0, 10, this.closeIconSize)
            .endFill();
        this.titleArea.addChild(this.titleBackground);

        this._titleDragger = new SpriteObject(Sprite.from(Bitmaps.Img3DTitle));
        this._titleDragger.display.height = this.closeIconSize;
        this.addObject(this._titleDragger, this.titleArea);

        this._textBg = new Graphics();
        this._textBg
            .beginFill(this.titleBackColor)
            .drawRect(0, 0, 10, this.closeIconSize)
            .endFill();
        this.titleArea.addChild(this._textBg);
        this._titleText = new SceneObject<Text>(Fonts.std(this.title, 14).color(0xffffff).build());
        this.addObject(this._titleText, this.titleArea);
        this._titleText.display.position.y = (this.closeIconSize - this._titleText.display.height) / 2;

        this.titleArea.interactive = true;
        this.titleArea.height = this.closeIconSize;

        this.closeButton = new GameButton()
            .up(Bitmaps.ImgDlgClose)
            .over(Bitmaps.ImgOverDlgClose)
            .down(Bitmaps.ImgDlgClose)
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
        if (this._modal) this.normalButton.display.visible = false;

        this.closeButton.clicked.connect(this._close.bind(this));
        this.normalButton.clicked.connect(() => {
            this.normalize();
        });

        this.frameContainer.addChild(this.titleArea);

        this.contentLay.addVSpacer(this.padding.top);
        this.contentHLay = new HLayoutContainer(0, VAlign.CENTER);
        this.contentHLay.addHSpacer(this.padding.left);
        this.contentVLay = new VLayoutContainer(0, HAlign.LEFT);
        this.contentHLay.addChild(this.contentVLay);
        this.contentHLay.addHSpacer(this.padding.right);

        this.contentLay.addChild(this.contentHLay);
        this.contentLay.addVSpacer(this.padding.bottom);

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
        if (this._modal) {
            this.lbSprite.display.alpha = 0;
            this.rbSprite.display.alpha = 0;
            this._titleDragger.display.alpha = 0;
        }

        this.frame = new Graphics();
        this.frameContainer.addChild(this.frame);

        this.container.addChild(this.frameContainer);

        this.updateFloatLocation();

        if (!this._modal) {
            this.regs.add(this._titleDragger.pointerDown.connect((e) => this.handleMove(e)));
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

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(() => this.moveToCenter()));
    }

    private moveToCenter() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        const w = this.contentLay.width + THUMB_WIDTH;
        const h = this.contentLay.height + THUMB_WIDTH + this.closeIconSize;
        this.frameContainer.position.x = (Flashbang.stageWidth - w) * 0.5;
        this.frameContainer.position.y = (Flashbang.stageHeight - h) * 0.5;
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

        const dragStartingPoint = e.data.global.clone();
        const windowStartingPoint = this.frameContainer.position.clone();
        const maskSize = {x: this.frameMask.width, y: this.frameMask.height};

        this.regs.add(dragger.dragged.connect((p: Point) => {
            const dx = p.x - dragStartingPoint.x;
            const dy = p.y - dragStartingPoint.y;

            const w = maskSize.x - dx;
            const h = maskSize.y + dy;
            if (w > this._minWidth && h > this._minHeight) {
                this.frameContainer.position.x = windowStartingPoint.x + dx;
                this.resize(w, h);
            } else if (w > this._minWidth) {
                this.frameContainer.position.x = windowStartingPoint.x + dx;
                this.resize(w, this._minHeight);
            } else if (h > this._minHeight) {
                this.resize(this._minWidth, h);
            }
        }));
    }

    private handleResizeRight(e: InteractionEvent) {
        const dragger = new Dragger();
        this.addObject(dragger);

        const dragStartingPoint = e.data.global.clone();
        const maskSize = {x: this.frameMask.width, y: this.frameMask.height};
        this.regs.add(dragger.dragged.connect((p: Point) => {
            const dx = p.x - dragStartingPoint.x;
            const dy = p.y - dragStartingPoint.y;

            const w = maskSize.x + dx;
            const h = maskSize.y + dy;
            if (w > this._minWidth && h > this._minHeight) {
                this.resize(w, h);
            } else if (w > this._minWidth) {
                this.resize(w, this._minHeight);
            } else if (h > this._minHeight) {
                this.resize(this._minWidth, h);
            }
        }));
    }

    public set minWidth(w: number) {
        this._minWidth = w;
    }

    public get minWidth() {
        return this._minWidth;
    }

    public set minHeight(h: number) {
        this._minHeight = h;
    }

    public get minHeight() {
        return this._minHeight;
    }

    public resize(w: number, h: number) {
        this.frameMask.clear().beginFill(0, 1)
            .drawRoundedRect(0, 0, w, h, roundRadius)
            .endFill();

        this.frame.clear()
            .lineStyle(2, frameColor)
            .drawRoundedRect(0, 0, w, h, roundRadius);

        this.lbSprite.display.x = 0;
        this.lbSprite.display.y = 0 + h - this.iconSize;
        this.rbSprite.display.x = 0 + w - this.iconSize;
        this.rbSprite.display.y = this.lbSprite.display.y;

        const contentW = this.contentLay.width;
        const contentH = this.contentLay.height;

        let showHScroll = false;
        let showVScroll = false;
        let containerW = w;
        if (contentW > containerW) {
            containerW -= THUMB_WIDTH;
            showHScroll = true;
        }
        let containerH = h - this.titleArea.height;
        if (contentH > containerH) {
            containerH -= THUMB_WIDTH;
            showVScroll = true;
        }
        this.scrollContainer.setSize(containerW, containerH);
        this.scrollContainer.doLayout();

        this.vSlider.display.position.set(w - THUMB_WIDTH, this.titleArea.height);
        this.vSlider.setSize(h - this.titleArea.height - this.iconSize, contentH, containerH);
        this.vSlider.display.visible = showVScroll;

        // this.hSlider.display.position.set(THUMB_MARGIN, h - THUMB_WIDTH);
        this.hSlider.display.position.set(this.iconSize, h - THUMB_WIDTH);
        // this.hSlider.setSize(w - THUMB_MARGIN * 2, 0);
        this.hSlider.setSize(w - 2 * this.iconSize, contentW, containerW);
        this.hSlider.display.visible = showHScroll;

        this.titleBackground.width = w;
        this.layoutTitleArea(w);

        this.normalButton.enabled = true;
    }

    private layoutTitleArea(w: number) {
        this.closeButton.display.position.x = w - this.closeIconSize;
        this.normalButton.display.position.x = 2;
        let buttonWidth = this.closeIconSize * 2 + this.GAP * 2;
        if (this._modal) buttonWidth = this.closeIconSize + this.GAP * 2;
        if (w > this._titleText.display.width + buttonWidth) {
            this._titleDragger.display.width = w - buttonWidth;
            this._titleDragger.display.height = this.closeIconSize;
            if (this._modal) this._titleDragger.display.position.x = this.GAP;
            else this._titleDragger.display.position.x = this.closeIconSize + this.GAP;

            const textX = (w - this._titleText.display.width) / 2;
            this._titleText.display.position.x = textX;

            this._textBg
                .clear()
                .beginFill(this.titleBackColor)
                .drawRect(0, 0, this._titleText.display.width + 2 * this.GAP, this.closeIconSize)
                .endFill();
            this._textBg.position.x = textX - this.GAP;
        } else {
            this._titleDragger.display.width = 0;
            this._titleDragger.display.height = this.closeIconSize;
            this._titleDragger.display.position.x = this.closeIconSize;
        }
    }

    public getTitleHeight() {
        return this.closeIconSize;
    }

    public getThumbSize() {
        return THUMB_WIDTH;
    }

    public getPadding() {
        return this.padding;
    }

    private normalize() {
        const w = this.contentLay.width + THUMB_WIDTH;
        const h = this.contentLay.height + this.titleArea.height + THUMB_WIDTH;

        this.scrollContainer.setSize(this.contentLay.width, this.contentLay.height);
        this.scrollContainer.doLayout();

        this.vSlider.display.visible = false;
        this.hSlider.display.visible = false;

        this.frameMask.clear().beginFill(0, 1)
            .drawRoundedRect(0, 0, w, h, roundRadius)
            .endFill();

        this.frame.clear()
            .lineStyle(2, frameColor)
            .drawRoundedRect(0, 0, w, h, roundRadius);

        this.lbSprite.display.x = 0;
        this.lbSprite.display.y = 0 + h - this.iconSize;
        this.rbSprite.display.x = 0 + w - this.iconSize;
        this.rbSprite.display.y = this.lbSprite.display.y;

        this.titleBackground.width = w;
        this.layoutTitleArea(w);

        this.normalButton.enabled = false;
    }

    public updateFloatLocation(bInit:boolean = true) {
        Assert.assertIsDefined(Flashbang.stageHeight);
        Assert.assertIsDefined(Flashbang.stageWidth);

        this.contentVLay.layout(true);
        this.contentHLay.layout(true);
        this.contentLay.layout(true);

        const w = this.contentLay.width;// + THUMB_WIDTH;
        const h = this.contentLay.height + this.closeIconSize;// + THUMB_WIDTH ;

        if (bInit) {
            this.frameContainer.position.x = (Flashbang.stageWidth - w) * 0.5;
            this.frameContainer.position.y = (Flashbang.stageHeight - h) * 0.5;
        }

        this.frameMask.clear().beginFill(0, 1)
            .drawRoundedRect(0, 0, w, h, roundRadius)
            .endFill();

        this.frame.clear()
            .lineStyle(2, frameColor)
            .drawRoundedRect(0, 0, w, h, roundRadius);

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

    protected _close() {
        this.close(null);
    }

    public get ContentLay() {
        return this.contentLay;
    }

    public get Container() {
        return this.frameContainer;
    }
}
