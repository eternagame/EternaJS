import {Graphics, Point, Text} from "pixi.js";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {SerialTask} from "../../../flashbang/tasks/SerialTask";
import {VisibleTask} from "../../../flashbang/tasks/VisibleTask";
import {Solution} from "../../puzzle/Solution";
import {Bitmaps} from "../../resources/Bitmaps";
import {GameButton} from "../../ui/GameButton";
import {GamePanel} from "../../ui/GamePanel";
import {SingleStateButton} from "../../ui/SingleStateButton";
import {Fonts} from "../../util/Fonts";
import {SortOrder} from "./SortOrder";

export class SortWindow extends GamePanel {
    constructor(sort_names: string[]) {
        super(0, 0.89, 0x0);

        if (sort_names == null || sort_names.length == 0) {
            throw new Error("Sort names length can't be 0");
        }

        this._sort_names = sort_names.slice();

        this._sort_category_selection = Fonts.arial(sort_names[0], 17).bold().build();
        this.container.addChild(this._sort_category_selection);

        this._sort_order_selection = new GameButton().label("increasing", 17);
        this._sort_order_selection.clicked.connect(() => this.toggleCurrentSortOrder());
        this.addObject(this._sort_order_selection, this.container);

        this._add_button = new GameButton().label("Add", 15);
        this._add_button.clicked.connect(() => this.addCurrentCriteria());
        this.addObject(this._add_button, this.container);

        this._sort_category_left = new SingleStateButton(
            new Graphics()
            .beginFill(0xFFFFFF, 0.8)
            .moveTo(0, 5)
            .lineTo(-7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5));
        this._sort_category_left.clicked.connect(() => this.sortSelectionLeft());
        this.addObject(this._sort_category_left, this.container);

        this._sort_category_right = new SingleStateButton(
            new Graphics()
            .beginFill(0xFFFFFF, 0.8)
            .moveTo(0, 5)
            .lineTo(7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5));
        this._sort_category_right.clicked.connect(() => this.sortSelectionRight());
        this.addObject(this._sort_category_right, this.container);

        this._ok_button = new GameButton().label("Ok", 20);
        this._ok_button.clicked.connect(() => this.close());
        this.addObject(this._ok_button, this.container);

        this.layout();
    }

    public get_sort_order(sort_category: string): number {
        let index = this._sortCategories.indexOf(sort_category);
        if (index < 0) {
            return 0;
        } else {
            return this._sortOrders[index];
        }
    }

    public compare_solutions(a: Solution, b: Solution): number {
        for (let ii = 0; ii < this._sortCategories.length; ii++) {

            let a_property: any;
            let b_property: any;

            if (this._sortCategories[ii].indexOf("Sequence") >= 0) {
                let anchor_sequence: string = this._sortArguments[ii];
                let a_string: string = a.sequence;
                if (a_string == null) throw new Error("solution " + a.nodeID + " invalid");
                let b_string: string = b.sequence;
                if (b_string == null) throw new Error("solution " + b.nodeID + " invalid");
                if (a_string.length != anchor_sequence.length || b_string.length != anchor_sequence.length) {
                    throw new Error("Wrong anchor sequence length");
                }

                let a_score: number = 0;
                let b_score: number = 0;

                for (let jj: number = 0; jj < a_string.length; jj++) {
                    if (a_string.charAt(jj) != anchor_sequence.charAt(jj)) {
                        a_score++;
                    }

                    if (b_string.charAt(jj) != anchor_sequence.charAt(jj)) {
                        b_score++;
                    }
                }

                a_property = a_score;
                b_property = b_score;

            } else {
                a_property = a.getProperty(this._sortCategories[ii]);
                b_property = b.getProperty(this._sortCategories[ii]);
            }

            if (this._sortOrders[ii] < 0) {
                if (a_property < b_property) {
                    return 1;
                } else if (a_property > b_property) {
                    return -1;
                }

            } else {
                if (a_property < b_property) {
                    return -1;
                } else if (a_property > b_property) {
                    return 1;
                }
            }

        }

        if (a.nodeID < b.nodeID) {
            return 1;
        } else if (a.nodeID > b.nodeID) {
            return -1;
        }

        return 0;
    }

    public set_reorganize_callback(reorganize: (sort: boolean) => void): void {
        this._reorganizeFn = reorganize;
    }

