import {
    Container, Graphics, Point, Sprite
} from 'pixi.js';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import {
    AppMode, DisplayObjectPointerTarget, InputUtil, StyledTextBuilder, Flashbang, DisplayUtil, KeyCode
} from 'flashbang';
import ConstraintBox from 'eterna/constraints/ConstraintBox';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import GameButton from 'eterna/ui/GameButton';
import PoseThumbnail, {PoseThumbnailType} from 'eterna/ui/PoseThumbnail';
import GamePanel, {GamePanelType} from 'eterna/ui/GamePanel';

export default class MissionIntroMode extends AppMode {
    constructor(
        puzzleName: string, puzzleDescription: string, puzzleThumbnails: number[][], constraintBoxes: ConstraintBox[],
        customLayout: Array<[number, number]> = null
    ) {
        super();
        this._puzzleName = puzzleName;
        this._puzzleDescription = puzzleDescription;
        this._puzzleThumbnails = puzzleThumbnails;
        this._constraintBoxes = constraintBoxes;
        this._customLayout = customLayout;
    }

    protected setup(): void {
        super.setup();

        let background = new Graphics();
        this.container.addChild(background);

        this._panel = new GamePanel(GamePanelType.NORMAL, 1.0, 0x21508C, 1.0, 0x4A90E2);
        this._panel.title = 'YOUR MISSION';
        this.container.addChild(this._panel.display);

        this._scrollLayer = new Container();
        this._panel.container.addChild(this._scrollLayer);

        new DisplayObjectPointerTarget(background).pointerDown.filter(InputUtil.IsLeftMouse).connect(() => this.play());

        const descriptionStyle = {
            fontFamily: Fonts.STDFONT_REGULAR,
            fill: 0xBCD8E3,
            fontSize: 14,
            leading: 50
        };
        let descriptionLabel = new StyledTextBuilder(descriptionStyle)
            .appendHTMLStyledText(this._puzzleDescription)
            .build();
        this._scrollLayer.addChild(descriptionLabel);

        let playButton = new GameButton()
            .up(Bitmaps.PlayImage)
            .over(Bitmaps.PlayImageOver)
            .down(Bitmaps.PlayImageHit);
        this.addObject(playButton, this._panel.container);
        this.regs.add(playButton.clicked.connect(() => this.play()));

        this._goalsThumbnail = new Sprite();
        this._goalsThumbnail.scale = new Point(0.5, 0.5);
        this._scrollLayer.addChild(this._goalsThumbnail);

        this._scrollUpButton = new GameButton().allStates(Bitmaps.ImgUpArrow).hotkey(KeyCode.ArrowUp);
        this._scrollUpButton.display.scale = new Point(0.15, 0.15);
        this._scrollUpButton.display.visible = false;
        this._scrollUpButton.clicked.connect(() => this.scrollUp());
        this.addObject(this._scrollUpButton, this._panel.container);

        this._scrollDownButton = new GameButton().allStates(Bitmaps.ImgDownArrow).hotkey(KeyCode.ArrowDown);
        this._scrollDownButton.display.scale = new Point(0.15, 0.15);
        this._scrollDownButton.display.visible = false;
        this._scrollDownButton.clicked.connect(() => this.scrollDown());
        this.addObject(this._scrollDownButton, this._panel.container);

        this.addPuzzleThumbnails();
        this.addConstraintBoxes();

        let updateLayout = () => {
            // draw background
            background.clear();
            background.beginFill(0x000000, 0.75);
            background.drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight);
            background.endFill();

            // layout objects
            const margin = 10;
            const panelWidth = 314;
            let panelY = this._panel.titleHeight + margin;

            descriptionLabel.position = new Point(
                (panelWidth - descriptionLabel.width) / 2,
                panelY
            );
            panelY += descriptionLabel.height + margin;

            const thumbnailBounds = this._goalsThumbnail.getBounds();
            this._goalsThumbnail.position = new Point(
                (panelWidth - thumbnailBounds.width) / 2,
                panelY
            );
            panelY += thumbnailBounds.height + margin;

            panelY = this.updateThumbnailButtons(panelWidth, panelY, margin);

            panelY = this.updateConstraintBoxes(panelWidth, panelY, margin);

            this._scrollHeight = panelY;

            // NOTE(johannes): Add 1 at the end to stop activateScroll to accidentally be true
            const panelFullSize = (this._scrollHeight + playButton.display.height + margin * 2) + 1;

            this._panel.setSize(panelWidth, Math.min(panelFullSize, Flashbang.stageHeight * 0.8, 400));
            this._panel.display.position = new Point(
                (Flashbang.stageWidth - this._panel.width) / 2,
                (Flashbang.stageHeight - this._panel.height) / 2
            );

            playButton.display.position = new Point(
                (panelWidth - playButton.display.width) / 2,
                this._panel.height - playButton.display.height - margin
            );

            this._panelContainHeight = playButton.display.y - margin;

            const activateScroll = this._scrollHeight > this._panelContainHeight;
            this._scrollUpButton.display.visible = activateScroll;
            this._scrollDownButton.display.visible = activateScroll;

            this._scrollUpButton.display.position = new Point(
                this._panel.width + margin,
                this._panel.titleHeight + margin
            );

            this._scrollDownButton.display.position = new Point(
                this._panel.width + margin,
                this._panelContainHeight - this._scrollDownButton.container.height - margin
            );

            this.setupScrollMask();
        };
        updateLayout();
        this.resized.connect(updateLayout);
    }

    protected enter(): void {
        super.enter();
        Eterna.chat.pushHideChat();
    }

    protected exit(): void {
        Eterna.chat.popHideChat();
        super.exit();
    }

    private addConstraintBoxes(): void {
        for (let constraintBox of this._constraintBoxes) {
            this.addObject(constraintBox, this._scrollLayer);
            constraintBox.flare(false);
        }
    }

    private updateConstraintBoxes(panelWidth: number, panelY: number, margin: number): number {
        for (let constraintBox of this._constraintBoxes) {
            let bounds = constraintBox.container.getLocalBounds();
            constraintBox.display.position = new Point(
                margin,
                -bounds.top + panelY
            );
            constraintBox.display.width = panelWidth - margin * 2;
            panelY += bounds.height + margin;
        }
        return panelY;
    }

    private addPuzzleThumbnails(): void {
        this._thumbnailButtons = [];

        if (this._puzzleThumbnails.length > 1) {
            for (let ii = 0; ii < this._puzzleThumbnails.length; ++ii) {
                let thumbnailButton = new GameButton().label((ii + 1).toString(), 22);
                this._thumbnailButtons.push(thumbnailButton);
                this.addObject(thumbnailButton, this._scrollLayer);

                thumbnailButton.pointerOver.connect(() => {
                    this.setPuzzleThumbnail(ii);
                });
            }
        }

        this._curThumbnail = -1;
        this.setPuzzleThumbnail(0);
    }

    private updateThumbnailButtons(panelWidth: number, panelY: number, margin: number): number {
        const buttonCount = this._thumbnailButtons.length;
        if (buttonCount > 0) {
            const buttonWidth = this._thumbnailButtons[0].display.width;
            const buttonHeight = this._thumbnailButtons[0].display.height;
            const totalButtonWidth = buttonWidth * buttonCount + 20 * (buttonCount - 1);
            for (let ii = 0; ii < buttonCount; ++ii) {
                let button = this._thumbnailButtons[ii];
                button.display.position = new Point(
                    ((panelWidth - totalButtonWidth) / 2) + ii * (buttonWidth + 20),
                    panelY
                );
            }
            panelY += buttonHeight + margin;
        }
        return panelY;
    }

    private play(): void {
        if (!this._closed) {
            this._closed = true;
            this.modeStack.popMode();
        }
    }

    private scrollUp(): void {
        this._scrollLayer.y = Math.min(this._scrollLayer.y + 10, 0);
    }

    private scrollDown(): void {
        const limit = -(this._scrollHeight - this._panelContainHeight);
        this._scrollLayer.y = Math.max(this._scrollLayer.y - 10, limit);
    }

    private setPuzzleThumbnail(index: number): void {
        if (this._curThumbnail === index) {
            return;
        }
        this._curThumbnail = index;

        let targetPairs: number[] = this._puzzleThumbnails[index];
        let wrongPairs: number[] = new Array(targetPairs.length);
        for (let ii = 0; ii < wrongPairs.length; ii++) {
            wrongPairs[ii] = -1;
        }
        let sequence: number[] = new Array(targetPairs.length);
        for (let ii = 0; ii < targetPairs.length; ii++) {
            sequence[ii] = EPars.RNABASE_ADENINE;
        }
        PoseThumbnail.drawToSprite(
            this._goalsThumbnail, sequence, targetPairs, 6, PoseThumbnailType.WRONG_COLORED, 0, wrongPairs, false, 0,
            this._customLayout
        );
    }

    private setupScrollMask(): void {
        if (this._scrollMask == null) {
            this._scrollMask = new Graphics();
            this._panel.container.addChild(this._scrollMask);
        }

        let topY = this._panel.titleHeight;
        let botY = this._panelContainHeight;

        this._scrollMask.clear();
        this._scrollMask.beginFill(0x00FF00, 0);
        this._scrollMask.drawRect(
            0, topY, this._panel.width, botY - topY
        );
        this._scrollMask.x = 0;
        this._scrollMask.y = 0;
        this._scrollLayer.mask = this._scrollMask;
    }

    private readonly _puzzleName: string;
    private readonly _puzzleDescription: string;
    private readonly _puzzleThumbnails: number[][];
    private readonly _constraintBoxes: ConstraintBox[];

    private _closed: boolean = false;

    private _panel: GamePanel;
    private _panelContainHeight: number;
    private _goalsThumbnail: Sprite;
    private _thumbnailButtons: GameButton[];
    private _curThumbnail: number = 0;

    private _scrollLayer: Container;
    private _scrollHeight: number = 0;

    private _scrollUpButton: GameButton;
    private _scrollDownButton: GameButton;

    private _scrollMask: Graphics;

    private _customLayout: Array<[number, number]>;
}
