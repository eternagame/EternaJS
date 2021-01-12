import {Graphics} from 'pixi.js';
import {
    ContainerObject,
    VLayoutContainer,
    DisplayUtil,
    VAlign,
    HAlign,
    HLayoutContainer
} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import VScrollBox from './VScrollBox';
import AnnotationItem, {
    AnnotationType,
    ItemType
} from './AnnotationItem';

export default class AnnotationLayersPanel extends ContainerObject {
    constructor(button: GameButton) {
        super();

        this._button = button;

        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1.0,
            color: 0x152843,
            dropShadow: true,
            borderRadius: AnnotationLayersPanel.BORDER_RADIUS
        });
        this._panel.display.visible = false;
        this.addObject(this._panel, this.container);

        // Generate panel upper toolbar
        this._upperToolbar = new HLayoutContainer(0, VAlign.CENTER);
        this._panel.container.addChild(this._upperToolbar);
    }

    protected added(): void {
        super.added();

        this._newLayerButton = new GameButton()
            .allStates(Bitmaps.ImgFolder)
            .tooltip('Add layer');
        this._newLayerButton.clicked.connect(() => {});
        this.addObject(this._newLayerButton, this._upperToolbar);
        this._deleteButton = new GameButton()
            .allStates(Bitmaps.ImgTrash)
            .tooltip('Delete layer');
        this._deleteButton.clicked.connect(() => {});
        this.addObject(this._deleteButton, this._upperToolbar);
        this._upperToolbar.layout();

        // Divider
        const upperToolbarBottomDivider = new Graphics()
            .beginFill(0x112238)
            .drawRect(
                0,
                0,
                AnnotationLayersPanel.PANEL_WIDTH,
                AnnotationLayersPanel.DIVIDER_THICKNESS
            )
            .endFill();
        upperToolbarBottomDivider.x = AnnotationLayersPanel.DROP_SHADOW_X_OFFSET;
        upperToolbarBottomDivider.y = AnnotationLayersPanel.UPPER_TOOLBAR_HEIGHT;
        this._panel.container.addChild(upperToolbarBottomDivider);

        // Must be after divider which sets the maximum width
        DisplayUtil.positionRelative(
            this._upperToolbar, HAlign.RIGHT, VAlign.TOP,
            this._panel.container, HAlign.RIGHT, VAlign.TOP
        );

        this._scrollView = new VScrollBox(AnnotationLayersPanel.PANEL_WIDTH, AnnotationLayersPanel.PANEL_HEIGHT);
        this.addObject(this._scrollView, this._panel.container);

        this._contentLayout = new VLayoutContainer(0, HAlign.CENTER);
        this._scrollView.content.addChild(this._contentLayout);
        this._scrollView.doLayout();
        DisplayUtil.positionRelative(
            this._scrollView.container, HAlign.LEFT, VAlign.TOP,
            this._panel.container, HAlign.LEFT, VAlign.TOP,
            AnnotationLayersPanel.DROP_SHADOW_X_OFFSET,
            this._upperToolbar.height + AnnotationLayersPanel.DIVIDER_THICKNESS
        );

        this.doLayout();
        this._scrollView.doLayout();
        this._scrollView.updateScrollThumb();

        const rnaHeader = new AnnotationItem({
            width: AnnotationLayersPanel.PANEL_WIDTH,
            dividerThickness: AnnotationLayersPanel.DIVIDER_THICKNESS,
            type: ItemType.CATEGORY_HEADER,
            title: 'Structure Annotations',
            annotationType: AnnotationType.STRUCTURE
        });
        this.addItem(rnaHeader);
        const puzzleHeader = new AnnotationItem({
            width: AnnotationLayersPanel.PANEL_WIDTH,
            dividerThickness: AnnotationLayersPanel.DIVIDER_THICKNESS,
            type: ItemType.CATEGORY_HEADER,
            title: 'Puzzle Annotations',
            annotationType: AnnotationType.PUZZLE
        });
        this.addItem(puzzleHeader);
        const solutionHeader = new AnnotationItem({
            width: AnnotationLayersPanel.PANEL_WIDTH,
            dividerThickness: AnnotationLayersPanel.DIVIDER_THICKNESS,
            type: ItemType.CATEGORY_HEADER,
            title: 'Solution Annotations',
            annotationType: AnnotationType.SOLUTION,
            children: [
                {
                    id: '1',
                    type: ItemType.LAYER,
                    title: 'Layer',
                    children: [
                        {
                            id: '4',
                            type: ItemType.ANNOTATION,
                            timestamp: 0,
                            playerID: 1,
                            title: 'This is a Really Long Annotation',
                            ranges: [[1, 2]]
                        }

                    ]
                },
                {
                    id: '2',
                    type: ItemType.ANNOTATION,
                    timestamp: 0,
                    playerID: 1,
                    title: 'Annotation #1',
                    ranges: [[1, 2]]
                },
                {
                    id: '3',
                    type: ItemType.ANNOTATION,
                    timestamp: 0,
                    playerID: 1,
                    title: 'Annotation #2',
                    ranges: [[1, 2]]
                }
            ]
        });
        this.addItem(solutionHeader);

        this.doLayout();
        this._scrollView.doLayout();
        this._scrollView.updateScrollThumb();
    }

    public addItem(item: AnnotationItem) {
        this.addObject(item, this._contentLayout);
        item.updatePanel.connect(() => {
            this.doLayout();
            this._scrollView.doLayout();
            this._scrollView.updateScrollThumb();
        });
        this._items.push(item);
        const annotationItems: AnnotationItem[] = [];
        AnnotationLayersPanel.collectAnnotationItems(this._items, annotationItems);
        AnnotationLayersPanel.connectAnnotations(annotationItems);

        this.needsLayout();
    }

    private needsLayout(): void {
        if (this.isLiveObject) {
            this.doLayout();
        }
    }

    private doLayout(): void {
        if (this._contentLayout) {
            this._contentLayout.layout(true);
        }

        this._panel.setSize(
            AnnotationLayersPanel.PANEL_WIDTH,
            AnnotationLayersPanel.UPPER_TOOLBAR_HEIGHT
            + this._scrollView.height
            + AnnotationLayersPanel.DROP_SHADOW_Y_OFFSET
        );
    }

    // gets all annotation items, including nested ones
    private static collectAnnotationItems = (items: AnnotationItem[], arr: AnnotationItem[]) => {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.itemChildren) {
                arr.push(item);
                AnnotationLayersPanel.collectAnnotationItems(item.itemChildren, arr);
            } else {
                arr.push(item);
            }
        }
    };

    private static connectAnnotations(items: AnnotationItem[]) {
        for (let i = 0; i < items.length; i++) {
            const connectAnnotation = items[i];

            for (let j = 0; j < items.length; j++) {
                if (i !== j) {
                    connectAnnotation.isSelected.disconnect(AnnotationLayersPanel.deselectItem(items, j));
                    connectAnnotation.isSelected.connect(AnnotationLayersPanel.deselectItem(items, j));
                }
            }
        }
    }

    private static deselectItem(items: AnnotationItem[], index: number): (value: boolean, ovalue: boolean) => void {
        return (selected: boolean): void => {
            if (selected) {
                items[index].deselect();
            }
        };
    }

    public set isVisible(visible: boolean) {
        if (visible && !this._isVisible) {
            // Show Panel
            this._panel.display.visible = true;

            DisplayUtil.positionRelative(
                this._panel.container, HAlign.RIGHT, VAlign.BOTTOM,
                this._button.container, HAlign.RIGHT, VAlign.TOP
            );
        } else if (!visible && this._isVisible) {
            // Hide Panel
            this._panel.display.visible = false;
        }

        this._isVisible = visible;
    }

    private _panel: GamePanel;
    private _scrollView: VScrollBox;
    private _items: AnnotationItem[] = [];
    private _contentLayout: VLayoutContainer;

    private _button: GameButton;
    private _isVisible: boolean = false;
    private _upperToolbar: HLayoutContainer;
    private _newLayerButton: GameButton;
    private _deleteButton: GameButton;

    private static readonly PANEL_WIDTH = 240;
    private static readonly PANEL_HEIGHT = 250;
    private static readonly UPPER_TOOLBAR_HEIGHT = 30;
    private static readonly DIVIDER_THICKNESS = 2;
    private static readonly BORDER_RADIUS = 7.5;
    private static readonly DROP_SHADOW_X_OFFSET = -0.25;
    private static readonly DROP_SHADOW_Y_OFFSET = 2;
}
