import {
    Container, Text, Graphics
} from 'pixi.js';
import {Signal} from 'signals';
import {
    HAlign, VLayoutContainer, HLayoutContainer, Arrays, VAlign
} from 'flashbang';
import GameButton from 'eterna/ui/GameButton';
import GraphicsUtil from 'eterna/util/GraphicsUtil';
import FixedWidthTextField from 'eterna/ui/FixedWidthTextField';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameCheckbox from 'eterna/ui/GameCheckbox';
import WindowDialog from 'eterna/ui/WindowDialog';
import {DesignCategory} from './DesignBrowserMode';
import ButtonWithIcon from './ButtonWithIcon';

export default class CustomizeColumnOrderDialog extends WindowDialog<void> {
    public readonly columnsReorganized = new Signal<DesignCategory[]>();
    public readonly selectedFilterUpdate = new Signal<boolean>();

    constructor(
        allCategories: DesignCategory[],
        curColumns: DesignCategory[] | null,
        disabled: Set<DesignCategory> | null = null
    ) {
        super({
            title: 'Configure Columns',
            contentHAlign: HAlign.LEFT,
            contentVAlign: VAlign.TOP
        });
        this._allColumnCategories = allCategories.slice();
        this._initialColumns = curColumns ? curColumns.slice() : null;
        this._disabled = disabled;
    }

    protected added(): void {
        super.added();

        this._content = new VLayoutContainer(0, HAlign.CENTER);
        this._window.content.addChild(this._content);

        this._columnUILayout = new VLayoutContainer(4);
        const addCriterionLayout = new HLayoutContainer(2);
        addCriterionLayout.position.x = 10;
        this._content.addChild(this._columnUILayout);
        this._content.addVSpacer(20);

        // ADD CRITERION LAYOUT
        const criterionContainer = new Container();
        criterionContainer.addChild(new Graphics()
            .beginFill(0x043468)
            .drawRoundedRect(0, -6, 316, 33, 6)
            .endFill());
        criterionContainer.addChild(addCriterionLayout);

        this._content.addChild(criterionContainer);
        this._prevCategoryButton = new GameButton().allStates(
            GraphicsUtil.drawLeftTriangle(2, 0x2F94D1)
        );
        this._prevCategoryButton.clicked.connect(() => this.offsetCurCategoryIdx(-1));
        this.addObject(this._prevCategoryButton, addCriterionLayout);

        this._curCategoryText = new FixedWidthTextField(
            this._allColumnCategories[0],
            Fonts.std('', 17).bold().color(0xffffff).style,
            140, HAlign.CENTER
        );
        addCriterionLayout.addChild(this._curCategoryText);

        this._nextCategoryButton = new GameButton().allStates(GraphicsUtil.drawRightTriangle(2, 0x2F94D1));
        this._nextCategoryButton.clicked.connect(() => this.offsetCurCategoryIdx(1));
        this.addObject(this._nextCategoryButton, addCriterionLayout);

        addCriterionLayout.addHSpacer(20);

        this._addCriterionButton = new ButtonWithIcon({
            icon: Bitmaps.ImgAdd,
            text: {text: 'Add', size: 12},
            frame: null
        });
        this._addCriterionButton.clicked.connect(() => this.addCurrentCriteria());
        this.addObject(this._addCriterionButton, addCriterionLayout);

        addCriterionLayout.addHSpacer(10);
        const resetButton = new ButtonWithIcon({
            icon: Bitmaps.ImgResetCriteria,
            text: {text: 'Reset', size: 12},
            frame: null
        });
        resetButton.clicked.connect(() => this.reset());
        this.addObject(resetButton, addCriterionLayout);

        addCriterionLayout.layout();

        this._content.addVSpacer(20);

        this._currentSelectedFilterCheckbox = new GameCheckbox(12, 'Only show designs selected with control+click');
        this._currentSelectedFilterCheckbox.toggled.connect((e) => {
            this.selectedFilterUpdate.emit(e);
        });
        this.addObject(this._currentSelectedFilterCheckbox, this._content);

        this._content.addVSpacer(20);

        // EXISTING SORT CRITERIA
        if (this._initialColumns !== null) {
            for (let ii = 0; ii < this._initialColumns.length; ++ii) {
                this.addColumnUI(this._initialColumns[ii], ii);
            }
        }

        this.validateCurCategoryIdx();
        this.layout();
    }

