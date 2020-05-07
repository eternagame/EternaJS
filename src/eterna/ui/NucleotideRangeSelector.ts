import {Flashbang, KeyCode} from 'flashbang';
import {UnitSignal} from 'signals';
import TextInputPanel from './TextInputPanel';
import Dialog from './Dialog';
import GameButton from './GameButton';

interface NucleotideRangeSelectorProps {
    initialRange: [number, number];
    isPartialRange: boolean;
}

interface NucleotideRangeSelectorResult {
    startIndex: number;
    endIndex: number;
    clearRange: boolean;
}

class NucleotideRangeSelectorInput extends TextInputPanel {
    public onClear = new UnitSignal();
    private _clearButton: GameButton;

    constructor() {
        super();
        this._clearButton = new GameButton()
            .label('Clear range', 14)
            .tooltip('View all nucleotides');
        this.addObject(this._clearButton, this.container);
        this._clearButton.clicked.connect(() => this.onClear.emit());
    }

    protected added() {
        super.added();

        const {_okButton, _clearButton, _cancelButton} = this;

        const spacing = 30;
        const buttonsWidth = _okButton.container.width
            + spacing
            + _clearButton.container.width
            + spacing
            + _cancelButton.container.width;

        _okButton.display.position.x = (this._width - buttonsWidth) / 2;
        _clearButton.display.position.x = _okButton.display.position.x + _okButton.container.width + spacing;
        _clearButton.display.position.y = _okButton.display.position.y;
        _cancelButton.display.position.x = _clearButton.display.position.x + _clearButton.container.width + spacing;
    }
}

export default class NucleotideRangeSelector extends Dialog<NucleotideRangeSelectorResult> {
    private static readonly config = {
        title: 'Select Nucleotide Range to View',
        startFieldName: 'Start Index',
        endFieldName: 'End Index'
    };

    private static readonly theme = {
        width: 140,
        panelSpacing: 10
    };

    private _props: NucleotideRangeSelectorProps;

    constructor(props: NucleotideRangeSelectorProps) {
        super();
        this._props = props;
    }

    protected added() {
        super.added();
        const {config, theme} = NucleotideRangeSelector;

        const inputPanel = this._props.isPartialRange
            ? new NucleotideRangeSelectorInput()
            : new TextInputPanel();
        inputPanel.title = config.title;

        const startField = inputPanel.addField(config.startFieldName, theme.width);
        const endField = inputPanel.addField(config.endFieldName, theme.width);
        const [start, end] = this._props.initialRange;
        startField.text = `${start}`;
        endField.text = `${end}`;

        this.addObject(inputPanel, this.container);

        startField.setFocus();
        inputPanel.setHotkeys(KeyCode.Enter, null, KeyCode.Escape, null);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => {
            const dict = inputPanel.getFieldValues();
            const startIndex = parseInt(dict.get(config.startFieldName), 10);
            const endIndex = parseInt(dict.get(config.endFieldName), 10);
            if ([startIndex, endIndex].some(Number.isNaN)) {
                this.close(null);
            } else {
                this.close({
                    startIndex,
                    endIndex,
                    clearRange: false
                });
            }
        });

        if (inputPanel instanceof NucleotideRangeSelectorInput) {
            inputPanel.onClear.connect(() => {
                this.close({
                    clearRange: true,
                    startIndex: -1,
                    endIndex: -1
                });
            });
        }


        const updateLocation = () => {
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }
}
