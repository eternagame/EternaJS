import {Container} from 'pixi.js';
import {MathUtil, ContainerObject} from 'flashbang';
import ScrollContainer from './ScrollContainer';
import SliderBar from './SliderBar';

/** Contains scrollable content and a vertical sliderbar */
export default class VScrollBox extends ContainerObject {
    constructor(width: number, height: number) {
        // super(new ScrollContainer(width - SliderBar.THUMB_SIZE, height));
        super();
        this._scrollContainer = new ScrollContainer(width - SliderBar.THUMB_SIZE, height);
        this.addObject(this._scrollContainer, this.display);
        this._width = width;
        this._height = height;

        this._sliderBar = new SliderBar(true);
        this.addObject(this._sliderBar, this._display);
        this._sliderBar.setProgress(0);
        this._sliderBar.scrollChanged.connect((progress) => { this.scrollProgress = progress; });
    }

    /** Attach scrollable content here */
    public get content(): Container {
        return this._scrollContainer.content;
    }

    public get height() { return this._height; }

    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }

        this._width = width;
        this._height = height;
        this._scrollContainer.setSize(width - SliderBar.THUMB_SIZE, height);

        this._sliderBar.setSize(0, height);
        this._sliderBar.display.position.x = width - SliderBar.THUMB_SIZE;
        this._sliderBar.display.visible = this._scrollContainer.maxScrollY > 0;
    }

    public get scrollProgress(): number {
        return this._scrollContainer.maxScrollY > 0
            ? this._scrollContainer.scrollY / this._scrollContainer.maxScrollY : 0;
    }

    /** A value between 0 and 1 */
    public set scrollProgress(value: number) {
        this._scrollContainer.setScroll(0, MathUtil.clamp(value, 0, 1) * this._scrollContainer.maxScrollY);
    }

    public scrollTo(value: number) {
        this._sliderBar.setProgress(MathUtil.clamp(value, 0, 1));
    }

    public get htmlWrapper() {
        return this._scrollContainer.htmlWrapper;
    }

    private readonly _scrollContainer: ScrollContainer;
    private readonly _sliderBar: SliderBar;

    private _width: number;
    private _height: number;
}
