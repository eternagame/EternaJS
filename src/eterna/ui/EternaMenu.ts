import {Point} from 'pixi.js';
import {Enableable, PointerCapture, DisplayUtil} from 'flashbang';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';

export enum EternaMenuStyle {
    DEFAULT = 0, PULLUP
}

export default class EternaMenu extends GamePanel implements Enableable {
    constructor(menuStyle: EternaMenuStyle = EternaMenuStyle.DEFAULT) {
        super();
        this._style = menuStyle;
    }

    protected added() {
        super.added();
        this._background.visible = false;
        this.needsLayout();
    }

    public addItem(label: string, url: string): void {
        let menuButton: GameButton = new GameButton();

        if (url != null && url.length > 0) {
            menuButton.label(`<A HREF="${url}"><U>${label}</U></A>`, 12);
            menuButton.clicked.connect(() => {
                window.open(url, '_self');
            });
        } else {
            menuButton.label(label, 12);
        }

        this.createMenu(menuButton);
        this.needsLayout();
    }

    public addMenuButton(menuButton: GameButton): number {
        let existingIdx = this._menus.findIndex((menu): boolean => menu.menuButton === menuButton);
        if (existingIdx >= 0) {
            return existingIdx;
        }

        this.createMenu(menuButton);
        this.needsLayout();
        return this._menus.length - 1;
    }

    public addSubMenuButton(menuIdx: number, itemButton: GameButton, atTop: boolean = false): void {
        let menu: Menu = this._menus[menuIdx];
        if (menu.itemButtons.indexOf(itemButton) >= 0) {
            return;
        }

        menu.panel.addObject(itemButton, menu.panel.container);
        if (atTop) {
            menu.itemButtons.unshift(itemButton);
        } else {
            menu.itemButtons.push(itemButton);
        }

        // Clicking a submenu item hides the panel
        // The setTimeout is required since clicking a button could get registered as a pointerTap and reopen
        // the panel if we close it immediately
        itemButton.clicked.connect(() => setTimeout(() => {
            menu.panel.display.visible = false;
            if (this._activeCapture) this._activeCapture.endCapture();
        }, 100));

        this.needsLayout();
    }

    public addSubMenuButtonAt(menuIdx: number, itemButton: GameButton, pos: number): void {
        let menu: Menu = this._menus[menuIdx];
        if (menu.itemButtons.indexOf(itemButton) >= 0) {
            return;
        }

        menu.panel.addObject(itemButton, menu.panel.container);
        menu.itemButtons.splice(pos, 0, itemButton);

        // The setTimeout is required since clicking a button could get registered as a pointerTap and reopen
        // the panel if we close it immediately
        itemButton.clicked.connect(() => setTimeout(() => {
            menu.panel.display.visible = false;
            if (this._activeCapture) this._activeCapture.endCapture();
        }, 100));

        this.needsLayout();
    }

    public removeButton(itemButton: GameButton): void {
        for (let menu of this._menus) {
            let idx = menu.itemButtons.indexOf(itemButton);
            if (idx >= 0) {
                itemButton.destroySelf();
                menu.itemButtons.splice(idx, 1);
                this.needsLayout();
                return;
            }
        }
    }

    public getWidth(useMargin: boolean = true): number {
        return this._menuWidth + (useMargin ? this._rightMargin : 0);
    }

    public get width(): number {
        return this.getWidth();
    }

    public get height(): number {
        return this._menuHeight;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        this._enabled = value;
        for (let menu of this._menus) {
            menu.menuButton.enabled = value;
            if (!value) {
                menu.panel.display.visible = false;
            }
        }
    }

    private createMenu(menuButton: GameButton): Menu {
        let menu: Menu = new Menu();
        menu.menuButton = menuButton;
        this.addObject(menuButton, this.container);
        this._menus.push(menu);

        menu.panel = new GamePanel(GamePanelType.NORMAL, 0.85);
        if (this._style === EternaMenuStyle.PULLUP) {
            menu.panel.setup(GamePanelType.NORMAL, 1.0, 0x152843, 1.0, 0xC0DCE7);
        }
        menu.panel.display.visible = false;
        menuButton.addObject(menu.panel, menuButton.container);

        let showDialog = () => {
            menu.panel.display.visible = true;
            // Move the current menu button to the top layer so that other buttons don't overlap,
            // since in order to not have a gap between the flyout and the button, that's likely
            this.container.removeChild(menuButton.display);
            this.container.addChild(menuButton.display);
        };

        menuButton.pointerOver.connect((e) => {
            if (this._enabled) {
                showDialog();
            }
        });

        menuButton.pointerOut.connect(() => {
            menu.panel.display.visible = false;
        });

        menuButton.pointerTap.connect(() => {
            if (this._enabled) {
                if (!menu.panel.display.visible) {
                    showDialog();

                    this._activeCapture = new PointerCapture(menu.panel.display);
                    this._activeCapture.beginCapture((e) => {
                        if (e.type === 'pointerdown') {
                            // Wait a bit before closing, so that if we tapped the button,
                            // we don't just reopen the flyout
                            setTimeout(() => { menu.panel.display.visible = false; }, 100);
                            this._activeCapture.endCapture();
                        }
                    });
                }
            }
        });

        return menu;
    }

    private needsLayout() {
        if (this.isLiveObject) {
            this.doLayout();
        }
    }

    private doLayout(): void {
        if (this._menus.length === 0) {
            this.setSize(0, 0);
            return;
        }

        for (let menu of this._menus) {
            if (menu.itemButtons.length === 0) {
                menu.panel.setSize(0, 0);
                continue;
            }

            let heightWalker = 7;
            let widthWalker = 0;

            for (let button of menu.itemButtons) {
                if (button == null) {
                    continue;
                }

                button.display.position = new Point(7, heightWalker);
                heightWalker += DisplayUtil.height(button.display) + 7;
                widthWalker = Math.max(widthWalker, DisplayUtil.width(button.display) + 14);
            }

            menu.panel.setSize(widthWalker, heightWalker);
        }

        let space: number = (this._style === EternaMenuStyle.PULLUP ? 1 : 10);
        let widthOffset: number = space;
        this._menuHeight = 0;

        for (let menu of this._menus) {
            let buttonWidth: number = menu.menuButton.container.width;
            let buttonHeight: number = menu.menuButton.container.height;

            menu.menuButton.display.position = new Point(widthOffset, 0);
            if (this._style === EternaMenuStyle.DEFAULT) {
                menu.panel.display.position = new Point(0, buttonHeight - 1);
            } else if (this._style === EternaMenuStyle.PULLUP) {
                menu.panel.display.position = new Point(0, -menu.panel.height);
            }
            widthOffset += buttonWidth + space;
            this._menuHeight = Math.max(this._menuHeight, buttonHeight);
        }

        let lastIdx = this._menus.length - 1;
        let lastButtonWidth = this._menus[lastIdx].menuButton.container.width;
        this._menuWidth = (widthOffset + space);
        this._rightMargin = Math.max(lastButtonWidth, this._menus[lastIdx].panel.width) - lastButtonWidth;

        this.setSize(widthOffset, this._menuHeight + 1);
    }

    private readonly _style: EternaMenuStyle;

    private _enabled: boolean = true;
    private _menus: Menu[] = [];
    private _menuWidth: number = 0;
    private _rightMargin: number = 0;
    private _menuHeight: number = 0;
    private _activeCapture: PointerCapture;
}

class Menu {
    public menuButton: GameButton;
    public panel: GamePanel;
    public itemButtons: GameButton[] = [];
}
