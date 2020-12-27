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
        for (const item of this._items) {
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

        // Using width getter -- it uses the calculation.
        const centerWidth = this.width;

        const wholeWidth: number = centerWidth;
        let wholeHeight: number = this._height;

        if (wholeHeight < 1) {
            const maxHeight = Math.max(...this._items.map((item) => DisplayUtil.height(item.display)));
            const verticalMargin = 10;
            wholeHeight = maxHeight + verticalMargin;
        }

        let itemSpaceWalker = 0;

        const itemSpace = 35;
        const barSpace = 10;
        for (let ii = 0; ii < this._items.length; ii++) {
            const curSpace = Math.max(DisplayUtil.width(this._items[ii].display), itemSpace);
            const itemY = wholeHeight / 2.0 - DisplayUtil.height(this._items[ii].display) / 2.0 + this._heightMods[ii];

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

        const barSpace = 10;

        const centerWidth = this._items.map((item) => DisplayUtil.width(item.display)).reduce(
            (accum, current) => accum + Math.max(current, 35),
            (barSpace) * this._items.length + barSpace
        );
        return centerWidth;
    }

    private readonly _bg: Graphics;
    private readonly _height: number;

    private _items: SceneObject[] = [];
    private _heightMods: number[] = [];
}
