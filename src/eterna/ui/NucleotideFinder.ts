import {KeyCode} from 'flashbang';
import FloatDialog from './FloatDialog';
import FlexibleTextInputPanel from './FlexibleTextInputPanel';

interface NucleotideFinderResult {
    nucleotideIndex: number;
}

export default class NucleotideFinder extends FloatDialog<NucleotideFinderResult> {
    private static readonly props = {
        title: 'Jump to Nucleotide',
        fieldName: 'Nucleotide Index'
    };

    private static readonly theme = {
        width: 80
    };

    constructor() {
        super(NucleotideFinder.props.title);
    }

    protected added() {
        super.added();
        const {props, theme} = NucleotideFinder;

        const inputPanel = new FlexibleTextInputPanel();
        const field = inputPanel.addField(props.fieldName, theme.width);
        this.addObject(inputPanel, this.contentVLay);

        field.setFocus();
        field.keyPressed.connect((key) => {
            if (key === 'Enter') {
                inputPanel.okClicked.emit(inputPanel.getFieldValues());
            }
        });

        inputPanel.setHotkeys(KeyCode.Enter, undefined, KeyCode.Escape);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => {
            const dict = inputPanel.getFieldValues();
            const nucleotideIndex = parseInt(dict.get(props.fieldName) ?? '', 10);
            if (Number.isNaN(nucleotideIndex)) {
                this.close(null);
            } else {
                this.close({nucleotideIndex});
            }
        });

        this.updateFloatLocation();
    }
}
