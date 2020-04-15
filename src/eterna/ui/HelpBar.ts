import {ContainerObject, KeyCode} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import GameButton from './GameButton';

interface HelpBarProps {
    onHintClicked?: () => void;
    onHelpClicked: () => void;
}

export default class HelpBar extends ContainerObject {
    private static readonly theme = {
        iconSize: 64
    };

    constructor(props: HelpBarProps) {
        super();

        const {theme} = HelpBar;
        if (props.onHintClicked) {
            const hints = new GameButton()
                .up(Bitmaps.ImgHint)
                .over(Bitmaps.ImgHintOver)
                .down(Bitmaps.ImgHintHit)
                .hotkey(KeyCode.KeyH)
                .rscriptID(RScriptUIElementID.HINT)
                .tooltip('Hints');

            this.addObject(hints, this.container);
            hints.clicked.connect(() => {
                props.onHintClicked();
            });
        }

        const help = new GameButton()
            .up(Bitmaps.ImgHelp)
            .over(Bitmaps.ImgHelpOver)
            .down(Bitmaps.ImgHelpHit)
            .tooltip('Help');
        this.addObject(help, this.container);
        help.clicked.connect(props.onHelpClicked);

        this.container.children.forEach((icon, index) => {
            icon.x = index * theme.iconSize;
        });
    }
}
