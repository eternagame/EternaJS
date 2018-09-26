import MultiStyleText from "pixi-multistyle-text";
import {Container, Point, Text} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {GameObjectRef} from "../../../flashbang/core/GameObjectRef";
import {HLayoutContainer} from "../../../flashbang/layout/HLayoutContainer";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {SceneObject} from "../../../flashbang/objects/SceneObject";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {CallbackTask} from "../../../flashbang/tasks/CallbackTask";
import {DelayTask} from "../../../flashbang/tasks/DelayTask";
import {LocationTask} from "../../../flashbang/tasks/LocationTask";
import {RepeatingTask} from "../../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../../flashbang/tasks/SerialTask";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Easing} from "../../../flashbang/util/Easing";
import {EPars} from "../../EPars";
import {Eterna} from "../../Eterna";
import {Feedback} from "../../Feedback";
import {Puzzle} from "../../puzzle/Puzzle";
import {Solution} from "../../puzzle/Solution";
import {SolutionManager} from "../../puzzle/SolutionManager";
import {Bitmaps} from "../../resources/Bitmaps";
import {GameButton} from "../../ui/GameButton";
import {GamePanel} from "../../ui/GamePanel";
import {SliderBar} from "../../ui/SliderBar";
import {Fonts} from "../../util/Fonts";
import {FeedbackViewMode} from "../FeedbackView/FeedbackViewMode";
import {GameMode} from "../GameMode";
import {MaskBox} from "../MaskBox";
import {ActionBox} from "./ActionBox";
import {DataCol} from "./DataCol";
import {DotLine} from "./DotLine";
import {GridLines} from "./GridLines";
import {MarkersBoxes} from "./MarkersBoxes";
import {SelectionBox} from "./SelectionBox";
import {SortOptions, SortOrder} from "./SortOptions";
import {SortOptionsDialog} from "./SortOptionsDialog";
import {VoteProcessor} from "./VoteProcessor";

export enum DesignBrowserDataType {
    INT = 0,
    STRING = 1,
    NUMBER = 2,
}

export enum DesignCategory {
    Id = "Id",
    Title = "Title",
    Designer = "Designer",
    Votes = "Votes",
    My_Votes = "My Votes",
    Description = "Description",
    Round = "Round",
    GC_Pairs = "GC Pairs",
    UA_Pairs = "UA Pairs",
    GU_Pairs = "GU Pairs",
    Melting_Point = "Melting Point",
    Free_Energy = "Free Energy",
    Synthesized = "Synthesized",
    Synthesis_score = "Synthesis score",
    Sequence = "Sequence",
}

export class DesignBrowserMode extends GameMode {
    constructor(puzzle: Puzzle, novote: boolean = false) {
        super();

        this._puzzle = puzzle;
        this._novote = novote;
        this._whole_row_width = 0;
        this._vote_processor = new VoteProcessor();
    }

