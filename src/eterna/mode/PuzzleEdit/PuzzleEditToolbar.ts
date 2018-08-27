import * as log from "loglevel";
import {Graphics} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {HLayoutContainer} from "../../../flashbang/layout/HLayoutContainer";
import {VLayoutContainer} from "../../../flashbang/layout/VLayoutContainer";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Bitmaps} from "../../resources/Bitmaps";
import {RScriptUIElementID} from "../../rscript/RScriptUIElement";
import {GameButton} from "../../ui/GameButton";
import {NucleotidePalette} from "../../ui/NucleotidePalette";

export class PuzzleEditToolbar extends ContainerObject {
    public palette: NucleotidePalette;

    public addbase_button: GameButton;
    public addpair_button: GameButton;
    public delete_button: GameButton;
    public lock_button: GameButton;
    public site_button: GameButton;

    public native_button: GameButton;
    public target_button: GameButton;

    public undo_button: GameButton;
    public redo_button: GameButton;
    public zoom_in_button: GameButton;
    public zoom_out_button: GameButton;
    public copy_button: GameButton;
    public paste_button: GameButton;
    public view_options_button: GameButton;
    public screenshotButton: GameButton;

    public pair_swap_button: GameButton;
    public reset_button: GameButton;

    public submit_button: GameButton;

    public constructor(embedded: boolean) {
        super();
        this._embedded = embedded;
    }

