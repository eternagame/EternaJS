import * as log from 'loglevel';
import 'pixi-sound';
import {RegistrationGroup} from 'signals';
import Eterna from 'eterna/Eterna';
import {EternaSettings} from 'eterna/settings';

export default class SoundManager {
    constructor(settings: EternaSettings) {
        this._settings = settings;

        this._regs.add(settings.soundMute.connectNotify((mute) => {
            if (mute) {
                PIXI.sound.muteAll();
            } else {
                PIXI.sound.unmuteAll();
            }
        }));
    }

    public playSound(name: string, startTime: number = 0): void {
        if (this._settings.soundMute.value) {
            return;
        }

        try {
            let sound = this.getSound(name);
            sound.play({volume: this._settings.soundVolume.value, start: startTime});
        } catch (e) {
            log.error(`Failed to play sound ${name}`, e);
        }
    }

    private getSound(name: string): EternaSound {
        let sound = this._sounds.get(name);
        if (sound === undefined) {
            sound = new EternaSound(name);
            this._sounds.set(name, sound);
        }
        return sound;
    }

    private readonly _settings: EternaSettings;
    private readonly _sounds: Map<string, EternaSound> = new Map();
    private readonly _regs: RegistrationGroup = new RegistrationGroup();
}

/**
 * We load sounds lazily, which means that a sound might not be available when `play()` is called.
 * For sounds that are loading, we store the last play request, and play the sound with those settings
 * when it has completed loading.
 */
class EternaSound {
    constructor(url: string) {
        this._sound = PIXI.sound.Sound.from({url, preload: true, loaded: () => this.onLoaded()});
    }

    public play(options: PIXI.sound.PlayOptions) {
        if (this._sound.isLoaded) {
            this._sound.play(options);
        } else {
            this._pendingPlayOptions = options;
        }
    }

    private onLoaded(): void {
        if (this._pendingPlayOptions != null && !Eterna.settings.soundMute.value) {
            this._pendingPlayOptions.volume = Eterna.settings.soundVolume.value;
            this._sound.play(this._pendingPlayOptions);
        }
        this._pendingPlayOptions = null;
    }

    private readonly _sound: PIXI.sound.Sound;
    private _pendingPlayOptions: PIXI.sound.PlayOptions;
}
