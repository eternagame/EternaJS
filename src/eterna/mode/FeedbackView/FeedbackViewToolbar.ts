import {Container, Graphics} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {HLayoutContainer} from "../../../flashbang/layout/HLayoutContainer";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Puzzle} from "../../puzzle/Puzzle";
import {Bitmaps} from "../../resources/Bitmaps";
import {RScriptUIElementID} from "../../rscript/RScriptUIElement";
import {GameButton} from "../../ui/GameButton";
import {ToggleBar} from "../../ui/ToggleBar";

export class FeedbackViewToolbar extends ContainerObject {
    public screenshotButton: GameButton;

    public zoomOutButton: GameButton;
    public zoomInButton: GameButton;

    public specButton: GameButton;
    public pipButton: GameButton;
    public showTargetButton: GameButton;
    public showEstimateButton: GameButton;

    public toggleBar: ToggleBar;
    public viewSolutionsButton: GameButton;
    public viewOptionsButton: GameButton;
    public letterColorButton: GameButton;
    public expColorButton: GameButton;

    public constructor(puzzle: Puzzle) {
        super();
        this._puzzle = puzzle;
    }

    protected added(): void {
        super.added();

        let secstructs: string[] = this._puzzle.getSecstructs();

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

        this.screenshotButton = new GameButton()
            .up(Bitmaps.ImgScreenshot)
            .over(Bitmaps.ImgScreenshotOver)
            .down(Bitmaps.ImgScreenshotHit)
            .tooltip("Screenshot");
        this.addObject(this.screenshotButton, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        this.viewOptionsButton = new GameButton()
            .up(Bitmaps.ImgSettings)
            .over(Bitmaps.ImgSettingsOver)
            .down(Bitmaps.ImgSettingsHit)
            .tooltip("Game options");
        this.addObject(this.viewOptionsButton, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        this.specButton = new GameButton()
            .up(Bitmaps.ImgSpec)
            .over(Bitmaps.ImgSpecOver)
            .down(Bitmaps.ImgSpecHit)
            .tooltip("View RNA's melting point, dotplot and other specs")
            .hotkey(KeyCode.KeyS);
        this.addObject(this.specButton, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        this.pipButton = new GameButton()
            .up(Bitmaps.ImgPip)
            .over(Bitmaps.ImgPipOver)
            .down(Bitmaps.ImgPipHit)
            .selected(Bitmaps.ImgPipHit)
            .tooltip("Set PiP mode")
            .hotkey(KeyCode.KeyP);

        if (secstructs.length > 1) {
            this.addObject(this.pipButton, this._toolbarLayout);
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
        }

        this.zoomInButton = new GameButton()
            .up(Bitmaps.ImgZoomIn)
            .over(Bitmaps.ImgZoomInOver)
            .down(Bitmaps.ImgZoomInHit)
            .disabled(Bitmaps.ImgZoomInDisable)
            .tooltip("Zoom in")
            .hotkey(KeyCode.Equal)
            .rscriptID(RScriptUIElementID.ZOOMIN);
        this.addObject(this.zoomInButton, this._toolbarLayout);

        this.zoomOutButton = new GameButton()
            .up(Bitmaps.ImgZoomOut)
            .over(Bitmaps.ImgZoomOutOver)
            .down(Bitmaps.ImgZoomOutHit)
            .disabled(Bitmaps.ImgZoomOutDisable)
            .tooltip("Zoom out")
            .hotkey(KeyCode.Minus)
            .rscriptID(RScriptUIElementID.ZOOMOUT);
        this.addObject(this.zoomOutButton, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        this.showEstimateButton = new GameButton()
            .up(Bitmaps.ImgEstimate)
            .over(Bitmaps.ImgEstimateOver)
            .down(Bitmaps.ImgEstimateSelected)
            .selected(Bitmaps.ImgEstimateSelected)
            .tooltip("Estimate Mode. The game approximates how the RNA actually folded in a test tube.");
        this.addObject(this.showEstimateButton, this._toolbarLayout);

        this.showTargetButton = new GameButton()
            .up(Bitmaps.ImgTarget)
            .over(Bitmaps.ImgTargetOver)
            .down(Bitmaps.ImgTargetSelected)
            .selected(Bitmaps.ImgTargetSelected)
            .tooltip("Target Mode. RNA freezes in the target shape.");
        this.addObject(this.showTargetButton, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        this.letterColorButton = new GameButton()
            .up(Bitmaps.ImgColoring)
            .over(Bitmaps.ImgColoringOver)
            .down(Bitmaps.ImgColoringSelected)
            .selected(Bitmaps.ImgColoringSelected)
            .tooltip("Color sequences based on base colors as in the game.");
        this.letterColorButton.toggled.value = false;
        this.addObject(this.letterColorButton, this._toolbarLayout);

        this.expColorButton = new GameButton()
            .up(Bitmaps.ImgFlask)
            .over(Bitmaps.ImgFlaskOver)
            .down(Bitmaps.ImgFlaskSelected)
            .selected(Bitmaps.ImgFlaskSelected)
            .tooltip("Color sequences based on experimental data.");
        this.expColorButton.toggled.value = true;
        this.addObject(this.expColorButton, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        this.viewSolutionsButton = new GameButton()
            .up(Bitmaps.ImgFile)
            .over(Bitmaps.ImgFileOver)
            .down(Bitmaps.ImgFileHit)
            .tooltip("View all submitted designs for this puzzle.");
        this.addObject(this.viewSolutionsButton, this._toolbarLayout);

        // TOGGLE_BAR
        this.toggleBar = new ToggleBar(secstructs.length);
        if (secstructs.length > 1) {
            // We create the _toggle_bar even if we don't add it to the mode,
            // as scripts may rely on its existence
            this.addObject(this.toggleBar, this._content);
        }

        this.updateLayout();
    }

    private updateLayout(): void {
        this._toolbarLayout.layout(true);

        if (this.toggleBar.isLiveObject) {
            DisplayUtil.positionRelative(
                this.toggleBar.display, HAlign.CENTER, VAlign.BOTTOM,
                this._toolbarLayout, HAlign.CENTER, VAlign.TOP, 0, -5);
        }

        DisplayUtil.positionRelative(
            this._content, HAlign.CENTER, VAlign.BOTTOM,
            this._invisibleBackground, HAlign.CENTER, VAlign.BOTTOM,
            0, 0);
    }

    private readonly _puzzle: Puzzle;
    private _invisibleBackground: Graphics;
    private _content: Container;
    private _toolbarLayout: HLayoutContainer;
}
