import {DisplayObject, Graphics, Text} from 'pixi.js';
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
import GameDropdown from './GameDropdown';
import VScrollBox from './VScrollBox';

interface AnnotationDialogParams {
    edit: boolean;
    title: boolean;
    sequenceLength: number;
    customNumbering: (number | null)[] | undefined;
    initialRanges: AnnotationRange[];
    initialLayers: AnnotationData[];
    activeCategory: AnnotationCategory;
    initialAnnotation?: AnnotationData;
}

export default class AnnotationDialog extends Dialog<AnnotationData> {
    // Signals to update selected ranges
    public readonly onUpdateRanges: Value<AnnotationRange[] | null> = new Value<AnnotationRange[] | null>(null);

    constructor(params: AnnotationDialogParams) {
        super(params.edit);
        this._edit = params.edit;
        this._hasTitle = params.title;
        this._sequenceLength = params.sequenceLength;
        this._customNumbering = params.customNumbering;
        this._initialRanges = params.initialRanges.sort(
            (firstRange, secondRange) => firstRange.start - secondRange.start
        );
        this._layers = params.initialLayers;
        this._activeCategory = params.activeCategory;
        if (params.initialAnnotation) {
            this._initialAnnotation = params.initialAnnotation;
        }
    }

    protected added(): void {
        super.added();
        this.renderDialog(true);
    }

