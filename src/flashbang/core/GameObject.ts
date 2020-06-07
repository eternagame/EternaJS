import * as log from 'loglevel';
import {Container, DisplayObject} from 'pixi.js';
import Assert from 'flashbang/util/Assert';
import GameObjectBase from './GameObjectBase';
import GameObjectRef from './GameObjectRef';

export default class GameObject extends GameObjectBase {
    /** The DisplayObject that this GameObject manages, if any */
    public get display(): DisplayObject | null {
        return null;
    }

    public addObject(
        obj: GameObjectBase, displayParent: Container | null = null, displayIdx: number = -1
    ): GameObjectRef {
        return this._addObjectInternal(obj, null, false, displayParent, displayIdx);
    }

    public addNamedObject(
        name: string, obj: GameObjectBase, displayParent: Container | null = null, displayIdx: number = -1
    ): GameObjectRef {
        return this._addObjectInternal(obj, name, false, displayParent, displayIdx);
    }

    public replaceNamedObject(
        name: string, obj: GameObjectBase, displayParent: Container | null = null, displayIdx: number = -1
    ): GameObjectRef {
        return this._addObjectInternal(obj, name, true, displayParent, displayIdx);
    }

    public getNamedObject(name: string): GameObjectBase | null {
        let cur: GameObjectRef | null = this._children;
        while (cur != null) {
            if (cur._obj != null && cur._obj._name === name) {
                return cur._obj;
            }
            cur = cur._next;
        }
        return null;
    }

    public hasNamedObject(name: string): boolean {
        return this.getNamedObject(name) != null;
    }

    public removeObject(obj: GameObjectBase): void {
        Assert.isTrue(obj._parent === this, "We don't own this object");

        // We may be in the middle of being removed ourselves, in which case this object
        // will be removed automatically.
        if (this._wasRemoved) {
            return;
        }

        // remove from the list
        let ref: GameObjectRef = obj._ref;
        let prev: GameObjectRef = ref._prev;
        let next: GameObjectRef = ref._next;

        if (prev != null) {
            prev._next = next;
        } else {
            // if prev is null, ref was the head of the list
            Assert.isTrue(ref === this._children);
            this._children = next;
        }

        if (next != null) {
            next._prev = prev;
        }

        // object performs cleanup
        obj._removedInternal();
    }

    public removeAllObjects(): void {
        this.removeObjects(() => true);
    }

    public removeNamedObjects(name: string): void {
        this.removeObjects((obj: GameObjectBase): boolean => obj._name === name);
    }

    protected removeObjects(pred: (obj: GameObjectBase) => boolean): void {
        let cur: GameObjectRef | null = this._children;
        while (cur != null) {
            let next: GameObjectRef = cur._next;
            let obj: GameObjectBase | null = cur._obj;
            if (obj != null && pred(obj)) {
                this.removeObject(obj);
            }
            cur = next;
        }
    }

    /* internal */
    public _addObjectInternal(
        obj: GameObjectBase,
        name: string | null, replaceExisting: boolean,
        displayParent: Container | null, displayIdx: number = -1
    ): GameObjectRef {
        // Object initialization happens here.
        // Uninitialization happens in GameObjectBase._removedInternal

        Assert.isTrue(!this._wasRemoved, "cannot add to an object that's been removed");
        Assert.isTrue(obj._ref == null, 'cannot re-parent GameObjects');

        if (name != null && replaceExisting) {
            this.removeNamedObjects(name);
        }

        if (displayParent != null) {
            obj._attachToDisplayList(displayParent, displayIdx);
        }

        // create a new GameObjectRef
        let ref: GameObjectRef = new GameObjectRef();
        ref._obj = obj;

        // add the ref to the list
        let oldListHead: GameObjectRef | null = this._children;
        this._children = ref;

        if (oldListHead != null) {
            ref._next = oldListHead;
            oldListHead._prev = ref;
        }

        // object name
        obj._name = name;
        obj._parent = this;
        obj._ref = ref;

        if (this._mode != null) {
            this._registerObject(obj);
        } else {
            if (this._pendingChildren == null) {
                this._pendingChildren = [];
            }
            this._pendingChildren.push(ref);
        }

        return ref;
    }

    /* internal */
    public _attachToDisplayList(displayParent: Container, displayIdx: number): void {
        // Attach the object to a display parent.
        // (This is purely a convenience - the client is free to do the attaching themselves)
        Assert.isTrue(
            this.display != null,
            'obj must manage a non-null DisplayObject to be attached to a display parent'
        );

        Assert.assertIsDefined(this.display);
        if (displayIdx < 0 || displayIdx >= displayParent.children.length) {
            displayParent.addChild(this.display);
        } else {
            displayParent.addChildAt(this.display, displayIdx);
        }
    }

    /* internal */
    public _registerObject(obj: GameObjectBase | null): void {
        Assert.assertIsDefined(this._mode);
        this._mode._registerObjectInternal(obj);
        if (obj) obj._addedInternal();
    }

    /* override */

    /* internal */
    public _addedInternal(): void {
        // Add pending children first
        if (this._pendingChildren != null) {
            for (let ref of this._pendingChildren) {
                this._registerObject(ref._obj);
            }
        }
        this._pendingChildren = null;

        super._addedInternal();
    }

    /* override */

    /* internal */
    public _removedInternal(): void {
        // null out ref immediately - so that we're not considered "live"
        // while children are being removed - rather than waiting for
        // GameObjectBase._removedInternal to do it at the end of the function
        this._ref._obj = null;

        let cur: GameObjectRef | null = this._children;
        this._children = null;
        while (cur != null) {
            let next: GameObjectRef = cur._next;
            if (cur._obj != null) {
                // call _removedInternal directly - we don't need to tear down
                // our child list piece by piece
                cur._obj._removedInternal();
            }
            cur = next;
        }

        super._removedInternal();
    }

    /* override */

    /* internal */
    public _disposeInternal(): void {
        this._ref._obj = null;
        // dispose our children
        let cur: GameObjectRef | null = this._children;
        this._children = null;
        while (cur != null) {
            let next: GameObjectRef = cur._next;
            if (cur._obj != null) {
                cur._obj._disposeInternal();
            }
            cur = next;
        }

        if (this.display != null) {
            if (this.display instanceof Container) {
                try {
                    (this.display as Container).destroy({children: true});
                } catch (e) {
                    log.warn('GameObject.display.destroy blew up', e);
                }
            } else {
                this.display.destroy();
            }
        }

        super._disposeInternal();
    }

    // our child list head
    private _children: GameObjectRef | null;
    private _pendingChildren: GameObjectRef[] | null;
}
