import {ContainerObject} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import {UnitSignal} from 'signals';
import Eterna from 'eterna/Eterna';
import {FontWeight} from '../../flashbang/util/TextBuilder';
import TextBalloon from './TextBalloon';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import {
    Annotation, AnnotationLayer, AnnotationCategory, AnnotationItemType
} from './AnnotationItem';

export default class AnnotationCard extends ContainerObject {
    public readonly onEditButtonPressed = new UnitSignal();

    constructor(
        type: AnnotationItemType,
        item: Annotation | AnnotationLayer,
        puzzleAnnotationsEditable: boolean,
        textColor: number
    ) {
        super();

        this._type = type;
        this._item = item;
        this._puzzleAnnotationsEditable = puzzleAnnotationsEditable;
        this._textColor = textColor;
    }

    protected added(): void {
        super.added();

        this._card = new TextBalloon(
            this._item.title,
            0xFFFFFF,
            0,
            0x2F94D1,
            0,
            null,
            null,
            undefined,
            undefined,
            this._textColor,
            FontWeight.BOLD
        );
        this.addObject(this._card, this.container);
        this.display.cursor = 'pointer';

        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            color: 0xFFFFFF,
            alpha: this._item.selected ? 0.07 : 0,
            borderColor: 0x2F94D1,
            borderAlpha: this._item.selected ? 1 : 0
        });
        this.addObject(this._panel, this.container);

        if (
            this._item.selected
            && Eterna.playerID === this._item.playerID
            && (
                this._item.category !== AnnotationCategory.PUZZLE
                || this._puzzleAnnotationsEditable
            )
            && this._item.category !== AnnotationCategory.STRUCTURE
            && this._type === AnnotationItemType.ANNOTATION
        ) {
            this._editButton = new GameButton()
                .allStates(Bitmaps.ImgPencil);
            this._editButton.pointerDown.connect(() => {
                this.onEditButtonPressed.emit();
            });
            this.addObject(this._editButton, this.container);
            this._panel.setSize(this._card.width + this._editButton.display.width, this._card.height);
            this._editButton.display.x = this._card.width;
            this._editButton.display.y = (this._panel.height - this._editButton.display.height) / 2;
        } else {
            this._panel.setSize(this._card.width, this._card.height);
        }
    }

    public get width(): number {
        return this.display.width;
    }

    public get height(): number {
        return this.display.height;
    }

    private _type: AnnotationItemType;
    private _item: Annotation | AnnotationLayer;
    private _puzzleAnnotationsEditable: boolean;
    private _textColor: number;
    private _card: TextBalloon;
    private _editButton: GameButton;
    private _panel: GamePanel;
}
