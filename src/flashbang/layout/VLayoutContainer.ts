import {Rectangle} from 'pixi.js';
import {HAlign} from 'flashbang/core/Align';
import DisplayUtil from 'flashbang/util/DisplayUtil';
import LayoutContainer from './LayoutContainer';

/**
 * A Container that arranges its children vertically.
 * Call layout() after adding or removing children to update the sprite's layout.
 */
export default class VLayoutContainer extends LayoutContainer {
    constructor(vOffset: number = 0, hAlign: HAlign = HAlign.CENTER) {
        super();
        this._vOffset = vOffset;
        this._hAlign = hAlign;
    }

    public get reversed(): boolean {
        return this._reversed;
    }

    /** If true, then children are laid out bottom-to-top instead of top-to-bottom */
    public set reversed(val: boolean) {
        if (this._reversed !== val) {
            this._reversed = val;
            this._needsLayout = true;
        }
    }

    public get vOffset(): number {
        return this._vOffset;
    }

    public set vOffset(val: number) {
        if (this._vOffset !== val) {
            this._vOffset = val;
            this._needsLayout = true;
        }
    }

    public get hAlign(): HAlign {
        return this._hAlign;
    }

    public set hAlign(val: HAlign) {
        if (this._hAlign !== val) {
            this._hAlign = val;
            this._needsLayout = true;
        }
    }

    public addVSpacer(size: number): void {
        this.addVSpacerAt(size, this.children.length);
    }

    public addVSpacerAt(size: number, index: number): void {
        this.addChildAt(LayoutContainer.createSpacer(1, size), index);
    }

    /* override */
    protected doLayout(): void {
        const maxWidth = this._hAlign === HAlign.LEFT ? 0
            : Math.max(...this.children.filter(
                (child) => child.visible
            ).map(
                (child) => DisplayUtil.getBoundsRelative(child, this, VLayoutContainer.R).width
            ));

        const from: number = this._reversed ? this.children.length - 1 : 0;
        const to: number = this._reversed ? 0 : this.children.length;
        const inc: number = this._reversed ? -1 : 1;

        let y = 0;
        for (let ii = from; ii !== to; ii += inc) {
            const child = this.getChildAt(ii);
            if (child.visible) {
                child.x = 0;
                child.y = 0;
                const bounds = DisplayUtil.getBoundsRelative(child, this, VLayoutContainer.R);
                child.y = -bounds.top + y;
                child.x = -bounds.left;
                if (this._hAlign === HAlign.CENTER) {
                    child.x += (maxWidth - bounds.width) * 0.5;
                } else if (this._hAlign === HAlign.RIGHT) {
                    child.x += maxWidth - bounds.width;
                }

                y += bounds.height + this._vOffset;
            }
        }
    }

    protected _vOffset: number;
    protected _hAlign: HAlign;
    protected _reversed: boolean;

    protected static R: Rectangle = new Rectangle();
}
