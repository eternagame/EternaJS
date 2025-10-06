import {VLayoutContainer} from 'flashbang';
import {Signal} from 'signals';
import WindowDialog from './WindowDialog';
import TextInputGrid from './TextInputGrid';
import GameButton from './GameButton';
import TextInputObject from './TextInputObject';

export default class AutoSolverDialog extends WindowDialog<void> {
    public readonly submitClicked: Signal<string> = new Signal();

    constructor({sequence} : {sequence: string}) {
        super({title: 'AutoSolver Settings'});
        this._sequence = sequence;
        this._solverParameters = {package: 'eternafold'};
    }

    protected added(): void {
        super.added();

        this._content = new VLayoutContainer(20);
        this._window.content.addChild(this._content);

        const solverInput = new TextInputGrid(undefined, this._window.contentHtmlWrapper);
        this._solverModelField = solverInput.addField('Solver Model', 200);
        this._solverModelField.text = 'Ribotree';
        this._solverModelField.readOnly = true;
        this.addObject(solverInput, this._content);

        const packageInput = new TextInputGrid(undefined, this._window.contentHtmlWrapper);
        this._solverModelField = packageInput.addField('Folder Model', 200);
        this._solverModelField.text = 'Eternafold';
        this._solverModelField.readOnly = true;
        this.addObject(packageInput, this._content);

        const iterationsInput = new TextInputGrid(undefined, this._window.contentHtmlWrapper);
        this._solverModelField = iterationsInput.addField('Iterations', 200);
        this._solverModelField.text = '100';
        this._solverModelField.readOnly = true;
        this.addObject(iterationsInput, this._content);

        const timeoutInput = new TextInputGrid(undefined, this._window.contentHtmlWrapper);
        this._solverModelField = timeoutInput.addField('Timeout (s)', 200);
        this._solverModelField.text = '120';
        this._solverModelField.readOnly = true;
        this.addObject(timeoutInput, this._content);

        const submitButton = new GameButton().label('Submit', 14);
        this.addObject(submitButton, this._content);

        submitButton.clicked.connect(() => this.onSubmit());

        this._content.layout();
        this._window.layout();
    }

    private async onSubmit() {
        const computeUrl = 'https://compute.eternadev.org/ribotree';
        const requestBody = {
            sequence: this._sequence,
            ...this._solverParameters
        };

        const response = await fetch(computeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const {result} = await response.json();
        this.submitClicked.emit(result);
    }

    private _content: VLayoutContainer;
    private _sequence: string;
    private _solverParameters: { package: string };
    private _solverModelField: TextInputObject;
}
