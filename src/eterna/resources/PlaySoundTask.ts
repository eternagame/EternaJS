import {ObjectTask} from "../../flashbang/core/ObjectTask";
import {Eterna} from "../Eterna";

export class PlaySoundTask extends ObjectTask {
    public constructor(name: string) {
        super();
        this._soundName = name;
    }

    protected added(): void {
        Eterna.sound.playSound(this._soundName);
        this.destroySelf();
    }

    private readonly _soundName: string;
}
