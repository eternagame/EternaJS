import {Graphics, Text} from 'pixi.js';
import {Value} from 'signals';
import {
    VLayoutContainer,
    HAlign,
    HLayoutContainer,
    VAlign,
    DisplayUtil,
    Flashbang,
    Assert
} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import Fonts from 'eterna/util/Fonts';
import {FontWeight} from 'flashbang/util/TextBuilder';
import {v4 as uuidv4} from 'uuid';
import Eterna from 'eterna/Eterna';
import {
    AnnotationRange,
    AnnotationData,
    AnnotationHierarchyType,
    AnnotationCategory
} from 'eterna/AnnotationManager';
import Dialog from './Dialog';
import GameButton from './GameButton';
import TextInputObject from './TextInputObject';
import {InputField} from './TextInputPanel';
import GamePanel, {GamePanelType} from './GamePanel';
import VScrollBox from './VScrollBox';
import GameDropdown from './GameDropdown';

export default class AnnotationDialog extends Dialog<AnnotationData> {
    // Signals to update selected ranges
    public readonly onUpdateRanges: Value<AnnotationRange[] | null> = new Value<AnnotationRange[] | null>(null);

    constructor(
        edit: boolean,
        title: boolean,
        sequenceLength: number,
        initialRanges: AnnotationRange[],
        initialLayers: AnnotationData[],
        initialAnnotation: AnnotationData | null = null
    ) {
        super(edit);
        this._edit = edit;
        this._hasTitle = title;
        this._sequenceLength = sequenceLength;
        this._initialRanges = initialRanges.sort((firstRange, secondRange) => firstRange.start - secondRange.start);
        this._layers = initialLayers;
        if (initialAnnotation) {
            this._initialAnnotation = initialAnnotation;
        }
    }

