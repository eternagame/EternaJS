import {Flashbang, KeyCode} from 'flashbang';
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

export default class NucleotideRangeSelector extends Dialog<NucleotideRangeSelectorResult> {
    private static readonly config = {
        title: 'Select nucleotide range to show',
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

        const inputPanel = new TextInputPanel();
        inputPanel.title = config.title;

        const startField = inputPanel.addField(config.startFieldName, theme.width);
        const endField = inputPanel.addField(config.endFieldName, theme.width);
        const [start, end] = this._props.initialRange;
        startField.text = `${start}`;
        endField.text = `${end}`;

        this.addObject(inputPanel, this.container);

        let clearButton: GameButton | null = null;
        if (this._props.isPartialRange) {
            clearButton = new GameButton()
                .label(
                    'Clear range (View all nucleotides)',
                    14
                );
            this.regs.add(clearButton.clicked.connect(() => {
                this.close({
                    clearRange: true,
                    startIndex: -1,
                    endIndex: -1
                });
            }));
            this.addObject(clearButton, this.container);
        }

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

        const updateLocation = () => {
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;

            if (clearButton) {
                clearButton.display.position.x = (Flashbang.stageWidth - clearButton.display.width) * 0.5;
                clearButton.display.position.y = inputPanel.display.position.y + inputPanel.height + theme.panelSpacing;
            }
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }
}
