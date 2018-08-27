import * as log from "loglevel";
import {Point, Sprite, Texture} from "pixi.js";
import {LateUpdatable} from "../../flashbang/core/LateUpdatable";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Constants} from "../Constants";
import {EPars} from "../EPars";
import {Eterna} from "../Eterna";
import {ROPWait} from "../rscript/ROPWait";
import {BaseAssets} from "./BaseAssets";
import {BaseDrawFlags} from "./BaseDrawFlags";
import {Pose2D, RNAHighlightState} from "./Pose2D";

type ColorMatrixFilter = PIXI.filters.ColorMatrixFilter;

export class Base extends ContainerObject implements LateUpdatable {
    public static NUM_ZOOM_LEVELS: number = 2;
    public static ZOOM_SCALE_FACTOR: number = 0.75;

    constructor(pose: Pose2D, type: number) {
        super();
        BaseAssets.init();
        this._pose = pose;
        this.setType(type);

        // build our display hierarchy
        this.container.addChild(this._barcode);
        this.container.addChild(this._body);
        this.container.addChild(this._backbone);
        this.container.addChild(this._letter);
        this.container.addChild(this._sat0);
        this.container.addChild(this._sat1);
        this.container.addChild(this._number);
    }

    public set baseIndex(i: number) {
        this._baseIdx = i;
    }

    public startSparking(): void {
        if (this._sparking) {
            return;
        }

        this._sparking = true;
        this._sparkStartTime = -1;
        let rand_angle: number = Math.random() * Math.PI * 2;
        this._sparkDir = new Point(Math.cos(rand_angle), Math.sin(rand_angle));
    }

    public setGoDir(go_x: number, go_y: number): void {
        if (Math.abs(go_x - this._goX) > Constants.EPSILON) {
            this._goX = go_x;
            this._needsRedraw = true;
        }

        if (Math.abs(go_y - this._goY) > Constants.EPSILON) {
            this._goY = go_y;
            this._needsRedraw = true;
        }
    }

    public setOutDir(out_x: number, out_y: number): void {
        if (Math.abs(out_x - this._outX) > Constants.EPSILON) {
            this._outX = out_x;
            this._needsRedraw = true;
        }

        if (Math.abs(out_y - this._outY) > Constants.EPSILON) {
            this._outY = out_y;
            this._needsRedraw = true;
        }
    }

    public getOutXY(out: Point = null): Point {
        if (out == null) {
            out = new Point();
        }
        out.x = this._outX;
        out.y = this._outY;
        return out;
    }

    public get x(): number {
        return this.display.x;
    }

    public get y(): number {
        return this.display.y;
    }

    public setXY(x: number, y: number): void {
        this.display.x = x;
        this.display.y = y;
    }

    public setType(type: number, playSound: boolean = false): void {
        if (this._baseType === type) {
            return;
        }

        this._baseType = type;
        this._needsRedraw = true;

        if (playSound) {
            const soundName: string = BaseAssets.getBaseTypeSound(type);
            if (soundName != null) {
                Eterna.sound.play_se(soundName);
            }
        }
        ROPWait.NotifyNucleotideChange(this._baseIdx, type);
    }

    public get type(): number {
        return this._baseType;
    }

    public set forced(forced: boolean) {
        this._isForced = forced;
    }

    public set dontcare(dontcare: boolean) {
        this._isDontcare = dontcare;
    }

    public set forceUnpaired(force: boolean) {
        this._forceUnpaired = force;
    }

    public needRedraw(is_static: boolean): boolean {
        if (!this.display.visible || this._baseType === EPars.RNABASE_CUT) {
            return false;
        }

        return this._needsRedraw ||
            (this._animate && !is_static) ||
            (this._pairing && !is_static) ||
            (this._unpairing && !is_static) ||
            this._sparking;
    }

    public setDirty(): void {
        this._needsRedraw = true;
    }

    public setColorLevel(use_color: boolean, color_level: number): void {
        if (!use_color) {
            this._colorLevel = -1;
            return;
        }

        this._colorLevel = color_level;
    }

    public setLast(lastbase: boolean): void {
        if (this._isLast !== lastbase) {
            this._isLast = lastbase;
            this._needsRedraw = true;
        }
    }

    public animate(): void {
        if (!this._animate && !this._unpairing) {
            this._animate = true;
            this._animStartTime = -1;
        }
    }

