import {KeyCode} from 'flashbang';
import {Signal} from 'signals';
import FloatDialog from 'eterna/ui/FloatDialog';
import FlexibleTextInputPanel from 'eterna/ui/FlexibleTextInputPanel';
import SubmitPoseDetails from './SubmitPoseDetails';

/** Prompts the player for a title and comment */
export default class SubmitPoseDialog extends FloatDialog<SubmitPoseDetails> {
    constructor(initialState: SubmitPoseDetails = {
        title: '',
        comment: '',
        annotations: [],
        libraryNT: []
    }) {
        super('Submit your design');
        this._initialState = initialState;
    }

    protected added(): void {
        super.added();

        const TITLE = 'Title';
        const COMMENT = 'Comment';

        const inputPanel = new FlexibleTextInputPanel();
        const title = inputPanel.addField(TITLE, 200);
        const comment = inputPanel.addField(COMMENT, 200, true);
        if (this._initialState.title) title.text = this._initialState.title;
        if (this._initialState.comment) comment.text = this._initialState.comment;
        this.addObject(inputPanel, this.contentVLay);

        title.setFocus();

        inputPanel.setHotkeys(undefined, undefined, KeyCode.Escape, undefined);

        inputPanel.cancelClicked.connect(() => {
            const dict = inputPanel.getFieldValues();
            const details = {
                title: dict.get(TITLE),
                comment: dict.get(COMMENT),
                annotations: [],
                libraryNT: []
            };
            this.saveInputs.emit(details);
            this.close(null);
        });
        inputPanel.okClicked.connect(() => {
            const dict = inputPanel.getFieldValues();
            const details = {
                title: dict.get(TITLE),
                comment: dict.get(COMMENT),
                annotations: [],
                libraryNT: []
            };
            this.saveInputs.emit(details);
            this.close(details);
        });

        this.updateFloatLocation();
    }

    private readonly _initialState: SubmitPoseDetails;
    public saveInputs: Signal<SubmitPoseDetails> = new Signal();
}
