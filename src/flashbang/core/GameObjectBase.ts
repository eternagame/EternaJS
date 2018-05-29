import {Container} from "pixi.js";
import {RegistrationGroup} from "../../signals/RegistrationGroup";
import {UnitSignal} from "../../signals/UnitSignal";
import {AppMode} from "./AppMode";
import {GameObject} from "./GameObject";
import {GameObjectRef} from "./GameObjectRef";
import {ModeStack} from "./ModeStack";

export class GameObjectBase {
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
    public get ids(): any[] {
        return GameObjectBase.EMPTY_ARRAY;
    }

    /**
     * Returns the unique GameObjectRef that stores a reference to this GameObject.
     */
    public /*final*/ get ref(): GameObjectRef {
        return this._ref;
    }

    public /*final*/ get parent(): GameObject {
        return this._parent;
    }

    /**
     * Returns the AppMode that this object is contained in.
     */
    public /*final*/ get mode(): AppMode {
        return this._mode;
    }

    /**
     * Returns the ModeStack that this object is a part of
     */
    public /*final*/ get modeStack(): ModeStack {
        return this._mode.modeStack;
    }

    /**
     * Returns true if the object is in an AppMode and is "live"
     * (not pending removal from the database)
     */
    public /*final*/ get isLiveObject(): boolean {
        return (this._ref != null && this._ref._obj != null);
    }

    /**
     * Removes the GameObject from its parent.
     * If a subclass needs to cleanup after itself after being destroyed, it should do
     * so either in removedFromDb or dispose.
     */
    public /*final*/ destroySelf(): void {
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

    /*internal*/
    _attachToDisplayList(displayParent: Container, displayIdx: number): void {
        // implemented by subclasses
    }

    /*internal*/
    _addedInternal(): void {
        this.added();
    }

    /*internal*/
    _removedInternal(): void {
        this._ref._obj = null;
        this._parent = null;
        this._mode = null;

        this.removed();
        if (this._destroyed != null) {
            this._destroyed.emit();
        }
        this._disposeInternal();
    }

    /*internal*/
    _disposeInternal(): void {
        this._ref._obj = null;
        this.dispose();
        if (this._regs != null) {
            this._regs.close();
            this._regs = null;
        }
    }

    /*internal*/
    get _wasRemoved(): boolean {
        return (this._ref != null && this._ref._obj == null);
    }

    // lazily instantiated
    private _regs: RegistrationGroup;
    private _destroyed: UnitSignal;

    /*internal*/
    _name: string;
    /*internal*/
    _ref: GameObjectRef;
    /*internal*/
    _parent: GameObject;
    /*internal*/
    _mode: AppMode;

    protected static EMPTY_ARRAY: any[] = [];
}
