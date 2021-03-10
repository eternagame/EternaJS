import * as log from 'loglevel';
import {
    Container, DisplayObject, Rectangle, Point
} from 'pixi.js';
import {
    ContainerObject, Enableable, GameObject, Assert
} from 'flashbang';
import EPars from 'eterna/EPars';
import PoseEditMode from 'eterna/mode/PoseEdit/PoseEditMode';
import Puzzle from 'eterna/puzzle/Puzzle';
import TextBalloon from 'eterna/ui/TextBalloon';
import Pose2D, {RNAHighlightState} from 'eterna/pose2D/Pose2D';
import {PaletteTargetType} from 'eterna/ui/NucleotidePalette';
import ToggleBar from 'eterna/ui/ToggleBar';
import PoseField from 'eterna/pose2D/PoseField';
import {RScriptUIElement, RScriptUIElementID} from './RScriptUIElement';

/**
 * RScript Environment.
 * Can take care of variables and scope and such.
 */
export default class RScriptEnv extends ContainerObject {
    public static convertNucleotideStringToInt(s: string): number {
        return EPars.stringToNucleotide(s, true, false);
    }

    public static convertNucleotideIntToString(i: number): string {
        return EPars.nucleotideToString(i, true, false);
    }

    constructor(ui: PoseEditMode, puz: Puzzle) {
        super();
        this._ui = ui;
        this._puz = puz;
        this._vars = new Map();
    }

    public setTextboxVisible(id: string, isVisible: boolean): void {
        if (id === '' || !Object.prototype.hasOwnProperty.call(this._vars.hasOwnProperty, 'id')) {
            return;
        }

        const value = this.getVar(id);
        if (value instanceof TextBalloon) {
            value.display.visible = isVisible;
        } else {
            log.warn(`'${id}' is not a Textbox`);
        }
    }

    /** Generate string reference name. */
    public generateStringRefName(): string {
        // Strings will be referenced via $$STRING_REF:ID_HERE
        ++this._stringCount;
        return `$$STRING_REF:${this._stringCount}`;
    }

    public getStringRef(ref: string): string {
        // Check if it's an actual ref.
        // If it's not, return it back unchanged
        if (ref.indexOf('$$STRING_REF:') !== 0) {
            return ref;
        } else {
            const value = this.getVar(ref);
            if (typeof (value) === 'string') {
                return value;
            } else {
                log.warn(`'${ref}' is not a string`);
                return ref;
            }
        }
    }

    /** Remove all stored highlights and hints and stuff. */
    public cleanup(): void {
        this._vars.forEach((_value, key) => {
            this.deleteVar(key);
        });
    }

    public get ui(): PoseEditMode {
        return this._ui;
    }

    public get puzzle(): Puzzle {
        return this._puz;
    }

    public get poseField(): PoseField {
        return this._ui.getPoseField(0);
    }

    public get pose(): Pose2D {
        return this._ui.getPose(0);
    }

    // Handles parsing the element ID and getting the right object.
    // Returns: UI Element, its UI ID, and the alternate parameter (integer) that may
    //  have been passed in.
    public getUIElementFromID(key: string): [RScriptUIElement | null, RScriptUIElementID, number] {
        // Highlight UI.
        let uiElement: RScriptUIElement | null;

        // Used UI Element ID.
        const splitId: string[] = key.split('-');

        // Detect a number if it is included in the ui element key.
        // So for the objectives: objective-### (format).
        // The input number will always come after the dash. The dash should be
        // included in the key that is passed.
        const idString: string = splitId[0] + (splitId.length > 1 ? '-' : '');
        const elementID: RScriptUIElementID = (idString.toUpperCase()) as RScriptUIElementID;

        if (splitId.length > 2) {
            throw new Error('Invalid UI Element ID format');
        }

        let altParam = -1;
        if (splitId.length > 1) {
            altParam = Math.floor(Number(splitId[1]));
            if (Number.isNaN(altParam)) {
                // If splitId[1] is malformed, altParam will be NaN.
                // The Flash version of the game interprets this as a 0,
                // and some tutorials rely on this behavior. (E.g. tutorial level 2 references "Objective-#0", rather
                // than "Objective-0"). Ideally we'd throw an error here, but that would break puzzles in the wild.
                log.warn(`Malformed UIElementID '${key}'`);
                altParam = 0;
            }
            uiElement = this.getUIElement(elementID, altParam);
        } else {
            uiElement = this.getUIElement(elementID);
        }
        return [uiElement, elementID, altParam];
    }

