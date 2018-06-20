import {MathUtil} from "../../flashbang/util/MathUtil";
import {Eterna} from "../Eterna";
import {GameButton} from "../ui/GameButton";
import {AutosaveManager} from "./AutosaveManager";

export class SoundManager {
    public static readonly SoundSwitch: string = "/assets/Sounds/1-TextBubble-Click-A.mp3";
    public static readonly SoundButtonClick: string = "/assets/Sounds/1-TextBubble-Click-C.mp3";
    public static readonly SoundAllConditions: string = "/assets/Sounds/11-Flag.mp3";
    public static readonly SoundPaint: string = "/assets/Sounds/2-BubblePop-06.mp3";
    public static readonly SoundPuzzleClear: string = "/assets/Sounds/3-PuzzleClear-A.mp3";
    public static readonly SoundSmashStamp: string = "/assets/Sounds/5-SmashStamp.mp3";
    public static readonly SoundB: string = "/assets/Sounds/7-B.mp3";
    public static readonly SoundGExtra: string = "/assets/Sounds/7-G(Extra).mp3";
    public static readonly SoundG: string = "/assets/Sounds/7-G.mp3";
    public static readonly SoundGB: string = "/assets/Sounds/7-GB.mp3";
    public static readonly SoundRExtra: string = "/assets/Sounds/7-R(Extra).mp3";
    public static readonly SoundR: string = "/assets/Sounds/7-R.mp3";
    public static readonly SoundRB: string = "/assets/Sounds/7-RB.mp3";
    public static readonly SoundRG: string = "/assets/Sounds/7-RG.mp3";
    public static readonly SoundRY: string = "/assets/Sounds/7-RY.mp3";
    public static readonly SoundYExtra: string = "/assets/Sounds/7-Y(Extra).mp3";
    public static readonly SoundY: string = "/assets/Sounds/7-Y.mp3";
    public static readonly SoundYB: string = "/assets/Sounds/7-YB.mp3";
    public static readonly SoundCondition: string = "/assets/Sounds/8-Condition.mp3";
    public static readonly SoundDecondition: string = "/assets/Sounds/8-DeCondition.mp3";
    public static readonly SoundScriptFail: string = "/assets/Sounds/8-DeReward.mp3";
    public static readonly SoundScriptExec: string = "/assets/Sounds/8-RewardSound-B.mp3";
    public static readonly SoundScriptDone: string = "/assets/Sounds/8-RewardSound.mp3";

    public constructor() {
        this._sounds = new Map<any, any>();

        // this._mute = false;
        // this._unmuted_bitmap = BitmapUtil.scale_by(BitmapManager.get_bitmap(BitmapManager.AudioNormal), 0.7);
        // this._muted_bitmap = BitmapUtil.scale_by(BitmapManager.get_bitmap(BitmapManager.AudioMute), 0.7);
        // this._game_mute = new GameButton(20, this._unmuted_bitmap, 0, 0, true);
        // this._game_mute.set_tooltip("Mute");
        // this._game_mute.set_click_callback(this.toggle_mute);
        //
        // this._volume = -1;
        // this._on_bitmap = BitmapUtil.scale_by(BitmapManager.get_bitmap(BitmapManager.Audio_Vol_On), 0.3);
        // this._off_bitmap = BitmapUtil.scale_by(BitmapManager.get_bitmap(BitmapManager.Audio_Vol_Off), 0.3);
        //
        // function createVolumeButton(volume: number): GameButton {
        //     let button: GameButton = new GameButton(20, this._off_bitmap, 0, 0, true);
        //     button.set_use_response_animation(false);
        //     button.set_tooltip("Vol " + volume);
        //     button.set_click_callback(function (): void {
        //         this.change_volume(volume);
        //     });
        //     return button;
        // }
        //
        // for (let ii: number = 0; ii < SoundManager.NUM_VOLUME_BUTTONS; ++ii) {
        //     this._volumeButtons.push(this.createVolumeButton(ii + 1));
        // }
        //
        // this._chat_mute = false;
        // this._chat_unmuted_bitmap = BitmapUtil.scale_by(BitmapManager.get_bitmap(BitmapManager.AudioNormal), 0.3);
        // this._chat_muted_bitmap = BitmapUtil.scale_by(BitmapManager.get_bitmap(BitmapManager.AudioMute), 0.6);
        // this._chat_mute_bt = new GameButton(20, this._chat_unmuted_bitmap, 0, 0, true);
        // this._chat_mute_bt.set_use_response_animation(false);
        // //_chat_mute_bt.visible = false;
        // this._chat_mute_bt.set_click_callback(this.toggle_chat_mute);
    }

