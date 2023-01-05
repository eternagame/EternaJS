import {DisplayObject} from 'pixi.js';
import {SignalView} from 'signals';
import EventSignal from 'flashbang/util/EventSignal';
import {FederatedPointerEvent, FederatedWheelEvent} from '@pixi/events';
import PointerTarget from './PointerTarget';

export default class DisplayObjectPointerTarget implements PointerTarget {
    public readonly target: DisplayObject;

    constructor(disp: DisplayObject) {
        this.target = disp;
        disp.interactive = true;
    }

    public get pointerEnter(): SignalView<FederatedPointerEvent> {
        if (this._pointerEnter == null) {
            this._pointerEnter = new EventSignal(this.target, 'pointerenter');
        }
        return this._pointerEnter;
    }

    public get pointerOver(): SignalView<FederatedPointerEvent> {
        if (this._pointerOver == null) {
            this._pointerOver = new EventSignal(this.target, 'pointerover');
        }
        return this._pointerOver;
    }

    public get pointerOut(): SignalView<FederatedPointerEvent> {
        if (this._pointerOut == null) {
            this._pointerOut = new EventSignal(this.target, 'pointerout');
        }
        return this._pointerOut;
    }

    public get pointerLeave(): SignalView<FederatedPointerEvent> {
        if (this._pointerLeave == null) {
            this._pointerLeave = new EventSignal(this.target, 'pointerleave');
        }
        return this._pointerLeave;
    }

    public get pointerDown(): SignalView<FederatedPointerEvent> {
        if (this._pointerDown == null) {
            this._pointerDown = new EventSignal(this.target, 'pointerdown');
        }
        return this._pointerDown;
    }

    public get pointerMove(): SignalView<FederatedPointerEvent> {
        if (this._pointerMoved == null) {
            this._pointerMoved = new EventSignal(this.target, 'pointermove');
        }
        return this._pointerMoved;
    }

    public get pointerUp(): SignalView<FederatedPointerEvent> {
        if (this._pointerUp == null) {
            this._pointerUp = new EventSignal(this.target, 'pointerup');
        }
        return this._pointerUp;
    }

    public get pointerUpOutside(): SignalView<FederatedPointerEvent> {
        if (this._pointerUpOutside == null) {
            this._pointerUpOutside = new EventSignal(this.target, 'pointerupoutside');
        }
        return this._pointerUpOutside;
    }

    public get pointerCancel(): SignalView<FederatedPointerEvent> {
        if (this._pointerCancel == null) {
            this._pointerCancel = new EventSignal(this.target, 'pointercancel');
        }
        return this._pointerCancel;
    }

    public get pointerTap(): SignalView<FederatedPointerEvent> {
        if (this._pointerTap == null) {
            this._pointerTap = new EventSignal(this.target, 'pointertap');
        }
        return this._pointerTap;
    }

    public get mouseWheel(): SignalView<FederatedWheelEvent> {
        if (this._mouseWheel == null) {
            this._mouseWheel = new EventSignal(this.target, 'wheel');
        }
        return this._mouseWheel;
    }

    public get pointerEnterCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerEnterCapture == null) {
            this._pointerEnterCapture = new EventSignal(this.target, 'pointerentercapture');
        }
        return this._pointerEnterCapture;
    }

    public get pointerOverCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerOverCapture == null) {
            this._pointerOverCapture = new EventSignal(this.target, 'pointerovercapture');
        }
        return this._pointerOverCapture;
    }

    public get pointerOutCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerOutCapture == null) {
            this._pointerOutCapture = new EventSignal(this.target, 'pointeroutcapture');
        }
        return this._pointerOutCapture;
    }

    public get pointerLeaveCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerLeaveCapture == null) {
            this._pointerLeaveCapture = new EventSignal(this.target, 'pointerleavecapture');
        }
        return this._pointerLeaveCapture;
    }

    public get pointerDownCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerDownCapture == null) {
            this._pointerDownCapture = new EventSignal(this.target, 'pointerdowncapture');
        }
        return this._pointerDownCapture;
    }

    public get pointerMoveCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerMovedCapture == null) {
            this._pointerMovedCapture = new EventSignal(this.target, 'pointermovecapture');
        }
        return this._pointerMovedCapture;
    }

    public get pointerUpCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerUpCapture == null) {
            this._pointerUpCapture = new EventSignal(this.target, 'pointerupcapture');
        }
        return this._pointerUpCapture;
    }

    public get pointerUpOutsideCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerUpOutsideCapture == null) {
            this._pointerUpOutsideCapture = new EventSignal(this.target, 'pointerupoutsidecapture');
        }
        return this._pointerUpOutsideCapture;
    }

    public get pointerCancelCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerCancelCapture == null) {
            this._pointerCancelCapture = new EventSignal(this.target, 'pointercancelcapture');
        }
        return this._pointerCancelCapture;
    }

    public get pointerTapCapture(): SignalView<FederatedPointerEvent> {
        if (this._pointerTapCapture == null) {
            this._pointerTapCapture = new EventSignal(this.target, 'pointertapcapture');
        }
        return this._pointerTapCapture;
    }

    public get mouseWheelCapture(): SignalView<FederatedWheelEvent> {
        if (this._mouseWheelCapture == null) {
            this._mouseWheelCapture = new EventSignal(this.target, 'wheelcapture');
        }
        return this._mouseWheelCapture;
    }

    // lazily instantiated
    private _pointerEnter: EventSignal<FederatedPointerEvent>;
    private _pointerOver: EventSignal<FederatedPointerEvent>;
    private _pointerOut: EventSignal<FederatedPointerEvent>;
    private _pointerLeave: EventSignal<FederatedPointerEvent>;
    private _pointerDown: EventSignal<FederatedPointerEvent>;
    private _pointerMoved: EventSignal<FederatedPointerEvent>;
    private _pointerUp: EventSignal<FederatedPointerEvent>;
    private _pointerUpOutside: EventSignal<FederatedPointerEvent>;
    private _pointerCancel: EventSignal<FederatedPointerEvent>;
    private _pointerTap: EventSignal<FederatedPointerEvent>;
    private _mouseWheel: EventSignal<FederatedWheelEvent>;
    private _pointerEnterCapture: EventSignal<FederatedPointerEvent>;
    private _pointerOverCapture: EventSignal<FederatedPointerEvent>;
    private _pointerOutCapture: EventSignal<FederatedPointerEvent>;
    private _pointerLeaveCapture: EventSignal<FederatedPointerEvent>;
    private _pointerDownCapture: EventSignal<FederatedPointerEvent>;
    private _pointerMovedCapture: EventSignal<FederatedPointerEvent>;
    private _pointerUpCapture: EventSignal<FederatedPointerEvent>;
    private _pointerUpOutsideCapture: EventSignal<FederatedPointerEvent>;
    private _pointerCancelCapture: EventSignal<FederatedPointerEvent>;
    private _pointerTapCapture: EventSignal<FederatedPointerEvent>;
    private _mouseWheelCapture: EventSignal<FederatedWheelEvent>;
}
