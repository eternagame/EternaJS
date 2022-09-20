import {Graphics} from 'pixi.js';
import {
    ContainerObject,
    KeyboardListener,
    MouseWheelListener,
    DisplayObjectPointerTarget,
    InputUtil,
    Flashbang,
    Assert
} from 'flashbang';

/** Dialogs that expose a "confirmed" promise will reject with this error if the dialog is canceled */
export class DialogCanceledError extends Error {}

/** Convenience base class for dialog objects. */
export default abstract class Dialog<T> extends ContainerObject implements KeyboardListener, MouseWheelListener {
    /** A Promise that will resolve when the dialog is closed. */
    public readonly closed: Promise<T | null>;

    constructor(modal: boolean = true) {
        super();
        this._modal = modal;
        this.closed = new Promise((resolve) => { this._resolvePromise = resolve; });
    }

    protected added() {
        super.added();

        if (this._modal) {
            this.setupModalBackground();
        }
    }

    protected setupModalBackground(): void {
        const bg = new Graphics();
        this.container.addChild(bg);

        // Eat mouse events - make sure any objects created within the dialog should set
        // interactive to true and stop propogation if the event shouldn't be passed through to the bg
        const bgTarget = new DisplayObjectPointerTarget(bg);

        bgTarget.pointerDown.connect((e) => {
            if (InputUtil.IsLeftMouse(e)) {
                this.onBGClicked();
            }
            e.stopPropagation();
        });
        bgTarget.pointerUp.connect((e) => {
            e.stopPropagation();
        });
        bgTarget.pointerMove.connect((e) => {
            e.stopPropagation();
        });

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.keyboardInput.pushListener(this));
        this.regs.add(this.mode.mouseWheelInput.pushListener(this));

        const updateBG = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            bg.clear()
                .beginFill(0x0)
                .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
                .endFill();
            bg.alpha = this.bgAlpha;
        };
        updateBG();
        this.regs.add(this.mode.resized.connect(updateBG));
    }

    /**
     * Called when the dim background behind the dialog is clicked.
     * Subclasses can override to e.g. close the dialog.
     */
    protected onBGClicked(): void {
        // Is there a good reason not to enable this?
        // FIXME: Yes, in fact! Dialogs are used for overlays like "submitting..." which should not be
        // dismissible.
        this.close(null);
    }

    protected close(value: T | null) {
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

    protected get bgAlpha(): number {
        return 0.7;
    }

    public onKeyboardEvent(_e: KeyboardEvent): boolean {
        // By default, dialogs eat all keyboard input
        return true;
    }

    public onMouseWheelEvent(_e: WheelEvent): boolean {
        // By default, dialogs eat all mousewheel input
        return true;
    }

    protected _resolvePromise: (value: T | null) => void;
    protected _isClosed: boolean;
    protected _modal: boolean;
}
