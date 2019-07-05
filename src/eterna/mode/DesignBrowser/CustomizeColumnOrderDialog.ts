import {Container, Point, Text} from 'pixi.js';
import {HAlign, VAlign} from 'flashbang/core';
import {HLayoutContainer, VLayoutContainer} from 'flashbang/layout';
import {Arrays, DisplayUtil} from 'flashbang/util';
import {Signal} from 'signals';
import {Bitmaps} from 'eterna/resources';
import {
    Dialog, FixedWidthTextField, GameButton, GamePanel, GamePanelType
} from 'eterna/ui';
import {Fonts, GraphicsUtil} from 'eterna/util';
import {DesignCategory} from './DesignBrowserMode';

export default class CustomizeColumnOrderDialog extends Dialog<void> {
    public readonly columnsReorganized = new Signal<DesignCategory[]>();

    constructor(allCategories: DesignCategory[], curColumns: DesignCategory[], disabled: Set<DesignCategory> = null) {
        super();
        this._allColumnCategories = allCategories.slice();
        this._initialColumns = curColumns.slice();
        this._disabled = disabled;
    }

    protected added(): void {
        super.added();

        this._bg = new GamePanel(GamePanelType.NORMAL, 1.0, 0x152843, 0.27, 0xC0DCE7);
        this.addObject(this._bg, this.container);

        this._panelContent = new VLayoutContainer(0, HAlign.CENTER);
        this.container.addChild(this._panelContent);

        this._columnUILayout = new VLayoutContainer();
        let addCriterionLayout = new HLayoutContainer(2);
        this._panelContent.addChild(this._columnUILayout);
        this._panelContent.addVSpacer(10);
        this._panelContent.addChild(addCriterionLayout);

        // ADD CRITERION LAYOUT
        this._prevCategoryButton = new GameButton().allStates(GraphicsUtil.drawLeftTriangle(2));
        this._prevCategoryButton.clicked.connect(() => this.offsetCurCategoryIdx(-1));
        this.addObject(this._prevCategoryButton, addCriterionLayout);

        this._curCategoryText = new FixedWidthTextField(
            this._allColumnCategories[0],
            Fonts.arial('', 17).color(0xffffff).style,
            140, HAlign.CENTER
        );
        addCriterionLayout.addChild(this._curCategoryText);

        this._nextCategoryButton = new GameButton().allStates(GraphicsUtil.drawRightTriangle(2));
        this._nextCategoryButton.clicked.connect(() => this.offsetCurCategoryIdx(1));
        this.addObject(this._nextCategoryButton, addCriterionLayout);

        addCriterionLayout.addHSpacer(10);

        this._addCriterionButton = new GameButton().label('Add', 15);
        this._addCriterionButton.clicked.connect(() => this.addCurrentCriteria());
        this.addObject(this._addCriterionButton, addCriterionLayout);

        let resetButton = new GameButton().label('Reset', 15);
        resetButton.clicked.connect(() => this.reset());
        this.addObject(resetButton, addCriterionLayout);

        addCriterionLayout.layout();

        this._panelContent.addVSpacer(20);

        let okButton = new GameButton().label('Ok', 20);
        okButton.clicked.connect(() => this.close(null));
        this.addObject(okButton, this._panelContent);

        // EXISTING SORT CRITERIA
        for (let ii = 0; ii < this._initialColumns.length; ++ii) {
            this.addColumnUI(this._initialColumns[ii], ii);
        }

        this.validateCurCategoryIdx();
        this.layout();
        this.regs.add(this.mode.resized.connect(() => this.repositionDialog()));
    }

    private addColumnUI(category: DesignCategory, idx: number): void {
        let ui = new ColumnUI(category);
        this._columnUILayout.addChild(ui.container);
        Arrays.addAt(this._columnUIs, ui, idx);

        ui.categoryText = Fonts.arial(category, 14).color(0xffffff).build();
        ui.categoryText.position = new Point(10, 0);
        ui.categoryText.alpha = this.isDisabled(category) ? 0.3 : 1;
        ui.container.addChild(ui.categoryText);

        ui.moveUpButton = new GameButton().allStates(Bitmaps.GoUpImg);
        ui.moveUpButton.clicked.connect(() => this.moveColumn(category, -1));
        ui.moveUpButton.display.position = new Point(280, 5);
        this.addObject(ui.moveUpButton, ui.container);

        ui.moveDownButton = new GameButton().allStates(Bitmaps.GoDownImg);
        ui.moveDownButton.clicked.connect(() => this.moveColumn(category, 1));
        ui.moveDownButton.display.position = new Point(300, 5);
        this.addObject(ui.moveDownButton, ui.container);

        ui.removeButton = new GameButton().allStates(Bitmaps.CancelImg);
        ui.removeButton.clicked.connect(() => this.removeColumn(category));
        ui.removeButton.display.position = new Point(320, 5);
        this.addObject(ui.removeButton, ui.container);
    }

    private getColumnIdx(category: DesignCategory): number {
        return this._columnUIs.findIndex(ui => ui.category === category);
    }

