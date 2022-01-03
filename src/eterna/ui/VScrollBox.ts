import {
    Container,
    InteractionEvent
} from 'pixi.js';
import {
    MathUtil,
    ContainerObject,
    Assert,
    InputUtil,
    MouseWheelListener,
    DisplayUtil,
    HAlign,
    VAlign
} from 'flashbang';
import GraphicsObject from 'flashbang/objects/GraphicsObject';
import ScrollContainer from './ScrollContainer';

enum DragMode {
    SURFACE,
    THUMB,
    NONE
}

/** Contains scrollable content and a vertical sliderbar */
export default class VScrollBox extends ContainerObject implements MouseWheelListener {
    constructor(width: number, height: number, radius: number = 0) {
        super();
        this._width = width;
        this._height = height;
        this._radius = radius;
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

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.mouseWheelInput.pushListener(this));

        const thumbHeight = (
            this._height * (this._height / this._scrollContainer.content.height)
        ) - 2 * this._SCROLL_THUMB_PADDING;

        const scrollDistance = (this._height - 2 * this._SCROLL_THUMB_PADDING)
            * (this._scrollContainer.scrollY / this._scrollContainer.content.height);
        this._scrollThumb = new GraphicsObject();
        this._scrollThumb.display
            .beginFill(0xFFFFFF)
            .drawRoundedRect(
                0,
                0,
                this._SCROLL_THUMB_WIDTH,
                thumbHeight,
                this._SCROLL_THUMB_WIDTH / 2
            ).endFill();
        this._scrollThumb.display.alpha = 0.4;
        this.addObject(this._scrollThumb, this.display);
        DisplayUtil.positionRelative(
            this._scrollThumb.display, HAlign.RIGHT, VAlign.TOP,
            this._scrollContainer.container, HAlign.RIGHT, VAlign.TOP,
            -this._SCROLL_THUMB_PADDING, this._SCROLL_THUMB_PADDING + scrollDistance
        );
        this.regs.add(this._scrollThumb.pointerDown.connect((e) => this.onDragPointerDown(e, DragMode.THUMB)));
        this.regs.add(this._scrollThumb.pointerUp.connect(() => this.onDragPointerUp()));
        this.regs.add(this._scrollThumb.pointerUpOutside.connect(() => this.onDragPointerUp()));
        this.regs.add(this._scrollThumb.pointerMove.connect((e) => this.onDragPointerMove(e)));

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
        this.updateScrollThumb();

        this._dragSurface.display.clear();
        this._dragSurface.display.beginFill(0x00FF00);
        this._dragSurface.display.drawRoundedRect(0, 0, this._width, this._height, this._radius);
        this._dragSurface.display.endFill();
    }

    public updateScrollThumb() {
        // Update scroll position
        if (
            this._scrollContainer.content.height > 0
            && this._scrollContainer.content.height > this._height
        ) {
            const thumbHeight = (
                this._height * (this._height / this._scrollContainer.content.height)
            ) - 2 * this._SCROLL_THUMB_PADDING;
            const scrollDistance = (this._height - 2 * this._SCROLL_THUMB_PADDING)
                * (this._scrollContainer.scrollY / this._scrollContainer.content.height);
            this._scrollThumb.display.clear()
                .beginFill(0x4A90E2)
                .drawRoundedRect(
                    0,
                    0,
                    this._SCROLL_THUMB_WIDTH,
                    thumbHeight,
                    this._SCROLL_THUMB_WIDTH / 2
                ).endFill();
            DisplayUtil.positionRelative(
                this._scrollThumb.display, HAlign.RIGHT, VAlign.TOP,
                this._scrollContainer.container, HAlign.RIGHT, VAlign.TOP,
                -this._SCROLL_THUMB_PADDING, this._SCROLL_THUMB_PADDING + scrollDistance
            );
            this._scrollThumb.display.visible = true;
        } else if (
            (this._scrollContainer.content.height <= 0
                || this._scrollContainer.content.height <= this._height)
            && this._scrollThumb
        ) {
            this._scrollThumb.display.visible = false;
        }
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

    private onDragPointerDown(event: InteractionEvent | PointerEvent, mode: DragMode) {
        this._dragging = mode;
        if (event instanceof InteractionEvent) {
            this._dragStartPoint = event.data.global.y;
        } else {
            if (event.pointerType === 'mouse') {
                this._dragging = DragMode.NONE;
                return;
            }
            this._dragStartPoint = event.y;
        }
        this._dragStartScroll = this.scrollLocation;
        this._dragStartThumb = this._scrollThumb.display.position.y;
    }

    private onDragPointerUp() {
        this._dragging = DragMode.NONE;
    }

    private onDragPointerMove(event: InteractionEvent | PointerEvent) {
        if (this._dragging !== DragMode.NONE) {
            const currY = event instanceof InteractionEvent ? event.data.global.y : event.y;
            const dragRange = currY - this._dragStartPoint;
            if (this._dragging === DragMode.SURFACE) {
                this.scrollLocation = this._dragStartScroll - dragRange;
            } else {
                const newThumbPos = (this._dragStartThumb + dragRange);
                const maxScrollRange = (this._height - this._scrollThumb.display.height);
                const progress = newThumbPos / maxScrollRange;
                this.scrollLocation = progress * this._scrollContainer.maxScrollY;
            }
            this.updateScrollThumb();
        }
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        const pxdelta: number = InputUtil.scrollAmount(e, 13, this._scrollContainer.maxScrollY);
        this.scrollLocation += pxdelta;
        this.updateScrollThumb();

        return true;
    }

    private _scrollContainer: ScrollContainer;
    private _dragSurface: GraphicsObject;
    private _scrollThumb: GraphicsObject;

    private _dragging: DragMode = DragMode.NONE;
    private _dragStartPoint = 0;
    private _dragStartScroll = 0;
    private _dragStartThumb = 0;

    private _width: number;
    private _height: number;
    private _radius: number;

    private _SCROLL_THUMB_PADDING = 5;
    private _SCROLL_THUMB_WIDTH = 6;
}
