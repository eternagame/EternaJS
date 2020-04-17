import {ContainerObject} from 'flashbang';
import {Graphics, Point} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';

interface ToolTipProps {
    text: string;
    side: 'top' | 'bottom';
    tailLength?: number;
    content?: PIXI.Container;
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

        const width = textMetrics.width + theme.padding * 2;
        const height = textMetrics.height + theme.padding * 2;
        const isBottom = props.side === 'bottom';
        const tailLength = props.tailLength ?? 0;

        const backgroundX = -width / 2;
        const [backgroundY, tipY, tailY] = (() => {
            if (isBottom) {
                return [
                    tailLength + theme.tipSize,
                    tailLength + theme.tipSize,
                    0
                ];
            } else {
                return [
                    -tailLength - theme.tipSize - height,
                    -tailLength - theme.tipSize,
                    -tailLength
                ];
            }
        })();

        // Background
        const background = new Graphics();
        background.beginFill(theme.colors.background, 1);
        background.drawRoundedRect(backgroundX, backgroundY, width, height, theme.borderRadius);
        textElem.position = new Point(backgroundX + theme.padding, backgroundY + theme.padding);

        // Tip
        const tipDirection = isBottom ? -1 : 1;
        const tip = [
            new Point(backgroundX + width / 2 - theme.tipSize, tipY),
            new Point(backgroundX + width / 2 + theme.tipSize, tipY),
            new Point(backgroundX + width / 2, tipY + theme.tipSize * tipDirection)
        ];
        background.drawPolygon(tip);
        background.endFill();

        // Tail
        if (tailLength > 0) {
            background.lineStyle(theme.tailWidth, theme.colors.background);
            background.moveTo(tip[2].x, tailY);
            background.lineTo(tip[2].x, tailY + props.tailLength);
        }

        this.container.addChild(background);
        this.container.addChild(textElem);
    }
}