    private getUnusedColumns(): DesignCategory[] {
        return this._allColumnCategories.filter(category => this.getColumnIdx(category) < 0);
    }

    private onColumnsChanged(): void {
        this.columnsReorganized.emit(this._columnUIs.map(ui => ui.category));
    }

    private addColumn(category: DesignCategory): void {
        let curIdx = this.getColumnIdx(category);
        if (curIdx >= 0) {
            this.setCriteriaIdx(category, 0);
        } else {
            this.addColumnUI(category, 0);
            this.layout();
        }

        this.validateCurCategoryIdx();

        this.onColumnsChanged();
    }

    private removeColumn(category: DesignCategory): void {
        let idx = this.getColumnIdx(category);
        if (idx < 0) {
            throw new Error(`Can't find sort_category ${category}`);
        }

        this._columnUIs[idx].destroy();
        this._columnUIs.splice(idx, 1);

        this.validateCurCategoryIdx();
        this.layout();

        this.onColumnsChanged();
    }

    private reset(): void {
        for (let ui of this._columnUIs) {
            ui.destroy();
        }
        this._columnUIs = [];

        for (let ii = 0; ii < this._allColumnCategories.length; ++ii) {
            this.addColumnUI(this._allColumnCategories[ii], ii);
        }

        this.validateCurCategoryIdx();
        this.layout();
        this.onColumnsChanged();
    }

    private offsetCurCategoryIdx(increment: number): void {
        this._addColumnCategoryIdx += increment;
        this.validateCurCategoryIdx();
    }

    private isDisabled(category: DesignCategory): boolean {
        return this._disabled != null && this._disabled.has(category);
    }

    private validateCurCategoryIdx(): void {
        let unused = this.getUnusedColumns();
        if (unused.length > 0) {
            this._addColumnCategoryIdx %= unused.length;
            if (this._addColumnCategoryIdx < 0) {
                this._addColumnCategoryIdx += unused.length;
            }

            this._curCategoryText.text = unused[this._addColumnCategoryIdx];
            this._curCategoryText.alpha = 1;
            this._addCriterionButton.enabled = true;
            this._prevCategoryButton.enabled = true;
            this._nextCategoryButton.enabled = true;
        } else {
            this._addColumnCategoryIdx = 0;
            this._curCategoryText.alpha = 0.3;
            this._addCriterionButton.enabled = false;
            this._prevCategoryButton.enabled = false;
            this._nextCategoryButton.enabled = false;
        }
    }

    private addCurrentCriteria(): void {
        let unusedCategories = this.getUnusedColumns();
        if (unusedCategories.length > 0) {
            this.addColumn(unusedCategories[this._addColumnCategoryIdx]);
        }
    }

    private moveColumn(category: DesignCategory, displacement: number): void {
        this.setCriteriaIdx(category, this.getColumnIdx(category) + displacement);
        this.onColumnsChanged();
    }

    private setCriteriaIdx(category: DesignCategory, newIdx: number): void {
        let curIdx = this.getColumnIdx(category);
        if (curIdx < 0) {
            throw new Error(`Can't find sort_category ${category}`);
        }

        if (curIdx === newIdx || newIdx < 0 || newIdx >= this._columnUIs.length) {
            return;
        }

        Arrays.swap(this._columnUIs, curIdx, newIdx);

        this.layout();
    }

    private layout(): void {
        this._columnUILayout.removeChildren();
        for (let ui of this._columnUIs) {
            this._columnUILayout.addChild(ui.container);
        }

        this._panelContent.layout(true);
        this._bg.setSize(this._panelContent.width + 60, this._panelContent.height + 40);

        this.repositionDialog();
    }

    private repositionDialog(): void {
        DisplayUtil.positionRelativeToStage(
            this._bg.display, HAlign.CENTER, VAlign.TOP,
            HAlign.CENTER, VAlign.TOP, 0, 145
        );

        DisplayUtil.positionRelative(
            this._panelContent, HAlign.CENTER, VAlign.CENTER,
            this._bg.display, HAlign.CENTER, VAlign.CENTER
        );
    }

    private readonly _allColumnCategories: DesignCategory[];
    private readonly _initialColumns: DesignCategory[];
    private readonly _disabled: Set<DesignCategory>;

    private _bg: GamePanel;

    private _panelContent: VLayoutContainer;
    private _columnUILayout: VLayoutContainer;

    private _curCategoryText: FixedWidthTextField;
    private _prevCategoryButton: GameButton;
    private _nextCategoryButton: GameButton;
    private _addCriterionButton: GameButton;

    private _columnUIs: ColumnUI[] = [];
    private _addColumnCategoryIdx: number = 0;
}

class ColumnUI {
    public readonly container: Container = new Container();
    public readonly category: DesignCategory;

    public categoryText: Text;
    public moveUpButton: GameButton;
    public moveDownButton: GameButton;
    public removeButton: GameButton;

    constructor(category: DesignCategory) {
        this.category = category;
    }

    public destroy(): void {
        this.categoryText.destroy({children: true});
        this.moveUpButton.destroySelf();
        this.moveDownButton.destroySelf();
        this.removeButton.destroySelf();

        this.container.destroy({children: true});
    }
}
