import * as log from 'loglevel';
import {
    settings, Application, SCALE_MODES, extensions, InteractionManager, Point
} from 'pixi.js';
import {RegistrationGroup, Value} from 'signals';
import KeyboardEventType from 'flashbang/input/KeyboardEventType';
import KeyCode from 'flashbang/input/KeyCode';
import Assert from 'flashbang/util/Assert';
import {EventSystem} from '@pixi/events';
import Flashbang from './Flashbang';
import ModeStack from './ModeStack';
import Updatable from './Updatable';

// Adds KeyboardEvent.code support to Edge
import 'js-polyfills/keyboard';

// Added in run()
declare module '@pixi/core' {
    interface AbstractRenderer {
        events: EventSystem
    }
}

export default class FlashbangApp {
    /** True if the app is foregrounded */
    public readonly isActive: Value<boolean> = new Value<boolean>(true);

    public get pixi(): Application | null {
        return this._pixi;
    }

    public get modeStack(): ModeStack {
        return this._modeStack;
    }

    public run(): void {
        window.addEventListener('error', (e: ErrorEvent) => this.onUncaughtError(e));

        extensions.remove(InteractionManager);
        this._pixi = this.createPixi();
        // Declared on Renderer at the top of this file
        this._pixi.renderer.addSystem(EventSystem, 'events');
        Assert.assertIsDefined(this.pixiParent);
        this.pixiParent.appendChild(this._pixi.view);
        this._managedInputElements.push(this._pixi.view);

        this._pixi.stage.name = 'Stage';
        this._modeStack = new ModeStack(this._pixi.stage);

        Flashbang._registerApp(this);

        this.setup();
        this._modeStack._handleModeTransitions();

        this._pixi.ticker.add((delta) => this.update(delta));

        // @ts-expect-error Event type is actually FederatedPointerEvent
        (this._pixi.stage).addEventListener('pointermove', (e: FederatedPointerEvent) => {
            this._globalMouse = e.global.clone();
        });

        window.addEventListener(KeyboardEventType.KEY_DOWN, (e) => this.onKeyboardEvent(e));
        window.addEventListener(KeyboardEventType.KEY_UP, (e) => this.onKeyboardEvent(e));
        window.addEventListener('contextmenu', (e) => this.onContextMenuEvent(e));
        window.addEventListener('focus', () => { this.isActive.value = true; });
        window.addEventListener('blur', () => { this.isActive.value = false; });

        this.isActive.connect((value) => this.onIsActiveChanged(value));
    }

    public get view(): HTMLCanvasElement {
        Assert.assertIsDefined(this._pixi);
        return this._pixi.view;
    }

    public resize(width: number, height: number): void {
        Assert.assertIsDefined(this._pixi);
        if (width !== this._pixi.renderer.screen.width || height !== this._pixi.renderer.screen.height) {
            this._pixi.renderer.resize(width, height);
            this._modeStack.onResized();
        }
    }

    public addUpdatable(obj: Updatable): void {
        Assert.assertIsDefined(this._updatables);
        this._updatables.push(obj);
    }

    public removeUpdatable(obj: Updatable): void {
        Assert.assertIsDefined(this._updatables);
        const idx: number = this._updatables.indexOf(obj);
        if (idx >= 0) {
            this._updatables.splice(idx, 1);
        }
    }

    /** true if the key with the given code is down. See KeyCode for a list of possible values. */
    public isKeyDown(code: string): boolean {
        return this._keyDown.get(code) === true;
    }

    /** true if ShiftLeft or ShiftRight is down */
    public get isShiftKeyDown(): boolean {
        return this.isKeyDown(KeyCode.ShiftLeft) || this.isKeyDown(KeyCode.ShiftRight);
    }

    /** true if AltLeft or AltRight is down */
    public get isAltKeyDown(): boolean {
        return this.isKeyDown(KeyCode.AltLeft) || this.isKeyDown(KeyCode.AltRight);
    }

