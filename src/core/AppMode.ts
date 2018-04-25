import {GameObject} from "./GameObject";
import {GameObjectBase} from "./GameObjectBase";
import {GameObjectContainer} from "./GameObjectContainer";
import {GameObjectRef} from "./GameObjectRef";
import {ModeStack} from "./ModeStack";
import Container = PIXI.Container;

export class AppMode implements GameObjectContainer {
    /**
     * A convenience function that converts an Array of GameObjectRefs into an array of GameObjects.
     * The resultant Array will not have any null objects, so it may be smaller than the Array
     * that was passed in.
     */
    public static getObjects (objectRefs :Array<GameObjectRef>) :Array<GameObject> {
        // Array.map would be appropriate here, except that the resultant
        // Array might contain fewer entries than the source.

        let objs :Array<GameObject> = [];
        for (let ref :GameObjectRef of objectRefs) {
            if (!ref.isNull) {
                objs.push(ref.object);
            }
        }

        return objs;
    }

    public constructor () {
        this._rootObject = new RootObject(this);
    }

    public get modeSprite () :Container {
        return this._modeSprite;
    }

    /** Returns the ModeStack that this AppMode lives in */
    public get modeStack (): ModeStack {
        return this._modeStack;
    }

    /** Removes the GameObject with the given id from the ObjectDB, if it exists. */
    public destroyObjectWithId (id :any) :void {
        let obj :GameObject = this.getObjectWithId(id);
        if (null != obj) {
            obj.destroySelf();
        }
    }

    /** Returns the object in this mode with the given ID, or null if no such object exists. */
    public getObjectWithId (id :any) :GameObject {
        return this._idObjects.get(id);
    }


    /** @return total time the mode has been running, as measured by calls to update(). */
    public get time () :number {
        return this._runningTime;
    }

    public addObject (obj: GameObjectBase, displayParent? :Container, displayIdx? :number) :GameObjectRef {
        return this._rootObject.addObject(obj, displayParent, displayIdx);
    }

    public addNamedObject (name :String, obj :GameObjectBase, displayParent? :Container, displayIdx?: number) :GameObjectRef {
        return this._rootObject.addNamedObject(name, obj, displayParent, displayIdx);
    }

    public replaceNamedObject (name :String, obj :GameObjectBase, displayParent? :Container, displayIdx?: number) :GameObjectRef {
        return this._rootObject.replaceNamedObject(name, obj, displayParent, displayIdx);
    }

    public getNamedObject (name :String) :GameObjectBase {
        return this._rootObject.getNamedObject(name);
    }

    public hasNamedObject (name :String) :boolean {
        return this._rootObject.hasNamedObject(name);
    }

    public removeObject (obj :GameObjectBase) :void {
        this._rootObject.removeObject(obj);
    }

    public removeNamedObjects (name :String) :void {
        this._rootObject.removeNamedObjects(name);
    }

    public get isLiveObject () :boolean {
        return !this._disposed;
    }

    /** Called once per update tick. Updates all objects in the mode. */
    protected update (dt :number) :void {
        this._runningTime += dt;
        // update all Updatable objects
        this._update.emit(dt);
    }

    /** Called right before Starling renders the display list. */
    protected render () :void {
        this._willRender.emit();
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

    _setupInternal (modeStack :ModeStack) :void {
        this._modeStack = modeStack;
        // _touchInput = new TouchInput(_modeSprite);
        // _moviePlayer = new MoviePlayer(_modeSprite);
        this.setup();
    }

    _disposeInternal () :void {
        Assert.isTrue(!this._disposed, "already disposed");
        this._disposed = true;

        this.dispose();

        this._rootObject.disposeInternal();
        this._rootObject = null;

        this._idObjects = null;

        this._modeStack = null;

        this._modeSprite.destroy();
        this._modeSprite = null;
    }

    _enterInternal () :void {
        this._active = true;
        this.enter();
        // _entered.emit();
    }

    _exitInternal () :void {
        this._active = false;
        this.exit();
    }

    _updateInternal (dt :number) :void {
        this.update(dt);
        this._updateComplete.emit();
    }

    _renderInternal () :void {
        this.render();
    }

    // _registerObjectInternal (obj :GameObjectBase) :void {
    //     // Handle IDs
    //     let ids :Array<any> = obj.ids;
    //     if (ids.length > 0) {
    //         _regs.add(obj.destroyed.connect(function () :void {
    //             for each (var id :Object in ids) {
    //                 _idObjects.remove(id);
    //             }
    //         }));
    //         for each (var id :Object in ids) {
    //             var existing :GameObject = _idObjects.put(id, obj);
    //             Preconditions.isTrue(null == existing,
    //                 "two objects with the same ID added to the AppMode",
    //                 "id", id, "new", obj, "existing", existing);
    //         }
    //     }
    //
    //     // Handle groups
    //     var groups :Array = obj.groups;
    //     if (groups.length > 0) {
    //         _regs.add(obj.destroyed.connect(function () :void {
    //             // perform group removal at the end of an update, so that
    //             // group iteration is safe during the update
    //             _updateComplete.connect(function () :void {
    //                 for each (var group :Object in groups) {
    //                     Arrays.removeFirst(_groupedObjects.get(group), obj.ref);
    //                 }
    //             }).once();
    //
    //         }));
    //         for each (var group :Object in groups) {
    //             (_groupedObjects.get(group) as Array).push(obj.ref);
    //         }
    //     }
    //
    //     // Handle Updatable and Renderable
    //     var updatable :Updatable = (obj as Updatable);
    //     if (updatable != null) {
    //         obj.regs.add(_update.connect(updatable.update));
    //     }
    //
    //     var renderable :Renderable = (obj as Renderable);
    //     if (renderable != null) {
    //         obj.regs.add(_willRender.connect(renderable.willRender));
    //     }
    //
    //     registerObject(obj);
    // }

    protected _modeSprite :Container = new Container();
    protected _modeStack :ModeStack;

    protected _runningTime :number = 0;

    protected _rootObject :RootObject;

    protected _idObjects :Map<any, GameObject> = new Map();

    // protected _regs :Listeners = new Listeners();

    protected _active :boolean;
    protected _disposed :boolean;
}

class RootObject extends GameObject {
    public constructor (mode :AppMode) {
        super();
        this._mode = mode;
        this._ref = new GameObjectRef();
        this._ref._obj = this;
    }
}
