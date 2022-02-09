import {UnitSignal} from 'signals';
import {
    DisplayObject,
    Graphics,
    Texture
} from 'pixi.js';
import {
    ContainerObject,
    VLayoutContainer,
    HLayoutContainer,
    HAlign,
    VAlign
} from 'flashbang';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';

interface ContextMenuObjectProps {
    horizontal: boolean;
}

export default class ContextMenu extends ContainerObject {
    /** Emitted when the user interacts with the menu. */
    public readonly menuItemSelected = new UnitSignal();

    constructor(props: ContextMenuObjectProps) {
        super();

        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1.0,
            color: ContextMenu.PANEL_BACKGROUND_COLOR,
            dropShadow: true
        });
        this.addObject(this._panel, this.container, 0);

        if (props.horizontal) {
            this._buttonLayout = new HLayoutContainer(5, VAlign.CENTER);
        } else {
            this._buttonLayout = new VLayoutContainer(5, HAlign.LEFT);
        }
        this._panel.container.addChild(this._buttonLayout);

        this._horizontal = props.horizontal || false;
    }

    protected added(): void {
        super.added();
        this.doLayout();
    }

    public addItem(
        text: string,
        icon: DisplayObject | Texture | string | undefined = undefined,
        tooltipText: string | undefined = undefined,
        fillColor: number | undefined = undefined
    ): GameButton {
        const button = new GameButton();

        if (text) {
            button.label(text, 14);
        }

        if (icon) {
            button.allStates(icon);
        }

        if (tooltipText) {
            button.tooltip(tooltipText);
        }

        if (fillColor) {
            const buttonGraphic = new Graphics()
                .beginFill(fillColor)
                .drawRoundedRect(
                    0,
                    0,
                    ContextMenu.BUTTON_WIDTH,
                    ContextMenu.BUTTON_HEIGHT,
                    ContextMenu.BUTTON_CORNER_RADIUS
                ).endFill();
            button.customStyleBox(buttonGraphic);
        }

        this.addObject(button, this._buttonLayout);
        this._buttons.push(button);

        button.clicked.connect(() => this.menuItemSelected.emit());

        this.needsLayout();
        return button;
    }

    private needsLayout(): void {
        if (this.isLiveObject) {
            this.doLayout();
        }
    }

    private doLayout(): void {
        if (!this._horizontal) {
            let maxButtonWidth = 0;
            for (const button of this._buttons) {
                button.fixedLabelWidth(0);
                maxButtonWidth = Math.max(button.container.width, maxButtonWidth);
            }

            const MIN_LABEL_WIDTH = 200;
            const labelWidth = Math.max(maxButtonWidth, MIN_LABEL_WIDTH);

            for (const button of this._buttons) {
                button.fixedLabelWidth(labelWidth);
            }
        }

        this._buttonLayout.layout(true);
        this._buttonLayout.x = ContextMenu.PANEL_MARGIN;
        this._buttonLayout.y = ContextMenu.PANEL_MARGIN;

        this._panel.setSize(
            this._buttonLayout.width + (ContextMenu.PANEL_MARGIN * 2),
            this._buttonLayout.height + (ContextMenu.PANEL_MARGIN * 2)
        );
    }

    private readonly _panel: GamePanel;
    private readonly _buttonLayout: VLayoutContainer | HLayoutContainer;

    private _horizontal: boolean;
    private _buttons: GameButton[] = [];

    private static readonly PANEL_MARGIN: number = 5;
    private static readonly PANEL_BACKGROUND_COLOR: number = 0x152843;
    private static readonly BUTTON_WIDTH: number = 110;
    private static readonly BUTTON_HEIGHT: number = 30;
    private static readonly BUTTON_CORNER_RADIUS: number = 5;
}
