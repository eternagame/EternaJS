import {DisplayObject, Graphics, Text} from 'pixi.js';
import {Signal} from 'signals';
import {
    VLayoutContainer,
    HAlign,
    HLayoutContainer,
    VAlign
} from 'flashbang';
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
import KeyedCollection from 'eterna/util/KeyedCollection';
import GameButton from './GameButton';
import TextInputObject from './TextInputObject';
import {InputField} from './TextInputGrid';
import GameDropdown from './GameDropdown';
import WindowDialog from './WindowDialog';

interface AnnotationDialogParams {
    edit: boolean;
    title: boolean;
    sequenceLength: number;
    oligoLengths: Map<string, number>;
    customNumbering: (number | null)[] | undefined;
    initialRanges: AnnotationRange[];
    initialLayers: AnnotationData[];
    activeCategory: AnnotationCategory;
    initialAnnotation?: AnnotationData;
}

export default class AnnotationDialog extends WindowDialog<AnnotationData> {
    // Signals to update selected ranges
    public readonly onUpdateRanges: Signal<AnnotationRange[]> = new Signal<AnnotationRange[]>();

    constructor(params: AnnotationDialogParams) {
        super({title: params.edit ? 'Edit Annotation' : 'New Annotation'});
        this._edit = params.edit;
        this._sequenceLength = params.sequenceLength;
        this._oligoLengths = params.oligoLengths;
        this._customNumbering = params.customNumbering;
        this._initialRanges = params.initialRanges.sort(
            (firstRange, secondRange) => {
                if (firstRange.strand === secondRange.strand) {
                    return firstRange.start - secondRange.start;
                } else if ((firstRange.strand?.length ?? 0) < (secondRange.strand?.length ?? 0)) {
                    // If we have strand B and strand AA, AA should sort after B
                    return -1;
                } else if ((firstRange.strand ?? '') < (secondRange.strand ?? '')) {
                    return -1;
                } else {
                    return 1;
                }
            }
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
        this._window.layout();
    }

    /**
     * @override
     * This is overridden in order for closing with the x button to not delete the annotation.
     * FIXME: It would be better to change the semantics so that the default close behavior isn't
     * interpreted as removing the annotation.
     */
    protected close() {
        this._isClosing = true;
        super.close(this._initialAnnotation || null);
    }

    public renderDialog(focusTitle: boolean): void {
        if (!this.isLiveObject) return;

        const prevTitle = this._titleField?.input.text || '';
        const prevBases = this._basesField?.input.text || '';

        // Note that we can't removeAllObjects because that would include the window, etc.
        // We'd need to create our own high level gameobject/containerobject - or even better,
        // not completely recreate all the objects.
        if (this._titleField) this.removeObject(this._titleField.input);
        if (this._basesField) this.removeObject(this._basesField.input);
        if (this._categoryDropdown) this.removeObject(this._categoryDropdown);
        if (this._layerDropdown) this.removeObject(this._layerDropdown);
        // Handle any other lingering non-flashbang-managed objects
        this._window.content.children.forEach((child: DisplayObject) => {
            child.destroy({children: true});
        });

        // Primary dialog contents
        const bodyLayout = new VLayoutContainer(AnnotationDialog.H_MARGIN, HAlign.CENTER);
        this._window.content.addChild(bodyLayout);

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
        this.addObject(this._titleField.input, this._inputLayout);

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
            if (isValid) {
                this.onUpdateRanges.emit(this.stringToAnnotationRange(this._basesField.input.text) || []);
            }
        });
        this._basesField.input.keyPressed.connect((key) => {
            if (key === 'Enter') {
                this._saveButton.click();
            }
        });
        this._inputLayout.addChild(this._basesField.label);
        this.addObject(this._basesField.input, this._inputLayout);

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
        this.addObject(this._categoryDropdown, this._inputLayout);

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
            this.addObject(this._layerDropdown, this._inputLayout);
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
        const cancelButton = new GameButton('secondary')
            .label('Cancel', AnnotationDialog.ACTION_BUTTON_FONT_SIZE);
        cancelButton.clicked.connect(() => {
            this._isClosing = true;
            super.close(this._initialAnnotation || null);
        });
        this.addObject(cancelButton, this._actionButtonLayout);
        // 2) Save Button
        this._saveButton = new GameButton()
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
                ranges: this.stringToAnnotationRange(this._basesField.input.text) || [],
                playerID: Eterna.playerID,
                positions: new KeyedCollection(),
                children: []
            };

            // If we selected layer, include in annotation payload
            if (this._selectedLayer) {
                annotation['layerId'] = this._selectedLayer.id;
            }

            this._isClosing = true;
            super.close(annotation);
        });
        this.addObject(this._saveButton, this._actionButtonLayout);

        // Generate Delete Annotation Button
        if (this._edit) {
            const deleteButtonGraphic = new Graphics()
                .beginFill(0x0)
                .drawRect(
                    0,
                    0,
                    AnnotationDialog.DELETE_BUTTON_WIDTH,
                    AnnotationDialog.DELETE_BUTTON_HEIGHT
                ).endFill();
            deleteButtonGraphic.alpha = 0;
            const deleteButton = new GameButton()
                .customStyleBox(deleteButtonGraphic)
                .label('Delete Annotation', AnnotationDialog.DELETE_BUTTON_FONT_SIZE);
            deleteButton.clicked.connect(() => {
                // Returning null will be interpreted as delete
                this._isClosing = true;
                super.close(null);
            });
            this.addObject(deleteButton, bodyLayout);
        }

        bodyLayout.layout();
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
        return {input, label, name};
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
        if (!this.isValidTitle()) {
            return false;
        }

        // Base Range(s)
        if (!this.isValidRanges()) {
            return false;
        }

        return true;
    }

    public isValidTitle(): boolean {
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
        if (rangeText.length === 0) return false;

        const ranges = this.stringToAnnotationRange(rangeText);
        if (!ranges) return false;

        for (const range of ranges) {
            const validBase = (rangeNum: number) => {
                if (this._customNumbering && !range.strand) {
                    if (rangeNum < 0 || rangeNum > this._sequenceLength - 1) {
                        return false;
                    }
                } else {
                    const strandLength = range.strand ? this._oligoLengths.get(range.strand) : this._sequenceLength;
                    // If there is no entry in the map, that means that this isn't a known oligo
                    if (strandLength === undefined) return false;
                    if (rangeNum < 0 || rangeNum > strandLength - 1) {
                        return false;
                    }
                }
                return true;
            };

            if (!validBase(range.start)) return false;
            if (!validBase(range.end)) return false;
        }

        const expandedRanges = this.expandRanges(ranges);
        const annotationBaseIndices = expandedRanges.reduce((a, b) => a.concat(b), []);
        if (AnnotationDialog.hasDuplicates(annotationBaseIndices).length > 0) {
            // There should be no duplication of indices
            // This indicates overlapping ranges in a single annotation
            // It is more reasonable to combine the the overlapping ranges
            return false;
        }

        return true;
    }

    private stringToAnnotationRange(str: string): AnnotationRange[] | null {
        const ranges: AnnotationRange[] = [];
        const rangeTexts = str.split(',');

        for (const s of rangeTexts) {
            // Corresponds to `<label> <start>-<end>`, allowing additional whitespace around each part
            const match = s.match(/^\s*(?:(\w+)\s+)?(\d+)\s*-\s*(\d+)\s*$/);
            if (!match) return null;
            const strand: string | undefined = match[1];
            const start = match[2];
            const end = match[3];

            const parseExtent = (extent: string): number => {
                // We remove one because backend is zero-indexed
                if (this._customNumbering && !strand) return this._customNumbering.indexOf(parseInt(extent, 10));
                return parseInt(extent, 10) - 1;
            };

            ranges.push({
                start: parseExtent(start),
                end: parseExtent(end),
                strand
            });
        }

        return ranges;
    }

    private annotationRangeToString(ranges: AnnotationRange[]): string {
        let baseRanges = '';

        const rawIndexToUINumbering = (strand: string | undefined, index: number): string => {
            // We add one because frontend numbers bases from 1
            if (this._customNumbering && !strand) {
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
            const start = rawIndexToUINumbering(range.strand, range.start);
            const end = rawIndexToUINumbering(range.strand, range.end);
            const strandPrefix = range.strand ? `${range.strand} ` : '';
            if (range.start <= range.end) {
                baseRanges += `${strandPrefix}${start}-${end}, `;
            } else {
                baseRanges += `${strandPrefix}${end}-${start}, `;
            }
        }
        // remove last comma
        baseRanges = baseRanges.substring(0, baseRanges.length - 2);

        return baseRanges;
    }

    private static hasDuplicates(arr: (string|number)[]): (string|number)[] {
        if (arr.length === 0) {
            return [];
        }

        const sortedArr = arr.slice().sort();
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

    private expandRanges(ranges: AnnotationRange[]): number[][] {
        const expandedRanges: number[][] = [];
        for (const annotationRange of ranges) {
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
    private _isClosing: boolean = false;
    private _sequenceLength: number;
    private _oligoLengths: Map<string, number>;
    private _customNumbering: (number | null)[] | undefined;
    private _initialAnnotation: AnnotationData | null = null;
    private _initialRanges: AnnotationRange[] | null = null;
    private _activeCategory: AnnotationCategory;
    private _layers: AnnotationData[] = [];
    private _selectedLayer: AnnotationData | null = null;
    private _inputLayout: VLayoutContainer;
    private _actionButtonLayout: HLayoutContainer;
    private _layerDropdown: GameDropdown;
    private _categoryDropdown: GameDropdown;
    private _divider: Graphics;
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
    private static readonly ACTION_BUTTON_BORDER_WIDTH = 1;
    private static readonly ACTION_BUTTON_FONT_SIZE = 12;
    private static readonly DELETE_BUTTON_WIDTH = 120;
    private static readonly DELETE_BUTTON_HEIGHT = AnnotationDialog.ACTION_BUTTON_HEIGHT - 10;
    private static readonly DELETE_BUTTON_FONT_SIZE = 12;
    private static readonly DROPDOWN_HEIGHT = AnnotationDialog.ACTION_BUTTON_HEIGHT;
    public static readonly ANNOTATION_TEXT_CHARACTER_LIMIT = 50;
    private static readonly UPPER_TOOLBAR_DIVIDER_COLOR = 0x112238;
    private static readonly LABEL_COLOR = 0xC0DCE7;
}
