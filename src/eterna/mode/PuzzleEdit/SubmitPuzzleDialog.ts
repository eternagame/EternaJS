import {KeyCode, Flashbang} from 'flashbang';
import UndoBlock from 'eterna/UndoBlock';
import Dialog, {DialogCanceledError} from 'eterna/ui/Dialog';
import TextInputPanel from 'eterna/ui/TextInputPanel';
import GameMode from '../GameMode';

export interface SubmitPuzzleDetails {
    title: string;
    description: string;

    minGU?: number;
    maxGC?: number;
    minAU?: number;
}

export default class SubmitPuzzleDialog extends Dialog<SubmitPuzzleDetails> {
    constructor(numPoses: number, puzzleState: UndoBlock) {
        super();
        this._numPoses = numPoses;
        this._puzzleState = puzzleState;
    }

    /**
     * Returns a new Promise that will resolve if the dialog is confirmed,
     * and reject with a DialogCanceledError otherwise.
     */
    public get confirmed(): Promise<SubmitPuzzleDetails> {
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
        const DESCRIPTION = 'Description';

        const FIELD_WIDTH = 200;

        let inputPanel = new TextInputPanel();
        inputPanel.title = 'Publish your puzzle';

        let title = inputPanel.addField(TITLE, FIELD_WIDTH);
        inputPanel.addField(DESCRIPTION, FIELD_WIDTH, true);
        this.addObject(inputPanel, this.container);

        title.setFocus();

        inputPanel.setHotkeys(null, null, KeyCode.Escape, null);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => {
            let dict = inputPanel.getFieldValues();
            let details = {
                title: dict.get(TITLE),
                description: dict.get(DESCRIPTION)
            };

            let errorString = this.validate(details);
            if (errorString != null) {
                (this.mode as GameMode).showNotification(errorString);
            } else {
                this.close(details);
            }
        });

        let updateLocation = () => {
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private validate(details: SubmitPuzzleDetails): string {
        if (details.title.length === 0) {
            return 'You must enter a title for your puzzle';
        } else if (details.description.length === 0) {
            return 'You must write a description of your puzzle';
        }

        return null;
    }

    private readonly _numPoses: number;
    private readonly _puzzleState: UndoBlock;
}
