import {SignalConnections} from "typed-signals";
import {Flashbang} from "./Flashbang";
import {ModeStack} from "./ModeStack";
import {Updatable} from "./Updatable";

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
                this._regs.disconnectAll();
                this.disposeNow();
            }
        }
    }

    protected disposeNow(): void {
        this._modeStack.dispose();

        this._updatables = null;

        this._regs.disconnectAll();
        this._regs = null;

        this._pixi.destroy();
        this._pixi = null;
    }

    protected _pixi: PIXI.Application;
    protected _regs: SignalConnections = new SignalConnections();

    protected _isUpdating: boolean;
    protected _disposePending: boolean;
    protected _updatables: Updatable[] = [];
    protected _modeStack: ModeStack;
}
