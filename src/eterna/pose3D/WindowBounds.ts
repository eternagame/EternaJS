import {
    Assert, Flashbang, HAlign, VAlign
} from 'flashbang';

/**
 * Wrapper for determining the position of the window, but being smart about it. Some things handled:
 * - If most of our width is closer to an edge rather than the center, resizing the screen should
 *   preserve it's distance to that edge rather than the center. We determine this by comparing the
 *   center of the window to the "quartiles" of the screen.
 * - The width and height should be relative to the screen size.
 */
export default class WindowBounds {
    constructor(x: number, y: number, width: number, height: number) {
        this.setYOffset(y, height);
        this.setXOffset(x, width);
    }

    public clone(): WindowBounds {
        return new WindowBounds(this.x, this.y, this.width, this.height);
    }

    public set x(x: number) {
        this.setXOffset(x, this.width);
    }

    public get x(): number {
        Assert.assertIsDefined(Flashbang.stageWidth);
        switch (this._xOffsetReference) {
            case HAlign.LEFT:
                return this._xOffsetRatio * Flashbang.stageWidth;
            case HAlign.CENTER:
                // Stage center + offset of our center - adjustment to left edge
                return (Flashbang.stageWidth / 2) + (this._xOffsetRatio * Flashbang.stageWidth) - (this.width / 2);
            case HAlign.RIGHT:
                // Stage right - offset of our right - adjustment to left edge
                return Flashbang.stageWidth - (this._xOffsetRatio * Flashbang.stageWidth) - this.width;
            default:
                return Assert.unreachable(this._xOffsetReference);
        }
    }

    public set y(y: number) {
        this.setYOffset(y, this.height);
    }

    public get y() {
        Assert.assertIsDefined(Flashbang.stageHeight);
        switch (this._yOffsetReference) {
            case VAlign.TOP:
                return this._yOffsetRatio * Flashbang.stageHeight;
            case VAlign.CENTER:
                // Stage center + offset of our center - adjustment to left edge
                return (Flashbang.stageHeight / 2) + (this._yOffsetRatio * Flashbang.stageHeight) - (this.height / 2);
            case VAlign.BOTTOM:
                // Stage right - offset of our right - adjustment to left edge
                return Flashbang.stageHeight - (this._yOffsetRatio * Flashbang.stageHeight) - this.height;
            default:
                return Assert.unreachable(this._yOffsetReference);
        }
    }

    public set width(width: number) {
        this.setXOffset(this.x, width);
    }

    public get width(): number {
        Assert.assertIsDefined(Flashbang.stageWidth);
        return this._widthRatio * Flashbang.stageWidth;
    }

    public set height(height: number) {
        this.setYOffset(this.y, height);
    }

    public get height(): number {
        Assert.assertIsDefined(Flashbang.stageHeight);
        return this._heightRatio * Flashbang.stageHeight;
    }

    private setXOffset(x: number, width: number) {
        Assert.assertIsDefined(Flashbang.stageWidth);
        if (x + (width / 2) < 0.25 * Flashbang.stageWidth || x < 0) {
            this._xOffsetReference = HAlign.LEFT;
            this._xOffsetRatio = x / Flashbang.stageWidth;
        } else if (x + (width / 2) > 0.75 * Flashbang.stageWidth || x + width > Flashbang.stageWidth) {
            this._xOffsetReference = HAlign.RIGHT;
            const offsetFromRight = Flashbang.stageWidth - (x + width);
            this._xOffsetRatio = offsetFromRight / Flashbang.stageWidth;
        } else {
            this._xOffsetReference = HAlign.CENTER;
            const centerPos = x + width / 2;
            this._xOffsetRatio = (centerPos - (Flashbang.stageWidth / 2)) / Flashbang.stageWidth;
        }
        this._widthRatio = width / Flashbang.stageWidth;
    }

    private setYOffset(y: number, height: number) {
        Assert.assertIsDefined(Flashbang.stageHeight);
        if (y + (height / 2) < 0.25 * Flashbang.stageHeight || y < 0) {
            this._yOffsetReference = VAlign.TOP;
            this._yOffsetRatio = y / Flashbang.stageHeight;
        } else if (y + (height / 2) > 0.75 * Flashbang.stageHeight) {
            this._yOffsetReference = VAlign.BOTTOM;
            const offsetFromRight = Flashbang.stageHeight - (y + height);
            this._yOffsetRatio = offsetFromRight / Flashbang.stageHeight;
        } else {
            this._yOffsetReference = VAlign.CENTER;
            const centerPos = y + height / 2;
            this._yOffsetRatio = (centerPos - (Flashbang.stageHeight / 2)) / Flashbang.stageHeight;
        }
        this._heightRatio = height / Flashbang.stageHeight;
    }

    private _xOffsetRatio: number;
    private _xOffsetReference: HAlign;
    private _yOffsetRatio: number;
    private _yOffsetReference: VAlign;
    private _widthRatio: number;
    private _heightRatio: number;
}
