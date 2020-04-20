import {ContainerObject, Flashbang} from 'flashbang';
import {Point, Graphics, Container} from 'pixi.js';
import ToolTip from '../ToolTip';
import MultiPagePanel from '../MultiPagePanel';
import HelpItem from './HelpItem';
import HelpPage from './HelpPage';
import TextUtil from 'eterna/util/TextUtil';
import Fonts from 'eterna/util/Fonts';

interface HelpScreenProps {
    toolTips: {
        hints: boolean;
        modeSwitch: boolean;
    };
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
        ['Swap pair', '5'],
    ];

    public static create(props: HelpScreenProps) {

        // Tooltips
        const toolBarY = -73;
        const bottomCenter = new Point(0.5, 1);
        const topRightCorner = new Point(1, 0);
        const tooltips = [
            [new ToolTip({ text: 'MENU', tailLength: 57 }), bottomCenter, new Point(-316, toolBarY)],

            props.toolTips.modeSwitch
                ? [new ToolTip({ text: 'NATURAL/TARGET MODE' }), bottomCenter, new Point(-200, toolBarY)]
                : null,

            [
                new ToolTip({
                    text: 'BASE PALETTE',
                    content: (() => {
                        const elemW = 75;
                        const elemH = 18;
                        const separation = 2;
                        const makeRect = (x: number, y: number, color: number) => {
                            const rect = new Graphics();
                            rect.beginFill(color);
                            rect.drawRect(0, 0, elemW, elemH);
                            rect.endFill();
                            rect.position = new Point(x, y);
                            return rect;
                        };

                        const makeText = (text: string) => {
                            const builder = Fonts.stdRegular(text).color(0);
                            const metrics = PIXI.TextMetrics.measureText(text, builder.style);
                            const textElem = builder.build();
                            textElem.position = new Point(
                                (elemW - metrics.width) / 2,
                                (elemH - metrics.height) / 2
                            );
                            return textElem;
                        };

                        const adenine = makeRect(0, 0, TextUtil.STD_YELLOW_COLOR);
                        adenine.addChild(makeText("Adenine"));
                        const guanine = makeRect(elemW + separation, 0, TextUtil.STD_RED_COLOR);
                        guanine.addChild(makeText("Guanine"));
                        const uracil = makeRect(0, elemH + separation, TextUtil.STD_BLUE_COLOR);
                        uracil.addChild(makeText("Uracil"));
                        const cytosine = makeRect(elemW + separation, elemH + separation, TextUtil.STD_GREEN_COLOR);
                        cytosine.addChild(makeText("Cytosine"));
                        
                        const content = new Container();
                        content.addChild(adenine);
                        content.addChild(guanine);
                        content.addChild(uracil);
                        content.addChild(cytosine);
                        content.width = elemW * 2 + separation;
                        content.height = elemH * 2 + separation;
                        return content;
                    })()
                }),
                bottomCenter,
                new Point(-22, toolBarY)
            ],

            [new ToolTip({ text: 'ZOOM IN/OUT', tailLength: 57 }), bottomCenter, new Point(213, toolBarY)],
            [new ToolTip({ text: 'UNDO/REDO' }), bottomCenter, new Point(330, toolBarY)],

            props.toolTips.hints 
                ? [new ToolTip({ text: 'HINTS ON/OFF', side: 'bottom' }), topRightCorner, new Point(-94, 55)] 
                : null
        ].filter(Boolean) as Array<[ToolTip, Point, Point]>;

        const { theme } = HelpScreen;

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