    public static get instance(): SoundManager {
        if (SoundManager._instance == null) {
            SoundManager._instance = new SoundManager;
        }
        return SoundManager._instance;
    }

    //DO NOT call this function in the constructor, as the player id has not been initialized yet!
    public load_mute_setting(): void {
        let mute_save_token: string = "mute_" + Eterna.player_id;
        let objs: any[] = AutosaveManager.loadObjects(mute_save_token);
        if (objs != null) {

            let new_mute: boolean = objs[0];
            if (new_mute != this._mute) {
                this.toggle_mute();
            }
        }
    }

    public load_volume_setting(): void {
        let volume_save_token: string = "volume_" + Eterna.player_id;
        let objs: any[] = AutosaveManager.loadObjects(volume_save_token);

        if (objs != null) {
            this._volume = objs[0];
            if (!this._mute) {
                this.change_volume(MathUtil.clamp(this._volume, 1, 5));
            }
        } else {
            this.change_volume(3);
        }
    }

    public get_mute_button(): GameButton {
        return this._game_mute;
    }

    public get_volume_button(a: number): GameButton {
        return this._volumeButtons[MathUtil.clamp(a, 1, SoundManager.NUM_VOLUME_BUTTONS) - 1];
    }

    public play_bg(sound: Object, loop: number, vol: number = 1): void {
        // if (this._mute) {
        //     return;
        // }
        //
        // if (this._current_bg_channel != null) {
        //     this._current_bg_channel.stop();
        // }
        //
        // this._current_bg_channel = this._sounds[this.get_sound(sound)].play(0, loop, new SoundTransform(vol));
    }

    public play_se(sound: Object, start_time: number = 0): void {
        // if (this._mute) {
        //     return;
        // }
        //
        // if (this._volume == 1) {
        //     this._sounds[this.get_sound(sound)].play(start_time, 0, new SoundTransform(0.1));
        // } else {
        //     this._sounds[this.get_sound(sound)].play(start_time, 0, new SoundTransform(this._volume * 0.2));
        // }
    }

    private toggle_mute(): void {
        // this._mute = !this._mute;
        //
        // let img1: BitmapData = this._unmuted_bitmap;
        // let img2: BitmapData = this._muted_bitmap;
        //
        // if (this._mute) {
        //     this._game_mute.set_icon(img2);
        //     this._game_mute.set_tooltip("Unmute");
        //
        //     this.reset_volume_button();
        // }
        // else {
        //     this._game_mute.set_icon(img1);
        //     this._game_mute.set_tooltip("Mute");
        //
        //     this.change_volume_button();
        // }
        //
        // //Save mute setting
        // let objs: any[] = [this._mute];
        // let mute_save_token: string = "mute_" + Eterna.player_id;
        // AutosaveManager.saveObjects(objs, mute_save_token);
    }

    private change_volume(volume: number): void {
        if (this._mute) {
            this.toggle_mute();
        }

        this._volume = volume;
        this.reset_volume_button();
        this.change_volume_button();

        //Save mute setting
        let objs: any[] = [this._volume];
        let volume_save_token: string = "volume_" + Eterna.player_id;
        AutosaveManager.saveObjects(objs, volume_save_token);
    }

    private reset_volume_button(): void {
        // for (let button of this._volumeButtons) {
        //     button.set_icon(this._off_bitmap);
        // }
    }

    private change_volume_button(): void {
        // for (let ii: number = 0; ii < this._volumeButtons.length; ++ii) {
        //     let button: GameButton = this._volumeButtons[ii];
        //     if (this._volume >= (ii + 1)) {
        //         button.set_icon(this._on_bitmap);
        //     }
        // }
    }

    // private get_sound(clazz: Object): Sound {
    //     let sound: Sound = this._sounds[clazz];
    //     if (sound == null) {
    //         sound = new clazz();
    //         this._sounds[sound] = sound;
    //     }
    //     return sound;
    // }

    private _sounds: Map<any, any>;
    // private _current_bg_channel: SoundChannel;
    private _mute: boolean;
    private _game_mute: GameButton;
    // private _muted_bitmap: BitmapData;
    // private _unmuted_bitmap: BitmapData;
    private _volume: number;
    private _volumeButtons: GameButton[] = []; // Array<GameButton>
    // private _on_bitmap: BitmapData;
    // private _off_bitmap: BitmapData;

    private static _instance: SoundManager;

    private static readonly NUM_VOLUME_BUTTONS: number = 5;

}
