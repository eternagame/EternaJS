import * as log from "loglevel";
import {Container, Graphics, Point, Rectangle, Sprite, Texture} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GameObject} from "../../flashbang/core/GameObject";
import {Updatable} from "../../flashbang/core/Updatable";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Registration} from "../../signals/Registration";
import {Application} from "../Application";
import {EPars} from "../EPars";
import {Eterna} from "../Eterna";
import {ExpPainter} from "../ExpPainter";
import {Folder} from "../folding/Folder";
import {ROPWait} from "../rscript/ROPWait";
import {TextBalloon} from "../ui/TextBalloon";
import {BitmapManager} from "../util/BitmapManager";
import {Utility} from "../util/Utility";
import {Base} from "./Base";
import {BaseDrawFlags} from "./BaseDrawFlags";
import {EnergyScoreDisplay} from "./EnergyScoreDisplay";
import {HighlightBox, HighlightType} from "./HighlightBox";
import {PoseUtil} from "./PoseUtil";
import {RNALayout} from "./RNALayout";
import {RNATreeNode} from "./RNATreeNode";
import {ScoreDisplayNode, ScoreDisplayNodeType} from "./ScoreDisplayNode";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export type PoseMouseDownCallback = (e: InteractionEvent, closest_dist: number, closest_index: number) => void;

export class Pose2D extends ContainerObject implements Updatable {
    public static readonly COLOR_CURSOR: number = 0xFFC0CB;
    public static readonly ZOOM_SPACINGS: number[] = [45, 30, 20, 14, 7];
    public static readonly BASE_TRACK_THICKNESS: number[] = [5, 4, 3, 2, 2];
    public static readonly BASE_TRACK_RADIUS: number[] = [15, 10, 7, 5, 3];

    public static readonly OLIGO_MODE_DIMER: number = 1;
    public static readonly OLIGO_MODE_EXT3P: number = 2;
    public static readonly OLIGO_MODE_EXT5P: number = 3;

    constructor(editable: boolean) {
        super();
        this._editable = editable;
    }

    protected added() {
        super.added();

        this._score_node_highlight = new Graphics();
        this.container.addChild(this._score_node_highlight);

        this._primary_score_energy_display = new EnergyScoreDisplay(111, 40);
        this._primary_score_energy_display.position = new Point(17, 118);
        this.container.addChild(this._primary_score_energy_display);

        this._secondary_score_energy_display = new EnergyScoreDisplay(111, 40);
        this._secondary_score_energy_display.position = new Point(17 + 119, 118);
        this._secondary_score_energy_display.visible = false;
        this.container.addChild(this._secondary_score_energy_display);

        // this._canvas = new Bitmap;
        // this.addChild(this._canvas);
        // this._mol_canvas = new Bitmap;
        // this.addChild(this._mol_canvas);
        // this._mol_canvas.visible = false;
        //
        // this._paint_cursor = new PaintCursor;
        // this._paint_cursor.display.visible = false;
        // this.addObject(this._paint_cursor);
        //
        // this._explosion_rays = [];
        // for (let ii: number = 0; ii < 10; ii++) {
        //     this._explosion_rays.push(new LightRay);
        //     this.addObject(this._explosion_rays[ii]);
        // }
        //
        this._selection_highlight_box = new HighlightBox(this);
        this.addObject(this._selection_highlight_box, this.container);

        this._restricted_highlight_box = new HighlightBox(this);
        this.addObject(this._restricted_highlight_box, this.container);

        this._unstable_highlight_box = new HighlightBox(this);
        this.addObject(this._unstable_highlight_box, this.container);

        this._user_defined_highlight_box = new HighlightBox(this);
        this.addObject(this._user_defined_highlight_box, this.container);

        this._forced_highlight_box = new HighlightBox(this);
        this.addObject(this._forced_highlight_box, this.container);

        this._shift_highlight_box = new HighlightBox(this);
        this.addObject(this._shift_highlight_box, this.container);

        if (!this._editable) {
            this._current_color = -1;
        }

        this._aux_info_canvas = new Container();
        this._aux_info_canvas.visible = false;
        this.container.addChild(this._aux_info_canvas);

        this._aux_textballoon = new TextBalloon("", 0x0, 0.9);
        this._aux_textballoon.display.visible = false;
        this.addObject(this._aux_textballoon, this._aux_info_canvas);

        this._strand_label = new TextBalloon("", 0x0, 0.8);
        this._strand_label.display.visible = false;
        this.addObject(this._strand_label, this._aux_info_canvas);

        this.display.interactive = true;
        this.pointerMove.connect(() => this.pose_mouse_moved());
        this.pointerDown.connect((e) => this.call_start_mousedown_callback(e));
        this.pointerOut.connect((e) => this.on_pose_mouse_out(e));

        // handle view settings
        this.regs.add(Eterna.settings.showNumbers.connectNotify((value) => {
            this.set_show_numbering(value);
        }));

        this.regs.add(Eterna.settings.showLetters.connectNotify((value) => {
            this.set_lettermode(value);
        }));

        this.regs.add(Eterna.settings.useContinuousColors.connectNotify((value) => {
            this.set_use_continuous_exp_colors(value);
        }));

        this.regs.add(Eterna.settings.useExtendedColors.connectNotify((value) => {
            this.set_use_extended_scale(value);
        }));

        this.regs.add(Eterna.settings.displayFreeEnergies.connectNotify((value) => {
            this.set_display_score_texts(value);
        }));

        this.regs.add(Eterna.settings.highlightRestricted.connectNotify((value) => {
            this.set_highlight_restricted(value);
        }));

        this.regs.add(Eterna.settings.displayAuxInfo.connectNotify((value) => {
            this.set_display_aux_info(value);
        }));
    }

    public get_primary_score_display(): EnergyScoreDisplay {
        return this._primary_score_energy_display;
    }

    public get_secondary_score_display(): EnergyScoreDisplay {
        return this._secondary_score_energy_display;
    }

    // public add_anchored_object(obj: RNAAnchorObject): void {
    //     this._anchored_objects.push(obj);
    // }
    //
    // public remove_anchored_object(obj: RNAAnchorObject): void {
    //     for (let i: number = 0; i < this._anchored_objects.length; ++i) {
    //         if (obj == this._anchored_objects[i]) {
    //             this._anchored_objects.splice(i, 1);
    //             break;
    //         }
    //     }
    // }

    public get isAnimating(): boolean {
        return this._base_to_x != null;
    }

    public is_folding(): boolean {
        return (this._last_sampled_time - this._fold_start_time < this._fold_duration);
    }

    public visualize_feedback(dat: number[], mid: number, lo: number, hi: number, start_index: number): void {
        // coloring
        let newdat: number[] = ExpPainter.transform_data(dat, hi, lo);
        this._exp_painter = new ExpPainter(newdat, start_index);
        this._exp_mid = mid;
        this._exp_hi = hi;
        this.paint_feedback();

        // print feedback score
        for (let ii: number = 0; ii < this._feedback_objs.length; ii++) {
            this.removeObject(this._feedback_objs[ii]);
        }

        this._feedback_objs_num = dat.length;
        this._feedback_objs_start_ind = start_index;
        this.print_feedback(dat);
        this.update_print_feedback();
    }

    public paint_feedback(): void {
        if (!this._exp_painter) {
            return;
        }

        this._exp_painter.set_continuous(this._exp_continuous);
        this._exp_painter.set_extended_scale(this._exp_extended_scale);

        for (let ii: number = 0; ii < this._sequence.length; ii++) {
            this._bases[ii].set_color_level(true, this._exp_painter.get_color_level_with_midpoint(ii, this._exp_mid, this._exp_hi));
        }
        this._redraw = true;
    }

    public clear_feedback(): void {
        for (let ii: number = 0; ii < this._sequence.length; ii++) {
            this._bases[ii].set_color_level(false, -1);
        }
        this._redraw = true;
    }

    public get_zoom_level(): number {
        return this._zoom_level;
    }

    public set_zoom_level(zoom_level: number, animate: boolean = true, center: boolean = false): void {
        if ((this._zoom_level != zoom_level || center) && animate) {
            // if (this._zoom_level == zoom_level && center) {
            //     if (Math.abs(this._offscreen_width / 2 - this._off_x) + Math.abs(this._offscreen_height / 2 - this._off_y) < 50) {
            //         return;
            //     }
            // }

            // this._start_offset_x = this._off_x;
            // this._start_offset_y = this._off_y;

            // let scaler: number = 1;
            // if (zoom_level > this._zoom_level) {
            //     scaler = Pose2D.ZOOM_SPACINGS[zoom_level] / Pose2D.ZOOM_SPACINGS[this._zoom_level];
            // }

            // if (!this._offset_translating && !center) {
            //     this._end_offset_x = scaler * (this._off_x - this._offscreen_width / 2) + this._offscreen_width / 2;
            //     this._end_offset_y = scaler * (this._off_y - this._offscreen_height / 2) + this._offscreen_height / 2;
            // } else if (this._offset_translating) {
            //     this._end_offset_x = scaler * (this._end_offset_x - this._offscreen_width / 2) + this._offscreen_width / 2;
            //     this._end_offset_y = scaler * (this._end_offset_y - this._offscreen_height / 2) + this._offscreen_height / 2;
            // } else {
            //     this._end_offset_x = this._offscreen_width / 2;
            //     this._end_offset_y = this._offscreen_height / 2;
            // }

            // this._offset_translating = true;

            this._zoom_level = zoom_level;
            this.compute_layout(true);
            this._redraw = true;

        } else if (this._zoom_level != zoom_level) {
            this._zoom_level = zoom_level;
            this.compute_layout(true);
            this._redraw = true;
        }
    }

    public compute_default_zoom_level(): number {
        let n: number = this.get_full_sequence_length();
        let xarray: number[] = new Array(n);
        let yarray: number[] = new Array(n);

        let rna_coords: RNALayout;
        rna_coords = new RNALayout(Pose2D.ZOOM_SPACINGS[0], Pose2D.ZOOM_SPACINGS[0]);
        rna_coords.setup_tree(this._pairs);
        rna_coords.draw_tree();
        rna_coords.get_coords(xarray, yarray);

        let xmin: number = xarray[0];
        let xmax: number = xarray[0];
        let ymin: number = yarray[0];
        let ymax: number = yarray[0];

        for (let ii: number = 0; ii < n; ii++) {
            if (xarray[ii] < xmin) {
                xmin = xarray[ii];
            }

            if (xarray[ii] > xmax) {
                xmax = xarray[ii];
            }

            if (yarray[ii] < ymin) {
                ymin = yarray[ii];
            }

            if (yarray[ii] > ymax) {
                ymax = yarray[ii];
            }
        }

        let xdiff: number = xmax - xmin;
        let ydiff: number = ymax - ymin;
        // let xscale: number = xdiff / this._offscreen_width;
        // let yscale: number = ydiff / this._offscreen_height;
        let xscale: number = xdiff / Flashbang.stageWidth;
        let yscale: number = ydiff / Flashbang.stageHeight;

        let scale: number = Math.max(xscale, yscale);
        if (scale < 1.0) {
            return 0;
        } else if (30 / 45 * scale < 1.0) {
            return 1;
        } else if (20 / 45 * scale < 1.0) {
            return 2;
        } else if (14 / 45 * scale < 1.0) {
            return 3;
        } else {
            return 4;
        }
    }

    public set_current_color(col: number): void {
        this._current_color = col;
    }

    public get_current_color(): number {
        return this._current_color;
    }

    public done_coloring(): void {
        this._coloring = false;

        let need_update: boolean = false;

        if (this._mutated_sequence == null) {
            return;
        }

        if (this._mutated_sequence.length != this.get_full_sequence_length()) {
            throw new Error("Mutated sequence and original sequence lengths don't match");
        }

        let num_mut: number = 0;
        let muts: any[] = [];
        let div: number = 1;
        if (this._current_color == EPars.RNABASE_PAIR
            || this._current_color == EPars.RNABASE_GC_PAIR
            || this._current_color == EPars.RNABASE_AU_PAIR
            || this._current_color == EPars.RNABASE_GU_PAIR) {

            div = 2;
        }

        let ofs: number = (this._oligo != null && this._oligo_mode == Pose2D.OLIGO_MODE_EXT5P ? this._oligo.length : 0);
        let ii: number;
        for (ii = 0; ii < this._sequence.length; ii++) {
            if (this._sequence[ii] != this._mutated_sequence[ii + ofs]) {
                num_mut++;
                this._sequence[ii] = this._mutated_sequence[ii + ofs];
                muts.push({pos: ii + 1, base: EPars.sequence_array_to_string([this._sequence[ii]])});
                need_update = true;
            }
        }
        if (need_update) {
            this.call_track_moves_callback(num_mut / div, muts);
        }

        if (need_update || this._lock_updated || this._binding_site_updated || this._design_struct_updated) {
            this.check_pairs();
            this.set_molecule();
            this.generate_score_nodes();
            this.call_pose_edit_callback();
        }

        this._mutated_sequence = null;
        this._lock_updated = false;
        this._binding_site_updated = false;
        this._design_struct_updated = false;
    }

    public set_mutated(seq_arr: number[]): void {
        let n: number = Math.min(this._mutated_sequence.length, seq_arr.length);
        let ofs: number = (this._oligo != null && this._oligo_mode == Pose2D.OLIGO_MODE_EXT5P ? this._oligo.length : 0);

        for (let ii: number = 0; ii < n; ii++) {
            if (this._mutated_sequence[ii] != seq_arr[ii] && !this.is_locked(ofs + ii)) {
                this._mutated_sequence[ii] = seq_arr[ii];
                this._bases[ofs + ii].set_type(seq_arr[ii]);
            }
        }
    }

    public paste_sequence(sequence: number[]): void {
        if (sequence == null) {
            return;
        }

        let num_mut: number = 0;
        let muts: any[] = [];

        let n: number = Math.min(sequence.length, this._sequence.length);
        let need_update: boolean = false;
        let ofs: number = (this._oligo != null && this._oligo_mode == Pose2D.OLIGO_MODE_EXT5P ? this._oligo.length : 0);

        for (let ii: number = 0; ii < n; ii++) {
            if (this._sequence[ii] != sequence[ii] && !this.is_locked(ofs + ii)) {
                num_mut++;
                this._sequence[ii] = sequence[ii];
                muts.push({pos: ii + 1, base: EPars.sequence_array_to_string([this._sequence[ii]])});
                this._bases[ofs + ii].set_type(sequence[ii]);
                need_update = true;
            }
        }

        if (need_update) {
            this.call_track_moves_callback(num_mut, muts);

            this.check_pairs();
            this.set_molecule();
            this.generate_score_nodes();
            this.call_pose_edit_callback();
        }
    }

    public get_base_xy(seq: number): Point {
        return new Point(this._bases[seq].get_x() + this._off_x, this._bases[seq].get_y() + this._off_y);
    }

    public get_base_out_xy(seq: number): Point {
        let p: Point = this._bases[seq].get_out_xy();
        return new Point(p.x + this._off_x, p.y + this._off_y);
    }

