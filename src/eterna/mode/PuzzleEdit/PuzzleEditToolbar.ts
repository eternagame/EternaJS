import {Container, Graphics, Point} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {HLayoutContainer} from "../../../flashbang/layout/HLayoutContainer";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {LocationTask} from "../../../flashbang/tasks/LocationTask";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Easing} from "../../../flashbang/util/Easing";
import {RegistrationGroup} from "../../../signals/RegistrationGroup";
import {Bitmaps} from "../../resources/Bitmaps";
import {RScriptUIElementID} from "../../rscript/RScriptUIElement";
import {GameButton} from "../../ui/GameButton";
import {NucleotidePalette} from "../../ui/NucleotidePalette";

export class PuzzleEditToolbar extends ContainerObject {
    public palette: NucleotidePalette;

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

        this._content = new Container();
        this.container.addChild(this._content);

        this._toolbarLayout = new HLayoutContainer();
        this._content.addChild(this._toolbarLayout);

        // SCREENSHOT
        this.screenshotButton = new GameButton()
            .up(Bitmaps.ImgScreenshot)
            .over(Bitmaps.ImgScreenshotOver)
            .down(Bitmaps.ImgScreenshotHit)
            .tooltip("Screenshot");
        this.addObject(this.screenshotButton, this._toolbarLayout);

        // SETTINGS
        this.view_options_button = new GameButton()
            .up(Bitmaps.ImgSettings)
            .over(Bitmaps.ImgSettingsOver)
            .down(Bitmaps.ImgSettingsHit)
            .tooltip("Game options");
        this.addObject(this.view_options_button, this._toolbarLayout);

        // ZOOM IN
        this.zoom_in_button = new GameButton()
            .up(Bitmaps.ImgZoomIn)
            .over(Bitmaps.ImgZoomInOver)
            .down(Bitmaps.ImgZoomInHit)
            .disabled(Bitmaps.ImgZoomInDisable)
            .tooltip("Zoom in")
            .hotkey(KeyCode.Equal)
            .rscriptID(RScriptUIElementID.ZOOMIN);
        this.addObject(this.zoom_in_button, this._toolbarLayout);

        // ZOOM OUT
        this.zoom_out_button = new GameButton()
            .up(Bitmaps.ImgZoomOut)
            .over(Bitmaps.ImgZoomOutOver)
            .down(Bitmaps.ImgZoomOutHit)
            .disabled(Bitmaps.ImgZoomOutDisable)
            .tooltip("Zoom out")
            .hotkey(KeyCode.Minus)
            .rscriptID(RScriptUIElementID.ZOOMOUT);
        this.addObject(this.zoom_out_button, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        // NATIVE
        this.native_button = new GameButton()
            .up(Bitmaps.ImgNative)
            .over(Bitmaps.ImgNativeOver)
            .down(Bitmaps.ImgNativeSelected)
            .selected(Bitmaps.ImgNativeSelected)
            .tooltip("Natural Mode. RNA folds into the most stable shape.")
            .rscriptID(RScriptUIElementID.TOGGLENATURAL);
        if (!this._embedded) {
            this.addObject(this.native_button, this._toolbarLayout);
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
            this.addObject(this.target_button, this._toolbarLayout);
        }

        this._toolbarLayout.addHSpacer(SPACE_WIDE);

        // PALETTE
        this.palette = new NucleotidePalette();
        this.addObject(this.palette, this._toolbarLayout);
        this.palette.change_default_mode();

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        // SWAP
        this.pair_swap_button = new GameButton()
            .up(Bitmaps.ImgSwap)
            .over(Bitmaps.ImgSwapOver)
            .down(Bitmaps.ImgSwapOver)
            .selected(Bitmaps.ImgSwapSelect)
            .hotkey(KeyCode.Digit5)
            .tooltip("Swap paired bases.")
            .rscriptID(RScriptUIElementID.SWAP);
        this.addObject(this.pair_swap_button, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_WIDE);

        this.undo_button = new GameButton()
            .up(Bitmaps.ImgUndo)
            .over(Bitmaps.ImgUndoOver)
            .down(Bitmaps.ImgUndoHit)
            .disabled(Bitmaps.ImgUndo)
            .tooltip("Undo")
            .hotkey(KeyCode.KeyZ)
            .rscriptID(RScriptUIElementID.UNDO);
        this.addObject(this.undo_button, this._toolbarLayout);

        this.redo_button = new GameButton()
            .up(Bitmaps.ImgRedo)
            .over(Bitmaps.ImgRedoOver)
            .down(Bitmaps.ImgRedoHit)
            .disabled(Bitmaps.ImgRedo)
            .tooltip("Redo")
            .hotkey(KeyCode.KeyY)
            .rscriptID(RScriptUIElementID.REDO);
        this.addObject(this.redo_button, this._toolbarLayout);

        // COPY
        this.copy_button = new GameButton()
            .up(Bitmaps.ImgCopy)
            .over(Bitmaps.ImgCopyOver)
            .down(Bitmaps.ImgCopyHit)
            .tooltip("Copy the current sequence");
        this.addObject(this.copy_button, this._toolbarLayout);

        // PASTE
        this.paste_button = new GameButton()
            .up(Bitmaps.ImgPaste)
            .over(Bitmaps.ImgPasteOver)
            .down(Bitmaps.ImgPasteHit)
            .tooltip("Type in a sequence");
        this.addObject(this.paste_button, this._toolbarLayout);

        // RESET
        this.reset_button = new GameButton()
            .up(Bitmaps.ImgReset)
            .over(Bitmaps.ImgResetOver)
            .down(Bitmaps.ImgResetHit)
            .tooltip("Reset all bases to A.");
        this.addObject(this.reset_button, this._toolbarLayout);

        // SUBMIT BUTTON
        this.submit_button = new GameButton()
            .up(Bitmaps.ImgSubmit)
            .over(Bitmaps.ImgSubmitOver)
            .down(Bitmaps.ImgSubmitHit)
            .tooltip("Publish your puzzle!");
        this._toolbarLayout.addHSpacer(SPACE_NARROW);
        if (!this._embedded) {
            this.addObject(this.submit_button, this._toolbarLayout);
        }

        this.updateLayout();
        this._uncollapsedContentLoc = new Point(this._content.position.x, this._content.position.y);
    }

