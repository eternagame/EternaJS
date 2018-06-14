import * as log from "loglevel";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {HLayoutContainer} from "../../../flashbang/layout/HLayoutContainer";
import {Puzzle} from "../../puzzle/Puzzle";
import {EternaMenu, EternaMenuStyle} from "../../ui/EternaMenu";
import {GameButton} from "../../ui/GameButton";
import {GamePanel, GamePanelType} from "../../ui/GamePanel";
import {NucleotidePalette} from "../../ui/NucleotidePalette";
import {ToggleBar} from "../../ui/ToggleBar";
import {BitmapManager} from "../../util/BitmapManager";
import {UDim} from "../../util/UDim";

export class PoseEditToolbar extends GamePanel {
    public readonly palette: NucleotidePalette;

    public readonly native_button: GameButton;
    public readonly target_button: GameButton;
    public readonly pip_button: GameButton;
    public readonly freeze_button: GameButton;

    public readonly toggle_bar: ToggleBar;

    public readonly ll_menu: EternaMenu;
    public readonly boosters_button: GameButton;
    public readonly undo_button: GameButton;
    public readonly redo_button: GameButton;
    public readonly zoom_in_button: GameButton;
    public readonly zoom_out_button: GameButton;
    public readonly copy_button: GameButton;
    public readonly paste_button: GameButton;
    public readonly view_options_button: GameButton;
    public readonly retry_button: GameButton;
    public readonly spec_button: GameButton;

    public readonly pair_swap_button: GameButton;
    public readonly hint_button: GameButton;
    public readonly dyn_paint_tools: GameButton[] = [];
    public readonly dyn_action_tools: GameButton[] = [];

    public readonly submit_button: GameButton;
    public readonly view_solutions_button: GameButton;

