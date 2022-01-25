import {
    Container, Graphics, InteractionEvent, Point, Rectangle, Sprite, Text
} from 'pixi.js';
import {Stage} from 'ngl';
import {
    Assert, ContainerObject, DisplayUtil, Dragger, Flashbang, GameObjectRef, HAlign, HLayoutContainer,
    MathUtil, MouseWheelListener, SceneObject, SpriteObject, VAlign, VLayoutContainer
} from 'flashbang';
import {UnitSignal} from 'signals';
import Eterna from 'eterna/Eterna';
import Bitmaps from 'eterna/resources/Bitmaps';
import BitmapManager from 'eterna/resources/BitmapManager';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import ContextMenu from 'eterna/ui/ContextMenu';
import TextBalloon from 'eterna/ui/TextBalloon';
import ContextMenuDialog from 'eterna/ui/ContextMenuDialog';
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
    public nglDragState: NGLDragState = NGLDragState.PAN;
    public tooltip: TextBalloon;
    public resized = new UnitSignal();

    constructor(stage: Stage) {
        super();
        this._nglStage = stage;
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        const width = 460;
        this._currentBounds = new WindowBounds(
            (Flashbang.stageWidth / 2) - (width / 2),
            100,
            width,
            300
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

        this._settingsButton = new GameButton()
            .up(Bitmaps.Img3DSettingIcon)
            .over(Bitmaps.Img3DSettingHoverIcon)
            .down(Bitmaps.Img3DSettingIcon)
            .tooltip('Menu');
        this.addObject(this._settingsButton, titleLayout);
        titleLayout.addHSpacer(this.GAP);
        this._settingsButton.display.width = this.ICON_SIZE;
        this._settingsButton.display.height = this.ICON_SIZE;
        this.regs.add(this._settingsButton.clicked.connect(() => this.onSettingsClick()));

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

    private onSettingsClick() {
        const pos = new Point(this._settingsButton.display.x, 0);
        if (this._settingsContextMenuDialogRef.isLive) {
            this._settingsContextMenuDialogRef.destroyObject();
        } else {
            const moveContainer = new Container();
            moveContainer.addChild(Sprite.from(Bitmaps.Img3DMoveIcon));
            const moveArrow = new Sprite(
                BitmapManager.getBitmap(Bitmaps.ImgToolbarArrow)
            );
            moveArrow.position.x = (moveContainer.width - moveArrow.width) / 2;
            moveArrow.visible = this.nglDragState === NGLDragState.PAN;
            moveContainer.addChild(moveArrow);

            const rotateContainer = new Container();
            rotateContainer.addChild(Sprite.from(Bitmaps.Img3DRotateIcon));
            const rotateArrow = new Sprite(
                BitmapManager.getBitmap(Bitmaps.ImgToolbarArrow)
            );
            rotateArrow.position.x = (rotateContainer.width - rotateArrow.width) / 2;
            rotateArrow.visible = this.nglDragState === NGLDragState.ROTATE;
            rotateContainer.addChild(rotateArrow);

            const zoomContainer = new Container();
            zoomContainer.addChild(Sprite.from(Bitmaps.ImgMingZoomIn));
            const zoomArrow = new Sprite(
                BitmapManager.getBitmap(Bitmaps.ImgToolbarArrow)
            );
            zoomArrow.position.x = (zoomContainer.width - zoomArrow.width) / 2;
            zoomArrow.visible = this.nglDragState === NGLDragState.ZOOM;
            zoomContainer.addChild(zoomArrow);

            const menu = new ContextMenu({horizontal: false});
            menu.addItem('Pan', moveContainer).clicked.connect(() => {
                this.nglDragState = NGLDragState.PAN;
            });
            menu.addItem('Rotate', rotateContainer).clicked.connect(() => {
                this.nglDragState = NGLDragState.ROTATE;
            });
            menu.addItem('Zoom', zoomContainer).clicked.connect(() => {
                this.nglDragState = NGLDragState.ZOOM;
            });
            if (menu != null) {
                const menuDlg = new ContextMenuDialog(menu, pos);
                this._settingsContextMenuDialogRef = this.addObject(
                    menuDlg,
                    this.container
                );
            }
        }
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
        this._currentBounds = new WindowBounds(
            100,
            100,
            Flashbang.stageWidth - 100 * 2,
            Flashbang.stageHeight - 100 - 80
        );
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
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
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
            (Flashbang.stageWidth / 2) - (width / 2),
            10,
            width,
            this.ICON_SIZE
        );
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
        }

        // Title bar drag handles should fill remaining space
        this._titleDraggerLeft.display.width = this._currentBounds.width / 2
            - (this.ICON_SIZE * 2 + this._titleText.display.width / 2 + this.GAP * 3);
        this._titleDraggerRight.display.width = this._currentBounds.width / 2
            - (this.ICON_SIZE + this._titleText.display.width / 2 + this.GAP * 2);

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
    }

    private get minWidth(): number {
        return this.ICON_SIZE * 3 + this._titleText.display.width + 50 + this.GAP * 5;
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
    private _settingsButton: GameButton;
    private _settingsContextMenuDialogRef: GameObjectRef = GameObjectRef.NULL;
    private _titleDraggerLeft: SpriteObject;
    private _titleText: SceneObject<Text>;
    private _titleDraggerRight: SpriteObject;
    private _minRestoreButton: GameButton;
    private _nglSprite: SpriteObject;
    private _nglMask: Graphics;
    private _dragHandleLeft: SpriteObject;
    private _dragHandleRight: SpriteObject;

    private readonly ICON_SIZE = 20;
    private readonly GAP = 4;
}
