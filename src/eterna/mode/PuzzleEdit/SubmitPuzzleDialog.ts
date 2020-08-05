import {KeyCode, Flashbang, Assert} from 'flashbang';
import EPars from 'eterna/EPars';
import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import Dialog, {DialogCanceledError} from 'eterna/ui/Dialog';
import TextInputPanel from 'eterna/ui/TextInputPanel';
import TextInputObject from 'eterna/ui/TextInputObject';
import {Signal} from 'signals';
import GameMode from '../GameMode';

function GetNumber(dict: Map<string, string>, name: string): number | undefined {
    if (!dict.has(name)) {
        return undefined;
    }
    let value = dict.get(name);
    return value != null && value.length > 0 ? Number(value) : undefined;
}

export interface SubmitPuzzleDetails {
    title?: string;
    description?: string;

    minGU?: number;
    maxGC?: number;
    minAU?: number;
}

export default class SubmitPuzzleDialog extends Dialog<SubmitPuzzleDetails> {
    constructor(numPoses: number, puzzleState: UndoBlock, initialState: SubmitPuzzleDetails = {}) {
        super();
        this._numPoses = numPoses;
        this._puzzleState = puzzleState;
        this._initialState = initialState;
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
        const MIN_GU = 'Min G-U pairs required';
        const MAX_GC = 'Max G-C pairs allowed';
        const MIN_AU = 'Min A-U pairs required';
        const DESCRIPTION = 'Description';

        const FIELD_WIDTH = 200;

        let inputPanel = new TextInputPanel();
        inputPanel.title = 'Publish your puzzle';

        let inputFields: { [key: string]: TextInputObject} = {};

        let title = inputPanel.addField(TITLE, FIELD_WIDTH);
        inputFields.title = title;
        if (this._numPoses === 1) {
            inputFields.minGU = inputPanel.addField(MIN_GU, FIELD_WIDTH);
            inputFields.maxGC = inputPanel.addField(MAX_GC, FIELD_WIDTH);
            inputFields.minAU = inputPanel.addField(MIN_AU, FIELD_WIDTH);
        }
        inputFields.description = inputPanel.addField(DESCRIPTION, FIELD_WIDTH, true);
        // If the initial state for the field exists, set the text to that state
        Object.keys(inputFields).forEach((input) => {
            let state = this._initialState as { [key: string]: string | number};
            // The keys for the initial state and the text fields are the same
            if (state[input]) inputFields[input].text = state[input] as string;
        });

        this.addObject(inputPanel, this.container);

        title.setFocus();

        inputPanel.setHotkeys(undefined, undefined, KeyCode.Escape, undefined);

        inputPanel.cancelClicked.connect(() => {
            let dict = inputPanel.getFieldValues();
            let details = {
                title: dict.get(TITLE),
                description: dict.get(DESCRIPTION),
                minGU: GetNumber(dict, MIN_GU),
                maxGC: GetNumber(dict, MAX_GC),
                minAU: GetNumber(dict, MIN_AU)
            };
            this.saveInput.emit(details);
            this.close(null);
        });
        inputPanel.okClicked.connect(() => {
            let dict = inputPanel.getFieldValues();
            let details = {
                title: dict.get(TITLE),
                description: dict.get(DESCRIPTION),
                minGU: GetNumber(dict, MIN_GU),
                maxGC: GetNumber(dict, MAX_GC),
                minAU: GetNumber(dict, MIN_AU)
            };

            this.saveInput.emit(details);

            let errorString = this.validate(details);
            if (errorString != null) {
                (this.mode as GameMode).showNotification(errorString);
            } else {
                this.close(details);
            }
        });

        let updateLocation = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };
        updateLocation();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private validate(details: SubmitPuzzleDetails): string | null {
        if (!details.title || details.title.length === 0) {
            return 'You must enter a title for your puzzle';
        } else if (!details.description || details.description.length === 0) {
            return 'You must write a description of your puzzle';
        }

        if (this._numPoses === 1) {
            let numAU: number = this._puzzleState.getParam(UndoBlockParam.AU, EPars.DEFAULT_TEMPERATURE) as number;
            let numGU: number = this._puzzleState.getParam(UndoBlockParam.GU, EPars.DEFAULT_TEMPERATURE) as number;
            let numGC: number = this._puzzleState.getParam(UndoBlockParam.GC, EPars.DEFAULT_TEMPERATURE) as number;

            if (details.minGU) {
                let maxGU = (numAU + numGU + numGC) / 3;
                if (details.minGU < 0 || details.minGU > numGU || details.minGU > maxGU) {
                    return `${'Number of G-U pairs should be either blank or '
                        + 'an integer between 0 and '}${numGU} (number of GUs in your current solution) `
                        + `and at most ${maxGU} (a third of total number of pairs)`;
                }
            }

            if (details.maxGC && details.maxGC < numGC) {
                return `${'Number of G-C pairs should be either blank or '
                    + 'at least '}${numGC} (number GCs in your current solution)`;
            }

            if (details.minAU && (details.minAU < 0 || details.minAU > numAU)) {
                return `${'Number of A-U pairs should be either blank or '
                    + 'an integer between 0 and '}${numAU} (number of AUs in your current solution)`;
            }
        }

        return null;
    }

    public saveInput: Signal<SubmitPuzzleDetails> = new Signal();

    private readonly _numPoses: number;
    private readonly _puzzleState: UndoBlock;
    private readonly _initialState: SubmitPuzzleDetails;
}
