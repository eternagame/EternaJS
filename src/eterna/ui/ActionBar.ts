import {Graphics, Point} from "pixi.js";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {SceneObject} from "../../flashbang/objects/SceneObject";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";

export class ActionBar extends ContainerObject {
    public constructor(height: number = 0) {
        super();

        this._bg = new Graphics();
        this.container.addChild(this._bg);

        this._height = height;
        this.doLayout();
    }

    public addItem(obj: SceneObject, layout: boolean = true, height_mod: number = 0): void {
        this._items.push(obj);
        this.addObject(obj, this.container);
        this._heightMods.push(height_mod);

        if (layout) {
            this.doLayout();
        }
    }

    public clearItems(layout: boolean = true): void {
        for (let item of this._items) {
            item.destroySelf();
        }

        this._items = [];

        if (layout) {
            this.doLayout();
        }
    }

    public doLayout(): void {
        this._bg.clear();
        if (this._items.length === 0) {
            return;
        }

        let item_space: number = 35;
        let bar_space: number = 10;

        let center_width: number = 0;
        for (let ii: number = 0; ii < this._items.length; ii++) {
            center_width += Math.max(DisplayUtil.width(this._items[ii].display), 35);
        }

        center_width += (bar_space) * this._items.length + bar_space;
        let whole_width: number = center_width;
        let whole_height: number = this._height;

        if (whole_height < 1) {
            let max_height: number = 0;
            let vertical_margin: number = 10;
            for (let ii = 0; ii < this._items.length; ii++) {
                max_height = Math.max(max_height, DisplayUtil.height(this._items[ii].display));
            }
            whole_height = max_height + vertical_margin;
        }

        let item_space_walker: number = 0;

        for (let ii = 0; ii < this._items.length; ii++) {
            let cur_space: number = Math.max(DisplayUtil.width(this._items[ii].display), item_space);
            let item_y: number = whole_height / 2.0 - DisplayUtil.height(this._items[ii].display) / 2.0 + this._heightMods[ii];
            this._items[ii].display.position = new Point(
                bar_space + bar_space / 2.0 + item_space_walker + (bar_space) * ii,
                item_y
            );
            item_space_walker += cur_space;
        }

        this._bg.beginFill(0xffffff, 0.05);
        this._bg.drawRoundedRect(0, 0, whole_width, whole_height, 10);
    }

    public get width(): number {
        if (this._items.length === 0) {
            return 0;
        }

        let bar_space: number = 10;

        let center_width: number = 0;
        for (let ii: number = 0; ii < this._items.length; ii++) {
            center_width += Math.max(DisplayUtil.width(this._items[ii].display), 35);
        }

        center_width += (bar_space) * this._items.length + bar_space;

        return center_width;
    }

    private readonly _bg: Graphics;
    private readonly _height: number;

    private _items: SceneObject[] = [];
    private _heightMods: number[] = [];
}
