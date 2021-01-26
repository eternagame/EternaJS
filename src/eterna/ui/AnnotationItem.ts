import {UnitSignal, Value} from 'signals';
import {
    Container, Graphics, Sprite, Text
} from 'pixi.js';
import {
    ContainerObject,
    VAlign,
    HAlign,
    HLayoutContainer,
    VLayoutContainer
} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import TextBuilder, {FontWeight} from 'flashbang/util/TextBuilder';
import GameButton from './GameButton';
import DragDropper, {DragDropType, Item} from './DragDropper';
import TextInputObject from './TextInputObject';
import AnnotationDialog from './AnnotationDialog';

export interface AnnotationRange {
    start: number;
    end: number;
}

export interface AnnotationItemChild {
    id: string | number;
    type: ItemType;
    timestamp?: number;
    playerID?: number;
    title: string;
    body?: string;
    ranges?: AnnotationRange[];
    children?: AnnotationItemChild[];
}

// will an annotation need to know if it's a member of a layer?
export interface Annotation {
    id: string;
    timestamp: number;
    playerID: number;
    title: string;
    body?: string;
    ranges: AnnotationRange[];
    layer?: AnnotationLayer;
}

export interface AnnotationLayer {
    id: string | number;
    title: string;
    children?: AnnotationItemChild[];
}

export enum AnnotationCategory {
    STRUCTURE = 'Structure',
    PUZZLE = 'Puzzle',
    SOLUTION = 'Solution'
}

export enum ItemType {
    CATEGORY = 'category',
    LAYER = 'layer',
    ANNOTATION = 'annotation'
}

interface TruncatedLabelText {
    object: Text;
    string: string;
}

interface AnnotationItemProps {
    id: string | number;
    indexPath: number[];
    width: number;
    dividerThickness: number;
    type: ItemType;
    title: string;
    category: AnnotationCategory;
    inLayer?: boolean;
    children?: AnnotationItemChild[];
    updateTitle: (itemPath: number[], text: string) => void;
    updateAnnotationLayer: (annotation: Item, layerPath: number[]) => void;
    updateAnnotationPosition: (firstAnnotation: Item, secondAnnotationPath: number[]) => void;
}

export default class AnnotationItem extends ContainerObject {
    public readonly isVisible: Value<boolean> = new Value<boolean>(true);
    public readonly isSelected: Value<boolean> = new Value<boolean>(false);
    public readonly isExpanded: Value<boolean> = new Value<boolean>(true);
    public readonly isEditingTitle: Value<boolean> = new Value<boolean>(false);
    public readonly onUpdatePanel = new UnitSignal();
    constructor(props: AnnotationItemProps) {
        super();
        this._id = props.id;
        this._indexPath = props.indexPath;
        this._title = props.title;
        this._width = props.width;
        this._dividerThickness = props.dividerThickness;
        this._type = props.type;
        this._inLayer = props.inLayer || false;
        this._category = props.category;
        this._updateTitle = props.updateTitle;
        this._updateAnnotationLayer = props.updateAnnotationLayer;
        this._updateAnnotationPosition = props.updateAnnotationPosition;

        if (props.children) {
            // Lay out annotation item children
            const itemChildren: AnnotationItem[] = [];
            for (let i = 0; i < props.children.length; i++) {
                const child = props.children[i];
                const item = new AnnotationItem({
                    id: child.id,
                    indexPath: [...this._indexPath, i],
                    width: this._width,
                    dividerThickness: this._dividerThickness,
                    title: child.title,
                    type: child.type,
                    category: this._category,
                    children: child.children,
                    inLayer: this._type === ItemType.LAYER,
                    updateTitle: this._updateTitle,
                    updateAnnotationLayer: this._updateAnnotationLayer,
                    updateAnnotationPosition: this._updateAnnotationPosition
                });

                item.isExpanded.connect(() => {
                    // Removes children:
                    // 1) annotation item
                    // 2) child layers (if item is a category header)
                    // 3) child annotations (if item is a layer)
                    this._itemStack.removeChildren();

                    // Add back annotation item
                    this._itemStack.addChild(this._itemContainer);

                    // Adds back children:
                    // 1) child layers (if item is a category header)
                    // 2) child annotations (if item is a layer)
                    for (const itemChild of this._itemChildren) {
                        this._itemStack.addChild(itemChild.container);
                    }

                    // Updates vertical layout of annotation item + children
                    this._itemStack.layout();

                    // Notify that annotation layer panel that needs to be updated
                    this.onUpdatePanel.emit();
                });

                itemChildren.push(item);
            }
            this._itemChildren = itemChildren;
        }

        this._itemStack = new VLayoutContainer(0, HAlign.CENTER);
        this._itemContainer = new HLayoutContainer(0, VAlign.CENTER);
        this._itemStack.addChild(this._itemContainer);
        this.container.addChild(this._itemStack);
    }

