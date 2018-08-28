import {Graphics, Point} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GameObjectRef} from "../../flashbang/core/GameObjectRef";
import {IsLeftMouse} from "../../flashbang/input/InputUtil";
import {KeyboardEventType} from "../../flashbang/input/KeyboardEventType";
import {KeyboardListener} from "../../flashbang/input/KeyboardInput";
import {KeyCode} from "../../flashbang/input/KeyCode";
import {MouseWheelListener} from "../../flashbang/input/MouseWheelInput";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Dragger} from "../../flashbang/util/Dragger";
import {ROPWait} from "../rscript/ROPWait";
import {Pose2D} from "./Pose2D";

type InteractionEvent = PIXI.interaction.InteractionEvent;

/** Wraps a Pose2D and handles resizing, masking, and input events */
export class PoseField extends ContainerObject implements KeyboardListener, MouseWheelListener {
    constructor(edit: boolean) {
        super();
        this._pose = new Pose2D(edit);

        // _clickTargetDisp is an invisible rectangle with our exact size, so that we can always receive mouse events
        this._clickTargetDisp = new Graphics();
        this.container.addChild(this._clickTargetDisp);
    }

    protected added(): void {
        super.added();

        this.addObject(this._pose, this.container);

        this.container.interactive = true;
        this.pointerDown.filter(IsLeftMouse).connect((e) => this.onMouseDown(e));
        this.pointerUp.filter(IsLeftMouse).connect(() => this.onMouseUp());

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
            this._mask = new Graphics().beginFill(0x0, 0).drawRect(0, 0, width, height).endFill();
            this.container.addChild(this._mask);
            this.container.mask = this._mask;
        }
    }

    public set zoom(zoom: number) {
        this._pose.setZoomLevel(zoom);
    }

    public zoomIn(): void {
        let prev_zoom: number = this._pose.zoomLevel;

        if (prev_zoom === 0)
            return;

        this._pose.setZoomLevel(prev_zoom - 1);
    }

    public zoomOut(): void {
        let prev_zoom: number = this._pose.zoomLevel;

        if (prev_zoom === Pose2D.ZOOM_SPACINGS.length - 1)
            return;

        this._pose.setZoomLevel(prev_zoom + 1);
    }

    public get pose(): Pose2D {
        return this._pose;
    }

    private onMouseDown(e: InteractionEvent): void {
        if (!Flashbang.app.isControlKeyDown) {
            this.cancelDrag();

            let dragger = new Dragger();
            this._poseDraggerRef = this.addObject(dragger);

            let dragPoseStart = new Point(this._pose.xOffset, this._pose.yOffset);
            dragger.dragged.connect(() => {
                ROPWait.NotifyMoveCamera();
                this._pose.setOffset(dragPoseStart.x + dragger.offsetX, dragPoseStart.y + dragger.offsetY);
            });

            e.stopPropagation();
        }
    }

    private onMouseUp(): void {
        this.cancelDrag();
        this._pose.doneColoring();
        this._pose.onMouseMoved();
    }

    private cancelDrag(): void {
        if (this._poseDraggerRef.isLive) {
            this._poseDraggerRef.destroyObject();
        }
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        let mouse = Flashbang.globalMouse;
        if (!this.display.visible || !this.containsPoint(mouse.x, mouse.y)) {
            return false;
        }

        if (e.deltaY < 0) {
            this.zoomIn();
            return true;
        } else if (e.deltaY > 0) {
            this.zoomOut();
            return true;
        }

        return false;
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        if (!this.display.visible || e.type != KeyboardEventType.KEY_DOWN) {
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

    /** true if our bounds contains the given global point */
    private containsPoint(screenX: number, screenY: number): boolean {
        PoseField.P.set(screenX, screenY);
        this.container.toLocal(PoseField.P, null, PoseField.P);
        const x = PoseField.P.x;
        const y = PoseField.P.y;
        return (x >= 0 && x < this._width && y >= 0 && y < this._height);
    }

    private readonly _pose: Pose2D;
    private readonly _clickTargetDisp: Graphics;

    private _width: number = 0;
    private _height: number = 0;
    private _mask: Graphics;

    private _poseDraggerRef: GameObjectRef = GameObjectRef.NULL;

    private static readonly P: Point = new Point();
}
