import {Graphics, Text} from 'pixi.js';
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
// import {AnnotationType} from 'eterna/pose2D/Pose2D';
import Dialog from './Dialog';
import GameButton from './GameButton';
import TextInputObject from './TextInputObject';
import {InputField} from './TextInputPanel';
import GamePanel, {GamePanelType} from './GamePanel';
import VScrollBox from './VScrollBox';
import GameDropdown from './GameDropdown';

export default class AnnotationDialog extends Dialog<void> {
    constructor(edit: boolean, initialRanges: [[number, number]] | null) {
        super();
        this._edit = edit;
        this._initialRanges = initialRanges;
    }

    private static readonly config = {
        textName: 'Text',
        basesName: 'Bases'
    };

    protected added(): void {
        super.added();

        // Get constants data
        const {config} = AnnotationDialog;

        // Generate Dialog Heading
        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1,
            color: 0x21508C,
            borderAlpha: 1,
            borderColor: 0x4A90E2,
            dropShadow: true
        });
        this._panel.title = this._edit ? 'Edit Annotation' : 'New Annotation';
        this.addObject(this._panel, this.container);

        // Generate Dialog Close Button
        const closeButton = new GameButton()
            .allStates(Bitmaps.ImgAchievementsClose);
        this.addObject(closeButton, this.container);
        closeButton.clicked.connect(() => this.close(null));

        // Generate Dialog Body
        // const settingsLayout: VLayoutContainer = new VLayoutContainer(15, HAlign.LEFT);
        // this._viewLayout.addChild(settingsLayout);
        this._textInputLayout = new VLayoutContainer(0, HAlign.CENTER);
        this._textInputLayout.sortableChildren = true;
        // Add Text Field
        const textField = this.getInputField(
            config.textName,
            'Annotation Text',
            AnnotationDialog.FIELD_WIDTH,
            AnnotationDialog.FIELD_HEIGHT,
            false,
            AnnotationDialog.ANNOTATION_TEXT_CHARACTER_LIMIT
        );
        this._textInputLayout.addChild(textField.label);
        this.addObject(textField.input, this._textInputLayout);

        // Add Bases Field
        const basesField = this.getInputField(
            config.basesName,
            'Base Ranges (e.g. 1-5, 10-12)',
            AnnotationDialog.FIELD_WIDTH,
            AnnotationDialog.FIELD_HEIGHT
        );
        if (this._initialRanges != null) {
            let baseRanges = '';
            for (const range of this._initialRanges) {
                baseRanges += `${range[0]}-${range[1]},`;
            }
            // remove last comma
            baseRanges = baseRanges.substring(0, baseRanges.length - 2);
            // set ranges string
            basesField.input.text = baseRanges;
        }
        this._textInputLayout.addChild(basesField.label);
        this.addObject(basesField.input, this._textInputLayout);
        textField.input.setFocus();

        // Generate Dialog Action Buttons
        const buttonPadding = AnnotationDialog.FIELD_WIDTH
            - 2 * AnnotationDialog.ACTION_BUTTON_WIDTH
            - 2 * AnnotationDialog.ACTION_BUTTON_BORDER_WIDTH;
        const dropdownSectionHeight = AnnotationDialog.DROPDOWN_HEIGHT
            + AnnotationDialog.LABEL_PADDING
            + AnnotationDialog.FIELD_MARGIN
            + AnnotationDialog.FONT_SIZE;
        this._actionButtonLayout = new HLayoutContainer(buttonPadding, VAlign.CENTER);
        // 1) Cancel Button
        const cancelButtonGraphic = new Graphics()
            .lineStyle(AnnotationDialog.ACTION_BUTTON_BORDER_WIDTH, 0xffffff)
            .beginFill(0x21508C)
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
        cancelButton.clicked.connect(() => this.close(null));
        this.addObject(cancelButton, this._actionButtonLayout);
        // 2) Save Button
        const saveButtonGraphic = new Graphics()
            .beginFill(0x54B54E)
            .drawRoundedRect(
                0,
                0,
                AnnotationDialog.ACTION_BUTTON_WIDTH,
                AnnotationDialog.ACTION_BUTTON_HEIGHT,
                AnnotationDialog.ACTION_BUTTON_CORNER_RADIUS
            ).endFill();
        const saveButton = new GameButton()
            .customStyleBox(saveButtonGraphic)
            .label('Save', AnnotationDialog.ACTION_BUTTON_FONT_SIZE);
        saveButton.clicked.connect(() => this.close(null));
        this.addObject(saveButton, this._actionButtonLayout);
        this._actionButtonLayout.y = this._textInputLayout.height
            + dropdownSectionHeight
            + AnnotationDialog.ACTION_BUTTON_LAYOUT_MARGIN;
        this._actionButtonLayout.layout();

        // Generate Dialog Divider
        const divider = new Graphics()
            .lineStyle(AnnotationDialog.ACTION_BUTTON_BORDER_WIDTH, 0x4A90E2)
            .moveTo(0, 0)
            .lineTo(AnnotationDialog.FIELD_WIDTH + 2 * AnnotationDialog.W_MARGIN, 0);

        // Generate Delete Annotation Button
        let deleteButtonLayout: HLayoutContainer | null = null;
        if (this._edit) {
            deleteButtonLayout = new HLayoutContainer(0, VAlign.CENTER);
            const deleteButtonGraphic = new Graphics()
                .beginFill(0x21508C)
                .drawRect(
                    0,
                    0,
                    AnnotationDialog.DELETE_BUTTON_WIDTH,
                    AnnotationDialog.DELETE_BUTTON_HEIGHT
                ).endFill();
            const deleteButton = new GameButton()
                .customStyleBox(deleteButtonGraphic)
                .label('Delete Annotation', AnnotationDialog.DELETE_BUTTON_FONT_SIZE);
            deleteButton.clicked.connect(() => this.close(null));
            this.addObject(deleteButton, deleteButtonLayout);
            deleteButtonLayout.x = (AnnotationDialog.FIELD_WIDTH - AnnotationDialog.DELETE_BUTTON_WIDTH) / 2;
            deleteButtonLayout.y = this._textInputLayout.height
                + dropdownSectionHeight
                + AnnotationDialog.ACTION_BUTTON_LAYOUT_MARGIN
                + this._actionButtonLayout.height
                + AnnotationDialog.DELETE_BUTTON_LAYOUT_MARGIN;
            deleteButtonLayout.layout();
        }

        // Place layouts in scroll container
        const scrollBox = new VScrollBox(0, 0);
        this.addObject(scrollBox, this.container);
        scrollBox.content.addChild(this._textInputLayout);
        scrollBox.content.addChild(this._actionButtonLayout);
        if (deleteButtonLayout != null) {
            scrollBox.content.addChild(deleteButtonLayout);
        }
        this.container.addChild(divider);

        // Add Annotation Layer Dropdown
        const dropdown = new GameDropdown({
            fontSize: 14,
            options: [
                'Select a Layer',
                'Layer #1',
                'Layer #2',
                'Layer #3',
                'Layer #4',
                'Layer #5',
                'Layer #6',
                'Layer #7'
            ],
            defaultOption: 'Select a Layer',
            borderWidth: 0,
            borderColor: 0xC0DCE7,
            color: 0x043468,
            textColor: 0xF39C12,
            textWeight: 'bold',
            width: AnnotationDialog.FIELD_WIDTH,
            height: AnnotationDialog.DROPDOWN_HEIGHT,
            dropShadow: true,
            checkboxes: true
        });
        const dropDownLabel: Text = Fonts.std(
            'Annotation Layer',
            AnnotationDialog.FONT_SIZE,
            FontWeight.BOLD
        ).color(0xC0DCE7).build();
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
        dropdown.display.x = 0;
        dropdown.display.y = accHeight + dropDownLabel.height + AnnotationDialog.LABEL_PADDING;

        this._textInputLayout.addChild(dropDownLabel);
        this.addObject(dropdown, this._textInputLayout);

        const updateLocation = () => {
            Assert.assertIsDefined(Flashbang.stageHeight);
            let idealHeight = 0;
            if (deleteButtonLayout == null) {
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
                    + deleteButtonLayout.height
                    + 2 * AnnotationDialog.H_MARGIN
                    + this._panel.titleHeight;
            }
            const maxHeight = Flashbang.stageHeight * 0.8;
            const panelHeight = Math.min(idealHeight, maxHeight);
            const panelWidth = AnnotationDialog.FIELD_WIDTH + 2 * AnnotationDialog.W_MARGIN;

            scrollBox.setSize(
                panelWidth - 2 * AnnotationDialog.W_MARGIN,
                panelHeight - 2 * AnnotationDialog.H_MARGIN - this._panel.titleHeight
            );
            scrollBox.doLayout();

            this._panel.setSize(panelWidth, panelHeight);

            DisplayUtil.positionRelativeToStage(
                this._panel.display,
                HAlign.CENTER, VAlign.CENTER,
                HAlign.CENTER, VAlign.CENTER
            );

            DisplayUtil.positionRelative(
                divider, HAlign.CENTER, VAlign.TOP,
                this._panel.display, HAlign.CENTER, VAlign.TOP,
                0,
                this._panel.titleHeight
                + AnnotationDialog.H_MARGIN
                + this._textInputLayout.height
                + AnnotationDialog.ACTION_BUTTON_LAYOUT_MARGIN / 2
            );

            DisplayUtil.positionRelative(
                scrollBox.display, HAlign.CENTER, VAlign.TOP,
                this._panel.display, HAlign.CENTER, VAlign.TOP,
                0, this._panel.titleHeight + AnnotationDialog.H_MARGIN
            );

            DisplayUtil.positionRelative(
                closeButton.display, HAlign.RIGHT, VAlign.TOP,
                this._panel.display, HAlign.RIGHT, VAlign.TOP,
                -10, 11
            );
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
            rows: multiline ? 3 : 1,
            placeholder,
            characterLimit
        }).font(Fonts.STDFONT);

        // Generate label text object
        const label: Text = Fonts.std(name, AnnotationDialog.FONT_SIZE, FontWeight.BOLD).color(0xC0DCE7).build();

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

    protected onBGClicked(): void {
        this.close(null);
    }

    protected get bgAlpha(): number {
        return 0.3;
    }

    private _edit: boolean = false;
    private _initialRanges: [[number, number]] | null = null;
    private _panel: GamePanel;
    private _textInputLayout: VLayoutContainer;
    private _actionButtonLayout: HLayoutContainer;
    private _fields: InputField[] = [];

    private static readonly W_MARGIN = 35;
    private static readonly H_MARGIN = 20;
    private static readonly FONT_SIZE = 12;
    private static readonly FIELD_WIDTH = 305;
    private static readonly FIELD_HEIGHT = 45;
    private static readonly FIELD_MARGIN = 20;
    private static readonly FIELD_FONT_SIZE = 16;
    private static readonly LABEL_PADDING = 10;
    private static readonly ACTION_BUTTON_LAYOUT_MARGIN = 45;
    private static readonly ACTION_BUTTON_WIDTH = 120;
    private static readonly ACTION_BUTTON_HEIGHT = 45;
    private static readonly ACTION_BUTTON_CORNER_RADIUS = 5;
    private static readonly ACTION_BUTTON_BORDER_WIDTH = 1;
    private static readonly ACTION_BUTTON_FONT_SIZE = 18;
    private static readonly DELETE_BUTTON_LAYOUT_MARGIN = 20;
    private static readonly DELETE_BUTTON_WIDTH = 120;
    private static readonly DELETE_BUTTON_HEIGHT = 20;
    private static readonly DELETE_BUTTON_FONT_SIZE = 14;
    private static readonly DROPDOWN_HEIGHT = 35;
    private static readonly ANNOTATION_TEXT_CHARACTER_LIMIT = 30;
}