    protected added(): void {
        super.added();
        let length: number;
        switch (this._type) {
            case ItemType.CATEGORY:
                length = AnnotationItem.CATEGORY_HEIGHT;
                break;
            case ItemType.LAYER:
                length = AnnotationItem.LAYER_HEIGHT;
                break;
            default:
                length = AnnotationItem.ANNOTATION_HEIGHT;
                break;
        }

        let usedWidth = 0; // tracks how much horizontal space is being filled as we build out item container
        if (this._type === ItemType.LAYER || (this._type === ItemType.ANNOTATION && !this._inLayer)) {
            // Layers or layerless annotations have a single indent
            const width = AnnotationItem.LAYER_HEIGHT;
            this._itemIndent = new Graphics()
                .beginFill(AnnotationItem.ITEM_BACKGROUND_RESTING)
                .drawRect(
                    0,
                    0,
                    width,
                    this._type === ItemType.LAYER ? AnnotationItem.LAYER_HEIGHT : AnnotationItem.ANNOTATION_HEIGHT
                )
                .endFill();
            usedWidth += width;
            this._itemContainer.addChild(this._itemIndent);
        } else if (this._type === ItemType.ANNOTATION && this._inLayer) {
            // Annotations in a layer have a double indent
            const width = 2 * AnnotationItem.LAYER_HEIGHT;
            this._itemIndent = new Graphics()
                .beginFill(AnnotationItem.ITEM_BACKGROUND_RESTING)
                .drawRect(
                    0,
                    0,
                    width,
                    AnnotationItem.ANNOTATION_HEIGHT
                )
                .endFill();
            usedWidth += width;
            this._itemContainer.addChild(this._itemIndent);
        }

        // Set up visibility button
        this._visibilityButtonBackground = new Graphics()
            .beginFill(AnnotationItem.VISIBILITY_BUTTON_BACKGROUND_COLOR)
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
            .tooltip(`Hide ${this._type.toString()}`);
        this._visibilityButton.display.cursor = 'pointer';
        this._visibilityButton.clicked.connect(() => {
            this.isVisible.value = !this.isVisible.value;

            if (this.isVisible.value) {
                // Change tooltip text
                this._visibilityButton.tooltip(`Hide ${this._type.toString()}`);
                // Show visibility eye
                this._visibilityEyeSprite.alpha = 1;
            } else {
                // Change tooltip text
                this._visibilityButton.tooltip(`Show ${this._type.toString()}`);
                // Hide visibility eye
                this._visibilityEyeSprite.alpha = 0;
            }
        });
        this.addObject(this._visibilityButton, this._itemContainer);

        // Set up item ribbon
        let ribbonColor: number;
        if (this._category === AnnotationCategory.STRUCTURE) {
            // RNA Annotation or Layer
            ribbonColor = AnnotationItem.STRUCTURE_RIBBON_COLOR;
        } else if (this._category === AnnotationCategory.PUZZLE) {
            // PLAYER Annotation or Layer
            ribbonColor = AnnotationItem.PUZZLE_RIBBON_COLOR;
        } else {
            // SOLUTION Annotation or Layer
            ribbonColor = AnnotationItem.SOLUTION_RIBBON_COLOR;
        }
        this._itemRibbon = new Graphics()
            .beginFill(ribbonColor)
            .drawRect(
                0,
                0,
                AnnotationItem.RIBBON_WIDTH,
                length
            )
            .endFill();
        this._itemContainer.addChild(this._itemRibbon);

        // Set up accordion chevron if necessary
        if (
            (this._type === ItemType.CATEGORY && this._itemChildren && this._itemChildren.length > 0)
            || (this._type === ItemType.LAYER && this._itemChildren && this._itemChildren.length > 0)
        ) {
            const accordionChevronContainer = new Container();
            this._chevronRight = Sprite.from(Bitmaps.ImgChevronRight);
            this._chevronDown = Sprite.from(Bitmaps.ImgChevronDown);
            this._chevronDown.alpha = 0;
            const aspectRatio = this._chevronRight.width / this._chevronRight.height;
            this._accordionChevron = new Graphics()
                .beginFill(AnnotationItem.ITEM_BACKGROUND_RESTING)
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
                const isExpanded = !this.isExpanded.value;
                if (isExpanded) {
                    this._chevronRight.alpha = 0;
                    this._chevronDown.alpha = 1;

                    // add item children
                    for (const child of this._itemChildren) {
                        this._itemStack.addChild(child.container);
                    }

                    // Updates vertical layout of annotation item + children
                    this._itemStack.layout();
                } else {
                    this._chevronRight.alpha = 1;
                    this._chevronDown.alpha = 0;

                    // remove item children
                    this._itemStack.removeChildren();
                    this._itemStack.addChild(this._itemContainer);

                    // Updates vertical layout of annotation item + children
                    this._itemStack.layout();
                }

                this.isExpanded.value = isExpanded;

                if (this._type === ItemType.CATEGORY) {
                    // Notify that annotation layer panel that needs to be updated
                    // if we expand or close category accordion
                    this.onUpdatePanel.emit();
                }
            });
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
        const itemWidth = this._width - length - AnnotationItem.RIBBON_WIDTH - usedWidth;
        this._itemButtonBackground = new Graphics()
            .beginFill(AnnotationItem.ITEM_BACKGROUND_RESTING)
            .drawRect(
                0,
                0,
                itemWidth,
                length
            )
            .endFill();
        this._itemButton = new GameButton()
            .customStyleBox(this._itemButtonBackground);
        this._itemButton.display.cursor = 'default';
        this._itemButton.clicked.connect(() => {
            if (!this.isSelected.value) {
                this.select();
            } else {
                this.deselect();
            }
        });
        this.addObject(this._itemButton, textContainer);

