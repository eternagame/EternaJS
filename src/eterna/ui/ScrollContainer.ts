import {Container, Graphics} from 'pixi.js';
import {
    MathUtil, ContainerObject, Assert, Flashbang
} from 'flashbang';
import Eterna from 'eterna/Eterna';

const events = [
    'pointercancel', 'pointerdown', 'pointerenter', 'pointerleave', 'pointermove',
    'pointerout', 'pointerover', 'pointerup', 'mousedown', 'mouseenter', 'mouseleave',
    'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousedown', 'mouseup'
] as const;

let earlyHandlers: ((e: MouseEvent | PointerEvent) => void)[] = [];

// Why are you doing this, you might ask? First off, see ScrollContainer#handlePossiblyMaskedEvent
// Ok, got that? Lets continue. For some mouse events, Pixi registers listeners on the window with capturing
// enebled, which means that it gets notified of events dispatched on children before event listeners
// on the children themselves do. This is the only way for us to make sure we can catch an event
// and prevent it from propogating before Pixi has a chance to say "well, that event was fired on
// something that wasn't the Pixi canvas, so that must mean our canvas has lost focus" (and as such,
// refusing to do things like fire a pointertap because it threw away references to tracked pointers,
// thinking we started a tap and canceled it by releasing our mouse outside the canvas).
for (const event of events) {
    // eslint-disable-next-line no-loop-func
    window.addEventListener(event, (e) => {
        earlyHandlers.forEach((handler) => handler(e));
    }, true);
}

export default class ScrollContainer extends ContainerObject {
    public readonly content = new Container();

    constructor(width: number, height: number, radius: number = 0) {
        super();
        this._width = width;
        this._height = height;
        this._radius = radius;
        this._boundHME = this.handlePossiblyMaskedEvent.bind(this);
    }

    protected added() {
        super.added();

        this.display.addChild(this.content);
        this.display.addChild(this._contentMask);
        this.content.mask = this._contentMask;

        const overlayEl = document.getElementById(Eterna.OVERLAY_DIV_ID);
        Assert.assertIsDefined(overlayEl);
        this._htmlWrapper = document.createElement('div');
        this._htmlWrapper.style.position = 'absolute';
        // Turn off pointer events for the wrapper, but keep them on for children
        // (handled via) our stylesheet
        this._htmlWrapper.classList.add('scroll-container-wrapper');
        overlayEl.appendChild(this._htmlWrapper);

        this.doLayout();

        earlyHandlers.push(this._boundHME);
    }

    protected dispose(): void {
        const overlayEl = document.getElementById(Eterna.OVERLAY_DIV_ID);
        Assert.assertIsDefined(overlayEl);
        overlayEl.removeChild(this._htmlWrapper);
        earlyHandlers = earlyHandlers.filter((handler) => handler !== this._boundHME);

        super.dispose();
    }

    public get scrollX(): number {
        return -this.content.x;
    }

    public set scrollX(value: number) {
        this.setScroll(value, this.scrollY);
    }

    public get maxScrollX(): number {
        return Math.max(this.content.width - this._width, 0);
    }

    public get scrollY(): number {
        return -this.content.y;
    }

    public set scrollY(value: number) {
        this.setScroll(this.scrollX, value);
    }

    public get maxScrollY(): number {
        return Math.max(this.content.height - this._height, 0);
    }

    public setScroll(scrollX: number, scrollY: number): void {
        this.content.x = -MathUtil.clamp(scrollX, 0, this.maxScrollX);
        this.content.y = -MathUtil.clamp(scrollY, 0, this.maxScrollY);
    }

    /** Sets the size of the container's content viewport */
    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }

        this._width = width;
        this._height = height;

        this.doLayout();
    }

    public doLayout() {
        const prevScrollX = this.scrollX;
        const prevScrollY = this.scrollY;

        this._contentMask
            .clear()
            .beginFill(0x00ff00)
            .drawRoundedRect(0, 0, this._width, this._height, this._radius)
            .endFill();

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this._htmlWrapper.style.width = `${Flashbang.stageWidth}px`;
        this._htmlWrapper.style.height = `${Flashbang.stageHeight}px`;
        const {
            x, y, width, height
        } = this.display.getBounds();
        this._htmlWrapper.style.clipPath = `polygon(
            ${x}px ${y}px,
            ${x + width}px ${y}px,
            ${x + width}px ${y + height}px,
            ${x}px ${y + height}px
        )`;

        this.setScroll(prevScrollX, prevScrollY);
    }

    /**
     * Handles mouse events fired on events when the element being interacted with is outside
     * the viewport
     *
     * The only reason we have to do this is because of a long-standing WebKit/Safari bug
     * where events are fired on elements that cannot be seen with clip-path:
     * https://bugs.webkit.org/show_bug.cgi?id=152548
     *
     * @param e Pointer event being handled
     */
    private handlePossiblyMaskedEvent(e: MouseEvent | PointerEvent): void {
        const {
            x, y, width, height
        } = this.display.getBounds();

        const isMaskedElement = this._htmlWrapper.contains(e.target as HTMLDivElement);

        if (
            isMaskedElement
            && (e.clientX < x || e.clientX > x + width || e.clientY < y || e.clientY > y + height)
        ) {
            // This event was fired on a location outside our clip path, and because
            // we register this callback for elements within our scroll panel, this must mean
            // it should have been clipped.
            e.preventDefault();
            e.stopPropagation();

            // Find the next element "under" this element that isn't in our scroll container,
            // to re-fire the event on.
            const candidateEls = document.elementsFromPoint(e.clientX, e.clientY);
            const newTarget = candidateEls.find((el) => !this._htmlWrapper.contains(el));
            if (!newTarget) return;

            // If we transition from an unmasked portion of an overlay element to the masked portion,
            // we won't trigger the pointerover event because the browser thinks we're still on
            // the old element. As such, we need to make sure that actually happens properly
            // eg for button hovering purposes
            if (!this.lastEventWasMasked) {
                this.lastEventWasMasked = true;
                newTarget.dispatchEvent(new PointerEvent('pointerover', e));
            }

            const newEvent = e instanceof PointerEvent ? new PointerEvent(e.type, e) : new MouseEvent(e.type, e);
            newTarget.dispatchEvent(newEvent);
        } else if (this.lastEventWasMasked && !isMaskedElement) {
            this.lastEventWasMasked = false;
        }
    }

    /**
     * HTML wrapper element used to mask HTML children - all HTML content added to this
     * scroll container should be added as a child of this element
     */
    public get htmlWrapper(): HTMLDivElement {
        return this._htmlWrapper;
    }

    private readonly _contentMask = new Graphics();
    private _htmlWrapper: HTMLDivElement;

    private _boundHME: (e: MouseEvent | PointerEvent) => void;
    private lastEventWasMasked = false;

    private _width: number;
    private _height: number;
    private _radius: number;
}
