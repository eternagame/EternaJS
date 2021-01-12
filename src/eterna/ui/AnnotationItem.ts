import {UnitSignal, Value} from 'signals';
import {Container, Graphics, Sprite} from 'pixi.js';
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
// import TextInputObject from './TextInputObject';
// import {Item} from './DragDropper';

export interface AnnotationCategory {
    name: string;
    children: AnnotationItemChild[];
}

export interface AnnotationItemChild {
    id: string;
    type: ItemType;
    timestamp?: number;
    playerID?: number;
    title: string;
    body?: string;
    ranges?: number[][];
    children?: AnnotationItemChild[];
}

// will an annotation need to know if it's a member of a layer?
export interface Annotation {
    id: string;
    timestamp: number;
    playerID: number;
    title: string;
    body?: string;
    ranges?: number[][];
}

export interface AnnotationLayer {
    id: string;
    title: string;
    children: AnnotationItemChild[];
}

export enum AnnotationType {
    STRUCTURE = 'Structure',
    PUZZLE = 'Puzzle',
    SOLUTION = 'Solution'
}

export enum ItemType {
    CATEGORY_HEADER,
    LAYER,
    ANNOTATION
}

interface AnnotationItemProps {
    width: number;
    dividerThickness: number;
    type: ItemType;
    title: string;
    annotationType: AnnotationType;
    inLayer?: boolean;
    children?: AnnotationItemChild[];
}

export default class AnnotationItem extends ContainerObject {
    /** Emitted when the user interacts with the menu. */
    public readonly isVisible: Value<boolean> = new Value<boolean>(false);
    public readonly isSelected: Value<boolean> = new Value<boolean>(false);
    public readonly isExpanded: Value<boolean> = new Value<boolean>(false);
    public readonly updatePanel = new UnitSignal();
    constructor(props: AnnotationItemProps) {
        super();
        this._title = props.title;
        this._width = props.width;
        this._dividerThickness = props.dividerThickness;
        this._type = props.type;
        this._inLayer = props.inLayer || false;
        this._annotationType = props.annotationType;

        this._treeContainer = new VLayoutContainer(0, HAlign.CENTER);
        this._itemContainer = new HLayoutContainer(0, VAlign.CENTER);
        this._treeContainer.addChild(this._itemContainer);
        this.container.addChild(this._treeContainer);

        if (props.children) {
            const itemChildren: AnnotationItem[] = [];
            for (const child of props.children) {
                const item = new AnnotationItem({
                    width: this._width,
                    dividerThickness: this._dividerThickness,
                    title: child.title,
                    type: child.type,
                    annotationType: this._annotationType,
                    children: child.children,
                    inLayer: this._type === ItemType.LAYER
                });
                item.isExpanded.connect(() => {
                    // remove children
                    this._treeContainer.removeChildren();
                    this._treeContainer.addChild(this._itemContainer);

                    // add children
                    for (const itemChild of this._itemChildren) {
                        this._treeContainer.addChild(itemChild.container);
                    }

                    this._treeContainer.layout();
                    this.updatePanel.emit();
                });
                itemChildren.push(item);
            }
            this._itemChildren = itemChildren;
        }
    }

