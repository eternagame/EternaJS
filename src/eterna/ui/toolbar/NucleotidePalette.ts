import {
    Point, Rectangle, Sprite, Text, Texture
} from 'pixi.js';
import {Signal} from 'signals';
import {
    ContainerObject, KeyboardListener, Enableable, StyledTextBuilder, KeyCode, InputUtil, KeyboardEventType, Assert
} from 'flashbang';
import EPars, {RNABase, RNAPaint} from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import ROPWait from 'eterna/rscript/ROPWait';
import {FederatedPointerEvent} from '@pixi/events';
import Tooltips from '../Tooltips';

export enum PaletteTargetType {
    A = 0, U, G, C, AU, UG, GC
}

export function GetPaletteTargetBaseType(type: PaletteTargetType): RNABase | RNAPaint {
    switch (type) {
        case PaletteTargetType.A: return RNABase.ADENINE;
        case PaletteTargetType.U: return RNABase.URACIL;
        case PaletteTargetType.G: return RNABase.GUANINE;
        case PaletteTargetType.C: return RNABase.CYTOSINE;
        case PaletteTargetType.AU: return RNAPaint.AU_PAIR;
        case PaletteTargetType.UG: return RNAPaint.GU_PAIR;
        case PaletteTargetType.GC: return RNAPaint.GC_PAIR;
        default: return Assert.unreachable(type);
    }
}

export function StringToPaletteTargetType(value: string): PaletteTargetType | null {
    switch (value.toUpperCase()) {
        case 'A': return PaletteTargetType.A;
        case 'U': return PaletteTargetType.U;
        case 'G': return PaletteTargetType.G;
        case 'C': return PaletteTargetType.C;
        case 'AU': case 'UA': return PaletteTargetType.AU;
        case 'GC': case 'CG': return PaletteTargetType.GC;
        case 'UG': case 'GU': return PaletteTargetType.UG;
        default: return null;
    }
}

/*
 * Nucleotide palette class. Handles the AUCG nucleotides options as well as the pairs.
 * Has the option to turn into a 'no pair' mode.
 */
export default class NucleotidePalette extends ContainerObject implements KeyboardListener, Enableable {
    /** Emitted when a palette target is clicked */
    public readonly targetClicked: Signal<PaletteTargetType> = new Signal();

    private static createTooltip(text: string): StyledTextBuilder {
        const builder = new StyledTextBuilder(Tooltips.DEFAULT_STYLE);
        EPars.addLetterStyles(builder);
        builder.append(text);
        return builder;
    }

