import {ContainerObject, KeyCode} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import Eterna from 'eterna/Eterna';
import GameButton from './GameButton';

interface HelpBarProps {
    onHintClicked?: () => void;
    onHelpClicked: () => void;
    onChatClicked: () => void;
    onInfoClicked?: () => void;
}

export default class HelpBar extends ContainerObject {
    private static readonly theme = {
        iconSize: 64
    };

    constructor(props: HelpBarProps) {
        super();

        const {theme} = HelpBar;

        if (!Eterna.noGame) {
            this._chat = new GameButton()
                .up(Bitmaps.ImgChat)
                .over(Bitmaps.ImgChatHover)
                .down(Bitmaps.ImgChat)
                .tooltip('Chat');
            this.addObject(this._chat, this.container);
            this.regs.add(this._chat.clicked.connect(props.onChatClicked));
        }

        if (props.onInfoClicked) {
            const onInfoClicked = props.onInfoClicked;
            this._info = new GameButton()
                .up(Bitmaps.ImgInfoControl)
                .over(Bitmaps.ImgInfoControlHover)
                .down(Bitmaps.ImgInfoControl)
                .hotkey(KeyCode.KeyI, true)
                .tooltip('Design Information (ctrl+I/cmd+I)');

            this.addObject(this._info, this.container);
            this.regs.add(this._info.clicked.connect(() => {
                onInfoClicked();
            }));
        }

        if (props.onHintClicked) {
            const onHintClicked = props.onHintClicked;
            this._hint = new GameButton()
                .up(Bitmaps.ImgHint)
                .over(Bitmaps.ImgHintOver)
                .down(Bitmaps.ImgHintHit)
                .hotkey(KeyCode.KeyH)
                .rscriptID(RScriptUIElementID.HINT)
                .tooltip('Hints (H)');

            this.addObject(this._hint, this.container);
            this.regs.add(this._hint.clicked.connect(() => {
                onHintClicked();
            }));
        }

        this._help = new GameButton()
            .up(Bitmaps.ImgHelp)
            .over(Bitmaps.ImgHelpOver)
            .down(Bitmaps.ImgHelpHit)
            .tooltip('Help');
        this.addObject(this._help, this.container);
        this.regs.add(this._help.clicked.connect(props.onHelpClicked));

        this.container.children.forEach((icon, index) => {
            icon.x = index * theme.iconSize;
        });
    }

    public get hint() {
        return this._hint;
    }

    public get help() {
        return this._help;
    }

    private _chat: GameButton | null = null;
    private _info: GameButton | null = null;
    private _hint: GameButton | null = null;
    private _help: GameButton;
}
