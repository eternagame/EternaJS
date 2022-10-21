import {UnitSignal, Value} from 'signals';
import {
    Container,
    Graphics,
    Sprite,
    Text
} from 'pixi.js';
import {
    ContainerObject,
    VAlign,
    HAlign,
    HLayoutContainer,
    VLayoutContainer
} from 'flashbang';
import Flashbang from 'flashbang/core/Flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import TextBuilder, {FontWeight} from 'flashbang/util/TextBuilder';
import {
    AnnotationData,
    AnnotationHierarchyType,
    AnnotationCategory
} from 'eterna/AnnotationManager';
import GameButton from './GameButton';
import DragDropper, {DragDropType, Item} from './DragDropper';
import TextInputObject from './TextInputObject';
import AnnotationDialog from './AnnotationDialog';

interface TruncatedLabelText {
    object: Text;
    string: string;
}

interface AnnotationPanelItemProps {
    data: Omit<AnnotationData, 'positions'>;
    indexPath: number[];
    width: number;
    dividerThickness: number;
    titleEditable: boolean;
    updateTitle: (itemPath: number[], text: string) => void;
    updateAnnotationLayer: (annotation: Item, layerPath: number[]) => void;
    updateAnnotationPosition: (firstAnnotation: Item, secondAnnotationPath: number[]) => void;
    createNewLayer: (category: AnnotationCategory) => void;
}

export default class AnnotationPanelItem extends ContainerObject {
    public readonly isVisible: Value<boolean> = new Value<boolean>(true);
    public readonly isSelected: Value<boolean> = new Value<boolean>(false);
    public readonly isExpanded: Value<boolean> = new Value<boolean>(true);
    public readonly isEditingTitle: Value<boolean> = new Value<boolean>(false);
    public readonly onUpdatePanel = new UnitSignal();

    constructor(props: AnnotationPanelItemProps) {
        super();
        this._data = props.data;
        this._indexPath = props.indexPath;
        this._width = props.width;
        this._dividerThickness = props.dividerThickness;
        this._titleEditable = props.titleEditable;

        this.isVisible.value = props.data.visible ?? true;
        this.isSelected.value = props.data.selected ?? false;
        this.isExpanded.value = props.data.expanded ?? true;

        this._updateTitle = props.updateTitle;
        this._updateAnnotationLayer = props.updateAnnotationLayer;
        this._updateAnnotationPosition = props.updateAnnotationPosition;
        this._createNewLayer = props.createNewLayer;

        if (props.data.children.length > 0) {
            // Lay out annotation item children
            let numAnnotationChildren = 0;
            const modelChildren: AnnotationPanelItem[] = [];
            for (let i = 0; i < props.data.children.length; i++) {
                const child = props.data.children[i];
                if (child.type === AnnotationHierarchyType.LAYER) {
                    numAnnotationChildren += child.children?.length || 0;
                } else if (child.type === AnnotationHierarchyType.ANNOTATION) {
                    numAnnotationChildren += 1;
                }

                const item = new AnnotationPanelItem({
                    data: child,
                    indexPath: [...this._indexPath, i],
                    width: this._width,
                    dividerThickness: this._dividerThickness,
                    titleEditable: this._titleEditable,
                    updateTitle: this._updateTitle,
                    updateAnnotationLayer: this._updateAnnotationLayer,
                    updateAnnotationPosition: this._updateAnnotationPosition,
                    createNewLayer: this._createNewLayer
                });

                modelChildren.push(item);
            }
            this._numAnnotationChildren = numAnnotationChildren;
            this._modelChildren = modelChildren;
        }

        this._itemStack = new VLayoutContainer(0, HAlign.CENTER);
        this._itemContainer = new HLayoutContainer(0, VAlign.CENTER);
        this._itemStack.addChild(this._itemContainer);
        this.container.addChild(this._itemStack);
    }

