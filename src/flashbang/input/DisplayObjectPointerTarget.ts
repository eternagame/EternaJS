import {DisplayObject} from 'pixi.js';
import {SignalView} from 'signals';
import EventSignal from 'flashbang/util/EventSignal';
import PointerTarget from './PointerTarget';

type InteractionEvent = PIXI.interaction.InteractionEvent;

export default class DisplayObjectPointerTarget implements PointerTarget {
    public readonly target: DisplayObject;

    constructor(disp: DisplayObject) {
        this.target = disp;
        disp.interactive = true;
    }

    public get pointerOver(): SignalView<InteractionEvent> {
        if (this._pointerOver == null) {
            this._pointerOver = new EventSignal(this.target, 'pointerover');
        }
        return this._pointerOver;
    }

    public get pointerOut(): SignalView<InteractionEvent> {
        if (this._pointerOut == null) {
            this._pointerOut = new EventSignal(this.target, 'pointerout');
        }
        return this._pointerOut;
    }

    public get pointerDown(): SignalView<InteractionEvent> {
        if (this._pointerDown == null) {
            this._pointerDown = new EventSignal(this.target, 'pointerdown');
        }
        return this._pointerDown;
    }

    public get pointerMove(): SignalView<InteractionEvent> {
        if (this._pointerMoved == null) {
            this._pointerMoved = new EventSignal(this.target, 'pointermove');
        }
        return this._pointerMoved;
    }

    public get pointerUp(): SignalView<InteractionEvent> {
        if (this._pointerUp == null) {
            this._pointerUp = new EventSignal(this.target, 'pointerup');
        }
        return this._pointerUp;
    }

    public get pointerTap(): SignalView<InteractionEvent> {
        if (this._pointerTap == null) {
            this._pointerTap = new EventSignal(this.target, 'pointertap');
        }
        return this._pointerTap;
    }

    // lazily instantiated
    private _pointerOver: EventSignal;
    private _pointerOut: EventSignal;
    private _pointerDown: EventSignal;
    private _pointerMoved: EventSignal;
    private _pointerUp: EventSignal;
    private _pointerTap: EventSignal;
}
