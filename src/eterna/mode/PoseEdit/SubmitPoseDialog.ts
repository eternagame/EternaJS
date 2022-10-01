import {HLayoutContainer, KeyCode, VLayoutContainer} from 'flashbang';
import {Signal} from 'signals';
import WindowDialog from 'eterna/ui/WindowDialog';
import TextInputGrid from 'eterna/ui/TextInputGrid';
import GameButton from 'eterna/ui/GameButton';
import SubmitPoseDetails from './SubmitPoseDetails';

/** Prompts the player for a title and comment */
export default class SubmitPoseDialog extends WindowDialog<SubmitPoseDetails> {
    constructor(initialState: SubmitPoseDetails = {
        title: '',
        comment: '',
        annotations: [],
        libraryNT: []
    }) {
        super({title: 'Submit your design', modal: true});
        this._initialState = initialState;
    }

    protected added() {
        super.added();

        const content = new VLayoutContainer(20);
        this._window.content.addChild(content);
        const inputGrid = new TextInputGrid(undefined, this._window.contentHtmlWrapper);
        const title = inputGrid.addField('Title', 200);
        const comment = inputGrid.addField('Comment', 200, true);
        if (this._initialState.title) title.text = this._initialState.title;
        if (this._initialState.comment) comment.text = this._initialState.comment;
        this.addObject(inputGrid, content);

        title.setFocus();

        const buttonLayout = new HLayoutContainer(20);
        content.addChild(buttonLayout);
        const okButton = new GameButton().label('Ok', 14);
        this.addObject(okButton, buttonLayout);
        const cancelButton = new GameButton().label('Cancel', 14).hotkey(KeyCode.Escape);
        this.addObject(cancelButton, buttonLayout);

        cancelButton.clicked.connect(() => {
            const details = {
                title: title.text,
                comment: comment.text,
                annotations: [],
                libraryNT: []
            };
            this.saveInputs.emit(details);
            this.close(null);
        });
        okButton.clicked.connect(() => {
            const details = {
                title: title.text,
                comment: comment.text,
                annotations: [],
                libraryNT: []
            };
            this.saveInputs.emit(details);
            this.close(details);
        });

        content.layout();
        this._window.layout();
    }

    private readonly _initialState: SubmitPoseDetails;
    public saveInputs: Signal<SubmitPoseDetails> = new Signal();
}
