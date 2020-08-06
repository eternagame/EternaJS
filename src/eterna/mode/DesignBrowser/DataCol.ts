import {
    Container, Graphics, Point, IPoint, Text, Sprite, Texture
} from 'pixi.js';
import {Signal, UnitSignal} from 'signals';
import {
    ContainerObject, TextBuilder, Flashbang, Assert, VLayoutContainer, SceneObject, HAlign
} from 'flashbang';
import Feedback, {BrentTheoData} from 'eterna/Feedback';
import GameButton from 'eterna/ui/GameButton';
import TextInputObject from 'eterna/ui/TextInputObject';
import Fonts from 'eterna/util/Fonts';
import Solution from 'eterna/puzzle/Solution';
import int from 'eterna/util/int';
import UITheme from 'eterna/ui/UITheme';
import Bitmaps from 'eterna/resources/Bitmaps';
import BitmapManager from 'eterna/resources/BitmapManager';
import {SortOrder} from './SortOptions';
import SequenceStringListView from './SequenceStringListView';
import {DesignBrowserDataType, DesignCategory, DBVote} from './DesignBrowserMode';

export default class DataCol extends ContainerObject {
    public readonly sortOrderChanged = new Signal<SortOrder>();
    public readonly filtersChanged = new UnitSignal();
    public readonly voteChanged = new Signal<number>();
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
        const {designBrowser: theme} = UITheme;

        this._graphics = new Graphics();
        this.container.addChild(this._graphics);

        const dataStart = theme.headerHeight + theme.filterHeight + theme.dataPadding;
        this._lineHeight = theme.rowHeight;

        if (this._dataType !== DesignBrowserDataType.VOTE) {
            let dataDisplayBuilder = new TextBuilder()
                .font(this._fontType)
                .fontSize(this._fontSize)
                .color(0xffffff)
                .lineHeight(theme.rowHeight);
            this._lineHeight = dataDisplayBuilder.computeLineHeight();

            this._dataDisplay = dataDisplayBuilder.build();
            // this._dataDisplay.setText("A\nA");
            // let metr: TextLineMetrics = this._dataDisplay.GetTextBox().getLineMetrics(0);
            // this._lineHeight = metr.height + metr.leading / 2;
            this._dataDisplay.position = new Point(11, dataStart);
            this.container.addChild(this._dataDisplay);
        }

        this._sequencesView = new SequenceStringListView(
            this._fontType, this._fontSize, true, this._fontSize, this._lineHeight
        );
        this._sequencesView.position = new Point(0, dataStart);
        this.container.addChild(this._sequencesView);

        this._label = new GameButton().label(this.category, 14, false);
        this._label.display.position = new Point(11, 7);
        this.addObject(this._label, this.container);

        this._labelArrow = new Graphics();
        this._labelArrow.position = this._label.display.position;
        this.container.addChild(this._labelArrow);

        if (this._sortable) {
            this._label.clicked.connect(() => this.toggleSortState());
        }

        const TEXT_INPUT_SIZE = 13;

        if (this._dataType === DesignBrowserDataType.VOTE) {
            // TODO: There's probably a better way to do this
            this._filterField1 = new TextInputObject({fontSize: TEXT_INPUT_SIZE});
            this.addObject(this._filterField1);
            const voteButton = new GameButton().allStates(Bitmaps.ImgVoteHalf);
            this.regs.add(
                voteButton.pointerUp.connect((e) => {
                    e.stopPropagation();
                    if (this._filterField1.text === '') {
                        this._filterField1.text = 'Y';
                        voteButton.allStates(Bitmaps.ImgUnvote);
                    } else if (this._filterField1.text === 'Y') {
                        this._filterField1.text = 'N';
                        voteButton.allStates(Bitmaps.ImgVote);
                    } else if (this._filterField1.text === 'N') {
                        this._filterField1.text = '';
                        voteButton.allStates(Bitmaps.ImgVoteHalf);
                    }
                    this.filtersChanged.emit();
                })
            );
            this.addObject(voteButton, this.container);
            voteButton.display.position = new Point(
                (this.width / 2) - (voteButton.display.width / 2),
                theme.headerHeight + (theme.filterHeight / 2) - (voteButton.display.height / 2)
            );
        } else if (this._dataType === DesignBrowserDataType.STRING) {
            this._filterField1 = new TextInputObject({
                fontSize: TEXT_INPUT_SIZE,
                width: this._dataWidth - 22,
                placeholder: 'Search'
            });
            this._filterField1.tabIndex = -1; // prevent tab-selection
            this._filterField1.display.position = new Point(11, theme.headerHeight + theme.filterPadding);
            this.addObject(this._filterField1, this.container);

            this.regs.add(this._filterField1.valueChanged.connect(() => this.filtersChanged.emit()));
        } else {
            this._filterField1 = new TextInputObject({
                fontSize: TEXT_INPUT_SIZE,
                width: 40,
                placeholder: 'min'
            });
            this._filterField1.tabIndex = -1; // prevent tab-selection
            this._filterField1.display.position = new Point(11, theme.headerHeight + theme.filterPadding);
            this.addObject(this._filterField1, this.container);

            this.regs.add(this._filterField1.valueChanged.connect(() => this.filtersChanged.emit()));

            this._filterField2 = new TextInputObject({
                fontSize: TEXT_INPUT_SIZE,
                width: 40,
                placeholder: 'max'
            });
            this._filterField2.tabIndex = -1; // prevent tab-selection
            this._filterField2.display.position = new Point(11 + 40 + 12, theme.headerHeight + theme.filterPadding);
            this.addObject(this._filterField2, this.container);

            this.regs.add(this._filterField2.valueChanged.connect(() => this.filtersChanged.emit()));
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
        this.drawBackground();
    }