    public clear_mouse(): void {
        // this._paint_cursor.visible = false;
        // this._paint_cursor.startDrag(false);
        // this._strand_label.visible = false;
    }

    public parse_command(command: number, closest_index: number): any[] {
        switch (command) {
        case EPars.RNABASE_ADD_BASE:
            return PoseUtil.add_base_with_index(closest_index, this._pairs);

        case EPars.RNABASE_ADD_PAIR:
            return PoseUtil.add_pair_with_index(closest_index, this._pairs);

        case EPars.RNABASE_DELETE:
            return this.delete_base_with_index(closest_index);

        default:
            return null;
        }
    }

    public parse_command_with_pairs(command: number, closest_index: number, pairs: number[]): any[] {
        switch (command) {
        case EPars.RNABASE_ADD_BASE:
            return PoseUtil.add_base_with_index(closest_index, pairs);

        case EPars.RNABASE_DELETE:
            return this.delete_base_with_index_pairs(closest_index, pairs);

        default:
            return null;
        }
    }

    public on_pose_mouse_down_propagate(e: InteractionEvent, closest_index: number): void {
        let altDown: boolean = Flashbang.app.isAltKeyDown;
        let ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;

        if ((this._coloring && !altDown) || ctrlDown) {
            if (ctrlDown && closest_index >= this.get_sequence().length) {
                return;
            }
            this.on_pose_mouse_down(e, closest_index);
        }
    }

    public on_pose_mouse_down(e: InteractionEvent, closest_index: number): void {
        let altDown: boolean = Flashbang.app.isAltKeyDown;
        let shiftDown: boolean = Flashbang.app.isShiftKeyDown;
        let ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;

        if (closest_index >= 0) {
            this._mouse_down_altKey = altDown;
            if (ctrlDown && closest_index < this.get_full_sequence_length()) {
                this.toggle_black_mark(closest_index);
                return;
            }
            if (shiftDown) {
                if (closest_index < this.get_sequence_length()) {
                    this._shift_start = closest_index;
                    this._shift_end = closest_index;
                    this.update_shift_highlight();

                    let reg: Registration = null;
                    reg = this.pointerUp.connect(() => {
                        this._shift_start = -1;
                        this._shift_end = -1;
                        reg.close();
                    });
                }
                e.stopPropagation();
                return;
            }
            this._last_shifted_command = -1;
            this._last_shifted_index = -1;
            let cmd: any[] = this.parse_command(this._current_color, closest_index);
            if (cmd == null) {
                log.debug("TODO: set_dragger");
                // Application.instance.set_dragger(() => this.pose_mouse_moved(), () => this.on_pose_mouse_up());
                this.on_base_mouse_down(closest_index, ctrlDown);
            } else {
                this._last_shifted_command = this._current_color;
                this._last_shifted_index = closest_index;

                this.call_add_base_callback(cmd[0], cmd[1], closest_index);
            }

            e.stopPropagation();
        } else {
            if (shiftDown) {
                this._shift_start = -1;
                this._shift_end = -1;
                this.update_shift_highlight();
            }
        }
    }

    public toggle_black_mark(closest_index: number): void {
        let index: number = this._tracked_indices.indexOf(closest_index);
        if (index == -1) {
            this.black_mark(closest_index);
        } else {
            this.remove_black_mark(closest_index);
        }
    }

    public black_mark(closest_index: number): void {
        let index: number = this._tracked_indices.indexOf(closest_index);
        if (index == -1) {
            this._tracked_indices.push(closest_index);
            ROPWait.NotifyBlackMark(closest_index, true);

            let base_box: Graphics = new Graphics();
            this._base_boxes.push(base_box);
            this.container.addChild(base_box);

            let n: number = this._tracked_indices.length;
            let center: Point = this.get_base_xy(this._tracked_indices[n - 1]);
            this._base_boxes[n - 1].x = center.x;
            this._base_boxes[n - 1].y = center.y;
            this._base_boxes[n - 1].visible = true;
            this._base_boxes[n - 1].clear();
            this._base_boxes[n - 1].lineStyle(Pose2D.BASE_TRACK_THICKNESS[this.get_zoom_level()], 0x000000);
            this._base_boxes[n - 1].drawCircle(0, 0, Pose2D.BASE_TRACK_RADIUS[this.get_zoom_level()]);
        }
    }

    public remove_black_mark(closest_index: number): void {
        let index: number = this._tracked_indices.indexOf(closest_index);
        if (index != -1) {
            this._base_boxes[index].visible = false;
            this._tracked_indices.splice(index, 1);
            this._base_boxes.splice(index, 1);
            ROPWait.NotifyBlackMark(closest_index, false);
        }
    }

    public is_tracked_index(index: number): boolean {
        return this._tracked_indices.indexOf(index) >= 0;
    }

    public pose_mouse_moved(): void {
        // if (!this._coloring) {
        //     this.clear_mouse();
        // }
        //
        // let ii: number;
        // let closest_dist: number = -1;
        // let closest_index: number = -1;
        //
        // for (ii = 0; ii < this.get_full_sequence_length(); ii++) {
        //
        //     let mouseDist: number = this._bases[ii].is_clicked(this.mouseX - this._off_x, this.mouseY - this._off_y, this._zoom_level, this._coloring);
        //     if (mouseDist >= 0) {
        //
        //         if (closest_index < 0 || mouseDist < closest_dist) {
        //             closest_index = ii;
        //             closest_dist = mouseDist;
        //         }
        //     }
        // }
        //
        // if (closest_index >= 0 && this._current_color >= 0) {
        //     this.on_base_mouse_move(closest_index);
        //     //Mouse.hide();
        //     this._paint_cursor.visible = true;
        //     this._paint_cursor.startDrag(true);
        //     this._paint_cursor.set_shape(this._current_color);
        //
        //     let s_name: string = this.get_strand_name(closest_index);
        //     if (s_name != null) {
        //         this._strand_label.set_text(s_name);
        //         if (this.mouseX + 16 + this._strand_label.balloon_width() > this._offscreen_width) {
        //             this._strand_label.set_pos(new UDim(0, 0, this.mouseX - 16 - this._strand_label.balloon_width(), this.mouseY + 16));
        //         } else {
        //             this._strand_label.set_pos(new UDim(0, 0, this.mouseX + 16, this.mouseY + 16));
        //         }
        //         this._strand_label.visible = true;
        //     }
        //
        // } else {
        //     this._last_colored_index = -1;
        // }
        //
        // if (!this._coloring) {
        //     this.update_score_node_gui();
        //     if (this._feedback_objs.length > 0) {
        //         for (ii = 0; ii < this._feedback_objs.length; ii++) {
        //             if (ii == closest_index) continue;
        //             this._feedback_objs[ii].visible = false;
        //         }
        //         if (closest_index >= 0) {
        //             this._feedback_objs[closest_index].visible = true;
        //         }
        //     }
        // }
    }

    public on_pose_mouse_up(): void {
        this.done_coloring();
        this._mouse_down_altKey = false;
        ROPWait.NotifyEndPaint();
    }

    public delete_base_with_index_pairs(index: number, pairs: number[]): any[] {
        if (this.is_tracked_index(index)) {
            this.toggle_black_mark(index);
        }

        return PoseUtil.delete_nopair_with_index(index, pairs);
    }

    public clear_tracking(): void {
        while (this._tracked_indices.length > 0) {
            this._tracked_indices.pop();
        }
        while (this._base_boxes.length > 0) {
            DisplayUtil.removeFromParent(this._base_boxes.pop());
        }
    }

    public get_tracked_indices(): number[] {
        return this._tracked_indices.slice();
    }

    public get_base(ind: number): Base {
        return this._bases[ind];
    }

    public get_x_offset(): number {
        return this._off_x;
    }

    public get_y_offset(): number {
        return this._off_y;
    }

    public set_offset(off_x: number, off_y: number): void {
        this._off_x = off_x;
        this._off_y = off_y;
        this._redraw = true;
    }

    public get_shift_limit(): number {
        return this._shift_limit;
    }

    public set_shift_limit(limit: number): void {
        this._shift_limit = limit + this._sequence.length;
    }

    public set_barcodes(barcodes: number[]): void {
        this._barcodes = barcodes.slice();
    }

    public set_puzzle_locks(puzlocks: boolean[]): void {
        if (puzlocks == null) {
            this._locks = null;
        } else {
            this._locks = puzlocks.slice();
        }

        this._redraw = true;
    }

    public get_puzzle_locks(): boolean[] {
        if (this._locks != null) {
            return this._locks.slice();
        }

        let temp: boolean[] = [];
        for (let ii: number = 0; ii < this._sequence.length; ii++) {
            temp.push(false);
        }

        return temp;
    }

    public is_locked(seqnum: number): boolean {
        if (this._oligo != null && this._oligo_mode == Pose2D.OLIGO_MODE_EXT5P) seqnum -= this._oligo.length;
        if (seqnum < 0 || seqnum >= this._sequence.length) return true;
        let lock: boolean = false;
        if (this._locks != null) {
            lock = lock || this._locks[seqnum];
        }

        return lock;
    }

    public set_forced_struct(forced: number[]): void {
        let len: number = this.get_full_sequence_length();
        if (forced == null) {
            this._forced_struct = null;
        } else {
            if (forced.length != len) {
                throw new Error("Forced structure length does not match sequence length " + forced.length + " " + this._sequence.length + " " + this._pairs.length);
            }

            this._forced_struct = forced.slice();
        }

        for (let ii: number = 0; ii < len; ii++) {
            this._bases[ii].set_forced(this._forced_struct != null && this._forced_struct[ii] != EPars.FORCE_IGNORE);
        }
    }

    public get_forced_struct(): number[] {
        if (this._forced_struct != null) {
            return this._forced_struct.slice();
        }

        let temp: number[] = [];
        for (let ii: number = 0; ii < this.get_full_sequence_length(); ii++) {
            temp.push(EPars.FORCE_IGNORE);
        }

        return temp;
    }

    public set_forced_highlights(elems: number[]): void {
        if (elems == null) {
            this._forced_highlight_box.clear();
        } else {
            this._forced_highlight_box.set_highlight(HighlightType.FORCED, elems);
        }
    }

    public set_struct_constraints(do_care: boolean[]): void {
        let ii: number;
        let len: number = this.get_full_sequence_length();
        let dc: boolean[] = (do_care == null ? null : do_care.slice());
        if (dc != null && this._oligos_order != null) {
            let idx_map: number[] = this.get_order_map(null);
            for (ii = 0; ii < len; ii++) {
                dc[ii] = do_care[idx_map.indexOf(ii)];
            }
        }
        for (ii = 0; ii < len; ii++) {
            this._bases[ii].set_dontcare(dc == null ? false : !dc[ii]);
        }
    }

    public clear_design_struct(): void {
        for (let jj: number = 0; jj < this.get_full_sequence_length(); jj++) {
            this._design_struct[jj] = false;
        }
        this.update_design_highlight();
    }

    public toggle_design_struct(seqnum: number): boolean {
        this._design_struct[seqnum] = !(this._design_struct[seqnum] == true);
        ROPWait.NotifyBlueMark(seqnum, this._design_struct[seqnum]);
        this.update_design_highlight();
        let segments: number[] = this.get_design_segments();
        return (segments.length == 4
            && segments[1] - segments[0] == segments[3] - segments[2]
            && (segments[2] - segments[1] > 3
                || EPars.has_cut(this.get_full_sequence(), segments[1], segments[2])));
    }

    public get_design_segments(): number[] {
        let elems: number[] = [];
        let curr: number = 0;
        for (let jj: number = 0; jj < this.get_full_sequence_length(); jj++) {
            let _stat: number = (this._design_struct[jj] == true ? 1 : 0);
            if ((curr ^ _stat) != 0) {
                elems.push(jj - curr);
                curr = _stat;
            }
        }
        if ((elems.length % 2) == 1) {
            elems.push(this.get_full_sequence_length() - 1);
        }

        return elems;
    }

    public shift_3prime(): void {
        let q: number[] = this._shift_highlight_box.get_queue();
        if (q == null) {
            return;
        }

        let first: number = q[1];
        let last: number = q[2];
        let ii: number;
        // can't shift locked bases
        for (ii = first; ii <= last; ii++) {
            if (this._locks[ii]) {
                return;
            }
        }
        // find the next acceptable spot
        let ofs: number = 1;
        let len: number = this.get_sequence_length();
        while (last + ofs < len) {
            for (ii = first + ofs; ii <= last + ofs; ii++) {
                if (this._locks[ii]) {
                    break;
                }
            }
            if (ii > last + ofs) {
                break;
            }
            ofs++;
        }
        // if not found, give up
        if (last + ofs >= len) {
            return;
        }

        let mutated: number[];
        let segment: number[];
        if (ofs == 1) {
            segment = this._sequence.slice(first, last + 1 + 1);
            segment.unshift(segment.pop());
            mutated = this._sequence.slice(0, first)
                .concat(segment)
                .concat(this._sequence.slice(last + 1 + 1));
        } else {
            mutated = this._sequence.slice();
            for (ii = first; ii <= last; ii++) {
                let xx: number = mutated[ii + ofs];
                mutated[ii + ofs] = mutated[ii];
                mutated[ii] = xx;
            }
        }

        this._mutated_sequence = this.get_full_sequence().slice();
        this.set_mutated(mutated);
        this.done_coloring();
        this._shift_highlight_box.set_highlight(HighlightType.SHIFT, [first + ofs, last + ofs]);
    }

    public shift_5prime(): void {
        let q: number[] = this._shift_highlight_box.get_queue();
        if (q == null) {
            return;
        }

        let first: number = q[1];
        let last: number = q[2];
        let ii: number;
        // can't shift locked bases
        for (ii = first; ii <= last; ii++) {
            if (this._locks[ii]) {
                return;
            }
        }
        // find the next acceptable spot
        let ofs: number = -1;
        while (first + ofs >= 0) {
            for (ii = first + ofs; ii <= last + ofs; ii++) {
                if (this._locks[ii]) {
                    break;
                }
            }
            if (ii > last + ofs) {
                break;
            }
            ofs--;
        }
        // if not found, give up
        if (first + ofs < 0) {
            return;
        }

        let mutated: number[];
        let segment: number[];
        if (ofs == -1) {
            segment = this._sequence.slice(first - 1, last + 1);
            segment.push(segment.shift());
            mutated = this._sequence.slice(0, first - 1)
                .concat(segment)
                .concat(this._sequence.slice(last + 1));
        } else {
            mutated = this._sequence.slice();
            for (ii = first; ii <= last; ii++) {
                let xx: number = mutated[ii + ofs];
                mutated[ii + ofs] = mutated[ii];
                mutated[ii] = xx;
            }
        }

        this._mutated_sequence = this.get_full_sequence().slice();
        this.set_mutated(mutated);
        this.done_coloring();
        this._shift_highlight_box.set_highlight(HighlightType.SHIFT, [first + ofs, last + ofs]);
    }

    public is_design_structure_highlighted(index: number): boolean {
        return (this._design_struct[index] == true);
    }

