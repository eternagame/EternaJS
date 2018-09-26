import {Graphics, Point, Text} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Bitmaps} from "../../resources/Bitmaps";
import {Dialog} from "../../ui/Dialog";
import {GameButton} from "../../ui/GameButton";
import {GamePanel, GamePanelType} from "../../ui/GamePanel";
import {Fonts} from "../../util/Fonts";
import {SortOptions, SortOrder} from "./SortOptions";

export class SortOptionsDialog extends Dialog<void> {
    public readonly options: SortOptions;

    constructor(options: SortOptions) {
        super();

        this.options = options;
    }

    protected added(): void {
        super.added();

        this._panel = new GamePanel(GamePanelType.NORMAL, 0.89, 0x0);
        this.addObject(this._panel, this.container);

        this._sortCategorySelection = Fonts.arial(this.options.sortNames[0], 17).color(0xffffff).bold().build();
        this._panel.container.addChild(this._sortCategorySelection);

        this._sortOrderSelection = new GameButton().label("increasing", 17);
        this._sortOrderSelection.clicked.connect(() => this.toggleCurrentSortOrder());
        this.addObject(this._sortOrderSelection, this._panel.container);

        this._addButton = new GameButton().label("Add", 15);
        this._addButton.clicked.connect(() => this.addCurrentCriteria());
        this.addObject(this._addButton, this._panel.container);

        this._sortCategoryLeft = new GameButton().allStates(
            new Graphics()
            .beginFill(0xFFFFFF, 0.8)
            .moveTo(0, 5)
            .lineTo(-7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5));
        this._sortCategoryLeft.clicked.connect(() => this.sortSelectionLeft());
        this.addObject(this._sortCategoryLeft, this._panel.container);

        this._sortCategoryRight = new GameButton().allStates(
            new Graphics()
            .beginFill(0xFFFFFF, 0.8)
            .moveTo(0, 5)
            .lineTo(7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5));
        this._sortCategoryRight.clicked.connect(() => this.sortSelectionRight());
        this.addObject(this._sortCategoryRight, this._panel.container);

        this._okButton = new GameButton().label("Ok", 20);
        this._okButton.clicked.connect(() => this.close(null));
        this.addObject(this._okButton, this._panel.container);

        for (let ii = 0; ii < this.options.sortCriteria.length; ++ii) {
            let criterion = this.options.sortCriteria[ii];
            this.addCriteriaUI(criterion.category, criterion.sortOrder, ii);
        }

        this.layout();

        const centerDialog = () => {
            DisplayUtil.positionRelativeToStage(
                this._panel.container, HAlign.CENTER, VAlign.CENTER,
                HAlign.CENTER, VAlign.CENTER);
        };
        centerDialog();
        this.regs.add(this.mode.resized.connect(centerDialog));
    }

    private addCriteriaUI(category: string, sortOrder: SortOrder, idx: number): void {
        let sortCategoryText = Fonts.arial(category, 14).color(0xffffff).build();
        this._panel.container.addChild(sortCategoryText);
        SortOptionsDialog.addAt(this._sortCategoryTexts, sortCategoryText, idx);

        let sortOrderButton = new GameButton()
            .label(sortOrder === SortOrder.INCREASING ? "increasing" : "decreasing", 17);
        sortOrderButton.clicked.connect(() => this.toggleSort(category));
        this.addObject(sortOrderButton, this._panel.container);
        SortOptionsDialog.addAt(this._sortOrderButtons, sortOrderButton, idx);

        let removeButton = new GameButton().allStates(Bitmaps.CancelImg);
        removeButton.clicked.connect(() => this.removeCriteria(category));
        this.addObject(removeButton, this._panel.container);
        SortOptionsDialog.addAt(this._removeButtons, removeButton, idx);

        let moveUpButton = new GameButton().allStates(Bitmaps.GoUpImg);
        moveUpButton.clicked.connect(() => this.moveCriteria(category, -1));
        this.addObject(moveUpButton, this._panel.container);
        SortOptionsDialog.addAt(this._moveUpButtons, moveUpButton, idx);

        let moveDownButton = new GameButton().allStates(Bitmaps.GoDownImg);
        moveDownButton.clicked.connect(() => this.moveCriteria(category, 1));
        this.addObject(moveDownButton, this._panel.container);
        SortOptionsDialog.addAt(this._moveDownButtons, moveDownButton, idx);
    }

