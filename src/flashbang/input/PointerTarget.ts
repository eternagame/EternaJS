import {DisplayObject} from 'pixi.js';
import {SignalView} from 'signals';

type InteractionEvent = PIXI.interaction.InteractionEvent;

/** Exposes signals for an interactive object */
export default interface PointerTarget {
    /** the DisplayObject associated with this PointerTarget */
    target: DisplayObject;

    /** Fired when a 'pointerover' event is dispatched on the object */
    pointerOver: SignalView<InteractionEvent>;

    /** Fired when a 'pointerout' event is dispatched on the object */
    pointerOut: SignalView<InteractionEvent>;

    /** Fired when a 'pointerdown' event is dispatched on the object */
    pointerDown: SignalView<InteractionEvent>;

    /** Fired when a 'pointermove' event is dispatched on the object */
    pointerMove: SignalView<InteractionEvent>;

    /** Fired when a 'pointerup' event is dispatched on the object */
    pointerUp: SignalView<InteractionEvent>;

    /** Fired when a 'pointertap' event is dispatched on the object */
    pointerTap: SignalView<InteractionEvent>;
}
