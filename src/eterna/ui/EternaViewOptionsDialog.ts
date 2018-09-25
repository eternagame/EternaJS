import {Point} from "pixi.js";
import {HAlign, VAlign} from "../../flashbang/core/Align";
import {HLayoutContainer} from "../../flashbang/layout/HLayoutContainer";
import {VLayoutContainer} from "../../flashbang/layout/VLayoutContainer";
import {Setting} from "../../flashbang/settings/Setting";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Eterna} from "../Eterna";
import {Bitmaps} from "../resources/Bitmaps";
import {Dialog} from "./Dialog";
import {GameButton} from "./GameButton";
import {GameCheckbox} from "./GameCheckbox";
import {GamePanel, GamePanelType} from "./GamePanel";

export enum EternaViewOptionsMode {
    PUZZLE = 0, PUZZLEMAKER, LAB
}

export class EternaViewOptionsDialog extends Dialog<void> {
    public constructor(mode: EternaViewOptionsMode) {
        super();
        this._optionsMode = mode;
    }

    protected added(): void {
        super.added();

        let settingsLayout: VLayoutContainer = new VLayoutContainer(18, HAlign.LEFT);

        let bind = (setting: Setting<boolean>, name: string) => {
            this.addObject(EternaViewOptionsDialog.createCheckbox(name, setting), settingsLayout);
        };

        bind(Eterna.settings.showNumbers, "Show nucleotides numbers (N)");
        bind(Eterna.settings.showLetters, "Show nucleotides letters");
        bind(Eterna.settings.displayFreeEnergies, "Display free energies for all structures (G)");
        bind(Eterna.settings.highlightRestricted, "Highlight restricted sequences");
        bind(Eterna.settings.showChat, "In-game chat");

        if (this._optionsMode !== EternaViewOptionsMode.PUZZLEMAKER) {
            bind(Eterna.settings.autohideToolbar, "Autohide toolbar");
            bind(Eterna.settings.freezeButtonAlwaysVisible, "Freeze button always visible");
        }

        if (this._optionsMode !== EternaViewOptionsMode.PUZZLE) {
            bind(Eterna.settings.multipleFoldingEngines, "Multiple folding engines");
        }

        if (this._optionsMode === EternaViewOptionsMode.LAB) {
            bind(Eterna.settings.useContinuousColors, "Use continuous colors for the exp. data (advanced)");
            bind(Eterna.settings.useExtendedColors, "Use extended 4-color scale for the exp. data (advanced)");
            bind(Eterna.settings.displayAuxInfo, "Display auxiliary information about RNAs");
        }

        const NUM_VOLUME_BUTTONS = 5;

        let soundButtonLayout = new HLayoutContainer(4);
        settingsLayout.addChild(soundButtonLayout);

        this._muteButton = new GameButton().allStates(Bitmaps.AudioNormal);
        this._muteButton.display.scale = new Point(0.7, 0.7);
        // Don't play the default button sound when the button is clicked -
        // we want to update the volume first, and *then* play the sound.
        this._muteButton.downSound = null;
        this._muteButton.clicked.connect(() => {
            this.setVolume(!Eterna.settings.soundMute.value, Eterna.settings.soundVolume.value);
            // Play the button-clicked sound after the volume has been adjusted.
            Eterna.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
        });
        this.addObject(this._muteButton, soundButtonLayout);

        for (let ii = 0; ii < NUM_VOLUME_BUTTONS; ++ii) {
            let volumeButton = new GameButton().allStates(Bitmaps.Audio_Vol_On);
            volumeButton.display.scale = new Point(0.3, 0.3);
            volumeButton.downSound = null;
            volumeButton.clicked.connect(() => {
                this.setVolume(false, (ii + 1) / NUM_VOLUME_BUTTONS);
                Eterna.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
            });
            this._volumeButtons.push(volumeButton);
            this.addObject(volumeButton, soundButtonLayout);
        }

        // This will update the sound buttons to their proper start states
        this.setVolume(Eterna.settings.soundMute.value, Eterna.settings.soundVolume.value);

        let viewLayout = new VLayoutContainer(22, HAlign.CENTER);
        viewLayout.addChild(settingsLayout);

        let okButton: GameButton = new GameButton().label("Done", 14);
        this.addObject(okButton, viewLayout);
        okButton.clicked.connect(() => this.close(null));

        viewLayout.layout();

        let panel = new GamePanel(GamePanelType.NORMAL, 1, 0x152843, 0.27, 0xC0DCE7);
        panel.title  = "Game options";
        panel.setSize(viewLayout.width + 40, viewLayout.height + 40 + panel.titleHeight);
        this.addObject(panel, this.container);

        panel.display.interactive = true;

        this.container.addChild(viewLayout);

        let updateLocation = () => {
            DisplayUtil.positionRelativeToStage(
                panel.display,
                HAlign.CENTER, VAlign.CENTER,
                HAlign.CENTER, VAlign.CENTER);

            DisplayUtil.positionRelative(
                viewLayout, HAlign.CENTER, VAlign.CENTER,
                panel.display, HAlign.CENTER, VAlign.CENTER, 0, panel.titleHeight * 0.5
            );
        };

        updateLocation();
        this.regs.add(this._mode.resized.connect(updateLocation));
    }

    protected onBGClicked(): void {
        this.close(null);
    }

    protected get bgAlpha(): number {
        return 0.3;
    }

    private setVolume(mute: boolean, volume: number): void {
        Eterna.settings.soundMute.value = mute;
        Eterna.settings.soundVolume.value = volume;

        this._muteButton.allStates(mute ? Bitmaps.AudioMute : Bitmaps.AudioNormal);

        let numVolumeButtons = this._volumeButtons.length;
        for (let ii = 0; ii < numVolumeButtons; ++ii) {
            let volumeButton = this._volumeButtons[ii];
            let on = !mute && volume >= (ii + 1) / numVolumeButtons;
            volumeButton.allStates(on ? Bitmaps.Audio_Vol_On : Bitmaps.Audio_Vol_Off);
        }
    }

    private static createCheckbox(title: string, setting: Setting<boolean>): GameCheckbox {
        let checkbox = new GameCheckbox(18, title);
        checkbox.toggled.value = setting.value;
        checkbox.regs.add(setting.connect(checkbox.toggled.slot));
        checkbox.regs.add(checkbox.toggled.connect(setting.slot));
        return checkbox;
    }

    private readonly _optionsMode: EternaViewOptionsMode;
    private _muteButton: GameButton;
    private _volumeButtons: GameButton[] = [];
}
