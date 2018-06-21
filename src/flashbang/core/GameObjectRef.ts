import {GameObject} from "./GameObject";
import {GameObjectBase} from "./GameObjectBase";

export class GameObjectRef {
    public static readonly NULL: GameObjectRef = new GameObjectRef();

    /** @return the GameObjectRef for the given GameObject, or GameObjectRef.Null() if obj is null */
    public static forObject(obj: GameObject = null): GameObjectRef {
        return (obj != null ? obj.ref : GameObjectRef.NULL);
    }

    public destroyObject(): void {
        if (null != this._obj) {
            this._obj.destroySelf();
        }
    }

    public get object(): any {
        return this._obj;
    }

    public get isLive(): boolean {
        return (null != this._obj);
    }

    public get isNull(): boolean {
        return (null == this._obj);
    }

    // managed by ObjectDB
    _obj: GameObjectBase;
    _next: GameObjectRef;
    _prev: GameObjectRef;
}
