import {Container} from 'pixi.js';
import {
    RegistrationGroup, Signal, SignalView, UnitSignal
} from 'signals';
import KeyboardInput from 'flashbang/input/KeyboardInput';
import MouseWheelInput from 'flashbang/input/MouseWheelInput';
import Assert from 'flashbang/util/Assert';
import GameObject from './GameObject';
import GameObjectBase from './GameObjectBase';
import GameObjectRef from './GameObjectRef';
import LateUpdatable from './LateUpdatable';
import ModeStack from './ModeStack';
import Updatable from './Updatable';

export default class AppMode {
    /** Default keyboard input processor */
    public readonly keyboardInput: KeyboardInput = new KeyboardInput();
    /** Default mouse wheel input processor */
    public readonly mouseWheelInput: MouseWheelInput = new MouseWheelInput();

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

        let objs: GameObject[] = [];
        for (let ref of objectRefs) {
            if (!ref.isNull) {
                objs.push(ref.object);
            }
        }

        return objs;
    }

    constructor() {
        this._rootObject = new RootObject(this);
        this.container.interactiveChildren = false;
    }

    public get regs(): RegistrationGroup {
        return this._regs;
    }

    /** The PIXI Container that all this mode's DisplayObjects should live within */
    public get container(): PIXI.Container {
        return this._container;
    }

    /** Returns the ModeStack that this AppMode lives in */
    public /* final */ get modeStack(): ModeStack {
        return this._modeStack;
    }

    /** Removes the GameObject with the given id from the ObjectDB, if it exists. */
    public destroyObjectWithId(id: any): void {
        let obj: GameObject = this.getObjectWithId(id);
        if (obj != null) {
            obj.destroySelf();
        }
    }

    /** Returns the object in this mode with the given ID, or null if no such object exists. */
    public getObjectWithId(id: any): any {
        return this._idObjects.get(id);
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
                    if (resolve != null) {
                        let fn = resolve;
                        resolve = null;
                        reject = null;
                        fn();
                    }
                });

                this._disposed.connect(() => {
                    if (reject != null) {
                        let fn = reject;
                        resolve = null;
                        reject = null;
                        fn('Mode was disposed');
                    }
                });
            });
        }
    }

    public addObject(obj: GameObjectBase, displayParent: Container = null, displayIdx: number = -1): GameObjectRef {
        return this._rootObject.addObject(obj, displayParent, displayIdx);
    }

    public addNamedObject(
        name: string, obj: GameObjectBase, displayParent: Container = null, displayIdx: number = -1
    ): GameObjectRef {
        return this._rootObject.addNamedObject(name, obj, displayParent, displayIdx);
    }

    public replaceNamedObject(
        name: string, obj: GameObjectBase, displayParent: Container = null, displayIdx: number = -1
    ): GameObjectRef {
        return this._rootObject.replaceNamedObject(name, obj, displayParent, displayIdx);
    }

    public getNamedObject(name: string): GameObjectBase {
        return this._rootObject.getNamedObject(name);
    }

    public hasNamedObject(name: string): boolean {
        return this._rootObject.hasNamedObject(name);
    }

    public removeObject(obj: GameObjectBase): void {
        this._rootObject.removeObject(obj);
    }

    public removeNamedObjects(name: string): void {
        this._rootObject.removeNamedObjects(name);
    }

    public get isLiveObject(): boolean {
        return !this._isDiposed;
    }

    /**
     * Called when the application receives a keyDown or keyUp event while this mode is active.
     * By default, we just pass this off to the KeyboardInput handler.
     */
    public onKeyboardEvent(e: KeyboardEvent): void {
        this.keyboardInput.handleKeyboardEvent(e);
    }

    /** Called when the application receives a mouse wheel event while this mode is active */
    public onMouseWheelEvent(e: WheelEvent): void {
        this.mouseWheelInput.handleMouseWheelEvent(e);
    }

    /** Called when a ContextMenu event is fired while this mode is active */
    public onContextMenuEvent(e: Event): void {
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
    protected registerObject(obj: GameObjectBase): void {
    }

    /* internal */
    public setupInternal(modeStack: ModeStack): void {
        this._modeStack = modeStack;
        this.setup();
    }

    /* internal */
    public disposeInternal(): void {
        Assert.isTrue(!this._isDiposed, 'already disposed');
        this._isDiposed = true;

        this.dispose();

        this._rootObject._disposeInternal();
        this._rootObject = null;

        this.keyboardInput.dispose();
        this.mouseWheelInput.dispose();

        this._idObjects = null;

        this._regs.close();
        this._regs = null;

        this._modeStack = null;

        this._container.destroy({children: true});
        this._container = null;

        this._disposed.emit();
    }

    /* internal */
    public enterInternal(): void {
        this._isActive = true;
        this.container.interactiveChildren = true;
        this.enter();
        this._entered.emit();

        if (this._hasPendingResize) {
            this._hasPendingResize = false;
            this.onResized();
        }
    }

    /* internal */
    public exitInternal(): void {
        this._exited.emit();
        this._isActive = false;
        this.container.interactiveChildren = false;
        this.exit();
    }

    /* internal */
    public updateInternal(dt: number): void {
        this.update(dt);
        this._updateComplete.emit();
    }

    /* internal */
    public registerObjectInternal(obj: GameObjectBase): void {
        obj._mode = this;

        // Handle IDs
        let {ids} = obj;
        if (ids.length > 0) {
            this._regs.add(obj.destroyed.connect(() => {
                for (let id of ids) {
                    this._idObjects.delete(id);
                }
            }));

            for (let id of ids) {
                Assert.isFalse(this._idObjects.has(id), 'two objects with the same ID added to the AppMode');
                this._idObjects.set(id, obj);
            }
        }

        // Handle Updatable and LateUpdatable
        let updatable: Updatable = <Updatable> (obj as any);
        if (updatable.update !== undefined) {
            obj.regs.add(this.updateBegan.connect(dt => updatable.update(dt)));
        }

        let lateUpdatable: LateUpdatable = <LateUpdatable> (obj as any);
        if (lateUpdatable.lateUpdate !== undefined) {
            obj.regs.add(this.lateUpdate.connect(dt => lateUpdatable.lateUpdate(dt)));
        }

        this.registerObject(obj);
    }

    /* internal */
    public resizeInternal(): void {
        if (this._isActive) {
            this.onResized();
        } else {
            this._hasPendingResize = true;
        }
    }

    protected readonly _updateBegan: Signal<number> = new Signal();
    protected readonly _lateUpdate: Signal<number> = new Signal();
    protected readonly _updateComplete: UnitSignal = new UnitSignal();
    protected readonly _entered: UnitSignal = new UnitSignal();
    protected readonly _exited: UnitSignal = new UnitSignal();
    protected readonly _disposed: UnitSignal = new UnitSignal();
    protected readonly _resized: UnitSignal = new UnitSignal();

    protected _container: Container = new Container();
    protected _modeStack: ModeStack;

    protected _runningTime: number = 0;

    protected _rootObject: RootObject;

    protected _idObjects: Map<any, GameObjectBase> = new Map();

    protected _regs: RegistrationGroup = new RegistrationGroup();

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
