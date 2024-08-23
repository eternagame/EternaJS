import {Graphics} from 'pixi.js';
import {
    ContainerObject,
    KeyboardListener,
    DisplayObjectPointerTarget,
    InputUtil,
    Flashbang,
    Assert,
    DOMObject
} from 'flashbang';
import {FederatedWheelEvent} from '@pixi/events';
import Eterna from 'eterna/Eterna';

/** Dialogs that expose a "confirmed" promise will reject with this error if the dialog is canceled */
export class DialogCanceledError extends Error {}

const events = [
    'pointercancel', 'pointerdown', 'pointerenter', 'pointerleave', 'pointermove',
    'pointerout', 'pointerover', 'pointerup', 'mousedown', 'mouseenter', 'mouseleave',
    'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousedown', 'mouseup', 'click',
    'wheel', 'touchstart', 'touchcancel', 'touchend', 'touchmove'
] as const;

let earlyHandlers: ((e: MouseEvent | PointerEvent | WheelEvent | TouchEvent) => void)[] = [];

// Why are you doing this, you might ask? For some mouse events, Pixi registers listeners on the window
// with capturing enabled, which means that it gets notified of events dispatched on children before
// event listeners on the children themselves do. This is the only way for us to make sure we can catch
// an event and prevent it from propagating before Pixi has a chance to say "well, that event was fired on
// something that wasn't the Pixi canvas, so that must mean our canvas has lost focus" (and as such,
// refusing to do things like fire a pointertap because it threw away references to tracked pointers,
// thinking we started a tap and canceled it by releasing our mouse outside the canvas).
for (const event of events) {
    // eslint-disable-next-line no-loop-func
    window.addEventListener(event, (e) => {
        earlyHandlers.forEach((handler) => handler(e));
    }, true);
}

class HTMLOverlayObject extends DOMObject<HTMLDivElement> {
    constructor() {
        super(Eterna.OVERLAY_DIV_ID, document.createElement('div'));
        this._boundHandleEvent = this.handleEvent.bind(this);
        this._obj.classList.add('dialog-event-eater');
    }

    protected added(): void {
        super.added();
        earlyHandlers.push(this._boundHandleEvent);
    }

    protected dispose(): void {
        earlyHandlers = earlyHandlers.filter((handler) => handler !== this._boundHandleEvent);
        super.dispose();
    }

    public set width(value: number) {
        this._obj.style.width = DOMObject.sizeToString(value);
        this.onSizeChanged();
    }

    public get width(): number {
        return this._obj.getBoundingClientRect().width;
    }

    public set height(value: number) {
        this._obj.style.height = DOMObject.sizeToString(value);
        this.onSizeChanged();
    }

    public get height(): number {
        return this._obj.getBoundingClientRect().height;
    }

    private handleEvent(e: MouseEvent | PointerEvent | WheelEvent | TouchEvent) {
        if (e.target !== this._obj) return;

        // Prevent any of the UI in our HTML overlay below this element from receiving clicks
        e.preventDefault();
        e.stopPropagation();

        // Instead, continue at the top of the pixi stack, since that may have elements that are
        // supposed to be "over" the modal background
        const canvas = Flashbang.app.view;
        if (e instanceof PointerEvent) {
            canvas.dispatchEvent(new PointerEvent(e.type, e));
        } else if (e instanceof WheelEvent) {
            canvas.dispatchEvent(new WheelEvent(e.type, e));
        } else if (e instanceof MouseEvent) {
            canvas.dispatchEvent(new MouseEvent(e.type, e));
        } else if (e instanceof TouchEvent) {
            canvas.dispatchEvent(new TouchEvent(e.type, {
                ...e,
                touches: [...e.touches],
                changedTouches: [...e.changedTouches],
                targetTouches: [...e.targetTouches]
            }));
        }
        this._obj.style.cursor = canvas.style.cursor;
    }

    private _boundHandleEvent: (e: MouseEvent | PointerEvent | WheelEvent | TouchEvent) => void;
}

/** Convenience base class for dialog objects. */
export default abstract class Dialog<T> extends ContainerObject implements KeyboardListener {
    /** A Promise that will resolve when the dialog is closed. */
    public readonly closed: Promise<T | null>;

    /** Whether or not the user has to interact with the modal before further action can be taken */
    public readonly modal: boolean;

    constructor(modal: boolean = true) {
        super();
        this.modal = modal;
        this.closed = new Promise((resolve) => { this._resolvePromise = resolve; });
    }

    protected added() {
        super.added();

        if (this.modal) {
            this.setupModalBackground();
        }
    }

    protected setupModalBackground(): void {
        const bg = new Graphics();
        this.container.addChild(bg);

        // Eat mouse events - make sure any objects created within the dialog should set
        // interactive to true and stop propogation if the event shouldn't be passed through to the bg
        const bgTarget = new DisplayObjectPointerTarget(bg);

        bgTarget.pointerDown.connect((e) => {
            if (InputUtil.IsLeftMouse(e)) {
                this.onBGClicked();
            }
            e.stopPropagation();
        });
        bgTarget.pointerUp.connect((e) => {
            e.stopPropagation();
        });
        bgTarget.pointerMove.connect((e) => {
            e.stopPropagation();
        });

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.keyboardInput.pushListener(this));
        this.regs.add(this.mouseWheel.connect((e) => this.onMouseWheelEvent(e)));

        const htmlOverlay = new HTMLOverlayObject();
        this.addObject(htmlOverlay);

        const updateBG = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            bg.clear()
                .beginFill(0x0)
                .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
                .endFill();
            bg.alpha = this.bgAlpha;
            htmlOverlay.width = Flashbang.stageWidth;
            htmlOverlay.height = Flashbang.stageHeight;
        };
        updateBG();
        this.regs.add(this.mode.resized.connect(updateBG));
    }

    /**
     * Called when the dim background behind the dialog is clicked.
     * Subclasses can override to e.g. close the dialog.
     */
    protected onBGClicked(): void {}

    protected close(value: T | null) {
        if (this._isClosed) {
            return;
        }
        this._isClosed = true;
        this._resolvePromise(value);
        this.destroySelf();
    }

    protected removed() {
        this.close(null);
        super.removed();
    }

    protected get bgAlpha(): number {
        return 0.7;
    }

    public onKeyboardEvent(_e: KeyboardEvent): boolean {
        // When in modal mode, dialogs eat all keyboard input
        if (this.modal) return true;
        return false;
    }

    public onMouseWheelEvent(e: FederatedWheelEvent) {
        // When in modal mode, dialogs eat all mousewheel input
        if (this.modal) e.stopPropagation();
    }

    protected _resolvePromise: (value: T | null) => void;
    protected _isClosed: boolean;
}
