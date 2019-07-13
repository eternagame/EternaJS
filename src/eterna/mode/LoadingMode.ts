import {Text} from 'pixi.js';
import {
    AppMode, ContainerObject, SerialTask, DelayTask, RepeatingTask, ObjectTask, ScaleTask, Easing, Flashbang
} from 'flashbang';
import Background from 'eterna/vfx/Background';
import Fonts from 'eterna/util/Fonts';
import Eterna from 'eterna/Eterna';

/** Displays a simple animation while we're loading assets */
export default class LoadingMode extends AppMode {
    constructor(text: string) {
        super();
        this._text = text;
    }

    public get isOpaque(): boolean { return true; }

    public get text(): string {
        return this._text;
    }

    public set text(value: string) {
        if (this._text !== value) {
            this._text = value;
            if (this._textField != null) {
                this._textField.text = value;
                this._textField.x = -this._textField.width * 0.5;
                this._textField.y = -this._textField.height * 0.5;
            }
        }
    }

    protected setup(): void {
        super.setup();

        this.addObject(new Background(0), this._container);

        this._textField = Fonts.arial(this._text, 36).bold().color(0xffffff).build();
        this._textField.x = -this._textField.width * 0.5;
        this._textField.y = -this._textField.height * 0.5;

        let container = new ContainerObject();
        container.container.addChild(this._textField);
        this.addObject(container, this.container);

        container.addObject(new SerialTask(
            new DelayTask(0.5),
            new RepeatingTask((): ObjectTask => new SerialTask(
                new ScaleTask(0.9, 0.9, 1, Easing.easeInOut),
                new ScaleTask(1, 1, 1, Easing.easeInOut)
            ))
        ));

        let updateLoc = () => {
            container.display.x = Flashbang.stageWidth * 0.5;
            container.display.y = Flashbang.stageHeight * 0.5;
        };
        updateLoc();
        this.resized.connect(updateLoc);
    }

    protected enter(): void {
        super.enter();
        Eterna.chat.pushHideChat();
    }

    protected exit(): void {
        Eterna.chat.popHideChat();
        super.exit();
    }

    private _text: string;
    private _textField: Text;
}
