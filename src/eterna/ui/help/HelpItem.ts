import {ContainerObject} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
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
            const text = Fonts.stdMedium()
                .text(props.text)
                .fontSize(theme.fontSize)
                .color(0xffffff)
                .build();
            this.container.addChild(text);
        }

        if (props.label) {
            const labelBuilder = Fonts.stdMedium()
                .text(props.label)
                .fontSize(theme.fontSize)
                .color(0xffffff);

            const labelMetrics = PIXI.TextMetrics.measureText(props.label, labelBuilder.style);
            const labelText = labelBuilder.build();
            labelText.x = props.width - labelMetrics.width;
            this.container.addChild(labelText);
        }
    }
}
