import * as log from "loglevel";
import {Point, Rectangle, Sprite, Text, Texture} from "pixi.js";
import {IsLeftMouse} from "../../flashbang/input/InputUtil";
import {KeyboardEventType} from "../../flashbang/input/KeyboardEventType";
import {KeyboardListener} from "../../flashbang/input/KeyboardInput";
import {KeyCode} from "../../flashbang/input/KeyCode";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Enableable} from "../../flashbang/objects/Enableable";
import {Signal} from "../../signals/Signal";
import {EPars} from "../EPars";
import {BitmapManager} from "../resources/BitmapManager";
import {Bitmaps} from "../resources/Bitmaps";
import {ROPWait} from "../rscript/ROPWait";
import {RScriptUIElementID} from "../rscript/RScriptUIElement";
import {Fonts} from "../util/Fonts";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export enum PaletteTargetType {
    A = 0, U, G, C, AU, UG, GC
}

export function GetPaletteTargetBaseType(type: PaletteTargetType): number {
    switch (type) {
    case PaletteTargetType.A: return EPars.RNABASE_ADENINE;
    case PaletteTargetType.U: return EPars.RNABASE_URACIL;
    case PaletteTargetType.G: return EPars.RNABASE_GUANINE;
    case PaletteTargetType.C: return EPars.RNABASE_CYTOSINE;
    case PaletteTargetType.AU: return EPars.RNABASE_AU_PAIR;
    case PaletteTargetType.UG: return EPars.RNABASE_GU_PAIR;
    case PaletteTargetType.GC: return EPars.RNABASE_GC_PAIR;
    }
}

export function StringToPaletteTargetType(value: string): PaletteTargetType {
    switch (value.toUpperCase()) {
    case "A": return PaletteTargetType.A;
    case "U": return PaletteTargetType.U;
    case "G": return PaletteTargetType.G;
    case "C": return PaletteTargetType.C;
    case "AU": case "UA": return PaletteTargetType.AU;
    case "GC": case "CG": return PaletteTargetType.GC;
    case "UG": case "GU": return PaletteTargetType.UG;
    default: return null;
    }
}

/*
 * Nucleotide palette class. Handles the AUCG nucleotides options as well as the pairs.
 * Has the option to turn into a 'no pair' mode.
 */
export class NucleotidePalette extends ContainerObject implements KeyboardListener, Enableable {
    /** Emitted when a palette target is clicked */
    public readonly targetClicked: Signal<PaletteTargetType> = new Signal();

