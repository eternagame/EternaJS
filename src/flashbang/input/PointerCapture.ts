import {DisplayObject} from 'pixi.js';
import {Assert, GameObject} from 'flashbang';
import {
    FederatedPointerEvent, FederatedWheelEvent
} from '@pixi/events';

/**
 * Begins capturing pointer input. All pointer events not related to the passed Container will be
 * routed to the given callback function before they reach their intended target. The callback
 * can call {@link FederatedPointerEvent.stopPropagation} to prevent the event from
 * being processed further.
 *
 * Capture begins when this object is added as the child of another GameObject via GameObject#addObject,
 * and ends when it is removed via GameObject#removeObject
 *
 * Be aware that with the current implementation, we do not intercept mouse or touch events
 * (only pointer and wheel).
 */
export default class PointerCapture extends GameObject {
    constructor(
        root: DisplayObject | null,
        onEvent: (e: FederatedPointerEvent | PointerEvent | FederatedWheelEvent) => void
    ) {
        super();
        this._root = root;
        this._onEvent = onEvent;
    }

    protected added() {
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.pointerMoveCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.pointerDownCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.pointerUpCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.pointerTapCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.pointerCancelCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.pointerEnterCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.pointerOverCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.pointerOutCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.pointerLeaveCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.pointerUpOutsideCapture.connect((e) => this.handleEvent(e)));
        this.regs.add(this.mode.mouseWheelCapture.connect((e) => this.handleEvent(e)));
    }

    private handleEvent(e: FederatedPointerEvent | PointerEvent | FederatedWheelEvent) {
        if (e instanceof PointerEvent || !this._root || (e.path && !e.path.includes(this._root))) {
            this._onEvent(e);
        }
    }

    private _root: DisplayObject | null;
    private _onEvent: ((e: FederatedPointerEvent | PointerEvent | FederatedWheelEvent) => void);
}