    public renderDialog(focusTitle: boolean): void {
        const prevTitle = this._titleField?.input.text || '';
        const prevBases = this._basesField?.input.text || '';

        // Clear old objects
        this.removeAllObjects();
        this.container.children.forEach((child: DisplayObject) => {
            child.destroy();
        });

        if (this._modal) {
            this.setupModalBackground();
        }

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
                this._isClosing = true;
                this.close(this._initialAnnotation || null);
            });
        }

        this._scrollBox = new VScrollBox(0, 0);
        this.addObject(this._scrollBox, this.container);

        // Primary dialog contents
        const bodyLayout = new VLayoutContainer(AnnotationDialog.H_MARGIN, HAlign.CENTER);
        this._scrollBox.content.addChild(bodyLayout);

        // Input fields
        this._inputLayout = new VLayoutContainer(AnnotationDialog.LABEL_PADDING, HAlign.LEFT);
        this._inputLayout.sortableChildren = true;
        bodyLayout.addChild(this._inputLayout);

        // Add Text Field
        this._titleField = this.getInputField(
            'Text',
            'Annotation Text',
            AnnotationDialog.FIELD_WIDTH,
            AnnotationDialog.FIELD_HEIGHT,
            false,
            AnnotationDialog.ANNOTATION_TEXT_CHARACTER_LIMIT
        );
        if (prevTitle) {
            this._titleField.input.text = prevTitle;
        }
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
        this._inputLayout.addChild(this._titleField.label);
        this._scrollBox.addObject(this._titleField.input, this._inputLayout);

        // Add Bases Field
        this._basesField = this.getInputField(
            'Bases',
            'Base Ranges (e.g. 1-5, 10-12)',
            AnnotationDialog.FIELD_WIDTH,
            AnnotationDialog.FIELD_HEIGHT
        );
        if (prevBases) {
            this._basesField.input.text = prevBases;
        } else if (this._initialRanges !== null) {
            const baseRanges = this.annotationRangeToString(this._initialRanges);
            // set ranges string
            this._basesField.input.text = baseRanges;
        }
        this._basesField.input.valueChanged.connect(() => {
            const isValid = this.isValidAnnotation();
            this._saveButton.enabled = isValid;
            if (this.isValidRanges()) {
                this.onUpdateRanges.value = this.stringToAnnotationRange(this._basesField.input.text);
                this.onUpdateRanges.value = null;
            }
        });
        this._basesField.input.keyPressed.connect((key) => {
            if (key === 'Enter') {
                this._saveButton.click();
            }
        });
        this._inputLayout.addChild(this._basesField.label);
        this._scrollBox.addObject(this._basesField.input, this._inputLayout);

        if (focusTitle) {
            this._titleField.input.setFocus();
        }

        // Add Annotation Category Dropdown
        const defaultCategoryOption = this._categoryDropdown?.selectedOption.value
            || this._initialAnnotation?.category || this._activeCategory;
        this._categoryDropdown = new GameDropdown({
            fontSize: 14,
            options: [AnnotationCategory.PUZZLE, AnnotationCategory.SOLUTION],
            defaultOption: defaultCategoryOption,
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

        this._categoryDropdown.selectedOption.connect(() => {
            // Reset layer selection
            if (this._layerDropdown) {
                this._layerDropdown.selectedOption.value = '';
            }

            // Rerender dialog
            this.renderDialog(false);
        });
        const categoryDropDownLabel: Text = Fonts.std(
            'Annotation Type',
            AnnotationDialog.FONT_SIZE,
            FontWeight.BOLD
        ).color(AnnotationDialog.LABEL_COLOR).build();

        this._inputLayout.addChild(categoryDropDownLabel);
        this._scrollBox.addObject(this._categoryDropdown, this._inputLayout);

        const categoryLayers = this._layers.filter((layer: AnnotationData) => (
            this._categoryDropdown && layer.category === this._categoryDropdown.selectedOption.value)
                || (
                    !this._categoryDropdown && (
                        layer.category === this._initialAnnotation?.category
                    || this._activeCategory
                    )
                ));

        if (categoryLayers.length > 0) {
            const initialLayer = categoryLayers.find(
                (layer: AnnotationData) => layer.id === this._initialAnnotation?.layerId
            );

            // Add Annotation Layer Dropdown
            const defaultLayerOption = this._layerDropdown?.selectedOption.value
                || initialLayer?.title || 'Select a Layer';
            this._layerDropdown = new GameDropdown({
                fontSize: 14,
                options: categoryLayers.map((layer: AnnotationData) => layer.title),
                defaultOption: defaultLayerOption,
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

            const layerDropDownLabel: Text = Fonts.std(
                'Annotation Layer',
                AnnotationDialog.FONT_SIZE,
                FontWeight.BOLD
            ).color(AnnotationDialog.LABEL_COLOR).build();

            // Handle dropdown selection event
            this._layerDropdown.selectedOption.connect((value) => {
                for (const layer of categoryLayers) {
                    if (layer.title === value) {
                        this._selectedLayer = layer;
                    }
                }
            });

            this._inputLayout.addChild(layerDropDownLabel);
            this._scrollBox.addObject(this._layerDropdown, this._inputLayout);
        }

        // Generate Dialog Divider
        this._divider = new Graphics()
            .lineStyle(
                AnnotationDialog.ACTION_BUTTON_BORDER_WIDTH,
                AnnotationDialog.UPPER_TOOLBAR_DIVIDER_COLOR
            ).moveTo(0, 0)
            .lineTo(AnnotationDialog.FIELD_WIDTH + 2 * AnnotationDialog.W_MARGIN, 0);
        bodyLayout.addChild(this._divider);

        // Generate Dialog Action Buttons
        const buttonPadding = AnnotationDialog.FIELD_WIDTH
            - 2 * AnnotationDialog.ACTION_BUTTON_WIDTH
            - 2 * AnnotationDialog.ACTION_BUTTON_BORDER_WIDTH;
        this._actionButtonLayout = new HLayoutContainer(buttonPadding, VAlign.CENTER);
        bodyLayout.addChild(this._actionButtonLayout);
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
            this._isClosing = true;
            this.close(this._initialAnnotation || null);
        });
        this._scrollBox.addObject(cancelButton, this._actionButtonLayout);
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
        const isValid = this.isValidAnnotation();
        this._saveButton.enabled = isValid;
        this._saveButton.clicked.connect(() => {
            const annotation: AnnotationData = {
                ...this._initialAnnotation,
                id: this._initialAnnotation?.id || uuidv4(),
                type: AnnotationHierarchyType.ANNOTATION,
                category: this._categoryDropdown.selectedOption.value as AnnotationCategory,
                timestamp: (new Date()).getTime(),
                title: this._titleField.input.text,
                ranges: this.stringToAnnotationRange(this._basesField.input.text),
                playerID: Eterna.playerID,
                positions: [],
                children: []
            };

            // If we selected layer, include in annotation payload
            if (this._selectedLayer) {
                annotation['layerId'] = this._selectedLayer.id;
            }

            this._isClosing = true;
            this.close(annotation);
        });
        this._scrollBox.addObject(this._saveButton, this._actionButtonLayout);

        // Generate Delete Annotation Button
        if (this._edit) {
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
                // Returning null will be interpreted as delete
                this._isClosing = true;
                this.close(null);
            });
            this._scrollBox.addObject(deleteButton, bodyLayout);
        }

        this.updateDialogLocation(bodyLayout, closeButton);
        Assert.assertIsDefined(this._mode);
        this.regs.add(this._mode.resized.connect(() => {
            this.updateDialogLocation(bodyLayout, closeButton);
        }));
    }

    public updateDialogLocation(
        bodyLayout: VLayoutContainer,
        closeButton: GameButton | null
    ): void {
        bodyLayout.layout();

        Assert.assertIsDefined(Flashbang.stageHeight);
        const maxHeight = Flashbang.stageHeight * 0.8;
        const panelExtraHeight = 2 * AnnotationDialog.H_MARGIN + (this._hasTitle ? this._panel.titleHeight : 0);
        const idealHeight = bodyLayout.height + panelExtraHeight;
        const panelHeight = Math.min(idealHeight, maxHeight);
        const panelWidth = AnnotationDialog.FIELD_WIDTH + 2 * AnnotationDialog.W_MARGIN;

        this._scrollBox.setSize(panelWidth, panelHeight - panelExtraHeight);
        this._scrollBox.doLayout();

        this._panel.setSize(panelWidth, panelHeight);

        if (this._modal) {
            DisplayUtil.positionRelativeToStage(
                this._panel.display,
                HAlign.CENTER, VAlign.CENTER,
                HAlign.CENTER, VAlign.CENTER
            );
        }

        DisplayUtil.positionRelative(
            this._scrollBox.display, HAlign.CENTER, VAlign.TOP,
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
    }

    protected onBGClicked(): void {
        this._isClosing = true;
        this.close(this._initialAnnotation || null);
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

        // Create and store input field object
        const inputField: InputField = {input, label, name} as InputField;
        this._fields.push(inputField);

        return inputField;
    }

    public setRanges(ranges: AnnotationRange[]): void {
        if (!this.isLiveObject) return;

        const baseRanges = this.annotationRangeToString(ranges);

        // set ranges string
        this._basesField.input.text = baseRanges;

        const isValid = this.isValidAnnotation();
        this._saveButton.enabled = isValid;
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
            for (const numText of rangeNumbers) {
                if (this._customNumbering) {
                    const num = this._customNumbering.indexOf(parseInt(numText, 10));
                    if (num < 0 || num > this._sequenceLength - 1) {
                        return false;
                    }
                } else {
                    const num = parseInt(numText, 10);
                    if (num <= 0 || num > this._sequenceLength) {
                        return false;
                    }
                }
            }
        }

        const cleansedRangeTexts = rangeText.match(AnnotationDialog.RANGE_REGEX);

        if (!cleansedRangeTexts || cleansedRangeTexts.length === 0) {
            return false;
        }

        const cleansedRangeText = cleansedRangeTexts as string[];
        const expandedRanges = this.expandRanges(cleansedRangeText[0]);
        const annotationBaseIndices = expandedRanges.reduce((a, b) => a.concat(b), []);
        if (AnnotationDialog.hasDuplicates(annotationBaseIndices).length > 0) {
            // There should be no duplication of indices
            // This indicates overlapping ranges in a single annotation
            // It is more reasonable to combine the the overlapping ranges
            return false;
        }

        return true;
    }

    private annotationRangeToString(ranges: AnnotationRange[]): string {
        let baseRanges = '';

        const rawIndexToUINumbering = (index: number): string => {
            // We add one because frontend numbers bases from 1
            if (this._customNumbering) {
                const customIndex = this._customNumbering[index];
                // For bases without indexes in the custom numbering system, such as the bases
                // in the PTC puzzles where an area of the full ribosome is "capped off" with a
                // faux hairpin, we have no number for them. We prevent selecting these bases
                // in the UI, but in case something slips through somehow, leaving it as an empty
                // string will just look "wrong" and fail to validate preventing the user from saving it
                if (customIndex == null) return '';
                return customIndex.toString();
            } else {
                return `${index + 1}`;
            }
        };

        for (const range of ranges) {
            const start = rawIndexToUINumbering(range.start);
            const end = rawIndexToUINumbering(range.end);
            if (range.start <= range.end) {
                baseRanges += `${start}-${end}, `;
            } else {
                baseRanges += `${end}-${start}, `;
            }
        }
        // remove last comma
        baseRanges = baseRanges.substring(0, baseRanges.length - 2);

        return baseRanges;
    }

    private stringToAnnotationRange(str: string): AnnotationRange[] {
        const ranges: AnnotationRange[] = [];
        const rangeTexts = str.split(',');
        for (const s of rangeTexts) {
            s.replace(' ', '');
            const extents = s.split('-');

            const parseExtent = (extent: string): number => {
                // We remove one because backend is zero-indexed
                if (this._customNumbering) return this._customNumbering.indexOf(parseInt(extent, 10));
                return parseInt(extent, 10) - 1;
            };

            ranges.push({
                start: parseExtent(extents[0]),
                end: parseExtent(extents[1])
            });
        }

        return ranges;
    }

    private static extractRangeIndices(str: string): RegExpMatchArray | null {
        return str.match(/r?\d+/g);
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

    private expandRanges(range: string): number[][] {
        const annotationRanges = this.stringToAnnotationRange(range);

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

    public get layers() {
        return this._layers;
    }

    public set layers(data: AnnotationData[]) {
        this._layers = data;
        if (!this._isClosing) {
            this.renderDialog(false);
        }
    }

    private _edit: boolean = false;
    private _hasTitle: boolean = false;
    private _isClosing: boolean = false;
    private _sequenceLength: number;
    private _customNumbering: (number | null)[] | undefined;
    private _initialAnnotation: AnnotationData | null = null;
    private _initialRanges: AnnotationRange[] | null = null;
    private _activeCategory: AnnotationCategory;
    private _layers: AnnotationData[] = [];
    private _selectedLayer: AnnotationData | null = null;
    private _panel: GamePanel;
    private _scrollBox: VScrollBox;
    private _inputLayout: VLayoutContainer;
    private _actionButtonLayout: HLayoutContainer;
    private _layerDropdown: GameDropdown;
    private _categoryDropdown: GameDropdown;
    private _divider: Graphics;
    private _fields: InputField[] = [];
    private _titleField: InputField;
    private _basesField: InputField;
    private _saveButton: GameButton;

    private static readonly W_MARGIN = 10;
    private static readonly H_MARGIN = 10;
    private static readonly FONT_SIZE = 12;
    private static readonly FIELD_WIDTH = 200;
    private static readonly FIELD_HEIGHT = 30;
    private static readonly FIELD_FONT_SIZE = 12;
    private static readonly LABEL_PADDING = 5;
    private static readonly ACTION_BUTTON_WIDTH = 80;
    private static readonly ACTION_BUTTON_HEIGHT = AnnotationDialog.FIELD_HEIGHT;
    private static readonly ACTION_BUTTON_CORNER_RADIUS = 5;
    private static readonly ACTION_BUTTON_BORDER_WIDTH = 1;
    private static readonly ACTION_BUTTON_FONT_SIZE = 12;
    private static readonly ACTION_BUTTON_SUCCESS_COLOR = 0x54B54E;
    private static readonly DELETE_BUTTON_WIDTH = 120;
    private static readonly DELETE_BUTTON_HEIGHT = AnnotationDialog.ACTION_BUTTON_HEIGHT - 10;
    private static readonly DELETE_BUTTON_FONT_SIZE = 12;
    private static readonly DROPDOWN_HEIGHT = AnnotationDialog.ACTION_BUTTON_HEIGHT;
    public static readonly ANNOTATION_TEXT_CHARACTER_LIMIT = 50;
    public static readonly RANGE_REGEX: RegExp = /^(r?\d+\s*-\s*r?\d+)(,\s*r?\d+\s*-\s*r?\d+)*$/;
    private static readonly PANEL_COLOR = 0x152843;
    private static readonly UPPER_TOOLBAR_DIVIDER_COLOR = 0x112238;
    private static readonly LABEL_COLOR = 0xC0DCE7;
    private static readonly CLOSE_BUTTON_LENGTH = 10;
}
