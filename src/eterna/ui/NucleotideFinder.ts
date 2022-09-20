import {KeyCode} from 'flashbang';
import WindowDialog from './WindowDialog';
import FlexibleTextInputPanel from './FlexibleTextInputPanel';

interface NucleotideFinderResult {
    nucleotideIndex: number;
}

export default class NucleotideFinder extends WindowDialog<NucleotideFinderResult> {
    private static readonly props = {
        title: 'Jump to Nucleotide',
        fieldName: 'Nucleotide Index'
    };

    private static readonly theme = {
        width: 80
    };

    private okCallback: (arg0: number)=>void;

    constructor(callback: (arg0: number)=>void) {
        super(NucleotideFinder.props.title);
        this.okCallback = callback;
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
                // this.close({nucleotideIndex});
                this.okCallback(nucleotideIndex);
            }
        });
        inputPanel.okButtonLabel = ' Jump ';

        this.updateFloatLocation();
    }
}
