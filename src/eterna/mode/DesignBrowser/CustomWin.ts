import {DisplayObject, Graphics, Point, Text} from "pixi.js";
import {Button, ButtonState} from "../../../flashbang/objects/Button";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {SerialTask} from "../../../flashbang/tasks/SerialTask";
import {VisibleTask} from "../../../flashbang/tasks/VisibleTask";
import {Bitmaps} from "../../resources/Bitmaps";
import {GameButton} from "../../ui/GameButton";
import {GamePanel} from "../../ui/GamePanel";
import {Fonts} from "../../util/Fonts";

export class CustomWin extends GamePanel {
    constructor(sort_names: string[], initialNms: string[], disabled: any) {
        super(0, 0.89, 0x0);
        if (sort_names == null || sort_names.length == 0) {
            throw new Error("Sort names length can't be 0");
        }

        this._sort_names = sort_names.slice();
        this._customized_categories = [];
        this._initialNms = initialNms.slice();
        this._sort_arguments = [];

        this._disabled = disabled;

        this._sort_categories_texts = [];
        this._remove_buttons = [];
        this._move_up_buttons = [];
        this._move_down_buttons = [];
        this._sort_category_id = 0;

        this._sort_category_selection = Fonts.arial(sort_names[0], 17).bold().build();
        this.container.addChild(this._sort_category_selection);

        this._add_button = new GameButton().label("Add", 15);
        this._add_button.clicked.connect(() => this.on_add_current_criteria());
        this.addObject(this._add_button, this.container);

        this._add_all_btn = new GameButton().label("Reset", 15);
        this._add_all_btn.clicked.connect(() => this.on_add_all());
        this.addObject(this._add_all_btn, this.container);

        this._sort_category_left = new SingleStateButton(new Graphics()
            .beginFill(0xFFFFFF, 0.8)
            .moveTo(0, 5)
            .lineTo(-7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5));
        this._sort_category_left.clicked.connect(() => this.on_sort_selection_left());
        this.addObject(this._sort_category_left, this.container);

        this._sort_category_right = new SingleStateButton(new Graphics()
            .beginFill(0xFFFFFF, 0.8)
            .moveTo(0, 5)
            .lineTo(7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5));
        this._sort_category_right.clicked.connect(() => this.on_sort_selection_right());
        this.addObject(this._sort_category_right, this.container);

        this._ok_button = new GameButton().label("Ok", 20);
        this._ok_button.clicked.connect(() => this.on_close());
        this.addObject(this._ok_button, this.container);

        this.Initialize();
    }

    public set_reorganize_callback(reorganize: Function): void {
        this._reorganize = reorganize;
    }

    public on_add_criteria(sort_category: string, sort_argument: any = null, isRefreshing: boolean = true): void {
        let old_index = this._customized_categories.indexOf(sort_category);
        if (old_index >= 0) {

            this._sort_arguments[old_index] = sort_argument;

            if (old_index > 0) {
                this.on_move_criteria(sort_category, -old_index);
            }

            if (this._reorganize != null) {
                this._reorganize(this._customized_categories);
            }
            return;
        }

        this._customized_categories.unshift(sort_category);
        this._sort_arguments.unshift(sort_argument);

        let sort_category_text: Text = Fonts.arial().fontSize(14).build();
        this.container.addChild(sort_category_text);
        this._sort_categories_texts.unshift(sort_category_text);

        let remove_button = new GameButton().allStates(Bitmaps.CancelImg);
        remove_button.clicked.connect(() => this.on_remove_criteria(sort_category));
        this.addObject(remove_button, this.container);
        this._remove_buttons.unshift(remove_button);

        let move_up_button = new GameButton().allStates(Bitmaps.GoUpImg);
        move_up_button.clicked.connect(() => this.on_move_criteria(sort_category, -1));
        this.addObject(move_up_button, this.container);
        this._move_up_buttons.unshift(move_up_button);

        let move_down_button = new GameButton().allStates(Bitmaps.GoDownImg);
        move_down_button.clicked.connect(() => this.on_move_criteria(sort_category, 1));
        this.addObject(move_down_button, this.container);
        this._move_down_buttons.unshift(move_down_button);

        if (this._disabled != null && this._disabled[sort_category]) {
            sort_category_text.alpha = 0.5;
            sort_category_text.text = sort_category + " (Not available in closed labs)";
        } else {
            sort_category_text.text = sort_category;
        }

        if (this._sort_names[this._sort_category_id] == sort_category) {
            if (!this.on_sort_selection_right()) {
                this._add_button.display.alpha = 0.3;
                this._sort_category_selection.alpha = 0.3;
                this._sort_category_left.display.alpha = 0.3;
                this._sort_category_right.display.alpha = 0.3;

                this._sort_category_left.enabled = false;
                this._sort_category_right.enabled = false;
                this._add_button.enabled = false;
            }
        }

        if (isRefreshing) {
            this.layout();
            if (this._reorganize != null) {
                this._reorganize(this._customized_categories);
            }
        }
    }

