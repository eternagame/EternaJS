import {Container} from 'pixi.js';
import {RegistrationGroup, UnitSignal} from 'signals';
import AppMode, {ObjectID} from './AppMode';
import ModeStack from './ModeStack';
import GameObject from './GameObject';
import GameObjectRef from './GameObjectRef';

export default class GameObjectBase {
    public get destroyed(): UnitSignal {
        if (this._destroyed == null) {
            this._destroyed = new UnitSignal();
        }
        return this._destroyed;
    }

    /**
     * Returns the IDs of this object. (Objects can have multiple IDs.)
     * Two objects in the same mode cannot have the same ID.
     * Objects cannot change their IDs once added to a mode. An ID can be any object;
     * though it's common to use Classes and Strings.
     * <code>
     * override public function get ids () :Array {
     *     return [ "Hello", MyClass ].concat(super.ids);
     * }
     * </code>
     */
    public get ids(): ObjectID[] {
        return GameObjectBase.EMPTY_ARRAY;
    }

    /**
     * Returns the unique GameObjectRef that stores a reference to this GameObject.
     */
    public /* final */ get ref(): GameObjectRef {
        return this._ref;
    }

    public /* final */ get parent(): GameObject | null {
        return this._parent;
    }

    /**
     * Returns the AppMode that this object is contained in.
     */
    public /* final */ get mode(): AppMode | null {
        return this._mode;
    }

    /**
     * Returns the ModeStack that this object is a part of
     */
    public /* final */ get modeStack(): ModeStack | null {
        return this._mode ? this._mode.modeStack : null;
    }

    /** Returns true if the object belongs to an AppMode and is not pending removal */
    public /* final */ get isLiveObject(): boolean {
        return (this._mode != null && this._ref != null && this._ref._obj != null);
    }

    /**
     * Removes the GameObject from its parent.
     * (If a subclass needs to cleanup after itself after being destroyed, it should do
     * so either in removed() or dispose()).
     */
    public /* final */ destroySelf(): void {
        if (this._parent != null) {
            this._parent.removeObject(this);
        }
    }

    public get regs(): RegistrationGroup {
        if (this._regs == null) {
            this._regs = new RegistrationGroup();
        }
        return this._regs;
    }

    // public toString () :string {
    //     return StringUtil.simpleToString(this, [ "ids", "groups" ]);
    // }

    /**
     * Called immediately after the GameObject has been added to an AppMode.
     * (Subclasses can override this to do something useful.)
     */
    protected added(): void {
    }

    /**
     * Called immediately after the GameObject has been removed from an AppMode.
     *
     * removedFromDB is not called when the GameObject's AppMode is removed from the mode stack.
     * For logic that must be run in this instance, see {@link #dispose}.
     *
     * (Subclasses can override this to do something useful.)
     */
    protected removed(): void {
    }

    /**
     * Called after the GameObject has been removed from the active AppMode, or if the
     * object's containing AppMode is removed from the mode stack.
     *
     * If the GameObject is removed from the active AppMode, {@link #removed}
     * will be called before destroyed.
     *
     * {@link #dispose} should be used for logic that must be always be run when the GameObject is
     * destroyed (disconnecting event listeners, releasing resources, etc).
     *
     * (Subclasses can override this to do something useful.)
     */
    protected dispose(): void {
    }

    /* internal */
    public _attachToDisplayList(displayParent: Container, displayIdx: number): void {
        // implemented by subclasses
    }

    /* internal */
    public _addedInternal(): void {
        this.added();
    }

    /* internal */
    public _removedInternal(): void {
        this._ref._obj = null;
        this._parent = null;
        this._mode = null;

        this.removed();
        if (this._destroyed != null) {
            this._destroyed.emit();
        }
        this._disposeInternal();
    }

    /* internal */
    public _disposeInternal(): void {
        this._ref._obj = null;
        this.dispose();
        if (this._regs != null) {
            this._regs.close();
            this._regs = null;
        }
    }

    /* internal */
    public get _wasRemoved(): boolean {
        return (this._ref != null && this._ref._obj == null);
    }

    // lazily instantiated
    private _regs: RegistrationGroup | null;
    private _destroyed: UnitSignal;

    /* internal */ public _name: string | null;
    /* internal */ public _ref: GameObjectRef;
    /* internal */ public _parent: GameObject | null;
    /* internal */ public _mode: AppMode | null;

    private static readonly EMPTY_ARRAY: ObjectID[] = [];
}
