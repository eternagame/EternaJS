import {Graphics, InteractionEvent, Point} from 'pixi.js';
import {Signal} from 'signals';
import {
    ContainerObject, DisplayObjectPointerTarget, Dragger, GameObjectRef
} from 'flashbang';

export default class FloatSliderBar extends ContainerObject {
    // The width (or height, for a horizontal FloatSliderBar) of the thumb
    public static readonly THUMB_MIN_SIZE = 40;
    private THUMB_SIZE = 40;
    private THUMB_Scale = 1;

    public readonly scrollChanged = new Signal<number>();

    constructor(vertical: boolean) {
        super();
        this._vertical = vertical;

        this._sliderLine = new Graphics();
        this.container.addChild(this._sliderLine);

        this._barRect = new Graphics();
        this.drawBar();
        this.container.addChild(this._barRect);

        this._currentVal = 0;

        const barPointerTarget = new DisplayObjectPointerTarget(this._barRect);
        const linePointerTarget = new DisplayObjectPointerTarget(this._sliderLine);

        barPointerTarget.pointerDown.connect((e) => this.onMouseDown(e));
        linePointerTarget.pointerDown.connect((e) => this.onSliderLineClicked(e));

        this.onSizeChanged();
    }

    public setSize(size: number, docSize:number, winSize:number): void {
        if (this._size !== size) {
            this._size = size;
            this._docSize = docSize;
            this._winSize = winSize;
            this.onSizeChanged();
        }
    }

    public getProgress(): number {
        if (this._docSize > this._winSize) { return this._currentVal / (this._docSize - this._winSize); } else return 0;
    }

    public setProgress(progress: number): void {
        if (this._vertical) {
            this._currentVal = progress;
            this._barRect.y = this._currentVal * (this._size - 10);
        } else {
            this._currentVal = progress;
            this._barRect.x = this._currentVal * (this._size - 10);
        }

        this.scrollChanged.emit(progress);
    }

    private drawSliderLine() {
        this._sliderLine.clear();
        this._sliderLine.beginFill(0x0C1A31);
        if (this._vertical) {
            this._sliderLine.drawRect(0, 0, 15, this._size);
        } else {
            this._sliderLine.drawRect(0, 0, this._size, 15);
        }
        this._sliderLine.endFill();
        this._sliderLine.lineStyle(1, 0x3E566A);
        if (this._vertical) {
            this._sliderLine.moveTo(8, 0);
            this._sliderLine.lineTo(8, this._size);
        } else {
            this._sliderLine.moveTo(0, 8);
            this._sliderLine.lineTo(this._size, 8);
        }
    }

    private drawBar() {
        this.calcThumbSize();

        this._barRect.clear();
        this._barRect.beginFill(0x3E566A);
        if (this._vertical) {
            this._barRect.drawRoundedRect(0, 0, 15, this.THUMB_SIZE, 3);
        } else {
            this._barRect.drawRoundedRect(0, 0, this.THUMB_SIZE, 15, 3);
        }
        this._barRect.endFill();
    }

    protected onSizeChanged(): void {
        this.drawSliderLine();
        this.drawBar();

        this.calcThumbSize();

        const p = this._currentVal / (this._docSize - this._winSize);
        if (this._vertical) {
            this._barRect.y = p * (this._size - this.THUMB_SIZE);
        } else {
            this._barRect.x = p * (this._size - this.THUMB_SIZE);
        }
    }

    private calcThumbSize() {
        this.THUMB_SIZE = FloatSliderBar.THUMB_MIN_SIZE;
        this.THUMB_Scale = 1;
        if (this._docSize > this._winSize) {
            const scrollSize = this._docSize - this._winSize;
            const thumbSize = this._size - scrollSize;
            this.THUMB_SIZE = Math.max(FloatSliderBar.THUMB_MIN_SIZE, thumbSize);
            if (thumbSize < FloatSliderBar.THUMB_MIN_SIZE) {
                this.THUMB_Scale = scrollSize / (this._size - FloatSliderBar.THUMB_MIN_SIZE);
            }
        }
    }

    private onMouseDown(e:InteractionEvent): void {
        this._draggerRef.destroyObject();

        const dragger = new Dragger();
        this._draggerRef = this.addObject(dragger);

        this.calcThumbSize();

        this._prevDownPt.x = e.data.global.x;
        this._prevDownPt.y = e.data.global.y;

        dragger.dragComplete.connect(() => dragger.destroySelf());
        dragger.dragged.connect((p:Point) => {
            if (this._vertical) {
                const dy = p.y - this._prevDownPt.y;
                this._currentVal = Math.max(0,
                    Math.min(this._currentVal + dy * this.THUMB_Scale, this._docSize - this._winSize));
                this._barRect.y = Math.max(0,
                    Math.min(this._barRect.y + dy, this._size - this.THUMB_SIZE));
            } else {
                const dx = p.x - this._prevDownPt.x;
                this._currentVal = Math.max(0,
                    Math.min(this._currentVal + dx * this.THUMB_Scale, this._docSize - this._winSize));
                this._barRect.x = Math.max(0,
                    Math.min(this._barRect.x + dx, this._size - this.THUMB_SIZE));
            }
            this._prevDownPt.x = p.x;
            this._prevDownPt.y = p.y;

            this.scrollChanged.emit(this.getProgress());
        });
    }

    private onSliderLineClicked(e: InteractionEvent): void {
        this.calcThumbSize();

        const downPt = this.container.toLocal(e.data.global);
        if (this._vertical) {
            const Y = downPt.y;
            if (Y < this._barRect.y) {
                this._currentVal = Math.max(0,
                    Math.min(this._currentVal + (Y - this._barRect.y) * this.THUMB_Scale,
                        this._docSize - this._winSize));
                this._barRect.y = Math.max(0, Y);
            } else {
                this._currentVal = Math.max(0,
                    Math.min(this._currentVal + (Y - this._barRect.y - this.THUMB_SIZE) * this.THUMB_Scale,
                        this._docSize - this._winSize));
                this._barRect.y = Math.max(0, Y - this.THUMB_SIZE);
            }
        } else {
            const X = downPt.x;
            if (X < this._barRect.x) {
                this._currentVal = Math.max(0,
                    Math.min(this._currentVal + (X - this._barRect.x) * this.THUMB_Scale,
                        this._docSize - this._winSize));
                this._barRect.x = Math.max(0, X);
            } else {
                this._currentVal = Math.max(0,
                    Math.min(this._currentVal + (X - this._barRect.x - this.THUMB_SIZE) * this.THUMB_Scale,
                        this._docSize - this._winSize));
                this._barRect.x = Math.max(0, X - this.THUMB_SIZE);
            }
        }

        this.scrollChanged.emit(this.getProgress());
    }

    private readonly _vertical: boolean;
    private readonly _barRect: Graphics;
    private readonly _sliderLine: Graphics;

    private _draggerRef: GameObjectRef = GameObjectRef.NULL;
    private _currentVal: number = 0;
    private _prevDownPt: Point = new Point();

    private _size: number = 0;
    private _docSize: number = 0;
    private _winSize: number = 0;
}
