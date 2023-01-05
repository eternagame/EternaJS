import {FederatedPointerEvent, FederatedWheelEvent} from '@pixi/events';
import {DisplayObject} from 'pixi.js';
import {SignalView} from 'signals';

/** Exposes signals for an interactive object */
export default interface PointerTarget {
    /** the DisplayObject associated with this PointerTarget */
    target: DisplayObject;

    /** Fired when a 'pointerenter' event is dispatched on the object */
    pointerEnter: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerover' event is dispatched on the object */
    pointerOver: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerout' event is dispatched on the object */
    pointerOut: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerleave' event is dispatched on the object */
    pointerLeave: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerdown' event is dispatched on the object */
    pointerDown: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointermove' event is dispatched on the object */
    pointerMove: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerup' event is dispatched on the object */
    pointerUp: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerupoutside' event is dispatched on the object */
    pointerUpOutside: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointercancel' event is dispatched on the object */
    pointerCancel: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointertap' event is dispatched on the object */
    pointerTap: SignalView<FederatedPointerEvent>;

    /** Fired when a 'wheel' event is dispatched on the object */
    mouseWheel: SignalView<FederatedWheelEvent>;

    /** Fired when a 'pointerentercapture' event is dispatched on the object */
    pointerEnterCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerovercapture' event is dispatched on the object */
    pointerOverCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointeroutcapture' event is dispatched on the object */
    pointerOutCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerleavecapture' event is dispatched on the object */
    pointerLeaveCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerdowncapture' event is dispatched on the object */
    pointerDownCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointermovecapture' event is dispatched on the object */
    pointerMoveCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerupcapture' event is dispatched on the object */
    pointerUpCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointerupoutsidecapture' event is dispatched on the object */
    pointerUpOutsideCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointercancelcapture' event is dispatched on the object */
    pointerCancelCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'pointertapcapture' event is dispatched on the object */
    pointerTapCapture: SignalView<FederatedPointerEvent>;

    /** Fired when a 'wheelcapture' event is dispatched on the object */
    mouseWheelCapture: SignalView<FederatedWheelEvent>;
}
