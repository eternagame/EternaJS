import * as log from 'loglevel';
import {
    Point, Sprite, Texture, Graphics
} from 'pixi.js';
import {ColorMatrixFilter} from '@pixi/filter-color-matrix';
import {
    ContainerObject, LateUpdatable, Flashbang, Easing
} from 'flashbang';
import Constants from 'eterna/Constants';
import {RNABase, RNAPaint} from 'eterna/EPars';
import ROPWait from 'eterna/rscript/ROPWait';
import BaseAssets from './BaseAssets';
import BaseDrawFlags from './BaseDrawFlags';
import {RNAHighlightState} from './Pose2D';

export default class Base extends ContainerObject implements LateUpdatable {
    public static NUM_ZOOM_LEVELS = 2;
    public static NUM_ZOOM_LEVELS_LOCK = 4;
    public static ZOOM_SCALE_FACTOR = 0.75;
    public static readonly MARKER_THICKNESS: number = 0.4; // Relative to the radius
    public static readonly MARKER_RADIUS: number[] = [15, 10, 7, 5, 3];

    constructor(type: number) {
        super();
        BaseAssets._init();
        this.setType(type);

        // build our display hierarchy
        this.container.addChild(this._barcode);
        this.container.addChild(this._glow);
        this.container.addChild(this._body);
        this.container.addChild(this._backbone);
        this.container.addChild(this._letter);
        this.container.addChild(this._sat0);
        this.container.addChild(this._sat1);
        this.container.addChild(this._lock);
        this.container.addChild(this._number);
        this.container.addChild(this._spark1);
        this.container.addChild(this._spark2);
        this.container.addChild(this._markers);

        // Disable round pixels on non-text moving things to make it smoother
        this._barcode.roundPixels = false;
        this._glow.roundPixels = false;
        this._body.roundPixels = false;
        this._lock.roundPixels = false;
        this._backbone.roundPixels = false;
        this._sat0.roundPixels = false;
        this._sat1.roundPixels = false;
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
        const randAngle: number = Math.random() * Math.PI * 2;
        this._sparkDir = new Point(Math.cos(randAngle), Math.sin(randAngle));
    }

    public setGoDir(goX: number, goY: number): void {
        if (Math.abs(goX - this._goX) > Constants.EPSILON) {
            this._goX = goX;
            this._needsRedraw = true;
        }

        if (Math.abs(goY - this._goY) > Constants.EPSILON) {
            this._goY = goY;
            this._needsRedraw = true;
        }
    }

    public setOutDir(outX: number, outY: number): void {
        if (Math.abs(outX - this._outX) > Constants.EPSILON) {
            this._outX = outX;
            this._needsRedraw = true;
        }

        if (Math.abs(outY - this._outY) > Constants.EPSILON) {
            this._outY = outY;
            this._needsRedraw = true;
        }
    }

