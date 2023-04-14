import Fonts from 'eterna/util/Fonts';
import {AlphaTask, HLayoutContainer, VLayoutContainer} from 'flashbang';
import GameButton from './GameButton';
import WindowDialog from './WindowDialog';

export default class ConfirmTargetDialog extends WindowDialog<'cancel' | 'reset' | 'submit'> {
    constructor() {
        super({title: 'Are you sure?', modal: true});
    }

    protected added() {
        super.added();

        const content = new VLayoutContainer(20);
        this._window.content.addChild(content);

        const PROMPT = 'This design has a custom target structure that will be uploaded along with your design, '
         + 'but there are paired bases in the target structure with base types that are not valid pairs (AU/UG/GC).\n\n'
         + 'You can do one of the following:\n'
         + '• Cancel submission and make further modifications\n'
         + '• Reset the target structure to the puzzle\'s default\n'
         + '• Continue submitting this design anyways';
        const text = Fonts.std(PROMPT, 15).color(0xC0DCE7).wordWrap(true, 300).build();
        content.addChild(text);

        const buttonLayout = new HLayoutContainer(12);
        content.addChild(buttonLayout);

        const cancelButton = new GameButton('secondary').label('Cancel', 14);
        this.addObject(cancelButton, buttonLayout);
        cancelButton.clicked.connect(() => this.close('cancel'));

        const resetButton = new GameButton('secondary').label('Reset', 14);
        this.addObject(resetButton, buttonLayout);
        resetButton.clicked.connect(() => this.close('reset'));

        const submitButton = new GameButton('secondary').label('Submit', 14);
        this.addObject(submitButton, buttonLayout);
        submitButton.clicked.connect(() => this.close('submit'));

        content.layout();
        this._window.layout();

        this._window.display.alpha = 0;
        this._window.addObject(new AlphaTask(1, 0.3));
    }
}