    public get_sequence_string(): string {
        return EPars.sequence_array_to_string(this._sequence);
    }

    public satisfied(): boolean {
        for (let ii: number = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii && !this.is_pair_satisfied(ii, this._pairs[ii])) {
                return false;
            }
        }

        return true;
    }

    public set_show_numbering(show: boolean): void {
        this._numbering_mode = show;
        this._redraw = true;
    }

    public is_showing_numbering(): boolean {
        return this._numbering_mode;
    }

    public set_use_low_performance(lowperform: boolean): void {
        this._lowperform_mode = lowperform;
        this._redraw = true;
    }

    public is_using_low_performance(): boolean {
        return this._lowperform_mode;
    }

    public set_highlight_restricted(highlight_restricted: boolean): void {
        this._highlight_restricted = highlight_restricted;
        this._restricted_highlight_box.enabled = highlight_restricted;
    }

    public is_highlighting_restricted(): boolean {
        return this._highlight_restricted;
    }

    public set_use_continuous_exp_colors(cont: boolean): void {
        this._exp_continuous = cont;
        this._redraw = true;

        if (this._exp_painter) {
            this.paint_feedback();
        }
    }

    public set_use_extended_scale(extended: boolean): void {
        this._exp_extended_scale = extended;
        this._redraw = true;

        if (this._exp_painter) {
            this.paint_feedback();
        }
    }

    public is_displaying_score_texts(): boolean {
        return this._display_score_texts;
    }

    public set_display_score_texts(dis: boolean): void {
        this._display_score_texts = dis;

        this.generate_score_nodes();
    }

    public show_energy_highlight(display: boolean): void {
        this._highlight_energy_text = display;
        this.generate_score_nodes();
    }

    public clear_highlight(): void {
        this._selection_highlight_box.clear();
    }

    public highlight_stack(action: number[]): void {
        this._selection_highlight_box.set_highlight(HighlightType.STACK, action.slice(1));
    }

    public highlight_loop(action: number[]): void {
        this._selection_highlight_box.set_highlight(HighlightType.LOOP, action.slice(1));
    }

    /// For restricted queue
    public clear_restricted_highlight(): void {
        this._restricted_highlight_box.clear();
    }

    public highlight_restricted_sequence(restricted: number[]): void {
        this._restricted_highlight_box.set_highlight(HighlightType.RESTRICTED, restricted);
    }

    public clear_unstable_highlight(): void {
        this._unstable_highlight_box.clear();
    }

    public highlight_unstable_sequence(unstable: number[]): void {
        this._unstable_highlight_box.set_highlight(HighlightType.UNSTABLE, unstable);
    }

    public clear_user_defined_highlight(): void {
        this._user_defined_highlight_box.clear();
    }

    public highlight_user_defined_sequence(user_defined: number[]): void {
        this._user_defined_highlight_box.set_highlight(HighlightType.USER_DEFINED, user_defined);
    }

    public clear_shift_highlight(): void {
        this._shift_highlight_box.clear();
    }

    public praise_stack(stack_start: number, stack_end: number): void {
        this._praise_queue.push(stack_start);
        this._praise_queue.push(stack_end);
    }

    public praise_sequence(seq_start: number, seq_end: number): void {
        this._praise_seq.push(seq_start);
        this._praise_seq.push(seq_end);
    }

    public on_praise_stack(stack_start: number, stack_end: number, play_sound: boolean): void {
        // let x_pos: number = 0;
        // let y_pos: number = 0;
        //
        // let play_ua: boolean = false;
        // let play_gc: boolean = false;
        // let play_gu: boolean = false;
        //
        // for (let kk: number = stack_start; kk <= stack_end; kk++) {
        //     if (this._pairs[kk] < 0) {
        //         return;
        //     }
        // }
        //
        // for (let ii: number = stack_start; ii <= stack_end; ii++) {
        //
        //     let aa: number = ii;
        //     let bb: number = this._pairs[ii];
        //
        //     if ((this._sequence[aa] == EPars.RNABASE_ADENINE && this._sequence[bb] == EPars.RNABASE_URACIL) ||
        //         (this._sequence[bb] == EPars.RNABASE_ADENINE && this._sequence[aa] == EPars.RNABASE_URACIL)) {
        //         play_ua = true;
        //     } else if ((this._sequence[aa] == EPars.RNABASE_GUANINE && this._sequence[bb] == EPars.RNABASE_CYTOSINE) ||
        //         (this._sequence[bb] == EPars.RNABASE_GUANINE && this._sequence[aa] == EPars.RNABASE_CYTOSINE)) {
        //         play_gc = true;
        //     } else if ((this._sequence[aa] == EPars.RNABASE_GUANINE && this._sequence[bb] == EPars.RNABASE_URACIL) ||
        //         (this._sequence[bb] == EPars.RNABASE_GUANINE && this._sequence[aa] == EPars.RNABASE_URACIL)) {
        //         play_gu = true;
        //     }
        //
        //     this._bases[ii].start_sparking();
        //     this._bases[this._pairs[ii]].start_sparking();
        //     let p: Point = this.get_base_xy(ii);
        //     let p2: Point = this.get_base_xy(this._pairs[ii]);
        //
        //     x_pos += p.x;
        //     y_pos += p.y;
        //
        //     x_pos += p2.x;
        //     y_pos += p2.y;
        // }
        //
        // let stack_len: number = (stack_end - stack_start) + 1;
        //
        // x_pos /= stack_len * 2;
        // y_pos /= stack_len * 2;
        //
        // let praise_obj: GameText = null;
        //
        // for (ii = 0; ii < this._praise_objects.length; ii++) {
        //     if (this._praise_objects[ii].visible == false) {
        //         praise_obj = this._praise_objects[ii];
        //         break;
        //     }
        // }
        //
        // if (praise_obj == null) {
        //     praise_obj = new GameText(Fonts.arial(20, true));
        //     this.addObject(praise_obj);
        // }
        //
        // praise_obj.visible = true;
        // if (stack_len > 1) {
        //     praise_obj.set_text("Great Pairings!");
        // } else {
        //     praise_obj.set_text("Great Pairing!");
        // }
        //
        // praise_obj.set_pos(new UDim(0, 0, x_pos - praise_obj.text_width() / 2, y_pos));
        // praise_obj.set_animator(new GameAnimatorMover(new UDim(0, 0, x_pos - praise_obj.text_width() / 2, y_pos - 30), 0.9, true, false, true));
        //
        // if (play_sound) {
        //     if (play_gc) {
        //         SoundManager.instance.play_se(Pose2D.GAMESOUND_RG);
        //     } else if (play_ua) {
        //         SoundManager.instance.play_se(Pose2D.GAMESOUND_YB);
        //     } else if (play_gu) {
        //         SoundManager.instance.play_se(Pose2D.GAMESOUND_RB);
        //     }
        // }
    }

    public create_new_highlight(nucleotides: number[]): any {
        let hl: any = {};

        // If any of the nucleotides are part of a stack, highlight its pair as well.
        let addition: number[] = [];
        for (let i: number = 0; i < nucleotides.length; ++i) {
            if (this._pairs[nucleotides[i]] != -1) {
                addition.push(this._pairs[nucleotides[i]]);
            }
        }
        nucleotides = nucleotides.concat(addition);

        hl.nuc = nucleotides;
        this._all_new_highlights.push(hl);

        this._redraw = true;
        return hl;
    }

    public remove_new_highlight(hl: any): void {
        let i: number = this._all_new_highlights.indexOf(hl);
        this._all_new_highlights.splice(i, 1);
        this._redraw = true;
    }

    public on_praise_seq(seq_start: number, seq_end: number): void {
        for (let ii: number = seq_start; ii <= seq_end; ii++) {
            if (ii >= 0 && ii < this.get_full_sequence_length()) {
                this._bases[ii].start_sparking();
            }
        }
    }

    public set_display_aux_info(display: boolean): void {
        // this._display_aux_info = display;
        // this._aux_info_canvas.visible = display;
    }

    public set_aux_info(aux_info: Object): void {
        // this._aux_info = aux_info;
        //
        // if (this._aux_info != null && this._aux_info['cleaving_site'] != null) {
        //     this._aux_textballoon.visible = true;
        //     this._aux_textballoon.set_text("Ribozyme cleaving site");
        // }
    }

    public start_explosion(cb: Function): void {
        // this._is_exploding = true;
        // this._explosion_start_time = -1;
        // this._explosion_cb = cb;
        // let rand_angle: number;
        //
        // if (this._explosion_rays.length >= this._sequence.length) {
        //     for (let ii: number = 0; ii < this._sequence.length; ii++) {
        //         rand_angle = Math.random() * 2 * Math.PI;
        //         this._explosion_rays[ii].visible = false;
        //
        //         if (this._sequence[ii] == EPars.RNABASE_ADENINE) {
        //             this._explosion_rays[ii].set_color(0xFFFF00);
        //         } else if (this._sequence[ii] == EPars.RNABASE_URACIL) {
        //             this._explosion_rays[ii].set_color(0x0000FF);
        //         } else if (this._sequence[ii] == EPars.RNABASE_GUANINE) {
        //             this._explosion_rays[ii].set_color(0xFF0000);
        //         } else if (this._sequence[ii] == EPars.RNABASE_CYTOSINE) {
        //             this._explosion_rays[ii].set_color(0x00FF00);
        //         } else {
        //             this._explosion_rays[ii].set_color(0xFFFFFF);
        //         }
        //
        //         this._explosion_rays[ii].draw_ray(new Point(Math.cos(rand_angle) * this._offscreen_width / 1.5, Math.sin(rand_angle) * this._offscreen_height / 1.5));
        //
        //     }
        // } else {
        //     let diff: number = (this._sequence.length - this._explosion_rays.length) / this._explosion_rays.length;
        //     let diff_walker: number = 0;
        //     let ray_walker: number = 0;
        //
        //     for (ii = 0; ii < this._sequence.length; ii++) {
        //
        //         if (diff_walker < 1) {
        //
        //             if (ray_walker >= this._explosion_rays.length)
        //                 continue;
        //
        //             rand_angle = Math.random() * 2 * Math.PI;
        //
        //             if (this._sequence[ii] == EPars.RNABASE_ADENINE) {
        //                 this._explosion_rays[ray_walker].set_color(0xFFFF00);
        //             } else if (this._sequence[ii] == EPars.RNABASE_URACIL) {
        //                 this._explosion_rays[ray_walker].set_color(0x0000FF);
        //             } else if (this._sequence[ii] == EPars.RNABASE_GUANINE) {
        //                 this._explosion_rays[ray_walker].set_color(0xFF0000);
        //             } else if (this._sequence[ii] == EPars.RNABASE_CYTOSINE) {
        //                 this._explosion_rays[ray_walker].set_color(0x00FF00);
        //             } else {
        //                 this._explosion_rays[ray_walker].set_color(0xFFFFFF);
        //             }
        //
        //
        //             this._explosion_rays[ray_walker].visible = false;
        //             this._explosion_rays[ray_walker].draw_ray(new Point(Math.cos(rand_angle) * this._offscreen_width / 1.5, Math.sin(rand_angle) * this._offscreen_height / 1.5));
        //
        //             ray_walker++;
        //
        //             diff_walker += diff;
        //
        //         } else {
        //             diff_walker -= 1;
        //         }
        //
        //     }
        // }
    }

    public clear_explosion(): void {
        // if (!this._is_exploding) return;
        //
        // this._is_exploding = false;
        // this._explosion_start_time = -1;
        // this._explosion_cb = null;
        //
        // for (let ii: number = 0; ii < this._explosion_rays.length; ii++) {
        //     this._explosion_rays[ii].set_animator(new GameAnimatorFader(1, 0, 1.5, true));
        // }
    }

    public set_pose_edit_callback(cb: Function): void {
        this._pose_edit_callback = cb;
    }

    public call_pose_edit_callback(): void {
        if (this._pose_edit_callback != null) {
            this._pose_edit_callback();
        }
    }

    public set_track_moves_callback(cb: Function): void {
        this._track_moves_callback = cb;
    }

    public call_track_moves_callback(count: number, moves: any[]): void {
        if (this._track_moves_callback != null) {
            this._track_moves_callback(count, moves);
        }
    }

    public set_add_base_callback(cb: Function): void {
        this._add_base_callback = cb;
    }

    public call_add_base_callback(parenthesis: string = null, mode: number = -1, index: number = -1): void {
        if (this._add_base_callback != null) {
            this._add_base_callback(parenthesis, mode, index);
        }
    }

    public set_start_mousedown_callback(cb: PoseMouseDownCallback): void {
        this._start_mousedown_callback = cb;
    }

    public call_start_mousedown_callback(e: InteractionEvent): void {
        e.data.getLocalPosition(this.display, Pose2D.P);
        let mouseX: number = Pose2D.P.x;
        let mouseY: number = Pose2D.P.y;

        let closest_dist: number = -1;
        let closest_index: number = -1;

        if (this._start_mousedown_callback != null) {
            for (let ii: number = 0; ii < this.get_full_sequence_length(); ii++) {
                let mouseDist: number = this._bases[ii].is_clicked(mouseX - this._off_x, mouseY - this._off_y, this._zoom_level, false);
                if (mouseDist >= 0) {
                    if (closest_index < 0 || mouseDist < closest_dist) {
                        closest_index = ii;
                        closest_dist = mouseDist;
                    }
                }
            }
            this._start_mousedown_callback(e, closest_dist, closest_index);
        } else {
            this.on_pose_mouse_down(e, closest_index);
        }
    }

    public get_satisfied_pairs(): number[] {
        return EPars.get_satisfied_pairs(this._pairs, this.get_full_sequence());
    }

    public set_sequence(sequence: number[]): void {
        if (this._sequence != null && this._sequence.length == sequence.length) {
            let changed: boolean = false;
            for (let ii: number = 0; ii < this._sequence.length; ii++) {
                if (this._sequence[ii] != sequence[ii]) {
                    changed = true;
                    break;
                }
            }

            if (!changed) {
                return;
            }
        }

        if (this._locks == null) {
            this._locks = [];
        }

        this._sequence = sequence.slice();
        if (this._sequence.length > this._bases.length) {
            let diff: number = (this._sequence.length - this._bases.length);
            for (let ii: number = 0; ii < diff; ii++) {
                this.createBase();
                this._locks.push(false);
            }

        } else if (this._sequence.length < this._bases.length) {
            for (let ii: number = this._sequence.length; ii < this._bases.length; ii++) {
                this._locks[ii] = false;
                if (this.is_tracked_index(ii)) {
                    this.remove_black_mark(ii);
                }
            }
        }

        let n: number = this.get_full_sequence_length();
        for (let ii: number = 0; ii < n; ii++) {
            if (ii < this._sequence.length) {
                this._bases[ii].set_type(this._sequence[ii]);
            }
            this._bases[ii].set_base_index(ii);
        }

        this.check_pairs();
        this.set_molecule();
        this.generate_score_nodes();
    }

    public set_molecular_binding_bonus(bonus: number): void {
        this._molecular_binding_bonus = bonus;
    }

    public set_molecular_structure(pairs: any[]): void {
        if (pairs != null) {
            this._molecule_target_pairs = pairs.slice();
        } else {
            this._molecule_target_pairs = null;
        }
    }

    public get_molecular_structure(): any[] {
        return this._molecule_target_pairs;
    }

    public set_molecular_binding_site(binding_site: any[]): void {
        // if (binding_site != null) {
        //     this._binding_site = binding_site.slice();
        // } else {
        //     this._binding_site = null;
        //     this.set_molecular_binding(null, null, this._molecular_binding_bonus);
        //     return;
        // }
        //
        // let target_pairs: any[] = this._molecule_target_pairs.slice();
        // if (!target_pairs) {
        //     Application.instance.throw_error("Can't find molecular target structure");
        //     return;
        // }
        //
        // let binding_bases: any[] = [];
        // let binding_pairs: any[] = [];
        // for (let ii: number = 0; ii < binding_site.length; ii++) {
        //     if (binding_site[ii]) {
        //         binding_bases.push(ii);
        //         binding_pairs.push(target_pairs[ii]);
        //     }
        // }
        // this.set_molecular_binding(binding_bases, binding_pairs, this._molecular_binding_bonus);
    }

    public get_molecular_binding_site(): any[] {
        if (this._binding_site) {
            return this._binding_site.slice();
        }

        let temp: any[] = [];
        for (let ii: number = 0; ii < this._sequence.length; ii++) {
            temp.push(false);
        }
        return temp;
    }

    public set_molecular_binding(binding_sites: any[], binding_pairs: any[], binding_bonus: number): void {
        // if (binding_sites == null || binding_sites.length == 0) {
        //     this._molecular_binding_bases = null;
        //     this._molecular_binding_pairs = null;
        //     this._molecule = null;
        //     return;
        // }
        //
        // this._molecular_binding_bases = new Array(this._sequence.length);
        // this._molecular_binding_pairs = new Array(this._sequence.length);
        // this._molecular_binding_bonus = binding_bonus;
        //
        // this._molecule = new Molecule();
        //
        // for (let ii: number = 0; ii < binding_sites.length; ii++) {
        //     this._molecular_binding_bases[binding_sites[ii]] = new BaseGlow();
        //     this._molecular_binding_pairs[binding_sites[ii]] = binding_pairs[ii];
        // }
        //
        // this.set_molecule();
    }

    public set_molecule(): void {
        // if (this._molecular_binding_bases == null || this._molecule == null)
        //     return;
        //
        // let bound_render: boolean = true;
        // let bound_real: boolean = true;
        // let satisfied_pairs: any[] = this.get_satisfied_pairs();
        //
        // for (let ii: number = 0; ii < this._molecular_binding_pairs.length; ii++) {
        //     if (this._molecular_binding_bases[ii] == null)
        //         continue;
        //     if (this._molecular_binding_pairs[ii] != this._pairs[ii])
        //         bound_render = false;
        //
        //     if (this._molecular_binding_pairs[ii] != satisfied_pairs[ii]) {
        //         bound_real = false;
        //         this._molecular_binding_bases[ii].set_wrong(true);
        //     } else {
        //         this._molecular_binding_bases[ii].set_wrong(false);
        //     }
        // }
        // this._molecule.set_wrong(!bound_real);
        // this._molecule_is_bound = bound_render;
        // this._molecule_is_bound_real = bound_real;
    }

    public set_oligos(oligos: any[], order: any[] = null, num_paired: number = 0): void {
        if (oligos == null) {
            this._oligos = null;
            this._oligos_order = null;
            this._oligos_paired = 0;
            return;
        }

        let k: number;
        let same: boolean = (this._oligos != null && oligos.length == this._oligos.length);
        if (same) {
            for (k = 0; k < oligos.length && same; k++) {
                same = same && (this._oligos[k].sequence == this._oligos[k].sequence);
            }
        }

        let prev_order: any[] = this._oligos_order;
        this._oligos = JSON.parse(JSON.stringify(oligos));
        if (order == null) {
            this._oligos_order = [];
            for (k = 0; k < this._oligos.length; k++) this._oligos_order[k] = k;
        } else {
            this._oligos_order = order.slice();
        }
        this._oligos_paired = num_paired;

        let seq: number[] = this.get_full_sequence();
        if (seq.length > this._bases.length) {
            let diff: number = (seq.length - this._bases.length);
            for (k = 0; k < diff; k++) {
                this.createBase();
            }
        }

        let n: number = seq.length;
        for (k = 0; k < n; k++) {
            this._bases[k].set_type(seq[k]);
            this._bases[k].set_base_index(k);
        }

        // if possible, maintain visual consistency
        // (strands "fly" from their previous location in the previous oligo order)
        if (same && JSON.stringify(prev_order) != JSON.stringify(this._oligos_order)) {
            let old_x: number[] = [];
            let old_y: number[] = [];
            let idx_map: number[] = this.get_order_map(prev_order);
            for (k = 0; k < seq.length; k++) {
                old_x[k] = this._bases[k].get_x();
                old_y[k] = this._bases[k].get_y();
            }
            for (k = 0; k < seq.length; k++) {
                this._bases[idx_map[k]].set_xy(old_x[k], old_y[k]);
            }
        }
    }

    public get_oligos(): any[] {
        return (this._oligos != null ? JSON.parse(JSON.stringify(this._oligos)) : null);
    }

    public get_order_map(other_order: number[]): number[] {
        if (this._oligos == null) {
            return null;
        }

        let idx_map: number[] = [];
        let ofs: number[] = [];
        let ii: number = this._sequence.length;
        let jj: number;
        for (jj = 0; jj < this._oligos.length; jj++) {
            ofs[this._oligos_order[jj]] = ii;
            ii += 1 + this._oligos[this._oligos_order[jj]].sequence.length;
        }
        for (ii = 0; ii < this._sequence.length; ii++) idx_map[ii] = ii;
        for (jj = 0; jj < this._oligos.length; jj++) {
            let zz: number = (other_order == null ? jj : other_order[jj]);
            let kk: number = ofs[zz];
            let xx: number;
            for (xx = 0; xx <= this._oligos[zz].sequence.length; xx++) {
                idx_map[ii + xx] = kk + xx;
            }
            ii += xx;
        }
        return idx_map;
    }

    public save_markers_context(): void {
        if (this._oligos == null) {
            this._prev_oligos_order = null;
        } else if (this._prev_oligos_order == null) {
            this._prev_oligos_order = this._oligos_order.slice();
        }
    }

    public transform_markers(): void {
        if (this._prev_oligos_order == null
            || this._prev_oligos_order.length != this._oligos_order.length) {
            this._prev_oligos_order = null;
            return;
        }
        let idx_map: any[] = this.get_order_map(this._prev_oligos_order);
        this._prev_oligos_order = null;

        // black marks
        let indices: any[] = this.get_tracked_indices();
        this.clear_tracking();
        let ii: number;
        for (ii = 0; ii < indices.length; ii++) {
            indices[ii] = idx_map[indices[ii]];
            this.black_mark(indices[ii]);
        }

        // blue highlights ("magic glue")
        let new_design: any[] = [];
        for (ii = 0; ii < this.get_full_sequence_length(); ii++) {
            new_design[idx_map[ii]] = this._design_struct[ii];
        }
        this._design_struct = new_design;
        this.update_design_highlight();
    }

    public set_oligo(oligo: any[], mode: number = Pose2D.OLIGO_MODE_DIMER, o_name: string = null): void {
        if (oligo == null) {
            this._oligo = null;
            return;
        }

        this._oligo = oligo.slice();
        this._oligo_mode = mode;
        this._oligo_name = o_name;

        let seq: any[] = this.get_full_sequence();
        if (seq.length > this._bases.length) {
            let diff: number = (seq.length - this._bases.length);
            for (let i: number = 0; i < diff; i++) {
                this.createBase();
            }
        }

        let n: number = seq.length;
        for (let k: number = 0; k < n; k++) {
            this._bases[k].set_type(seq[k]);
            this._bases[k].set_base_index(k);
        }
    }

    public get_oligo(): any[] {
        return (this._oligo != null ? this._oligo.slice() : null);
    }

    public set_oligo_malus(malus: number): void {
        this._oligo_malus = malus;
    }

    public set_duplex_cost(cost: number): void {
        this._duplex_cost = cost;
    }

    public set_oligo_paired(paired: boolean): void {
        let changed: boolean = (this._oligo_paired != paired);
        this._oligo_paired = paired;
        if (changed) this.update_score_node_gui();
    }

    public get_full_sequence(): number[] {
        if (this._oligo == null && this._oligos == null) {
            return this._sequence;
        }
        let seq: any[] = this._sequence.slice();
        if (this._oligos == null) {
            if (this._oligo_mode == Pose2D.OLIGO_MODE_EXT5P) {
                seq = this._oligo.concat(seq);
            } else {
                if (this._oligo_mode == Pose2D.OLIGO_MODE_DIMER) seq.push(EPars.RNABASE_CUT);
                seq = seq.concat(this._oligo);
            }
            return seq;
        }
        // _oligos != null, we have a multistrand target
        for (let ii: number = 0; ii < this._oligos.length; ii++) {
            seq.push(EPars.RNABASE_CUT);
            seq = seq.concat(this._oligos[this._oligos_order[ii]].sequence);
        }
        return seq;
    }

    public get_full_sequence_length(): number {
        let len: number = this._sequence.length;
        if (this._oligo == null && this._oligos == null) {
            return len;
        }
        if (this._oligos == null) {
            len += this._oligo.length;
            if (this._oligo_mode == Pose2D.OLIGO_MODE_DIMER) len++;
            return len;
        }
        for (let ii: number = 0; ii < this._oligos.length; ii++) {
            len += 1 + this._oligos[ii].sequence.length;
        }
        return len;
    }

    public get_strand_name(seqnum: number): string {
        if (this._oligos != null && seqnum >= this._sequence.length) {
            let seq: any[] = this._sequence.slice();
            for (let ii: number = 0; ii < this._oligos.length; ii++) {
                seq.push(EPars.RNABASE_CUT);
                seq = seq.concat(this._oligos[this._oligos_order[ii]].sequence);
                if (seqnum < seq.length) {
                    let o_name: string = this._oligos[this._oligos_order[ii]]['name'];
                    if (o_name == null) o_name = "Oligo " + (this._oligos_order[ii] + 1).toString();
                    return o_name;
                }
            }
        }
        if (this._oligo != null && seqnum >= this._sequence.length) {
            return this._oligo_name;
        }
        return null;
    }

    public get_bound_sequence(): number[] {
        if (this._oligos == null) {
            return this._sequence;
        }
        let seq: number[] = this._sequence.slice();
        for (let ii: number = 0; ii < this._oligos_paired; ii++) {
            seq.push(EPars.RNABASE_CUT);
            seq = seq.concat(this._oligos[this._oligos_order[ii]].sequence);
        }
        return seq;
    }

    public set_pairs(pairs: number[]): void {
        let seq: number[] = this.get_full_sequence();
        if (pairs.length != seq.length) {
            log.debug(pairs.length, seq.length);
            throw new Error("Pair length doesn't match sequence length");
        }

        if (EPars.are_pairs_same(pairs, this._pairs)) {
            return;
        }

        this._pairs = pairs.slice();

        for (let ii: number = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii) {
                this._pairs[this._pairs[ii]] = ii;
            }
        }

        /// Recompute sequence layout
        this.compute_layout(false);
        this.check_pairs();
        this.set_molecule();
        this.generate_score_nodes();
    }

    public is_pair_satisfied(a: number, b: number): boolean {
        if (b < a) {
            let temp: number = a;
            a = b;
            b = temp;
        }

        if (this._pairs[a] != b) {
            return false;
        }

        let _full_seq: any[] = this.get_full_sequence();
        return (EPars.pair_type(_full_seq[a], _full_seq[b]) != 0);
    }

    public get_sequence_length(): number {
        return this._sequence.length;
    }

    public get_sequence(): number[] {
        return this._sequence.slice();
    }

    public get_sequence_at(seq: number): number {
        return this._sequence[seq];
    }

    public get_base_at(seq: number): Base {
        return this._bases[seq];
    }

    public get_pairs(): number[] {
        return this._pairs.slice();
    }

    public check_overlap(): boolean {
        let radius: number = Pose2D.ZOOM_SPACINGS[0];
        let rna_drawer: RNALayout = new RNALayout(radius, radius);
        rna_drawer.setup_tree(this._pairs);
        rna_drawer.draw_tree();
        let xarray: any[] = new Array(this._bases.length);
        let yarray: any[] = new Array(this._bases.length);
        rna_drawer.get_coords(xarray, yarray);
        for (let ii: number = 0; ii < this._bases.length; ii++) {
            let ax: number = xarray[ii];
            let ay: number = yarray[ii];
            for (let jj: number = ii + 2; jj < this._bases.length; jj++) {
                let bx: number = xarray[jj];
                let by: number = yarray[jj];
                bx = ax - bx;
                by = ay - by;
                if (bx * bx + by * by < radius * radius / 10) {
                    return true;
                }
            }
        }
        return false;
    }

    //highlight the base before the cursor
    public track_cursor(index: number): void {
        // this.cursor_index = index;
        // if (this.cursor_index > 0) {
        //     let center: Point = this.get_base_xy(this.cursor_index - 1);
        //     if (this.cursor_box == null) {
        //         this.cursor_box = new GameObject();
        //         this.addObject(this.cursor_box);
        //     }
        //     this.cursor_box.x = center.x;
        //     this.cursor_box.y = center.y;
        //     this.cursor_box.visible = true;
        //     this.cursor_box.graphics.clear();
        //     this.cursor_box.graphics.lineStyle(Pose2D.BASE_TRACK_THICKNESS[this.get_zoom_level()], Pose2D.COLOR_CURSOR);
        //     this.cursor_box.graphics.drawCircle(0, 0, Pose2D.BASE_TRACK_RADIUS[this.get_zoom_level()]);
        // } else {
        //     if (this.cursor_box != null) {
        //         this.removeObject(this.cursor_box);
        //         this.cursor_box = null;
        //     }
        // }
    }

    /*override*/
    public update(dt: number): void {
        let current_time: number = this.mode.time;
        // for (let i: number = 0; i < this._anchored_objects.length; ++i) {
        //     let anchor: RNAAnchorObject = this._anchored_objects[i];
        //     let p: Point = this.get_base_xy(anchor.base);
        //     anchor.object.set_pos(new UDim(0, 0, p.x + anchor.offset.x, p.y + anchor.offset.y));
        // }

        let full_seq: any[] = this.get_full_sequence();
        let center: Point;
        let prog: number;
        let locked: boolean;

        if (this._tracked_indices.length == this._base_boxes.length && this._tracked_indices.length != 0) {
            let n: number = this._tracked_indices.length;
            for (let ii = 0; ii < n; ii++) {
                center = this.get_base_xy(this._tracked_indices[ii]);
                this._base_boxes[ii].x = center.x;
                this._base_boxes[ii].y = center.y;
                this._base_boxes[ii].clear();
                this._base_boxes[ii].lineStyle(Pose2D.BASE_TRACK_THICKNESS[this.get_zoom_level()], 0x000000);
                this._base_boxes[ii].drawCircle(0, 0, Pose2D.BASE_TRACK_RADIUS[this.get_zoom_level()]);
            }
        }

        // if (this.cursor_index > 0) {
        //     center = this.get_base_xy(this.cursor_index - 1);
        //     this.cursor_box.x = center.x;
        //     this.cursor_box.y = center.y;
        //     this.cursor_box.visible = true;
        //     this.cursor_box.graphics.clear();
        //     this.cursor_box.graphics.lineStyle(Pose2D.BASE_TRACK_THICKNESS[this.get_zoom_level()], Pose2D.COLOR_CURSOR);
        //     this.cursor_box.graphics.drawCircle(0, 0, Pose2D.BASE_TRACK_RADIUS[this.get_zoom_level()]);
        // }

        if (this._base_to_x) {
            // Update base locations

            if (this._fold_start_time < 0) {
                this._fold_start_time = current_time;
            }

            prog = (current_time - this._fold_start_time) / (this._fold_duration);
            let done: boolean = false;

            if (prog >= 1) {
                prog = 1;
                done = true;
                this._offset_translating = false;
            }

            if (this._offset_translating) {
                this._redraw = true;
                this._off_x = prog * this._end_offset_x + (1 - prog) * this._start_offset_x;
                this._off_y = prog * this._end_offset_y + (1 - prog) * this._start_offset_y;
            }

            for (let ii = 0; ii < full_seq.length; ii++) {
                let vx: number = this._base_to_x[ii] - this._base_from_x[ii];
                let vy: number = this._base_to_y[ii] - this._base_from_y[ii];

                let current_x: number = this._base_from_x[ii] + (vx + (vx * prog)) / 2 * prog;
                let current_y: number = this._base_from_y[ii] + (vy + (vy * prog)) / 2 * prog;

                this._bases[ii].set_xy(current_x, current_y);
            }

            if (done) {
                this._base_to_x = null;
                this._base_to_y = null;
                this._base_from_x = null;
                this._base_from_y = null;

                this.update_score_node_gui();
            }

        } else {
            if (current_time - this._last_sampled_time > 2 && !this._is_exploding) {
                this._last_sampled_time = current_time;

                for (let ii = 0; ii < full_seq.length; ii++) {
                    if (this._pairs[ii] < 0 && !this._lowperform_mode && Math.random() > 0.7) {
                        this._bases[ii].animate();
                    }
                }
            }
        }

        /// Update score node
        this.update_score_node_visualization();

        /// Bitblt rendering
        let need_redraw: boolean = false;

        for (let ii = 0; ii < full_seq.length && !need_redraw; ii++) {
            need_redraw = need_redraw || this._bases[ii].need_redraw(this._lowperform_mode);
        }

        if (need_redraw || this._redraw) {
            // if (this._base_dirty == null || this._redraw) {
            //     this._canvas_data.fillRect(new Rectangle(0, 0, this._offscreen_width, this._offscreen_height), 0x0);
            // } else {
            //     this._base_dirty = this._base_dirty.intersection(new Rectangle(0, 0, this._offscreen_width, this._offscreen_height));
            //     this._canvas_data.copyPixels(this._empty_canvas_data, this._base_dirty, this._base_dirty.topLeft, this._empty_canvas_data);
            // }
            this._base_dirty = null;

            let r: Rectangle;

            // Create highlight state to pass to bases.
            let hl_state: Object = null;
            // if (this._all_new_highlights.length > 0) {
            //     hl_state = {};
            //     hl_state.nuc = [];
            //     hl_state.isOn = true;
            //     for (i = 0; i < this._all_new_highlights.length; ++i) {
            //         hl_state.nuc = hl_state.nuc.concat(this._all_new_highlights[i].nuc);
            //     }
            // }

            for (let ii = 0; ii < full_seq.length; ii++) {
                // skip the oligo separator
                if (full_seq[ii] == EPars.RNABASE_CUT) {
                    continue;
                }

                let use_barcode: boolean = false;
                if (this._barcodes != null && this._barcodes.indexOf(ii) >= 0) {
                    use_barcode = true;
                }

                this._bases[ii].set_force_unpaired(this._forced_struct != null && this._forced_struct[ii] == EPars.FORCE_UNPAIRED);

                let drawFlags: number = BaseDrawFlags.builder()
                    .locked(this.is_locked(ii))
                    .letterMode(this._lettermode)
                    .lowPerform(this._lowperform_mode)
                    .useBarcode(use_barcode)
                    .result();

                let numberBitmap: Texture = null;
                if (this._numbering_mode && (ii == 0 || (ii + 1) % 5 == 0 || ii == full_seq.length - 1)) {
                    numberBitmap = BitmapManager.get_number_bitmap(ii + 1);
                }

                this._bases[ii].bit_blit(this._zoom_level, this._off_x, this._off_y, current_time, drawFlags, numberBitmap, hl_state);
            }

            // for (ii = 0; ii < full_seq.length; ii++) {
            //     locked = this.is_locked(ii);
            //     r = this._bases[ii].bit_blit_after_effect(this._zoom_level, this._canvas_data, this._off_x, this._off_y, current_time);
            //     if (r != null) {
            //         this._base_dirty = this._base_dirty == null ? r.clone() : this._base_dirty.union(r);
            //     }
            // }

            if (this._display_aux_info) {
                this.render_aux_info();
            }

            this._redraw = false;

            if (this._feedback_objs.length > 0) {
                this.update_print_feedback(false);
            }
        }

        // if (this._mol_canvas.visible) {
        //     while (this._mol_dirty.length > 0) {
        //         r = this._mol_dirty.pop();
        //         this._mol_canvas_data.copyPixels(this._empty_canvas_data, r, r.topLeft, this._empty_canvas_data);
        //     }
        //     this._mol_dirty = [];
        // }
        // if (this._mol_canvas_data && this._molecular_binding_bases != null && this._molecule != null) {
        //     let mol_x: number = 0;
        //     let mol_y: number = 0;
        //     let nbases: number = 0;
        //     for (ii = 0; ii < full_seq.length; ii++) {
        //         let baseglow: BaseGlow = this._molecular_binding_bases[ii];
        //         if (baseglow != null) {
        //             let pos: Point = this._bases[ii].get_last_drawn_pos();
        //             this._mol_dirty.push(baseglow.bit_blit(this._zoom_level, this._mol_canvas_data, pos.x, pos.y, current_time));
        //             mol_x += pos.x;
        //             mol_y += pos.y;
        //             nbases += 1;
        //         }
        //     }
        //
        //     if (nbases > 0) {
        //         mol_x /= nbases;
        //         mol_y /= nbases;
        //     }
        //
        //     if (!this._molecule_is_bound) {
        //         mol_x = 30;
        //         mol_y = 200;
        //     }
        //
        //     this._mol_dirty.push(this._molecule.bit_blit(this._zoom_level, this._mol_canvas_data, mol_x, mol_y, current_time));
        //     this._mol_canvas.visible = true;
        // }
        // if (this._mol_canvas_data != null && full_seq.indexOf(EPars.RNABASE_CUT) >= 0) {
        //     if (this._oligo_bases == null) this._oligo_bases = new Array(full_seq.length);
        //     let bound_len: number = this.get_bound_sequence().length;
        //     for (ii = full_seq.indexOf(EPars.RNABASE_CUT) + 1; ii < full_seq.length; ii++) {
        //         baseglow = this._oligo_bases[ii];
        //         if (baseglow == null) {
        //             baseglow = new BaseGlow();
        //             this._oligo_bases[ii] = baseglow;
        //         }
        //         if ((this._oligo_paired || (this._oligos_paired > 0 && ii < bound_len)) && this._pairs[ii] >= 0) {
        //             baseglow.set_wrong(this._restricted_highlight_box.is_in_queue(ii));
        //             pos = this._bases[ii].get_last_drawn_pos();
        //             this._mol_dirty.push(baseglow.bit_blit(this._zoom_level, this._mol_canvas_data, pos.x, pos.y, current_time));
        //             this._mol_canvas.visible = true;
        //         }
        //     }
        // }
        //
        // if (this._mol_dirty.length == 0 && this._mol_canvas.visible) {
        //     this._mol_canvas_data = new Texture(this._offscreen_width, this._offscreen_height, true, 0x0);
        //     this._mol_canvas.Texture = this._mol_canvas_data;
        //     this._mol_canvas.visible = false;
        // }

        let go_x: number = 0;
        let go_y: number = 0;

        for (let ii = 0; ii < full_seq.length - 1; ii++) {
            let out_x: number = go_x;
            let out_y: number = go_y;

            if (this._sequence.length < full_seq.length && ii == this._sequence.length - 1) {
                this._bases[ii].set_go_dir(go_x, go_y);
                this._bases[ii].set_out_dir(-go_y, go_x);
                this._bases[ii].set_last(true);
                continue;
            }

            go_x = this._bases[ii + 1].get_x() - this._bases[ii].get_x();
            go_y = this._bases[ii + 1].get_y() - this._bases[ii].get_y();

            out_x += go_x;
            out_y += go_y;

            if (ii > 0) {
                out_x /= 2.0;
                out_y /= 2.0;
            }

            this._bases[ii].set_go_dir(go_x, go_y);
            this._bases[ii].set_out_dir(-out_y, out_x);
            this._bases[ii].set_last(false);
        }

        if (full_seq.length >= 1) {

            this._bases[full_seq.length - 1].set_go_dir(go_x, go_y);
            this._bases[full_seq.length - 1].set_out_dir(-go_y, go_x);
            this._bases[full_seq.length - 1].set_last(true);

        }

        // highlights
        if (this._unstable_highlight_box.get_queue() == null) {
            this.clear_unstable_highlight();
        }

        if (!this._offset_translating && this._base_to_x == null && this._unstable_highlight_box.get_queue() != null) {
            if (this._unstable_highlight_box.is_on() == true) {

                if (this._unstable_highlight_box.same_queue()) {
                    // Check if there was a change in position. Redraw if the position had changed.
                    if (this._unstable_highlight_box.get_last_known_position() != null) {

                        if (this._unstable_highlight_box.position_changed(this)) {
                            this._unstable_highlight_box.enabled = false;
                            this.draw_highlight_unstable_sequence();
                        }
                    }

                } else {
                    this._unstable_highlight_box.enabled = false;
                    this.draw_highlight_unstable_sequence();
                }

            } else {
                this._unstable_highlight_box.enabled = false;
                this.draw_highlight_unstable_sequence();
            }
        }

        if (this._user_defined_highlight_box.get_queue() == null) {
            this.clear_user_defined_highlight();
        }

        if (!this._offset_translating && this._base_to_x == null && this._user_defined_highlight_box.get_queue() != null) {
            if (this._user_defined_highlight_box.is_on() == true) {

                if (this._user_defined_highlight_box.same_queue()) {
                    // Check if there was a change in position. Redraw if the position had changed.
                    if (this._user_defined_highlight_box.get_last_known_position() != null) {

                        if (this._user_defined_highlight_box.position_changed(this)) {
                            this._user_defined_highlight_box.enabled = false;
                            this.draw_highlight_user_defined_sequence();
                        }
                    }

                } else {
                    this._user_defined_highlight_box.enabled = false;
                    this.draw_highlight_user_defined_sequence();
                }

            } else {
                this._user_defined_highlight_box.enabled = false;
                this.draw_highlight_user_defined_sequence();
            }
        }

        /// Praise stacks when RNA is not moving
        if (!this._offset_translating && this._base_to_x == null) {
            if (this._praise_queue.length > 0) {
                for (let ii = 0; ii < this._praise_queue.length; ii += 2) {
                    this.on_praise_stack(
                        this._praise_queue[ii],
                        this._praise_queue[ii + 1],
                        (ii + 1) == (this._praise_queue.length - 1));
                }
                this._praise_queue = [];
            } else if (this._praise_seq.length > 0) {
                for (let ii = 0; ii < this._praise_seq.length; ii += 2) {
                    this.on_praise_seq(this._praise_seq[ii], this._praise_seq[ii + 1]);
                }
                this._praise_seq = [];
            }
        }

        // if (this._is_exploding && !this._offset_translating && this._base_to_x == null) {
        //     if (this._explosion_start_time < 0) {
        //         this._explosion_start_time = current_time;
        //         this._orig_offset_x = this._off_x;
        //         this._orig_offset_y = this._off_y;
        //     }
        //
        //     this._off_x = this._orig_offset_x + (Math.random() * 2 - 1) * 5;
        //     this._off_y = this._orig_offset_y + (Math.random() * 2 - 1) * 5;
        //     this._redraw = true;
        //
        //     prog = (current_time - this._explosion_start_time) / 200;
        //
        //     if (this._explosion_rays.length >= full_seq.length) {
        //         for (ii = 0; ii < Math.min(prog, full_seq.length); ii++) {
        //             if (this._explosion_rays[ii].visible == false) {
        //                 this._explosion_rays[ii].alpha = 0;
        //                 this._explosion_rays[ii].visible = true;
        //                 this._explosion_rays[ii].set_animator(new GameAnimatorFader(0, 1, 0.5, false));
        //             }
        //
        //             let seq_p: Point = this.get_base_xy(ii);
        //             this._explosion_rays[ii].set_pos(new UDim(0, 0, seq_p.x, seq_p.y));
        //         }
        //     } else {
        //         let diff: number = (full_seq.length - this._explosion_rays.length) / this._explosion_rays.length;
        //         let diff_walker: number = 0;
        //         let ray_walker: number = 0;
        //
        //         for (ii = 0; ii < full_seq.length; ii++) {
        //             if (diff_walker < 1) {
        //                 if (ray_walker >= this._explosion_rays.length || ray_walker >= prog)
        //                     continue;
        //
        //
        //                 if (this._explosion_rays[ray_walker].visible == false) {
        //                     this._explosion_rays[ray_walker].alpha = 0;
        //                     this._explosion_rays[ray_walker].visible = true;
        //                     this._explosion_rays[ray_walker].set_animator(new GameAnimatorFader(0, 1, 0.5, false));
        //                 }
        //
        //                 seq_p = this.get_base_xy(ii);
        //                 this._explosion_rays[ray_walker].set_pos(new UDim(0, 0, seq_p.x, seq_p.y));
        //
        //                 ray_walker++;
        //
        //                 diff_walker += diff;
        //             } else {
        //                 diff_walker -= 1;
        //             }
        //         }
        //     }
        //
        //     if (prog >= Math.min(full_seq.length, this._explosion_rays.length) + 10) {
        //
        //         if (this._explosion_cb != null)
        //             this._explosion_cb();
        //
        //         this._is_exploding = false;
        //         this._explosion_start_time = -1;
        //         this._explosion_cb = null;
        //
        //     }
        // }
    }

    public num_pairs(satisfied: boolean): number {
        let n: number = 0;
        for (let ii: number = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii && (!satisfied || this.is_pair_satisfied(ii, this._pairs[ii]))) {
                n++;
            }
        }
        return n;
    }

    public set_lettermode(lettermode: boolean): void {
        this._lettermode = lettermode;
        this._redraw = true;
    }

    public is_lettermode(): boolean {
        return this._lettermode;
    }

    public set_show_total_energy(show: boolean): void {
        this._show_total_energy = show;
        this._primary_score_energy_display.visible = (show && this._score_folder != null);
        this._secondary_score_energy_display.visible = (show && this._score_folder != null);
    }

    public set_score_visualization(folder: Folder): void {
        this._score_folder = folder;
        this.set_show_total_energy(this._show_total_energy);
    }

    public base_shift_with_command(command: number, index: number): void {
        let cmd: any[] = this.parse_command(command, index);
        if (cmd != null) {
            let parenthesis: string = cmd[0];
            let mode: number = cmd[1];
            this.base_shift(parenthesis, mode, index);
        }
    }

    public base_shift(parenthesis: string, mode: number, index: number): void {
        let sequence: any[] = this.get_sequence();
        let locks: any[] = this.get_puzzle_locks();
        let binding_site: any[] = this.get_molecular_binding_site();
        let sequence_backup: any[] = this.get_sequence();
        let locks_backup: any[] = this.get_puzzle_locks();
        let binding_site_backup: any[] = this.get_molecular_binding_site();
        let pindex: number;

        if (sequence.length > parenthesis.length) {
            sequence = sequence.slice(0, parenthesis.length);
            locks = locks.slice(0, parenthesis.length);
            binding_site = binding_site.slice(0, parenthesis.length);
        }

        for (let ii: number = sequence.length; ii < parenthesis.length; ii++) {
            sequence.push(EPars.RNABASE_ADENINE);
            locks.push(false);
            binding_site.push(false);
        }
        // BASE SHIFTING MODIFIED HERE. Delete comments to apply the changes
        if (mode == 0) {
            // Add a base
            let after_index: any[] = sequence.slice(index);
            let after_lock_index: any[] = locks.slice(index);
            let after_binding_site_index: any[] = binding_site.slice(index);

            sequence[index] = EPars.RNABASE_ADENINE;
            locks[index] = false;
            binding_site[index] = false;

            for (let ii = 0; ii < after_index.length - 1; ii++) {
                sequence[ii + index + 1] = after_index[ii];
                locks[ii + index + 1] = after_lock_index[ii];
                binding_site[ii + index + 1] = after_binding_site_index[ii];
            }
        } else if (mode == 1) {
            // Add a pair
            pindex = (this.get_pairs())[index];
            let after_index = sequence.slice(index);
            let after_lock_index = locks.slice(index);
            let after_binding_site_index = binding_site.slice(index);

            sequence[index] = EPars.RNABASE_ADENINE;
            sequence[pindex + 2] = EPars.RNABASE_ADENINE;
            locks[index] = false;
            locks[pindex + 2] = false;
            binding_site[index] = false;
            binding_site[pindex + 2] = false;

            for (let ii = 0; ii < after_index.length - 2; ii++) {
                if (ii + index > pindex) {
                    sequence[ii + index + 2] = after_index[ii];
                    locks[ii + index + 2] = after_lock_index[ii];
                    binding_site[ii + index + 2] = after_binding_site_index[ii];
                } else {
                    sequence[ii + index + 1] = after_index[ii];
                    locks[ii + index + 1] = after_lock_index[ii];
                    binding_site[ii + index + 1] = after_binding_site_index[ii];
                }

            }

        } else if (mode == 2) {
            // Add a cycle of length 3
            let after_index = sequence.slice(index);
            let after_lock_index = locks.slice(index);
            let after_binding_site_index = binding_site.slice(index);

            sequence[index] = EPars.RNABASE_ADENINE;
            sequence[index + 1] = EPars.RNABASE_ADENINE;
            sequence[index + 2] = EPars.RNABASE_ADENINE;
            sequence[index + 3] = EPars.RNABASE_ADENINE;
            sequence[index + 4] = EPars.RNABASE_ADENINE;

            locks[index] = false;
            locks[index + 1] = false;
            locks[index + 2] = false;
            locks[index + 3] = false;
            locks[index + 4] = false;

            binding_site[index] = false;
            binding_site[index + 1] = false;
            binding_site[index + 2] = false;
            binding_site[index + 3] = false;
            binding_site[index + 4] = false;

            for (let ii = 0; ii < after_index.length - 5; ii++) {
                sequence[ii + index + 5] = after_index[ii];
                locks[ii + index + 5] = after_lock_index[ii];
                binding_site[ii + index + 5] = after_binding_site_index[ii];
            }

        } else if (mode == 3) {
            // Delete a pair
            pindex = (this.get_pairs())[index];
            let after_index = sequence_backup.slice(index + 1);
            let after_lock_index = locks_backup.slice(index + 1);
            let after_binding_site_index = binding_site_backup.slice(index + 1);

            for (let ii = 0; ii < after_index.length - 1; ii++) {
                if (ii + index >= pindex - 1) {
                    sequence[ii + index] = after_index[ii + 1];
                    locks[ii + index] = after_lock_index[ii + 1];
                    binding_site[ii + index] = after_binding_site_index[ii + 1];
                } else {
                    sequence[ii + index] = after_index[ii];
                    locks[ii + index] = after_lock_index[ii];
                    binding_site[ii + index] = after_binding_site_index[ii];
                }
            }

        } else if (mode == 4) {
            // Delete a base
            let after_index = sequence_backup.slice(index + 1);
            let after_lock_index = locks_backup.slice(index + 1);
            let after_binding_site_index = binding_site_backup.slice(index + 1);

            for (let ii = 0; ii < after_index.length; ii++) {
                sequence[ii + index] = after_index[ii];
                locks[ii + index] = after_lock_index[ii];
                binding_site[ii + index] = after_binding_site_index[ii];
            }
        }

        this.set_sequence(sequence);
        this.set_puzzle_locks(locks);
        this.set_molecular_structure(EPars.parenthesis_to_pair_array(parenthesis));
        this.set_molecular_binding_site(binding_site);
        this.set_parenthesis(parenthesis);
    }

    public register_paint_tool(paint_color: number, tool: Object): void {
        this._dyn_paint_colors.push(paint_color);
        this._dyn_paint_tools.push(tool);
    }

    public get_last_shifted_index(): number {
        return this._last_shifted_index;
    }

    public get_last_shifted_command(): number {
        return this._last_shifted_command;
    }

    public set_parenthesis(parenthesis: string): void {
        this.parenthesis = parenthesis;
    }

    public get_parenthesis(): string {
        return this.parenthesis;
    }

    public set_base_color(seq: number, inColor: number): void {
        this._mutated_sequence = this._sequence.slice();
        this._mutated_sequence[seq] = inColor;
        this._bases[seq].set_type(inColor, true);

        this._last_colored_index = seq;
        this._bases[seq].animate();
        this.done_coloring();
    }

    public force_editable(b: boolean, edit_list: any[] = null): void {
        this._editable = b;
        this._editable_indices = edit_list;
    }

    /*override*/
    protected on_resize(): void {
        // if (this._canvas_data != null) {
        //     this._canvas_data = null;
        // }
        // if (this._mol_canvas_data != null) {
        //     this._mol_canvas_data = null;
        //     this._empty_canvas_data = null;
        //     this._mol_dirty = [];
        // }
        //
        // if (this._offscreen_width > 0 && this._offscreen_height > 0) {
        //     this._canvas_data = new Texture(this._offscreen_width, this._offscreen_height);
        //     this._canvas.Texture = this._canvas_data;
        //     this._mol_canvas_data = new Texture(this._offscreen_width, this._offscreen_height, true, 0x0);
        //     this._empty_canvas_data = new Texture(this._offscreen_width, this._offscreen_height, true, 0x0);
        //     this._mol_canvas.Texture = this._mol_canvas_data;
        // }
        //
        // this._redraw = true;
    }

    private compute_layout(fast: boolean = false): void {
        let full_seq: any[] = this.get_full_sequence();

        if (full_seq.length > this._bases.length) {
            log.debug(full_seq.length, this._bases.length);
            throw new Error("Sequence length and pose length don't match");
        }

        let n: number = full_seq.length;
        let x_mid: number = 0;
        let y_mid: number = 0;

        let xarray: number[] = new Array(n);
        let yarray: number[] = new Array(n);

        let rna_drawer: RNALayout;

        let exception_indices: any[] = null;
        if (full_seq.indexOf(EPars.RNABASE_CUT) >= 0) {
            exception_indices = [];
            exception_indices.push(0);
            let oligo_index: number = -1;
            // array of positions of connectors "&"
            while (full_seq.indexOf(EPars.RNABASE_CUT, oligo_index + 1) >= 0) {
                oligo_index = full_seq.indexOf(EPars.RNABASE_CUT, oligo_index + 1);
                exception_indices.push(oligo_index);
            }
        }
        rna_drawer = new RNALayout(Pose2D.ZOOM_SPACINGS[this._zoom_level], Pose2D.ZOOM_SPACINGS[this._zoom_level], exception_indices);

        rna_drawer.setup_tree(this._pairs);
        rna_drawer.draw_tree();
        rna_drawer.get_coords(xarray, yarray);

        if (this._desired_angle == 90) {
            let tmp = xarray;
            xarray = yarray;
            yarray = tmp;
        }

        let xmin: number = xarray[0];
        let xmax: number = xarray[0];
        let ymin: number = yarray[0];
        let ymax: number = yarray[0];

        for (let ii: number = 0; ii < n; ii++) {
            if (xarray[ii] < xmin) {
                xmin = xarray[ii];
            }

            if (xarray[ii] > xmax) {
                xmax = xarray[ii];
            }

            if (yarray[ii] < ymin) {
                ymin = yarray[ii];
            }

            if (yarray[ii] > ymax) {
                ymax = yarray[ii];
            }
        }

        x_mid = (xmax + xmin) / 2.0;
        y_mid = (ymax + ymin) / 2.0;

        this._base_from_x = new Array(n);
        this._base_from_y = new Array(n);
        this._base_to_x = new Array(n);
        this._base_to_y = new Array(n);

        for (let ii: number = 0; ii < n; ii++) {
            this._base_from_x[ii] = this._bases[ii].get_x();
            this._base_from_y[ii] = this._bases[ii].get_y();

            this._base_to_x[ii] = xarray[ii] - x_mid;
            this._base_to_y[ii] = yarray[ii] - y_mid;
        }

        this._fold_start_time = -1;
        if (fast) {
            this._fold_duration = 0.45;
        } else {
            this._fold_duration = 0.7;
        }
    }

    private print_feedback(dat: any[]): void {
        // for (let i: number = 0; i < dat.length; i++) {
        //     let feedback_obj: GameText = null;
        //     feedback_obj = new GameText(Fonts.arial(12, true));
        //     feedback_obj.set_text(dat[i]);
        //     this._feedback_objs.push(feedback_obj);
        //     this.addObject(this._feedback_objs[i]);
        // }
    }

    private update_print_feedback(hide: boolean = true): void {
        // for (let ii: number = 0; ii < this._feedback_objs_num; ii++) {
        //     let obj_p: Point = this.get_base_xy(ii + this._feedback_objs_start_ind);
        //     let out_p: Point = this.get_base_out_xy(ii + this._feedback_objs_start_ind);
        //     obj_p.x += 1.6 * (out_p.x - this._off_x) - this._feedback_objs[ii].text_width() / 2;
        //     obj_p.y += 1.6 * (out_p.y - this._off_y) - this._feedback_objs[ii].text_height() / 2;
        //     if (hide) this._feedback_objs[ii].visible = false;
        //     this._feedback_objs[ii].set_pos(new UDim(0, 0, obj_p.x, obj_p.y));
        //     this._feedback_objs[ii].graphics.clear();
        //     this._feedback_objs[ii].graphics.beginFill(0x000000, 0.35);
        //     this._feedback_objs[ii].graphics.drawRoundRect(0, 0, this._feedback_objs[ii].text_width(), this._feedback_objs[ii].text_height(), 12);
        // }
    }

    private on_pose_mouse_out(e: InteractionEvent): void {
        this.clear_mouse();
        this.update_score_node_gui();
        e.stopPropagation();
    }

    private delete_base_with_index(index: number): any[] {
        if (this.is_tracked_index(index)) {
            this.toggle_black_mark(index);
        }

        if (this._pairs[index] < 0 || this.is_locked(this._pairs[index])) {
            return PoseUtil.delete_nopair_with_index(index, this._pairs);
        } else {
            return PoseUtil.delete_pair_with_index(index, this._pairs);
        }
    }

    private on_base_mouse_down(seqnum: number, togglelock: boolean): void {
        this._last_colored_index = seqnum;

        if (!togglelock && this.is_editable(seqnum)) {
            this._coloring = true;
            this._mutated_sequence = this.get_full_sequence().slice();

            if (this._current_color == EPars.RNABASE_LOCK) {
                if (!this._locks) {
                    this._locks = [];
                    for (let ii = 0; ii < this._sequence.length; ii++) {
                        this._locks.push(false);
                    }
                }
                this._locks[seqnum] = !this._locks[seqnum];
                this._bases[seqnum].setDirty();
                this._lock_updated = true;

            } else if (this._current_color == EPars.RNABASE_BINDING_SITE) {
                if (this._binding_site != null && this._binding_site[seqnum]) {
                    this._binding_site = [];
                    for (let ii = 0; ii < this._sequence.length; ii++) {
                        this._binding_site.push(false);
                    }
                    this.set_molecular_binding_site(this._binding_site);
                    this._binding_site_updated = true;
                } else {
                    let binding_bases: any[] = EPars.is_internal(seqnum, this._pairs);
                    if (binding_bases != null && binding_bases.length > 4) {
                        this._binding_site = [];
                        for (let ii = 0; ii < this._sequence.length; ii++) {
                            this._binding_site.push(false);
                        }

                        for (let ii = 0; ii < binding_bases.length; ii++) {
                            this._binding_site[binding_bases[ii]] = true;
                        }
                        this.set_molecular_binding_site(this._binding_site);
                        this._binding_site_updated = true;
                    } else {
                        Application.instance.setup_msg_box("Binding site can be only formed at loops between 2 stacks\n(Internal loops and Bulges)");
                    }
                }

            } else if (this._mouse_down_altKey) {
                if (this.toggle_design_struct(seqnum)) {
                    this._design_struct_updated = true;
                }
            } else {

                if (!this.is_locked(seqnum)) {

                    if (this._current_color >= 1 && this._current_color <= 4) {
                        this._mutated_sequence[seqnum] = this._current_color;
                        ROPWait.NotifyPaint(seqnum, this._bases[seqnum].get_type(), this._current_color);
                        this._bases[seqnum].set_type(this._current_color, true);
                    } else if (this._current_color == EPars.RNABASE_RANDOM) {
                        let randbase: number = Math.floor(Math.random() * 4) % 4 + 1;
                        this._mutated_sequence[seqnum] = randbase;
                        this._bases[seqnum].set_type(randbase, true)
                    } else if (this._current_color == EPars.RNABASE_PAIR) {
                        if (this._pairs[seqnum] >= 0) {
                            let pi = this._pairs[seqnum];

                            if (this.is_locked(pi)) {
                                return;
                            }

                            let click_base: number = this._mutated_sequence[seqnum];

                            this._mutated_sequence[seqnum] = this._mutated_sequence[pi];
                            this._mutated_sequence[pi] = click_base;

                            this._bases[seqnum].set_type(this._mutated_sequence[seqnum], true);
                            this._bases[pi].set_type(this._mutated_sequence[pi], true);
                        }
                    } else if (this._current_color == EPars.RNABASE_MAGIC) {
                        this._mutated_sequence[seqnum] = this._current_color;
                        this._bases[seqnum].set_type(this._current_color);
                    } else if (this._current_color == EPars.RNABASE_AU_PAIR) {
                        if (this._pairs[seqnum] >= 0) {
                            let pi = this._pairs[seqnum];

                            if (this.is_locked(pi)) {
                                return;
                            }

                            this._mutated_sequence[seqnum] = EPars.RNABASE_ADENINE;
                            this._mutated_sequence[pi] = EPars.RNABASE_URACIL;

                            this._bases[seqnum].set_type(this._mutated_sequence[seqnum], true);
                            this._bases[pi].set_type(this._mutated_sequence[pi], true);
                        }
                    } else if (this._current_color == EPars.RNABASE_GC_PAIR) {
                        if (this._pairs[seqnum] >= 0) {
                            let pi = this._pairs[seqnum];

                            if (this.is_locked(pi)) {
                                return;
                            }

                            this._mutated_sequence[seqnum] = EPars.RNABASE_GUANINE;
                            this._mutated_sequence[pi] = EPars.RNABASE_CYTOSINE;

                            this._bases[seqnum].set_type(this._mutated_sequence[seqnum], true);
                            this._bases[pi].set_type(this._mutated_sequence[pi], true);
                        }
                    } else if (this._current_color == EPars.RNABASE_GU_PAIR) {
                        if (this._pairs[seqnum] >= 0) {
                            let pi = this._pairs[seqnum];

                            if (this.is_locked(pi)) {
                                return;
                            }

                            this._mutated_sequence[seqnum] = EPars.RNABASE_URACIL;
                            this._mutated_sequence[pi] = EPars.RNABASE_GUANINE;

                            this._bases[seqnum].set_type(this._mutated_sequence[seqnum], true);
                            this._bases[pi].set_type(this._mutated_sequence[pi], true);
                        }
                    } else if (this._dyn_paint_colors.indexOf(this._current_color) >= 0) {
                        let index: number = this._dyn_paint_colors.indexOf(this._current_color);
                        this._dyn_paint_tools[index].on_paint(this, seqnum);
                    }
                }
            }
        }
    }

    private on_base_mouse_move(seqnum: number): void {
        if (!this._coloring && this._shift_start >= 0 && seqnum < this.get_sequence_length()) {
            this._shift_end = seqnum;
            this.update_shift_highlight();
        }

        if (!this._coloring || (seqnum == this._last_colored_index)) {
            return;
        }

        if (this._current_color == EPars.RNABASE_LOCK) {
            if (!this._locks) {
                this._locks = [];
                for (let ii: number = 0; ii < this._sequence.length; ii++) {
                    this._locks.push(false);
                }
            }
            this._locks[seqnum] = !this._locks[seqnum];
            this._bases[seqnum].setDirty();
            this._lock_updated = true;

        } else if (this._mouse_down_altKey) {
            if (this.toggle_design_struct(seqnum)) {
                this._design_struct_updated = true;
            }

        } else {
            if (!this.is_locked(seqnum)) {
                if (this._current_color >= 1 && this._current_color <= 4) {
                    this._mutated_sequence[seqnum] = this._current_color;
                    ROPWait.NotifyPaint(seqnum, this._bases[seqnum].get_type(), this._current_color);
                    this._bases[seqnum].set_type(this._current_color, true);

                } else if (this._current_color == EPars.RNABASE_RANDOM) {
                    let randbase: number = Math.floor(Math.random() * 4) % 4 + 1;
                    this._mutated_sequence[seqnum] = randbase;
                    this._bases[seqnum].set_type(randbase, true)
                } else if (this._current_color == EPars.RNABASE_PAIR) {
                    if (this._pairs[seqnum] >= 0) {
                        let pi = this._pairs[seqnum];
                        if (this._pairs[seqnum] >= 0) {
                            pi = this._pairs[seqnum];

                            if (this.is_locked(pi)) {
                                return;
                            }

                            let click_base: number = this._mutated_sequence[seqnum];

                            this._mutated_sequence[seqnum] = this._mutated_sequence[pi];
                            this._mutated_sequence[pi] = click_base;

                            this._bases[seqnum].set_type(this._mutated_sequence[seqnum], true);
                            this._bases[pi].set_type(this._mutated_sequence[pi], true);
                        }
                    }
                } else if (this._current_color == EPars.RNABASE_MAGIC) {
                    this._mutated_sequence[seqnum] = this._current_color;
                    this._bases[seqnum].set_type(this._current_color);
                } else if (this._current_color == EPars.RNABASE_AU_PAIR) {
                    if (this._pairs[seqnum] >= 0) {
                        let pi = this._pairs[seqnum];

                        if (this.is_locked(pi)) {
                            return;
                        }

                        this._mutated_sequence[seqnum] = EPars.RNABASE_ADENINE;
                        this._mutated_sequence[pi] = EPars.RNABASE_URACIL;

                        this._bases[seqnum].set_type(this._mutated_sequence[seqnum], true);
                        this._bases[pi].set_type(this._mutated_sequence[pi], true);
                    }
                } else if (this._current_color == EPars.RNABASE_GC_PAIR) {
                    if (this._pairs[seqnum] >= 0) {
                        let pi = this._pairs[seqnum];

                        if (this.is_locked(pi)) {
                            return;
                        }

                        this._mutated_sequence[seqnum] = EPars.RNABASE_GUANINE;
                        this._mutated_sequence[pi] = EPars.RNABASE_CYTOSINE;

                        this._bases[seqnum].set_type(this._mutated_sequence[seqnum], true);
                        this._bases[pi].set_type(this._mutated_sequence[pi], true);
                    }
                } else if (this._current_color == EPars.RNABASE_GU_PAIR) {
                    if (this._pairs[seqnum] >= 0) {
                        let pi = this._pairs[seqnum];

                        if (this.is_locked(pi)) {
                            return;
                        }

                        this._mutated_sequence[seqnum] = EPars.RNABASE_URACIL;
                        this._mutated_sequence[pi] = EPars.RNABASE_GUANINE;

                        this._bases[seqnum].set_type(this._mutated_sequence[seqnum], true);
                        this._bases[pi].set_type(this._mutated_sequence[pi], true);
                    }
                } else if (this._dyn_paint_colors.indexOf(this._current_color) >= 0) {
                    let index: number = this._dyn_paint_colors.indexOf(this._current_color);
                    this._dyn_paint_tools[index].on_painting(this, seqnum);
                }
            }
        }
        this._last_colored_index = seqnum;
        this._bases[seqnum].animate();
    }

    private update_design_highlight(): void {
        let elems: number[] = this.get_design_segments();
        if (elems.length == 0) {
            this._selection_highlight_box.clear();
        } else {
            this._selection_highlight_box.set_highlight(HighlightType.DESIGN, elems);
            this._selection_highlight_box.set_on(false);
        }
    }

    private update_shift_highlight(): void {
        if (this._shift_start < 0) {
            this._shift_highlight_box.clear();
        } else {
            this._shift_highlight_box.set_highlight(HighlightType.SHIFT, this._shift_end < this._shift_start ? [this._shift_end, this._shift_start] : [this._shift_start, this._shift_end]);
            this._shift_highlight_box.set_on(false);
        }
    }

    private draw_energy_highlight(energy: Sprite): void {
        log.debug("TODO: draw_energy_highlight");
        // if (!this._highlight_energy_text)
        //     return;
        //
        // let hl: GameObject = new GameObject;
        //
        // hl.alpha = 0;
        // hl.visible = true;
        // hl.graphics.clear();
        // hl.graphics.lineStyle(1, 0xFFFFFF, 0.7);
        //
        // // Draw highlight around the energy reading.
        // // Give it a bit of padding so the highlight isn't so tight.
        // let padding: Point = new Point(2, 2);
        // let offset: Point = new Point(0, 0);
        // let realWidth: Point = new Point(energy.width + 2, energy.height + 2);
        //
        // let new_x: number = energy.x - padding.x + offset.x;
        // let new_y: number = energy.y - padding.y + offset.y;
        //
        // hl.graphics.drawRoundRect(new_x, new_y,
        //     realWidth.x, realWidth.y, 10);
        // hl.set_animator(new GameAnimatorFader(0, 1, 0.5, false, true));
        // this.addObject(hl);
        // this._energy_highlights.push(hl);
    }

    private update_energy_highlight(energy: Sprite, idx: number, vis: boolean): void {
        log.debug("TODO: update_energy_highlight");
        // if (idx >= this._energy_highlights.length) {
        //     this.draw_energy_highlight(energy);
        //     return;
        // }
        //
        // this._energy_highlights[idx].visible = vis;
        // this._energy_highlights[idx].graphics.clear();
        // this._energy_highlights[idx].graphics.lineStyle(1, 0xFFFFFF, 0.7);
        //
        // let padding: Point = new Point(2, 2);
        // let offset: Point = new Point(0, 0);
        // let realWidth: Point = new Point(energy.width + 2, energy.height + 2);
        //
        // let new_x: number = energy.x - padding.x + offset.x;
        // let new_y: number = energy.y - padding.y + offset.y;
        //
        // this._energy_highlights[idx].graphics.drawRoundRect(new_x, new_y,
        //     realWidth.x, realWidth.y, 10);
    }

    private clear_energy_highlights(): void {
        for (let i: number = 0; i < this._energy_highlights.length; ++i) {
            this.removeObject(this._energy_highlights[i]);
        }
        this._energy_highlights.splice(0);
    }

    private draw_highlight_unstable_sequence(): void {
        this._unstable_highlight_box.enabled = true;
    }

    private draw_highlight_user_defined_sequence(): void {
        this._user_defined_highlight_box.enabled = true;
    }

    private render_aux_info(): void {
        log.debug("TODO: render_aux_info");
        // this._aux_info_canvas.graphics.clear();
        //
        // if (!this._display_aux_info)
        //     return;
        //
        // if (this._aux_info == null)
        //     return;
        //
        // if (this._aux_info['cleaving_site']) {
        //     let cleaving_site: number = this._aux_info['cleaving_site'];
        //     if (cleaving_site < this._bases.length - 1) {
        //
        //         let b_x: number = this._bases[cleaving_site].get_x() + this._off_x;
        //         let b_y: number = this._bases[cleaving_site].get_y() + this._off_y;
        //
        //         let b_next_x: number = this._bases[cleaving_site + 1].get_x() + this._off_x;
        //         let b_next_y: number = this._bases[cleaving_site + 1].get_y() + this._off_y;
        //
        //         let c_x: number = (b_x + b_next_x) / 2.0;
        //         let c_y: number = (b_y + b_next_y) / 2.0;
        //
        //         let go_x: number = b_next_y - b_y;
        //         let go_y: number = -(b_next_x - b_x);
        //
        //         this._aux_info_canvas.graphics.lineStyle(3, 0xFF0000, 0.9);
        //         this._aux_info_canvas.graphics.moveTo(c_x + go_x / 2.0, c_y + go_y / 2.0);
        //         this._aux_info_canvas.graphics.lineTo(c_x - go_x / 2.0, c_y - go_y / 2.0);
        //
        //         this._aux_textballoon.set_pos(new UDim(0, 0, c_x + go_x / 2.0, c_y + go_y / 2.0));
        //     }
        // }
    }

    private check_pairs(): void {
        let full_seq: number[] = this.get_full_sequence();

        for (let ii: number = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] >= 0 && this.is_pair_satisfied(ii, this._pairs[ii])) {

                let pair_str: number = Pose2D.get_pair_strength(full_seq[ii], full_seq[this._pairs[ii]]);

                if (this._base_to_x) {
                    this._bases[ii].set_pairing(true,
                        this._base_to_x[this._pairs[ii]] - this._base_to_x[ii],
                        this._base_to_y[this._pairs[ii]] - this._base_to_y[ii],
                        0.5, pair_str);
                } else {
                    this._bases[ii].set_pairing(true,
                        this._bases[this._pairs[ii]].get_x() - this._bases[ii].get_x(),
                        this._bases[this._pairs[ii]].get_y() - this._bases[ii].get_y(),
                        0.5, pair_str);
                }
            } else {
                this._bases[ii].set_pairing(false, -1, -1, 0.5, -1);
            }
        }
    }

    private update_score_node_visualization(): void {
        if (this._score_nodes == null) {
            return;
        }

        if ((this._base_to_x != null) || Application.instance.is_dragging()) {
            this._score_node_index = -1;
        }

        if (this._score_node_index != this._last_score_node_index) {
            this._score_node_highlight.clear();

            if (this._score_node_index >= 0 && this._score_nodes[this._score_node_index] != null) {
                this._score_node_highlight.lineStyle(0, 0, 0);
                this._score_node_highlight.beginFill(0xFFFFFF, 0.22);
                let indices: number[] = this._score_nodes[this._score_node_index].get_base_indices();

                for (let ii: number = 0; ii < indices.length; ii++) {
                    let p: Point = this.get_base_xy(indices[ii]);

                    if (ii == 0) {
                        this._score_node_highlight.moveTo(p.x, p.y);
                    } else {
                        this._score_node_highlight.lineTo(p.x, p.y);
                    }
                }
                this._score_node_highlight.endFill();
            }
            this._last_score_node_index = this._score_node_index;
        }

        if (this._score_texts != null) {
            for (let ii = 0; ii < this._score_nodes.length; ii++) {
                let indices: number[] = this._score_nodes[ii].get_base_indices();
                let x_avg: number = 0;
                let y_avg: number = 0;

                for (let jj: number = 0; jj < indices.length; jj++) {
                    let p: Point = this.get_base_xy(indices[jj]);
                    x_avg += p.x;
                    y_avg += p.y;
                }

                if (indices.length > 0) {
                    x_avg /= indices.length;
                    y_avg /= indices.length;
                }

                x_avg -= this._score_texts[ii].width / 2;
                y_avg -= this._score_texts[ii].height / 2;

                this._score_texts[ii].position = new Point(x_avg, y_avg);
                this._score_texts[ii].visible = (this._zoom_level < 4);
                this.update_energy_highlight(this._score_texts[ii], ii, this._score_texts[ii].visible);
            }
        }
    }

    private static readonly MOUSE_LOC: Point = new Point();
    private update_score_node_gui(): void {
        this._score_node_index = -1;

        if (this._score_nodes != null) {
            let base_xys: Point[] = [];
            let mouse_p: Point = this.display.toLocal(Flashbang.globalMouse, undefined, Pose2D.MOUSE_LOC);

            for (let ii: number = 0; ii < this.get_full_sequence_length(); ii++) {
                base_xys.push(this.get_base_xy(ii));
            }

            let total_score: number = 0;
            let node_found: boolean = false;
            let node_txt: string = "";
            let node_label: string = "";
            let node_score: string = "";

            for (let ii = 0; ii < this._score_nodes.length; ii++) {
                let base_indices: number[] = this._score_nodes[ii].get_base_indices();
                let node_points: Point[] = [];

                for (let jj: number = 0; jj < base_indices.length; jj++) {
                    node_points.push(base_xys[base_indices[jj]]);
                }

                total_score += this._score_nodes[ii].get_score();

                if (!node_found && Utility.is_point_within(mouse_p, node_points)) {
                    node_txt = this._score_nodes[ii].get_text();
                    node_label = this._score_nodes[ii].get_text_label();
                    node_score = this._score_nodes[ii].get_text_score();
                    node_found = true;
                    this._score_node_index = ii;
                }
            }

            let score_label: string = "Total";
            let score_score: string = "";
            let factor: number = 0;
            if ((this._molecular_binding_bases != null) || (this._oligo != null && this._oligo_mode == Pose2D.OLIGO_MODE_DIMER) || (this._oligos != null)) {
                let label_elems: string[] = [];
                let score_elems: string[] = [];

                if (this._molecular_binding_bases != null) {
                    factor++;
                    if (this._molecule_is_bound_real) {
                        label_elems.push("<FONT COLOR='#33AA33'>Molecule Bound</FONT>");
                        let molecule_bonus: number = Number(this._molecular_binding_bonus * 100) / 100.0;
                        score_elems.push(" <FONT COLOR='#33AA33'>" + molecule_bonus.toString() + " kcal</FONT>");
                    } else {
                        label_elems.push("<FONT COLOR='#777777'>Molecule Not Bound</FONT>");
                        score_elems.push(" <FONT COLOR='#777777'>(0 kcal)</FONT>");
                    }
                }
                if (this._oligo != null && this._oligo_mode == Pose2D.OLIGO_MODE_DIMER) {
                    factor++;
                    let malus: number = this._duplex_cost + Number(this._oligo_malus * 100) / 100.0;
                    if (this._oligo_paired) {
                        label_elems.push("<FONT COLOR='#33AA33'>Oligo Bound</FONT>");
                        score_elems.push(" <FONT COLOR='#FF4747'>" + malus.toFixed(2) + " kcal</FONT>");
                    } else {
                        label_elems.push("<FONT COLOR='#777777'>Oligo Not Bound</FONT>");
                        score_elems.push(" <FONT COLOR='#777777'>(" + malus.toFixed(2) + " kcal)</FONT>");
                    }
                }
                if (this._oligos != null) {
                    factor++;
                    if (this._oligos_paired == 0) {
                        if (this._oligos.length > 1) {
                            label_elems.push("<FONT COLOR='#777777'>No Oligo Bound</FONT>");
                        } else {
                            label_elems.push("<FONT COLOR='#777777'>Oligo Not Bound</FONT>");
                        }
                        score_elems.push(" <FONT COLOR='#777777'>(0 kcal)</FONT>");
                    } else {
                        let malus = this._duplex_cost;
                        for (let ii = 0; ii < this._oligos_paired; ii++) {
                            malus += Number(this._oligos[this._oligos_order[ii]].malus * 100) / 100.0;
                        }
                        if (this._oligos_paired > 1) {
                            label_elems.push("<FONT COLOR='#33AA33'>Oligos Bound</FONT>");
                        } else {
                            label_elems.push("<FONT COLOR='#33AA33'>Oligo Bound</FONT>");
                        }
                        score_elems.push(" <FONT COLOR='#FF4747'>" + malus.toFixed(2) + " kcal</FONT>");
                    }
                }

                score_label += " <FONT COLOR='#777777'>(</FONT>" + label_elems.join(", ") + "<FONT COLOR='#777777'>)</FONT>";
                score_score = (total_score / 100).toString() + score_elems.join("");

            } else {
                score_score = (total_score / 100).toString() + " kcal";
            }
            this.update_energy_display_size_location(factor);

            this._primary_score_energy_display.set_energy_text(score_label, score_score);
            this._secondary_score_energy_display.set_energy_text(node_label, node_score);
            this._secondary_score_energy_display.visible = (this._show_total_energy && node_found);
        }
    }

    private update_energy_display_size_location(factor: number): void {
        this._primary_score_energy_display.position = new Point(17, 118);
        this._primary_score_energy_display.set_size(111 + factor * 59, 40);

        this._secondary_score_energy_display.position = new Point(17 + 119 + factor * 59, 118);
        this._secondary_score_energy_display.set_size(111, 40);
    }

    private clear_score_texts(): void {
        if (this._score_texts != null) {
            for (let score_text of this._score_texts) {
                score_text.destroy({children: true});
            }
            this._score_texts = null;
        }
    }

    private generate_score_nodes(): void {
        this._score_nodes = null;
        this.clear_energy_highlights();

        if (this._score_folder == null ||
            this._sequence == null ||
            this._sequence.length == 0 ||
            this._pairs == null ||
            this._pairs.length != this.get_full_sequence_length()) {

            this.clear_score_texts();
            return;
        }

        /// JEE : It's a bit of waste to generate RNALayout twice (once here, once when drawing rna)
        /// But this is cheap, so it shouldn't matter too much
        let score_tree: RNALayout = new RNALayout;
        score_tree.setup_tree(this.get_satisfied_pairs());

        let treeroot: RNATreeNode = score_tree.get_root();
        score_tree.score_tree(this.get_full_sequence(), this._score_folder);

        let score_nodes: ScoreDisplayNode[] = [];
        let root_coords: number[] = [];
        this.generate_score_nodes_recursive(treeroot, root_coords, score_nodes);
        this._score_nodes = score_nodes;

        this.clear_score_texts();
        if (this._display_score_texts) {
            this._score_texts = [];
            for (let scoreNode of this._score_nodes) {
                let scoreText = new Sprite(BitmapManager.get_text_bitmap(scoreNode.get_colored_number()));
                scoreText.visible = false;
                this._score_texts.push(scoreText);
                this.container.addChild(scoreText);
            }
        }

        this.update_score_node_gui();
    }

    private generate_score_nodes_recursive(root: RNATreeNode, coords: number[], nodes: ScoreDisplayNode[]): void {
        if (root == null) {
            return;
        }

        if (coords != null) {
            if (root._is_pair) {
                coords.push(root._index_a);
                coords.push(root._index_b);
            } else if (root._index_a >= 0) {
                coords.push(root._index_a);
                return;
            }
        }

        let child_coords: number[];

        if (root._is_pair) {
            if (root._children.length > 1) {
                throw new Error("Something's wrong with score tree");
            }

            if (root._children.length != 0) {
                if (root._children[0]._is_pair) {
                    child_coords = [];

                    child_coords.push(root._index_a);
                    child_coords.push(root._index_b);

                    child_coords.push(root._children[0]._index_b);
                    child_coords.push(root._children[0]._index_a);

                    let newnode = new ScoreDisplayNode();
                    nodes.push(newnode);
                    newnode.set_type(ScoreDisplayNodeType.STACK, child_coords, root._score);

                    this.generate_score_nodes_recursive(root._children[0], null, nodes);
                } else {
                    child_coords = [];

                    child_coords.push(root._index_b);
                    child_coords.push(root._index_a);

                    this.generate_score_nodes_recursive(root._children[0], child_coords, nodes);
                }
            }

        } else {
            for (let child of root._children) {
                this.generate_score_nodes_recursive(child, coords, nodes);
            }

            if (coords != null) {
                let newnode = new ScoreDisplayNode();
                nodes.push(newnode);

                newnode.set_type(ScoreDisplayNodeType.LOOP, coords, root._score);
            }
        }
    }

    private is_editable(seqnum: number): boolean {
        if (this._editable_indices != null) {
            let in_list: boolean = (this._editable_indices.indexOf(seqnum) != -1);
            return this._editable ? in_list : !in_list;
        } else {
            return this._editable;
        }
    }

    private createBase(): Base {
        let base: Base = new Base(this, EPars.RNABASE_GUANINE);
        this.addObject(base, this.container);
        this._bases.push(base);
        return base;
    }

    private static get_pair_strength(s1: number, s2: number): number {
        if (Pose2D.isPair(s1, s2, EPars.RNABASE_ADENINE, EPars.RNABASE_URACIL)) {
            return 2;
        } else if (Pose2D.isPair(s1, s2, EPars.RNABASE_GUANINE, EPars.RNABASE_URACIL)) {
            return 1;
        } else if (Pose2D.isPair(s1, s2, EPars.RNABASE_GUANINE, EPars.RNABASE_CYTOSINE)) {
            return 3;
        } else {
            return -1;
        }
    }

    private static isPair(s1: number, s2: number, type1: number, type2: number): boolean {
        return (s1 == type1 && s2 == type2) || (s1 == type2 && s2 == type1);
    }

    /// Array of sequence/pairs
    private _sequence: number[] = [];
    private _mutated_sequence: number[];
    private _pairs: number[] = [];
    private _bases: Base[] = [];
    private _locks: boolean[] = [];
    private _forced_struct: number[] = [];
    private _design_struct: boolean[] = [];
    private _binding_site: any[];
    private _molecular_binding_bases: any[] = null;
    private _molecular_binding_pairs: any[] = null;
    // private _molecule: Molecule = null;
    private _molecule_is_bound: boolean = false;
    private _molecule_is_bound_real: boolean = false;
    private _molecular_binding_bonus: number = 0;
    private _molecule_target_pairs: any[];
    private parenthesis: string;
    private _shift_limit: number;

    /// Oligos
    private _oligo: any[] = null;
    private _oligo_mode: number = Pose2D.OLIGO_MODE_DIMER;
    private _oligo_name: string = null;
    private _duplex_cost: number = EPars.DUPLEX_INIT; // total for all strands
    private _oligo_malus: number = 0; // concentration related penalty
    private _oligo_bases: any[] = null; // for glows
    private _oligo_paired: boolean = false;

    /// Multistrands
    private _oligos: any[] = null;
    private _oligos_order: any[] = null;
    private _prev_oligos_order: any[];
    private _oligos_paired: number = 0;
    private _strand_label: TextBalloon;

    /// barcode
    private _barcodes: number[];

    /// Canvas for bit blitting
    // private _canvas: Bitmap;
    // private _mol_canvas: Bitmap;
    private _mol_dirty: any[] = [];

    /// Are we coloring?
    private _coloring: boolean = false;
    private _current_color: number = EPars.RNABASE_URACIL;
    private _last_colored_index: number;
    private _lock_updated: boolean;
    private _binding_site_updated: boolean;
    private _design_struct_updated: boolean;

    /// Scripted painters
    private _dyn_paint_colors: any[] = [];
    private _dyn_paint_tools: any[] = [];

    /// Is this pose editable?
    private _editable: boolean;
    private _editable_indices: any[] = null;

    /// Pointer to callback function to be called after change in pose
    private _pose_edit_callback: Function = null;
    private _track_moves_callback: Function = null;
    private _add_base_callback: Function;
    private _start_mousedown_callback: PoseMouseDownCallback;
    private _mouse_down_altKey: boolean = false;

    /// Display bases as letters?
    private _lettermode: boolean = false;

    /// Display score texts?
    private _display_score_texts: boolean;

    /// Do we have to setDirty pose?
    private _redraw: boolean = true;
    private _base_dirty: Rectangle = null;

    /// Time which we sampled bases to animate last time;
    private _last_sampled_time: number = -1;

    /// Pose position offset
    private _off_x: number = 0;
    private _off_y: number = 0;
    private _offset_translating: boolean;
    private _start_offset_x: number;
    private _start_offset_y: number;
    private _end_offset_x: number;
    private _end_offset_y: number;

    /// For base moving animation
    private _base_from_x: number[];
    private _base_from_y: number[];
    private _base_to_x: number[];
    private _base_to_y: number[];
    private _fold_start_time: number;
    private _fold_duration: number;
    // private _paint_cursor: PaintCursor;

    /// Pose zoom
    private _zoom_level: number = 0;

    /// Pose angle
    private _desired_angle: number = 0;

    /// Is explosion animation on going?
    private _is_exploding: boolean = false;
    private _explosion_start_time: number = -1;
    private _explosion_rays: any[];
    private _orig_offset_x: number;
    private _orig_offset_y: number;
    private _explosion_cb: Function;

    /// Selection box
    private _selection_highlight_box: HighlightBox;
    private _restricted_highlight_box: HighlightBox;
    private _highlight_restricted: boolean = false;
    private _unstable_highlight_box: HighlightBox;
    private _forced_highlight_box: HighlightBox;
    private _user_defined_highlight_box: HighlightBox;
    private _shift_highlight_box: HighlightBox;
    private _shift_start: number = -1;
    private _shift_end: number = -1;

    /// For praising stacks
    private _praise_objects: any[] = [];
    private _praise_queue: number[] = [];
    private _praise_seq: number[] = [];

    /// Score display nodes
    private _score_nodes: ScoreDisplayNode[];
    private _score_texts: Sprite[];
    private _score_folder: Folder;
    private _score_node_index: number = -1;
    private _last_score_node_index: number = -1;
    private _score_node_highlight: Graphics;

    // New Score Display panels
    private _primary_score_energy_display: EnergyScoreDisplay;
    private _secondary_score_energy_display: EnergyScoreDisplay;
    private _show_total_energy: boolean = true;

    /// For tracking a base
    private _tracked_indices: number[] = [];
    private _base_boxes: Graphics[] = [];
    private cursor_index: number = 0;
    private cursor_box: GameObject = null;
    private _last_shifted_index: number = -1;
    private _last_shifted_command: number = -1;

    /// Rendering mode
    private _numbering_mode: boolean = false;
    private _lowperform_mode: boolean = false;

    /// Last exp paint data
    private _exp_painter: ExpPainter = null;
    private _exp_mid: number = 0;
    private _exp_hi: number = 0;
    private _exp_continuous: boolean = false;
    private _exp_extended_scale: boolean = false;
    private _display_aux_info: boolean;
    private _aux_info: Object;
    private _aux_info_canvas: Container;
    private _aux_textballoon: TextBalloon;

    /// Feedback
    private _feedback_objs: any[] = [];
    private _feedback_objs_num: number;
    private _feedback_objs_start_ind: number;

    // Anchoring
    private _anchored_objects: any[] = [];
    private _highlight_energy_text: boolean = false;
    private _energy_highlights: any[] = [];
    /*
	 * NEW HIGHLIGHT.
	 * 	- Input: List of nucleotides that we wish to highlight.
	 * 	- Unhighlighted Nucleotides: Draw at 65% opacity.
	 *	- Highlight Nucleotides: Brighten glow around the nucleotide.
	 */
    private _all_new_highlights: any[] = [];

    private static readonly P: Point = new Point();
}