    protected added(): void {
        super.added();

        const SPACE_NARROW = 7;
        const SPACE_WIDE = 25;

        this._invisibleBackground = new Graphics();
        this._invisibleBackground
            .beginFill(0, 0)
            .drawRect(0, 0, Flashbang.stageWidth, 100)
            .endFill();
        this._invisibleBackground.y = -this._invisibleBackground.height;
        this.container.addChild(this._invisibleBackground);

        this._content = new VLayoutContainer(SPACE_NARROW);
        this.container.addChild(this._content);

        // UPPER TOOLBAR (structure editing tools)
        let upperToolbarLayout = new HLayoutContainer(SPACE_NARROW);
        this._content.addChild(upperToolbarLayout);

        this.addbase_button = new GameButton()
            .up(Bitmaps.ImgAddBase)
            .over(Bitmaps.ImgAddBaseOver)
            .down(Bitmaps.ImgAddBaseSelect)
            .selected(Bitmaps.ImgAddBaseSelect)
            .hotkey(KeyCode.Digit6)
            .tooltip("Add a single base.");
        this.addObject(this.addbase_button, upperToolbarLayout);

        this.addpair_button = new GameButton()
            .up(Bitmaps.ImgAddPair)
            .over(Bitmaps.ImgAddPairOver)
            .down(Bitmaps.ImgAddPairSelect)
            .selected(Bitmaps.ImgAddPairSelect)
            .hotkey(KeyCode.Digit7)
            .tooltip("Add a pair.");
        this.addObject(this.addpair_button, upperToolbarLayout);

        this.delete_button = new GameButton()
            .up(Bitmaps.ImgErase)
            .over(Bitmaps.ImgEraseOver)
            .down(Bitmaps.ImgEraseSelect)
            .selected(Bitmaps.ImgEraseSelect)
            .hotkey(KeyCode.Digit8)
            .tooltip("Delete a base or a pair.");
        this.addObject(this.delete_button, upperToolbarLayout);

        this.lock_button = new GameButton()
            .up(Bitmaps.ImgLock)
            .over(Bitmaps.ImgLockOver)
            .down(Bitmaps.ImgLockSelect)
            .selected(Bitmaps.ImgLockSelect)
            .hotkey(KeyCode.Digit9)
            .tooltip("Lock or unlock a base.");
        this.addObject(this.lock_button, upperToolbarLayout);

        this.site_button = new GameButton()
            .up(Bitmaps.ImgMolecule)
            .over(Bitmaps.ImgMoleculeOver)
            .down(Bitmaps.ImgMoleculeSelect)
            .selected(Bitmaps.ImgMoleculeSelect)
            .hotkey(KeyCode.Digit0)
            .tooltip("Create or remove a molecular binding site.");
        this.addObject(this.site_button, upperToolbarLayout);

        // LOWER TOOLBAR (palette, zoom, settings, etc)

        let lowerToolbarLayout = new HLayoutContainer();
        this._content.addChild(lowerToolbarLayout);

        // SCREENSHOT
        this.screenshotButton = new GameButton()
            .up(Bitmaps.ImgScreenshot)
            .over(Bitmaps.ImgScreenshotOver)
            .down(Bitmaps.ImgScreenshotHit)
            .tooltip("Screenshot");
        this.addObject(this.screenshotButton, lowerToolbarLayout);

        // SETTINGS
        this.view_options_button = new GameButton()
            .up(Bitmaps.ImgSettings)
            .over(Bitmaps.ImgSettingsOver)
            .down(Bitmaps.ImgSettingsHit)
            .tooltip("Game options");
        this.addObject(this.view_options_button, lowerToolbarLayout);

        // ZOOM IN
        this.zoom_in_button = new GameButton()
            .up(Bitmaps.ImgZoomIn)
            .over(Bitmaps.ImgZoomInOver)
            .down(Bitmaps.ImgZoomInHit)
            .disabled(Bitmaps.ImgZoomInDisable)
            .tooltip("Zoom in")
            .hotkey(KeyCode.Equal)
            .rscriptID(RScriptUIElementID.ZOOMIN);
        this.addObject(this.zoom_in_button, lowerToolbarLayout);

        // ZOOM OUT
        this.zoom_out_button = new GameButton()
            .up(Bitmaps.ImgZoomOut)
            .over(Bitmaps.ImgZoomOutOver)
            .down(Bitmaps.ImgZoomOutHit)
            .disabled(Bitmaps.ImgZoomOutDisable)
            .tooltip("Zoom out")
            .hotkey(KeyCode.Minus)
            .rscriptID(RScriptUIElementID.ZOOMOUT);
        this.addObject(this.zoom_out_button, lowerToolbarLayout);

        lowerToolbarLayout.addHSpacer(SPACE_NARROW);

        // NATIVE
        this.native_button = new GameButton()
            .up(Bitmaps.ImgNative)
            .over(Bitmaps.ImgNativeOver)
            .down(Bitmaps.ImgNativeSelected)
            .selected(Bitmaps.ImgNativeSelected)
            .tooltip("Natural Mode. RNA folds into the most stable shape.")
            .rscriptID(RScriptUIElementID.TOGGLENATURAL);
        if (!this._embedded) {
            this.addObject(this.native_button, lowerToolbarLayout);
        }

        // TARGET
        this.target_button = new GameButton()
            .up(Bitmaps.ImgTarget)
            .over(Bitmaps.ImgTargetOver)
            .down(Bitmaps.ImgTargetSelected)
            .selected(Bitmaps.ImgTargetSelected)
            .tooltip("Target Mode. RNA freezes into the desired shape.")
            .rscriptID(RScriptUIElementID.TOGGLETARGET);
        if (!this._embedded) {
            this.addObject(this.target_button, lowerToolbarLayout);
        }

        lowerToolbarLayout.addHSpacer(SPACE_WIDE);

        // PALETTE
        this.palette = new NucleotidePalette();
        this.addObject(this.palette, lowerToolbarLayout);
        this.palette.change_default_mode();

        lowerToolbarLayout.addHSpacer(SPACE_NARROW);

        // SWAP
        this.pair_swap_button = new GameButton()
            .up(Bitmaps.ImgSwap)
            .over(Bitmaps.ImgSwapOver)
            .down(Bitmaps.ImgSwapOver)
            .selected(Bitmaps.ImgSwapSelect)
            .hotkey(KeyCode.Digit5)
            .tooltip("Swap paired bases.")
            .rscriptID(RScriptUIElementID.SWAP);
        this.addObject(this.pair_swap_button, lowerToolbarLayout);

        lowerToolbarLayout.addHSpacer(SPACE_WIDE);

        this.undo_button = new GameButton()
            .up(Bitmaps.ImgUndo)
            .over(Bitmaps.ImgUndoOver)
            .down(Bitmaps.ImgUndoHit)
            .disabled(Bitmaps.ImgUndo)
            .tooltip("Undo")
            .hotkey(KeyCode.KeyZ)
            .rscriptID(RScriptUIElementID.UNDO);
        this.addObject(this.undo_button, lowerToolbarLayout);

        this.redo_button = new GameButton()
            .up(Bitmaps.ImgRedo)
            .over(Bitmaps.ImgRedoOver)
            .down(Bitmaps.ImgRedoHit)
            .disabled(Bitmaps.ImgRedo)
            .tooltip("Redo")
            .hotkey(KeyCode.KeyY)
            .rscriptID(RScriptUIElementID.REDO);
        this.addObject(this.redo_button, lowerToolbarLayout);

        // COPY
        this.copy_button = new GameButton()
            .up(Bitmaps.ImgCopy)
            .over(Bitmaps.ImgCopyOver)
            .down(Bitmaps.ImgCopyHit)
            .tooltip("Copy the current sequence");
        this.addObject(this.copy_button, lowerToolbarLayout);

        // PASTE
        this.paste_button = new GameButton()
            .up(Bitmaps.ImgPaste)
            .over(Bitmaps.ImgPasteOver)
            .down(Bitmaps.ImgPasteHit)
            .tooltip("Type in a sequence");
        this.addObject(this.paste_button, lowerToolbarLayout);

        // RESET
        this.reset_button = new GameButton()
            .up(Bitmaps.ImgReset)
            .over(Bitmaps.ImgResetOver)
            .down(Bitmaps.ImgResetHit)
            .tooltip("Reset all bases to A.");
        this.addObject(this.reset_button, lowerToolbarLayout);

        // SUBMIT BUTTON
        this.submit_button = new GameButton()
            .up(Bitmaps.ImgSubmit)
            .over(Bitmaps.ImgSubmitOver)
            .down(Bitmaps.ImgSubmitHit)
            .tooltip("Publish your puzzle!");
        lowerToolbarLayout.addHSpacer(SPACE_NARROW);
        if (!this._embedded) {
            this.addObject(this.submit_button, lowerToolbarLayout);
        }

        this.updateLayout();
    }

