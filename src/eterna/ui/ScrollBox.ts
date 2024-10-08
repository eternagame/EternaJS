import {
    Container,
    Point
} from 'pixi.js';
import {
    MathUtil,
    ContainerObject,
    Assert,
    InputUtil,
    DisplayUtil,
    HAlign,
    VAlign,
    Flashbang,
    PointerCapture
} from 'flashbang';
import GraphicsObject from 'flashbang/objects/GraphicsObject';
import {FederatedPointerEvent, FederatedWheelEvent} from '@pixi/events';
import ScrollContainer from './ScrollContainer';

enum DragMode {
    SURFACE,
    V_THUMB,
    H_THUMB,
    NONE
}

/** Contains scrollable content with scrollbars and drag scrolling */
export default class ScrollBox extends ContainerObject {
    constructor(
        width: number,
        height: number,
        radius: number = 0,
        scrollThumbPadding = 5,
        scrollThumbInlinePadding = 5
    ) {
        super();
        this._width = width;
        this._height = height;
        this._radius = radius;
        this._scrollThumbEdgePadding = scrollThumbPadding;
        this._scrollThumbInlinePadding = scrollThumbInlinePadding;
    }

    protected added() {
        super.added();

        this._dragSurface = new GraphicsObject();
        this._dragSurface.display.interactive = true;
        this._dragSurface.display.alpha = 0;
        this.addObject(this._dragSurface, this.display);

        this._scrollContainer = new ScrollContainer(this._width, this._height, this._radius);
        this.addObject(this._scrollContainer, this.display);

        this.regs.add(this._dragSurface.pointerDown.connect((e) => this.onDragPointerDown(e, DragMode.SURFACE)));
        this.regs.add(this._dragSurface.pointerUp.connect(() => this.onDragPointerUp()));
        this.regs.add(this._dragSurface.pointerUpOutside.connect(() => this.onDragPointerUp()));
        this.regs.add(this._dragSurface.pointerMove.connect((e) => this.onDragPointerMove(e)));

        this.htmlWrapper.addEventListener('pointerdown', (e) => this.onDragPointerDown(e, DragMode.SURFACE));
        this.htmlWrapper.addEventListener('pointerup', () => this.onDragPointerUp());
        this.htmlWrapper.addEventListener('pointermove', (e) => this.onDragPointerMove(e));
        this.htmlWrapper.addEventListener('wheel', (e) => this.onMouseWheelEvent(e));

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mouseWheel.connect((e) => this.onMouseWheelEvent(e)));
        Flashbang.app.addManagedInputElement(this.htmlWrapper);

        const thumbHeight = (
            this._height * (this._height / this._scrollContainer.content.height)
        ) - 2 * this._scrollThumbInlinePadding;
        const vScrollDistance = (this._height - 2 * this._scrollThumbInlinePadding)
            * (this._scrollContainer.scrollY / this._scrollContainer.content.height);
        this._vScrollThumb = new GraphicsObject();
        this._vScrollThumb.display
            .beginFill(0xFFFFFF)
            .drawRoundedRect(
                0,
                0,
                this._SCROLL_THUMB_WIDTH,
                thumbHeight,
                this._SCROLL_THUMB_WIDTH / 2
            ).endFill();
        this._vScrollThumb.display.alpha = 0.4;
        this.addObject(this._vScrollThumb, this.display);
        DisplayUtil.positionRelative(
            this._vScrollThumb.display, HAlign.RIGHT, VAlign.TOP,
            this._scrollContainer.container, HAlign.RIGHT, VAlign.TOP,
            -this._scrollThumbEdgePadding, this._scrollThumbInlinePadding + vScrollDistance
        );
        this.regs.add(this._vScrollThumb.pointerDown.connect((e) => this.onDragPointerDown(e, DragMode.V_THUMB)));
        this.regs.add(this._vScrollThumb.pointerUp.connect(() => this.onDragPointerUp()));
        this.regs.add(this._vScrollThumb.pointerUpOutside.connect(() => this.onDragPointerUp()));
        this.regs.add(this._vScrollThumb.pointerMove.connect((e) => this.onDragPointerMove(e)));

