import {Button, ButtonState} from "./Button";
import {Texture} from "pixi.js";

export class ImageButton extends Button {
    public constructor(textures: Texture[]) {
        super();
        this._textures = textures.concat();
        this._textures.length = 4;

        // Fill in substitute images for any that are missing
        this._textures[ButtonState.OVER] =
            this._textures[ButtonState.OVER] ||
            this._textures[ButtonState.DOWN] ||
            this._textures[ButtonState.UP];

        this._textures[ButtonState.DOWN] =
            this._textures[ButtonState.DOWN] ||
            this._textures[ButtonState.OVER] ||
            this._textures[ButtonState.UP];

        this._textures[ButtonState.DISABLED] =
            this._textures[ButtonState.DISABLED] ||
            this._textures[ButtonState.UP];
    }

    protected showState(state: ButtonState): void {
        this.sprite.texture = this.getTexture(state);
    }

    private getTexture(state: ButtonState): Texture {
        return this._textures[state];
    }

    private readonly _textures: Texture[];
}
