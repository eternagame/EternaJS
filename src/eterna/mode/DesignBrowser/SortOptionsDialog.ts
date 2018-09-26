import {Container, Graphics, Point, Text} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {HLayoutContainer} from "../../../flashbang/layout/HLayoutContainer";
import {VLayoutContainer} from "../../../flashbang/layout/VLayoutContainer";
import {Arrays} from "../../../flashbang/util/Arrays";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Bitmaps} from "../../resources/Bitmaps";
import {Dialog} from "../../ui/Dialog";
import {FixedWidthTextField} from "../../ui/FixedWidthTextField";
import {GameButton} from "../../ui/GameButton";
import {GamePanel, GamePanelType} from "../../ui/GamePanel";
import {Fonts} from "../../util/Fonts";
import {GraphicsUtil} from "../../util/GraphicsUtil";
import {DesignCategory} from "./DesignBrowserMode";
import {SortOptions, SortOrder} from "./SortOptions";

export class SortOptionsDialog extends Dialog<void> {
    public readonly options: SortOptions;

    constructor(options: SortOptions) {
        super();
        this.options = options;
    }

    protected added(): void {
        super.added();

        this._bg = new GamePanel(GamePanelType.NORMAL, 1.0, 0x152843, 0.27, 0xC0DCE7);
        this.addObject(this._bg, this.container);

        this._panelContent = new VLayoutContainer(0, HAlign.CENTER);
        this.container.addChild(this._panelContent);

        this._sortCriteriaLayout = new VLayoutContainer();
        let addCriterionLayout = new HLayoutContainer(2);
        this._panelContent.addChild(this._sortCriteriaLayout);
        this._panelContent.addVSpacer(10);
        this._panelContent.addChild(addCriterionLayout);

        // ADD CRITERION LAYOUT
        this._prevCategoryButton = new GameButton().allStates(GraphicsUtil.drawLeftTriangle(2));
        this._prevCategoryButton.clicked.connect(() => this.offsetCurCategoryIdx(-1));
        this.addObject(this._prevCategoryButton, addCriterionLayout);

        this._curCategoryText = new FixedWidthTextField(
            this.options.validCategories[0],
            Fonts.arial("", 17).color(0xffffff).style,
            140, HAlign.CENTER);
        addCriterionLayout.addChild(this._curCategoryText);

        this._nextCategoryButton = new GameButton().allStates(GraphicsUtil.drawRightTriangle(2));
        this._nextCategoryButton.clicked.connect(() => this.offsetCurCategoryIdx(1));
        this.addObject(this._nextCategoryButton, addCriterionLayout);

        addCriterionLayout.addHSpacer(10);

        this._toggleCurSortOrderButton = new GameButton().label("increasing", 15);
        this._toggleCurSortOrderButton.clicked.connect(() => this.toggleCurrentSortOrder());
        this.addObject(this._toggleCurSortOrderButton, addCriterionLayout);

        this._addCriterionButton = new GameButton().label("Add", 15);
        this._addCriterionButton.clicked.connect(() => this.addCurrentCriteria());
        this.addObject(this._addCriterionButton, addCriterionLayout);

        addCriterionLayout.layout();

        this._panelContent.addVSpacer(20);

        let okButton = new GameButton().label("Ok", 20);
        okButton.clicked.connect(() => this.close(null));
        this.addObject(okButton, this._panelContent);

        // EXISTING SORT CRITERIA
        for (let ii = 0; ii < this.options.sortCriteria.length; ++ii) {
            let criterion = this.options.sortCriteria[ii];
            this.addCriterionUI(criterion.category, criterion.sortOrder, ii);
        }

        this.validateCurCategoryIdx();
        this.layout();
        this.regs.add(this.mode.resized.connect(() => this.repositionDialog()));
    }

    private addCriterionUI(category: DesignCategory, sortOrder: SortOrder, idx: number): void {
        let ui = new CriterionUI();
        this._sortCriteriaLayout.addChild(ui.container);
        Arrays.addAt(this._criteriaUI, ui, idx);

        ui.categoryText = Fonts.arial(category, 14).color(0xffffff).build();
        ui.categoryText.position = new Point(10, 0);
        ui.container.addChild(ui.categoryText);

        ui.sortOrderButton = new GameButton()
            .label(sortOrder === SortOrder.INCREASING ? "increasing" : "decreasing", 15);
        ui.sortOrderButton.clicked.connect(() => this.toggleSort(category));
        ui.sortOrderButton.display.position = new Point(180, 0);
        this.addObject(ui.sortOrderButton, ui.container);

        ui.moveUpButton = new GameButton().allStates(Bitmaps.GoUpImg);
        ui.moveUpButton.clicked.connect(() => this.moveCriteria(category, -1));
        ui.moveUpButton.display.position = new Point(280, 5);
        this.addObject(ui.moveUpButton, ui.container);

        ui.moveDownButton = new GameButton().allStates(Bitmaps.GoDownImg);
        ui.moveDownButton.clicked.connect(() => this.moveCriteria(category, 1));
        ui.moveDownButton.display.position = new Point(300, 5);
        this.addObject(ui.moveDownButton, ui.container);

        ui.removeButton = new GameButton().allStates(Bitmaps.CancelImg);
        ui.removeButton.clicked.connect(() => this.removeCriteria(category));
        ui.removeButton.display.position = new Point(320, 5);
        this.addObject(ui.removeButton, ui.container);
    }

