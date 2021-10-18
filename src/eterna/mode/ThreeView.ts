//kkk ThreeView.ts --- Provide 3d view in pixi mode

import {InteractionEvent, Point, Rectangle, Sprite, Graphics, Text, Texture, Container, RenderTexture, BaseRenderTexture, SCALE_MODES, BaseTexture} from 'pixi.js';
import BitmapManager from 'eterna/resources/BitmapManager';
import {
    ContainerObject, Flashbang, VLayoutContainer, 
    HAlign, Assert, HLayoutContainer, VAlign, DisplayUtil, SpriteObject
} from 'flashbang';
import GameButton from '../ui/GameButton';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import Eterna from 'eterna/Eterna';
import Mol3DGate from 'eterna/mode/Mol3DGate';
import TextBalloon from 'eterna/ui/TextBalloon';
import ContextMenu from 'eterna/ui/ContextMenu';

const events = [
    'pointercancel', 'pointerdown', 'pointerenter', 'pointerleave', 'pointermove',
    'pointerout', 'pointerover', 'pointerup', 'mousedown', 'mouseenter', 'mouseleave',
    'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousedown', 'mouseup'
] as const;
let earlyHandlers: ((e: MouseEvent | PointerEvent) => void)[] = [];
for (const event of events) {
    window.addEventListener(event, (e) => {
        earlyHandlers.forEach((handler) => handler(e));
    }, true);
}
const touchEvents = ['touchstart', 'touchcancel', 'touchend', 'touchmove'] as const;
let earlyTouchHandlers: ((e: TouchEvent) => void)[] = [];
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
        if(e instanceof MouseEvent) {
            var pos = this.threeView.getPosition();
            var init:MouseEventInit = {
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
                screenY: e.screenY,
            }
            if(this.threeView.metaState === 1) {
                init.ctrlKey = true;
            }
            const myEvent = new MouseEvent(e.type, init);//new MouseEvent(e.type, e);
            this.threeView.isOver3DCanvas = this.threeView.PtInCanvas(e.clientX - pos.x, e.clientY - pos.y);
            if(this.threeView.isOver3DCanvas || this.pressed) {
                if(e.type == 'mousedown') this.pressed = true;
                this.threeView.nglGate.stage.viewer.getWebGLCanvas().dispatchEvent(myEvent);
            }
            if(e.type == 'mouseup') this.pressed = false;
            if(this.pressed) e.stopPropagation();
            if(!this.threeView.isOver3DCanvas) {
                this.threeView.hideTooltip();
            }
        }
    }

    private handleTouchEvent(e: TouchEvent): void {
        var pos = this.threeView.getPosition();
        if (e.touches.length > 0) {
            var touchObjArray = [];
            var x = e.touches[0].clientX - pos.x;
            var y = e.touches[0].clientY - pos.y;
            for(var i=0;i<e.touches.length;i++) {
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
                    force: e.touches[i].force,
                    }));
            }
            var init:TouchEventInit = {
                cancelable: true,
                bubbles: true,
                touches: touchObjArray,
                targetTouches: [],
                changedTouches: touchObjArray,
                shiftKey: e.shiftKey,
                ctrlKey: e.ctrlKey,
            }
            if(this.threeView.metaState === 1) {
                init.ctrlKey = true;
            }
            const touchEvent = new TouchEvent(e.type, init);
            this.threeView.isOver3DCanvas = this.threeView.PtInCanvas(x, y);
            if(this.threeView.isOver3DCanvas || this.pressed) {
                if(e.type == 'touchstart') this.pressed = true;
                this.threeView.nglGate.stage.viewer.getWebGLCanvas().dispatchEvent(touchEvent);
            }
            if(!this.threeView.isOver3DCanvas) {
                if(e.type == 'touchstart') this.pressed = false;
            }
            if(this.pressed) e.stopPropagation();
            if(!this.threeView.isOver3DCanvas) {
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

export default class ThreeView extends ContainerObject {
    nglGate: Mol3DGate
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
    normalState: any = {x:this.left, y:this.top, w:this.width, h:this.height}; 
    metaState: number = 0;

    mainContainer: Container;

    nglContainer: Container;
    nglSprite: Sprite; 
    nglSpriteCanvas: HTMLCanvasElement;
    nglSpriteContext: CanvasRenderingContext2D | null; 
    nglTexture: BaseTexture;
    nglTextArray: Text[];

    frameContainer: MyContainer;
    frameBaseTexture:BaseRenderTexture;
    frameTexture:RenderTexture;
    frameSprite: Sprite;
    tooltip: TextBalloon;

    constructor() {
        super();
        ThreeView.scope = this;
        Assert.assertIsDefined(Flashbang.stageWidth)
        Assert.assertIsDefined(Flashbang.stageHeight)
        this.metaState = 0;
        this.width = 460;
        this.height = 300;
        this.rightMargin = (Flashbang.stageWidth-this.width)/2;
        this.left = Flashbang.stageWidth - this.width - this.rightMargin;
        this.top = 100;
        this.saveNormalState();
        this.pixiContainer = <HTMLDivElement> document.getElementById(Eterna.PIXI_CONTAINER_ID);
        window.addEventListener("resize", () => {
            Assert.assertIsDefined(Flashbang.stageWidth)
            Assert.assertIsDefined(Flashbang.stageHeight)
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
            var oldWidth = this.left + this.width + this.rightMargin;
            var dw = Flashbang.stageWidth - oldWidth;
            var dwL = 0, dwR = 0;
            if((this.left+this.rightMargin) != 0) {
                dwL = dw*this.left/(this.left+this.rightMargin)
                dwR = dw - dwL;
            }
            if(this.left + dwL < 0) {
                this.left = 0;
                this.rightMargin = Flashbang.stageWidth - this.width; 
            }
            else {
                this.left += dwL;
                this.rightMargin += dwR; 
            }
            this.curViewState = NormalState;
            this.saveNormalState();
            this.onResized();
        }, false);

        window.addEventListener('tooltip', e => {
            var ce = <CustomEvent>e;
            const x: number = ce.detail.x;
            const y: number = ce.detail.y;
            const label: string = ce.detail.label;
            if(label.length == 0) this.hideTooltip();
            else {
                this.tooltip.setText(label);
                this.tooltip.display.position.set(10+x, y);
                this.tooltip.display.visible = true;
            }
        });
    }
    public getPosition():Point {
        var pt  = new Point();
        this.frameContainer.getGlobalPosition(pt);
        return pt;
    }

    zoomInNGLView() {
        this.nglGate?.stage.viewerControls.zoom(0.1)
    }
    zoomOutNGLView() {
        this.nglGate?.stage.viewerControls.zoom(-0.1)
    }
    setNGLMovState() {
        this.metaState = 1;
    }
    setNGLRotateState() {
        this.metaState = 0;
    }
    setNGLEditState() {
        this.metaState = 2;
    }
    uploadCIF() {
        if(this.nglGate._3DFilePath instanceof File) {
            var reader = new FileReader();
            reader.readAsText(this.nglGate._3DFilePath); // this is reading as data url

            // here we tell the reader what to do when it's done reading...
            reader.onload = readerEvent => {
                var content = readerEvent.target?.result;
                console.log('upload', content);
                // Post to server
                const url = new URL('upload/cif', Eterna.SERVER_URL);
                fetch(url.href, {
                    method: 'POST',
                    body: content
                })
            }
        }
    }
    create3DMenu():ContextMenu {
        const menu = new ContextMenu({ horizontal: false });  
        var moveIcon = (this.metaState === 1)?Bitmaps.Img3DMoveCheckIcon:Bitmaps.Img3DMoveIcon;
        var rotateIcon = (this.metaState === 0)?Bitmaps.Img3DRotateCheckIcon:Bitmaps.Img3DRotateIcon;
        var editIcon = (this.metaState === 2)?Bitmaps.ImgPencilCheck:Bitmaps.ImgPencil;
        menu.addItem('Rotate', rotateIcon).clicked.connect(() => this.setNGLRotateState());
        menu.addItem('Pan', moveIcon).clicked.connect(() => this.setNGLMovState());
        menu.addItem('Edit', editIcon).clicked.connect(() => this.setNGLEditState());
        menu.addItem('Zoom in', Bitmaps.Img3DZoominIcon).clicked.connect(() => this.zoomInNGLView());
        menu.addItem('Zoom out', Bitmaps.Img3DZoomoutIcon).clicked.connect(() => this.zoomOutNGLView());
        var annoMenuTitle = 'Show'
        if(this.nglGate.bShowAnnotations) annoMenuTitle = 'Hide'
        menu.addItem(annoMenuTitle, Bitmaps.ImgAnnotation).clicked.connect(() => {
            this.nglGate.showAnnotations(!this.nglGate.bShowAnnotations);
        });
        if(this.nglGate._3DFilePath instanceof File) {
            menu.addItem('Upload CIF', Bitmaps.ImgUpload).clicked.connect(() => this.uploadCIF());
        }
        return menu;
    }
    removeAnnotations() {
        this.nglTextArray.forEach((t)=>{
            this.nglContainer.removeChild(t);
        })
        this.nglTextArray = new Array(0);
    }
    hideTooltip() {
        this.tooltip.display.visible = false;
    }
    dragHandleEvent(e:InteractionEvent) {
        var scope = ThreeView.scope;
        switch (e.type) {
            case 'pointerdown':
                scope.pressed = true;
                scope.prevPt.x = e.data.global.x;
                scope.prevPt.y = e.data.global.y;
                break;
            case 'pointermove':
                Assert.assertIsDefined(Flashbang.stageWidth)
                Assert.assertIsDefined(Flashbang.stageHeight)
                if(scope.pressed && e.data.pressure == 0) scope.pressed = false;
                if(scope.pressed && scope.curViewState != MaxState) {
                    var curPt = e.data.global
                    var dx = curPt.x - scope.prevPt.x;
                    var dy = curPt.y - scope.prevPt.y;

                    var left = scope.left + dx;
                    var top = scope.top + dy;
                    var right = left + scope.width;
                    var bottom = top + scope.height;

                    if(left>0 && top>0 && right<Flashbang.stageWidth && bottom<Flashbang.stageHeight) {
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
            case 'pointerover':
                const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc) {
                    doc.style.cursor = 'move';
                }
                break;
            case 'pointerout':
                const doc1 = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc1) {
                    doc1.style.cursor = 'default';
                }
                break;
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
                Assert.assertIsDefined(Flashbang.stageWidth)
                Assert.assertIsDefined(Flashbang.stageHeight)
                if(this.dragLeftPressed && e.data.pressure == 0) this.dragLeftPressed = false;
                if(this.dragLeftPressed && this.curViewState == NormalState) {
                    var dx = e.data.global.x - this.dragLeftPrevPt.x;
                    var dy = e.data.global.y - this.dragLeftPrevPt.y;

                    var left = this.left + dx;
                    var width = this.width - dx;
                    var height = this.height + dy;
                    var bottom = this.top + height;
                    var minW = this.iconSize*3+this.titleText.width+100+this.gap*5;

                    if(left>0 && width>=minW && height>=minH  && bottom<Flashbang.stageHeight) {
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
            case 'pointerover':
                const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc) {
                    doc.style.cursor = 'sw-resize';
                }
                break;
            case 'pointerout':
                const doc1 = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc1) {
                    doc1.style.cursor = 'default';
                }
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
                Assert.assertIsDefined(Flashbang.stageWidth)
                Assert.assertIsDefined(Flashbang.stageHeight)
                if(this.dragRightPressed && e.data.pressure == 0) this.dragRightPressed = false;
                if(this.dragRightPressed && this.curViewState == NormalState) {
                    var dx = e.data.global.x - this.dragRightPrevPt.x;
                    var dy = e.data.global.y - this.dragRightPrevPt.y;

                    var width = this.width + dx;
                    var right = this.left + width;
                    var height = this.height + dy;
                    var bottom = this.top + height;
                    var minW = this.iconSize*3+this.titleText.width+100+this.gap*5;

                    if(width>=minW && height >= minH && right<Flashbang.stageWidth && bottom<Flashbang.stageHeight) {
                        this.width = width;
                        this.height = height;
                        this.dragRightPrevPt.x = e.data.global.x;
                        this.dragRightPrevPt.y = e.data.global.y;
                        this.rightMargin = Flashbang.stageWidth - this.left - this.width;
                        this.saveNormalState();
                        this.onResized()
                    }
                }
                break;
            case 'pointerup':
                this.dragRightPressed = false;
                break;
            case 'pointercancel':
                this.dragRightPressed = false;
                break;
            case 'pointerover':
                const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc) {
                    doc.style.cursor = 'nw-resize';
                }
                break;
            case 'pointerout':
                const doc1 = document.getElementById(Eterna.PIXI_CONTAINER_ID);
                if (doc1) {
                    doc1.style.cursor = 'default';
                }
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

        this.contentLay = new VLayoutContainer(0, HAlign.LEFT)

        this.titleLay = new HLayoutContainer(0, VAlign.CENTER)

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

        this.contentLay.addChild(this.titleLay)

        this.mainContainer = new Container();
        this.nglContainer = new Container();
        this.frameContainer = new MyContainer(this);

        this.frameBaseTexture = new BaseRenderTexture({width:this.width, height:this.height-this.iconSize, scaleMode:SCALE_MODES.LINEAR, resolution:1});
        this.frameTexture = new RenderTexture(this.frameBaseTexture);
        this.frameSprite = new Sprite(this.frameTexture);
        this.frameContainer.addChild(this.frameSprite);

        this.nglTextArray = new Array(0);
        this.nglSpriteCanvas = document.createElement('canvas');
        this.nglSpriteCanvas.width =  screen.width;
        this.nglSpriteCanvas.height = screen.height;
        this.nglSpriteContext = this.nglSpriteCanvas.getContext('2d');
        this.nglTexture = BaseTexture.from(this.nglSpriteCanvas); 
        this.nglSprite = new Sprite(new Texture(this.nglTexture));
        this.nglContainer.addChild(this.nglSprite);

        this.frameContainer.addChild(this.lbSprite.display);
        this.lbSprite.display.x  = 0;
        this.lbSprite.display.y  = this.height-this.iconSize-this.iconSize;
        this.frameContainer.addChild(this.rbSprite.display);
        this.rbSprite.display.x  = this.width-this.iconSize;
        this.rbSprite.display.y  = this.height-this.iconSize-this.iconSize;

        this.mainContainer.addChild(this.frameContainer)
        this.mainContainer.addChild(this.nglContainer)

        this.tooltip = new TextBalloon('', 0x0, 1);
        this.tooltip.display.visible = false;
        this.addObject(this.tooltip, this.mainContainer);

        this.contentLay.addChild(this.mainContainer)
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
        var i = 0;
        var uninit:boolean = (this.nglTextArray.length == 0);
        this.nglGate.component?.eachAnnotation((a)=>{
            var text;
            var x:number;
            var y:number;
            x = a.getCanvasPosition().x;
            y = height - a.getCanvasPosition().y;
            var ok:boolean = (x>=0 && x<width && y>=0 && y<height);
            if(uninit) {
                text = new Text(a.getContent(),{fontFamily : 'Arial', fontSize: 12, fill : 0xffffff, align : 'center'});
                text.x = x;
                text.y = y;
                text.visible = false
                if(this.nglGate.bShowAnnotations) {
                    if(ok && x+text.width<this.width  && y+text.height<height) {
                        text.visible = true;
                    }
                }
                this.nglTextArray.push(text);
                this.nglContainer.addChild(text);
            }
            else {
                if(this.nglGate.bShowAnnotations) {
                    text = this.nglTextArray[i];
                    text.x = x;
                    text.y = y;
                    text.visible = false
                    if(ok && x+text.width<this.width  && y+text.height<height) {
                        text.visible = true;
                    }
                    i++;
                }
            }
        })
    }
    updateNGLTexture(canvas:HTMLCanvasElement, width:number, height:number) {
        if(this.nglSpriteContext) {
            this.nglSpriteContext.fillStyle = 'rgba(2,35,71,0.6)'
            this.nglSpriteContext.clearRect(0,0,this.nglSpriteCanvas.width,this.nglSpriteCanvas.height);
            if(width>0 && height>0) {
                var dpr = window.devicePixelRatio;
                this.nglSpriteContext.fillRect(0, 0, this.width, this.height-this.iconSize)
                this.nglSpriteContext.drawImage(canvas, 0, 0, width*dpr, height*dpr, 0, 0, this.width, this.height-this.iconSize); 
            }
            this.nglTexture.update();
        }
        this.updateAnnotations(this.frameContainer.width, this.frameContainer.height);
    }
    hideAnnotations() {
        this.nglTextArray.forEach((text)=>{
            text.visible = false;
        });
    }
    onMenuClick() {
        var init:PointerEventInit = {
            cancelable: true,
            bubbles: true,
            clientX: this.left + this.menuButton.display.x,
            clientY: this.top + this.iconSize,
        }
        var event = new PointerEvent('contextmenu', init);
        this.isOver3DCanvas = true;
        document.getElementById(Eterna.PIXI_CONTAINER_ID)?.children[0]?.dispatchEvent(event);
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
        Assert.assertIsDefined(Flashbang.stageWidth)
        Assert.assertIsDefined(Flashbang.stageHeight)
        this.maxButton.up(Bitmaps.Img3DMaxRestore)
            .over(Bitmaps.Img3DMaxRestoreHover)
            .down(Bitmaps.Img3DMaxRestore).tooltip('Restore');
        this.minButton.up(Bitmaps.Img3DMinRestore)
            .over(Bitmaps.Img3DMinRestoreHover)
            .down(Bitmaps.Img3DMinRestore).tooltip('Restore');
        this.top = 100;
        this.left = 100;
        this.width = Flashbang.stageWidth - 100*2;
        this.height = Flashbang.stageHeight - this.top - 80; 
        this.curViewState = MaxState;
        this.onResized();
    }
    private setToMin() {
        Assert.assertIsDefined(Flashbang.stageWidth)
        Assert.assertIsDefined(Flashbang.stageHeight)
        this.minButton.up(Bitmaps.Img3DMinRestore)
                .over(Bitmaps.Img3DMinRestoreHover)
                .down(Bitmaps.Img3DMinRestore).tooltip('Restore');
        this.maxButton.up(Bitmaps.Img3DMaxRestore)
            .over(Bitmaps.Img3DMaxRestoreHover)
            .down(Bitmaps.Img3DMaxRestore).tooltip('Restore');
        this.width = Math.min(460, this.width);
        this.rightMargin = (Flashbang.stageWidth-this.width)/2;
        this.left = Flashbang.stageWidth - this.width - this.rightMargin;
        this.top = 10;
        this.height = this.iconSize; 
        this.curViewState = MinState;
        this.onResized();
    }
    onMaxButton() {
        Assert.assertIsDefined(Flashbang.stageWidth)
        Assert.assertIsDefined(Flashbang.stageHeight)
        if(this.curViewState == MaxState || this.curViewState == MinState) {
            this.setToNormal();
        }
        else {
            this.setToMax();
        }
        this.onResized();
    }
    onMinButton() {
        Assert.assertIsDefined(Flashbang.stageWidth)
        Assert.assertIsDefined(Flashbang.stageHeight)
        if(this.curViewState == MinState || this.curViewState == MaxState) {
            this.setToNormal();
        }
        else {
            this.setToMin();
        }
        this.onResized();
    }
    private saveNormalState() {
        this.normalState.x = this.left;
        this.normalState.y = this.top;
        if(this.curViewState == NormalState) {
            this.normalState.w = this.width;
            this.normalState.h = this.height;
        }
    }
    public onResized() {
        this.updateLayout();
        this.moveWindow();
    }
    moveWindow() {
        this.nglGate?.stage?.viewer.setPosition(this.left, this.top+this.iconSize);
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

        this.sprite1.display.width = this.width/2-(this.iconSize*2+this.titleText.width/2+this.gap*3);
        this.sprite1.display.height = this.iconSize;
        this.sprite2.display.width = this.width/2-(this.iconSize+this.titleText.width/2+this.gap*2);
        this.sprite2.display.height = this.iconSize;

        this.titleLay.height = this.iconSize;

        this.frameTexture.resize(this.width, this.height-this.iconSize, true);

        this.lbSprite.display.x  = 0;
        this.lbSprite.display.y  = this.height-this.iconSize-this.iconSize;
        this.rbSprite.display.x  = this.width-this.iconSize;
        this.rbSprite.display.y  = this.height-this.iconSize-this.iconSize;

        if(this.curViewState == MinState) {
            this.lbSprite.display.visible = false;
            this.rbSprite.display.visible = false;
            this.nglSprite.visible = false;
        }
        else {
            this.lbSprite.display.visible = true;
            this.rbSprite.display.visible = true;
            this.nglSprite.visible = true;
        }
        
        this.frame.clear();
        this.frame.lineStyle(1, 0x2F94D1).drawRect(0,0,this.width,this.height);

        this.contentLay.layout(true);
        this.titleLay.layout(true);
        this.contentLay.layout(true);

        var w = Math.max(2, this.width);
        var h = Math.max(2, this.height-this.iconSize);
        this.nglGate?.stage?.viewer.setPosition(this.left, this.top+this.iconSize);
        this.nglGate?.stage?.handleResize(w, h);
    }
    PtInCanvas(x:number, y: number): boolean {
        if(x>=this.lbSprite.display.x && x<=this.lbSprite.display.x+this.lbSprite.display.width 
            && y>=this.lbSprite.display.y && y<=this.lbSprite.display.y+this.lbSprite.display.height) return false;
        if(x>=this.rbSprite.display.x && x<=this.rbSprite.display.x+this.rbSprite.display.width 
            && y>=this.rbSprite.display.y && y<=this.rbSprite.display.y+this.rbSprite.display.height) return false;
        return (x>=0 && x<this.frameContainer.width && y>0 && y<this.frameContainer.height);
    }
}
