import {ObjectTask, Flashbang} from 'flashbang';
import Eterna from 'eterna/Eterna';

export default class PlaySoundTask extends ObjectTask {
    constructor(name: string) {
        super();
        this._soundName = name;
    }

    protected added(): void {
        Flashbang.sound.playSound(this._soundName);
        this.destroySelf();
    }

    private readonly _soundName: string;
}
