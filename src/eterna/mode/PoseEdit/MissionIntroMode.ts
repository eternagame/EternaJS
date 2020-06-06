import {
    Container, Graphics, Point, Sprite
} from 'pixi.js';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import {
    AppMode, DisplayObjectPointerTarget, InputUtil, StyledTextBuilder, Flashbang, DisplayUtil, KeyCode, Assert
} from 'flashbang';
import ConstraintBox from 'eterna/constraints/ConstraintBox';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import GameButton from 'eterna/ui/GameButton';
import HTMLTextObject from 'eterna/ui/HTMLTextObject';
import PoseThumbnail, {PoseThumbnailType} from 'eterna/ui/PoseThumbnail';

export default class MissionIntroMode extends AppMode {
    private get constraintAreaSize() {
        return this._scrollDownButton.container.y
            + this._scrollDownButton.container.height
            - this._scrollUpButton.container.y;
    }

    constructor(
        puzzleName: string, puzzleDescription: string, puzzleThumbnails: number[][], constraintBoxes: ConstraintBox[],
        customLayout: Array<[number, number] | [null, null]> | null = null
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
        Assert.assertIsDefined(this.container);
        
        let background = new Graphics();
        this.container.addChild(background);

        new DisplayObjectPointerTarget(background).pointerDown.filter(InputUtil.IsLeftMouse).connect(() => this.play());

        let moleculeImg = Sprite.fromImage(Bitmaps.MissionBackgroundImage);
        this.container.addChild(moleculeImg);

        let missionText = Fonts.stdLight('MISSION', 48).color(0xFFCC00).build();
        this.container.addChild(missionText);

        let descriptionLabel = new StyledTextBuilder({
            fontFamily: Fonts.STDFONT_LIGHT,
            fill: 0xBCD8E3,
            fontSize: 36,
            leading: 50,
            wordWrap: true,
            wordWrapWidth: 880
        })
            .appendHTMLStyledText(this._puzzleDescription)
            .build();
        this.container.addChild(descriptionLabel);


        let playButton = new GameButton()
            .up(Bitmaps.PlayImage)
            .over(Bitmaps.PlayImageOver)
            .down(Bitmaps.PlayImageHit);
        this.addObject(playButton, this.container);
        
        Assert.assertIsDefined(this.regs);
        this.regs.add(playButton.clicked.connect(() => this.play()));

        let bgImage = Sprite.fromImage(Bitmaps.MissionPuzzleIdImage);
        this.container.addChild(bgImage);

        Assert.assertIsDefined(Flashbang.stageWidth);
        let nameLabel = new HTMLTextObject(this._puzzleName)
            .font(Fonts.STDFONT_LIGHT)
            .fontSize(18)
            .color(0xffffff)
            .selectable(false)
            .maxWidth(Flashbang.stageWidth);
        this.addObject(nameLabel, this.container);

        let goalsLabel = Fonts.stdLight('GOAL', 24).color(0xffcc00).build();
        this.container.addChild(goalsLabel);

        this._goalsBG = Sprite.fromImage(Bitmaps.MissionPuzzleThumbnailImage);
        this.container.addChild(this._goalsBG);

        this._goalsThumbnail = new Sprite();
        this.container.addChild(this._goalsThumbnail);

        this._scrollUpButton = new GameButton().allStates(Bitmaps.ImgUpArrow).hotkey(KeyCode.ArrowUp);
        this._scrollUpButton.display.scale = new Point(0.15, 0.15);
        this._scrollUpButton.display.visible = false;
        this._scrollUpButton.clicked.connect(() => this.scrollUp());
        this.addObject(this._scrollUpButton, this.container);

        this._scrollDownButton = new GameButton().allStates(Bitmaps.ImgDownArrow).hotkey(KeyCode.ArrowDown);
        this._scrollDownButton.display.scale = new Point(0.15, 0.15);
        this._scrollDownButton.display.visible = false;
        this._scrollDownButton.clicked.connect(() => this.scrollDown());
        this.addObject(this._scrollDownButton, this.container);

        this._constraintsLayer = new Container();
        this.container.addChild(this._constraintsLayer);

        let updateLayout = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            // draw background
            background.clear();
            background.beginFill(0x000000);
            background.drawRect(0, 0, Flashbang.stageWidth, 367);
            background.endFill();

            background.beginFill(0x0A1E39, 0.95);
            background.drawRect(0, 367, Flashbang.stageWidth, Math.max(Flashbang.stageHeight - 367, 0));
            background.endFill();

            // layout objects
            moleculeImg.position = new Point((Flashbang.stageWidth - moleculeImg.width) * 0.5, 0);

            missionText.position = new Point(
                (Flashbang.stageWidth * 0.5) - 420.5,
                123
            );

            descriptionLabel.position = new Point(
                (Flashbang.stageWidth * 0.5) - 420.5,
                123 + missionText.height + 25
            );

            playButton.display.position = new Point(
                Flashbang.stageWidth - playButton.container.width - 91.5,
                Flashbang.stageHeight - 30 - playButton.container.height
            );

            bgImage.position = new Point((Flashbang.stageWidth * 0.5) - 420.5, 0);

            const nameLabelXOffset = 15;
            nameLabel.display.position = new Point(
                (Flashbang.stageWidth * 0.5) - 420.5 + nameLabelXOffset,
                12
            );
            bgImage.width = nameLabel.width + nameLabelXOffset * 2;

            goalsLabel.position = new Point(
                (Flashbang.stageWidth * 0.5) - 420.5,
                367 + 15
            );

            this._goalsBG.position = new Point(
                (Flashbang.stageWidth * 0.5) - 420.5,
                367 + 60
            );

            this._goalsThumbnail.position = new Point(
                (Flashbang.stageWidth * 0.5) - 420.5 + 22.5,
                367 + 60 + 22.5
            );

            this._scrollUpButton.display.position = new Point(
                (Flashbang.stageWidth * 0.5) + 420.5 - this._scrollUpButton.container.width - 30,
                367 + 60
            );

            this._scrollDownButton.display.position = new Point(
                (Flashbang.stageWidth * 0.5) + 420.5 - this._scrollDownButton.container.width - 30,
                Flashbang.stageHeight - 55 - playButton.container.height - this._scrollDownButton.container.height - 15
            );

            this.setupConstraintScrollMask();
        };
        updateLayout();
        this.resized.connect(updateLayout);

