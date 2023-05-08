import {Container} from 'pixi.js';
import {
    RegistrationGroup, Signal, SignalView, UnitSignal
} from 'signals';
import KeyboardInput from 'flashbang/input/KeyboardInput';
import Assert from 'flashbang/util/Assert';
import PointerTarget from 'flashbang/input/PointerTarget';
import DisplayObjectPointerTarget from 'flashbang/input/DisplayObjectPointerTarget';
import {FederatedPointerEvent, FederatedWheelEvent} from '@pixi/events';
import GameObject from './GameObject';
import GameObjectBase from './GameObjectBase';
import GameObjectRef from './GameObjectRef';
import LateUpdatable from './LateUpdatable';
import ModeStack from './ModeStack';
import Updatable from './Updatable';

// AMW: we are disabling the ban on Object (preferring Record<string, any>)
// because Object is a clearer description of what we want and because we
// can't use such a generic Record anyway due to eslint.
// eslint-disable-next-line @typescript-eslint/ban-types
export type ObjectID = Object | string;

export default class AppMode implements PointerTarget {
    /** Default keyboard input processor */
    public readonly keyboardInput: KeyboardInput = new KeyboardInput();

    /** Emitted at the beginning of the update process */
    public get updateBegan(): SignalView<number> { return this._updateBegan; }
    /** Emitted after updateBegan has completed. */
    public get lateUpdate(): SignalView<number> { return this._lateUpdate; }
    /** Emitted when the mode is entered */
    public get entered(): SignalView<void> { return this._entered; }
    /** Emitted when the mode is exited */
    public get exited(): SignalView<void> { return this._exited; }
    /** Emitted when the app is resized while this mode is active. */
    public get resized(): SignalView<void> { return this._resized; }
    /** Emitted when the mode is disposed */
    public get disposed(): SignalView<void> { return this._disposed; }

    /**
     * A convenience function that converts an Array of GameObjectRefs into an array of GameObjects.
     * The resultant Array will not have any null objects, so it may be smaller than the Array
     * that was passed in.
     */
    public static getObjects(objectRefs: GameObjectRef[]): GameObject[] {
        // Array.map would be appropriate here, except that the resultant
        // Array might contain fewer entries than the source.

        const objs: GameObject[] = [];
        for (const ref of objectRefs) {
            if (!ref.isNull) {
                objs.push(ref.object as GameObject);
            }
        }

        return objs;
    }

    constructor() {
        class AppModeContainer extends Container {}
        this._container = new AppModeContainer();
        // Convenience so that the flashbang class name shows in the Pixi devtools
        Object.defineProperty(AppModeContainer, 'name', {value: this.constructor.name});

        this._rootObject = new RootObject(this);
        if (this.container) this.container.interactiveChildren = false;
    }

    public get regs(): RegistrationGroup | null {
        return this._regs;
    }

    /** The PIXI Container that all this mode's DisplayObjects should live within */
    public get container(): Container | null {
        return this._container;
    }

    /** Returns the ModeStack that this AppMode lives in */
    public /* final */ get modeStack(): ModeStack | null {
        return this._modeStack;
    }

    /** Removes the GameObject with the given id from the ObjectDB, if it exists. */
    public destroyObjectWithId(id: ObjectID): void {
        const obj: GameObjectBase | undefined = this.getObjectWithId(id);
        if (obj !== undefined) {
            obj.destroySelf();
        }
    }

    /** Returns the object in this mode with the given ID, or null if no such object exists. */
    public getObjectWithId(id: ObjectID): GameObjectBase | undefined {
        return this._idObjects ? this._idObjects.get(id) : undefined;
    }

    /** @return total time the mode has been running, as measured by calls to update(). */
    public get time(): number {
        return this._runningTime;
    }

    /** True if the mode is opaque. Opaque modes hide all modes below them in the stack. */
    public get isOpaque(): boolean {
        return false;
    }

    /**
     * Returns a Promise that will succeed when the mode is active.
     * If the mode is currently active, the Promise will immediately resolve.
     * Otherwise, it will resolve when the mode is next entered.
     * If the mode is disposed before being re-entered, the Promise will fail.
     */
    public waitTillActive(): Promise<void> {
        if (this._isDiposed) {
            return Promise.reject(new Error('Mode is already disposed'));
        } else if (this._isActive) {
            return Promise.resolve();
        } else {
            return new Promise((resolve, reject) => {
                this._entered.connect(() => {
                    // if (resolve != null) {
                    const fn = resolve;
                    // resolve = null;
                    // reject = null;
                    fn();
                    // }
                });

                this._disposed.connect(() => {
                    // if (reject != null) {
                    const fn = reject;
                    // resolve = null;
                    // reject = null;
                    fn('Mode was disposed');
                    // }
                });
            });
        }
    }

