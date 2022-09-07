import {Graphics, InteractionEvent, Point} from 'pixi.js';
import {
    ContainerObject, KeyboardListener, MouseWheelListener, InputUtil, Flashbang,
    KeyboardEventType, KeyCode, Assert, PointerCapture
} from 'flashbang';
import ROPWait from 'eterna/rscript/ROPWait';
import debounce from 'lodash.debounce';
import AnnotationManager from 'eterna/AnnotationManager';
import Pose2D from './Pose2D';
import EnergyScoreDisplay from './EnergyScoreDisplay';
import RNAAnchorObject from './RNAAnchorObject';

/** Wraps a Pose2D and handles resizing, masking, and input events */
export default class PoseField extends ContainerObject implements KeyboardListener, MouseWheelListener {
    private static readonly zoomThreshold = 5;

    private static readonly SCORES_POSITION_Y = 128;

    constructor(edit: boolean, annotationManager: AnnotationManager) {
        super();
        this._pose = new Pose2D(this, edit, annotationManager);
        this._annotationManager = annotationManager;

        // _clickTargetDisp is an invisible rectangle with our exact size, so that we can always receive mouse events
        this._clickTargetDisp = new Graphics();
        this.container.addChild(this._clickTargetDisp);
    }

    protected added(): void {
        super.added();

        this.addObject(this._pose, this.container);

        this.pointerDown.filter(InputUtil.IsLeftMouse).connect(
            (e: InteractionEvent) => this.onPointerDown(e)
        );
        this.pointerUp.filter(InputUtil.IsLeftMouse).connect(
            (e: InteractionEvent) => this.onPointerUp(e)
        );
        this.pointerMove.connect(
            (e: InteractionEvent) => this.onPointerMove(e)
        );
        this.pointerUpOutside.connect(
            (e: InteractionEvent) => this.onPointerUp(e)
        );

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.keyboardInput.pushListener(this));
        this.regs.add(this.mode.mouseWheelInput.pushListener(this));

        this._primaryScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._primaryScoreEnergyDisplay.position.set(17, PoseField.SCORES_POSITION_Y);
        this.container.addChild(this._primaryScoreEnergyDisplay);

        this._deltaScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._deltaScoreEnergyDisplay.position.set(17 + 119, PoseField.SCORES_POSITION_Y);
        this._deltaScoreEnergyDisplay.visible = false;
        this.container.addChild(this._deltaScoreEnergyDisplay);

