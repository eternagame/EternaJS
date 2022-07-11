import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import {KeyCode} from 'flashbang';
import {ButtonState} from 'flashbang/objects/Button';
import {Graphics, Sprite, Texture} from 'pixi.js';
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
    NONE = 'None',
}

export type ToolbarParam = {
    cat:ButtonCategory,
    name: string,
    allImg: string | Texture,
    overImg?: string | Texture,
    disableImg:string | Texture,
    tooltip:string,
    selectedImg?:string | Texture,
    hotKey?:KeyCode,
    rscriptID?:RScriptUIElementID,
    color?:{color:number, alpha:number},
    label?:string,
    fontSize?:number
};

export default class ToolbarButton extends GameButton {
    public category: ButtonCategory | null = null;
    private _arrow: Sprite;
    private info: ToolbarParam = {
        cat: ButtonCategory.NONE,
        name: 'ToolbarButton',
        allImg: Bitmaps.ImgNatural,
        disableImg: Bitmaps.ImgGreyNatural,
        tooltip: 'ToolbarButton'
    };

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

    public static createButton(info: ToolbarParam) {
        let button;
        if (info.color) button = new ToolbarButton(info.color);
        else button = new ToolbarButton();
        button.setCategory(info.cat);
        button.setName(info.name);
        button.allStates(info.allImg);
        if (info.overImg) button.over(info.overImg);
        button.disabled(info.disableImg);
        if (info.selectedImg) button.selected(info.selectedImg);
        button.tooltip(info.tooltip);
        if (info.hotKey) button.hotkey(info.hotKey);
        if (info.rscriptID) button.rscriptID(info.rscriptID);

        if (info.label) {
            button.label(info.label, info.fontSize ? info.fontSize : 14);
            button.scaleBitmapToLabel();
        }

        button.info = info;
        return button;
    }

    public clone():ToolbarButton {
        this.info.tooltip = this.getToolTip();
        return ToolbarButton.createButton(this.info);
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
