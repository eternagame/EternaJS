import {Container} from "pixi.js";
import {UnitSignal} from "../../signals/UnitSignal";
import {Assert} from "../util/Assert";
import {MathUtil} from "../util/MathUtil";
import {AppMode} from "./AppMode";

/**
 * A stack of AppModes. Only the top-most mode in the stack gets updates
 * and other events - all other modes are inactive.
 */
export class ModeStack {
    public readonly topModeChanged: UnitSignal = new UnitSignal();

    constructor(parentSprite: Container) {
        parentSprite.addChild(this._container);
    }

    public get modes(): ReadonlyArray<AppMode> {
        return this._modeStack;
    }

    /**
     * Returns the number of modes currently on the mode stack. Be aware that this value might be
     * about to change if mode transitions have been queued that have not yet been processed.
     */
    public get length(): number {
        return this._modeStack.length;
    }

    /** Returns the top mode on the mode stack, or null if the stack is empty. */
    public /* final */ get topMode(): AppMode | null {
        return (this._modeStack.length > 0 ? this._modeStack[this._modeStack.length - 1] : null);
    }

    /**
     * Applies the specify mode transition to the mode stack.
     * (Mode changes take effect between game updates.)
     */
    public doModeTransition(type: ModeTransition, mode: AppMode = null, index: number = 0): void {
        let transition: PendingTransition = new PendingTransition();
        transition.type = type;
        transition.mode = mode;
        transition.index = index;
        this._pendingModeTransitionQueue.push(transition);
    }

    /**
     * Sets the index of a mode that may or may not already be in the ModeStack.
     * If the mode is already in the stack, it will be moved; otherwise it will be added.
     *
     * @param mode the AppMode to add or move
     * @param index the stack position to move the mode to.
     * You can use a negative integer to specify a position relative
     * to the top of the stack (for example, -1 is the top of the stack).
     */
    public setModeIndex(mode: AppMode, index: number): void {
        this.doModeTransition(ModeTransition.SET_INDEX, mode, index);
    }

    /**
     * Inserts a mode into the stack at the specified index. All modes
     * at and above the specified index will move up in the stack.
     * (Mode changes take effect between game updates.)
     *
     * @param mode the AppMode to add
     * @param index the stack position to add the mode at.
     * You can use a negative integer to specify a position relative
     * to the top of the stack (for example, -1 is the top of the stack).
     */
    public insertMode(mode: AppMode, index: number): void {
        this.doModeTransition(ModeTransition.INSERT, mode, index);
    }

    /**
     * Removes a mode from the stack at the specified index. All
     * modes above the specified index will move down in the stack.
     * (Mode changes take effect between game updates.)
     *
     * @param index the stack position to add the mode at.
     * You can use a negative integer to specify a position relative
     * to the top of the stack (for example, -1 is the top of the stack).
     */
    public removeMode(index: number): void {
        this.doModeTransition(ModeTransition.REMOVE, null, index);
    }

    /**
     * Pops the top mode from the stack, if the modestack is not empty, and pushes
     * a new mode in its place.
     * (Mode changes take effect between game updates.)
     */
    public changeMode(mode: AppMode): void {
        this.doModeTransition(ModeTransition.CHANGE, mode);
    }

    /**
     * Pushes a mode to the mode stack.
     * (Mode changes take effect between game updates.)
     */
    public pushMode(mode: AppMode): void {
        this.doModeTransition(ModeTransition.PUSH, mode);
    }

    /**
     * Pops the top mode from the mode stack.
     * (Mode changes take effect between game updates.)
     */
    public popMode(): void {
        this.doModeTransition(ModeTransition.REMOVE, null, -1);
    }

    /**
     * Pops all modes from the mode stack.
     * Mode changes take effect before game updates.
     */
    public popAllModes(): void {
        this.doModeTransition(ModeTransition.UNWIND);
    }

    /**
     * Pops modes from the stack until the specified mode is reached.
     * If the specified mode is not reached, it will be pushed to the top
     * of the mode stack.
     * Mode changes take effect before game updates.
     */
    public unwindToMode(mode: AppMode): void {
        this.doModeTransition(ModeTransition.UNWIND, mode);
    }

    /** Called when the app is resized */
    public onResized(): void {
        for (let mode of this._modeStack) {
            mode.resizeInternal();
        }
    }

    public update(dt: number): void {
        if (this._pendingModeTransitionQueue.length > 0) {
            // handleModeTransition generates a lot of garbage in memory, avoid calling it on
            // updates where it will NOOP anyway.
            this.handleModeTransitions();
        }

        // update the top mode
        if (this._modeStack.length > 0) {
            this._modeStack[this._modeStack.length - 1].updateInternal(dt);
        }
    }