        this._secondaryScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._secondaryScoreEnergyDisplay.position.set(17 + 119 * 2, PoseField.SCORES_POSITION_Y);
        this._secondaryScoreEnergyDisplay.visible = false;
        this.container.addChild(this._secondaryScoreEnergyDisplay);
    }

    /* override */
    public update(_dt: number): void {
        if (!this.display.worldVisible) {
            // update is expensive, so don't bother doing it if we're not visible
            return;
        }
        Assert.assertIsDefined(this.mode);
        for (const anchor of this._anchoredObjects) {
            if (anchor.isLive) {
                const p: Point = this.pose.getBaseLoc(anchor.base);
                anchor.object.display.position.set(p.x + anchor.offset.x, p.y + anchor.offset.y);
            }
        }
    }

    public addAnchoredObject(obj: RNAAnchorObject): void {
        this._anchoredObjects.push(obj);
    }

    public removeAnchoredObject(obj: RNAAnchorObject): void {
        for (let ii = 0; ii < this._anchoredObjects.length; ++ii) {
            if (obj === this._anchoredObjects[ii]) {
                this._anchoredObjects.splice(ii, 1);
                break;
            }
        }
    }

    public get primaryScoreDisplay(): EnergyScoreDisplay {
        return this._primaryScoreEnergyDisplay;
    }

    public get secondaryScoreDisplay(): EnergyScoreDisplay {
        return this._secondaryScoreEnergyDisplay;
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public setSize(width: number, height: number, useMask: boolean): void {
        this._width = width;
        this._height = height;

        this._clickTargetDisp.clear()
            .beginFill(0x0, 0)
            .drawRect(0, 0, width, height)
            .endFill();

        this._pose.setOffset(this._width * 0.5, this._height * 0.5);
        this._pose.setSize(width, height);

        // If we're in PIP mode, we mask our view
        if (this._mask != null) {
            this._mask.destroy({children: true});
            this._mask = null;
        }
        this.container.mask = null;

        if (useMask) {
            this._mask = new Graphics().beginFill(0x0).drawRect(0, 0, width, height).endFill();
            this.container.addChild(this._mask);
            this.container.mask = this._mask;
        }
    }

    public containsEvent(e: InteractionEvent): boolean {
        return this.containsPoint(e.data.global.x, e.data.global.y);
    }

    /** true if our bounds contains the given global point */
    public containsPoint(screenX: number, screenY: number): boolean {
        PoseField.P.set(screenX, screenY);
        this.container.toLocal(PoseField.P, undefined, PoseField.P);
        const x = PoseField.P.x;
        const y = PoseField.P.y;
        return (x >= 0 && x < this._width && y >= 0 && y < this._height);
    }

    public set zoom(zoom: number) {
        this._pose.setZoomLevel(zoom);
    }

    public zoomIn(): void {
        const prevZoom: number = this._pose.zoomLevel;

        if (prevZoom === 0) return;

        this._pose.setZoomLevel(prevZoom - 1);
    }

    public zoomOut(): void {
        const prevZoom: number = this._pose.zoomLevel;

        if (prevZoom === Pose2D.ZOOM_SPACINGS.length - 1) return;

        this._pose.setZoomLevel(prevZoom + 1);
    }

    public set explosionFactor(val: number) {
        this._explosionFactor = val;
        this.pose.fastLayout();
        this.pose.redraw = true;
    }

    public get explosionFactor(): number {
        return this._explosionFactor;
    }

    public get pose(): Pose2D {
        return this._pose;
    }

    private onPointerDown(e: InteractionEvent): void {
        if (Flashbang.app.isControlKeyDown) {
            return;
        }

        // If we start dragging, continue the drag even if we go over other objects,
        // don't fire the mouseup on them if we release over them, etc.
        if (!this._activePointerCapture) {
            this._activePointerCapture = new PointerCapture(this.display, (captured) => {
                captured.stopPropagation();
                this.display.emit(captured.type, captured);
            });
            this.addObject(this._activePointerCapture);
        }

        const pointerId = e.data.identifier;
        const {x, y} = e.data.global;
        this._interactionCache.set(pointerId, new Point(x, y));

        if (this._interactionCache.size === 1) {
            this._dragStart = new Point(x, y);
            this._dragPoseStart = new Point(this._pose.xOffset, this._pose.yOffset);
        }

        e.stopPropagation();
    }

    private onPointerMove(e: InteractionEvent) {
        this._interactionCache.forEach((_point, pointerId) => {
            if (pointerId === e.data.identifier) {
                const {x, y} = e.data.global;
                this._interactionCache.set(pointerId, new Point(x, y));
            }
        });

        if (this._interactionCache.size === 2) {
            // Pinch zoom gesture
            const [finger1, finger2] = Array.from(this._interactionCache.values());
            const curDiff = Math.abs(finger1.x - finger2.x);
            if (this._previousDragDiff > 0) {
                const delta = Math.abs(curDiff - this._previousDragDiff);
                if (delta > PoseField.zoomThreshold) {
                    if (curDiff > this._previousDragDiff) {
                        if (this._zoomDirection <= 0) {
                            this.zoomIn();
                            this._zoomDirection = 1;
                        }
                    } else if (this._zoomDirection >= 0) {
                        this.zoomOut();
                        this._zoomDirection = -1;
                    }
                    this._zoomGestureStarted = this._zoomDirection !== 0;
                    this._previousDragDiff = curDiff;
                }
            } else {
                this._previousDragDiff = curDiff;
            }
        } else if (this._interactionCache.size === 1) {
            if (!this._zoomGestureStarted) {
                if (this._annotationManager.isMovingAnnotation) {
                    return;
                }

                // simple drag
                if (this._annotationManager.allAnnotations.length > 0) {
                    this._erasedAnnotations = true;
                    this.pose.clearAnnotationCanvas();
                }

                ROPWait.notifyMoveCamera();
                const [finger] = Array.from(this._interactionCache.values());
                const deltaX = finger.x - this._dragStart.x;
                const deltaY = finger.y - this._dragStart.y;
                this._pose.setOffset(this._dragPoseStart.x + deltaX, this._dragPoseStart.y + deltaY);
            }
        }
    }

    public disableEnergyGui(message: string) {
        this._primaryScoreEnergyDisplay.setEnergyText('Total', message);
        this._deltaScoreEnergyDisplay.setEnergyText('Natural/Target Delta', message);
        this._secondaryScoreEnergyDisplay.visible = false;
    }

    public updateEnergyGui(
        factor: number,
        scoreLabel: string,
        scoreScore: string,
        nodeLabel: string,
        nodeScore: string,
        nodeFound: boolean,
        deltaFn: () => number
    ): void {
        this.updateEnergyDisplaySizeLocation(factor);

        this._primaryScoreEnergyDisplay.setEnergyText(scoreLabel, scoreScore);
        this._secondaryScoreEnergyDisplay.setEnergyText(nodeLabel, nodeScore);
        this._secondaryScoreEnergyDisplay.visible = (this._showTotalEnergy && nodeFound);

        // This is because the undo stack isn't populated yet when this is run on puzzle boot/changing folders,
        // which is needed for the delta - TODO: Handle this in a less hacky way
        const attemptSetDelta = () => {
            try {
                this._deltaScoreEnergyDisplay.setEnergyText(
                    'Natural/Target Delta',
                    `${Math.round(deltaFn()) / 100} kcal`
                );
                this._deltaScoreEnergyDisplay.visible = (this._showTotalEnergy && this.pose.scoreFolder != null);
            } catch (e) {
                this._deltaScoreEnergyDisplay.visible = false;
                setTimeout(attemptSetDelta, 1000);
            }
        };
        setTimeout(attemptSetDelta, 50);
    }

    public get showTotalEnergy(): boolean {
        return this._showTotalEnergy;
    }

    public set showTotalEnergy(show: boolean) {
        this._showTotalEnergy = show;
        this._primaryScoreEnergyDisplay.visible = (show && this.pose.scoreFolder != null);
        this._secondaryScoreEnergyDisplay.visible = (
            show && this.pose.scoreFolder != null && this._secondaryScoreEnergyDisplay.hasText
        );
        this._deltaScoreEnergyDisplay.visible = show && this.pose.scoreFolder != null;
    }

    private onPointerUp(e: InteractionEvent): void {
        this._pose.doneColoring();
        this._pose.onMouseMoved(e.data.global);

        const eventsToClear: number[] = [];
        this._interactionCache.forEach((_point, pointerId) => {
            if (pointerId === e.data.identifier) {
                eventsToClear.push(pointerId);
            }
        });
        eventsToClear.forEach((pointerId) => this._interactionCache.delete(pointerId));

        if (this._interactionCache.size < 2) {
            this._previousDragDiff = -1;
            this._zoomDirection = 0;
        }

        if (this._zoomGestureStarted) {
            this._zoomGestureStarted = this._interactionCache.size > 0;
        }

        if (this._erasedAnnotations) {
            this._annotationManager.drawAnnotations({
                pose: this.pose,
                reset: false,
                ignoreCustom: false
            });
            this._erasedAnnotations = false;
        }

        if (this._activePointerCapture && this._interactionCache.size === 0) {
            this.removeObject(this._activePointerCapture);
            this._activePointerCapture = null;
        }
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        const mouse = Flashbang.globalMouse;
        Assert.assertIsDefined(mouse);
        if (!this.display.visible || !this.containsPoint(mouse.x, mouse.y)) {
            return false;
        }
        if (e.deltaY < 0) {
            if (e.deltaY < -2 && e.deltaY < this._lastDeltaY) this._debounceZoomIn();
            this._lastDeltaY = e.deltaY;
            setTimeout(() => {
                this._lastDeltaY = 0;
            }, 200);
            return true;
        } else if (e.deltaY > 0) {
            if (e.deltaY > 2 && e.deltaY > this._lastDeltaY) this._debounceZoomOut();
            this._lastDeltaY = e.deltaY;
            setTimeout(() => {
                this._lastDeltaY = 0;
            }, 200);
            return true;
        }

        return false;
    }

    private updateEnergyDisplaySizeLocation(factor: number): void {
        this._primaryScoreEnergyDisplay.position.set(17, PoseField.SCORES_POSITION_Y);
        this._primaryScoreEnergyDisplay.setSize(111 + factor * 59, 40);

        this._deltaScoreEnergyDisplay.position.set(17 + 119 + factor * 59, PoseField.SCORES_POSITION_Y);
        this._deltaScoreEnergyDisplay.setSize(111, 40);

        this._secondaryScoreEnergyDisplay.position.set(17 + 119 * 2 + factor * 59, PoseField.SCORES_POSITION_Y);
        this._secondaryScoreEnergyDisplay.setSize(111, 40);
    }

    // Stores the previous delta
    private _lastDeltaY = 0;

    // Debounced zoom functions for 'sensitive' mice
    private _debounceZoomIn = debounce(this.zoomIn, 100, {
        leading: true,
        trailing: false
    });

    private _debounceZoomOut = debounce(this.zoomOut, 100, {
        leading: true,
        trailing: false
    });

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        if (!this.display.visible || e.type !== KeyboardEventType.KEY_DOWN) {
            return false;
        }

        const X_OFFSET = 5;
        const Y_OFFSET = 5;

        if (!e.ctrlKey && e.code === KeyCode.ArrowDown) {
            if (e.shiftKey) {
                this._pose.shift5Prime();
            } else {
                this._pose.setOffset(this._pose.xOffset, this._pose.yOffset + Y_OFFSET);
            }
            return true;
        } else if (!e.ctrlKey && e.code === KeyCode.ArrowUp) {
            if (e.shiftKey) {
                this._pose.shift3Prime();
            } else {
                this._pose.setOffset(this._pose.xOffset, this._pose.yOffset - Y_OFFSET);
            }
            return true;
        } else if (!e.ctrlKey && e.code === KeyCode.ArrowRight) {
            if (e.shiftKey) {
                this._pose.shift3Prime();
            } else {
                this._pose.setOffset(this._pose.xOffset + X_OFFSET, this._pose.yOffset);
            }
            return true;
        } else if (!e.ctrlKey && e.code === KeyCode.ArrowLeft) {
            if (e.shiftKey) {
                this._pose.shift5Prime();
            } else {
                this._pose.setOffset(this._pose.xOffset - X_OFFSET, this._pose.yOffset);
            }
            return true;
        }

        return false;
    }

    private readonly _pose: Pose2D;
    private readonly _clickTargetDisp: Graphics;

    private _width: number = 0;
    private _height: number = 0;
    private _mask: Graphics | null;

    private _activePointerCapture: PointerCapture | null = null;
    private _interactionCache = new Map<number, Point>();
    private _previousDragDiff = -1;
    private _dragPoseStart = new Point();
    private _dragStart = new Point();
    private _zoomDirection = 0;
    private _zoomGestureStarted = false;
    private _erasedAnnotations = false;

    private static readonly P: Point = new Point();

    // New Score Display panels
    private _primaryScoreEnergyDisplay: EnergyScoreDisplay;
    private _secondaryScoreEnergyDisplay: EnergyScoreDisplay;
    private _deltaScoreEnergyDisplay: EnergyScoreDisplay;
    private _showTotalEnergy: boolean = true;

    // Explosion Factor (RNALayout pairSpace multiplier)
    private _explosionFactor: number = 1;

    private _anchoredObjects: RNAAnchorObject[] = [];

    private _annotationManager: AnnotationManager;
}
