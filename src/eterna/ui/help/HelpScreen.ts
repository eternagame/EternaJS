import {
    ContainerObject, Flashbang, DisplayUtil, HAlign, VAlign, AppMode
} from 'flashbang';
import {Point, Graphics} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import MultiPagePanel from '../MultiPagePanel';
import HelpItem from './HelpItem';
import HelpPage from './HelpPage';
import HelpToolTips, {HelpToolTipsProps} from './HelpToolTips';
import HelpToolTip from './HelpToolTip';
import GameButton from '../GameButton';

interface HelpScreenProps {
    toolTips: HelpToolTipsProps;
}

export default class HelpScreen extends AppMode {
    private static readonly theme = {
        item: {
            width: 200,
            height: 23
        },
        column: {
            width: 228,
            height: 356,
            maxItems: 12,
            margin: 10
        },
        page: {
            height: 280
        }
    };

    private static shortcuts: Array<[string, string]> = [
        ['Mode', 'SPACE'],
        ['Zoom in', '+'],
        ['Zoom out', '-'],
        ['Undo', 'Z'],
        ['Redo', 'Y'],
        ['Paint A', '1'],
        ['Paint U', '2'],
        ['Paint G', '3'],
        ['Paint C', '4'],
        ['Paint A/U pair', 'Q'],
        ['Paint U/G pair', 'W'],
        ['Paint G/C pair', 'E'],
        ['Swap pair', '5']
    ];

    private _backdrop: Graphics;
    private _toolTips: HelpToolTip[];
    private _shortCuts: MultiPagePanel;
    private _sections: MultiPagePanel;
    private _help: MultiPagePanel;
    private _closeButton: GameButton;

    constructor(props: HelpScreenProps) {
        super();
        const {theme} = HelpScreen;

        // Tooltips
        this._toolTips = HelpToolTips.create(props.toolTips);

        // shortcuts
        this._shortCuts = new MultiPagePanel({
            title: 'Key Commands',
            pages: (() => {
                const page = new ContainerObject();
                HelpScreen.shortcuts.forEach(([text, label], index) => {
                    const shortcut = new HelpItem({text, label, width: theme.item.width});
                    shortcut.container.position.y = index * theme.item.height;
                    page.addObject(shortcut, page.container);
                });
                return [page];
            })(),
            width: theme.column.width,
            height: theme.column.height
        });

        // Help content
        const helpPage = new HelpPage({
            width: theme.column.width * 2,
            height: theme.page.height
        });
        this._help = new MultiPagePanel({
            title: 'Quick Help Topics',
            pages: [helpPage],
            width: theme.column.width * 2,
            height: theme.column.height
        });
        this._help.display.visible = false;
        this.regs.add(helpPage.onBack.connect(() => {
            this._help.display.visible = false;
        }));

        // help sections
        const sectionsContainer = new ContainerObject();
        this._sections = new MultiPagePanel({
            title: 'Quick Help Topics',
            pages: [sectionsContainer],
            width: theme.column.width * 2,
            height: theme.column.height
        });

        // backdrop
        this._backdrop = new PIXI.Graphics();
        this._backdrop.interactive = true;
        this._backdrop.once('click', () => {
            this.modeStack.popMode();
        });
        this.drawBackDrop();

        this.container.addChild(this._backdrop);
        this.addObject(this._shortCuts, this.container);
        this.addObject(this._sections, this.container);
        this.addObject(this._help, this.container);
        this._toolTips.forEach((toolTip) => this.addObject(toolTip, this.container));

        // Close button
        this._closeButton = new GameButton()
            .up(Bitmaps.ImgHelpClose)
            .over(Bitmaps.ImgHelpCloseOver)
            .down(Bitmaps.ImgHelpClose)
            .tooltip('Close Help');
        this.addObject(this._closeButton, this.container);
        this.regs.add(this._closeButton.clicked.connect(() => {
            this.modeStack.popMode();
        }));

        // TODO localize
        const locale = 'en-US'; // navigator.language;
        import(`assets/Help/help-${locale}.json`)
            .then(({default: json}) => {
                Object.entries(json).forEach(([name, content], index) => {
                    const column = Math.floor(index / theme.column.maxItems);
                    const localIndex = index % theme.column.maxItems;
                    const shortcut = new HelpItem({
                        text: name,
                        width: theme.item.width,
                        onClicked: () => {
                            helpPage.setup(name, content as string);
                            this._help.display.visible = true;
                        }
                    });
                    shortcut.container.position.x = column * theme.column.width;
                    shortcut.container.position.y = localIndex * theme.item.height;
                    sectionsContainer.addObject(shortcut, sectionsContainer.container);
                });
            });

        this.updateLayout();
    }

    public onResized() {
        super.onResized();
        this.updateLayout();
    }

    private updateLayout() {
        const {theme} = HelpScreen;
        this.drawBackDrop();
        this._toolTips.forEach((toolTip) => toolTip.updatePosition());

        const width = theme.column.width * 3 + theme.column.margin;
        this._shortCuts.container.position = new Point(
            Flashbang.stageWidth * 0.5 - width / 2,
            Flashbang.stageHeight * 0.5 - theme.column.height / 2
        );

        this._sections.container.position = new Point(
            this._shortCuts.container.position.x + theme.column.width + theme.column.margin,
            this._shortCuts.container.position.y
        );
        this._help.container.position = this._sections.container.position;

        DisplayUtil.positionRelativeToStage(
            this._closeButton.display, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, 0, 0
        );
    }

    private drawBackDrop() {
        this._backdrop.clear();
        this._backdrop.beginFill(0, 0.4);
        this._backdrop.drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight);
        this._backdrop.endFill();
    }
}
