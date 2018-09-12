import {Graphics} from "pixi.js";
import {HTMLTextObject} from "./HTMLTextObject";

/** A DOM-based underlined text link with some background styling. */
export class URLButton extends HTMLTextObject {
    public constructor(text: string, url: string) {
        super(URLButton.createHTML(text, url));
    }

    protected onSizeChanged(): void {
        super.onSizeChanged();
        if (this.isLiveObject) {
            if (this._background != null) {
                this._background.destroy({children: true});
            }

            const WMARGIN = 14;
            const HMARGIN = 6;
            this._background = new Graphics()
                .beginFill(0x162539, 0.8)
                .drawRoundedRect(0, 0, this.width + (WMARGIN * 2), this.height + (HMARGIN * 2), 3)
                .endFill();
            this._background.x = -WMARGIN;
            this._background.y = -HMARGIN + 2;
            this._dummyDisp.addChild(this._background);
        }
    }

    private static createHTML(text: string, url: string): string {
        return `<a href="${url}" style="color: white; font-size: 9pt; font-weight: bold"><u>${text}</u></a>`;
    }

    private _background: Graphics;
}
