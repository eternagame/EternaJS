import {Container} from "pixi.js";
import {SceneObject} from "flashbang/objects";
import {MathUtil} from "flashbang/util";
import ScrollContainer from "./ScrollContainer";
import SliderBar from "./SliderBar";

/** Contains scrollable content and a vertical sliderbar */
export default class VScrollBox extends SceneObject<ScrollContainer> {
    public constructor(width: number, height: number) {
        super(new ScrollContainer(width - SliderBar.THUMB_SIZE, height));
        this._width = width;
        this._height = height;

        this._sliderBar = new SliderBar(true);
        this.addObject(this._sliderBar, this._display);
        this._sliderBar.set_progress(0);
        this._sliderBar.scrollChanged.connect(progress => this.scrollProgress = progress);
    }

    /** Attach scrollable content here */
    public get content(): Container {
        return this.display.content;
    }

    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }

        this._width = width;
        this._height = height;
        this._display.setSize(width - SliderBar.THUMB_SIZE, height);

        this._sliderBar.setSize(0, height);
        this._sliderBar.display.position.x = width - SliderBar.THUMB_SIZE;
        this._sliderBar.display.visible = this._display.maxScrollY > 0;
    }

    public get scrollProgress(): number {
        return this.display.maxScrollY > 0 ? this.display.scrollY / this.display.maxScrollY : 0;
    }

    /** A value between 0 and 1 */
    public set scrollProgress(value: number) {
        this.display.setScroll(0, MathUtil.clamp(value, 0, 1) * this.display.maxScrollY);
    }

    public scrollTo(value: number) {
        this._sliderBar.set_progress(MathUtil.clamp(value, 0, 1));
    }

    private readonly _sliderBar: SliderBar;

    private _width: number;
    private _height: number;
}