    protected setup(): void {
        super.setup();

        this._content.position = new Point(10, 86);
        this.uiLayer.addChild(this._content);

        /// Instruction panel
        this._ins_panel = new GamePanel();
        this.addObject(this._ins_panel, this._content);

        const WMARGIN = 22;
        const HMARGIN = 17;

        // Measure the actual height of a line of text in the DataCol objects
        let line_height = Fonts.arial("", 14).computeLineHeight();

        this._votesText = new MultiStyleText("You have...", {
            default: {
                fontFamily: Fonts.ARIAL,
                fontSize: 12,
                fill: 0xffffff
            },
            bold: {
                fontStyle: "bold",
                fill: 0xffcc00
            }
        });
        this._votesText.position = new Point(WMARGIN, HMARGIN);
        this._ins_panel.container.addChild(this._votesText);

        this._ins_panel.setSize(this._votesText.width + 2 * WMARGIN, this._votesText.height + 2 * HMARGIN);
        this._ins_panel.display.position = new Point(0, -this._ins_panel.height - 2);

        this._vSlider = new SliderBar(true);
        this._vSlider.set_progress(0);
        this._vSlider.scrollChanged.connect(scrollValue => this.set_scroll_vertical(scrollValue));
        this.addObject(this._vSlider, this._content);

        this._hSlider = new SliderBar(false);
        this._hSlider.set_progress(0);
        this._hSlider.scrollChanged.connect(scrollValue => this.set_scroll_horizontal(scrollValue));
        this.addObject(this._hSlider, this._content);

        this._dataColParent = new ContainerObject();
        this.addObject(this._dataColParent, this._content);

        this._firstVisSolutionIdx = 0;

        this._divider1 = new DotLine(2, 0x788891);
        this._divider1.position = new Point(5, 34);
        this._content.addChild(this._divider1);

        this._divider2 = new DotLine(2, 0x788891);
        this._divider2.position = new Point(5, 82);
        this._content.addChild(this._divider2);

        this._gridLines = new GridLines(2, 0x4A5F73, 5 * line_height);
        this._gridLines.position = new Point(10, 168);
        this._content.addChild(this._gridLines);

        this._maskBox = new MaskBox();
        this._maskBox.position = new Point(7, 5);
        this._content.addChild(this._maskBox);

        this._dataColParent.display.mask = this._maskBox;

        this._marker_boxes = new MarkersBoxes(0xFF0000, 7, 88, line_height);
        this._marker_boxes.position = new Point(7, 0);
        this._content.addChild(this._marker_boxes);

        this._selection_box = new SelectionBox(0xFFFFFF);
        this._selection_box.position = new Point(7, 0);
        this._selection_box.visible = false;
        this._content.addChild(this._selection_box);

        this._dataColParent.display.interactive = true;
        this._dataColParent.pointerMove.connect(() => this.onMouseMove());
        this._dataColParent.pointerDown.connect(() => this.onEntryClicked());

        this._columnNames = Eterna.settings.designBrowserColumnNames.value;
        if (this._columnNames == null) {
            this._columnNames = DesignBrowserMode.DEFAULT_COLUMNS.slice();
        }
        this._selection_group = Eterna.settings.designBrowserSortValues.value;
        if (this._selection_group == null) {
            this._selection_group = [];
        }

        let sortableCategories: DesignCategory[] = [
            DesignCategory.Id,
            DesignCategory.Title,
            DesignCategory.Designer,
            DesignCategory.Description,
            DesignCategory.GC_Pairs,
            DesignCategory.UA_Pairs,
            DesignCategory.GU_Pairs,
            DesignCategory.Melting_Point,
            DesignCategory.Free_Energy,
        ];
        if (!this._novote) {
            sortableCategories.push(DesignCategory.Votes);
            sortableCategories.push(DesignCategory.My_Votes)
        }
        sortableCategories.push(DesignCategory.Synthesis_score);

        this._sortOptions = new SortOptions(sortableCategories);
        this._sortOptions.sortChanged.connect(() => this.reorganize(true));
        // this._sort_window = new SortWindow(sortableCategories);
        // this._sort_window.visible = false;
        // this._sort_window.set_pos(new UDim(0.5, 0, -170, 50));
        // this._sort_window.set_reorganize_callback(this.reorganize);
        // this.add_object(this._sort_window);

        this._toolbarLayout = new HLayoutContainer();
        this._content.addChild(this._toolbarLayout);

        this._letter_color_button = new GameButton()
            .up(Bitmaps.ImgColoring)
            .over(Bitmaps.ImgColoringOver)
            .down(Bitmaps.ImgColoringOver)
            .selected(Bitmaps.ImgColoringSelected)
            .tooltip("Color sequences based on base colors as in the game.");
        this._letter_color_button.toggled.value = true;
        this.addObject(this._letter_color_button, this._toolbarLayout);
        this._letter_color_button.clicked.connect(() => this.set_sequence_letter_color());

        this._exp_color_button = new GameButton()
            .up(Bitmaps.ImgFlask)
            .over(Bitmaps.ImgFlaskOver)
            .down(Bitmaps.ImgFlaskOver)
            .selected(Bitmaps.ImgFlaskSelected)
            .tooltip("Color sequences based on experimental data.");
        this._exp_color_button.toggled.value = false;
        this.addObject(this._exp_color_button, this._toolbarLayout);
        this._exp_color_button.clicked.connect(() => this.set_sequence_exp_color());

        this._toolbarLayout.addHSpacer(20);

        let edit_sort_Btn = new GameButton()
            .up(Bitmaps.ImgEditSortOptions)
            .over(Bitmaps.ImgEditSortOptionsOver)
            .down(Bitmaps.ImgEditSortOptionsHit)
            .tooltip("Editor sort options.");
        this.addObject(edit_sort_Btn, this._toolbarLayout);
        edit_sort_Btn.clicked.connect(() => this.openSortWindow());

        this._toolbarLayout.addHSpacer(5);

        this._customizeButton = new GameButton()
            .up(Bitmaps.ImgColumns)
            .over(Bitmaps.ImgColumnsOver)
            .down(Bitmaps.ImgColumnsHit)
            .tooltip("Select and reorder columns.");
        this.addObject(this._customizeButton, this._toolbarLayout);
        this._customizeButton.clicked.connect(() => this.openCustomizeWindow());

        this._toolbarLayout.addHSpacer(5);

        this._return_to_game_button = new GameButton()
            .up(Bitmaps.ImgReturn)
            .over(Bitmaps.ImgReturnOver)
            .down(Bitmaps.ImgReturnHit)
            .tooltip("Return to game.");
        this.addObject(this._return_to_game_button, this._toolbarLayout);
        this._return_to_game_button.clicked.connect(() => DesignBrowserMode.return_to_game());

        this._toolbarLayout.layout();

        // let disabled_categories: any = null;
        // if (this._novote) {
        //     disabled_categories = {'Votes': true, 'My Votes': true};
        // }
        //
        // this._customize_win = new CustomWin(DesignBrowserMode.DEFAULT_EXP_COL_NAMES, this._columnNames.slice(), disabled_categories);
        // this._customize_win.visible = false;
        // this._customize_win.set_pos(new UDim(0.5, 0, -170, 50));
        // this._customize_win.set_reorganize_callback(this.customizeCategory);
        // this.add_object(this._customize_win);
        //
        // this._loading_text = new GameText(Fonts.helvetica(17, true));
        // this._loading_text.set_text("Loading...");
        // this._loading_text.set_pos(new UDim(0.5, 0.5, -this._loading_text.width / 2, -this._loading_text.height / 2));
        // this._loading_text.set_animator(new GameAnimatorFader(0, 1, 0.4, false, true));
        // this.add_object(this._loading_text);

        // Refresh immediately, and then every 300 seconds
        this.refreshSolutions();

        this.addObject(new RepeatingTask(() => {
            return new SerialTask(
                new DelayTask(Eterna.DEV_MODE ? 6 : 300),
                new CallbackTask(() => this.refreshSolutions()),
            );
        }));
    }

