import Eterna from 'eterna/Eterna';
import {Signal, UnitSignal, Value} from 'signals';
import {
    Point, Container, Rectangle, Graphics
} from 'pixi.js';
import {ToolbarType} from 'eterna/ui/Toolbar';
import {DisplayUtil, Assert} from 'flashbang';
import {v4 as uuidv4} from 'uuid';
import AnnotationPanelItem from 'eterna/ui/AnnotationPanelItem';
import AnnotationView from 'eterna/ui/AnnotationView';
import {HTMLInputEvent} from 'eterna/ui/FileInputObject';
import Pose2D from 'eterna/pose2D/Pose2D';
import GameMode from 'eterna/mode/GameMode';

// DEBUG SETTINGS FOR ANNOTATION PLACEMENT:
// In order to visualize placement conflicts, you can toggle these variables
// RED RECTANGLES = Placement conflicts with bases
// ORANGE RECTANGLES = Placement conflicts with existing annotations
// GREEN RECTANGLES = Placement availability
const DEBUG_ANNOTATION_PLACEMENT = false;
const DEBUG_FROM_SEARCH_ATTEMPT = 0;
const BASE_CONFLICT_COLOR = 0xFF0000;
const ANNOTATION_CONFLICT_COLOR = 0xFF6500;
const POSSIBLE_PLACEMENT_AVAILABILITY_COLOR = 0x00FF00;

/**
 * The types of root level categories for annotations
 *
 * The UNDEFINED category is used as a placeholder during
 * the annotation creation process before completion
 */
export enum AnnotationCategory {
    STRUCTURE = 'Structure',
    PUZZLE = 'Puzzle',
    SOLUTION = 'Solution'
}

/**
 * Represents the various hierarchical levels in the annotation
 * infrastructure
 */
export enum AnnotationHierarchyType {
    CATEGORY = 'category',
    LAYER = 'layer',
    ANNOTATION = 'annotation'
}

/**
 * Represents the exhaustive broad places about a base that
 * annotations are placed.
 *
 *                   top center
 *     top-left   --------------- top-right
 *               |       |       |
 *               |       |       |
 *               |       |       |
 *   left-center  ---- Anchor ---  right-center
 *               |       |       |
 *               |       |       |
 *               |       |       |
 *   bottom-left  ---------------  bottom-right
 *                 bottom center
 */
export enum AnnotationPlacement {
    TOP_LEFT = 'top-left',
    TOP_CENTER = 'top-center',
    TOP_RIGHT = 'top-right',
    LEFT_CENTER = 'left-center',
    RIGHT_CENTER = 'right-center',
    BOTTOM_LEFT = 'bottom-left',
    BOTTOM_CENTER = 'bottom-center',
    BOTTOM_RIGHT = 'bottom-right',
}

/**
 * A data structure to represent a single base range of an annotation
 */
export interface AnnotationRange {
    start: number;
    end: number;
}

/**
 * A data structure to represent the arguments required to initiate
 * the process of creating an annotation
 */
export interface AnnotationArguments {
    ranges: AnnotationRange[];
    panelPos: Point;
}

/**
 * The model for a single annotation and layer
 */
export interface AnnotationData {
    id: string | number;
    type: AnnotationHierarchyType;
    category: AnnotationCategory;
    timestamp?: number;
    playerID: number;
    title: string;
    ranges?: AnnotationRange[];
    layerId?: string | number;
    children: AnnotationData[];
    visible?: boolean;
    selected?: boolean;
    expanded?: boolean;
    positions: AnnotationPosition[];
}

/**
 * Represents the location of an annotation
 * relative to a base in the viewport
 *
 * We save the zoom level at time of creation
 * so that custom positions (those that are specified by the player)
 * can be scaled accordingly when the zoom level is adjusted
 */
export interface AnnotationPosition {
    anchorIndex: number;
    zoomLevel: number;
    relPosition: Point;
    placement?: AnnotationPlacement;
    custom: boolean;
}

/**
 * Transports all annotation categories in a single object
 */
export interface AnnotationDataBundle {
    puzzle: AnnotationData[];
    solution: AnnotationData[];
}

/**
 * Represents a position conflict between a base and
 * an annotation and whether it can be resolved
 * (with the appropriate correction)
 */
export interface AnnotationBaseConflict {
    bounds: Rectangle;
    resolvable: boolean;
    correction?: Point;
}

/**
 * Transports all base conflicts in a single object
 */
export interface AnnotationBaseConflicts {
    [AnnotationPlacement.TOP_LEFT]: AnnotationBaseConflict | null;
    [AnnotationPlacement.TOP_CENTER]: AnnotationBaseConflict | null;
    [AnnotationPlacement.TOP_RIGHT]: AnnotationBaseConflict | null;
    [AnnotationPlacement.LEFT_CENTER]: AnnotationBaseConflict | null;
    [AnnotationPlacement.RIGHT_CENTER]: AnnotationBaseConflict | null;
    [AnnotationPlacement.BOTTOM_LEFT]: AnnotationBaseConflict | null;
    [AnnotationPlacement.BOTTOM_CENTER]: AnnotationBaseConflict | null;
    [AnnotationPlacement.BOTTOM_RIGHT]: AnnotationBaseConflict | null;
}

/**
 * Represents a position conflict between two annotations
 */
export interface AnnotationPositionConflict {
    bounds: Rectangle;
    placement: AnnotationPlacement;
}

/**
 * A data structure to represent the arguments required to
 * invoke an annotation dialog
 */
export interface AnnotationDialogArguments {
    edit: boolean;
    ranges: AnnotationRange[];
    modal: boolean;
    gameMode: GameMode;
    pose: Pose2D;
    gameLayer: Container;
    panelPos?: Point;
    annotation?: AnnotationData;
}

export default class AnnotationManager {
    // Signals annotation mode active state
    public readonly annotationModeActive: Value<boolean> = new Value<boolean>(false);
    // Signals that an annotation should be edited (reveal AnnotationDialog)
    public readonly annotationEditRequested = new Signal<AnnotationData>();
    // Currently highlighted bases from annotation selection or hover
    public readonly highlights = new Value<AnnotationRange[]>([]);
    // Signals to redraw annotation visualizations
    public readonly viewAnnotationDataUpdated = new UnitSignal();
    // Signals to save annotations
    public readonly persistentAnnotationDataUpdated = new UnitSignal();

    constructor(toolbarType: ToolbarType) {
        this._toolbarType = toolbarType;
    }

    /**
     * Completes the annotation creation process
     *
     * @param annotation the total annotation data
     * @param type the category of annotation being created
     */
    public addAnnotation(annotation: AnnotationData) {
        if (annotation.type !== AnnotationHierarchyType.ANNOTATION) {
            return;
        }

        // Replace undefined category with active one
        if (!annotation.category) {
            annotation.category = this.activeCategory;
        }

        if (annotation.category === AnnotationCategory.PUZZLE) {
            this.insertNewAnnotation(annotation, this._puzzleAnnotations);
        } else if (annotation.category === AnnotationCategory.SOLUTION) {
            this.insertNewAnnotation(annotation, this._solutionAnnotations);
        }

        this.propagateDataUpdates();
    }

    /**
     * Inserts a new empty layer into the active category
     */
    public createNewLayer(category: AnnotationCategory) {
        const newLayer: AnnotationData = {
            id: uuidv4(),
            type: AnnotationHierarchyType.LAYER,
            category,
            title: 'Untitled Layer',
            timestamp: (new Date()).getTime(),
            children: [],
            playerID: Eterna.playerID,
            visible: true,
            selected: false,
            positions: []
        };

        if (category === AnnotationCategory.PUZZLE) {
            // Place new layer in puzzle category
            const layerIndex = this.getLowestLayerIndex(this._puzzleAnnotations);
            this._puzzleAnnotations.splice(layerIndex, 0, newLayer);
        } else if (
            this._toolbarType === ToolbarType.LAB
            || this._toolbarType === ToolbarType.PUZZLE
        ) {
            // Place new layer in solution category
            const layerIndex = this.getLowestLayerIndex(this._solutionAnnotations);
            this._solutionAnnotations.splice(layerIndex, 0, newLayer);
        }

        this.propagateDataUpdates();
    }

    /**
     * Edits an annotation through replacement
     *
     * @param annotation edited annotation
     */
    public editAnnotation(annotation: AnnotationData): void {
        const [parentNode, index] = this.getRelevantParentNode(annotation);

        if (annotation.layerId && !parentNode && !index) {
            // We moved annotation into a new layer when making edits

            let categoryData: AnnotationData[];
            if (annotation.category === AnnotationCategory.PUZZLE) {
                // Puzzle Annotations
                categoryData = this._puzzleAnnotations;
            } else {
                // Solution Annotations
                categoryData = this._solutionAnnotations;
            }

            // Remove from original location
            let currentIndex = -1;
            for (let i = 0; i < categoryData.length; i++) {
                if (categoryData[i].id === annotation.id) {
                    currentIndex = i;
                }
            }
            categoryData.splice(currentIndex, 1);

            // Add to layer children
            const layerIndex = categoryData.findIndex((layer: AnnotationData) => layer.id === annotation.layerId);
            const layerData = categoryData[layerIndex];
            if (layerData.children) {
                const layerChildren = layerData.children;
                layerChildren.push({
                    ...annotation
                });
            } else {
                layerData['children'] = [{
                    ...annotation
                }];
            }

            this.propagateDataUpdates();
        } else if (parentNode && index != null) {
            parentNode[index] = {
                ...annotation
            };

            this.propagateDataUpdates();
        }
    }

    /**
     * Deletes an annotation
     *
     * @param annotation annotation to delete
     */
    public deleteAnnotation(annotation: AnnotationData): void {
        const [parentNode, index] = this.getRelevantParentNode(annotation);
        if (parentNode && index != null) {
            parentNode.splice(index, 1);

            this.deselectSelected();
            this.propagateDataUpdates();
        }
    }