    public on_remove_criteria(sort_category: string): void {
        let remove_index = this._customized_categories.indexOf(sort_category);
        if (remove_index < 0) {
            throw new Error(`onRemoveCriteria:Can't find sort_category\n ${this._customized_categories};\n${sort_category}`);
        }

        this._customized_categories.splice(remove_index, 1);
        this._sort_arguments.splice(remove_index, 1);

        this._sort_categories_texts[remove_index].destroy({children: true});
        this._sort_categories_texts.splice(remove_index, 1);

        this._remove_buttons[remove_index].destroySelf();
        this._remove_buttons.splice(remove_index, 1);

        this._move_up_buttons[remove_index].destroySelf();
        this._move_up_buttons.splice(remove_index, 1);

        this._move_down_buttons[remove_index].destroySelf();
        this._move_down_buttons.splice(remove_index, 1);

        this._add_button.display.alpha = 1.0;
        this._sort_category_selection.alpha = 1.0;
        this._sort_category_left.display.alpha = 1.0;
        this._sort_category_right.display.alpha = 1.0;

        this._sort_category_left.enabled = true;
        this._sort_category_right.enabled = true;
        this._add_button.enabled = true;

        if (this._customized_categories.indexOf(this._sort_names[this._sort_category_id]) >= 0) {
            this.on_sort_selection_right();
        }

        this.layout();

        if (this._reorganize != null) {
            this._reorganize(this._customized_categories);
        }
    }

    private Initialize(): void {
        for (let ii = this._initialNms.length - 1; ii >= 0; ii--) {
            this.on_add_criteria(this._initialNms[ii]);
        }
        this.layout();
    }

    private on_close(): void {
        this.addObject(new SerialTask(
            new AlphaTask(0, 0.3),
            new VisibleTask(false),
        ));
    }

    private on_sort_selection_left(): boolean {
        for (let ii = this._sort_category_id - 1; ii > this._sort_category_id - this._sort_names.length; ii--) {
            let index: number = (ii + this._sort_names.length) % this._sort_names.length;
            if (this._customized_categories.indexOf(this._sort_names[index]) < 0) {
                this._sort_category_id = index;
                this._sort_category_selection.text = this._sort_names[index];
                return true;
            }
        }

        return false;
    }

    private on_sort_selection_right(): boolean {
        for (let ii = this._sort_category_id + 1; ii < this._sort_category_id + this._sort_names.length; ii++) {
            let index: number = (ii) % this._sort_names.length;
            if (this._customized_categories.indexOf(this._sort_names[index]) < 0) {
                this._sort_category_id = index;
                this._sort_category_selection.text = this._sort_names[index];
                return true;
            }
        }

        return false;
    }

    private on_add_current_criteria(): void {
        this.on_add_criteria(this._sort_names[this._sort_category_id]);
    }

