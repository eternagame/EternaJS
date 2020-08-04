import {ContainerObject, Assert} from 'flashbang';
import Eterna from 'eterna/Eterna';
import Bubble from './Bubble';

export default class Background extends ContainerObject {
    constructor(bubbleCount: number = 20, foreground: boolean = false) {
        super();
        this._bubbleCount = bubbleCount;
        this._foreground = foreground;
    }

    protected added(): void {
        super.added();

        this.updateBackground();

        this._bubbles = [];
        for (let ii = 0; ii < this._bubbleCount; ii++) {
            let bub: Bubble = new Bubble(this._foreground);
            // bub.sprite.visible = false;
            bub.init();
            this.addObject(bub, this.container);
            this._bubbles.push(bub);
        }

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(() => this.onResized()));
        this.regs.add(Eterna.settings.simpleGraphics.connectNotify((value) => this.disableBubbles(value)));
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
            if (this._isFrozen) {
                let lightBlue = 'rgb(67, 93, 146) 0%';
                let darkBlue = 'rgb(10, 43, 87) 70%';
                Eterna.gameDiv.style.backgroundImage = `radial-gradient(ellipse, ${lightBlue}, ${darkBlue})`;
            } else {
                Eterna.gameDiv.style.backgroundImage = '';
            }
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
