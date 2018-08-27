import {Container, Graphics, Point, Sprite} from "pixi.js";
import {AppMode} from "../../../flashbang/core/AppMode";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {DisplayObjectPointerTarget} from "../../../flashbang/input/DisplayObjectPointerTarget";
import {IsLeftMouse} from "../../../flashbang/input/InputUtil";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {StyledTextBuilder} from "../../../flashbang/util/StyledTextBuilder";
import {EPars} from "../../EPars";
import {Bitmaps} from "../../resources/Bitmaps";
import {ConstraintBox} from "../../ui/ConstraintBox";
import {GameButton} from "../../ui/GameButton";
import {HTMLTextObject} from "../../ui/HTMLTextObject";
import {PoseThumbnail, PoseThumbnailType} from "../../ui/PoseThumbnail";
import {Fonts} from "../../util/Fonts";

export class MissionIntroMode extends AppMode {
    public constructor(puzzleName: string, puzzleDescription: string, puzzleThumbnails: number[][], constraintBoxes: ConstraintBox[]) {
        super();
        this._puzzleName = puzzleName;
        this._puzzleDescription = puzzleDescription;
        this._puzzleThumbnails = puzzleThumbnails;
        this._constraintBoxes = constraintBoxes;
    }

    protected setup(): void {
        super.setup();

        this._background = new Graphics();
        this.container.addChild(this._background);
        this.drawBackground();

        this._background.interactive = true;
        new DisplayObjectPointerTarget(this._background).pointerDown.filter(IsLeftMouse).connect(() => this.play());

        let moleculeImg: Sprite = Sprite.fromImage(Bitmaps.MissionBackgroundImage);
        this.container.addChild(moleculeImg);
        moleculeImg.position = new Point((Flashbang.stageWidth - moleculeImg.width) * 0.5, 0);

        let missionText = Fonts.std_light("MISSION", 48).color(0xFFCC00).build();
        this.container.addChild(missionText);
        missionText.position = new Point(
            (Flashbang.stageWidth * 0.5) - 420.5,
            123
        );

        const descriptionStyle = {
            fontFamily: Fonts.STDFONT_LIGHT,
            fill: 0xBCD8E3,
            fontSize: 36,
            leading: 50
        };
        let descriptionLabel = new StyledTextBuilder(descriptionStyle)
            .appendHTMLStyledText(this._puzzleDescription)
            .build();
        this.container.addChild(descriptionLabel);
        descriptionLabel.position = new Point(
            (Flashbang.stageWidth * 0.5) - 420.5,
            123 + missionText.height + 25
        );

        let playButton: GameButton = new GameButton()
            .up(Bitmaps.PlayImage)
            .over(Bitmaps.PlayImageOver)
            .down(Bitmaps.PlayImageHit);
        this.addObject(playButton, this.container);
        playButton.display.position = new Point(
            Flashbang.stageWidth - playButton.container.width - 91.5,
            Flashbang.stageHeight - 30 - playButton.container.height
        );
        this.regs.add(playButton.clicked.connect(() => this.play()));

        let bgImage: Sprite = Sprite.fromImage(Bitmaps.MissionPuzzleIdImage);
        this.container.addChild(bgImage);
        bgImage.position = new Point((Flashbang.stageWidth * 0.5) - 420.5, 0);

        let nameLabel = new HTMLTextObject(this._puzzleName)
            .font(Fonts.STDFONT_LIGHT)
            .fontSize(18)
            .color(0xffffff)
            .selectable(false)
            .maxWidth(Flashbang.stageWidth);
        this.addObject(nameLabel, this.container);

        const nameLabelXOffset = 15;
        nameLabel.display.position = new Point(
            (Flashbang.stageWidth * 0.5) - 420.5 + nameLabelXOffset,
            12
        );
        let real_width: number = nameLabel.width;
        if (bgImage) {
            bgImage.width = real_width + nameLabelXOffset * 2;
        }

        let goalsLabel = Fonts.std_light("GOAL", 24).color(0xffcc00).build();
        this.container.addChild(goalsLabel);
        goalsLabel.position = new Point(
            (Flashbang.stageWidth * 0.5) - 420.5,
            367 + 15
        );

        this._goalsBG = Sprite.fromImage(Bitmaps.MissionPuzzleThumbnailImage);
        this.container.addChild(this._goalsBG);
        this._goalsBG.position = new Point(
            (Flashbang.stageWidth * 0.5) - 420.5,
            367 + 60
        );

        this._goalsThumbnail = new Sprite();
        this.container.addChild(this._goalsThumbnail);
        this._goalsThumbnail.position = new Point(
            (Flashbang.stageWidth * 0.5) - 420.5 + 22.5,
            367 + 60 + 22.5
        );

        this._scrollUpButton = new GameButton().allStates(Bitmaps.ImgUpArrow).hotkey(KeyCode.ArrowUp);
        this._scrollUpButton.display.scale = new Point(0.15, 0.15);
        this._scrollUpButton.display.visible = false;
        this._scrollUpButton.display.position = new Point(
            (Flashbang.stageWidth * 0.5) + 420.5 - this._scrollUpButton.container.width - 30,
            367 + 40
        );
        this._scrollUpButton.clicked.connect(() => this.scrollUp());
        this.addObject(this._scrollUpButton, this.container);

        this._scrollDownButton = new GameButton().allStates(Bitmaps.ImgDownArrow).hotkey(KeyCode.ArrowDown);
        this._scrollDownButton.display.scale = new Point(0.15, 0.15);
        this._scrollDownButton.display.visible = false;
        this._scrollDownButton.display.position = new Point(
            (Flashbang.stageWidth * 0.5) + 420.5 - this._scrollDownButton.container.width - 30,
            Flashbang.stageHeight - 55 - playButton.container.height - this._scrollDownButton.container.height - 15
        );
        this._scrollDownButton.clicked.connect(() => this.scrollDown());
        this.addObject(this._scrollDownButton, this.container);

        this._constraintsLayer = new Container();
        this.container.addChild(this._constraintsLayer);
        this.setupConstraintScrollMask();

        this.addPuzzleThumbnails();
        this.addConstraintBoxes();
    }