    public addObject(
        obj: GameObjectBase, displayParent: Container | null = null, displayIdx: number = -1
    ): GameObjectRef {
        Assert.assertIsDefined(this._rootObject);
        return this._rootObject.addObject(obj, displayParent, displayIdx);
    }

    public addNamedObject(
        name: string, obj: GameObjectBase, displayParent: Container | null = null, displayIdx: number = -1
    ): GameObjectRef {
        Assert.assertIsDefined(this._rootObject);
        return this._rootObject.addNamedObject(name, obj, displayParent, displayIdx);
    }

    public replaceNamedObject(
        name: string, obj: GameObjectBase, displayParent: Container | null = null, displayIdx: number = -1
    ): GameObjectRef {
        Assert.assertIsDefined(this._rootObject);
        return this._rootObject.replaceNamedObject(name, obj, displayParent, displayIdx);
    }

    public getNamedObject(name: string): GameObjectBase | null {
        Assert.assertIsDefined(this._rootObject);
        return this._rootObject.getNamedObject(name);
    }

    public hasNamedObject(name: string): boolean {
        Assert.assertIsDefined(this._rootObject);
        return this._rootObject.hasNamedObject(name);
    }

    public removeObject(obj: GameObjectBase): void {
        Assert.assertIsDefined(this._rootObject);
        this._rootObject.removeObject(obj);
    }

    public removeNamedObjects(name: string): void {
        Assert.assertIsDefined(this._rootObject);
        this._rootObject.removeNamedObjects(name);
    }

    public get isLiveObject(): boolean {
        return !this._isDiposed;
    }

    /**
     * Called when the application receives a keyDown or keyUp event while this mode is active.
     * By default, we just pass this off to the KeyboardInput handler.
     */
    public onKeyboardEvent(e: KeyboardEvent): boolean {
        return this.keyboardInput.handleKeyboardEvent(e);
    }

    /** Called when a ContextMenu event is fired while this mode is active */
    public onContextMenuEvent(_e: Event): void {
    }

    /** Called when the app is resized while this mode is active */
    public onResized(): void {
        this._resized.emit();
    }

    /** Called once per update tick. Updates all objects in the mode. */
    protected update(dt: number): void {
        this._runningTime += dt;
        // update all Updatable objects
        this._updateBegan.emit(dt);
        this._lateUpdate.emit(dt);
    }

    /** Called when the mode is added to the mode stack */
    protected setup(): void {
    }

    /** Called when the mode is removed from the mode stack */
    protected dispose(): void {
    }

    /** Called when the mode becomes active on the mode stack */
    protected enter(): void {
    }

    /** Called when the mode becomes inactive on the mode stack */
    protected exit(): void {
    }

    /** Called when an object is registered with the mode */
    protected registerObject(_obj: GameObjectBase): void {
    }

    /* internal */
    public _setupInternal(modeStack: ModeStack): void {
        this._modeStack = modeStack;
        this.setup();
    }

    /* internal */
    public _disposeInternal(): void {
        Assert.isTrue(!this._isDiposed, 'already disposed');
        this._isDiposed = true;

        this.dispose();

        if (this._rootObject) this._rootObject._disposeInternal();
        this._rootObject = null;

        this.keyboardInput.dispose();

        this._idObjects = null;

        if (this._regs) this._regs.close();
        this._regs = null;

        this._modeStack = null;

        if (this._container) this._container.destroy({children: true});
        this._container = null;

        this._disposed.emit();
    }

    /* internal */
    public _enterInternal(): void {
        this._isActive = true;
        if (this.container) this.container.interactiveChildren = true;
        this.enter();
        this._entered.emit();

        if (this._hasPendingResize) {
            this._hasPendingResize = false;
            this.onResized();
        }
    }

    /* internal */
    public _exitInternal(): void {
        this._exited.emit();
        this._isActive = false;
        if (this.container) this.container.interactiveChildren = false;
        this.exit();
    }

    /* internal */
    public _updateInternal(dt: number): void {
        this.update(dt);
        this._updateComplete.emit();
    }

