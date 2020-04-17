import {ContainerObject, Flashbang} from 'flashbang';
import {Point} from 'pixi.js';
import ToolTip from '../ToolTip';
import MultiPagePanel from '../MultiPagePanel';
import HelpItem from './HelpItem';

export default class HelpScreen {
    private static readonly theme = {
        item: {
            width: 200,
            height: 22
        },
        column: {
            width: 228,
            height: 356
        }
    };

    private static shortcuts: Array<[string, string]> = [
        ['Mode', 'SPACE'],
        ['Zoom in', '+'],
        ['Zoom out', '-'],
        ['Undo', 'Z'],
        ['Redo', 'Y'],
    ];

    public static create() {
        const {theme} = HelpScreen;
        const screen = new ContainerObject();
        const toolsTips: Array<[ToolTip, Point, Point]> = [
            [new ToolTip({text: 'MENU', side: 'top', tailLength: 57}), new Point(0.5, 1), new Point(-340, -70)],
            [new ToolTip({text: 'BOOSTERS', side: 'top'}), new Point(0.5, 1), new Point(-240, -70)],
            [new ToolTip({text: 'HINTS ON/OFF', side: 'bottom' }), new Point(1, 0), new Point(-94, 55)]
        ];

        

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
        // const help = new MultiPagePanel({
        //     title: 'Quick Help Topics',
        //     pages: (() => {

        //     })(),
        //     width: theme.column.width * 2,
        //     height: theme.column.height
        // });

        // help sections
        const sections = new MultiPagePanel({
            title: 'Quick Help Topics',
            pages: (() => {
                const page = new ContainerObject();
                
                const add = (text: string, index: number, column: number) => {
                    const shortcut = new HelpItem({
                        text, 
                        width: theme.item.width,
                        onClicked: () => {

                        }
                    });
                    shortcut.container.position.x = column * theme.column.width;
                    shortcut.container.position.y = index * theme.item.height;
                    page.addObject(shortcut, page.container);
                };

                add("Tips & Tricks", 0, 0);
                add("The Four Bases", 1, 0);
                add("Moving & Magnifying RNA", 2, 0);

                add("Placing A-U", 0, 1);
                add("Slides", 1, 1);
                add("Swap Tool", 2, 1);

                return [page];
            })(),
            width: theme.column.width * 2,
            height: theme.column.height
        });

        screen.addObject(shortCuts, screen.container);
        screen.addObject(sections, screen.container);
        toolsTips.forEach(([toolTip]) => screen.addObject(toolTip, screen.container));

        const positionUpdater = () => {
            toolsTips.forEach(([toolTip, pos, offset]) => {
                toolTip.container.position = new Point(
                    Flashbang.stageWidth * pos.x + offset.x,
                    Flashbang.stageHeight * pos.y + offset.y
                );
            });

            const spacing = 10;
            const width = theme.column.width * 3 + spacing;
            shortCuts.container.position = new Point(
                Flashbang.stageWidth * 0.5 - width / 2,
                Flashbang.stageHeight * 0.5 - theme.column.height / 2
            );

            sections.container.position = new Point(
                shortCuts.container.position.x + theme.column.width + spacing,
                shortCuts.container.position.y
            );
        };

        positionUpdater();
        return {panel: screen, positionUpdater};
    }
}
