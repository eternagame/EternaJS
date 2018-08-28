import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Bubble} from "./Bubble";

export class BubbleSweep extends ContainerObject {
    public constructor(bubblen: number) {
        super();
        this._bubbles = [];
        for (let ii: number = 0; ii < bubblen; ii++) {
            let bub: Bubble = new Bubble(true);
            this.addObject(bub, this.container);
            this._bubbles.push(bub);
        }
    }

    public start_sweep(): void {
        for (let bubble of this._bubbles) {
            bubble.autoHide = false;
            bubble.init();
        }
    }

    public stop_sweep(): void {
        for (let bubble of this._bubbles) {
            bubble.isPaused = true;
        }
    }

    public pause_sweep(): void {
        for (let bubble of this._bubbles) {
            bubble.isPaused = true;
        }
    }

    public decay_sweep(): void {
        for (let bubble of this._bubbles) {
            bubble.autoHide = true;
        }
    }

    private readonly _bubbles: Bubble[];
}
