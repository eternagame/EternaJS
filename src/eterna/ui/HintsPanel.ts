import {Point} from 'pixi.js';
import {Flashbang} from 'flashbang';
import MultiPagePanel from './MultiPagePanel';

export default class HintsPanel {
    private static relativePos = new Point(0.01, 0.35);
    private static width = 220;
    private static height = 283;

    public static create(puzzleHint: string) {
        let pages: string[];
        try {
            const json = JSON.parse(puzzleHint);
            if (Array.isArray(json)) {
                pages = json;
            } else {
                pages = [json];
            }
        } catch (e) {
            // This is to handle hints that are not valid JSON, I've seen a few.
            // Ideally, they'd be validation on the backend to ensure hints are stored in JSON.
            pages = [puzzleHint];
        }

        const panel = new MultiPagePanel('Hint', pages, HintsPanel.width, HintsPanel.height);
        const positionUpdater = () => {
            panel.display.position = new Point(
                Flashbang.stageWidth * HintsPanel.relativePos.x,
                Flashbang.stageHeight * HintsPanel.relativePos.y
            );
        };
        positionUpdater();
        return {panel, positionUpdater};
    }
}