    protected added(): void {
        super.added();
        let length: number;
        switch (this._data.type) {
            case AnnotationHierarchyType.CATEGORY:
                length = AnnotationPanelItem.CATEGORY_HEIGHT;
                break;
            case AnnotationHierarchyType.LAYER:
                length = AnnotationPanelItem.LAYER_HEIGHT;
                break;
            default:
                length = AnnotationPanelItem.ANNOTATION_HEIGHT;
                break;
        }

        let usedWidth = 0; // tracks how much horizontal space is being filled as we build out item container
        if (
            this._data.type === AnnotationHierarchyType.LAYER
            || (this._data.type === AnnotationHierarchyType.ANNOTATION && this._data.layerId === undefined)
        ) {
            // Layers or layerless annotations have a single indent
            const width = AnnotationPanelItem.LAYER_HEIGHT;
            this._itemIndent = new Graphics()
                .beginFill(
                    this.isSelected.value
                        ? AnnotationPanelItem.ITEM_BACKGROUND_SELECTED
                        : AnnotationPanelItem.ITEM_BACKGROUND_RESTING
                )
                .drawRect(
                    0,
                    0,
                    width,
                    this._data.type === AnnotationHierarchyType.LAYER
                        ? AnnotationPanelItem.LAYER_HEIGHT
                        : AnnotationPanelItem.ANNOTATION_HEIGHT
                )
                .endFill();
            usedWidth += width;
            this._itemContainer.addChild(this._itemIndent);
        } else if (this._data.type === AnnotationHierarchyType.ANNOTATION && this._data.layerId) {
            // Annotations in a layer have a double indent
            const width = 2 * AnnotationPanelItem.LAYER_HEIGHT;
            this._itemIndent = new Graphics()
                .beginFill(AnnotationPanelItem.ITEM_BACKGROUND_RESTING)
                .drawRect(
                    0,
                    0,
                    width,
                    AnnotationPanelItem.ANNOTATION_HEIGHT
                )
                .endFill();
            usedWidth += width;
            this._itemContainer.addChild(this._itemIndent);
        }

        // Set up visibility button
        this._visibilityButtonBackground = new Graphics()
            .beginFill(AnnotationPanelItem.VISIBILITY_BUTTON_BACKGROUND_COLOR)
            .drawRect(
                0,
                0,
                length,
                length
            )
            .endFill();
        this._visibilityEyeSprite = Sprite.from(Bitmaps.ImgEye);
        this._visibilityEyeSprite.width = length;
        this._visibilityEyeSprite.height = length;
        this._visibilityEyeSprite.alpha = 1;
        this._visibilityButtonBackground.addChild(this._visibilityEyeSprite);
        this._visibilityButton = new GameButton()
            .customStyleBox(this._visibilityButtonBackground)
            .tooltip(`Hide ${this._data.type.toString()}`);
        this._visibilityButton.display.cursor = 'pointer';
        this._visibilityButton.clicked.connect(() => {
            this.isVisible.value = !this.isVisible.value;
        });
        if (this.isVisible.value) {
            // Change tooltip text
            this._visibilityButton.tooltip(`Hide ${this._data.type.toString()}`);
            // Show visibility eye
            this._visibilityEyeSprite.alpha = 1;
        } else {
            // Change tooltip text
            this._visibilityButton.tooltip(`Show ${this._data.type.toString()}`);
            // Hide visibility eye
            this._visibilityEyeSprite.alpha = 0;
        }
        this.addObject(this._visibilityButton, this._itemContainer);

        // Set up item ribbon
        let ribbonColor: number;
        if (this._data.category === AnnotationCategory.STRUCTURE) {
            // RNA Annotation or Layer
            ribbonColor = AnnotationPanelItem.STRUCTURE_RIBBON_COLOR;
        } else if (this._data.category === AnnotationCategory.PUZZLE) {
            // PLAYER Annotation or Layer
            ribbonColor = AnnotationPanelItem.PUZZLE_RIBBON_COLOR;
        } else {
            // SOLUTION Annotation or Layer
            ribbonColor = AnnotationPanelItem.SOLUTION_RIBBON_COLOR;
        }
        this._itemRibbon = new Graphics()
            .beginFill(ribbonColor)
            .drawRect(
                0,
                0,
                AnnotationPanelItem.RIBBON_WIDTH,
                length
            )
            .endFill();
        this._itemContainer.addChild(this._itemRibbon);

        // Set up accordion chevron if necessary
        if (
            (
                this._data.type === AnnotationHierarchyType.CATEGORY
                && this._modelChildren
                && this._modelChildren.length > 0
            ) || (
                this._data.type === AnnotationHierarchyType.LAYER
                && this._modelChildren
                && this._modelChildren.length > 0
            )
        ) {
            const accordionChevronContainer = new Container();
            this._chevronRight = Sprite.from(Bitmaps.ImgChevronRight);
            this._chevronDown = Sprite.from(Bitmaps.ImgChevronDown);
            this._chevronDown.alpha = 0;
            const aspectRatio = this._chevronRight.width / this._chevronRight.height;
            this._accordionChevron = new Graphics()
                .beginFill(
                    this.isSelected.value
                        ? AnnotationPanelItem.ITEM_BACKGROUND_SELECTED
                        : AnnotationPanelItem.ITEM_BACKGROUND_RESTING
                )
                .drawRect(
                    0,
                    0,
                    length * aspectRatio,
                    length
                )
                .endFill();

            this._chevronButton = new GameButton()
                .customStyleBox(this._accordionChevron);
            this._chevronButton.clicked.connect(() => {
                this.isExpanded.value = !this.isExpanded.value;
            });
            if (this.isExpanded.value) {
                this._chevronRight.alpha = 0;
                this._chevronDown.alpha = 1;
            } else {
                this._chevronRight.alpha = 1;
                this._chevronDown.alpha = 0;
            }
            this.addObject(this._chevronButton, accordionChevronContainer);
            this._chevronRight.width = length * aspectRatio;
            this._chevronRight.height = length;
            this._chevronDown.width = length * aspectRatio;
            this._chevronDown.height = length;
            accordionChevronContainer.addChild(this._chevronRight);
            accordionChevronContainer.addChild(this._chevronDown);
            this._itemContainer.addChild(accordionChevronContainer);
            usedWidth += accordionChevronContainer.width;
        }

        // Set up layer name
        const textContainer = new Container();
        this._itemWidth = this._width - length - AnnotationPanelItem.RIBBON_WIDTH - usedWidth;
        this._itemButtonBackground = new Graphics()
            .beginFill(
                this.isSelected.value
                    ? AnnotationPanelItem.ITEM_BACKGROUND_SELECTED
                    : AnnotationPanelItem.ITEM_BACKGROUND_RESTING
            )
            .drawRect(
                0,
                0,
                this._itemWidth,
                length
            )
            .endFill();
        this._itemButton = new GameButton()
            .customStyleBox(this._itemButtonBackground);
        this._itemButton.display.cursor = 'default';
        this._itemButton.clicked.connect(() => {
            this.isSelected.value = !this.isSelected.value;
        });
        this.addObject(this._itemButton, textContainer);

        // Retrieve label that fits within remaining item container
        const preparedLabelText = this.prepareLabelText(this._data.title, this._itemWidth);
        const labelText = preparedLabelText.object;
        const truncatedText = preparedLabelText.string;

        if (this._data.type === AnnotationHierarchyType.CATEGORY) {
            // Create uneditable label
            labelText.y = (length - labelText.height) / 2;
            if (!this._modelChildren || this._modelChildren.length === 0) {
                labelText.x = AnnotationPanelItem.ITEM_BUTTON_MARGIN_LEFT;
            }
            textContainer.addChild(labelText);
            this._itemButton.tooltip(this._data.title);
        } else {
            // Create editable label (click to reveal input)
            const itemTextButtonTextBuilder = new TextBuilder(truncatedText)
                .font(Fonts.STDFONT)
                .fontSize(AnnotationPanelItem.FONT_SIZE)
                .fontWeight(FontWeight.REGULAR)
                .color(0xFFFFFF)
                .hAlignLeft();
            const labelTextBackground = new Graphics()
                .drawRect(
                    0,
                    0,
                    labelText.width,
                    labelText.height
                );
            this._itemTextButton = new GameButton()
                .customStyleBox(labelTextBackground)
                .label(itemTextButtonTextBuilder)
                .tooltip(this._data.title);

            if (this._titleEditable) {
                // Edit title
                this._itemTextButton.clicked.connect(() => {
                    this.isEditingTitle.value = !this.isEditingTitle.value;

                    if (this.isEditingTitle.value) {
                        this._itemNameInput.display.visible = true;
                        this._itemSaveEditButton.display.visible = true;
                        this._itemCancelEditButton.display.visible = true;
                        this._itemTextButton.display.visible = false;

                        // Add text to input
                        this._itemNameInput.text = this._data.title;
                    }
                });
            } else {
                // Select item
                this._itemTextButton.clicked.connect(() => {
                    this.isSelected.value = !this.isSelected.value;
                });
            }

            this._itemTextButton.display.y = (length - labelText.height) / 2;
            if (
                this._data.type === AnnotationHierarchyType.ANNOTATION
                || (
                    this._data.type === AnnotationHierarchyType.LAYER
                    && (!this._modelChildren || this._modelChildren.length === 0)
                )
            ) {
                this._itemTextButton.display.x = AnnotationPanelItem.ITEM_BUTTON_MARGIN_LEFT;
            }

            this.addObject(this._itemTextButton, textContainer);

            // Create input
            this._itemNameInput = new TextInputObject({
                fontSize: AnnotationPanelItem.INPUT_FONT_SIZE,
                width: this._itemWidth - AnnotationPanelItem.INPUT_MARGIN
                    - 2 * AnnotationPanelItem.ITEM_EDIT_BUTTON_WIDTH,
                height: length - 2 * AnnotationPanelItem.INPUT_MARGIN,
                rows: 1,
                placeholder: this._data.title,
                characterLimit: AnnotationDialog.ANNOTATION_TEXT_CHARACTER_LIMIT
            }).font(Fonts.STDFONT);
            this._itemNameInput.keyPressed.connect((key) => {
                if (key === 'Enter') {
                    this.saveEdit();
                } else if (key === 'Escape') {
                    this.cancelEdit();
                }
            });

            this._itemNameInput.display.x = AnnotationPanelItem.INPUT_MARGIN;
            this._itemNameInput.display.y = AnnotationPanelItem.INPUT_MARGIN;
            this._itemNameInput.display.visible = false;

            this.addObject(this._itemNameInput, textContainer);

            // Set up save edit button
            this._itemSaveEditButtonBackground = new Graphics()
                .beginFill(
                    this.isSelected.value
                        ? AnnotationPanelItem.ITEM_BACKGROUND_SELECTED
                        : AnnotationPanelItem.ITEM_BACKGROUND_RESTING
                )
                .drawRect(
                    0,
                    0,
                    AnnotationPanelItem.ITEM_EDIT_BUTTON_WIDTH,
                    length
                )
                .endFill();
            this._checkmarkSprite = Sprite.from(Bitmaps.ImgAnnotationCheckmark);
            this._checkmarkSprite.width = AnnotationPanelItem.ITEM_EDIT_BUTTON_WIDTH;
            this._checkmarkSprite.height = AnnotationPanelItem.ITEM_EDIT_BUTTON_WIDTH;
            this._checkmarkSprite.alpha = 1;
            this._itemSaveEditButtonBackground.addChild(this._checkmarkSprite);
            this._itemSaveEditButton = new GameButton()
                .customStyleBox(this._itemSaveEditButtonBackground)
                .tooltip('Save');
            this._itemSaveEditButton.display.cursor = 'pointer';
            this._itemSaveEditButton.clicked.connect(() => this.saveEdit());
            this._itemSaveEditButton.display.visible = false;
            this._itemSaveEditButton.display.x = this._itemNameInput.display.x
                + this._itemNameInput.width;
            this._itemSaveEditButton.display.y = (length - AnnotationPanelItem.ITEM_EDIT_BUTTON_WIDTH) / 2;
            this.addObject(this._itemSaveEditButton, textContainer);

            // Set up cancel edit button
            this._itemCancelEditButtonBackground = new Graphics()
                .beginFill(
                    this.isSelected.value
                        ? AnnotationPanelItem.ITEM_BACKGROUND_SELECTED
                        : AnnotationPanelItem.ITEM_BACKGROUND_RESTING
                )
                .drawRect(
                    0,
                    0,
                    AnnotationPanelItem.ITEM_EDIT_BUTTON_WIDTH,
                    length
                )
                .endFill();
            this._crossSprite = Sprite.from(Bitmaps.ImgAnnotationCross);
            this._crossSprite.width = AnnotationPanelItem.ITEM_EDIT_BUTTON_WIDTH;
            this._crossSprite.height = AnnotationPanelItem.ITEM_EDIT_BUTTON_WIDTH;
            this._crossSprite.alpha = 1;
            this._itemCancelEditButtonBackground.addChild(this._crossSprite);
            this._itemCancelEditButton = new GameButton()
                .customStyleBox(this._itemCancelEditButtonBackground)
                .tooltip('Cancel');
            this._itemCancelEditButton.display.cursor = 'pointer';
            this._itemCancelEditButton.clicked.connect(() => this.cancelEdit());
            this._itemCancelEditButton.display.visible = false;
            this._itemCancelEditButton.display.x = this._itemNameInput.display.x
                + this._itemNameInput.width + this._itemSaveEditButton.display.width;
            this._itemCancelEditButton.display.y = (length - AnnotationPanelItem.ITEM_EDIT_BUTTON_WIDTH) / 2;
            this.addObject(this._itemCancelEditButton, textContainer);
        }

        if (this._data.type === AnnotationHierarchyType.CATEGORY) {
            this._createLayerButton = new GameButton()
                .allStates(Bitmaps.ImgFolder)
                .tooltip('Add layer');
            this._createLayerButton.pointerDown.connect(() => {
                this._createNewLayer(this._data.category);
                // There is an odd bug where pointerUp does not trigger
                // on Button sometimes.
                // As a result, pointerTap is not always called, resulting
                // in inconsistent clicked.connect() emissions.
                //
                // We fix this by connecting to pointerDown and playing button
                // sound here.
                Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
            });
            this.addObject(this._createLayerButton, textContainer);
            this._createLayerButton.display.x = this._itemWidth
                - this._createLayerButton.display.width - AnnotationPanelItem.CREATE_LAYER_MARGIN_RIGHT;
            this._createLayerButton.display.y = (length - this._createLayerButton.display.height) / 2;
        }

        this._itemContainer.addChild(textContainer);

        // Updates horizontal layout of annotation item
        this._itemContainer.layout();

        // Add bottom divider
        const divider = new Graphics()
            .beginFill(AnnotationPanelItem.DIVIDER_COLOR)
            .drawRect(
                0,
                0,
                this._width,
                this._dividerThickness
            )
            .endFill();
        divider.x = 0;
        divider.y = length;
        this.container.addChild(divider);

        // Attach drag sources and drop targets
        switch (this._data.type) {
            case AnnotationHierarchyType.CATEGORY:
                this._dropTarget = new DragDropper({
                    dropType: DragDropType.TARGET,
                    itemDisplayObject: this.display,
                    pointerTarget: this._itemButton.container,
                    item: {
                        id: this._data.id,
                        index: this._indexPath,
                        type: this._data.type.toString()
                    },
                    acceptItemType: AnnotationHierarchyType.ANNOTATION.toString(),
                    onDrop: (item: Item): void => this.handleDrop(item),
                    onHoverStart: (): void => this.activateHoverHighlight(),
                    onHoverEnd: (): void => this.deactivateHoverHighlight()
                });
                break;
            case AnnotationHierarchyType.LAYER:
                this._dragSource = new DragDropper({
                    dropType: DragDropType.SOURCE,
                    itemDisplayObject: this.display,
                    pointerTarget: this._itemButton.container,
                    item: {
                        id: this._data.id,
                        index: this._indexPath,
                        type: this._data.type.toString()
                    },
                    draggingBorderColor: AnnotationPanelItem.ITEM_HOVER_COLOR,
                    canDrop: (): boolean => true
                });
                this._dropTarget = new DragDropper({
                    dropType: DragDropType.TARGET,
                    itemDisplayObject: this.display,
                    pointerTarget: this._itemButton.container,
                    item: {
                        id: this._data.id,
                        index: this._indexPath,
                        type: this._data.type.toString()
                    },
                    acceptItemType: AnnotationHierarchyType.ANNOTATION.toString(),
                    onDrop: (item: Item): void => this.handleDrop(item),
                    onHoverStart: (): void => this.activateHoverHighlight(),
                    onHoverEnd: (): void => this.deactivateHoverHighlight()
                });
                break;
            default:
                // Annotation
                this._dragSource = new DragDropper({
                    dropType: DragDropType.SOURCE,
                    itemDisplayObject: this.display,
                    pointerTarget: this._itemButton.container,
                    item: {
                        id: this._data.id,
                        index: this._indexPath,
                        type: this._data.type.toString()
                    },
                    draggingBorderColor: AnnotationPanelItem.ITEM_HOVER_COLOR,
                    canDrop: (): boolean => true
                });
                this._dropTarget = new DragDropper({
                    dropType: DragDropType.TARGET,
                    itemDisplayObject: this.display,
                    pointerTarget: this._itemButton.container,
                    item: {
                        id: this._data.id,
                        index: this._indexPath,
                        type: this._data.type.toString()
                    },
                    acceptItemType: AnnotationHierarchyType.ANNOTATION.toString(),
                    onDrop: (item: Item): void => this.handleDrop(item),
                    onHoverStart: (): void => this.activateHoverHighlight(),
                    onHoverEnd: (): void => this.deactivateHoverHighlight()
                });
                break;
        }

        if (this._dropTarget) {
            this.addObject(this._dropTarget);
        }
        if (this._dragSource) {
            this._itemButton.addObject(this._dragSource);
        }

        // Add any children to item stack
        if (this._modelChildren && this._modelChildren.length > 0 && this.isExpanded.value) {
            this.isExpanded.value = true;
            this._chevronRight.alpha = 0;
            this._chevronDown.alpha = 1;

            for (const child of this._modelChildren) {
                this.addObject(child, this._itemStack);
            }

            this._itemStack.layout();
        }
    }

