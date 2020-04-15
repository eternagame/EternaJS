import {ContainerObject} from 'flashbang';
import {Graphics} from 'pixi.js';
import UITheme from './UITheme';

interface ToolTipProps {
    text: string;
    content?: PIXI.Container;
}

export default class ToolTip extends ContainerObject {
    private static readonly theme = {
        colors: {
            background: 0xC0DCE7
        },
        borderRadius: 5
    };

    constructor(props: ToolTipProps) {
        super();
        const {theme} = ToolTip;

        const graphics = new Graphics();
        graphics.beginFill(theme.colors.background, 1);
        graphics.drawRoundedRect(0, 0, 200, 200, theme.borderRadius);
        graphics.endFill();
        this.container.addChild(graphics);
    }
}
