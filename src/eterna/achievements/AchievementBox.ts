import * as log from 'loglevel';
import {
    Point, Sprite, Graphics
} from 'pixi.js';
import {
    ContainerObject,
    TextureUtil,
    SerialTask,
    DelayTask,
    ParallelTask,
    AlphaTask,
    ScaleTask,
    Easing,
    Flashbang,
    LocationTask,
    StyledTextBuilder
} from 'flashbang';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import PlaySoundTask from 'eterna/resources/PlaySoundTask';
import Sounds from 'eterna/resources/Sounds';
import VibrateTask from 'eterna/vfx/VibrateTask';
import {UnitSignal} from 'signals';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import MultiStyleText from 'pixi-multistyle-text';
import * as confetti from 'canvas-confetti';

export default class AchievementBox extends ContainerObject {
    public closed = new UnitSignal();

    private static theme = {
        colors: {
            background: 0x21508C,
            border: 0x4A90E2
        },
        size: new Point(372, 315),
        iconSize: 180,
        headerHeight: 41,
        borderRadius: 5,
        spacing: 15
    };

    private readonly _imageURL: string;
    private readonly _description: string;
    private _descriptionTxt: MultiStyleText;

    constructor(imageURL: string, text: string) {
        super();
        this._imageURL = imageURL;
        this._description = text;
    }

    protected added(): void {
        super.added();

        const {theme} = AchievementBox;

        const background = new Graphics();
        background.lineStyle(1, theme.colors.border, 1);
        background.beginFill(theme.colors.background, 1);
        background.drawRoundedRect(0, 0, theme.size.x, theme.size.y, theme.borderRadius);
        background.endFill();
        background.beginFill(theme.colors.border);
        background.drawRoundedRect(0, 0, theme.size.x, theme.headerHeight, theme.borderRadius);
        background.endFill();
        background.interactive = true;
        background.on('click', () => this.closed.emit());
        background.on('tap', () => this.closed.emit());
        this.container.addChild(background);

        // Title
        const title = Fonts.stdBold('NEW ACHIEVEMENT', 20).color(0xFFFFFF).build();
        title.position = new Point(
            (theme.size.x - title.width) / 2,
            (theme.headerHeight - title.height) / 2
        );
        this.container.addChild(title);

        // Close button
        const closeIcon = BitmapManager.getBitmap(Bitmaps.ImgAchievementsClose);
        const closeButton = new GameButton().allStates(closeIcon);
        closeButton.container.position = new Point(
            theme.size.x - theme.spacing - closeIcon.width,
            (theme.headerHeight - closeIcon.height) / 2
        );
        closeButton.clicked.connect(() => this.closed.emit());
        this.addObject(closeButton, this.container);

        // Icon
        const imageSprite = new Sprite();
        TextureUtil.loadURL(this._imageURL)
            .then((tex) => {
                if (this.isLiveObject) {
                    const scale = Math.min(theme.iconSize / tex.width, theme.iconSize / tex.height);
                    imageSprite.texture = tex;
                    imageSprite.scale.x = scale;
                    imageSprite.scale.y = scale;
                }
            })
            .catch((err) => {
                log.warn(`Failed to load Achievement image [url=${this._imageURL}, err=${err}]`);
            });
        imageSprite.position = new Point(
            (theme.size.x - theme.iconSize) / 2,
            theme.headerHeight + theme.spacing
        );
        this.container.addChild(imageSprite);

        const checkmark = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgAchievementsCheckmark));

        // Description
        this._descriptionTxt = new StyledTextBuilder({
            fontFamily: Fonts.STDFONT_REGULAR,
            fill: 0xFFFFFF,
            fontSize: 18,
            wordWrap: true,
            wordWrapWidth: theme.size.x - (theme.spacing * 3) - checkmark.width
        })
            .appendHTMLStyledText(this._description)
            .build();
        this._descriptionTxt.position = new Point(
            Math.max(
                (theme.size.x - this._descriptionTxt.width) / 2,
                theme.spacing * 2 + checkmark.width
            ),
            imageSprite.position.y + theme.iconSize + theme.spacing
        );
        this.container.addChild(this._descriptionTxt);

        // Checkmark
        checkmark.position = new Point(
            this._descriptionTxt.position.x - theme.spacing - checkmark.width,
            this._descriptionTxt.position.y
        );
        this.container.addChild(checkmark);

        const updateLayout = () => {
            this.container.position = new Point(
                (Flashbang.stageWidth - theme.size.x) / 2,
                (Flashbang.stageHeight - theme.size.y) / 2
            );
        };
        updateLayout();
        this.regs.add(this.mode.resized.connect(updateLayout));
    }

    public animate(): void {
        const ZOOM_DURATION = 0.5;
        const VIBRATE_DURATION = 0.3;
        const {theme} = AchievementBox;

        this.container.alpha = 0;
        this.container.scale = new Point(3, 3);
        this.container.x = (Flashbang.stageWidth - (theme.size.x * this.container.scale.x)) / 2;
        this.container.y = (Flashbang.stageHeight - (theme.size.y * this.container.scale.y)) / 2;
        this._descriptionTxt.alpha = 0;

        // play a sound
        this.addObject(new SerialTask(
            new DelayTask(ZOOM_DURATION - 0.15),
            new PlaySoundTask(Sounds.SoundSmashStamp)
        ));

        this.addObject(new SerialTask(
            // "zoom in" and fade in
            new ParallelTask(
                new AlphaTask(1, ZOOM_DURATION, Easing.easeIn),
                new ScaleTask(1, 1, ZOOM_DURATION, Easing.easeIn),
                new LocationTask(
                    (Flashbang.stageWidth - theme.size.x) / 2,
                    (Flashbang.stageHeight - theme.size.y) / 2,
                    ZOOM_DURATION,
                    Easing.easeIn
                )
            ),
            // Vibrate, and fade in the description text
            new ParallelTask(
                new VibrateTask(VIBRATE_DURATION),
                new AlphaTask(1, VIBRATE_DURATION, Easing.linear, this._descriptionTxt)
            )
        ));

        setTimeout(
            () => {
                // Confetti - realistic look
                // https://www.kirilv.com/canvas-confetti/
                const count = 200;
                const defaults = {
                    origin: {y: 0.7}
                };

                function fire(particleRatio: number, opts: object) {
                    // sadly, @types/canvas-confetti doesn't export the confetti method properly!
                    // eslint-disable-next-line
                    (confetti as any).default(Object.assign({}, defaults, opts, {
                        particleCount: Math.floor(count * particleRatio)
                    }));
                }

                fire(0.25, {
                    spread: 26,
                    startVelocity: 55
                });
                fire(0.2, {
                    spread: 60
                });
                fire(0.35, {
                    spread: 100,
                    decay: 0.91
                });
                fire(0.1, {
                    spread: 120,
                    startVelocity: 25,
                    decay: 0.92
                });
                fire(0.1, {
                    spread: 120,
                    startVelocity: 45
                });
            },
            ZOOM_DURATION * 1000
        );
    }
}
