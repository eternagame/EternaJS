import {Container, Graphics, Point, Text} from "pixi.js";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {TextBuilder} from "../../../flashbang/util/TextBuilder";
import {Signal} from "../../../signals/Signal";
import {UnitSignal} from "../../../signals/UnitSignal";
import {Feedback} from "../../Feedback";
import {Solution} from "../../puzzle/Solution";
import {GameButton} from "../../ui/GameButton";
import {TextInputObject} from "../../ui/TextInputObject";
import {Fonts} from "../../util/Fonts";
import {int} from "../../util/int";
import {Utility} from "../../util/Utility";
import {DesignBrowserDataType, DesignCategory} from "./DesignBrowserMode";
import {SequenceStringListView} from "./SequenceStringListView";
import {SortOrder} from "./SortOptions";

export class DataCol extends ContainerObject {
    public readonly sortOrderChanged = new Signal<SortOrder>();
    public readonly filtersChanged = new UnitSignal();
    public readonly category: DesignCategory;

    constructor(data_type: DesignBrowserDataType, category: DesignCategory,
                data_width: number, fonttype: string,
                fontSize: number, sortable: boolean) {
        super();

        this.category = category;
        this._data_type = data_type;
        this._dataWidth = data_width;
        this._fontType = fonttype;
        this._fontSize = fontSize;
        this._sortable = sortable;
    }

    public get sortOrder(): SortOrder {
        return this._sortOrder;
    }