    /**
     * Downloads the annotation bundle to the player's disk
     */
    public downloadAnnotations() {
        const currentDate = new Date();
        const exportName = `eterna-puzzle-annotation-graph-${
            currentDate.getUTCFullYear()
        }-${
            currentDate.getMonth()
        }-${
            currentDate.getDay()
        }-${
            currentDate.getUTCHours()
        }${
            currentDate.getUTCMinutes()
        }${
            currentDate.getUTCSeconds()
        }`;

        const bundleJSON = JSON.stringify(this.createAnnotationBundle(), undefined, 2);
        const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(bundleJSON)}`;
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', `${exportName}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    /**
     * Uploads a valid annotation bundle JSON from a player's disk into the current puzzle
     */
    public uploadAnnotations(e: HTMLInputEvent) {
        if (e.target.files && e.target.files.length > 0) {
            const receivedText = (progE: ProgressEvent<FileReader>) => {
                const lines = progE.target?.result as string;
                const annotationDataBundle = JSON.parse(lines) as AnnotationDataBundle;
                if (annotationDataBundle) {
                    this.setPuzzleAnnotations(annotationDataBundle.puzzle);
                    this.setSolutionAnnotations(annotationDataBundle.solution);
                }
            };
            const json = e.target.files[0];
            const fileReader = new FileReader();
            fileReader.onload = receivedText;
            fileReader.readAsText(json);
        }
    }

    public deselectSelected(): void {
        if (this._selectedItem) {
            const [parentNode, index] = this.getRelevantParentNode(this._selectedItem);
            if (parentNode && index != null) {
                parentNode[index].selected = false;
                this.updateAnnotationViews();
            }
            this._selectedItem = null;
            this.highlights.value = [];
        }
    }

    /**
     * Modifies the selection state of an annotation
     *
     * @param annotation total data of annotation of interest
     * @param isSelected desired selection value
     */
    public setAnnotationSelection(annotation: AnnotationPanelItem | AnnotationData, isSelected: boolean): void {
        const [parentNode, index] = this.getRelevantParentNode(annotation);
        if (parentNode && index != null) {
            if (isSelected) {
                this.deselectSelected();
                this._selectedItem = parentNode[index];

                // Set Highlights
                if (this._selectedItem.ranges) {
                    // Single Annotation
                    this.highlights.value = this._selectedItem.ranges;
                } else if (this._selectedItem.children.length > 0) {
                    // Layer (multiple annotations)
                    const ranges: AnnotationRange[] = [];
                    this._selectedItem.children.forEach((child: AnnotationData) => {
                        if (child.ranges) {
                            ranges.push(...child.ranges);
                        }
                    });
                    if (ranges.length > 0) {
                        this.highlights.value = ranges;
                    }
                }
            } else if (
                this._selectedItem
                && this._selectedItem.id === annotation.id
                && !isSelected
            ) {
                this.deselectSelected();
            }

            // Set selected state
            parentNode[index].selected = isSelected;

            this.updateAnnotationViews();
        }
    }

    /**
     * Modifies the visibility state of an annotation
     *
     * @param annotation total data of annotation of interest
     * @param isVisible desired visibility value
     */
    public setAnnotationVisibility(annotation: AnnotationPanelItem, isVisible: boolean): void {
        const [parentNode, index] = this.getRelevantParentNode(annotation);
        if (parentNode && index != null) {
            parentNode[index].visible = isVisible;

            this.updateAnnotationViews();
        } else if (annotation.type === AnnotationHierarchyType.CATEGORY) {
            switch (annotation.category) {
                case AnnotationCategory.PUZZLE:
                    this._puzzleAnnotationsVisible = isVisible;
                    break;
                case AnnotationCategory.SOLUTION:
                    this._solutionAnnotationsVisible = isVisible;
                    break;
                case AnnotationCategory.STRUCTURE:
                    this._structureAnnotationsVisible = isVisible;
                    break;
                default:
                    Assert.unreachable(annotation.category);
            }
            this.updateAnnotationViews();
        }
    }

    /**
     * Modifies the expansion state of an annotation
     *
     * @param annotation total data of annotation of interest
     * @param isExpanded desired expansion value
     */
    public setAnnotationExpansion(annotation: AnnotationPanelItem, isExpanded: boolean): void {
        const [parentNode, index] = this.getRelevantParentNode(annotation);
        if (parentNode && index != null) {
            parentNode[index].expanded = isExpanded;

            this.updateAnnotationViews();
        }
    }

    public get puzzleAnnotationsVisible() {
        return this._puzzleAnnotationsVisible;
    }

    public get solutionAnnotationsVisible() {
        return this._solutionAnnotationsVisible;
    }

    public get structureAnnotationsVisible() {
        return this._structureAnnotationsVisible;
    }

    /**
     * Sets the position of a single annotation view associated with an annotation
     * An annotation with multiple ranges would have multiple positions
     *
     * @param annotation total data of annotation of interest
     * @param positionIndex index of relevant annotation view associated with annotation
     * @param position new position
     */
    public setAnnotationPositions(annotation: AnnotationData, positionIndex: number, position: AnnotationPosition) {
        const [parentNode, index] = this.getRelevantParentNode(annotation);
        if (parentNode && index != null) {
            parentNode[index].positions[positionIndex] = position;
        }
    }

    /**
     * Recomputes the display objects of all annotations and layers
     */
    public updateAnnotationViews(): void {
        this.viewAnnotationDataUpdated.emit();
    }

    private propagateDataUpdates(): void {
        this.updateAnnotationViews();
        this.persistentAnnotationDataUpdated.emit();
    }

    private isAnnotationVisible(data: AnnotationData) {
        if (!data.visible) return false;

        if (
            data.category === AnnotationCategory.PUZZLE
            && !this._puzzleAnnotationsVisible
        ) return false;

        if (
            data.category === AnnotationCategory.SOLUTION
            && !this._solutionAnnotationsVisible
        ) return false;

        if (
            data.category === AnnotationCategory.STRUCTURE
            && !this._structureAnnotationsVisible
        ) return false;

        if (data.layerId) {
            const parentLayer = this.allLayers.find((layer) => layer.id === data.layerId);
            if (!parentLayer?.visible) return false;
        }

        return true;
    }

    /**
     * Draws all annotation views in a given puzzle pose
     *
     * @param pose puzzle pose of interest
     * @param reset whether to recalculate the positions of all annotations
     * @param ignoreCustom whether to override the custom
     */
    public drawAnnotations(params: {
        pose: Pose2D;
        reset: boolean;
        ignoreCustom: boolean;
    }): void {
        // Get base layer bounds relative to Pose2D container
        // This is done here rather than in findBaseConflicts where it's actually used
        // because it is quite expensive for large puzzles, and would wind up getting run
        // quite a number of times otherwise
        const baseLayerBounds = DisplayUtil.getBoundsRelative(params.pose.baseLayer, params.pose.container);

        if (params.pose.zoomLevel > AnnotationManager.ANNOTATION_LAYER_THRESHOLD) {
            // visualize layers
            for (const [idx, layer] of this.allLayers.entries()) {
                if (this.isAnnotationVisible(layer)) {
                    this.placeAnnotationInPose({
                        ...params, item: layer, itemIndex: idx, baseLayerBounds
                    });
                }
            }

            // visualize annotations not in layers
            for (const [idx, annotation] of this.allAnnotations.entries()) {
                if (!annotation.layerId && this.isAnnotationVisible(annotation)) {
                    this.placeAnnotationInPose({
                        ...params, item: annotation, itemIndex: idx, baseLayerBounds
                    });
                }
            }
        } else {
            // visualize annotations
            for (const [idx, annotation] of this.allAnnotations.entries()) {
                if (this.isAnnotationVisible(annotation)) {
                    this.placeAnnotationInPose({
                        ...params, item: annotation, itemIndex: idx, baseLayerBounds
                    });
                }
            }
        }
    }

    /**
     * Accesses all the structure annotations
     */
    public getStructureAnnotations(): AnnotationData[] {
        return this._structureAnnotations;
    }

    /**
     * Populates/sets the puzzle annotations. Typically used
     * to bring back locally stored state
     *
     * @param annotations
     */
    public setPuzzleAnnotations(annotations: AnnotationData[]) {
        const preparedAnnotations: AnnotationData[] = annotations.map(
            (annotation: AnnotationData) => AnnotationManager.prepareAnnotationNode(annotation)
        );
        this._puzzleAnnotations = preparedAnnotations;
        this.propagateDataUpdates();
    }

    /**
     * Accesses all the puzzle annotations
     */
    public getPuzzleAnnotations(): AnnotationData[] {
        return this._puzzleAnnotations;
    }

    /**
     * Replaces puzzle annotations
     *
     * @param annotations updated annotations
     */
    public updatePuzzleAnnotations(annotations: AnnotationData[]) {
        this._puzzleAnnotations = annotations;
        this.propagateDataUpdates();
    }

    /**
     * Populates/sets the solution annotations. Typically used
     * to bring back locally stored state
     *
     * @param annotations
     */
    public setSolutionAnnotations(annotations: AnnotationData[]) {
        const preparedAnnotations: AnnotationData[] = annotations.map(
            (annotation: AnnotationData) => AnnotationManager.prepareAnnotationNode(annotation)
        );
        this._solutionAnnotations = preparedAnnotations;
        this.propagateDataUpdates();
    }

    /**
     * Accesses all the solution annotations
     */
    public getSolutionAnnotations(): AnnotationData[] {
        return this._solutionAnnotations;
    }

