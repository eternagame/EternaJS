import {Graphics} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {IsLeftMouse} from "../../flashbang/input/InputUtil";
import {KeyboardListener} from "../../flashbang/input/KeyboardInput";
import {PointerCapture} from "../../flashbang/input/PointerCapture";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";

/** Dialogs that expose a "confirmed" promise will reject with this error if the dialog is canceled */
export class DialogCanceledError extends Error {}

/** Convenience base class for dialog objects. */
export abstract class Dialog<T> extends ContainerObject implements KeyboardListener {
    /** A Promise that will resolve when the dialog is closed. */
    public readonly closed: Promise<T | null>;

    public constructor() {
        super();
        this.closed = new Promise(resolve => this._resolvePromise = resolve);
    }

    protected added() {
        super.added();

        let bg = new Graphics();
        this.container.addChild(bg);

        // eat clicks on our BG
        let capture = new PointerCapture(bg);
        capture.beginCapture(e => {
            if (IsLeftMouse(e)) {
                e.stopPropagation();
                if (e.type === "pointerdown") {
                    this.onBGClicked();
                }
            }
        });

        this.regs.add(this.mode.keyboardInput.pushListener(this));

        let updateBG = () => {
            bg.clear()
                .beginFill(0x0, this.bgAlpha)
                .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
                .endFill();
        };
        updateBG();
        this.regs.add(this.mode.resized.connect(updateBG));
    }

    /**
     * Called when the dim background behind the dialog is clicked.
     * Subclasses can override to e.g. close the dialog.
     */
    protected onBGClicked(): void {
    }

    protected close(value: T) {
        if (this._isClosed) {
            return;
        }
        this._isClosed = true;
        this._resolvePromise(value);
        this.destroySelf();
    }

    protected removed() {
        this.close(null);
        super.removed();
    }

    protected get bgAlpha() :number {
        return 0.7;
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        // By default, dialogs eat all keyboard input
        return true;
    }

    protected _resolvePromise: (value: T) => void;
    protected _isClosed: boolean;
}
