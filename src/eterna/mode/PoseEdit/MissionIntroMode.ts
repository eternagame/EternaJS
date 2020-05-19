import {
    Graphics, Point, Sprite
} from 'pixi.js';
import Eterna from 'eterna/Eterna';
import {
    AppMode, Flashbang, InputUtil, DisplayObjectPointerTarget
} from 'flashbang';
import ConstraintBox from 'eterna/constraints/ConstraintBox';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import GameButton from 'eterna/ui/GameButton';
import HTMLTextObject from 'eterna/ui/HTMLTextObject';
import EternaURL from 'eterna/net/EternaURL';
import BitmapManager from 'eterna/resources/BitmapManager';
import MissionIntroPanel from 'eterna/ui/MissionIntroPanel';
import UITheme from 'eterna/ui/UITheme';

export default class MissionIntroMode extends AppMode {
    constructor(
        puzzleName: string, puzzleDescription: string, puzzleThumbnails: number[][], constraintBoxes: ConstraintBox[],
        customLayout?: Array<[number, number]>
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

        // Background
        const background = new Graphics();
        this.container.addChild(background);

        new DisplayObjectPointerTarget(background)
            .pointerDown.filter(InputUtil.IsLeftMouse)
            .connect(() => this.play());

        const playButton = new GameButton()
            .up(Bitmaps.PlayImage)
            .over(Bitmaps.PlayImageOver)
            .down(Bitmaps.PlayImageHit);
        this.addObject(playButton, this.container);
        this.regs.add(playButton.clicked.connect(() => this.play()));

        const homeButton = new GameButton()
            .up(Bitmaps.ImgHome)
            .over(Bitmaps.ImgHome)
            .down(Bitmaps.ImgHome);
        homeButton.display.position = new Point(18, 10);
        homeButton.clicked.connect(() => {
            window.location.href = EternaURL.createURL({page: 'lab_bench'});
        });
        this.addObject(homeButton, this.container);

        const homeArrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgHomeArrow));
        homeArrow.position = new Point(45, 14);
        this.container.addChild(homeArrow);

        const nameLabel = new HTMLTextObject(this._puzzleName)
            .font(Fonts.STDFONT_BOLD)
            .fontSize(14)
            .color(0xC0DCE7)
            .selectable(false)
            .maxWidth(Flashbang.stageWidth);
        this.addObject(nameLabel, this.container);
        nameLabel.display.position = new Point(57, 8);

        this.addObject(
            new MissionIntroPanel({
                description: this._puzzleDescription,
                puzzleThumbnails: this._puzzleThumbnails,
                constraints: this._constraintBoxes,
                customLayout: this._customLayout
            }),
            this.container
        );

        const updateLayout = () => {
            const {headerHeight} = UITheme.missionIntro;

            // draw background
            background.clear();
            background.beginFill(0x101010, 0.95);
            background.drawRect(0, 0, Flashbang.stageWidth, headerHeight);
            background.endFill();

            background.beginFill(0x05224B, 0.95);
            background.drawRect(
                0,
                headerHeight,
                Flashbang.stageWidth,
                Math.max(Flashbang.stageHeight - headerHeight, 0)
            );
            background.endFill();

            playButton.display.position = new Point(
                Flashbang.stageWidth - playButton.container.width - 27,
                Flashbang.stageHeight - 27 - playButton.container.height
            );
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

    private play(): void {
        if (!this._closed) {
            this._closed = true;
            this.modeStack.popMode();
        }
    }

    private readonly _puzzleName: string;
    private readonly _puzzleDescription: string;
    private readonly _puzzleThumbnails: number[][];
    private readonly _constraintBoxes: ConstraintBox[];

    private _closed: boolean = false;

    private _customLayout?: Array<[number, number]>;
}
