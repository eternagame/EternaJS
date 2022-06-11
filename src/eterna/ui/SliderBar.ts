import {Graphics, InteractionEvent, Point} from 'pixi.js';
import {Signal} from 'signals';
import {
    ContainerObject, DisplayObjectPointerTarget, Dragger, GameObjectRef
} from 'flashbang';

export default class SliderBar extends ContainerObject {
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

        this._currentVal = 1;

        const barPointerTarget = new DisplayObjectPointerTarget(this._barRect);
        const linePointerTarget = new DisplayObjectPointerTarget(this._sliderLine);

        barPointerTarget.pointerDown.connect(() => this.onMouseDown());
        linePointerTarget.pointerDown.connect((e) => this.onSliderLineClicked(e));

        this.onSizeChanged();
    }

    public setSize(width: number, height: number): void {
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this.onSizeChanged();
        }
    }

    public getProgress(): number {
        return this._currentVal;
    }

    public get height(): number {
        return this._height;
    }

    public setProgress(progress: number): void {
        if (this._vertical) {
            this._currentVal = progress;
            this._barRect.y = this._currentVal * (this._height - 10) + 10;
        } else {
            this._currentVal = progress;
            this._barRect.x = this._currentVal * (this._width - 10) + 10;
        }

        this.scrollChanged.emit(progress);
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
            this._barRect.y = this._currentVal * (this._height - 10) + 10;
        } else {
            this._barRect.x = this._currentVal * (this._width - 10) + 10;
        }
    }

    private onMouseDown(): void {
        this._draggerRef.destroyObject();

        const dragger = new Dragger();
        this._draggerRef = this.addObject(dragger);

        dragger.dragComplete.connect(() => dragger.destroySelf());
        dragger.dragged.connect(() => {
            const mouse = this.container.toLocal(new Point(dragger.curX, dragger.curY));
            if (this._vertical) {
                if (mouse.y < 0) {
                    this._currentVal = 0;
                } else if (mouse.y > this._height) {
                    this._currentVal = 1;
                } else if (this._height > 0) {
                    this._currentVal = mouse.y / this._height;
                } else {
                    this._currentVal = 1;
                }

                this._barRect.y = this._currentVal * (this._height - 10) + 10;
            } else {
                if (mouse.x < 0) {
                    this._currentVal = 0;
                } else if (mouse.x > this._width) {
                    this._currentVal = 1;
                } else if (this._width > 0) {
                    this._currentVal = mouse.x / this._width;
                } else {
                    this._currentVal = 1;
                }

                this._barRect.x = this._currentVal * (this._width - 10) + 10;
            }

            this.scrollChanged.emit(this.getProgress());
        });
    }

    private onSliderLineClicked(e: InteractionEvent): void {
        if (this._vertical) {
            if (this._height > 0) {
                this._currentVal = e.data.getLocalPosition(this.container).y / this._height;
            } else {
                this._currentVal = 1;
            }
            this._barRect.y = this._currentVal * (this._height - 10) + 10;
        } else {
            if (this._width > 0) {
                this._currentVal = e.data.getLocalPosition(this.container).x / this._width;
            } else {
                this._currentVal = 1;
            }
            this._barRect.x = this._currentVal * (this._width - 10) + 10;
        }

        this.scrollChanged.emit(this.getProgress());
    }

    private readonly _vertical: boolean;
    private readonly _barRect: Graphics;
    private readonly _sliderLine: Graphics;

    private _draggerRef: GameObjectRef = GameObjectRef.NULL;
    private _currentVal: number = 1;

    private _width: number;
    private _height: number;
}