    public setPairing(pairing: boolean, go_x: number, go_y: number, duration: number, pair_type: number): void {
        let target_angle: number = Math.atan2(go_y, go_x) * 180.0 / Math.PI;

        if (this._pairing && !pairing) {
            this._unpairing = true;
            this._needsRedraw = true;
        }

        if (!this._pairing && pairing) {
            this._needsRedraw = true;
        }

        if (this._pairType !== pair_type) {
            this._needsRedraw = true;
        }

        this._pairing = pairing;

        if (this._pairing) {
            this._unpairing = false;
        }

        this._pairingStartTime = -1;
        this._pairingCompleteTime = -1;
        this._pairingDuration = duration;
        this._pairingStartDegree = this._lastSatellite1AbsDegree;
        this._pairingTargetDegree = target_angle;
        this._pairingStartRadius = this._lastSatellite1Radius;
        this._pairType = pair_type;

        if (Math.abs(this._pairingTargetDegree - this._pairingStartDegree) > 180) {
            if (this._pairingTargetDegree > this._pairingStartDegree) {
                this._pairingTargetDegree -= 360;
            } else {
                this._pairingTargetDegree += 360;
            }
        }
    }

    public isClicked(x: number, y: number, zoomlev: number, lenient: boolean): number {
        let diffx: number, diffy: number;

        diffx = this.x - x;
        diffy = this.y - y;

        let sq_dist: number = diffx * diffx + diffy * diffy;

        if (!lenient) {
            let threshold: number = BaseAssets.getHitTestDistanceThreshold(zoomlev);
            if (sq_dist < threshold * threshold) {
                return sq_dist;
            }
        } else if (sq_dist < 225) {
            return sq_dist;
        }
        return -1;
    }

    public setDrawParams(zoom_level: number, off_x: number, off_y: number, current_time: number, drawFlags: number, numberBitmap: Texture, highlight_state: RNAHighlightState = null) {
        this._zoomLevel = zoom_level;
        this._offX = off_x;
        this._offY = off_y;
        this._currentTime = current_time;
        this._drawFlags = drawFlags;
        this._highlightState = highlight_state;
        this._numberBitmap = numberBitmap;
        this._needsRedraw = true;
    }

    public lateUpdate(dt: number): void {
        if (this._needsRedraw && this.display.visible && this._baseType !== EPars.RNABASE_CUT) {
            this.redraw(this._zoomLevel, this._offX, this._offY, this._currentTime, this._drawFlags, this._numberBitmap, this._highlightState);
            this._needsRedraw = false;
        }
    }

