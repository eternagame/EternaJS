import {
    Container,
    Graphics,
    Point, Rectangle, Sprite, Text, Texture
} from 'pixi.js';
import {Signal} from 'signals';
import {
    ContainerObject, KeyboardListener, Enableable, StyledTextBuilder, KeyCode, InputUtil,
    KeyboardEventType, Assert, DisplayUtil, HAlign, VAlign
} from 'flashbang';
import EPars, {RNABase, RNAPaint} from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import ROPWait from 'eterna/rscript/ROPWait';
import {FederatedPointerEvent} from '@pixi/events';
import Eterna from 'eterna/Eterna';
import BaseTextures from 'eterna/pose2D/BaseTextures';
import BaseAssets from 'eterna/pose2D/BaseAssets';
import {BlurFilter} from '@pixi/filter-blur';
import {AdjustmentFilter} from 'pixi-filters';
import GraphicsObject from 'flashbang/objects/GraphicsObject';
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

        this._selectPairData = BitmapManager.getBitmap(Bitmaps.ImgSelectPair);
        this._selectBaseData = BitmapManager.getBitmap(Bitmaps.ImgSelectBase);

        this._paletteDisplay = new Container();
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
            [new Rectangle(10, 2, 30, 30)],
            NucleotidePalette.createTooltip('Mutate to <A>A (Adenine)</A>. (1)')
        );

        this._targets[PaletteTargetType.U] = new PaletteTarget(
            PaletteTargetType.U, RScriptUIElementID.U, false, KeyCode.Digit2,
            [new Rectangle(63, 2, 30, 30)],
            NucleotidePalette.createTooltip('Mutate to <U>U (Uracil)</U>. (2)')
        );

        this._targets[PaletteTargetType.G] = new PaletteTarget(
            PaletteTargetType.G, RScriptUIElementID.G, false, KeyCode.Digit3,
            [new Rectangle(117, 2, 30, 30)],
            NucleotidePalette.createTooltip('Mutate to <G>G (Guanine)</G>. (3)')
        );

        this._targets[PaletteTargetType.C] = new PaletteTarget(
            PaletteTargetType.C, RScriptUIElementID.C, false, KeyCode.Digit4,
            [new Rectangle(170, 2, 30, 30)],
            NucleotidePalette.createTooltip('Mutate to <C>C (Cytosine)</C>. (4)')
        );

        this._targets[PaletteTargetType.AU] = new PaletteTarget(
            PaletteTargetType.AU, RScriptUIElementID.AU, true, KeyCode.KeyQ,
            [new Rectangle(36, 25, 30, 24), new Rectangle(40, 15, 22, 20)],
            NucleotidePalette.createTooltip('Mutate to pair (<A>A</A>, <U>U</U>). (Q)')
        );

        this._targets[PaletteTargetType.UG] = new PaletteTarget(
            PaletteTargetType.UG, RScriptUIElementID.UG, true, KeyCode.KeyW,
            [new Rectangle(90, 25, 30, 24), new Rectangle(94, 15, 22, 20)],
            NucleotidePalette.createTooltip('Mutate to pair (<G>G</G>, <U>U</U>). (W)')
        );

        this._targets[PaletteTargetType.GC] = new PaletteTarget(
            PaletteTargetType.GC, RScriptUIElementID.GC, true, KeyCode.KeyE,
            [new Rectangle(143, 25, 30, 24), new Rectangle(147, 15, 22, 20)],
            NucleotidePalette.createTooltip('Mutate to pair (<G>G</G>, <C>C</C>). (E)')
        );
    }

    protected added(): void {
        super.added();
        BaseAssets._init();

        const bg = new Graphics().beginFill(0x043468).drawRoundedRect(0, 0, 210, 50, 5).endFill();
        this._paletteDisplay.addChild(bg);

        const getBase = (baseType: RNABase, size: number, addLetter: boolean) => {
            const baseTextures = new BaseTextures(baseType);

            const base = new Sprite();
            this.regs.add(Eterna.settings.colorblindTheme.connectNotify(() => {
                base.texture = baseTextures.getBodyTexture(0, Eterna.settings.colorblindTheme.value).texture;
                base.height = size;
                base.scale.x = base.scale.y;
            }));

            if (!addLetter) return base;

            const baseWithLetter = new Container();
            baseWithLetter.addChild(base);
            const letter = Fonts.std(EPars.nucleotideToString(baseType)).bold().fontSize(14).build();
            baseWithLetter.addChild(letter);
            DisplayUtil.positionRelative(
                letter, HAlign.CENTER, VAlign.CENTER,
                base, HAlign.CENTER, VAlign.CENTER,
                0, -1
            );

            return baseWithLetter;
        };

        const addBase = (base: Container, hitbox: Rectangle) => {
            this._paletteDisplay.addChild(base);
            DisplayUtil.positionRelativeToBounds(
                base, HAlign.CENTER, VAlign.CENTER,
                hitbox, HAlign.CENTER, VAlign.CENTER
            );
        };

        const addPair = (base1: Container, base2: Container, hitbox: Rectangle) => {
            const pairContainer = new Container();
            pairContainer.addChild(base1);
            pairContainer.addChild(base2);
            base2.x = 13;
            this._paletteDisplay.addChild(pairContainer);
            DisplayUtil.positionRelativeToBounds(
                pairContainer, HAlign.CENTER, VAlign.CENTER,
                hitbox, HAlign.CENTER, VAlign.CENTER
            );
            return pairContainer;
        };

        addBase(getBase(RNABase.ADENINE, 34, true), this._targets[PaletteTargetType.A].hitboxes[0]);
        addBase(getBase(RNABase.URACIL, 34, true), this._targets[PaletteTargetType.U].hitboxes[0]);
        addBase(getBase(RNABase.GUANINE, 34, true), this._targets[PaletteTargetType.G].hitboxes[0]);
        addBase(getBase(RNABase.CYTOSINE, 34, true), this._targets[PaletteTargetType.C].hitboxes[0]);

        const auPair = addPair(
            getBase(RNABase.ADENINE, 22, false),
            getBase(RNABase.URACIL, 22, false),
            this._targets[PaletteTargetType.AU].hitboxes[0]
        );
        const ugPair = addPair(
            getBase(RNABase.URACIL, 22, false),
            getBase(RNABase.GUANINE, 22, false),
            this._targets[PaletteTargetType.UG].hitboxes[0]
        );
        const gcPair = addPair(
            getBase(RNABase.GUANINE, 22, false),
            getBase(RNABase.CYTOSINE, 22, false),
            this._targets[PaletteTargetType.GC].hitboxes[0]
        );

        this._pairSprites = [auPair, ugPair, gcPair];

        const addSat = (
            alpha: number,
            hitbox: Rectangle,
            flip: boolean
        ) => {
            const tri = new Graphics()
                .beginFill(0xffffff)
                .drawPolygon(
                    flip
                        ? [{x: 0, y: 4}, {x: 7, y: 0}, {x: 7, y: 8}]
                        : [{x: 0, y: 0}, {x: 0, y: 8}, {x: 7, y: 4}]
                )
                .endFill();
            tri.filters = [new BlurFilter(1, 16), new AdjustmentFilter({alpha})];
            tri.x = hitbox.x + 4 + (flip ? 7 : 0);
            tri.y = hitbox.y;
            this._paletteDisplay.addChild(tri);
            tri.cacheAsBitmap = true;
            return tri;
        };
        addSat(0.2, this._targets[PaletteTargetType.AU].hitboxes[1], false);
        addSat(0.2, this._targets[PaletteTargetType.AU].hitboxes[1], true);
        addSat(0.65, this._targets[PaletteTargetType.UG].hitboxes[1], false);
        addSat(0.65, this._targets[PaletteTargetType.UG].hitboxes[1], true);
        addSat(1.5, this._targets[PaletteTargetType.GC].hitboxes[1], false);
        addSat(1.5, this._targets[PaletteTargetType.GC].hitboxes[1], true);

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
        for (const sprite of this._pairSprites) sprite.visible = true;
        this._targets[PaletteTargetType.AU].enabled = true;
        this._targets[PaletteTargetType.UG].enabled = true;
        this._targets[PaletteTargetType.GC].enabled = true;
    }

    public changeNoPairMode(): void {
        if (this._overrideDefaultMode) {
            return;
        }
        for (const sprite of this._pairSprites) sprite.visible = false;
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
            DisplayUtil.positionRelativeToBounds(
                this._selection, HAlign.CENTER, VAlign.CENTER,
                selectedBox, HAlign.CENTER, VAlign.CENTER
            );
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

        this.showTooltipAtPointer(e);
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

        this.showTooltipAtPointer(e);
    }

    private showTooltipAtPointer(e: FederatedPointerEvent) {
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

    private readonly _selectBaseData: Texture;
    private readonly _selectPairData: Texture;

    private readonly _paletteDisplay: Container;
    private readonly _selection: Sprite;

    private _pairSprites: Container[];

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

export class PaletteTarget extends GraphicsObject {
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
        super();
        this.type = type;
        this.id = id;
        this.isPair = isPair;
        this.keyCode = keyCode;
        this.hitboxes = hitboxes;
        this.tooltip = tooltip;
    }
}