    private prepareLabelText(text: string, maxWidth: number): TruncatedLabelText {
        let fullText = this._numAnnotationChildren != null
            ? `${text} (${this._numAnnotationChildren})` : text;
        let labelText = new TextBuilder(fullText)
            .font(Fonts.STDFONT)
            .fontSize(AnnotationPanelItem.FONT_SIZE)
            .fontWeight(FontWeight.REGULAR)
            .color(0xFFFFFF)
            .hAlignLeft()
            .build();
        let finalText = fullText;

        let truncatedText = text;
        while (labelText.width > maxWidth) {
            truncatedText = truncatedText.substring(0, truncatedText.length - 1);
            fullText = this._numAnnotationChildren != null
                ? `${truncatedText} (${this._numAnnotationChildren})` : truncatedText;
            labelText = new TextBuilder(fullText)
                .font(Fonts.STDFONT)
                .fontSize(AnnotationPanelItem.FONT_SIZE)
                .fontWeight(FontWeight.REGULAR)
                .color(0xFFFFFF)
                .hAlignLeft()
                .build();
            finalText = truncatedText;
        }
        if (truncatedText.length < text.length) {
            truncatedText = this._numAnnotationChildren != null
                ? `${truncatedText.substring(0, truncatedText.length - 4)}... (${this._numAnnotationChildren})`
                : `${truncatedText.substring(0, truncatedText.length - 3)}...`;
            labelText = new TextBuilder(truncatedText)
                .font(Fonts.STDFONT)
                .fontSize(AnnotationPanelItem.FONT_SIZE)
                .fontWeight(FontWeight.REGULAR)
                .color(0xFFFFFF)
                .hAlignLeft()
                .build();
            finalText = truncatedText;
        }

        return {
            object: labelText,
            string: finalText
        };
    }