    private redraw(zoom_level: number, off_x: number, off_y: number, current_time: number, drawFlags: number, numberBitmap: Texture, highlight_state: RNAHighlightState = null): void {
        this._body.visible = false;
        this._backbone.visible = false;
        this._barcode.visible = false;
        this._letter.visible = false;
        this._sat0.visible = false;
        this._sat1.visible = false;
        this._number.visible = false;

        if (this._isDontcare) {
            drawFlags |= BaseDrawFlags.IS_DONTCARE;
        }

        const lowperform: boolean = (drawFlags & BaseDrawFlags.LOW_PERFORM) !== 0;

        let body_data: Texture = BaseAssets.getBodyBitmap(this._baseType, this._colorLevel, zoom_level, drawFlags);
        const barcode_data: Texture = BaseAssets.getBarcodeBitmap(zoom_level, drawFlags);

        let random_x: number = 0;
        let random_y: number = 0;
        let angle_rand: number = 0;

        if (this._animate) {
            if (this._animStartTime < 0) {
                this._animStartTime = current_time;
            }

            let prog: number = (current_time - this._animStartTime) / 0.3;
            if (prog > 2 * Math.PI) {
                this._animate = false;
                prog = 2 * Math.PI;
            }

            let progsin: number = Math.sin(prog);
            angle_rand = Math.PI / 12.0 * progsin;

            random_x = this._goY * progsin * 0.07;
            random_y = -this._goX * progsin * 0.07;
        }

        let pairing_prog: number = 0;

        if (this._pairing || this._unpairing) {
            if (this._pairingStartTime < 0) {
                this._pairingStartTime = current_time;
            }

            if (this._pairingDuration === 0) {
                pairing_prog = 1;
                this._pairingCompleteTime = current_time;
            } else {
                pairing_prog = (current_time - this._pairingStartTime) / (this._pairingDuration);
                if (pairing_prog >= 1) {
                    pairing_prog = 1;
                    if (this._pairingCompleteTime < 0) {
                        this._pairingCompleteTime = current_time;
                    }
                }
            }
        }

        let draw_body: boolean = false;
        if (body_data) {
            draw_body = true;

            this._lastCenterX = this.display.x + random_x + off_x;
            this._lastCenterY = this.display.y + random_y + off_y;

            if (draw_body) {
                if (barcode_data != null) {
                    Base.showSprite(this._barcode, barcode_data);
                    this._barcode.x = random_x + off_x;
                    this._barcode.y = random_y + off_y;
                }

                if (this._isForced) {
                    // TODO
                    // let temp_bd: Texture = body_data.clone();
                    // temp_bd.colorTransform(base_rect, new ColorTransform(1, 1, 1, 0.2, 0, 0, 0, 0));
                    // body_data = temp_bd;
                }

                Base.showSprite(this._body, body_data);
                Base.showHighlightState(this._body, this._baseIdx, highlight_state);

                this._body.x = random_x + off_x;
                this._body.y = random_y + off_y;

                let letterdata: Texture = BaseAssets.getLetterBitmap(this._baseType, zoom_level, drawFlags);
                if (letterdata != null) {
                    Base.showSprite(this._letter, letterdata);
                    this._letter.x = random_x + off_x;
                    this._letter.y = random_y + off_y;
                }
            }
        }

        if (Math.abs(this._goX) > 0 || Math.abs(this._goY) > 0) {
            if (zoom_level < 2 * Base.NUM_ZOOM_LEVELS && !this._isLast && !lowperform) {
                const backbone_data: Texture = BaseAssets.getBackboneBitmap(zoom_level, drawFlags);
                Base.showSprite(this._backbone, backbone_data);
                this._backbone.x = random_x + off_x + this._goX / 2;
                this._backbone.y = random_y + off_y + this._goY / 2;
            }

            let go_radian: number = Math.atan2(this._goY, this._goX);
            let satellite_body_data: Texture;

            if (zoom_level < Base.NUM_ZOOM_LEVELS && !lowperform) {
                const reference_base_size: number = BaseAssets.getSatelliteReferenceBaseSize(zoom_level);

                let st0_diff_degree: number;
                let st0_angle: number = Math.PI / 5.2 + angle_rand;
                st0_diff_degree = (go_radian + st0_angle) * 180 / Math.PI - 90.0;
                st0_diff_degree = Base.toCanonicalRange(st0_diff_degree);


                if (Math.trunc(st0_diff_degree / 5) < 0 || Math.trunc(st0_diff_degree / 5) > 71) {
                    if (Math.trunc(st0_diff_degree / 5) < -1 || Math.trunc(st0_diff_degree / 5) > 72) {
                        log.debug(st0_diff_degree);
                        throw new Error("WHAT0");
                    }

                    st0_diff_degree = 0;
                }

                satellite_body_data = BaseAssets.getSatellite0Bitmap(zoom_level, st0_diff_degree);
                if (satellite_body_data == null) {
                    satellite_body_data = BaseAssets.getSatellite0Bitmap(zoom_level, st0_diff_degree);
                }

                let draw_st0: boolean = !this._forceUnpaired;

                if (draw_st0) {
                    let st0_cos: number = Math.cos(st0_angle);
                    let st0_sin: number = Math.sin(st0_angle);
                    let st0_x: number = this._goX / 2.5 * st0_cos - this._goY / 2.5 * st0_sin + off_x + random_x;
                    let st0_y: number = this._goX / 2.5 * st0_sin + this._goY / 2.5 * st0_cos + off_y + random_y;

                    Base.showSprite(this._sat0, satellite_body_data);
                    Base.showHighlightState(this._sat0, this._baseIdx, highlight_state);
                    this._sat0.x = st0_x;
                    this._sat0.y = st0_y;
                }

                let draw_st1: boolean = !this._forceUnpaired;
                let st1_diff_degree: number;
                let st1_x: number;
                let st1_y: number;

                let current_radian: number;

                if (!this._pairing) {
                    if (!this._unpairing) {
                        let st1_angle: number = -Math.PI / 5.2 - angle_rand;
                        st1_diff_degree = (go_radian + st1_angle) * 180 / Math.PI - 90.0;
                        st1_diff_degree = Base.toCanonicalRange(st1_diff_degree);
                        let st1_cos: number = Math.cos(st1_angle);
                        let st1_sin: number = Math.sin(st1_angle);
                        st1_x = this._goX / 2.5 * st1_cos - this._goY / 2.5 * st1_sin + off_x + random_x;
                        st1_y = this._goX / 2.5 * st1_sin + this._goY / 2.5 * st1_cos + off_y + random_y;

                        this._lastSatellite1Radius = reference_base_size * 0.45;
                    } else {
                        let target_angle: number = (go_radian - Math.PI / 5.2) * 180 / Math.PI;

                        if (Math.abs(target_angle - this._pairingStartDegree) > 180) {
                            if (target_angle > this._pairingStartDegree) {
                                target_angle -= 360;
                            } else {
                                target_angle += 360;
                            }
                        }

                        let current_angle: number = this._pairingStartDegree * (1 - pairing_prog) + target_angle * pairing_prog;
                        current_radian = current_angle * Math.PI / 180.0;
                        st1_diff_degree = Base.toCanonicalRange(current_angle - 90.0);
                        let current_radius: number = this._pairingStartRadius * (1 - pairing_prog) + (reference_base_size * 0.45) * pairing_prog;
                        st1_x = Math.cos(current_radian) * current_radius + off_x;
                        st1_y = Math.sin(current_radian) * current_radius + off_y;
                        this._lastSatellite1Radius = current_radius;
                    }

                } else {
                    let current_degree: number = this._pairingTargetDegree * pairing_prog + this._pairingStartDegree * (1 - pairing_prog);
                    current_radian = current_degree * Math.PI / 180.0;

                    st1_diff_degree = current_degree - 90.0;
                    st1_diff_degree = Base.toCanonicalRange(st1_diff_degree);

                    let pair_r: number = 0;

                    if (this._pairingCompleteTime >= 0) {
                        pair_r = (Math.cos((current_time - this._pairingCompleteTime) / 250.0 + Math.PI / 2)) * 2 + reference_base_size * 0.45;
                    } else {
                        pair_r = pairing_prog * (reference_base_size * 0.45) + (1 - pairing_prog) * this._pairingStartRadius;
                    }

                    st1_x = Math.cos(current_radian) * pair_r + off_x;
                    st1_y = Math.sin(current_radian) * pair_r + off_y;

                    this._lastSatellite1Radius = pair_r;
                }

                if (Math.trunc(st1_diff_degree / 5) < 0 || Math.trunc(st1_diff_degree / 5) > 71) {
                    if (Math.trunc(st1_diff_degree / 5) < -1 || Math.trunc(st1_diff_degree / 5) > 72) {
                        log.debug(st1_diff_degree);
                        throw new Error("WHAT1");
                    }

                    st1_diff_degree = 0;
                }

                satellite_body_data = BaseAssets.getSatellite1Bitmap(zoom_level, st1_diff_degree, this._pairType);

                this._lastSatellite1AbsDegree = st1_diff_degree + 90.0;

                if (draw_st1) {
                    Base.showSprite(this._sat1, satellite_body_data);
                    Base.showHighlightState(this._sat1, this._baseIdx, highlight_state);
                    this._sat1.x = st1_x;
                    this._sat1.y = st1_y;
                }
            }
        }

        if (this._unpairing && this._pairingCompleteTime >= 0) {
            this._unpairing = false;
        }

        if (numberBitmap != null && body_data != null && draw_body) {
            let desired_dist: number = Math.sqrt((numberBitmap.width / 2) * (numberBitmap.width / 2) + (numberBitmap.height / 2) * (numberBitmap.height / 2));
            desired_dist += Math.sqrt((this._outX / 2) * (this._outX / 2) + (this._outY / 2) * (this._outY / 2));
            desired_dist *= 0.8;

            let out_dist: number = Math.sqrt(this._outX * this._outX + this._outY * this._outY);
            if (out_dist > Constants.EPSILON) {
                let numberPos: Point = new Point(off_x + this._outX * desired_dist / out_dist, off_y + this._outY * desired_dist / out_dist);
                Base.showSprite(this._number, numberBitmap);
                this._number.x = numberPos.x;
                this._number.y = numberPos.y;
            }
        }
    }

