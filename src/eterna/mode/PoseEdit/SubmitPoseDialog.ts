import {Flashbang, KeyCode} from 'flashbang';
import Dialog from 'eterna/ui/Dialog';
import GenericInputPanel from 'eterna/ui/GenericInputPanel';
import SubmitPoseDetails from './SubmitPoseDetails';

/** Prompts the player for a title and comment */
export default class SubmitPoseDialog extends Dialog<SubmitPoseDetails> {
    protected added(): void {
        super.added();

        const TITLE = 'Title';
        const COMMENT = 'Comment';

        let inputPanel = new GenericInputPanel();
        inputPanel.title = 'Submit your design';
        let title = inputPanel.addTextField(TITLE, 200);
        inputPanel.addTextField(COMMENT, 200, true);
        this.addObject(inputPanel, this.container);

        title.setFocus();

        inputPanel.setHotkeys(null, null, KeyCode.Escape, null);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => {
            let dict = inputPanel.getFieldValues();
            this.close({title: dict.get(TITLE), comment: dict.get(COMMENT)});
        });

        let updateLocation = () => {
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }
}
