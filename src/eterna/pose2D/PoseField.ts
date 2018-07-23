import {Graphics, Point} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GameObjectRef} from "../../flashbang/core/GameObjectRef";
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
        this.pointerDown.connect((e) => this.onMouseDown(e));
        this.pointerUp.connect(() => this.onMouseUp());

        this.regs.add(this.mode.keyboardInput.pushListener(this));
        this.regs.add(this.mode.mouseWheelInput.pushListener(this));
    }

    public set_size(width: number, height: number, useMask: boolean): void {
        this._width = width;
        this._height = height;

        this._clickTargetDisp.clear()
            .beginFill(0x0, 0)
            .drawRect(0, 0, width, height)
            .endFill();

        this._pose.set_offset(this._width * 0.5, this._height * 0.5);
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

    public set_zoom(zoom: number): void {
        this._pose.set_zoom_level(zoom);
    }

    public zoom_in(): void {
        let prev_zoom: number = this._pose.get_zoom_level();

        if (prev_zoom == 0)
            return;

        this._pose.set_zoom_level(prev_zoom - 1);
    }

    public zoom_out(): void {
        let prev_zoom: number = this._pose.get_zoom_level();

        if (prev_zoom == Pose2D.ZOOM_SPACINGS.length - 1)
            return;

        this._pose.set_zoom_level(prev_zoom + 1);
    }

    public get_pose(): Pose2D {
        return this._pose;
    }

    private onMouseDown(e: InteractionEvent): void {
        if (!Flashbang.app.isControlKeyDown) {
            this.cancelDrag();

            let dragger = new Dragger();
            this._poseDraggerRef = this.addObject(dragger);

            let dragPoseStart = new Point(this._pose.get_x_offset(), this._pose.get_y_offset());
            dragger.dragged.connect(() => {
                ROPWait.NotifyMoveCamera();
                this._pose.set_offset(dragPoseStart.x + dragger.offsetX, dragPoseStart.y + dragger.offsetY);
            });

            e.stopPropagation();
        }
    }

    private onMouseUp(): void {
        this.cancelDrag();
        this._pose.done_coloring();
        this._pose.pose_mouse_moved();
    }

    private cancelDrag(): void {
        if (this._poseDraggerRef.isLive) {
            this._poseDraggerRef.destroyObject();
        }
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        if (!this.display.visible) {
            return false;
        }

        if (e.deltaY < 0) {
            this.zoom_in();
            return true;
        } else if (e.deltaY > 0) {
            this.zoom_out();
            return true;
        }

        return false;
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        if (!this.display.visible) {
            return false;
        }

        const X_OFFSET: number = 5;
        const Y_OFFSET: number = 5;

        if (!e.ctrlKey && e.code == KeyCode.ArrowDown) {
            if (e.shiftKey) {
                this._pose.shift_5prime();
            } else {
                this._pose.set_offset(this._pose.get_x_offset(), this._pose.get_y_offset() + Y_OFFSET);
            }
            return true;
        } else if (!e.ctrlKey && e.code == KeyCode.ArrowUp) {
            if (e.shiftKey) {
                this._pose.shift_3prime();
            } else {
                this._pose.set_offset(this._pose.get_x_offset(), this._pose.get_y_offset() - Y_OFFSET);
            }
            return true;
        } else if (!e.ctrlKey && e.code == KeyCode.ArrowRight) {
            if (e.shiftKey) {
                this._pose.shift_3prime();
            } else {
                this._pose.set_offset(this._pose.get_x_offset() + X_OFFSET, this._pose.get_y_offset());
            }
            return true;
        } else if (!e.ctrlKey && e.code == KeyCode.ArrowLeft) {
            if (e.shiftKey) {
                this._pose.shift_5prime();
            } else {
                this._pose.set_offset(this._pose.get_x_offset() - X_OFFSET, this._pose.get_y_offset());
            }
            return true;
        }

        return false;
    }

    private readonly _pose: Pose2D;
    private readonly _clickTargetDisp: Graphics;

    private _width: number = 0;
    private _height: number = 0;
    private _mask: Graphics;

    private _poseDraggerRef: GameObjectRef = GameObjectRef.NULL;
}
