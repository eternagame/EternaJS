import Eterna from 'eterna/Eterna';
import {DOMObject} from 'flashbang';

export default class HTMLImageObject extends DOMObject<HTMLImageElement> {
    constructor(imgSrc: string, domParent?: string | HTMLElement) {
        super(domParent ?? Eterna.OVERLAY_DIV_ID, document.createElement('img'));
        this._obj.src = imgSrc;
    }

    public set width(value: number) {
        this._obj.style.width = DOMObject.sizeToString(value);
        this.onSizeChanged();
    }

    public get width(): number {
        return this._obj.getBoundingClientRect().width;
    }

    public get height(): number {
        return this._obj.getBoundingClientRect().height;
    }
}
