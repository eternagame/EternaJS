import {FilteredSignal} from "./FilteredSignal";
import {MappedSignal} from "./MappedSignal";
import {Reactor} from "./Reactor";
import {SignalView} from "./SignalView";
import {Connection} from "./Connection";
import {RListener} from "./RListener";

/**
 * Handles the machinery of connecting slots to a signal and emitting events to them, without
 * exposing a public interface for emitting events. This can be used by entities which wish to
 * expose a signal-like interface for listening, without allowing external callers to emit signals.
 */
export class AbstractSignal<T> extends Reactor implements SignalView<T> {
    public map<U>(func: (value: T) => U): SignalView<U> {
        return MappedSignal.create(this, func);
    }

    public filter(pred: (value: T) => boolean): SignalView<T> {
        return new FilteredSignal(this, pred);
    }

    public connect(slot: (value: T) => void): Connection {
        return this.addConnection(slot);
    }

    public disconnect(slot: (value: T) => void): void {
        this.removeConnection(slot);
    }

    /**
     * Emits the supplied event to all connected slots.
     */
    protected notifyEmit(event: T): void {
        this.notify(AbstractSignal.EMIT, event, null, null);
    }

    protected static EMIT = (slot: RListener, event: Object, _1: Object, _2: Object) => {
        slot.onEmit(event);
    };
}
