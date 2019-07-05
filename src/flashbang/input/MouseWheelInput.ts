import {Registration} from 'signals';
import {LinkedElement, LinkedList} from '../util';

export interface MouseWheelListener {
    /**
     * Return true to indicate that the event has been fully handled and processing
     * should stop.
     */
    onMouseWheelEvent(e: WheelEvent): boolean;
}

export default class MouseWheelInput {
    public dispose(): void {
        this._listeners.dispose();
        this._listeners = null;
    }

    public handleMouseWheelEvent(e: WheelEvent): boolean {
        let handled = false;
        try {
            for (
                let elt: LinkedElement<MouseWheelListener> = this._listeners.beginIteration();
                elt != null;
                elt = elt.next
            ) {
                handled = elt.data.onMouseWheelEvent(e);
                if (handled) {
                    break;
                }
            }
        } finally {
            this._listeners.endIteration();
        }

        return handled;
    }

    /**
     * Adds a listener to the MouseWheelInput. Listeners are placed on a stack,
     * so the most recently-added listener gets the first chance at each event.
     */
    public pushListener(l: MouseWheelListener): Registration {
        return this._listeners.pushFront(l);
    }

    /** Removes all listeners from the MouseWheelInput */
    public clearListeners(): void {
        this._listeners.clear();
    }

    private _listeners: LinkedList<MouseWheelListener> = new LinkedList();
}
