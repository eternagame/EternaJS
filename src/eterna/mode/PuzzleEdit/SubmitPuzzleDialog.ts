import {HLayoutContainer, KeyCode, VLayoutContainer} from 'flashbang';
import EPars from 'eterna/EPars';
import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import TextInputObject from 'eterna/ui/TextInputObject';
import {Signal} from 'signals';
import WindowDialog from 'eterna/ui/WindowDialog';
import {DialogCanceledError} from 'eterna/ui/Dialog';
import Fonts from 'eterna/util/Fonts';
import TextInputGrid from 'eterna/ui/TextInputGrid';
import GameButton from 'eterna/ui/GameButton';

function GetNumber(value: string | undefined): number | undefined {
    return value != null && value.length > 0 ? Number(value) : undefined;
}

export interface SubmitPuzzleDetails {
    title?: string;
    description?: string;

    minGU?: number;
    maxGC?: number;
    minAU?: number;
}

export default class SubmitPuzzleDialog extends WindowDialog<SubmitPuzzleDetails> {
    public saveInput: Signal<SubmitPuzzleDetails> = new Signal();

    constructor(numPoses: number, puzzleState: UndoBlock, initialState: SubmitPuzzleDetails = {}) {
        super({title: 'Publish your puzzle', modal: true});
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

    protected added() {
        super.added();

        const content = new VLayoutContainer(20);
        this._window.content.addChild(content);

        const errorText = Fonts.std()
            .fontSize(14)
            .color(0xff7070)
            .bold()
            .build();
        errorText.visible = false;
        content.addChild(errorText);

        const inputFields: { [key in keyof SubmitPuzzleDetails]: TextInputObject} = {};
        const inputGrid = new TextInputGrid(undefined, this._window.contentHtmlWrapper);
        inputFields.title = inputGrid.addField('Title', 200);
        if (this._numPoses === 1) {
            inputFields.minGU = inputGrid.addField('Min G-U pairs required', 60);
            inputFields.maxGC = inputGrid.addField('Max G-C pairs allowed', 60);
            inputFields.minAU = inputGrid.addField('Min A-U pairs required', 60);
        }
        inputFields.description = inputGrid.addField('Description', 200, true);
        // If the initial state for the field exists, set the text to that state
        Object.keys(inputFields).forEach((input) => {
            const state = this._initialState as { [key: string]: string | number};
            // The keys for the initial state and the text fields are the same
            if (state[input] && input in inputFields) {
                const field = inputFields[input as keyof typeof inputFields];
                if (field) field.text = state[input] as string;
            }
        });
        this.addObject(inputGrid, content);

        inputFields.title.setFocus();

        const buttonLayout = new HLayoutContainer(20);
        content.addChild(buttonLayout);
        const okButton = new GameButton().label('Ok', 14);
        this.addObject(okButton, buttonLayout);
        const cancelButton = new GameButton().label('Cancel', 14).hotkey(KeyCode.Escape);
        this.addObject(cancelButton, buttonLayout);

        cancelButton.clicked.connect(() => {
            const details = {
                title: inputFields.title?.text,
                description: inputFields.description?.text,
                minGU: GetNumber(inputFields.minGU?.text),
                maxGC: GetNumber(inputFields.maxGC?.text),
                minAU: GetNumber(inputFields.minAU?.text)
            };
            this.saveInput.emit(details);
            this.close(null);
        });
        okButton.clicked.connect(() => {
            const details = {
                title: inputFields.title?.text,
                description: inputFields.description?.text,
                minGU: GetNumber(inputFields.minGU?.text),
                maxGC: GetNumber(inputFields.maxGC?.text),
                minAU: GetNumber(inputFields.minAU?.text)
            };

            this.saveInput.emit(details);

            const errorString = this.validate(details);
            if (errorString != null) {
                errorText.text = errorString;
                errorText.visible = true;
                content.layout(true);
                this._window.layout();
            } else {
                this.close(details);
            }
        });

        content.layout();
        this._window.layout();
    }

    private validate(details: SubmitPuzzleDetails): string | null {
        if (!details.title || details.title.length === 0) {
            return 'You must enter a title for your puzzle';
        } else if (!details.description || details.description.length === 0) {
            return 'You must write a description of your puzzle';
        }

        if (this._numPoses === 1) {
            const numAU: number = this._puzzleState.getParam(UndoBlockParam.AU, EPars.DEFAULT_TEMPERATURE) as number;
            const numGU: number = this._puzzleState.getParam(UndoBlockParam.GU, EPars.DEFAULT_TEMPERATURE) as number;
            const numGC: number = this._puzzleState.getParam(UndoBlockParam.GC, EPars.DEFAULT_TEMPERATURE) as number;

            if (details.minGU !== undefined) {
                const maxGU = (numAU + numGU + numGC) / 3;
                if (details.minGU < 0 || details.minGU > numGU || details.minGU > maxGU) {
                    return `${'Number of G-U pairs should be either blank or '
                        + 'an integer between 0 and '}${numGU} (number of GUs in your current solution) `
                        + `and at most ${maxGU} (a third of total number of pairs)`;
                }
            }

            if (details.maxGC !== undefined && details.maxGC < numGC) {
                return `${'Number of G-C pairs should be either blank or '
                    + 'at least '}${numGC} (number GCs in your current solution)`;
            }

            if (details.minAU !== undefined && (details.minAU < 0 || details.minAU > numAU)) {
                return `${'Number of A-U pairs should be either blank or '
                    + 'an integer between 0 and '}${numAU} (number of AUs in your current solution)`;
            }
        }

        return null;
    }

    private readonly _numPoses: number;
    private readonly _puzzleState: UndoBlock;
    private readonly _initialState: SubmitPuzzleDetails;
}