    public constructor() {
        super();

        this.display.interactive = true;

        this._palette_image = BitmapManager.get_bitmap(Bitmaps.ImgPalette);
        this._palette_image_nopairs = BitmapManager.get_bitmap(Bitmaps.ImgPaletteNoPairs);
        this._select_pair_data = BitmapManager.get_bitmap(Bitmaps.ImgSelectPair);
        this._select_base_data = BitmapManager.get_bitmap(Bitmaps.ImgSelectBase);

        this._palette_display = new Sprite(this._palette_image);
        this.container.addChild(this._palette_display);

        this._selection = new Sprite();
        this.container.addChild(this._selection);

        this._num_au = Fonts.arial("", 12).color(0xffffff).bold().build();
        this.container.addChild(this._num_au);
        this._num_ug = Fonts.arial("", 12).color(0xffffff).bold().build();
        this.container.addChild(this._num_ug);
        this._num_gc = Fonts.arial("", 12).color(0xffffff).bold().build();
        this.container.addChild(this._num_gc);

        this._targets = new Array(7);

        this._targets[PaletteTargetType.A] = new PaletteTarget(
            PaletteTargetType.A, RScriptUIElementID.A, false, KeyCode.Digit1,
            [new Rectangle(9, 7, 25, 25)],
            "Mutate to <FONT COLOR='#FFFF33'>A (Adenine)</FONT>. (1)"
        );

        this._targets[PaletteTargetType.U] = new PaletteTarget(
            PaletteTargetType.U, RScriptUIElementID.U, false, KeyCode.Digit2,
            [new Rectangle(58, 7, 25, 25)],
            "Mutate to <FONT COLOR='#7777FF'>U (Uracil)</FONT>. (2)"
        );

        this._targets[PaletteTargetType.G] = new PaletteTarget(
            PaletteTargetType.G, RScriptUIElementID.G, false, KeyCode.Digit3,
            [new Rectangle(107, 7, 25, 25)],
            "Mutate to <FONT COLOR='#FF3333'>G (Guanine)</FONT>. (3)"
        );

        this._targets[PaletteTargetType.C] = new PaletteTarget(
            PaletteTargetType.C, RScriptUIElementID.C, false, KeyCode.Digit4,
            [new Rectangle(156, 7, 25, 25)],
            "Mutate to <FONT COLOR='#33FF33'>C (Cytosine)</FONT>. (4)"
        );

        this._targets[PaletteTargetType.AU] = new PaletteTarget(
            PaletteTargetType.AU, RScriptUIElementID.AU, true, KeyCode.KeyQ,
            [new Rectangle(31, 29, 30, 20), new Rectangle(37, 15, 22, 20)],
            "Mutate to pair (<FONT COLOR='#FFFF33'>A</FONT>, <FONT COLOR='#7777FF'>U</FONT>). (Q)"
        );

        this._targets[PaletteTargetType.UG] = new PaletteTarget(
            PaletteTargetType.UG, RScriptUIElementID.UG, true, KeyCode.KeyW,
            [new Rectangle(80, 29, 30, 20), new Rectangle(87, 15, 22, 20)],
            "Mutate to pair (<FONT COLOR='#FF3333'>G</FONT>, <FONT COLOR='#7777FF'>U</FONT>). (W)"
        );

        this._targets[PaletteTargetType.GC] = new PaletteTarget(
            PaletteTargetType.GC, RScriptUIElementID.GC, true, KeyCode.KeyE,
            [new Rectangle(129, 29, 30, 20), new Rectangle(137, 15, 22, 20)],
            "Mutate to pair (<FONT COLOR='#FF3333'>G</FONT>, <FONT COLOR='#33FF33'>C</FONT>). (E)"
        );

        this._enabled = true;
        this._last_tooltip = null;
    }

    protected added(): void {
        super.added();

        this.regs.add(this.pointerDown.filter(IsLeftMouse).connect(e => this.on_click(e)));
        this.regs.add(this.pointerMove.connect(e => this.on_move_mouse(e)));
        this.regs.add(this.mode.keyboardInput.pushListener(this));
    }

    public set_override_default(): void {
        this._override_default_mode = true;
        this._override_no_pair_mode = false;
    }

    public set_override_no_pair(): void {
        this._override_no_pair_mode = true;
        this._override_default_mode = false;
    }

    public reset_overrides(): void {
        this._override_default_mode = false;
        this._override_no_pair_mode = false;
    }

    public change_default_mode(): void {
        if (this._override_no_pair_mode) {
            return;
        }
        this._palette_display.texture = this._palette_image;
        this._targets[PaletteTargetType.AU].enabled = true;
        this._targets[PaletteTargetType.UG].enabled = true;
        this._targets[PaletteTargetType.GC].enabled = true;
    }

    public change_no_pair_mode(): void {
        if (this._override_default_mode) {
            return;
        }
        this._palette_display.texture = this._palette_image_nopairs;
        this._targets[PaletteTargetType.AU].enabled = false;
        this._targets[PaletteTargetType.UG].enabled = false;
        this._targets[PaletteTargetType.GC].enabled = false;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        this.display.alpha = value ? 1 : 0.5;
        this._enabled = value;
    }

    public get_bar_width(): number {
        return this._palette_display.width;
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        if (!this._enabled || !this.display.visible) {
            return false;
        }

        if (e.type === KeyboardEventType.KEY_DOWN) {
            switch (e.code) {
            case KeyCode.Digit1:
                this.clickTarget(PaletteTargetType.A);
                return true;
            case KeyCode.Digit2:
                this.clickTarget(PaletteTargetType.U);
                return true;
            case KeyCode.Digit3:
                this.clickTarget(PaletteTargetType.G);
                return true;
            case KeyCode.Digit4:
                this.clickTarget(PaletteTargetType.C);
                return true;
            case KeyCode.KeyQ:
                this.clickTarget(PaletteTargetType.AU);
                return true;
            case KeyCode.KeyW:
                this.clickTarget(PaletteTargetType.UG);
                return true;
            case KeyCode.KeyE:
                this.clickTarget(PaletteTargetType.GC);
                return true;
            }
        }

        return false;
    }

