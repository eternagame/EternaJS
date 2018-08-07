import * as log from "loglevel";
import {Container, Graphics, Point} from "pixi.js";
import {Align} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {HLayoutContainer} from "../../../flashbang/layout/HLayoutContainer";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {LocationTask} from "../../../flashbang/tasks/LocationTask";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Easing} from "../../../flashbang/util/Easing";
import {RegistrationGroup} from "../../../signals/RegistrationGroup";
import {Eterna} from "../../Eterna";
import {Puzzle, PuzzleType} from "../../puzzle/Puzzle";
import {Bitmaps} from "../../resources/Bitmaps";
import {RScriptUIElementID} from "../../rscript/RScriptUIElementID";
import {EternaMenu, EternaMenuStyle} from "../../ui/EternaMenu";
import {GameButton} from "../../ui/GameButton";
import {NucleotidePalette} from "../../ui/NucleotidePalette";
import {ToggleBar} from "../../ui/ToggleBar";

export class PoseEditToolbar extends ContainerObject {
    public palette: NucleotidePalette;

    public native_button: GameButton;
    public target_button: GameButton;
    public pip_button: GameButton;
    public freeze_button: GameButton;

    public puzzleStateToggle: ToggleBar;

    public actionMenu: EternaMenu;
    public boosters_button: GameButton;
    public undo_button: GameButton;
    public redo_button: GameButton;
    public zoom_in_button: GameButton;
    public zoom_out_button: GameButton;
    public copy_button: GameButton;
    public paste_button: GameButton;
    public view_options_button: GameButton;
    public retry_button: GameButton;
    public spec_button: GameButton;

    public pair_swap_button: GameButton;
    public hint_button: GameButton;
    public dyn_paint_tools: GameButton[] = [];
    public dyn_action_tools: GameButton[] = [];

    public submit_button: GameButton;
    public view_solutions_button: GameButton;

    public constructor(puz: Puzzle) {
        super();
        this._puzzle = puz;
    }

