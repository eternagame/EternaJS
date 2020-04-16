import {ContainerObject} from 'flashbang';
import {Graphics, Point} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';

interface ToolTipProps {
    text: string;
    position: 'top' | 'bottom';
    tailLength?: number;
    content?: PIXI.Container;
    pos: Point;
}

export default class ToolTip extends ContainerObject {
    private static readonly theme = {
        colors: {
            background: 0xC0DCE7
        },
        borderRadius: 6,
        padding: 10,
        fontSize: 16,
        tipSize: 10,
        tailWidth: 3
    };

    constructor(props: ToolTipProps) {
        super();
        const {theme} = ToolTip;

        // Text
        const text = props.text.toUpperCase();
        const textBuilder = Fonts.stdBold(text).fontSize(theme.fontSize).color(0);
        const textMetrics = PIXI.TextMetrics.measureText(text, textBuilder.style);
        const textElem = textBuilder.build();
        textElem.position = new Point(theme.padding, theme.padding);

        // Background
        const background = new Graphics();
        const width = textMetrics.width + theme.padding * 2;
        const height = textMetrics.height + theme.padding * 2;
        background.beginFill(theme.colors.background, 1);
        background.drawRoundedRect(0, 0, width, height, theme.borderRadius);

        const isBottom = props.position === 'bottom';
        const yDirection = isBottom ? 1 : -1;

        // Tip
        const tipY = isBottom ? (height - 1) : 1;
        const tip = [
            new Point(width / 2 - theme.tipSize, tipY),
            new Point(width / 2 + theme.tipSize, tipY),
            new Point(width / 2, tipY + theme.tipSize * yDirection)
        ];
        background.drawPolygon(tip);
        background.endFill();

        // Tail
        if (props.tailLength !== undefined) {
            const tailOffset = 2; // minor offset to make the tail "merge" with the tip.
            background.lineStyle(theme.tailWidth, theme.colors.background);
            background.moveTo(tip[2].x, tip[2].y + tailOffset * -yDirection);
            background.lineTo(tip[2].x, tip[2].y + props.tailLength * yDirection);
        }

        this.container.addChild(background);
        this.container.addChild(textElem);
        this.container.position = props.pos;
    }
}
