import {RegistrationGroup} from "../../signals/RegistrationGroup";
import {KeyCode} from "../input/KeyCode";
import {Flashbang} from "./Flashbang";
import {ModeStack} from "./ModeStack";
import {Updatable} from "./Updatable";
import {KeyboardEventType} from "../input/KeyboardEventType";

export class FlashbangApp {
    public get pixi(): PIXI.Application {
        return this._pixi;
    }

    public get modeStack(): ModeStack {
        return this._modeStack;
    }

    public run(): void {
        this._pixi = this.createPixi();
        document.body.appendChild(this._pixi.view);

        this._modeStack = new ModeStack(this._pixi.stage);

        Flashbang.registerApp(this);

        this.setup();
        this._modeStack.handleModeTransitions();

        this._pixi.ticker.add(delta => this.update(delta));

        window.addEventListener(KeyboardEventType.KEY_DOWN, (e: KeyboardEvent) => this.onKeyboardEvent(e));
        window.addEventListener(KeyboardEventType.KEY_UP, (e: KeyboardEvent) => this.onKeyboardEvent(e));
        window.addEventListener("wheel", (e: WheelEvent) => this.onMouseWheelEvent(e));
    }

    public addUpdatable(obj: Updatable): void {
        this._updatables.push(obj);
    }

    public removeUpdatable(obj: Updatable): void {
        let idx: number = this._updatables.indexOf(obj);
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
     * Creates and returns a PIXI.Application instance.
     * Subclasses can override to do custom initialization.
     */
    protected createPixi(): PIXI.Application {
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;
        return new PIXI.Application(800, 600, {backgroundColor: 0x1099bb});
    }

    protected update(tickerDelta: number): void {
        this._isUpdating = true;

        try {
            // convert PIXI's weird ticker delta into elapsed seconds
            let dt = tickerDelta / (PIXI.settings.TARGET_FPMS * 1000);

            // update all our updatables
            for (let updatable of this._updatables) {
                updatable.update(dt);
            }

            // update viewports
            this._modeStack.update(dt);

        } finally {
            this._isUpdating = false;

            // should the MainLoop be stopped?
            if (this._disposePending) {
                this._regs.close();
                this.disposeNow();
            }
        }
    }

    protected disposeNow(): void {
        this._modeStack.dispose();

        this._updatables = null;

        this._regs.close();
        this._regs = null;

        this._pixi.destroy();
        this._pixi = null;
    }

    protected onKeyboardEvent(e: KeyboardEvent): void {
        if (e.type == KeyboardEventType.KEY_DOWN) {
            this._keyDown.set(e.code, true);
        } else if (e.type == KeyboardEventType.KEY_UP) {
            this._keyDown.set(e.code, false);
        }

        let topMode = this._modeStack.topMode;
        if (topMode != null) {
            topMode.onKeyboardEvent(e);
        }
    }

    protected onMouseWheelEvent(e: WheelEvent): void {
        let topMode = this._modeStack.topMode;
        if (topMode != null) {
            topMode.onMouseWheelEvent(e);
        }
    }

    protected _pixi: PIXI.Application;
    protected _regs: RegistrationGroup = new RegistrationGroup();

    protected _isUpdating: boolean;
    protected _disposePending: boolean;
    protected _updatables: Updatable[] = [];
    protected _modeStack: ModeStack;

    protected _keyDown: Map<string, boolean> = new Map<string, boolean>();
}
