import {Graphics} from 'pixi.js';
import {
    ToggleButton, DisplayUtil, HAlign, VAlign, ButtonState
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import GameButton from './GameButton';

export default class GameCheckbox extends ToggleButton {
    constructor(size: number, txt: string) {
        super();

        this.downSound = GameButton.DEFAULT_DOWN_SOUND;

        // setting cacheAsBitmap on these Graphics objects
        // breaks interactivity :( (PIXI bug?)

        let box = new Graphics();
        box.lineStyle(2, 0xC0DCE7);
        box.beginFill(0x0, 0.5);
        box.drawRect(0, 0, size, size);
        box.endFill();
        // box.cacheAsBitmap = true;
        this.container.addChild(box);

        this._check = new Graphics();
        this._check.lineStyle(4, 0xFFFFFF);
        this._check.moveTo(0.2 * size, 0.2 * size);
        this._check.lineTo(size * 0.5, size * 0.6);
        this._check.lineTo(size, -(size * 0.2));
        // this._check.cacheAsBitmap = true;
        this._check.visible = false;
        this.container.addChild(this._check);

        let label = Fonts.std(txt, size).color(0xC0DCE7).build();
        this.container.addChild(label);
        DisplayUtil.positionRelative(
            label, HAlign.LEFT, VAlign.CENTER,
            box, HAlign.RIGHT, VAlign.CENTER, 4, 0
        );
    }

    protected showState(state: ButtonState): void {
        this._check.visible = this.toggled.value;
    }

    private readonly _check: Graphics;
}
