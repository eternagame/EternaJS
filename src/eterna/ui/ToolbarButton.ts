import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {ButtonState} from 'flashbang/objects/Button';
import {Graphics, Sprite} from 'pixi.js';
import GameButton from './GameButton';

export const BUTTON_WIDTH = 55;
export const BUTTON_HEIGHT = 51;

export enum ButtonCategory {
    INFO = 'INFO',
    SOLVE = 'SOLVE',
    CREATE = 'CREATE',
    VIEW = 'VIEW',
    ANNOTATE = 'ANNOTATE',
    IMPORT_EXPORT = 'IMPORT/EXPORT',
    CUSTOM_LAYOUT = 'CUSTOM LAYOUT',
}

export default class ToolbarButton extends GameButton {
    public category: ButtonCategory | null = null;
    private _arrow: Sprite;

    constructor(bkColor = {color: 0, alpha: 0}) {
        super();
        const background = new Graphics()
            .beginFill(0, 0)
            .drawRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT)
            .endFill()
            .beginFill(bkColor.color, bkColor.alpha)
            .drawRoundedRect(2, 2, BUTTON_WIDTH - 4, BUTTON_HEIGHT - 4, 3)
            .endFill();
        this.container.addChildAt(background, 0);
    }

    public setCategory(category: ButtonCategory): ToolbarButton {
        this.category = category;
        return this;
    }

    protected showState(state: ButtonState): void {
        super.showState(state);
        const content = this.getContent();
        if (content.width < BUTTON_WIDTH) content.position.x = (BUTTON_WIDTH - content.width) / 2;
        if (content.height < BUTTON_HEIGHT) content.position.y = (BUTTON_HEIGHT - content.height) / 2;
    }

    protected added() {
        super.added();
        this._arrow = new Sprite(
            BitmapManager.getBitmap(Bitmaps.ImgToolbarArrow)
        );
        this._arrow.position.x = (this.container.width - this._arrow.width) / 2;
        this._arrow.visible = false;
        this.container.addChild(this._arrow);

        this.regs.add(this.toggled.connectNotify((toggled) => {
            this._arrow.visible = toggled;
        }));
    }
}
