import * as log from "loglevel";
import {Texture} from "pixi.js";
import {TextureUtil} from "../../../flashbang/util/TextureUtil";
import {EPars} from "../../EPars";
import {Eterna} from "../../Eterna";
import {Pose2D} from "../../pose2D/Pose2D";
import {Sounds} from "../../resources/Sounds";
import {GameButton} from "../../ui/GameButton";
import {ExternalInterface} from "../../util/ExternalInterface";
import {GameMode} from "../GameMode";

export enum BoosterType {
    PAINTER = 1,
    ACTION = 2,
}

export class Booster {
    public static create(view: GameMode, data: any): Promise<Booster> {
        if (!data['type']) {
            return Promise.reject("Invalid booster definition (missing 'type')");
        } else if (!data["icons_b64"] || data["icons_b64"].length != 5) {
            return Promise.reject("Invalid booster definition (missing or malformed 'icons_b64'");
        }

        // load icons
        let iconData: string[] = data["icons_b64"];
        let buttonStateTextures: Texture[] = new Array(iconData.length);
        let imageLoaders: Promise<void>[] = [];
        for (let ii = 0; ii < iconData.length; ++ii) {
            if (iconData[ii] == null) {
                continue;
            }

            imageLoaders.push(TextureUtil.fromBase64PNG(iconData[ii])
                .then(texture => {
                    buttonStateTextures[ii] = texture;
                }));
        }

        return Promise.all(imageLoaders).then(() => {
            let type: BoosterType = Number(data['type']);
            let tool_color: number = -1;
            if (type == BoosterType.PAINTER) {
                tool_color = Booster._toolColorCounter++;
                log.info("color_num=" + tool_color);
            }

            return new Booster(
                view,
                type,
                tool_color,
                data['label'],
                data['tooltip'],
                data['script'],
                buttonStateTextures);
        });
    }

    private constructor(
        view: GameMode,
        type: BoosterType,
        tool_color: number,
        label: string,
        tooltip: string,
        script_nid: string,
        buttonStateTextures: Texture[]) {

        this._view = view;
        this._type = type;
        this._tool_color = tool_color;
        this._label = label;
        this._tooltip = tooltip;
        this._script_nid = script_nid;
        this._buttonStateTextures = buttonStateTextures;

        for (let ii = 0; ii < this._view.number_of_pose_fields(); ii++) {
            let pose: Pose2D = this._view.get_pose(ii);
            pose.register_paint_tool(tool_color, this);
        }
    }

    public get_tool_color(): number {
        return this._tool_color;
    }

    public create_button(fontsize: number = 22): GameButton {
        let button: GameButton = new GameButton().allStates(this._buttonStateTextures[0]);
        if (this._type == BoosterType.PAINTER) {
            if (this._buttonStateTextures[0] !== undefined) {
                button.up(this._buttonStateTextures[0]);
            }
            if (this._buttonStateTextures[1] !== undefined) {
                button.over(this._buttonStateTextures[1]);
            }
            if (this._buttonStateTextures[2] !== undefined) {
                button.down(this._buttonStateTextures[2]);
            }
            if (this._buttonStateTextures[3] !== undefined) {
                button.selected(this._buttonStateTextures[3]);
            }
            if (this._buttonStateTextures[4] !== undefined) {
                button.disabled(this._buttonStateTextures[4]);
            }
        }
        if (this._label != null) {
            button.label(this._label, fontsize);
            button.scaleBitmapToLabel();
        }
        button.tooltip(this._tooltip);
        return button;
    }

    public on_load(): void {
        this.execute_script(null, "ON_LOAD", -1);
    }

    public on_paint(pose: Pose2D, base_num: number): void {
        Eterna.sound.play_se(Sounds.SoundPaint);
        this.execute_script(pose, "MOUSE_DOWN", base_num);
    }

    public on_painting(pose: Pose2D, base_num: number): void {
        this.execute_script(pose, "MOUSE_MOVE", base_num);
    }

    public on_run(): void {
        this.execute_script(null, null, -1);
    }

    private execute_script(pose: Pose2D, cmd: string, base_num: number): void {
        if (this._type == BoosterType.ACTION) {
            log.debug("TODO: add_lock");
            // Application.instance.add_lock("LOCK_SCRIPT");
        }

        // register callbacks
        this._view.register_script_callbacks();

        ExternalInterface.addCallback("set_sequence_string", (seq: string): boolean => {
            // _view.trace_js("set_sequence_string() called");
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            if (seq_arr.indexOf(EPars.RNABASE_UNDEFINED) >= 0 || seq_arr.indexOf(EPars.RNABASE_CUT) >= 0) {
                log.info("Invalid characters in " + seq);
                return false;
            }

            if (this._type == BoosterType.PAINTER && pose) {
                pose.set_mutated(seq_arr);
            } else {
                let force_sync: boolean = this._view.is_forced_synch();
                this._view.set_forced_synch(true);
                for (let ii: number = 0; ii < this._view.number_of_pose_fields(); ii++) {
                    pose = this._view.get_pose(ii);
                    pose.paste_sequence(seq_arr);
                }
                this._view.set_forced_synch(force_sync);
            }
            return true;
        });

        ExternalInterface.addCallback("set_tracked_indices", (marks: any[]): void => {
            // _view.trace_js("set_tracked_indices() called");
            for (let ii: number = 0; ii < this._view.number_of_pose_fields(); ii++) {
                let pose: Pose2D = this._view.get_pose(ii);
                pose.clear_tracking();
                for (let k: number = 0; k < marks.length; k++) {
                    pose.black_mark(marks[k]);
                }
            }
        });

        ExternalInterface.addCallback("set_script_status", (txt: string): void => {
            // _view.trace_js("set_script_status() called");
        });

        ExternalInterface.addCallback("end_" + this._script_nid, (ret: any): void => {
            log.info("end_" + this._script_nid + "() called");
            log.info(ret);
            if (ret['cause'] instanceof String) {
                if (this._type == BoosterType.ACTION) {
                    Eterna.sound.play_se(ret['result'] ? Sounds.SoundScriptDone : Sounds.SoundScriptFail);
                    log.debug("TODO: remove_lock");
                    // Application.instance.remove_lock("LOCK_SCRIPT");
                }
            } else {
                // leave the script running asynchronously
            }
        });

        // run
        log.info("running script " + this._script_nid);
        if (this._type == BoosterType.ACTION) {
            //SoundManager.instance.play_se(SoundManager.SoundScriptExec);
            ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", this._script_nid, {}, null);
        } else {
            ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", this._script_nid, {
                command: cmd,
                param: base_num.toString()
            }, null);
        }
        log.info("launched");
    }

    private readonly _view: GameMode;
    private readonly _tool_color: number;
    private readonly _type: BoosterType;
    private readonly _label: string;
    private readonly _tooltip: string;
    private readonly _script_nid: string;
    private readonly _buttonStateTextures: Texture[] = [null, null, null, null, null];

    private static _toolColorCounter: number = EPars.RNABASE_DYNAMIC_FIRST;

}