    protected added(): void {
        super.added();

        const SPACE_NARROW: number = 7;
        const SPACE_WIDE: number = 28;

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

        const isExperimental = this._puzzle.get_puzzle_type() == PuzzleType.EXPERIMENTAL;

        // MENU
        this.actionMenu = new EternaMenu(EternaMenuStyle.PULLUP);
        this.actionMenu.add_menu_button(new GameButton().allStates(Bitmaps.NovaMenu));
        this.addObject(this.actionMenu, this._toolbarLayout);

        // SUBMIT BUTTON
        this.submit_button = new GameButton()
            .up(Bitmaps.ImgSubmit)
            .over(Bitmaps.ImgSubmitOver)
            .down(Bitmaps.ImgSubmitHit)
            .tooltip("Publish your solution!");
        if (isExperimental) {
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
            this.addObject(this.submit_button, this._toolbarLayout);
        }

        this._toolbarLayout.addHSpacer(SPACE_WIDE);

        // PIP BUTTON
        this.pip_button = new GameButton()
            .up(Bitmaps.ImgPip)
            .over(Bitmaps.ImgPipOver)
            .down(Bitmaps.ImgPipHit)
            .tooltip("Set PiP mode")
            .hotkey(KeyCode.KeyP)
            .rscriptID(RScriptUIElementID.PIP);
        if (this._puzzle.get_secstructs().length > 1) {
            this.addObject(this.pip_button, this._toolbarLayout);
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
        }

        // FREEZE
        this.freeze_button = new GameButton()
            .up(Bitmaps.ImgFreeze)
            .over(Bitmaps.ImgFreezeOver)
            .selected(Bitmaps.ImgFreezeSelected)
            .tooltip("Frozen mode. Suspends/resumes folding engine calculations.")
            .hotkey(KeyCode.KeyF)
            .rscriptID(RScriptUIElementID.FREEZE);
        if (Eterna.settings.freezeButtonAlwaysVisible.value) {
            this.addObject(this.freeze_button, this._toolbarLayout);
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
        }

        // NATIVE
        this.native_button = new GameButton()
            .up(Bitmaps.ImgNative)
            .over(Bitmaps.ImgNativeOver)
            .down(Bitmaps.ImgNativeSelected)
            .selected(Bitmaps.ImgNativeSelected)
            .tooltip("Natural Mode. RNA folds into the most stable shape.")
            .rscriptID(RScriptUIElementID.TOGGLENATURAL);
        this.addObject(this.native_button, this._toolbarLayout);

        // TARGET
        this.target_button = new GameButton()
            .up(Bitmaps.ImgTarget)
            .over(Bitmaps.ImgTargetOver)
            .down(Bitmaps.ImgTargetSelected)
            .selected(Bitmaps.ImgTargetSelected)
            .tooltip("Target Mode. RNA freezes into the desired shape.")
            .rscriptID(RScriptUIElementID.TOGGLETARGET);
        this.addObject(this.target_button, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        // PALETTE
        this.palette = new NucleotidePalette();
        this.addObject(this.palette, this._toolbarLayout);
        if (this._puzzle.is_pallete_allowed()) {
            if (this._puzzle.is_pair_brush_allowed()) {
                this.palette.change_default_mode();

                this._toolbarLayout.addHSpacer(SPACE_NARROW);

                this.pair_swap_button = new GameButton()
                    .up(Bitmaps.ImgSwap)
                    .over(Bitmaps.ImgSwapOver)
                    .down(Bitmaps.ImgSwapOver)
                    .selected(Bitmaps.ImgSwapSelect)
                    .hotkey(KeyCode.Digit5)
                    .tooltip("Swap paired bases.")
                    .rscriptID(RScriptUIElementID.SWAP);
                this.addObject(this.pair_swap_button, this._toolbarLayout);
            } else {
                this.palette.change_no_pair_mode();
            }
        } else {
            this.palette.enabled = false;
        }


        // ZOOM IN, ZOOM OUT, UNDO, REDO
        this.zoom_in_button = new GameButton()
            .up(Bitmaps.ImgZoomIn)
            .over(Bitmaps.ImgZoomInOver)
            .down(Bitmaps.ImgZoomInHit)
            .disabled(Bitmaps.ImgZoomInDisable)
            .tooltip("Zoom in")
            .hotkey(KeyCode.Equal)
            .rscriptID(RScriptUIElementID.ZOOMIN);

        this.zoom_out_button = new GameButton()
            .up(Bitmaps.ImgZoomOut)
            .over(Bitmaps.ImgZoomOutOver)
            .down(Bitmaps.ImgZoomOutHit)
            .disabled(Bitmaps.ImgZoomOutDisable)
            .tooltip("Zoom out")
            .hotkey(KeyCode.Minus)
            .rscriptID(RScriptUIElementID.ZOOMOUT);

        this.undo_button = new GameButton()
            .up(Bitmaps.ImgUndo)
            .over(Bitmaps.ImgUndoOver)
            .down(Bitmaps.ImgUndoHit)
            .disabled(Bitmaps.ImgUndo)
            .tooltip("Undo")
            .hotkey(KeyCode.KeyZ)
            .rscriptID(RScriptUIElementID.UNDO);

        this.redo_button = new GameButton()
            .up(Bitmaps.ImgRedo)
            .over(Bitmaps.ImgRedoOver)
            .down(Bitmaps.ImgRedoHit)
            .disabled(Bitmaps.ImgRedo)
            .tooltip("Redo")
            .hotkey(KeyCode.KeyY)
            .rscriptID(RScriptUIElementID.REDO);

        if (this._puzzle.is_undo_zoom_allowed()) {
            this._toolbarLayout.addHSpacer(SPACE_WIDE);
            this.addObject(this.zoom_in_button, this._toolbarLayout);
            this.addObject(this.zoom_out_button, this._toolbarLayout);

            this._toolbarLayout.addHSpacer(SPACE_NARROW);
            this.addObject(this.undo_button, this._toolbarLayout);
            this.addObject(this.redo_button, this._toolbarLayout);
        }

        // MENU BUTTONS
        this.view_options_button = new GameButton()
            .allStates(Bitmaps.ImgSettings)
            .label("Settings", 14)
            .scaleBitmapToLabel()
            .tooltip("Game options");
        this.actionMenu.add_sub_menu_button(0, this.view_options_button);

        this.view_solutions_button = new GameButton()
            .allStates(Bitmaps.ImgFile)
            .label("Designs", 14)
            .scaleBitmapToLabel()
            .tooltip("View all submitted designs for this puzzle.");

        this.spec_button = new GameButton()
            .allStates(Bitmaps.ImgSpec)
            .label("Specs", 14)
            .scaleBitmapToLabel()
            .tooltip("View RNA's melting point, dotplot and other specs")
            .hotkey(KeyCode.KeyS);

        if (isExperimental) {
            this.actionMenu.add_sub_menu_button(0, this.view_solutions_button);
            this.actionMenu.add_sub_menu_button(0, this.spec_button);
        }

        this.retry_button = new GameButton()
            .allStates(Bitmaps.ImgReset)
            .label("Reset", 14)
            .scaleBitmapToLabel()
            .tooltip("Reset and try this puzzle again.")
            .rscriptID(RScriptUIElementID.RESET);
        this.actionMenu.add_sub_menu_button(0, this.retry_button);

        this.copy_button = new GameButton()
            .allStates(Bitmaps.ImgCopy)
            .label("Copy", 14)
            .scaleBitmapToLabel()
            .tooltip("Copy the current sequence");

        this.paste_button = new GameButton()
            .allStates(Bitmaps.ImgPaste)
            .label("Paste", 14)
            .scaleBitmapToLabel()
            .tooltip("Type in a sequence");

        if (this._puzzle.get_puzzle_type() != PuzzleType.BASIC) {
            this.actionMenu.add_sub_menu_button(0, this.copy_button);
            this.actionMenu.add_sub_menu_button(0, this.paste_button);
        }

        this.hint_button = new GameButton()
            .up(Bitmaps.ImgHint)
            .over(Bitmaps.ImgHintOver)
            .down(Bitmaps.ImgHintHit)
            .hotkey(KeyCode.KeyH)
            .tooltip("Hint")
            .rscriptID(RScriptUIElementID.HINT);
        if (this._puzzle.get_hint() != null) {
            this.addObject(this.hint_button, this._toolbarLayout);
        }

        let obj: any = this._puzzle.get_boosters();
        if (obj) {
            log.debug("TODO: paint_tools");
            // if (obj['paint_tools'] != null) {
            //     for (let k = 0; k < obj.paint_tools.length; k++) {
            //         let booster = new Booster(this, obj.paint_tools[k], (me: Booster, dummy: number) => {
            //             me.on_load();
            //             let button: GameButton = me.create_button();
            //             button.set_click_callback(() => {
            //                 this.set_poses_color(me.get_tool_color());
            //                 this.deselect_all_colorings();
            //                 button.set_selected(true);
            //             });
            //             this.dyn_paint_tools.push(button);
            //             this.tools_container.addObject(button);
            //             this.layout_bars();
            //         });
            //     }
            // }
            // if (obj['actions'] != null) {
            // this.boosters_button = new GameButton()
            //     .up(BitmapManager.NovaBoosters)
            //     .over(BitmapManager.NovaBoosters)
            //     .down(BitmapManager.NovaBoosters);
            //     let idx: number = this.actionMenu.add_menu_button(this.boosters_button);
            //     for (let k = 0; k < obj.actions.length; k++) {
            //         obj.actions[k]['menu_index'] = k;
            //         let booster = new Booster(this, obj.actions[k], (me: Booster, midx: number = 0) => {
            //             let button: GameButton = me.create_button(14);
            //             button.set_click_callback(() => {
            //                 me.on_run();
            //             });
            //             this.actionMenu.add_sub_menu_button_at(idx, button, midx);
            //             this.dyn_action_tools.push(button);
            //             this.layout_bars();
            //         });
            //     }
            // }
            // let infotxt: string;
            // if (obj['mission'] != null) {
            //     missionDescriptionOverride = obj.mission['text'];
            // }
            // if (obj['mission_cleared'] != null) {
            //     infotxt = obj.mission_cleared['info'];
            //     let moretxt: string = obj.mission_cleared['more'];
            //     this.mission_cleared.setup_screen(infotxt, moretxt);
            //     this.yt_id = obj.mission_cleared['yt'];
            // }
        }

        this._toolbarLayout.layout();
        this._content.addChild(this._toolbarLayout);

        // TOGGLE_BAR
        let target_secstructs: string[] = this._puzzle.get_secstructs();
        this.puzzleStateToggle = new ToggleBar(target_secstructs.length);
        if (target_secstructs.length > 1) {
            this.addObject(this.puzzleStateToggle, this._content);
            DisplayUtil.positionRelative(
                this.puzzleStateToggle.display, Align.CENTER, Align.BOTTOM,
                this._toolbarLayout, Align.CENTER, Align.TOP, 0, -5);
        }

        DisplayUtil.positionRelative(
            this._content, Align.CENTER, Align.BOTTOM,
            this._invisibleBackground, Align.CENTER, Align.BOTTOM);

        this._uncollapsedContentLoc = new Point(this._content.position.x, this._content.position.y);
    }

    public set_toolbar_autohide(enabled: boolean): void {
        const COLLAPSE_ANIM: string = "CollapseAnim";

        if (this._auto_collapse == enabled) {
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
                            0.25, Easing.easeOut, this._content));
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
                            0.25, Easing.easeOut, this._content));
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
        this.pair_swap_button.enabled = !disable;
        for (let k: number = 0; k < this.dyn_paint_tools.length; k++) {
            this.dyn_paint_tools[k].enabled = !disable;
        }

        this.target_button.enabled = !disable;
        this.native_button.enabled = !disable;

        this.zoom_in_button.enabled = !disable;
        this.zoom_out_button.enabled = !disable;

        this.native_button.enabled = !disable;
        this.target_button.enabled = !disable;

        this.view_options_button.enabled = !disable;
        this.retry_button.enabled = !disable;
        this.copy_button.enabled = !disable;
        this.paste_button.enabled = !disable;
        this.spec_button.enabled = !disable;

        this.undo_button.enabled = !disable;
        this.redo_button.enabled = !disable;

        this.submit_button.enabled = !disable;
        this.view_solutions_button.enabled = !disable;

        this.hint_button.enabled = !disable;

        this.freeze_button.enabled = !disable;
        this.spec_button.enabled = !disable;

        this.pip_button.enabled = !disable;

        if (this.puzzleStateToggle != null) {
            this.puzzleStateToggle.enabled = !disable;
        }

        this.actionMenu.enabled = !disable;
    }

    private readonly _puzzle: Puzzle;

    private _invisibleBackground: Graphics;
    private _content: Container;
    private _toolbarLayout: HLayoutContainer;

    private _uncollapsedContentLoc: Point;
    private _auto_collapse: boolean;
    private _autoCollapseRegs: RegistrationGroup;
}