    constructor() {
        super();

        this.display.interactive = true;

        this._paletteImage = BitmapManager.getBitmap(Bitmaps.ImgPalette);
        this._paletteImageNopairs = BitmapManager.getBitmap(Bitmaps.ImgPaletteNoPairs);
        this._selectPairData = BitmapManager.getBitmap(Bitmaps.ImgSelectPair);
        this._selectBaseData = BitmapManager.getBitmap(Bitmaps.ImgSelectBase);

        this._paletteDisplay = new Sprite(this._paletteImage);
        this.container.addChild(this._paletteDisplay);

        this._selection = new Sprite();
        this.container.addChild(this._selection);

        this._numAU = Fonts.std('', 12).color(0xffffff).bold().build();
        this.container.addChild(this._numAU);
        this._numUG = Fonts.std('', 12).color(0xffffff).bold().build();
        this.container.addChild(this._numUG);
        this._numGC = Fonts.std('', 12).color(0xffffff).bold().build();
        this.container.addChild(this._numGC);

        this._targets = new Array(7);

        this._targets[PaletteTargetType.A] = new PaletteTarget(
            PaletteTargetType.A, RScriptUIElementID.A, false, KeyCode.Digit1,
            [new Rectangle(10, 1, 25, 25)],
            NucleotidePalette.createTooltip('Mutate to <A>A (Adenine)</A>. (1)')
        );

        this._targets[PaletteTargetType.U] = new PaletteTarget(
            PaletteTargetType.U, RScriptUIElementID.U, false, KeyCode.Digit2,
            [new Rectangle(64, 1, 25, 25)],
            NucleotidePalette.createTooltip('Mutate to <U>U (Uracil)</U>. (2)')
        );

        this._targets[PaletteTargetType.G] = new PaletteTarget(
            PaletteTargetType.G, RScriptUIElementID.G, false, KeyCode.Digit3,
            [new Rectangle(118, 1, 25, 25)],
            NucleotidePalette.createTooltip('Mutate to <G>G (Guanine)</G>. (3)')
        );

        this._targets[PaletteTargetType.C] = new PaletteTarget(
            PaletteTargetType.C, RScriptUIElementID.C, false, KeyCode.Digit4,
            [new Rectangle(172, 1, 25, 25)],
            NucleotidePalette.createTooltip('Mutate to <C>C (Cytosine)</C>. (4)')
        );

        this._targets[PaletteTargetType.AU] = new PaletteTarget(
            PaletteTargetType.AU, RScriptUIElementID.AU, true, KeyCode.KeyQ,
            [new Rectangle(34, 27, 30, 20), new Rectangle(37, 15, 22, 20)],
            NucleotidePalette.createTooltip('Mutate to pair (<A>A</A>, <U>U</U>). (Q)')
        );

        this._targets[PaletteTargetType.UG] = new PaletteTarget(
            PaletteTargetType.UG, RScriptUIElementID.UG, true, KeyCode.KeyW,
            [new Rectangle(87, 27, 30, 20), new Rectangle(87, 15, 22, 20)],
            NucleotidePalette.createTooltip('Mutate to pair (<G>G</G>, <U>U</U>). (W)')
        );

        this._targets[PaletteTargetType.GC] = new PaletteTarget(
            PaletteTargetType.GC, RScriptUIElementID.GC, true, KeyCode.KeyE,
            [new Rectangle(141, 27, 30, 20), new Rectangle(137, 15, 22, 20)],
            NucleotidePalette.createTooltip('Mutate to pair (<G>G</G>, <C>C</C>). (E)')
        );
    }