    public onResized(): void {
        super.onResized();
        this.updateLayout();
    }

    private get contentWidth(): number {
        return Flashbang.stageWidth - 40;
    }

    private get contentHeight(): number {
        return Flashbang.stageHeight - 170;
    }

    private updateLayout(): void {
        this._hSlider.display.position = new Point(30, this.contentHeight + 3);
        this._hSlider.setSize(this.contentWidth - 60, 0);

        this._vSlider.display.position = new Point(this.contentWidth + 5, 50);
        this._vSlider.setSize(0, this.contentHeight - 70);

        this._divider1.length = this.contentWidth - 10;
        this._divider2.length = this.contentWidth - 10;
        this._gridLines.setSize(this.contentWidth - 10, this.contentHeight - this._gridLines.position.y);
        this._maskBox.setSize(this.contentWidth - 14, this.contentHeight - 10);
        this._marker_boxes.setSize(this.contentWidth - 14, this.contentHeight - 10);
        this._selection_box.setSize(this.contentWidth - 14, 20);

        this._toolbarLayout.position = new Point(20, this.contentHeight + 25);

        for (let col of this._dataCols) {
            col.setSize(this.contentWidth, this.contentHeight);
        }
    }

    /*override*/
    protected on_enter(): void {
        // this._return_to_game_button.visible = false;
        // if (Application.instance.get_previous_game_mode() >= 0) {
        //     this._return_to_game_button.visible = true;
        //     this._return_to_game_button.set_click_callback(DesignBrowserMode.return_to_game);
        // }
        //
        // let options: any[] = AutosaveManager.instance.loadObjects("poseview-" + Eterna.playerID);
        // if (options && options[10]) {
        //     this.set_size(new UDim(1, 1, -280, -170));
        // } else {
        //     this.set_size(new UDim(1, 1, -40, -170));
        // }
    }