    public getUIElementBounds(key: string): Rectangle | null {
        try {
            const [uiElement] = this.getUIElementFromID(key);
            if (uiElement instanceof Rectangle) {
                // This is a rectangle whithin the palette
                const [palette] = this.getUIElementFromID(RScriptUIElementID.PALETTE);
                const obj = palette as GameObject;
                const rect = uiElement as Rectangle;
                Assert.assertIsDefined(obj.display);
                const globalPos = obj.display.toGlobal(new Point());
                return new Rectangle(
                    globalPos.x + rect.x,
                    globalPos.y + rect.y,
                    rect.width,
                    rect.height
                );
            } else {
                const obj = uiElement as GameObject;
                Assert.assertIsDefined(obj.display);
                const globalPos = obj.display.toGlobal(new Point());
                return new Rectangle(
                    globalPos.x,
                    globalPos.y,
                    obj.display.getLocalBounds().width,
                    obj.display.getLocalBounds().height
                );
            }
        } catch (e) {
            return null;
        }
    }

    public get totalConstraints(): number | null {
        return this.ui.constraintCount;
    }

    public showHideUI(elementID: string, visible: boolean, disabled: boolean): void {
        elementID = elementID.toUpperCase();

        if (elementID === RScriptUIElementID.ENERGY) {
            this.ui.setDisplayScoreTexts(visible);
        } else if (elementID === RScriptUIElementID.BASENUMBERING) {
            this.ui.setShowNumbering(visible);
        } else if (elementID === RScriptUIElementID.BASELETTERING) {
            this.ui.lettersVisible = visible;
        } else if (elementID === RScriptUIElementID.TOTALENERGY) {
            this.ui.setShowTotalEnergy(visible);
        } else if (elementID === RScriptUIElementID.HINT) {
            // no-op
        } else if (elementID === RScriptUIElementID.TOGGLEBAR) {
            this.showHideUI(RScriptUIElementID.TOGGLETARGET, visible, disabled);
            this.showHideUI(RScriptUIElementID.TOGGLENATURAL, visible, disabled);
        } else if (elementID === RScriptUIElementID.SWITCH) {
            (this.getUIElementFromID(elementID)[0] as ToggleBar).display.visible = visible;
        } else {
            if (visible && elementID === RScriptUIElementID.PALETTE) {
                this.ui.toolbar.palette.setOverrideDefault();
                this.ui.toolbar.palette.changeDefaultMode();
            } else if (visible && elementID === RScriptUIElementID.PALETTEALT) {
                this.ui.toolbar.palette.setOverrideNoPair();
                this.ui.toolbar.palette.changeNoPairMode();
            }

            const obj: RScriptUIElement | null = this.getUIElementFromID(elementID)[0];
            if (obj) {
                if (obj instanceof DisplayObject) {
                    obj.visible = visible;
                } else if (obj instanceof GameObject && obj.display != null) {
                    obj.display.visible = visible;
                }

                // AMW TODO: this concerns me. Neither DisplayObject nor GameObject
                // seem to actually implement Enableable...
                if (((obj as unknown) as Enableable).enabled !== undefined) {
                    ((obj as unknown) as Enableable).enabled = visible && !disabled;
                }
            }
        }
    }

