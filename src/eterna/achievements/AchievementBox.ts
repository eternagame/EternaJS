import * as log from 'loglevel';
import {Point, Sprite, Text} from 'pixi.js';
import {
    ContainerObject, TextureUtil, SerialTask, DelayTask, ParallelTask, AlphaTask, ScaleTask, Easing
} from 'flashbang';
import GameButton from 'eterna/ui/GameButton';
import GamePanel, {GamePanelType} from 'eterna/ui/GamePanel';
import Fonts from 'eterna/util/Fonts';
import PlaySoundTask from 'eterna/resources/PlaySoundTask';
import Sounds from 'eterna/resources/Sounds';
import VibrateTask from 'eterna/vfx/VibrateTask';

export default class AchievementBox extends ContainerObject {
    constructor(imageURL: string, text: string) {
        super();
        this._imageURL = imageURL;
        this._description = text;
    }

    public get okButton(): GameButton {
        return this._okButton;
    }

    protected added(): void {
        super.added();

        const WIDTH = 480;
        const HEIGHT = 192;
        const IMAGE_SIZE = 128;

        let panel = new GamePanel(GamePanelType.NORMAL, 0.2);
        panel.setSize(WIDTH, HEIGHT);
        panel.display.position = new Point(-WIDTH * 0.5, -HEIGHT * 0.5);
        this.addObject(panel, this.container);

        let imageSprite = new Sprite();
        TextureUtil.loadURL(this._imageURL)
            .then((tex) => {
                if (this.isLiveObject) {
                    let scale = Math.min(IMAGE_SIZE / tex.width, IMAGE_SIZE / tex.height);
                    imageSprite.texture = tex;
                    imageSprite.scale.x = scale;
                    imageSprite.scale.y = scale;
                }
            })
            .catch((err) => {
                log.warn(`Failed to load Achievement image [url=${this._imageURL}, err=${err}]`);
            });
        imageSprite.position = new Point(15, 35);
        panel.container.addChild(imageSprite);

        let titleTxt = Fonts.arial('Congratulations!', 18).color(0xffffff).bold().build();
        titleTxt.position = new Point(160, 5);
        panel.container.addChild(titleTxt);

        this._descriptionTxt = Fonts.arial(`You got a new achievement - "${this._description}"!`, 16)
            .color(0xffffff)
            .wordWrap(true, 300)
            .build();
        this._descriptionTxt.position = new Point(160, 50);
        panel.container.addChild(this._descriptionTxt);

        this._okButton = new GameButton().label('CLOSE', 18);
        panel.addObject(this._okButton, panel.container);
        this._okButton.container.position = new Point(
            (panel.width - this._okButton.container.width) * 0.5,
            150 + 5
        );
    }

    public animate(): void {
        const ZOOM_DURATION = 0.5;
        const VIBRATE_DURATION = 0.3;

        this.container.alpha = 0;
        this.container.scale = new Point(3, 3);
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
            ),
            // Vibrate, and fade in the description text
            new ParallelTask(
                new VibrateTask(VIBRATE_DURATION),
                new AlphaTask(1, VIBRATE_DURATION, Easing.linear, this._descriptionTxt),
            ),
        ));
    }

    private readonly _imageURL: string;
    private readonly _description: string;

    private _okButton: GameButton;
    private _descriptionTxt: Text;
}