    public setTitle(title: string): void {
        this._data.title = title;
        const preparedLabelText = this.prepareLabelText(this._data.title, this._itemWidth);
        const text = preparedLabelText.object;
        const truncText = preparedLabelText.string;
        const textBuilder = new TextBuilder(truncText)
            .font(Fonts.STDFONT)
            .fontSize(AnnotationPanelItem.FONT_SIZE)
            .fontWeight(FontWeight.REGULAR)
            .color(0xFFFFFF)
            .hAlignLeft();
        const background = new Graphics()
            .drawRect(
                0,
                0,
                text.width,
                text.height
            );
        this.itemTextButton
            .customStyleBox(background)
            .label(textBuilder)
            .tooltip(this._data.title);
        this.itemNameInput.placeholderText(this._data.title);

        // Update in state
        this._updateTitle(this._indexPath, this._data.title);
    }

    public observeDragSource(source: DragDropper) {
        this._observeDragSources.push(source);
        this._dropTarget.observeDragSource(source);
        source.isDragging.connect((dragging) => {
            if (!dragging) {
                this.deactivateHoverHighlight();
            }
        });
    }

    private redraw(graphic: Graphics, color: number, width: number, height: number) {
        graphic.clear();
        graphic
            .beginFill(color)
            .drawRect(
                0,
                0,
                width,
                height
            )
            .endFill();
    }

