import {ContainerObject, Flashbang} from 'flashbang';
import {Point} from 'pixi.js';
import TextInputPanel from './TextInputPanel';

interface NucleotideFinderProps {
    onChanged: (nucleotideIndex: number) => void;
}

export default class NucleotideFinder {
    private static readonly theme = {
        title: 'Jump to Nucleotide',
        fieldName: 'Nucleotide Index',
        width: 80
    };

    public static create(props: NucleotideFinderProps) {
        const {theme} = NucleotideFinder;

        // backdrop
        const backdrop = new PIXI.Graphics();
        const drawBackDrop = () => {
            backdrop.clear();
            backdrop.beginFill(0, 0.4);
            backdrop.drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight);
            backdrop.endFill();
        };

        const panel = new ContainerObject();
        panel.pointerUp.connect(() => {});
        panel.container.addChild(backdrop);

        const inputPanel = new TextInputPanel();
        inputPanel.title = theme.title;
        const field = inputPanel.addField(theme.fieldName, theme.width);
        panel.addObject(inputPanel, panel.container);

        let value = '';
        field.valueChanged.connect((v) => {
            value = v;
        });

        const onAccept = () => {
            const index = parseInt(value, 10);
            if (!Number.isNaN(index)) {
                props.onChanged(index);
            }
            panel.destroySelf();
        };

        field.keyPressed.connect((key) => {
            if (key === 'Enter') {
                onAccept();
            }
        });
        inputPanel.okClicked.connect(onAccept);
        inputPanel.cancelClicked.connect(() => panel.destroySelf());

        const positionUpdater = () => {
            drawBackDrop();
            inputPanel.container.position = new Point(
                (Flashbang.stageWidth - theme.width) / 2,
                Flashbang.stageHeight / 2
            );
        };

        positionUpdater();

        // TODO: Investigate InputPanel construction, setFocus() doesn't work directly.
        // field.setFocus();
        setTimeout(() => field.setFocus(), 100);

        return {panel, positionUpdater};
    }
}
