import {Point} from 'pixi.js';
import {Flashbang, StyledTextBuilder, ContainerObject} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import TextUtil from 'eterna/util/TextUtil';
import MultiPagePanel from './MultiPagePanel';
import UITheme from './UITheme';

export default class HintsPanel {
    private static readonly theme = {
        width: 220,
        height: 283,
        fontSize: 14,
        relativePos: new Point(0.0098, 0.35)
    };

    public static create(puzzleHint: string) {
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
            const textElem = new StyledTextBuilder({
                fontFamily: Fonts.ARIAL,
                fontSize: theme.fontSize,
                fill: 0xffffff,
                wordWrap: true,
                wordWrapWidth: theme.width - 2 * UITheme.panel.padding
            })
                .appendHTMLStyledText(TextUtil.processTags(pageText))
                .build();

            textElem.visible = pageIndex === 0;
            return new ContainerObject(textElem);
        });

        const panel = new MultiPagePanel({
            title: 'Hint',
            pages,
            width: theme.width,
            height: theme.height
        });
        const positionUpdater = () => {
            panel.display.position = new Point(
                Flashbang.stageWidth * theme.relativePos.x,
                Flashbang.stageHeight * theme.relativePos.y
            );
        };
        positionUpdater();
        return {panel, positionUpdater};
    }
}
