import {DisplayObject, Container} from 'pixi.js';
import Flashbang from 'flashbang/core/Flashbang';
import {Assert} from 'flashbang';

type InteractionPointerEvents = PIXI.interaction.InteractionPointerEvents;
type InteractionEvent = PIXI.interaction.InteractionEvent;

export default class PointerCapture {
    constructor(root: Container) {
        this._root = root;
    }

    /**
     * Begins capturing pointer input. All pointer events not related to that DisplayObject will be
     * routed to the given callback function before they reach their intended target. The callback
     * can call {@link PIXI.interaction.InteractionEvent.stopPropagation} to prevent the event from
     * being processed further.
     */
    public beginCapture(onEvent: (e: InteractionEvent) => void): void {
        if (this.hasCapture) {
            return;
        }

        this._rootWasInteractive = this._root.interactive;
        this._root.interactive = true;

        this._onEvent = onEvent;

        PointerCapture._captures.push(this);

        if (!PointerCapture._registeredEvents) {
            Assert.assertIsDefined(Flashbang.pixi);
            for (let eventType of PointerCapture.POINTER_EVENTS) {
                Flashbang.pixi.renderer.plugins.interaction.addListener(eventType, PointerCapture.handleEvent);
            }
        }
    }

    private static handleEvent(e: InteractionEvent) {
        Assert.assertIsDefined(Flashbang.pixi);
        for (let capture of PointerCapture._captures.reverse()) {
            if (!Flashbang.pixi.renderer.plugins.interaction.hitTest(e.data.global, capture._root)) {
                Assert.assertIsDefined(capture._onEvent);
                capture._onEvent(e);
                if (e.stopped) return;
            }
        }
    }

    public endCapture(): void {
        if (!this.hasCapture) {
            return;
        }

        this._onEvent = null;
        this._root.interactive = this._rootWasInteractive;

        PointerCapture._captures.splice(PointerCapture._captures.indexOf(this), 1);

        if (PointerCapture._captures.length === 0) {
            Assert.assertIsDefined(Flashbang.pixi);
            for (let eventType of PointerCapture.POINTER_EVENTS) {
                Flashbang.pixi.renderer.plugins.interaction.removeListener(eventType, PointerCapture.handleEvent);
            }
        }
    }

    private get hasCapture(): boolean {
        return this._onEvent != null;
    }

    private readonly _root: Container;
    private _onEvent: ((e: InteractionEvent) => void) | null;
    private _rootWasInteractive: boolean;

    private static _registeredEvents: boolean = false;
    private static _captures: PointerCapture[] = [];

    private static readonly POINTER_EVENTS: InteractionPointerEvents[] = [
        'pointerdown', 'pointercancel', 'pointerup',
        'pointertap', 'pointerupoutside', 'pointermove',
        'pointerover', 'pointerout'
    ];
}
