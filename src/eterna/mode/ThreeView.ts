// kkk ThreeView.ts --- Provide 3d view in pixi mode

import {
    InteractionEvent, Point, Rectangle, Sprite, Graphics, Text, Texture,
    Container, RenderTexture, BaseRenderTexture, SCALE_MODES, BaseTexture
} from 'pixi.js';
import BitmapManager from 'eterna/resources/BitmapManager';
import {
    ContainerObject, Flashbang, VLayoutContainer,
    HAlign, Assert, HLayoutContainer, VAlign, DisplayUtil, SpriteObject, GameObjectRef
} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import Eterna from 'eterna/Eterna';
import Mol3DGate from 'eterna/mode/Mol3DGate';
import TextBalloon from 'eterna/ui/TextBalloon';
import ContextMenu from 'eterna/ui/ContextMenu';
import GameButton from '../ui/GameButton';
import {ContextMenuDialog} from './GameMode';

const events = [
    'pointercancel', 'pointerdown', 'pointerenter', 'pointerleave', 'pointermove',
    'pointerout', 'pointerover', 'pointerup', 'mousedown', 'mouseenter', 'mouseleave',
    'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousedown', 'mouseup'
] as const;
const earlyHandlers: ((e: MouseEvent | PointerEvent) => void)[] = [];
for (const event of events) {
    window.addEventListener(event, (e) => {
        earlyHandlers.forEach((handler) => handler(e));
    }, true);
}
const touchEvents = ['touchstart', 'touchcancel', 'touchend', 'touchmove'] as const;
const earlyTouchHandlers: ((e: TouchEvent) => void)[] = [];
for (const event of touchEvents) {
    window.addEventListener(event, (e) => {
        earlyTouchHandlers.forEach((handler) => handler(e));
    }, true);
}
class MyContainer extends Container {
    touchDown: Point;
    touchPosition: Point;
    touchDownTime: number;
    touchTime: number;
    pressed: boolean = false;
    threeView:ThreeView;
    constructor(view:ThreeView) {
        super();
        this.threeView = view;
        this._boundHandleMouseEvent = this.handlePossiblyMaskedEvent.bind(this);
        this._boundHandleTouchEvent = this.handleTouchEvent.bind(this);
        earlyHandlers.push(this._boundHandleMouseEvent);
        earlyTouchHandlers.push(this._boundHandleTouchEvent);
    }

    private handlePossiblyMaskedEvent(e: MouseEvent | PointerEvent): void {
        if (e instanceof MouseEvent) {
            const pos = this.threeView.getPosition();
            const init:MouseEventInit = {
                cancelable: true,
                bubbles: true,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                shiftKey: e.shiftKey,
                button: e.button,
                buttons: e.buttons,
                clientX: e.clientX - pos.x,
                clientY: e.clientY - pos.y,
                movementX: e.movementX,
                movementY: e.movementY,
                screenX: e.screenX,
                screenY: e.screenY
            };
            if (this.threeView.metaState === 1) {
                init.ctrlKey = true;
            }
            const myEvent = new MouseEvent(e.type, init);// new MouseEvent(e.type, e);
            this.threeView.isOver3DCanvas = this.threeView.PtInCanvas(e.clientX - pos.x, e.clientY - pos.y);
            if (this.threeView.isOver3DCanvas || this.pressed) {
                if (e.type === 'mousedown') this.pressed = true;
                this.threeView.nglGate.stage.viewer.getWebGLCanvas().dispatchEvent(myEvent);
            }
            if (e.type === 'mouseup') this.pressed = false;
            if (this.pressed) e.stopPropagation();
            if (!this.threeView.isOver3DCanvas) {
                this.threeView.hideTooltip();
            }
        }
    }