    public on_add_criteria(sort_category: string, sort_order: SortOrder, sort_argument: any = null): void {
        let old_index: number = this._sortCategories.indexOf(sort_category);
        if (old_index >= 0) {
            this._sortOrders[old_index] = sort_order;
            this._sortArguments[old_index] = sort_argument;

            if (sort_order == SortOrder.INCREASING) {
                this._sortOrderButtons[old_index].label("increasing", 17);
            } else {
                this._sortOrderButtons[old_index].label("decreasing", 17);
            }

            if (old_index > 0) {
                this.moveCriteria(sort_category, -old_index);
            }

            if (this._reorganizeFn != null) {
                this._reorganizeFn(true);
            }

            return;
        }

        this._sortCategories.unshift(sort_category);
        this._sortOrders.unshift(sort_order);
        this._sortArguments.unshift(sort_argument);

        let sort_category_text = Fonts.arial("", 14).build();
        this.container.addChild(sort_category_text);
        this._sortCategoryTexts.unshift(sort_category_text);

        let sort_order_text: GameButton = new GameButton();
        sort_order_text.clicked.connect(() => this.toggleSort(sort_category));
        this.addObject(sort_order_text, this.container);
        this._sortOrderButtons.unshift(sort_order_text);

        let remove_button = new GameButton().allStates(Bitmaps.CancelImg);
        remove_button.clicked.connect(() => this.on_remove_criteria(sort_category));
        this.addObject(remove_button, this.container);

        this._removeButtons.unshift(remove_button);

        let move_up_button = new GameButton().allStates(Bitmaps.GoUpImg);
        move_up_button.clicked.connect(() => this.moveCriteria(sort_category, -1));
        this.addObject(move_up_button, this.container);
        this._moveUpButtons.unshift(move_up_button);

        let move_down_button = new GameButton().allStates(Bitmaps.GoDownImg);
        move_down_button.clicked.connect(() => this.moveCriteria(sort_category, 1));
        this.addObject(move_down_button, this.container);
        this._moveDownButtons.unshift(move_down_button);

        if (sort_order == 1) {
            sort_order_text.label("increasing", 17);
        } else {
            sort_order_text.label("decreasing", 17);
        }

        sort_category_text.text = sort_category;

        if (this._sort_names[this._sortCategoryID] == sort_category) {
            if (!this.sortSelectionRight()) {

                this._add_button.display.alpha = 0.3;
                this._sort_order_selection.display.alpha = 0.3;
                this._sort_category_selection.alpha = 0.3;
                this._sort_category_left.display.alpha = 0.3;
                this._sort_category_right.display.alpha = 0.3;

                this._sort_category_left.enabled = false;
                this._sort_category_right.enabled = false;
                this._sort_order_selection.enabled = false;
                this._add_button.enabled = false;
            }
        }

        this.layout();

        if (this._reorganizeFn != null) {
            this._reorganizeFn(true);
        }
    }

    public on_remove_criteria(sort_category: string): void {
        let idx = this._sortCategories.indexOf(sort_category);
        if (idx < 0) {
            throw new Error("Can't find sort_category " + sort_category);
        }

        this._sortCategories.splice(idx, 1);
        this._sortOrders.splice(idx, 1);
        this._sortArguments.splice(idx, 1);

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

        this._add_button.display.alpha = 1.0;
        this._sort_order_selection.display.alpha = 1.0;
        this._sort_category_selection.alpha = 1.0;
        this._sort_category_left.display.alpha = 1.0;
        this._sort_category_right.display.alpha = 1.0;

        this._sort_category_left.enabled = true;
        this._sort_category_right.enabled = true;
        this._sort_order_selection.enabled = true;
        this._add_button.enabled = true;

        if (this._sortCategories.indexOf(this._sort_names[this._sortCategoryID]) >= 0) {
            this.sortSelectionRight();
        }

        this.layout();

        if (this._reorganizeFn != null) {
            this._reorganizeFn(true);
        }
    }

    private close(): void {
        this.addObject(new SerialTask(
            new AlphaTask(0, 0.3),
            new VisibleTask(false),
        ));
    }

    private toggleCurrentSortOrder(): void {
        this._sortOrder *= -1;

        if (this._sortOrder == SortOrder.INCREASING) {
            this._sort_order_selection.label("increasing", 17);
        } else {
            this._sort_order_selection.label("decreasing", 17);
        }
    }

    private sortSelectionLeft(): boolean {
        for (let ii = this._sortCategoryID - 1; ii > this._sortCategoryID - this._sort_names.length; ii--) {
            let index: number = (ii + this._sort_names.length) % this._sort_names.length;
            if (this._sortCategories.indexOf(this._sort_names[index]) < 0) {
                this._sortCategoryID = index;
                this._sort_category_selection.text = this._sort_names[index];
                return true;
            }
        }

        return false;
    }

