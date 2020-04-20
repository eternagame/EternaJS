import {ContainerObject, Flashbang} from 'flashbang';
import {Point} from 'pixi.js';
import MultiPagePanel from '../MultiPagePanel';
import HelpItem from './HelpItem';
import HelpPage from './HelpPage';
import HelpToolTips, {HelpToolTipsProps} from './HelpToolTips';

interface HelpScreenProps {
    toolTips: HelpToolTipsProps;
}

export default class HelpScreen {
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

    public static create(props: HelpScreenProps) {
        const {theme} = HelpScreen;

        // Tooltips
        const tooltips = HelpToolTips.create(props.toolTips);

        // shortcuts
        const shortCuts = new MultiPagePanel({
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
        const help = new MultiPagePanel({
            title: 'Quick Help Topics',
            pages: [helpPage],
            width: theme.column.width * 2,
            height: theme.column.height
        });
        help.display.visible = false;
        helpPage.onBack.connect(() => {
            help.display.visible = false;
        });

        // help sections
        const sections = new ContainerObject();
        const sectionsContainer = new MultiPagePanel({
            title: 'Quick Help Topics',
            pages: [sections],
            width: theme.column.width * 2,
            height: theme.column.height
        });

        const screen = new ContainerObject();
        screen.addObject(shortCuts, screen.container);
        screen.addObject(sectionsContainer, screen.container);
        screen.addObject(help, screen.container);
        tooltips.forEach(([toolTip]) => screen.addObject(toolTip, screen.container));

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
                            help.display.visible = true;
                        }
                    });
                    shortcut.container.position.x = column * theme.column.width;
                    shortcut.container.position.y = localIndex * theme.item.height;
                    sections.addObject(shortcut, sections.container);
                });
            });


        const positionUpdater = () => {
            tooltips.forEach(([toolTip, pos, offset]) => {
                toolTip.container.position = new Point(
                    Flashbang.stageWidth * pos.x + offset.x,
                    Flashbang.stageHeight * pos.y + offset.y
                );
            });

            const width = theme.column.width * 3 + theme.column.margin;
            shortCuts.container.position = new Point(
                Flashbang.stageWidth * 0.5 - width / 2,
                Flashbang.stageHeight * 0.5 - theme.column.height / 2
            );

            sectionsContainer.container.position = new Point(
                shortCuts.container.position.x + theme.column.width + theme.column.margin,
                shortCuts.container.position.y
            );
            help.container.position = sectionsContainer.container.position;
        };

        positionUpdater();
        return {panel: screen, positionUpdater};
    }
}
