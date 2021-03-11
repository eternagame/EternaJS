import {Graphics} from 'pixi.js';
import {
    ToggleButton, DisplayUtil, HAlign, VAlign, ButtonState
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import GameButton from './GameButton';

export default class GameCheckbox extends ToggleButton {
    constructor(size: number, txt: string = '', rounded: boolean = false) {
        super();

        this.downSound = GameButton.DEFAULT_DOWN_SOUND;
        this._rounded = rounded;
        this._size = size;

        // setting cacheAsBitmap on these Graphics objects
        // breaks interactivity :( (PIXI bug?)

        this._box = new Graphics();
        this._box.lineStyle(1, this._COLOR);
        this._box.beginFill(0x0, 0.001);
        if (this._rounded) {
            this._box.drawCircle(0, 0, this._size / 2);
        } else {
            this._box.drawRect(0, 0, this._size, this._size);
        }

        this._box.endFill();
        // box.cacheAsBitmap = true;
        this.container.addChild(this._box);

        this._check = new Graphics();
        this._check.lineStyle(3.5, 0xFFFFFF);
        if (this._rounded) {
            this._check.moveTo(0.3 * this._size - 12, 0.35 * this._size - 7);
            this._check.lineTo(0.5 * this._size - 12, 0.6 * this._size - 7);
            this._check.lineTo(this._size - 12, 0.1 * this._size - 7);
        } else {
            this._check.moveTo(0.3 * this._size - 3, 0.35 * this._size + 2);
            this._check.lineTo(0.5 * this._size - 3, 0.6 * this._size + 2);
            this._check.lineTo(this._size - 3, 0.1 * this._size + 2);
        }
        // this._check.cacheAsBitmap = true;
        this._check.visible = false;
        this.container.addChild(this._check);

        if (txt.length > 0) {
            const label = Fonts.std(txt, this._size).color(0xC0DCE7).build();
            this.container.addChild(label);
            DisplayUtil.positionRelative(
                label, HAlign.LEFT, VAlign.CENTER,
                this._box, HAlign.RIGHT, VAlign.CENTER, 8, 1
            );
        }
    }

    protected showState(_state: ButtonState): void {
        this._check.visible = this.toggled.value;

        this._box.clear();
        this._box.lineStyle(1, this._COLOR);
        if (this.enabled && (this.toggled.value || _state)) {
            this._box.beginFill(this._COLOR, 1);
        } else {
            this._box.beginFill(0x0, 0.001);
        }

        if (this._rounded) {
            this._box.drawCircle(0, 0, this._size / 2);
        } else {
            this._box.drawRect(0, 0, this._size, this._size);
        }
        this._box.endFill();
    }

    private readonly _check: Graphics;
    private readonly _box: Graphics;
    private readonly _rounded: boolean;
    private readonly _size: number;

    private readonly _COLOR = 0x2F94D1;
}
