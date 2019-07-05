import {
    AbstractSignal, FilteredSignal, MappedSignal, SignalView
} from 'signals';

type InteractionEvent = PIXI.interaction.InteractionEvent;
type EventEmitter = PIXI.utils.EventEmitter;

/** Redispatches a pixi InteractionEvent as a Signal */
export default class EventSignal extends AbstractSignal<InteractionEvent> implements SignalView<InteractionEvent> {
    constructor(target: EventEmitter, eventType: string | symbol) {
        super();
        this._target = target;
        this._eventType = eventType;
    }

    public emit(e: InteractionEvent) {
        this.notifyEmit(e);
    }

    public map<U>(func: (value: InteractionEvent) => U): SignalView<U> {
        return MappedSignal.create(this, func);
    }

    public filter(pred: (value: InteractionEvent) => boolean): SignalView<InteractionEvent> {
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

    protected _target: EventEmitter;
    protected _eventType: string | symbol;
    protected _connected: boolean;

    private readonly _emitEvent = (e: InteractionEvent) => this.notifyEmit(e);
}
