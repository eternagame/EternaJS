import {Point} from 'pixi.js';
import {
    Enableable, PointerCapture, DisplayUtil, HAlign, VAlign, Flashbang, Assert
} from 'flashbang';
import {RegistrationGroup} from 'signals';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import TrueWidthDisplay from './TrueWidthDisplay';

export enum EternaMenuStyle {
    DEFAULT = 0, PULLUP
}

export default class EternaMenu extends GamePanel implements Enableable {
    constructor(menuStyle: EternaMenuStyle = EternaMenuStyle.DEFAULT, inToolbar = false) {
        super();
        this._style = menuStyle;
        this.inToolbar = inToolbar;
    }

    protected added() {
        super.added();
        this._background.visible = false;
        this.needsLayout();
        if (this.inToolbar) {
            this.display.name = 'EternaMenu';
        }
        Assert.assertIsDefined(this.mode);
        // Since the submenu panels are positioned relative to the stage
        this.regs.add(this.mode.resized.connect(() => this.needsLayout()));
    }

    public addItem(label: string, url: string): void {
        const menuButton: GameButton = new GameButton();

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
        const existingIdx = this._menus.findIndex((menu): boolean => menu.menuButton === menuButton);
        if (existingIdx >= 0) {
            return existingIdx;
        }

        this.createMenu(menuButton);
        this.needsLayout();
        return this._menus.length - 1;
    }

    public addSubMenuButton(menuIdx: number, itemButton: GameButton, atTop: boolean = false): void {
        const menu: Menu = this._menus[menuIdx];
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
        itemButton.clicked.connect(() => {
            menu.panel.display.visible = false;
            if (this._activeCapture) {
                menu.panel.removeObject(this._activeCapture);
                this._activeCapture = null;
            }
        });

        this.needsLayout();
    }

    public addSubMenuButtonAt(menuIdx: number, itemButton: GameButton, pos: number): void {
        const menu: Menu = this._menus[menuIdx];
        if (menu.itemButtons.indexOf(itemButton) >= 0) {
            return;
        }

        menu.panel.addObject(itemButton, menu.panel.container);
        menu.itemButtons.splice(pos, 0, itemButton);

        // Clicking a submenu item hides the panel
        itemButton.clicked.connect(() => {
            menu.panel.display.visible = false;
            if (this._activeCapture) {
                menu.panel.removeObject(this._activeCapture);
                this._activeCapture = null;
            }
        });

        this.needsLayout();
    }

