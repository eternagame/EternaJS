import {Container, Graphics} from 'pixi.js';
import {
    MathUtil, ContainerObject, Assert, Flashbang
} from 'flashbang';
import Eterna from 'eterna/Eterna';

export default class ScrollContainer extends ContainerObject {
    public readonly content = new Container();

    constructor(width: number, height: number, radius: number = 0) {
        super();
        this._width = width;
        this._height = height;
        this._radius = radius;
    }

    protected added() {
        super.added();

        this.display.addChild(this.content);
        this.display.addChild(this._contentMask);
        this.content.mask = this._contentMask;

        const overlayEl = document.getElementById(Eterna.OVERLAY_DIV_ID);
        Assert.assertIsDefined(overlayEl);
        this._htmlWrapper = document.createElement('div');
        this._htmlWrapper.style.position = 'absolute';
        // Turn off pointer events for the wrapper, but keep them on for children
        // (handled via) our stylesheet
        this._htmlWrapper.classList.add('scroll-container-wrapper');
        overlayEl.appendChild(this._htmlWrapper);

        this.doLayout();
    }

    protected dispose(): void {
        const overlayEl = document.getElementById(Eterna.OVERLAY_DIV_ID);
        Assert.assertIsDefined(overlayEl);
        overlayEl.removeChild(this._htmlWrapper);

        super.dispose();
    }

    public get scrollX(): number {
        return -this.content.x;
    }

    public set scrollX(value: number) {
        this.setScroll(value, this.scrollY);
    }

    public get maxScrollX(): number {
        return Math.max(this.content.width - this._width, 0);
    }

    public get scrollY(): number {
        return -this.content.y;
    }

    public set scrollY(value: number) {
        this.setScroll(this.scrollX, value);
    }

    public get maxScrollY(): number {
        return Math.max(this.content.height - this._height, 0);
    }

    public setScroll(scrollX: number, scrollY: number): void {
        this.content.x = -MathUtil.clamp(scrollX, 0, this.maxScrollX);
        this.content.y = -MathUtil.clamp(scrollY, 0, this.maxScrollY);
    }

    /** Sets the size of the container's content viewport */
    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }

        this._width = width;
        this._height = height;

        this.doLayout();
    }

    public doLayout() {
        const prevScrollX = this.scrollX;
        const prevScrollY = this.scrollY;

        this._contentMask
            .clear()
            .beginFill(0x00ff00)
            .drawRoundedRect(0, 0, this._width, this._height, this._radius)
            .endFill();

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this._htmlWrapper.style.width = `${Flashbang.stageWidth}px`;
        this._htmlWrapper.style.height = `${Flashbang.stageHeight}px`;
        const {
            x, y, width, height
        } = this.display.getBounds();
        this._htmlWrapper.style.clipPath = `polygon(
            ${x}px ${y}px,
            ${x + width}px ${y}px,
            ${x + width}px ${y + height}px,
            ${x}px ${y + height}px
        )`;

        this.setScroll(prevScrollX, prevScrollY);
    }

    /**
     * HTML wrapper element used to mask HTML children - all HTML content added to this
     * scroll container should be added as a child of this element
     */
    public get htmlWrapper(): HTMLDivElement {
        return this._htmlWrapper;
    }

    private readonly _contentMask = new Graphics();
    private _htmlWrapper: HTMLDivElement;

    private _width: number;
    private _height: number;
    private _radius: number;
}
