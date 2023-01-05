import {FederatedEvent} from '@pixi/events';
import {utils as PixiUtils} from 'pixi.js';
import {
    AbstractSignal, FilteredSignal, MappedSignal, SignalView
} from 'signals';

/** Redispatches a pixi FederatedPointerEvent as a Signal */
export default class EventSignal<FEvent extends FederatedEvent> extends AbstractSignal<FEvent>
    implements SignalView<FEvent> {
    constructor(target: PixiUtils.EventEmitter, eventType: string | symbol) {
        super();
        this._target = target;
        this._eventType = eventType;
    }

    public emit(e: FEvent) {
        this.notifyEmit(e);
    }

    public map<U>(func: (value: FEvent) => U): SignalView<U> {
        return MappedSignal.create(this, func);
    }

    public filter(pred: (value: FEvent) => boolean): SignalView<FEvent> {
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
            this._target.addListener(this._eventType, this._emitEvent);
        }
    }

    protected disconnectFromSource(): void {
        if (this._connected) {
            this._connected = false;
            this._target.removeListener(this._eventType, this._emitEvent);
        }
    }

    protected _target: PixiUtils.EventEmitter;
    protected _eventType: string | symbol;
    protected _connected: boolean;

    private readonly _emitEvent = (e: FEvent) => this.notifyEmit(e);
}
