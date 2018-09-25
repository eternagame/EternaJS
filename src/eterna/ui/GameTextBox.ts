import {Graphics, Point} from "pixi.js";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Fonts} from "../util/Fonts";
import {GameMultiColumnText} from "./GameMultiColumnText";
import {SliderBar} from "./SliderBar";

export class GameTextBox extends ContainerObject {
    public constructor(sizes: number[], boxname: string = "Default name") {
        super();

        this._sizes = sizes;
        this._boxName = boxname;
    }

    protected added(): void {
        super.added();

        let textWrapper = new ContainerObject();
        this.addObject(textWrapper, this.container);

        this._textWrapperBG = new Graphics();
        textWrapper.container.addChild(this._textWrapperBG);

        this._textfield = new GameMultiColumnText(Fonts.arial("", 13).color(0xffffff), this._sizes);
        this._textfield.position = new Point(GameTextBox.W_MARGIN, GameTextBox.H_MARGIN);
        textWrapper.container.addChild(this._textfield);

        this._text_slider = new SliderBar(true);
        this._text_slider.set_progress(1);
        textWrapper.addObject(this._text_slider, textWrapper.container);

        this._text_slider.scrollChanged.connect((progress) => this.set_scroll(progress));

        // textWrapper.addEventListener(MouseEvent.MOUSE_WHEEL, this.mouse_on_wheel);

        this.set_scroll(1);

        this.add_tab(this._boxName, this._sizes);
        this.select_tab_by_index(0);

        this.updateLayout();
    }

    private updateLayout(): void {
        this._textWrapperBG.clear();
        this._textWrapperBG.beginFill(0, 0);
        this._textWrapperBG.drawRoundedRect(0, 0, this._width, this._height, 15);
        this._textWrapperBG.endFill();

        this._text_slider.setSize(0, this._height - GameTextBox.H_MARGIN * 2 - 20);
        this._text_slider.display.position = new Point(this._width - GameTextBox.W_MARGIN + 3, GameTextBox.H_MARGIN + 10);

        this._textfield.setSize(this._width - 2 * GameTextBox.W_MARGIN, this._height - 2 * GameTextBox.H_MARGIN);

        this.set_scroll(this._text_slider.get_progress());
    }

    public setSize(width: number, height: number): void {
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            if (this.isLiveObject) {
                this.updateLayout();
            }
        }
    }

    public select_tab(tabname: string): void {
        let idx = this._tab_names.indexOf(tabname);
        if (idx >= 0) {
            this.select_tab_by_index(idx);
        }
    }

    public select_tab_by_index(tab: number): void {
        this._tab_progs[this._current_tab] = this._text_slider.get_progress();

        this._current_tab = tab;
        this._textfield.set_texts(this._tab_texts[tab]);
        this._textfield.adjust_size(this._tab_sizes[tab]);
        this._text_slider.set_progress(this._tab_progs[tab]);
        this.set_scroll(this._tab_progs[tab]);
    }

    public add_tab(tabname: string, sizes: number[]): void {
        if (sizes.length != this._textfield.num_columns()) {
            throw new Error("Tab size vector length does not match number of columns");
        }

        let empty_txts: string[] = [];
        for (let ii = 0; ii < this._textfield.num_columns(); ii++) {
            empty_txts.push("");
        }

        this._tab_names.push(tabname);
        this._tab_texts.push(empty_txts);
        this._tab_progs.push(1);
        this._tab_sizes.push(sizes.slice());
    }

    public add_text(txt: string[], tabname: string = null): void {
        if (txt.length != this._textfield.num_columns()) {
            throw new Error("Texts lengths do not match number of columns");
        }

        let txt_index: number = tabname != null ? this._tab_names.indexOf(tabname) : 0;
        if (txt_index < 0) {
            return;
        }

        for (let ii = 0; ii < txt.length; ii++) {
            this._tab_texts[txt_index][ii] += txt[ii];
        }

        if (this._current_tab == txt_index) {
            this._textfield.set_texts(this._tab_texts[txt_index]);
            this.set_scroll(this._text_slider.get_progress());
        }
    }

    public set_text(txt: string[], tabname: string = null): void {
        if (txt.length != this._textfield.num_columns()) {
            throw new Error("Texts lengths do not match number of columns");
        }

        let txt_index: number = tabname != null ? this._tab_names.indexOf(tabname) : 0;
        if (txt_index < 0) {
            return;
        }

        for (let ii = 0; ii < txt.length; ii++) {
            this._tab_texts[txt_index][ii] = txt[ii];
        }

        if (this._current_tab == txt_index) {
            this._textfield.set_texts(this._tab_texts[txt_index]);
            this.set_scroll(this._text_slider.get_progress());
        }
    }

    public set_scroll_to(prog: number): void {
        this._textfield.set_scroll(prog);
        this._text_slider.set_progress(prog);
    }

    private set_scroll(prog: number): void {
        this._textfield.set_scroll(prog);
    }

    private mouse_on_wheel(e: MouseEvent): void {
        // this._textfield.scroll_text(e.delta);
        //
        // let prog: number = this._textfield.get_scroll();
        // if (prog > 1) {
        //     prog = 1;
        // } else if (prog < 0) {
        //     prog = 0;
        // }
        //
        // this._text_slider.set_progress(prog);
        //
        // e.stopPropagation();
    }

    private readonly _sizes: number[];
    private readonly _boxName: string;

    private _width: number = 100;
    private _height: number = 100;

    private _textfield: GameMultiColumnText;
    private _textWrapperBG: Graphics;
    private _text_slider: SliderBar;
    private _tab_names: string[] = [];
    private _tab_texts: string[][] = [];
    private _tab_progs: number[] = [];
    private _tab_sizes: number[][] = [];
    private _current_tab: number;

    private static readonly W_MARGIN = 15;
    private static readonly H_MARGIN = 35;

}
