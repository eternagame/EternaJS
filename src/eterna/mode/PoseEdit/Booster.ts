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
        this._toolColor = tool_color;
        this._label = label;
        this._tooltip = tooltip;
        this._scriptID = script_nid;
        this._buttonStateTextures = buttonStateTextures;

        for (let ii = 0; ii < this._view.numPoseFields; ii++) {
            let pose: Pose2D = this._view.getPose(ii);
            pose.registerPaintTool(tool_color, this);
        }
    }

    public get toolColor(): number {
        return this._toolColor;
    }

    public createButton(fontsize: number = 22): GameButton {
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

    public onLoad(): void {
        this.executeScript(null, "ON_LOAD", -1);
    }

    public onPaint(pose: Pose2D, base_num: number): void {
        Eterna.sound.play_se(Sounds.SoundPaint);
        this.executeScript(pose, "MOUSE_DOWN", base_num);
    }

    public onPainting(pose: Pose2D, base_num: number): void {
        this.executeScript(pose, "MOUSE_MOVE", base_num);
    }

    public onRun(): void {
        this.executeScript(null, null, -1);
    }

    private executeScript(pose: Pose2D, cmd: string, base_num: number): void {
        if (this._type == BoosterType.ACTION) {
            this._view.pushUILock();
        }

        // register callbacks
        this._view.registerScriptCallbacks();

        ExternalInterface.addCallback("set_sequence_string", (seq: string): boolean => {
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            if (seq_arr.indexOf(EPars.RNABASE_UNDEFINED) >= 0 || seq_arr.indexOf(EPars.RNABASE_CUT) >= 0) {
                log.info("Invalid characters in " + seq);
                return false;
            }

            if (this._type == BoosterType.PAINTER && pose) {
                pose.setMutated(seq_arr);
            } else {
                let force_sync: boolean = this._view.isForcedSynch;
                this._view.isForcedSynch = true;
                for (let ii: number = 0; ii < this._view.numPoseFields; ii++) {
                    pose = this._view.getPose(ii);
                    pose.pasteSequence(seq_arr);
                }
                this._view.isForcedSynch = force_sync;
            }
            return true;
        });

        ExternalInterface.addCallback("set_tracked_indices", (marks: any[]): void => {
            for (let ii: number = 0; ii < this._view.numPoseFields; ii++) {
                let pose: Pose2D = this._view.getPose(ii);
                pose.clearTracking();
                for (let k: number = 0; k < marks.length; k++) {
                    pose.addBlackMark(marks[k]);
                }
            }
        });

        ExternalInterface.addCallback("set_script_status", (txt: string): void => {
        });

        ExternalInterface.addCallback("end_" + this._scriptID, (ret: any): void => {
            log.info("end_" + this._scriptID + "() called");
            if (typeof(ret['cause']) === "string" && this._type === BoosterType.ACTION) {
                this._view.popUILock();
                Eterna.sound.play_se(ret['result'] ? Sounds.SoundScriptDone : Sounds.SoundScriptFail);
            }
        });

        // run
        log.info("running script " + this._scriptID);
        if (this._type == BoosterType.ACTION) {
            ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", this._scriptID, {}, null);
        } else {
            ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", this._scriptID, {
                command: cmd,
                param: base_num.toString()
            }, null);
        }
        log.info("launched");
    }

    private readonly _view: GameMode;
    private readonly _toolColor: number;
    private readonly _type: BoosterType;
    private readonly _label: string;
    private readonly _tooltip: string;
    private readonly _scriptID: string;
    private readonly _buttonStateTextures: Texture[] = [null, null, null, null, null];

    private static _toolColorCounter: number = EPars.RNABASE_DYNAMIC_FIRST;

}
