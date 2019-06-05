import {Registration} from "signals";
import {LinkedElement, LinkedList} from "../util";

export interface KeyboardListener {
    /**
     * Return true to indicate that the event has been fully handled and processing
     * should stop.
     */
    onKeyboardEvent(e: KeyboardEvent): boolean;
}

export default class KeyboardInput {
    public dispose(): void {
        this._listeners.dispose();
        this._listeners = null;
    }

    public handleKeyboardEvent(e: KeyboardEvent): boolean {
        let handled = false;
        try {
            for (let elt: LinkedElement<KeyboardListener> = this._listeners.beginIteration(); elt != null; elt = elt.next) {
                handled = elt.data.onKeyboardEvent(e);
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
     * Adds a listener to the KeyboardInput. Listeners are placed on a stack,
     * so the most recently-added listener gets the first chance at each event.
     */
    public pushListener(l: KeyboardListener): Registration {
        return this._listeners.pushFront(l);
    }

    /** Removes all listeners from the KeyboardInput */
    public clearListeners(): void {
        this._listeners.clear();
    }

    private _listeners: LinkedList<KeyboardListener> = new LinkedList();
}
