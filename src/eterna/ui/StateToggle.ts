import {
    Text, Sprite
} from 'pixi.js';
import {Registration, Signal} from 'signals';
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
import Tooltips from './Tooltips';

export default class StateToggle extends ContainerObject implements KeyboardListener, Enableable {
    /** Emitted when our state changes */
    public readonly stateChanged: Signal<number> = new Signal();
    private _tooltip: string;
    private _tooltipReg: Registration | null;

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

        this._text = Fonts.std(`${this._selectedState + 1}/${this._numStates}`, 13).color(StateToggle.COLOR_TEXT).build();
        this._text.position.set(8, 10);

        this.state = 0;

        this.addObject(prevButton, container);
        this.addObject(nextButton, container);

        this.container.addChild(background);
        this.container.addChild(container);

        this.container.addChild(this._text);
    }

    protected added(): void {
        super.added();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.keyboardInput.pushListener(this));
        this.setupTooltip();
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

    private setupTooltip(): void {
        if (this._tooltipReg != null) {
            this._tooltipReg.close();
            this._tooltipReg = null;
        }

        if (this._tooltip != null && this._tooltip !== '' && Tooltips.instance != null) {
            this._tooltipReg = this.regs.add(Tooltips.instance.addTooltip(this, this._tooltip));
        }
    }

    public tooltip(text: string): StateToggle {
        if (this._tooltip !== text) {
            this._tooltip = text;
            if (this.isLiveObject) {
                this.setupTooltip();
            }
        }
        return this;
    }

    public getToolTip() {
        return this._tooltip;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        this.display.alpha = value ? 1.0 : 0.3;
        this._enabled = value;
    }

    public get numStates() {
        return this._numStates;
    }

    private prevState(): void {
        const prevState = (this._selectedState - 1 + this._numStates) % this._numStates;
        this.state = prevState;
        ROPWait.notifyClickUI(RScriptUIElementID.SWITCH);
    }

    private nextState(): void {
        const nextState = (this._selectedState + 1 + this._numStates) % this._numStates;
        this.state = nextState;
        ROPWait.notifyClickUI(RScriptUIElementID.SWITCH);
    }

    private readonly _numStates: number;

    private _enabled: boolean = true;
    private _selectedState: number = -1;
    private _text: Text;

    private static readonly COLOR_TEXT = 0x043468;
}