    private handleTouchEvent(e: TouchEvent): void {
        const pos = this.threeView.getPosition();
        if (e.touches.length > 0) {
            const touchObjArray = [];
            const x = e.touches[0].clientX - pos.x;
            const y = e.touches[0].clientY - pos.y;
            for (let i = 0; i < e.touches.length; i++) {
                touchObjArray.push(new Touch({
                    identifier: Date.now(),
                    target: this.threeView.nglGate.stage.viewer.getWebGLCanvas(),
                    clientX: e.touches[i].clientX - pos.x,
                    clientY: e.touches[i].clientY - pos.y,
                    screenX: e.touches[i].screenX,
                    screenY: e.touches[i].screenY,
                    pageX: e.touches[i].pageX - pos.x,
                    pageY: e.touches[i].pageY - pos.y,
                    radiusX: e.touches[i].radiusX,
                    radiusY: e.touches[i].radiusY,
                    rotationAngle: e.touches[i].rotationAngle,
                    force: e.touches[i].force
                }));
            }
            const init:TouchEventInit = {
                cancelable: true,
                bubbles: true,
                touches: touchObjArray,
                targetTouches: [],
                changedTouches: touchObjArray,
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey
            };
            if (this.threeView.metaState === 1) {
                init.ctrlKey = true;
            }
            const touchEvent = new TouchEvent(e.type, init);
            this.threeView.isOver3DCanvas = this.threeView.PtInCanvas(x, y);
            if (this.threeView.isOver3DCanvas || this.pressed) {
                if (e.type === 'touchstart') this.pressed = true;
                this.threeView.nglGate.stage.viewer.getWebGLCanvas().dispatchEvent(touchEvent);
            }
            if (!this.threeView.isOver3DCanvas) {
                if (e.type === 'touchstart') this.pressed = false;
            }
            if (this.pressed) e.stopPropagation();
            if (!this.threeView.isOver3DCanvas) {
                this.threeView.hideTooltip();
            }
        }
    }

    private _boundHandleTouchEvent: (e: TouchEvent) => void;
    private _boundHandleMouseEvent: (e: MouseEvent | PointerEvent) => void;
}

const MaxState = 2;
const MinState = 1;
const NormalState = 0;
const minH = 200;

interface ViewStatus {
    x: number;
    y: number;
    w: number;
    h: number;
}
export default class ThreeView extends ContainerObject {
    nglGate: Mol3DGate;
    pixiContainer: HTMLDivElement;
    contentLay: VLayoutContainer;
    titleLay: HLayoutContainer;
    menuButton: GameButton;
    maxButton: GameButton;
    minButton: GameButton;
    rbSprite: SpriteObject;
    lbSprite: SpriteObject;
    sprite1: SpriteObject;
    sprite2: SpriteObject;
    frame: Graphics;
    titleText:Text;
    gap: number = 4;
    iconSize: number = 20;
    pressed: boolean = false;
    framePressed = false;
    dragLeftPressed: boolean = false;
    dragRightPressed: boolean = false;
    curViewState: number = NormalState;
    isOver3DCanvas: boolean = false;
    public left: number = 100;
    public top: number = 100;
    public width: number = 460;
    public height: number = 300;
    public rightMargin: number = 20;
    public prevPt: Point = new Point();
    public dragLeftPrevPt: Point = new Point();
    public dragRightPrevPt: Point = new Point();
    public canvasRect: Rectangle;
    public static scope: ThreeView;
    normalState: ViewStatus = {
        x: this.left, y: this.top, w: this.width, h: this.height
    };

    metaState: number = 0;

    mainContainer: Container;
    mainMask: Graphics;

    nglContainer: Container;
    nglSprite: Sprite;
    nglSpriteCanvas: HTMLCanvasElement;
    nglSpriteContext: CanvasRenderingContext2D | null;
    nglTexture: BaseTexture;
    nglTextArray: Text[];
    nglMask: Graphics;

    frameContainer: MyContainer;
    frameBaseTexture:BaseRenderTexture;
    frameTexture:RenderTexture;
    frameSprite: Sprite;
    tooltip: TextBalloon;

    _contextMenuDialogRef: GameObjectRef = GameObjectRef.NULL;

