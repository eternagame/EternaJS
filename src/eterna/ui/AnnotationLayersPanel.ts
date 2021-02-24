import {Graphics, Container} from 'pixi.js';
import {
    ContainerObject,
    VLayoutContainer,
    DisplayUtil,
    VAlign,
    HAlign,
    HLayoutContainer
} from 'flashbang';
import {Value} from 'signals';
import Bitmaps from 'eterna/resources/Bitmaps';
import {ToolbarType} from 'eterna/ui/Toolbar';
import {v4 as uuidv4} from 'uuid';
import AnnotationItem, {
    AnnotationData,
    AnnotationItemType,
    AnnotationCategory,
    AnnotationGraphNode,
    AnnotationDataCollection
} from 'eterna/ui/AnnotationItem';
import Eterna from 'eterna/Eterna';
import Flashbang from 'flashbang/core/Flashbang';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import VScrollBox from './VScrollBox';
import {Item} from './DragDropper';

export default class AnnotationLayersPanel extends ContainerObject {
    public readonly onUpdateLayers: Value<AnnotationData[]> = new Value<AnnotationData[]>([]);
    public readonly onUpdateAnnotations: Value<AnnotationData[]> = new Value<AnnotationData[]>([]);
    public readonly onUpdateGraph: Value<AnnotationDataCollection> = new Value<AnnotationDataCollection>({
        puzzle: [],
        solution: []
    });

    public readonly onEditAnnotation: Value<AnnotationData | null> = new Value<AnnotationData | null>(null);

    constructor(toolbarType: ToolbarType, button: GameButton) {
        super();
        this._toolbarType = toolbarType;
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

        // Upper Toolbar Divider
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

        const withEdit = false;
        const withDelete = false;
        this.updateUpperToolbar(withDelete, withEdit);

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

        this.updateLayers();
    }