    private set_sequence_letter_color(): void {
        this._letter_color_button.toggled.value = true;
        this._exp_color_button.toggled.value = false;

        for (let dataCol of this._dataCols) {
            if (dataCol.category == DesignCategory.Sequence) {
                dataCol.set_show_exp(false);
            }
        }
    }

    private set_sequence_exp_color(): void {
        this._letter_color_button.toggled.value = false;
        this._exp_color_button.toggled.value = true;

        for (let dataCol of this._dataCols) {
            if (dataCol.category == DesignCategory.Sequence) {
                dataCol.set_show_exp(true);
            }
        }
    }

    private startGameWithSolution(solution: Solution): void {
        Eterna.app.loadPoseEdit(this._puzzle, {initialSequence: solution.sequence});

        // PuzzleManager.instance.get_puzzle_by_nid(sol.get_puzzle_nid(), function (puz: Puzzle): void {
        //     Application.instance.transit_game_mode(Eterna.GAMESTATE_DEVGAME,
        //         [puz, EPars.string_to_sequence_array(sol.sequence), sol, this._filteredSolutions]);
        // });
    }

    private reviewExp(solution: Solution): void {
        this.modeStack.changeMode(new FeedbackViewMode(solution, this._puzzle));
    }

    private navigateToSolution(solution: Solution): void {
        this.closeActionBox();
        window.open(`/node/${solution.nodeID}/edit`, "soleditwindow");
    }

    private sortOnSolution(solution: Solution): void {
        this.closeActionBox();
        this._sortOptions.addCriteria(DesignCategory.Sequence, SortOrder.INCREASING, solution.sequence);
        this.openSortWindow();
    }

    private static createStatusText(text: string): SceneObject<Text> {
        let statusText = new SceneObject<Text>(Fonts.arial("Deleting...", 22).color(0xffffff).bold().build());
        statusText.addObject(new RepeatingTask(() => {
            return new SerialTask(
                new AlphaTask(0, 0.3),
                new AlphaTask(1, 0.3),
            );
        }));
        return statusText;
    }

    private unpublish(solution: Solution): void {
        this.pushUILock();

        let statusText = DesignBrowserMode.createStatusText("Deleting...");
        this.addObject(statusText, this.notifLayer);
        DisplayUtil.positionRelativeToStage(statusText.display,
            HAlign.CENTER, VAlign.CENTER,
            HAlign.CENTER, VAlign.CENTER);

        const cleanup = () => {
            this.popUILock();
            statusText.destroySelf();
            this.closeActionBox();
            this.refresh_browser();
        };

        Eterna.client.deleteSolution(solution.nodeID)
            .then(() => SolutionManager.instance.getSolutionsForPuzzle(this._puzzle.nodeID))
            .then(cleanup)
            .catch(err => {
                this.showNotification(`Delete failed: ${err}`);
                cleanup();
            });
    }

