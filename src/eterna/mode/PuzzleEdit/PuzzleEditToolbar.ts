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

    public addbaseButton: GameButton;
    public addpairButton: GameButton;
    public deleteButton: GameButton;
    public lockButton: GameButton;
    public siteButton: GameButton;

    public nativeButton: GameButton;
    public targetButton: GameButton;

    public undoButton: GameButton;
    public redoButton: GameButton;
    public zoomInButton: GameButton;
    public zoomOutButton: GameButton;
    public copyButton: GameButton;
    public pasteButton: GameButton;
    public viewOptionsButton: GameButton;
    public screenshotButton: GameButton;

    public pairSwapButton: GameButton;
    public resetButton: GameButton;

    public submitButton: GameButton;

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

        this.addbaseButton = new GameButton()
            .up(Bitmaps.ImgAddBase)
            .over(Bitmaps.ImgAddBaseOver)
            .down(Bitmaps.ImgAddBaseSelect)
            .selected(Bitmaps.ImgAddBaseSelect)
            .hotkey(KeyCode.Digit6)
            .tooltip("Add a single base.");
        this.addObject(this.addbaseButton, upperToolbarLayout);

        this.addpairButton = new GameButton()
            .up(Bitmaps.ImgAddPair)
            .over(Bitmaps.ImgAddPairOver)
            .down(Bitmaps.ImgAddPairSelect)
            .selected(Bitmaps.ImgAddPairSelect)
            .hotkey(KeyCode.Digit7)
            .tooltip("Add a pair.");
        this.addObject(this.addpairButton, upperToolbarLayout);

        this.deleteButton = new GameButton()
            .up(Bitmaps.ImgErase)
            .over(Bitmaps.ImgEraseOver)
            .down(Bitmaps.ImgEraseSelect)
            .selected(Bitmaps.ImgEraseSelect)
            .hotkey(KeyCode.Digit8)
            .tooltip("Delete a base or a pair.");
        this.addObject(this.deleteButton, upperToolbarLayout);

        this.lockButton = new GameButton()
            .up(Bitmaps.ImgLock)
            .over(Bitmaps.ImgLockOver)
            .down(Bitmaps.ImgLockSelect)
            .selected(Bitmaps.ImgLockSelect)
            .hotkey(KeyCode.Digit9)
            .tooltip("Lock or unlock a base.");
        this.addObject(this.lockButton, upperToolbarLayout);

        this.siteButton = new GameButton()
            .up(Bitmaps.ImgMolecule)
            .over(Bitmaps.ImgMoleculeOver)
            .down(Bitmaps.ImgMoleculeSelect)
            .selected(Bitmaps.ImgMoleculeSelect)
            .hotkey(KeyCode.Digit0)
            .tooltip("Create or remove a molecular binding site.");
        this.addObject(this.siteButton, upperToolbarLayout);

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
        this.viewOptionsButton = new GameButton()
            .up(Bitmaps.ImgSettings)
            .over(Bitmaps.ImgSettingsOver)
            .down(Bitmaps.ImgSettingsHit)
            .tooltip("Game options");
        this.addObject(this.viewOptionsButton, lowerToolbarLayout);

        // ZOOM IN
        this.zoomInButton = new GameButton()
            .up(Bitmaps.ImgZoomIn)
            .over(Bitmaps.ImgZoomInOver)
            .down(Bitmaps.ImgZoomInHit)
            .disabled(Bitmaps.ImgZoomInDisable)
            .tooltip("Zoom in")
            .hotkey(KeyCode.Equal)
            .rscriptID(RScriptUIElementID.ZOOMIN);
        this.addObject(this.zoomInButton, lowerToolbarLayout);

        // ZOOM OUT
        this.zoomOutButton = new GameButton()
            .up(Bitmaps.ImgZoomOut)
            .over(Bitmaps.ImgZoomOutOver)
            .down(Bitmaps.ImgZoomOutHit)
            .disabled(Bitmaps.ImgZoomOutDisable)
            .tooltip("Zoom out")
            .hotkey(KeyCode.Minus)
            .rscriptID(RScriptUIElementID.ZOOMOUT);
        this.addObject(this.zoomOutButton, lowerToolbarLayout);

        lowerToolbarLayout.addHSpacer(SPACE_NARROW);

        // NATIVE
        this.nativeButton = new GameButton()
            .up(Bitmaps.ImgNative)
            .over(Bitmaps.ImgNativeOver)
            .down(Bitmaps.ImgNativeSelected)
            .selected(Bitmaps.ImgNativeSelected)
            .tooltip("Natural Mode. RNA folds into the most stable shape.")
            .rscriptID(RScriptUIElementID.TOGGLENATURAL);
        if (!this._embedded) {
            this.addObject(this.nativeButton, lowerToolbarLayout);
        }

        // TARGET
        this.targetButton = new GameButton()
            .up(Bitmaps.ImgTarget)
            .over(Bitmaps.ImgTargetOver)
            .down(Bitmaps.ImgTargetSelected)
            .selected(Bitmaps.ImgTargetSelected)
            .tooltip("Target Mode. RNA freezes into the desired shape.")
            .rscriptID(RScriptUIElementID.TOGGLETARGET);
        if (!this._embedded) {
            this.addObject(this.targetButton, lowerToolbarLayout);
        }

        lowerToolbarLayout.addHSpacer(SPACE_WIDE);

        // PALETTE
        this.palette = new NucleotidePalette();
        this.addObject(this.palette, lowerToolbarLayout);
        this.palette.changeDefaultMode();

        lowerToolbarLayout.addHSpacer(SPACE_NARROW);

        // SWAP
        this.pairSwapButton = new GameButton()
            .up(Bitmaps.ImgSwap)
            .over(Bitmaps.ImgSwapOver)
            .down(Bitmaps.ImgSwapOver)
            .selected(Bitmaps.ImgSwapSelect)
            .hotkey(KeyCode.Digit5)
            .tooltip("Swap paired bases.")
            .rscriptID(RScriptUIElementID.SWAP);
        this.addObject(this.pairSwapButton, lowerToolbarLayout);

        lowerToolbarLayout.addHSpacer(SPACE_WIDE);

        this.undoButton = new GameButton()
            .up(Bitmaps.ImgUndo)
            .over(Bitmaps.ImgUndoOver)
            .down(Bitmaps.ImgUndoHit)
            .disabled(Bitmaps.ImgUndo)
            .tooltip("Undo")
            .hotkey(KeyCode.KeyZ)
            .rscriptID(RScriptUIElementID.UNDO);
        this.addObject(this.undoButton, lowerToolbarLayout);

        this.redoButton = new GameButton()
            .up(Bitmaps.ImgRedo)
            .over(Bitmaps.ImgRedoOver)
            .down(Bitmaps.ImgRedoHit)
            .disabled(Bitmaps.ImgRedo)
            .tooltip("Redo")
            .hotkey(KeyCode.KeyY)
            .rscriptID(RScriptUIElementID.REDO);
        this.addObject(this.redoButton, lowerToolbarLayout);

        // COPY
        this.copyButton = new GameButton()
            .up(Bitmaps.ImgCopy)
            .over(Bitmaps.ImgCopyOver)
            .down(Bitmaps.ImgCopyHit)
            .tooltip("Copy the current sequence");
        this.addObject(this.copyButton, lowerToolbarLayout);

        // PASTE
        this.pasteButton = new GameButton()
            .up(Bitmaps.ImgPaste)
            .over(Bitmaps.ImgPasteOver)
            .down(Bitmaps.ImgPasteHit)
            .tooltip("Type in a sequence");
        this.addObject(this.pasteButton, lowerToolbarLayout);

        // RESET
        this.resetButton = new GameButton()
            .up(Bitmaps.ImgReset)
            .over(Bitmaps.ImgResetOver)
            .down(Bitmaps.ImgResetHit)
            .tooltip("Reset all bases to A.");
        this.addObject(this.resetButton, lowerToolbarLayout);

        // SUBMIT BUTTON
        this.submitButton = new GameButton()
            .up(Bitmaps.ImgSubmit)
            .over(Bitmaps.ImgSubmitOver)
            .down(Bitmaps.ImgSubmitHit)
            .tooltip("Publish your puzzle!");
        lowerToolbarLayout.addHSpacer(SPACE_NARROW);
        if (!this._embedded) {
            this.addObject(this.submitButton, lowerToolbarLayout);
        }

        this.updateLayout();
    }

    public deselectAllColorings(): void {
        this.palette.clearSelection();
        this.pairSwapButton.toggled.value = false;
        this.addbaseButton.toggled.value = false;
        this.addpairButton.toggled.value = false;
        this.deleteButton.toggled.value = false;
        this.lockButton.toggled.value = false;
        this.siteButton.toggled.value = false;
    }

    private updateLayout(): void {
        this._content.layout(true);

        DisplayUtil.positionRelative(
            this._content, HAlign.CENTER, VAlign.BOTTOM,
            this._invisibleBackground, HAlign.CENTER, VAlign.BOTTOM
        );
    }

    private readonly _embedded: boolean;

    private _invisibleBackground: Graphics;
    private _content: VLayoutContainer;
}
