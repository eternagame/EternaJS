import {Container, Graphics, Point, Text} from "pixi.js";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {TextBuilder} from "../../../flashbang/util/TextBuilder";
import {Feedback} from "../../Feedback";
import {Solution} from "../../puzzle/Solution";
import {GameButton} from "../../ui/GameButton";
import {TextInputObject} from "../../ui/TextInputObject";
import {Fonts} from "../../util/Fonts";
import {Utility} from "../../util/Utility";
import {DesignBrowserDataType} from "./DesignBrowserDataType";
import {SequenceBoard} from "./SequenceBoard";

export class DataCol extends ContainerObject {
    constructor(data_type: number, exp: string,
                data_width: number, fonttype: string,
                size: number, bold: boolean, click_sortable: boolean) {
        super();

        this._data_type = data_type;
        this._data_width = data_width;
        this._exp = exp;

        this._graphics = new Graphics();
        this.container.addChild(this._graphics);

        this._data_display = new TextBuilder().font(fonttype).fontSize(size).bold(bold).build();

        // this._data_display.set_text("A\nA");
        // let metr: TextLineMetrics = this._data_display.GetTextBox().getLineMetrics(0);
        // this._line_height = metr.height + metr.leading / 2;
        this._data_display.text = "A";
        this._line_height = this._data_display.height;

        this._data_display.text = "";
        this._data_display.position = new Point(11, DataCol.DATA_H);
        this.container.addChild(this._data_display);

        this._sequence_board = new SequenceBoard(fonttype, size, true, size, this._line_height);
        this._sequence_board.display.position = new Point(0, DataCol.DATA_H);
        this.addObject(this._sequence_board, this.container);

        this._label = new GameButton().label(exp, 14);
        this._label.display.position = new Point(11, 7);
        this.addObject(this._label, this.container);

        this._labelArrow = new Graphics();
        this._labelArrow.position = this._label.display.position;
        this.container.addChild(this._labelArrow);

        if (click_sortable) {
            this._label.clicked.connect(() => this.toggle_sort_state());
        }

        if (data_type == DesignBrowserDataType.STRING) {
            this._input_field = new TextInputObject(17, this._data_width - 22);
            this._input_field.display.position = new Point(11, 54);
            this.addObject(this._input_field, this.container);
            // this._input_field.addEventListener(KeyboardEvent.KEY_UP, this.handle_key_down);

            this._field_string = Fonts.arial("search", 14).bold().build();
            this._field_string.position = new Point(11, 33);
            this.container.addChild(this._field_string);

        } else {
            this._input_field = new TextInputObject(17, (this._data_width - 29) * 0.5);
            this._input_field.display.position = new Point(11, 54);
            this.addObject(this._input_field, this.container);
            // this._input_field.addEventListener(KeyboardEvent.KEY_UP, this.handle_key_down);

            this._field_string = Fonts.arial("min", 14).build();
            this._field_string.position = new Point(11, 33);
            this.container.addChild(this._field_string);

            this._input_field2 = new TextInputObject(17, (this._data_width - 29) * 0.5);
            this._input_field2.display.position = new Point(11 + (this._data_width - 29) / 2 + 7, 54);
            this.addObject(this._input_field2, this.container);
            // this._input_field2.addEventListener(KeyboardEvent.KEY_UP, this.handle_key_down);

            this._field_string2 = Fonts.arial("max", 14).build();
            this._field_string2.position = new Point((this._data_width - 7) / 2 + 7, 33);
            this.container.addChild(this._field_string2);
        }
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;
    }

    public set_pairs(pairs: number[]): void {
        this._pairs_array = pairs.slice();
    }

    private get mouseLoc(): Point {
        return this.container.toLocal(Flashbang.globalMouse);
    }

    public get_current_mouse_index(): number[] {
        let index: number[] = [];
        let mouseLoc = this.mouseLoc;

        if (mouseLoc.y < DataCol.DATA_H) {
            return [0, DataCol.DATA_H - mouseLoc.y];
        }

        let ii = (mouseLoc.y - DataCol.DATA_H) / this._line_height;

        if (ii >= this._num_display) {
            return [this._num_display - 1, DataCol.DATA_H + (this._num_display - 1) * this._line_height - mouseLoc.y];
        }

        return [ii, DataCol.DATA_H + (ii) * this._line_height - mouseLoc.y];

    }

    public set_filter(filter1: string, filter2: string): void {
        this._input_field.text = filter1;
        if (filter2 != null) {
            this._input_field2.text = filter2;
        }
    }

