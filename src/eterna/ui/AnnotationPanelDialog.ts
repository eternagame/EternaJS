import {Graphics, Container} from 'pixi.js';
import {
    VLayoutContainer,
    DisplayUtil,
    VAlign,
    HAlign,
    HLayoutContainer,
    Assert
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
import FileInputObject, {HTMLInputEvent} from './FileInputObject';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import VScrollBox from './VScrollBox';
import {Item} from './DragDropper';
import FloatDialog from './FloatDialog';

export default class AnnotationPanelDialog extends FloatDialog<void> {
    constructor(manager: AnnotationManager) {
        super('Annotaions');

        this._annotationManager = manager;
    }

    protected added(): void {
        super.added();

        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1.0,
            color: AnnotationPanelDialog.PANEL_COLOR,
            dropShadow: true,
            borderRadius: AnnotationPanelDialog.BORDER_RADIUS
        });

        this.addObject(this._panel, this.contentVLay);

        // Generate panel upper toolbar
        this._upperToolbar = new HLayoutContainer(0, VAlign.CENTER);
        this._panel.container.addChild(this._upperToolbar);

        const withEdit = false;
        const withDelete = false;
        this.updateUpperToolbar(withDelete, withEdit, true);

        // Upper Toolbar Divider
        const upperToolbarBottomDivider = new Graphics()
            .beginFill(AnnotationPanelDialog.UPPER_TOOLBAR_DIVIDER_COLOR)
            .drawRect(
                0,
                0,
                AnnotationPanelDialog.PANEL_WIDTH,
                AnnotationPanelDialog.DIVIDER_THICKNESS
            )
            .endFill();
        upperToolbarBottomDivider.x = AnnotationPanelDialog.DROP_SHADOW_X_OFFSET;
        upperToolbarBottomDivider.y = AnnotationPanelDialog.UPPER_TOOLBAR_HEIGHT;
        this._panel.container.addChild(upperToolbarBottomDivider);

        this._scrollView = new VScrollBox(AnnotationPanelDialog.PANEL_WIDTH, AnnotationPanelDialog.PANEL_HEIGHT);
        this.addObject(this._scrollView, this._panel.container);

        this._contentLayout = new VLayoutContainer(0, HAlign.CENTER);
        this._scrollView.content.addChild(this._contentLayout);
        this._scrollView.doLayout();
        DisplayUtil.positionRelative(
            this._scrollView.container, HAlign.LEFT, VAlign.TOP,
            this._panel.container, HAlign.LEFT, VAlign.TOP,
            AnnotationPanelDialog.DROP_SHADOW_X_OFFSET,
            this._upperToolbar.height + AnnotationPanelDialog.DIVIDER_THICKNESS
        );

        this.doLayout();
        this._scrollView.doLayout();
        this._scrollView.updateScrollThumb();

        this.updatePanel();
    }

    public updateFinalFloatLocation() {
        super.updateFloatLocation();

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        this.Container.position.x = 0;
    } /**
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
        //     width: AnnotationPanelDialog.PANEL_WIDTH,
        //     dividerThickness: AnnotationPanelDialog.DIVIDER_THICKNESS,
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
        this._puzzleCategory = new AnnotationPanelItem({
            data: {
                id: uuidv4(),
                type: AnnotationHierarchyType.CATEGORY,
                category: AnnotationCategory.PUZZLE,
                playerID: Eterna.playerID,
                title: 'Puzzle',
                children: puzzleAnnotations,
                visible: this._annotationManager.puzzleAnnotationsVisible,
                expanded: this._puzzleCategoryExpanded
            },
            indexPath: [1],
            width: AnnotationPanelDialog.PANEL_WIDTH,
            dividerThickness: AnnotationPanelDialog.DIVIDER_THICKNESS,
            titleEditable: true,
            updateTitle: (itemPath: number[], text: string) => {
                this.updateTitle(itemPath, text);
            },
            updateAnnotationLayer: (annotation: Item, layerPath: number[]) => {
                this.updateAnnotationLayer(annotation, layerPath);
            },
            updateAnnotationPosition: (firstAnnotation: Item, secondAnnotationPath: number[]) => {
                this.updateAnnotationPosition(firstAnnotation, secondAnnotationPath);
            },
            createNewLayer: (category: AnnotationCategory) => {
                this._annotationManager.createNewLayer(category);
                this.updatePanel();
            }
        });
        this.addCategory(this._puzzleCategory);

        this._solutionCategory = new AnnotationPanelItem({
            data: {
                id: uuidv4(),
                type: AnnotationHierarchyType.CATEGORY,
                category: AnnotationCategory.SOLUTION,
                playerID: Eterna.playerID,
                title: 'Solution',
                children: this._annotationManager.getSolutionAnnotations(),
                visible: this._annotationManager.solutionAnnotationsVisible,
                expanded: this._solutionCategoryExpanded
            },
            indexPath: [2],
            width: AnnotationPanelDialog.PANEL_WIDTH,
            dividerThickness: AnnotationPanelDialog.DIVIDER_THICKNESS,
            titleEditable: true,
            updateTitle: (itemPath: number[], text: string) => {
                this.updateTitle(itemPath, text);
            },
            updateAnnotationLayer: (annotation: Item, layerPath: number[]) => {
                this.updateAnnotationLayer(annotation, layerPath);
            },
            updateAnnotationPosition: (firstAnnotation: Item, secondAnnotationPath: number[]) => {
                this.updateAnnotationPosition(firstAnnotation, secondAnnotationPath);
            },
            createNewLayer: (category: AnnotationCategory) => {
                this._annotationManager.createNewLayer(category);
                this.updatePanel();
            }
        });
        this.addCategory(this._solutionCategory);

        // Get 1D array of annotations in annotation tree
        const annotationModels: AnnotationPanelItem[] = [];
        AnnotationPanelDialog.collectAnnotationPanelItems(this._items, annotationModels);
        // Register annotation models to observe drag events
        this.registerDragObservers(annotationModels);
        // Register panel to respond to annotation selection events
        this.registerAnnotationObservers(annotationModels);

        this.doLayout();
        this._scrollView.doLayout();
        this._scrollView.updateScrollThumb();

        const withEdit = this._editButton && this._editButton.isLiveObject;
        const withDelete = this._deleteButton && this._deleteButton.isLiveObject;
        this.updateUpperToolbar(withDelete, withEdit);

        this.updateFinalFloatLocation();
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
                AnnotationPanelDialog.PANEL_WIDTH,
                AnnotationPanelDialog.UPPER_TOOLBAR_HEIGHT
                + this._scrollView.height
                + AnnotationPanelDialog.DROP_SHADOW_Y_OFFSET
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
    private static collectAnnotationPanelItems(items: AnnotationPanelItem[], arr: AnnotationPanelItem[]): void {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.modelChildren) {
                arr.push(item);
                AnnotationPanelDialog.collectAnnotationPanelItems(item.modelChildren, arr);
            } else {
                arr.push(item);
            }
        }
    }

    /**
     * Rerenders the upper toolbar of the panel. The 'new layer' button
     * is always accessible
     *
     * @param withDelete whether to include the delete button
     * @param withEdit whether to include the edit button
     */
    private updateUpperToolbar(withDelete: boolean, withEdit: boolean, initial: boolean = false) {
        if (this._deleteButton) {
            this._deleteButton.destroySelf();
        }
        if (this._editButton) {
            this._editButton.destroySelf();
        }
        if (this._uploadButton) {
            this._uploadButton.destroySelf();
        }
        if (this._downloadButton) {
            this._downloadButton.destroySelf();
        }

        // Needs to be the negative of a single button's width
        // Otherwise buttons toolbar buttons will be offset by a single button's width
        let offset = -31;
        if (
            this._annotationManager.getPuzzleAnnotations().length > 0
            || this._annotationManager.getSolutionAnnotations().length > 0
            || this._annotationManager.getStructureAnnotations().length > 0
        ) {
            this._downloadButton = new GameButton()
                .allStates(Bitmaps.ImgDownload)
                .tooltip('Download Annotations');
            this._downloadButton.pointerDown.connect(() => {
                this._annotationManager.downloadAnnotations();
                // There is an odd bug where pointerUp does not trigger
                // on Button sometimes.
                // As a result, pointerTap is not always called, resulting
                // in inconsistent clicked.connect() emissions.
                //
                // We fix this by connecting to pointerDown and playing button
                // sound here.
                Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
            });
            this._panel.addObject(this._downloadButton, this._upperToolbar);
            if (!initial) {
                offset += this._downloadButton.display.width;
            }
        }

        this._uploadButton = new FileInputObject({
            id: 'annotation-upload-file-input',
            width: 30,
            height: 30,
            acceptedFiletypes: '.json',
            labelIcon: Bitmaps.ImgUpload
        }).tooltip('Upload Annotations');
        this._uploadButton.fileSelected.connect((e: HTMLInputEvent) => {
            this._annotationManager.uploadAnnotations(e);
            // There is an odd bug where pointerUp does not trigger
            // on Button sometimes.
            // As a result, pointerTap is not always called, resulting
            // in inconsistent clicked.connect() emissions.
            //
            // We fix this by connecting to pointerDown and playing button
            // sound here.
            Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
        });
        this._panel.addObject(this._uploadButton, this._upperToolbar);
        if (!initial) {
            offset += this._uploadButton.display.width;
        }

        if (withEdit) {
            this._editButton = new GameButton()
                .allStates(Bitmaps.ImgPencil)
                .tooltip('Edit');
            this._editButton.pointerDown.connect(() => {
                this.editSelectedAnnotation();
                // There is an odd bug where pointerUp does not trigger
                // on Button sometimes.
                // As a result, pointerTap is not always called, resulting
                // in inconsistent clicked.connect() emissions.
                //
                // We fix this by connecting to pointerDown and playing button
                // sound here.
                Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
            });
            this._panel.addObject(this._editButton, this._upperToolbar);
            if (!initial) {
                offset += this._editButton.display.width;
            }
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
                // in inconsistent clicked.connect() emissions.
                //
                // We fix this by connecting to pointerDown and playing button
                // sound here.
                Flashbang.sound.playSound(GameButton.DEFAULT_DOWN_SOUND);
            });
            this._panel.addObject(this._deleteButton, this._upperToolbar);
            if (!initial) {
                offset += this._deleteButton.display.width;
            }
        }

        DisplayUtil.positionRelative(
            this._upperToolbar, HAlign.RIGHT, VAlign.TOP,
            this._panel.container, HAlign.RIGHT, VAlign.TOP,
            -offset, 0
        );

        this._upperToolbar.layout();
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
                    this._annotationManager.annotationEditRequested.emit(annotation);
                } else if (this._selectedPath.length === 3) {
                    // Annotation in layer
                    const layerChildren = categoryData[this._selectedPath[1]].children;
                    if (layerChildren) {
                        const annotation = layerChildren[this._selectedPath[2]];
                        this._annotationManager.annotationEditRequested.emit(annotation);
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

            this.updatePanel();
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
            const panelItem = items[i];
            panelItem.isSelected.connect((isSelected) => {
                if (isSelected && panelItem.type !== AnnotationHierarchyType.CATEGORY) {
                    this._selectedPath = panelItem.indexPath;
                    this._selectedItem = panelItem;
                    this._selectedDisplay = panelItem.display;

                    // Show delete + edit button
                    const withEdit = panelItem.category !== AnnotationCategory.STRUCTURE
                        && panelItem.type === AnnotationHierarchyType.ANNOTATION;
                    const withDelete = panelItem.category !== AnnotationCategory.STRUCTURE;
                    this.updateUpperToolbar(withDelete, withEdit);
                } else if (
                    this._selectedPath
                    && panelItem.indexPath.toString() === this._selectedPath.toString()
                ) {
                    this._selectedPath = null;
                    this._selectedItem = null;
                    this._selectedDisplay = null;

                    // Hide delete + edit button
                    const withEdit = false;
                    const withDelete = false;
                    this.updateUpperToolbar(withDelete, withEdit);
                }

                this._annotationManager.setAnnotationSelection(panelItem, isSelected);
            });
            panelItem.isVisible.connect((isVisible: boolean) => {
                // Inform layer panel observers of update
                this._annotationManager.setAnnotationVisibility(panelItem, isVisible);
            });
            panelItem.isExpanded.connect((isExpanded: boolean) => {
                if (panelItem.type === AnnotationHierarchyType.CATEGORY) {
                    switch (panelItem.category) {
                        case AnnotationCategory.PUZZLE:
                            this._puzzleCategoryExpanded = !this._puzzleCategoryExpanded;
                            break;
                        case AnnotationCategory.SOLUTION:
                            this._solutionCategoryExpanded = !this._solutionCategoryExpanded;
                            break;
                        case AnnotationCategory.STRUCTURE:
                            this._structureCategoryExpanded = !this._structureCategoryExpanded;
                            break;
                        default:
                            Assert.unreachable(panelItem.category);
                    }
                    this.updatePanel();
                } else {
                    this._annotationManager.setAnnotationExpansion(panelItem, isExpanded);
                }
            });
        }
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
            }, AnnotationPanelDialog.LAYER_UPDATE_DELAY);
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
                annotationData.layerId = undefined;
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
                firstAnnotationData.layerId = undefined;
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

    private _panel: GamePanel;
    private _scrollView: VScrollBox;
    private _items: AnnotationPanelItem[] = [];
    private _contentLayout: VLayoutContainer;
    private _annotationManager: AnnotationManager;

    // A reference to the button that reveals/hides it in the toolbar
    private _upperToolbar: HLayoutContainer;
    private _uploadButton: FileInputObject;
    private _downloadButton: GameButton;
    private _deleteButton: GameButton;
    private _editButton: GameButton;
    private _selectedPath: number[] | null;
    private _selectedItem: AnnotationPanelItem | null;
    private _selectedDisplay: Container | null;
    private _updateLayerTimeout: ReturnType<typeof setTimeout> | null;
    private _structureCategory: AnnotationPanelItem;
    private _puzzleCategory: AnnotationPanelItem;
    private _solutionCategory: AnnotationPanelItem;

    private _puzzleCategoryExpanded: boolean = true;
    private _solutionCategoryExpanded: boolean = true;
    private _structureCategoryExpanded: boolean = true;

    private static readonly PANEL_WIDTH = 240;
    private static readonly PANEL_HEIGHT = 250;
    private static readonly UPPER_TOOLBAR_HEIGHT = 30;
    private static readonly DIVIDER_THICKNESS = 2;
    private static readonly BORDER_RADIUS = 7.5;
    private static readonly DROP_SHADOW_X_OFFSET = -0.25;
    private static readonly DROP_SHADOW_Y_OFFSET = 2;
    private static readonly LAYER_UPDATE_DELAY = 100;
    private static readonly PANEL_COLOR = 0x152843;
    private static readonly UPPER_TOOLBAR_DIVIDER_COLOR = 0x112238;
}
