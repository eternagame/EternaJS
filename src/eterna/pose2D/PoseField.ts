import * as log from "loglevel";
import {Point} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {KeyboardListener} from "../../flashbang/input/KeyboardInput";
import {KeyCode} from "../../flashbang/input/KeyCode";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {ROPWait} from "../rscript/ROPWait";
import {Pose2D} from "./Pose2D";

type InteractionEvent = PIXI.interaction.InteractionEvent;

/// TODO: remove this class? It can just be merged into Pose2D
export class PoseField extends ContainerObject implements KeyboardListener {
    constructor(edit: boolean) {
        super();
        this._pose = new Pose2D(edit);
    }

    protected added(): void {
        super.added();

        this.addObject(this._pose, this.container);

        this.container.interactive = true;
        this.pointerDown.connect((e) => this.mouse_on_bg_down(e));
        this.pointerUp.connect(() => this.mouse_on_bg_up());
        this.regs.add(this.mode.keyboardInput.pushListener(this));
        // this.addEventListener(MouseEvent.MOUSE_WHEEL, this.mouse_on_wheel);
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

    private mouse_on_bg_down(e: InteractionEvent): void {
        e.data.getLocalPosition(this.display, PoseField.P);
        this._drag_mouse_begin_x = PoseField.P.x;
        this._drag_mouse_begin_y = PoseField.P.y;

        if (!Flashbang.app.isControlKeyDown) {
            this._is_dragging_pose = true;
            this._drag_pose_begin_x = this._pose.get_x_offset();
            this._drag_pose_begin_y = this._pose.get_y_offset();

        }
        log.debug("TODO: set_dragger");
        // Application.instance.set_dragger(this.mouse_on_bg_move, this.mouse_on_bg_up);
        // TSC temp

    }

    private mouse_on_bg_move(e: InteractionEvent): void {
        e.data.getLocalPosition(this.display, PoseField.P);
        let mouseX = PoseField.P.x;
        let mouseY = PoseField.P.y;

        if (this._is_dragging_pose) {
            let x_mov: number = mouseX - this._drag_mouse_begin_x;
            let y_mov: number = mouseY - this._drag_mouse_begin_y;
            this._pose.set_offset(this._drag_pose_begin_x + x_mov, this._drag_pose_begin_y + y_mov);
        }

        ROPWait.NotifyMoveCamera();
    }

    private mouse_on_bg_up(): void {
        this._is_dragging_pose = false;

        this._pose.done_coloring();
        this._pose.pose_mouse_moved();
    }

    private mouse_on_wheel(e: MouseEvent): void {
        // if (e.delta > 0) {
        //     this.zoom_in();
        // } else if (e.delta < 0) {
        //     this.zoom_out();
        // }
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
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

    private _is_dragging_pose: boolean = false;
    private _drag_mouse_begin_x: number = 0;
    private _drag_mouse_begin_y: number = 0;
    private _drag_pose_begin_x: number = 0;
    private _drag_pose_begin_y: number = 0;

    private static readonly P: Point = new Point();
}