    private sortSelectionRight(): boolean {
        for (let ii = this._sortCategoryID + 1; ii < this._sortCategoryID + this._sort_names.length; ii++) {
            let index: number = (ii) % this._sort_names.length;
            if (this._sortCategories.indexOf(this._sort_names[index]) < 0) {
                this._sortCategoryID = index;
                this._sort_category_selection.text = this._sort_names[index];
                return true;
            }
        }

        return false;
    }

    private addCurrentCriteria(): void {
        this.on_add_criteria(this._sort_names[this._sortCategoryID], this._sortOrder);
        //trace("Sort: ",_sort_names,"---SortOrder: ",_sort_order);
    }

    private toggleSort(sort_category: string): void {
        let index: number = this._sortCategories.indexOf(sort_category);
        if (index < 0) {
            throw new Error("Can't find sort_category " + sort_category);
        }

        this._sortOrders[index] *= -1;

        if (this._sortOrders[index] == 1) {
            this._sortOrderButtons[index].label("increasing", 17);
        } else {
            this._sortOrderButtons[index].label("decreasing", 17);
        }

        if (this._reorganizeFn != null) {
            this._reorganizeFn(true);
        }
    }

    private moveCriteria(sort_category: string, displacement: number): void {
        let idx: number = this._sortCategories.indexOf(sort_category);
        if (idx < 0) {
            throw new Error("Can't find sort_category " + sort_category);
        }

        let target_index: number = idx + displacement;
        if (target_index < 0 || target_index >= this._sortCategories.length) {
            return;
        }

        SortWindow.swap(this._sortCategories, idx, target_index);
        SortWindow.swap(this._sortOrders, idx, target_index);
        SortWindow.swap(this._sortArguments, idx, target_index);
        SortWindow.swap(this._sortCategoryTexts, idx, target_index);
        SortWindow.swap(this._sortOrderButtons, idx, target_index);
        SortWindow.swap(this._removeButtons, idx, target_index);
        SortWindow.swap(this._moveUpButtons, idx, target_index);
        SortWindow.swap(this._moveDownButtons, idx, target_index);

        this.layout();

        if (this._reorganizeFn != null) {
            this._reorganizeFn(true);
        }
    }

    private layout(): void {
        let new_height: number = 20 + this._sortCategories.length * SortWindow.ROW_HEIGHT + 80;
        this.setSize(355, new_height);

        let ii: number;
        for (ii = 0; ii < this._sortCategories.length; ii++) {
            this._sortCategoryTexts[ii].position = new Point(10, 20 + ii * SortWindow.ROW_HEIGHT);
            this._sortOrderButtons[ii].display.position = new Point(180, 20 + ii * SortWindow.ROW_HEIGHT);
            this._moveUpButtons[ii].display.position = new Point(280, 20 + ii * SortWindow.ROW_HEIGHT + 5);
            this._moveDownButtons[ii].display.position = new Point(300, 20 + ii * SortWindow.ROW_HEIGHT + 5);
            this._removeButtons[ii].display.position = new Point(320, 20 + ii * SortWindow.ROW_HEIGHT + 5);
        }

        this._sort_category_selection.position = new Point(30, 20 + ii * SortWindow.ROW_HEIGHT + 10);
        this._sort_category_left.display.position = new Point(20, 20 + ii * SortWindow.ROW_HEIGHT + 22);
        this._sort_category_right.display.position = new Point(150, 20 + ii * SortWindow.ROW_HEIGHT + 22);
        this._sort_order_selection.display.position = new Point(180, 20 + ii * SortWindow.ROW_HEIGHT + 10);
        this._add_button.display.position = new Point(280, 20 + ii * SortWindow.ROW_HEIGHT + 10);
        this._ok_button.display.position = new Point(120, 20 + ii * SortWindow.ROW_HEIGHT + 37);
    }

    private static swap<T>(array: T[], i: number, j: number): void {
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    private readonly _sort_names: string[];
    private readonly _sort_category_selection: Text;
    private readonly _sort_category_left: SingleStateButton;
    private readonly _sort_category_right: SingleStateButton;
    private readonly _sort_order_selection: GameButton;
    private readonly _add_button: GameButton;
    private readonly _ok_button: GameButton;

    private _sortCategories: string[] = [];
    private _sortOrders: number[] = [];
    private _sortArguments: string[] = [];
    private _removeButtons: GameButton[] = [];
    private _moveUpButtons: GameButton[] = [];
    private _moveDownButtons: GameButton[] = [];
    private _sortCategoryTexts: Text[] = [];
    private _sortOrderButtons: GameButton[] = [];
    private _sortCategoryID: number = 0;
    private _sortOrder: SortOrder = 1;
    private _reorganizeFn: (sort: boolean) => void;

    private static readonly ROW_HEIGHT = 20;

}
