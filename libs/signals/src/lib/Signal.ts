import AbstractSignal from './AbstractSignal';
import FilteredSignal from './FilteredSignal';
import MappedSignal from './MappedSignal';
import SignalView from './SignalView';

/** A signal that emits events of type {@code T}. */
export default class Signal<T> extends AbstractSignal<T> {
    public map<U>(func: (value: T) => U): SignalView<U> {
        return MappedSignal.create(this, func);
    }

    public filter(pred: (value: T) => boolean): SignalView<T> {
        return new FilteredSignal(this, pred);
    }

    /** Causes this signal to emit the supplied event to connected slots. */
    public emit(event: T): void {
        this.notifyEmit(event);
    }
}