    private vote(solution: Solution): void {
        this.pushUILock();

        let statusText = DesignBrowserMode.createStatusText("Submitting...");
        this.addObject(statusText, this.notifLayer);
        DisplayUtil.positionRelativeToStage(statusText.display,
            HAlign.CENTER, VAlign.CENTER,
            HAlign.CENTER, VAlign.CENTER);

        const cleanup = () => {
            this.popUILock();
            statusText.destroySelf();
            this.closeActionBox();
        };

        Eterna.client.toggleSolutionVote(solution.nodeID, this._puzzle.nodeID, solution.getProperty("My Votes"))
            .then(data => {
                this._vote_processor.process_data(data["votes"]);
                this.sync_votes();

                let cheevs: any = data["new_achievements"];
                if (cheevs != null) {
                    this._achievements.awardAchievements(cheevs).then(() => { /* ignore result */ });
                }
                cleanup();
            })
            .catch(err => {
                this.showNotification(`Vote failed: ${err}`);
                cleanup();
            });
    }

    private onEntryClicked(): void {
        if (Flashbang.app.isControlKeyDown) {
            this.mark();
            return;
        }

        if (this._filteredSolutions == null) {
            return;
        }

        let [index] = this._dataCols[0].getMouseIndex();
        if (index >= 0) {
            this.showActionBox(this._filteredSolutions[index + this._firstVisSolutionIdx]);
        }
    }

    private showActionBox(solution: Solution): void {
        this.closeActionBox();

        let actionBox = this.showDialog(new ActionBox(solution, this._puzzle, this._novote));
        this._actionBoxRef = actionBox.ref;

        actionBox.playClicked.connect(() => this.startGameWithSolution(solution));
        actionBox.seeResultClicked.connect(() => this.reviewExp(solution));
        actionBox.voteClicked.connect(() => this.vote(solution));
        actionBox.sortClicked.connect(() => this.sortOnSolution(solution));
        actionBox.editClicked.connect(() => this.navigateToSolution(solution));
        actionBox.deleteClicked.connect(() => this.unpublish(solution));
    }

    private closeActionBox(): void {
        this._actionBoxRef.destroyObject();
    }

    private onMouseMove(): void {
        this._selection_box.visible = false;

        if (this._dataCols == null || this._actionBoxRef.isLive) {
            return;
        }

        let [index, yOffset] = this._dataCols[0].getMouseIndex();
        if (index >= 0) {
            this._selection_box.visible = true;
            this._selection_box.position = new Point(7, this._content.toLocal(Flashbang.globalMouse).y + yOffset);
        }
    }

    private mark(): void {
        // if (this._dataCols == null) {
        //     this._marker_boxes.visible = false;
        //     return;
        // }
        //
        // if (this._actionBoxRef.isLive) {
        //     return;
        // }
        //
        // if (this.mouseX < 0 || this.mouseX > this._offscreen_width ||
        //     this.mouseY < 0 || this.mouseY > this._offscreen_height) {
        //     return;
        // }
        //
        // this._marker_boxes.visible = true;
        // let res: any[] = DataCol(this._dataCols[0]).get_current_mouse_index();
        // let index: number = res[0] + this._firstVisSolutionIdx;
        // let rawId: number = this.get_solution_id_from_index(index);
        //
        // if (!this._marker_boxes.is_selected(index)) {
        //     this._marker_boxes.add_marker(index, rawId);
        //     this._selection_group.push(rawId);
        // } else {
        //     this._marker_boxes.del_marker(index);
        //     //trace(_selection_group);
        //     let removeIndex: number = -1;
        //
        //     for (let ii = 0; ii < this._selection_group.length; ii++) {
        //         if (this._selection_group[ii] == rawId) {
        //             removeIndex = ii;
        //             break;
        //         }
        //     }
        //     //trace("REMOVING",rawId,removeIndex);
        //     this._selection_group.splice(removeIndex, 1);
        // }
        //
        // this._marker_boxes.on_draw(this._firstVisSolutionIdx);
        //
        // //trace(_selection_group);
        // AutosaveManager.instance.saveObjects(this._selection_group, DesignBrowserMode.SELTOKEN);
    }

    private openSortWindow(): void {
        this.showDialog(new SortOptionsDialog(this._sortOptions));
    }

    private openCustomizeWindow(): void {
        // if (!this._customize_win.visible) {
        //     this._customize_win.alpha = 0;
        //     this._customize_win.visible = true;
        //     this._customize_win.set_animator(new GameAnimatorFader(0, 1, 0.5, false));
        // }
    }