    private addCriteria(category: DesignCategory, order: SortOrder, args: any = null): void {
        let curIdx = this.options.getCriterionIdx(category);
        this.options.addCriteria(category, order, args);

        if (curIdx >= 0) {
            if (order == SortOrder.INCREASING) {
                this._criteriaUI[curIdx].sortOrderButton.label("increasing", 15);
            } else {
                this._criteriaUI[curIdx].sortOrderButton.label("decreasing", 15);
            }

            if (curIdx > 0) {
                this.setCriteriaIdx(category, 0);
            }

        } else {
            this.addCriterionUI(category, order, 0);
            this.layout();
        }

        this.validateCurCategoryIdx();
    }

    private removeCriteria(category: DesignCategory): void {
        let idx = this.options.getCriterionIdx(category);
        if (idx < 0) {
            throw new Error("Can't find sort_category " + category);
        }

        this.options.removeCriteria(category);

        this._criteriaUI[idx].destroy();
        this._criteriaUI.splice(idx, 1);

        this.validateCurCategoryIdx();
        this.layout();
    }

    private toggleCurrentSortOrder(): void {
        this._addCriteriaSortOrder *= -1;

        if (this._addCriteriaSortOrder == SortOrder.INCREASING) {
            this._toggleCurSortOrderButton.label("increasing", 15);
        } else {
            this._toggleCurSortOrderButton.label("decreasing", 15);
        }
    }

    private offsetCurCategoryIdx(increment: number): void {
        this._addCriteriaCategoryIdx += increment;
        this.validateCurCategoryIdx();
    }

    private validateCurCategoryIdx(): void {
        let unused = this.options.getUnusedCategories();
        if (unused.length > 0) {
            this._addCriteriaCategoryIdx %= unused.length;
            if (this._addCriteriaCategoryIdx < 0) {
                this._addCriteriaCategoryIdx += unused.length;
            }

            this._curCategoryText.alpha = 1;
            this._addCriterionButton.enabled = true;
            this._toggleCurSortOrderButton.enabled = true;
            this._prevCategoryButton.enabled = true;
            this._nextCategoryButton.enabled = true;
            this._curCategoryText.text = unused[this._addCriteriaCategoryIdx];

        } else {
            this._addCriteriaCategoryIdx = 0;
            this._curCategoryText.alpha = 0.3;
            this._addCriterionButton.enabled = false;
            this._toggleCurSortOrderButton.enabled = false;
            this._prevCategoryButton.enabled = false;
            this._nextCategoryButton.enabled = false;
        }
    }

    private addCurrentCriteria(): void {
        let unusedCategories = this.options.getUnusedCategories();
        if (unusedCategories.length > 0) {
            this.addCriteria(unusedCategories[this._addCriteriaCategoryIdx], this._addCriteriaSortOrder);
        }
    }

    private toggleSort(category: DesignCategory): void {
        let index = this.options.getCriterionIdx(category);
        if (index < 0) {
            throw new Error("Can't find sort_category " + category);
        }

        let newSortOrder = this.options.toggleSort(category);
        let ui = this._criteriaUI[index];

        if (newSortOrder == SortOrder.INCREASING) {
            ui.sortOrderButton.label("increasing", 15);
        } else {
            ui.sortOrderButton.label("decreasing", 15);
        }
    }

    private moveCriteria(category: DesignCategory, displacement: number): void {
        let curIdx = this.options.getCriterionIdx(category);
        this.setCriteriaIdx(category, curIdx + displacement);
    }

    private setCriteriaIdx(category: DesignCategory, newIdx: number): void {
        let curIdx = this.options.getCriterionIdx(category);
        if (curIdx < 0) {
            throw new Error("Can't find sort_category " + category);
        }

        if (curIdx === newIdx || newIdx < 0 || newIdx >= this.options.sortCriteria.length) {
            return;
        }

        this.options.setCriteriaIdx(category, newIdx);
        Arrays.swap(this._criteriaUI, curIdx, newIdx);

        this.layout();
    }

    private layout(): void {
        this._sortCriteriaLayout.removeChildren();
        for (let ui of this._criteriaUI) {
            this._sortCriteriaLayout.addChild(ui.container);
        }

        this._panelContent.layout(true);
        this._bg.setSize(this._panelContent.width + 60, this._panelContent.height + 40);

        this.repositionDialog();
    }

    private repositionDialog(): void {
        DisplayUtil.positionRelativeToStage(
            this._bg.display, HAlign.CENTER, VAlign.TOP,
            HAlign.CENTER, VAlign.TOP, 0, 145);

        DisplayUtil.positionRelative(
            this._panelContent, HAlign.CENTER, VAlign.CENTER,
            this._bg.display, HAlign.CENTER, VAlign.CENTER);
    }

    private _bg: GamePanel;

    private _panelContent: VLayoutContainer;
    private _sortCriteriaLayout: VLayoutContainer;

    private _curCategoryText: FixedWidthTextField;
    private _toggleCurSortOrderButton: GameButton;
    private _prevCategoryButton: GameButton;
    private _nextCategoryButton: GameButton;
    private _addCriterionButton: GameButton;

    private _criteriaUI: CriterionUI[] = [];
    private _addCriteriaCategoryIdx: number = 0;
    private _addCriteriaSortOrder: SortOrder = SortOrder.INCREASING;
}

class CriterionUI {
    public readonly container: Container = new Container();
    public categoryText: Text;
    public sortOrderButton: GameButton;
    public moveUpButton: GameButton;
    public moveDownButton: GameButton;
    public removeButton: GameButton;

    public destroy(): void {
        this.categoryText.destroy({children: true});
        this.sortOrderButton.destroySelf();
        this.moveUpButton.destroySelf();
        this.moveDownButton.destroySelf();
        this.removeButton.destroySelf();

        this.container.destroy({children: true});
    }
}