    private activateHoverHighlight() {
        if (this._itemIndent) {
            this.redraw(
                this._itemIndent,
                AnnotationPanelItem.ITEM_HOVER_COLOR,
                this._itemIndent.width,
                this._itemIndent.height
            );
        }
        if (this._accordionChevron) {
            this.redraw(
                this._accordionChevron,
                AnnotationPanelItem.ITEM_HOVER_COLOR,
                this._accordionChevron.width,
                this._accordionChevron.height
            );
        }
        this.redraw(
            this._itemButtonBackground,
            AnnotationPanelItem.ITEM_HOVER_COLOR,
            this._itemButtonBackground.width,
            this._itemButtonBackground.height
        );
    }

    private deactivateHoverHighlight() {
        if (this._itemIndent) {
            this.redraw(
                this._itemIndent,
                AnnotationPanelItem.ITEM_BACKGROUND_RESTING,
                this._itemIndent.width,
                this._itemIndent.height
            );
        }
        if (this._accordionChevron) {
            this.redraw(
                this._accordionChevron,
                AnnotationPanelItem.ITEM_BACKGROUND_RESTING,
                this._accordionChevron.width,
                this._accordionChevron.height
            );
        }
        this.redraw(
            this._itemButtonBackground,
            AnnotationPanelItem.ITEM_BACKGROUND_RESTING,
            this._itemButtonBackground.width,
            this._itemButtonBackground.height
        );
    }