    public getTarget(type: PaletteTargetType): Rectangle {
        return this._targets[type].hitboxes[0];
    }

    public clickTarget(type: PaletteTargetType): void {
        let target: PaletteTarget = this._targets[type];
        if (!target.enabled) {
            return;
        }

        this.targetClicked.emit(type);
        this.show_selection(target.hitboxes[0], target.isPair, true);
        ROPWait.NotifyClickUI(target.id);
    }

    public clear_selection(): void {
        this._selection.visible = false;
    }

    public set_pair_counts(au: number, ug: number, gc: number): void {
        if (this._targets[PaletteTargetType.AU].enabled) {
            this._num_au.text = au.toString();
            this._num_au.position = new Point(57 - this._num_au.width, 1);
        }
        if (this._targets[PaletteTargetType.UG].enabled) {
            this._num_ug.text = ug.toString();
            this._num_ug.position = new Point(103 - this._num_ug.width, 1);
        }
        if (this._targets[PaletteTargetType.GC].enabled) {
            this._num_gc.text = gc.toString();
            this._num_gc.position = new Point(155 - this._num_gc.width, 1);
        }
    }

    private show_selection(selected_box: Rectangle, is_pair: boolean, do_show: boolean): void {
        if (selected_box == null) {
            return;
        }

        if (!do_show) {
            this.clear_selection();
        } else {
            this._selection.texture = is_pair ? this._select_pair_data : this._select_base_data;
            this._selection.position = new Point(selected_box.x, selected_box.y);
            this._selection.visible = true;
        }
    }

    // Handle Click - Need to map position within the gameobject to action
    private on_click(e: InteractionEvent): void {
        if (!this._enabled) {
            return;
        }

        e.data.getLocalPosition(this.display, NucleotidePalette.P);
        let target: PaletteTarget = this.getTargetAt(NucleotidePalette.P.x, NucleotidePalette.P.y);
        if (target != null) {
            this.clickTarget(target.type);
        }
    }

    /** Returns the enabled target whose hitbox contains the given location */
    private getTargetAt(localX: number, localY: number): PaletteTarget | null {
        for (let target of this._targets) {
            if (!target.enabled) {
                continue;
            }

            for (let hitbox of target.hitboxes) {
                if (hitbox.contains(localX, localY)) {
                    return target;
                }
            }
        }

        return null;
    }

    private on_move_mouse(e: InteractionEvent): void {
        if (!this._enabled) {
            return;
        }

        e.data.getLocalPosition(this.display, NucleotidePalette.P);
        let target: PaletteTarget = this.getTargetAt(NucleotidePalette.P.x, NucleotidePalette.P.y);
        let tooltip: string = (target != null ? target.tooltip : null);

        if (tooltip !== this._last_tooltip) {
            this._last_tooltip = tooltip;
            log.debug(`TODO: show tooltip: ${tooltip}`);
            // if (tooltip == null) {
            //     this.set_mouse_over_object(null, 1.0);
            // } else {
            //     this.set_mouse_over_object(new TextBalloon(tooltip, 0x0, 0.8), 1.0);
            // }
        }
    }

    private readonly _palette_image: Texture;
    private readonly _palette_image_nopairs: Texture;
    private readonly _select_base_data: Texture;
    private readonly _select_pair_data: Texture;

    private readonly _palette_display: Sprite;
    private readonly _selection: Sprite;

    private readonly _num_au: Text;
    private readonly _num_ug: Text;
    private readonly _num_gc: Text;

    private _enabled: boolean;
    private _override_default_mode: boolean = false;
    private _override_no_pair_mode: boolean = false;
    private _last_tooltip: string;

    private readonly _targets: PaletteTarget[];

    private static readonly P: Point = new Point();
}

class PaletteTarget {
    public readonly type: PaletteTargetType;
    public readonly id: RScriptUIElementID;
    public readonly isPair: boolean;
    public readonly keyCode: string;
    public readonly hitboxes: Rectangle[];
    public readonly tooltip: string;
    public enabled: boolean = true;

    public constructor(type: PaletteTargetType, id: RScriptUIElementID, isPair: boolean, keyCode: string, hitboxes: Rectangle[], tooltip: string) {
        this.type = type;
        this.id = id;
        this.isPair = isPair;
        this.keyCode = keyCode;
        this.hitboxes = hitboxes;
        this.tooltip = tooltip;
    }
}
