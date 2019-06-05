import {DisplayObject} from "pixi.js";
import {Flashbang} from "../core";

type InteractionPointerEvents = PIXI.interaction.InteractionPointerEvents;
type InteractionEvent = PIXI.interaction.InteractionEvent;

export default class PointerCapture {
    public constructor(root: DisplayObject) {
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
            for (let eventType of PointerCapture.POINTER_EVENTS) {
                Flashbang.pixi.renderer.plugins.interaction.addListener(eventType, PointerCapture.handleEvent);
            }
        }
    }

    private static handleEvent(e: InteractionEvent) {
        for (let capture of PointerCapture._captures.reverse()) {
            if (!Flashbang.pixi.renderer.plugins.interaction.hitTest(e.data.global, capture._root)) {
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
            for (let eventType of PointerCapture.POINTER_EVENTS) {
                Flashbang.pixi.renderer.plugins.interaction.removeListener(eventType, PointerCapture.handleEvent);
            }
        }
    }

    private get hasCapture(): boolean {
        return this._onEvent != null;
    }

    private readonly _root: DisplayObject;
    private _onEvent: (e: InteractionEvent) => void;
    private _rootWasInteractive: boolean;

    private static _registeredEvents: boolean = false;
    private static _captures: PointerCapture[] = [];

    private static readonly POINTER_EVENTS: InteractionPointerEvents[] = [
        "pointerdown", "pointercancel", "pointerup",
        "pointertap", "pointerupoutside", "pointermove",
        "pointerover", "pointerout"
    ];
}
