import Reactor from './Reactor';
import SignalView from './SignalView';
import Connection from './Connection';

/**
 * Handles the machinery of connecting slots to a signal and emitting events to them, without
 * exposing a public interface for emitting events. This can be used by entities which wish to
 * expose a signal-like interface for listening, without allowing external callers to emit signals.
 */
export default abstract class AbstractSignal<T> extends Reactor implements SignalView<T> {
    public abstract map<U>(func: (value: T) => U): SignalView<U>;

    public abstract filter(pred: (value: T) => boolean): SignalView<T>;

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
        this.notify(event);
    }
}
