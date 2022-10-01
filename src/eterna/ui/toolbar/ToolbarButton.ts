import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import {KeyCode} from 'flashbang';
import {ButtonState} from 'flashbang/objects/Button';
import {Graphics, Sprite, Texture} from 'pixi.js';
import {Value} from 'signals';
import GameButton from '../GameButton';

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
    id: string,
    displayName: string,
    allImg: string | Texture,
    isPaintTool?: boolean;
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
    public readonly category: ButtonCategory;
    public readonly id: string;
    public readonly displayName: string;
    public readonly isPaintTool: boolean;

    constructor(
        id: string,
        displayName: string,
        category: ButtonCategory,
        isPaintTool: boolean | undefined,
        bkColor = {color: 0, alpha: 0}
    ) {
        super();
        this.id = id;
        this.displayName = displayName;
        this.category = category;
        this.isPaintTool = isPaintTool === true;
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
        // Bit of a shame to bypass our chaining/builder pattern, but this makes it convenient
        // to define the parameters in a different file and clone ourselves
        let button;
        if (info.color) {
            button = new ToolbarButton(
                info.id,
                info.displayName,
                info.cat,
                info.isPaintTool,
                info.color
            );
        } else button = new ToolbarButton(info.id, info.displayName, info.cat, info.isPaintTool);
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

        button._info = info;
        return button;
    }

    public clone(): ToolbarButton {
        const newButton = ToolbarButton.createButton(this._info);
        // Primary event handlers are registered on the initial instantiation of the button
        // exposed on the Toolbar class, so we need to forward events from the copy in the hotbar
        // to the original button. We don't need to worry about duplicate click sounds or anything
        // because that only happens on transition from state over to down, and we never entered
        // the over state
        this.regs.add(
            newButton.clicked.connect(() => {
                this.clicked.emit();
            })
        );
        // Also when this button is programmatically toggled or disabled, ensure the copy is too
        newButton.regs.add(this.toggled.connect((toggled) => {
            newButton.toggled.value = toggled;
        }));
        newButton.regs.add(this._enabled.connect((enabled) => {
            newButton.enabled = enabled;
        }));
        return newButton;
    }

    protected showState(state: ButtonState): void {
        super.showState(state);
        this.centerContent(BUTTON_WIDTH, BUTTON_HEIGHT);
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

    public set enabled(newVal: boolean) {
        super.enabled = newVal;
        this._enabled.value = newVal;
    }

    // Because we override set, we also have to override get
    public get enabled(): boolean {
        return super.enabled;
    }

    private _arrow: Sprite;
    private _info: ToolbarParam;
    private _enabled = new Value(false);
}
