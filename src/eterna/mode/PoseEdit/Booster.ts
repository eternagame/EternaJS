import * as log from 'loglevel';
import {Texture} from 'pixi.js';
import {TextureUtil} from 'flashbang/util';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import {Pose2D} from 'eterna/pose2D';
import {Sounds} from 'eterna/resources';
import {GameButton} from 'eterna/ui';
import {ExternalInterface, ExternalInterfaceCtx} from 'eterna/util';
import {GameMode} from 'eterna/mode';

export enum BoosterType {
    PAINTER = 1,
    ACTION = 2,
}

export default class Booster {
    public static create(mode: GameMode, data: any): Promise<Booster> {
        if (!data['type']) {
            return Promise.reject(new Error("Invalid booster definition (missing 'type')"));
        } else if (!data['icons_b64'] || data['icons_b64'].length !== 5) {
            return Promise.reject(new Error("Invalid booster definition (missing or malformed 'icons_b64'"));
        }

        // load icons
        let iconData: string[] = data['icons_b64'];
        let buttonStateTextures: Texture[] = new Array(iconData.length);
        let imageLoaders: Promise<void>[] = [];
        for (let ii = 0; ii < iconData.length; ++ii) {
            if (iconData[ii] == null) {
                continue;
            }

            imageLoaders.push(TextureUtil.fromBase64PNG(iconData[ii])
                .then((texture) => {
                    buttonStateTextures[ii] = texture;
                }));
        }

        return Promise.all(imageLoaders)
            .then(() => mode.waitTillActive())
            .then(() => {
                let type: BoosterType = Number(data['type']);
                let toolColor = -1;
                if (type === BoosterType.PAINTER) {
                    toolColor = Booster._toolColorCounter++;
                    log.info(`color_num=${toolColor}`);
                }

                return new Booster(
                    mode,
                    type,
                    toolColor,
                    data['label'],
                    data['tooltip'],
                    data['script'],
                    buttonStateTextures
                );
            });
    }

    private constructor(
        view: GameMode,
        type: BoosterType,
        toolColor: number,
        label: string,
        tooltip: string,
        scriptNID: string,
        buttonStateTextures: Texture[]
    ) {
        this._view = view;
        this._type = type;
        this._toolColor = toolColor;
        this._label = label;
        this._tooltip = tooltip;
        this._scriptID = scriptNID;
        this._buttonStateTextures = buttonStateTextures;

        for (let ii = 0; ii < this._view.numPoseFields; ii++) {
            let pose: Pose2D = this._view.getPose(ii);
            pose.registerPaintTool(toolColor, this);
        }
    }

    public get toolColor(): number {
        return this._toolColor;
    }

    public createButton(fontsize: number = 22): GameButton {
        let button: GameButton = new GameButton().allStates(this._buttonStateTextures[0]);
        if (this._type === BoosterType.PAINTER) {
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
        this.executeScript(null, 'ON_LOAD', -1);
    }

    public onPaint(pose: Pose2D, baseNum: number): void {
        Eterna.sound.playSound(Sounds.SoundPaint);
        this.executeScript(pose, 'MOUSE_DOWN', baseNum);
    }

    public onPainting(pose: Pose2D, baseNum: number): void {
        this.executeScript(pose, 'MOUSE_MOVE', baseNum);
    }

    public onRun(): void {
        this.executeScript(null, null, -1);
    }

    private executeScript(pose: Pose2D, cmd: string, baseNum: number): void {
        let scriptInterface = new ExternalInterfaceCtx();

        scriptInterface.addCallback('set_sequence_string', (seq: string): boolean => {
            let seqArr: number[] = EPars.stringToSequence(seq);
            if (seqArr.indexOf(EPars.RNABASE_UNDEFINED) >= 0 || seqArr.indexOf(EPars.RNABASE_CUT) >= 0) {
                log.info(`Invalid characters in ${seq}`);
                return false;
            }

            if (this._type === BoosterType.PAINTER && pose) {
                pose.setMutated(seqArr);
            } else {
                let prevForceSync = this._view.forceSync;
                this._view.forceSync = true;
                for (let ii = 0; ii < this._view.numPoseFields; ii++) {
                    pose = this._view.getPose(ii);
                    pose.pasteSequence(seqArr);
                }
                this._view.forceSync = prevForceSync;
            }
            return true;
        });

        scriptInterface.addCallback('set_tracked_indices', (marks: any[], color: number = 0x000000): void => {
            for (let ii = 0; ii < this._view.numPoseFields; ii++) {
                let poseToMark: Pose2D = this._view.getPose(ii);
                poseToMark.clearTracking();
                for (let mark of marks) {
                    poseToMark.addBaseMark(mark, color);
                }
            }
        });

        scriptInterface.addCallback('set_script_status', (): void => {});

        const useUILock = this._type === BoosterType.ACTION;
        const LOCK_NAME = 'BoosterScript';

        if (this._type === BoosterType.ACTION) {
            this._view.pushUILock(LOCK_NAME);
        }

        const scriptParams = this._type === BoosterType.ACTION ? {} : {
            command: cmd,
            param: baseNum.toString()
        };

        ExternalInterface.runScript(this._scriptID, {params: scriptParams, ctx: scriptInterface})
            .then((ret) => {
                if (useUILock) {
                    this._view.popUILock(LOCK_NAME);
                    Eterna.sound.playSound(
                        ret != null && ret['result'] ? Sounds.SoundScriptDone : Sounds.SoundScriptFail
                    );
                }
            })
            .catch(() => {
                if (useUILock) {
                    this._view.popUILock(LOCK_NAME);
                    Eterna.sound.playSound(Sounds.SoundScriptFail);
                }
            });
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
