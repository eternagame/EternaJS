import {
    Container, Graphics, InteractionEvent, Point, Rectangle, Sprite, Text
} from 'pixi.js';
import {Stage} from 'ngl';
import {
    Assert, ContainerObject, DisplayUtil, Dragger, Flashbang, HAlign, HLayoutContainer,
    MathUtil, MouseWheelListener, SceneObject, SpriteObject, VAlign, VLayoutContainer
} from 'flashbang';
import {MappedValue, UnitSignal, ValueView} from 'signals';
import Eterna from 'eterna/Eterna';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import TextBalloon from 'eterna/ui/TextBalloon';
import GameDropdown from 'eterna/ui/GameDropdown';
import WindowBounds from './WindowBounds';
import PointerEventPropagator from './PointerEventPropagator';

enum WindowState {
    MINIMIZED_FROM_NORMAL,
    MINIMIZED_FROM_MAX,
    NORMAL,
    MAXIMIZED
}

export enum NGLDragState {
    PAN,
    ROTATE,
    ZOOM
}

export default class Pose3DWindow extends ContainerObject implements MouseWheelListener {
    public nglDragState: NGLDragState = NGLDragState.ROTATE;
    public tooltip: TextBalloon;
    public resized = new UnitSignal();

    constructor(stage: Stage) {
        super();
        this._nglStage = stage;
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        const width = 460;
        let height = 300;
        const x = Flashbang.stageWidth - width - this.MARGIN;
        let y = 100;
        if (y + height > Flashbang.stageHeight - this.BOTTOM_MARGIN) {
            y = this.TOP_MARGIN;
            height = Flashbang.stageHeight - this.BOTTOM_MARGIN - y;
        }
        this._currentBounds = new WindowBounds(
            x, y,
            width, height
        );
    }