    protected added(): void {
        super.added();

        this.regs.add(this.pointerDown.filter(InputUtil.IsLeftMouse).connect((e) => this.onClick(e)));
        this.regs.add(this.pointerMove.connect((e) => this.onMoveMouse(e)));
        this.regs.add(this.pointerOut.connect(() => {
            if (this._lastTooltipTarget != null) {
                Tooltips.instance?.removeTooltip(this._lastTooltipTarget);
            }
        }));
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.keyboardInput.pushListener(this));
    }

    public setOverrideDefault(): void {
        this._overrideDefaultMode = true;
        this._overrideNoPairMode = false;
    }

    public setOverrideNoPair(): void {
        this._overrideNoPairMode = true;
        this._overrideDefaultMode = false;
    }

    public resetOverrides(): void {
        this._overrideDefaultMode = false;
        this._overrideNoPairMode = false;
    }

    public changeDefaultMode(): void {
        if (this._overrideNoPairMode) {
            return;
        }
        this._paletteDisplay.texture = this._paletteImage;
        this._targets[PaletteTargetType.AU].enabled = true;
        this._targets[PaletteTargetType.UG].enabled = true;
        this._targets[PaletteTargetType.GC].enabled = true;
    }

    public changeNoPairMode(): void {
        if (this._overrideDefaultMode) {
            return;
        }
        this._paletteDisplay.texture = this._paletteImageNopairs;
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

    public get width(): number {
        return this._paletteDisplay.width;
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
                default:
                    return false;
            }
        }

        return false;
    }

    public getTarget(type: PaletteTargetType): Rectangle {
        return this._targets[type].hitboxes[0];
    }

    public clickTarget(type: PaletteTargetType): void {
        const target: PaletteTarget = this._targets[type];
        if (!target.enabled) {
            return;
        }

        this.targetClicked.emit(type);
        this.showSelection(target.hitboxes[0], target.isPair, true);
        ROPWait.notifyClickUI(target.id);
    }

    public clearSelection(): void {
        this._selection.visible = false;
    }

    public setPairCounts(au: number, ug: number, gc: number): void {
        if (this._targets[PaletteTargetType.AU].enabled) {
            this._numAU.text = au.toString();
            this._numAU.position.set(55 - 4 - 0.50 * this._numAU.width, 0);
        }
        if (this._targets[PaletteTargetType.UG].enabled) {
            this._numUG.text = ug.toString();
            this._numUG.position.set(109 - 4 - 0.50 * this._numUG.width, 0);
        }
        if (this._targets[PaletteTargetType.GC].enabled) {
            this._numGC.text = gc.toString();
            this._numGC.position.set(162 - 4 - 0.50 * this._numGC.width, 0);
        }
    }

    private showSelection(selectedBox: Rectangle, isPair: boolean, doShow: boolean): void {
        if (selectedBox == null) {
            return;
        }

        if (!doShow) {
            this.clearSelection();
        } else {
            this._selection.texture = isPair ? this._selectPairData : this._selectBaseData;
            this._selection.position.set(selectedBox.x, selectedBox.y);
            this._selection.visible = true;
        }
    }

    // Handle Click - Need to map position within the gameobject to action
    private onClick(e: FederatedPointerEvent): void {
        e.stopPropagation();
        if (!this._enabled) {
            return;
        }

        this.display.toLocal(e.global, undefined, NucleotidePalette.P);
        const target: PaletteTarget | null = this.getTargetAt(NucleotidePalette.P.x, NucleotidePalette.P.y);
        if (target != null) {
            this.clickTarget(target.type);
        }
    }

    /** Returns the enabled target whose hitbox contains the given location */
    private getTargetAt(localX: number, localY: number): PaletteTarget | null {
        for (const target of this._targets) {
            if (!target.enabled) {
                continue;
            }

            for (const hitbox of target.hitboxes) {
                if (hitbox.contains(localX, localY)) {
                    return target;
                }
            }
        }

        return null;
    }

    private onMoveMouse(e: FederatedPointerEvent): void {
        if (!this._enabled) {
            return;
        }

        this.display.toLocal(e.global, undefined, NucleotidePalette.P);
        const target: PaletteTarget | null = this.getTargetAt(NucleotidePalette.P.x, NucleotidePalette.P.y);

        if (target !== this._lastTooltipTarget) {
            Assert.assertIsDefined(Tooltips.instance);
            if (this._lastTooltipTarget != null) {
                Tooltips.instance.removeTooltip(this._lastTooltipTarget);
            }

            if (target != null) {
                Tooltips.instance.showTooltip(target, e.global, target.tooltip);
            }

            this._lastTooltipTarget = target;
        }
    }

    private readonly _paletteImage: Texture;
    private readonly _paletteImageNopairs: Texture;
    private readonly _selectBaseData: Texture;
    private readonly _selectPairData: Texture;

    private readonly _paletteDisplay: Sprite;
    private readonly _selection: Sprite;

    private readonly _numAU: Text;
    private readonly _numUG: Text;
    private readonly _numGC: Text;

    private _enabled: boolean = true;
    private _overrideDefaultMode: boolean = false;
    private _overrideNoPairMode: boolean = false;
    private _lastTooltipTarget: PaletteTarget | null;

    private readonly _targets: PaletteTarget[];

    private static readonly P = new Point();
}

export class PaletteTarget {
    public readonly type: PaletteTargetType;
    public readonly id: RScriptUIElementID;
    public readonly isPair: boolean;
    public readonly keyCode: string;
    public readonly hitboxes: Rectangle[];
    public readonly tooltip: StyledTextBuilder;
    public enabled: boolean = true;

    constructor(
        type: PaletteTargetType,
        id: RScriptUIElementID,
        isPair: boolean,
        keyCode: string,
        hitboxes: Rectangle[],
        tooltip: StyledTextBuilder
    ) {
        this.type = type;
        this.id = id;
        this.isPair = isPair;
        this.keyCode = keyCode;
        this.hitboxes = hitboxes;
        this.tooltip = tooltip;
    }
}