    // public bit_blit_after_effect (zoom_level: number, canvas: Texture, off_x: number, off_y: number, current_time: number): Rectangle {
    //     if (!this._sparking) {
    //         return null;
    //     }
    //
    //     let dirty: Rectangle = null;
    //     let r: Rectangle;
    //
    //     if (this._spark_start_time < 0) {
    //         this._spark_start_time = current_time;
    //     }
    //
    //     let duration: number = 1000;
    //
    //     let sparkProgress: number = (current_time - this._spark_start_time) / duration;
    //
    //     if (sparkProgress >= 1) {
    //         this._sparking = false;
    //         this._spark_start_time = -1;
    //         // prog = 1;
    //         return dirty;
    //     } else if (sparkProgress < 0) {
    //         sparkProgress = 0;
    //     }
    //
    //     let spark_bitmap: Texture = BaseAssets.getSparkBitmap(sparkProgress);
    //
    //     let flying_dist: number = 70;
    //     if (zoom_level < Base.NUM_ZOOM_LEVELS) {
    //         flying_dist = 100;
    //     }
    //
    //
    //     let sp_rect: Rectangle = new Rectangle(0, 0, spark_bitmap.width, spark_bitmap.height);
    //     let sp_point: Point = new Point(this.display.x + off_x - spark_bitmap.width / 2 + this._spark_dir.x * flying_dist * sparkProgress, this.display.y + off_y - spark_bitmap.height / 2 + this._spark_dir.y * flying_dist * sparkProgress);
    //     let sp_point2: Point = new Point(this.display.x + off_x - spark_bitmap.width / 2 - this._spark_dir.x * flying_dist * sparkProgress, this.display.y + off_y - spark_bitmap.height / 2 - this._spark_dir.y * flying_dist * sparkProgress);
    //
    //     canvas.copyPixels(spark_bitmap, sp_rect, sp_point, null, null, true);
    //     r = sp_rect.clone();
    //     r.offsetPoint(sp_point);
    //     dirty = (dirty == null ? r.clone() : dirty.union(r));
    //     canvas.copyPixels(spark_bitmap, sp_rect, sp_point2, null, null, true);
    //     r = sp_rect.clone();
    //     r.offsetPoint(sp_point2);
    //     dirty = (dirty == null ? r.clone() : dirty.union(r));
    //
    //     return dirty;
    // }