    private handleDrop(item: Item) {
        if (this._data.type === AnnotationHierarchyType.CATEGORY) {
            this._updateAnnotationLayer(item, this._indexPath);
        } else if (this._data.type === AnnotationHierarchyType.LAYER) {
            this._updateAnnotationLayer(item, this._indexPath);
        } else if (this._data.type === AnnotationHierarchyType.ANNOTATION) {
            this._updateAnnotationPosition(item, this._indexPath);
        }
    }

    private saveEdit() {
        this.isEditingTitle.value = !this.isEditingTitle.value;
        this._itemNameInput.display.visible = false;
        this._itemSaveEditButton.display.visible = false;
        this._itemCancelEditButton.display.visible = false;
        this._itemTextButton.display.visible = true;
        if (this.itemTextButton) {
            // When we escape this this.itemTextButton is undefined for some unknown reason
            this.itemTextButton.display.visible = true;
        }

        const newTitle = this.itemNameInput.text;
        if (newTitle.length > 0 && newTitle !== this._data.title) {
            this._data.title = newTitle;
            const editedPreparedLabelText = this.prepareLabelText(this._data.title, this._itemWidth);
            const text = editedPreparedLabelText.object;
            const truncText = editedPreparedLabelText.string;
            const textBuilder = new TextBuilder(truncText)
                .font(Fonts.STDFONT)
                .fontSize(AnnotationPanelItem.FONT_SIZE)
                .fontWeight(FontWeight.REGULAR)
                .color(0xFFFFFF)
                .hAlignLeft();
            const background = new Graphics()
                .drawRect(
                    0,
                    0,
                    text.width,
                    text.height
                );
            this.itemTextButton
                .customStyleBox(background)
                .label(textBuilder)
                .tooltip(this._data.title);
            this.itemNameInput.placeholderText(this._data.title);

            // Update in state
            this._updateTitle(this._indexPath, this._data.title);
        }

        // only clear once complete
        this.itemNameInput.text = '';
    }

