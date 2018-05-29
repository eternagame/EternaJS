import {AbstractSignal} from "./AbstractSignal";

/** A signal that emits an event with no associated data. */
export class UnitSignal extends AbstractSignal<void> {
    /** Causes this signal to emit an event to its connected slots. */
    public emit(): void {
        this.notifyEmit(null);
    }
}