    public getLastDrawnPos(): Point {
        return new Point(this._lastCenterX, this._lastCenterY);
    }

    private static showHighlightState (sprite: Sprite, baseIdx: number, highlight_state?: RNAHighlightState) {
        sprite.filters = null;
        sprite.alpha = 1;

        if (highlight_state != null && highlight_state.isOn) {
            if (highlight_state.nuc.indexOf(baseIdx) === -1) {
                sprite.alpha = 0.55;
            } else {
                sprite.filters = [this.multiplyAlphaFilter(1.33)];
            }
        }
    }

    private static multiplyAlphaFilter(multiplier: number): ColorMatrixFilter {
        let filter = new PIXI.filters.ColorMatrixFilter();
        filter.matrix = [
            1, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, multiplier, 0,
            0, 0, 0, 0, 1
        ];
        return filter;
    }

    private static showSprite(sprite: Sprite, tex: Texture): Sprite {
        sprite.visible = true;
        sprite.texture = tex;
        sprite.pivot.x = tex.width * 0.5;
        sprite.pivot.y = tex.height * 0.5;
        return sprite;
    }

    private static toCanonicalRange(deg: number): number {
        if (deg > 0) {
            deg = deg - (Math.trunc(deg / 360.0) * 360);
            if (deg >= 360) {
                deg = 359;
            }
            return deg;
        } else if (deg < 0) {
            let deg2: number = deg + (Math.trunc(-deg / 360.0) * 360);
            if (deg2 < 0) {
                return deg2 + 360;
            } else {
                return deg2;
            }
        }

        return deg;
    }

    private readonly _pose: Pose2D;

    private readonly _barcode: Sprite = new Sprite();
    private readonly _body: Sprite = new Sprite();
    private readonly _backbone: Sprite = new Sprite();
    private readonly _letter: Sprite = new Sprite();
    private readonly _sat0: Sprite = new Sprite();
    private readonly _sat1: Sprite = new Sprite();
    private readonly _number: Sprite = new Sprite();

    private _baseType: number = -1;
    // The index of the base in the base array.
    private _baseIdx: number = -1;
    private _goX: number = 0;
    private _goY: number = 0;
    private _outX: number = 0;
    private _outY: number = 0;
    private _needsRedraw: boolean = false;
    private _lastCenterX: number;
    private _lastCenterY: number;
    private _animStartTime: number;
    private _animate: boolean = false;
    private _pairing: boolean = false;
    private _unpairing: boolean;
    private _pairingStartTime: number = -1;
    private _pairingCompleteTime: number = -1;
    private _pairingDuration: number = 1;
    private _pairingTargetDegree: number;
    private _pairingStartDegree: number;
    private _pairingStartRadius: number = 0;
    private _pairType: number = -1;
    private _lastSatellite1AbsDegree: number = -Math.PI / 5.2;
    private _lastSatellite1Radius: number = 0;
    private _isLast: boolean;
    private _colorLevel: number = -1;
    private _isForced: boolean;
    private _isDontcare: boolean;
    private _forceUnpaired: boolean;
    private _sparking: boolean = false;
    private _sparkStartTime: number = -1;
    private _sparkDir: Point;

    private _zoomLevel: number = 0;
    private _offX: number = 0;
    private _offY: number = 0;
    private _currentTime: number = 0;
    private _drawFlags: number = 0;
    private _highlightState: RNAHighlightState;
    private _numberBitmap: Texture;
}
