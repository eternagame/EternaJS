import AbstractSignal from './AbstractSignal';
import FilteredSignal from './FilteredSignal';
import MappedSignal from './MappedSignal';
import SignalView from './SignalView';

/** A signal that emits an event with no associated data. */
export default class UnitSignal extends AbstractSignal<void> {
    public map<U>(func: (value: void) => U): SignalView<U> {
        return MappedSignal.create(this, func);
    }

    public filter(pred: (value: void) => boolean): FilteredSignal<void> {
        return new FilteredSignal(this, pred);
    }

    /** Causes this signal to emit an event to its connected slots. */
    public emit(): void {
        this.notifyEmit();
    }
}