    public setPairs(pairs: number[]): void {
        this._pairsArray = pairs.slice();
    }

    public getMouseIndex(e: PIXI.interaction.InteractionEvent): [number, number] {
        const {designBrowser: theme} = UITheme;
        const dataStart = theme.headerHeight + theme.filterHeight + theme.dataPadding / 2;

        let mouseLoc = e.data.getLocalPosition(this.container);
        if (mouseLoc.y < dataStart) {
            return [-1, -1];
        }

        let ii = int((mouseLoc.y - dataStart) / this._lineHeight);
        if (ii >= this._numDisplay) {
            return [-1, -1];
        }

        return [ii, int(dataStart + (ii * this._lineHeight) - mouseLoc.y)];
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
        if (this._dataType === DesignBrowserDataType.VOTE) {
            const voted = sol.getProperty(DesignCategory.MY_VOTES) > 0;
            const queryString: string = this._filterField1.text;
            if (queryString === 'Y') return voted;
            else if (queryString === 'N') return !voted;
            else return true;
        } else if (this._dataType === DesignBrowserDataType.STRING) {
            let queryString: string = this._filterField1.text;
            if (queryString.length === 0) {
                return true;
            }

            // Will convert number to string as needed, or will keep as string.
            let targetLow: string = String(sol.getProperty(this.category)).toLowerCase();

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
        this.drawBackground();
    }

    // Draws grid text if it hasn't been drawn already
    public drawGridText(): void {
        if (this._gridNumbers != null) {
            return;
        }

        this._gridNumbers = new Container();
        this.container.addChild(this._gridNumbers);

        for (let ii = 0; ii < this._dataWidth / 300; ii++) {
            let gridstring = `${ii * 20 + 20}`;
            let gridtext = Fonts.std(gridstring, 10).bold().color(0xFFFFFF).build();
            gridtext.position = new Point(310 + ii * 300 - gridstring.length * 3.5, 80);
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

    public setDataAndDisplay(raw: (number | string | DBVote)[]): void {
        this._rawData = [];

        for (let ii = 0; ii < raw.length; ii++) {
            if (this._dataType === DesignBrowserDataType.INT) {
                this._rawData.push(int(raw[ii] as number));
            } else if (this._dataType === DesignBrowserDataType.STRING) {
                this._rawData.push(`${raw[ii]}`);
            } else if (this._dataType === DesignBrowserDataType.NUMBER) {
                this._rawData.push(Number(raw[ii]));
            } else if (this._dataType === DesignBrowserDataType.VOTE) {
                this._rawData.push(raw[ii]);
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

    public setBgColor(color: number, alpha: number) {
        this._fillColor = color;
        this._fillAlpha = alpha;
        this.drawBackground();
    }

    public setVoteStatus(index: number, voted: boolean) {
        const voteButton = this._votesContainer.getNamedObject(`vote${index}`) as GameButton;
        if (voteButton) {
            voteButton.allStates(voted ? Bitmaps.ImgUnvote : Bitmaps.ImgVote);
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
        let boardExpData: (Feedback | null)[] = [];

        if (this.category === DesignCategory.VOTE) {
            const {designBrowser: theme} = UITheme;
            const dataStart = theme.headerHeight + theme.filterHeight + theme.dataPadding;
            const dummySprite = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgVote));
            if (this._votesContainer) {
                this._votesContainer.destroySelf();
            }
            this._votesContainer = new SceneObject(new VLayoutContainer(theme.rowHeight - dummySprite.height));
            this._votesContainer.display.position = new Point(
                (this._dataWidth - dummySprite.width) / 2,
                dataStart
            );
            this.addObject(this._votesContainer, this.container);

            for (let ii = this._offset; ii < this._offset + this._numDisplay; ii++) {
                if (ii >= this._rawData.length) {
                    break;
                }
                const {canVote, voted, solutionIndex} = this._rawData[ii] as DBVote;
                if (canVote) {
                    const voteSprite = voted ? Bitmaps.ImgUnvote : Bitmaps.ImgVote;
                    const voteButton = new GameButton().allStates(voteSprite);
                    voteButton.pointerUp.connect((e) => {
                        this.voteChanged.emit(solutionIndex);
                        e.stopPropagation();
                    });
                    this._votesContainer.addNamedObject(`vote${solutionIndex}`, voteButton, this._votesContainer.target);
                } else {
                    this._votesContainer.target.addVSpacer(dummySprite.height);
                }
            }

            this._votesContainer.target.layout(true);
            return;
        }

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
                let rawstr = `${this._rawData[ii]}`;

                const fb = this._feedback ? this._feedback[ii] : null;
                switch (this.category) {
                    case DesignCategory.SEQUENCE:
                        boardData.push(rawstr);
                        boardExpData.push(fb);

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
                            let brentData: BrentTheoData | undefined = exp.brentTheoData;
                            if (brentData !== undefined) {
                                dataString += `${brentData['score'].toFixed(3)}x`;
                                dataString += ` (${brentData['ribo_without_theo'].toFixed(3)} / ${brentData['ribo_with_theo'].toFixed(3)})\n`;
                            } else if ((this._rawData[ii] as number) >= 0) {
                                dataString += `${rawstr} / 100\n`;
                            } else if ((this._rawData[ii] as number) < 0) {
                                dataString += `${Feedback.EXPDISPLAYS[Feedback.EXPCODES.indexOf(this._rawData[ii] as number)]}\n`;
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
                            dataString += `${rawstr} (${Math.round((this._rawData[ii] as number / pairsLength) * 100)}%)\n`;
                        } else {
                            dataString += `${rawstr}\n`;
                        }
                        break;

                    case DesignCategory.GC_PAIRS:
                        if (pairsLength > 0) {
                            dataString += `${rawstr} (${Math.round((this._rawData[ii] as number / pairsLength) * 100)}%)\n`;
                        } else {
                            dataString += `${rawstr}\n`;
                        }
                        break;

                    case DesignCategory.UA_PAIRS:
                        if (pairsLength > 0) {
                            dataString += `${rawstr} (${Math.round((this._rawData[ii] as number / pairsLength) * 100)}%)\n`;
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

            const {designBrowser: theme} = UITheme;
            const dataStart = theme.headerHeight + theme.filterHeight + theme.dataPadding;
            this._sequencesView.position = new Point(11 + this._dataDisplay.width + 5, dataStart);
        } else {
            this._sequencesView.setSequences(null, null, null);
        }
    }

    private drawBackground() {
        const {designBrowser: theme} = UITheme;
        this._graphics.clear();
        // Data
        this._graphics.beginFill(this._fillColor, this._fillAlpha);
        this._graphics.drawRect(
            1,
            theme.headerHeight + theme.filterHeight + 1,
            this._dataWidth - 1,
            this._height - theme.headerHeight - theme.filterHeight - 1
        );
        // Header
        this._graphics.beginFill(0x043468);
        this._graphics.drawRect(1, 1, this._dataWidth - 1, theme.headerHeight - 1);
        // Filters
        this._graphics.beginFill(0x043468, 0.5);
        this._graphics.drawRect(1, 1 + theme.headerHeight, this._dataWidth - 1, theme.filterHeight - 1);
        this._graphics.endFill();
        if (this.category === 'Sequence') {
            this._graphics.lineStyle(1, 0x92A8BB, 0.4);
            for (let ii = 0; ii < this._dataWidth / 70 + 1; ii++) {
                this._graphics.moveTo(ii * 75 + 92, 85);
                this._graphics.lineTo(ii * 75 + 92, this._height - 5);
            }
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
    private _votesContainer: SceneObject<VLayoutContainer>;

    private _rawData: (string | number | DBVote)[] = [];
    private _dataWidth: number;
    private _lineHeight: number;
    private _label: GameButton;
    private _labelArrow: Graphics;
    private _filterField1: TextInputObject;
    private _filterField2: TextInputObject;
    private _gridNumbers: Container;
    private _offset: number = 0;

    private _numDisplay: number;
    private _sortOrder: SortOrder = SortOrder.NONE;
    private _feedback: (Feedback | null)[] | null;
    private _showExp: boolean = false;
    private _pairsArray: number[];
    private _fillColor: number = 0;
    private _fillAlpha: number = 0;

    private _sequencesView: SequenceStringListView;
}
