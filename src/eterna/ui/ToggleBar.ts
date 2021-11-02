import {
    InteractionEvent, Point, Text, Sprite
} from 'pixi.js';
import {Signal} from 'signals';
import {
    ContainerObject,
    KeyboardListener,
    Enableable,
    KeyboardEventType,
    KeyCode,
    Flashbang,
    Assert,
    HLayoutContainer,
    VAlign
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Sounds from 'eterna/resources/Sounds';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import ROPWait from 'eterna/rscript/ROPWait';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameButton from './GameButton';

export default class ToggleBar extends ContainerObject implements KeyboardListener, Enableable {
    /** Emitted when our state changes */
    public readonly stateChanged: Signal<number> = new Signal();

    constructor(numStates: number) {
        super();

        this._numStates = numStates;

        const container = new HLayoutContainer(0, VAlign.CENTER);

        const background = Sprite.from(Bitmaps.RectImg);

        const prevButton = new GameButton()
            .allStates(Bitmaps.PrevArrow);
        prevButton.display.position.set(-18, -9);

        const nextButton = new GameButton()
            .allStates(Bitmaps.NextArrow);
        nextButton.display.position.set(28, -9);

        prevButton.clicked.connect(() => this.prevState());
        nextButton.clicked.connect(() => this.nextState());

        this._text = Fonts.std(`${this._selectedState + 1}/${this._numStates}`, 13).color(ToggleBar.COLOR_TEXT).build();
        this._text.position.set(8, 10);

        this.state = 0;

        this.addObject(prevButton, container);
        this.addObject(nextButton, container);

        this.container.addChild(background);
        this.container.addChild(container);

        this.container.addChild(this._text);

        this.pointerOver.connect(() => this.onMouseOver());
        this.pointerOut.connect(() => this.onMouseOut());
        this.pointerMove.connect((event) => this.onMouseMove(event));
    }

    protected added(): void {
        super.added();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.keyboardInput.pushListener(this));
    }

    public set state(newState: number) {
        if (newState !== this._selectedState) {
            this._selectedState = newState;
            this._text.text = `${newState + 1}/${this._numStates}`;

            Flashbang.sound.playSound(Sounds.SoundSwitch);
            this.stateChanged.emit(newState);
        }
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        if (!this._enabled || !this.display.visible) {
            return false;
        }

        if (e.type === KeyboardEventType.KEY_DOWN && e.code === KeyCode.Tab && !e.ctrlKey) {
            this.state = (this._selectedState + (e.shiftKey ? -1 : 1) + this._numStates) % this._numStates;
            e.preventDefault(); // prevent Tab from changing focus in the browser
            return true;
        } else {
            return false;
        }
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        this.display.alpha = value ? 1.0 : 0.3;
        this._enabled = value;
    }

    private prevState(): void {
        const prevState = this._selectedState - 1;
        if (prevState < 0) return;
        this.state = prevState;
        ROPWait.notifyClickUI(RScriptUIElementID.SWITCH);
    }

    private nextState(): void {
        const nextState = this._selectedState + 1;
        if (nextState + 1 > this._numStates) return;
        this.state = nextState;
        ROPWait.notifyClickUI(RScriptUIElementID.SWITCH);
    }

    private onMouseOver(): void {
        this._mouseOver = true;
    }

    private onMouseOut(): void {
        this._mouseOver = false;
        this._hoveredState = -1;
    }

    private onMouseMove(e: InteractionEvent): void {
        if (!this._mouseOver) {
            return;
        }

        const state: number = this.getStateUnderMouse(e);
        if ((state === this._hoveredState) || (state < 0) || (state >= this._numStates)) {
            return;
        }

        this._hoveredState = state;
    }

    private getStateUnderMouse(e: InteractionEvent): number {
        e.data.getLocalPosition(this.display, ToggleBar.P);
        return Math.floor(ToggleBar.P.x / ToggleBar.BUTTON_SIZE);
    }

    private readonly _numStates: number;

    private _enabled: boolean = true;
    private _selectedState: number = -1;
    private _hoveredState: number = -1;
    private _mouseOver: boolean = false;
    private _text: Text;

    private static readonly BUTTON_SIZE = 25;
    private static readonly COLOR_TEXT = 0x043468;

    private static readonly P: Point = new Point();
}
