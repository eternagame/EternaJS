import * as log from "loglevel";
import "pixi-sound";
import {RegistrationGroup} from "../../signals/RegistrationGroup";
import {EternaSettings} from "../settings/EternaSettings";

type Sound = PIXI.sound.Sound;

export class SoundManager {
    public constructor(settings: EternaSettings) {
        this._settings = settings;

        this._regs.add(settings.soundMute.connectNotify((mute) => {
            if (mute) {
                PIXI.sound.muteAll();
            } else {
                PIXI.sound.unmuteAll();
            }
        }));
    }

    public play_se(name: string, start_time: number = 0): void {
        if (this._settings.soundMute.value) {
            return;
        }

        try {
            this.getSound(name).play({volume: this._settings.soundVolume.value, start: start_time});
        } catch (e) {
            log.error(`Failed to play sound ${name}`, e);
        }
    }

    private getSound(name: string): Sound {
        let sound = this._sounds.get(name);
        if (sound === undefined) {
            sound = PIXI.sound.Sound.from(name);
            this._sounds.set(name, sound);
        }
        return sound;
    }

    private readonly _settings: EternaSettings;
    private readonly _sounds: Map<string, Sound> = new Map();
    private readonly _regs: RegistrationGroup = new RegistrationGroup();
}
