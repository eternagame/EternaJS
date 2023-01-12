import {FederatedPointerEvent, FederatedWheelEvent} from '@pixi/events';
import {
    GameObject, PointerCapture, SceneObject
} from 'flashbang';

export default class PointerEventPropagator extends GameObject {
    constructor(target: SceneObject, domElement: HTMLElement) {
        super();
        this._target = target;
        this._domElement = domElement;
    }

    protected added(): void {
        this.regs.add(this._target.pointerCancel.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.pointerDown.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.pointerMove.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.pointerLeave.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.pointerOut.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.pointerOver.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.pointerEnter.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.pointerTap.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.pointerUp.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.pointerUpOutside.connect((e) => this.handleEvent(e)));
        this.regs.add(this._target.mouseWheel.connect((e) => this.handleEvent(e)));
    }

    private initPointerCapture() {
        if (this._activePointerCapture) return;

        // If we start dragging, continue the drag even if we go over other objects,
        // don't fire the mouseup on them if we release over them, etc.
        this._activePointerCapture = new PointerCapture(this._target.display, (captured) => {
            captured.stopPropagation();

            this.handleEvent(captured);
            if (captured.type === 'pointerup' || captured.type === 'pointercancel') {
                this._activePointers.delete((captured as FederatedPointerEvent).pointerId);
                this.releasePointerCapture();
            }
        });
        this.addObject(this._activePointerCapture);
    }

    private releasePointerCapture() {
        if (this._activePointerCapture && this._activePointers.size === 0) {
            this.removeObject(this._activePointerCapture);
            this._activePointerCapture = null;
        }
    }

    private handleEvent(e: FederatedPointerEvent | FederatedWheelEvent) {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();

        if (e instanceof FederatedWheelEvent) {
            this._domElement.dispatchEvent(new WheelEvent(e.type, e));
            return;
        }

        if (e.type === 'pointerdown') {
            this.initPointerCapture();
            this._activePointers.set(e.pointerId, true);
        }

        if (e.type === 'pointerup' || e.type === 'pointercancel') {
            this._activePointers.delete(e.pointerId);
            this.releasePointerCapture();
        }

        // We're building this for NGL, which doesn't support pointer events. If it did, we could
        // probably just send it a PointerEvent instead of the shenanigans with converting to
        // mouse or touch events, but here we are. See https://github.com/nglviewer/ngl/issues/902
        if (e.pointerType === 'touch') {
            const touchEventType = this.pointerEventTypeToTouchEventType(e.type);
            if (!touchEventType) return;

            const originalTouch = e.nativeEvent instanceof TouchEvent
                ? this.getTouchById(e.nativeEvent, e.pointerId) : e.nativeEvent;
            // This shouldn't be possible, amd would likely cause issues since the position would be
            // set to 0, 0 or something like that
            if (!originalTouch) throw new Error('Forwarding touch event where the original touch could not be found');

            const touch = new Touch({
                identifier: e.pointerId,
                // Technically this should probably be the Pixi canvas if it originated outside of the
                // target to indicate that it originally came from somewhere else, but we don't currently
                // interop with anything that relies on that, so I won't bother with that for now. If it
                // becomes important, we can use a PointerCapture and record interactions elsewhere,
                // and change this if the initial start of the touch came from elsewhere
                target: this._domElement,
                clientX: originalTouch.clientX,
                clientY: originalTouch.clientY,
                screenX: originalTouch.screenX,
                screenY: originalTouch.screenY,
                pageX: originalTouch.pageX,
                pageY: originalTouch.pageY,
                radiusX: e.width,
                radiusY: e.height,
                force: e.pressure
            });

            if (e.type === 'pointerup' || e.type === 'pointerupoutside' || e.type === 'pointercancel') {
                this._touchesCache.delete(e.pointerId);
            } else {
                this._touchesCache.set(e.pointerId, touch);
            }

            const init: TouchEventInit = {
                cancelable: true,
                bubbles: true,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                shiftKey: e.shiftKey,
                touches: Array.from(this._touchesCache.values()),
                // Like how we set the touch target above, this should technically be set based on
                // touches initially triggered on the DisplayObject, but we don't need that right now.
                targetTouches: [],
                // It's possible there may be some weirdness from the fact we're changing touches
                // one by one rather than as a whole group, but that's what Pixi gives us so hopefully
                // that won't cause problems.
                changedTouches: [touch]
            };
            this._domElement.dispatchEvent(new TouchEvent(touchEventType, init));
        } else {
            const mouseEventType = this.pointerEventTypeToMouseEventType(e.type);
            if (!mouseEventType) return;

            const init: MouseEventInit = {
                cancelable: true,
                bubbles: true,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                shiftKey: e.shiftKey,
                button: e.button,
                buttons: e.buttons,
                clientX: e.clientX,
                clientY: e.clientY,
                movementX: e.movementX,
                movementY: e.movementY,
                screenX: e.screenX,
                screenY: e.screenY
            };
            this._domElement.dispatchEvent(new MouseEvent(mouseEventType, init));
        }
    }

    private getTouchById(e: TouchEvent, identifier: number): Touch | null {
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === identifier) return e.touches[i];
        }
        return null;
    }

    private pointerEventTypeToMouseEventType(pointerEventType: string): string | null {
        switch (pointerEventType) {
            case 'pointercancel': return null;
            case 'pointerdown': return 'mousedown';
            case 'pointermove': return 'mousemove';
            case 'pointerout': return 'mouseleave';
            case 'pointerover': return 'mouseenter';
            // For some reason, EventSystem is firing click not pointertap https://github.com/pixijs/pixijs/issues/9035
            case 'click': return 'click';
            case 'pointertap': return 'click';
            case 'pointerup': return 'mouseup';
            case 'pointerupoutside': return null;
            default: return null;
        }
    }

    private pointerEventTypeToTouchEventType(pointerEventType: string): string | null {
        switch (pointerEventType) {
            case 'pointercancel': return 'touchcancel';
            case 'pointerdown': return 'touchstart';
            case 'pointermove': return 'touchmove';
            case 'pointerout': return null;
            case 'pointerover': return null;
            // For some reason, EventSystem is firing click not pointertap https://github.com/pixijs/pixijs/issues/9035
            case 'click': return null;
            case 'pointertap': return null;
            case 'pointerup': return 'touchend';
            case 'pointerupoutside': return null;
            default: return null;
        }
    }

    private _target: SceneObject;
    private _domElement: HTMLElement;

    private _activePointerCapture: PointerCapture | null = null;
    private _touchesCache = new Map<number, Touch>();
    private _activePointers = new Map<number, boolean>();
}
