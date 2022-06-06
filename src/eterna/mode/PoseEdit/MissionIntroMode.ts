import {
    Graphics, Sprite
} from 'pixi.js';
import Eterna from 'eterna/Eterna';
import {
    AppMode, Flashbang, InputUtil, DisplayObjectPointerTarget, Assert
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
import SecStruct from 'eterna/rnatypes/SecStruct';

export default class MissionIntroMode extends AppMode {
    constructor(
        puzzleName: string, puzzleDescription: string, puzzleThumbnails: SecStruct[], constraintBoxes: ConstraintBox[],
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

        // Background
        const background = new Graphics();
        this.container.addChild(background);

        new DisplayObjectPointerTarget(background)
            .pointerDown.filter(InputUtil.IsLeftMouse)
            .connect(() => this.play());
        background.interactive = true;

        const playButtonBg = new Graphics()
            .beginFill(0x54B54E)
            .drawRoundedRect(0, 0, 120, 36, 10)
            .endFill();
        const playButton = new GameButton()
            .customStyleBox(playButtonBg)
            .label('PLAY', 16);

        this.addObject(playButton, this.container);

        Assert.assertIsDefined(this.regs);
        this.regs.add(playButton.clicked.connect(() => this.play()));

        const homeButton = new GameButton()
            .up(Bitmaps.ImgHome)
            .over(Bitmaps.ImgHome)
            .down(Bitmaps.ImgHome);
        homeButton.display.position.set(18, 10);
        homeButton.clicked.connect(() => {
            if (Eterna.MOBILE_APP) {
                Assert.assertIsDefined(window.frameElement);
                window.frameElement.dispatchEvent(new CustomEvent('navigate', {detail: '/'}));
            } else {
                window.location.href = EternaURL.createURL({page: 'home'});
            }
        });
        this.addObject(homeButton, this.container);

        const homeArrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgHomeArrow));
        homeArrow.position.set(45, 14);
        this.container.addChild(homeArrow);

        Assert.assertIsDefined(Flashbang.stageWidth);
        const nameLabel = new HTMLTextObject(this._puzzleName)
            .font(Fonts.STDFONT)
            .bold()
            .fontSize(14)
            .color(0xC0DCE7)
            .selectable(false)
            .maxWidth(Flashbang.stageWidth);
        this.addObject(nameLabel, this.container);
        nameLabel.display.position.set(57, 8);

        const missionIntroPanel = new MissionIntroPanel({
            description: this._puzzleDescription,
            puzzleThumbnails: this._puzzleThumbnails,
            constraints: this._constraintBoxes,
            customLayout: this._customLayout
        });
        this.addObject(missionIntroPanel, this.container);

        const updateLayout = () => {
            const {headerHeight} = UITheme.missionIntro;

            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);

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

            playButton.display.position.set(
                Math.min(
                    Flashbang.stageWidth - playButton.container.width - 27,
                    missionIntroPanel.container.x
                        + missionIntroPanel.size.x
                        - (this._constraintBoxes.length > 0 ? playButton.container.width : 0)
                ),
                Math.min(
                    Flashbang.stageHeight - 27 - playButton.container.height,
                    missionIntroPanel.container.y + missionIntroPanel.size.y
                )
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
            Assert.assertIsDefined(this.modeStack);
            this.modeStack.popMode();
        }
    }

    private readonly _puzzleName: string;
    private readonly _puzzleDescription: string;
    private readonly _puzzleThumbnails: SecStruct[];
    private readonly _constraintBoxes: ConstraintBox[];

    private _closed: boolean = false;

    private _customLayout: Array<[number, number] | [null, null]> | null;
}