    private addCriteria(category: string, order: SortOrder, args: any = null): void {
        let curIdx = this.options.getCriterionIdx(category);
        this.options.addCriteria(category, order, args);

        if (curIdx >= 0) {
            if (order == SortOrder.INCREASING) {
                this._sortOrderButtons[curIdx].label("increasing", 17);
            } else {
                this._sortOrderButtons[curIdx].label("decreasing", 17);
            }

            if (curIdx > 0) {
                this.setCriteriaIdx(category, 0);
            }

        } else {
            this.addCriteriaUI(category, order, 0);

            if (this.options.sortNames[this._sortCategoryID] == category) {
                if (!this.sortSelectionRight()) {
                    this._addButton.display.alpha = 0.3;
                    this._sortOrderSelection.display.alpha = 0.3;
                    this._sortCategorySelection.alpha = 0.3;
                    this._sortCategoryLeft.display.alpha = 0.3;
                    this._sortCategoryRight.display.alpha = 0.3;

                    this._sortCategoryLeft.enabled = false;
                    this._sortCategoryRight.enabled = false;
                    this._sortOrderSelection.enabled = false;
                    this._addButton.enabled = false;
                }
            }

            this.layout();
        }
    }

    private removeCriteria(category: string): void {
        let idx = this.options.getCriterionIdx(category);
        if (idx < 0) {
            throw new Error("Can't find sort_category " + category);
        }

        this.options.removeCriteria(category);

        this._sortCategoryTexts[idx].destroy({children: true});
        this._sortCategoryTexts.splice(idx, 1);

        this._sortOrderButtons[idx].destroySelf();
        this._sortOrderButtons.splice(idx, 1);

        this._removeButtons[idx].destroySelf();
        this._removeButtons.splice(idx, 1);

        this._moveUpButtons[idx].destroySelf();
        this._moveUpButtons.splice(idx, 1);

        this._moveDownButtons[idx].destroySelf();
        this._moveDownButtons.splice(idx, 1);

        this._addButton.display.alpha = 1.0;
        this._sortOrderSelection.display.alpha = 1.0;
        this._sortCategorySelection.alpha = 1.0;
        this._sortCategoryLeft.display.alpha = 1.0;
        this._sortCategoryRight.display.alpha = 1.0;

        this._sortCategoryLeft.enabled = true;
        this._sortCategoryRight.enabled = true;
        this._sortOrderSelection.enabled = true;
        this._addButton.enabled = true;

        if (this.options.getCriterionIdx(this.options.sortNames[this._sortCategoryID]) >= 0) {
            this.sortSelectionRight();
        }

        this.layout();
    }

    private toggleCurrentSortOrder(): void {
        this._sortOrder *= -1;

        if (this._sortOrder == SortOrder.INCREASING) {
            this._sortOrderSelection.label("increasing", 17);
        } else {
            this._sortOrderSelection.label("decreasing", 17);
        }
    }

    private sortSelectionLeft(): boolean {
        for (let ii = this._sortCategoryID - 1; ii > this._sortCategoryID - this.options.sortNames.length; ii--) {
            let index: number = (ii + this.options.sortNames.length) % this.options.sortNames.length;
            if (this.options.getCriterionIdx(this.options.sortNames[index]) < 0) {
                this._sortCategoryID = index;
                this._sortCategorySelection.text = this.options.sortNames[index];
                return true;
            }
        }

        return false;
    }

    private sortSelectionRight(): boolean {
        for (let ii = this._sortCategoryID + 1; ii < this._sortCategoryID + this.options.sortNames.length; ii++) {
            let index: number = (ii) % this.options.sortNames.length;
            if (this.options.getCriterionIdx(this.options.sortNames[index]) < 0) {
                this._sortCategoryID = index;
                this._sortCategorySelection.text = this.options.sortNames[index];
                return true;
            }
        }

        return false;
    }

    private addCurrentCriteria(): void {
        this.addCriteria(this.options.sortNames[this._sortCategoryID], this._sortOrder);
    }

