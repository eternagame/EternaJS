import {UnitSignal} from 'signals';
import {ContainerObject, VLayoutContainer, HAlign} from 'flashbang';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';

export default class ContextMenu extends ContainerObject {
    /** Emitted when the user interacts with the menu. */
    public readonly menuItemSelected = new UnitSignal();

    constructor() {
        super();

        this._panel = new GamePanel(GamePanelType.NORMAL, 1.0, 0x152843, 1.0, 0xffffff);
        this.addObject(this._panel, this.container, 0);

        this._buttonLayout = new VLayoutContainer(5, HAlign.LEFT);
        this._panel.container.addChild(this._buttonLayout);
    }

    protected added(): void {
        super.added();
        this.doLayout();
    }

    public addItem(item: string): GameButton {
        let button = new GameButton().label(item, 14);
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
        let maxButtonWidth = 0;
        for (let button of this._buttons) {
            button.fixedLabelWidth(0);
            maxButtonWidth = Math.max(button.container.width, maxButtonWidth);
        }

        const MIN_LABEL_WIDTH = 200;
        let labelWidth = Math.max(maxButtonWidth, MIN_LABEL_WIDTH);

        for (let button of this._buttons) {
            button.fixedLabelWidth(labelWidth);
        }

        const MARGIN = 10;

        this._buttonLayout.layout(true);
        this._buttonLayout.x = MARGIN;
        this._buttonLayout.y = MARGIN;

        this._panel.setSize(
            this._buttonLayout.width + (MARGIN * 2),
            this._buttonLayout.height + (MARGIN * 2)
        );
    }

    private readonly _panel: GamePanel;
    private readonly _buttonLayout: VLayoutContainer;

    private _buttons: GameButton[] = [];
}
