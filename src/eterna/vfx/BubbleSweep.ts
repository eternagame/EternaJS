import {ContainerObject} from 'flashbang';
import Bubble from './Bubble';

export default class BubbleSweep extends ContainerObject {
    constructor(numBubbles: number) {
        super();
        this._bubbles = [];
        for (let ii = 0; ii < numBubbles; ii++) {
            const bub: Bubble = new Bubble(true);
            this.addObject(bub, this.container);
            this._bubbles.push(bub);
        }
    }

    public start(): void {
        for (const bubble of this._bubbles) {
            bubble.autoHide = false;
            bubble.init();
        }
    }

    public stop(): void {
        for (const bubble of this._bubbles) {
            bubble.isPaused = true;
        }
    }

    public pause(): void {
        for (const bubble of this._bubbles) {
            bubble.isPaused = true;
        }
    }

    public decay(): void {
        for (const bubble of this._bubbles) {
            bubble.autoHide = true;
        }
    }

    private readonly _bubbles: Bubble[];
}