    constructor() {
        super();
        ThreeView.scope = this;
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this.metaState = 0;
        this.width = 460;
        this.height = 300;
        this.rightMargin = (Flashbang.stageWidth - this.width) / 2;
        this.left = Flashbang.stageWidth - this.width - this.rightMargin;
        this.top = 100;
        this.saveNormalState();
        this.pixiContainer = <HTMLDivElement> document.getElementById(Eterna.PIXI_CONTAINER_ID);
        window.addEventListener('resize', () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            this.maxButton.up(Bitmaps.Img3DMax)
                .over(Bitmaps.Img3DMaxHover)
                .down(Bitmaps.Img3DMax).tooltip('Maximize');
            this.minButton.up(Bitmaps.Img3DMin)
                .over(Bitmaps.Img3DMinHover)
                .down(Bitmaps.Img3DMin).tooltip('Minimize');
            this.left = this.normalState.x;
            this.top = this.normalState.y;
            this.width = this.normalState.w;
            this.height = this.normalState.h;
            const oldWidth = this.left + this.width + this.rightMargin;
            const dw = Flashbang.stageWidth - oldWidth;
            let dwL = 0; let
                dwR = 0;
            if ((this.left + this.rightMargin) !== 0) {
                dwL = (dw * this.left) / (this.left + this.rightMargin);
                dwR = dw - dwL;
            }
            if (this.left + dwL < 0) {
                this.left = 0;
                this.rightMargin = Flashbang.stageWidth - this.width;
            } else {
                this.left += dwL;
                this.rightMargin += dwR;
            }
            this.curViewState = NormalState;
            this.saveNormalState();
            this.onResized();
        }, false);