    public set_sort_state(sort_state: number): void {
        this._sort_state = sort_state;

        this._labelArrow.clear();
        if (this._sort_state == -1) {
            this._labelArrow.beginFill(0xFFFFFF, 0.8);
            this._labelArrow.moveTo(this._label.container.width + 4, 8);
            this._labelArrow.lineTo(this._label.container.width + 14, 8);
            this._labelArrow.lineTo(this._label.container.width + 9, 18);
            this._labelArrow.lineTo(this._label.container.width + 4, 8);
            this._labelArrow.endFill();
        } else if (this._sort_state == 0) {

        } else {
            this._labelArrow.beginFill(0xFFFFFF, 0.8);
            this._labelArrow.moveTo(this._label.container.width + 4, 18);
            this._labelArrow.lineTo(this._label.container.width + 14, 18);
            this._labelArrow.lineTo(this._label.container.width + 9, 8);
            this._labelArrow.lineTo(this._label.container.width + 4, 18);
            this._labelArrow.endFill();
        }
    }

    public is_qualified(sol: Solution): boolean {
        if (this._data_type == DesignBrowserDataType.STRING) {
            let query_string: string = this._input_field.text;
            if (query_string.length == 0) {
                return true;
            }

            let target_low: string = sol.getProperty(this._exp).toLowerCase();

            return (target_low.search(query_string.toLowerCase()) >= 0);
        } else {
            let query_min: string = this._input_field.text;
            if (query_min.length > 0) {
                if (sol.getProperty(this._exp) < Number(query_min)) {
                    return false;
                }
            }

            let query_max: string = this._input_field2.text;
            if (query_max.length > 0) {
                if (sol.getProperty(this._exp) > Number(query_max)) {
                    return false;
                }
            }

            return true;
        }
    }

    public set_reorganize_callback(reorganize: Function): void {
        this._reorganize = reorganize;
    }

    public set_update_sort_callback(update_sort: Function): void {
        this._update_sort = update_sort;
    }

    public get_exp(): string {
        return this._exp;
    }

    public set_width(w: number): void {
        this._data_width = w;
        this._input_field.width = this._data_width;
    }

    // Draws grid text if it hasn't been drawn already
    public draw_grid_text(): void {
        if (this._grid_numbers != null) {
            return;
        }

        this._grid_numbers = new Container();
        this.container.addChild(this._grid_numbers);

        for (let ii = 0; ii < this._data_width / 280; ii++) {
            let gridstring = `${ii * 20 + 20}`;
            let gridtext = Fonts.arial(gridstring, 10).bold().build();
            gridtext.position = new Point(300 + ii * 280 - gridstring.length * 3.5, 80);
            this._grid_numbers.addChild(gridtext);
        }
    }

    public get_width(): number {
        return this._data_width;
    }

    public set_show_exp(show_exp_data: boolean): void {
        this._show_exp_data = show_exp_data;
        this.display_data();
    }

    public set_exp_data(exp_data: any[]): void {
        this._exp_data = exp_data;
    }

    //Set Raw Data for each Column
    public set_data_and_display(raw: any[]): void {
        this._raw_col_data = [];

        for (let ii = 0; ii < raw.length; ii++) {
            if (this._data_type == DesignBrowserDataType.INT) {
                this._raw_col_data.push(Number(raw[ii]));
            } else if (this._data_type == DesignBrowserDataType.STRING) {
                this._raw_col_data.push(raw[ii]);
            } else if (this._data_type == DesignBrowserDataType.NUMBER) {
                this._raw_col_data.push(Number(raw[ii]));
            } else {
                throw new Error("Unrecognized data type " + this._data_type);
            }
        }
        //Initial Display
        this.display_data();
    }

    public set_progress(offset: number): void {
        this._offset = offset;
        this.display_data();
    }

    public set_column_color(col: number): void {
        this._col = col;

        this._graphics.clear();
        this._graphics.beginFill(col);
        this._graphics.drawRect(0, 0, this._data_width, this._height);
        this._graphics.endFill();

        if (this._exp == "Sequence") {
            this._graphics.lineStyle(1, 0x92A8BB, 0.4);
            for (let ii = 0; ii < this._data_width / 70 + 1; ii++) {
                this._graphics.moveTo(ii * 70 + 90, 85);
                this._graphics.lineTo(ii * 70 + 90, this._height - 5);
            }
        }
    }

    /*override*/
    protected on_resize(): void {
        this._num_display = Number((this._height - 70 - 20) / this._line_height);
        this.display_data();
        this.set_column_color(this._col);
    }

    private toggle_sort_state(): void {
        if (this._sort_state == 1) {
            this._sort_state = -1;
        } else if (this._sort_state == -1) {
            this._sort_state = 0;
        } else {
            this._sort_state = 1;
        }

        if (this._update_sort != null) {
            this._update_sort(this._exp, this._sort_state, null);
        }
    }

    private handle_key_down(e: KeyboardEvent): void {
        if (this._reorganize != null) {
            this._reorganize(false);
        }
        e.stopPropagation();
    }

