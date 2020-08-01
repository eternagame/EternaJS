import {Point} from 'pixi.js';
import {
    Flashbang, Assert, ContainerObject
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import MultiPagePanel from './MultiPagePanel';
import UITheme from './UITheme';
import HTMLTextObject from './HTMLTextObject';

export default class HintsPanel extends ContainerObject {
    private static readonly theme = {
        width: 220,
        height: 283,
        fontSize: 14,
        relativePos: new Point(0.0098, 0.5)
    };

    constructor(puzzleHint: string) {
        super();
        const {theme} = HintsPanel;
        let pagesContent: string[];
        try {
            const json = JSON.parse(puzzleHint);
            if (Array.isArray(json)) {
                pagesContent = json;
            } else {
                pagesContent = [json];
            }
        } catch (e) {
            // This is to handle hints that are not valid JSON, I've seen a few.
            // Ideally, they'd be validation on the backend to ensure hints are stored in JSON.
            pagesContent = [puzzleHint];
        }

        const pages = pagesContent.map((pageText, pageIndex) => {
            const textElem = new HTMLTextObject(pageText, theme.width - 2 * UITheme.panel.padding, undefined, true)
                .font(Fonts.STDFONT)
                .color(0xffffff)
                .fontSize(theme.fontSize);

            textElem.display.visible = pageIndex === 0;
            return textElem;
        });

        Assert.assertIsDefined(Flashbang.stageHeight);
        const panel = new MultiPagePanel({
            title: 'Hint',
            pages,
            width: theme.width,
            maxHeight: Flashbang.stageHeight * 0.8
        });
        this.addObject(panel, this.container);
    }

    protected added() {
        super.added();

        const onResize = () => {
            const {theme} = HintsPanel;
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            this.container.position = new Point(
                Flashbang.stageWidth * theme.relativePos.x,
                (Flashbang.stageHeight - this.container.height) * theme.relativePos.y
            );
        };
        onResize();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(onResize));
    }
}
