import {Graphics} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {KeyboardListener} from "../../flashbang/input/KeyboardInput";
import {PointerCapture} from "../../flashbang/input/PointerCapture";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Signal} from "../../signals/Signal";

/** Convenience base class for dialog objects. */
export abstract class Dialog<T> extends ContainerObject implements KeyboardListener {
    /** Emitted when the user closes the dialog with the return value of dialog, if any. */
    public readonly closed: Signal<T> = new Signal();

    protected added() {
        super.added();

        let bg = new Graphics();
        this.container.addChild(bg);

        // eat clicks on our BG
        let capture = new PointerCapture(bg);
        capture.beginCapture((e) => {
            e.stopPropagation();
            if (e.type === "pointerdown") {
                this.onBGClicked();
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
        if (this._closed) {
            return;
        }
        this._closed = true;
        this.closed.emit(value);
        this.destroySelf();
    }

    protected get bgAlpha() :number {
        return 0.7;
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        // By default, dialogs eat all keyboard input
        return true;
    }

    private _closed: boolean;
}
