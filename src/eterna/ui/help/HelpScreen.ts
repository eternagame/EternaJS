import {ContainerObject, Flashbang} from 'flashbang';
import {Point} from 'pixi.js';
import ToolTip from '../ToolTip';
import MultiPagePanel from '../MultiPagePanel';
import HelpItem from './HelpItem';

export default class HelpScreen {
    private static readonly theme = {
        itemWidth: 200,
        itemHeight: 22
    };

    private static shortcuts: Array<[string, string]> = [
        ['Mode', 'SPACE'],
        ['Zoom in', '+'],
        ['Zoom out', '-']
    ];

    public static create() {
        const {theme} = HelpScreen;
        const screen = new ContainerObject();
        const toolsTips: Array<[ToolTip, Point, Point]> = [
            [new ToolTip({text: 'Menu', side: 'top', tailLength: 57}), new Point(0.3, 1), new Point(80, -80)]
        ];

        toolsTips.forEach(([toolTip]) => screen.addObject(toolTip, screen.container));

        const shortCutsPage = new ContainerObject();
        HelpScreen.shortcuts.forEach(([text, label], index) => {
            const shortcut = new HelpItem({text, label, width: theme.itemWidth});
            shortcut.container.position.y = index * theme.itemHeight;
            shortCutsPage.addObject(shortcut, shortCutsPage.container);
        });
        const shortCuts = new MultiPagePanel({
            title: 'Key Commands',
            pages: [shortCutsPage],
            width: 228,
            height: 356
        });
        screen.addObject(shortCuts, screen.container);

        const positionUpdater = () => {
            toolsTips.forEach(([toolTip, pos, offset]) => {
                toolTip.container.position = new Point(
                    Flashbang.stageWidth * pos.x + offset.x,
                    Flashbang.stageHeight * pos.y + offset.y
                );
            });

            shortCuts.container.position = new Point(
                Flashbang.stageWidth * 0.5,
                Flashbang.stageHeight * 0.5
            );
        };

        positionUpdater();
        return {panel: screen, positionUpdater};
    }
}