    private display_data(): void {

        let data_string: string = "<span class='altColText'>";
        let board_data: string[] = [];
        let board_exp_data: any[] = [];

        let pairs_length: number = 0;
        if (this._pairs_array != null) {
            for (let jj: number = 0; jj < this._pairs_array.length; jj++) {
                if (this._pairs_array[jj] >= 0) {
                    pairs_length++;
                }
            }

            pairs_length /= 2;
        }

        for (let ii = this._offset; ii < this._offset + this._num_display; ii++) {
            if (ii >= this._raw_col_data.length) {
                data_string += "\n";
            } else {
                let rawstr: string = Utility.stripHtmlTags(this._raw_col_data[ii]);

                //trace(rawstr);
                switch (this._exp) {
                case "Sequence":
                    board_data.push(rawstr);
                    board_exp_data.push(this._exp_data[ii]);

                    break;

                case "Votes":
                    if (this._raw_col_data[ii] >= 0) {
                        data_string += rawstr + "\n";
                    } else {
                        data_string += "-\n";
                    }
                    break;

                case "My Votes":
                    if (this._raw_col_data[ii] >= 0) {
                        data_string += rawstr + "\n";
                    } else {
                        data_string += "-\n";
                    }

                    break;

                case "Synthesis score":
                    let exp: Feedback = null;
                    if (this._exp_data != null) {
                        exp = this._exp_data[ii];
                    }

                    if (exp == null) {
                        data_string += "-\n";
                    } else {

                        let brent_data: any = exp.brentTheoData;
                        if (brent_data != null) {
                            data_string += Utility.roundTo(brent_data['score'], 3) + "x";
                            data_string += " (" + Utility.roundTo(brent_data['ribo_without_theo'], 3) + " / " + Utility.roundTo(brent_data['ribo_with_theo'], 3) + ")\n";
                        } else {
                            if (this._raw_col_data[ii] >= 0) {
                                data_string += rawstr + " / 100\n";
                            } else if (this._raw_col_data[ii] < 0) {
                                data_string += Feedback.EXPDISPLAYS[Feedback.EXPCODES.indexOf(this._raw_col_data[ii])] + "\n";
                            } else {
                                data_string += "-\n";
                            }
                        }
                    }
                    break;

                case "Title":
                    data_string += rawstr + "\n";
                    break;

                case "Melting Point":
                    data_string += rawstr + " 'C\n";
                    break;

                case "Free Energy":
                    data_string += rawstr + " kcal\n";
                    break;

                case "GU Pairs":
                    if (pairs_length > 0) {
                        data_string += rawstr + " (" + Math.round(this._raw_col_data[ii] / pairs_length * 100) + "%)\n";
                    } else {
                        data_string += rawstr + "\n";
                    }
                    break;

                case "GC Pairs":
                    if (pairs_length > 0) {
                        data_string += rawstr + " (" + Math.round(this._raw_col_data[ii] / pairs_length * 100) + "%)\n";
                    } else {
                        data_string += rawstr + "\n";
                    }
                    break;

                case "UA Pairs":
                    if (pairs_length > 0) {
                        data_string += rawstr + " (" + Math.round(this._raw_col_data[ii] / pairs_length * 100) + "%)\n";
                    } else {
                        data_string += rawstr + "\n";
                    }
                    break;

                default:
                    data_string += rawstr + "\n";
                    break;

                }
            }
        }

        data_string += "</span>";
        this._data_display.text = data_string;

        if (board_data.length > 0) {
            if (this._show_exp_data) {
                this._sequence_board.set_sequences(board_data, board_exp_data, this._pairs_array);
            } else {
                this._sequence_board.set_sequences(board_data, null, this._pairs_array);
            }

            this._sequence_board.display.position = new Point(11 + this._data_display.width + 5, DataCol.DATA_H);
        } else {
            this._sequence_board.set_sequences(null, null, null);
        }
    }

    private _graphics: Graphics;

    private _width: number;
    private _height: number;

    private _data_display: Text;

    private _raw_col_data: any[] = [];
    private _exp: string;
    private _data_type: number;
    private _data_width: number;
    private _line_height: number;
    private _label: GameButton;
    private _labelArrow: Graphics;
    private _input_field: TextInputObject;
    private _input_field2: TextInputObject;
    private _field_string: Text;
    private _field_string2: Text;
    private _grid_numbers: Container;
    private _offset: number = 0;

    private _num_display: number;
    private _reorganize: Function;
    private _update_sort: Function;
    private _sort_state: number = 0;
    private _exp_data: any[];
    private _show_exp_data: boolean = false;
    private _pairs_array: number[];
    private _col: number = 0;

    private _sequence_board: SequenceBoard;

    private static readonly DATA_H = 88;
}