    private on_add_all(): void {
        let tmp: any[] = this._customized_categories.slice();

        for (let ii = 0; ii < tmp.length; ii++) {
            //this.on_remove_criteria(this.customized_categories[ii]);
            this._customized_categories.shift();
            this._sort_arguments.shift();
            this._sort_categories_texts.shift().destroy({children: true});
            this._remove_buttons.shift().destroySelf();
            this._move_up_buttons.shift().destroySelf();
            this._move_down_buttons.shift().destroySelf();
        }

        for (let ii = this._sort_names.length - 1; ii >= 0; ii--) {
            this.on_add_criteria(this._sort_names[ii], null, false);

        }
        this.layout();
        if (this._reorganize != null) {
            this._reorganize(this._customized_categories);
        }
    }

    private on_move_criteria(sort_category: string, displacement: number): void {
        let cur_index: number = this._customized_categories.indexOf(sort_category);

        if (cur_index < 0) {
            throw new Error("Can't find sort_category " + sort_category);
        }

        let target_index: number = cur_index + displacement;
        if (target_index < 0 || target_index >= this._customized_categories.length) {
            return;
        }

        CustomWin.swap(this._customized_categories, cur_index, target_index);
        CustomWin.swap(this._sort_arguments, cur_index, target_index);
        CustomWin.swap(this._sort_categories_texts, cur_index, target_index);
        CustomWin.swap(this._remove_buttons, cur_index, target_index);
        CustomWin.swap(this._move_up_buttons, cur_index, target_index);
        CustomWin.swap(this._move_down_buttons, cur_index, target_index);

        this.layout();

        if (this._reorganize != null) {
            this._reorganize(this._customized_categories);
        }

    }

    private layout(): void {
        for (let ii = 0; ii < this._customized_categories.length; ii++) {
            this._sort_categories_texts[ii].position = new Point(10, 20 + ii * CustomWin.ROW_HEIGHT);
            this._move_up_buttons[ii].display.position = new Point(280, 20 + ii * CustomWin.ROW_HEIGHT + 5);
            this._move_down_buttons[ii].display.position = new Point(300, 20 + ii * CustomWin.ROW_HEIGHT + 5);
            this._remove_buttons[ii].display.position = new Point(320, 20 + ii * CustomWin.ROW_HEIGHT + 5);
        }

        let ii = this._customized_categories.length;

        this._sort_category_selection.position = new Point(30, 20 + ii * CustomWin.ROW_HEIGHT + 10);
        this._sort_category_left.display.position = new Point(20, 20 + ii * CustomWin.ROW_HEIGHT + 22);
        this._sort_category_right.display.position = new Point(150, 20 + ii * CustomWin.ROW_HEIGHT + 22);
        this._add_button.display.position = new Point(280, 20 + ii * CustomWin.ROW_HEIGHT + 10);

        this._ok_button.display.position = new Point(120, 20 + ii * CustomWin.ROW_HEIGHT + 37);
        this._add_all_btn.display.position = new Point(200, 20 + ii * CustomWin.ROW_HEIGHT + 10);

        let new_height = 20 + this._customized_categories.length * CustomWin.ROW_HEIGHT + 80;
        this.setSize(355, new_height);

    }

    private static swap<T>(array: T[], i: number, j: number): void {
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    private _sort_names: string[];
    private _customized_categories: string[];
    private _initialNms: string[];
    private _disabled: any;
    private _sort_arguments: any[];
    private _remove_buttons: Button[];
    private _move_up_buttons: Button[];
    private _move_down_buttons: Button[];
    private _sort_categories_texts: Text[];
    private _sort_category_selection: Text;
    private _sort_category_left: Button;
    private _sort_category_right: Button;
    private _add_button: GameButton;
    private _add_all_btn: GameButton;
    private _sort_category_id: number;
    private _ok_button: GameButton;
    private _reorganize: Function;

    private static readonly ROW_HEIGHT = 20;
}

class SingleStateButton extends Button {
    public constructor(disp: DisplayObject) {
        super();
        this.container.addChild(disp);
    }

    protected showState(state: ButtonState): void {
        // do nothing!
    }
}
