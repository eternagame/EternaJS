import Fonts from 'eterna/util/Fonts';
import {ContainerObject, HLayoutContainer} from 'flashbang';
import {FontWeight} from 'flashbang/util/TextBuilder';
import {
    Graphics, Rectangle, Text
} from 'pixi.js';
import {Value} from 'signals';
import GameDropdown from '../GameDropdown';
import ScrollBox from '../ScrollBox';
import ToolbarButton, {ButtonCategory, BUTTON_HEIGHT} from './ToolbarButton';

const BAY_BACKGROUND_COLOR = 0x043468;

class TabLabel extends ContainerObject {
    public readonly title;

    constructor(title: string) {
        super();
        this.title = title;
    }

    protected added() {
        this._background = new Graphics();
        this.container.addChild(this._background);

        const text = new Text(this.title, {
            fontSize: 10,
            fontFamily: Fonts.STDFONT,
            fill: 0xffffff,
            fontWeight: FontWeight.BOLD
        });
        this.container.addChild(text);
        this._width = Math.max(text.width + 20, this._MIN_WIDTH);

        const textX = this._width / 2 - text.width / 2;
        const textY = (this._HEIGHT - text.height) / 2;
        text.position.set(textX, textY);

        this.disable();
    }

    public enable() {
        // Only the top is rounded, so we draw a regular rect on the bottom then an
        // overlapping rounded rect on the top
        this._background
            .clear()
            .beginFill(BAY_BACKGROUND_COLOR)
            .drawRect(0, this._RADIUS, this._width, this._HEIGHT - this._RADIUS)
            .drawRoundedRect(0, 0, this._width, this._HEIGHT, this._RADIUS)
            .endFill();
    }

    public disable() {
        // Only the top is rounded, so we draw a regular rect on bottom then an
        // overlapping rounded rect on the top
        this._background
            .clear()
            .beginFill(0x0c2040)
            .drawRect(0, this._RADIUS, this._width, this._HEIGHT - this._RADIUS)
            .drawRoundedRect(0, 0, this._width, this._HEIGHT, this._RADIUS)
            .endFill();
    }

    private _background: Graphics;

    private readonly _HEIGHT = 20;
    private readonly _MIN_WIDTH = 60;
    private readonly _RADIUS = this._HEIGHT * 0.4;
    private _width: number;
}

class TabBar<Title extends string = string> extends ContainerObject {
    public readonly currentTab: Value<Title>;

    constructor(titles: Title[], initial: Title) {
        super();
        this._titles = titles;
        this.currentTab = new Value(initial);
    }

    protected added() {
        // Option 1: If wide enough, use tabs
        this._tabLayout = new HLayoutContainer(2);
        this.container.addChild(this._tabLayout);
        for (const title of this._titles) {
            const label = new TabLabel(title);
            this.addObject(label, this._tabLayout);
            this._tabLabels.push(label);
            this.regs.add(label.pointerTap.connect((e) => {
                e.stopPropagation();
                this.currentTab.value = title;
            }));
        }
        this._tabLayout.layout();

        // Option 2: If not wide enough, use a dropdown
        this._dropdown = new GameDropdown({
            fontSize: 10,
            options: this._titles,
            defaultOption: this._titles[0],
            borderWidth: 0,
            color: BAY_BACKGROUND_COLOR
        });
        this.regs.add(this._dropdown.selectedOption.connect((title) => {
            this.currentTab.value = title;
        }));
        this.addObject(this._dropdown, this.container);

        this.regs.add(this.currentTab.connectNotify((title) => {
            // Signals will prevent this from instantiating an infinite loop since it
            // doesn't emit if the value is unchanged
            this._dropdown.selectedOption.value = title;
            for (const label of this._tabLabels) {
                label.disable();
            }
            const activeLabel = this._tabLabels.find((label) => label.title === title);
            if (activeLabel) activeLabel.enable();
        }));

        this.layout();
    }

    public set width(val: number) {
        this._width = val;
        this.layout();
    }

    public getTabBounds(title: Title): Rectangle | null {
        if (this._tabLayout.visible) {
            return this._tabLabels.find((label) => label.title === title)?.display.getBounds() ?? null;
        } else {
            // FIXME: Can we adjust things so that we can highlight the actual dropdown item?
            // How would we handle needing to scroll to get to it?
            return this._dropdown.getItemBounds(title);
        }
    }

    private layout() {
        if (!this.isLiveObject) return;

        // Based on available space, show either tabs or dropdown
        if (this._width >= this._tabLayout.width) {
            this._tabLayout.visible = true;
            this._dropdown.display.visible = false;
        } else {
            this._tabLayout.visible = false;
            this._dropdown.display.visible = true;
        }
    }

