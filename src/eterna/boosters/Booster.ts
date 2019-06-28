import { Texture } from "pixi.js";
import { TextureUtil } from "flashbang/util";
import { GameButton } from "eterna/ui";
import Eterna from "eterna/Eterna";
import { Sounds } from "eterna/resources";
import { Pose2D } from "eterna/diagram";
import ExternalInterface, { ExternalInterfaceCtx } from "./ExternalInterface";

export enum BoosterType {
    PAINTER = 1,
    ACTION = 2,
}

// TODO: Determine tool color and register paint tool if painter booster type (this was probably the wrong palce to do it)
// TODO: Rework callback shtuff (attempt to decouple from mode and maybe pose2d)

export default class Booster {
    public static create(
        type: BoosterType, scriptID: number,
        {label=null, tooltip=null, b64Icons=[null, null, null, null, null]}:
        {label?: string, tooltip?: string, b64Icons?: string[]} = {}
    ): Promise<Booster> {
        if (b64Icons.length !== 5) {
            return Promise.reject("Invalid booster definition ('icons_b64' should have a length of 5)");
        }

        return Promise.all(
            b64Icons.map(icon => icon ? TextureUtil.fromBase64PNG(icon) : null)
        ).then((textures: Texture[]) => {
            return new Booster(type, scriptID, label, tooltip, textures);
        });
    }

    private constructor(
        type: BoosterType, scriptID: number,
        label: string, tooltip: string, buttonTextures: Texture[]
    ) {
        this._type = type;
        this._scriptID = scriptID;
        this._label = label;
        this._tooltip = tooltip;
        this._buttonTextures = buttonTextures;
    }

    public createButton(fontsize: number = 22): GameButton {
        let button: GameButton = new GameButton().allStates(this._buttonTextures[0]);
        if (this._type == BoosterType.PAINTER) {
            if (this._buttonTextures[0] !== undefined) {
                button.up(this._buttonTextures[0]);
            }
            if (this._buttonTextures[1] !== undefined) {
                button.over(this._buttonTextures[1]);
            }
            if (this._buttonTextures[2] !== undefined) {
                button.down(this._buttonTextures[2]);
            }
            if (this._buttonTextures[3] !== undefined) {
                button.selected(this._buttonTextures[3]);
            }
            if (this._buttonTextures[4] !== undefined) {
                button.disabled(this._buttonTextures[4]);
            }
        }
        if (this._label != null) {
            button.label(this._label, fontsize);
            button.scaleBitmapToLabel();
        }
        if (this._tooltip != null) {
            button.tooltip(this._tooltip);
        }
        return button;
    }

    public onLoad(): void {
        this.executeScript(null, "ON_LOAD", -1);
    }

    public onPaintStart(pose: Pose2D, base_num: number): void {
        Eterna.sound.playSound(Sounds.SoundPaint);
        this.executeScript(pose, "MOUSE_DOWN", base_num);
    }

    public onPaintNext(pose: Pose2D, base_num: number): void {
        this.executeScript(pose, "MOUSE_MOVE", base_num);
    }

    public onRun(): void {
        this.executeScript(null, null, -1);
    }

    private executeScript(pose: Pose2D, cmd: string, base_num: number): void {
        let scriptInterface = new ExternalInterfaceCtx();

        scriptInterface.addCallback("set_sequence_string", (seq: string): boolean => {
            /*let seq_arr: number[] = EPars.stringToSequence(seq);
            if (seq_arr.indexOf(EPars.RNABASE_UNDEFINED) >= 0 || seq_arr.indexOf(EPars.RNABASE_CUT) >= 0) {
                log.info(`Invalid characters in ${seq}`);
                return false;
            }

            if (this._type == BoosterType.PAINTER && pose) {
                pose.setMutated(seq_arr);
            } else {
                let prevForceSync = this._view.forceSync;
                this._view.forceSync = true;
                for (let ii = 0; ii < this._view.numPoseFields; ii++) {
                    pose = this._view.getPose(ii);
                    pose.pasteSequence(seq_arr);
                }
                this._view.forceSync = prevForceSync;
            }
            return true;*/
        });

        scriptInterface.addCallback("set_tracked_indices", (marks: any[], color: number = 0x000000): void => {
            /*for (let ii = 0; ii < this._view.numPoseFields; ii++) {
                let pose: Pose2D = this._view.getPose(ii);
                pose.clearTracking();
                for (let mark of marks) {
                    pose.addBaseMark(mark, color);
                }
            }*/
        });

        scriptInterface.addCallback("set_script_status", (): void => {});

        const useUILock = this._type === BoosterType.ACTION;
        const LOCK_NAME = "BoosterScript";

        if (this._type == BoosterType.ACTION) {
            //this._view.pushUILock(LOCK_NAME);
        }

        const scriptParams = this._type === BoosterType.ACTION ? {} : {
            command: cmd,
            param: base_num.toString()
        };

        ExternalInterface.runScript(this._scriptID, {params: scriptParams, ctx: scriptInterface})
            .then((ret) => {
                if (useUILock) {
                    //this._view.popUILock(LOCK_NAME);
                    Eterna.sound.playSound(ret != null && ret["result"] ? Sounds.SoundScriptDone : Sounds.SoundScriptFail);
                }
            })
            .catch(() => {
                if (useUILock) {
                    //this._view.popUILock(LOCK_NAME);
                    Eterna.sound.playSound(Sounds.SoundScriptFail);
                }
            });
    }

    private _type: BoosterType;
    private _scriptID: number;
    private _label: string;
    private _tooltip: string;
    private _buttonTextures: Texture[];
}