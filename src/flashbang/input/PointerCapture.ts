import {DisplayObject,} from "pixi.js";

type InteractionPointerEvents = PIXI.interaction.InteractionPointerEvents;
type InteractionEvent = PIXI.interaction.InteractionEvent;

export class PointerCapture {
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
        for (let eventType of PointerCapture.POINTER_EVENTS) {
            this._root.addListener(eventType, this._onEvent);
        }
    }

    public endCapture(): void {
        if (!this.hasCapture) {
            return;
        }

        for (let eventType of PointerCapture.POINTER_EVENTS) {
            this._root.removeListener(eventType, this._onEvent);
        }

        this._onEvent = null;
        this._root.interactive = this._rootWasInteractive;
    }

    private get hasCapture(): boolean {
        return this._onEvent != null;
    }

    private readonly _root: DisplayObject;
    private _onEvent: (e: InteractionEvent) => void;
    private _rootWasInteractive: boolean;

    private static readonly POINTER_EVENTS: InteractionPointerEvents[] = [
        "pointerdown", "pointercancel", "pointerup",
        "pointertap", "pointerupoutside", "pointermove",
        "pointerover", "pointerout"
    ];
}
