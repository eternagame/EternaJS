import * as _ from "lodash"
import {Text, Texture} from "pixi.js";
import {Assert} from "../../flashbang/util/Assert";
import {TextBuilder} from "../../flashbang/util/TextBuilder";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {Fonts} from "./Fonts";

export class BitmapManager {
    public static readonly NovaAMissionReq: string = "assets/NOVA/Mission/a-box.png";
    public static readonly NovaAReq: string = "assets/NOVA/Constraints/a-requirement-box.png";
    public static readonly NovaARowMissionReq: string = "assets/NOVA/Mission/a-row-box.png";
    public static readonly NovaARowReq: string = "assets/NOVA/Constraints/a-row-req-box.png";
    public static readonly ActionbarCenterImg: string = "assets/Actionbar/actionbar_center.png";
    public static readonly ActionbarLeftImg: string = "assets/Actionbar/actionbar_left.png";
    public static readonly ActionbarRightImg: string = "assets/Actionbar/actionbar_right.png";
    public static readonly ImgAddBaseOver: string = "assets/NOVA/Edit/add_base_active.png";
    public static readonly ImgAddBase: string = "assets/NOVA/Edit/add_base_normal.png";
    public static readonly ImgAddBaseSelect: string = "assets/NOVA/Edit/add_base_selected.png";
    public static readonly ImgAddPairOver: string = "assets/NOVA/Edit/add_pair_active.png";
    public static readonly ImgAddPair: string = "assets/NOVA/Edit/add_pair_normal.png";
    public static readonly ImgAddPairSelect: string = "assets/NOVA/Edit/add_pair_selected.png";
    public static readonly NovaAUReq: string = "assets/NOVA/Constraints/au-requirement-carrier.png";
    public static readonly NovaAUMissionReq: string = "assets/NOVA/Mission/au-requirement.png";
    public static readonly Backbone: string = "assets/RNABase/backbone_new.png";
    public static readonly NovaBarcodeMissionReq: string = "assets/NOVA/Mission/barcode-req-mission.png";
    public static readonly NovaBarcodeReq: string = "assets/NOVA/Constraints/barcode-requirement-carrier.png";
    public static readonly ImgSelectBase: string = "assets/NOVA/Palette/base-selected.png";
    public static readonly ImgBindingBaseGlow: string = "assets/Aptamer/base_outer-1.png";
    public static readonly BaseAf: string = "assets/RNABase/BaseAf.png";
    public static readonly BaseAfLock: string = "assets/RNABase/BaseAfLock.png";
    public static readonly BaseAfMid: string = "assets/RNABase/BaseAfMid.png";
    public static readonly BaseAfMidLock: string = "assets/RNABase/BaseAfMidLock.png";
    public static readonly BaseCf: string = "assets/RNABase/BaseCf.png";
    public static readonly BaseCfLock: string = "assets/RNABase/BaseCfLock.png";
    public static readonly BaseCfMid: string = "assets/RNABase/BaseCfMid.png";
    public static readonly BaseCfMidLock: string = "assets/RNABase/BaseCfMidLock.png";
    public static readonly BaseGf: string = "assets/RNABase/BaseGf.png";
    public static readonly BaseGfLock: string = "assets/RNABase/BaseGfLock.png";
    public static readonly BaseGfMid: string = "assets/RNABase/BaseGfMid.png";
    public static readonly BaseGfMidLock: string = "assets/RNABase/BaseGfMidLock.png";
    public static readonly BaseUf: string = "assets/RNABase/BaseUf.png";
    public static readonly BaseUfLock: string = "assets/RNABase/BaseUfLock.png";
    public static readonly BaseUfMid: string = "assets/RNABase/BaseUfMid.png";
    public static readonly BaseUfMidLock: string = "assets/RNABase/BaseUfMidLock.png";
    public static readonly ImgMoney: string = "assets/bet_big.png";
    public static readonly BaseUMid: string = "assets/RNABase/blue_mid.png";
    public static readonly BaseUMidLock: string = "assets/RNABase/blue_mid_lock.png";
    public static readonly BaseUOutline1: string = "assets/RNABase/blue_outline_1.png";
    public static readonly BaseUOutline2: string = "assets/RNABase/blue_outline_2_new.png";
    public static readonly BaseUPattern: string = "assets/RNABase/blue_pattern.png";
    public static readonly BaseUMin: string = "assets/RNABase/blue_small.png";
    public static readonly NovaBoostMissionReq: string = "assets/NOVA/Mission/boost-req-mission.png";
    public static readonly NovaBoostReq: string = "assets/NOVA/Constraints/boost-requirement-carrier.png";
    public static readonly NovaBoosters: string = "assets/NOVA/booster_normal.png";
    public static readonly BubbleImg: string = "assets/PuzzleEdit/btnDel.png";
    public static readonly Bubble00: string = "assets/Bubble/bubble0.png";
    public static readonly Bubble10: string = "assets/Bubble/bubble1.png";
    public static readonly Bubble03: string = "assets/Bubble/bubble1_big_blurred.png";
    public static readonly Bubble01: string = "assets/Bubble/bubble1_middle.png";
    public static readonly Bubble02: string = "assets/Bubble/bubble1_small.png";
    public static readonly Bubble13: string = "assets/Bubble/bubble2_big_blurred.png";
    public static readonly Bubble11: string = "assets/Bubble/bubble2_middle.png";
    public static readonly Bubble12: string = "assets/Bubble/bubble2_small.png";
    public static readonly SoundReceiveMessage: string = "assets/sounds/button-9.mp3";
    public static readonly NovaCMissionReq: string = "assets/NOVA/Mission/c-box.png";
    public static readonly NovaCReq: string = "assets/NOVA/Constraints/c-requirement-box.png";
    public static readonly NovaCRowMissionReq: string = "assets/NOVA/Mission/c-row-box.png";
    public static readonly NovaCRowReq: string = "assets/NOVA/Constraints/c-row-req-box.png";
    public static readonly ImgChatBoxArrowDown: string = "assets/RinaChat/chatbox_arrow_down.png";
    public static readonly ImgChatBoxArrowUp: string = "assets/RinaChat/chatbox_arrow_up.png";
    public static readonly ImgEndingMoney: string = "assets/coin.png";
    public static readonly ImgColumnsOver: string = "assets/NOVA/Columns/columns_active.png";
    public static readonly ImgColumnsHit: string = "assets/NOVA/Columns/columns_hit.png";
    public static readonly ImgColumns: string = "assets/NOVA/Columns/columns_normal.png";
    public static readonly ImgCopy: string = "assets/NOVA/Copy/copy-1.png";
    public static readonly ImgCopyHit: string = "assets/NOVA/Copy/copy-hit.png";
    public static readonly ImgCopyOver: string = "assets/NOVA/Copy/copy-over.png";
    public static readonly ImgCross: string = "assets/cross.png";
    public static readonly ActionbarDividerImg: string = "assets/divider.png";
    public static readonly ImgDownArrow: string = "assets/down_arrow.png";
    public static readonly CancelImg: string = "assets/TangoIcons/emblem-unreadable.png";
    public static readonly ImgEndBoard: string = "assets/endboard.png";
    public static readonly EnergyScoreBackground: string = "assets/NOVA/Energy/energy-background.png";
    public static readonly EnterKeyImg: string = "assets/enterkey.png";
    public static readonly ImgEraseOver: string = "assets/NOVA/Edit/erase_active.png";
    public static readonly ImgErase: string = "assets/NOVA/Edit/erase_normal.png";
    public static readonly ImgEraseSelect: string = "assets/NOVA/Edit/erase_selected.png";
    public static readonly ImgEstimateOver: string = "assets/NOVA/Estimate/estimate_active.png";
    public static readonly ImgEstimate: string = "assets/NOVA/Estimate/estimate_normal.png";
    public static readonly ImgEstimateSelected: string = "assets/NOVA/Estimate/estimate_selected.png";
    public static readonly ImgFb: string = "assets/TangoIcons/evolver-32x32.png";
    public static readonly ImgFileOver: string = "assets/Stamps/failed.png";
    public static readonly ImgFileHit: string = "assets/NOVA/File/file_hit.png";
    public static readonly ImgFile: string = "assets/NOVA/File/file_normal.png";
    public static readonly NovaFingerClick: string = "assets/NOVA/Hint/finger-click.png";
    public static readonly NovaFinger: string = "assets/NOVA/Hint/finger.png";
    public static readonly ImgBadge1: string = "assets/Achievements/Finished-Tutorial.png";
    public static readonly ImgFlaskOver: string = "assets/NOVA/Flask/flask_active.png";
    public static readonly ImgFlask: string = "assets/NOVA/Flask/flask_normal.png";
    public static readonly ImgFlaskSelected: string = "assets/NOVA/Flask/flask_selected.png";
    public static readonly ImgFordPanel: string = "assets/DesignBrowser/FordPanel.png";
    public static readonly SolutionBigFrame: string = "assets/frame_big.png";
    public static readonly ImgFreezeOver: string = "assets/NOVA/Freeze/freeze_active.png";
    public static readonly ImgFreeze: string = "assets/NOVA/Freeze/freeze_normal.png";
    public static readonly ImgFreezeSelected: string = "assets/NOVA/Freeze/freeze_selected.png";
    public static readonly NovaGMissionReq: string = "assets/NOVA/Mission/g-box.png";
    public static readonly NovaGReq: string = "assets/NOVA/Constraints/g-requirement-box.png";
    public static readonly NovaGRowMissionReq: string = "assets/NOVA/Mission/g-row-box.png";
    public static readonly NovaGRowReq: string = "assets/NOVA/Constraints/g-row-req-box.png";
    public static readonly NovaGCReq: string = "assets/NOVA/Constraints/gc-requirement-carrier.png";
    public static readonly NovaGCMissionReq: string = "assets/NOVA/Mission/gc-requirement.png";
    public static readonly GoDownImg: string = "assets/TangoIcons/go-down.png";
    public static readonly GoUpImg: string = "assets/TangoIcons/go-up.png";
    public static readonly BaseWMidPattern: string = "assets/RNABase/gray_mid.png";
    public static readonly GreatImg: string = "assets/Stamps/great.png";
    public static readonly NovaGreenCheck: string = "assets/NOVA/Constraints/green-check.png";
    public static readonly NovaPassOutline: string = "assets/NOVA/Constraints/green-outline.png";
    public static readonly BaseCMid: string = "assets/RNABase/green_mid.png";
    public static readonly BaseCMidLock: string = "assets/RNABase/green_mid_lock.png";
    public static readonly BaseCPattern: string = "assets/RNABase/green_pattern.png";
    public static readonly BaseCMin: string = "assets/RNABase/green_small.png";
    public static readonly ImgHintOver: string = "assets/NOVA/Hint/hint_active.png";
    public static readonly ImgHintHit: string = "assets/NOVA/Hint/hint_hit.png";
    public static readonly ImgHint: string = "assets/NOVA/Hint/hint_normal.png";
    public static readonly ImgKnob: string = "assets/NOVA/Knob/knob_bg.png";
    public static readonly ImgNotch: string = "assets/NOVA/Knob/knob_notch.png";
    public static readonly ImgBadge2: string = "assets/Achievements/Lab-access.png";
    public static readonly ImgLabReq: string = "assets/lab1.png";
    public static readonly LBaseAf: string = "assets/RNABase/LBaseAf.png";
    public static readonly LBaseCf: string = "assets/RNABase/LBaseCf.png";
    public static readonly LBaseGf: string = "assets/RNABase/LBaseGf.png";
    public static readonly LBaseUf: string = "assets/RNABase/LBaseUf.png";
    public static readonly BaseALock: string = "assets/RNABase/lock_a.png";
    public static readonly ImgLockOver: string = "assets/NOVA/Lock/lock_active.png";
    public static readonly BaseCLock: string = "assets/RNABase/lock_c.png";
    public static readonly BaseULock: string = "assets/RNABase/lock_g.png";
    public static readonly ImgLock: string = "assets/NOVA/Lock/lock_normal.png";
    public static readonly ImgLockSelect: string = "assets/NOVA/Lock/lock_selected.png";
    public static readonly ImgEteRNALogo: string = "assets/logo.png";
    public static readonly ImgMaximize: string = "assets/Stamps/mastered.png";
    public static readonly ImgMenuBorder: string = "assets/menu-border.png";
    public static readonly NovaMenu: string = "assets/NOVA/menu_button.png";
    public static readonly ImgMenuDot: string = "assets/menudot.png";
    public static readonly BaseWMidOutline: string = "assets/RNABase/mid_outline.png";
    public static readonly ImgZoomOutHit: string = "assets/NOVA/Zoom/minus-hit.png";
    public static readonly ImgZoomOutDisable: string = "assets/NOVA/Zoom/minus-inactive.png";
    public static readonly ImgZoomOutOver: string = "assets/NOVA/Zoom/minus-over.png";
    public static readonly ImgZoomOut: string = "assets/NOVA/Zoom/minus.png";
    public static readonly MinusImg: string = "assets/Generic/minus.png";
    public static readonly ShiftLockMinus: string = "assets/RNABase/minus_blue.png";
    public static readonly MissionBackgroundImage: string = "assets/NOVA/Mission/mission-background-image.png";
    public static readonly ImgMoleculeOver: string = "assets/NOVA/Molecule/molecule_active.png";
    public static readonly ImgMoleculeInner: string = "assets/Aptamer/molecule_inner.png";
    public static readonly ImgMolecule: string = "assets/NOVA/Molecule/molecule_normal.png";
    public static readonly ImgMoleculeOuter: string = "assets/Aptamer/molecule_outer.png";
    public static readonly ImgMoleculeSelect: string = "assets/NOVA/Molecule/molecule_selected.png";
    public static readonly AudioNormal: string = "assets/mute-icon1.png";
    public static readonly AudioMute: string = "assets/mute-icon2.png";
    public static readonly ImgNativeOver: string = "assets/NOVA/Target/nature-over.png";
    public static readonly ImgNativeSelected: string = "assets/NOVA/Target/nature-selected.png";
    public static readonly ImgNative: string = "assets/NOVA/Target/nature.png";
    public static readonly LBaseU: string = "assets/RNABase/new_big_blue.png";
    public static readonly BaseWPattern: string = "assets/RNABase/new_big_gray.png";
    public static readonly LBaseC: string = "assets/RNABase/new_big_green.png";
    public static readonly BaseWOutline: string = "assets/RNABase/new_big_outline.png";
    public static readonly LBaseG: string = "assets/RNABase/new_big_red.png";
    public static readonly LBaseA: string = "assets/RNABase/new_big_yellow.png";
    public static readonly BaseU: string = "assets/RNABase/new_g.png";
    public static readonly NovaNextHit: string = "assets/NOVA/Buttons/next-hit.png";
    public static readonly NovaNextOver: string = "assets/NOVA/Buttons/next-over.png";
    public static readonly NovaNext: string = "assets/NOVA/Buttons/next.png";
    public static readonly ImgNextInside: string = "assets/next_inside.png";
    public static readonly NovaNoGCReq: string = "assets/NOVA/Constraints/nogc-requirement-box.png";
    public static readonly NovaNoGCMissionReq: string = "assets/NOVA/Mission/nogc-requirement.png";
    public static readonly NovaNoGUReq: string = "assets/NOVA/Constraints/noug-requirement-box.png";
    public static readonly NovaNoGUMissionReq: string = "assets/NOVA/Mission/noug-requirement.png";
    public static readonly NovaBoundOligoMissionReq: string = "assets/NOVA/Mission/oligo-bound-req-mission.png";
    public static readonly NovaBoundOligoReq: string = "assets/NOVA/Constraints/oligo-bound-requirement-carrier.png";
    public static readonly NovaUnboundOligoMissionReq: string = "assets/NOVA/Mission/oligo-unbound-req-mission.png";
    public static readonly NovaUnboundOligoReq: string = "assets/NOVA/Constraints/oligo-unbound-requirement-carrier.png";
    public static readonly ImgSelectPair: string = "assets/NOVA/Palette/pair-selected.png";
    public static readonly NovaPairsReq: string = "assets/NOVA/Constraints/pairs-requirement-carrier.png";
    public static readonly NovaPairsMissionReq: string = "assets/NOVA/Mission/pairs-requirement.png";
    public static readonly ImgPaletteNoBondsPairs: string = "assets/NOVA/Palette/palette-nobonds.png";
    public static readonly ImgPaletteNoPairs: string = "assets/NOVA/Palette/palette-nopairs.png";
    public static readonly ImgPalette: string = "assets/NOVA/Palette/palette.png";
    public static readonly ImgColoringOver: string = "assets/NOVA/Coloring/palette_active.png";
    public static readonly ImgColoring: string = "assets/NOVA/Coloring/palette_normal.png";
    public static readonly ImgColoringSelected: string = "assets/NOVA/Coloring/palette_selected.png";
    public static readonly MingPanel: string = "assets/MingUI/panel.png";
    public static readonly ImgPasteOver: string = "assets/NOVA/Copy/paste_active.png";
    public static readonly ImgPasteHit: string = "assets/NOVA/Copy/paste_hit.png";
    public static readonly ImgPaste: string = "assets/NOVA/Copy/paste_normal.png";
    public static readonly BonusSymbol: string = "assets/penalty1.png";
    public static readonly ImgPipOver: string = "assets/NOVA/Tile/pip_active.png";
    public static readonly ImgPipHit: string = "assets/NOVA/Tile/pip_hit.png";
    public static readonly ImgPip: string = "assets/NOVA/Tile/pip_normal.png";
    public static readonly PlayImageHit: string = "assets/NOVA/Mission/play-button-hit.png";
    public static readonly PlayImageOver: string = "assets/NOVA/Mission/play-button-over.png";
    public static readonly PlayImage: string = "assets/NOVA/Mission/play-button.png";
    public static readonly ImgZoomInHit: string = "assets/NOVA/Zoom/plus-hit.png";
    public static readonly ImgZoomInDisable: string = "assets/NOVA/Zoom/plus-inactive.png";
    public static readonly ImgZoomInOver: string = "assets/NOVA/Zoom/plus-over.png";
    public static readonly ImgZoomIn: string = "assets/NOVA/Zoom/plus.png";
    public static readonly PlusImg: string = "assets/Generic/plus.png";
    public static readonly ShiftLockPlus: string = "assets/RNABase/plus_blue.png";
    public static readonly ShiftLock: string = "assets/RNABase/plusminus.png";
    public static readonly NovaPrevHit: string = "assets/NOVA/Buttons/prev-hit.png";
    public static readonly NovaPrevOver: string = "assets/NOVA/Buttons/prev-over.png";
    public static readonly NovaPrev: string = "assets/NOVA/Buttons/prev.png";
    public static readonly ImgSubmitOver: string = "assets/NOVA/Publish/publish_active.png";
    public static readonly ImgSubmitHit: string = "assets/NOVA/Publish/publish_hit.png";
    public static readonly ImgSubmit: string = "assets/NOVA/Publish/publish_normal.png";
    public static readonly MissionPuzzleIdImage: string = "assets/NOVA/Mission/puzzle-id-carrier.png";
    public static readonly MissionPuzzleThumbnailImage: string = "assets/NOVA/Mission/puzzle-thumbnail-background.png";
    public static readonly PuzzleImg: string = "assets/puzzle.png";
    public static readonly NovaPuzzleImg: string = "assets/puzzle_icon.png";
    public static readonly NovaFailOutline: string = "assets/NOVA/Constraints/red-outline.png";
    public static readonly BaseGLock: string = "assets/RNABase/red_lock.png";
    public static readonly BaseGMid: string = "assets/RNABase/red_mid.png";
    public static readonly BaseGMidLock: string = "assets/RNABase/red_mid_lock.png";
    public static readonly BaseGPattern: string = "assets/RNABase/red_pattern.png";
    public static readonly BaseGMin: string = "assets/RNABase/red_small.png";
    public static readonly ImgRedoHit: string = "assets/NOVA/Redo/redo-hit.png";
    public static readonly ImgRedoOver: string = "assets/NOVA/Redo/redo-over.png";
    public static readonly ImgRedo: string = "assets/NOVA/Redo/redo.png";
    public static readonly ImgResetHit: string = "assets/NOVA/Reset/reset-hit.png";
    public static readonly ImgResetOver: string = "assets/NOVA/Reset/reset-over.png";
    public static readonly ImgReset: string = "assets/NOVA/Reset/reset.png";
    public static readonly RetryImg: string = "assets/retry.png";
    public static readonly ImgReturnOver: string = "assets/NOVA/Return/return_active.png";
    public static readonly ImgReturnHit: string = "assets/NOVA/Return/return_hit.png";
    public static readonly ImgReturn: string = "assets/NOVA/Return/return_normal.png";
    public static readonly ScoreCircle: string = "assets/scorecircle small.png";
    public static readonly ImgScreenshotHit: string = "assets/NOVA/Camera/screenshot-hit.png";
    public static readonly ImgScreenshotOver: string = "assets/NOVA/Camera/screenshot-over.png";
    public static readonly ImgScreenshot: string = "assets/NOVA/Camera/screenshot.png";
    public static readonly ImgSettingsHit: string = "assets/NOVA/Options/settings-over-hit.png";
    public static readonly ImgSettingsOver: string = "assets/NOVA/Options/settings-over.png";
    public static readonly ImgSettings: string = "assets/NOVA/Options/settings.png";
    public static readonly ShapeImg: string = "assets/shape.png";
    public static readonly BaseAShiftNoLock: string = "assets/RNABase/shift_no_lock_a.png";
    public static readonly BackboneMid: string = "assets/RNABase/small_backbone.png";
    public static readonly BaseWMin: string = "assets/RNABase/small_gray.png";
    public static readonly ViewSolutionsImg: string = "assets/small_jee_view_solutions.png";
    public static readonly RestoreImg: string = "assets/small_restore.png";
    public static readonly SolutionSmallFrame: string = "assets/sol_frame.png";
    public static readonly NovaSolver: string = "assets/NOVA/solver_normal.png";
    public static readonly ImgEditSortOptionsOver: string = "assets/NOVA/Sort/sort_active.png";
    public static readonly ImgEditSortOptionsHit: string = "assets/NOVA/Sort/sort_hit.png";
    public static readonly ImgEditSortOptions: string = "assets/NOVA/Sort/sort_normal.png";
    public static readonly ImgSpecOver: string = "assets/NOVA/View/spec_active.png";
    public static readonly ImgSpecHit: string = "assets/NOVA/View/spec_hit.png";
    public static readonly ImgSpec: string = "assets/NOVA/View/spec_normal.png";
    public static readonly ImgSwapOver: string = "assets/NOVA/Palette/Swap/swap-over.png";
    public static readonly ImgSwapSelect: string = "assets/NOVA/Palette/Swap/swap-selected.png";
    public static readonly ImgSwap: string = "assets/NOVA/Palette/Swap/swap.png";
    public static readonly ImgTargetOver: string = "assets/NOVA/Target/target-over.png";
    public static readonly ImgTargetSelected: string = "assets/NOVA/Target/target-selected.png";
    public static readonly ImgTarget: string = "assets/NOVA/Target/target.png";
    public static readonly TemperatureImg: string = "assets/temperature.png";
    public static readonly BaseC: string = "assets/RNABase/thinner_green.png";
    public static readonly BaseCOutline: string = "assets/RNABase/thinner_green_outline.png";
    public static readonly BaseG: string = "assets/RNABase/thinner_red.png";
    public static readonly BaseGOutline: string = "assets/RNABase/thinner_red_outline.png";
    public static readonly BaseA: string = "assets/RNABase/thinner_yellow.png";
    public static readonly BaseAOutline: string = "assets/RNABase/thinner_yellow_outline.png";
    public static readonly NovaPuzThumbLargeMet: string = "assets/NOVA/Puzzle Thumbnail/thumbnail-large-met.png";
    public static readonly NovaPuzThumbLargeFail: string = "assets/NOVA/Puzzle Thumbnail/thumbnail-large.png";
    public static readonly NovaPuzThumbSmallMet: string = "assets/NOVA/Puzzle Thumbnail/thumbnail-small-met.png";
    public static readonly NovaPuzThumbSmallFail: string = "assets/NOVA/Puzzle Thumbnail/thumbnail-small.png";
    public static readonly Satellite: string = "assets/RNABase/triangle.png";
    public static readonly TrophyImg: string = "assets/trophy_big.png";
    public static readonly NovaUMissionReq: string = "assets/NOVA/Mission/u-box.png";
    public static readonly NovaUReq: string = "assets/NOVA/Constraints/u-requirement-box.png";
    public static readonly NovaURowMissionReq: string = "assets/NOVA/Mission/u-row-box.png";
    public static readonly NovaURowReq: string = "assets/NOVA/Constraints/u-row-req-box.png";
    public static readonly NovaGUReq: string = "assets/NOVA/Constraints/ug-requirement-carrier.png";
    public static readonly NovaGUMissionReq: string = "assets/NOVA/Mission/ug-requirement.png";
    public static readonly MingFold: string = "assets/MingModes/ui_fold.png";
    public static readonly MingFreeze: string = "assets/MingModes/ui_freeze.png";
    public static readonly ImgUndoHit: string = "assets/NOVA/Undo/undo-hit.png";
    public static readonly ImgUndoOver: string = "assets/NOVA/Undo/undo-over.png";
    public static readonly ImgUndo: string = "assets/NOVA/Undo/undo.png";
    public static readonly ImgUpArrow: string = "assets/up_arrow.png";
    public static readonly Audio_Vol_Off: string = "assets/volume_off.png";
    public static readonly Audio_Vol_On: string = "assets/volume_on.png";
    public static readonly ImgVotes: string = "assets/vote.png";
    public static readonly BaseAMidLock: string = "assets/RNABase/yellow_mid_lock.png";
    public static readonly BaseAMid: string = "assets/RNABase/yellow_middle.png";
    public static readonly BaseAPattern: string = "assets/RNABase/yellow_pattern.png";
    public static readonly BaseAMin: string = "assets/RNABase/yellow_small.png";

