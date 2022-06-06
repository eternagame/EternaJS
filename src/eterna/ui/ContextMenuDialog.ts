import {Point} from 'pixi.js';
import ContextMenu from './ContextMenu';
import Dialog from './Dialog';

export default class ContextMenuDialog extends Dialog<void> {
    constructor(menu: ContextMenu, menuLoc: Point) {
        super();
        this._menu = menu;
        this._menuLoc = menuLoc;
    }

    protected added(): void {
        super.added();
        this.addObject(this._menu, this.container);

        this._menu.display.position.copyFrom(this._menuLoc);
        this._menu.menuItemSelected.connect(() => this.close());
    }

    protected get bgAlpha(): number {
        return 0;
    }

    private readonly _menu: ContextMenu;
    private readonly _menuLoc: Point;
}
