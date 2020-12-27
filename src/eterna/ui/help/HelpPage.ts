import {ContainerObject, StyledTextBuilder} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import TextUtil from 'eterna/util/TextUtil';
import {UnitSignal} from 'signals';
import {Point, TextMetrics} from 'pixi.js';
import {FontWeight} from 'flashbang/util/TextBuilder';
import GameButton from '../GameButton';

interface HelpPageProps {
    width: number;
    height: number;
}

export default class HelpPage extends ContainerObject {
    private static readonly theme = {
        titleSize: 20,
        fontSize: 14,
        padding: 10
    };

    public get onBack() { return this._onBack; }

    private _width: number;
    private _height: number;
    private _onBack = new UnitSignal();

    constructor(props: HelpPageProps) {
        super();
        this._width = props.width;
        this._height = props.height;
    }

    public setup(section: string, content: string) {
        const {theme} = HelpPage;

        this.container.removeChildren();
        const titleBuilder = Fonts.std()
            .text(section)
            .fontSize(theme.titleSize)
            .fontWeight(FontWeight.SEMIBOLD)
            .color(0xffffff);

        const titleMetrics = TextMetrics.measureText(section, titleBuilder.style);
        const titleElem = titleBuilder.build();

        const contentBuilder = new StyledTextBuilder({
            fontFamily: Fonts.STDFONT,
            fontSize: theme.fontSize,
            fill: 0xffffff,
            wordWrap: true,
            wordWrapWidth: this._width - theme.padding * 3
        });
        const contentElem = contentBuilder
            .appendHTMLStyledText(TextUtil.processTags(content))
            .build();
        contentElem.position = new Point(0, titleMetrics.height + theme.padding);

        const back = new GameButton().label(
            Fonts.std()
                .text('BACK')
                .fontWeight(FontWeight.SEMIBOLD)
                .fontSize(theme.fontSize)
                .color(0x4A90E2),
            undefined,
            false
        );
        this.regs.add(back.clicked.connect(() => {
            this._onBack.emit();
        }));
        back.container.position = new Point(0, this._height - theme.padding);

        this.container.addChild(titleElem);
        this.container.addChild(contentElem);
        this.addObject(back, this.container);
    }
}