    public get isControlKeyDown(): boolean {
        return this.isKeyDown(KeyCode.ControlLeft) || this.isKeyDown(KeyCode.ControlRight);
    }

    public get isMetaKeyDown(): boolean {
        return this.isKeyDown(KeyCode.MetaLeft) || this.isKeyDown(KeyCode.MetaRight);
    }

    /**
     * Called at the end of the initialization process.
     * Subclasses should override this to push their initial AppMode to the mode stack
     */
    protected setup(): void {
    }

    /**
     * Creates a PIXI.Application instance.
     * Subclasses can override to do custom initialization.
     */
    protected createPixi(): Application {
        settings.SCALE_MODE = SCALE_MODES.LINEAR;
        return new Application({width: 800, height: 600, backgroundColor: 0x1099bb});
    }

    /** The HTMLElement that the PIXI application will be added to. */
    protected get pixiParent(): HTMLElement | null {
        return document.body;
    }

    protected update(tickerDelta: number): void {
        this._isUpdating = true;

        try {
            // This seems to aways be set. TODO: Investigate
            Assert.assertIsDefined(settings.TARGET_FPMS);
            // convert PIXI's weird ticker delta into elapsed seconds
            const dt = tickerDelta / (settings.TARGET_FPMS * 1000);

            // update all our updatables
            if (this._updatables) {
                for (const updatable of this._updatables) {
                    updatable.update(dt);
                }
            }

            // update viewports
            this._modeStack.update(dt);
        } finally {
            this._isUpdating = false;

            // should the MainLoop be stopped?
            if (this._disposePending) {
                if (this._regs) this._regs.close();
                this.disposeNow();
            }
        }
    }

    protected disposeNow(): void {
        this._modeStack._dispose();

        this._updatables = null;

        if (this._regs) this._regs.close();
        this._regs = null;

        if (this._pixi) this._pixi.destroy();
        this._pixi = null;

        Flashbang.dispose();
    }

    protected onKeyboardEvent(e: KeyboardEvent): void {
        if (e.type === KeyboardEventType.KEY_DOWN) {
            this._keyDown.set(e.code, true);
        } else if (e.type === KeyboardEventType.KEY_UP) {
            this._keyDown.set(e.code, false);
        }

        const {topMode} = this._modeStack;
        if (topMode != null) {
            topMode.onKeyboardEvent(e);
        }
    }

    protected onContextMenuEvent(e: Event): void {
        const target = e.target;
        if (target instanceof HTMLElement && !this._managedInputElements.some((el) => el.contains(target))) return;

        const {topMode} = this._modeStack;
        if (topMode != null) {
            topMode.onContextMenuEvent(e);
        }
    }

    public addManagedInputElement(el: HTMLElement) {
        this._managedInputElements.push(el);
    }

    public removeManagedInputElement(el: HTMLElement) {
        this._managedInputElements = this._managedInputElements.filter((managed) => managed !== el);
    }

    /** Called when the app activates or deactivates */
    protected onIsActiveChanged(isActive: boolean): void {
        if (isActive) {
            // Clear our keydown state when the app is foregrounded, since
            // we don't know what happened to the keyboard state in the interim.
            this._keyDown.clear();
        }
    }

    /**
     * Called when an uncaught error is thrown. No assumptions should be made about the state
     * of the application when this is called!
     */
    protected onUncaughtError(e: ErrorEvent): void {
        log.error(e);
    }

    public get globalMouse(): Point {
        return this._globalMouse;
    }

    private _globalMouse: Point = new Point();

    protected _pixi: Application | null;
    protected _regs: RegistrationGroup | null = new RegistrationGroup();

    protected _isUpdating: boolean;
    protected _disposePending: boolean;
    protected _updatables: Updatable[] | null = [];
    protected _modeStack: ModeStack;

    protected _keyDown: Map<string, boolean> = new Map<string, boolean>();
    protected _managedInputElements: HTMLElement[] = [];
}
