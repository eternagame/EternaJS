import {Container, Graphics, interaction} from 'pixi.js';
import {
    MathUtil, ContainerObject, Assert, InputUtil, MouseWheelListener
} from 'flashbang';
import GraphicsObject from 'flashbang/objects/GraphicsObject';
import ScrollContainer from './ScrollContainer';

/** Contains scrollable content and a vertical sliderbar */
export default class VScrollBox extends ContainerObject implements MouseWheelListener {
    constructor(width: number, height: number) {
        super();
        this._width = width;
        this._height = height;
    }

    protected added() {
        super.added();

        this._dragSurface = new GraphicsObject();
        this._dragSurface.display.interactive = true;
        this._dragSurface.display.alpha = 0;
        this.addObject(this._dragSurface, this.display);

        this._scrollContainer = new ScrollContainer(this._width, this._height);
        this.addObject(this._scrollContainer, this.display);

        this._dragSurface.pointerDown.connect((e) => this.onDragPointerDown(e));
        this._dragSurface.pointerUp.connect(() => this.onDragPointerUp());
        this._dragSurface.pointerUpOutside.connect(() => this.onDragPointerUp());
        this._dragSurface.pointerMove.connect(() => this.onDragPointerMove());

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.mouseWheelInput.pushListener(this));

        this.doLayout();

        // Whenever the mode resizes, the HTML mask gets off
        Assert.assertIsDefined(this.mode);
        this.mode.resized.connect(() => {
            if (this.isLiveObject) this.doLayout();
        });
    }

    /** Attach scrollable content here */
    public get content(): Container {
        return this._scrollContainer.content;
    }

    public get height() { return this._height; }

    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }

        this._width = width;
        this._height = height;
        this._scrollContainer.setSize(width, height);
    }

    public doLayout() {
        this._scrollContainer.doLayout();

        this._dragSurface.display.clear();
        this._dragSurface.display.beginFill(0x00FF00);
        this._dragSurface.display.drawRect(0, 0, this._width, this._height);
        this._dragSurface.display.endFill();
    }

    public get scrollLocation(): number {
        return this._scrollContainer.scrollY;
    }

    public set scrollLocation(value: number) {
        this._scrollContainer.setScroll(0, MathUtil.clamp(value, 0, this._scrollContainer.maxScrollY));
    }

    public get htmlWrapper() {
        return this._scrollContainer.htmlWrapper;
    }

    private onDragPointerDown(event: interaction.InteractionEvent) {
        this._dragging = true;
        this._dragPointData = event.data;
        this._dragStartBoxY = this.scrollLocation;
        this._dragStartPointY = event.data.getLocalPosition(this._dragSurface.display).y;
    }

    private onDragPointerUp() {
        this._dragging = false;
        this._dragPointData = null;
        this._dragStartBoxY = 0;
        this._dragStartPointY = 0;
    }

    private onDragPointerMove() {
        if (this._dragging) {
            Assert.assertIsDefined(this._dragPointData);
            const dragRange = this._dragPointData.getLocalPosition(this._dragSurface.display).y - this._dragStartPointY;
            this.scrollLocation = this._dragStartBoxY - dragRange;
        }
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        const pxdelta: number = InputUtil.scrollAmount(e, 13, this._scrollContainer.maxScrollY);
        this.scrollLocation += pxdelta;

        return true;
    }

    private _scrollContainer: ScrollContainer;
    private _dragSurface: GraphicsObject;

    private _dragging: boolean = false;
    private _dragPointData: interaction.InteractionData | null = null;
    private _dragStartPointY = 0;
    private _dragStartBoxY = 0;

    private _width: number;
    private _height: number;
}