    private _titles: Title[] = [];
    private _width: number = 0;
    private _tabLabels: TabLabel[] = [];
    private _tabLayout: HLayoutContainer;
    private _dropdown: GameDropdown<Title>;
}

export default class ToolShelf extends ContainerObject {
    protected added() {
        this._tabContentBackground = new Graphics();
        this.container.addChild(this._tabContentBackground);

        // The buttons are laid out horizontally, and then that whole area is able to be scrolled
        this._tabContentScroller = new ScrollBox(0, 0);
        this.addObject(this._tabContentScroller, this.container);
        this._tabContentLayout = new HLayoutContainer();
        this._tabContentScroller.content.addChild(this._tabContentLayout);

        this.layout();
    }

    public set width(val: number) {
        this._width = val;
        this.layout();
    }

    public addButton(button: ToolbarButton) {
        this.addObject(button, this._tabContentLayout);
        this._buttons.push(button);
        this.layout();
    }

    private changeTab(category: ButtonCategory) {
        for (const button of this._buttons) {
            button.display.visible = false;
        }

        for (const button of this._buttons.filter((btn) => btn.category === category)) {
            button.display.visible = true;
        }

        this._tabContentLayout.layout(true);
    }

    private layout() {
        if (!this.isLiveObject) return;

        const tabs = [
            ButtonCategory.SOLVE,
            ButtonCategory.CREATE,
            ButtonCategory.VIEW,
            ButtonCategory.INFO,
            ButtonCategory.ANNOTATE,
            ButtonCategory.IMPORT_EXPORT,
            ButtonCategory.CUSTOM_LAYOUT
        ].filter((cat) => this._buttons.some((button) => button.category === cat));
        let initialTab = ButtonCategory.NONE;
        if (tabs.length > 0) initialTab = tabs[0];
        if (
            this._tabBar
            && this._tabBar.currentTab.value !== ButtonCategory.NONE
        ) {
            initialTab = this._tabBar.currentTab.value;
        }

        // We have to recreate the tabBar because I made the mistake of implementing GameDropdown
        // without support for changing its content after instantiation
        if (this._tabBar) this.removeObject(this._tabBar);

        this._tabBar = new TabBar(
            // HACK: If we haven't added any buttons yet, this array will be blank. However, we need to
            // initialize the tab bar with its correct height, so we'll put a dummy option there for now
            tabs.length > 0 ? tabs : [ButtonCategory.NONE],
            initialTab
        );
        this._tabBar.width = this._width;
        this.addObject(this._tabBar, this.container);
        this.regs.add(this._tabBar.currentTab.connectNotify((title) => this.changeTab(title)));

        this._tabContentScroller.display.y = this._tabBar.display.height;
        this._tabContentBackground.y = this._tabBar.display.height;

        // Only the bottom is rounded, so we draw a regular rect on top then an
        // overlapping rounded rect on the bottom
        const RADIUS = 7;
        this._tabContentBackground
            .clear()
            .beginFill(BAY_BACKGROUND_COLOR)
            .drawRect(0, 0, this._width, BUTTON_HEIGHT - RADIUS)
            .drawRoundedRect(0, BUTTON_HEIGHT - RADIUS * 2, this._width, RADIUS * 2, RADIUS)
            .endFill();
        this._tabContentScroller.setSize(this._width, BUTTON_HEIGHT);
    }

    public disableTools(disable: boolean) {
        for (const button of this._buttons) {
            button.enabled = !disable;
        }
    }

    public changeActivePaintTool(toolId: string) {
        for (const button of this._buttons) {
            if (button.id === toolId) button.toggled.value = true;
            else if (button.isPaintTool) button.toggled.value = false;
        }
    }

    public get currentTab(): ButtonCategory {
        return this._tabBar.currentTab.value;
    }

    public getTabBounds(category: ButtonCategory): Rectangle | null {
        return this._tabBar.getTabBounds(category);
    }

    public getItemBounds(toolId: string) {
        const button = this._buttons.find((candidate) => candidate.id === toolId);
        if (!button) return null;
        const buttonBounds = button.display.getBounds();
        const scrollBounds = this._tabContentScroller.display.getBounds();
        if (buttonBounds.right < scrollBounds.left || buttonBounds.left > scrollBounds.right) {
            return {
                rect: this._tabContentScroller.getHScrollThumbBounds(),
                proxy: true
            };
        }
        return button;
    }

    private _tabBar: TabBar<ButtonCategory>;
    private _tabContentBackground: Graphics;
    private _tabContentScroller: ScrollBox;
    private _tabContentLayout: HLayoutContainer;

    private _width = 0;
    private _buttons: ToolbarButton[] = [];
}
