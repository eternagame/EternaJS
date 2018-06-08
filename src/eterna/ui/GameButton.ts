import {Graphics, Sprite, Text, Texture, Point} from "pixi.js";
import {ButtonState} from "../../flashbang/objects/Button";
import {ToggleButton} from "../../flashbang/objects/ToggleButton";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {TextBuilder} from "../../flashbang/util/TextBuilder";
import {Fonts} from "../util/Fonts";

export class GameButton extends ToggleButton {
    public constructor() {
        super();

        this._img = new Sprite();
        this.container.addChild(this._img);

        this.clicked.connect(() => {
            if (this._selectedTexture != null) {
                this.toggle();
            }
        });
    }

    public up(tex: Texture | string): GameButton {
        return this.setTexture(ButtonState.UP, tex);
    }

    public over(tex: Texture | string): GameButton {
        return this.setTexture(ButtonState.OVER, tex);
    }

    public down(tex: Texture | string): GameButton {
        return this.setTexture(ButtonState.DOWN, tex);
    }

    public disabled(tex: Texture | string): GameButton {
        return this.setTexture(ButtonState.DISABLED, tex);
    }

    /** Sets a single texture for all states */
    public allStates(tex: Texture | string): GameButton {
        return this.up(tex).over(tex).down(tex).disabled(tex);
    }

    public selected(tex: Texture | string): GameButton {
        this._selectedTexture = (tex instanceof Texture ? tex as Texture : Texture.fromImage(tex as string));
        return this;
    }

    public get isSelected(): boolean {
        return this.toggled.value;
    }

    public text(text: string | TextBuilder, fontSize?: number): GameButton {
        if (typeof(text) === "string") {
            this._labelBuilder = Fonts.arial(text as string).fontSize(fontSize ? fontSize : 22).color(0xFFFFFF);
        } else {
            this._labelBuilder = text as TextBuilder;
        }
        this.needsRedraw();
        return this;
    }

    public scaleBitmapToLabel(): GameButton {
        this._scaleBitmapToLabel = true;
        this.needsRedraw();
        return this;
    }

    public tooltip(text: string): GameButton {
        // TODO
        this._tooltip = text;
        return this;
    }

    public hotkey(keycode: string, ctrl: boolean = false): GameButton {
        // TODO
        this._hotkey = keycode;
        this._hotkeyCtrl = ctrl;
        return this;
    }

    protected showState(state: ButtonState): void {
        let tex: Texture = this.getTexture(state, this.isSelected);
        this._img.texture = tex || Texture.EMPTY;

        // Create label
        if (this._label != null) {
            DisplayUtil.removeFromParent(this._label);
            this._label = null;
        }

        if (this._labelBuilder != null) {
            this._label = this._labelBuilder.color(GameButton.TEXT_COLORS.get(state) || 0xffffff).build();
        }

        // Stylebox (shown when we have text and no background image)
        const drawStyleBox: boolean = tex == null && this._label != null;
        if (drawStyleBox) {
            if (this._styleBox == null) {
                this._styleBox = new Graphics();
                this.container.addChildAt(this._styleBox, 1);
            }

            this._styleBox.clear();
            this._styleBox.beginFill(GameButton.STYLEBOX_COLORS.get(state) || 0x0);
            this._styleBox.drawRoundedRect(0, 0,
                this._label.width + (GameButton.WMARGIN * 2),
                this._label.height + (GameButton.HMARGIN * 2),
                5);
            this._styleBox.endFill();

        } else if (this._styleBox != null) {
            DisplayUtil.removeFromParent(this._styleBox);
            this._styleBox = null;
        }

        // Position label
        this._img.scale = new Point(1, 1);
        if (this._label != null) {
            if (this._scaleBitmapToLabel) {
                let scale: number = 1.5 * this._label.height / this._img.height;
                this._img.scale = new Point(scale, scale);
            }

            this._label.position = tex == null ?
                new Point(0, 0) :
                new Point(this._img.width + 5, (this._img.height - this._label.height) * 0.5);
            this.container.addChild(this._label);
        }
    }

    private setTexture(state: ButtonState, tex: Texture | string) :GameButton {
        if (this._buttonStateTextures == null) {
            this._buttonStateTextures = [];
        }
        this._buttonStateTextures[state] = (tex instanceof Texture ? tex as Texture : Texture.fromImage(tex as string));

        this.needsRedraw();

        return this;
    }

    private needsRedraw() {
        if (this.isLiveObject) {
            this.showState(this._state);
        }
    }

    private getTexture(state: ButtonState, selected: boolean): Texture {
        if (selected && this._selectedTexture != null) {
            return this._selectedTexture;
        } else {
            return this._buttonStateTextures != null && this._buttonStateTextures.length > state ?
                this._buttonStateTextures[state] :
                null;
        }
    }

    private readonly _img: Sprite;
    private _label: Text;
    private _styleBox: Graphics;

    private _labelBuilder: TextBuilder;
    private _scaleBitmapToLabel: boolean = false;
    private _tooltip: string;
    private _hotkey: string;
    private _hotkeyCtrl: boolean;
    private _buttonStateTextures: Texture[];
    private _selectedTexture: Texture;

    private static TEXT_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0xC0DCE7],
        [ButtonState.OVER, 0xFFFFFF],
        [ButtonState.DOWN, 0x333333]
    ]);

    private static STYLEBOX_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0x2D4159],
        [ButtonState.OVER, 0x2D4159],
        [ButtonState.DOWN, 0xFFCC00]
    ]);

    private static readonly WMARGIN: number = 4;
    private static readonly HMARGIN: number = 3;
}