    private updateSortOption(category: DesignCategory, sortOrder: SortOrder, sortArgs: any[] = null): void {
        if (sortOrder != SortOrder.NONE) {
            this._sortOptions.addCriteria(category, sortOrder, sortArgs);
        } else {
            this._sortOptions.removeCriteria(category);
        }
    }

    private customizeCategory(names: DesignCategory[]): void {
        this._columnNames = names;
        Eterna.settings.designBrowserColumnNames.value = names;
        this._dataCols = null;
        this.setup_data_cols();
        this.reorganize(true);
    }

    private reorganize(sort: boolean): void {
        if (sort) {
            this._all_solutions.sort((a, b) => this._sortOptions.compareSolutions(a, b));

            for (let dataCol of this._dataCols) {
                dataCol.set_sort_state(this._sortOptions.getSortOrder(dataCol.category));
            }
        }

        let solutions: Solution[] = [];
        for (let sol of this._all_solutions) {
            let shouldAdd = true;
            for (let dataCol of this._dataCols) {
                if (!dataCol.is_qualified(sol)) {
                    shouldAdd = false;
                    break;
                }
            }

            if (shouldAdd) {
                solutions.push(sol);
            }
        }

        this._filteredSolutions = solutions;
        this.setData(solutions, false, false);
        this.set_scroll_vertical(-1);
    }

    private set_scroll_horizontal(progress: number): void {
        this._dataColParent.display.x = (this._whole_row_width > this.contentWidth) ?
            (this.contentWidth - this._whole_row_width) * progress :
            0;
    }

    private set_scroll_vertical(progress: number): void {
        this._firstVisSolutionIdx = 0;
        if (this._dataCols == null) {
            return;
        }

        if (progress < 0) {
            progress = this._vSlider.get_progress();
        }

        if (this._filteredSolutions != null) {
            this._firstVisSolutionIdx = this._filteredSolutions.length * progress;
        }

        for (let dataCol of this._dataCols) {
            dataCol.set_progress(this._firstVisSolutionIdx);
        }

        this._marker_boxes.on_draw(this._firstVisSolutionIdx);
    }

    private refreshSolutions(): void {
        SolutionManager.instance.getSolutionsForPuzzle(this._puzzle.nodeID)
            .then(() => this.refresh_browser());
    }

    private update_votes(): void {
        this._vote_processor.update_votes(this._puzzle.nodeID, this._puzzle.round)
            .then(() => this.sync_votes());
    }

    private sync_votes(): void {
        let votesLeft: number = this._vote_processor.votesLeft;
        let round: number = this._puzzle.round;
        let available: number = this._puzzle.numSubmissions;
        let mySolutionTitles: string[] = SolutionManager.instance.getMyCurrentSolutionTitles(round);

        if (!this._novote) {
            this._votesText.text = `You have <bold>${votesLeft}</bold> votes and ` +
                `<bold>${available - mySolutionTitles.length}</bold> solution slots left.`;
        } else {
            this._votesText.text = "This puzzle has been cleared.";
        }

        const WMARGIN = 22;
        const HMARGIN = 17;
        this._ins_panel.setSize(this._votesText.width + 2 * WMARGIN, this._votesText.height + 2 * HMARGIN);

        this.reorganize(true);
    }