        // Retrieve label that fits within remaining item container
        const truncateLabelText = this.truncateLabelText(this._title, itemWidth);
        const labelText = truncateLabelText.object;
        const truncatedText = truncateLabelText.string;

        if (this._type === ItemType.CATEGORY) {
            // Create immutable label
            labelText.y = (length - labelText.height) / 2;
            if (!this._itemChildren || this._itemChildren.length === 0) {
                labelText.x = AnnotationItem.ITEM_BUTTON_MARGIN_LEFT;
            }
            textContainer.addChild(labelText);
            this._itemButton.tooltip(this._title);
        } else {
            // Create editabled label (click to reveal input)
            const itemTextButtonTextBuilder = new TextBuilder(truncatedText)
                .font(Fonts.STDFONT)
                .fontSize(AnnotationItem.FONT_SIZE)
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
                .tooltip(this._title);

            this._itemTextButton.clicked.connect(() => {
                this.isEditingTitle.value = !this.isEditingTitle.value;

                if (this.isEditingTitle.value) {
                    this._itemNameInput.display.visible = true;
                    this._itemTextButton.display.visible = false;
                } else {
                    this._itemNameInput.display.visible = false;
                    this._itemTextButton.display.visible = true;
                }
            });

            this._itemTextButton.display.y = (length - labelText.height) / 2;
            if (
                this._type === ItemType.ANNOTATION
                || (this._type === ItemType.LAYER && (!this._itemChildren || this._itemChildren.length === 0))
            ) {
                this._itemTextButton.display.x = AnnotationItem.ITEM_BUTTON_MARGIN_LEFT;
            }

            this.addObject(this._itemTextButton, textContainer);

            // Create input
            this._itemNameInput = new TextInputObject({
                fontSize: AnnotationItem.INPUT_FONT_SIZE,
                width: itemWidth - 2 * AnnotationItem.INPUT_MARGIN,
                height: length - 2 * AnnotationItem.INPUT_MARGIN,
                rows: 1,
                placeholder: this._title,
                characterLimit: AnnotationDialog.ANNOTATION_TEXT_CHARACTER_LIMIT
            }).font(Fonts.STDFONT);
            this._itemNameInput.keyPressed.connect((key) => {
                if (key === 'Enter' || key === 'Escape') {
                    this.isEditingTitle.value = !this.isEditingTitle.value;
                    this.itemNameInput.display.visible = false;
                    if (this.itemTextButton) {
                        // When we escape this this.itemTextButton is undefined for some unknown reason
                        this.itemTextButton.display.visible = true;
                    }

                    const newTitle = this.itemNameInput.text;
                    if (key === 'Enter' && newTitle.length > 0 && newTitle !== this._title) {
                        this._title = newTitle;
                        const truncLabelText = this.truncateLabelText(this._title, itemWidth);
                        const text = truncLabelText.object;
                        const truncText = truncLabelText.string;
                        const textBuilder = new TextBuilder(truncText)
                            .font(Fonts.STDFONT)
                            .fontSize(AnnotationItem.FONT_SIZE)
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
                            .tooltip(this._title);
                        this.itemNameInput.placeholderText(this._title);

                        // Update in state
                        this._updateTitle(this._indexPath, this._title);
                    }

                    // only clear once complete
                    this.itemNameInput.text = '';
                }
            });

            this._itemNameInput.display.x = AnnotationItem.INPUT_MARGIN;
            this._itemNameInput.display.y = AnnotationItem.INPUT_MARGIN;
            this._itemNameInput.display.visible = false;

            this.addObject(this._itemNameInput, textContainer);
        }

