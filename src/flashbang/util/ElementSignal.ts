import {
    AbstractSignal, FilteredSignal, MappedSignal, SignalView
} from 'signals';

/** Redispatches a DOM event as a Signal */
export default class ElementSignal<
    EventName extends keyof HTMLElementEventMap
> extends AbstractSignal<HTMLElementEventMap[EventName]>
    implements SignalView<HTMLElementEventMap[EventName]> {
    constructor(target: HTMLElement, eventType: EventName, capture = false) {
        super();
        this._target = target;
        this._eventType = eventType;
        this._capture = capture;
    }

    public emit(e: HTMLElementEventMap[EventName]) {
        this.notifyEmit(e);
    }

    public map<U>(func: (value: HTMLElementEventMap[EventName]) => U): SignalView<U> {
        return MappedSignal.create(this, func);
    }

    public filter(
        pred: (value: HTMLElementEventMap[EventName]) => boolean
    ): SignalView<HTMLElementEventMap[EventName]> {
        return new FilteredSignal(this, pred);
    }

    /* override */
    protected connectionAdded(): void {
        super.connectionAdded();
        if (!this._connected) {
            this.connectToSource();
        }
    }

    /* override */
    protected connectionRemoved(): void {
        super.connectionRemoved();
        if (!this.hasConnections && this._connected) {
            this.disconnectFromSource();
        }
    }

    protected connectToSource(): void {
        if (!this._connected) {
            this._connected = true;
            this._target.addEventListener<EventName>(this._eventType, this._emitEvent, {capture: this._capture});
        }
    }

    protected disconnectFromSource(): void {
        if (this._connected) {
            this._connected = false;
            this._target.removeEventListener<EventName>(this._eventType, this._emitEvent, {capture: this._capture});
        }
    }

    protected _target: HTMLElement;
    protected _eventType: EventName;
    protected _capture: boolean;
    protected _connected: boolean;

    private readonly _emitEvent = (e: HTMLElementEventMap[EventName]) => {
        this.notifyEmit(e);
    };
}
