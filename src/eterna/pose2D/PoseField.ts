import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Pose2D} from "./Pose2D";

/// TODO: remove this class? It can just be merged into Pose2D
export class PoseField extends ContainerObject {
    constructor(edit: boolean) {
        super();
        this._pose = new Pose2D(edit);

        this.addObject(this._pose, this.container);

        // this.addEventListener(MouseEvent.MOUSE_DOWN, this.mouse_on_bg_down);
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

    private mouse_on_bg_down(e: MouseEvent): void {
        // this._drag_mouse_begin_x = this.mouseX;
        // this._drag_mouse_begin_y = this.mouseY;
        // if (!e.ctrlKey) {
        //     this._is_dragging_pose = true;
        //     this._drag_pose_begin_x = this._pose.get_x_offset();
        //     this._drag_pose_begin_y = this._pose.get_y_offset();
        //
        // }
        // Application.instance.set_dragger(this.mouse_on_bg_move, this.mouse_on_bg_up);
    }

    private mouse_on_bg_move(e: MouseEvent): void {
        // if (this._is_dragging_pose) {
        //     let x_mov: number = this.mouseX - this._drag_mouse_begin_x;
        //     let y_mov: number = this.mouseY - this._drag_mouse_begin_y;
        //     this._pose.set_offset(this._drag_pose_begin_x + x_mov, this._drag_pose_begin_y + y_mov);
        // }
        //
        // ROPWait.NotifyMoveCamera();
    }

    private mouse_on_bg_up(e: Event): void {
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

    /*override*/
    // public on_key_down(key: number, ctrl: boolean, shift: boolean): boolean {
    //     let x_mov: number = 5;
    //     let y_mov: number = 5;
    //
    //     if (!ctrl && key == Keyboard.DOWN) {
    //         if (shift) {
    //             this._pose.shift_5prime();
    //         } else {
    //             this._pose.set_offset(this._pose.get_x_offset(), this._pose.get_y_offset() + y_mov);
    //         }
    //         return true;
    //     }
    //
    //     if (!ctrl && key == Keyboard.UP) {
    //         if (shift) {
    //             this._pose.shift_3prime();
    //         } else {
    //             this._pose.set_offset(this._pose.get_x_offset(), this._pose.get_y_offset() - y_mov);
    //         }
    //         return true;
    //     }
    //
    //     if (!ctrl && key == Keyboard.RIGHT) {
    //         if (shift) {
    //             this._pose.shift_3prime();
    //         } else {
    //             this._pose.set_offset(this._pose.get_x_offset() + x_mov, this._pose.get_y_offset());
    //         }
    //         return true;
    //     }
    //
    //     if (!ctrl && key == Keyboard.LEFT) {
    //         if (shift) {
    //             this._pose.shift_5prime();
    //         } else {
    //             this._pose.set_offset(this._pose.get_x_offset() - x_mov, this._pose.get_y_offset());
    //         }
    //         return true;
    //     }
    //
    //     return this._pose.on_key_down(key, ctrl, shift);
    // }

    private readonly _pose: Pose2D;

    private _is_dragging_pose: boolean = false;
    private _drag_mouse_begin_x: number = 0;
    private _drag_mouse_begin_y: number = 0;
    private _drag_pose_begin_x: number = 0;
    private _drag_pose_begin_y: number = 0;
}
