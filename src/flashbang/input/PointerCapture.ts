import {Container, DisplayObject} from 'pixi.js';
import {Assert, Flashbang, GameObject} from 'flashbang';
import GraphicsObject from 'flashbang/objects/GraphicsObject';

type InteractionEvent = PIXI.interaction.InteractionEvent;

/**
 * Begins capturing pointer input. All pointer events not related to the passed Container will be
 * routed to the given callback function before they reach their intended target. The callback
 * can call {@link PIXI.interaction.InteractionEvent.stopPropagation} to prevent the event from
 * being processed further.
 *
 * Capture begins when this object is added as the child of another GameObject via GameObject#addObject,
 * and ends when it is removed via GameObject#removeObject
 *
 * Be aware that with the current implementation, we do intercept non-pointer events, but they
 * will never be propogated (though you should most likely be using pointer events anyways to
 * make sure it works on touchscreens, mice, etc!). However, non-pointer events will still be fired
 * on the original objects if stopPropogation is not called.
 *
 * Note that all events captured are actually events registered on a surface added to the very top
 * of the current mode - they do NOT represent an event fired on an arbitrary Container outside
 * the bounds of the passed Container. This is the only way we can intercept events from PIXI.
 */
export default class PointerCapture extends GameObject {
    constructor(root: Container, onEvent: (e: InteractionEvent) => void) {
        super();
        this._root = root;
        this._onEvent = onEvent;
        this._surface = new GraphicsObject();
        this._surface.display.alpha = 0;
    }

    protected added() {
        Assert.assertIsDefined(this.mode?.container);
        this.regs.add(this.mode.resized.connect(() => this.onModeResized()));
        this.onModeResized();

        this.addObject(this._surface, this.mode.container);

        // We're not listening to over, out, or upOutside since a) those would refer to our surface,
        // which isn't really meaningful, plus they're not providing the opportunity to prevent
        // any events on lower objects - eg if you stop propogation on a pointerup, PIXI won't then
        // continue to test children objects for a pointerUpOutside or pointerTap (pointerTap is
        // still provided here for the convinience of wanting to know when the surface is tapped)
        this.regs.add(this._surface.pointerDown.connect((e) => this.handleEvent(e)));
        this.regs.add(this._surface.pointerMove.connect((e) => this.handleEvent(e)));
        this.regs.add(this._surface.pointerUp.connect((e) => this.handleEvent(e)));
        this.regs.add(this._surface.pointerCancel.connect((e) => this.handleEvent(e)));
        this.regs.add(this._surface.pointerTap.connect((e) => this.handleEvent(e)));
    }

    public onModeResized() {
        Assert.assertIsDefined(this.mode);
        Assert.assertIsDefined(this.mode.container);
        this._surface.display.clear()
            .beginFill(0x0)
            .drawRect(0, 0, this.mode.container.width, this.mode.container.height)
            .endFill();
    }

    private handleEvent(e: InteractionEvent) {
        Assert.assertIsDefined(Flashbang.app.pixi);
        Assert.assertIsDefined(this.mode?.container);
        const interaction = Flashbang.app.pixi.renderer.plugins.interaction;

        this._surface.display.interactive = false;

        let hitObj: DisplayObject | null = interaction.hitTest(e.data.global);
        let isRootEvent = false;

        while (hitObj != null) {
            if (hitObj === this._root) {
                isRootEvent = true;
                break;
            }
            hitObj = hitObj.parent;
        }

        if (!isRootEvent) {
            this._onEvent(e);
        }

        // Let event continue propagating to siblings
        //
        // Some very rough inspiration from https://github.com/pixijs/pixi.js/issues/2921#issuecomment-493801249
        // Here be dragons, given that we're using internal portions of PIXI/turning off typechecking
        // Hopefully https://github.com/pixijs/pixi.js/issues/6926 will be addressed so that we no longer
        // need to do this.
        //
        // This should happen whether or not the event is related to the root object:
        // - If it is, we need to rerun the processing so that the appropriate events are fired on
        //   the right child of the root object.
        // - If it isn't, processing should only stop if stopPropagation was called - PIXI's pointer
        //   event processing atomatically handles that for us.

        /* eslint-disable @typescript-eslint/ban-ts-ignore */

        // @ts-ignore Not null
        e.target = null;

        let func;
        switch (e.type) {
            case 'pointerdown':
                // @ts-ignore Private
                func = interaction.processPointerDown;
                break;
            case 'pointermove':
                // @ts-ignore Private
                func = interaction.processPointerDown;
                break;
            case 'pointerup':
                // @ts-ignore Private
                func = interaction.processPointerUp;
                break;
            case 'pointercancel':
                // @ts-ignore Private
                func = interaction.processPointerCancel;
                break;
            default:
                break;
        }

        // FIXME: This changed to public in Pixi 5.3, remove me once we upgrade
        // @ts-ignore Protected
        if (func != null) interaction.processInteractive(e, interaction.lastObjectRendered, func, true);

        /* eslint-enable @typescript-eslint/ban-ts-ignore */

        this._surface.display.interactive = true;
    }

    private _root: Container;
    private _surface: GraphicsObject;
    private _onEvent: ((e: InteractionEvent) => void);
}
