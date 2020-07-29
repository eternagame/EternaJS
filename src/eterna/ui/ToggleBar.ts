import {Graphics, Point, Text} from 'pixi.js';
import {Signal} from 'signals';
import Eterna from 'eterna/Eterna';
import {
    ContainerObject, KeyboardListener, Enableable, LocationTask, Easing, KeyboardEventType, KeyCode, Flashbang, Assert
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Sounds from 'eterna/resources/Sounds';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import ROPWait from 'eterna/rscript/ROPWait';

type InteractionEvent = PIXI.interaction.InteractionEvent;

export default class ToggleBar extends ContainerObject implements KeyboardListener, Enableable {
    /** Emitted when our state changes */
    public readonly stateChanged: Signal<number> = new Signal();

    constructor(numStates: number) {
        super();

        this._numStates = numStates;

        this._bg = new Graphics();
        this.container.addChild(this._bg);

        this._bg.clear();
        this._bg.beginFill(ToggleBar.COLOR_DARK, 0.6);
        this._bg.lineStyle(2, ToggleBar.COLOR_LIGHT, 0.85);
        this._bg.drawRoundedRect(
            0, 0,
            ToggleBar.BUTTON_SIZE * this._numStates, ToggleBar.BUTTON_SIZE,
            ToggleBar.ROUND_RECT_RADIUS
        );
        this._bg.endFill();

        this._hoverHilite = new Graphics();
        this.container.addChild(this._hoverHilite);

        this._hoverHilite.clear();
        this._hoverHilite.beginFill(ToggleBar.COLOR_MEDIUM, 0.45);
        this._hoverHilite.drawRoundedRect(
            0, 0,
            ToggleBar.BUTTON_SIZE, ToggleBar.BUTTON_SIZE,
            ToggleBar.ROUND_RECT_RADIUS
        );
        this._hoverHilite.endFill();
        this._hoverHilite.visible = false;

        this._selectedHilite = new Graphics();
        this.container.addChild(this._selectedHilite);

        this._selectedHilite.clear();
        this._selectedHilite.beginFill(ToggleBar.COLOR_LIGHT, 0.85);
        this._selectedHilite.drawRoundedRect(
            0, 0,
            ToggleBar.BUTTON_SIZE, ToggleBar.BUTTON_SIZE,
            ToggleBar.ROUND_RECT_RADIUS
        );
        this._selectedHilite.endFill();

        for (let ii = 0; ii < this._numStates; ii++) {
            this._labels[ii] = Fonts.std(`${ii + 1}`, 12).color(ToggleBar.COLOR_TEXT).build();
            this._labels[ii].position = new Point((ii * ToggleBar.BUTTON_SIZE) + 9, 5);
            this.container.addChild(this._labels[ii]);
        }

        this.state = 0;

        this.pointerOver.connect(() => this.onMouseOver());
        this.pointerOut.connect(() => this.onMouseOut());
        this.pointerTap.connect((event) => this.onMouseClick(event));
        this.pointerMove.connect((event) => this.onMouseMove(event));
    }

    protected added(): void {
        super.added();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.keyboardInput.pushListener(this));
    }

    public set state(newState: number) {
        if (newState !== this._selectedState) {
            if ((this._selectedState >= 0) && (this._selectedState < this._numStates)) {
                this._labels[this._selectedState].style.fill = ToggleBar.COLOR_TEXT;
            }

            this._selectedState = newState;
            this.replaceNamedObject(
                'BGSelectedAnim',
                new LocationTask(
                    this._selectedState * ToggleBar.BUTTON_SIZE, 0,
                    0.5, Easing.easeInOut, this._selectedHilite
                )
            );
            this._labels[this._selectedState].style.fill = ToggleBar.COLOR_HIGH;

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

    private onMouseClick(e: InteractionEvent): void {
        let state: number = this.getStateUnderMouse(e);
        if ((state === this._selectedState) || (state < 0) || (state >= this._numStates)) {
            return;
        }

        this.state = state;
        ROPWait.notifyClickUI(RScriptUIElementID.SWITCH);
    }

    private onMouseOver(): void {
        this._mouseOver = true;
    }

    private onMouseOut(): void {
        this._mouseOver = false;
        this._hoverHilite.visible = false;
        if ((this._hoveredState >= 0) && (this._hoveredState !== this._selectedState)) {
            this._labels[this._hoveredState].style.fill = ToggleBar.COLOR_TEXT;
        }
        this._hoveredState = -1;
    }

    private onMouseMove(e: InteractionEvent): void {
        if (!this._mouseOver) {
            return;
        }

        let state: number = this.getStateUnderMouse(e);
        if ((state === this._hoveredState) || (state < 0) || (state >= this._numStates)) {
            return;
        }

        if (this._hoveredState >= 0 && this._hoveredState !== this._selectedState) {
            this._labels[this._hoveredState].style.fill = ToggleBar.COLOR_TEXT;
        }

        this._hoveredState = state;
        if (this._hoveredState === this._selectedState) {
            this._hoverHilite.visible = false;
        } else {
            this._hoverHilite.visible = true;
            this._hoverHilite.position = new Point(this._hoveredState * ToggleBar.BUTTON_SIZE, 0);
            this._labels[this._hoveredState].style.fill = ToggleBar.COLOR_HIGH;
        }
    }

    private getStateUnderMouse(e: InteractionEvent): number {
        e.data.getLocalPosition(this.display, ToggleBar.P);
        return Math.floor(ToggleBar.P.x / ToggleBar.BUTTON_SIZE);
    }

    private readonly _bg: Graphics;
    private readonly _hoverHilite: Graphics;
    private readonly _selectedHilite: Graphics;

    private readonly _numStates: number;

    private _enabled: boolean = true;
    private _selectedState: number = -1;
    private _hoveredState: number = -1;
    private _mouseOver: boolean = false;
    private _labels: Text[] = [];

    private static readonly BUTTON_SIZE = 25;
    private static readonly ROUND_RECT_RADIUS = 10;
    private static readonly COLOR_DARK = 0x1C304C;
    private static readonly COLOR_MEDIUM = 0x3E566A;
    private static readonly COLOR_LIGHT = 0x88A1B1;
    private static readonly COLOR_TEXT = 0xBEDCE7;
    private static readonly COLOR_HIGH = 0xFFFFFF;

    private static readonly P: Point = new Point();
}