    private cancelEdit() {
        this.isEditingTitle.value = !this.isEditingTitle.value;
        this.itemNameInput.display.visible = false;
        this._itemSaveEditButton.display.visible = false;
        this._itemCancelEditButton.display.visible = false;
        this._itemTextButton.display.visible = true;
        if (this.itemTextButton) {
            // When we escape this this.itemTextButton is undefined for some unknown reason
            this.itemTextButton.display.visible = true;
        }

        // only clear once complete
        this.itemNameInput.text = '';
    }

    public get id() {
        return this._data.id;
    }

    public get category() {
        return this._data.category;
    }

    public get modelChildren() {
        return this._modelChildren;
    }

    public get title() {
        return this._data.title;
    }

    public get type() {
        return this._data.type;
    }

    public get timestamp() {
        return this._data.timestamp;
    }

    public get playerID() {
        return this._data.playerID;
    }

    public get ranges() {
        return this._data.ranges;
    }

    public get layerId() {
        return this._data.layerId;
    }

    public get dragSource() {
        return this._dragSource;
    }

    public get dropTarget() {
        return this._dropTarget;
    }

    public get indexPath() {
        return this._indexPath;
    }

    // we do this so that callbacks never cache particular value which will invariably change
    public get itemTextButton() {
        return this._itemTextButton;
    }

