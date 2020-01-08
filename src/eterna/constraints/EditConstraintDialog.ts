import {KeyCode, Flashbang} from 'flashbang';
import UndoBlock from 'eterna/UndoBlock';
import Dialog, {DialogCanceledError} from 'eterna/ui/Dialog';
import GenericInputPanel from 'eterna/ui/GenericInputPanel';
import GameMode from 'eterna/mode/GameMode';

export interface EditConstraintDetails {

}

export default class EditConstraintDialog extends Dialog<EditConstraintDetails> {
    /**
     * Returns a new Promise that will resolve if the dialog is confirmed,
     * and reject with a DialogCanceledError otherwise.
     */
    public get confirmed(): Promise<EditConstraintDetails> {
        return new Promise((resolve, reject) => {
            this.closed.then((value) => {
                if (value != null) {
                    resolve(value);
                } else {
                    reject(new DialogCanceledError());
                }
            });
        });
    }

    protected added(): void {
        super.added();

        const TITLE = 'Title';
        const TYPE = 'Constraint Type';

        const FIELD_WIDTH = 200;

        let inputPanel = new GenericInputPanel();
        inputPanel.title = 'Add/Edit Constraint';

        let title = inputPanel.addTextField(TITLE, FIELD_WIDTH);
        let type = inputPanel.addDropDown(TYPE, ['First', 'Second', 'Third']);
        this.addObject(inputPanel, this.container);

        title.setFocus();

        inputPanel.setHotkeys(null, null, KeyCode.Escape, null);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => {
            /* let dict = inputPanel.getFieldValues();
            let details = {
                title: dict.get(TITLE),
                description: dict.get(DESCRIPTION)
            };

            let errorString = this.validate(details);
            if (errorString != null) {
                (this.mode as GameMode).showNotification(errorString);
            } else {
                this.close(details);
            } */
            this.close(null);
        });

        let updateLocation = () => {
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private validate(details: EditConstraintDetails): string {
        return null;
    }
}
