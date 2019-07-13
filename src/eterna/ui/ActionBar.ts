import {Graphics, Point} from 'pixi.js';
import {ContainerObject, SceneObject, DisplayUtil} from 'flashbang';

export default class ActionBar extends ContainerObject {
    constructor(height: number = 0) {
        super();

        this._bg = new Graphics();
        this.container.addChild(this._bg);

        this._height = height;
        this.doLayout();
    }

    public addItem(obj: SceneObject, layout: boolean = true, heightMod: number = 0): void {
        this._items.push(obj);
        this.addObject(obj, this.container);
        this._heightMods.push(heightMod);

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

        let itemSpace = 35;
        let barSpace = 10;

        let centerWidth = 0;
        for (let ii = 0; ii < this._items.length; ii++) {
            centerWidth += Math.max(DisplayUtil.width(this._items[ii].display), 35);
        }

        centerWidth += (barSpace) * this._items.length + barSpace;
        let wholeWidth: number = centerWidth;
        let wholeHeight: number = this._height;

        if (wholeHeight < 1) {
            let maxHeight = 0;
            let verticalMargin = 10;
            for (let ii = 0; ii < this._items.length; ii++) {
                maxHeight = Math.max(maxHeight, DisplayUtil.height(this._items[ii].display));
            }
            wholeHeight = maxHeight + verticalMargin;
        }

        let itemSpaceWalker = 0;

        for (let ii = 0; ii < this._items.length; ii++) {
            let curSpace = Math.max(DisplayUtil.width(this._items[ii].display), itemSpace);
            let itemY = wholeHeight / 2.0 - DisplayUtil.height(this._items[ii].display) / 2.0 + this._heightMods[ii];

            this._items[ii].display.position = new Point(
                barSpace + barSpace / 2.0 + itemSpaceWalker + (barSpace) * ii,
                itemY
            );

            itemSpaceWalker += curSpace;
        }

        this._bg.beginFill(0xffffff, 0.05);
        this._bg.drawRoundedRect(0, 0, wholeWidth, wholeHeight, 10);
    }

    public get width(): number {
        if (this._items.length === 0) {
            return 0;
        }

        let barSpace = 10;

        let centerWidth = 0;
        for (let ii = 0; ii < this._items.length; ii++) {
            centerWidth += Math.max(DisplayUtil.width(this._items[ii].display), 35);
        }

        centerWidth += (barSpace) * this._items.length + barSpace;

        return centerWidth;
    }

    private readonly _bg: Graphics;
    private readonly _height: number;

    private _items: SceneObject[] = [];
    private _heightMods: number[] = [];
}
