import {PointerCapture} from "../../flashbang/input/PointerCapture";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Signal} from "../../signals/Signal";

/** Convenience base class for dialog objects. */
export abstract class Dialog<T> extends ContainerObject {
    /** Emitted when the user closes the dialog with the return value of dialog, if any. */
    public readonly closed: Signal<T> = new Signal();

    protected added() {
        super.added();

        let bg = DisplayUtil.fillStageRect(0x0, this.bgAlpha);
        this.container.addChild(bg);
        // eat clicks on our BG
        let capture = new PointerCapture(bg);
        capture.beginCapture((e) => {
            e.stopPropagation();
            if (e.type == "pointerdown") {
                this.onBGClicked();
            }
        });
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

    private _closed: boolean;
}