    protected added(): void {
        super.added();
        // Generate Dialog Heading
        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1,
            color: AnnotationDialog.PANEL_COLOR,
            borderAlpha: this._modal ? 1 : 0,
            borderColor: AnnotationDialog.UPPER_TOOLBAR_DIVIDER_COLOR,
            dropShadow: true
        });
        if (this._hasTitle) {
            this._panel.title = this._edit ? 'Edit Annotation' : 'New Annotation';
        }
        this.addObject(this._panel, this.container);

        let closeButton: GameButton | null = null;
        if (this._modal) {
            // Generate Dialog Close Button
            closeButton = new GameButton()
                .allStates(Bitmaps.ImgAchievementsClose);
            this.addObject(closeButton, this.container);
            closeButton.display.width = AnnotationDialog.CLOSE_BUTTON_LENGTH;
            closeButton.display.height = AnnotationDialog.CLOSE_BUTTON_LENGTH;
            closeButton.clicked.connect(() => {
                this.close(this._initialAnnotation || null);
            });
        }

        // Primary dialog contents
        const inputContainer = new VScrollBox(0, 0);
        this.addObject(inputContainer, this.container);

        // Generate Dialog Body
        this._textInputLayout = new VLayoutContainer(0, HAlign.CENTER);
        this._textInputLayout.sortableChildren = true;
        inputContainer.content.addChild(this._textInputLayout);

        // Add Text Field
        this._titleField = this.getInputField(
            'Text',
            'Annotation Text',
            AnnotationDialog.FIELD_WIDTH,
            AnnotationDialog.FIELD_HEIGHT,
            false,
            AnnotationDialog.ANNOTATION_TEXT_CHARACTER_LIMIT
        );
        this._titleField.input.valueChanged.connect(() => {
            const isValid = this.isValidAnnotation();
            this._saveButton.enabled = isValid;
        });
        this._titleField.input.keyPressed.connect((key) => {
            if (key === 'Enter') {
                this._saveButton.click();
            }
        });
        if (this._initialAnnotation) {
            // If we're editing annotation, insert initial text
            this._titleField.input.text = this._initialAnnotation.title;
        }
        this._textInputLayout.addChild(this._titleField.label);
        inputContainer.addObject(this._titleField.input, this._textInputLayout);

        // Add Bases Field
        this._basesField = this.getInputField(
            'Bases',
            'Base Ranges (e.g. 1-5, 10-12)',
            AnnotationDialog.FIELD_WIDTH,
            AnnotationDialog.FIELD_HEIGHT
        );
        if (this._initialRanges !== null) {
            const baseRanges = AnnotationDialog.annotationRangeToString(this._initialRanges);
            // set ranges string
            this._basesField.input.text = baseRanges;
        }
        this._basesField.input.valueChanged.connect(() => {
            const isValid = this.isValidAnnotation();
            this._saveButton.enabled = isValid;
            if (this.isValidRanges()) {
                this.onUpdateRanges.value = AnnotationDialog.stringToAnnotationRange(this._basesField.input.text);
                this.onUpdateRanges.value = null;
            }
        });
        this._basesField.input.keyPressed.connect((key) => {
            if (key === 'Enter') {
                this._saveButton.click();
            }
        });
        this._textInputLayout.addChild(this._basesField.label);
        inputContainer.addObject(this._basesField.input, this._textInputLayout);
        this._titleField.input.setFocus();

        // Generate Dialog Action Buttons
        const buttonPadding = AnnotationDialog.FIELD_WIDTH
            - 2 * AnnotationDialog.ACTION_BUTTON_WIDTH
            - 2 * AnnotationDialog.ACTION_BUTTON_BORDER_WIDTH;
        let dropdownSectionHeight = 0;
        if (this._layers.length > 0) {
            dropdownSectionHeight = AnnotationDialog.DROPDOWN_HEIGHT
                + AnnotationDialog.LABEL_PADDING
                + AnnotationDialog.FIELD_MARGIN
                + AnnotationDialog.FONT_SIZE;
        }
        this._actionButtonLayout = new HLayoutContainer(buttonPadding, VAlign.CENTER);
        inputContainer.content.addChild(this._actionButtonLayout);
        // 1) Cancel Button
        const cancelButtonGraphic = new Graphics()
            .lineStyle(
                AnnotationDialog.ACTION_BUTTON_BORDER_WIDTH,
                AnnotationDialog.UPPER_TOOLBAR_DIVIDER_COLOR
            ).beginFill(AnnotationDialog.PANEL_COLOR)
            .drawRoundedRect(
                0,
                0,
                AnnotationDialog.ACTION_BUTTON_WIDTH,
                AnnotationDialog.ACTION_BUTTON_HEIGHT,
                AnnotationDialog.ACTION_BUTTON_CORNER_RADIUS
            )
            .endFill();
        const cancelButton = new GameButton()
            .customStyleBox(cancelButtonGraphic)
            .label('Cancel', AnnotationDialog.ACTION_BUTTON_FONT_SIZE);
        cancelButton.clicked.connect(() => {
            this.close(this._initialAnnotation || null);
        });
        inputContainer.addObject(cancelButton, this._actionButtonLayout);
        // 2) Save Button
        const saveButtonGraphic = new Graphics()
            .beginFill(AnnotationDialog.ACTION_BUTTON_SUCCESS_COLOR)
            .drawRoundedRect(
                0,
                0,
                AnnotationDialog.ACTION_BUTTON_WIDTH,
                AnnotationDialog.ACTION_BUTTON_HEIGHT,
                AnnotationDialog.ACTION_BUTTON_CORNER_RADIUS
            ).endFill();
        this._saveButton = new GameButton()
            .customStyleBox(saveButtonGraphic)
            .label('Save', AnnotationDialog.ACTION_BUTTON_FONT_SIZE);
        this._saveButton.enabled = false; // Start save button as false
        this._saveButton.clicked.connect(() => {
            const annotation: AnnotationData = {
                ...this._initialAnnotation,
                id: this._initialAnnotation?.id || uuidv4(),
                type: AnnotationHierarchyType.ANNOTATION,
                category: this._initialAnnotation?.category || AnnotationCategory.UNDEFINED,
                timestamp: (new Date()).getTime(),
                title: this._titleField.input.text,
                ranges: AnnotationDialog.stringToAnnotationRange(this._basesField.input.text),
                playerID: Eterna.playerID,
                positions: [],
                children: []
            };

            // If we selected layer, include in annotation payload
            if (this._selectedLayer) {
                annotation['layerId'] = this._selectedLayer.id;
            }

            this.close(annotation);
        });
        inputContainer.addObject(this._saveButton, this._actionButtonLayout);
        this._actionButtonLayout.y = this._textInputLayout.height
            + dropdownSectionHeight
            + AnnotationDialog.ACTION_BUTTON_LAYOUT_MARGIN;
        this._actionButtonLayout.layout();

        // Generate Dialog Divider
        this._divider = new Graphics()
            .lineStyle(
                AnnotationDialog.ACTION_BUTTON_BORDER_WIDTH,
                AnnotationDialog.UPPER_TOOLBAR_DIVIDER_COLOR
            ).moveTo(0, 0)
            .lineTo(AnnotationDialog.FIELD_WIDTH + 2 * AnnotationDialog.W_MARGIN, 0);

        // Generate Delete Annotation Button
        if (this._edit) {
            this._deleteButtonLayout = new HLayoutContainer(0, VAlign.CENTER);
            inputContainer.content.addChild(this._deleteButtonLayout);

            const deleteButtonGraphic = new Graphics()
                .beginFill(AnnotationDialog.PANEL_COLOR)
                .drawRect(
                    0,
                    0,
                    AnnotationDialog.DELETE_BUTTON_WIDTH,
                    AnnotationDialog.DELETE_BUTTON_HEIGHT
                ).endFill();
            const deleteButton = new GameButton()
                .customStyleBox(deleteButtonGraphic)
                .label('Delete Annotation', AnnotationDialog.DELETE_BUTTON_FONT_SIZE);
            deleteButton.clicked.connect(() => {
                this.close(null); // Returning null will be interpreted as delete
            });
            inputContainer.addObject(deleteButton, this._deleteButtonLayout);
            this._deleteButtonLayout.x = (AnnotationDialog.FIELD_WIDTH - AnnotationDialog.DELETE_BUTTON_WIDTH) / 2;
            this._deleteButtonLayout.y = this._textInputLayout.height
                + dropdownSectionHeight
                + AnnotationDialog.ACTION_BUTTON_LAYOUT_MARGIN
                + this._actionButtonLayout.height
                + AnnotationDialog.DELETE_BUTTON_LAYOUT_MARGIN;
            this._deleteButtonLayout.layout();
        }

        this.container.addChild(this._divider);

        if (this._layers.length > 0) {
            const initialLayer = this._layers.find(
                (layer: AnnotationData) => layer.id === this._initialAnnotation?.layerId
            );

            // Add Annotation Layer Dropdown
            this._dropdown = new GameDropdown({
                fontSize: 14,
                options: this._layers.map((layer: AnnotationData) => layer.title),
                defaultOption: initialLayer?.title || 'Select a Layer',
                borderWidth: 0,
                borderColor: AnnotationDialog.UPPER_TOOLBAR_DIVIDER_COLOR,
                color: 0x021E46,
                textColor: 0xF39C12,
                textWeight: FontWeight.BOLD,
                width: AnnotationDialog.FIELD_WIDTH,
                height: AnnotationDialog.DROPDOWN_HEIGHT,
                dropShadow: true,
                checkboxes: true
            });
            const dropDownLabel: Text = Fonts.std(
                'Annotation Layer',
                AnnotationDialog.FONT_SIZE,
                FontWeight.BOLD
            ).color(AnnotationDialog.LABEL_COLOR).build();
            let accHeight = 0;
            if (this._fields.length > 0) {
                for (const field of this._fields) {
                    accHeight += field.label.height;
                    accHeight += AnnotationDialog.LABEL_PADDING;
                    accHeight += field.input.height;
                    accHeight += AnnotationDialog.FIELD_MARGIN;
                }
            }

            // Set input field label position
            dropDownLabel.x = 0;
            dropDownLabel.y = accHeight;

            // Set input field input position
            this._dropdown.display.x = 0;
            this._dropdown.display.y = accHeight + dropDownLabel.height + AnnotationDialog.LABEL_PADDING;

            // Handle dropdown selection event
            this._dropdown.selectedOption.connect((value) => {
                for (const layer of this._layers) {
                    if (layer.title === value) {
                        this._selectedLayer = layer;
                    }
                }
            });

            this._textInputLayout.addChild(dropDownLabel);
            inputContainer.addObject(this._dropdown, this._textInputLayout);
        }

        const updateLocation = () => {
            Assert.assertIsDefined(Flashbang.stageHeight);
            let idealHeight = 0;
            if (this._deleteButtonLayout === null) {
                idealHeight = this._textInputLayout.height
                    + AnnotationDialog.ACTION_BUTTON_LAYOUT_MARGIN
                    + this._actionButtonLayout.height
                    + 2 * AnnotationDialog.H_MARGIN
                    + this._panel.titleHeight;
            } else {
                idealHeight = this._textInputLayout.height
                    + AnnotationDialog.ACTION_BUTTON_LAYOUT_MARGIN
                    + this._actionButtonLayout.height
                    + AnnotationDialog.DELETE_BUTTON_LAYOUT_MARGIN
                    + this._deleteButtonLayout.height
                    + 2 * AnnotationDialog.H_MARGIN
                    + this._panel.titleHeight;
            }
            const maxHeight = Flashbang.stageHeight * 0.8;
            const panelHeight = Math.min(idealHeight, maxHeight);
            const panelWidth = AnnotationDialog.FIELD_WIDTH + 2 * AnnotationDialog.W_MARGIN;

            inputContainer.setSize(
                panelWidth - 2 * AnnotationDialog.W_MARGIN,
                panelHeight - 2 * AnnotationDialog.H_MARGIN - this._panel.titleHeight
            );
            inputContainer.doLayout();

            this._panel.setSize(panelWidth, panelHeight);

            if (this._modal) {
                DisplayUtil.positionRelativeToStage(
                    this._panel.display,
                    HAlign.CENTER, VAlign.CENTER,
                    HAlign.CENTER, VAlign.CENTER
                );
            }

            DisplayUtil.positionRelative(
                this._divider, HAlign.CENTER, VAlign.TOP,
                this._panel.display, HAlign.CENTER, VAlign.TOP,
                0,
                this._panel.titleHeight
                + AnnotationDialog.H_MARGIN
                + this._textInputLayout.height
                + AnnotationDialog.ACTION_BUTTON_LAYOUT_MARGIN / 2
            );

            DisplayUtil.positionRelative(
                inputContainer.display, HAlign.CENTER, VAlign.TOP,
                this._panel.display, HAlign.CENTER, VAlign.TOP,
                0, this._panel.titleHeight + AnnotationDialog.H_MARGIN
            );

            if (closeButton) {
                DisplayUtil.positionRelative(
                    closeButton.display, HAlign.RIGHT, VAlign.TOP,
                    this._panel.display, HAlign.RIGHT, VAlign.TOP,
                    -10, (this._panel.titleHeight - AnnotationDialog.CLOSE_BUTTON_LENGTH) / 2
                );
            }
        };

        updateLocation();
        Assert.assertIsDefined(this._mode);
        this.regs.add(this._mode.resized.connect(updateLocation));
    }

    public getInputField(
        name: string,
        placeholder: string = '',
        width: number,
        height: number,
        multiline: boolean = false,
        characterLimit: number | undefined = undefined
    ): InputField {
        // Generate input object
        const input = new TextInputObject({
            fontSize: AnnotationDialog.FIELD_FONT_SIZE,
            width,
            height,
            bgColor: 0x021E46,
            rows: multiline ? 3 : 1,
            placeholder,
            characterLimit
        }).font(Fonts.STDFONT);

        // Generate label text object
        const label: Text = Fonts
            .std(name, AnnotationDialog.FONT_SIZE, FontWeight.BOLD)
            .color(AnnotationDialog.LABEL_COLOR)
            .build();

        // Compute height occupied by prior input fields
        let accHeight = 0;
        if (this._fields.length > 0) {
            for (const field of this._fields) {
                accHeight += field.label.height;
                accHeight += AnnotationDialog.LABEL_PADDING;
                accHeight += field.input.height;
                accHeight += AnnotationDialog.FIELD_MARGIN;
            }
        }

        // Set input field label position
        label.x = 0;
        label.y = accHeight;
        label.zIndex = 20;

        // Set input field input position
        input.display.x = 0;
        input.display.y = accHeight + label.height + AnnotationDialog.LABEL_PADDING;
        input.display.zIndex = 0;

        // Create and store input field object
        const inputField: InputField = {input, label, name} as InputField;
        this._fields.push(inputField);

        return inputField;
    }

    public setLayers(layers: AnnotationData[]): void {
        this._layers = layers;
    }

    public setRanges(ranges: AnnotationRange[]): void {
        const baseRanges = AnnotationDialog.annotationRangeToString(ranges);
        // set ranges string
        this._basesField.input.text = baseRanges;
    }

    public isValidAnnotation(): boolean {
        // Title
        if (!this.isValidText()) {
            return false;
        }

        // Base Range(s)
        if (!this.isValidRanges()) {
            return false;
        }

        return true;
    }

    public isValidText(): boolean {
        const titleText = this._titleField.input.text;
        if (
            titleText.length === 0
            || titleText.length > AnnotationDialog.ANNOTATION_TEXT_CHARACTER_LIMIT
        ) {
            return false;
        }

        return true;
    }

    public isValidRanges(): boolean {
        const rangeText = this._basesField.input.text;
        if (rangeText.length === 0) {
            return false;
        }

        const rangeNumbers = AnnotationDialog.extractRangeIndices(rangeText);
        if (rangeNumbers === null) {
            // We must have numbers in the rangeText
            return false;
        } else if (rangeNumbers.length % 2 !== 0) {
            // These numbers should be paired
            // Meaning there should be an even count
            return false;
        } else {
            // Numbers must not be larger than the sequence length
            for (const numText of rangeNumbers) {
                const num = parseInt(numText, 10);
                if (num <= 0 || num > this._sequenceLength) {
                    return false;
                }
            }
        }

        const cleansedRangeTexts = rangeText.match(AnnotationDialog.RANGE_REGEX);

        if (!cleansedRangeTexts || cleansedRangeTexts.length === 0) {
            return false;
        }

        const cleansedRangeText = cleansedRangeTexts as string[];
        const expandedRanges = AnnotationDialog.expandRanges(cleansedRangeText[0]);
        const annotationBaseIndices = expandedRanges.reduce((a, b) => a.concat(b), []);
        if (AnnotationDialog.hasDuplicates(annotationBaseIndices).length > 0) {
            // There should be no duplication of indices
            // This indicates overlapping ranges in a single annotation
            // It is more reasonable to combine the the overlapping ranges
            return false;
        }

        return true;
    }

    public static annotationRangeToString(ranges: AnnotationRange[]): string {
        let baseRanges = '';
        for (const range of ranges) {
            if (range.start <= range.end) {
                // We add one because frontend numbers bases from 1
                baseRanges += `${range.start + 1}-${range.end + 1}, `;
            } else {
                // We add one because frontend numbers bases from 1
                baseRanges += `${range.end + 1}-${range.start + 1}, `;
            }
        }
        // remove last comma
        baseRanges = baseRanges.substring(0, baseRanges.length - 2);

        return baseRanges;
    }

    private static stringToAnnotationRange(str: string): AnnotationRange[] {
        const ranges: AnnotationRange[] = [];
        const rangeTexts = str.split(',');
        for (const s of rangeTexts) {
            s.replace(' ', '');
            const extents = s.split('-');
            ranges.push({
                // We remove one because backend is zero-indexed
                start: parseInt(extents[0], 10) - 1,
                // We remove one because backend is zero-indexed
                end: parseInt(extents[1], 10) - 1
            });
        }

        return ranges;
    }

    private static extractRangeIndices(str: string): RegExpMatchArray | null {
        return str.match(/\d+/g);
    }

    private static hasDuplicates(arr: (string|number)[]): (string|number)[] {
        if (arr.length === 0) {
            return [];
        }

        const sortedArr = arr.slice().sort(); // You can define the comparing function here.
        // JS by default uses a crappy string compare.
        // (we use slice to clone the array so the
        // original array won't be modified)
        const results: (string|number)[] = [];
        for (let i = 0; i < sortedArr.length - 1; i++) {
            if (sortedArr[i + 1] === sortedArr[i]) {
                results.push(sortedArr[i]);
            }
        }

        return results;
    }

    private static expandRanges(range: string): number[][] {
        const annotationRanges = AnnotationDialog.stringToAnnotationRange(range);

        const expandedRanges: number[][] = [];
        for (const annotationRange of annotationRanges) {
            const expandedRange: number[] = [];
            for (let i = annotationRange.start; i <= annotationRange.end; i++) {
                expandedRange.push(i);
            }
            expandedRanges.push(expandedRange);
        }

        return expandedRanges;
    }

    private _edit: boolean = false;
    private _hasTitle: boolean = false;
    private _sequenceLength: number;
    private _initialAnnotation: AnnotationData | null = null;
    private _initialRanges: AnnotationRange[] | null = null;
    private _layers: AnnotationData[] = [];
    private _selectedLayer: AnnotationData | null = null;
    private _panel: GamePanel;
    private _textInputLayout: VLayoutContainer;
    private _actionButtonLayout: HLayoutContainer;
    private _dropdown: GameDropdown;
    private _divider: Graphics;
    private _deleteButtonLayout: HLayoutContainer | null = null;
    private _fields: InputField[] = [];
    private _titleField: InputField;
    private _basesField: InputField;
    private _saveButton: GameButton;

    private static readonly W_MARGIN = 10;
    private static readonly H_MARGIN = 5;
    private static readonly FONT_SIZE = 12;
    private static readonly FIELD_WIDTH = 200;
    private static readonly FIELD_HEIGHT = 30;
    private static readonly FIELD_MARGIN = 5;
    private static readonly FIELD_FONT_SIZE = 12;
    private static readonly LABEL_PADDING = 5;
    private static readonly ACTION_BUTTON_LAYOUT_MARGIN = 20;
    private static readonly ACTION_BUTTON_WIDTH = 80;
    private static readonly ACTION_BUTTON_HEIGHT = AnnotationDialog.FIELD_HEIGHT;
    private static readonly ACTION_BUTTON_CORNER_RADIUS = 5;
    private static readonly ACTION_BUTTON_BORDER_WIDTH = 1;
    private static readonly ACTION_BUTTON_FONT_SIZE = 12;
    private static readonly ACTION_BUTTON_SUCCESS_COLOR = 0x54B54E;
    private static readonly DELETE_BUTTON_LAYOUT_MARGIN = AnnotationDialog.H_MARGIN;
    private static readonly DELETE_BUTTON_WIDTH = 120;
    private static readonly DELETE_BUTTON_HEIGHT = AnnotationDialog.ACTION_BUTTON_HEIGHT - 10;
    private static readonly DELETE_BUTTON_FONT_SIZE = 12;
    private static readonly DROPDOWN_HEIGHT = AnnotationDialog.ACTION_BUTTON_HEIGHT;
    public static readonly ANNOTATION_TEXT_CHARACTER_LIMIT = 50;
    public static readonly RANGE_REGEX: RegExp = /(\d+\s*-\s*\d+)(,\s*\d+\s*-\s*\d+)*/g;
    private static readonly PANEL_COLOR = 0x152843;
    private static readonly UPPER_TOOLBAR_DIVIDER_COLOR = 0x112238;
    private static readonly LABEL_COLOR = 0xC0DCE7;
    private static readonly CLOSE_BUTTON_LENGTH = 10;
}
