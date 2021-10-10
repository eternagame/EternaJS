import {InteractionEvent, Point, Rectangle, Sprite, Graphics, Text, BaseTexture} from 'pixi.js';
import BitmapManager from 'eterna/resources/BitmapManager';
import {
    ContainerObject, Flashbang, VLayoutContainer, 
    HAlign, Assert, HLayoutContainer, VAlign, DisplayUtil, PointerCapture, SpriteObject
} from 'flashbang';
import GameButton from './GameButton';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import Eterna from 'eterna/Eterna';
import Mol3DView from 'eterna/mode/PoseEdit/Mol3DView';

const MaxState = 2;
const MinState = 1;
const NormalState = 0;
const minH = 200;

export default class ThreeView extends ContainerObject {
    private rb: HTMLDivElement;
    private lb: HTMLDivElement;
    private tb: HTMLDivElement;

    mol3DView: Mol3DView
    threeContainer: HTMLDivElement;
    contentLay: VLayoutContainer;
    titleLay: HLayoutContainer;
    bottomLay: HLayoutContainer;
    baseTexture: BaseTexture;
    maxButton: GameButton;
    minButton: GameButton;
    rbSprite: SpriteObject;
    lbSprite: SpriteObject;
    sprite1: SpriteObject;
    sprite2: SpriteObject;
    frame: Graphics;
    emptySprite: Sprite;
    titleText:Text;
    gap: number = 4;
    iconSize: number = 20;
    pressed: boolean = false;
    dragLeftPressed: boolean = false;
    dragRightPressed: boolean = false;
    textWidth: number;
    curViewState: number = NormalState;
    public left: number = 100;
    public top: number = 100;
    public width: number = 460;
    public height: number = 300;
    public prevPt: Point = new Point();
    public dragLeftPrevPt: Point = new Point();
    public dragRightPrevPt: Point = new Point();
    public canvasRect: Rectangle;
    public static scope: ThreeView;
    normalState: any = {x:this.left, y:this.top, w:this.width, h:this.height};
    _activeCapture:PointerCapture | null;
    private isMobile: boolean = false;