    /**
     * Replaces solution annotations
     *
     * @param annotations updated annotations
     */
    public updateSolutionAnnotations(annotations: AnnotationData[]) {
        this._solutionAnnotations = annotations;
        this.propagateDataUpdates();
    }

    /**
     * Sets the desired annotation mode state. When active
     * users are able to create new annotations
     */
    public setAnnotationMode(active: boolean): void {
        this.annotationModeActive.value = active;

        if (!active) {
            this.highlights.value = [];

            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) {
                doc.style.cursor = 'default';
            }
        } else {
            const doc = document.getElementById(Eterna.PIXI_CONTAINER_ID);
            if (doc) {
                doc.style.cursor = 'grab';
            }
        }
    }

    /**
     * Accesses all layers (structure, puzzle, solution)
     */
    public get allLayers() {
        const annotationItems = this.getAnnotationItems(true, true);
        const layers: AnnotationData[] = annotationItems.filter(
            (item: AnnotationData) => item.type === AnnotationHierarchyType.LAYER
        );
        return layers;
    }

    /**
     * Accesses all annotation (structure, puzzle, solution)
     */
    public get allAnnotations() {
        const annotationItems = this.getAnnotationItems(true, true);
        const annotations: AnnotationData[] = annotationItems.filter(
            (item: AnnotationData) => item.type === AnnotationHierarchyType.ANNOTATION
        );

        return annotations;
    }

    private bundleAnnotations(graph: AnnotationData[]) {
        const prepareNode = (node: AnnotationData): AnnotationData => {
            const cleansedNode = {...node};
            // These are runtime properties
            delete cleansedNode.visible;
            delete cleansedNode.selected;

            const children: AnnotationData[] = [];
            if (cleansedNode.children) {
                for (const child of cleansedNode.children) {
                    const cleansedChildNode = {...child};
                    // These are runtime properties
                    delete cleansedChildNode.visible;
                    delete cleansedChildNode.selected;
                    children.push(prepareNode(cleansedChildNode));
                }
            }

            return {
                ...cleansedNode,
                children
            };
        };

        return graph.map(prepareNode);
    }

    public createAnnotationBundle(): AnnotationDataBundle {
        return {
            puzzle: this.categoryAnnotationData(AnnotationCategory.PUZZLE),
            solution: this.categoryAnnotationData(AnnotationCategory.SOLUTION)
        };
    }

    public categoryAnnotationData(category: AnnotationCategory.PUZZLE | AnnotationCategory.SOLUTION) {
        switch (category) {
            case AnnotationCategory.PUZZLE:
                return this.bundleAnnotations(this._puzzleAnnotations);
            case AnnotationCategory.SOLUTION:
                return this.bundleAnnotations(this._solutionAnnotations);
            default:
                return Assert.unreachable(category);
        }
    }

    /**
     * Indicates which category is currently modifiable
     */
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

    // ====== HELPER FUNCTIONS ======

    /**
     * Helper function that inserts an annotation at the appropriate hierarchical level
     * in a category
     *
     * @param annotation annotation of interest
     * @param categoryData reference to category of interest
     */
    private insertNewAnnotation(annotation: AnnotationData, categoryData: AnnotationData[]): void {
        if (annotation.layerId) {
            for (const child of categoryData) {
                if (child.id === annotation.layerId && !child.children) {
                    child['children'] = [
                        {
                            ...annotation,
                            visible: true,
                            selected: false
                        }
                    ];
                } else if (child.id === annotation.layerId && child.children) {
                    child.children.push({
                        ...annotation,
                        visible: true,
                        selected: false
                    });
                }
            }
        } else {
            categoryData.push({
                ...annotation,
                visible: true,
                selected: false
            });
        }
    }

    /**
     * Finds the index where a new layer should be placed in a given category
     *
     * @param category category of interest
     */
    private getLowestLayerIndex(category: AnnotationData[]): number {
        for (let i = 0; i < category.length; i++) {
            // We want the index of first "layerless" annotation
            // Which will be where we insert new layer
            if (category[i].type === AnnotationHierarchyType.ANNOTATION) {
                return i;
            }
        }

        // There are no "layerless" annotations
        // But we reached last layer
        // return last index
        return category.length - 1;
    }

    /**
     * Finds the reference in state for the parent of the annotation that shares the same id
     * as the argument
     *
     * @param annotation annotation of interest to find in state
     */
    private getRelevantParentNode(annotation: AnnotationPanelItem | AnnotationData): [
        AnnotationData[] | null,
        number | null
    ] {
        let categoryData: AnnotationData[];
        if (annotation.category === AnnotationCategory.PUZZLE) {
            // Puzzle Annotations
            categoryData = this._puzzleAnnotations;
        } else {
            // Solution Annotations
            categoryData = this._solutionAnnotations;
        }

        if (annotation.layerId) {
            const layerIndex = categoryData.findIndex((layer: AnnotationData) => layer.id === annotation.layerId);
            const layerData = categoryData[layerIndex];
            if (layerData.children) {
                const layerChildren = layerData.children;

                for (let i = 0; i < layerChildren.length; i++) {
                    if (layerChildren[i].id === annotation.id) {
                        return [layerChildren, i];
                    }
                }
            }
        } else {
            for (let i = 0; i < categoryData.length; i++) {
                if (categoryData[i].id === annotation.id) {
                    return [categoryData, i];
                }
            }
        }

        return [null, null];
    }

    /**
     * Generates an AnnotationView to be placed in puzzle pose
     *
     * @param item display object to be made into a view
     */
    private getAnnotationView(pose: Pose2D, positionIndex: number, item: AnnotationData): AnnotationView {
        let textColor;
        switch (item.category) {
            case AnnotationCategory.STRUCTURE:
                textColor = AnnotationPanelItem.STRUCTURE_RIBBON_COLOR;
                break;
            case AnnotationCategory.PUZZLE:
                textColor = AnnotationPanelItem.PUZZLE_RIBBON_COLOR;
                break;
            default:
                textColor = AnnotationPanelItem.SOLUTION_RIBBON_COLOR;
                break;
        }

        const view = new AnnotationView(
            pose,
            item.type,
            positionIndex,
            item,
            textColor
        );

        if (item.visible) {
            view.pointerOver.connect(() => {
                // we only set highlight if annotation mode off so we don't
                // disturb any selections that might be taking place
                if (!this.annotationModeActive.value) {
                    // highlight associated range
                    if (item.type === AnnotationHierarchyType.ANNOTATION) {
                        const annotation = item;
                        if (annotation.ranges) {
                            this.highlights.value = annotation.ranges;
                        }
                    } else if (item.type === AnnotationHierarchyType.LAYER) {
                        const layer = item;
                        let ranges: AnnotationRange[] = [];
                        for (const annotation of layer.children) {
                            if (annotation.ranges) {
                                ranges = ranges.concat(annotation.ranges);
                            }
                        }
                        this.highlights.value = ranges;
                    }
                }
            });
            view.pointerOut.connect(() => {
                // remove associated range only if annotation mode off so we don't
                // disturb any selections that might be taking place
                if (!item.selected && !this.annotationModeActive.value) {
                    this.highlights.value = [];
                }
            });

            view.pointerDown.connect((e) => {
                e.stopPropagation();
                this.setAnnotationSelection(item, true);
            });
            view.isMoving.connect((moving: boolean) => {
                this.isMovingAnnotation = moving;
            });

            if (item.type === AnnotationHierarchyType.ANNOTATION) {
                // We don't need to apply access control logic here
                // This is handled in AnnotationView
                view.onEditButtonPressed.connect(() => {
                    this.annotationEditRequested.emit(item);
                });
                view.onReleasePositionButtonPressed.connect(() => {
                    // Release position
                    const releasedPosition: AnnotationPosition = {
                        ...item.positions[positionIndex],
                        custom: false
                    };

                    this.setAnnotationPositions(item, positionIndex, releasedPosition);
                    this.propagateDataUpdates();
                });
            }
        }

        return view;
    }

    /**
     * Attempts to place a single annotation item
     * @param pose puzzle pose of interest
     * @param item display object data with positioning and annotation metadata
     * @param itemIndex index of item within parent array
     * @param reset whether to recalculate the positions of all annotations
     * @param ignoreCustom whether to override the custom
     */
    private placeAnnotationInPose(params: {
        pose: Pose2D;
        item: AnnotationData;
        itemIndex: number;
        reset: boolean;
        ignoreCustom: boolean;
        baseLayerBounds: Rectangle;
    }): void {
        // If annotation positions have been computed already
        // use cached value
        if (
            params.item.positions.length > 0
            && !params.reset
            && !params.ignoreCustom
        ) {
            for (let i = 0; i < params.item.positions.length; i++) {
                const position = params.item.positions[i];
                const view = this.getAnnotationView(params.pose, i, params.item);
                if (params.item.type === AnnotationHierarchyType.ANNOTATION) {
                    view.onMovedAnnotation.connect((point: Point) => {
                        const anchorIndex = params.item.positions[i].anchorIndex;
                        const base = params.pose.getBase(anchorIndex);
                        const anchorPoint = new Point(
                            base.x + params.pose.xOffset,
                            base.y + params.pose.yOffset
                        );

                        // Compute relative position
                        const movedPosition: AnnotationPosition = {
                            ...position,
                            relPosition: new Point(
                                point.x - anchorPoint.x,
                                point.y - anchorPoint.y
                            ),
                            custom: true
                        };

                        this.setAnnotationPositions(params.item, i, movedPosition);
                        this.persistentAnnotationDataUpdated.emit();
                    });
                }
                params.pose.addAnnotationView(view);

                const anchorIndex = position.anchorIndex;
                const base = params.pose.getBase(anchorIndex);
                const anchorPoint = new Point(
                    base.x + params.pose.xOffset,
                    base.y + params.pose.yOffset
                );
                view.display.position.set(
                    position.relPosition.x + anchorPoint.x,
                    position.relPosition.y + anchorPoint.y
                );
            }

            return;
        }

        let ranges: AnnotationRange[] = [];
        if (params.item.type === AnnotationHierarchyType.LAYER) {
            // We only want one layer label for each item, so we pick the first range we find
            //
            // An improvement that could be made is to find the
            // "center of mass" of all the ranges in a layer
            // and place the layer label at an appropriate base closest to
            // the center of mass point
            const layerData = params.item;

            if (layerData.children) {
                for (const annotation of layerData.children) {
                    if (annotation.ranges) {
                        ranges.push(annotation.ranges[0]);
                        break;
                    }
                }
            }
        } else {
            const annotationData = params.item;
            if (annotationData.ranges) {
                ranges = annotationData.ranges;
            }
        }

        // Future Improvement:
        // A single annotation or layer can be associated with multiple ranges
        // We handle this by generating a label for each range, regardless
        // of the proximity of the ranges
        //
        // An improvement that can be made is to only "duplicate" labels
        // if range positions exceed some defined threshold to avoid unnecessary
        // label duplicates.
        for (let i = 0; i < ranges.length; i++) {
            const range = ranges[i];
            const prevPosition = params.item.positions.length > i ? params.item.positions[i] : null;
            const view = this.getAnnotationView(params.pose, i, params.item);
            if (params.item.type === AnnotationHierarchyType.ANNOTATION) {
                view.onMovedAnnotation.connect((point: Point) => {
                    const anchorIndex = params.item.positions[i].anchorIndex;
                    const base = params.pose.getBase(anchorIndex);
                    const anchorPoint = new Point(
                        base.x + params.pose.xOffset,
                        base.y + params.pose.yOffset
                    );
                    // Compute relative position
                    const movedPosition: AnnotationPosition = {
                        ...params.item.positions[i],
                        relPosition: new Point(
                            point.x - anchorPoint.x,
                            point.y - anchorPoint.y
                        ),
                        custom: true
                    };

                    this.setAnnotationPositions(params.item, i, movedPosition);
                    this.persistentAnnotationDataUpdated.emit();
                });
            }
            // We need to prematurely (ie, before we have a final position) add this to the display object graph
            // so that we can read it's dimensions/position
            params.pose.addAnnotationView(view);

            let absolutePosition: Point | null = null;
            let relPosition: Point | null = null;
            let anchorIndex: number | null = null;
            let customPosition = false;
            let zoomLevel: number = params.pose.zoomLevel;
            if (prevPosition?.custom && !params.ignoreCustom) {
                relPosition = prevPosition.relPosition;
                anchorIndex = prevPosition.anchorIndex;
                const base = params.pose.getBase(anchorIndex);
                const zoomScaling = 1
                + ((prevPosition.zoomLevel - params.pose.zoomLevel) / (Pose2D.ZOOM_SPACINGS.length - 1));

                const anchorPoint = new Point(
                    base.x + params.pose.xOffset,
                    base.y + params.pose.yOffset
                );
                absolutePosition = new Point(
                    relPosition.x * zoomScaling + anchorPoint.x,
                    relPosition.y * zoomScaling + anchorPoint.y
                );
                zoomLevel = prevPosition.zoomLevel;
                customPosition = true;
            } else {
                // Make anchor midpoint of range
                // Account for reverse ranges
                if (range.start < range.end) {
                    anchorIndex = range.start + Math.floor((range.end - range.start) / 2);
                } else {
                    anchorIndex = range.end + Math.floor((range.start - range.end) / 2);
                }

                // Make sure anchor sits within sequence length
                if (anchorIndex >= params.pose.sequenceLength - 1) continue;
                const base = params.pose.getBase(anchorIndex);
                const anchorPoint = new Point(
                    base.x + params.pose.xOffset,
                    base.y + params.pose.yOffset
                );

                // Run a search to find best place to locate
                // annotation within available space
                relPosition = this.computeAnnotationPositionPoint(
                    params.pose,
                    anchorIndex,
                    anchorIndex,
                    anchorPoint,
                    base.display,
                    view,
                    0,
                    undefined,
                    undefined,
                    undefined,
                    params.baseLayerBounds
                );

                if (relPosition) {
                    absolutePosition = new Point(
                        relPosition.x + anchorPoint.x,
                        relPosition.y + anchorPoint.y
                    );
                }
            }

            // Handle position
            if (relPosition && absolutePosition) {
                // Set position
                view.display.position.copyFrom(absolutePosition);

                // Cache position
                this.setAnnotationPositions(params.item, i, {
                    anchorIndex,
                    relPosition,
                    zoomLevel,
                    custom: customPosition
                });
            } else {
                // We should ideally always receive a position
                //
                // In cases we don't, remove annotation card from view.
                //
                // TODO: In the future, we should revisit computeAnnotationPositionPoint to always
                // return *something*, as just not showing the annotation is behavior that does not
                // seem user friendly.
                params.pose.removeAnnotationView(view);
            }
        }
    }

    /**
     * Searches for spot in available space around annotation range
     * to place annotation card
     *
     * Runs a recursive/iterative search on each place defined about the co-ordinate
     * system with the anchor point as the origin until it finds a place
     * @param pose puzzle pose of interest
     * @param originalAnchorIndex the index of the base associated with the initial call
     * @param currentAnchorIndex the index of the base currently being used as the anchor
     * @param anchorPoint center-point of base/annotation card that defines the origin on which calculations are made
     * relative from. We use the center-point and not the top-left corner, as is convention in pixi,
     * because bases in Eterna.js have their position saved as a central point
     * @param anchorDisplay display object of anchor
     * @param annotationView annotation to be placed
     * @param numSearchAttempts the number of new search attempts undergone
     * @param anchorOffsetX the x-offset applied to the anchor point when attempting a recursive call.
     * The effect is to offset the anchor point in the x-axis while still maintaining reference
     * to the anchor of interest.
     * @param anchorOffsetY the y-offset applied to the anchor point when attempting a recursive call.
     * The effect is to offset the anchor point in the y-axis while still maintaining reference
     * to the anchor of interest.
     * @param includeCenters whether we attempt to place the annotation vertically centered on the
     * left or right of origin
     * @return relative position (to anchor) of annotation relative computed from the annotation's
     * top-left corner
     */
    private computeAnnotationPositionPoint(
        pose: Pose2D,
        originalAnchorIndex: number,
        currentAnchorIndex: number,
        anchorPoint: Point,
        anchorDisplay: Container,
        annotationView: AnnotationView,
        numSearchAttempts: number,
        anchorOffsetX: number = 0,
        anchorOffsetY: number = 0,
        includeCenters: boolean = true,
        baseLayerBounds: Rectangle
    ): Point | null {
        // x and y offsets that create space between annotations
        const annotationOffsetX: number = AnnotationManager.DEFAULT_ANNOTATION_SHIFT;
        const annotationOffsetY = 0;

        // Find places that are occupied by bases
        const baseConflicts = this.findBaseConflicts(
            pose,
            anchorPoint,
            anchorDisplay,
            annotationView,
            numSearchAttempts,
            anchorOffsetX,
            anchorOffsetY,
            annotationOffsetX,
            annotationOffsetY,
            baseLayerBounds
        );

        // Find possible position factoring occupied places
        let proposedPosition: AnnotationPosition | null = this.findProposedPosition(
            pose,
            currentAnchorIndex,
            anchorDisplay,
            annotationView,
            anchorOffsetX,
            anchorOffsetY,
            annotationOffsetX,
            annotationOffsetY,
            baseConflicts,
            true,
            true,
            true,
            includeCenters,
            includeCenters,
            true,
            true,
            true
        );

        // Makes sure there are no annotations at proposed position
        // Will return conflict if one exists
        let annotationPositionConflict = this.findCardConflict(
            pose,
            anchorPoint,
            annotationView,
            numSearchAttempts,
            proposedPosition
        );

        // Handles case if annotation exists at bounds
        // Marks region as occupied and searches next available
        // region about anchor point
        let testTopLeft = true;
        let testTopCenter = true;
        let testTopRight = true;
        let testBottomLeft = true;
        let testBottomCenter = true;
        let testBottomRight = true;
        // Accumulate all conflicts to
        // use as anchors for recursive search
        const positionConflicts: AnnotationPositionConflict[] = [];
        while (annotationPositionConflict && proposedPosition) {
            // Store to conflict
            positionConflicts.push(annotationPositionConflict);

            // Update vacancy loss due to annotation occupancy
            switch (annotationPositionConflict.placement) {
                case AnnotationPlacement.TOP_LEFT:
                    testTopLeft = false;
                    break;
                case AnnotationPlacement.TOP_CENTER:
                    testTopCenter = false;
                    break;
                case AnnotationPlacement.TOP_RIGHT:
                    testTopRight = false;
                    break;
                case AnnotationPlacement.BOTTOM_LEFT:
                    testBottomLeft = false;
                    break;
                case AnnotationPlacement.BOTTOM_CENTER:
                    testBottomCenter = false;
                    break;
                case AnnotationPlacement.BOTTOM_RIGHT:
                    testBottomRight = false;
                    break;
                default:
                    break;
            }

            // Find possible position factoring updated occupied places
            proposedPosition = this.findProposedPosition(
                pose,
                currentAnchorIndex,
                anchorDisplay,
                annotationView,
                anchorOffsetX,
                anchorOffsetY,
                annotationOffsetX,
                annotationOffsetY,
                baseConflicts,
                testTopLeft,
                testTopCenter,
                testTopRight,
                false,
                false,
                testBottomLeft,
                testBottomCenter,
                testBottomRight
            );

            // Makes sure there are no annotations at new proposed position
            annotationPositionConflict = this.findCardConflict(
                pose,
                anchorPoint,
                annotationView,
                numSearchAttempts,
                proposedPosition
            );
        }

        if (proposedPosition) {
            // We have an available position
            return proposedPosition.relPosition;
        } else if (
            positionConflicts.length > 0
            && numSearchAttempts < AnnotationManager.ANNOTATION_PLACEMENT_ITERATION_TIMEOUT
        ) {
            // If we still don't have a proposed position
            // Recursively search for one using each conflict annotation
            // as an anchor point
            for (const positionConflict of positionConflicts) {
                // Compute offset based on overlap placement
                const conflictOffsetX = positionConflict.bounds.x
                    - anchorPoint.x + anchorDisplay.width / 2 + positionConflict.bounds.width / 2;
                const conflictOffsetY = positionConflict.bounds.y
                    - anchorPoint.y + anchorDisplay.height / 2 + positionConflict.bounds.height / 2;

                const point = this.computeAnnotationPositionPoint(
                    pose,
                    originalAnchorIndex,
                    currentAnchorIndex,
                    anchorPoint,
                    annotationView.display,
                    annotationView,
                    numSearchAttempts + 1, // Increment recursive depth
                    conflictOffsetX,
                    conflictOffsetY,
                    numSearchAttempts === 0 || !includeCenters,
                    baseLayerBounds
                );

                if (point) {
                    return point;
                }
            }
        } else if (
            numSearchAttempts < AnnotationManager.ANNOTATION_PLACEMENT_ITERATION_TIMEOUT
            && currentAnchorIndex > 1
            && currentAnchorIndex < pose.sequenceLength - 1
        ) {
            // We'll change the anchor index in the hopes of finding available space
            // We move in the direction with the most bases
            const increaseAnchor = pose.sequenceLength - originalAnchorIndex > originalAnchorIndex;
            const newAnchorIndex = increaseAnchor ? currentAnchorIndex + 1 : currentAnchorIndex - 1;
            const base = pose.getBase(newAnchorIndex);
            const newAnchorPoint = new Point(
                base.x + pose.xOffset,
                base.y + pose.yOffset
            );

            const point = this.computeAnnotationPositionPoint(
                pose,
                originalAnchorIndex,
                newAnchorIndex,
                newAnchorPoint,
                annotationView.display,
                annotationView,
                numSearchAttempts + 1, // Increment iterative steps,
                0,
                0,
                true,
                baseLayerBounds
            );

            if (point) {
                return point;
            }
        }

        return null;
    }

    /**
     * Helper function that searches for a suitable region to attempt to place annotation
     *
     *                      top
     *     top-left   --------------- top-right
     *               |       |       |
     *               |       |       |
     *               |       |       |
     *   left-center  ---- Anchor ---  right-center
     *               |       |       |
     *               |       |       |
     *               |       |       |
     *   bottom-left  ---------------  bottom-right
     *                    bottom
     *
     * @param pose puzzle pose of interest
     * @param currentAnchorIndex the index of the base currently being used as the anchor
     * @param anchorPoint center-point of base/annotation card that defines the origin on which calculations are made
     * relative from. We use the center-point and not the top-left corner, as is convention in pixi,
     * because bases in Eterna.js have their position saved as a central point
     * @param anchorDisplay display object of anchor
     * @param annotationView annotation to be placed
     * @param numSearchAttempts the number of new search attempts undergone
     * @param anchorOffsetX the x-offset applied to the anchor point when attempting a recursive call.
     * The effect is to offset the anchor point in the x-axis while still maintaining reference
     * to the anchor of interest.
     * @param anchorOffsetY the y-offset applied to the anchor point when attempting a recursive call.
     * The effect is to offset the anchor point in the y-axis while still maintaining reference
     * to the anchor of interest.
     * @param annotationOffsetX the x-offset applied to the annotation
     * @param annotationOffsetY the y-offset applied to the annotation
     * @param baseConflicts an object with the conflict (or lack thereof) at each placement region
     * @param includeTopLeft whether to include top-left as suitable region
     * @param includeTopCenter whether to include top-center as suitable region
     * @param includeTopRight whether to include top-right as suitable region
     * @param includeLeftCenter whether to include left-center as suitable region
     * @param includeRightCenter whether to include right-center as suitable region
     * @param includeBottomLeft whether to include bottom-left as suitable region
     * @param includeBottomCenter whether to include bottom-center as suitable region
     * @param includeBottomRight whether to include bottom-right as suitable region
     * @return relative position of existing annotation (if one exists) or null (if position is vacant)
     */
    private findProposedPosition(
        pose: Pose2D,
        currentAnchorIndex: number,
        anchorDisplay: Container,
        annotationView: AnnotationView,
        anchorOffsetX: number = 0,
        anchorOffsetY: number = 0,
        annotationOffsetX: number = 0,
        annotationOffsetY: number = 0,
        baseConflicts: AnnotationBaseConflicts,
        includeTopLeft: boolean,
        includeTopCenter: boolean,
        includeTopRight: boolean,
        includeLeftCenter: boolean,
        includeRightCenter: boolean,
        includeBottomLeft: boolean,
        includeBottomCenter: boolean,
        includeBottomRight: boolean
    ): AnnotationPosition | null {
        // IMPORTANT: The conditional statements that follow
        // have been ordered intentionally to
        // attempt to present the annotations in
        // this specific priority list

        const proposedPosition: AnnotationPosition = {
            anchorIndex: currentAnchorIndex,
            relPosition: new Point(0, 0), // will be replaced
            zoomLevel: pose.zoomLevel,
            placement: AnnotationPlacement.RIGHT_CENTER, // will be replaced
            custom: false
        };

        if (
            includeRightCenter
            && !baseConflicts[AnnotationPlacement.RIGHT_CENTER]
        ) {
            // Place at right-center
            proposedPosition.placement = AnnotationPlacement.RIGHT_CENTER;
            proposedPosition.relPosition = new Point(
                anchorDisplay.width / 2 + annotationOffsetX + anchorOffsetX,
                -annotationView.height / 2 + anchorOffsetY
            );
            return proposedPosition;
        }

        if (
            includeLeftCenter
            && !baseConflicts[AnnotationPlacement.LEFT_CENTER]
        ) {
            // Place at left-center
            proposedPosition.placement = AnnotationPlacement.LEFT_CENTER;
            proposedPosition.relPosition = new Point(
                -anchorDisplay.width / 2 - annotationView.width - annotationOffsetX + anchorOffsetX,
                -annotationView.height / 2 + anchorOffsetY
            );
            return proposedPosition;
        }

        if (
            includeTopCenter
            && !baseConflicts[AnnotationPlacement.TOP_CENTER]
        ) {
            // Place at top-center
            proposedPosition.placement = AnnotationPlacement.TOP_CENTER;
            proposedPosition.relPosition = new Point(
                -annotationView.width / 2 + anchorDisplay.width / 2 + anchorOffsetX,
                -anchorDisplay.height / 2 - annotationView.height - annotationOffsetY + anchorOffsetY
            );
            return proposedPosition;
        }

        if (
            includeBottomCenter
            && !baseConflicts[AnnotationPlacement.BOTTOM_CENTER]
        ) {
            // Place at bottom-center
            proposedPosition.placement = AnnotationPlacement.BOTTOM_CENTER;
            proposedPosition.relPosition = new Point(
                -annotationView.width / 2 + anchorDisplay.width / 2 + anchorOffsetX,
                anchorDisplay.height / 2 + annotationOffsetY + anchorOffsetY
            );
            return proposedPosition;
        }

        if (
            includeTopLeft
            && !baseConflicts[AnnotationPlacement.TOP_LEFT]
        ) {
            // Place in top-left
            proposedPosition.placement = AnnotationPlacement.TOP_LEFT;
            proposedPosition.relPosition = new Point(
                -anchorDisplay.width / 2 - annotationView.width - annotationOffsetX + anchorOffsetX,
                -anchorDisplay.height / 2 - annotationView.height - annotationOffsetY + anchorOffsetY
            );
            return proposedPosition;
        }

        if (
            includeTopRight
            && !baseConflicts[AnnotationPlacement.TOP_RIGHT]
        ) {
            // Place in top-right
            proposedPosition.placement = AnnotationPlacement.TOP_RIGHT;
            proposedPosition.relPosition = new Point(
                anchorDisplay.width / 2 + annotationOffsetX + anchorOffsetX,
                -anchorDisplay.height / 2 - annotationView.height - annotationOffsetY + anchorOffsetY
            );
            return proposedPosition;
        }

        if (
            includeBottomLeft
            && !baseConflicts[AnnotationPlacement.BOTTOM_LEFT]
        ) {
            // Place in bottom-left
            proposedPosition.placement = AnnotationPlacement.BOTTOM_LEFT;
            proposedPosition.relPosition = new Point(
                -anchorDisplay.width / 2 - annotationView.width - annotationOffsetX + anchorOffsetX,
                anchorDisplay.height / 2 + annotationOffsetY + anchorOffsetY
            );
            return proposedPosition;
        }

        if (
            includeBottomRight
            && !baseConflicts[AnnotationPlacement.BOTTOM_RIGHT]
        ) {
            // Place in bottom-right
            proposedPosition.placement = AnnotationPlacement.BOTTOM_RIGHT;
            proposedPosition.relPosition = new Point(
                anchorDisplay.width / 2 + annotationOffsetX + anchorOffsetX,
                anchorDisplay.height / 2 + annotationOffsetY + anchorOffsetY
            );
            return proposedPosition;
        }

        // Shifted

        const rightCenterConflict = baseConflicts[AnnotationPlacement.RIGHT_CENTER];
        const rightCenterCorrection = rightCenterConflict?.correction;
        if (
            includeRightCenter
            && rightCenterConflict
            && rightCenterConflict?.resolvable
            && rightCenterCorrection
        ) {
            // Place in shifted right-center
            proposedPosition.placement = AnnotationPlacement.RIGHT_CENTER;
            proposedPosition.relPosition = new Point(
                anchorDisplay.width / 2 + annotationOffsetX + anchorOffsetX
                + rightCenterCorrection.x,
                -annotationView.height / 2 + anchorOffsetY
                + rightCenterCorrection.y
            );
            return proposedPosition;
        }

        const leftCenterConflict = baseConflicts[AnnotationPlacement.LEFT_CENTER];
        const leftCenterCorrection = leftCenterConflict?.correction;
        if (
            includeLeftCenter
            && leftCenterConflict
            && leftCenterConflict?.resolvable
            && leftCenterCorrection
        ) {
            // Place in shifted left-center
            proposedPosition.placement = AnnotationPlacement.LEFT_CENTER;
            proposedPosition.relPosition = new Point(
                -anchorDisplay.width / 2 - annotationView.width - annotationOffsetX + anchorOffsetX
                + leftCenterCorrection.x,
                -annotationView.height / 2 + anchorOffsetY
                + leftCenterCorrection.y
            );
            return proposedPosition;
        }

        const topCenterConflict = baseConflicts[AnnotationPlacement.TOP_CENTER];
        const topCenterCorrection = topCenterConflict?.correction;
        if (
            includeTopCenter
            && topCenterConflict
            && topCenterConflict?.resolvable
            && topCenterCorrection
        ) {
            // Place in shifted top-center
            proposedPosition.placement = AnnotationPlacement.TOP_CENTER;
            proposedPosition.relPosition = new Point(
                -annotationView.width / 2 + anchorDisplay.width / 2 + anchorOffsetX
                + topCenterCorrection.x,
                -anchorDisplay.height / 2 - annotationView.height - annotationOffsetY + anchorOffsetY
                + topCenterCorrection.y
            );
            return proposedPosition;
        }

        const bottomCenterConflict = baseConflicts[AnnotationPlacement.BOTTOM_CENTER];
        const bottomCenterCorrection = topCenterConflict?.correction;
        if (
            includeBottomCenter
            && bottomCenterConflict
            && bottomCenterConflict?.resolvable
            && bottomCenterCorrection
        ) {
            // Place in shifted bottom-center
            proposedPosition.placement = AnnotationPlacement.BOTTOM_CENTER;
            proposedPosition.relPosition = new Point(
                -annotationView.width / 2 + anchorDisplay.width / 2 + anchorOffsetX
                + bottomCenterCorrection.x,
                anchorDisplay.height / 2 + annotationOffsetY + anchorOffsetY
                + bottomCenterCorrection.y
            );
            return proposedPosition;
        }

        const topLeftConflict = baseConflicts[AnnotationPlacement.TOP_LEFT];
        const topLeftCorrection = topCenterConflict?.correction;
        if (
            includeTopLeft
            && topLeftConflict
            && topLeftConflict?.resolvable
            && topLeftCorrection
        ) {
            // Place in shifted top-left
            proposedPosition.placement = AnnotationPlacement.TOP_LEFT;
            proposedPosition.relPosition = new Point(
                -anchorDisplay.width / 2 - annotationView.width - annotationOffsetX
                + anchorOffsetX + topLeftCorrection.x,
                -anchorDisplay.height / 2 - annotationView.height - annotationOffsetY
                + anchorOffsetY + topLeftCorrection.y
            );
            return proposedPosition;
        }

        const topRightConflict = baseConflicts[AnnotationPlacement.TOP_RIGHT];
        const topRightCorrection = topCenterConflict?.correction;
        if (
            includeTopRight
            && topRightConflict
            && topRightConflict?.resolvable
            && topRightCorrection
        ) {
            // Place in shifted top-right
            proposedPosition.placement = AnnotationPlacement.TOP_RIGHT;
            proposedPosition.relPosition = new Point(
                anchorDisplay.width / 2 + annotationOffsetX + anchorOffsetX
                + topRightCorrection.x,
                -anchorDisplay.height / 2 - annotationView.height - annotationOffsetY + anchorOffsetY
                + topRightCorrection.y
            );
            return proposedPosition;
        }

        const bottomLeftConflict = baseConflicts[AnnotationPlacement.BOTTOM_LEFT];
        const bottomLeftCorrection = topCenterConflict?.correction;
        if (
            includeBottomLeft
            && bottomLeftConflict
            && bottomLeftConflict?.resolvable
            && bottomLeftCorrection
        ) {
            // Place in shifted bottom-left
            proposedPosition.placement = AnnotationPlacement.BOTTOM_LEFT;
            proposedPosition.relPosition = new Point(
                -anchorDisplay.width / 2 - annotationView.width - annotationOffsetX + anchorOffsetX
                + bottomLeftCorrection.x,
                anchorDisplay.height / 2 + annotationOffsetY + anchorOffsetY
                + bottomLeftCorrection.y
            );
            return proposedPosition;
        }

        const bottomRightConflict = baseConflicts[AnnotationPlacement.BOTTOM_RIGHT];
        const bottomRightCorrection = topCenterConflict?.correction;
        if (
            includeBottomRight
            && bottomRightConflict
            && bottomRightConflict?.resolvable
            && bottomRightCorrection
        ) {
            // Place in shifted bottom-right
            proposedPosition.placement = AnnotationPlacement.BOTTOM_RIGHT;
            proposedPosition.relPosition = new Point(
                anchorDisplay.width / 2 + annotationOffsetX + anchorOffsetX
                + bottomRightCorrection.x,
                anchorDisplay.height / 2 + annotationOffsetY + anchorOffsetY
                + bottomRightCorrection.y
            );
            return proposedPosition;
        }

        return null;
    }

    /**
     * Helper function that checks whether annotations/layers exist at a proposed position
     *
     * @param pose puzzle pose of interest
     * @param anchorPoint center-point of base/annotation card that defines the origin on which calculations are made
     * relative from. We use the center-point and not the top-left corner, as is convention in pixi,
     * because bases in Eterna.js have their position saved as a central point
     * @param annotationView annotation to be placed
     * @param numSearchAttempts the number of new search attempts undergone
     * @param position proposed relative position (to anchor) of annotation computed from
     * the annotation's top-left corner
     * @return absolute bounds of existing annotation (if one exists) or null (if position is vacant)
     */
    private findCardConflict(
        pose: Pose2D,
        anchorPoint: Point,
        annotationView: AnnotationView,
        numSearchAttempts: number,
        position: AnnotationPosition | null
    ): AnnotationPositionConflict | null {
        if (
            position
            && position.relPosition
            && position.placement
        ) {
            const cardArray = pose.zoomLevel > AnnotationManager.ANNOTATION_LAYER_THRESHOLD
                ? this.allLayers : this.allAnnotations;

            for (let i = 0; i < cardArray.length; i++) {
                // Get annotation object
                const card = cardArray[i];
                // Annotation might have multiple positions for each range associated with it
                for (let j = 0; j < card.positions.length; j++) {
                    // We had to add the annotation to the pose already even though we don't have a final
                    // position (so that we could get its size), so make sure we don't take it into account
                    if (
                        card.id === annotationView.annotationID
                        && j === annotationView.positionIndex
                    ) {
                        continue;
                    }

                    const display = pose.getAnnotationViewDims(card.id, j);
                    const cardRelPosition = card.positions[j].relPosition;
                    const base = pose.getBase(card.positions[j].anchorIndex);
                    const cardAnchorPoint = new Point(
                        base.x + pose.xOffset,
                        base.y + pose.yOffset
                    );
                    const cardAbsolutePosition = new Point(
                        cardRelPosition.x + cardAnchorPoint.x,
                        cardRelPosition.y + cardAnchorPoint.y
                    );

                    const absolutePosition = new Point(
                        position.relPosition.x + anchorPoint.x,
                        position.relPosition.y + anchorPoint.y
                    );

                    // There are four cases where overlap can occur
                    if (display && ((
                        // Proposed annotation behind existing one
                        // Proposed annotation above existing one
                        (
                            cardAbsolutePosition.x >= absolutePosition.x
                                    && cardAbsolutePosition.x < absolutePosition.x + annotationView.width
                        )
                                && (
                                    cardAbsolutePosition.y >= absolutePosition.y
                                    && cardAbsolutePosition.y < absolutePosition.y + annotationView.height
                                )
                    )
                        || (
                            // Existing annotation behind proposed one
                            // Proposed annotation above existing one
                            (
                                absolutePosition.x >= cardAbsolutePosition.x
                                && absolutePosition.x < cardAbsolutePosition.x + display.width
                            )
                            && (
                                cardAbsolutePosition.y >= absolutePosition.y
                                && cardAbsolutePosition.y < absolutePosition.y + annotationView.height
                            )
                        )
                        || (
                            // Existing annotation behind proposed one
                            // Existing annotation above proposed one
                            (
                                absolutePosition.x >= cardAbsolutePosition.x
                                && absolutePosition.x < cardAbsolutePosition.x + display.width
                            )
                            && (
                                absolutePosition.y >= cardAbsolutePosition.y
                                && absolutePosition.y < cardAbsolutePosition.y + display.height
                            )
                        )
                        || (
                            // Proposed annotation behind existing one
                            // Existing annotation above proposed one
                            (
                                cardAbsolutePosition.x >= absolutePosition.x
                                && cardAbsolutePosition.x < absolutePosition.x + annotationView.width
                            )
                            && (
                                absolutePosition.y >= cardAbsolutePosition.y
                                && absolutePosition.y < cardAbsolutePosition.y + display.height
                            )
                        )
                    )) {
                        // We want absolute position so we add back anchor position
                        const positionConflict: AnnotationPositionConflict = {
                            bounds: new Rectangle(
                                cardAbsolutePosition.x,
                                cardAbsolutePosition.y,
                                display.width,
                                display.height
                            ),
                            placement: position.placement
                        };

                        if (DEBUG_ANNOTATION_PLACEMENT) {
                            const debugRect = new Graphics().lineStyle(1, ANNOTATION_CONFLICT_COLOR).drawRect(
                                positionConflict.bounds.x,
                                positionConflict.bounds.y,
                                positionConflict.bounds.width,
                                positionConflict.bounds.height
                            );
                            if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                                pose.baseLayer.addChild(debugRect);
                            }
                        }

                        return positionConflict;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Determines which place defined about a co-ordinate
     * system with an anchor point as the origin are occupied by bases
     *
     *                   top center
     *     top-left   --------------- top-right
     *               |       |       |
     *               |       |       |
     *               |       |       |
     *   left-center  ---- Anchor ---  right-center
     *               |       |       |
     *               |       |       |
     *               |       |       |
     *   bottom-left  ---------------  bottom-right
     *                 bottom center
     *
     * @param pose puzzle pose of interest
     * @param anchorPoint center-point of base/annotation card that defines the origin on which calculations are made
     * relative from. We use the center-point and not the top-left corner, as is convention in pixi,
     * because bases in Eterna.js have their position saved as a central point
     * @param anchorDisplay display object of anchor
     * @param annotationView annotation to be placed
     * @param numSearchAttempts the number of new search attempts undergone
     * @param anchorOffsetX the x-offset applied to the anchor point when attempting a recursive call.
     * The effect is to offset the anchor point in the x-axis while still maintaining reference
     * to the anchor of interest.
     * @param anchorOffsetY the y-offset applied to the anchor point when attempting a recursive call.
     * The effect is to offset the anchor point in the y-axis while still maintaining reference
     * to the anchor of interest.
     * @param annotationOffsetX the x-offset applied to the annotation
     * @param annotationOffsetY the y-offset applied to the annotation
     * @return array of occupied places
     */
    private findBaseConflicts(
        pose: Pose2D,
        anchorPoint: Point,
        anchorDisplay: Container,
        annotationView: AnnotationView,
        numSearchAttempts: number,
        anchorOffsetX: number = 0,
        anchorOffsetY: number = 0,
        annotationOffsetX: number,
        annotationOffsetY: number,
        baseLayerBounds: Rectangle
    ): AnnotationBaseConflicts {
        let topLeftConflict: AnnotationBaseConflict | null = null;
        let topCenterConflict: AnnotationBaseConflict | null = null;
        let topRightConflict: AnnotationBaseConflict | null = null;
        let leftCenterConflict: AnnotationBaseConflict | null = null;
        let rightCenterConflict: AnnotationBaseConflict | null = null;
        let bottomLeftConflict: AnnotationBaseConflict | null = null;
        let bottomCenterConflict: AnnotationBaseConflict | null = null;
        let bottomRightConflict: AnnotationBaseConflict | null = null;

        // Determine anchor co-ordinates relative to base layer
        // we subtract (width / 2) from X to compute value relative to left edge versus midpoint
        // we subtract (height / 2) from Y to compute value relative to top edge versus midpoint
        const anchorBaseX: number = (anchorPoint.x + anchorOffsetX) - baseLayerBounds.x - anchorDisplay.width / 2;
        const anchorBaseY: number = (anchorPoint.y + anchorOffsetY) - baseLayerBounds.y;

        // Compute extents used to iterate across places:
        // - Center Row = Left Center and Right Center
        // - Top Row = Top Left and Top Right
        // - Bottom Row = Bottom Left and Bottom Right
        // - Center Column = Top and Bottom
        // - Left Column = Top Left, Bottom Left, Left Center
        // - Right Column = Top Right, Bottom right, Right Center
        const startCenterRow = anchorBaseY - annotationView.height / 2;
        const stopCenterRow = anchorBaseY + annotationView.height / 2;
        const startCenterColumn = anchorBaseX - annotationView.width / 2 + anchorDisplay.width / 2;
        const stopCenterColumn = anchorBaseX + annotationView.width / 2 + anchorDisplay.width / 2;
        const startTopRow = anchorBaseY - anchorDisplay.height / 2 - (annotationOffsetY + annotationView.height);
        const stopTopRow = anchorBaseY - anchorDisplay.height / 2 - annotationOffsetY;
        const startLeftColumn = anchorBaseX - (annotationOffsetX + annotationView.width);
        const stopLeftColumn = anchorBaseX - annotationOffsetX;
        const startBottomRow = anchorBaseY + anchorDisplay.height / 2 + annotationOffsetY;
        const stopBottomRow = anchorBaseY + anchorDisplay.height / 2 + annotationOffsetY + annotationView.height;
        const startRightColumn = anchorBaseX + anchorDisplay.width + annotationOffsetX;
        const stopRightColumn = anchorBaseX + anchorDisplay.width + annotationOffsetX + annotationView.width;

        // Top Left
        topLeftConflict = this.computeAnnotationBaseConflict(
            pose,
            startTopRow,
            stopTopRow,
            startCenterColumn,
            stopCenterColumn,
            annotationView,
            baseLayerBounds,
            numSearchAttempts,
            true,
            false,
            true,
            false
        );

        // Top Center
        topCenterConflict = this.computeAnnotationBaseConflict(
            pose,
            startTopRow,
            stopTopRow,
            startCenterColumn,
            stopCenterColumn,
            annotationView,
            baseLayerBounds,
            numSearchAttempts,
            true,
            false,
            false,
            false
        );

        // Top Right
        topRightConflict = this.computeAnnotationBaseConflict(
            pose,
            startTopRow,
            stopTopRow,
            startRightColumn,
            stopRightColumn,
            annotationView,
            baseLayerBounds,
            numSearchAttempts,
            true,
            false,
            false,
            true
        );

        // Left Center
        leftCenterConflict = this.computeAnnotationBaseConflict(
            pose,
            startCenterRow,
            stopCenterRow,
            startLeftColumn,
            stopLeftColumn,
            annotationView,
            baseLayerBounds,
            numSearchAttempts,
            false,
            false,
            true,
            false
        );

        // Right Center
        rightCenterConflict = this.computeAnnotationBaseConflict(
            pose,
            startCenterRow,
            stopCenterRow,
            startRightColumn,
            stopRightColumn,
            annotationView,
            baseLayerBounds,
            numSearchAttempts,
            false,
            false,
            false,
            true
        );

        // Bottom Right
        bottomRightConflict = this.computeAnnotationBaseConflict(
            pose,
            startBottomRow,
            stopBottomRow,
            startRightColumn,
            stopRightColumn,
            annotationView,
            baseLayerBounds,
            numSearchAttempts,
            false,
            true,
            false,
            true
        );

        // Bottom Center
        bottomCenterConflict = this.computeAnnotationBaseConflict(
            pose,
            startBottomRow,
            stopBottomRow,
            startCenterColumn,
            stopCenterColumn,
            annotationView,
            baseLayerBounds,
            numSearchAttempts,
            false,
            true,
            false,
            false
        );

        // Bottom Left
        bottomLeftConflict = this.computeAnnotationBaseConflict(
            pose,
            startBottomRow,
            stopBottomRow,
            startLeftColumn,
            stopLeftColumn,
            annotationView,
            baseLayerBounds,
            numSearchAttempts,
            false,
            true,
            true,
            false
        );

        return {
            [AnnotationPlacement.TOP_LEFT]: topLeftConflict,
            [AnnotationPlacement.TOP_CENTER]: topCenterConflict,
            [AnnotationPlacement.TOP_RIGHT]: topRightConflict,
            [AnnotationPlacement.LEFT_CENTER]: leftCenterConflict,
            [AnnotationPlacement.RIGHT_CENTER]: rightCenterConflict,
            [AnnotationPlacement.BOTTOM_LEFT]: bottomLeftConflict,
            [AnnotationPlacement.BOTTOM_CENTER]: bottomCenterConflict,
            [AnnotationPlacement.BOTTOM_RIGHT]: bottomRightConflict
        };
    }

    /**
     *
     *
     * @param pose puzzle pose of interest
     * @param startRow vertical index from which to begin search
     * @param stopRow vertical index from which to end search
     * @param startColumn horizontal index from which to begin search
     * @param stopColumn horizontal index from which to end search
     * @param annotationView annotation to be placed
     * @param baseLayerBounds bounds of puzzle pose base layer relative to Pose2D container
     * @param numSearchAttempts the number of new search attempts undergone
     * @param testUp whether to test correcting conflict by moving up
     * @param testDown whether to test correcting conflict by moving down
     * @param testLeft whether to test correcting conflict by moving left
     * @param testRight whether to test correcting conflict by moving right
     */
    private computeAnnotationBaseConflict(
        pose: Pose2D,
        startRow: number,
        stopRow: number,
        startColumn: number,
        stopColumn: number,
        annotationView: AnnotationView,
        baseLayerBounds: Rectangle,
        numSearchAttempts: number,
        testUp: boolean,
        testDown: boolean,
        testLeft: boolean,
        testRight: boolean
    ): AnnotationBaseConflict | null {
        let conflict: AnnotationBaseConflict | null = null;
        conflict = this.inspectRegion(
            pose,
            startRow,
            stopRow,
            startColumn,
            stopColumn
        );

        // determine if any conflict is resolvable
        if (conflict) {
            if (DEBUG_ANNOTATION_PLACEMENT) {
                const debugRect = new Graphics().lineStyle(1, BASE_CONFLICT_COLOR).drawRect(
                    baseLayerBounds.x + conflict.bounds.x,
                    baseLayerBounds.y + conflict.bounds.y,
                    conflict.bounds.width,
                    conflict.bounds.height
                );
                if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                    pose.baseLayer.addChild(debugRect);
                }
            }

            const correction = this.testForConflictCorrection(
                pose,
                conflict,
                startRow,
                stopRow,
                startColumn,
                stopColumn,
                testUp,
                testDown,
                testLeft,
                testRight
            );

            if (correction) {
                conflict.resolvable = true;
                conflict.correction = correction;
            }
        } else if (DEBUG_ANNOTATION_PLACEMENT) {
            const debugRect = new Graphics().lineStyle(1, POSSIBLE_PLACEMENT_AVAILABILITY_COLOR).drawRect(
                startColumn + baseLayerBounds.x,
                startRow + baseLayerBounds.y,
                annotationView.width,
                annotationView.height
            );
            if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                pose.baseLayer.addChild(debugRect);
            }
        }

        return conflict;
    }

    /**
     * Inspects a particular place for placement availability
     *
     * @param pose puzzle pose of interest
     * @param startRow pixel row from which to begin vertical inspection
     * @param stopRow pixel row from which to end vertical inspection
     * @param startCol pixel column from which to begin horizontal inspection
     * @param stopCol pixel column from which to end horizontal inspection
     */
    private inspectRegion(
        pose: Pose2D,
        startRow: number,
        stopRow: number,
        startCol: number,
        stopCol: number
    ): AnnotationBaseConflict | null {
        let conflict: AnnotationBaseConflict | null = null;

        for (
            let row = Math.floor(Math.max(0, startRow));
            row < Math.ceil(Math.max(0, stopRow));
            row++
        ) {
            for (
                let col = Math.floor(Math.max(0, startCol));
                col < Math.ceil(Math.max(0, stopCol));
                col++
            ) {
                // build out conflict bounds
                if (pose.annotationSpaceAvailability.get(`${row}-${col}`) && !conflict) {
                    conflict = {
                        bounds: new Rectangle(
                            col,
                            row,
                            1,
                            1
                        ),
                        resolvable: false
                    };
                } else if (pose.annotationSpaceAvailability.get(`${row}-${col}`) && conflict) {
                    conflict.bounds = new Rectangle(
                        conflict.bounds.x,
                        conflict.bounds.y,
                        Math.max(conflict.bounds.width, col - conflict.bounds.x),
                        Math.max(conflict.bounds.height, row - conflict.bounds.y)
                    );
                }
            }
        }

        return conflict;
    }

    /**
     * Searches for any corrections (minor position shifts) that could be applied
     * to resolve a placement conflict
     *
     * @param pose puzzle pose of interest
     * @param conflict bounds where conflict occurs
     * @param startRow pixel row from which to begin vertical inspection
     * @param stopRow pixel row from which to end vertical inspection
     * @param startCol pixel column from which to begin horizontal inspection
     * @param stopCol pixel column from which to end horizontal inspection
     * @param testUp whether to search in the upwards direction
     * @param testDown whether to search in the downwards direction
     * @param testLeft whether to search in the leftwards direction
     * @param testRight whether to search in the rightwards direction
     */
    private testForConflictCorrection(
        pose: Pose2D,
        conflict: AnnotationBaseConflict,
        startRow: number,
        stopRow: number,
        startCol: number,
        stopCol: number,
        testUp: boolean,
        testDown: boolean,
        testLeft: boolean,
        testRight: boolean
    ): Point | null {
        const attemptCorrections: Point[] = [];

        const resolveMovingUp = testUp;
        if (resolveMovingUp) {
            const correction = new Point(
                0,
                -conflict.bounds.height - AnnotationManager.CONFLICT_RESOLUTION_OFFSET
            );
            attemptCorrections.push(correction);
        }

        const resolveMovingDown = testDown;
        if (resolveMovingDown) {
            const correction = new Point(
                0,
                conflict.bounds.height + AnnotationManager.CONFLICT_RESOLUTION_OFFSET
            );
            attemptCorrections.push(correction);
        }

        const resolveMovingLeft = testLeft;
        if (resolveMovingLeft) {
            const correction = new Point(
                -conflict.bounds.width - AnnotationManager.CONFLICT_RESOLUTION_OFFSET,
                0
            );
            attemptCorrections.push(correction);
        }

        const resolveMovingRight = testRight;
        if (resolveMovingRight) {
            const correction = new Point(
                conflict.bounds.width + AnnotationManager.CONFLICT_RESOLUTION_OFFSET,
                0
            );
            attemptCorrections.push(correction);
        }

        const resolveMovingUpLeft = testUp && testLeft;
        if (resolveMovingUpLeft) {
            const correction = new Point(
                -conflict.bounds.width - AnnotationManager.CONFLICT_RESOLUTION_OFFSET,
                -conflict.bounds.height - AnnotationManager.CONFLICT_RESOLUTION_OFFSET
            );
            attemptCorrections.push(correction);
        }

        const resolveMovingUpRight = testUp && testRight;
        if (resolveMovingUpRight) {
            const correction = new Point(
                conflict.bounds.width + AnnotationManager.CONFLICT_RESOLUTION_OFFSET,
                -conflict.bounds.height - AnnotationManager.CONFLICT_RESOLUTION_OFFSET
            );
            attemptCorrections.push(correction);
        }

        const resolveMovingDownLeft = testDown && testLeft;
        if (resolveMovingDownLeft) {
            const correction = new Point(
                -conflict.bounds.width - AnnotationManager.CONFLICT_RESOLUTION_OFFSET,
                conflict.bounds.height + AnnotationManager.CONFLICT_RESOLUTION_OFFSET
            );
            attemptCorrections.push(correction);
        }

        let resolveMovingDownRight = testDown && testRight;
        if (resolveMovingDownRight) {
            const correction = new Point(
                conflict.bounds.width + AnnotationManager.CONFLICT_RESOLUTION_OFFSET,
                conflict.bounds.height + AnnotationManager.CONFLICT_RESOLUTION_OFFSET
            );
            attemptCorrections.push(correction);
        }

        for (const correction of attemptCorrections) {
            resolveMovingDownRight = this.neighboringSpaceVacant(
                pose,
                startRow,
                stopRow,
                startCol,
                stopCol,
                correction
            );
            if (resolveMovingDownRight) return correction;
        }

        return null;
    }

    /**
     *
     * @param pose puzzle pose of interest
     * @param startRow pixel row from which to begin vertical inspection
     * @param stopRow pixel row from which to end vertical inspection
     * @param startCol pixel column from which to begin horizontal inspection
     * @param stopCol pixel column from which to end horizontal inspection
     * @param shiftPoint x and y value offset to apply to inspection
     */
    private neighboringSpaceVacant(
        pose: Pose2D,
        startRow: number,
        stopRow: number,
        startCol: number,
        stopCol: number,
        shiftPoint: Point
    ): boolean {
        for (
            let row = Math.floor(Math.max(0, startRow + shiftPoint.y));
            row < Math.ceil(Math.max(0, stopRow + shiftPoint.y));
            row++
        ) {
            for (
                let col = Math.floor(Math.max(0, startCol + shiftPoint.x));
                col < Math.ceil(Math.max(0, stopCol + shiftPoint.x));
                col++
            ) {
                if (pose.annotationSpaceAvailability.get(`${row}-${col}`)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Get all annotations in active category
     */
    public getAnnotationItems(puzzle: boolean, solution: boolean): AnnotationData[] {
        const annotationItems: AnnotationData[] = [];
        if (puzzle) {
            // Puzzle Annotations
            AnnotationManager.collectAnnotationItems(
                [...this._puzzleAnnotations],
                annotationItems
            );
        }

        // Solution Annotations
        if (solution) {
            AnnotationManager.collectAnnotationItems(
                [...this._solutionAnnotations],
                annotationItems
            );
        }

        return annotationItems;
    }

    /**
     * Flattens the graph of annotation items into an array. Mutates an argument array, which could introduce potential
     * for bugs.
     *
     * @param items a graph of annotations
     * @param arr array to place annotations into
     */
    private static collectAnnotationItems(items: AnnotationData[], arr: AnnotationData[]) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.children.length > 0) {
                arr.push(item);
                AnnotationManager.collectAnnotationItems(item.children, arr);
            } else {
                arr.push(item);
            }
        }
    }

    /**
     * Cleans up annotation data in order for it to include runtime variables
     *
     * @param node annotation of interest
     */
    private static prepareAnnotationNode(node: AnnotationData): AnnotationData {
        const processedNode = {...node};
        // These are runtime properties
        processedNode.visible = true;
        processedNode.selected = false;

        const children: AnnotationData[] = [];
        if (processedNode.children) {
            for (const child of processedNode.children) {
                const cleansedNode = {...child};
                // These are runtime properties
                processedNode.visible = true;
                processedNode.selected = false;
                children.push(AnnotationManager.prepareAnnotationNode(cleansedNode));
            }
        }

        return {
            ...processedNode,
            children
        };
    }

    // Stores the master data for all categories of annotations
    private _structureAnnotations: AnnotationData[] = [];
    private _puzzleAnnotations: AnnotationData[] = [];
    private _solutionAnnotations: AnnotationData[] = [];

    private _structureAnnotationsVisible: boolean = true;
    private _puzzleAnnotationsVisible: boolean = true;
    private _solutionAnnotationsVisible: boolean = true;

    private _selectedItem: AnnotationData | null = null;

    private _toolbarType: ToolbarType;

    public isMovingAnnotation: boolean = false;

    public static readonly ANNOTATION_UNHIGHLIGHTED_OPACITY = 0.5;
    public static readonly DEFAULT_ANNOTATION_SHIFT = 15;
    public static readonly ANNOTATION_PLACEMENT_ITERATION_TIMEOUT = 5;
    public static readonly ANNOTATION_LAYER_THRESHOLD = 2;
    public static readonly CONFLICT_RESOLUTION_OFFSET = 5;
}