    private addConstraintBoxes(): void {
        let yLoc: number = 367 + 60;
        for (let constraintBox of this._constraintBoxes) {
            this.addObject(constraintBox, this._constraintsLayer);

            constraintBox.show_big_text(false);
            constraintBox.flare(false);
            constraintBox.display.position = new Point(
                (Flashbang.stageWidth * 0.5) - 420.5 + this._goalsBG.width + 82,
                yLoc
            );
            yLoc += constraintBox.container.height + 10;
        }

        this._constraintsHeight = yLoc;
        this.updateConstraintScroll();
    }

    private addPuzzleThumbnails(): void {
        if (this._puzzleThumbnails.length > 1) {
            for (let ii: number = 0; ii < this._puzzleThumbnails.length; ++ii) {
                let thumbnailButton = new GameButton().label((ii + 1).toString(), 22);
                thumbnailButton.display.position = new Point(
                    (Flashbang.stageWidth * 0.5) - 420.5 + ii * (thumbnailButton.container.width + 20),
                    367 + 60 + this._goalsBG.height + 10
                );
                this.addObject(thumbnailButton, this.container);

                const set_hover_listener = (idx: number): void => {
                    thumbnailButton.pointerOver.connect(() => {
                        this.setPuzzleThumbnail(idx);
                    });
                };

                set_hover_listener(ii);
            }
        }

        this._curThumbnail = -1;
        this.setPuzzleThumbnail(0);
    }

    public onResized(): void {
        this.modeStack.changeMode(new MissionIntroMode(
            this._puzzleName, this._puzzleDescription, this._puzzleThumbnails, this._constraintBoxes));
    }

    private drawBackground(): void {
        this._background.clear();
        this._background.beginFill(0x000000);
        this._background.drawRect(0, 0, Flashbang.stageWidth, 367);
        this._background.endFill();

        this._background.beginFill(0x0A1E39, 0.95);
        this._background.drawRect(0, 367, Flashbang.stageWidth, Math.max(Flashbang.stageHeight - 367, 0));
        this._background.endFill();
    }

    private play(): void {
        this.modeStack.popMode();
    }

    private scrollUp(): void {
        this._constraintsLayer.y = Math.min(this._constraintsLayer.y + 10, 0);
    }

    private scrollDown(): void {
        let limit = -this._constraintsHeight + 367 + 60 + this._constraintBoxes[this._constraintBoxes.length - 1].container.height;
        this._constraintsLayer.y = Math.max(this._constraintsLayer.y - 10, limit);
    }

    private setPuzzleThumbnail(index: number): void {
        if (this._curThumbnail === index) {
            return;
        }
        this._curThumbnail = index;

        let target_pairs: number[] = this._puzzleThumbnails[index];
        let wrong_pairs: number[] = new Array(target_pairs.length);
        for (let ii = 0; ii < wrong_pairs.length; ii++) {
            wrong_pairs[ii] = -1;
        }
        let sequence: number[] = new Array(target_pairs.length);
        for (let ii = 0; ii < target_pairs.length; ii++) {
            sequence[ii] = EPars.RNABASE_ADENINE;
        }
        PoseThumbnail.drawToSprite(this._goalsThumbnail, sequence, target_pairs, 6, PoseThumbnailType.WRONG_COLORED, 0, wrong_pairs, false, 0);
    }

    private updateConstraintScroll(): void {
        const activate_scroll: boolean = this._constraintsHeight > Flashbang.stageHeight * 0.8;
        this._scrollUpButton.display.visible = activate_scroll;
        this._scrollDownButton.display.visible = activate_scroll;
    }

    private setupConstraintScrollMask(): void {
        if (this._constraintMask == null) {
            this._constraintMask = new Graphics();
            this.container.addChild(this._constraintMask);
        }

        let topY = this._scrollUpButton.display.y;
        let botY = this._scrollDownButton.display.y;

        this._constraintMask.clear();
        this._constraintMask.beginFill(0x00FF00, 0);
        this._constraintMask.drawRect(0, topY, Flashbang.stageWidth, botY + this._scrollDownButton.container.height - topY);
        this._constraintMask.x = 0;
        this._constraintMask.y = 0;
        this._constraintsLayer.mask = this._constraintMask;
    }

    private readonly _puzzleName: string;
    private readonly _puzzleDescription: string;
    private readonly _puzzleThumbnails: number[][];
    private readonly _constraintBoxes: ConstraintBox[];

    private _background: Graphics;

    private _goalsBG: Sprite;
    private _goalsThumbnail: Sprite;
    private _curThumbnail: number = 0;

    private _constraintsLayer: Container;
    private _constraintsHeight: number = 0.0;

    private _scrollUpButton: GameButton;
    private _scrollDownButton: GameButton;

    private _constraintMask: Graphics;
}
