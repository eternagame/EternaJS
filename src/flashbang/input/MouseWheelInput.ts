import {Registration} from 'signals';
import LinkedList, {LinkedElement} from 'flashbang/util/LinkedList';
import {Assert} from 'flashbang';

export interface MouseWheelListener {
    /**
     * Return true to indicate that the event has been fully handled and processing
     * should stop.
     */
    onMouseWheelEvent(e: WheelEvent): boolean;
}

export default class MouseWheelInput {
    public dispose(): void {
        if (this._listeners) this._listeners.dispose();
        this._listeners = null;
    }

    public handleMouseWheelEvent(e: WheelEvent): boolean {
        let handled = false;
        try {
            for (
                let elt = this._listeners ? this._listeners.beginIteration() : null;
                elt != null;
                elt = elt.next
            ) {
                handled = elt.data !== null && elt.data.onMouseWheelEvent(e);
                if (handled) {
                    break;
                }
            }
        } finally {
            if (this._listeners) this._listeners.endIteration();
        }

        return handled;
    }

    /**
     * Adds a listener to the MouseWheelInput. Listeners are placed on a stack,
     * so the most recently-added listener gets the first chance at each event.
     */
    public pushListener(l: MouseWheelListener): Registration {
        Assert.assertIsDefined(this._listeners);
        return this._listeners.pushFront(l);
    }

    /** Removes all listeners from the MouseWheelInput */
    public clearListeners(): void {
        Assert.assertIsDefined(this._listeners);
        this._listeners.clear();
    }

    private _listeners: LinkedList<MouseWheelListener> | null = new LinkedList();
}
