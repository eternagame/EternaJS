import {Point, Graphics, interaction} from 'pixi.js';
import {
    VLayoutContainer, HAlign, Setting, HLayoutContainer, VAlign, DisplayUtil, Flashbang, Assert, MathUtil, InputUtil
} from 'flashbang';
import Eterna from 'eterna/Eterna';
import Bitmaps from 'eterna/resources/Bitmaps';
import Dialog from './Dialog';
import GameButton from './GameButton';
import GameCheckbox from './GameCheckbox';
import GamePanel, {GamePanelType} from './GamePanel';

export enum EternaViewOptionsMode {
    PUZZLE = 0, PUZZLEMAKER, LAB
}

export default class EternaViewOptionsDialog extends Dialog<void> {
    constructor(mode: EternaViewOptionsMode) {
        super();
        this._optionsMode = mode;
    }

    protected added(): void {
        super.added();

        const showShortcuts = !Eterna.MOBILE_APP;

        let settingsLayout: VLayoutContainer = new VLayoutContainer(15, HAlign.LEFT);

        let bind = (setting: Setting<boolean>, name: string) => {
            this.addObject(EternaViewOptionsDialog.createCheckbox(name, setting), settingsLayout);
        };

        bind(Eterna.settings.showNumbers, `Show nucleotide numbers${showShortcuts ? ' (N)' : ''}`);
        bind(Eterna.settings.showLetters, 'Show nucleotide letters');
        bind(Eterna.settings.displayFreeEnergies, `Display free energies for all structures${showShortcuts ? ' (G)' : ''}`);
        bind(Eterna.settings.highlightRestricted, 'Highlight restricted sequences');
        bind(Eterna.settings.showChat, 'In-game chat');
        bind(Eterna.settings.simpleGraphics, `Use simpler, less animated graphics${showShortcuts ? ' (,)' : ''}`);
        bind(Eterna.settings.usePuzzlerLayout, `Use clash-free layout for big structures${showShortcuts ? ' (L)' : ''}`);
        if (!Eterna.MOBILE_APP) {
            // NOTE(johannes): At the time of writing, auto-hide toolbar does not work with a touchscreen,
            // this option can be re-added once that works.
            bind(Eterna.settings.autohideToolbar, 'Autohide toolbar');
        }
        if (this._optionsMode !== EternaViewOptionsMode.PUZZLEMAKER) {
            bind(Eterna.settings.freezeButtonAlwaysVisible, 'Freeze button always visible');
        }

        if (this._optionsMode === EternaViewOptionsMode.LAB) {
            bind(Eterna.settings.useContinuousColors, 'Use continuous colors for the exp. data (advanced)');
            bind(Eterna.settings.useExtendedColors, 'Use extended 4-color scale for the exp. data (advanced)');
            bind(Eterna.settings.displayAuxInfo, 'Display auxiliary information about RNAs');
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
            Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
        });
        this.addObject(this._muteButton, soundButtonLayout);

