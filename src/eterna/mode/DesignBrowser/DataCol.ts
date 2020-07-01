import {
    Container, Graphics, Point, IPoint, Text
} from 'pixi.js';
import {Signal, UnitSignal} from 'signals';
import {
    ContainerObject, TextBuilder, Flashbang, Assert
} from 'flashbang';
import Feedback from 'eterna/Feedback';
import GameButton from 'eterna/ui/GameButton';
import TextInputObject from 'eterna/ui/TextInputObject';
import Fonts from 'eterna/util/Fonts';
import Solution from 'eterna/puzzle/Solution';
import int from 'eterna/util/int';
import Utility from 'eterna/util/Utility';
import {SortOrder} from './SortOptions';
import SequenceStringListView from './SequenceStringListView';
import {DesignBrowserDataType, DesignCategory} from './DesignBrowserMode';

export default class DataCol extends ContainerObject {
    public readonly sortOrderChanged = new Signal<SortOrder>();
    public readonly filtersChanged = new UnitSignal();
    public readonly category: DesignCategory;

    constructor(dataType: DesignBrowserDataType, category: DesignCategory,
        dataWidth: number, fonttype: string,
        fontSize: number, sortable: boolean) {
        super();

        this.category = category;
        this._dataType = dataType;
        this._dataWidth = dataWidth;
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
        this._lineHeight = dataDisplayBuilder.computeLineHeight();

        this._dataDisplay = dataDisplayBuilder.build();
        // this._dataDisplay.setText("A\nA");
        // let metr: TextLineMetrics = this._dataDisplay.GetTextBox().getLineMetrics(0);
        // this._lineHeight = metr.height + metr.leading / 2;
        this._dataDisplay.position = new Point(11, DataCol.DATA_H);
        this.container.addChild(this._dataDisplay);

        this._sequencesView = new SequenceStringListView(
            this._fontType, this._fontSize, true, this._fontSize, this._lineHeight
        );
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

        if (this._dataType === DesignBrowserDataType.STRING) {
            this._filterField1 = new TextInputObject(
                TEXT_INPUT_SIZE, this._dataWidth - 22
            ).showFakeTextInputWhenNotFocused();
            this._filterField1.tabIndex = -1; // prevent tab-selection
            this._filterField1.display.position = new Point(11, 54);
            this.addObject(this._filterField1, this.container);

            this._filterField1.valueChanged.connect(() => this.filtersChanged.emit());

            this._filterLabel1 = Fonts.arial('search', 14).color(0xffffff).build();
            this._filterLabel1.position = new Point(11, 33);
            this.container.addChild(this._filterLabel1);
        } else {
            this._filterField1 = new TextInputObject(
                TEXT_INPUT_SIZE, (this._dataWidth - 29) * 0.5
            ).showFakeTextInputWhenNotFocused();
            this._filterField1.tabIndex = -1; // prevent tab-selection
            this._filterField1.display.position = new Point(11, 54);
            this.addObject(this._filterField1, this.container);

            this._filterField1.valueChanged.connect(() => this.filtersChanged.emit());

            this._filterLabel1 = Fonts.arial('min', 14).color(0xffffff).build();
            this._filterLabel1.position = new Point(11, 33);
            this.container.addChild(this._filterLabel1);

            this._filterField2 = new TextInputObject(
                TEXT_INPUT_SIZE, (this._dataWidth - 29) * 0.5
            ).showFakeTextInputWhenNotFocused();
            this._filterField2.tabIndex = -1; // prevent tab-selection
            this._filterField2.display.position = new Point(11 + (this._dataWidth - 29) / 2 + 7, 54);
            this.addObject(this._filterField2, this.container);

            this._filterField2.valueChanged.connect(() => this.filtersChanged.emit());

            this._filterLabel2 = Fonts.arial('max', 14).color(0xffffff).build();
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
        this._numDisplay = Math.floor((this._height - 70 - 20) / this._lineHeight);
        this.updateView();
        this.bgColor = this._fillColor;
    }

    public setPairs(pairs: number[]): void {
        this._pairsArray = pairs.slice();
    }

    // AMW TODO POINT IPOINT
    private get mouseLoc(): IPoint {
        Assert.assertIsDefined(Flashbang.globalMouse);
        return this.container.toLocal(Flashbang.globalMouse);
    }

    public getMouseIndex(): [number, number] {
        let {mouseLoc} = this;
        if (mouseLoc.y < DataCol.DATA_H) {
            return [-1, -1];
        }

        let ii = int((mouseLoc.y - DataCol.DATA_H) / this._lineHeight);
        if (ii >= this._numDisplay) {
            return [-1, -1];
        }

        return [ii, int(DataCol.DATA_H + (ii * this._lineHeight) - mouseLoc.y)];
    }

    public setFilter(filter1: string | undefined, filter2: string | undefined): void {
        if (filter1 !== undefined) {
            this._filterField1.text = filter1;
        }
        if (filter2 !== undefined) {
            this._filterField2.text = filter2;
        }
    }

    public setSortState(sortOrder: SortOrder): void {
        this._sortOrder = sortOrder;

        this._labelArrow.clear();
        if (this._sortOrder === SortOrder.DECREASING) {
            this._labelArrow.beginFill(0xFFFFFF, 0.8);
            this._labelArrow.moveTo(this._label.container.width + 4, 8);
            this._labelArrow.lineTo(this._label.container.width + 14, 8);
            this._labelArrow.lineTo(this._label.container.width + 9, 18);
            this._labelArrow.lineTo(this._label.container.width + 4, 8);
            this._labelArrow.endFill();
        } else if (this._sortOrder === SortOrder.INCREASING) {
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
        if (this._dataType === DesignBrowserDataType.STRING) {
            let queryString: string = this._filterField1.text;
            if (queryString.length === 0) {
                return true;
            }

            let targetLow: string = sol.getProperty(this.category).toLowerCase();

            return (targetLow.search(queryString.toLowerCase()) >= 0);
        } else {
            let queryMin: string = this._filterField1.text;
            if (queryMin.length > 0) {
                if (sol.getProperty(this.category) < Number(queryMin)) {
                    return false;
                }
            }

            let queryMax: string = this._filterField2.text;
            if (queryMax.length > 0) {
                if (sol.getProperty(this.category) > Number(queryMax)) {
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

    public set expFeedback(feedback: (Feedback | null)[]) {
        this._feedback = feedback;
    }

    public setDataAndDisplay(raw: any[]): void {
        this._rawData = [];

        for (let ii = 0; ii < raw.length; ii++) {
            if (this._dataType === DesignBrowserDataType.INT) {
                this._rawData.push(int(raw[ii]));
            } else if (this._dataType === DesignBrowserDataType.STRING) {
                this._rawData.push(`${raw[ii]}`);
            } else if (this._dataType === DesignBrowserDataType.NUMBER) {
                this._rawData.push(Number(raw[ii]));
            } else {
                throw new Error(`Unrecognized data type ${this._dataType}`);
            }
        }

        this.updateView();
    }

    public set scrollProgress(offset: number) {
        offset = int(offset);
        if (this._offset !== offset) {
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

        if (this.category === 'Sequence') {
            this._graphics.lineStyle(1, 0x92A8BB, 0.4);
            for (let ii = 0; ii < this._dataWidth / 70 + 1; ii++) {
                this._graphics.moveTo(ii * 70 + 90, 85);
                this._graphics.lineTo(ii * 70 + 90, this._height - 5);
            }
        }
    }

    private toggleSortState(): void {
        if (this._sortOrder === SortOrder.INCREASING) {
            this._sortOrder = SortOrder.DECREASING;
        } else if (this._sortOrder === SortOrder.DECREASING) {
            this._sortOrder = SortOrder.NONE;
        } else {
            this._sortOrder = SortOrder.INCREASING;
        }

        this.sortOrderChanged.emit(this._sortOrder);
    }

    private updateView(): void {
        let dataString = '';
        let boardData: string[] = [];
        let boardExpData: any[] = [];

        let pairsLength = 0;
        if (this._pairsArray != null) {
            for (let pair of this._pairsArray) {
                if (pair >= 0) {
                    pairsLength++;
                }
            }
            pairsLength /= 2;
        }

        for (let ii = this._offset; ii < this._offset + this._numDisplay; ii++) {
            if (ii >= this._rawData.length) {
                dataString += '\n';
            } else {
                let rawstr = Utility.stripHtmlTags(`${this._rawData[ii]}`);

                // trace(rawstr);
                switch (this.category) {
                    case DesignCategory.SEQUENCE:
                        boardData.push(rawstr);
                        boardExpData.push(this._feedback[ii]);

                        break;

                    case DesignCategory.VOTES:
                        if (this._rawData[ii] >= 0) {
                            dataString += `${rawstr}\n`;
                        } else {
                            dataString += '-\n';
                        }
                        break;

                    case DesignCategory.MY_VOTES:
                        if (this._rawData[ii] >= 0) {
                            dataString += `${rawstr}\n`;
                        } else {
                            dataString += '-\n';
                        }

                        break;

                    case DesignCategory.SYNTHESIS_SCORE: {
                        let exp: Feedback | null = null;
                        if (this._feedback != null) {
                            exp = this._feedback[ii];
                        }

                        if (exp == null) {
                            dataString += '-\n';
                        } else {
                            let brentData: any = exp.brentTheoData;
                            if (brentData != null) {
                                dataString += `${brentData['score'].toFixed(3)}x`;
                                dataString += ` (${brentData['ribo_without_theo'].toFixed(3)} / ${brentData['ribo_with_theo'].toFixed(3)})\n`;
                            } else if (this._rawData[ii] >= 0) {
                                dataString += `${rawstr} / 100\n`;
                            } else if (this._rawData[ii] < 0) {
                                dataString += `${Feedback.EXPDISPLAYS[Feedback.EXPCODES.indexOf(this._rawData[ii])]}\n`;
                            } else {
                                dataString += '-\n';
                            }
                        }
                        break;
                    }
                    case DesignCategory.TITLE:
                        dataString += `${rawstr}\n`;
                        break;

                    case DesignCategory.MELTING_POINT:
                        dataString += `${rawstr} 'C\n`;
                        break;

                    case DesignCategory.FREE_ENERGY:
                        dataString += `${rawstr} kcal\n`;
                        break;

                    case DesignCategory.GU_PAIRS:
                        if (pairsLength > 0) {
                            dataString += `${rawstr} (${Math.round((this._rawData[ii] / pairsLength) * 100)}%)\n`;
                        } else {
                            dataString += `${rawstr}\n`;
                        }
                        break;

                    case DesignCategory.GC_PAIRS:
                        if (pairsLength > 0) {
                            dataString += `${rawstr} (${Math.round((this._rawData[ii] / pairsLength) * 100)}%)\n`;
                        } else {
                            dataString += `${rawstr}\n`;
                        }
                        break;

                    case DesignCategory.UA_PAIRS:
                        if (pairsLength > 0) {
                            dataString += `${rawstr} (${Math.round((this._rawData[ii] / pairsLength) * 100)}%)\n`;
                        } else {
                            dataString += `${rawstr}\n`;
                        }
                        break;

                    default:
                        dataString += `${rawstr}\n`;
                        break;
                }
            }
        }

        this._dataDisplay.text = dataString;

        if (boardData.length > 0) {
            if (this._showExp) {
                this._sequencesView.setSequences(boardData, boardExpData, this._pairsArray);
            } else {
                this._sequencesView.setSequences(boardData, null, this._pairsArray);
            }

            this._sequencesView.position = new Point(11 + this._dataDisplay.width + 5, DataCol.DATA_H);
        } else {
            this._sequencesView.setSequences(null, null, null);
        }
    }

    private readonly _fontType: string;
    private readonly _fontSize: number;
    private readonly _sortable: boolean;
    private readonly _dataType: DesignBrowserDataType;

    private _graphics: Graphics;

    private _width: number = 0;
    private _height: number = 0;

    private _dataDisplay: Text;

    private _rawData: any[] = [];
    private _dataWidth: number;
    private _lineHeight: number;
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
    private _feedback: (Feedback | null)[];
    private _showExp: boolean = false;
    private _pairsArray: number[];
    private _fillColor: number = 0;

    private _sequencesView: SequenceStringListView;

    private static readonly DATA_H = 88;
}
