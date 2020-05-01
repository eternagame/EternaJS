import {Flashbang, KeyCode} from 'flashbang';
import TextInputPanel from './TextInputPanel';
import Dialog from './Dialog';

interface NucleotideFinderResult {
    nucleotideIndex: number;
}

export default class NucleotideFinder extends Dialog<NucleotideFinderResult> {
    private static readonly props = {
        title: 'Jump to Nucleotide',
        fieldName: 'Nucleotide Index'
    };

    private static readonly theme = {
        width: 80
    };

    protected added() {
        super.added();
        const {props, theme} = NucleotideFinder;

        const inputPanel = new TextInputPanel();
        inputPanel.title = props.title;
        const field = inputPanel.addField(props.fieldName, theme.width);
        this.addObject(inputPanel, this.container);

        field.setFocus();
        field.keyPressed.connect((key) => {
            if (key === 'Enter') {
                inputPanel.okClicked.emit(inputPanel.getFieldValues());
            }
        });

        inputPanel.setHotkeys(KeyCode.Enter, null, KeyCode.Escape, null);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => {
            const dict = inputPanel.getFieldValues();
            const nucleotideIndex = parseInt(dict.get(props.fieldName), 10);
            if (Number.isNaN(nucleotideIndex)) {
                this.close(null);
            } else {
                this.close({nucleotideIndex});
            }
        });

        const updateLocation = () => {
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }
}