    /* internal */
    public _registerObjectInternal(obj: GameObjectBase | null): void {
        Assert.assertIsDefined(obj);
        Assert.assertIsDefined(this._regs);
        obj._mode = this;

        // Handle IDs
        const {ids} = obj;
        if (ids.length > 0) {
            this._regs.add(obj.destroyed.connect(() => {
                Assert.assertIsDefined(this._idObjects);
                for (const id of ids) {
                    this._idObjects.delete(id);
                }
            }));

            for (const id of ids) {
                Assert.assertIsDefined(this._idObjects);
                Assert.isFalse(this._idObjects.has(id), 'two objects with the same ID added to the AppMode');
                this._idObjects.set(id, obj);
            }
        }

        // Handle Updatable and LateUpdatable
        const updatable: Updatable = (obj as unknown) as Updatable;
        if (updatable.update !== undefined) {
            obj.regs.add(this.updateBegan.connect((dt) => updatable.update(dt)));
        }

        const lateUpdatable: LateUpdatable = (obj as unknown) as LateUpdatable;
        if (lateUpdatable.lateUpdate !== undefined) {
            obj.regs.add(this.lateUpdate.connect((dt) => lateUpdatable.lateUpdate(dt)));
        }

        this.registerObject(obj);
    }

    /* internal */
    public _resizeInternal(): void {
        if (this._isActive) {
            this.onResized();
        } else {
            this._hasPendingResize = true;
        }
    }

    public get target(): Container {
        Assert.assertIsDefined(this.container);
        return this.container;
    }

    public get pointerEnter(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerEnter;
    }

    public get pointerOver(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerOver;
    }

    public get pointerOut(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerOut;
    }

    public get pointerLeave(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerLeave;
    }

    public get pointerDown(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerDown;
    }

    public get pointerMove(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerMove;
    }

    public get pointerUp(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerUp;
    }

    public get pointerUpOutside(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerUpOutside;
    }

    public get pointerCancel(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerCancel;
    }

    public get pointerTap(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerTap;
    }

    public get mouseWheel(): SignalView<FederatedWheelEvent> {
        return this.getPointerTarget().mouseWheel;
    }

    public get pointerEnterCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerEnterCapture;
    }

    public get pointerOverCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerOverCapture;
    }

    public get pointerOutCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerOutCapture;
    }

    public get pointerLeaveCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerLeaveCapture;
    }

    public get pointerDownCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerDownCapture;
    }

    public get pointerMoveCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerMoveCapture;
    }

    public get pointerUpCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerUpCapture;
    }

    public get pointerUpOutsideCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerUpOutsideCapture;
    }

    public get pointerCancelCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerCancelCapture;
    }

    public get pointerTapCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerTapCapture;
    }

    public get mouseWheelCapture(): SignalView<FederatedWheelEvent> {
        return this.getPointerTarget().mouseWheelCapture;
    }

    protected getPointerTarget(): PointerTarget {
        Assert.assertIsDefined(this.container);
        if (this._pointerTarget == null) {
            this._pointerTarget = new DisplayObjectPointerTarget(this.container);
        }
        return this._pointerTarget;
    }

    private _pointerTarget: PointerTarget; // lazily instantiated

    protected readonly _updateBegan: Signal<number> = new Signal();
    protected readonly _lateUpdate: Signal<number> = new Signal();
    protected readonly _updateComplete: UnitSignal = new UnitSignal();
    protected readonly _entered: UnitSignal = new UnitSignal();
    protected readonly _exited: UnitSignal = new UnitSignal();
    protected readonly _disposed: UnitSignal = new UnitSignal();
    protected readonly _resized: UnitSignal = new UnitSignal();

    protected _container: Container | null;
    protected _modeStack: ModeStack | null;

    protected _runningTime: number = 0;

    protected _rootObject: RootObject | null;

    // AMW TODO: can we decide what type AppMode should use for its ids?
    protected _idObjects: Map<ObjectID, GameObjectBase> | null = new Map();

    protected _regs: RegistrationGroup | null = new RegistrationGroup();

    protected _isActive: boolean;
    protected _isDiposed: boolean;
    protected _hasPendingResize: boolean;
}

class RootObject extends GameObject {
    constructor(mode: AppMode) {
        super();
        this._mode = mode;
        this._ref = new GameObjectRef();
        this._ref._obj = this;
    }
}