        this.addPuzzleThumbnails();
        this.addConstraintBoxes();
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
            this.addObject(constraintBox, this._constraintsLayer);
            constraintBox.flare(false);
        }

        const updateLayout = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            const spacing = 10;
            const constraintStart = this._scrollUpButton.container.y;
            let yLoc = constraintStart;
            for (let constraintBox of this._constraintBoxes) {
                let bounds = constraintBox.container.getLocalBounds();
                constraintBox.display.position = new Point(
                    (Flashbang.stageWidth * 0.5) - 420.5 + this._goalsBG.width + 82,
                    yLoc
                );
                yLoc += bounds.height + spacing;
            }
            this._constraintsHeight = yLoc - constraintStart - spacing;

            const activateScroll = this._constraintsHeight > this.constraintAreaSize;
            this._scrollUpButton.display.visible = activateScroll;
            this._scrollDownButton.display.visible = activateScroll;
        };

        updateLayout();
        this.resized.connect(updateLayout);
    }

    private addPuzzleThumbnails(): void {
        let thumbnailButtons: GameButton[] = [];

        if (this._puzzleThumbnails.length > 1) {
            for (let ii = 0; ii < this._puzzleThumbnails.length; ++ii) {
                let thumbnailButton = new GameButton().label((ii + 1).toString(), 22);
                thumbnailButtons.push(thumbnailButton);
                this.addObject(thumbnailButton, this.container);

                thumbnailButton.pointerOver.connect(() => {
                    this.setPuzzleThumbnail(ii);
                });
            }
        }

        this._curThumbnail = -1;
        this.setPuzzleThumbnail(0);

        const updateLayout = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);

            for (let ii = 0; ii < thumbnailButtons.length; ++ii) {
                let button = thumbnailButtons[ii];
                button.display.position = new Point(
                    (Flashbang.stageWidth * 0.5) - 420.5 + ii * (button.container.width + 20),
                    367 + 60 + this._goalsBG.height + 10
                );
            }
        };
        updateLayout();
        this.resized.connect(updateLayout);
    }

    private play(): void {
        if (!this._closed) {
            this._closed = true;
            Assert.assertIsDefined(this.modeStack);
            this.modeStack.popMode();
        }
    }

    private scrollUp(): void {
        this._constraintsLayer.y = Math.min(this._constraintsLayer.y + 10, 0);
    }

    private scrollDown(): void {
        let limit = -this._constraintsHeight + this.constraintAreaSize;
        this._constraintsLayer.y = Math.max(this._constraintsLayer.y - 10, limit);
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
        DisplayUtil.center(this._goalsThumbnail, this._goalsBG);
    }

    private setupConstraintScrollMask(): void {
        if (this._constraintMask == null) {
            this._constraintMask = new Graphics();
            Assert.assertIsDefined(this.container);
            this.container.addChild(this._constraintMask);
        }

        Assert.assertIsDefined(Flashbang.stageWidth);

        this._constraintMask.clear();
        this._constraintMask.beginFill(0x00FF00, 0);
        this._constraintMask.drawRect(
            0, this._scrollUpButton.display.y, Flashbang.stageWidth, this.constraintAreaSize
        );
        this._constraintMask.x = 0;
        this._constraintMask.y = 0;
        this._constraintsLayer.mask = this._constraintMask;
    }

    private readonly _puzzleName: string;
    private readonly _puzzleDescription: string;
    private readonly _puzzleThumbnails: number[][];
    private readonly _constraintBoxes: ConstraintBox[];

    private _closed: boolean = false;

    private _goalsBG: Sprite;
    private _goalsThumbnail: Sprite;
    private _curThumbnail: number = 0;

    private _constraintsLayer: Container;
    private _constraintsHeight: number = 0;

    private _scrollUpButton: GameButton;
    private _scrollDownButton: GameButton;

    private _constraintMask: Graphics;

    private _customLayout: Array<[number, number] | [null, null]> | null;
}