    /* internal */
    handleModeTransitions(): void {
        if (this._pendingModeTransitionQueue.length <= 0) {
            return;
        }

        let initialTopMode: AppMode = this.topMode;

        const doPushMode = (newMode: AppMode) => {
            if (newMode == null) {
                throw new Error("Can't push a null mode to the mode stack");
            }

            this._modeStack.push(newMode);
            this._container.addChild(newMode.container);

            newMode.setupInternal(this);
        };

        const doInsertMode = (newMode: AppMode, index: number) => {
            if (newMode == null) {
                throw new Error("Can't insert a null mode in the mode stack");
            }

            if (index < 0) {
                index = this._modeStack.length + index;
            }
            index = MathUtil.clamp(index, 0, this._modeStack.length);

            this._modeStack.splice(index, 0, newMode);
            this._container.addChildAt(newMode.container, index);

            newMode.setupInternal(this);
        };

        const doRemoveMode = (index: number) => {
            if (this._modeStack.length === 0) {
                throw new Error("Can't remove a mode from an empty stack");
            }

            if (index < 0) {
                index = this._modeStack.length + index;
            }
            index = MathUtil.clamp(index, 0, this._modeStack.length - 1);

            // if the top mode is removed, make sure it's exited first
            let mode: AppMode = this._modeStack[index];
            if (mode === initialTopMode) {
                initialTopMode.exitInternal();
                initialTopMode = null;
            }

            mode.disposeInternal();
            this._modeStack.splice(index, 1);
        };

        const doSetIndex = (mode: AppMode, newIdx: number) => {
            if (mode == null) {
                throw new Error("Can't insert a null mode in the mode stack");
            }

            let prevIdx = this._modeStack.indexOf(mode);
            if (prevIdx < 0) {
                doInsertMode(mode, newIdx);
            } else {
                if (newIdx < 0) {
                    newIdx = this._modeStack.length + newIdx;
                }
                newIdx = MathUtil.clamp(newIdx, 0, this._modeStack.length - 1);
                if (prevIdx != newIdx) {
                    // Rearrange the modestack
                    this._modeStack.splice(prevIdx, 1);
                    this._modeStack.splice(newIdx, 0, mode);

                    // Rearrange mode containers
                    this._container.setChildIndex(mode.container, newIdx);
                }
            }
        };

        // create a new _pendingModeTransitionQueue right now
        // so that we can properly handle mode transition requests
        // that occur during the processing of the current queue
        let transitionQueue = this._pendingModeTransitionQueue;
        this._pendingModeTransitionQueue = [];

        for (let transition of transitionQueue) {
            let mode: AppMode = transition.mode;
            switch (transition.type) {
            case ModeTransition.PUSH:
                doPushMode(mode);
                break;

            case ModeTransition.INSERT:
                doInsertMode(mode, transition.index);
                break;

            case ModeTransition.REMOVE:
                doRemoveMode(transition.index);
                break;

            case ModeTransition.CHANGE:
                // a pop followed by a push
                if (this.topMode != null) {
                    doRemoveMode(-1);
                }
                doPushMode(mode);
                break;

            case ModeTransition.UNWIND:
                // pop modes until we find the one we're looking for
                while (this._modeStack.length > 0 && this.topMode !== mode) {
                    doRemoveMode(-1);
                }

                Assert.isTrue(this.topMode === mode || this._modeStack.length === 0);

                if (this._modeStack.length === 0 && mode != null) {
                    doPushMode(mode);
                }
                break;

            case ModeTransition.SET_INDEX:
                doSetIndex(mode, transition.index);
                break;
            }
        }

        // Update mode visibility. An opaque mode causes everything below it to be invisible.
        let hasOpaqueMode = false;
        for (let ii = this._modeStack.length - 1; ii >=0; --ii) {
            let mode = this._modeStack[ii];
            mode.container.visible = !hasOpaqueMode;
            if (mode.isOpaque) {
                hasOpaqueMode = true;
            }
        }

        let newTopMode = this.topMode;
        if (newTopMode !== initialTopMode) {
            if (initialTopMode != null) {
                initialTopMode.exitInternal();
            }

            if (newTopMode != null) {
                newTopMode.enterInternal();
            }
            this.topModeChanged.emit();
        }
    }

    /* internal */
    clearModeStackNow(): void {
        this._pendingModeTransitionQueue.length = 0;
        if (this._modeStack.length > 0) {
            this.popAllModes();
            this.handleModeTransitions();
        }
    }

    /* internal */
    dispose(): void {
        this.clearModeStackNow();
        this._modeStack = null;
        this._pendingModeTransitionQueue = null;
        this._container.destroy();
        this._container = null;
    }

    protected _container: Container = new Container();
    protected _modeStack: AppMode[] = [];
    protected _pendingModeTransitionQueue: PendingTransition[] = [];
}

export enum ModeTransition {
    PUSH, UNWIND, INSERT, REMOVE, CHANGE, SET_INDEX,
}

class PendingTransition {
    public mode: AppMode;
    public type: ModeTransition;
    public index: number;
}
