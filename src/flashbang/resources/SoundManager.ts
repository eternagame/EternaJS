import * as log from 'loglevel';
import 'pixi-sound';
import Flashbang from 'flashbang/core/Flashbang';

export default class SoundManager {
    public set muted(mute: boolean) {
        if (mute) {
            PIXI.sound.muteAll();
        } else {
            PIXI.sound.unmuteAll();
        }

        this._muted = mute;
    }

    public get muted(): boolean {
        return this._muted;
    }

    public volume: number = 0.6;

    public playSound(name: string, startTime: number = 0): void {
        if (this._muted) {
            return;
        }

        try {
            let sound = this.getSound(name);
            sound.play({volume: this.volume, start: startTime});
        } catch (e) {
            log.error(`Failed to play sound ${name}`, e);
        }
    }

    private getSound(url: string): Sound {
        let sound = this._sounds.get(url);
        if (sound === undefined) {
            sound = new Sound(url);
            this._sounds.set(url, sound);
        }
        return sound;
    }

    private _muted: boolean;
    private readonly _sounds: Map<string, Sound> = new Map();
}

/**
 * We load sounds lazily, which means that a sound might not be available when `play()` is called.
 * For sounds that are loading, we store the last play request, and play the sound with those settings
 * when it has completed loading.
 */
class Sound {
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
        if (this._pendingPlayOptions != null && !Flashbang.sound.muted) {
            this._pendingPlayOptions.volume = Flashbang.sound.volume;
            this._sound.play(this._pendingPlayOptions);
        }
        this._pendingPlayOptions = null;
    }

    private readonly _sound: PIXI.sound.Sound;
    private _pendingPlayOptions: PIXI.sound.PlayOptions;
}
