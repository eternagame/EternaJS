import confetti, {Options as ConfettiOptions} from 'canvas-confetti';
import Eterna from 'eterna/Eterna';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import PlaySoundTask from 'eterna/resources/PlaySoundTask';
import Sounds from 'eterna/resources/Sounds';
import GameButton from 'eterna/ui/GameButton';
import HTMLImageObject from 'eterna/ui/HTMLImageObject';
import Fonts from 'eterna/util/Fonts';
import VibrateTask from 'eterna/vfx/VibrateTask';
import {
    AlphaTask,
    Assert,
    ContainerObject,
    DelayTask,
    Easing,
    Flashbang,
    LocationTask,
    ParallelTask,
    ScaleTask,
    SerialTask,
    StyledTextBuilder
} from 'flashbang';
import {
    Graphics,
    Point, Sprite,
    Text
} from 'pixi.js';
import {UnitSignal} from 'signals';

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
    private _descriptionTxt: Text;

    constructor(imageURL: string, text: string) {
        super();
        this._imageURL = imageURL;
        this._description = text;
    }

    private static getAbsUrl(uri: string) {
        return /^http/i.exec(uri) ? uri : `${Eterna.SERVER_URL}${uri}`;
    }

    protected added(): void {
        super.added();

        const {theme} = AchievementBox;

        const background = new Graphics()
            .roundRect(0, 0, theme.size.x, theme.size.y, theme.borderRadius)
            .fill({color: theme.colors.background, alpha: 1})
            .stroke({width: 1, color: theme.colors.border, alpha: 1})
            .roundRect(0, 0, theme.size.x, theme.headerHeight, theme.borderRadius)
            .fill({color: theme.colors.border})
            .stroke({width: 1, color: theme.colors.border, alpha: 1});
        background.eventMode = 'static';
        background.on('click', () => this.closed.emit());
        background.on('tap', () => this.closed.emit());
        this.container.addChild(background);

        // Title
        const title = Fonts.std('NEW ACHIEVEMENT', 20).bold().color(0xFFFFFF).build();
        title.position.set(
            (theme.size.x - title.width) / 2,
            (theme.headerHeight - title.height) / 2
        );
        this.container.addChild(title);

        // Close button
        const closeIcon = BitmapManager.getBitmap(Bitmaps.ImgAchievementsClose);
        const closeButton = new GameButton().allStates(closeIcon);
        closeButton.container.position.set(
            theme.size.x - theme.spacing - closeIcon.width,
            (theme.headerHeight - closeIcon.height) / 2
        );
        closeButton.clicked.connect(() => this.closed.emit());
        this.addObject(closeButton, this.container);

        // Icon
        const imgObj = new HTMLImageObject(AchievementBox.getAbsUrl(this._imageURL));
        imgObj.display.position.set(
            (theme.size.x - theme.iconSize) / 2,
            theme.headerHeight + theme.spacing
        );
        imgObj.width = theme.iconSize;
        this.addObject(imgObj, this.container);
        // We should really be handling this as a sprite, but for some reason we're having issues getting
        // it to load properly on mobile with release builds. We need to debug this.
        /* const imageSprite = new Sprite();
        TextureUtil.loadURL(AchievementBox.getAbsUrl(this._imageURL))
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
        imageSprite.position.set(
            (theme.size.x - theme.iconSize) / 2,
            theme.headerHeight + theme.spacing
        );
        this.container.addChild(imageSprite); */

        const checkmark = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgAchievementsCheckmark));

        // Description
        this._descriptionTxt = new StyledTextBuilder({
            fontFamily: Fonts.STDFONT,
            fill: 0xFFFFFF,
            fontSize: 18,
            wordWrap: true,
            wordWrapWidth: theme.size.x - (theme.spacing * 3) - checkmark.width
        })
            .appendHTMLStyledText(this._description)
            .build();
        this._descriptionTxt.position.set(
            Math.max(
                (theme.size.x - this._descriptionTxt.width) / 2,
                theme.spacing * 2 + checkmark.width
            ),
            imgObj.display.position.y + theme.iconSize + theme.spacing
        );
        this.container.addChild(this._descriptionTxt);

        // Checkmark
        checkmark.position.set(
            this._descriptionTxt.position.x - theme.spacing - checkmark.width,
            this._descriptionTxt.position.y
        );
        this.container.addChild(checkmark);

        const updateLayout = () => {
            Assert.assertIsDefined(Flashbang.stageHeight);
            Assert.assertIsDefined(Flashbang.stageWidth);
            this.container.position.set(
                (Flashbang.stageWidth - theme.size.x) / 2,
                (Flashbang.stageHeight - theme.size.y) / 2
            );
        };
        updateLayout();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(updateLayout));
    }

    public animate(): void {
        Assert.assertIsDefined(Flashbang.stageHeight);
        Assert.assertIsDefined(Flashbang.stageWidth);
        const ZOOM_DURATION = 0.5;
        const VIBRATE_DURATION = 0.3;
        const {theme} = AchievementBox;

        this.container.alpha = 0;
        this.container.scale.set(3, 3);
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
                const defaults: ConfettiOptions = {
                    origin: {y: 0.7}
                };

                async function fire(particleRatio: number, opts: ConfettiOptions) {
                    await confetti({
                        ...defaults,
                        ...opts,
                        particleCount: Math.floor(count * particleRatio)
                    });
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
