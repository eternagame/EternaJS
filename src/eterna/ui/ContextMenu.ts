import {UnitSignal} from 'signals';
import {
    Container,
    Texture
} from 'pixi.js';
import {
    ContainerObject,
    VLayoutContainer,
    HLayoutContainer,
    HAlign,
    VAlign
} from 'flashbang';
import GameButton, {ButtonTheme} from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';

interface ContextMenuObjectProps {
    horizontal: boolean;
}

export default class ContextMenu extends ContainerObject {
    /** Emitted when the user interacts with the menu. */
    public readonly menuItemSelected = new UnitSignal();

    constructor(props: ContextMenuObjectProps) {
        super();

        if (props.horizontal) {
            this._buttonLayout = new HLayoutContainer(5, VAlign.CENTER);
        } else {
            this._buttonLayout = new VLayoutContainer(5, HAlign.LEFT);
        }

        this._horizontal = props.horizontal || false;
    }

    protected added(): void {
        super.added();

        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1.0,
            dropShadow: true
        });
        this.addObject(this._panel, this.container, 0);

        this.container.addChild(this._buttonLayout);

        this.doLayout();
    }

    public addItem(
        text: string,
        icon: Container | Texture | string | undefined = undefined,
        tooltipText: string | undefined = undefined,
        theme: ButtonTheme = 'secondary',
        labelBackground?: boolean
    ): GameButton {
        const button = new GameButton(theme);

        if (text) {
            button.label(text, 14, labelBackground);
        }

        if (icon) {
            button.allStates(icon);
        }

        if (tooltipText) {
            button.tooltip(tooltipText);
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

    private _panel: GamePanel;
    private readonly _buttonLayout: VLayoutContainer | HLayoutContainer;

    private _horizontal: boolean;
    private _buttons: GameButton[] = [];

    private static readonly PANEL_MARGIN: number = 5;
}