    private updateLayers() {
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

        // this._structureCategory = new AnnotationItem({
        //     id: uuidv4(),
        //     playerID: Eterna.playerID,
        //     indexPath: [0],
        //     width: AnnotationLayersPanel.PANEL_WIDTH,
        //     dividerThickness: AnnotationLayersPanel.DIVIDER_THICKNESS,
        //     type: AnnotationItemType.CATEGORY,
        //     title: 'Structure Annotations',
        //     category: AnnotationCategory.STRUCTURE,
        //     titleEditable: false,
        //     children: this._structureChildren,
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
        this._puzzleCategory = new AnnotationItem({
            id: uuidv4(),
            playerID: Eterna.playerID,
            indexPath: [1],
            width: AnnotationLayersPanel.PANEL_WIDTH,
            dividerThickness: AnnotationLayersPanel.DIVIDER_THICKNESS,
            type: AnnotationItemType.CATEGORY,
            title: 'Puzzle Annotations',
            category: AnnotationCategory.PUZZLE,
            titleEditable: this.activeCategory === AnnotationCategory.PUZZLE,
            children: this._puzzleChildren,
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
        this._solutionCategory = new AnnotationItem({
            id: uuidv4(),
            playerID: Eterna.playerID,
            indexPath: [2],
            width: AnnotationLayersPanel.PANEL_WIDTH,
            dividerThickness: AnnotationLayersPanel.DIVIDER_THICKNESS,
            type: AnnotationItemType.CATEGORY,
            title: 'Solution Annotations',
            category: AnnotationCategory.SOLUTION,
            titleEditable: this.activeCategory === AnnotationCategory.SOLUTION,
            children: this._solutionChildren,
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

        this.doLayout();
        this._scrollView.doLayout();
        this._scrollView.updateScrollThumb();
    }

    private addCategory(item: AnnotationItem) {
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
        const annotationItems: AnnotationItem[] = [];
        AnnotationLayersPanel.collectAnnotationItems(this._items, annotationItems);
        // Register annotation items to observe drag events
        this.registerDragObservers(annotationItems);
        // Register panel to respond to annotation selection events
        this.registerAnnotationObservers(annotationItems);

        this.needsLayout();
    }

    public addAnnotation(annotation: AnnotationData, type: AnnotationCategory) {
        if (annotation.type !== AnnotationItemType.ANNOTATION) {
            return;
        }

        if (type === AnnotationCategory.PUZZLE) {
            if (annotation.layer) {
                for (const child of this._puzzleChildren) {
                    if (child.id === annotation.layer.id && !child.children) {
                        child['children'] = [
                            {
                                id: annotation.id,
                                type: AnnotationItemType.ANNOTATION,
                                timestamp: annotation.timestamp,
                                playerID: annotation.playerID,
                                title: annotation.title,
                                ranges: annotation.ranges
                            }
                        ];
                    } else if (child.id === annotation.layer.id && child.children) {
                        child.children.push({
                            id: annotation.id,
                            type: AnnotationItemType.ANNOTATION,
                            timestamp: annotation.timestamp,
                            playerID: annotation.playerID,
                            title: annotation.title,
                            ranges: annotation.ranges
                        });
                    }
                }
            } else {
                this._puzzleChildren.push({
                    id: annotation.id,
                    type: AnnotationItemType.ANNOTATION,
                    timestamp: annotation.timestamp,
                    playerID: annotation.playerID,
                    title: annotation.title,
                    ranges: annotation.ranges
                });
            }
        } else if (type === AnnotationCategory.SOLUTION) {
            if (annotation.layer) {
                for (const child of this._solutionChildren) {
                    if (child.id === annotation.layer.id && !child.children) {
                        child['children'] = [
                            {
                                id: annotation.id,
                                type: AnnotationItemType.ANNOTATION,
                                timestamp: annotation.timestamp,
                                playerID: annotation.playerID,
                                title: annotation.title,
                                ranges: annotation.ranges
                            }
                        ];
                    } else if (child.id === annotation.layer.id && child.children) {
                        child.children.push({
                            id: annotation.id,
                            type: AnnotationItemType.ANNOTATION,
                            timestamp: annotation.timestamp,
                            playerID: annotation.playerID,
                            title: annotation.title,
                            ranges: annotation.ranges
                        });
                    }
                }
            } else {
                this._solutionChildren.push({
                    id: annotation.id,
                    type: AnnotationItemType.ANNOTATION,
                    timestamp: annotation.timestamp,
                    playerID: annotation.playerID,
                    title: annotation.title,
                    ranges: annotation.ranges
                });
            }
        }
        this.updateLayers();

        // Inform layer panel observers of update
        this.onUpdateLayers.value = this.layers;
        this.onUpdateAnnotations.value = this.annotations;
        this.onUpdateGraph.value = this.graph;
    }

    public editAnnotation(annotation: AnnotationData): void {
        if (annotation.type !== AnnotationItemType.ANNOTATION) {
            return;
        }

        const annotationItems: AnnotationItem[] = [];
        if (this.activeCategory === AnnotationCategory.PUZZLE) {
            // Puzzle Annotations
            AnnotationLayersPanel.collectAnnotationItems([this._puzzleCategory], annotationItems);
        } else {
            // Solution Annotations
            AnnotationLayersPanel.collectAnnotationItems([this._solutionCategory], annotationItems);
        }

        for (const item of annotationItems) {
            if (
                item.type === AnnotationItemType.ANNOTATION
                && item.id === annotation.id
                && annotation.ranges
            ) {
                item.setTitle(annotation.title);
                item.setRanges(annotation.ranges);
            }
        }

        // Inform layer panel observers of update
        this.onUpdateAnnotations.value = this.annotations;
    }

    public deleteAnnotation(annotation: AnnotationData): void {
        if (annotation.type !== AnnotationItemType.ANNOTATION) {
            return;
        }

        const annotationItems: AnnotationItem[] = [];
        if (this.activeCategory === AnnotationCategory.PUZZLE) {
            // Puzzle Annotations
            AnnotationLayersPanel.collectAnnotationItems([this._puzzleCategory], annotationItems);
        } else {
            // Solution Annotations
            AnnotationLayersPanel.collectAnnotationItems([this._solutionCategory], annotationItems);
        }

        for (const item of annotationItems) {
            if (
                item.type === AnnotationItemType.ANNOTATION
                && item.id === annotation.id
            ) {
                // Select item
                item.select();

                // Delete selected item
                this.deleteSelectedItem();
            }
        }
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

        if (this._panel && this._scrollView) {
            this._panel.setSize(
                AnnotationLayersPanel.PANEL_WIDTH,
                AnnotationLayersPanel.UPPER_TOOLBAR_HEIGHT
                + this._scrollView.height
                + AnnotationLayersPanel.DROP_SHADOW_Y_OFFSET
            );
        }
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
            this.createNewLayer();
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

        if (this.activeCategory === AnnotationCategory.PUZZLE) {
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

    private createNewLayer() {
        const newLayer: AnnotationData = {
            id: uuidv4(),
            type: AnnotationItemType.LAYER,
            title: 'Untitled Layer',
            timestamp: (new Date()).getTime(),
            children: [],
            playerID: Eterna.playerID
        };

        if (this.activeCategory === AnnotationCategory.PUZZLE) {
            // Place new layer in puzzle category
            let layerIndex = 0;
            for (let i = 0; i < this._puzzleChildren.length; i++) {
                // We want the index of first "layerless" annotation
                // Which will be where we insert new layer
                if (this._puzzleChildren[i].type === AnnotationItemType.ANNOTATION) {
                    layerIndex = i;
                    break;
                }

                // There are no "layerless" annotations
                // But we reached last layer
                // Grab last index
                if (i === this._puzzleChildren.length - 1) {
                    layerIndex = i;
                }
            }

            this._puzzleChildren.splice(layerIndex, 0, newLayer);
        } else if (
            this._toolbarType === ToolbarType.LAB
            || this._toolbarType === ToolbarType.PUZZLE
        ) {
            // Place new layer in solution category
            let layerIndex = 0;
            for (let i = 0; i < this._solutionChildren.length; i++) {
                // We want the index of first "layerless" annotation
                // Which will be where we insert new layer
                if (this._solutionChildren[i].type === AnnotationItemType.ANNOTATION) {
                    layerIndex = i;
                    break;
                }

                // There are no "layerless" annotations
                // But we reached last layer
                // Grab last index
                if (i === this._solutionChildren.length - 1) {
                    layerIndex = i;
                }
            }

            this._solutionChildren.splice(layerIndex, 0, newLayer);
        }

        // Repaint layers
        this.updateLayers();

        // Hide delete + edit button
        const withEdit = false;
        const withDelete = false;
        this.updateUpperToolbar(withDelete, withEdit);

        this.onUpdateLayers.value = this.layers;
        this.onUpdateGraph.value = this.graph;
    }

    private editSelectedAnnotation() {
        if (
            this._selectedPath
            && this._selectedDisplay
            && this._selectedItem
        ) {
            if (this._selectedItem.type === AnnotationItemType.ANNOTATION) {
                this.onEditAnnotation.value = this._selectedItem;
                this.onEditAnnotation.value = null;
            }
        }
    }

    // Delete layer or annotation
    private deleteSelectedItem() {
        if (
            this._selectedPath
            && this._selectedDisplay
            && this._selectedItem
        ) {
            // Find category
            let category: AnnotationData[];
            switch (this._selectedPath[0]) {
                case 0:
                    category = this._structureChildren;
                    break;
                case 1:
                    category = this._puzzleChildren;
                    break;
                default:
                    category = this._solutionChildren;
                    break;
            }

            // Remove from model
            if (this._selectedPath.length === 2) {
                // Annotation not in layer or is layer
                category.splice(this._selectedPath[1], 1);
            } else if (this._selectedPath.length === 3) {
                // Annotation in layer
                const layerChildren = category[this._selectedPath[1]].children;
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

            // Repaint layers
            this.updateLayers();

            // Inform layer panel observers of update
            this.onUpdateLayers.value = this.layers;
            this.onUpdateAnnotations.value = this.annotations;
            this.onUpdateGraph.value = this.graph;
        }
    }

    // In order for drag events to be observed, we need to register
    // observers on each drop target
    private registerDragObservers(items: AnnotationItem[]) {
        for (let i = 0; i < items.length; i++) {
            const connectedAnnotation = items[i];

            for (let j = 0; j < items.length; j++) {
                const connectorAnnotation = items[j];
                if (i !== j) {
                    connectedAnnotation.isSelected.disconnect(AnnotationLayersPanel.deselectItem(items, j));
                    connectedAnnotation.isSelected.connect(AnnotationLayersPanel.deselectItem(items, j));
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

    private registerAnnotationObservers(items: AnnotationItem[]) {
        for (let i = 0; i < items.length; i++) {
            const annotation = items[i];
            annotation.isSelected.connect((isSelected) => {
                if (isSelected && annotation.type !== AnnotationItemType.CATEGORY) {
                    this._selectedPath = annotation.indexPath;
                    this._selectedItem = annotation;
                    this._selectedDisplay = annotation.display;

                    // Show delete + edit button
                    const withEdit = Eterna.playerID === annotation.playerID
                        && (
                            annotation.category !== AnnotationCategory.PUZZLE
                            || this._puzzleAnnotationsEditable
                        )
                        && annotation.category !== AnnotationCategory.STRUCTURE
                        && annotation.type === AnnotationItemType.ANNOTATION;
                    const withDelete = Eterna.playerID === annotation.playerID
                    && (
                        annotation.category !== AnnotationCategory.PUZZLE
                        || this._puzzleAnnotationsEditable
                    )
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

                // Inform layer panel observers of update
                this.onUpdateLayers.value = this.layers;
                this.onUpdateAnnotations.value = this.annotations;
                this.onUpdateGraph.value = this.graph;
            });
            annotation.isVisible.connect(() => {
                // Inform layer panel observers of update
                this.onUpdateLayers.value = this.layers;
                this.onUpdateAnnotations.value = this.annotations;
                this.onUpdateGraph.value = this.graph;
            });
        }
    }

    public selectAnnotationItem(item: AnnotationData): void {
        const annotationItems: AnnotationItem[] = [];
        AnnotationLayersPanel.collectAnnotationItems(this._items, annotationItems);

        for (const val of annotationItems) {
            if (val.id === item.id) {
                val.select();
            }
        }
    }

    public static deselectItem(items: AnnotationItem[], index: number): (value: boolean, ovalue: boolean) => void {
        return (selected: boolean): void => {
            if (selected) {
                items[index].deselect();
            }
        };
    }

    private updateTitle(itemPath: number[], text: string) {
        let category: AnnotationData[];
        switch (itemPath[0]) {
            case 0:
                category = this._structureChildren;
                break;
            case 1:
                category = this._puzzleChildren;
                break;
            default:
                category = this._solutionChildren;
                break;
        }

        if (itemPath.length === 2) {
            // Annotation not in layer or is layer
            category[itemPath[1]].title = text;
        } else if (itemPath.length === 3) {
            // Annotation in layer
            const layerChildren = category[itemPath[1]].children;
            if (layerChildren) {
                layerChildren[itemPath[2]].title = text;
            }
        }

        // Inform layer panel observers of update
        this.onUpdateLayers.value = this.layers;
        this.onUpdateAnnotations.value = this.annotations;
        this.onUpdateGraph.value = this.graph;
    }

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
            }, AnnotationLayersPanel.LAYER_UPDATE_DELAY);
        }

        // Hide delete + edit button
        const withEdit = false;
        const withDelete = false;
        this.updateUpperToolbar(withDelete, withEdit);

        // Inform layer panel observers of update
        this.onUpdateLayers.value = this.layers;
        this.onUpdateAnnotations.value = this.annotations;
        this.onUpdateGraph.value = this.graph;
    }

    private executeLayerUpdate(annotation: Item, layerPath: number[]) {
        // locate annotation and remove from current layer
        let annotationData: AnnotationData | null = null;
        const path = annotation.index as number[];
        let category: AnnotationData[];
        switch (path[0]) {
            case 0:
                category = this._structureChildren;
                break;
            case 1:
                category = this._puzzleChildren;
                break;
            default:
                category = this._solutionChildren;
                break;
        }

        if (path.length === 2) {
            // Annotation not in layer
            annotationData = category[path[1]] as AnnotationData;
            category.splice(path[1], 1);
        } else if (path.length === 3) {
            // Annotation in layer
            const layerChildren = category[path[1]].children;
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
                category.push(annotationData);
            } else if (layerPath.length === 2) {
                // In layer
                const layerChildren = category[layerPath[1]].children;
                if (layerChildren) {
                    layerChildren.push(annotationData);
                }
            }

            // Repaint layers
            this.updateLayers();
        }
    }

    private updateAnnotationPosition(firstAnnotation: Item, secondAnnotationPath: number[]) {
        // remove from current layer
        let firstAnnotationData: AnnotationData | null = null;
        let category: AnnotationData[];
        switch (secondAnnotationPath[0]) {
            case 0:
                category = this._structureChildren;
                break;
            case 1:
                category = this._puzzleChildren;
                break;
            default:
                category = this._solutionChildren;
                break;
        }

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
            for (let i = 0; i < category.length; i++) {
                if (category[i].id === firstAnnotation.id) {
                    // Get data
                    firstAnnotationData = category[i] as AnnotationData;

                    // Remove annotation
                    category.splice(i, 1);
                }
            }
        } else if (secondAnnotationPath.length === 3) {
            // Annotation in layer
            const layerChildren = category[secondAnnotationPath[1]].children;

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
                category.splice(secondAnnotationPath[1], 0, firstAnnotationData);
            } else if (secondAnnotationPath.length === 3) {
                // Annotation in layer
                const layerChildren = category[secondAnnotationPath[1]].children;
                if (layerChildren) {
                    layerChildren.splice(secondAnnotationPath[2], 0, firstAnnotationData);
                }
            }

            // Repaint layers
            this.updateLayers();
        }

        // Hide delete + edit button
        const withEdit = false;
        const withDelete = false;
        this.updateUpperToolbar(withDelete, withEdit);

        // Inform layer panel observers of update
        this.onUpdateLayers.value = this.layers;
        this.onUpdateAnnotations.value = this.annotations;
        this.onUpdateGraph.value = this.graph;
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

    public get layers() {
        const annotationItems: AnnotationItem[] = [];
        if (this.activeCategory === AnnotationCategory.PUZZLE) {
            // Puzzle Annotations
            AnnotationLayersPanel.collectAnnotationItems(
                [this._puzzleCategory],
                annotationItems
            );
        } else {
            // Solution Annotations
            AnnotationLayersPanel.collectAnnotationItems(
                [
                    this._puzzleCategory,
                    this._solutionCategory
                ],
                annotationItems
            );
        }

        const layers: AnnotationData[] = annotationItems.reduce(
            (allLayers: AnnotationData[], item: AnnotationItem) => {
                if (item.type === AnnotationItemType.LAYER) {
                    allLayers.push({
                        id: item.id,
                        type: AnnotationItemType.LAYER,
                        category: item.category,
                        playerID: item.playerID,
                        title: item.title,
                        children: item.itemChildren,
                        visible: item.isVisible.value,
                        selected: item.isSelected.value
                    });
                }
                return allLayers;
            }, []
        );
        return layers;
    }

    public get annotations() {
        const annotationItems: AnnotationItem[] = [];
        if (this.activeCategory === AnnotationCategory.PUZZLE) {
            // Puzzle Annotations
            AnnotationLayersPanel.collectAnnotationItems(
                [this._puzzleCategory],
                annotationItems
            );
        } else {
            // Solution Annotations
            AnnotationLayersPanel.collectAnnotationItems(
                [
                    this._puzzleCategory,
                    this._solutionCategory
                ],
                annotationItems
            );
        }

        const annotations: AnnotationData[] = annotationItems.reduce(
            (allAnnotations: AnnotationData[], item: AnnotationItem) => {
                if (item.type === AnnotationItemType.ANNOTATION) {
                    allAnnotations.push({
                        id: item.id,
                        type: AnnotationItemType.ANNOTATION,
                        category: item.category,
                        timestamp: item.timestamp,
                        playerID: item.playerID,
                        title: item.title,
                        ranges: item.ranges,
                        layer: item.layer,
                        visible: item.isVisible.value,
                        selected: item.isSelected.value
                    });
                }
                return allAnnotations;
            }, []
        );

        return annotations;
    }

    public get graph() {
        return {
            puzzle: this._puzzleChildren,
            solution: this._solutionChildren
        };
    }

    public set puzzleAnnotations(annotations: AnnotationGraphNode[]) {
        const puzzleChildren: AnnotationData[] = [];
        for (const annotation of annotations) {
            const strippedAnnotation = this.stripGraphNode(annotation);
            puzzleChildren.push(strippedAnnotation);
        }

        this._puzzleChildren = puzzleChildren;

        this.updateLayers();

        // Inform layer panel observers of update
        this.onUpdateLayers.value = this.layers;
        this.onUpdateAnnotations.value = this.annotations;
        this.onUpdateGraph.value = this.graph;
    }

    public set solutionAnnotations(annotations: AnnotationGraphNode[]) {
        const solutionChildren: AnnotationData[] = [];
        for (const annotation of annotations) {
            const strippedAnnotation = this.stripGraphNode(annotation);
            solutionChildren.push(strippedAnnotation);
        }

        this._solutionChildren = solutionChildren;
        this.updateLayers();

        // Inform layer panel observers of update
        this.onUpdateLayers.value = this.layers;
        this.onUpdateAnnotations.value = this.annotations;
        this.onUpdateGraph.value = this.graph;
    }

    private stripGraphNode = (node: AnnotationGraphNode): AnnotationData => {
        const children: AnnotationData[] = [];
        if (node.children) {
            for (const child of node.children) {
                children.push(this.stripGraphNode(child));
            }
        }

        const strippedNode: AnnotationData = {...node.data};
        if (children.length > 0) {
            strippedNode.children = children;
        }

        return strippedNode;
    };

    public set puzzleAnnotationsEditable(editable: boolean) {
        this._puzzleAnnotationsEditable = editable;
    }

    public get puzzleAnnotationsEditable(): boolean {
        return this._puzzleAnnotationsEditable;
    }

    public get activeCategory(): AnnotationCategory {
        if (
            this._toolbarType === ToolbarType.PUZZLEMAKER_EMBEDDED
            || this._toolbarType === ToolbarType.PUZZLEMAKER
        ) {
            return AnnotationCategory.PUZZLE;
        } else {
            return AnnotationCategory.SOLUTION;
        }
    }

    private _panel: GamePanel;
    private _scrollView: VScrollBox;
    private _items: AnnotationItem[] = [];
    private _contentLayout: VLayoutContainer;

    private _toolbarType: ToolbarType;
    private _button: GameButton;
    private _isVisible: boolean = false;
    private _upperToolbar: HLayoutContainer;
    private _newLayerButton: GameButton;
    private _deleteButton: GameButton;
    private _editButton: GameButton;
    private _selectedPath: number[] | null;
    private _selectedItem: AnnotationItem | null;
    private _selectedDisplay: Container | null;
    private _updateLayerTimeout: ReturnType<typeof setTimeout> | null;
    private _puzzleAnnotationsEditable: boolean = false;

    private _structureCategory: AnnotationItem;
    private _puzzleCategory: AnnotationItem;
    private _solutionCategory: AnnotationItem;
    private _structureChildren: AnnotationData[] = [];
    private _puzzleChildren: AnnotationData[] = [];
    private _solutionChildren: AnnotationData[] = [];

    private static readonly PANEL_WIDTH = 240;
    private static readonly PANEL_HEIGHT = 250;
    private static readonly UPPER_TOOLBAR_HEIGHT = 30;
    private static readonly DIVIDER_THICKNESS = 2;
    private static readonly BORDER_RADIUS = 7.5;
    private static readonly DROP_SHADOW_X_OFFSET = -0.25;
    private static readonly DROP_SHADOW_Y_OFFSET = 2;
    private static readonly LAYER_UPDATE_DELAY = 100;
}