    public get itemNameInput() {
        return this._itemNameInput;
    }

    public get itemSaveEditButton() {
        return this._itemSaveEditButton;
    }

    public get itemCancelEditButton() {
        return this._itemCancelEditButton;
    }

    private _data: Omit<AnnotationData, 'positions'>;
    private _indexPath: number[];
    private _width: number;
    private _dividerThickness: number;
    private _titleEditable: boolean;
    private _itemStack: VLayoutContainer;
    private _itemContainer: HLayoutContainer;
    private _itemIndent: Graphics;
    private _visibilityButtonBackground: Graphics;
    private _visibilityEyeSprite: Sprite;
    private _visibilityButton: GameButton;
    private _itemRibbon: Graphics;
    private _chevronButton: GameButton;
    private _chevronRight: Sprite;
    private _chevronDown: Sprite;
    private _accordionChevron: Graphics;
    private _itemButton: GameButton;
    private _itemButtonBackground: Graphics;
    private _itemTextButton: GameButton;
    private _itemNameInput: TextInputObject;
    private _itemSaveEditButtonBackground: Graphics;
    private _createLayerButton: GameButton;
    private _checkmarkSprite: Sprite;
    private _itemSaveEditButton: GameButton;
    private _itemCancelEditButtonBackground: Graphics;
    private _crossSprite: Sprite;
    private _itemCancelEditButton: GameButton;
    private _modelChildren: AnnotationPanelItem[];
    private _numAnnotationChildren: number | null = null;
    private _itemWidth: number;
    private _dropTarget: DragDropper;
    private _dragSource: DragDropper;
    private _observeDragSources: DragDropper[] = [];
    private _updateTitle: (itemPath: number[], text: string) => void;
    private _updateAnnotationLayer: (annotation: Item, layerPath: number[]) => void;
    private _updateAnnotationPosition: (firstAnnotation: Item, secondAnnotationPath: number[]) => void;
    private _createNewLayer: (category: AnnotationCategory) => void;

    private static readonly CATEGORY_HEIGHT = 40;
    private static readonly LAYER_HEIGHT = 40;
    private static readonly ANNOTATION_HEIGHT = 30;
    private static readonly RIBBON_WIDTH = 3;
    private static readonly INPUT_FONT_SIZE = 14;
    private static readonly INPUT_MARGIN = 5;
    private static readonly FONT_SIZE = 14;
    private static readonly ITEM_BUTTON_MARGIN_LEFT = 10;
    private static readonly CREATE_LAYER_MARGIN_RIGHT = 10;
    private static readonly VISIBILITY_BUTTON_BACKGROUND_COLOR = 0x014278;
    private static readonly ITEM_BACKGROUND_RESTING = 0x025191;
    private static readonly ITEM_BACKGROUND_SELECTED = 0x025fab;
    private static readonly ITEM_EDIT_BUTTON_WIDTH = 30;
    private static readonly ITEM_HOVER_COLOR = 0x2F94D1;
    public static readonly STRUCTURE_RIBBON_COLOR = 0xD73832;
    public static readonly PUZZLE_RIBBON_COLOR = 0x2F94D1;
    public static readonly SOLUTION_RIBBON_COLOR = 0x53B64E;
    public static readonly DIVIDER_COLOR = 0x01345e;
}
