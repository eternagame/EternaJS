import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Eterna} from "../Eterna";
import {Bubble} from "./Bubble";

export class Background extends ContainerObject {
    constructor(bubbleCount: number = 20, foreground: boolean = false) {
        super();
        this._bubbleCount = bubbleCount;
        this._foreground = foreground;
    }

    protected added(): void {
        super.added();

        this.updateBackground();

        this._bubbles = [];
        for (let ii: number = 0; ii < this._bubbleCount; ii++) {
            let bub: Bubble = new Bubble(this._foreground);
            // bub.sprite.visible = false;
            bub.init();
            this.addObject(bub, this.container);
            this._bubbles.push(bub);
        }

        this.regs.add(this.mode.resized.connect(() => this.onResized()));
    }

    public disableBubbles(disable: boolean): void {
        for (let bubble of this._bubbles) {
            if (!disable && !bubble.display.visible) {
                bubble.init();
            }
            bubble.display.visible = !disable;
        }
    }

    private freezeBubbles(freeze: boolean): void {
        for (let bubble of this._bubbles) {
            bubble.isPaused = freeze;
        }
    }

    public freezeBackground(freeze: boolean): void {
        this._isFrozen = freeze;
        this.freezeBubbles(freeze);
        this.updateBackground();
    }

    private updateBackground(): void {
        if (Eterna.gameDiv != null) {
            let lightBlue: string, darkBlue :string;
            if (this._isFrozen) {
                lightBlue = "rgb(67, 93, 146) 0%";
                darkBlue = "rgb(10, 43, 87) 75%";
            } else {
                lightBlue = "rgb(50, 69, 109) 0%";
                darkBlue = "rgb(6, 26, 52) 75%";
            }
            Eterna.gameDiv.style.backgroundImage = `radial-gradient(circle, ${lightBlue}, ${darkBlue})`;
        }
    }

    private onResized(): void {
        for (let bubble of this._bubbles) {
            bubble.init();
        }
    }

    private readonly _bubbleCount: number;
    private readonly _foreground: boolean;

    private _bubbles: Bubble[];
    private _isFrozen: boolean = false;
}