    private updateLayout(): void {
        this._toolbarLayout.layout(true);

        DisplayUtil.positionRelative(
            this._content, HAlign.CENTER, VAlign.BOTTOM,
            this._invisibleBackground, HAlign.CENTER, VAlign.BOTTOM);
    }

    public set_toolbar_autohide(enabled: boolean): void {
        const COLLAPSE_ANIM = "CollapseAnim";

        if (this._auto_collapse === enabled) {
            return;
        }

        this._auto_collapse = enabled;

        if (this._auto_collapse) {
            this.display.interactive = true;

            let collapsed: boolean = false;

            const uncollapse = () => {
                if (collapsed) {
                    collapsed = false;
                    this.removeNamedObjects(COLLAPSE_ANIM);
                    this.addNamedObject(
                        COLLAPSE_ANIM,
                        new LocationTask(
                            this._uncollapsedContentLoc.x,
                            this._uncollapsedContentLoc.y,
                            0.25, Easing.easeOut, this._content
                        )
                    );
                }
            };

            const collapse = () => {
                if (!collapsed) {
                    collapsed = true;
                    this.removeNamedObjects(COLLAPSE_ANIM);
                    this.addNamedObject(
                        COLLAPSE_ANIM,
                        new LocationTask(
                            this._uncollapsedContentLoc.x,
                            this._uncollapsedContentLoc.y + 72,
                            0.25, Easing.easeOut, this._content
                        )
                    );
                }
            };

            this._autoCollapseRegs = new RegistrationGroup();
            this._autoCollapseRegs.add(this.pointerOver.connect(uncollapse));
            this._autoCollapseRegs.add(this.pointerOut.connect(collapse));

            collapse();
        } else {
            if (this._autoCollapseRegs != null) {
                this._autoCollapseRegs.close();
                this._autoCollapseRegs = null;
            }

            this.removeNamedObjects(COLLAPSE_ANIM);
            this._content.position = this._uncollapsedContentLoc;
            this.display.interactive = false;
        }
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

    private readonly _embedded: boolean;

    private _invisibleBackground: Graphics;
    private _content: Container;
    private _toolbarLayout: HLayoutContainer;

    private _uncollapsedContentLoc: Point;
    private _auto_collapse: boolean;
    private _autoCollapseRegs: RegistrationGroup;
}
