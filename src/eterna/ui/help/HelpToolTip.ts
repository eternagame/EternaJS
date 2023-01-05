import {ContainerObject, Assert} from 'flashbang';
import {
    Container,
    Graphics, Point, Rectangle, TextMetrics
} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import {FederatedPointerEvent} from '@pixi/events';

// AMW we have to be content to accept our positioner may
// in fact return null (if we want to use getbounds() for
// the purpose!)
export type ToolTipPositioner = [() => Rectangle | null, number, string];

export type HelpToolTipSide = 'top' | 'bottom';

interface HelpToolTipProps {
    text: string;
    positioner: ToolTipPositioner;
    side?: HelpToolTipSide;
    tailLength?: number;
    content?: Container;
}

export default class HelpToolTip extends ContainerObject {
    public static readonly theme = {
        colors: {
            background: 0xC0DCE7
        },
        borderRadius: 6,
        vPadding: 8,
        hPadding: 4,
        fontSize: 10,
        tipSize: 6,
        tailWidth: 3
    };

    private _side: HelpToolTipSide;
    private _positioner: ToolTipPositioner;

    public updatePosition() {
        const [getBounds, offset] = this._positioner;
        const bounds = getBounds();
        Assert.assertIsDefined(bounds);
        this.container.position.x = bounds.x + bounds.width / 2 + offset;
        if (this._side === 'top') {
            this.container.position.y = bounds.y;
        } else {
            this.container.position.y = bounds.y + bounds.height;
        }
    }

    constructor(props: HelpToolTipProps) {
        super();
        const {theme} = HelpToolTip;

        this._side = props.side ?? 'top';
        this._positioner = props.positioner;

        // Text
        const textBuilder = Fonts.std(props.text, theme.fontSize).bold().color(0);
        const textMetrics = TextMetrics.measureText(props.text, textBuilder.style);
        const textElem = textBuilder.build();

        // Background
        const widestElem = Math.max(textMetrics.width, props.content ? props.content.width : 0);
        const width = widestElem + theme.hPadding * 2;

        const height = textMetrics.height
            + theme.vPadding * 2
            + (props.content ? (props.content.height + theme.vPadding) : 0);

        const isBottom = props.side === 'bottom';
        const tailLength = props.tailLength ?? 0;
        const backgroundX = -width / 2;
        const [backgroundY, tipY, tailY] = (() => {
            if (isBottom) {
                return [
                    tailLength + theme.tipSize,
                    tailLength + theme.tipSize,
                    2
                ];
            } else {
                return [
                    -tailLength - theme.tipSize - height,
                    -tailLength - theme.tipSize,
                    -tailLength - 2
                ];
            }
        })();

        const background = new Graphics();
        background.interactive = true;
        background.on('pointerTap', (e: FederatedPointerEvent) => e.stopPropagation());
        background.beginFill(theme.colors.background, 1);
        background.drawRoundedRect(backgroundX, backgroundY, width, height, theme.borderRadius);
        textElem.position.set(
            backgroundX + (width - textMetrics.width) / 2,
            backgroundY + theme.vPadding
        );

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
            background.lineTo(tip[2].x, tailY + tailLength + 2);
        }

        this.container.addChild(background);

        if (props.content) {
            props.content.position.set(
                backgroundX + (width - props.content.width) / 2,
                backgroundY + textMetrics.height + theme.vPadding * 2
            );
            this.container.addChild(props.content);
        }

        this.container.addChild(textElem);
    }
}
