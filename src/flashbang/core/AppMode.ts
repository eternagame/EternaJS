import {Container} from "pixi.js";
import {Signal, SignalConnections} from "typed-signals";
import {Assert} from "../util/Assert";
import {UnitSignal} from "../util/Signals";
import {GameObject} from "./GameObject";
import {GameObjectBase} from "./GameObjectBase";
import {GameObjectRef} from "./GameObjectRef";
import {ModeStack} from "./ModeStack";
import {Updatable} from "./Updatable";

export class AppMode {
    public readonly updateBegan: Signal<(dt: number) => void> = new Signal();

    /**
     * A convenience function that converts an Array of GameObjectRefs into an array of GameObjects.
     * The resultant Array will not have any null objects, so it may be smaller than the Array
     * that was passed in.
     */
    public static getObjects (objectRefs :GameObjectRef[]) :GameObject[] {
        // Array.map would be appropriate here, except that the resultant
        // Array might contain fewer entries than the source.

        let objs :GameObject[] = [];
        for (let ref of objectRefs) {
            if (!ref.isNull) {
                objs.push(ref.object);
            }
        }

        return objs;
    }

    public constructor () {
        this._rootObject = new RootObject(this);
    }

    public get regs () :SignalConnections {
        return this._regs;
    }

    public /*final*/ get modeSprite () :Container {
        return this._modeSprite;
    }

    /** Returns the ModeStack that this AppMode lives in */
    public /*final*/ get modeStack () :ModeStack {
        return this._modeStack;
    }

    /** Removes the GameObject with the given id from the ObjectDB, if it exists. */
    public destroyObjectWithId (id :Object) :void {
        let obj :GameObject = this.getObjectWithId(id);
        if (null != obj) {
            obj.destroySelf();
        }
    }

    /** Returns the object in this mode with the given ID, or null if no such object exists. */
    public getObjectWithId (id :Object) :any {
        return this._idObjects.get(id);
    }

    /** @return total time the mode has been running, as measured by calls to update(). */
    public get time () :number {
        return this._runningTime;
    }

    public addObject (obj :GameObjectBase, displayParent :Container = null, displayIdx :number = -1) :GameObjectRef {
        return this._rootObject.addObject(obj, displayParent, displayIdx);
    }

    public addNamedObject (name :string, obj :GameObjectBase, displayParent :Container = null, displayIdx :number = -1) :GameObjectRef {
        return this._rootObject.addNamedObject(name, obj, displayParent, displayIdx);
    }

    public replaceNamedObject (name :string, obj :GameObjectBase, displayParent :Container = null, displayIdx :number = -1) :GameObjectRef {
        return this._rootObject.replaceNamedObject(name, obj, displayParent, displayIdx);
    }

    public getNamedObject (name :string) :GameObjectBase {
        return this._rootObject.getNamedObject(name);
    }

    public hasNamedObject (name :string) :boolean {
        return this._rootObject.hasNamedObject(name);
    }

    public removeObject (obj :GameObjectBase) :void {
        this._rootObject.removeObject(obj);
    }

    public removeNamedObjects (name :string) :void {
        this._rootObject.removeNamedObjects(name);
    }

    public get isLiveObject () :boolean {
        return !this._disposed;
    }

    /** Called once per update tick. Updates all objects in the mode. */
    protected update (dt :number) :void {
        this._runningTime += dt;
        // update all Updatable objects
        this.updateBegan.emit(dt);
    }

    /** Called when the mode is added to the mode stack */
    protected setup () :void {
    }

    /** Called when the mode is removed from the mode stack */
    protected dispose () :void {
    }

    /** Called when the mode becomes active on the mode stack */
    protected enter () :void {
    }

    /** Called when the mode becomes inactive on the mode stack */
    protected exit () :void {
    }

    /** Called when an object is registered with the mode */
    protected registerObject (obj :GameObjectBase) :void {
    }

    /*internal*/ setupInternal (modeStack :ModeStack) :void {
        this._modeStack = modeStack;
        this.setup();
    }

    /*internal*/ disposeInternal () :void {
        Assert.isTrue(!this._disposed, "already disposed");
        this._disposed = true;

        this.dispose();

        this._rootObject._disposeInternal();
        this._rootObject = null;

        this._idObjects = null;

        this._regs.disconnectAll();
        this._regs = null;

        this._modeStack = null;

        this._modeSprite.destroy();
        this._modeSprite = null;
    }

    /*internal*/ enterInternal () :void {
        this._active = true;
        this.enter();
        this._entered.emit();
    }

    /*internal*/ exitInternal () :void {
        this._active = false;
        this.exit();
    }

    /*internal*/ updateInternal (dt :number) :void {
        this.update(dt);
        this._updateComplete.emit();
    }

    /*internal*/ registerObjectInternal (obj :GameObjectBase) :void {
        // Handle IDs
        let ids :any[] = obj.ids;
        if (ids.length > 0) {
            this._regs.add(obj.destroyed.connect(() => {
                for (let id of ids) {
                    this._idObjects.delete(id);
                }
            }));

            for (let id of ids) {
                Assert.isFalse(this._idObjects.has(id), "two objects with the same ID added to the AppMode");
                this._idObjects.set(id, obj);
            }
        }

        // Handle Updatable and Renderable
        let updatable: Updatable = <Updatable> (obj as any);
        if (updatable.update !== undefined) {
            obj.regs.add(this.updateBegan.connect(dt => updatable.update(dt)));
        }

        this.registerObject(obj);
    }

    protected _updateComplete :UnitSignal = new UnitSignal();
    protected _entered :UnitSignal = new UnitSignal();

    protected _modeSprite :Container = new Container();
    protected _modeStack :ModeStack;

    protected _runningTime :number = 0;

    protected _rootObject :RootObject;

    protected _idObjects: Map<any, GameObjectBase> = new Map();

    protected _regs :SignalConnections = new SignalConnections();

    protected _active :boolean;
    protected _disposed :boolean;
}

class RootObject extends GameObject {
    constructor (mode :AppMode) {
        super();
        this._mode = mode;
        this._ref = new GameObjectRef();
        this._ref._obj = this;
    }
}
