import {Point, Sprite, Texture} from 'pixi.js';
import {
    ContainerObject, Vector2, Updatable, Assert
} from 'flashbang';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import Pose2D from 'eterna/pose2D/Pose2D';

export default class NovaPaintHint extends ContainerObject implements Updatable {
    constructor(start: Point, end: Point, loop: boolean) {
        super();
        this._active = false;
        this._startPoint = start;
        this._endPoint = end;
        this._loop = loop;

        this._noClick = BitmapManager.getBitmap(Bitmaps.NovaFinger);
        this._clickImg = BitmapManager.getBitmap(Bitmaps.NovaFingerClick);

        this._img = new Sprite(this._noClick);
        this.container.addChild(this._img);
    }

    public initialize(): void {
        this._active = true;
        this._totalDistance = 0.0;
        this.display.position = this._startPoint;
    }

    public setAnchorNucleotide(rna: Pose2D, base: number): void {
        this._rna = rna;
        this._base = base;
        this._anchorSet = true;
    }

    public update(dt: number): void {
        if (!this._active) {
            return;
        }

        Assert.assertIsDefined(this.mode);
        let currentTime = this.mode.time;

        let startPos: Point = this._startPoint;
        if (this._anchorSet) {
            startPos = this._rna.getBaseLoc(this._base);
        }

        if (this._lastTimeTick === 0) {
            this._lastTimeTick = currentTime;
            return;
        }

        if (this._startAnimTime === -1) {
            this._startAnimTime = currentTime;
        }

        let stageTime: number = (currentTime - this._startAnimTime);
        let dir = new Vector2(this._endPoint.x - this._startPoint.x, this._endPoint.y - this._startPoint.y);
        if (stageTime < 1.5 && this._curStage === 0) {
            if (stageTime >= 1.4) {
                ++this._curStage;
            } else if (stageTime > 0.7) {
                this._img.texture = this._clickImg;
            }
        } else if (this._curStage === 1) {
            let deltaTime: number = currentTime - this._lastTimeTick;
            // Move from our current position to the end
            let stepDistance = deltaTime * NovaPaintHint.PAINT_HINT_SPEED;
            this._totalDistance += stepDistance;
            if (
                this._totalDistance
                >= Vector2.distance(this._startPoint.x, this._startPoint.y, this._endPoint.x, this._endPoint.y) - 1.5
            ) {
                this._endAnimTime = currentTime;
                ++this._curStage;
            }
        } else if (this._curStage === 2) {
            if (!this._loop) {
                this._active = false;
                return;
            }

            let endTime: number = (currentTime - this._endAnimTime) / 1000.0;
            if (endTime > 1.0) {
                this._startAnimTime = -1;
                this._curStage = 0;
                this.initialize();
            } else if (endTime > 0.5) {
                this._img.texture = this._noClick;
            }
        }
        this._lastTimeTick = currentTime;

        dir.length = this._totalDistance;
        this.display.position = new Point(startPos.x + dir.x, startPos.y + dir.y);
    }

    private readonly _startPoint: Point;
    private readonly _loop: boolean;
    private readonly _img: Sprite;
    private readonly _noClick: Texture;
    private readonly _clickImg: Texture;

    private _rna: Pose2D;
    private _base: number;
    private _anchorSet: boolean = false;
    private _endPoint: Point;
    private _active: boolean;
    private _lastTimeTick: number = 0;
    private _startAnimTime: number = -1;
    private _endAnimTime: number = -1;
    private _curStage: number = 0;
    private _totalDistance: number = 0;

    private static readonly PAINT_HINT_SPEED = 80;
}
