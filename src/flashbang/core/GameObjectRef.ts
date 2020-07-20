import GameObject from './GameObject';
import GameObjectBase from './GameObjectBase';

export default class GameObjectRef {
    public static readonly NULL: GameObjectRef = new GameObjectRef();

    /** @return the GameObjectRef for the given GameObject, or GameObjectRef.Null() if obj is null */
    public static forObject(obj: GameObject | null = null): GameObjectRef {
        return (obj != null ? obj.ref : GameObjectRef.NULL);
    }

    public destroyObject(): void {
        if (this._obj != null) {
            this._obj.destroySelf();
        }
    }

    public get object(): GameObjectBase | null {
        return this._obj;
    }

    public get isLive(): boolean {
        return (this._obj != null);
    }

    public get isNull(): boolean {
        return (this._obj == null);
    }

    // managed by ObjectDB
    /* internal */ public _obj: GameObjectBase | null;
    /* internal */ public _next: GameObjectRef;
    /* internal */ public _prev: GameObjectRef;
}
