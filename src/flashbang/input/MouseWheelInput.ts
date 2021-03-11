import {Registration} from 'signals';
import LinkedList from 'flashbang/util/LinkedList';
import {Assert, DisplayUtil, AppMode} from 'flashbang';
import {Container} from 'pixi.js';

export interface MouseWheelListener {
    /**
     * Return true to indicate that the event has been fully handled and processing
     * should stop.
     */
    onMouseWheelEvent(e: WheelEvent): boolean;
    display: Container;
    mode: AppMode | null;
}

export default class MouseWheelInput {
    public dispose(): void {
        if (this._listeners) this._listeners.dispose();
        this._listeners = null;
    }

    public handleMouseWheelEvent(e: WheelEvent): boolean {
        let handled = false;
        try {
            let smallestCandidateListenerWidth = Infinity;
            let smallestCandidateListener: MouseWheelListener | null = null;
            for (
                let elt = this._listeners ? this._listeners.beginIteration() : null;
                elt != null;
                elt = elt.next
            ) {
                if (
                    elt.data !== null
                    && elt.data.mode != null
                    && elt.data.mode.container != null
                ) {
                    const globalBoxBounds = DisplayUtil.getBoundsRelative(elt.data.display, elt.data.mode.container);
                    if (
                        e.x >= globalBoxBounds.x
                        && e.x <= globalBoxBounds.x + globalBoxBounds.width
                        && e.y >= globalBoxBounds.y
                        && e.y <= globalBoxBounds.y + globalBoxBounds.height
                        && globalBoxBounds.width < smallestCandidateListenerWidth
                    ) {
                        smallestCandidateListenerWidth = globalBoxBounds.width;
                        smallestCandidateListener = elt.data;
                    }
                }
            }

            if (smallestCandidateListener) {
                smallestCandidateListener.onMouseWheelEvent(e);
                handled = true;
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