    public constructor(puz: Puzzle, options: any[]) {
        super(GamePanelType.INVISIBLE);

        const SPACE_NARROW: number = 7;
        const SPACE_WIDE: number = 28;

        this._toolbarLayout = new HLayoutContainer();
        this.container.addChild(this._toolbarLayout);

        const isExperimental = puz.get_puzzle_type() == "Experimental";

        // MENU
        this.ll_menu = new EternaMenu(EternaMenuStyle.PULLUP);
        this.ll_menu.add_menu_button(new GameButton().allStates(BitmapManager.NovaMenu));
        this.addObject(this.ll_menu, this._toolbarLayout);

        // SUBMIT BUTTON
        this.submit_button = new GameButton()
            .up(BitmapManager.ImgSubmit)
            .over(BitmapManager.ImgSubmitOver)
            .down(BitmapManager.ImgSubmitHit)
            .tooltip("Publish your solution!");
        if (isExperimental) {
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
            this.addObject(this.submit_button, this._toolbarLayout);
        }

        this._toolbarLayout.addHSpacer(SPACE_WIDE);

        // PIP BUTTON
        this.pip_button = new GameButton()
            .up(BitmapManager.ImgPip)
            .over(BitmapManager.ImgPipOver)
            .down(BitmapManager.ImgPipHit)
            .tooltip("Set PiP mode")
            .hotkey(KeyCode.KeyP);
        if (puz.get_secstructs().length > 1) {
            this.addObject(this.pip_button, this._toolbarLayout);
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
        }

        // FREEZE
        this.freeze_button = new GameButton()
            .up(BitmapManager.ImgFreeze)
            .over(BitmapManager.ImgFreezeOver)
            .selected(BitmapManager.ImgFreezeSelected)
            .tooltip("Frozen mode. Suspends/resumes folding engine calculations.")
            .hotkey(KeyCode.KeyF);
        if (options != null && options[12] == true) {
            this.addObject(this.freeze_button, this._toolbarLayout);
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
        }

        // NATIVE
        this.native_button = new GameButton()
            .up(BitmapManager.ImgNative)
            .over(BitmapManager.ImgNativeOver)
            .down(BitmapManager.ImgNativeSelected)
            .selected(BitmapManager.ImgNativeSelected)
            .tooltip("Natural Mode. RNA folds into the most stable shape.");
        this.addObject(this.native_button, this._toolbarLayout);

        // TARGET
        this.target_button = new GameButton()
            .up(BitmapManager.ImgTarget)
            .over(BitmapManager.ImgTargetOver)
            .down(BitmapManager.ImgTargetSelected)
            .selected(BitmapManager.ImgTargetSelected)
            .tooltip("Target Mode. RNA freezes into the desired shape.");
        this.addObject(this.target_button, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_NARROW);

        // PALETTE
        this.palette = new NucleotidePalette();
        this.addObject(this.palette, this._toolbarLayout);
        if (puz.is_pallete_allowed()) {
            if (puz.is_pair_brush_allowed()) {
                this.palette.change_default_mode();

                this._toolbarLayout.addHSpacer(SPACE_NARROW);

                this.pair_swap_button = new GameButton()
                    .up(BitmapManager.ImgSwap)
                    .over(BitmapManager.ImgSwapOver)
                    .down(BitmapManager.ImgSwapOver)
                    .selected(BitmapManager.ImgSwapSelect)
                    .hotkey(KeyCode.Digit5)
                    .tooltip("Swap paired bases.");
                this.addObject(this.pair_swap_button, this._toolbarLayout);
            } else {
                this.palette.change_no_pair_mode();
            }
        } else {
            this.palette.set_disabled(true);
        }


        // ZOOM IN, ZOOM OUT, UNDO, REDO
        this.zoom_in_button = new GameButton()
            .up(BitmapManager.ImgZoomIn)
            .over(BitmapManager.ImgZoomInOver)
            .down(BitmapManager.ImgZoomInHit)
            .disabled(BitmapManager.ImgZoomInDisable)
            .tooltip("Zoom in")
            .hotkey(KeyCode.Equal);

        this.zoom_out_button = new GameButton()
            .up(BitmapManager.ImgZoomOut)
            .over(BitmapManager.ImgZoomOutOver)
            .down(BitmapManager.ImgZoomOutHit)
            .disabled(BitmapManager.ImgZoomOutDisable)
            .tooltip("Zoom out")
            .hotkey(KeyCode.Minus);

        this.undo_button = new GameButton()
            .up(BitmapManager.ImgUndo)
            .over(BitmapManager.ImgUndoOver)
            .down(BitmapManager.ImgUndoHit)
            .disabled(BitmapManager.ImgUndo)
            .tooltip("Undo")
            .hotkey(KeyCode.KeyZ);

        this.redo_button = new GameButton()
            .up(BitmapManager.ImgRedo)
            .over(BitmapManager.ImgRedoOver)
            .down(BitmapManager.ImgRedoHit)
            .disabled(BitmapManager.ImgRedo)
            .tooltip("Redo")
            .hotkey(KeyCode.KeyY);

        if (puz.is_undo_zoom_allowed()) {
            this._toolbarLayout.addHSpacer(SPACE_WIDE);
            this.addObject(this.zoom_in_button, this._toolbarLayout);
            this.addObject(this.zoom_out_button, this._toolbarLayout);

            this._toolbarLayout.addHSpacer(SPACE_NARROW);
            this.addObject(this.undo_button, this._toolbarLayout);
            this.addObject(this.redo_button, this._toolbarLayout);
        }

        // MENU BUTTONS
        this.view_options_button = new GameButton()
            .allStates(BitmapManager.ImgSettings)
            .label("Settings", 14)
            .scaleBitmapToLabel()
            .tooltip("Game options");
        this.ll_menu.add_sub_menu_button(0, this.view_options_button);

        this.view_solutions_button = new GameButton()
            .allStates(BitmapManager.ImgFile)
            .label("Designs", 14)
            .scaleBitmapToLabel()
            .tooltip("View all submitted designs for this puzzle.");

        this.spec_button = new GameButton()
            .allStates(BitmapManager.ImgSpec)
            .label("Specs", 14)
            .scaleBitmapToLabel()
            .tooltip("View RNA's melting point, dotplot and other specs")
            .hotkey(KeyCode.KeyS);

        if (isExperimental) {
            this.ll_menu.add_sub_menu_button(0, this.view_solutions_button);
            this.ll_menu.add_sub_menu_button(0, this.spec_button);
        }

        this.retry_button = new GameButton()
            .allStates(BitmapManager.ImgReset)
            .label("Reset", 14)
            .scaleBitmapToLabel()
            .tooltip("Reset and try this puzzle again.");
        this.ll_menu.add_sub_menu_button(0, this.retry_button);

        this.copy_button = new GameButton()
            .allStates(BitmapManager.ImgCopy)
            .label("Copy", 14)
            .scaleBitmapToLabel()
            .tooltip("Copy the current sequence");

        this.paste_button = new GameButton()
            .allStates(BitmapManager.ImgPaste)
            .label("Paste", 14)
            .scaleBitmapToLabel()
            .tooltip("Type in a sequence");

        if (puz.get_puzzle_type() != "Basic") {
            this.ll_menu.add_sub_menu_button(0, this.copy_button);
            this.ll_menu.add_sub_menu_button(0, this.paste_button);
        }

        this.hint_button = new GameButton()
            .up(BitmapManager.ImgHint)
            .over(BitmapManager.ImgHintOver)
            .down(BitmapManager.ImgHintHit)
            .hotkey(KeyCode.KeyH)
            .tooltip("Hint");
        if (puz.get_hint() != null) {
            this.addObject(this.hint_button, this._toolbarLayout);
        }

        let obj: any = puz.get_boosters();
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
            //     let idx: number = this.ll_menu.add_menu_button(this.boosters_button);
            //     for (let k = 0; k < obj.actions.length; k++) {
            //         obj.actions[k]['menu_index'] = k;
            //         let booster = new Booster(this, obj.actions[k], (me: Booster, midx: number = 0) => {
            //             let button: GameButton = me.create_button(14);
            //             button.set_click_callback(() => {
            //                 me.on_run();
            //             });
            //             this.ll_menu.add_sub_menu_button_at(idx, button, midx);
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

        this.container.addChild(this._toolbarLayout);

        // TOGGLE_BAR
        let target_secstructs: string[] = puz.get_secstructs();
        this.toggle_bar = new ToggleBar(target_secstructs.length);
        if (target_secstructs.length > 1) {
            this.addObject(this.toggle_bar, this.container);
        }

        this.set_toolbar_autohide(options != null && options[11] == true);
    }

    protected added(): void {
        super.added();
        this._toolbarLayout.layout();
    }

    public set_toolbar_autohide(auto: boolean): void {
        if (auto) {
            this.set_auto_collapse(true, new UDim(0, 1, 0, -104), new UDim(0, 1, 0, -32));
        } else {
            this.set_auto_collapse(false, new UDim(0, 1, 0, -104));
        }
    }

    public disable_tools(disable: boolean): void {
        this.palette.set_disabled(disable);
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

        if (this.toggle_bar != null) {
            this.toggle_bar.set_disabled(disable);
        }

        this.ll_menu.set_disabled(disable);
    }

    private _toolbarLayout: HLayoutContainer;
}
