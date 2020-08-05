import {Flashbang, KeyCode, Assert} from 'flashbang';
import Dialog from 'eterna/ui/Dialog';
import TextInputPanel from 'eterna/ui/TextInputPanel';
import {Signal} from 'signals';
import SubmitPoseDetails from './SubmitPoseDetails';

/** Prompts the player for a title and comment */
export default class SubmitPoseDialog extends Dialog<SubmitPoseDetails> {
    constructor(initialState: SubmitPoseDetails = {
        title: '',
        comment: ''
    }) {
        super();
        this._initialState = initialState;
    }

    protected added(): void {
        super.added();

        const TITLE = 'Title';
        const COMMENT = 'Comment';

        let inputPanel = new TextInputPanel();
        inputPanel.title = 'Submit your design';
        let title = inputPanel.addField(TITLE, 200);
        let comment = inputPanel.addField(COMMENT, 200, true);
        if (this._initialState.title) title.text = this._initialState.title;
        if (this._initialState.comment) comment.text = this._initialState.comment;
        this.addObject(inputPanel, this.container);

        title.setFocus();

        inputPanel.setHotkeys(undefined, undefined, KeyCode.Escape, undefined);

        inputPanel.cancelClicked.connect(() => {
            let dict = inputPanel.getFieldValues();
            let details = {
                title: dict.get(TITLE),
                comment: dict.get(COMMENT)
            };
            this.saveInputs.emit(details);
            this.close(null);
        });
        inputPanel.okClicked.connect(() => {
            let dict = inputPanel.getFieldValues();
            let details = {
                title: dict.get(TITLE),
                comment: dict.get(COMMENT)
            };
            this.saveInputs.emit(details);
            this.close(details);
        });

        let updateLocation = () => {
            Assert.assertIsDefined(Flashbang.stageHeight);
            Assert.assertIsDefined(Flashbang.stageWidth);
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };
        updateLocation();

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private readonly _initialState: SubmitPoseDetails;
    public saveInputs: Signal<SubmitPoseDetails> = new Signal();
}
