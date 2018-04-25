import {GameObjectRef} from "./GameObjectRef";
import {GameObjectContainer} from "./GameObjectContainer";
import {AppMode} from "./AppMode";

export class GameObjectBase {

    /**
     * Returns the IDs of this object. (Objects can have multiple IDs.)
     * Two objects in the same mode cannot have the same ID.
     * Objects cannot change their IDs once added to a mode. An ID can be any object;
     * though it's common to use Classes and Strings.
     * <code>
     * override public get ids () :Array {
     *     return [ "Hello", MyClass ].concat(super.ids);
     * }
         * </code>
     */
    public get ids () :Array<any> {
        return GameObjectBase.EMPTY_ARRAY;
    }

    /**
     * Override to return the groups that this object belongs to. E.g.:
     * <code>
         * override public get groups () :Array {
     *     return [ "Foo", MyClass ].concat(super.groups);
     * }
     * </code>
     */
    public get groups () :Array<any> {
        return GameObjectBase.EMPTY_ARRAY;
    }

    /**
     * Returns the unique GameObjectRef that stores a reference to this GameObject.
     */
    // public get ref () :GameObjectRef {
    //     return this._ref;
    // }
    //
    // public get parent () :GameObjectContainer {
    //     return this._parent;
    // }

    /**
     * Returns the AppMode that this object is contained in.
     */
    // public get mode () :AppMode {
    //     return this._mode;
    // }

    /**
     * Returns the ModeStack that this object is a part of
     */
    // public get modeStack (): ModeStack {
    //     return this._mode.modeStack;
    // }

    /**
     * Returns true if the object is in an AppMode and is "live"
     * (not pending removal from the database)
     */
    public get isLiveObject () :boolean {
        return (this._ref != null && this._ref._obj != null);
    }

    /**
     * Removes the GameObject from its parent.
     * If a subclass needs to cleanup after itself after being destroyed, it should do
     * so either in removedFromDb or dispose.
     */
    public destroySelf () :void {
        if (this._parent != null) {
            this._parent.removeObject(this);
        }
    }

    // public get regs () :Listeners {
    //     if (this._regs == null) {
    //         this._regs = new Listeners();
    //     }
    //     return this._regs;
    // }

    // public toString () :String {
    //     return StringUtil.simpleToString(this, [ "ids", "groups" ]);
    // }

    /**
     * Called immediately after the GameObject has been added to an AppMode.
     * (Subclasses can override this to do something useful.)
     */
    protected added () :void {
    }

    /**
     * Called immediately after the GameObject has been removed from an AppMode.
     *
     * removedFromDB is not called when the GameObject's AppMode is removed from the mode stack.
     * For logic that must be run in this instance, see {@link #dispose}.
     *
     * (Subclasses can override this to do something useful.)
     */
    protected removed () :void {
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
    protected dispose () :void {
    }

    /** @internal */
    // _attachToDisplayList (displayParent :Container, displayIdx :number) :void {
    //     Assert.isTrue(this is DisplayComponent, "obj must implement DisplayComponent");
    //
    //     // Attach the object to a display parent.
    //     // (This is purely a convenience - the client is free to do the attaching themselves)
    //     let disp :DisplayObject = (this as DisplayComponent).display;
    //     Assert.isTrue(null != disp,
    //         "obj must return a non-null displayObject to be attached to a display parent");
    //
    //     if (displayIdx < 0 || displayIdx >= displayParent.children.length) {
    //         displayParent.addChild(disp);
    //     } else {
    //         displayParent.addChildAt(disp, displayIdx);
    //     }
    // }

    /** internal */
    _addedInternal () :void {
        this.added();
    }

    _removedInternal () :void {
        this._ref._obj = null;
        this._parent = null;
        this._mode = null;

        this.removed();
        this._disposeInternal();
    }

    _disposeInternal () :void {
        this._ref._obj = null;
        this.dispose();
        // if (this._regs != null) {
        //     this._regs.close();
        //     this._regs = null;
        // }
    }

    get _wasRemoved () :boolean {
        return (this._ref != null && this._ref._obj == null);
    }

    private _name: String;
    private _ref: GameObjectRef;
    private _parent :GameObjectContainer;
    private _mode: AppMode;

    protected static readonly EMPTY_ARRAY :Array<any> = [];
}
