import {Graphics, Point} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GameObjectRef} from "../../flashbang/core/GameObjectRef";
import {DisplayObjectPointerTarget} from "../../flashbang/input/DisplayObjectPointerTarget";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Dragger} from "../../flashbang/util/Dragger";
import {Signal} from "../../signals/Signal";

export class SliderBar extends ContainerObject {
    // The width (or height, for a horizontal SliderBar) of the thumb
    public static readonly THUMB_SIZE = 15;

    public readonly scrollChanged = new Signal<number>();

    constructor(vertical: boolean) {
        super();
        this._vertical = vertical;

        this._sliderLine = new Graphics();
        this.container.addChild(this._sliderLine);

        this._barRect = new Graphics();
        this._barRect.beginFill(0x3E566A);
        if (vertical) {
            this._barRect.drawRoundedRect(-6, -26, 11, 40, 3);
        } else {
            this._barRect.drawRoundedRect(-26, -6, 40, 11, 3);
        }
        this._barRect.endFill();

        this.container.addChild(this._barRect);

        this._current_val = 1;

        let barPointerTarget = new DisplayObjectPointerTarget(this._barRect);
        let linePointerTarget = new DisplayObjectPointerTarget(this._sliderLine);

        barPointerTarget.pointerDown.connect(() => this.onMouseDown());
        linePointerTarget.pointerDown.connect(() => this.onSliderLineClicked());

        this.onSizeChanged();
    }

    public setSize(width: number, height: number): void {
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this.onSizeChanged();
        }
    }

    public get_progress(): number {
        return this._current_val;
    }

    public set_progress(prog: number): void {
        if (this._vertical) {
            this._current_val = prog;
            this._barRect.y = this._current_val * (this._height - 10) + 10;
        } else {
            this._current_val = prog;
            this._barRect.x = this._current_val * (this._width - 10) + 10;
        }

        this.scrollChanged.emit(prog);
    }

    protected onSizeChanged(): void {
        this._sliderLine.clear();
        this._sliderLine.beginFill(0x0C1A31);
        if (this._vertical) {
            this._sliderLine.drawRect(-8, -17, 15, this._height + 30);
        } else {
            this._sliderLine.drawRect(-17, -8, this._width + 30, 15);
        }
        this._sliderLine.endFill();
        this._sliderLine.lineStyle(1, 0x3E566A);
        this._sliderLine.moveTo(0, 0);
        if (this._vertical) {
            this._sliderLine.lineTo(0, this._height);
        } else {
            this._sliderLine.lineTo(this._width, 0);
        }

        if (this._vertical) {
            this._barRect.y = this._current_val * (this._height - 10) + 10;
        } else {
            this._barRect.x = this._current_val * (this._width - 10) + 10;
        }
    }

    private onMouseDown(): void {
        this._draggerRef.destroyObject();

        let dragger = new Dragger();
        this._draggerRef = this.addObject(dragger);

        dragger.dragComplete.connect(() => dragger.destroySelf());
        dragger.dragged.connect(() => {
            let mouse = this.container.toLocal(new Point(dragger.curX, dragger.curY));
            if (this._vertical) {
                if (mouse.y < 0) {
                    this._current_val = 0;
                } else if (mouse.y > this._height) {
                    this._current_val = 1;
                } else {
                    if (this._height > 0) {
                        this._current_val = mouse.y / this._height;
                    } else {
                        this._current_val = 1;
                    }
                }

                this._barRect.y = this._current_val * (this._height - 10) + 10;
            } else {
                if (mouse.x < 0) {
                    this._current_val = 0;
                } else if (mouse.x > this._width) {
                    this._current_val = 1;
                } else {
                    if (this._width > 0) {
                        this._current_val = mouse.x / this._width;
                    } else {
                        this._current_val = 1;
                    }
                }

                this._barRect.x = this._current_val * (this._width - 10) + 10;
            }

            this.scrollChanged.emit(this.get_progress());
        });
    }

    private onSliderLineClicked(): void {
        let mouse = this.container.toLocal(Flashbang.globalMouse);

        if (this._vertical) {
            if (this._height > 0) {
                this._current_val = mouse.y / this._height;
            } else {
                this._current_val = 1;
            }
            this._barRect.y = this._current_val * (this._height - 10) + 10;

        } else {
            if (this._width > 0) {
                this._current_val = mouse.x / this._width;
            } else {
                this._current_val = 1;
            }
            this._barRect.x = this._current_val * (this._width - 10) + 10;
        }

        this.scrollChanged.emit(this.get_progress());
    }

    private readonly _vertical: boolean;
    private readonly _barRect: Graphics;
    private readonly _sliderLine: Graphics;

    private _draggerRef: GameObjectRef = GameObjectRef.NULL;
    private _current_val: number = 1;

    private _width: number;
    private _height: number;
}