    protected added() {
        // Background + border
        this._frame = new Graphics();
        this.container.addChild(this._frame);

        this._mainLayout = new VLayoutContainer(0, HAlign.LEFT);
        this.container.addChild(this._mainLayout);

        const titleLayout = this.createTitleBar();
        this._mainLayout.addChild(titleLayout);

        const nglContainer = this.createNGLContainer();
        this._mainLayout.addChild(nglContainer);

        this.tooltip = new TextBalloon('', 0x0, 1);
        this.tooltip.display.visible = false;
        this.addObject(this.tooltip, this.container);
        this.tooltip.display.mask = this._nglSprite.display;
        this.tooltip.display.mask = this._nglMask;

        this.layout();

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(() => this.modeResized()));

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.mouseWheelInput.pushListener(this));

        this.regs.add(Eterna.chat.chatVisibilityChanged.connect((param: {show:boolean, bound:{
            x:number,
            y:number,
            width: number,
            height: number
        }}) => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            this._chatShow = param.show;
            this._chatBound = param.bound;
            this.alignToChatWindow();
            this.layout();
        }));
    }

    private alignToChatWindow() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        const chatBound = this._chatBound;
        const x00 = chatBound.x;
        const x01 = chatBound.x + chatBound.width;
        const y00 = chatBound.y;
        const y01 = chatBound.y + chatBound.height;
        const x10 = this._currentBounds.x;
        const x11 = this._currentBounds.x + this._currentBounds.width;
        const y10 = this._currentBounds.y;
        const y11 = this._currentBounds.y + this._currentBounds.height;
        let isHorizontalIntersected = (x00 > x10 && x00 < x11);
        isHorizontalIntersected ||= (x01 > x10 && x01 < x11);
        isHorizontalIntersected ||= (x10 > x00 && x10 < x01);
        isHorizontalIntersected ||= (x11 > x00 && x11 < x01);
        let isVerticalIntersected = (y00 > y10 && y00 < y11);
        isVerticalIntersected ||= (y01 > y10 && y01 < y11);
        isVerticalIntersected ||= (y10 > y00 && y10 < y01);
        isVerticalIntersected ||= (y11 > y00 && y11 < y01);

        if (this._chatShow) {
            if (isHorizontalIntersected && isVerticalIntersected) {
                this._currentBounds.x = chatBound.x - this._currentBounds.width - this.GAP;
                if (this._currentBounds.x < 0) {
                    this._currentBounds.width = chatBound.x - this.GAP - this.MARGIN;
                    this._currentBounds.x = this.MARGIN;
                }
            }
        }
    }

    private onDropDown() {
        if (this._dataOption.value === 'Pan') {
            this.nglDragState = NGLDragState.PAN;
        } else if (this._dataOption.value === 'Rotate') {
            this.nglDragState = NGLDragState.ROTATE;
        } else if (this._dataOption.value === 'Zoom') {
            this.nglDragState = NGLDragState.ZOOM;
        }
    }

    private createTitleBar(): HLayoutContainer {
        const titleLayout = new HLayoutContainer(0, VAlign.CENTER);

        // Maximize/restore to "normal" size
        this._maxRestoreButton = new GameButton()
            .up(Bitmaps.Img3DMax)
            .over(Bitmaps.Img3DMaxHover)
            .down(Bitmaps.Img3DMax)
            .tooltip('Maximize');
        this.addObject(this._maxRestoreButton, titleLayout);
        this._maxRestoreButton.display.width = this.ICON_SIZE;
        this._maxRestoreButton.display.height = this.ICON_SIZE;
        titleLayout.addHSpacer(this.GAP);
        this.regs.add(this._maxRestoreButton.clicked.connect(() => this.maxOrRestore()));

        this._dropdown = new GameDropdown({
            fontSize: 12,
            options: ['Rotate', 'Pan', 'Zoom'],
            defaultOption: 'Rotate',
            icons: [
                {txt: 'Rotate', icon: Bitmaps.Img3DRotateIcon},
                {txt: 'Pan', icon: Bitmaps.Img3DMoveIcon},
                {txt: 'Zoom', icon: Bitmaps.ImgMingZoomIn}
            ],
            borderWidth: 0,
            height: this.ICON_SIZE,
            color: 0x043468,
            textColor: 0xFFFFFF,
            dropShadow: true
        });
        this._dropdown.display.position.x = this.ICON_SIZE + this.GAP;
        this._dropdown.display.position.y = 1;
        this.addObject(this._dropdown, this.display);
        this._dataOption = MappedValue.create(
            this._dropdown.selectedOption,
            (name) => name
        );
        this._dropdown.selectedOption.connect(() => this.onDropDown());
        titleLayout.addHSpacer(this._dropdown.width + this.GAP);

        this._titleDraggerLeft = new SpriteObject(Sprite.from(Bitmaps.Img3DTitle));
        this.addObject(this._titleDraggerLeft, titleLayout);
        titleLayout.addHSpacer(this.GAP);
        this._titleDraggerLeft.display.height = this.ICON_SIZE;

        this._titleText = new SceneObject<Text>(Fonts.std('3D STRUCTURE', 12).color(0xffffff).build());
        this._titleText.display.interactive = true;
        this.addObject(this._titleText, titleLayout);
        titleLayout.addHSpacer(this.GAP);

        this._titleDraggerRight = new SpriteObject(Sprite.from(Bitmaps.Img3DTitle));
        this.addObject(this._titleDraggerRight, titleLayout);
        titleLayout.addHSpacer(this.GAP);
        this._titleDraggerRight.display.height = this.ICON_SIZE;

        // Minimize/restore to previous
        this._minRestoreButton = new GameButton()
            .up(Bitmaps.Img3DMin)
            .over(Bitmaps.Img3DMinHover)
            .down(Bitmaps.Img3DMin)
            .tooltip('Minimize');
        this.addObject(this._minRestoreButton, titleLayout);
        this._minRestoreButton.display.width = this.ICON_SIZE;
        this._minRestoreButton.display.height = this.ICON_SIZE;
        this.regs.add(this._minRestoreButton.clicked.connect(() => this.minOrRestore()));

        this.regs.add(this._titleDraggerLeft.pointerDown.connect((e) => this.handleMove(e)));
        this.regs.add(this._titleDraggerRight.pointerDown.connect((e) => this.handleMove(e)));
        this.regs.add(this._titleText.pointerDown.connect((e) => this.handleMove(e)));

        return titleLayout;
    }

    private createNGLContainer(): Container {
        const nglContainer = new Container();

        this._nglSprite = new SpriteObject(Sprite.from(this._nglStage.viewer.renderer.domElement));
        this.addObject(this._nglSprite, nglContainer);

        const eventPropagator = new PointerEventPropagator(this._nglSprite, this._nglStage.viewer.renderer.domElement);
        this.addObject(eventPropagator);

        this._dragHandleLeft = new SpriteObject(Sprite.from(Bitmaps.Img3DLeft));
        this._dragHandleLeft.display.width = this.ICON_SIZE;
        this._dragHandleLeft.display.height = this.ICON_SIZE;
        this.addObject(this._dragHandleLeft, nglContainer);
        this.regs.add(this._dragHandleLeft.pointerDown.connect((e) => this.handleResizeLeft(e)));
        this.regs.add(this._dragHandleLeft.pointerOver.connect(() => {
            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) doc.style.cursor = 'sw-resize';
        }));
        this.regs.add(this._dragHandleLeft.pointerOut.connect(() => {
            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) doc.style.cursor = '';
        }));

        this._dragHandleRight = new SpriteObject(Sprite.from(Bitmaps.Img3DRight));
        this._dragHandleRight.display.width = this.ICON_SIZE;
        this._dragHandleRight.display.height = this.ICON_SIZE;
        this.addObject(this._dragHandleRight, nglContainer);
        this.regs.add(this._dragHandleRight.pointerDown.connect((e) => this.handleResizeRight(e)));
        this.regs.add(this._dragHandleRight.pointerOver.connect(() => {
            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) doc.style.cursor = 'nw-resize';
        }));
        this.regs.add(this._dragHandleRight.pointerOut.connect(() => {
            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) doc.style.cursor = '';
        }));

        return nglContainer;
    }

    public updateNGLTexture() {
        // We've removed the 3D view, but NGL hasn't been fully destroyed yet
        if (!this._nglSprite.display.texture) return;

        this._nglSprite.display.texture.update();
        this._nglSprite.display.width = this.nglWidth;
        this._nglSprite.display.height = this.nglHeight;
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        this._nglStage.viewer.renderer.domElement.dispatchEvent(new WheelEvent(e.type, e));
        return true;
    }

    private handleMove(e: InteractionEvent) {
        const dragger = new Dragger();
        this.addObject(dragger);

        const dragStartingPoint = e.data.global.clone();
        const windowStartingPoint = this._currentBounds.clone();
        this.regs.add(dragger.dragged.connect((p: Point) => {
            this._currentBounds.y = windowStartingPoint.y + (p.y - dragStartingPoint.y);
            this._currentBounds.x = windowStartingPoint.x + (p.x - dragStartingPoint.x);

            this.layout();
        }));
    }

    private handleResizeLeft(e: InteractionEvent) {
        const dragger = new Dragger();
        this.addObject(dragger);

        const dragStartingPoint = e.data.global.clone();
        const windowStartingPoint = this._currentBounds.clone();
        this.regs.add(dragger.dragged.connect((p: Point) => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            this._currentBounds.height = windowStartingPoint.height + (p.y - dragStartingPoint.y);
            const targetWidth = windowStartingPoint.width + (dragStartingPoint.x - p.x);
            const realWidth = MathUtil.clamp(targetWidth, this.minWidth, Flashbang.stageWidth);
            this._currentBounds.width = realWidth;
            this._currentBounds.x = windowStartingPoint.x - (realWidth - windowStartingPoint.width);

            this.layout();
        }));
    }

    private handleResizeRight(e: InteractionEvent) {
        const dragger = new Dragger();
        this.addObject(dragger);

        const dragStartingPoint = e.data.global.clone();
        const windowStartingPoint = this._currentBounds.clone();
        this.regs.add(dragger.dragged.connect((p: Point) => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            this._currentBounds.height = windowStartingPoint.height + (p.y - dragStartingPoint.y);
            const targetWidth = windowStartingPoint.width + (p.x - dragStartingPoint.x);
            this._currentBounds.width = MathUtil.clamp(targetWidth, this.minWidth, Flashbang.stageWidth);

            this.layout();
        }));
    }

    private restore() {
        this._currentBounds = this._normalBounds;
        this.alignToChatWindow();

        this._windowState = WindowState.NORMAL;
        this._minRestoreButton
            .up(Bitmaps.Img3DMin)
            .over(Bitmaps.Img3DMinHover)
            .down(Bitmaps.Img3DMin)
            .tooltip('Minimize');
        this._maxRestoreButton
            .up(Bitmaps.Img3DMax)
            .over(Bitmaps.Img3DMaxHover)
            .down(Bitmaps.Img3DMax)
            .tooltip('Maximize');
    }

    private maximize() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        if (this._windowState === WindowState.NORMAL) this._normalBounds = this._currentBounds;

        const width = Flashbang.stageWidth - this.MARGIN * 2;
        const height = Flashbang.stageHeight - this.TOP_MARGIN - this.BOTTOM_MARGIN;
        this._currentBounds = new WindowBounds(
            this.MARGIN, this.TOP_MARGIN,
            width, height
        );
        this.alignToChatWindow();

        this._windowState = WindowState.MAXIMIZED;

        this._minRestoreButton
            .up(Bitmaps.Img3DMin)
            .over(Bitmaps.Img3DMinHover)
            .down(Bitmaps.Img3DMin)
            .tooltip('Minimize');
        this._maxRestoreButton
            .up(Bitmaps.Img3DMaxRestore)
            .over(Bitmaps.Img3DMaxRestoreHover)
            .down(Bitmaps.Img3DMaxRestore)
            .tooltip('Restore');
    }

    private minimize() {
        if (this._windowState === WindowState.MAXIMIZED) {
            this._windowState = WindowState.MINIMIZED_FROM_MAX;
        } else {
            this._normalBounds = this._currentBounds;
            this._windowState = WindowState.MINIMIZED_FROM_NORMAL;
        }

        this._minRestoreButton
            .up(Bitmaps.Img3DMinRestore)
            .over(Bitmaps.Img3DMinRestoreHover)
            .down(Bitmaps.Img3DMinRestore)
            .tooltip('Restore');
        this._maxRestoreButton
            .up(Bitmaps.Img3DMax)
            .over(Bitmaps.Img3DMaxHover)
            .down(Bitmaps.Img3DMax)
            .tooltip('Restore');

        const width = Math.min(460, this._normalBounds.width);
        this._currentBounds = new WindowBounds(
            this.MARGIN,
            this.TOP_MARGIN,
            width,
            this.ICON_SIZE
        );
        this.alignToChatWindow();
    }

    private maxOrRestore() {
        if (this._windowState === WindowState.MAXIMIZED) {
            this.restore();
        } else {
            this.maximize();
        }
        this.layout();
    }

    private minOrRestore() {
        if (this._windowState === WindowState.MINIMIZED_FROM_NORMAL) {
            this.restore();
        } else if (this._windowState === WindowState.MINIMIZED_FROM_MAX) {
            this.maximize();
        } else {
            this.minimize();
        }
        this.layout();
    }

    private modeResized() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        // Don't make the window so small that our toolbar doesn't fit, but if that means
        // our window becomes smaller than the screen width, when we're bigger again don't be super
        // massive because the width is > 100%
        this._currentBounds.width = Math.max(this._currentBounds.width, this.minWidth);
        this._currentBounds.width = MathUtil.clamp(
            this._currentBounds.width,
            this.minWidth,
            Math.max(this.minWidth, Flashbang.stageWidth)
        );
        this.layout();
    }

    private layout() {
        if (
            this._windowState === WindowState.MINIMIZED_FROM_MAX
            || this._windowState === WindowState.MINIMIZED_FROM_NORMAL
        ) {
            this._dragHandleLeft.display.visible = false;
            this._dragHandleRight.display.visible = false;
            this._nglSprite.display.visible = false;
        } else {
            this._dragHandleLeft.display.visible = true;
            this._dragHandleRight.display.visible = true;
            this._nglSprite.display.visible = true;
        }

        // No need to re-render if we're not visible
        if (this._nglSprite.display.visible) {
            this._nglStage.setSize(
                `${this.nglWidth}px`,
                `${this.nglHeight}px`
            );
            this.resized.emit();
            this._nglStage.viewer.render(false);
        }

        // Title bar drag handles should fill remaining space
        const remainingWidth = this._currentBounds.width - (
            this.ICON_SIZE * 2 + this.GAP * 5 + this._titleText.display.width + this._dropdown.width
        );
        const startPosX = this.GAP * 3 + this.ICON_SIZE + this._dropdown.width;
        const textPosX = this._currentBounds.width / 2 - this._titleText.display.width / 2;
        if (textPosX >= startPosX) {
            this._titleDraggerLeft.display.width = textPosX - startPosX;
            this._titleDraggerRight.display.width = textPosX - (this.GAP * 2 + this.ICON_SIZE);
        } else {
            this._titleDraggerLeft.display.width = remainingWidth / 2;
            this._titleDraggerRight.display.width = remainingWidth / 2;
        }

        // Resize handles go on the bottom left and right corners
        const relativeNglBounds = new Rectangle(0, 0, this.nglWidth, this.nglHeight);
        DisplayUtil.positionRelativeToBounds(
            this._dragHandleLeft.display, HAlign.LEFT, VAlign.BOTTOM,
            relativeNglBounds, HAlign.LEFT, VAlign.BOTTOM
        );
        DisplayUtil.positionRelativeToBounds(
            this._dragHandleRight.display, HAlign.RIGHT, VAlign.BOTTOM,
            relativeNglBounds, HAlign.RIGHT, VAlign.BOTTOM
        );

        this._frame.clear();
        this._frame
            .lineStyle(1, 0x2f94d1)
            .beginFill(0x022347, 0.6)
            .drawRect(0, 0, this._currentBounds.width, this._currentBounds.height)
            .endFill();

        this._mainLayout.layout(true);

        this.display.x = this._currentBounds.x;
        this.display.y = this._currentBounds.y;

        // Position the canvas so that when we fire events, NGL can interpret the positions correctly
        this._nglStage.viewer.wrapper.style.left = `${this._currentBounds.x}px`;
        this._nglStage.viewer.wrapper.style.top = `${this._currentBounds.y + this.ICON_SIZE}px`;

        this._dropdown.repositionPopup();
    }

    private get minWidth(): number {
        return this.ICON_SIZE * 2 + this._dropdown.width + this._titleText.display.width + this.GAP * 5;
    }

    public get nglWidth() {
        return this._currentBounds.width;
    }

    public get nglHeight() {
        return this._currentBounds.height - this.ICON_SIZE;
    }

    private _nglStage: Stage;

    private _windowState: WindowState = WindowState.NORMAL;
    private _currentBounds: WindowBounds;
    private _normalBounds: WindowBounds;

    private _mainLayout: VLayoutContainer;
    private _frame: Graphics;
    private _maxRestoreButton: GameButton;
    private _dropdown: GameDropdown;
    private _dataOption: ValueView<string>;
    private _titleDraggerLeft: SpriteObject;
    private _titleText: SceneObject<Text>;
    private _titleDraggerRight: SpriteObject;
    private _minRestoreButton: GameButton;
    private _nglSprite: SpriteObject;
    private _nglMask: Graphics;
    private _dragHandleLeft: SpriteObject;
    private _dragHandleRight: SpriteObject;
    private _chatShow: boolean = true;
    private _chatBound: {x: number, y: number, width: number, height: number};

    private readonly ICON_SIZE = 20;
    private readonly GAP = 4;

    private readonly MARGIN = 10;
    private readonly TOP_MARGIN = 46;
    private readonly BOTTOM_MARGIN = 80;
}