        window.addEventListener('tooltip', (e) => {
            const ce = <CustomEvent>e;
            const x: number = ce.detail.x;
            const y: number = ce.detail.y;
            const label: string = ce.detail.label;
            if (label.length === 0) this.hideTooltip();
            else {
                this.tooltip.setText(label);
                this.tooltip.display.position.set(10 + x, y);
                this.tooltip.display.visible = true;
            }
        });
    }

    public getPosition():Point {
        const pt = new Point();
        this.frameContainer.getGlobalPosition(pt);
        return pt;
    }

    zoomInNGLView() {
        this.nglGate?.stage.viewerControls.zoom(0.1);
    }

    zoomOutNGLView() {
        this.nglGate?.stage.viewerControls.zoom(-0.1);
    }

    setNGLMovState() {
        this.metaState = 0;
    }

    setNGLRotateState() {
        this.metaState = 1;
    }

    setNGLEditState() {
        this.metaState = 2;
    }

    create3DMenu():ContextMenu {
        const moveContainer = new Container();
        moveContainer.addChild(Sprite.from(Bitmaps.Img3DMoveIcon));
        const moveArrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgToolbarArrow));
        moveArrow.position.x = (moveContainer.width - moveArrow.width) / 2;
        moveArrow.visible = this.metaState === 0;
        moveContainer.addChild(moveArrow);

        const rotateContainer = new Container();
        rotateContainer.addChild(Sprite.from(Bitmaps.Img3DRotateIcon));
        const rotateArrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgToolbarArrow));
        rotateArrow.position.x = (rotateContainer.width - rotateArrow.width) / 2;
        rotateArrow.visible = this.metaState === 1;
        rotateContainer.addChild(rotateArrow);

        const menu = new ContextMenu({horizontal: false});
        menu.addItem('Pan', moveContainer).clicked.connect(() => this.setNGLMovState());
        menu.addItem('Rotate', rotateContainer).clicked.connect(() => this.setNGLRotateState());
        return menu;
    }

    removeAnnotations() {
        this.nglTextArray.forEach((t) => {
            this.nglContainer.removeChild(t);
        });
        this.nglTextArray = new Array(0);
    }

    hideTooltip() {
        if (this.tooltip) this.tooltip.display.visible = false;
    }

    dragHandleEvent(e:InteractionEvent) {
        const scope = ThreeView.scope;
        switch (e.type) {
            case 'pointerdown':
                scope.pressed = true;
                scope.prevPt.x = e.data.global.x;
                scope.prevPt.y = e.data.global.y;
                break;
            case 'pointermove':
                Assert.assertIsDefined(Flashbang.stageWidth);
                Assert.assertIsDefined(Flashbang.stageHeight);
                if (scope.pressed && e.data.pressure === 0) scope.pressed = false;
                if (scope.pressed && scope.curViewState !== MaxState) {
                    const curPt = e.data.global;
                    const dx = curPt.x - scope.prevPt.x;
                    const dy = curPt.y - scope.prevPt.y;

                    const left = scope.left + dx;
                    const top = scope.top + dy;
                    const right = left + scope.width;
                    const bottom = top + scope.height;

                    if (left > 0 && top > 0 && right < Flashbang.stageWidth && bottom < Flashbang.stageHeight) {
                        scope.left = left;
                        scope.top = top;
                        scope.prevPt.x = curPt.x;
                        scope.prevPt.y = curPt.y;
                        scope.rightMargin = Flashbang.stageWidth - scope.left - scope.width;
                        scope.saveNormalState();
                        scope.moveWindow();
                    }
                }
                break;
            case 'pointerup':
                scope.pressed = false;
                break;
            case 'pointercancel':
                scope.pressed = false;
                break;
            // case 'pointerover':
            //     const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            //     if (doc) {
            //         doc.style.cursor = 'move';
            //     }
            //     break;
            // case 'pointerout':
            //     const doc1 = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            //     if (doc1) {
            //         doc1.style.cursor = 'default';
            //     }
            //     break;
            default:
                break;
        }
    }

    leftHandleEvent(e:InteractionEvent) {
        this.lbSprite.display.interactive = false;
        switch (e.type) {
            case 'pointerdown':
                this.dragLeftPressed = true;
                this.dragLeftPrevPt.x = e.data.global.x;
                this.dragLeftPrevPt.y = e.data.global.y;
                break;
            case 'pointermove':
                Assert.assertIsDefined(Flashbang.stageWidth);
                Assert.assertIsDefined(Flashbang.stageHeight);
                if (this.dragLeftPressed && e.data.pressure === 0) this.dragLeftPressed = false;
                if (this.dragLeftPressed && this.curViewState === NormalState) {
                    const dx = e.data.global.x - this.dragLeftPrevPt.x;
                    const dy = e.data.global.y - this.dragLeftPrevPt.y;

                    const left = this.left + dx;
                    const width = this.width - dx;
                    const height = this.height + dy;
                    const bottom = this.top + height;
                    const minW = this.iconSize * 3 + this.titleText.width + 100 + this.gap * 5;

                    if (left > 0 && width >= minW && height >= minH && bottom < Flashbang.stageHeight) {
                        this.left = left;
                        this.height = height;
                        this.width = width;

                        this.dragLeftPrevPt.x = e.data.global.x;
                        this.dragLeftPrevPt.y = e.data.global.y;
                        this.rightMargin = Flashbang.stageWidth - this.left - this.width;
                        this.saveNormalState();
                        this.onResized();
                    }
                }
                break;
            case 'pointerup':
                this.dragLeftPressed = false;
                break;
            case 'pointercancel':
                this.dragLeftPressed = false;
                break;
            case 'pointerover': {
                const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc) {
                    doc.style.cursor = 'sw-resize';
                } }
                break;
            case 'pointerout': {
                const doc1 = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc1) {
                    doc1.style.cursor = 'default';
                } }
                break;
            default:
                break;
        }
        this.lbSprite.display.interactive = true;
    }

    rightHandleEvent(e:InteractionEvent) {
        this.rbSprite.display.interactive = false;
        switch (e.type) {
            case 'pointerdown':
                this.dragRightPressed = true;
                this.dragRightPrevPt.x = e.data.global.x;
                this.dragRightPrevPt.y = e.data.global.y;
                break;
            case 'pointermove':
                Assert.assertIsDefined(Flashbang.stageWidth);
                Assert.assertIsDefined(Flashbang.stageHeight);
                if (this.dragRightPressed && e.data.pressure === 0) this.dragRightPressed = false;
                if (this.dragRightPressed && this.curViewState === NormalState) {
                    const dx = e.data.global.x - this.dragRightPrevPt.x;
                    const dy = e.data.global.y - this.dragRightPrevPt.y;

                    const width = this.width + dx;
                    const right = this.left + width;
                    const height = this.height + dy;
                    const bottom = this.top + height;
                    const minW = this.iconSize * 3 + this.titleText.width + 100 + this.gap * 5;

                    if (width >= minW && height >= minH
                        && right < Flashbang.stageWidth && bottom < Flashbang.stageHeight) {
                        this.width = width;
                        this.height = height;
                        this.dragRightPrevPt.x = e.data.global.x;
                        this.dragRightPrevPt.y = e.data.global.y;
                        this.rightMargin = Flashbang.stageWidth - this.left - this.width;
                        this.saveNormalState();
                        this.onResized();
                    }
                }
                break;
            case 'pointerup':
                this.dragRightPressed = false;
                break;
            case 'pointercancel':
                this.dragRightPressed = false;
                break;
            case 'pointerover': {
                const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc) {
                    doc.style.cursor = 'nw-resize';
                } }
                break;
            case 'pointerout': {
                const doc1 = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc1) {
                    doc1.style.cursor = 'default';
                } }
                break;
            default:
                break;
        }
        this.rbSprite.display.interactive = true;
    }

    protected added(): void {
        super.added();

        this.frame = new Graphics();

        this.lbSprite = new SpriteObject(new Sprite(BitmapManager.getBitmap(Bitmaps.Img3DLeft)));
        this.lbSprite.display.width = this.iconSize;
        this.lbSprite.display.height = this.iconSize;

        this.rbSprite = new SpriteObject(new Sprite(BitmapManager.getBitmap(Bitmaps.Img3DRight)));
        this.rbSprite.display.width = this.iconSize;
        this.rbSprite.display.height = this.iconSize;

        this.contentLay = new VLayoutContainer(0, HAlign.LEFT);

        this.titleLay = new HLayoutContainer(0, VAlign.CENTER);

        this.maxButton = new GameButton()
            .up(Bitmaps.Img3DMax)
            .over(Bitmaps.Img3DMaxHover)
            .down(Bitmaps.Img3DMax)
            .tooltip('Maximize');
        this.maxButton.display.width = this.iconSize;
        this.maxButton.display.height = this.iconSize;
        this.addObject(this.maxButton, this.titleLay);
        this.titleLay.addHSpacer(this.gap);

        this.menuButton = new GameButton()
            .up(Bitmaps.Img3DSettingIcon)
            .over(Bitmaps.Img3DSettingHoverIcon)
            .down(Bitmaps.Img3DSettingIcon)
            .tooltip('Menu');
        this.menuButton.display.width = this.iconSize;
        this.menuButton.display.height = this.iconSize;
        this.addObject(this.menuButton, this.titleLay);
        this.titleLay.addHSpacer(this.gap);

        this.sprite1 = new SpriteObject(new Sprite(BitmapManager.getBitmap(Bitmaps.Img3DTitle)));
        this.addObject(this.sprite1, this.titleLay);
        this.titleLay.addHSpacer(this.gap);

        this.titleText = Fonts.std('3D STRUCTURE', 12).color(0xffffff).build();
        this.titleText.interactive = true;
        this.titleLay.addChild(this.titleText);
        this.titleLay.addHSpacer(this.gap);

        this.sprite2 = new SpriteObject(new Sprite(BitmapManager.getBitmap(Bitmaps.Img3DTitle)));
        this.addObject(this.sprite2, this.titleLay);
        this.titleLay.addHSpacer(this.gap);

        this.minButton = new GameButton()
            .up(Bitmaps.Img3DMin)
            .over(Bitmaps.Img3DMinHover)
            .down(Bitmaps.Img3DMin)
            .tooltip('Minimize');
        this.minButton.display.width = this.iconSize;
        this.minButton.display.height = this.iconSize;
        this.addObject(this.minButton, this.titleLay);

        this.contentLay.addChild(this.titleLay);

        this.mainContainer = new Container();
        this.nglContainer = new Container();
        this.frameContainer = new MyContainer(this);

        this.frameBaseTexture = new BaseRenderTexture({
            width: this.width, height: this.height - this.iconSize, scaleMode: SCALE_MODES.LINEAR, resolution: 1
        });
        this.frameTexture = new RenderTexture(this.frameBaseTexture);
        this.frameSprite = new Sprite(this.frameTexture);
        this.frameContainer.addChild(this.frameSprite);

        this.nglMask = new Graphics();
        this.nglMask.beginFill(0x000000);
        this.nglMask.drawRect(0, 0, this.width, this.height - this.iconSize);
        this.nglMask.endFill();
        this.nglContainer.addChild(this.nglMask);

        this.nglTextArray = new Array(0);
        this.nglSpriteCanvas = document.createElement('canvas');
        this.nglSpriteCanvas.width = window.screen.width;
        this.nglSpriteCanvas.height = window.screen.height;
        this.nglSpriteContext = this.nglSpriteCanvas.getContext('2d');
        this.nglTexture = BaseTexture.from(this.nglSpriteCanvas);
        this.nglSprite = new Sprite(new Texture(this.nglTexture));
        this.nglSprite.mask = this.nglMask;
        this.nglContainer.addChild(this.nglSprite);

        this.frameContainer.addChild(this.lbSprite.display);
        this.lbSprite.display.x = 0;
        this.lbSprite.display.y = this.height - this.iconSize - this.iconSize;
        this.frameContainer.addChild(this.rbSprite.display);
        this.rbSprite.display.x = this.width - this.iconSize;
        this.rbSprite.display.y = this.height - this.iconSize - this.iconSize;

        this.mainContainer.addChild(this.frameContainer);
        this.mainContainer.addChild(this.nglContainer);

        this.mainMask = new Graphics();
        this.mainMask.beginFill(0x000000);
        this.mainMask.drawRect(0, 0, this.width, this.height - this.iconSize);
        this.mainMask.endFill();
        this.mainContainer.addChild(this.mainMask);

        this.tooltip = new TextBalloon('', 0x0, 1);
        this.tooltip.display.visible = false;
        this.tooltip.display.mask = this.mainMask;
        this.addObject(this.tooltip, this.mainContainer);

        this.contentLay.addChild(this.mainContainer);
        this.container.addChild(this.contentLay);
        this.container.addChild(this.frame);

        this.regs.add(this.sprite1.pointerDown.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite1.pointerUp.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite1.pointerMove.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite1.pointerOver.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite1.pointerOut.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite1.pointerCancel.connect((e) => this.dragHandleEvent(e)));

        this.regs.add(this.sprite2.pointerDown.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite2.pointerUp.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite2.pointerMove.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite2.pointerOver.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite2.pointerOut.connect((e) => this.dragHandleEvent(e)));
        this.regs.add(this.sprite2.pointerCancel.connect((e) => this.dragHandleEvent(e)));

        this.titleText.on('pointerdown', this.dragHandleEvent);
        this.titleText.on('pointerup', this.dragHandleEvent);
        this.titleText.on('pointermove', this.dragHandleEvent);
        this.titleText.on('pointerover', this.dragHandleEvent);
        this.titleText.on('pointerout', this.dragHandleEvent);
        this.titleText.on('pointercancel', this.dragHandleEvent);

        this.regs.add(this.lbSprite.pointerDown.connect((e) => this.leftHandleEvent(e)));
        this.regs.add(this.lbSprite.pointerUp.connect((e) => this.leftHandleEvent(e)));
        this.regs.add(this.lbSprite.pointerMove.connect((e) => this.leftHandleEvent(e)));
        this.regs.add(this.lbSprite.pointerOver.connect((e) => this.leftHandleEvent(e)));
        this.regs.add(this.lbSprite.pointerOut.connect((e) => this.leftHandleEvent(e)));
        this.regs.add(this.lbSprite.pointerCancel.connect((e) => this.leftHandleEvent(e)));

        this.regs.add(this.rbSprite.pointerDown.connect((e) => this.rightHandleEvent(e)));
        this.regs.add(this.rbSprite.pointerUp.connect((e) => this.rightHandleEvent(e)));
        this.regs.add(this.rbSprite.pointerMove.connect((e) => this.rightHandleEvent(e)));
        this.regs.add(this.rbSprite.pointerOver.connect((e) => this.rightHandleEvent(e)));
        this.regs.add(this.rbSprite.pointerOut.connect((e) => this.rightHandleEvent(e)));
        this.regs.add(this.rbSprite.pointerCancel.connect((e) => this.rightHandleEvent(e)));

        this.maxButton.clicked.connect(() => this.onMaxButton());
        this.minButton.clicked.connect(() => this.onMinButton());
        this.menuButton.clicked.connect(() => this.onMenuClick());

        this.onResized();
    }

    updateAnnotations(width:number, height:number) {
        let i = 0;
        const uninit:boolean = (this.nglTextArray.length === 0);
        this.nglGate.component?.eachAnnotation((a) => {
            let text;
            const x = a.getCanvasPosition().x;
            const y = height - a.getCanvasPosition().y;
            if (uninit) {
                text = new Text(a.getContent(), {
                    fontFamily: 'Arial', fontSize: 12, fill: 0xffffff, align: 'center'
                });
                text.x = x;
                text.y = y;
                text.visible = false;
                if (this.nglGate.bShowAnnotations) text.visible = true;
                this.nglTextArray.push(text);
                text.mask = this.nglMask;
                this.nglContainer.addChild(text);
            } else {
                text = this.nglTextArray[i];
                text.x = x;
                text.y = y;
                text.visible = false;
                if (this.nglGate.bShowAnnotations) text.visible = true;
                i++;
            }
        });
    }

    updateNGLTexture(canvas:HTMLCanvasElement, width:number, height:number) {
        if (this.nglSpriteContext) {
            this.nglSpriteContext.clearRect(0, 0, this.nglSpriteCanvas.width, this.nglSpriteCanvas.height);
            if (width > 0 && height > 0) {
                const dpr = window.devicePixelRatio;
                this.nglSpriteContext.fillStyle = 'rgba(2,35,71,0.6)';
                this.nglSpriteContext.fillRect(0, 0, width, height);
                this.nglSpriteContext.drawImage(canvas, 0, 0, width * dpr, height * dpr, 0, 0, width, height);
            }
            this.nglTexture.update();
        }
        this.updateAnnotations(width, height);
    }

    hideAnnotations() {
        this.nglTextArray.forEach((text) => {
            text.visible = false;
        });
    }

    onMenuClick() {
        // var init:PointerEventInit = {
        //     cancelable: true,
        //     bubbles: true,
        //     clientX: this.left + this.menuButton.display.x,
        //     clientY: this.top + this.iconSize,
        // }
        // var event = new PointerEvent('contextmenu', init);
        // this.isOver3DCanvas = true;
        // document.getElementById(Eterna.PIXI_CONTAINER_ID)?.children[0]?.dispatchEvent(event);

        const pos = new Point(this.menuButton.display.x, 0);
        let handled = false;
        if (this._contextMenuDialogRef.isLive) {
            this._contextMenuDialogRef.destroyObject();
            handled = true;
        } else {
            const menu = this.create3DMenu();
            if (menu != null) {
                this._contextMenuDialogRef = this.addObject(
                    new ContextMenuDialog(menu, pos), this.mainContainer
                );
                handled = true;
            }
        }
    }

    setToNormal() {
        this.maxButton.up(Bitmaps.Img3DMax)
            .over(Bitmaps.Img3DMaxHover)
            .down(Bitmaps.Img3DMax).tooltip('Maximize');
        this.minButton.up(Bitmaps.Img3DMin)
            .over(Bitmaps.Img3DMinHover)
            .down(Bitmaps.Img3DMin).tooltip('Minimize');
        this.left = this.normalState.x;
        this.top = this.normalState.y;
        this.width = this.normalState.w;
        this.height = this.normalState.h;
        this.curViewState = NormalState;
        this.onResized();
    }

    private setToMax() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this.maxButton.up(Bitmaps.Img3DMaxRestore)
            .over(Bitmaps.Img3DMaxRestoreHover)
            .down(Bitmaps.Img3DMaxRestore).tooltip('Restore');
        this.minButton.up(Bitmaps.Img3DMinRestore)
            .over(Bitmaps.Img3DMinRestoreHover)
            .down(Bitmaps.Img3DMinRestore).tooltip('Restore');
        this.top = 100;
        this.left = 100;
        this.width = Flashbang.stageWidth - 100 * 2;
        this.height = Flashbang.stageHeight - this.top - 80;
        this.curViewState = MaxState;
        this.onResized();
    }

    private setToMin() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this.minButton.up(Bitmaps.Img3DMinRestore)
            .over(Bitmaps.Img3DMinRestoreHover)
            .down(Bitmaps.Img3DMinRestore).tooltip('Restore');
        this.maxButton.up(Bitmaps.Img3DMaxRestore)
            .over(Bitmaps.Img3DMaxRestoreHover)
            .down(Bitmaps.Img3DMaxRestore).tooltip('Restore');
        this.width = Math.min(460, this.width);
        this.rightMargin = (Flashbang.stageWidth - this.width) / 2;
        this.left = Flashbang.stageWidth - this.width - this.rightMargin;
        this.top = 10;
        this.height = this.iconSize;
        this.curViewState = MinState;
        this.onResized();
    }

    onMaxButton() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        if (this.curViewState === MaxState || this.curViewState === MinState) {
            this.setToNormal();
        } else {
            this.setToMax();
        }
        this.onResized();
    }

    onMinButton() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        if (this.curViewState === MinState || this.curViewState === MaxState) {
            this.setToNormal();
        } else {
            this.setToMin();
        }
        this.onResized();
    }

    private saveNormalState() {
        this.normalState.x = this.left;
        this.normalState.y = this.top;
        if (this.curViewState === NormalState) {
            this.normalState.w = this.width;
            this.normalState.h = this.height;
        }
    }

    public onResized() {
        this.updateLayout();
        this.moveWindow();
    }

    moveWindow() {
        this.nglGate?.stage?.viewer.setPosition(this.left, this.top + this.iconSize);
        DisplayUtil.positionRelativeToStage(
            this.display, HAlign.LEFT, VAlign.TOP,
            HAlign.LEFT, VAlign.TOP, this.left, this.top
        );
    }

    updateLayout(): void {
        this.lbSprite.display.width = this.iconSize;
        this.lbSprite.display.height = this.iconSize;
        this.rbSprite.display.width = this.iconSize;
        this.rbSprite.display.height = this.iconSize;

        this.maxButton.display.width = this.iconSize;
        this.maxButton.display.height = this.iconSize;
        this.minButton.display.width = this.iconSize;
        this.minButton.display.height = this.iconSize;
        this.menuButton.display.width = this.iconSize;
        this.menuButton.display.height = this.iconSize;

        this.sprite1.display.width = this.width / 2 - (this.iconSize * 2 + this.titleText.width / 2 + this.gap * 3);
        this.sprite1.display.height = this.iconSize;
        this.sprite2.display.width = this.width / 2 - (this.iconSize + this.titleText.width / 2 + this.gap * 2);
        this.sprite2.display.height = this.iconSize;

        this.titleLay.height = this.iconSize;

        this.frameTexture.resize(this.width, this.height - this.iconSize, true);

        this.lbSprite.display.x = 0;
        this.lbSprite.display.y = this.height - this.iconSize - this.iconSize;
        this.rbSprite.display.x = this.width - this.iconSize;
        this.rbSprite.display.y = this.height - this.iconSize - this.iconSize;

        if (this.curViewState === MinState) {
            this.lbSprite.display.visible = false;
            this.rbSprite.display.visible = false;
            this.nglSprite.visible = false;
        } else {
            this.lbSprite.display.visible = true;
            this.rbSprite.display.visible = true;
            this.nglSprite.visible = true;
        }

        this.frame.clear();
        this.frame.lineStyle(1, 0x2F94D1).drawRect(0, 0, this.width, this.height);

        this.nglMask.clear();
        this.nglMask.beginFill(0x000000);
        this.nglMask.drawRect(0, 0, this.width, this.height - this.iconSize);
        this.nglMask.endFill();

        this.mainMask.clear();
        this.mainMask.beginFill(0x000000);
        this.mainMask.drawRect(0, 0, this.width, this.height - this.iconSize);
        this.mainMask.endFill();

        this.contentLay.layout(true);
        this.titleLay.layout(true);
        this.contentLay.layout(true);

        const w = Math.max(2, this.width);
        const h = Math.max(2, this.height - this.iconSize);
        this.nglGate?.stage?.viewer.setPosition(this.left, this.top + this.iconSize);
        this.nglGate?.stage?.handleResize(w, h);
    }

    PtInCanvas(x:number, y: number): boolean {
        if (x >= this.lbSprite.display.x
            && x <= this.lbSprite.display.x + this.lbSprite.display.width
            && y >= this.lbSprite.display.y
            && y <= this.lbSprite.display.y + this.lbSprite.display.height) {
            return false;
        }
        if (x >= this.rbSprite.display.x
            && x <= this.rbSprite.display.x + this.rbSprite.display.width
            && y >= this.rbSprite.display.y
            && y <= this.rbSprite.display.y + this.rbSprite.display.height) {
            return false;
        }
        return (x >= 0 && x < this.frameContainer.width && y > 0 && y < this.frameContainer.height);
    }
}