    protected added(): void {
        super.added();

        this._graphics = new Graphics();
        this.container.addChild(this._graphics);

        let dataDisplayBuilder = new TextBuilder().font(this._fontType).fontSize(this._fontSize).color(0xffffff);
        this._line_height = dataDisplayBuilder.computeLineHeight();

        this._dataDisplay = dataDisplayBuilder.build();
        // this._dataDisplay.set_text("A\nA");
        // let metr: TextLineMetrics = this._dataDisplay.GetTextBox().getLineMetrics(0);
        // this._line_height = metr.height + metr.leading / 2;
        this._dataDisplay.position = new Point(11, DataCol.DATA_H);
        this.container.addChild(this._dataDisplay);

        this._sequencesView = new SequenceStringListView(this._fontType, this._fontSize, true, this._fontSize, this._line_height);
        this._sequencesView.position = new Point(0, DataCol.DATA_H);
        this.container.addChild(this._sequencesView);

        this._label = new GameButton().label(this.category, 14);
        this._label.display.position = new Point(11, 7);
        this.addObject(this._label, this.container);

        this._labelArrow = new Graphics();
        this._labelArrow.position = this._label.display.position;
        this.container.addChild(this._labelArrow);

        if (this._sortable) {
            this._label.clicked.connect(() => this.toggleSortState());
        }

        const TEXT_INPUT_SIZE = 13;

        if (this._data_type == DesignBrowserDataType.STRING) {
            this._filterField1 =
                new TextInputObject(TEXT_INPUT_SIZE, this._dataWidth - 22).showFakeTextInputWhenNotFocused();
            this._filterField1.tabIndex = -1; // prevent tab-selection
            this._filterField1.display.position = new Point(11, 54);
            this.addObject(this._filterField1, this.container);

            this._filterField1.valueChanged.connect(() => this.filtersChanged.emit());

            this._filterLabel1 = Fonts.arial("search", 14).color(0xffffff).build();
            this._filterLabel1.position = new Point(11, 33);
            this.container.addChild(this._filterLabel1);

        } else {
            this._filterField1 =
                new TextInputObject(TEXT_INPUT_SIZE, (this._dataWidth - 29) * 0.5).showFakeTextInputWhenNotFocused();
            this._filterField1.tabIndex = -1; // prevent tab-selection
            this._filterField1.display.position = new Point(11, 54);
            this.addObject(this._filterField1, this.container);

            this._filterField1.valueChanged.connect(() => this.filtersChanged.emit());

            this._filterLabel1 = Fonts.arial("min", 14).color(0xffffff).build();
            this._filterLabel1.position = new Point(11, 33);
            this.container.addChild(this._filterLabel1);

            this._filterField2 =
                new TextInputObject(TEXT_INPUT_SIZE, (this._dataWidth - 29) * 0.5).showFakeTextInputWhenNotFocused();
            this._filterField2.tabIndex = -1; // prevent tab-selection
            this._filterField2.display.position = new Point(11 + (this._dataWidth - 29) / 2 + 7, 54);
            this.addObject(this._filterField2, this.container);

            this._filterField2.valueChanged.connect(() => this.filtersChanged.emit());

            this._filterLabel2 = Fonts.arial("max", 14).color(0xffffff).build();
            this._filterLabel2.position = new Point((this._dataWidth - 7) / 2 + 7, 33);
            this.container.addChild(this._filterLabel2);
        }

        this.updateLayout();
    }

    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }

        this._width = width;
        this._height = height;
        if (this.isLiveObject) {
            this.updateLayout();
        }
    }

    private updateLayout(): void {
        this._sequencesView.setSize(this._width, this._height);
        this._numDisplay = Math.floor((this._height - 70 - 20) / this._line_height);
        this.updateView();
        this.bgColor = this._fillColor;
    }

    public set_pairs(pairs: number[]): void {
        this._pairsArray = pairs.slice();
    }

    private get mouseLoc(): Point {
        return this.container.toLocal(Flashbang.globalMouse);
    }

    public getMouseIndex(): [number, number] {
        let mouseLoc = this.mouseLoc;
        if (mouseLoc.y < DataCol.DATA_H) {
            return [-1, -1];
        }

        let ii = int((mouseLoc.y - DataCol.DATA_H) / this._line_height);
        if (ii >= this._numDisplay) {
            return [-1, -1];
        }

        return [ii, int(DataCol.DATA_H + (ii * this._line_height) - mouseLoc.y)];
    }

    public setFilter(filter1: string, filter2: string): void {
        this._filterField1.text = filter1;
        if (filter2 != null) {
            this._filterField2.text = filter2;
        }
    }

    public setSortState(sortOrder: SortOrder): void {
        this._sortOrder = sortOrder;

        this._labelArrow.clear();
        if (this._sortOrder == SortOrder.DECREASING) {
            this._labelArrow.beginFill(0xFFFFFF, 0.8);
            this._labelArrow.moveTo(this._label.container.width + 4, 8);
            this._labelArrow.lineTo(this._label.container.width + 14, 8);
            this._labelArrow.lineTo(this._label.container.width + 9, 18);
            this._labelArrow.lineTo(this._label.container.width + 4, 8);
            this._labelArrow.endFill();
        } else if (this._sortOrder == SortOrder.INCREASING) {
            this._labelArrow.beginFill(0xFFFFFF, 0.8);
            this._labelArrow.moveTo(this._label.container.width + 4, 18);
            this._labelArrow.lineTo(this._label.container.width + 14, 18);
            this._labelArrow.lineTo(this._label.container.width + 9, 8);
            this._labelArrow.lineTo(this._label.container.width + 4, 18);
            this._labelArrow.endFill();
        }
    }

    /** True if the solution passes our filter options */
    public shouldDisplay(sol: Solution): boolean {
        if (this._data_type == DesignBrowserDataType.STRING) {
            let query_string: string = this._filterField1.text;
            if (query_string.length == 0) {
                return true;
            }

            let target_low: string = sol.getProperty(this.category).toLowerCase();

            return (target_low.search(query_string.toLowerCase()) >= 0);
        } else {
            let query_min: string = this._filterField1.text;
            if (query_min.length > 0) {
                if (sol.getProperty(this.category) < Number(query_min)) {
                    return false;
                }
            }

            let query_max: string = this._filterField2.text;
            if (query_max.length > 0) {
                if (sol.getProperty(this.category) > Number(query_max)) {
                    return false;
                }
            }

            return true;
        }
    }

    public setWidth(w: number): void {
        this._dataWidth = w;
        this._filterField1.width = this._dataWidth;
    }

    // Draws grid text if it hasn't been drawn already
    public drawGridText(): void {
        if (this._gridNumbers != null) {
            return;
        }

        this._gridNumbers = new Container();
        this.container.addChild(this._gridNumbers);

        for (let ii = 0; ii < this._dataWidth / 280; ii++) {
            let gridstring = `${ii * 20 + 20}`;
            let gridtext = Fonts.arial(gridstring, 10).bold().build();
            gridtext.position = new Point(300 + ii * 280 - gridstring.length * 3.5, 80);
            this._gridNumbers.addChild(gridtext);
        }
    }

    public get width(): number {
        return this._dataWidth;
    }

    public set showExp(value: boolean) {
        this._showExp = value;
        this.updateView();
    }

    public set expFeedback(feedback: Feedback[]) {
        this._feedback = feedback;
    }

    public set_data_and_display(raw: any[]): void {
        this._rawData = [];

        for (let ii = 0; ii < raw.length; ii++) {
            if (this._data_type == DesignBrowserDataType.INT) {
                this._rawData.push(int(raw[ii]));
            } else if (this._data_type == DesignBrowserDataType.STRING) {
                this._rawData.push("" + raw[ii]);
            } else if (this._data_type == DesignBrowserDataType.NUMBER) {
                this._rawData.push(Number(raw[ii]));
            } else {
                throw new Error("Unrecognized data type " + this._data_type);
            }
        }

        this.updateView();
    }

    public set scrollProgress(offset: number) {
        offset = int(offset);
        if (this._offset != offset) {
            this._offset = offset;
            this.updateView();
        }
    }

    public set bgColor(color: number) {
        this._fillColor = color;

        this._graphics.clear();
        this._graphics.beginFill(color);
        this._graphics.drawRect(0, 0, this._dataWidth, this._height);
        this._graphics.endFill();

        if (this.category == "Sequence") {
            this._graphics.lineStyle(1, 0x92A8BB, 0.4);
            for (let ii = 0; ii < this._dataWidth / 70 + 1; ii++) {
                this._graphics.moveTo(ii * 70 + 90, 85);
                this._graphics.lineTo(ii * 70 + 90, this._height - 5);
            }
        }
    }

    private toggleSortState(): void {
        if (this._sortOrder == SortOrder.INCREASING) {
            this._sortOrder = SortOrder.DECREASING;
        } else if (this._sortOrder == SortOrder.DECREASING) {
            this._sortOrder = SortOrder.NONE;
        } else {
            this._sortOrder = SortOrder.INCREASING;
        }

        this.sortOrderChanged.emit(this._sortOrder);
    }

    private updateView(): void {
        let dataString = "";
        let boardData: string[] = [];
        let board_exp_data: any[] = [];

        let pairs_length: number = 0;
        if (this._pairsArray != null) {
            for (let pair of this._pairsArray) {
                if (pair >= 0) {
                    pairs_length++;
                }
            }
            pairs_length /= 2;
        }

        for (let ii = this._offset; ii < this._offset + this._numDisplay; ii++) {
            if (ii >= this._rawData.length) {
                dataString += "\n";
            } else {
                let rawstr = Utility.stripHtmlTags("" + this._rawData[ii]);

                //trace(rawstr);
                switch (this.category) {
                case DesignCategory.Sequence:
                    boardData.push(rawstr);
                    board_exp_data.push(this._feedback[ii]);

                    break;

                case DesignCategory.Votes:
                    if (this._rawData[ii] >= 0) {
                        dataString += rawstr + "\n";
                    } else {
                        dataString += "-\n";
                    }
                    break;

                case DesignCategory.My_Votes:
                    if (this._rawData[ii] >= 0) {
                        dataString += rawstr + "\n";
                    } else {
                        dataString += "-\n";
                    }

                    break;

                case DesignCategory.Synthesis_score:
                    let exp: Feedback = null;
                    if (this._feedback != null) {
                        exp = this._feedback[ii];
                    }

                    if (exp == null) {
                        dataString += "-\n";
                    } else {

                        let brent_data: any = exp.brentTheoData;
                        if (brent_data != null) {
                            dataString += Utility.roundTo(brent_data['score'], 3) + "x";
                            dataString += " (" + Utility.roundTo(brent_data['ribo_without_theo'], 3) + " / " + Utility.roundTo(brent_data['ribo_with_theo'], 3) + ")\n";
                        } else {
                            if (this._rawData[ii] >= 0) {
                                dataString += rawstr + " / 100\n";
                            } else if (this._rawData[ii] < 0) {
                                dataString += Feedback.EXPDISPLAYS[Feedback.EXPCODES.indexOf(this._rawData[ii])] + "\n";
                            } else {
                                dataString += "-\n";
                            }
                        }
                    }
                    break;

                case DesignCategory.Title:
                    dataString += rawstr + "\n";
                    break;

                case DesignCategory.Melting_Point:
                    dataString += rawstr + " 'C\n";
                    break;

                case DesignCategory.Free_Energy:
                    dataString += rawstr + " kcal\n";
                    break;

                case DesignCategory.GU_Pairs:
                    if (pairs_length > 0) {
                        dataString += rawstr + ` (${Math.round(this._rawData[ii] / pairs_length * 100)}%)\n`;
                    } else {
                        dataString += rawstr + "\n";
                    }
                    break;

                case DesignCategory.GC_Pairs:
                    if (pairs_length > 0) {
                        dataString += rawstr + ` (${Math.round(this._rawData[ii] / pairs_length * 100)}%)\n`;
                    } else {
                        dataString += rawstr + "\n";
                    }
                    break;

                case DesignCategory.UA_Pairs:
                    if (pairs_length > 0) {
                        dataString += rawstr + ` (${Math.round(this._rawData[ii] / pairs_length * 100)}%)\n`;
                    } else {
                        dataString += rawstr + "\n";
                    }
                    break;

                default:
                    dataString += rawstr + "\n";
                    break;
                }
            }
        }

        this._dataDisplay.text = dataString;

        if (boardData.length > 0) {
            if (this._showExp) {
                this._sequencesView.set_sequences(boardData, board_exp_data, this._pairsArray);
            } else {
                this._sequencesView.set_sequences(boardData, null, this._pairsArray);
            }

            this._sequencesView.position = new Point(11 + this._dataDisplay.width + 5, DataCol.DATA_H);
        } else {
            this._sequencesView.set_sequences(null, null, null);
        }
    }

    private readonly _fontType: string;
    private readonly _fontSize: number;
    private readonly _sortable: boolean;
    private readonly _data_type: DesignBrowserDataType;

    private _graphics: Graphics;

    private _width: number = 0;
    private _height: number = 0;

    private _dataDisplay: Text;

    private _rawData: any[] = [];
    private _dataWidth: number;
    private _line_height: number;
    private _label: GameButton;
    private _labelArrow: Graphics;
    private _filterField1: TextInputObject;
    private _filterField2: TextInputObject;
    private _filterLabel1: Text;
    private _filterLabel2: Text;
    private _gridNumbers: Container;
    private _offset: number = 0;

    private _numDisplay: number;
    private _sortOrder: SortOrder = SortOrder.NONE;
    private _feedback: Feedback[];
    private _showExp: boolean = false;
    private _pairsArray: number[];
    private _fillColor: number = 0;

    private _sequencesView: SequenceStringListView;

    private static readonly DATA_H = 88;
}