        this._itemContainer.addChild(textContainer);

        // Updates horizontal layout of annotation item
        this._itemContainer.layout();

        // Add bottom divider
        const divider = new Graphics()
            .beginFill(0x112238)
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
        switch (this._type) {
            case ItemType.CATEGORY:
                this._dropTarget = new DragDropper({
                    dropType: DragDropType.TARGET,
                    itemDisplayObject: this.display,
                    pointerTarget: this._itemButton.container,
                    item: {
                        id: this._id,
                        index: this._indexPath,
                        type: this._type.toString()
                    },
                    acceptItemType: ItemType.ANNOTATION.toString(),
                    onDrop: (item: Item): void => this.handleDrop(item),
                    onHoverStart: (): void => this.activateHoverHighlight(),
                    onHoverEnd: (): void => this.deactivateHoverHighlight()
                });
                break;
            case ItemType.LAYER:
                this._dragSource = new DragDropper({
                    dropType: DragDropType.SOURCE,
                    itemDisplayObject: this.display,
                    pointerTarget: this._itemButton.container,
                    item: {
                        id: this._id,
                        index: this._indexPath,
                        type: this._type.toString()
                    },
                    draggingBorderColor: AnnotationItem.ITEM_HOVER_COLOR,
                    canDrop: (): boolean => true
                });
                this._dropTarget = new DragDropper({
                    dropType: DragDropType.TARGET,
                    itemDisplayObject: this.display,
                    pointerTarget: this._itemButton.container,
                    item: {
                        id: this._id,
                        index: this._indexPath,
                        type: this._type.toString()
                    },
                    acceptItemType: ItemType.ANNOTATION.toString(),
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
                        id: this._id,
                        index: this._indexPath,
                        type: this._type.toString()
                    },
                    draggingBorderColor: AnnotationItem.ITEM_HOVER_COLOR,
                    canDrop: (): boolean => true
                });
                this._dropTarget = new DragDropper({
                    dropType: DragDropType.TARGET,
                    itemDisplayObject: this.display,
                    pointerTarget: this._itemButton.container,
                    item: {
                        id: this._id,
                        index: this._indexPath,
                        type: this._type.toString()
                    },
                    acceptItemType: ItemType.ANNOTATION.toString(),
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
        if (this._itemChildren && this._itemChildren.length > 0) {
            this.isExpanded.value = true;
            this._chevronRight.alpha = 0;
            this._chevronDown.alpha = 1;

            for (const child of this._itemChildren) {
                this.addObject(child, this._itemStack);
            }

            this._itemStack.layout();
        }
    }

    private truncateLabelText(text: string, maxWidth: number): TruncatedLabelText {
        let labelText = new TextBuilder(text)
            .font(Fonts.STDFONT)
            .fontSize(AnnotationItem.FONT_SIZE)
            .fontWeight(FontWeight.REGULAR)
            .color(0xFFFFFF)
            .hAlignLeft()
            .build();

        let truncatedText = text;
        while (labelText.width > maxWidth) {
            truncatedText = truncatedText.substring(0, truncatedText.length - 1);
            labelText = new TextBuilder(truncatedText)
                .font(Fonts.STDFONT)
                .fontSize(AnnotationItem.FONT_SIZE)
                .fontWeight(FontWeight.REGULAR)
                .color(0xFFFFFF)
                .hAlignLeft()
                .build();
        }
        if (truncatedText.length < text.length) {
            truncatedText = `${truncatedText.substring(0, truncatedText.length - 3)}...`;
            labelText = new TextBuilder(truncatedText)
                .font(Fonts.STDFONT)
                .fontSize(AnnotationItem.FONT_SIZE)
                .fontWeight(FontWeight.REGULAR)
                .color(0xFFFFFF)
                .hAlignLeft()
                .build();
        }

        return {
            object: labelText,
            string: truncatedText
        };
    }

    public select() {
        if (!this.isSelected.value) {
            this.isSelected.value = true;
        }

        if (this._itemIndent) {
            this.redraw(
                this._itemIndent,
                AnnotationItem.ITEM_BACKGROUND_SELECTED,
                this._itemIndent.width,
                this._itemIndent.height
            );
        }
        if (this._accordionChevron) {
            this.redraw(
                this._accordionChevron,
                AnnotationItem.ITEM_BACKGROUND_SELECTED,
                this._accordionChevron.width,
                this._accordionChevron.height
            );
        }
        this.redraw(
            this._itemButtonBackground,
            AnnotationItem.ITEM_BACKGROUND_SELECTED,
            this._itemButtonBackground.width,
            this._itemButtonBackground.height
        );
    }

    public deselect() {
        if (this.isSelected.value) {
            this.isSelected.value = false;
        }

        if (this._itemIndent) {
            this.redraw(
                this._itemIndent,
                AnnotationItem.ITEM_BACKGROUND_RESTING,
                this._itemIndent.width,
                this._itemIndent.height
            );
        }
        if (this._accordionChevron) {
            this.redraw(
                this._accordionChevron,
                AnnotationItem.ITEM_BACKGROUND_RESTING,
                this._accordionChevron.width,
                this._accordionChevron.height
            );
        }
        this.redraw(
            this._itemButtonBackground,
            AnnotationItem.ITEM_BACKGROUND_RESTING,
            this._itemButtonBackground.width,
            this._itemButtonBackground.height
        );
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
                AnnotationItem.ITEM_HOVER_COLOR,
                this._itemIndent.width,
                this._itemIndent.height
            );
        }
        if (this._accordionChevron) {
            this.redraw(
                this._accordionChevron,
                AnnotationItem.ITEM_HOVER_COLOR,
                this._accordionChevron.width,
                this._accordionChevron.height
            );
        }
        this.redraw(
            this._itemButtonBackground,
            AnnotationItem.ITEM_HOVER_COLOR,
            this._itemButtonBackground.width,
            this._itemButtonBackground.height
        );
    }

    private deactivateHoverHighlight() {
        if (this._itemIndent) {
            this.redraw(
                this._itemIndent,
                AnnotationItem.ITEM_BACKGROUND_RESTING,
                this._itemIndent.width,
                this._itemIndent.height
            );
        }
        if (this._accordionChevron) {
            this.redraw(
                this._accordionChevron,
                AnnotationItem.ITEM_BACKGROUND_RESTING,
                this._accordionChevron.width,
                this._accordionChevron.height
            );
        }
        this.redraw(
            this._itemButtonBackground,
            AnnotationItem.ITEM_BACKGROUND_RESTING,
            this._itemButtonBackground.width,
            this._itemButtonBackground.height
        );
    }

    private handleDrop(item: Item) {
        if (this._type === ItemType.CATEGORY) {
            this._updateAnnotationLayer(item, this._indexPath);
        } else if (this._type === ItemType.LAYER) {
            this._updateAnnotationLayer(item, this._indexPath);
        } else if (this._type === ItemType.ANNOTATION) {
            this._updateAnnotationPosition(item, this._indexPath);
        }
    }

    public get id() {
        return this._id;
    }

    public get itemChildren() {
        return this._itemChildren;
    }

    public get title() {
        return this._title;
    }

    public get type() {
        return this._type;
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

    private _id: string | number;
    private _indexPath: number[];
    private _title: string;
    private _width: number;
    private _dividerThickness: number;
    private _type: ItemType;
    private _category: AnnotationCategory;
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
    private _itemChildren: AnnotationItem[];
    private _dropTarget: DragDropper;
    private _dragSource: DragDropper;
    private _observeDragSources: DragDropper[] = [];
    private _updateTitle: (itemPath: number[], text: string) => void;
    private _updateAnnotationLayer: (annotation: Item, layerPath: number[]) => void;
    private _updateAnnotationPosition: (firstAnnotation: Item, secondAnnotationPath: number[]) => void;

    // Annotation
    private _inLayer: boolean;

    private static readonly CATEGORY_HEIGHT = 40;
    private static readonly LAYER_HEIGHT = 40;
    private static readonly ANNOTATION_HEIGHT = 30;
    private static readonly RIBBON_WIDTH = 3;
    private static readonly INPUT_FONT_SIZE = 14;
    private static readonly INPUT_MARGIN = 5;
    private static readonly FONT_SIZE = 14;
    private static readonly ITEM_BUTTON_MARGIN_LEFT = 10;
    private static readonly VISIBILITY_BUTTON_BACKGROUND_COLOR = 0x1D375C;
    private static readonly ITEM_BACKGROUND_RESTING = 0x152843;
    private static readonly ITEM_BACKGROUND_SELECTED = 0x254573;
    private static readonly ITEM_HOVER_COLOR = 0x2F94D1;
    private static readonly STRUCTURE_RIBBON_COLOR = 0xD73832;
    private static readonly PUZZLE_RIBBON_COLOR = 0x2F94D1;
    private static readonly SOLUTION_RIBBON_COLOR = 0x53B64E;
}
