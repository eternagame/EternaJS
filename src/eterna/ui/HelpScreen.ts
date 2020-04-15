import {ContainerObject, Flashbang} from 'flashbang';
import {Point} from 'pixi.js';
import ToolTip from './ToolTip';

export default class HelpScreen {
    public static create() {
        const panel = new ToolTip({
            text: 'Testing'
        });

        const positionUpdater = () => {
            panel.display.position = new Point(
                Flashbang.stageWidth * 0.5,
                Flashbang.stageHeight * 0.5
            );
        };

        positionUpdater();
        return {panel, positionUpdater};
    }
}
