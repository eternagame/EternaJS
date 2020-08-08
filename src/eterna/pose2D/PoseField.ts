import {Graphics, Point} from 'pixi.js';
import {
    ContainerObject, KeyboardListener, MouseWheelListener, InputUtil, Flashbang,
    KeyboardEventType, KeyCode, Assert
} from 'flashbang';
import ROPWait from 'eterna/rscript/ROPWait';
import debounce from 'lodash.debounce';
import Pose2D from './Pose2D';

type InteractionEvent = PIXI.interaction.InteractionEvent;

/** Wraps a Pose2D and handles resizing, masking, and input events */
export default class PoseField extends ContainerObject implements KeyboardListener, MouseWheelListener {
    private static readonly zoomThreshold = 5;

    constructor(edit: boolean) {
        super();
        this._pose = new Pose2D(this, edit);

        // _clickTargetDisp is an invisible rectangle with our exact size, so that we can always receive mouse events
        this._clickTargetDisp = new Graphics();
        this.container.addChild(this._clickTargetDisp);
    }

    protected added(): void {
        super.added();

        this.addObject(this._pose, this.container);

        this.pointerDown.filter(InputUtil.IsLeftMouse).connect(
            (e: PIXI.interaction.InteractionEvent) => this.onPointerDown(e)
        );
        this.pointerUp.filter(InputUtil.IsLeftMouse).connect(
            (e: PIXI.interaction.InteractionEvent) => this.onPointerUp(e)
        );
        this.pointerMove.connect(
            (e: PIXI.interaction.InteractionEvent) => this.onPointerMove(e)
        );
        this.container.on('pointercancel',
            (e: PIXI.interaction.InteractionEvent) => this.onPointerUp(e));
        this.container.on('pointerout',
            (e: PIXI.interaction.InteractionEvent) => this.onPointerUp(e));
        this.container.on('pointerupoutside',
            (e: PIXI.interaction.InteractionEvent) => this.onPointerUp(e));

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.keyboardInput.pushListener(this));
        this.regs.add(this.mode.mouseWheelInput.pushListener(this));
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
        let prevZoom: number = this._pose.zoomLevel;

        if (prevZoom === 0) return;

        this._pose.setZoomLevel(prevZoom - 1);
    }

    public zoomOut(): void {
        let prevZoom: number = this._pose.zoomLevel;

        if (prevZoom === Pose2D.ZOOM_SPACINGS.length - 1) return;

        this._pose.setZoomLevel(prevZoom + 1);
    }

    public get pose(): Pose2D {
        return this._pose;
    }

    private onPointerDown(e: InteractionEvent): void {
        if (Flashbang.app.isControlKeyDown) {
            return;
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
        this._interactionCache.forEach((point, pointerId) => {
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
                // simple drag
                ROPWait.notifyMoveCamera();
                const [finger] = Array.from(this._interactionCache.values());
                const deltaX = finger.x - this._dragStart.x;
                const deltaY = finger.y - this._dragStart.y;
                this._pose.setOffset(this._dragPoseStart.x + deltaX, this._dragPoseStart.y + deltaY);
            }
        }
    }

    private onPointerUp(e: InteractionEvent): void {
        this._pose.doneColoring();
        this._pose.onMouseMoved(e.data.global);

        const eventsToClear: number[] = [];
        this._interactionCache.forEach((point, pointerId) => {
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
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        let mouse = Flashbang.globalMouse;
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

    private _interactionCache = new Map<number, Point>();
    private _previousDragDiff = -1;
    private _dragPoseStart = new Point();
    private _dragStart = new Point();
    private _zoomDirection = 0;
    private _zoomGestureStarted = false;

    private static readonly P: Point = new Point();
}
