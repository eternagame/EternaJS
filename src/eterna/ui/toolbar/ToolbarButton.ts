import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import {KeyCode} from 'flashbang';
import {ButtonState} from 'flashbang/objects/Button';
import {
    Graphics, Sprite, Texture
} from 'pixi.js';
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
    toggleColor?:{color:number, alpha:number},
    label?:string,
    fontSize?:number
};

export default class ToolbarButton extends GameButton {
    public readonly category: ButtonCategory;
    public readonly id: string;
    public readonly displayName: string;
    public readonly isPaintTool: boolean;

    constructor(info: ToolbarParam) {
        super();
        this._info = info;
        this.id = info.id;
        this.displayName = info.displayName;
        this.category = info.cat;
        this.isPaintTool = info.isPaintTool === true;

        // Hack to force buttons to be of uniform size
        const bounds = new Graphics()
            .beginFill(0)
            .drawRect(0, 0, BUTTON_WIDTH, BUTTON_HEIGHT)
            .endFill();
        bounds.alpha = 0;
        this.display.addChildAt(bounds, 0);
        this._background = new Graphics();
        this.display.addChildAt(this._background, 0);
        // In the expanded toolbar, where the buttons have no background, we want their hitarea to be
        // defined by the bounds of the icon (so that the space between icons can be used when scrolling)
        // However, the mode toggle buttons have explicit backgrounds which should be clickable, so we'll
        // keep the bounds of the entire button (including the background) as the hit area
        this._skipHitArea = !!info.color;
        // However, we want to ensure the hit targets aren't too small...
        this._minHitAreaHeight = 32;
        this._minHitAreaWidth = 32;

        this.allStates(info.allImg);
        if (info.overImg) this.over(info.overImg);
        this.disabled(info.disableImg);
        if (info.selectedImg) this.selected(info.selectedImg);
        this.tooltip(info.tooltip);
        if (info.hotKey) this.hotkey(info.hotKey);
        if (info.rscriptID) this.rscriptID(info.rscriptID);

        if (info.label) {
            this.label(info.label, info.fontSize ? info.fontSize : 14);
            this.scaleBitmapToLabel();
        }
    }

    public static createButton(info: ToolbarParam) {
        // Bit of a shame to bypass our chaining/builder pattern, but this makes it convenient
        // to define the parameters in a different file and clone ourselves
        return new ToolbarButton(info);
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
            this.drawBackground(toggled);
        }));
    }

    private drawBackground(toggled: boolean) {
        const color = this._info.color ?? {color: 0x0, alpha: 0};
        const toggleColor = this._info.toggleColor;

        const realColor = toggled && toggleColor ? toggleColor : color;
        this._background
            .beginFill(realColor.color, realColor.alpha)
            .drawRoundedRect(2, 2, BUTTON_WIDTH - 4, BUTTON_HEIGHT - 4, 3)
            .endFill();
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
    private _background: Graphics;
    private _info: ToolbarParam;
    private _enabled = new Value(false);
}
