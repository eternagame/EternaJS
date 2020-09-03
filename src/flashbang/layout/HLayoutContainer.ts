import {Rectangle} from 'pixi.js';
import {VAlign} from 'flashbang/core/Align';
import DisplayUtil from 'flashbang/util/DisplayUtil';
import LayoutContainer from './LayoutContainer';

/**
 * A Container that arranges its children horizontally.
 * Call layout() after adding or removing children to update the sprite's layout.
 */
export default class HLayoutContainer extends LayoutContainer {
    constructor(hOffset: number = 0, vAlign: VAlign = VAlign.CENTER) {
        super();
        this._hOffset = hOffset;
        this._vAlign = vAlign;
    }

    public get reversed(): boolean {
        return this._reversed;
    }

    /** If true, then children are laid out right-to-left instead of left-to-right */
    public set reversed(val: boolean) {
        if (this._reversed !== val) {
            this._reversed = val;
            this._needsLayout = true;
        }
    }

    public get hOffset(): number {
        return this._hOffset;
    }

    public set hOffset(val: number) {
        if (this._hOffset !== val) {
            this._hOffset = val;
            this._needsLayout = true;
        }
    }

    public get vAlign(): VAlign {
        return this._vAlign;
    }

    public set vAlign(val: VAlign) {
        if (this._vAlign !== val) {
            this._vAlign = val;
            this._needsLayout = true;
        }
    }

    public addHSpacer(size: number): void {
        this.addHSpacerAt(size, this.children.length);
    }

    public addHSpacerAt(size: number, index: number): void {
        this.addChildAt(LayoutContainer.createSpacer(size, 1), index);
    }

    /* override */
    protected doLayout(): void {
        const maxHeight = this._vAlign === VAlign.TOP ? 0
            : Math.max(...this.children.filter(
                (child) => child.visible
            ).map(
                (child) => DisplayUtil.getBoundsRelative(child, this, HLayoutContainer.R).height
            ));

        const from: number = this._reversed ? this.children.length - 1 : 0;
        const to: number = this._reversed ? -1 : this.children.length;
        const inc: number = this._reversed ? -1 : 1;

        let x = 0;
        for (let ii = from; ii !== to; ii += inc) {
            const child = this.getChildAt(ii);
            if (!child.visible) {
                continue;
            }
            child.x = 0;
            child.y = 0;
            const bounds = DisplayUtil.getBoundsRelative(child, this, HLayoutContainer.R);
            child.x = -bounds.left + x;
            child.y = -bounds.top;
            if (this._vAlign === VAlign.CENTER) {
                child.y += (maxHeight - bounds.height) * 0.5;
            } else if (this._vAlign === VAlign.BOTTOM) {
                child.y += maxHeight - bounds.height;
            }

            x += bounds.width + this._hOffset;
        }
    }

    protected _hOffset: number;
    protected _vAlign: VAlign;
    protected _reversed: boolean;

    protected static R: Rectangle = new Rectangle();
}
