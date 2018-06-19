import {Align} from "../../flashbang/core/Align";
import {PointerCapture} from "../../flashbang/input/PointerCapture";
import {VLayoutContainer} from "../../flashbang/layout/VLayoutContainer";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Setting} from "../../flashbang/settings/Setting";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Eterna} from "../Eterna";
import {GameButton} from "./GameButton";
import {GameCheckbox} from "./GameCheckbox";
import {GamePanel, GamePanelType} from "./GamePanel";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export enum EternaViewOptionsMode {
    PUZZLE = 0, PUZZLEMAKER, LAB
}

export class EternaViewOptionsDialog extends ContainerObject {
    public constructor(mode: EternaViewOptionsMode) {
        super();
        this._optionsMode = mode;
    }

    protected added(): void {
        let bg = DisplayUtil.fillStageRect(0x0, 0.3);
        this.container.addChild(bg);

        // Click on background => close dialog
        let capture = new PointerCapture(bg);
        capture.beginCapture((e: InteractionEvent) => {
            e.stopPropagation();
            if (e.type == "pointerdown") {
                this.destroySelf();
            }
        });

        let settingsLayout: VLayoutContainer = new VLayoutContainer(18, Align.LEFT);

        let bind = (setting: Setting<boolean>, name: string) => {
            this.addObject(EternaViewOptionsDialog.createCheckbox(name, setting), settingsLayout);
        };

        bind(Eterna.settings.viewSettings.showNumbers, "Show nucleotides numbers (N)");
        bind(Eterna.settings.viewSettings.showLetters, "Show nucleotides letters");
        bind(Eterna.settings.viewSettings.displayFreeEnergies, "Display free energies for all structures (G)");
        bind(Eterna.settings.viewSettings.highlightRestricted, "Highlight restricted sequences");
        bind(Eterna.settings.viewSettings.autohideToolbar, "Autohide toolbar");
        bind(Eterna.settings.viewSettings.freezeButtonAlwaysVisible, "Freeze button always visible");

        if (this._optionsMode > EternaViewOptionsMode.PUZZLE) {
            bind(Eterna.settings.viewSettings.multipleFoldingEngines, "Multiple folding engines");
        }

        if (this._optionsMode >= EternaViewOptionsMode.LAB) {
            bind(Eterna.settings.viewSettings.useContinuousColors, "Use continuous colors for the exp. data (advanced)");
            bind(Eterna.settings.viewSettings.useExtendedColors, "Use extended 4-color scale for the exp. data (advanced)");
            bind(Eterna.settings.viewSettings.displayAuxInfo, "Display auxiliary information about RNAs");
        }

        let viewLayout: VLayoutContainer = new VLayoutContainer(22, Align.CENTER);
        viewLayout.addChild(settingsLayout);

        let ok_button: GameButton = new GameButton().label("Done", 14);
        this.addObject(ok_button, viewLayout);
        ok_button.clicked.connect(() => this.destroySelf());

        viewLayout.layout();

        let panel: GamePanel = new GamePanel(GamePanelType.NORMAL, 1, 0x152843, 0.27, 0xC0DCE7);
        panel.set_panel_title("Game options");
        panel.set_size(viewLayout.width + 40, viewLayout.height + 40 + panel.get_title_space());
        this.addObject(panel, this.container);
        DisplayUtil.positionRelativeToStage(panel.display, Align.CENTER, Align.CENTER, Align.CENTER, Align.CENTER);

        panel.display.interactive = true;

        this.container.addChild(viewLayout);
        DisplayUtil.positionRelative(
            viewLayout, Align.CENTER, Align.CENTER,
            panel.display, Align.CENTER, Align.CENTER, 0, panel.get_title_space() * 0.5);

        // this._numbermode_checkbox = new GameCheckbox(18, "Show nucleotides numbers (N)", options[0]);
        // this._numbermode_checkbox.set_pos(new UDim(0, 0, 20, height_walker));
        // this._numbermode_checkbox.set_check_callback(function (check: boolean): void {
        //     for (let ii: number = 0; ii < this._poses.length; ii++) {
        //         Pose2D(this._poses[ii]).set_show_numbering(check);
        //     }
        //     this.save_view_options();
        // });
        //
        // height_walker += 40;
        //
        // this._lettermode_checkbox = new GameCheckbox(18, "Show nucleotides letters", options[1]);
        // this._lettermode_checkbox.set_pos(new UDim(0, 0, 20, height_walker));
        // this._lettermode_checkbox.set_check_callback(function (check: boolean): void {
        //     for (let ii: number = 0; ii < this._poses.length; ii++) {
        //         Pose2D(this._poses[ii]).set_lettermode(check);
        //     }
        //     this.save_view_options();
        // });
        //
        // height_walker += 40;
        //
        // this._energy_display_checkbox = new GameCheckbox(18, "Display free energies for all structures (G)", options[4]);
        // this._energy_display_checkbox.set_pos(new UDim(0, 0, 20, height_walker));
        // this._energy_display_checkbox.set_check_callback(function (check: boolean): void {
        //     for (let ii: number = 0; ii < this._poses.length; ii++) {
        //         Pose2D(this._poses[ii]).set_display_score_texts(check);
        //     }
        //     this.save_view_options();
        // });
        //
        // height_walker += 40;

        // this._highlight_restricted_checkbox = new GameCheckbox(18, "Highlight restricted sequences", options[5]);
        // this._highlight_restricted_checkbox.set_pos(new UDim(0, 0, 20, height_walker));
        // this._highlight_restricted_checkbox.set_check_callback(function (check: boolean): void {
        //     for (let ii: number = 0; ii < this._poses.length; ii++) {
        //         Pose2D(this._poses[ii]).set_highlight_restricted(check);
        //     }
        //     this.save_view_options();
        // });
        //
        // height_walker += 40;

        // this._autohide_toolboar_checkbox = new GameCheckbox(18, "Autohide toolbar", options[11]);
        // this._autohide_toolboar_checkbox.set_pos(new UDim(0, 0, 20, height_walker));
        // this._autohide_toolboar_checkbox.set_check_callback(function (check: boolean): void {
        //     this._view.set_toolbar_autohide(check);
        //     this.save_view_options();
        // });
        //
        // height_walker += 40;

        // this._freeze_visible_checkbox = new GameCheckbox(18, "Freeze button always visible", options[12]);
        // this._freeze_visible_checkbox.set_pos(new UDim(0, 0, 20, height_walker));
        // this._freeze_visible_checkbox.set_check_callback(function (check: boolean): void {
        //     this.save_view_options();
        // });
        //
        // height_walker += 40;
        //
        // this._multi_engines_checkbox = new GameCheckbox(18, "Multiple folding engines", options[8]);
        // this._multi_engines_checkbox.set_pos(new UDim(0, 0, 20, height_walker));
        // this._multi_engines_checkbox.set_check_callback(function (check: boolean): void {
        //     this._view.set_multi_engines(check);
        //     this.save_view_options();
        // });
        //
        // height_walker += 40;

        // SoundManager.instance.get_mute_button().set_pos(new UDim(0, 1, 20, -85));
        // SoundManager.instance.get_volume_button(1).set_pos(new UDim(0, 1, 45, -82));
        // SoundManager.instance.get_volume_button(2).set_pos(new UDim(0, 1, 85, -82));
        // SoundManager.instance.get_volume_button(3).set_pos(new UDim(0, 1, 125, -82));
        // SoundManager.instance.get_volume_button(4).set_pos(new UDim(0, 1, 165, -82));
        // SoundManager.instance.get_volume_button(5).set_pos(new UDim(0, 1, 205, -82));
        //
        // this.add_object(SoundManager.instance.get_mute_button());
        // this.add_object(SoundManager.instance.get_volume_button(1));
        // this.add_object(SoundManager.instance.get_volume_button(2));
        // this.add_object(SoundManager.instance.get_volume_button(3));
        // this.add_object(SoundManager.instance.get_volume_button(4));
        // this.add_object(SoundManager.instance.get_volume_button(5));
    }

    private static createCheckbox(title: string, setting: Setting<boolean>): GameCheckbox {
        let checkbox: GameCheckbox = new GameCheckbox(18, title);
        checkbox.toggled.value = setting.value;
        checkbox.regs.add(setting.connect(checkbox.toggled.slot));
        checkbox.regs.add(checkbox.toggled.connect(setting.slot));
        return checkbox;
    }

    private readonly _optionsMode: EternaViewOptionsMode;
}