        const thumbWidth = (
            this._width * (this._width / this._scrollContainer.content.width)
        ) - 2 * this._scrollThumbInlinePadding;
        const hScrollDistance = (this._width - 2 * this._scrollThumbInlinePadding)
            * (this._scrollContainer.scrollX / this._scrollContainer.content.width);
        this._hScrollThumb = new GraphicsObject();
        this._hScrollThumb.display
            .beginFill(0xFFFFFF)
            .drawRoundedRect(
                0,
                0,
                thumbWidth,
                this._SCROLL_THUMB_WIDTH,
                this._SCROLL_THUMB_WIDTH / 2
            ).endFill();
        this._hScrollThumb.display.alpha = 0.4;
        this.addObject(this._hScrollThumb, this.display);
        DisplayUtil.positionRelative(
            this._hScrollThumb.display, HAlign.LEFT, VAlign.BOTTOM,
            this._scrollContainer.container, HAlign.LEFT, VAlign.BOTTOM,
            this._scrollThumbInlinePadding + hScrollDistance, -this._scrollThumbEdgePadding
        );
        this.regs.add(this._hScrollThumb.pointerDown.connect((e) => this.onDragPointerDown(e, DragMode.H_THUMB)));
        this.regs.add(this._hScrollThumb.pointerUp.connect(() => this.onDragPointerUp()));
        this.regs.add(this._hScrollThumb.pointerUpOutside.connect(() => this.onDragPointerUp()));
        this.regs.add(this._hScrollThumb.pointerMove.connect((e) => this.onDragPointerMove(e)));

        this.doLayout();

