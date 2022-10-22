import {Registration} from 'signals';
import LinkedList from 'flashbang/util/LinkedList';
import {
    Assert, DisplayUtil, AppMode, Flashbang
} from 'flashbang';
import {Container, Point} from 'pixi.js';

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
        Assert.assertIsDefined(Flashbang.app.pixi);
        const interaction = Flashbang.app.pixi.renderer.plugins.interaction;
        let handled = false;
        try {
            for (
                let elt = this._listeners ? this._listeners.beginIteration() : null;
                elt != null;
                elt = elt.next
            ) {
                const pixiPoint = new Point();
                interaction.mapPositionToPoint(pixiPoint, e.clientX, e.clientY);
                // If the pointer is not visible or not over the object, skip
                handled = elt.data !== null
                    && elt.data.display.worldVisible
                    && DisplayUtil.hitTest(elt.data.display, pixiPoint)
                    && elt.data.onMouseWheelEvent(e);
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