    private setup_data_cols(): void {
        const FONT = "Arial";
        const FONT_SIZE = 14;

        if (this._dataCols != null) {
            for (let dataCol of this._dataCols) {
                dataCol.destroySelf();
            }
        }

        this._dataCols = [];
        for (let columnName of this._columnNames) {
            if (this._novote && (columnName == DesignCategory.Votes || columnName == DesignCategory.My_Votes)) {
                continue;
            }

            let column: DataCol;
            switch (columnName) {
            case DesignCategory.Title:
                column = new DataCol(DesignBrowserDataType.STRING, columnName, 250, FONT, FONT_SIZE, true);
                break;
            case DesignCategory.Designer:
                column = new DataCol(DesignBrowserDataType.STRING, columnName, 220, FONT, FONT_SIZE, true);
                break;
            case DesignCategory.Description:
                column = new DataCol(DesignBrowserDataType.STRING, columnName, 300, FONT, FONT_SIZE, true);
                break;
            case DesignCategory.Sequence:
                column = new DataCol(DesignBrowserDataType.STRING, columnName, 0, FONT, FONT_SIZE, false);
                break;
            case DesignCategory.Synthesized:
                column = new DataCol(DesignBrowserDataType.STRING, columnName, 100, FONT, FONT_SIZE, true);
                break;
            case DesignCategory.Votes:
                column = new DataCol(DesignBrowserDataType.NUMBER, columnName, 100, FONT, FONT_SIZE, true);
                break;
            case DesignCategory.Synthesis_score:
                column = new DataCol(DesignBrowserDataType.NUMBER, columnName, 170, FONT, FONT_SIZE, true);
                break;
            default:
                column = new DataCol(DesignBrowserDataType.NUMBER, columnName, 125, FONT, FONT_SIZE, true);
                break;
            }

            column.setSize(this.contentWidth, this.contentHeight);
            column.sortOrderChanged.connect(sortOrder => this.updateSortOption(column.category, sortOrder));

            // if (this.root.loaderInfo.parameters.filter1 == columnName) {
            //     column.set_filter(this.root.loaderInfo.parameters.filter1_arg1, this.root.loaderInfo.parameters.filter1_arg2);
            // } else if (this.root.loaderInfo.parameters.filter2 == columnName) {
            //     column.set_filter(this.root.loaderInfo.parameters.filter2_arg1, this.root.loaderInfo.parameters.filter2_arg2);
            // } else if (this.root.loaderInfo.parameters.filter3 == columnName) {
            //     column.set_filter(this.root.loaderInfo.parameters.filter3_arg1, this.root.loaderInfo.parameters.filter3_arg2);
            // }

            this._dataCols.push(column);
            this._dataColParent.addObject(column, this._dataColParent.container);
        }

        this.layout_columns(false);
    }

    private setData(solutions: Solution[], animate: boolean, initialize_only: boolean = false): void {
        if (this._dataCols == null) {
            this.setup_data_cols();
        }

        if (initialize_only) {
            return;
        }

        let puz: Puzzle = this._puzzle;

        for (let dataCol of this._dataCols) {
            let data_array: any[] = [];

            let category: DesignCategory = dataCol.category;
            let exp_array: Feedback[] = [];

            for (let solution of solutions) {
                exp_array.push(solution.expFeedback);
            }

            for (let ii = 0; ii < solutions.length; ii++) {
                //single row of raw data
                let singleLineRawData: Solution = solutions[ii];

                if (category == DesignCategory.Sequence) {
                    data_array.push(singleLineRawData.sequence);
                    if (ii == 0) {
                        dataCol.set_width(singleLineRawData.sequence.length * 16);
                        dataCol.draw_grid_text();
                    }
                } else if (category == DesignCategory.Description) {
                    let des = singleLineRawData.getProperty("Description");
                    if (des.length < 45) {
                        data_array.push(des);
                    } else {
                        data_array.push(des.substr(0, 40) + "...");
                    }
                } else if (category == DesignCategory.Title) {
                    let des = singleLineRawData.getProperty("Title");
                    if (des.length < 30) {
                        data_array.push(des);
                    } else {
                        data_array.push(des.substr(0, 25) + "...");
                    }
                } else {
                    let rawdata: any = singleLineRawData.getProperty(category);
                    data_array.push(rawdata);
                }
            }

            if (category == DesignCategory.Sequence || category == DesignCategory.Synthesis_score) {
                dataCol.set_exp_data(exp_array);
            }
            dataCol.set_pairs(EPars.parenthesisToPairs(puz.getSecstruct()));

            //Setting and Displaying all raw data for each column
            dataCol.set_data_and_display(data_array);
        }

        this.refresh_marking_boxes();
        this.layout_columns(animate);
    }

