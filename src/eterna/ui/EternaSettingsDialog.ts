import {
    VLayoutContainer, HAlign, Setting, HLayoutContainer, Flashbang
} from 'flashbang';
import Eterna from 'eterna/Eterna';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameButton from './GameButton';
import GameCheckbox from './GameCheckbox';
import WindowDialog from './WindowDialog';

export enum EternaViewOptionsMode {
    PUZZLE = 0, PUZZLEMAKER, LAB
}

export default class EternaSettingsDialog extends WindowDialog<void> {
    constructor(mode: EternaViewOptionsMode) {
        super({title: 'Settings'});
        this._optionsMode = mode;
    }

    protected added(): void {
        super.added();

        const showShortcuts = !Eterna.MOBILE_APP;

        const settingsLayout: VLayoutContainer = new VLayoutContainer(15, HAlign.LEFT);

        const bind = (setting: Setting<boolean>, name: string) => {
            this.addObject(EternaSettingsDialog.createCheckbox(name, setting), settingsLayout);
        };

        bind(Eterna.settings.showNumbers, `Show nucleotide numbers${showShortcuts ? ' (N)' : ''}`);
        bind(Eterna.settings.showLetters, 'Show nucleotide letters');
        bind(
            Eterna.settings.displayFreeEnergies,
            `Display free energies for all structures${showShortcuts ? ' (G)' : ''}`
        );
        bind(Eterna.settings.highlightRestricted, 'Highlight restricted sequences');
        bind(Eterna.settings.showChat, 'In-game chat');
        bind(Eterna.settings.simpleGraphics, `Use simpler, less animated graphics${showShortcuts ? ' (,)' : ''}`);
        bind(
            Eterna.settings.usePuzzlerLayout,
            `Use clash-free layout for big structures${showShortcuts ? ' (L)' : ''}`
        );
        if (!Eterna.MOBILE_APP) {
            // NOTE(johannes): At the time of writing, auto-hide toolbar does not work with a touchscreen,
            // this option can be re-added once that works.
            bind(Eterna.settings.autohideToolbar, 'Autohide toolbar');
        }

        if (this._optionsMode === EternaViewOptionsMode.LAB) {
            bind(Eterna.settings.useContinuousColors, 'Use continuous colors for the exp. data (advanced)');
            bind(Eterna.settings.useExtendedColors, 'Use extended 4-color scale for the exp. data (advanced)');
        }

        const NUM_VOLUME_BUTTONS = 5;

        const soundButtonLayout = new HLayoutContainer(4);
        settingsLayout.addChild(soundButtonLayout);

        this._muteButton = new GameButton().allStates(Bitmaps.AudioNormal);
        this._muteButton.display.scale.set(0.7, 0.7);
        // Don't play the default button sound when the button is clicked -
        // we want to update the volume first, and *then* play the sound.
        this._muteButton.downSound = null;
        this._muteButton.clicked.connect(() => {
            this.setVolume(!Eterna.settings.soundMute.value, Eterna.settings.soundVolume.value);
            // Play the button-clicked sound after the volume has been adjusted.
            Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
        });
        this.addObject(this._muteButton, soundButtonLayout);

        for (let ii = 0; ii < NUM_VOLUME_BUTTONS; ++ii) {
            const volumeButton = new GameButton().allStates(Bitmaps.Audio_Vol_On);
            volumeButton.display.scale.set(0.3, 0.3);
            volumeButton.downSound = null;
            volumeButton.clicked.connect(() => {
                this.setVolume(false, (ii + 1) / NUM_VOLUME_BUTTONS);
                Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
            });
            this._volumeButtons.push(volumeButton);
            this.addObject(volumeButton, soundButtonLayout);
        }

        // This will update the sound buttons to their proper start states
        this.setVolume(Eterna.settings.soundMute.value, Eterna.settings.soundVolume.value);

        this._window.content.addChild(settingsLayout);
        settingsLayout.layout();
        this._window.layout();
    }

    private setVolume(mute: boolean, volume: number): void {
        Eterna.settings.soundMute.value = mute;
        Eterna.settings.soundVolume.value = volume;

        this._muteButton.allStates(mute ? Bitmaps.AudioMute : Bitmaps.AudioNormal);

        const numVolumeButtons = this._volumeButtons.length;
        for (let ii = 0; ii < numVolumeButtons; ++ii) {
            const volumeButton = this._volumeButtons[ii];
            const on = !mute && volume >= (ii + 1) / numVolumeButtons;
            volumeButton.allStates(on ? Bitmaps.Audio_Vol_On : Bitmaps.Audio_Vol_Off);
        }
    }

    private static createCheckbox(title: string, setting: Setting<boolean>): GameCheckbox {
        const checkbox = new GameCheckbox(18, title);
        checkbox.toggled.value = setting.value;
        checkbox.regs.add(setting.connect(checkbox.toggled.slot));
        checkbox.regs.add(checkbox.toggled.connect(setting.slot));
        return checkbox;
    }

    private readonly _optionsMode: EternaViewOptionsMode;
    private _muteButton: GameButton;
    private _volumeButtons: GameButton[] = [];
}