    public getOutXY(out: Point | null = null): Point {
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

    public setType(type: RNABase | RNAPaint, playSound: boolean = false): void {
        if (this._baseType === type) {
            return;
        }

        this._baseType = type;
        this._needsRedraw = true;

        if (playSound) {
            const soundName: string | null = BaseAssets.getBaseTypeSound(type);
            if (soundName != null) {
                Flashbang.sound.playSound(soundName);
            }
        }
        ROPWait.notifyNucleotideChange(this._baseIdx, type);
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

    public needRedraw(isStatic: boolean): boolean {
        if (!this.display.visible || this._baseType === RNABase.CUT) {
            return false;
        }

        return this._needsRedraw
            || (this._animate && !isStatic)
            || (this._pairing && !isStatic)
            || (this._unpairing && !isStatic)
            || this._sparking;
    }

    public setDirty(): void {
        this._needsRedraw = true;
    }

    public setColorLevel(useColor: boolean, colorLevel: number): void {
        if (!useColor) {
            this._colorLevel = -1;
            return;
        }

        this._colorLevel = colorLevel;
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

    public get isAnimating(): boolean {
        return this._animate;
    }

    public setPairing(pairing: boolean, goX: number, goY: number, duration: number, pairType: number): void {
        const targetAngle: number = (Math.atan2(goY, goX) * 180.0) / Math.PI;

        if (this._pairing && !pairing) {
            this._unpairing = true;
            this._needsRedraw = true;
        }

        if (!this._pairing && pairing) {
            this._needsRedraw = true;
        }

        if (this._pairType !== pairType) {
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
        this._pairingTargetDegree = targetAngle;
        this._pairingStartRadius = this._lastSatellite1Radius;
        this._pairType = pairType;

        if (Math.abs(this._pairingTargetDegree - this._pairingStartDegree) > 180) {
            if (this._pairingTargetDegree > this._pairingStartDegree) {
                this._pairingTargetDegree -= 360;
            } else {
                this._pairingTargetDegree += 360;
            }
        }
    }

    public isClicked(x: number, y: number, zoomlev: number, lenient: boolean): number {
        if (!this.container.visible) {
            return -1;
        }

        const diffx: number = this.x - x;
        const diffy: number = this.y - y;

        const sqDist: number = diffx * diffx + diffy * diffy;

        if (!lenient) {
            const threshold: number = BaseAssets.getHitTestDistanceThreshold(zoomlev);
            if (sqDist < threshold * threshold) {
                return sqDist;
            }
        } else if (sqDist < 225) {
            return sqDist;
        }
        return -1;
    }

    public mark(colors: number[], layer: string) {
        if (colors.length === 0) {
            this.unmarkLayer(layer);
            return;
        }

        this._markerColors.set(layer, colors);
        this.redrawMark();
    }

    public unmarkLayer(layer: string) {
        this._markerColors.delete(layer);
        this.redrawMark();
    }

    public unmarkAllLayers() {
        this._markerColors.clear();
        this.redrawMark();
    }

    public setMarkerLayer(layer: string) {
        this._currentMarkerLayer = layer;
        this.redrawMark();
    }

    private redrawMark() {
        this._markers.clear();
        const colors = this._markerColors.get(this._currentMarkerLayer);
        if (!colors) return;

        const angle = (Math.PI * 2) / colors.length;
        colors.forEach((color, colorIndex) => {
            this._markers.lineStyle(1, color);
            this._markers.arc(0, 0, 1 / Base.MARKER_THICKNESS,
                colorIndex * angle, (colorIndex + 1) * angle);
        });
        this._markers.visible = true;
    }

    public isCurrentLayerMarked(): boolean {
        return !!this.isLayerMarked(this._currentMarkerLayer);
    }

    public isLayerMarked(layer: string): boolean {
        return this._markerColors.has(layer);
    }

    public isAnyLayerMarked(): boolean {
        for (const val of this._markerColors.values()) {
            if (val) return true;
        }
        return false;
    }

    public get markerData(): Map<string, number[]> {
        const ret = new Map<string, number[]>();
        this._markerColors.forEach((colors, layer) => {
            ret.set(layer, colors.slice());
        });
        return ret;
    }

    public setDrawParams(
        zoomLevel: number, offX: number, offY: number, currentTime: number, drawFlags: number,
        numberTexture: Texture | null, highlightState?: RNAHighlightState
    ) {
        this._zoomLevel = zoomLevel;
        this._offX = offX;
        this._offY = offY;
        this._currentTime = currentTime;
        this._drawFlags = drawFlags;
        this._highlightState = highlightState;
        this._numberTexture = numberTexture;
        this._needsRedraw = true;
    }

    public lateUpdate(_dt: number): void {
        if (this._needsRedraw && this.display.visible && this._baseType !== RNABase.CUT) {
            this.redraw(
                this._zoomLevel, this._offX, this._offY,
                this._currentTime, this._drawFlags, this._numberTexture, this._highlightState
            );
            this._needsRedraw = false;
        }
    }

    private redraw(
        zoomLevel: number, offX: number, offY: number, currentTime: number, drawFlags: number,
        numberTexture: Texture | null, highlightState?: RNAHighlightState
    ): void {
        this._glow.visible = false;
        this._body.visible = false;
        this._backbone.visible = false;
        this._barcode.visible = false;
        this._letter.visible = false;
        this._lock.visible = false;
        this._sat0.visible = false;
        this._sat1.visible = false;
        this._number.visible = false;

        if (this._isDontcare) {
            drawFlags |= BaseDrawFlags.IS_DONTCARE;
        }

        const lowperform: boolean = (drawFlags & BaseDrawFlags.LOW_PERFORM) !== 0;

        const bodyData: Texture = BaseAssets.getBodyTexture(this._baseType, this._colorLevel, zoomLevel, drawFlags);
        const barcodeData: Texture | null = BaseAssets.getBarcodeTexture(zoomLevel, drawFlags);

        let randomX = 0;
        let randomY = 0;
        let angleRand = 0;

        if (this._animate) {
            if (this._animStartTime < 0) {
                this._animStartTime = currentTime;
            }

            const EASE_IN_DURATION = 0.75;
            const EASE_IN_END = EASE_IN_DURATION;
            const ANIM_MAIN_DURATION = 1;
            const ANIM_MAIN_END = EASE_IN_END + ANIM_MAIN_DURATION;
            const EASE_OUT_DURATION = 0.50;
            const EASE_OUT_END = ANIM_MAIN_END + EASE_OUT_DURATION;
            const BOUNCE_LEAVE_DURATION = 0.25;
            const BOUNCE_LEAVE_END = EASE_OUT_END + BOUNCE_LEAVE_DURATION;
            const BOUNCE_RETURN_DURATION = 0.5;
            const BOUNCE_RETURN_END = BOUNCE_LEAVE_END + BOUNCE_RETURN_DURATION;
            const dt = currentTime - this._animStartTime;

            // TODO: In the future maybe we could benefit from an animation system (with blending?)...
            // TODO: Liner probably isn't actually the right call here
            let offsetMultiplier: number;
            if (dt <= EASE_IN_END) {
                offsetMultiplier = Easing.pow1.easeIn(0, 1, dt, EASE_IN_DURATION);
            } else if (dt > EASE_IN_END && dt <= ANIM_MAIN_END) {
                const animDt = dt - EASE_IN_END;
                offsetMultiplier = Math.cos((animDt / ANIM_MAIN_DURATION) * Math.PI);
            } else if (dt > ANIM_MAIN_END && dt <= EASE_OUT_END) {
                const easeDt = dt - ANIM_MAIN_END;
                offsetMultiplier = Easing.pow1.easeOut(-1, 0, easeDt, EASE_OUT_DURATION);
            } else if (dt > EASE_OUT_END && dt <= BOUNCE_LEAVE_END) {
                const bounceDt = dt - EASE_OUT_END;
                offsetMultiplier = Easing.linear(0, 0.18, bounceDt, BOUNCE_LEAVE_DURATION);
            } else if (dt > BOUNCE_LEAVE_END && dt <= BOUNCE_RETURN_END) {
                const bounceDt = dt - BOUNCE_LEAVE_END;
                offsetMultiplier = Easing.linear(0.18, 0, bounceDt, BOUNCE_RETURN_DURATION);
            } else {
                offsetMultiplier = 0;
                this._animate = false;
            }

            angleRand = (Math.PI / 12.0) * offsetMultiplier;
            randomX = this._goY * offsetMultiplier * 0.07;
            randomY = -this._goX * offsetMultiplier * 0.07;
        }

        let pairingProg = 0;

        if (this._pairing || this._unpairing) {
            if (this._pairingStartTime < 0) {
                this._pairingStartTime = currentTime;
            }

            if (this._pairingDuration === 0) {
                pairingProg = 1;
                this._pairingCompleteTime = currentTime;
            } else {
                pairingProg = (currentTime - this._pairingStartTime) / (this._pairingDuration);
                if (pairingProg >= 1) {
                    pairingProg = 1;
                    if (this._pairingCompleteTime < 0) {
                        this._pairingCompleteTime = currentTime;
                    }
                }
            }
        }

        if (bodyData) {
            this._lastCenterX = this.display.x + randomX + offX;
            this._lastCenterY = this.display.y + randomY + offY;

            if (barcodeData != null) {
                Base.showSprite(this._barcode, barcodeData);
                this._barcode.x = randomX + offX;
                this._barcode.y = randomY + offY;
            }

            if (this._isForced) {
                // TODO
                // let temp_bd: Texture = body_data.clone();
                // temp_bd.colorTransform(base_rect, new ColorTransform(1, 1, 1, 0.2, 0, 0, 0, 0));
                // body_data = temp_bd;
            }

            Base.showSprite(this._body, bodyData);
            Base.showHighlightState(this._body, this._baseIdx, highlightState);

            this._body.x = randomX + offX;
            this._body.y = randomY + offY;
            this._markers.position.set(offX, offY);
            this._markers.scale.set((Base.MARKER_THICKNESS * Base.MARKER_RADIUS[this._zoomLevel]));

            const glowTex = BaseAssets.getGlowTexture(zoomLevel, drawFlags);
            if (glowTex != null) {
                Base.showSprite(this._glow, glowTex);
                this._glow.x = randomX + offX;
                this._glow.y = randomY + offY;
            }

            const letterTex = BaseAssets.getLetterTexture(this._baseType, zoomLevel, drawFlags);
            if (letterTex != null) {
                Base.showSprite(this._letter, letterTex);
                this._letter.x = randomX + offX;
                this._letter.y = randomY + offY;
            }

            const lockTex = letterTex
                ? BaseAssets.getLetterLockTexture(this._baseType, zoomLevel, drawFlags)
                : BaseAssets.getLockTexture(zoomLevel, drawFlags);
            if (lockTex != null) {
                Base.showSprite(this._lock, lockTex);
                this._lock.x = randomX + offX + (letterTex ? 0.2 * this._body.width : 0);
                this._lock.y = randomY + offY - (letterTex ? 0.2 * this._body.height : 0);
            }
        }

        if (Math.abs(this._goX) > 0 || Math.abs(this._goY) > 0) {
            if (zoomLevel < 2 * Base.NUM_ZOOM_LEVELS && !this._isLast && !lowperform) {
                const backboneData: Texture = BaseAssets.getBackboneTexture(zoomLevel);
                Base.showSprite(this._backbone, backboneData);
                this._backbone.x = randomX + offX + this._goX / 2;
                this._backbone.y = randomY + offY + this._goY / 2;
            }

            const goRadian: number = Math.atan2(this._goY, this._goX);
            if (zoomLevel < Base.NUM_ZOOM_LEVELS && !lowperform) {
                const referenceBaseSize: number = BaseAssets.getSatelliteReferenceBaseSize(zoomLevel);

                let st0DiffDegree: number;
                const st0Angle: number = Math.PI / 5.2 + angleRand;
                st0DiffDegree = ((goRadian + st0Angle) * 180) / Math.PI - 90.0;
                st0DiffDegree = Base.toCanonicalRange(st0DiffDegree);

                if (Math.trunc(st0DiffDegree / 5) < 0 || Math.trunc(st0DiffDegree / 5) > 71) {
                    if (Math.trunc(st0DiffDegree / 5) < -1 || Math.trunc(st0DiffDegree / 5) > 72) {
                        log.debug(st0DiffDegree);
                        throw new Error('WHAT0');
                    }

                    st0DiffDegree = 0;
                }

                const satellite0BodyData = BaseAssets.getSatellite0Texture(zoomLevel, st0DiffDegree);

                const drawSt0 = !this._forceUnpaired;

                if (drawSt0) {
                    const st0Cos: number = Math.cos(st0Angle);
                    const st0Sin: number = Math.sin(st0Angle);
                    const st0X: number = (this._goX / 2.5) * st0Cos - (this._goY / 2.5) * st0Sin + offX + randomX;
                    const st0Y: number = (this._goX / 2.5) * st0Sin + (this._goY / 2.5) * st0Cos + offY + randomY;

                    Base.showSprite(this._sat0, satellite0BodyData);
                    Base.showHighlightState(this._sat0, this._baseIdx, highlightState);
                    this._sat0.x = st0X;
                    this._sat0.y = st0Y;
                }

                const drawSt1 = !this._forceUnpaired;
                let st1DiffDegree: number;
                let st1X: number;
                let st1Y: number;

                let currentRadian: number;

                if (!this._pairing) {
                    if (!this._unpairing) {
                        const st1Angle: number = -Math.PI / 5.2 - angleRand;
                        st1DiffDegree = ((goRadian + st1Angle) * 180) / Math.PI - 90.0;
                        st1DiffDegree = Base.toCanonicalRange(st1DiffDegree);
                        const st1Cos: number = Math.cos(st1Angle);
                        const st1Sin: number = Math.sin(st1Angle);
                        st1X = (this._goX / 2.5) * st1Cos - (this._goY / 2.5) * st1Sin + offX + randomX;
                        st1Y = (this._goX / 2.5) * st1Sin + (this._goY / 2.5) * st1Cos + offY + randomY;

                        this._lastSatellite1Radius = referenceBaseSize * 0.45;
                    } else {
                        let targetAngle: number = ((goRadian - Math.PI / 5.2) * 180) / Math.PI;

                        if (Math.abs(targetAngle - this._pairingStartDegree) > 180) {
                            if (targetAngle > this._pairingStartDegree) {
                                targetAngle -= 360;
                            } else {
                                targetAngle += 360;
                            }
                        }

                        const currentAngle: number = (
                            this._pairingStartDegree * (1 - pairingProg) + targetAngle * pairingProg
                        );
                        currentRadian = (currentAngle * Math.PI) / 180.0;
                        st1DiffDegree = Base.toCanonicalRange(currentAngle - 90.0);
                        const currentRadius: number = (
                            this._pairingStartRadius * (1 - pairingProg) + (referenceBaseSize * 0.45) * pairingProg
                        );
                        st1X = Math.cos(currentRadian) * currentRadius + offX;
                        st1Y = Math.sin(currentRadian) * currentRadius + offY;
                        this._lastSatellite1Radius = currentRadius;
                    }
                } else {
                    const currentDegree: number = (
                        this._pairingTargetDegree * pairingProg + this._pairingStartDegree * (1 - pairingProg)
                    );
                    currentRadian = (currentDegree * Math.PI) / 180.0;

                    st1DiffDegree = currentDegree - 90.0;
                    st1DiffDegree = Base.toCanonicalRange(st1DiffDegree);

                    const pairR = this._pairingCompleteTime >= 0
                        ? (
                            (Math.cos((currentTime - this._pairingCompleteTime) / 250.0 + Math.PI / 2)) * 2
                            + referenceBaseSize * 0.45
                        )
                        : pairingProg * (referenceBaseSize * 0.45) + (1 - pairingProg) * this._pairingStartRadius;

                    st1X = Math.cos(currentRadian) * pairR + offX;
                    st1Y = Math.sin(currentRadian) * pairR + offY;

                    this._lastSatellite1Radius = pairR;
                }

                if (Math.trunc(st1DiffDegree / 5) < 0 || Math.trunc(st1DiffDegree / 5) > 71) {
                    if (Math.trunc(st1DiffDegree / 5) < -1 || Math.trunc(st1DiffDegree / 5) > 72) {
                        log.debug(st1DiffDegree);
                        throw new Error('WHAT1');
                    }

                    st1DiffDegree = 0;
                }

                const satellite1BodyData = BaseAssets.getSatellite1Texture(zoomLevel, st1DiffDegree, this._pairType);

                this._lastSatellite1AbsDegree = st1DiffDegree + 90.0;

                if (drawSt1) {
                    Base.showSprite(this._sat1, satellite1BodyData);
                    Base.showHighlightState(this._sat1, this._baseIdx, highlightState);
                    this._sat1.x = st1X;
                    this._sat1.y = st1Y;
                }
            }
        }

        if (this._unpairing && this._pairingCompleteTime >= 0) {
            this._unpairing = false;
        }

        if (numberTexture != null && bodyData != null) {
            const desiredDist: number = 0.8 * (Math.sqrt(
                (numberTexture.width / 2) * (numberTexture.width / 2)
                + (numberTexture.height / 2) * (numberTexture.height / 2)
            ) + Math.sqrt((this._outX / 2) * (this._outX / 2) + (this._outY / 2) * (this._outY / 2)));

            const outDist: number = Math.sqrt(this._outX * this._outX + this._outY * this._outY);
            if (outDist > Constants.EPSILON) {
                const numberPos = new Point(
                    offX + (this._outX * desiredDist) / outDist, offY + (this._outY * desiredDist) / outDist
                );
                Base.showSprite(this._number, numberTexture);
                this._number.x = numberPos.x;
                this._number.y = numberPos.y;
            }
        }

        this.updateSparkAnim(zoomLevel, offX, offY, currentTime);
    }

    private updateSparkAnim(zoomLevel: number, offX: number, offY: number, currentTime: number): void {
        this._spark1.visible = false;
        this._spark2.visible = false;

        if (!this._sparking) {
            return;
        }

        if (this._sparkStartTime < 0) {
            this._sparkStartTime = currentTime;
        }

        const DURATION = 1;
        let animProgress = (currentTime - this._sparkStartTime) / DURATION;

        if (animProgress >= 1) {
            this._sparking = false;
            this._sparkStartTime = -1;
            return;
        } else if (animProgress < 0) {
            animProgress = 0;
        }

        const tex = BaseAssets.getSparkTexture(animProgress);
        Base.showSprite(this._spark1, tex);
        Base.showSprite(this._spark2, tex);

        const flyingDist = (zoomLevel < Base.NUM_ZOOM_LEVELS) ? 100 : 70;

        this._spark1.position.set(
            offX + this._sparkDir.x * flyingDist * animProgress,
            offY + this._sparkDir.y * flyingDist * animProgress
        );

        this._spark2.position.set(
            offX - this._sparkDir.x * flyingDist * animProgress,
            offY - this._sparkDir.y * flyingDist * animProgress
        );
    }

    public getLastDrawnPos(): Point {
        return new Point(this._lastCenterX, this._lastCenterY);
    }

    private static showHighlightState(sprite: Sprite, baseIdx: number, highlightState?: RNAHighlightState) {
        sprite.filters = [];
        sprite.alpha = 1;

        if (highlightState !== undefined && highlightState.nuc && highlightState.isOn) {
            if (highlightState.nuc.indexOf(baseIdx) === -1) {
                sprite.alpha = 0.55;
            } else {
                sprite.filters = [this.multiplyAlphaFilter(1.33)];
            }
        }
    }

    private static multiplyAlphaFilter(multiplier: number): ColorMatrixFilter {
        const filter = new ColorMatrixFilter();
        filter.matrix = [
            1, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, multiplier, 0
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
            deg -= (Math.trunc(deg / 360.0) * 360);
            if (deg >= 360) {
                deg = 359;
            }
            return deg;
        } else if (deg < 0) {
            const deg2: number = deg + (Math.trunc(-deg / 360.0) * 360);
            if (deg2 < 0) {
                return deg2 + 360;
            } else {
                return deg2;
            }
        }

        return deg;
    }

    private readonly _barcode: Sprite = new Sprite();
    private readonly _body: Sprite = new Sprite();
    private readonly _glow: Sprite = new Sprite();
    private readonly _backbone: Sprite = new Sprite();
    private readonly _letter: Sprite = new Sprite();
    private readonly _lock: Sprite = new Sprite();
    private readonly _sat0: Sprite = new Sprite();
    private readonly _sat1: Sprite = new Sprite();
    private readonly _number: Sprite = new Sprite();
    private readonly _spark1: Sprite = new Sprite();
    private readonly _spark2: Sprite = new Sprite();
    private readonly _markers: Graphics = new Graphics();

    private _baseType: number = -1;
    // The index of the base in the base array.
    private _baseIdx: number = -1;

    private _goX: number = 0;
    private _goY: number = 0;
    private _outX: number = 0;
    private _outY: number = 0;

    private _currentMarkerLayer: string = '';
    private _markerColors: Map<string, number[]> = new Map();

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
    private _highlightState?: RNAHighlightState;
    private _numberTexture: Texture | null;
}