    private updateLayout(): void {
        this._content.layout(true);

        DisplayUtil.positionRelative(
            this._content, HAlign.CENTER, VAlign.BOTTOM,
            this._invisibleBackground, HAlign.CENTER, VAlign.BOTTOM);
    }

    public disable_tools(disable: boolean): void {
        this.palette.enabled = !disable;

        this.target_button.enabled = !disable;
        this.native_button.enabled = !disable;

        this.zoom_in_button.enabled = !disable;
        this.zoom_out_button.enabled = !disable;

        this.native_button.enabled = !disable;
        this.target_button.enabled = !disable;

        this.view_options_button.enabled = !disable;
        this.copy_button.enabled = !disable;
        this.paste_button.enabled = !disable;

        this.undo_button.enabled = !disable;
        this.redo_button.enabled = !disable;

        this.submit_button.enabled = !disable;
    }

    public deselect_all_colorings(): void {
        this.palette.clear_selection();
        this.pair_swap_button.toggled.value = false;
        this.addbase_button.toggled.value = false;
        this.addpair_button.toggled.value = false;
        this.delete_button.toggled.value = false;
        this.lock_button.toggled.value = false;
        this.site_button.toggled.value = false;
    }

    private readonly _embedded: boolean;

    private _invisibleBackground: Graphics;
    private _content: VLayoutContainer;
}