    private toggleSort(category: string): void {
        let index = this.options.getCriterionIdx(category);
        if (index < 0) {
            throw new Error("Can't find sort_category " + category);
        }

        let newSortOrder = this.options.toggleSort(category);
        if (newSortOrder == SortOrder.INCREASING) {
            this._sortOrderButtons[index].label("increasing", 17);
        } else {
            this._sortOrderButtons[index].label("decreasing", 17);
        }
    }

    private moveCriteria(category: string, displacement: number): void {
        let curIdx = this.options.getCriterionIdx(category);
        this.setCriteriaIdx(category, curIdx + displacement);
    }

    private setCriteriaIdx(category: string, newIdx: number): void {
        let curIdx = this.options.getCriterionIdx(category);
        if (curIdx < 0) {
            throw new Error("Can't find sort_category " + category);
        }

        if (curIdx === newIdx || newIdx < 0 || newIdx >= this.options.sortCriteria.length) {
            return;
        }

        this.options.setCriteriaIdx(category, newIdx);

        SortOptionsDialog.swap(this._sortCategoryTexts, curIdx, newIdx);
        SortOptionsDialog.swap(this._sortOrderButtons, curIdx, newIdx);
        SortOptionsDialog.swap(this._removeButtons, curIdx, newIdx);
        SortOptionsDialog.swap(this._moveUpButtons, curIdx, newIdx);
        SortOptionsDialog.swap(this._moveDownButtons, curIdx, newIdx);

        this.layout();
    }

    private layout(): void {
        let newHeight = 20 + this.options.sortCriteria.length * SortOptionsDialog.ROW_HEIGHT + 80;
        this._panel.setSize(355, newHeight);

        let ii: number;
        for (ii = 0; ii < this.options.sortCriteria.length; ii++) {
            this._sortCategoryTexts[ii].position = new Point(10, 20 + ii * SortOptionsDialog.ROW_HEIGHT);
            this._sortOrderButtons[ii].display.position = new Point(180, 20 + ii * SortOptionsDialog.ROW_HEIGHT);
            this._moveUpButtons[ii].display.position = new Point(280, 20 + ii * SortOptionsDialog.ROW_HEIGHT + 5);
            this._moveDownButtons[ii].display.position = new Point(300, 20 + ii * SortOptionsDialog.ROW_HEIGHT + 5);
            this._removeButtons[ii].display.position = new Point(320, 20 + ii * SortOptionsDialog.ROW_HEIGHT + 5);
        }

        this._sortCategorySelection.position = new Point(30, 20 + ii * SortOptionsDialog.ROW_HEIGHT + 10);
        this._sortCategoryLeft.display.position = new Point(20, 20 + ii * SortOptionsDialog.ROW_HEIGHT + 22);
        this._sortCategoryRight.display.position = new Point(150, 20 + ii * SortOptionsDialog.ROW_HEIGHT + 22);
        this._sortOrderSelection.display.position = new Point(180, 20 + ii * SortOptionsDialog.ROW_HEIGHT + 10);
        this._addButton.display.position = new Point(280, 20 + ii * SortOptionsDialog.ROW_HEIGHT + 10);
        this._okButton.display.position = new Point(120, 20 + ii * SortOptionsDialog.ROW_HEIGHT + 37);
    }

    private static swap<T>(array: T[], i: number, j: number): void {
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    private static addAt<T>(array: T[], element: T, idx: number): void {
        if (idx === 0) {
            array.unshift(element);
        } else if (idx === array.length) {
            array.push(element);
        } else {
            array.splice(idx, 0, element);
        }
    }

    private _panel: GamePanel;

    private _sortCategorySelection: Text;
    private _sortCategoryLeft: GameButton;
    private _sortCategoryRight: GameButton;
    private _sortOrderSelection: GameButton;
    private _addButton: GameButton;
    private _okButton: GameButton;

    private _removeButtons: GameButton[] = [];
    private _moveUpButtons: GameButton[] = [];
    private _moveDownButtons: GameButton[] = [];
    private _sortCategoryTexts: Text[] = [];
    private _sortOrderButtons: GameButton[] = [];
    private _sortCategoryID: number = 0;
    private _sortOrder: SortOrder = 1;

    private static readonly ROW_HEIGHT = 20;

}
