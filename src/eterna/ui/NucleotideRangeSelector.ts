import {KeyCode} from 'flashbang';
import {UnitSignal} from 'signals';
import GameButton from './GameButton';
import FloatDialog from './FloatDialog';
import FlexibleTextInputPanel from './FlexibleTextInputPanel';

interface NucleotideRangeSelectorProps {
    initialRange: [number, number];
    isPartialRange: boolean;
}

interface NucleotideRangeSelectorResult {
    startIndex: number;
    endIndex: number;
    clearRange: boolean;
}

class NucleotideRangeSelectorInput extends FlexibleTextInputPanel {
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

        const spacing = 30;
        const buttons = [this._okButton, this._clearButton, this._cancelButton];

        const totalWidth = buttons.reduce(
            (prev, cur) => prev + cur.container.width + spacing,
            -spacing
        );
        buttons.forEach((b, index) => {
            b.display.position.x = (this._width - totalWidth) / 2;
            for (let i = index - 1; i >= 0; --i) {
                b.display.position.x += buttons[i].container.width + spacing;
            }
        });

        this._clearButton.display.position.y = this._okButton.display.position.y;
    }
}

export default class NucleotideRangeSelector extends FloatDialog<NucleotideRangeSelectorResult> {
    private static readonly config = {
        title: 'Select Nucleotide Range',
        startFieldName: 'Start Index',
        endFieldName: 'End Index'
    };

    private static readonly theme = {
        width: 140,
        panelSpacing: 10
    };

    private _props: NucleotideRangeSelectorProps;

    constructor(props: NucleotideRangeSelectorProps) {
        super(NucleotideRangeSelector.config.title);
        this._props = props;
    }

    protected added() {
        super.added();
        const {config, theme} = NucleotideRangeSelector;

        const inputPanel = this._props.isPartialRange
            ? new NucleotideRangeSelectorInput()
            : new FlexibleTextInputPanel();

        const startField = inputPanel.addField(config.startFieldName, theme.width);
        const endField = inputPanel.addField(config.endFieldName, theme.width);
        const [start, end] = this._props.initialRange;
        startField.text = `${start}`;
        endField.text = `${end}`;

        this.addObject(inputPanel, this.contentVLay);

        startField.setFocus();
        inputPanel.setHotkeys(KeyCode.Enter, undefined, KeyCode.Escape);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => {
            const dict = inputPanel.getFieldValues();
            const startIndex = parseInt(dict.get(config.startFieldName) ?? '', 10);
            const endIndex = parseInt(dict.get(config.endFieldName) ?? '', 10);
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

        this.updateFloatLocation();
    }
}
