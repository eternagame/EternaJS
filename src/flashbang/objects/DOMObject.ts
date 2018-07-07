import {Container, DisplayObject, Matrix} from "pixi.js";
import {Flashbang} from "../core/Flashbang";
import {GameObject} from "../core/GameObject";
import {MatrixUtil} from "../util/MatrixUtil";

/**
 * Wraps an HTML element that lives in the DOM and is drawn on top of the PIXI canvas.
 * Contains a "dummy" Container DisplayObject that mirrors the element's transform.
 */
export abstract class DOMObject<T extends HTMLElement> extends GameObject {
    protected constructor(domParentID: string, obj: T) {
        super();

        this._obj = obj;
        this._obj.style.position = "absolute";
        this._obj.style.transformOrigin = "0 0";
        this._domParent = document.getElementById(domParentID);
    }

    public get display(): DisplayObject {
        return this._dummyDisp;
    }

    protected added(): void {
        super.added();
        this._domParent.appendChild(this._obj);

        // Update the HTML element's transform during the PIXI postrender event -
        // this is the point where the dummy display object's transform will be up to date.
        Flashbang.pixi.renderer.addListener("postrender", this.updateElementProperties, this);
    }

    protected dispose(): void {
        this._domParent.removeChild(this._obj);
        Flashbang.pixi.renderer.removeListener("postrender", this.updateElementProperties, this);

        super.dispose();
    }

    protected updateElementProperties(): void {
        let m = this.display.worldTransform;
        if (!MatrixUtil.equals(this._lastTransform, m)) {
            this._obj.style.transform = `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.tx}, ${m.ty})`;
            m.copy(this._lastTransform);
        }
    }

    protected static sizeToString(size: number): string {
        return "" + size + "px";
    }

    protected static stringToSize(value: string): number {
        let idx = value.indexOf("px");
        if (idx >= 0) {
            value = value.substr(0, idx);
        }
        let size: number = Number(value);
        return !isNaN(size) ? size : 0;
    }

    protected readonly _dummyDisp: Container = new Container();
    protected readonly _domParent: HTMLElement;
    protected readonly _obj: T;

    private readonly _lastTransform: Matrix = new Matrix();
}