    public getUIElement(type: RScriptUIElementID, i: number = -1): RScriptUIElement | null {
        switch (type) {
            case RScriptUIElementID.ACTION_MENU:
                return this.ui.toolbar.actionMenu;
            case RScriptUIElementID.OBJECTIVES:
                return this.ui.constraintsLayer;
            case RScriptUIElementID.SHAPEOBJECTIVE:
                return this.ui.getShapeBox(0);
            case RScriptUIElementID.OBJECTIVE:
                return this.ui.getConstraintBox(i);
            case RScriptUIElementID.SWITCH:
                return this.ui.toolbar.stateToggle;
            case RScriptUIElementID.TOTALENERGY:
            case RScriptUIElementID.PRIMARY_ENERGY:
                return this.poseField.primaryScoreDisplay;
            case RScriptUIElementID.SECONDARY_ENERGY:
                return this.poseField.secondaryScoreDisplay;
            case RScriptUIElementID.PALETTE:
            case RScriptUIElementID.PALETTEALT:
                return this.ui.toolbar.palette;
            case RScriptUIElementID.TOGGLENATURAL:
                return this.ui.toolbar.naturalButton;
            case RScriptUIElementID.TOGGLETARGET:
                return this.ui.toolbar.targetButton;
            case RScriptUIElementID.TOGGLEBAR:
                // NOTE: There is no longer a toggle bar...
                return this.ui.toolbar.naturalButton;
            case RScriptUIElementID.ZOOMIN:
                return this.ui.toolbar.zoomInButton ? this.ui.toolbar.zoomInButton : null;
            case RScriptUIElementID.ZOOMOUT:
                return this.ui.toolbar.zoomOutButton ? this.ui.toolbar.zoomOutButton : null;
            case RScriptUIElementID.RESET:
                return this.ui.toolbar.resetButton;
            case RScriptUIElementID.UNDO:
                return this.ui.toolbar.undoButton;
            case RScriptUIElementID.REDO:
                return this.ui.toolbar.redoButton;
            case RScriptUIElementID.SWAP:
                return this.ui.toolbar.pairSwapButton;
            case RScriptUIElementID.PIP:
                return this.ui.toolbar.pipButton;
            case RScriptUIElementID.BASEMARKER:
                return this.ui.toolbar.baseMarkerButton;
            case RScriptUIElementID.MAGICGLUE:
                return this.ui.toolbar.magicGlueButton;
            case RScriptUIElementID.A:
                return this.ui.toolbar.palette.getTarget(PaletteTargetType.A);
            case RScriptUIElementID.U:
                return this.ui.toolbar.palette.getTarget(PaletteTargetType.U);
            case RScriptUIElementID.G:
                return this.ui.toolbar.palette.getTarget(PaletteTargetType.G);
            case RScriptUIElementID.C:
                return this.ui.toolbar.palette.getTarget(PaletteTargetType.C);
            case RScriptUIElementID.AU:
            case RScriptUIElementID.UA:
            case RScriptUIElementID.AUCOMPLETE:
            case RScriptUIElementID.UACOMPLETE:
                return this.ui.toolbar.palette.getTarget(PaletteTargetType.AU);
            case RScriptUIElementID.GU:
            case RScriptUIElementID.UG:
            case RScriptUIElementID.GUCOMPLETE:
            case RScriptUIElementID.UGCOMPLETE:
                return this.ui.toolbar.palette.getTarget(PaletteTargetType.UG);
            case RScriptUIElementID.GC:
            case RScriptUIElementID.CG:
            case RScriptUIElementID.GCCOMPLETE:
            case RScriptUIElementID.CGCOMPLETE:
                return this.ui.toolbar.palette.getTarget(PaletteTargetType.GC);
            default:
                throw new Error(`Invalid UI Element: ${type}`);
        }
    }

    public setVar(key: string, inValue: RScriptVarType): void {
        this._vars.set(key, inValue);
    }

    public getVar(key: string): RScriptVarType | undefined {
        const scriptVar = this._vars.get(key);
        if (scriptVar != null && scriptVar instanceof GameObject) {
            return scriptVar.isLiveObject ? scriptVar : undefined;
        } else {
            return scriptVar;
        }
    }

    public deleteVar(key: string): void {
        const scriptVar = this._vars.get(key);
        if (scriptVar == null) {
            return;
        }

        // Make sure it's removed
        if (scriptVar instanceof GameObject && scriptVar.isLiveObject) {
            scriptVar.destroySelf();
        } else if (scriptVar instanceof Container) {
            scriptVar.destroy({children: true});
        } else if (scriptVar instanceof DisplayObject) {
            scriptVar.destroy();
        }

        this._vars.delete(key);
    }

    public hasVar(key: string): boolean {
        return this._vars.has(key);
    }

    private readonly _ui: PoseEditMode;
    private readonly _puz: Puzzle;
    private readonly _vars: Map<string, RScriptVarType>;

    private _stringCount: number = 0;
}

export type RScriptVarType = GameObject | DisplayObject | RNAHighlightState | string;
