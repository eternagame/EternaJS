import * as log from 'loglevel';
import sound from 'pixi-sound';
import Flashbang from 'flashbang/core/Flashbang';

export default class SoundManager {
    public set muted(mute: boolean) {
        if (mute) {
            sound.muteAll();
        } else {
            sound.unmuteAll();
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
            let tsound = this.getSound(name);
            tsound.play({volume: this.volume, start: startTime});
        } catch (e) {
            log.error(`Failed to play sound ${name}`, e);
        }
    }

    private getSound(url: string): Sound {
        let tsound = this._sounds.get(url);
        if (tsound === undefined) {
            tsound = new Sound(url);
            this._sounds.set(url, tsound);
        }
        return tsound;
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
        this._sound = sound.Sound.from({url, preload: true, loaded: () => this.onLoaded()});
    }

    public play(options: sound.PlayOptions) {
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

    private readonly _sound: sound.Sound;
    private _pendingPlayOptions: sound.PlayOptions | null;
}
