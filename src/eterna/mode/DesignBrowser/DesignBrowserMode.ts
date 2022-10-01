import * as log from 'loglevel';
import MultiStyleText from 'pixi-multistyle-text';
import {
    Container, InteractionEvent, Sprite
} from 'pixi.js';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Eterna from 'eterna/Eterna';
import GameMode from 'eterna/mode/GameMode';
import Puzzle from 'eterna/puzzle/Puzzle';
import Fonts from 'eterna/util/Fonts';
import SliderBar from 'eterna/ui/SliderBar';
import {
    ContainerObject, DisplayUtil, HAlign, VAlign, RepeatingTask, SerialTask, DelayTask, CallbackTask,
    MathUtil, Flashbang, LocationTask, Easing, HLayoutContainer, Assert, InputUtil
} from 'flashbang';
import GameButton from 'eterna/ui/GameButton';
import Bitmaps from 'eterna/resources/Bitmaps';
import BitmapManager from 'eterna/resources/BitmapManager';
import Solution from 'eterna/puzzle/Solution';
import SolutionManager from 'eterna/puzzle/SolutionManager';
import int from 'eterna/util/int';
import EternaURL from 'eterna/net/EternaURL';
import UITheme from 'eterna/ui/UITheme';
import {AchievementData} from 'eterna/achievements/AchievementManager';
import {FontWeight} from 'flashbang/util/TextBuilder';
import ScrollContainer from 'eterna/ui/ScrollContainer';
import VoteProcessor from './VoteProcessor';
import ViewSolutionOverlay from './ViewSolutionOverlay';
import SortOptionsDialog from './SortOptionsDialog';
import SortOptions, {SortOrder} from './SortOptions';
import SelectionBox from './SelectionBox';
import MarkerBoxView from './MarkerBoxView';
import GridLines from './GridLines';
import DataCol from './DataCol';
import CustomizeColumnOrderDialog from './CustomizeColumnOrderDialog';

export interface DBVote {
    canVote: boolean;
    voted: boolean;
    solutionIndex: number;
}

export enum DesignBrowserDataType {
    INT = 0,
    STRING = 1,
    NUMBER = 2,
    VOTE = 3
}

export enum DesignCategory {
    VOTE = 'Vote',
    ID = 'Id',
    TITLE = 'Title',
    DESIGNER = 'Designer',
    VOTES = 'Votes',
    MY_VOTES = 'My Votes',
    DESCRIPTION = 'Description',
    ROUND = 'Round',
    GC_PAIRS = 'GC Pairs',
    UA_PAIRS = 'UA Pairs',
    GU_PAIRS = 'GU Pairs',
    MELTING_POINT = 'Melting Point',
    FREE_ENERGY = 'Free Energy',
    SYNTHESIZED = 'Synthesized',
    SYNTHESIS_SCORE = 'Synthesis Score',
    SEQUENCE = 'Sequence',
    LIBRARY_NT = 'Library Nucleotides',
}

function AllCategories(): DesignCategory[] {
    return Object.values(DesignCategory);
}

export interface DesignBrowserFilter {
    category: DesignCategory;
    arg1?: string;
    arg2?: string;
}

export default class DesignBrowserMode extends GameMode {
    constructor(
        puzzle: Puzzle,
        novote = false,
        initialFilters: DesignBrowserFilter[] | null = null,
        initialSolution?: Solution,
        sortOnSolution: boolean = false
    ) {
        super();

        this._puzzle = puzzle;
        this._novote = novote;
        this._initialDataFilters = initialFilters;
        this._wholeRowWidth = 0;
        this._voteProcessor = new VoteProcessor(puzzle.maxVotes);
        this._initialSolution = initialSolution;
        this._initSortOnSolution = sortOnSolution;
    }

    public get puzzleID(): number { return this._puzzle.nodeID; }

    public get isOpaque(): boolean { return true; }

