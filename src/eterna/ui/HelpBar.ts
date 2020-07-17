import {ContainerObject, KeyCode} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import GameButton from './GameButton';

interface HelpBarProps {
    onHintClicked?: () => void;
    onHelpClicked: () => void;
    onChatClicked: () => void;
}

export default class HelpBar extends ContainerObject {
    private static readonly theme = {
        iconSize: 64
    };

    constructor(props: HelpBarProps) {
        super();

        const {theme} = HelpBar;

        const chat = new GameButton()
            .up(Bitmaps.ImgChat)
            .over(Bitmaps.ImgChatHover)
            .down(Bitmaps.ImgChat)
            .tooltip('Chat');
        this.addObject(chat, this.container);
        this.regs.add(chat.clicked.connect(props.onChatClicked));

        if (props.onHintClicked) {
            const onHintClicked = props.onHintClicked;
            const hints = new GameButton()
                .up(Bitmaps.ImgHint)
                .over(Bitmaps.ImgHintOver)
                .down(Bitmaps.ImgHintHit)
                .hotkey(KeyCode.KeyH)
                .rscriptID(RScriptUIElementID.HINT)
                .tooltip('Hints');

            this.addObject(hints, this.container);
            this.regs.add(hints.clicked.connect(() => {
                onHintClicked();
            }));
        }

        const help = new GameButton()
            .up(Bitmaps.ImgHelp)
            .over(Bitmaps.ImgHelpOver)
            .down(Bitmaps.ImgHelpHit)
            .tooltip('Help');
        this.addObject(help, this.container);
        this.regs.add(help.clicked.connect(props.onHelpClicked));

        this.container.children.forEach((icon, index) => {
            icon.x = index * theme.iconSize;
        });
    }
}