        for (let ii = 0; ii < NUM_VOLUME_BUTTONS; ++ii) {
            let volumeButton = new GameButton().allStates(Bitmaps.Audio_Vol_On);
            volumeButton.display.scale = new Point(0.3, 0.3);
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

        this._viewLayout = new VLayoutContainer(22, HAlign.CENTER);
        this._viewLayout.addChild(settingsLayout);

        const okButtonGraphic = new Graphics()
            .beginFill(0x54B54E)
            .drawRoundedRect(0, 0, 170, 40, 10)
            .endFill();
        const okButton = new GameButton()
            .customStyleBox(okButtonGraphic)
            .label('Done', 14);
        this.addObject(okButton, this._viewLayout);
        okButton.clicked.connect(() => this.close(null));

        this._viewLayout.layout();

        this._panel = new GamePanel(GamePanelType.NORMAL, 1, 0x21508C, 1, 0x4A90E2);
        this._panel.title = 'Settings';
        this.addObject(this._panel, this.container);

        this.container.addChild(this._viewLayout);

        this._panelMask = new Graphics();
        this._panelMask.interactive = true;
        this._panel.container.addChild(this._panelMask);
        this._viewLayout.mask = this._panelMask;

        this._panelMask
            .on('pointerdown', this.maskPointerDown.bind(this))
            .on('pointerup', this.maskPointerUp.bind(this))
            .on('pointerupoutside', this.maskPointerUp.bind(this))
            .on('pointermove', this.maskPointerMove.bind(this));

        const closeButton = new GameButton()
            .allStates(Bitmaps.ImgAchievementsClose);
        this.addObject(closeButton, this.container);
        closeButton.clicked.connect(() => this.close(null));

        let updateLocation = () => {
            Assert.assertIsDefined(Flashbang.stageHeight);
            const idealHeight = this._viewLayout.height + 40 + this._panel.titleHeight;
            const maxHeight = Flashbang.stageHeight * 0.8;
            const panelHeight = Math.min(idealHeight, maxHeight);
            this._panel.setSize(this._viewLayout.width + 40, panelHeight);

            this._panelMask.clear();
            this._panelMask.beginFill(0x00FF00);
            this._panelMask.drawRect(
                0, this._panel.titleHeight, this._viewLayout.width + 40, panelHeight - this._panel.titleHeight
            );
            this._panelMask.endFill();

            DisplayUtil.positionRelativeToStage(
                this._panel.display,
                HAlign.CENTER, VAlign.CENTER,
                HAlign.CENTER, VAlign.CENTER
            );

            DisplayUtil.positionRelative(
                this._viewLayout, HAlign.CENTER, VAlign.TOP,
                this._panel.display, HAlign.CENTER, VAlign.TOP, 0, this._panel.titleHeight + 10
            );
            this._viewLayoutTop = this._viewLayout.y;

            DisplayUtil.positionRelative(
                closeButton.display, HAlign.RIGHT, VAlign.TOP,
                this._panel.display, HAlign.RIGHT, VAlign.TOP,
                -10, 11
            );
        };

        updateLocation();
        Assert.assertIsDefined(this._mode);
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

    private maskPointerDown(event: interaction.InteractionEvent) {
        this._dragging = true;
        this._dragPointData = event.data;
        this._dragStartBoxY = this._viewLayout.y;
        this._dragStartPointY = event.data.getLocalPosition(this._panelMask).y;
    }

    private maskPointerUp(event: interaction.InteractionEvent) {
        this._dragging = false;
        this._dragPointData = null;
        this._dragStartBoxY = 0;
        this._dragStartPointY = 0;
    }

    private maskPointerMove(event: interaction.InteractionEvent) {
        if (this._dragging) {
            Assert.assertIsDefined(this._dragPointData);
            const dragRange = this._dragPointData.getLocalPosition(this._panelMask).y - this._dragStartPointY;
            this.scrollTo(this._dragStartBoxY + dragRange);
        }
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        let pxdelta: number = InputUtil.scrollAmount(e, 13, this.display.height);
        this.scrollTo(this._viewLayout.y - pxdelta);

        return true;
    }

    public scrollTo(yPos: number) {
        const scrollHeight = this._panelMask.height;
        const containerHeight = this._viewLayout.height + 20; // Add a bit of margin
        if (containerHeight > scrollHeight) {
            this._viewLayout.y = MathUtil.clamp(
                yPos,
                this._viewLayoutTop - (containerHeight - scrollHeight),
                this._viewLayoutTop
            );
        }
    }

    private _panel: GamePanel;
    private _viewLayout: VLayoutContainer;
    private _viewLayoutTop: number;
    private _panelMask: Graphics;
    private readonly _optionsMode: EternaViewOptionsMode;
    private _muteButton: GameButton;
    private _volumeButtons: GameButton[] = [];

    private _dragging = false;
    private _dragPointData: interaction.InteractionData | null = null;
    private _dragStartPointY = 0;
    private _dragStartBoxY = 0;
}
