import {Graphics, Container} from 'pixi.js';
import {
    ContainerObject,
    VLayoutContainer,
    DisplayUtil,
    VAlign,
    HAlign,
    HLayoutContainer
} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import {v4 as uuidv4} from 'uuid';
import AnnotationManager, {
    AnnotationData,
    AnnotationHierarchyType,
    AnnotationCategory
} from 'eterna/AnnotationManager';
import AnnotationPanelItem from 'eterna/ui/AnnotationPanelItem';
import Eterna from 'eterna/Eterna';
import Flashbang from 'flashbang/core/Flashbang';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import VScrollBox from './VScrollBox';
import {Item} from './DragDropper';

export default class AnnotationPanel extends ContainerObject {
    constructor(button: GameButton, manager: AnnotationManager) {
        super();

        this._button = button;
        this._annotationManager = manager;

        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1.0,
            color: 0x152843,
            dropShadow: true,
            borderRadius: AnnotationPanel.BORDER_RADIUS
        });
        this._panel.display.visible = false;
        this.addObject(this._panel, this.container);

        // Generate panel upper toolbar
        this._upperToolbar = new HLayoutContainer(0, VAlign.CENTER);
        this._panel.container.addChild(this._upperToolbar);
    }

    protected added(): void {
        super.added();

        // Upper Toolbar Divider
        const upperToolbarBottomDivider = new Graphics()
            .beginFill(0x112238)
            .drawRect(
                0,
                0,
                AnnotationPanel.PANEL_WIDTH,
                AnnotationPanel.DIVIDER_THICKNESS
            )
            .endFill();
        upperToolbarBottomDivider.x = AnnotationPanel.DROP_SHADOW_X_OFFSET;
        upperToolbarBottomDivider.y = AnnotationPanel.UPPER_TOOLBAR_HEIGHT;
        this._panel.container.addChild(upperToolbarBottomDivider);

        const withEdit = false;
        const withDelete = false;
        this.updateUpperToolbar(withDelete, withEdit);

        this._scrollView = new VScrollBox(AnnotationPanel.PANEL_WIDTH, AnnotationPanel.PANEL_HEIGHT);
        this.addObject(this._scrollView, this._panel.container);

        this._contentLayout = new VLayoutContainer(0, HAlign.CENTER);
        this._scrollView.content.addChild(this._contentLayout);
        this._scrollView.doLayout();
        DisplayUtil.positionRelative(
            this._scrollView.container, HAlign.LEFT, VAlign.TOP,
            this._panel.container, HAlign.LEFT, VAlign.TOP,
            AnnotationPanel.DROP_SHADOW_X_OFFSET,
            this._upperToolbar.height + AnnotationPanel.DIVIDER_THICKNESS
        );

        this.doLayout();
        this._scrollView.doLayout();
        this._scrollView.updateScrollThumb();

        this.updatePanel();
    }

    /**
     * Rerenders the panel
     */
    public updatePanel() {
        if (this._items.length > 0) {
            this._items = [];
        }

        if (this._structureCategory) {
            this._structureCategory.display.destroy();
        }

        if (this._puzzleCategory) {
            this._puzzleCategory.display.destroy();
        }

        if (this._solutionCategory) {
            this._solutionCategory.display.destroy();
        }

        // this._structureCategory = new AnnotationPanelItem({
        //     id: uuidv4(),
        //     playerID: Eterna.playerID,
        //     indexPath: [0],
        //     width: AnnotationPanel.PANEL_WIDTH,
        //     dividerThickness: AnnotationPanel.DIVIDER_THICKNESS,
        //     type: AnnotationHierarchyType.CATEGORY,
        //     title: 'Structure',
        //     category: AnnotationCategory.STRUCTURE,
        //     titleEditable: false,
        //     children: this._annotationManager.getStructureAnnotations(),
        //     updateTitle: (itemPath: number[], text: string) => {
        //         this.updateTitle(itemPath, text);
        //     },
        //     updateAnnotationLayer: (annotation: Item, layerPath: number[]) => {
        //         this.updateAnnotationLayer(annotation, layerPath);
        //     },
        //     updateAnnotationPosition: (firstAnnotation: Item, secondAnnotationPath: number[]) => {
        //         this.updateAnnotationPosition(firstAnnotation, secondAnnotationPath);
        //     }
        // });
        // this.addCategory(this._rnaCategory);
        const puzzleAnnotations = this._annotationManager.getPuzzleAnnotations();
        if (
            this._annotationManager.activeCategory === AnnotationCategory.PUZZLE
            || (this._annotationManager.activeCategory === AnnotationCategory.SOLUTION && puzzleAnnotations.length > 0)
        ) {
            this._puzzleCategory = new AnnotationPanelItem({
                id: uuidv4(),
                playerID: Eterna.playerID,
                indexPath: [1],
                width: AnnotationPanel.PANEL_WIDTH,
                dividerThickness: AnnotationPanel.DIVIDER_THICKNESS,
                type: AnnotationHierarchyType.CATEGORY,
                title: 'Puzzle',
                category: AnnotationCategory.PUZZLE,
                titleEditable: this._annotationManager.activeCategory === AnnotationCategory.PUZZLE,
                children: puzzleAnnotations,
                updateTitle: (itemPath: number[], text: string) => {
                    this.updateTitle(itemPath, text);
                },
                updateAnnotationLayer: (annotation: Item, layerPath: number[]) => {
                    this.updateAnnotationLayer(annotation, layerPath);
                },
                updateAnnotationPosition: (firstAnnotation: Item, secondAnnotationPath: number[]) => {
                    this.updateAnnotationPosition(firstAnnotation, secondAnnotationPath);
                }
            });
            this.addCategory(this._puzzleCategory);
        }
        if (this._annotationManager.activeCategory === AnnotationCategory.SOLUTION) {
            this._solutionCategory = new AnnotationPanelItem({
                id: uuidv4(),
                playerID: Eterna.playerID,
                indexPath: [2],
                width: AnnotationPanel.PANEL_WIDTH,
                dividerThickness: AnnotationPanel.DIVIDER_THICKNESS,
                type: AnnotationHierarchyType.CATEGORY,
                title: 'Solution',
                category: AnnotationCategory.SOLUTION,
                titleEditable: this._annotationManager.activeCategory === AnnotationCategory.SOLUTION,
                children: this._annotationManager.getSolutionAnnotations(),
                updateTitle: (itemPath: number[], text: string) => {
                    this.updateTitle(itemPath, text);
                },
                updateAnnotationLayer: (annotation: Item, layerPath: number[]) => {
                    this.updateAnnotationLayer(annotation, layerPath);
                },
                updateAnnotationPosition: (firstAnnotation: Item, secondAnnotationPath: number[]) => {
                    this.updateAnnotationPosition(firstAnnotation, secondAnnotationPath);
                }
            });
            this.addCategory(this._solutionCategory);
        }

        this.doLayout();
        this._scrollView.doLayout();
        this._scrollView.updateScrollThumb();

        const withEdit = false;
        const withDelete = false;
        this.updateUpperToolbar(withDelete, withEdit);
    }

    /**
     * Adds a new category to the panel
     *
     * @param item the panel item that represents the category
     */
    private addCategory(item: AnnotationPanelItem) {
        this.addObject(item, this._contentLayout);
        // Registers to receive updates about when panel should be updated
        // Typically occurs when a layer accordion is expanded/closed
        item.onUpdatePanel.connect(() => {
            this.doLayout();
            this._scrollView.doLayout();
            this._scrollView.updateScrollThumb();
        });
        // Add to list of items
        this._items.push(item);
        // Get 1D array of annotations in annotation tree
        const annotationModels: AnnotationPanelItem[] = [];
        AnnotationPanel.collectAnnotationPanelItems(this._items, annotationModels);
        // Register annotation models to observe drag events
        this.registerDragObservers(annotationModels);
        // Register panel to respond to annotation selection events
        this.registerAnnotationObservers(annotationModels);

        this.doLayout();
    }

    /**
     * Performs layout rerender
     */
    private doLayout(): void {
        if (this._contentLayout) {
            this._contentLayout.layout(true);
        }

        if (this._panel && this._scrollView) {
            this._panel.setSize(
                AnnotationPanel.PANEL_WIDTH,
                AnnotationPanel.UPPER_TOOLBAR_HEIGHT
                + this._scrollView.height
                + AnnotationPanel.DROP_SHADOW_Y_OFFSET
            );
        }
    }

    /**
     * Flattens the graph of panel items into an array. Mutates an argument array, which could introduce potential
     * for bugs.
     *
     * @param items a graph of panel items
     * @param arr array to place panel items into
     */
    private static collectAnnotationPanelItems = (items: AnnotationPanelItem[], arr: AnnotationPanelItem[]) => {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.modelChildren) {
                arr.push(item);
                AnnotationPanel.collectAnnotationPanelItems(item.modelChildren, arr);
            } else {
                arr.push(item);
            }
        }
    };

    /**
     * Rerenders the upper toolbar of the panel. The 'new layer' button
     * is always accessible
     *
     * @param withDelete whether to include the delete button
     * @param withEdit whether to include the edit button
     */
    private updateUpperToolbar(withDelete: boolean, withEdit: boolean) {
        if (this._newLayerButton) {
            this._newLayerButton.destroySelf();
        }
        if (this._deleteButton) {
            this._deleteButton.destroySelf();
        }
        if (this._editButton) {
            this._editButton.destroySelf();
        }

        this._newLayerButton = new GameButton()
            .allStates(Bitmaps.ImgFolder)
            .tooltip('Add layer');
        this._newLayerButton.pointerDown.connect(() => {
            this._annotationManager.createNewLayer();
            // There is an odd bug where pointerUp does not trigger
            // on Button sometimes.
            // As a result, pointerTap is not always called, resulting
            // in incosistent clicked.connect() emissions.
            //
            // We fix this by connecting to pointerDown and playing button
            // sound here.
            Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
        });
        this._panel.addObject(this._newLayerButton, this._upperToolbar);

        let offset = 0;
        if (withEdit) {
            this._editButton = new GameButton()
                .allStates(Bitmaps.ImgPencil)
                .tooltip('Edit');
            this._editButton.pointerDown.connect(() => {
                this.editSelectedAnnotation();
                // There is an odd bug where pointerUp does not trigger
                // on Button sometimes.
                // As a result, pointerTap is not always called, resulting
                // in incosistent clicked.connect() emissions.
                //
                // We fix this by connecting to pointerDown and playing button
                // sound here.
                Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
            });
            this._panel.addObject(this._editButton, this._upperToolbar);
            offset += this._editButton.display.width;
        }

        if (withDelete) {
            this._deleteButton = new GameButton()
                .allStates(Bitmaps.ImgTrash)
                .tooltip('Delete');
            this._deleteButton.pointerDown.connect(() => {
                this.deleteSelectedItem();
                // There is an odd bug where pointerUp does not trigger
                // on Button sometimes.
                // As a result, pointerTap is not always called, resulting
                // in incosistent clicked.connect() emissions.
                //
                // We fix this by connecting to pointerDown and playing button
                // sound here.
                Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
            });
            this._panel.addObject(this._deleteButton, this._upperToolbar);
            offset += this._deleteButton.display.width;
        }

        if (this._annotationManager.activeCategory === AnnotationCategory.PUZZLE) {
            // For some odd reason the offset is 2x too large in the puzzle maker
            // but not the puzzle solver
            offset /= 2;
        }

        this._upperToolbar.layout();

        DisplayUtil.positionRelative(
            this._upperToolbar, HAlign.RIGHT, VAlign.TOP,
            this._panel.container, HAlign.RIGHT, VAlign.TOP,
            -offset, 0
        );
    }

    /**
     * Edits the item (annotation or layer) currently selected (if any)
     */
    private editSelectedAnnotation() {
        if (
            this._selectedPath
            && this._selectedDisplay
            && this._selectedItem
        ) {
            if (this._selectedItem.type === AnnotationHierarchyType.ANNOTATION) {
                const [, categoryData] = this.getCategoryData(this._selectedPath[0]);
                if (this._selectedPath.length === 2) {
                    // Annotation not in layer or is layer
                    const annotation = categoryData[this._selectedPath[1]];
                    this._annotationManager.onEditAnnotation.value = annotation;
                } else if (this._selectedPath.length === 3) {
                    // Annotation in layer
                    const layerChildren = categoryData[this._selectedPath[1]].children;
                    if (layerChildren) {
                        const annotation = layerChildren[this._selectedPath[2]];
                        this._annotationManager.onEditAnnotation.value = annotation;
                    }
                }

                // Hide delete + edit button
                const withEdit = false;
                const withDelete = false;
                this.updateUpperToolbar(withDelete, withEdit);
            }
        }
    }

    /**
     * Deletes the item (annotation or layer) currently selected (if any)
     */
    private deleteSelectedItem() {
        if (
            this._selectedPath
            && this._selectedDisplay
            && this._selectedItem
        ) {
            // Find category
            const [category, categoryData] = this.getCategoryData(this._selectedPath[0]);

            // Remove from model
            if (this._selectedPath.length === 2) {
                // Annotation not in layer or is layer
                categoryData.splice(this._selectedPath[1], 1);
            } else if (this._selectedPath.length === 3) {
                // Annotation in layer
                const layerChildren = categoryData[this._selectedPath[1]].children;
                if (layerChildren) {
                    layerChildren.splice(this._selectedPath[2], 1);
                }
            }

            // Remove from view
            this._selectedDisplay.destroy();

            // Clear state
            this._selectedPath = null;
            this._selectedDisplay = null;

            // Hide delete + edit button
            const withEdit = false;
            const withDelete = false;
            this.updateUpperToolbar(withDelete, withEdit);

            this.updateManagerCategory(category, categoryData);
        }
    }

    /**
     * Used by the drag and drop infrastructure, the method registers
     * observers from every panel item in a fully connected way so
     * annotations can respond to selection events (and deselect self if necessary)
     *
     * @param items array of panel items
     */
    private registerDragObservers(items: AnnotationPanelItem[]) {
        for (let i = 0; i < items.length; i++) {
            const connectedAnnotation = items[i];

            for (let j = 0; j < items.length; j++) {
                const connectorAnnotation = items[j];
                if (i !== j) {
                    connectedAnnotation.isSelected.disconnect(AnnotationPanel.deselectItem(items, j));
                    connectedAnnotation.isSelected.connect(AnnotationPanel.deselectItem(items, j));
                }

                if (
                    connectedAnnotation.dropTarget
                    && connectorAnnotation.dragSource
                ) {
                    connectedAnnotation.observeDragSource(connectorAnnotation.dragSource);
                }
            }
        }
    }

    /**
     * Used by the drag and drop infrastructure, the method attaches callbacks that react
     * to changes in item visibility and selection
     *
     * @param items array of panel items
     */
    private registerAnnotationObservers(items: AnnotationPanelItem[]) {
        for (let i = 0; i < items.length; i++) {
            const annotation = items[i];
            annotation.isSelected.connect((isSelected) => {
                if (isSelected && annotation.type !== AnnotationHierarchyType.CATEGORY) {
                    this._selectedPath = annotation.indexPath;
                    this._selectedItem = annotation;
                    this._selectedDisplay = annotation.display;

                    // Show delete + edit button
                    const withEdit = annotation.category === this._annotationManager.activeCategory
                        && annotation.category !== AnnotationCategory.STRUCTURE
                        && annotation.type === AnnotationHierarchyType.ANNOTATION;
                    const withDelete = annotation.category === this._annotationManager.activeCategory
                    && annotation.category !== AnnotationCategory.STRUCTURE;
                    this.updateUpperToolbar(withDelete, withEdit);
                } else if (
                    this._selectedPath
                    && annotation.indexPath.toString() === this._selectedPath.toString()
                ) {
                    this._selectedPath = null;
                    this._selectedItem = null;
                    this._selectedDisplay = null;

                    // Hide delete + edit button
                    const withEdit = false;
                    const withDelete = false;
                    this.updateUpperToolbar(withDelete, withEdit);
                }

                this._annotationManager.setAnnotationSelection(annotation, isSelected);
            });
            annotation.isVisible.connect((isVisible: boolean) => {
                // Inform layer panel observers of update
                this._annotationManager.setAnnotationVisibility(annotation, isVisible);
            });
        }
    }

    /**
     * Finds and toggles the selection state in of a given item (annotion or layer)
     *
     * @param item data of item of interest
     */
    public toggleAnnotationPanelItemSelection(item: AnnotationData): void {
        const annotationItems: AnnotationPanelItem[] = [];
        AnnotationPanel.collectAnnotationPanelItems(this._items, annotationItems);

        for (const val of annotationItems) {
            if (val.id === item.id && item.selected) {
                val.deselect();
            } else if (val.id === item.id && !item.selected) {
                val.select();
            }
        }
    }

    /**
     * Returns a function that deselects a particular item once invoked
     *
     * @param items array of panel items
     * @param index index of panel item of interest
     */
    public static deselectItem(items: AnnotationPanelItem[], index: number): (value: boolean, ovalue: boolean) => void {
        return (selected: boolean): void => {
            if (selected) {
                items[index].deselect();
            }
        };
    }

    /**
     * Update the title of an item (annotation or layer) found at a particular path
     *
     * @param itemPath path to item
     * @param text new title
     */
    private updateTitle(itemPath: number[], text: string) {
        const [category, categoryData] = this.getCategoryData(itemPath[0]);

        if (itemPath.length === 2) {
            // Annotation not in layer or is layer
            categoryData[itemPath[1]].title = text;
        } else if (itemPath.length === 3) {
            // Annotation in layer
            const layerChildren = categoryData[itemPath[1]].children;
            if (layerChildren) {
                layerChildren[itemPath[2]].title = text;
            }
        }

        this.updateManagerCategory(category, categoryData);
    }

    /**
     * Used by the drag and drop infrastructure to modify the layer parent of an
     * annotation within the graph of panel items
     *
     * @param annotation partial data from the source annotation
     * @param layerPath an index path to target layer
     */
    private updateAnnotationLayer(annotation: Item, layerPath: number[]) {
        // IMPORTANT:
        // If a user drops an annotation onto
        // another annotation in a layer three drop events occur in this order:
        // 1) Category Drop (which calls updateAnnotationLayer)
        // 2) Layer Drop (which calls updateAnnotationLayer)
        // 3) Position Drop (which calls updateAnnotationPosition)
        //
        // In such a scenario, we don't want to process both #1 and #2,
        // But there is no way to distinguish that event from a user dropping
        // an annotation onto a category (to presumably remove it from a layer)
        // apart from anticipating a second call to this method, which is what we do here.
        //
        // A timeout is set that waits 100 ms before executing layer update.
        // If there is no second call within that time we continue unabated
        // But if there is we clear the timeout and execute only the layer call
        // (ignoring the initial category call)
        if (this._updateLayerTimeout) {
            clearTimeout(this._updateLayerTimeout);
            this._updateLayerTimeout = null;
            this.executeLayerUpdate(annotation, layerPath);
        } else {
            this._updateLayerTimeout = setTimeout(() => {
                this.executeLayerUpdate(annotation, layerPath);
                this._updateLayerTimeout = null;
            }, AnnotationPanel.LAYER_UPDATE_DELAY);
        }

        // Hide delete + edit button
        const withEdit = false;
        const withDelete = false;
        this.updateUpperToolbar(withDelete, withEdit);
    }

    /**
     * Helper method that modifies the layer position of an annotation
     * upon drop during a drag and drop event.
     *
     * @param annotation partial data from the source annotation
     * @param layerPath  an index path to target layer
     */
    private executeLayerUpdate(annotation: Item, layerPath: number[]) {
        // locate annotation and remove from current layer
        let annotationData: AnnotationData | null = null;
        const path = annotation.index as number[];
        const [category, categoryData] = this.getCategoryData(path[0]);

        if (path.length === 2) {
            // Annotation not in layer
            annotationData = categoryData[path[1]] as AnnotationData;
            categoryData.splice(path[1], 1);
        } else if (path.length === 3) {
            // Annotation in layer
            const layerChildren = categoryData[path[1]].children;
            if (layerChildren) {
                annotationData = layerChildren[path[2]] as AnnotationData;
                // Remove annotation
                layerChildren.splice(path[2], 1);
            }
        }

        // add to new location
        if (annotationData) {
            if (layerPath.length === 1) {
                // Not in layer
                categoryData.push(annotationData);
            } else if (layerPath.length === 2) {
                // In layer
                const layerChildren = categoryData[layerPath[1]].children;
                if (layerChildren) {
                    annotationData.layerId = categoryData[layerPath[1]].id;
                    layerChildren.push(annotationData);
                }
            }

            // Repaint layers
            this.updatePanel();
        }

        this.updateManagerCategory(category, categoryData);
    }

    /**
     * Used by the drag and drop infrastructure to modify the position of an
     * annotation within the graph of panel items
     *
     * @param firstAnnotation partial data from the source annotation
     * @param secondAnnotationPath an index path to target annotation
     */
    private updateAnnotationPosition(firstAnnotation: Item, secondAnnotationPath: number[]) {
        // remove from current layer
        let firstAnnotationData: AnnotationData | null = null;
        const [category, categoryData] = this.getCategoryData(secondAnnotationPath[0]);

        // IMPORTANT:
        // If a user drops an annotation onto
        // another annotation in a layer three drop events occur in this order:
        // 1) Category Drop (which calls updateAnnotationLayer)
        // 2) Layer Drop (which calls updateAnnotationLayer)
        // 3) Position Drop (which calls updateAnnotationPosition)
        //
        // The outcome of the first two methods will often move the annotation
        // to the desired layer.
        // As a result, we merely need to find the annotation in that layer
        // And move it to the correct layer index
        //
        // This is why we only read the second annotation path.

        if (secondAnnotationPath.length === 2) {
            // Annotation not in layer
            for (let i = 0; i < categoryData.length; i++) {
                if (categoryData[i].id === firstAnnotation.id) {
                    // Get data
                    firstAnnotationData = categoryData[i] as AnnotationData;

                    // Remove annotation
                    categoryData.splice(i, 1);
                }
            }
        } else if (secondAnnotationPath.length === 3) {
            // Annotation in layer
            const layerChildren = categoryData[secondAnnotationPath[1]].children;

            if (layerChildren) {
                for (let i = 0; i < layerChildren.length; i++) {
                    if (layerChildren[i].id === firstAnnotation.id) {
                        // Get data
                        firstAnnotationData = layerChildren[i] as AnnotationData;

                        // Remove annotation
                        layerChildren.splice(i, 1);
                    }
                }
            }
        }

        // move to new position
        if (firstAnnotationData) {
            if (secondAnnotationPath.length === 2) {
                // Annotation not in layer
                categoryData.splice(secondAnnotationPath[1], 0, firstAnnotationData);
            } else if (secondAnnotationPath.length === 3) {
                // Annotation in layer
                const layerChildren = categoryData[secondAnnotationPath[1]].children;
                if (layerChildren) {
                    firstAnnotationData.layerId = categoryData[secondAnnotationPath[1]].id;
                    layerChildren.splice(secondAnnotationPath[2], 0, firstAnnotationData);
                }
            }

            // Repaint layers
            this.updatePanel();
        }

        // Hide delete + edit button
        const withEdit = false;
        const withDelete = false;
        this.updateUpperToolbar(withDelete, withEdit);
        this.updateManagerCategory(category, categoryData);
    }

    /**
     * Retrieves appropriate data from the annotation manager given
     * an category index governed by the category's order on the panel
     *
     * @param categoryIndex index of category in panel
     */
    private getCategoryData(categoryIndex: number): [AnnotationCategory, AnnotationData[]] {
        let category: AnnotationCategory;
        let categoryData: AnnotationData[];
        switch (categoryIndex) {
            case 0:
                category = AnnotationCategory.STRUCTURE;
                categoryData = this._annotationManager.getStructureAnnotations();
                break;
            case 1:
                category = AnnotationCategory.PUZZLE;
                categoryData = this._annotationManager.getPuzzleAnnotations();
                break;
            default:
                category = AnnotationCategory.SOLUTION;
                categoryData = this._annotationManager.getSolutionAnnotations();
                break;
        }

        return [category, categoryData];
    }

    /**
     * Replaces a category in the annotation manager with a mutated version
     *
     * @param category the target annotation category
     * @param data the replacement data
     */
    private updateManagerCategory(category: AnnotationCategory, data: AnnotationData[]): void {
        switch (category) {
            case AnnotationCategory.SOLUTION:
                this._annotationManager.updateSolutionAnnotations(data);
                break;
            case AnnotationCategory.PUZZLE:
                this._annotationManager.updatePuzzleAnnotations(data);
                break;
            default:
                break;
        }
    }

    /**
     * Sets the visibility state for the annotation panel
     *
     * @param visible wehther panel should be revealed or hidden
     */
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
    private _items: AnnotationPanelItem[] = [];
    private _contentLayout: VLayoutContainer;
    public _annotationManager: AnnotationManager;

    // A reference to the button that reveals/hides it in the toolbar
    private _button: GameButton;
    private _isVisible: boolean = false;
    private _upperToolbar: HLayoutContainer;
    private _newLayerButton: GameButton;
    private _deleteButton: GameButton;
    private _editButton: GameButton;
    private _selectedPath: number[] | null;
    private _selectedItem: AnnotationPanelItem | null;
    private _selectedDisplay: Container | null;
    private _updateLayerTimeout: ReturnType<typeof setTimeout> | null;
    private _structureCategory: AnnotationPanelItem;
    private _puzzleCategory: AnnotationPanelItem;
    private _solutionCategory: AnnotationPanelItem;

    private static readonly PANEL_WIDTH = 240;
    private static readonly PANEL_HEIGHT = 250;
    private static readonly UPPER_TOOLBAR_HEIGHT = 30;
    private static readonly DIVIDER_THICKNESS = 2;
    private static readonly BORDER_RADIUS = 7.5;
    private static readonly DROP_SHADOW_X_OFFSET = -0.25;
    private static readonly DROP_SHADOW_Y_OFFSET = 2;
    private static readonly LAYER_UPDATE_DELAY = 100;
}
