import * as log from "loglevel";
import {Point} from "pixi.js";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {GameButton} from "./GameButton";
import {GamePanel, GamePanelType} from "./GamePanel";

export enum EternaMenuStyle {
    DEFAULT = 0, PULLUP
}

export class EternaMenu extends GamePanel {
    public constructor(menu_style: EternaMenuStyle = EternaMenuStyle.DEFAULT) {
        super();
        this._menu_style = menu_style;
    }

    protected added() {
        super.added();
        this.needsLayout();
    }

    public add_item(label: string, url: string): void {
        let button: GameButton = new GameButton();

        if (url != null && url.length > 0) {
            button.label("<A HREF=\"" + url + "\"><U>" + label + "</U></A>", 12);
            button.clicked.connect(() => {
                log.debug(`TODO: navigateToURL '${url}'`);
                // let req: URLRequest = new URLRequest;
                // req.url = url;
                // this.navigateToURL(req, "_self");
            });
        } else {
            button.label(label, 12);
        }
        this.addObject(button, this.container);
        this._buttons.push(button);

        let panel: GamePanel = new GamePanel(0, 0.85);
        if (this._menu_style == EternaMenuStyle.PULLUP) {
            panel.setup(0, 1.0, 0x152843, 1.0, 0xffffff);
        }
        panel.display.visible = false;
        this._panels.push(panel);
        this._panel_buttons.push(null);
        button.addObject(panel);

        button.pointerOver.connect(() => panel.display.visible = true);
        button.pointerOut.connect(() => panel.display.visible = false);

        this.needsLayout();
    }

    public add_menu_button(button: GameButton): number {
        if (this._buttons.indexOf(button) >= 0) {
            return this._buttons.indexOf(button);
        }

        this.addObject(button, this.container);
        this._buttons.push(button);

        let panel: GamePanel = new GamePanel(0, 0.85);
        if (this._menu_style == EternaMenuStyle.PULLUP) {
            panel.setup(GamePanelType.NORMAL, 1.0, 0x152843, 1.0, 0xffffff);
        }
        panel.display.visible = false;
        this._panels.push(panel);
        this._panel_buttons.push(null);
        button.addObject(panel, button.container);

        button.pointerOver.connect(() => {
            panel.display.visible = true
        });
        button.pointerOut.connect(() => {
            panel.display.visible = false
        });

        this.needsLayout();
        return this._buttons.length - 1;
    }

    public add_sub_menu_button(index: number, button: GameButton, at_top: boolean = false): void {
        if (this._panel_buttons[index] == null) {
            this._panel_buttons[index] = [];
        }

        if (this._panel_buttons[index].indexOf(button) >= 0) {
            return;
        }

        let panel: GamePanel = this._panels[index];
        panel.addObject(button, panel.container);

        if (at_top) {
            this._panel_buttons[index].unshift(button);
        } else {
            this._panel_buttons[index].push(button);
        }

        this.needsLayout();
    }

    public add_sub_menu_button_at(index: number, button: GameButton, pos: number): void {
        if (this._panel_buttons[index] == null) {
            this._panel_buttons[index] = [];
        }

        if (this._panel_buttons[index].indexOf(button) >= 0) {
            return;
        }

        let panel: GamePanel = this._panels[index];
        panel.addObject(button, panel.container);
        this._panel_buttons[index][pos] = button;
        this.needsLayout();
    }

    public remove_button(button: GameButton): void {
        for (let ii = 0; ii < this._panels.length; ii++) {
            let jj: number = this._panel_buttons[ii].indexOf(button);
            if (jj >= 0) {
                let button: GameButton = this._panel_buttons[ii][jj];
                button.destroySelf();

                this._panel_buttons[ii].splice(jj, 1);
                this.needsLayout();
                return;
            }
        }
    }

    public get_width(use_margin: boolean = true): number {
        return this._menu_width + (use_margin ? this._right_margin : 0);
    }

    public get_height(): number {
        return this._menu_height;
    }

    /*override*/
    public set_disabled(disabled: boolean): void {
        for (let ii: number = 0; ii < this._buttons.length; ii++) {
            this._buttons[ii].enabled = !disabled;
        }
    }

    private needsLayout() {
        if (this.isLiveObject) {
            this.do_layout();
        }
    }

    private do_layout(): void {
        for (let ii = 0; ii < this._panels.length; ii++) {
            if (this._panel_buttons[ii] == null) {
                this._panels[ii].set_size(0, 0);
                continue;
            }

            let buttons: GameButton[] = this._panel_buttons[ii];
            let height_walker: number = 7;
            let width_walker: number = 0;

            for (let button of buttons) {
                if (button == null) {
                    continue;
                }

                button.display.position = new Point(7, height_walker);
                height_walker += DisplayUtil.height(button.display) + 7;
                width_walker = Math.max(width_walker, DisplayUtil.width(button.display) + 14);
            }

            this._panels[ii].set_size(width_walker, height_walker);
        }

        let space: number = (this._menu_style == EternaMenuStyle.PULLUP ? 1 : 10);
        let width_offset: number = space;
        this._menu_height = 0.;
        for (let ii = 0; ii < this._buttons.length; ii++) {
            let button: GameButton = this._buttons[ii];
            let panel: GamePanel = this._panels[ii];
            let buttonWidth: number = DisplayUtil.width(button.display);
            let buttonHeight: number = DisplayUtil.height(button.display);

            button.display.position = new Point(width_offset, 0);
            if (this._menu_style == EternaMenuStyle.DEFAULT) {
                panel.display.position = new Point(0, buttonHeight - 1);
            } else if (this._menu_style == EternaMenuStyle.PULLUP) {
                panel.display.position = new Point(0, -panel.get_panel_height() - 1);
            }
            width_offset += buttonWidth + space;
            this._menu_height = Math.max(this._menu_height, buttonHeight);
        }

        let lastIdx = this._panels.length - 1;
        let lastButtonWidth = DisplayUtil.width(this._buttons[lastIdx].display);
        this._menu_width = (width_offset + space);
        this._right_margin = Math.max(
            lastButtonWidth,
            this._panels[lastIdx].get_panel_width()) - lastButtonWidth;

        this.set_size(width_offset, this._menu_height + 1);
    }

    private readonly _menu_style: EternaMenuStyle;
    private _buttons: GameButton[] = [];
    private _panels: GamePanel[] = [];
    private _panel_buttons: GameButton[][] = [];
    private _menu_width: number = 0;
    private _right_margin: number = 0;
    private _menu_height: number = 0;
}
