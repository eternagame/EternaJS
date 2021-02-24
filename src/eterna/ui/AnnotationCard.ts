import {ContainerObject, Dragger, GameObjectRef} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import {UnitSignal, Value} from 'signals';
import Eterna from 'eterna/Eterna';
import {Point} from 'pixi.js';
import {FontWeight} from '../../flashbang/util/TextBuilder';
import TextBalloon from './TextBalloon';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import {
    AnnotationData, AnnotationCategory, AnnotationItemType
} from './AnnotationItem';

export default class AnnotationCard extends ContainerObject {
    public readonly onEditButtonPressed = new UnitSignal();
    public readonly isMoving: Value<boolean> = new Value<boolean>(false);
    public readonly onMovedAnnotation: Value<Point | null> = new Value<Point | null>(null);

    constructor(
        type: AnnotationItemType,
        item: AnnotationData,
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

        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            color: 0xFFFFFF,
            alpha: this._item.selected ? 0.07 : 0,
            borderColor: 0x2F94D1,
            borderAlpha: this._item.selected ? 1 : 0
        });
        this._panel.pointerDown.connect(() => {
            if (this.isMoving.value) {
                this._draggerRef.destroyObject();
                const dragger = new Dragger();
                this._draggerRef = this.addObject(dragger);
                const startPoint = this._panel.display.toLocal(new Point(dragger.curX, dragger.curY));
                if (!this._prevPosition) {
                    this._prevPosition = new Point(this.display.x, this.display.y);
                }
                dragger.dragged.connect((p) => {
                    const point = p as Point;
                    this.display.x = point.x - startPoint.x;
                    this.display.y = point.y - startPoint.y;
                });

                dragger.dragComplete.connect(() => {
                    const endPoint = new Point(this.display.x, this.display.y);
                    this._draggedPosition = endPoint;
                });
            }
        });
        this._panel.pointerUp.connect(() => {
            if (this.isMoving.value) {
                this._draggerRef.destroyObject();
            }
        });
        this.addObject(this._panel, this.container);

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
            FontWeight.BOLD,
            AnnotationCard.MAX_WIDTH
        );
        this.addObject(this._card, this.container);
        this.display.cursor = 'pointer';

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
                .allStates(Bitmaps.ImgPencil)
                .tooltip('Edit');
            this._editButton.pointerDown.connect(() => {
                this.onEditButtonPressed.emit();
            });
            this.addObject(this._editButton, this.container);

            this._moveButton = new GameButton()
                .allStates(Bitmaps.ImgPointerHand)
                .tooltip('Move');
            this._moveButton.pointerDown.connect((e) => {
                this.isMoving.value = true;
                this._panel.color = 0x2F94D1;
                this._panel.alpha = 1;
                this._editButton.display.visible = false;
                this._editButton.enabled = false;
                this._card.setText(
                    this._item.title,
                    TextBalloon.DEFAULT_FONT_SIZE,
                    0xFFFFFF,
                    FontWeight.BOLD
                );
                this.display.cursor = 'grab';

                // Hide Move Button
                this._moveButton.display.visible = false;
                this._moveButton.enabled = false;

                // Show Save Button
                this._saveButton.display.visible = true;
                this._saveButton.enabled = true;

                // Show Cancel Button
                this._cancelMoveButton.display.visible = true;
                this._cancelMoveButton.enabled = true;

                e.stopPropagation();
            });
            this.addObject(this._moveButton, this.container);

            this._saveButton = new GameButton()
                .allStates(Bitmaps.ImgAnnotationCheckmark)
                .tooltip('Save');
            this._saveButton.pointerDown.connect((e) => {
                this.isMoving.value = false;
                this._panel.color = 0xFFFFFF;
                this._panel.alpha = 0.07;
                this._editButton.display.visible = true;
                this._editButton.enabled = true;
                this._card.setText(
                    this._item.title,
                    TextBalloon.DEFAULT_FONT_SIZE,
                    this._textColor,
                    FontWeight.BOLD
                );
                this.display.cursor = 'pointer';

                // Emit Dragged Position
                this.onMovedAnnotation.value = this._draggedPosition;

                // Clear cached position
                this._draggedPosition = null;
                this._prevPosition = null;

                // Hide Save Button
                this._saveButton.display.visible = false;
                this._saveButton.enabled = false;

                // Hide Cancel Button
                this._cancelMoveButton.display.visible = false;
                this._cancelMoveButton.enabled = false;

                // Show Move Button
                this._moveButton.display.visible = true;
                this._moveButton.enabled = true;

                e.stopPropagation();
            });
            this._saveButton.display.visible = false;
            this._saveButton.enabled = false;
            this.addObject(this._saveButton, this.container);

            this._cancelMoveButton = new GameButton()
                .allStates(Bitmaps.ImgAnnotationCross)
                .tooltip('Cancel');
            this._cancelMoveButton.pointerDown.connect((e) => {
                this.isMoving.value = false;
                this._panel.color = 0xFFFFFF;
                this._panel.alpha = 0.07;
                this._editButton.display.visible = true;
                this._editButton.enabled = true;
                this._card.setText(
                    this._item.title,
                    TextBalloon.DEFAULT_FONT_SIZE,
                    this._textColor,
                    FontWeight.BOLD
                );
                this.display.cursor = 'pointer';

                // Reset position
                if (this._prevPosition) {
                    this.display.x = this._prevPosition.x;
                    this.display.y = this._prevPosition.y;
                }

                // Clear cached position
                this._draggedPosition = null;
                this._prevPosition = null;

                // Hide Save Button
                this._saveButton.display.visible = false;
                this._saveButton.enabled = false;

                // Hide Cancel Button
                this._cancelMoveButton.display.visible = false;
                this._cancelMoveButton.enabled = false;

                // Show Move Button
                this._moveButton.display.visible = true;
                this._moveButton.enabled = true;

                e.stopPropagation();
            });
            this._cancelMoveButton.display.visible = false;
            this._cancelMoveButton.enabled = false;
            this.addObject(this._cancelMoveButton, this.container);

            this._panel.setSize(
                this._card.width + this._editButton.display.width + this._moveButton.display.width,
                this._card.height
            );
            this._editButton.display.x = this._card.width;
            this._editButton.display.y = (this._panel.height - this._editButton.display.height) / 2;
            this._moveButton.display.x = this._card.width + this._editButton.display.width;
            this._moveButton.display.y = (this._panel.height - this._moveButton.display.height) / 2;
            this._saveButton.display.x = this._card.width;
            this._saveButton.display.y = (this._panel.height - this._saveButton.display.height) / 2;
            this._cancelMoveButton.display.x = this._card.width + this._saveButton.display.width;
            this._cancelMoveButton.display.y = (this._panel.height - this._cancelMoveButton.display.height) / 2;
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
    private _item: AnnotationData;
    private _puzzleAnnotationsEditable: boolean;
    private _textColor: number;
    private _card: TextBalloon;
    private _editButton: GameButton;
    private _moveButton: GameButton;
    private _saveButton: GameButton;
    private _cancelMoveButton: GameButton;
    private _panel: GamePanel;
    private _draggerRef: GameObjectRef = GameObjectRef.NULL;
    private _draggedPosition: Point | null = null;
    private _prevPosition: Point | null = null;

    private static readonly MAX_WIDTH: number = 200;
}