    private get_solution_index_from_id(id: number): number {
        for (let ii = 0; ii < this._filteredSolutions.length; ii++) {
            let rawId: any = this._filteredSolutions[ii].getProperty("Id");
            if (rawId == id) {
                return ii;
            }
        }
        return -1;
    }

    private get_solution_id_from_index(index: number): number {
        return this._all_solutions[index].getProperty("Id");
    }

    private layout_columns(animate: boolean): void {
        this._whole_row_width = 0;

        for (let ii = 0; ii < this._dataCols.length; ii++) {
            let data_col: DataCol = this._dataCols[ii];
            if (animate) {
                data_col.replaceNamedObject("AnimateLocation",
                    new LocationTask(this._whole_row_width, 0, 0.5, Easing.easeOut));
            } else {
                data_col.display.position = new Point(this._whole_row_width, 0);
            }

            this._whole_row_width += data_col.get_width();

            if (ii % 2 == 0) {
                data_col.set_column_color(0x012034);
            } else {
                data_col.set_column_color(0x1A2F43);
            }
        }
    }

    private refresh_marking_boxes(): void {
        this._marker_boxes.clear();
        for (let ii = 0; ii < this._selection_group.length; ii++) {
            let index: number = this.get_solution_index_from_id(this._selection_group[ii]);
            this._marker_boxes.add_marker(index, this._selection_group[ii]);
        }
        this._marker_boxes.on_draw(this._firstVisSolutionIdx);
    }

    private refresh_browser(): void {
        let solutions: Solution[] = SolutionManager.instance.solutions;
        let puz: Puzzle = this._puzzle;

        /// Set puzzle title
        // Application.instance.get_application_gui("Puzzle Title").set_text(puz.get_puzzle_name());

        this.setData(solutions, false, true);

        this._all_solutions = solutions;
        this.update_votes();
        this.set_scroll_vertical(-1);

        this.updateLayout();
    }

    private static return_to_game(): void {
        // Application.instance.transit_game_mode(Application.instance.get_previous_game_mode(), null);
    }

    private readonly _puzzle: Puzzle;
    private readonly _novote: boolean;
    private readonly _content = new Container();

    private _actionBoxRef: GameObjectRef = GameObjectRef.NULL;

    private _divider1: DotLine;
    private _divider2: DotLine;
    private _gridLines: GridLines;
    private _maskBox: MaskBox;

    private _selection_group: number[];
    private _vSlider: SliderBar;
    private _hSlider: SliderBar;
    private _dataColParent: ContainerObject;
    private _firstVisSolutionIdx: number;
    private _whole_row_width: number;
    private _dataCols: DataCol[];
    private _all_solutions: Solution[];
    private _filteredSolutions: Solution[];

    private _sortOptions: SortOptions;
    // private _sort_window: SortWindow;
    // private _customize_win: CustomWin;
    private _toolbarLayout: HLayoutContainer;
    private _customizeButton: GameButton;
    private _return_to_game_button: GameButton;
    private _letter_color_button: GameButton;
    private _exp_color_button: GameButton;
    private _votesText: MultiStyleText;
    private _ins_panel: GamePanel;
    // private _submit_status_text: Text;
    // private _loading_text: Text;
    private _selection_box: SelectionBox;
    private _marker_boxes: MarkersBoxes;
    private _columnNames: DesignCategory[];
    private _vote_processor: VoteProcessor;

    private static readonly DEFAULT_COLUMNS: DesignCategory[] = [
        DesignCategory.Id,
        DesignCategory.Title,
        DesignCategory.Designer,
        DesignCategory.Votes,
        DesignCategory.My_Votes,
        DesignCategory.Description,
        DesignCategory.Round,
        DesignCategory.GC_Pairs,
        DesignCategory.UA_Pairs,
        DesignCategory.GU_Pairs,
        DesignCategory.Melting_Point,
        DesignCategory.Free_Energy,
        DesignCategory.Synthesized,
        DesignCategory.Synthesis_score,
        DesignCategory.Sequence,
    ];
}