    constructor() {
        super();
        ThreeView.scope = this;
        Assert.assertIsDefined(Flashbang.stageWidth)
        Assert.assertIsDefined(Flashbang.stageHeight)
        this.width = 460;
        this.height = 300;
        this.left = Flashbang.stageWidth - this.width - 20;
        this.top = 100;
        this.saveNormalState();
        this.threeContainer = <HTMLDivElement> document.getElementById(Eterna.PIXI_CONTAINER_ID);
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
                        scope.saveNormalState();
                        scope.onResized();
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
                    var minW = this.iconSize*2+this.textWidth+100+this.gap*4;

                    if(left>0 && width>=minW && height>=minH  && bottom<Flashbang.stageHeight) {
                        this.left = left;
                        this.height = height;
                        this.width = width;
            
                        this.dragLeftPrevPt.x = e.data.global.x;
                        this.dragLeftPrevPt.y = e.data.global.y;
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
                    var minW = this.iconSize*2+this.textWidth+100+this.gap*4;

                    if(width>=minW && height >= minH && right<Flashbang.stageWidth && bottom<Flashbang.stageHeight) {
                        this.width = width;
                        this.height = height;
                        this.dragRightPrevPt.x = e.data.global.x;
                        this.dragRightPrevPt.y = e.data.global.y;
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

        this.contentLay = new VLayoutContainer(0, HAlign.CENTER)
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

        this.sprite1 = new SpriteObject(new Sprite(BitmapManager.getBitmap(Bitmaps.Img3DTitle)));
        this.sprite2 = new SpriteObject(new Sprite(BitmapManager.getBitmap(Bitmaps.Img3DTitle)));

        this.addObject(this.sprite1, this.titleLay);
        this.titleLay.addHSpacer(this.gap);
        this.titleText = Fonts.std('3D STRUCTURE', 12).color(0xffffff).build();
        this.titleText.interactive = true;
        this.textWidth = this.titleText.width;

        this.titleLay.addChild(this.titleText);
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

        this.bottomLay = new HLayoutContainer(0, VAlign.BOTTOM)
        this.addObject(this.lbSprite, this.bottomLay);
        this.emptySprite = new Sprite();
        this.bottomLay.addChild(this.emptySprite);
        this.addObject(this.rbSprite, this.bottomLay);

        this.contentLay.addChild(this.bottomLay)

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

        
        this.maxButton.clicked.connect(() => this.maximize());
        this.minButton.clicked.connect(() => this.minimize());

        this.onResized();
    }
    maximize() {
        Assert.assertIsDefined(Flashbang.stageWidth)
        Assert.assertIsDefined(Flashbang.stageHeight)
        if(this.curViewState == MaxState) {
            this.maxButton.up(Bitmaps.Img3DMax)
                .over(Bitmaps.Img3DMaxHover)
                .down(Bitmaps.Img3DMax).tooltip('Maximize');
            this.left = this.normalState.x;
            this.top = this.normalState.y;
            this.width = this.normalState.w;
            this.height = this.normalState.h;
            this.curViewState = NormalState;
            this.onResized();
        }
        else {
            this.maxButton.up(Bitmaps.Img3DOrigin)
                .over(Bitmaps.Img3DOriginHover)
                .down(Bitmaps.Img3DOrigin).tooltip('Restore');
            this.top = 100;
            this.left = 100;
            this.width = Flashbang.stageWidth - 100*2;
            this.height = Flashbang.stageHeight - this.top - 80; 
            this.curViewState = MaxState;
            this.onResized();
        }
        this.onResized();
    }
    minimize() {
        Assert.assertIsDefined(Flashbang.stageWidth)
        Assert.assertIsDefined(Flashbang.stageHeight)
        if(this.curViewState == MinState) {
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
        else {
            this.minButton.up(Bitmaps.Img3DMinClose)
                .over(Bitmaps.Img3DMinCloseHover)
                .down(Bitmaps.Img3DMinClose).tooltip('Restore');
            this.height = this.iconSize; 
            this.curViewState = MinState;
            this.onResized();
        }
        this.onResized();
    }
    saveNormalState() {
        this.normalState.x = this.left;
        this.normalState.y = this.top;
        if(this.curViewState == NormalState) {
            this.normalState.w = this.width;
            this.normalState.h = this.height;
        }
    }
    private placeTo() {
        DisplayUtil.positionRelativeToStage(
            this.display, HAlign.LEFT, VAlign.TOP,
            HAlign.LEFT, VAlign.TOP, this.left, this.top
        );
    }
    public onResized() {
        this.updateLayout();
        this.placeTo()
    }
    private updateLayout(): void {
        this.lbSprite.display.width = this.iconSize;
        this.lbSprite.display.height = this.iconSize;
        this.rbSprite.display.width = this.iconSize;
        this.rbSprite.display.height = this.iconSize;

        this.maxButton.display.width = this.iconSize;
        this.maxButton.display.height = this.iconSize;
        this.minButton.display.width = this.iconSize;
        this.minButton.display.height = this.iconSize;

        var w = this.width- (this.iconSize*2+this.textWidth+this.gap*4);
        this.sprite1.display.width = w/2;
        this.sprite1.display.height = this.iconSize;
        this.sprite2.display.width = w/2;
        this.sprite2.display.height = this.iconSize;

        // this.container.width = this.width;
        // this.container.height = this.height;

        this.titleLay.height = this.iconSize;
        this.emptySprite.width = this.width - this.iconSize*2;
        this.emptySprite.height = this.height - this.iconSize;
        this.bottomLay.height = this.height - this.iconSize;

        if(this.curViewState == MinState) {
            this.lbSprite.display.visible = false;
            this.rbSprite.display.visible = false;
        }
        else {
            this.lbSprite.display.visible = true;
            this.rbSprite.display.visible = true;
        }
        
        this.frame.clear();
        this.frame.lineStyle(1, 0x2F94D1).drawRect(0,0,this.width,this.height);

        this.contentLay.layout(true);
        this.titleLay.layout(true);
        this.bottomLay.layout(true);
        this.contentLay.layout(true);

        if(this.mol3DView) {
            this.mol3DView.stage.viewer.setPosition(this.left, this.top+this.iconSize);
            this.mol3DView.stage.handleResize(this.width, this.height-this.iconSize);
        }
    }
    PtInCanvas(x:number, y: number): boolean {
        if(x>0 && x<this.iconSize && y>=this.height-this.iconSize*2 && y<this.height-this.iconSize) return false;
        if(x>=this.width-this.iconSize && x<this.width && y>=this.height-this.iconSize*2 && y<this.height-this.iconSize) return false;
        return (x>=0 && x<this.width && y>0 && y<this.height-this.iconSize);
    }
}