    public removeButton(itemButton: GameButton): void {
        for (const menu of this._menus) {
            const idx = menu.itemButtons.indexOf(itemButton);
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
        for (const menu of this._menus) {
            menu.menuButton.enabled = value;
            if (!value) {
                menu.panel.display.visible = false;
            }
        }
    }

    private get menuButtonWidth() {
        return this._menus
            .map((menu) => menu.menuButton.display.width)
            .reduce((prev, cur) => prev + cur);
    }

    private createMenu(menuButton: GameButton): Menu {
        const menu: Menu = new Menu();
        menu.menuButton = menuButton;
        this.addObject(menuButton, this.container);
        this._menus.push(menu);

        menu.panel = new GamePanel(GamePanelType.NORMAL, 0.85);
        if (this._style === EternaMenuStyle.PULLUP) {
            menu.panel.setup(GamePanelType.NORMAL, 1.0, 0x152843, 1.0, 0xC0DCE7);
        }
        menu.panel.display.visible = false;
        menuButton.addObject(menu.panel, this.mode?.container);

        const showDialog = () => {
            menu.panel.display.visible = true;
            // Ensure the panel is on top of absolutely everything - if we're triggering a flyout,
            // there's no reason why we would expect something else currently on the display stack
            // to be displayed over it - it would just appear as being obstructed
            Assert.assertIsDefined(this.mode);
            Assert.assertIsDefined(this.mode.container);
            this.mode.container.removeChild(menu.panel.container);
            this.mode.container.addChild(menu.panel.container);

            // Note that we are making an assumption here - that the position of the button will
            // never change while the menu is open. This seems like a safe bet - the user shouldn't
            // be resizing the screen, nothing should be animating, menus shouldn't otherwise be actively
            // changing, etc. There isn't really a foolproof way I can think of to listen for changes
            // in the global position of a DisplayObject, otherwise I would have done that. If for
            // some reason you need different behavior, first rethink if it's really necessary. Following
            // that, do something smarter than what I've done here.
            if (this._style === EternaMenuStyle.DEFAULT) {
                DisplayUtil.positionRelative(
                    menu.panel.container, HAlign.LEFT, VAlign.TOP,
                    menu.menuButton.container, HAlign.LEFT, VAlign.BOTTOM,
                    0, -1
                );
            } else if (this._style === EternaMenuStyle.PULLUP) {
                DisplayUtil.positionRelative(
                    menu.panel.container, HAlign.LEFT, VAlign.BOTTOM,
                    menu.menuButton.container, HAlign.LEFT, VAlign.TOP
                );
            }
        };

        menuButton.pointerOver.connect((_e) => {
            if (!this._enabled) return;
            if (menu.panel.display.visible) return;

            showDialog();

            const regs = new RegistrationGroup();

            regs.add(menu.panel.pointerOut.connect(() => {
                Assert.assertIsDefined(Flashbang.globalMouse);
                if (!DisplayUtil.hitTest(menuButton.display, Flashbang.globalMouse)) {
                    menu.panel.display.visible = false;
                    regs.close();
                }
            }));

            regs.add(menuButton.pointerOut.connect(() => {
                Assert.assertIsDefined(Flashbang.globalMouse);
                if (!DisplayUtil.hitTest(menu.panel.display, Flashbang.globalMouse)) {
                    menu.panel.display.visible = false;
                    regs.close();
                }
            }));
        });

        menuButton.clicked.connect(() => {
            if (!this._enabled) return;
            if (menu.panel.display.visible) return;

            showDialog();

            this._activeCapture = new PointerCapture(menu.panel.display, (e) => {
                if (e.type === 'pointertap') {
                    menu.panel.display.visible = false;
                    if (this._activeCapture) {
                        menu.panel.removeObject(this._activeCapture);
                        this._activeCapture = null;
                    }
                }
                e.stopPropagation();
            });
            menu.panel.addObject(this._activeCapture);
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

        for (const menu of this._menus) {
            if (menu.itemButtons.length === 0) {
                menu.panel.setSize(0, 0);
                continue;
            }

            let heightWalker = 7;
            let widthWalker = 0;

            for (const button of menu.itemButtons) {
                if (button == null) {
                    continue;
                }

                button.display.position = new Point(7, heightWalker);
                heightWalker += DisplayUtil.height(button.display) + 7;
                widthWalker = Math.max(widthWalker, DisplayUtil.width(button.display) + 14);
            }

            menu.panel.setSize(widthWalker, heightWalker);
        }

        const space: number = (this._style === EternaMenuStyle.PULLUP ? 1 : 10);
        let widthOffset: number = space;
        this._menuHeight = 0;

        for (const menu of this._menus) {
            const buttonWidth: number = menu.menuButton.container.width;
            const buttonHeight: number = menu.menuButton.container.height;

            menu.menuButton.display.position = new Point(widthOffset, 0);
            widthOffset += buttonWidth + space;
            this._menuHeight = Math.max(this._menuHeight, buttonHeight);
        }

        const lastIdx = this._menus.length - 1;
        const lastButtonWidth = this._menus[lastIdx].menuButton.container.width;
        this._menuWidth = (widthOffset + space);
        this._rightMargin = Math.max(lastButtonWidth, this._menus[lastIdx].panel.width) - lastButtonWidth;

        this.setSize(widthOffset, this._menuHeight + 1);
        if (this.inToolbar) {
            (this.display as TrueWidthDisplay).trueWidth = this.menuButtonWidth;
        }
    }

    private readonly _style: EternaMenuStyle;

    private _enabled: boolean = true;
    private _menus: Menu[] = [];
    private _menuWidth: number = 0;
    private _rightMargin: number = 0;
    private _menuHeight: number = 0;
    private _activeCapture: PointerCapture | null;
    public readonly inToolbar: boolean = false;
}

class Menu {
    public menuButton: GameButton;
    public panel: GamePanel;
    public itemButtons: GameButton[] = [];
}
