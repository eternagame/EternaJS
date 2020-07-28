import {Text} from 'pixi.js';
import {
    AppMode, ContainerObject, SerialTask, DelayTask, RepeatingTask, ObjectTask, ScaleTask, Easing, Flashbang, Assert
} from 'flashbang';
import Background from 'eterna/vfx/Background';
import Fonts from 'eterna/util/Fonts';
import Eterna from 'eterna/Eterna';

/** Displays a simple animation while we're loading assets */
export default class LoadingMode extends AppMode {
    public extraBlurbText: string;

    constructor(text: string, extraBlurbText: string | null) {
        super();
        this._text = text;
        if (extraBlurbText == null) this.extraBlurbText = this.getExtraBlurb();
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

        this._textField = Fonts.std(this._text, 24).color(0xffffff).build();
        this._textField.x = -this._textField.width * 0.5;
        this._textField.y = -this._textField.height * 0.5;

        this._extraBlurbTextField = Fonts.std(this.extraBlurbText, 36).bold().color(0xffffff).hAlignCenter()
            .build();
        this._extraBlurbTextField.x = -this._extraBlurbTextField.width * 0.5;
        this._extraBlurbTextField.y = -this._textField.height - this._extraBlurbTextField.height;

        let container = new ContainerObject();
        container.container.addChild(this._textField);
        container.container.addChild(this._extraBlurbTextField);
        this.addObject(container, this.container);

        container.addObject(new SerialTask(
            new DelayTask(0.5),
            new RepeatingTask((): ObjectTask => new SerialTask(
                new ScaleTask(0.95, 0.95, 1, Easing.easeInOut),
                new ScaleTask(1, 1, 1, Easing.easeInOut)
            ))
        ));

        let updateLoc = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            container.display.x = Flashbang.stageWidth * 0.5;
            container.display.y = Flashbang.stageHeight * 0.5;
        };
        updateLoc();
        this.resized.connect(updateLoc);
    }

    private getExtraBlurb(): string {
        let ExtraBlurbs = [
            'A good scientist will tell you\nthat being wrong can be just\n as interesting as being right.',
            'Developed by players for players',
            'Afraid of viral pandemics?\nStay calm and play Eterna.',
            'Played by Humans, Scored by Nature.',
            'Empowering citizen scientists to invent medicine',
            "Heard of CRISPR therapies? That's RNA medicine",
            'The only videogame with real\nexperiments in the loop',
            'No computer can solve the entire Eterna100',
            'Player-made bot NEMO crushes deep learning.',
            'Twenty scientific publications and counting...',
            'Top Eterna players still crush all bots.',
            'Science is much more about the\nquestions than the facts',
            'Citizen science works because\nwe are a curious species.',
            'Can we invent our own medicine?',
            'Just hang in there and\nyou will eventually\nget the hang of it.',
            'The ribosome makes life.\nYou can re-design it.',
            'First treatment for spinal muscular atrophy is RNA',
            'Evolution is a tinkerer.\nYou can accelerate it.'
            //           "RNA design is provably intractable for computers.",
            // eslint-disable-next-line max-len
            //            "Beware this game is addicting...\n...at least this addiction is for a noble cause.\n     -- Eterna player hoglahoo",
        ];
        return ExtraBlurbs[Math.floor(Math.random() * ExtraBlurbs.length)];
    }

    private _text: string;
    private _textField: Text;

    private _extraBlurbTextField: Text;
}
