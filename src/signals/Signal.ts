import {AbstractSignal} from "./AbstractSignal";

/** A signal that emits events of type {@code T}. */
export class Signal<T> extends AbstractSignal<T> {
    /** Causes this signal to emit the supplied event to connected slots. */
    public emit(event: T): void {
        this.notifyEmit(event);
    }
}
