import {TextMetrics} from 'pixi.js';
import {ContainerObject} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import {FontWeight} from 'flashbang/util/TextBuilder';
import GameButton from '../GameButton';

interface HelpItemProps {
    text: string;
    label?: string;
    width: number;
    onClicked?: () => void;
}

export default class HelpItem extends ContainerObject {
    private static readonly theme = {
        fontSize: 14
    };

    constructor(props: HelpItemProps) {
        super();

        const {theme} = HelpItem;

        if (props.onClicked) {
            const button = new GameButton().label(props.text, theme.fontSize, false);
            this.regs.add(button.clicked.connect(props.onClicked));
            this.addObject(button, this.container);
        } else {
            const text = Fonts.std()
                .text(props.text)
                .fontSize(theme.fontSize)
                .fontWeight(FontWeight.SEMIBOLD)
                .color(0xffffff)
                .build();
            this.container.addChild(text);
        }

        if (props.label) {
            const labelBuilder = Fonts.std()
                .text(props.label)
                .fontSize(theme.fontSize)
                .fontWeight(FontWeight.SEMIBOLD)
                .color(0xffffff);

            const labelMetrics = TextMetrics.measureText(props.label, labelBuilder.style);
            const labelText = labelBuilder.build();
            labelText.x = props.width - labelMetrics.width;
            this.container.addChild(labelText);
        }
    }
}