    private addColumnUI(category: DesignCategory, idx: number): void {
        const ui = new ColumnUI(category);
        this._columnUILayout.addChild(ui.container);
        Arrays.addAt(this._columnUIs, ui, idx);

        ui.categoryText = Fonts.std(category, 14).bold().color(0xffffff).build();
        ui.categoryText.position.set(10, 0);
        ui.categoryText.alpha = this.isDisabled(category) ? 0.3 : 1;
        ui.container.addChild(ui.categoryText);

        ui.moveUpButton = new GameButton().allStates(Bitmaps.GoUpImg);
        ui.moveUpButton.clicked.connect(() => this.moveColumn(category, -1));
        ui.moveUpButton.display.position.set(280, 5);
        this.addObject(ui.moveUpButton, ui.container);

        ui.moveDownButton = new GameButton().allStates(Bitmaps.GoDownImg);
        ui.moveDownButton.clicked.connect(() => this.moveColumn(category, 1));
        ui.moveDownButton.display.position.set(300, 5);
        this.addObject(ui.moveDownButton, ui.container);

        ui.removeButton = new GameButton().allStates(Bitmaps.ImgRemove);
        ui.removeButton.clicked.connect(() => this.removeColumn(category));
        ui.removeButton.display.position.set(320, 5);
        this.addObject(ui.removeButton, ui.container);

        // Separator line
        ui.container.addChild(new Graphics()
            .lineStyle(1, 0x4A90E2)
            .moveTo(8, 24)
            .lineTo(336, 24));
    }

    private getColumnIdx(category: DesignCategory): number {
        return this._columnUIs.findIndex((ui) => ui.category === category);
    }

    private getUnusedColumns(): DesignCategory[] {
        return this._allColumnCategories.filter((category) => this.getColumnIdx(category) < 0);
    }

    private onColumnsChanged(): void {
        this.columnsReorganized.emit(this._columnUIs.map((ui) => ui.category));
    }

    private addColumn(category: DesignCategory): void {
        const curIdx = this.getColumnIdx(category);
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
        const idx = this.getColumnIdx(category);
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
        for (const ui of this._columnUIs) {
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
        const unused = this.getUnusedColumns();
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
        const unusedCategories = this.getUnusedColumns();
        if (unusedCategories.length > 0) {
            this.addColumn(unusedCategories[this._addColumnCategoryIdx]);
        }
    }

    private moveColumn(category: DesignCategory, displacement: number): void {
        this.setCriteriaIdx(category, this.getColumnIdx(category) + displacement);
        this.onColumnsChanged();
    }

    private setCriteriaIdx(category: DesignCategory, newIdx: number): void {
        const curIdx = this.getColumnIdx(category);
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
        for (const ui of this._columnUIs) {
            this._columnUILayout.addChild(ui.container);
        }

        this._content.layout(true);
        this._window.layout();
    }

    private readonly _allColumnCategories: DesignCategory[];
    private readonly _initialColumns: DesignCategory[] | null;
    private readonly _disabled: Set<DesignCategory> | null;

    private _content: VLayoutContainer;
    private _columnUILayout: VLayoutContainer;

    private _curCategoryText: FixedWidthTextField;
    private _prevCategoryButton: GameButton;
    private _nextCategoryButton: GameButton;
    private _addCriterionButton: GameButton;

    private _columnUIs: ColumnUI[] = [];
    private _addColumnCategoryIdx: number = 0;

    private _currentSelectedFilterCheckbox: GameCheckbox;
    public set currentSelectedFilterValue(newValue: boolean) {
        this._currentSelectedFilterCheckbox.toggled.value = newValue;
    }
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