        // Whenever the mode resizes, the HTML mask gets off
        Assert.assertIsDefined(this.mode);
        this.mode.resized.connect(() => {
            if (this.isLiveObject) this.doLayout();
        });
    }

    protected dispose(): void {
        Flashbang.app.removeManagedInputElement(this.htmlWrapper);
        super.dispose();
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
        this.updateScrollThumbs();
    }

    public doLayout() {
        this._scrollContainer.doLayout();
        this.updateScrollThumbs();

        this._dragSurface.display.clear();
        this._dragSurface.display.beginFill(0x00FF00);
        this._dragSurface.display.drawRoundedRect(0, 0, this._width, this._height, this._radius);
        this._dragSurface.display.endFill();
    }

    public updateScrollThumbs() {
        if (
            this._scrollContainer.content.height > 0
            && this._scrollContainer.content.height > this._height
        ) {
            const thumbHeight = (
                this._height * (this._height / this._scrollContainer.content.height)
            ) - 2 * this._scrollThumbInlinePadding;
            const scrollDistance = (this._height - 2 * this._scrollThumbInlinePadding)
                * (this._scrollContainer.scrollY / this._scrollContainer.content.height);
            this._vScrollThumb.display.clear()
                .beginFill(0xcee0f5)
                .drawRoundedRect(
                    0,
                    0,
                    this._SCROLL_THUMB_WIDTH,
                    thumbHeight,
                    this._SCROLL_THUMB_WIDTH / 2
                ).endFill();
            DisplayUtil.positionRelative(
                this._vScrollThumb.display, HAlign.RIGHT, VAlign.TOP,
                this._scrollContainer.container, HAlign.RIGHT, VAlign.TOP,
                -this._scrollThumbEdgePadding, this._scrollThumbInlinePadding + scrollDistance
            );
            this._vScrollThumb.display.visible = true;
        } else if (
            (this._scrollContainer.content.height <= 0
            || this._scrollContainer.content.height <= this._height)
            && this._vScrollThumb
        ) {
            this._vScrollThumb.display.visible = false;
        }

        if (
            this._scrollContainer.content.width > 0
            && this._scrollContainer.content.width > this._width
        ) {
            const thumbWidth = (
                this._width * (this._width / this._scrollContainer.content.width)
            ) - 2 * this._scrollThumbInlinePadding;
            const scrollDistance = (this._width - 2 * this._scrollThumbInlinePadding)
                * (this._scrollContainer.scrollX / this._scrollContainer.content.width);
            this._hScrollThumb.display.clear()
                .beginFill(0xcee0f5)
                .drawRoundedRect(
                    0,
                    0,
                    thumbWidth,
                    this._SCROLL_THUMB_WIDTH,
                    this._SCROLL_THUMB_WIDTH / 2
                ).endFill();
            DisplayUtil.positionRelative(
                this._hScrollThumb.display, HAlign.LEFT, VAlign.BOTTOM,
                this._scrollContainer.container, HAlign.LEFT, VAlign.BOTTOM,
                this._scrollThumbInlinePadding + scrollDistance, -this._scrollThumbEdgePadding
            );
            this._hScrollThumb.display.visible = true;
        } else if (
            (this._scrollContainer.content.width <= 0
            || this._scrollContainer.content.width <= this._width)
            && this._hScrollThumb
        ) {
            this._hScrollThumb.display.visible = false;
        }
    }

    public get yScrollLocation(): number {
        return this._scrollContainer.scrollY;
    }

    public set yScrollLocation(value: number) {
        this._scrollContainer.scrollY = MathUtil.clamp(value, 0, this._scrollContainer.maxScrollY);
    }

    public get xScrollLocation(): number {
        return this._scrollContainer.scrollX;
    }

    public set xScrollLocation(value: number) {
        this._scrollContainer.scrollX = MathUtil.clamp(value, 0, this._scrollContainer.maxScrollX);
    }

    public get htmlWrapper() {
        return this._scrollContainer.htmlWrapper;
    }

    private onDragPointerDown(event: FederatedPointerEvent | PointerEvent, mode: DragMode) {
        this._dragging = mode;
        if (event instanceof FederatedPointerEvent) {
            this._dragStartPoint = event.global.clone();
        } else {
            if (event.pointerType === 'mouse') {
                this._dragging = DragMode.NONE;
                return;
            }
            this._dragStartPoint = new Point(event.x, event.y);
        }
        this._dragStartScroll = new Point(this.xScrollLocation, this.yScrollLocation);
        this._dragStartVThumb = this._vScrollThumb.display.position.clone();
        this._dragStartHThumb = this._hScrollThumb.display.position.clone();

        // This way you don't need to keep your pointer on the track while dragging
        this._dragCapture = new PointerCapture(null, (e) => {
            if (e.type === 'pointermove') this.onDragPointerMove(e as FederatedPointerEvent);
            if (e.type === 'pointerup') this.onDragPointerUp();
            e.stopPropagation();
        });
        this.addObject(this._dragCapture);
    }

    private onDragPointerUp() {
        this._dragging = DragMode.NONE;
        if (this._dragCapture && this._dragCapture.isLiveObject) this.removeObject(this._dragCapture);
        this._dragCapture = null;
    }

    private onDragPointerMove(event: FederatedPointerEvent | PointerEvent) {
        if (this._dragging !== DragMode.NONE) {
            const currX = event.x;
            const currY = event.y;
            const xDragRange = currX - this._dragStartPoint.x;
            const yDragRange = currY - this._dragStartPoint.y;
            switch (this._dragging) {
                case DragMode.SURFACE:
                    this.xScrollLocation = this._dragStartScroll.x - xDragRange;
                    this.yScrollLocation = this._dragStartScroll.y - yDragRange;
                    break;
                case DragMode.V_THUMB: {
                    const newThumbPos = (this._dragStartVThumb.y + yDragRange);
                    const maxScrollRange = (this._height - this._vScrollThumb.display.height);
                    const progress = newThumbPos / maxScrollRange;
                    this.yScrollLocation = progress * this._scrollContainer.maxScrollY;
                    break;
                }
                case DragMode.H_THUMB: {
                    const newThumbPos = (this._dragStartHThumb.x + xDragRange);
                    const maxScrollRange = (this._width - this._hScrollThumb.display.width);
                    const progress = newThumbPos / maxScrollRange;
                    this.xScrollLocation = progress * this._scrollContainer.maxScrollX;
                    break;
                }
                default:
                    Assert.unreachable(this._dragging);
            }
            this.updateScrollThumbs();
        }
    }

    public onMouseWheelEvent(e: FederatedWheelEvent | WheelEvent) {
        const noScrollX = Flashbang.app.isShiftKeyDown && (
            this._scrollContainer.content.width <= 0
            || this._scrollContainer.content.width <= this._width
        );
        const noScrollY = !Flashbang.app.isShiftKeyDown && (
            this._scrollContainer.content.height <= 0
            || this._scrollContainer.content.height <= this._height
        );

        if (noScrollX || noScrollY) return;

        if (Flashbang.app.isShiftKeyDown) {
            // TODO: Does the specified line height still make sense with the horizontal scroll?
            const pxdelta: number = InputUtil.scrollAmount(e, 13, this._scrollContainer.maxScrollX);
            this.xScrollLocation += pxdelta;
        } else {
            const pxdelta: number = InputUtil.scrollAmount(e, 13, this._scrollContainer.maxScrollY);
            this.yScrollLocation += pxdelta;
        }
        this.updateScrollThumbs();

        e.stopPropagation();
    }

    public getVScrollThumbBounds() {
        return this._vScrollThumb.display.getBounds();
    }

    public getHScrollThumbBounds() {
        return this._hScrollThumb.display.getBounds();
    }

    private _scrollContainer: ScrollContainer;
    private _dragSurface: GraphicsObject;
    private _vScrollThumb: GraphicsObject;
    private _hScrollThumb: GraphicsObject;

    private _dragging: DragMode = DragMode.NONE;
    private _dragCapture: PointerCapture | null;
    private _dragStartPoint: Point = new Point();
    private _dragStartScroll: Point = new Point();
    private _dragStartVThumb: Point = new Point();
    private _dragStartHThumb: Point = new Point();

    private _width: number;
    private _height: number;
    private _radius: number;
    private _scrollThumbEdgePadding: number;
    private _scrollThumbInlinePadding: number;

    private _SCROLL_THUMB_WIDTH = 6;
}