    protected setup(): void {
        super.setup();

        this._content.position.set(10, 86);
        this.uiLayer.addChild(this._content);

        this._votesText = new MultiStyleText('You have...', {
            default: {
                fontFamily: Fonts.STDFONT,
                fontSize: 14,
                fill: 0xffffff
            },
            bold: {
                fontWeight: FontWeight.BOLD
            }
        });
        this._votesText.position.set(20, 52);
        this.uiLayer.addChild(this._votesText);

        this._vSlider = new SliderBar(true);
        this._vSlider.setProgress(0);
        this._vSlider.scrollChanged.connect((scrollValue) => this.setScrollVertical(scrollValue));
        this.addObject(this._vSlider, this._content);

        this._hSlider = new SliderBar(false);
        this._hSlider.setProgress(0);
        this._hSlider.scrollChanged.connect((scrollValue) => this.setScrollHorizontal(scrollValue));
        this.addObject(this._hSlider, this._content);

        this._scrollContainer = new ScrollContainer(1, 1);
        this._scrollContainer.display.position.set(7, 0);
        this.addObject(this._scrollContainer, this._content);

        this._dataColParent = new ContainerObject();
        this._scrollContainer.addObject(this._dataColParent, this._scrollContainer.content);

        const {designBrowser: theme} = UITheme;
        this._firstVisSolutionIdx = 0;
        this._gridLines = new GridLines(1, 0x2f93d1, 5 * theme.rowHeight);
        const dataStart = theme.headerHeight + theme.filterHeight + theme.dataPadding;
        this._gridLines.position.set(10, dataStart);
        this._content.addChild(this._gridLines);

        this._markerBoxes = new MarkerBoxView(0xFF0000, theme.rowHeight);
        this._markerBoxes.position.set(7, theme.headerHeight + theme.filterHeight + 1);
        this._content.addChild(this._markerBoxes);

        const selectionBoxParent = new Container();
        this._selectionBox = new SelectionBox(0x2F94D1);
        this._selectionBox.position.set(7, 0);
        this._selectionBox.visible = false;
        selectionBoxParent.addChild(this._selectionBox);
        this._content.addChild(selectionBoxParent);

        const clickedSelectionBoxParent = new Container();
        this._clickedSelectionBox = new SelectionBox(0x2F44D1);
        this._clickedSelectionBox.position.set(7, 0);
        this._clickedSelectionBox.visible = false;
        clickedSelectionBoxParent.addChild(this._clickedSelectionBox);
        this._content.addChild(clickedSelectionBoxParent);

        this._dataColParent.pointerMove.connect((e) => this.onMouseMove(e));
        this._dataColParent.pointerTap.connect((e) => this.onMouseUp(e));

        this._categories = Eterna.settings.designBrowserColumnNames.value;
        if (this._categories == null) {
            this._categories = DesignBrowserMode.DEFAULT_COLUMNS.slice();
        }

        this._selectedSolutionIDs = Eterna.settings.designBrowserSelectedSolutionIDs.value;
        if (this._selectedSolutionIDs == null) {
            this._selectedSolutionIDs = [];
        }

        const sortableCategories = [
            DesignCategory.ID,
            DesignCategory.TITLE,
            DesignCategory.DESIGNER,
            DesignCategory.DESCRIPTION,
            DesignCategory.ROUND,
            DesignCategory.GC_PAIRS,
            DesignCategory.UA_PAIRS,
            DesignCategory.GU_PAIRS,
            DesignCategory.MELTING_POINT,
            DesignCategory.FREE_ENERGY,
            DesignCategory.SYNTHESIS_SCORE
        ];
        if (!this._novote) {
            sortableCategories.push(DesignCategory.VOTES);
            sortableCategories.push(DesignCategory.MY_VOTES);
        }

        this._sortOptions = new SortOptions(sortableCategories);
        this._sortOptions.sortChanged.connect(() => this.reorganize(true));

        this._toolbarLayout = new HLayoutContainer();
        this.uiLayer.addChild(this._toolbarLayout);

        this._returnToGameButton = new GameButton()
            .up(Bitmaps.ImgPrevious)
            .over(Bitmaps.ImgPrevious)
            .down(Bitmaps.ImgPrevious)
            .tooltip('Return to game.')
            .label('RETURN TO GAME', 12);
        this.addObject(this._returnToGameButton, this._toolbarLayout);
        this._toolbarLayout.addHSpacer(5);
        this._returnToGameButton.clicked.connect(() => this.returnToGame());

        this._toolbarLayout.addHSpacer(20);

        const sortButton = new GameButton()
            .up(Bitmaps.BtnSort)
            .over(Bitmaps.BtnSort)
            .down(Bitmaps.BtnSort)
            .tooltip('Editor sort options.')
            .label('SORT', 12);
        this.addObject(sortButton, this._toolbarLayout);
        this._toolbarLayout.addHSpacer(5);
        sortButton.clicked.connect(() => this.showSortDialog());

        this._toolbarLayout.addHSpacer(20);

        const configureButton = new GameButton()
            .up(Bitmaps.BtnConfigure)
            .over(Bitmaps.BtnConfigure)
            .down(Bitmaps.BtnConfigure)
            .tooltip('Select and reorder columns.')
            .label('CONFIGURE', 12);
        this.addObject(configureButton, this._toolbarLayout);
        this._toolbarLayout.addHSpacer(5);
        configureButton.clicked.connect(() => this.showCustomizeColumnOrderDialog());

        this._toolbarLayout.addHSpacer(20);

        this._letterColorButton = new GameButton()
            .up(Bitmaps.BtnPalette)
            .over(Bitmaps.BtnPaletteOver)
            .down(Bitmaps.BtnPaletteOver)
            .selected(Bitmaps.BtnPaletteSelected)
            .tooltip('Color sequences based on base colors as in the game.');
        this._letterColorButton.toggled.value = true;
        this.addObject(this._letterColorButton, this._toolbarLayout);
        this._letterColorButton.clicked.connect(() => this.setSequenceLetterColor());

        this._expColorButton = new GameButton()
            .up(Bitmaps.BtnFlask)
            .over(Bitmaps.BtnFlaskOver)
            .down(Bitmaps.BtnFlaskOver)
            .selected(Bitmaps.BtnFlaskSelected)
            .tooltip('Color sequences based on experimental data.');
        this._expColorButton.toggled.value = false;
        this.addObject(this._expColorButton, this._toolbarLayout);
        this._expColorButton.clicked.connect(() => this.setSequenceExpColor());

        this._toolbarLayout.layout();

        const homeButton = new GameButton()
            .up(Bitmaps.ImgHome)
            .over(Bitmaps.ImgHome)
            .down(Bitmaps.ImgHome);
        homeButton.display.position.set(18, 10);
        homeButton.clicked.connect(() => {
            if (Eterna.MOBILE_APP) {
                if (window.frameElement) window.frameElement.dispatchEvent(new CustomEvent('navigate', {detail: '/'}));
            } else {
                window.location.href = EternaURL.createURL({page: 'home'});
            }
        });
        this.addObject(homeButton, this.uiLayer);

        const homeArrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgHomeArrow));
        homeArrow.position.set(45, 14);
        this.uiLayer.addChild(homeArrow);

        const puzzleTitle = UITheme.makeTitle(this._puzzle.getName(!Eterna.MOBILE_APP), 0xffffff);
        puzzleTitle.hideWhenModeInactive();
        this.addObject(puzzleTitle, this.uiLayer);
        DisplayUtil.positionRelative(
            puzzleTitle.display, HAlign.LEFT, VAlign.CENTER,
            homeArrow, HAlign.RIGHT, VAlign.CENTER, 8, 8
        );

        // Refresh our data immediately, and then every 300 seconds
        this.refreshSolutions().then(() => {
            if (this._initialSolution) {
                this.showSolutionDetailsDialog(this._initialSolution);
            }
            if (this._initialSolution && this._initSortOnSolution) {
                // Sort on it.
                this.sortOnSolution(this._initialSolution);
            }
        });

        this.addObject(new RepeatingTask(() => new SerialTask(
            new DelayTask(300),
            new CallbackTask(() => this.refreshSolutions())
        )));

        this.updateLayout();
    }

    public onResized(): void {
        super.onResized();
        this.updateLayout();
    }

    public onMouseWheelEvent(e: WheelEvent): void {
        const handled = this._solutionView?.onMouseWheelEvent(e);
        if (handled) {
            return;
        }
        if (!this.isDialogOrNotifShowing && e.deltaY !== 0 && this._filteredSolutions != null) {
            if (!this.container || !this.container.visible || e.x < this.container.position.x) {
                return;
            }

            // update scroll
            const pxdelta: number = InputUtil.scrollAmount(e, 14, this._vSlider.height);

            // convert back to lines
            const progress = (this._firstVisSolutionIdx + pxdelta / 14) / this._filteredSolutions.length;
            this._vSlider.setProgress(MathUtil.clamp(progress, 0, 1));
        } else {
            super.onMouseWheelEvent(e);
        }
    }

    private get contentWidth(): number {
        Assert.assertIsDefined(Flashbang.stageWidth);
        return Flashbang.stageWidth - this._solDialogOffset - 40;
    }

    private get contentHeight(): number {
        Assert.assertIsDefined(Flashbang.stageHeight);
        return Flashbang.stageHeight - 120;
    }

    private get _solDialogOffset() {
        return this._solutionView !== undefined && this._solutionView.container.visible
            ? ViewSolutionOverlay.theme.width : 0;
    }

    private updateLayout(): void {
        this._hSlider.display.position.set(30, this.contentHeight + 3);
        this._hSlider.setSize(this.contentWidth - 60, 0);
        // If we don't do this, we can be in a situation where the horizontal position
        // of the content won't be synced with the scrollbar, due to showing/hiding
        // the solution sidebar
        this._hSlider.setProgress(this._hSlider.getProgress());

        this._vSlider.display.position.set(this.contentWidth + 5, 50);
        this._vSlider.setSize(0, this.contentHeight - 70);

        this._gridLines.setSize(
            this.contentWidth - 18,
            this.contentHeight - this._gridLines.position.y
        );
        this._scrollContainer.setSize(this.contentWidth - 14, this.contentHeight - 10);
        // The content inside may have changed size even though the width hasnt, so force it to
        // re-layout
        this._scrollContainer.doLayout();
        this._markerBoxes.setSize(this.contentWidth - 14, this.contentHeight - 10);
        this._markerBoxes.updateView(this._firstVisSolutionIdx);

        const {designBrowser: theme} = UITheme;
        this._selectionBox.setSize(this.contentWidth - 14, theme.rowHeight);
        this._clickedSelectionBox.setSize(this.contentWidth - 14, theme.rowHeight);

        if (this._dataCols != null) {
            for (const col of this._dataCols) {
                col.setSize(this.contentWidth, this.contentHeight);
            }
        }

        DisplayUtil.positionRelativeToStage(
            this._toolbarLayout, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, -24 - this._solDialogOffset, 40
        );
    }

    protected enter(): void {
        super.enter();
        this.refreshSolutions();
        const {existingPoseEditMode} = Eterna.app;
        this._returnToGameButton.display.visible = (
            existingPoseEditMode != null && existingPoseEditMode.puzzleID === this.puzzleID
        );
        Eterna.chat.pushHideChat();
    }

    protected exit(): void {
        Eterna.chat.popHideChat();
        super.exit();
    }

    private setSequenceLetterColor(): void {
        this._letterColorButton.toggled.value = true;
        this._expColorButton.toggled.value = false;

        for (const dataCol of this._dataCols) {
            if (dataCol.category === DesignCategory.SEQUENCE) {
                dataCol.showExp = false;
            }
        }
    }

    private setSequenceExpColor(): void {
        this._letterColorButton.toggled.value = false;
        this._expColorButton.toggled.value = true;

        for (const dataCol of this._dataCols) {
            if (dataCol.category === DesignCategory.SEQUENCE) {
                dataCol.showExp = true;
            }
        }
    }

    private async switchToPoseEditForSolution(solution: Solution): Promise<void> {
        this.pushUILock();
        try {
            await Eterna.app.switchToPoseEdit(
                this._puzzle, false, {initSolution: solution, solutions: this._filteredSolutions.slice()}
            );
        } catch (e) {
            log.error(e);
        } finally {
            this.popUILock();
        }
    }

    private switchToFeedbackViewForSolution(solution: Solution): void {
        this.pushUILock();

        const solutions = this._filteredSolutions.filter((sol) => sol.expFeedback !== null).slice();
        Eterna.app.switchToFeedbackView(this._puzzle, solution, solutions)
            .then(() => this.popUILock())
            .catch((e) => {
                log.error(e);
                this.popUILock();
            });
    }

    public sortOnSolution(solution: Solution): void {
        this.closeCurDialog();
        this._sortOptions.addCriteria(
            DesignCategory.SEQUENCE,
            SortOrder.INCREASING,
            solution.sequence.sequenceString()
        );
        this.showSortDialog();
    }

    private reloadCurrent(): void {
        // get sol at current index again, wrapped around.
        if (this._solutionView !== undefined) {
            const newCurrentIdx = this._currentSolutionIndex >= this._filteredSolutions.length
                ? 0
                : this._currentSolutionIndex;

            const newSolution = this.getSolutionAtIndex(newCurrentIdx);
            this.showSolutionDetailsDialog(newSolution);
        }
    }

    private unpublish(solution: Solution): void {
        this.pushUILock();

        const statusText = DesignBrowserMode.createStatusText('Deleting...');
        this.addObject(statusText, this.notifLayer);
        DisplayUtil.positionRelativeToStage(statusText.display,
            HAlign.CENTER, VAlign.CENTER,
            HAlign.CENTER, VAlign.CENTER);

        const cleanup = () => {
            this.popUILock();
            statusText.destroySelf();
            this.closeCurDialog();
            this.updateDataColumns();
        };

        Eterna.client.deleteSolution(solution.nodeID)
            .then(() => SolutionManager.instance.getSolutionsForPuzzle(this._puzzle.nodeID))
            .then(() => this.reloadCurrent())
            .then(cleanup)
            .catch((err) => {
                this.showNotification(`Delete failed: ${err}`);
                cleanup();
            });
    }

    private vote(solution: Solution): void {
        this.pushUILock();

        const statusText = DesignBrowserMode.createStatusText('Submitting...');
        this.addObject(statusText, this.notifLayer);
        DisplayUtil.positionRelativeToStage(statusText.display,
            HAlign.CENTER, VAlign.CENTER,
            HAlign.CENTER, VAlign.CENTER);

        const cleanup = () => {
            this.popUILock();
            statusText.destroySelf();
            this.closeCurDialog();
        };

        // string | number => definitely a number
        const myVotes = Number(solution.getProperty(DesignCategory.MY_VOTES));
        Eterna.client.toggleSolutionVote(solution.nodeID, this._puzzle.nodeID, myVotes)
            .then((data) => {
                this._voteProcessor.processData(data['votes']);
                this.syncVotes();

                const cheevs: {[name: string]: AchievementData} = data['new_achievements'];
                if (cheevs != null) {
                    this._achievements.awardAchievements(cheevs).then(() => { /* ignore result */ });
                }
                cleanup();

                const newVoteStatus = (1 - myVotes) > 0;

                // Toggle vote button
                if (this._solutionView) {
                    this._solutionView.setVoteStatus(newVoteStatus);
                }

                // Update corresponding icon in Vote column
                const voteColumn = this._dataCols.find((c) => c.category === DesignCategory.VOTE);
                if (voteColumn) {
                    const solutionIndex = this._filteredSolutions.indexOf(solution);
                    if (solutionIndex >= 0) {
                        voteColumn.setVoteStatus(solutionIndex, newVoteStatus);
                    }
                }
            })
            .catch((err) => {
                this.showNotification(`Vote failed: ${err}`);
                cleanup();
            });
    }

    private onMouseUp(e: InteractionEvent): void {
        if (Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown) {
            this.mark(e);
            return;
        }

        if (this._filteredSolutions == null) {
            return;
        }

        const [index] = this._dataCols[0].getMouseIndex(e);
        if (index < 0) {
            return;
        }

        this._clickedSelectionBox.visible = true;
        this.updateClickedSelectionBoxPos(index);

        this.showSolutionDetailsDialog(this.getSolutionAtIndex(index + this._firstVisSolutionIdx));
    }

    public showSolutionDetailsDialog(solution: Solution | null): void {
        if (!solution) return;

        const index = this.getSolutionIndex(solution.nodeID);
        this._currentSolutionIndex = index;

        if (this._solutionView) this.removeObject(this._solutionView);
        this._solutionView = new ViewSolutionOverlay({
            solution,
            puzzle: this._puzzle,
            voteDisabled: this._novote,
            onPrevious: () => {
                this.showSolutionDetailsDialog(
                    this.getSolutionAtIndex(Math.max(0, this._currentSolutionIndex - 1))
                );
            },
            onNext: () => {
                const nextSolutionIndex = Math.min(
                    this._filteredSolutions.length - 1,
                    this._currentSolutionIndex + 1
                );
                this.showSolutionDetailsDialog(this.getSolutionAtIndex(nextSolutionIndex));
            },
            parentMode: (() => this)()
        });
        this.addObject(this._solutionView, this.dialogLayer);
        const rowIndex = this._currentSolutionIndex - this._firstVisSolutionIdx;
        if (rowIndex >= 0) {
            this._clickedSelectionBox.visible = true;
            this.updateClickedSelectionBoxPos(index);
            this._clickedSelectionBox.visible = true;
        }

        this._solutionView.playClicked.connect(() => this.switchToPoseEditForSolution(solution));
        this._solutionView.seeResultClicked.connect(() => {
            this.switchToFeedbackViewForSolution(solution);
        });
        this._solutionView.sortClicked.connect(() => this.sortOnSolution(solution));
        this._solutionView.voteClicked.connect(() => this.vote(solution));
        this._solutionView.deleteClicked.connect(() => this.unpublish(solution));

        this.updateLayout();
    }

    private onMouseMove(e: InteractionEvent): void {
        this._selectionBox.visible = false;

        if (this._dataCols == null || this._dialogRef.isLive || this._filteredSolutions == null) {
            return;
        }

        const [index] = this._dataCols[0].getMouseIndex(e);
        if (index >= 0 && index < this._filteredSolutions.length) {
            this._selectionBox.visible = true;
            this.updateSelectionBoxPos(index);
        }
    }

    private updateSelectionBoxPos(index: number) {
        const {designBrowser: theme} = UITheme;
        this._selectionBox.position.y = theme.headerHeight
            + theme.filterHeight
            + index * theme.rowHeight
            + theme.dataPadding / 2;
    }

    private updateClickedSelectionBoxPos(index: number) {
        const {designBrowser: theme} = UITheme;
        const start = theme.filterHeight + theme.dataPadding / 2 + theme.headerHeight;
        const idxOffset = index - this._firstVisSolutionIdx;
        this._clickedSelectionBox.position.y = start + idxOffset * theme.rowHeight;
        this._clickedSelectionBox.visible = idxOffset > 0;
    }

    private mark(e: InteractionEvent): void {
        if (this._dataCols == null) {
            this._markerBoxes.visible = false;
            return;
        }

        if (this.isDialogOrNotifShowing) {
            return;
        }

        let [index] = this._dataCols[0].getMouseIndex(e);
        if (index < 0) {
            return;
        }

        index += this._firstVisSolutionIdx;

        const solution = this.getSolutionAtIndex(index);
        if (solution == null) {
            return;
        }

        const solutionID = solution.nodeID;
        this._markerBoxes.visible = true;

        Assert.assertIsDefined(this._selectedSolutionIDs);

        if (!this._markerBoxes.isSelected(index)) {
            this._markerBoxes.addMarker(index);
            this._selectedSolutionIDs.push(solutionID);
        } else {
            this._markerBoxes.removeMarker(index);
            const removeIdx = this._selectedSolutionIDs.indexOf(solutionID);
            if (removeIdx >= 0) {
                this._selectedSolutionIDs.splice(removeIdx, 1);
            }
        }

        this._markerBoxes.updateView(this._firstVisSolutionIdx);

        Eterna.settings.designBrowserSelectedSolutionIDs.value = this._selectedSolutionIDs.slice();
    }

    private showSortDialog(): void {
        this.showDialog(new SortOptionsDialog(this._sortOptions), 'SortDialog');
    }

    private showCustomizeColumnOrderDialog(): void {
        const disabledCategories = new Set<DesignCategory>();
        if (this._novote) {
            disabledCategories.add(DesignCategory.VOTES);
            disabledCategories.add(DesignCategory.MY_VOTES);
        }

        const dialog = this.showDialog(
            new CustomizeColumnOrderDialog(AllCategories(), this._categories, disabledCategories),
            'ColumnOrderDialog'
        );
        // Already live
        if (!dialog) return;
        dialog.columnsReorganized.connect((columnNames) => {
            this._categories = columnNames;
            Eterna.settings.designBrowserColumnNames.value = columnNames;
            this.rebuildDataColumns(this._initialDataFilters);
            this.reorganize(true);
        });

        dialog.currentSelectedFilterValue = this._onlySelectedVisible;

        dialog.selectedFilterUpdate.connect((e) => {
            this._onlySelectedVisible = e;
            this.reorganize(true);
        });
    }

    private updateSortOption(category: DesignCategory, sortOrder: SortOrder, sortArgs?: string): void {
        if (sortOrder !== SortOrder.NONE) {
            this._sortOptions.addCriteria(category, sortOrder, sortArgs);
        } else {
            this._sortOptions.removeCriteria(category);
        }
    }

    private reorganize(sort: boolean): void {
        if (sort) {
            this._allSolutions.sort((a, b) => this._sortOptions.compareSolutions(a, b));

            for (const dataCol of this._dataCols) {
                dataCol.setSortState(this._sortOptions.getSortOrder(dataCol.category));
            }
        }

        const solutions: Solution[] = [];
        for (const sol of this._allSolutions) {
            // If any dataCol shouldn't display the solution, shouldAdd is false.
            let shouldAdd = !this._dataCols.some(
                (dataCol) => !dataCol.shouldDisplay(sol)
            );

            if (this._onlySelectedVisible && !this._selectedSolutionIDs?.includes(sol.nodeID)) {
                shouldAdd = false;
            }

            if (shouldAdd) {
                solutions.push(sol);
            }
        }

        this._filteredSolutions = solutions;
        this.setData(solutions, false, false);
        this.setScrollVertical(-1);
    }

    private setScrollHorizontal(progress: number): void {
        this._scrollContainer.scrollX = (this._wholeRowWidth > this.contentWidth)
            ? (this._wholeRowWidth - this.contentWidth) * progress
            : 0;
    }

    private setScrollVertical(progress: number): void {
        this._firstVisSolutionIdx = 0;
        if (this._dataCols == null) {
            return;
        }

        if (progress < 0) {
            progress = this._vSlider.getProgress();
        }

        if (this._filteredSolutions != null) {
            this._firstVisSolutionIdx = int(this._filteredSolutions.length * progress);
        }

        for (const dataCol of this._dataCols) {
            dataCol.scrollProgress = this._firstVisSolutionIdx;
        }

        this._markerBoxes.updateView(this._firstVisSolutionIdx);
        this.updateClickedSelectionBoxPos(this._currentSolutionIndex);
    }

    private refreshSolutions(): Promise<void> {
        return SolutionManager.instance.getSolutionsForPuzzle(this._puzzle.nodeID)
            .then(() => this.updateDataColumns());
    }

    private updateVotes(): void {
        this._voteProcessor.updateVotes(this._puzzle.nodeID, this._puzzle.round)
            .then(() => this.syncVotes());
    }

    private syncVotes(): void {
        const {votesLeft} = this._voteProcessor;
        const {round} = this._puzzle;
        const available: number = this._puzzle.numSubmissions;
        const mySolutionTitles: string[] = SolutionManager.instance.getMyCurrentSolutionTitles(round);

        if (!this._novote) {
            this._votesText.text = `You have <bold>${votesLeft} votes</bold> and `
                + `<bold>${available - mySolutionTitles.length} solution slots</bold> left.`;
        } else {
            this._votesText.text = 'This puzzle has been cleared.';
        }

        this.reorganize(true);
    }

    private rebuildDataColumns(filters: DesignBrowserFilter[] | null = null): void {
        const FONT = Fonts.STDFONT;
        const FONT_SIZE = UITheme.designBrowser.fontSize;

        if (this._dataCols != null) {
            for (const dataCol of this._dataCols) {
                dataCol.destroySelf();
            }
        }

        this._dataCols = [];
        if (this._categories !== null) {
            for (const category of this._categories) {
                if (this._novote && (category === DesignCategory.VOTES || category === DesignCategory.MY_VOTES)) {
                    continue;
                }

                let column: DataCol;
                const baseParams = {
                    category,
                    domParent: this._scrollContainer.htmlWrapper,
                    fonttype: FONT,
                    fontSize: FONT_SIZE
                };
                switch (category) {
                    case DesignCategory.VOTE:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.VOTE,
                            dataWidth: 60,
                            sortable: false
                        });
                        column.voteChanged.connect((solutionIndex) => {
                            const solution = this._filteredSolutions[solutionIndex];
                            Assert.assertIsDefined(solution);
                            if (solution) {
                                this.vote(solution);
                            }
                        });
                        break;
                    case DesignCategory.TITLE:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.STRING,
                            dataWidth: 250,
                            sortable: true
                        });
                        break;
                    case DesignCategory.DESIGNER:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.STRING,
                            dataWidth: 220,
                            sortable: true
                        });
                        break;
                    case DesignCategory.DESCRIPTION:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.STRING,
                            dataWidth: 300,
                            sortable: true
                        });
                        break;
                    case DesignCategory.SEQUENCE:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.STRING,
                            dataWidth: 0,
                            sortable: false
                        });
                        break;
                    case DesignCategory.SYNTHESIZED:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.STRING,
                            dataWidth: 120,
                            sortable: true
                        });
                        break;
                    case DesignCategory.VOTES:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.NUMBER,
                            dataWidth: 125,
                            sortable: true
                        });
                        break;
                    case DesignCategory.SYNTHESIS_SCORE:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.NUMBER,
                            dataWidth: 140,
                            sortable: true
                        });
                        break;
                    case DesignCategory.LIBRARY_NT:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.STRING,
                            dataWidth: 170,
                            sortable: true
                        });
                        break;
                    default:
                        column = new DataCol({
                            ...baseParams,
                            dataType: DesignBrowserDataType.NUMBER,
                            dataWidth: 125,
                            sortable: true
                        });
                        break;
                }

                column.setSize(this.contentWidth, this.contentHeight);
                column.filtersChanged.connect(() => this.reorganize(false));
                column.sortOrderChanged.connect((sortOrder) => this.updateSortOption(column.category, sortOrder));

                this._dataCols.push(column);
                this._dataColParent.addObject(column, this._dataColParent.container);

                if (filters != null) {
                    for (const filter of filters) {
                        if (filter.category === category) {
                            column.setFilter(filter.arg1, filter.arg2);
                            break;
                        }
                    }
                }
            }
        }

        this.layoutColumns(false);
    }

    private setData(solutions: Solution[], animate: boolean, initializeOnly: boolean = false): void {
        if (this._dataCols == null) {
            this.rebuildDataColumns(this._initialDataFilters);
        }

        if (initializeOnly) {
            return;
        }

        const puz: Puzzle = this._puzzle;

        for (const dataCol of this._dataCols) {
            const dataArray: (string | number | DBVote)[] = [];

            const {category} = dataCol;

            for (let ii = 0; ii < solutions.length; ii++) {
                // single row of raw data
                const singleLineRawData: Solution = solutions[ii];

                if (category === DesignCategory.SEQUENCE) {
                    dataArray.push(singleLineRawData.sequence.sequenceString());
                    if (ii === 0) {
                        dataCol.setWidth(
                            singleLineRawData.sequence.length * 14
                            + UITheme.designBrowser.dataPadding * 5
                        );
                        dataCol.drawGridText();
                    }
                } else if (category === DesignCategory.LIBRARY_NT) {
                    dataArray.push(singleLineRawData.libraryNT.join(','));
                } else if (category === DesignCategory.DESCRIPTION) {
                    const des = singleLineRawData.getProperty(DesignCategory.DESCRIPTION) as string;
                    if (des.length < 45) {
                        dataArray.push(des);
                    } else {
                        dataArray.push(`${des.substr(0, 40)}...`);
                    }
                } else if (category === DesignCategory.TITLE) {
                    const des = singleLineRawData.getProperty(DesignCategory.TITLE) as string;
                    if (des.length < 30) {
                        dataArray.push(des);
                    } else {
                        dataArray.push(`${des.substr(0, 25)}...`);
                    }
                } else if (category === DesignCategory.VOTE) {
                    const canVote = !this._novote && singleLineRawData.canVote(puz.round);
                    const voted = singleLineRawData.getProperty(DesignCategory.MY_VOTES) > 0;
                    dataArray.push({canVote, voted, solutionIndex: ii});
                } else {
                    const rawdata: string | number = singleLineRawData.getProperty(category) as string | number;
                    dataArray.push(rawdata);
                }
            }

            if (category === DesignCategory.SEQUENCE || category === DesignCategory.SYNTHESIS_SCORE) {
                dataCol.expFeedback = solutions.map((solution) => solution.expFeedback);
            }
            dataCol.setPairs(SecStruct.fromParens(puz.getSecstruct()));

            // Setting and Displaying all raw data for each column
            dataCol.setDataAndDisplay(dataArray);

            // This has to get set after the content is updated since we rely on the text width
            if (category === DesignCategory.LIBRARY_NT) {
                dataCol.setWidth(
                    Math.max(170, dataCol.textWidth + UITheme.designBrowser.dataPadding * 10)
                );
            }
        }

        this.refreshMarkingBoxes();
        this.layoutColumns(animate);
    }

    private getSolutionIndex(solutionID: number): number {
        return this._filteredSolutions.findIndex((solution) => solution.nodeID === solutionID);
    }

    private getSolutionAtIndex(idx: number): Solution | null {
        return idx >= 0 && idx < this._filteredSolutions.length ? this._filteredSolutions[idx] : null;
    }

    private layoutColumns(animate: boolean): void {
        this._wholeRowWidth = 0;

        for (let ii = 0; ii < this._dataCols.length; ii++) {
            const col: DataCol = this._dataCols[ii];
            if (animate) {
                col.replaceNamedObject(
                    'AnimateLocation',
                    new LocationTask(this._wholeRowWidth, 0, 0.5, Easing.easeOut)
                );
            } else {
                col.display.position.set(this._wholeRowWidth, 0);
            }

            this._wholeRowWidth += col.width;

            if (ii % 2 === 0 || col.category === 'Sequence') {
                col.setBgColor(0xffffff, 0);
            } else {
                col.setBgColor(0xffffff, 0.05);
            }
        }

        // Somewhere along the line when we moved to a scrollcontainer this got out of sync. How?
        // I'll leave that exercise to the reader. For now, this seems to work.
        this._wholeRowWidth += 14;
    }

    private refreshMarkingBoxes(): void {
        this._markerBoxes.clear();
        if (this._selectedSolutionIDs !== null) {
            for (const solutionID of this._selectedSolutionIDs) {
                const index = this.getSolutionIndex(solutionID);
                if (index >= 0 && index < this._filteredSolutions.length) {
                    this._markerBoxes.addMarker(index);
                }
            }
        }
        this._markerBoxes.updateView(this._firstVisSolutionIdx);
    }

    private updateDataColumns(): void {
        const {solutions} = SolutionManager.instance;

        if (!this._dataCols) this.setData(solutions, false, true);
        this._allSolutions = solutions;
        this.reorganize(true);
        this.updateVotes();
        this.setScrollVertical(-1);

        this.updateLayout();
    }

    private returnToGame(): void {
        const {existingPoseEditMode} = Eterna.app;
        if (existingPoseEditMode != null && existingPoseEditMode.puzzleID === this.puzzleID) {
            this.pushUILock();
            Eterna.app.switchToPoseEdit(this._puzzle, true)
                .then(() => {
                    this.popUILock();
                })
                .catch((e) => {
                    log.error(e);
                    this.popUILock();
                });
        }
    }

    private readonly _puzzle: Puzzle;
    private readonly _novote: boolean;
    private readonly _initialDataFilters: DesignBrowserFilter[] | null;
    private readonly _content = new Container();

    private _gridLines: GridLines;
    private _scrollContainer: ScrollContainer;

    private _selectedSolutionIDs: number[] | null;
    private _vSlider: SliderBar;
    private _hSlider: SliderBar;
    private _dataColParent: ContainerObject;
    private _firstVisSolutionIdx: number;
    private _wholeRowWidth: number;
    private _dataCols: DataCol[];
    private _allSolutions: Solution[];
    private _filteredSolutions: Solution[];

    private _onlySelectedVisible = false;
    private _sortOptions: SortOptions;
    private _toolbarLayout: HLayoutContainer;
    private _returnToGameButton: GameButton;
    private _letterColorButton: GameButton;
    private _expColorButton: GameButton;
    private _votesText: MultiStyleText;
    private _selectionBox: SelectionBox;
    private _clickedSelectionBox: SelectionBox;
    private _markerBoxes: MarkerBoxView;
    private _categories: DesignCategory[] | null;
    private _voteProcessor: VoteProcessor;

    private _solutionView?: ViewSolutionOverlay;
    private _currentSolutionIndex = -1;

    private static readonly DEFAULT_COLUMNS: DesignCategory[] = [
        DesignCategory.VOTE,
        DesignCategory.ID,
        DesignCategory.TITLE,
        DesignCategory.DESIGNER,
        DesignCategory.VOTES,
        DesignCategory.MY_VOTES,
        DesignCategory.DESCRIPTION,
        DesignCategory.ROUND,
        DesignCategory.GC_PAIRS,
        DesignCategory.UA_PAIRS,
        DesignCategory.GU_PAIRS,
        DesignCategory.MELTING_POINT,
        DesignCategory.FREE_ENERGY,
        DesignCategory.SYNTHESIZED,
        DesignCategory.SYNTHESIS_SCORE,
        DesignCategory.LIBRARY_NT,
        DesignCategory.SEQUENCE
    ];

    private _initialSolution?: Solution;
    private _initSortOnSolution: boolean;
}