    public static get pose2DURLs (): string[] {
        if (BitmapManager.POSE2D_URLS == null) {
            BitmapManager.POSE2D_URLS =
                BitmapManager.urlsWithPrefix("assets/RNABase")
                .concat(BitmapManager.urlsWithPrefix("assets/NOVA")
                .concat([BitmapManager.ShapeImg]));
        }
        return BitmapManager.POSE2D_URLS;
    }

    /// TODO: remove me!
    public static get_bitmap(source: string): Texture {
        return Texture.fromImage(source);
    }

    /// TODO: remove me!
    public static get_bitmap_named(name: string): Texture {
        let source: string = (BitmapManager as any)[name];
        Assert.notNull(source, `No such bitmap: ${name}`);
        return this.get_bitmap(source);
    }

    public static urlsWithPrefix(prefix: string): string[] {
        let strings: string[] = [];
        for (let value of _.values(BitmapManager)) {
            if (typeof(value) === "string" && (value as string).startsWith(prefix)) {
                strings.push(value);
            }
        }
        return strings;
    }

    public static get_number_bitmap(ii: number): Texture {
        return BitmapManager.get_text_bitmap_impl(ii.toString(), Fonts.ARIAL, 14, false, 0xffffff);
    }

    public static get_text_bitmap(txt: string): Texture {
        return BitmapManager.get_text_bitmap_impl(txt, Fonts.ARIAL, 12, true, 0xffffff);
    }

    private static get_text_bitmap_impl(text: string, fontName: string, fontSize: number, bold: boolean, color: number): Texture {
        let bitmap: Texture = BitmapManager._textBitmaps.get(text);
        if (bitmap == null) {
            let tf: Text = new TextBuilder(text).font(fontName).fontSize(fontSize).color(color).build();
            bitmap = TextureUtil.renderToTexture(tf);
            BitmapManager._textBitmaps.set(text, bitmap);
        }

        return bitmap;
    }

    private static POSE2D_URLS: string[];
    private static readonly _textBitmaps: Map<string, Texture> = new Map();
}
