import {Flashbang} from "../../../flashbang/core/Flashbang";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {EPars} from "../../EPars";
import {Dialog, DialogCanceledError} from "../../ui/Dialog";
import {TextInputPanel} from "../../ui/TextInputPanel";
import {UndoBlock, UndoBlockParam} from "../../UndoBlock";
import {GameMode} from "../GameMode";

export interface SubmitPuzzleDetails {
    title: string;
    description: string;

    minGU?: number;
    maxGC?: number;
    minAU?: number;
}

export class SubmitPuzzleDialog extends Dialog<SubmitPuzzleDetails> {
    public constructor(numPoses: number, puzzleState: UndoBlock) {
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
            this.closed.then(value => {
                if (value != null) {
                    resolve(value);
                } else {
                    reject(new DialogCanceledError());
                }
            })
        });
    }

    protected added(): void {
        super.added();

        const TITLE = "Title";
        const MIN_GU = "Min G-U pairs required";
        const MAX_GC = "Max G-C pairs allowed";
        const MIN_AU = "Min A-U pairs required";
        const DESCRIPTION = "Description";

        const FIELD_WIDTH = 200;

        let inputPanel = new TextInputPanel();
        inputPanel.set_title("Publish your puzzle");

        let title = inputPanel.add_field(TITLE, FIELD_WIDTH);
        inputPanel.add_field(MIN_GU, FIELD_WIDTH);
        inputPanel.add_field(MAX_GC, FIELD_WIDTH);
        inputPanel.add_field(MIN_AU, FIELD_WIDTH);
        inputPanel.add_field(DESCRIPTION, FIELD_WIDTH, true);
        this.addObject(inputPanel, this.container);

        title.setFocus();

        inputPanel.set_hotkeys(null, null, KeyCode.Escape, null);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => {
            let dict = inputPanel.get_dictionary();
            let details = {
                title: dict.get(TITLE),
                description: dict.get(DESCRIPTION),
                minGU: GetNumber(dict, MIN_GU),
                maxGC: GetNumber(dict, MAX_GC),
                minAU: GetNumber(dict, MIN_AU),
            };

            let errorString = this.validate(details);
            if (errorString != null) {
                (this.mode as GameMode).showNotification(errorString);
            } else {
                this.close(details);
            }
        });

        let updateLocation = () => {
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.get_panel_width()) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.get_panel_height()) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private validate(details: SubmitPuzzleDetails): string {
        if (details.title.length == 0) {
            return "You must enter a title for your puzzle";
        } else if (details.description.length == 0) {
            return "You must write a description of your puzzle";
        }

        if (this._numPoses == 1) {
            let numAU: number = this._puzzleState.get_param(UndoBlockParam.AU, EPars.DEFAULT_TEMPERATURE);
            let numGU: number = this._puzzleState.get_param(UndoBlockParam.GU, EPars.DEFAULT_TEMPERATURE);
            let numGC: number = this._puzzleState.get_param(UndoBlockParam.GC, EPars.DEFAULT_TEMPERATURE);

            if (details.minGU) {
                let max_GU = (numAU + numGU + numGC) / 3;
                if (details.minGU < 0 || details.minGU > numGU || details.minGU > max_GU) {
                    return "Number of G-U pairs should be either blank or\n" +
                        "an integer between 0 and " + numGU + " (number of GUs in your current solution)" +
                        " and at most " + max_GU + " (a third of total number of pairs)";
                }
            }

            if (details.maxGC && details.maxGC < numGC) {
                return "Number of G-C pairs should be either blank or\n" +
                    "at least " + numGC + " (number GCs in your current solution)";
            }

            if (details.minAU && (details.minAU < 0 || details.minAU > numAU)) {
                return "Number of A-U pairs should be either blank or\n" +
                    "an integer between 0 and " + numAU + " (number of AUs in your current solution)";
            }
        }

        return null;
    }

    private readonly _numPoses: number;
    private readonly _puzzleState: UndoBlock;
}

function GetNumber(dict: Map<string, string>, name: string): number | undefined {
    if (!dict.has(name)) {
        return undefined;
    }
    let value = dict.get(name);
    return value != null && value.length > 0 ? Number(value) : undefined;
}