    protected added(): void {
        super.added();
        let length: number;
        switch (this._type) {
            case ItemType.CATEGORY_HEADER:
                length = AnnotationItem.CATEGORY_HEADER_HEIGHT;
                break;
            case ItemType.LAYER:
                length = AnnotationItem.LAYER_HEIGHT;
                break;
            default:
                length = this._inLayer ? AnnotationItem.ANNOTATION_HEIGHT : AnnotationItem.LAYER_HEIGHT;
                break;
        }

        let usedWidth = 0;
        let type = '';
        let text = '';
        if (this._type === ItemType.LAYER || (this._type === ItemType.ANNOTATION && !this._inLayer)) {
            const width = AnnotationItem.LAYER_HEIGHT;
            this._initialItemPadding = new Graphics()
                .beginFill(0x254573)
                .drawRect(
                    0,
                    0,
                    width,
                    AnnotationItem.LAYER_HEIGHT
                )
                .endFill();
            this._initialItemPadding.alpha = 0;
            usedWidth += width;
            type = this._type === ItemType.LAYER ? 'layer' : 'annotation';
            text = this._title;
            this._itemContainer.addChild(this._initialItemPadding);
        } else if (this._type === ItemType.ANNOTATION && this._inLayer) {
            const width = 2 * AnnotationItem.LAYER_HEIGHT;
            this._initialItemPadding = new Graphics()
                .beginFill(0x254573)
                .drawRect(
                    0,
                    0,
                    width,
                    AnnotationItem.ANNOTATION_HEIGHT
                )
                .endFill();
            this._initialItemPadding.alpha = 0;
            usedWidth += width;
            type = 'annotation';
            text = this._title;
            this._itemContainer.addChild(this._initialItemPadding);
        } else {
            type = 'category';
            text = this._title;
        }

        // Set up visibility button
        this._visibilityButtonBackground = new Graphics()
            .beginFill(0x1D375C)
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
            .tooltip(`Hide ${type}`);
        this._visibilityButton.display.cursor = 'pointer';
        this._visibilityButton.clicked.connect(() => {
            this.isVisible.value = !this.isVisible.value;

            if (this.isVisible.value) {
                // Change tooltip text
                this._visibilityButton.tooltip(`Hide ${type}`);
                // Show visibility eye
                this._visibilityEyeSprite.alpha = 1;
            } else {
                // Change tooltip text
                this._visibilityButton.tooltip(`Show ${type}`);
                // Hide visibility eye
                this._visibilityEyeSprite.alpha = 0;
            }
        });
        this.addObject(this._visibilityButton, this._itemContainer);

        // Set up item ribbon
        let ribbonColor: number;
        if (this._annotationType === AnnotationType.STRUCTURE) {
            // RNA Annotation or Layer
            ribbonColor = 0xD73832;
        } else if (this._annotationType === AnnotationType.PUZZLE) {
            // PLAYER Annotation or Layer
            ribbonColor = 0x2F94D1;
        } else {
            // SOLUTION Annotation or Layer
            ribbonColor = 0x53B64E;
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
            (this._type === ItemType.CATEGORY_HEADER && this._itemChildren)
            || (this._type === ItemType.LAYER && this._itemChildren)
        ) {
            const accordionChevronContainer = new Container();
            this._chevronRight = Sprite.from(Bitmaps.ImgChevronRight);
            this._chevronDown = Sprite.from(Bitmaps.ImgChevronDown);
            this._chevronDown.alpha = 0;
            const aspectRatio = this._chevronRight.width / this._chevronRight.height;
            this._accordionChevron = new Graphics()
                .beginFill(0x254573)
                .drawRect(
                    0,
                    0,
                    length * aspectRatio,
                    length
                )
                .endFill();
            this._accordionChevron.alpha = 0;
            const chevronButton = new GameButton()
                .customStyleBox(this._accordionChevron);
            chevronButton.clicked.connect(() => {
                const isExpanded = !this.isExpanded.value;
                if (isExpanded) {
                    this._chevronRight.alpha = 0;
                    this._chevronDown.alpha = 1;

                    // add children
                    for (const child of this._itemChildren) {
                        this._treeContainer.addChild(child.container);
                    }

                    this._treeContainer.layout();
                } else {
                    this._chevronRight.alpha = 1;
                    this._chevronDown.alpha = 0;

                    // remove children
                    this._treeContainer.removeChildren();
                    this._treeContainer.addChild(this._itemContainer);

                    this._treeContainer.layout();
                }

                this.isExpanded.value = isExpanded;

                if (this._type === ItemType.CATEGORY_HEADER) {
                    this.updatePanel.emit();
                }
            });
            this.addObject(chevronButton, accordionChevronContainer);
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
        this._itemBackground = new Graphics()
            .beginFill(0x254573)
            .drawRect(
                0,
                0,
                itemWidth,
                length
            )
            .endFill();
        this._itemBackground.alpha = 0;
        this._itemButton = new GameButton()
            .customStyleBox(this._itemBackground)
            .tooltip(text);
        this._itemButton.display.cursor = 'default';
        this._itemButton.clicked.connect(() => {
            this.isSelected.value = !this.isSelected.value;

            if (this.isSelected.value) {
                this._itemBackground.alpha = 1;
                if (this._initialItemPadding) {
                    this._initialItemPadding.alpha = 1;
                }
                if (this._accordionChevron) {
                    this._accordionChevron.alpha = 1;
                }
            } else {
                this._itemBackground.alpha = 0;
                if (this._initialItemPadding) {
                    this._initialItemPadding.alpha = 0;
                }
                if (this._accordionChevron) {
                    this._accordionChevron.alpha = 0;
                }
            }
        });
        this.addObject(this._itemButton, textContainer);

        let labelText = new TextBuilder(text)
            .font(Fonts.STDFONT)
            .fontSize(AnnotationItem.FONT_SIZE)
            .fontWeight(FontWeight.REGULAR)
            .color(0xFFFFFF)
            .hAlignLeft()
            .build();
        let truncatedText = text;
        while (labelText.width > itemWidth) {
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

        labelText.y = (length - labelText.height) / 2;
        if (
            this._type === ItemType.ANNOTATION
            || (this._type === ItemType.CATEGORY_HEADER && !this._itemChildren)
            || (this._type === ItemType.LAYER && !this._itemChildren)
        ) {
            labelText.x = AnnotationItem.ITEM_BUTTON_MARGIN_LEFT;
        }
        textContainer.addChild(labelText);
        this._itemContainer.addChild(textContainer);

        // this._itemNameInput = new TextInputObject({
        //     fontSize: AnnotationItem.INPUT_FONT_SIZE,
        //     width: itemWidth,
        //     height: length - 2 * AnnotationItem.INPUT_MARGIN,
        //     rows: 1,
        //     placeholder: this._type === ItemType.LAYER ? 'Layer Name' : 'Annotation Text'
        // }).font(Fonts.STDFONT);

        this._itemContainer.layout();

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

        if (this._itemChildren) {
            this.isExpanded.value = true;
            this._chevronRight.alpha = 0;
            this._chevronDown.alpha = 1;

            for (const child of this._itemChildren) {
                this.addObject(child, this._treeContainer);
            }

            this._treeContainer.layout();
        }
    }

    public deselect() {
        this.isSelected.value = false;
        this._itemBackground.alpha = 0;
        if (this._initialItemPadding) {
            this._initialItemPadding.alpha = 0;
        }
        if (this._accordionChevron) {
            this._accordionChevron.alpha = 0;
        }
    }

    public get itemChildren() {
        return this._itemChildren;
    }

    public get title() {
        return this._title;
    }

    private _title: string;
    private _width: number;
    private _dividerThickness: number;
    private _type: ItemType;
    private _annotationType: AnnotationType;
    private _treeContainer: VLayoutContainer;
    private _itemContainer: HLayoutContainer;
    private _initialItemPadding: Graphics;
    private _visibilityButtonBackground: Graphics;
    private _visibilityEyeSprite: Sprite;
    private _visibilityButton: GameButton;
    private _itemRibbon: Graphics;
    private _chevronRight: Sprite;
    private _chevronDown: Sprite;
    private _accordionChevron: Graphics;
    private _itemButton: GameButton;
    private _itemBackground: Graphics;
    // private _itemNameInput: TextInputObject;
    private _itemChildren: AnnotationItem[];

    // Annotation
    // private _isEditingName: boolean = false;
    private _inLayer: boolean;

    private static readonly CATEGORY_HEADER_HEIGHT = 40;
    private static readonly LAYER_HEIGHT = 40;
    private static readonly ANNOTATION_HEIGHT = 30;
    private static readonly RIBBON_WIDTH = 3;
    // private static readonly INPUT_FONT_SIZE = 14;
    // private static readonly INPUT_MARGIN = 3;
    private static readonly FONT_SIZE = 14;
    private static readonly ITEM_BUTTON_MARGIN_LEFT = 10;
}
