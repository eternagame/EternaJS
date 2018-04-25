import Container = PIXI.Container;
import {GameObjectBase} from "./GameObjectBase";
import {GameObjectRef} from "./GameObjectRef";

export interface GameObjectContainer {
    readonly isLiveObject :boolean;

    /**
     * Adds a GameObject to the container. The GameObject must not be owned by another container.
     *
     * If obj is a SceneObject and displayParent is not null, the function will attach
     * obj's displayObject to displayParent.
     */
    addObject (obj: GameObjectBase, displayParent?: Container, displayIdx?: number) :GameObjectRef;

    /**
     * Adds a GameObject to the container with the given name. If the container has other
     * objects with the same name, they won't be affected.
     */
    addNamedObject (name :String, obj :GameObjectBase, displayParent? :Container, displayIdx? :number) :GameObjectRef;

    /**
     * Adds a GameObject to the container with the given name, removing all other objects
     * with the same name.
     */
    replaceNamedObject (name :String, obj :GameObjectBase, displayParent? :Container, displayIdx? :number) :GameObjectRef;

    /**
     * Returns the first object with the given name in this container,
     * or null if no such object exists.
     */
    getNamedObject (name :String) :GameObjectBase;

    /** Returns true if the container has at least one object with the given name */
    hasNamedObject (name :String) :boolean;

    /**
     * Removes the given object from the container.
     * An error will be thrown if the object does not belong to this container.
     */
    removeObject (obj :GameObjectBase) :void;

    /** Removes all objects with the given name from the container. */
    removeNamedObjects (name :String) :void;
}
