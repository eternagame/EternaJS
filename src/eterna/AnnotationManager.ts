import Eterna from 'eterna/Eterna';
import {RegistrationGroup, UnitSignal, Value} from 'signals';
import {
    Point, Container, Rectangle, Graphics
} from 'pixi.js';
import {ToolbarType} from 'eterna/ui/Toolbar';
import {DisplayUtil} from 'flashbang';
import {v4 as uuidv4} from 'uuid';
import AnnotationPanelItem from './ui/AnnotationPanelItem';
import AnnotationView from './ui/AnnotationView';
import Pose2D from './pose2D/Pose2D';

/**
 * The types of root level categories for annotations
 *
 * The UNDEFINED category is used as a placeholder during
 * the annotation creation process before completion
 */
export enum AnnotationCategory {
    STRUCTURE = 'Structure',
    PUZZLE = 'Puzzle',
    SOLUTION = 'Solution',
    UNDEFINED = 'Undefined'
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
 * Manages annotation placement at runtime (not for storage purposes)
 */
export interface AnnotationDisplayObject {
    data: AnnotationData;
    type: AnnotationHierarchyType;
    positions: AnnotationPosition[];
    views: AnnotationView[];
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
 * Represents a positon conflict betwwen two annotations
 */
export interface AnnotationPositionConflict {
    bounds: Rectangle;
    placement: AnnotationPlacement;
}

export default class AnnotationManager {
    // Signals a the process to create a new annotation with the necessary initial data
    public readonly onCreateAnnotation: Value<AnnotationArguments> = new Value<AnnotationArguments>({ranges: []});
    // Signals that an annotation has been selected
    public readonly onToggleItemSelection: Value<AnnotationData> = new Value<AnnotationData>({
        id: '',
        category: AnnotationCategory.PUZZLE,
        type: AnnotationHierarchyType.ANNOTATION,
        playerID: Eterna.playerID,
        title: '',
        positions: [],
        children: []
    });

    // Signals that an annotation should be edited (reveal AnnotationDialog)
    public readonly onEditAnnotation: Value<AnnotationData | null> = new Value<AnnotationData | null>(null);
    // Signals to clear highlights placed on bases upon annotation selection or hover
    public readonly onClearHighlights = new UnitSignal();
    // Signals to set highlights placed on bases upon annotation selection or hover
    public readonly onSetHighlights: Value<AnnotationRange[] | null> = new Value<AnnotationRange[] | null>(null);
    // Signals to recompute annotation space availability in the puzzle
    public readonly onRecomputeSpaceAvailability = new UnitSignal();
    // Signals to redraw puzzle
    public readonly onTriggerRedraw = new UnitSignal();
    // Signals to save annotations
    public readonly onTriggerSave = new UnitSignal();
    // Signals to adjust the opacity of the bases in the puzzle to a desired number
    public readonly onAdjustBasesOpacity: Value<number> = new Value<number>(1);
    // Signals to adjust the opacity of the annotations in the puzzle to a desired number
    public readonly onAdjustAnnotationCanvasOpacity: Value<number> = new Value<number>(1);
    // Signals to clear the annotation views in the puzzle
    public readonly onClearAnnotationCanvas = new UnitSignal();
    // Signals to place a new annotation view in the puzzle
    public readonly onAddAnnotationView: Value<AnnotationView | null> = new Value<AnnotationView | null>(null);
    // Signals to update the Annotation Panel
    public readonly onTriggerPanelUpdate = new UnitSignal();
    // Signals to upate the puzzle pose/s
    public readonly onTriggerPoseUpdate = new UnitSignal();

    constructor(toolbarType: ToolbarType) {
        this._toolbarType = toolbarType;
        this.regs.add(Eterna.settings.annotationModeActive.connectNotify((value) => {
            this.annotationModeActive = value;
        }));
    }

    /**
     * Initiates the annotation creation process
     *
     * @param ranges the set of ranges associated with the new annotation
     */
    public createAnnotation(ranges: AnnotationRange[]) {
        // Inform listener to expose annotation dialog
        this.onCreateAnnotation.value = {
            ranges
        };
    }

    /**
     * Completes the annotation creation process
     *
     * @param annotation the total annotation data
     * @param type the category of annotation being created
     */
    public addAnnotation(annotation: AnnotationData, category: AnnotationCategory) {
        if (annotation.type !== AnnotationHierarchyType.ANNOTATION) {
            return;
        }

        if (annotation.category === AnnotationCategory.UNDEFINED) {
            annotation.category = this.activeCategory;
        }

        if (category === AnnotationCategory.PUZZLE) {
            if (annotation.layerId) {
                for (const child of this._puzzleAnnotations) {
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
                this._puzzleAnnotations.push({
                    ...annotation,
                    visible: true,
                    selected: false
                });
            }
        } else if (category === AnnotationCategory.SOLUTION) {
            if (annotation.layerId) {
                for (const child of this._solutionAnnotations) {
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
                this._solutionAnnotations.push({
                    ...annotation,
                    visible: true,
                    selected: false
                });
            }
        }

        this.onTriggerPanelUpdate.emit();
        this.onTriggerPoseUpdate.emit();
    }

    /**
     * Inserts a new empty layer into the active category
     */
    public createNewLayer() {
        const newLayer: AnnotationData = {
            id: uuidv4(),
            type: AnnotationHierarchyType.LAYER,
            category: this.activeCategory,
            title: 'Untitled Layer',
            timestamp: (new Date()).getTime(),
            children: [],
            playerID: Eterna.playerID,
            visible: true,
            selected: false,
            positions: []
        };

        if (this.activeCategory === AnnotationCategory.PUZZLE) {
            // Place new layer in puzzle category
            let layerIndex = 0;
            for (let i = 0; i < this._puzzleAnnotations.length; i++) {
                // We want the index of first "layerless" annotation
                // Which will be where we insert new layer
                if (this._puzzleAnnotations[i].type === AnnotationHierarchyType.ANNOTATION) {
                    layerIndex = i;
                    break;
                }

                // There are no "layerless" annotations
                // But we reached last layer
                // Grab last index
                if (i === this._puzzleAnnotations.length - 1) {
                    layerIndex = i;
                }
            }

            this._puzzleAnnotations.splice(layerIndex, 0, newLayer);
        } else if (
            this._toolbarType === ToolbarType.LAB
            || this._toolbarType === ToolbarType.PUZZLE
        ) {
            // Place new layer in solution category
            let layerIndex = 0;
            for (let i = 0; i < this._solutionAnnotations.length; i++) {
                // We want the index of first "layerless" annotation
                // Which will be where we insert new layer
                if (this._solutionAnnotations[i].type === AnnotationHierarchyType.ANNOTATION) {
                    layerIndex = i;
                    break;
                }

                // There are no "layerless" annotations
                // But we reached last layer
                // Grab last index
                if (i === this._solutionAnnotations.length - 1) {
                    layerIndex = i;
                }
            }

            this._solutionAnnotations.splice(layerIndex, 0, newLayer);
        }

        this.onTriggerPanelUpdate.emit();
        this.onTriggerPoseUpdate.emit();
    }

    /**
     * Edits an annotation through replacement
     *
     * @param annotation edited annotation
     */
    public editAnnotation(annotation: AnnotationData): void {
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
                        layerChildren[i] = {
                            ...annotation
                        };
                    }
                }
            }
        } else {
            for (let i = 0; i < categoryData.length; i++) {
                if (categoryData[i].id === annotation.id) {
                    categoryData[i] = {
                        ...annotation
                    };
                }
            }
        }

        this.onTriggerPanelUpdate.emit();
        this.onTriggerPoseUpdate.emit();
    }

    /**
     * Deletes an annotation
     *
     * @param annotation annotation to delete
     */
    public deleteAnnotation(annotation: AnnotationData): void {
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
                        layerChildren.splice(i, 1);
                    }
                }
            }
        } else {
            for (let i = 0; i < categoryData.length; i++) {
                if (categoryData[i].id === annotation.id) {
                    categoryData.splice(i, 1);
                }
            }
        }

        this.onTriggerPanelUpdate.emit();
        this.onTriggerPoseUpdate.emit();
    }

    /**
     * Modifies the selection state of an annotation
     *
     * @param annotation total data of annotation of interest
     * @param isSelected desired selection value
     */
    public setAnnotationSelection(annotation: AnnotationPanelItem | AnnotationData, isSelected: boolean): void {
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
                        layerChildren[i].selected = isSelected;
                    }
                }
            }
        } else {
            for (let i = 0; i < categoryData.length; i++) {
                if (categoryData[i].id === annotation.id) {
                    categoryData[i].selected = isSelected;
                }
            }
        }

        this.onTriggerPoseUpdate.emit();
    }

    /**
     * Modifies the visibility state of an annotation
     *
     * @param annotation total data of annotation of interest
     * @param isVisible desired visibility value
     */
    public setAnnotationVisibility(annotation: AnnotationPanelItem, isVisible: boolean): void {
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
                        layerChildren[i].visible = isVisible;
                    }
                }
            }
        } else {
            for (let i = 0; i < categoryData.length; i++) {
                if (categoryData[i].id === annotation.id) {
                    categoryData[i].visible = isVisible;
                }
            }
        }

        this.onTriggerPoseUpdate.emit();
    }

    /**
     * Sets the position of a single annotation view associated with an annotation
     * An annotation with multiple ranges would have multiple positions
     *
     * @param annotation total data of annotation of interest
     * @param index index of relevant annotation view associated with annotation
     * @param position new position
     */
    public setAnnotationPositions(annotation: AnnotationData, index: number, position: AnnotationPosition) {
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
                    const positions = layerChildren[i].positions;
                    if (layerChildren[i].id === annotation.id && positions) {
                        positions[index] = position;
                    }
                }
            }
        } else {
            for (let i = 0; i < categoryData.length; i++) {
                const positions = categoryData[i].positions;
                if (categoryData[i].id === annotation.id && positions) {
                    positions[index] = position;
                }
            }
        }
    }

    /**
     * Rerenders all annotation views in a given puzzle pose
     *
     * @param pose puzzle pose of interest
     * @param reset whether to recalculate the positions of all annotations
     * @param ignoreCustom whether to override the custom
     */
    public refreshAnnotations(pose: Pose2D, reset: boolean = false, ignoreCustom: boolean = false) {
        this.eraseAnnotations(reset, ignoreCustom);
        this.drawAnnotations(pose);
    }

    /**
     * Recomputes the display objects of all annotations and layers
     *
     * @param pose puzzle pose of interest
     */
    public updateAnnotationViews(pose: Pose2D): void {
        this.onClearHighlights.emit();

        const generateDisplayObjects = (
            items: AnnotationData[],
            type: AnnotationHierarchyType
        ): AnnotationDisplayObject[] => {
            const displayObjects: AnnotationDisplayObject[] = [];
            for (const item of items) {
                if (item.positions) {
                    // Keep existing positions in case we have custom positioning
                    displayObjects.push({
                        data: item,
                        type,
                        positions: item.positions,
                        views: []
                    });
                } else {
                    displayObjects.push({
                        data: item,
                        type,
                        positions: [],
                        views: []
                    });
                }

                if (item.selected && item.visible && item.ranges) {
                    // Single Annotation
                    this.onSetHighlights.value = item.ranges;
                    this.onSetHighlights.value = null;
                } else if (item.selected && item.visible && item.children.length > 0) {
                    // Layer (multiple annotations)
                    const ranges: AnnotationRange[] = [];
                    item.children.forEach((child: AnnotationData) => {
                        if (child.ranges) {
                            ranges.push(...child.ranges);
                        }
                    });
                    if (ranges.length > 0) {
                        this.onSetHighlights.value = ranges;
                        this.onSetHighlights.value = null;
                    }
                }
            }

            return displayObjects;
        };

        const updatedLayers = generateDisplayObjects(
            this.allLayers,
            AnnotationHierarchyType.LAYER
        );
        const updatedAnnotations = generateDisplayObjects(
            this.allAnnotations,
            AnnotationHierarchyType.ANNOTATION
        );
        this._annotations = updatedAnnotations;
        this._layers = updatedLayers;

        this.onRecomputeSpaceAvailability.emit();
        this.refreshAnnotations(pose, true);
    }

    /**
     * Discards all annotation views
     *
     * @param reset whether to recalculate the positions of all annotations
     * @param ignoreCustom whether to override the custom
     */
    public eraseAnnotations(reset: boolean = false, ignoreCustom: boolean = false): void {
        // Clear prior annotation displays
        this._annotations.forEach((annotation) => {
            annotation.views.forEach((view) => view.destroySelf);
            annotation.views = [];
        });

        this._resetAnnotationPositions = reset;
        this._ignoreCustomAnnotationPositions = ignoreCustom;

        this.onClearAnnotationCanvas.emit();
    }

    /**
     * Draws all annotation views in a given puzzle pose
     *
     * @param pose puzzle pose of interest
     */
    public drawAnnotations(pose: Pose2D): void {
        /**
         * Generates an AnnotationView to be placed in puzzle pose
         *
         * @param item display object to be made into a view
         */
        const getAnnotationView = (item: AnnotationDisplayObject): AnnotationView => {
            let textColor;
            switch (item.data.category) {
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
                item.type,
                item.data,
                this.activeCategory,
                textColor
            );

            if (item.data.visible) {
                view.pointerOver.connect(() => {
                    // highlight associated range
                    if (item.type === AnnotationHierarchyType.ANNOTATION) {
                        const annotation = item.data as AnnotationData;
                        if (annotation.ranges) {
                            this.onSetHighlights.value = annotation.ranges;
                            this.onSetHighlights.value = null;
                        }
                    } else if (item.type === AnnotationHierarchyType.LAYER) {
                        const layer = item.data as AnnotationData;
                        let ranges: AnnotationRange[] = [];
                        for (const annotation of layer.children) {
                            if (annotation.ranges) {
                                ranges = ranges.concat(annotation.ranges);
                            }
                        }
                        this.onSetHighlights.value = ranges;
                        this.onSetHighlights.value = null;
                    }
                });
                view.pointerOut.connect(() => {
                    // remove associated range
                    if (!item.data.selected) {
                        this.onClearHighlights.emit();
                    }
                });

                view.pointerDown.connect(() => {
                    this.onToggleItemSelection.value = item.data as AnnotationData;
                });
                view.isMoving.connect((moving: boolean) => {
                    this.isMovingAnnotation = moving;
                });

                if (item.type === AnnotationHierarchyType.ANNOTATION) {
                    // We don't need to apply access control logic here
                    // This is handled in AnnotationView
                    view.onEditButtonPressed.connect(() => {
                        this.setAnnotationSelection(item.data, false);
                        this.onEditAnnotation.value = item.data as AnnotationData;
                        this.onEditAnnotation.value = null;
                    });
                }
            }

            return view;
        };

        /**
         * Attempts to place a single annotation item
         *
         * @param item display object data with positioning and annotation metadata
         * @param itemIndex index of item within parent array
         */
        const placeItem = (item: AnnotationDisplayObject, itemIndex: number): void => {
            // If annotation positions have been computed already
            // use cached value
            if (
                item.positions.length > 0
                && !this._resetAnnotationPositions
                && !this._ignoreCustomAnnotationPositions
            ) {
                for (let i = 0; i < item.positions.length; i++) {
                    const position = item.positions[i];
                    const view = getAnnotationView(item);
                    if (item.type === AnnotationHierarchyType.ANNOTATION) {
                        view.onMovedAnnotation.connect((point: Point) => {
                            const anchorIndex = this._annotations[itemIndex].positions[i].anchorIndex;
                            const base = pose.getBase(anchorIndex);
                            const anchorPoint = new Point(
                                base.x + pose.xOffset,
                                base.y + pose.yOffset
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

                            this.setAnnotationPositions(item.data, i, movedPosition);
                            this.onTriggerSave.emit();
                        });
                    }
                    item.views.push(view);
                    this.onAddAnnotationView.value = view;

                    const anchorIndex = position.anchorIndex;
                    const base = pose.getBase(anchorIndex);
                    const anchorPoint = new Point(
                        base.x + pose.xOffset,
                        base.y + pose.yOffset
                    );
                    view.display.position = new Point(
                        position.relPosition.x + anchorPoint.x,
                        position.relPosition.y + anchorPoint.y
                    );
                }

                return;
            }

            let ranges: AnnotationRange[] = [];
            if (item.type === AnnotationHierarchyType.LAYER) {
                // We only want one layer label for each item, so we pick the first range we find
                //
                // An improvement that could be made is to find the
                // "center of mass" of all the ranges in a layer
                // and place the layer label at an appropriate base closest to
                // the center of mass point
                const layerData = item.data as AnnotationData;

                if (layerData.children) {
                    for (const annotation of layerData.children) {
                        if (annotation.ranges) {
                            ranges.push(annotation.ranges[0]);
                            break;
                        }
                    }
                }
            } else {
                const annotationData = item.data as AnnotationData;
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
                const prevPosition = item.positions.length > i ? item.positions[i] : null;
                const view = getAnnotationView(item);
                if (item.type === AnnotationHierarchyType.ANNOTATION) {
                    view.onMovedAnnotation.connect((point: Point) => {
                        const anchorIndex = this._annotations[itemIndex].positions[i].anchorIndex;
                        const base = pose.getBase(anchorIndex);
                        const anchorPoint = new Point(
                            base.x + pose.xOffset,
                            base.y + pose.yOffset
                        );
                        // Compute relative position
                        const movedPosition: AnnotationPosition = {
                            ...this._annotations[itemIndex].positions[i],
                            relPosition: new Point(
                                point.x - anchorPoint.x,
                                point.y - anchorPoint.y
                            ),
                            custom: true
                        };

                        this.setAnnotationPositions(item.data, i, movedPosition);
                        this.onTriggerSave.emit();
                    });
                }
                // We need to prematruely add this to the display object graph
                // so that we can read it's dimensions/position
                this.onAddAnnotationView.value = view;

                let absolutePosition: Point | null = null;
                let relPosition: Point | null = null;
                let anchorIndex: number | null = null;
                let customPosition = false;
                let zoomLevel: number = pose.zoomLevel;
                if (prevPosition?.custom && !this._ignoreCustomAnnotationPositions) {
                    relPosition = prevPosition.relPosition;
                    anchorIndex = prevPosition.anchorIndex;
                    const base = pose.getBase(anchorIndex);
                    const zoomScaling = 1
                    + 2 * ((prevPosition.zoomLevel - pose.zoomLevel) / Pose2D.ZOOM_SPACINGS.length);
                    const anchorPoint = new Point(
                        base.x + pose.xOffset,
                        base.y + pose.yOffset
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
                    if (anchorIndex >= pose.sequenceLength - 1) continue;
                    const base = pose.getBase(anchorIndex);
                    const anchorPoint = new Point(
                        base.x + pose.xOffset,
                        base.y + pose.yOffset
                    );

                    // Run a search to find best place to locate
                    // annotation within available space
                    relPosition = this.computeAnnotationPositionPoint(
                        pose,
                        anchorIndex,
                        anchorIndex,
                        anchorPoint,
                        base.display,
                        view,
                        0
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
                    view.display.position = absolutePosition;
                    // Save display
                    item.views.push(view);

                    // Cache position
                    this.setAnnotationPositions(item.data, i, {
                        anchorIndex,
                        relPosition,
                        zoomLevel,
                        custom: customPosition
                    });
                } else {
                    // We should ideally always receive a position
                    //
                    // In cases we dont, remove annotation card from view
                    view.destroySelf();
                }
            }
        };

        if (pose.zoomLevel > AnnotationManager.ANNOTATION_LAYER_THRESHOLD) {
            // visualize layers
            for (let i = 0; i < this._layers.length; i++) {
                placeItem(this._layers[i], i);
            }
        } else {
            // visualize annotations
            for (let i = 0; i < this._annotations.length; i++) {
                placeItem(this._annotations[i], i);
            }
        }

        // Make canvas translucent if we have annotation mode active
        if (this._annotationModeActive) {
            this.onAdjustAnnotationCanvasOpacity.value = AnnotationManager.ANNOTATION_UNHIGHLIGHTED_OPACITY;
        } else {
            this.onAdjustAnnotationCanvasOpacity.value = 1;
        }

        this._resetAnnotationPositions = false;
    }

    /**
     * Searches for spot in available space around annnotation range
     * to place annotation card
     *
     * Runs a recursive/iterative search on each place defined about the co-ordinate
     * system with the anchor point as the origin until it finds a place
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
        includeCenters: boolean = true
    ): Point | null {
        // DEBUG SETTINGS:
        // In order to visualize placement conflicts, you can toggle these variables
        // RED RECTANGLES = Placement conflicts with bases
        // ORANGE RECTANGLES = Placement conflicts with existing annotations
        // GREEN RECTANGLES = Placement availability
        const DEBUG_ANNOTATION_PLACEMENT = false;
        const DEBUG_FROM_SEARCH_ATTEMPT = 0;
        const BASE_CONFLICT_COLOR = 0xFF0000;
        const ANNOTATION_CONFLICT_COLOR = 0xFF6500;
        const POSSIBLE_PLACEMENT_AVAILABILITY_COLOR = 0x00FF00;

        // x and y offsets that create space between annotations
        const xOffset: number = AnnotationManager.DEFAULT_ANNOTATION_SHIFT;
        const yOffset = 0;

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
         * @return array of occupied places
         */
        const findBaseConflicts = (): AnnotationBaseConflicts => {
            /**
             * Inspects a particular place for placement availability
             *
             * @param startRow pixel row from which to begin vertical inspection
             * @param stopRow pixel row from which to end vertical inspection
             * @param startCol pixel column from which to begin horizontal inspection
             * @param stopCol pixel column from which to end horizontal inspection
             */
            const inspectRegion = (
                startRow: number,
                stopRow: number,
                startCol: number,
                stopCol: number
            ): AnnotationBaseConflict | null => {
                let conflict: AnnotationBaseConflict | null = null;
                for (let row = Math.floor(
                    Math.min(Math.max(0, startRow), pose.annotationSpaceAvailability.length)
                );
                    row < Math.ceil(
                        Math.min(Math.max(0, stopRow), pose.annotationSpaceAvailability.length)
                    );
                    row++) {
                    for (let col = Math.floor(
                        Math.min(Math.max(0, startCol), pose.annotationSpaceAvailability[0].length)
                    );
                        col < Math.ceil(
                            Math.min(Math.max(0, stopCol), pose.annotationSpaceAvailability[0].length)
                        );
                        col++) {
                        // build out conflict bounds
                        if (!pose.annotationSpaceAvailability[row][col] && !conflict) {
                            conflict = {
                                bounds: new Rectangle(
                                    col,
                                    row,
                                    1,
                                    1
                                ),
                                resolvable: false
                            };
                        } else if (!pose.annotationSpaceAvailability[row][col] && conflict) {
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
            };

            /**
             * Searches for any corrections (minor position shifts) that could be applied
             * to resolve a placement conflict
             *
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
            const testForConflictCorrection = (
                conflict: AnnotationBaseConflict,
                startRow: number,
                stopRow: number,
                startCol: number,
                stopCol: number,
                testUp: boolean,
                testDown: boolean,
                testLeft: boolean,
                testRight: boolean
            ): Point | null => {
                const CONFLICT_RESOLUTION_OFFSET = 5;
                const neighboringSpaceVacant = (
                    xShift: number,
                    yShift: number
                ): boolean => {
                    for (let row = Math.floor(
                        Math.min(
                            Math.max(0, startRow + yShift),
                            pose.annotationSpaceAvailability.length
                        )
                    );
                        row < Math.ceil(
                            Math.min(
                                Math.max(0, stopRow + yShift),
                                pose.annotationSpaceAvailability.length
                            )
                        );
                        row++) {
                        const startPixel = Math.floor(
                            Math.min(
                                Math.max(0, startCol + xShift),
                                pose.annotationSpaceAvailability[0].length
                            )
                        );
                        const stopPixel = Math.ceil(
                            Math.min(
                                Math.max(0, stopCol + xShift),
                                pose.annotationSpaceAvailability[0].length
                            )
                        );
                        const pixels = pose.annotationSpaceAvailability[row].slice(startPixel, stopPixel);
                        const occupiedPixelIndex = pixels.findIndex((pixel: boolean) => !pixel);
                        if (occupiedPixelIndex !== -1) {
                            return false;
                        }
                    }

                    return true;
                };

                let resolveMovingUp = testUp;
                if (testUp) {
                    resolveMovingUp = neighboringSpaceVacant(
                        0,
                        -conflict.bounds.height - CONFLICT_RESOLUTION_OFFSET
                    );

                    if (resolveMovingUp) {
                        return new Point(
                            0,
                            -conflict.bounds.height - CONFLICT_RESOLUTION_OFFSET
                        );
                    }
                }

                let resolveMovingDown = testDown;
                if (testDown) {
                    resolveMovingDown = neighboringSpaceVacant(
                        0,
                        conflict.bounds.height + CONFLICT_RESOLUTION_OFFSET
                    );

                    if (resolveMovingDown) {
                        return new Point(
                            0,
                            conflict.bounds.height + CONFLICT_RESOLUTION_OFFSET
                        );
                    }
                }

                let resolveMovingLeft = testLeft;
                if (testLeft) {
                    resolveMovingLeft = neighboringSpaceVacant(
                        -conflict.bounds.width - CONFLICT_RESOLUTION_OFFSET,
                        0
                    );

                    if (resolveMovingLeft) {
                        return new Point(
                            -conflict.bounds.width - CONFLICT_RESOLUTION_OFFSET,
                            0
                        );
                    }
                }

                let resolveMovingRight = testRight;
                if (testRight) {
                    resolveMovingRight = neighboringSpaceVacant(
                        conflict.bounds.width + CONFLICT_RESOLUTION_OFFSET,
                        0
                    );

                    if (resolveMovingRight) {
                        return new Point(
                            conflict.bounds.width + CONFLICT_RESOLUTION_OFFSET,
                            0
                        );
                    }
                }

                let resolveMovingUpLeft = testUp && testLeft;
                if (testUp && testLeft) {
                    resolveMovingUpLeft = neighboringSpaceVacant(
                        -conflict.bounds.width - CONFLICT_RESOLUTION_OFFSET,
                        -conflict.bounds.height - CONFLICT_RESOLUTION_OFFSET
                    );

                    if (resolveMovingUpLeft) {
                        return new Point(
                            -conflict.bounds.width - CONFLICT_RESOLUTION_OFFSET,
                            -conflict.bounds.height - CONFLICT_RESOLUTION_OFFSET
                        );
                    }
                }

                let resolveMovingUpRight = testUp && testRight;
                if (testUp && testRight) {
                    resolveMovingUpRight = neighboringSpaceVacant(
                        conflict.bounds.width + CONFLICT_RESOLUTION_OFFSET,
                        -conflict.bounds.height - CONFLICT_RESOLUTION_OFFSET
                    );

                    if (resolveMovingUpRight) {
                        return new Point(
                            conflict.bounds.width + CONFLICT_RESOLUTION_OFFSET,
                            -conflict.bounds.height - CONFLICT_RESOLUTION_OFFSET
                        );
                    }
                }

                let resolveMovingDownLeft = testDown && testLeft;
                if (testDown && testLeft) {
                    resolveMovingDownLeft = neighboringSpaceVacant(
                        -conflict.bounds.width - CONFLICT_RESOLUTION_OFFSET,
                        conflict.bounds.height + CONFLICT_RESOLUTION_OFFSET
                    );

                    if (resolveMovingDownLeft) {
                        return new Point(
                            -conflict.bounds.width - CONFLICT_RESOLUTION_OFFSET,
                            conflict.bounds.height + CONFLICT_RESOLUTION_OFFSET
                        );
                    }
                }

                let resolveMovingDownRight = testDown && testRight;
                if (testDown && testRight) {
                    resolveMovingDownRight = neighboringSpaceVacant(
                        conflict.bounds.width + CONFLICT_RESOLUTION_OFFSET,
                        conflict.bounds.height + CONFLICT_RESOLUTION_OFFSET
                    );

                    if (resolveMovingDownRight) {
                        return new Point(
                            conflict.bounds.width + CONFLICT_RESOLUTION_OFFSET,
                            conflict.bounds.height + CONFLICT_RESOLUTION_OFFSET
                        );
                    }
                }

                return null;
            };

            let topLeftConflict: AnnotationBaseConflict | null = null;
            let topCenterConflict: AnnotationBaseConflict | null = null;
            let topRightConflict: AnnotationBaseConflict | null = null;
            let leftCenterConflict: AnnotationBaseConflict | null = null;
            let rightCenterConflict: AnnotationBaseConflict | null = null;
            let bottomLeftConflict: AnnotationBaseConflict | null = null;
            let bottomCenterConflict: AnnotationBaseConflict | null = null;
            let bottomRightConflict: AnnotationBaseConflict | null = null;

            // Get base layer bounds relative to Pose2D container
            const baseLayerBounds = DisplayUtil.getBoundsRelative(pose.baseLayer, pose.container);

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
            // - Right Column = Top Rigth, Bottom right, Right Center
            const startCenterRow = anchorBaseY - annotationView.height / 2;
            const stopCenterRow = anchorBaseY + annotationView.height / 2;
            const startCenterColumn = anchorBaseX - annotationView.width / 2 + anchorDisplay.width / 2;
            const stopCenterColumn = anchorBaseX + annotationView.width / 2 + anchorDisplay.width / 2;
            const startTopRow = anchorBaseY - anchorDisplay.height / 2 - (yOffset + annotationView.height);
            const stopTopRow = anchorBaseY - anchorDisplay.height / 2 - yOffset;
            const startLeftColumn = anchorBaseX - (xOffset + annotationView.width);
            const stopLeftColumn = anchorBaseX - xOffset;
            const startBottomRow = anchorBaseY + anchorDisplay.height / 2 + yOffset;
            const stopBottomRow = anchorBaseY + anchorDisplay.height / 2 + yOffset + annotationView.height;
            const startRightColumn = anchorBaseX + anchorDisplay.width + xOffset;
            const stopRightColumn = anchorBaseX + anchorDisplay.width + xOffset + annotationView.width;

            // Top Left
            topLeftConflict = inspectRegion(
                startTopRow,
                stopTopRow,
                startLeftColumn,
                stopLeftColumn
            );

            // determine if any conflict is resolvable
            if (topLeftConflict) {
                if (DEBUG_ANNOTATION_PLACEMENT) {
                    const debugRect = new Graphics().lineStyle(1, BASE_CONFLICT_COLOR).drawRect(
                        baseLayerBounds.x + topLeftConflict.bounds.x,
                        baseLayerBounds.y + topLeftConflict.bounds.y,
                        topLeftConflict.bounds.width,
                        topLeftConflict.bounds.height
                    );
                    if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                        pose.baseLayer.addChild(debugRect);
                    }
                }

                const correction = testForConflictCorrection(
                    topLeftConflict,
                    startTopRow,
                    stopTopRow,
                    startLeftColumn,
                    stopLeftColumn,
                    true,
                    false,
                    true,
                    false
                );

                if (correction) {
                    topLeftConflict.resolvable = true;
                    topLeftConflict.correction = correction;
                }
            } else if (DEBUG_ANNOTATION_PLACEMENT) {
                const debugRect = new Graphics().lineStyle(1, POSSIBLE_PLACEMENT_AVAILABILITY_COLOR).drawRect(
                    startLeftColumn + baseLayerBounds.x,
                    startTopRow + baseLayerBounds.y,
                    annotationView.width,
                    annotationView.height
                );
                if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                    pose.baseLayer.addChild(debugRect);
                }
            }

            // Top Center
            topCenterConflict = inspectRegion(
                startTopRow,
                stopTopRow,
                startCenterColumn,
                stopCenterColumn
            );

            // determine if any conflict is resolvable
            if (topCenterConflict) {
                if (DEBUG_ANNOTATION_PLACEMENT) {
                    const debugRect = new Graphics().lineStyle(1, BASE_CONFLICT_COLOR).drawRect(
                        baseLayerBounds.x + topCenterConflict.bounds.x,
                        baseLayerBounds.y + topCenterConflict.bounds.y,
                        topCenterConflict.bounds.width,
                        topCenterConflict.bounds.height
                    );
                    if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                        pose.baseLayer.addChild(debugRect);
                    }
                }

                const correction = testForConflictCorrection(
                    topCenterConflict,
                    startTopRow,
                    stopTopRow,
                    startCenterColumn,
                    stopCenterColumn,
                    true,
                    false,
                    false,
                    false
                );

                if (correction) {
                    topCenterConflict.resolvable = true;
                    topCenterConflict.correction = correction;
                }
            } else if (DEBUG_ANNOTATION_PLACEMENT) {
                const debugRect = new Graphics().lineStyle(1, POSSIBLE_PLACEMENT_AVAILABILITY_COLOR).drawRect(
                    startCenterColumn + baseLayerBounds.x,
                    startTopRow + baseLayerBounds.y,
                    annotationView.width,
                    annotationView.height
                );
                if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                    pose.baseLayer.addChild(debugRect);
                }
            }

            // Top Right
            topRightConflict = inspectRegion(
                startTopRow,
                stopTopRow,
                startRightColumn,
                stopRightColumn
            );

            // determine if any conflict is resolvable
            if (topRightConflict) {
                if (DEBUG_ANNOTATION_PLACEMENT) {
                    const debugRect = new Graphics().lineStyle(1, BASE_CONFLICT_COLOR).drawRect(
                        baseLayerBounds.x + topRightConflict.bounds.x,
                        baseLayerBounds.y + topRightConflict.bounds.y,
                        topRightConflict.bounds.width,
                        topRightConflict.bounds.height
                    );
                    if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                        pose.baseLayer.addChild(debugRect);
                    }
                }

                const correction = testForConflictCorrection(
                    topRightConflict,
                    startTopRow,
                    stopTopRow,
                    startRightColumn,
                    stopRightColumn,
                    true,
                    false,
                    false,
                    true
                );

                if (correction) {
                    topRightConflict.resolvable = true;
                    topRightConflict.correction = correction;
                }
            } else if (DEBUG_ANNOTATION_PLACEMENT) {
                const debugRect = new Graphics().lineStyle(1, POSSIBLE_PLACEMENT_AVAILABILITY_COLOR).drawRect(
                    startRightColumn + baseLayerBounds.x,
                    startTopRow + baseLayerBounds.y,
                    annotationView.width,
                    annotationView.height
                );
                if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                    pose.baseLayer.addChild(debugRect);
                }
            }

            // Left Center
            leftCenterConflict = inspectRegion(
                startCenterRow,
                stopCenterRow,
                startLeftColumn,
                stopLeftColumn
            );

            // determine if any conflict is resolvable
            if (leftCenterConflict) {
                if (DEBUG_ANNOTATION_PLACEMENT) {
                    const debugRect = new Graphics().lineStyle(1, BASE_CONFLICT_COLOR).drawRect(
                        baseLayerBounds.x + leftCenterConflict.bounds.x,
                        baseLayerBounds.y + leftCenterConflict.bounds.y,
                        leftCenterConflict.bounds.width,
                        leftCenterConflict.bounds.height
                    );
                    if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                        pose.baseLayer.addChild(debugRect);
                    }
                }

                const correction = testForConflictCorrection(
                    leftCenterConflict,
                    startCenterRow,
                    stopCenterRow,
                    startLeftColumn,
                    stopLeftColumn,
                    false,
                    false,
                    true,
                    false
                );

                if (correction) {
                    leftCenterConflict.resolvable = true;
                    leftCenterConflict.correction = correction;
                }
            } else if (DEBUG_ANNOTATION_PLACEMENT) {
                const debugRect = new Graphics().lineStyle(1, POSSIBLE_PLACEMENT_AVAILABILITY_COLOR).drawRect(
                    startLeftColumn + baseLayerBounds.x,
                    startCenterRow + baseLayerBounds.y,
                    annotationView.width,
                    annotationView.height
                );
                if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                    pose.baseLayer.addChild(debugRect);
                }
            }

            // Right Center
            rightCenterConflict = inspectRegion(
                startCenterRow,
                stopCenterRow,
                startRightColumn,
                stopRightColumn
            );

            // determine if any conflict is resolvable
            if (rightCenterConflict) {
                if (DEBUG_ANNOTATION_PLACEMENT) {
                    const debugRect = new Graphics().lineStyle(1, BASE_CONFLICT_COLOR).drawRect(
                        baseLayerBounds.x + rightCenterConflict.bounds.x,
                        baseLayerBounds.y + rightCenterConflict.bounds.y,
                        rightCenterConflict.bounds.width,
                        rightCenterConflict.bounds.height
                    );
                    if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                        pose.baseLayer.addChild(debugRect);
                    }
                }

                const correction = testForConflictCorrection(
                    rightCenterConflict,
                    startCenterRow,
                    stopCenterRow,
                    startRightColumn,
                    stopRightColumn,
                    false,
                    false,
                    false,
                    true
                );

                if (correction) {
                    rightCenterConflict.resolvable = true;
                    rightCenterConflict.correction = correction;
                }
            } else if (DEBUG_ANNOTATION_PLACEMENT) {
                const debugRect = new Graphics().lineStyle(1, POSSIBLE_PLACEMENT_AVAILABILITY_COLOR).drawRect(
                    startRightColumn + baseLayerBounds.x,
                    startCenterRow + baseLayerBounds.y,
                    annotationView.width,
                    annotationView.height
                );
                if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                    pose.baseLayer.addChild(debugRect);
                }
            }

            // Bottom Right
            bottomRightConflict = inspectRegion(
                startBottomRow,
                stopBottomRow,
                startRightColumn,
                stopRightColumn
            );

            // determine if any conflict is resolvable
            if (bottomRightConflict) {
                if (DEBUG_ANNOTATION_PLACEMENT) {
                    const debugRect = new Graphics().lineStyle(1, BASE_CONFLICT_COLOR).drawRect(
                        baseLayerBounds.x + bottomRightConflict.bounds.x,
                        baseLayerBounds.y + bottomRightConflict.bounds.y,
                        bottomRightConflict.bounds.width,
                        bottomRightConflict.bounds.height
                    );
                    if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                        pose.baseLayer.addChild(debugRect);
                    }
                }

                const correction = testForConflictCorrection(
                    bottomRightConflict,
                    startBottomRow,
                    stopBottomRow,
                    startRightColumn,
                    stopRightColumn,
                    false,
                    true,
                    false,
                    true
                );

                if (correction) {
                    bottomRightConflict.resolvable = true;
                    bottomRightConflict.correction = correction;
                }
            } else if (DEBUG_ANNOTATION_PLACEMENT) {
                const debugRect = new Graphics().lineStyle(1, POSSIBLE_PLACEMENT_AVAILABILITY_COLOR).drawRect(
                    startRightColumn + baseLayerBounds.x,
                    startBottomRow + baseLayerBounds.y,
                    annotationView.width,
                    annotationView.height
                );
                if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                    pose.baseLayer.addChild(debugRect);
                }
            }

            // Bottom Center
            bottomCenterConflict = inspectRegion(
                startBottomRow,
                stopBottomRow,
                startCenterColumn,
                stopCenterColumn
            );

            // determine if any conflict is resolvable
            if (bottomCenterConflict) {
                if (DEBUG_ANNOTATION_PLACEMENT) {
                    const debugRect = new Graphics().lineStyle(1, BASE_CONFLICT_COLOR).drawRect(
                        baseLayerBounds.x + bottomCenterConflict.bounds.x,
                        baseLayerBounds.y + bottomCenterConflict.bounds.y,
                        bottomCenterConflict.bounds.width,
                        bottomCenterConflict.bounds.height
                    );
                    if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                        pose.baseLayer.addChild(debugRect);
                    }
                }

                const correction = testForConflictCorrection(
                    bottomCenterConflict,
                    startBottomRow,
                    stopBottomRow,
                    startCenterColumn,
                    stopCenterColumn,
                    false,
                    true,
                    false,
                    false
                );

                if (correction) {
                    bottomCenterConflict.resolvable = true;
                    bottomCenterConflict.correction = correction;
                }
            } else if (DEBUG_ANNOTATION_PLACEMENT) {
                const debugRect = new Graphics().lineStyle(1, POSSIBLE_PLACEMENT_AVAILABILITY_COLOR).drawRect(
                    startCenterColumn + baseLayerBounds.x,
                    startBottomRow + baseLayerBounds.y,
                    annotationView.width,
                    annotationView.height
                );
                if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                    pose.baseLayer.addChild(debugRect);
                }
            }

            // Bottom Left
            bottomLeftConflict = inspectRegion(
                startBottomRow,
                stopBottomRow,
                startLeftColumn,
                stopLeftColumn
            );

            // determine if any conflict is resolvable
            if (bottomLeftConflict) {
                if (DEBUG_ANNOTATION_PLACEMENT) {
                    const debugRect = new Graphics().lineStyle(1, BASE_CONFLICT_COLOR).drawRect(
                        baseLayerBounds.x + bottomLeftConflict.bounds.x,
                        baseLayerBounds.y + bottomLeftConflict.bounds.y,
                        bottomLeftConflict.bounds.width,
                        bottomLeftConflict.bounds.height
                    );
                    if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                        pose.baseLayer.addChild(debugRect);
                    }
                }

                const correction = testForConflictCorrection(
                    bottomLeftConflict,
                    startBottomRow,
                    stopBottomRow,
                    startLeftColumn,
                    stopLeftColumn,
                    false,
                    true,
                    true,
                    false
                );

                if (correction) {
                    bottomLeftConflict.resolvable = true;
                    bottomLeftConflict.correction = correction;
                }
            } else if (DEBUG_ANNOTATION_PLACEMENT) {
                const debugRect = new Graphics().lineStyle(1, POSSIBLE_PLACEMENT_AVAILABILITY_COLOR).drawRect(
                    startLeftColumn + baseLayerBounds.x,
                    startBottomRow + baseLayerBounds.y,
                    annotationView.width,
                    annotationView.height
                );
                if (numSearchAttempts >= DEBUG_FROM_SEARCH_ATTEMPT) {
                    pose.baseLayer.addChild(debugRect);
                }
            }

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
        };

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
         * @param baseConflicts an object with the conflict (or lack thereof) at each placement region
         * @param includeCentersPosition whether to include central locations as suitable regions
         * @return relative position of existing annotion (if one exists) or null (if position is vacant)
         */
        const findProposedPosition = (
            baseConflicts: AnnotationBaseConflicts,
            includeTopLeft: boolean,
            includeTopCenter: boolean,
            includeTopRight: boolean,
            includeLeftCenter: boolean,
            includeRightCenter: boolean,
            includeBottomLeft: boolean,
            includeBottomCenter: boolean,
            includeBottomRight: boolean
        ): AnnotationPosition | null => {
            // IMPORTANT: The conditional statements that follow
            // have been ordered intentionally to
            // attempt to present the annotations in
            // this specific priority list

            if (
                includeRightCenter
                && !baseConflicts[AnnotationPlacement.RIGHT_CENTER]
            ) {
                // Place at right-center
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        anchorDisplay.width / 2 + xOffset + anchorOffsetX,
                        -annotationView.height / 2 + anchorOffsetY
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.RIGHT_CENTER,
                    custom: false
                };
            }

            if (
                includeLeftCenter
                && !baseConflicts[AnnotationPlacement.LEFT_CENTER]
            ) {
                // Place at left-center
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -anchorDisplay.width / 2 - annotationView.width - xOffset + anchorOffsetX,
                        -annotationView.height / 2 + anchorOffsetY
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.LEFT_CENTER,
                    custom: false
                };
            }

            if (
                includeTopCenter
                && !baseConflicts[AnnotationPlacement.TOP_CENTER]
            ) {
                // Place at top-center
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -annotationView.width / 2 + anchorDisplay.width / 2 + anchorOffsetX,
                        -anchorDisplay.height / 2 - annotationView.height - yOffset + anchorOffsetY
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.TOP_CENTER,
                    custom: false
                };
            }

            if (
                includeBottomCenter
                && !baseConflicts[AnnotationPlacement.BOTTOM_CENTER]
            ) {
                // Place at bottom-center
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -annotationView.width / 2 + anchorDisplay.width / 2 + anchorOffsetX,
                        anchorDisplay.height / 2 + yOffset + anchorOffsetY
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.BOTTOM_CENTER,
                    custom: false
                };
            }

            if (
                includeTopLeft
                && !baseConflicts[AnnotationPlacement.TOP_LEFT]
            ) {
                // Place in top-left
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -anchorDisplay.width / 2 - annotationView.width - xOffset + anchorOffsetX,
                        -anchorDisplay.height / 2 - annotationView.height - yOffset + anchorOffsetY
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.TOP_LEFT,
                    custom: false
                };
            }

            if (
                includeTopRight
                && !baseConflicts[AnnotationPlacement.TOP_RIGHT]
            ) {
                // Place in top-right
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        anchorDisplay.width / 2 + xOffset + anchorOffsetX,
                        -anchorDisplay.height / 2 - annotationView.height - yOffset + anchorOffsetY
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.TOP_RIGHT,
                    custom: false
                };
            }

            if (
                includeBottomLeft
                && !baseConflicts[AnnotationPlacement.BOTTOM_LEFT]
            ) {
                // Place in bottom-left
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -anchorDisplay.width / 2 - annotationView.width - xOffset + anchorOffsetX,
                        anchorDisplay.height / 2 + yOffset + anchorOffsetY
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.BOTTOM_LEFT,
                    custom: false
                };
            }

            if (
                includeBottomRight
                && !baseConflicts[AnnotationPlacement.BOTTOM_RIGHT]
            ) {
                // Place in bottom-right
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        anchorDisplay.width / 2 + xOffset + anchorOffsetX,
                        anchorDisplay.height / 2 + yOffset + anchorOffsetY
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.BOTTOM_RIGHT,
                    custom: false
                };
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

                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        anchorDisplay.width / 2 + xOffset + anchorOffsetX
                        + rightCenterCorrection.x,
                        -annotationView.height / 2 + anchorOffsetY
                        + rightCenterCorrection.y
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.RIGHT_CENTER,
                    custom: false
                };
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
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -anchorDisplay.width / 2 - annotationView.width - xOffset + anchorOffsetX
                        + leftCenterCorrection.x,
                        -annotationView.height / 2 + anchorOffsetY
                        + leftCenterCorrection.y
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.LEFT_CENTER,
                    custom: false
                };
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
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -annotationView.width / 2 + anchorDisplay.width / 2 + anchorOffsetX
                        + topCenterCorrection.x,
                        -anchorDisplay.height / 2 - annotationView.height - yOffset + anchorOffsetY
                        + topCenterCorrection.y
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.TOP_CENTER,
                    custom: false
                };
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
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -annotationView.width / 2 + anchorDisplay.width / 2 + anchorOffsetX
                        + bottomCenterCorrection.x,
                        anchorDisplay.height / 2 + yOffset + anchorOffsetY
                        + bottomCenterCorrection.y
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.BOTTOM_CENTER,
                    custom: false
                };
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
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -anchorDisplay.width / 2 - annotationView.width - xOffset
                        + anchorOffsetX + topLeftCorrection.x,
                        -anchorDisplay.height / 2 - annotationView.height - yOffset
                        + anchorOffsetY + topLeftCorrection.y
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.TOP_LEFT,
                    custom: false
                };
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
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        anchorDisplay.width / 2 + xOffset + anchorOffsetX
                        + topRightCorrection.x,
                        -anchorDisplay.height / 2 - annotationView.height - yOffset + anchorOffsetY
                        + topRightCorrection.y
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.TOP_RIGHT,
                    custom: false
                };
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
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        -anchorDisplay.width / 2 - annotationView.width - xOffset + anchorOffsetX
                        + bottomLeftCorrection.x,
                        anchorDisplay.height / 2 + yOffset + anchorOffsetY
                        + bottomLeftCorrection.y
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.BOTTOM_LEFT,
                    custom: false
                };
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
                return {
                    anchorIndex: currentAnchorIndex,
                    relPosition: new Point(
                        anchorDisplay.width / 2 + xOffset + anchorOffsetX
                        + bottomRightCorrection.x,
                        anchorDisplay.height / 2 + yOffset + anchorOffsetY
                        + bottomRightCorrection.y
                    ),
                    zoomLevel: pose.zoomLevel,
                    placement: AnnotationPlacement.BOTTOM_RIGHT,
                    custom: false
                };
            }

            return null;
        };

        /**
         * Helper function that checks whether annotations/layers exist at a proposed position
         *
         * @param position proposed relative position (to anchor) of annotation computed from
         * the annotation's top-left corner
         * @return absolute bounds of existing annotion (if one exists) or null (if position is vacant)
         */
        const findCardConflict = (position: AnnotationPosition | null): AnnotationPositionConflict | null => {
            if (
                position
                && position.relPosition
                && position.placement
            ) {
                const cardArray = pose.zoomLevel > AnnotationManager.ANNOTATION_LAYER_THRESHOLD
                    ? this._layers : this._annotations;

                for (let i = 0; i < cardArray.length; i++) {
                    // Get annotation object
                    const card = cardArray[i];
                    // Annotation might have multiple positions for each range associated with it
                    for (let j = 0; j < card.positions.length; j++) {
                        const display = card.views[j];
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
                            // Existing annotation behind possible position
                            // Existing annotation below possible position
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
                                // Existing annotation behind possible position
                                // Existing annotation below possible position
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
                                // Existing annotation after possible position
                                // Existing annotation above possible annotation
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
                                // Existing annotation after possible position
                                // Existing annotation above possible annotation
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
        };

        // Find places that are occupied by bases
        const baseConflicts = findBaseConflicts();

        // Find possible position factoring occupied places
        let proposedPosition: AnnotationPosition | null = findProposedPosition(
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
        let annotationPositionConflict = findCardConflict(proposedPosition);

        // Handles case if annotation exists at bounds
        // Marks region as occupied and searches next available
        // region about anchor point
        let testTopLeft = true;
        let testTopCenter = true;
        let testTopRight = true;
        let testBottomLeft = true;
        let testBottomCenter = true;
        let testBottomRight = true;
        // Accumlate all conflicts to
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
            proposedPosition = findProposedPosition(
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
            annotationPositionConflict = findCardConflict(proposedPosition);
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
                const conflictOffsetX = positionConflict.bounds.x - anchorPoint.x + positionConflict.bounds.width / 2;
                const conflictOffsetY = positionConflict.bounds.y - anchorPoint.y + positionConflict.bounds.height / 2;

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
                    numSearchAttempts === 0 || !includeCenters
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
                0
            );

            if (point) {
                return point;
            }
        }

        return null;
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
        this._resetAnnotationPositions = true;
        this.onTriggerPanelUpdate.emit();
        this.onTriggerPoseUpdate.emit();
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
        this.onTriggerPanelUpdate.emit();
        this.onTriggerPoseUpdate.emit();
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
        this._resetAnnotationPositions = true;
        this.onTriggerPanelUpdate.emit();
        this.onTriggerPoseUpdate.emit();
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
        this.onTriggerPanelUpdate.emit();
        this.onTriggerPoseUpdate.emit();
    }

    /**
     * Sets the desired annotation mode state. When active
     * users are able to create new annotations
     */
    public set annotationModeActive(active: boolean) {
        this._annotationModeActive = active;
        if (!active) {
            this.onClearHighlights.emit();

            // Change base opacity
            this.onAdjustBasesOpacity.value = 1;

            // Make annotation canvas opaque
            this.onAdjustAnnotationCanvasOpacity.value = 1;
        } else {
            // Change base opacity
            this.onAdjustBasesOpacity.value = AnnotationManager.ANNOTATION_UNHIGHLIGHTED_OPACITY;

            // Make annotation canvas opaque
            this.onAdjustAnnotationCanvasOpacity.value = AnnotationManager.ANNOTATION_UNHIGHLIGHTED_OPACITY;
        }
    }

    /**
     * Accesses the current annotation mode value
     */
    public get annotationModeActive(): boolean {
        return this._annotationModeActive;
    }

    /**
     * Accesses all layers (struction, puzzle, solution)
     */
    public get allLayers() {
        const annotationItems: AnnotationData[] = [];
        if (this.activeCategory === AnnotationCategory.PUZZLE) {
            // Puzzle Annotations
            AnnotationManager.collectAnnotationItems(
                [...this._puzzleAnnotations],
                annotationItems
            );
        } else {
            // Solution Annotations
            AnnotationManager.collectAnnotationItems(
                [
                    ...this._puzzleAnnotations,
                    ...this._solutionAnnotations
                ],
                annotationItems
            );
        }

        const layers: AnnotationData[] = annotationItems.reduce(
            (allLayers: AnnotationData[], item: AnnotationData) => {
                if (item.type === AnnotationHierarchyType.LAYER) {
                    allLayers.push(item);
                }
                return allLayers;
            }, []
        );
        return layers;
    }

    /**
     * Accesses all active layers where active is the category
     * currently modifiable category
     */
    public get activeLayers() {
        const annotationItems: AnnotationData[] = [];
        if (this.activeCategory === AnnotationCategory.PUZZLE) {
            // Puzzle Annotations
            AnnotationManager.collectAnnotationItems(
                [...this._puzzleAnnotations],
                annotationItems
            );
        } else {
            // Solution Annotations
            AnnotationManager.collectAnnotationItems(
                [
                    ...this._solutionAnnotations
                ],
                annotationItems
            );
        }

        const layers: AnnotationData[] = annotationItems.reduce(
            (allLayers: AnnotationData[], item: AnnotationData) => {
                if (item.type === AnnotationHierarchyType.LAYER) {
                    allLayers.push(item);
                }
                return allLayers;
            }, []
        );
        return layers;
    }

    /**
     * Accesses all annotation (struction, puzzle, solution)
     */
    public get allAnnotations() {
        const annotationItems: AnnotationData[] = [];
        if (this.activeCategory === AnnotationCategory.PUZZLE) {
            // Puzzle Annotations
            AnnotationManager.collectAnnotationItems(
                [...this._puzzleAnnotations],
                annotationItems
            );
        } else {
            // Solution Annotations
            AnnotationManager.collectAnnotationItems(
                [
                    ...this._puzzleAnnotations,
                    ...this._solutionAnnotations
                ],
                annotationItems
            );
        }

        const annotations: AnnotationData[] = annotationItems.reduce(
            (allAnnotations: AnnotationData[], item: AnnotationData) => {
                if (item.type === AnnotationHierarchyType.ANNOTATION) {
                    allAnnotations.push(item);
                }
                return allAnnotations;
            }, []
        );

        return annotations;
    }

    /**
     * Accesses all annotations in a single bundled object
     */
    public get annotationBundle() {
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

        const annotationGraph: AnnotationDataBundle = {
            puzzle: [],
            solution: []
        };
        const puzzleGraph: AnnotationData[] = [];
        for (const child of this._puzzleAnnotations) {
            const path = prepareNode(child);
            puzzleGraph.push(path);
        }
        annotationGraph.puzzle = puzzleGraph;
        const solutionGraph: AnnotationData[] = [];
        for (const child of this._solutionAnnotations) {
            const path = prepareNode(child);
            solutionGraph.push(path);
        }
        annotationGraph.solution = solutionGraph;

        return annotationGraph;
    }

    /**
     * Creates registration group for managing signals
     */
    public get regs(): RegistrationGroup {
        if (this._regs == null) {
            this._regs = new RegistrationGroup();
        }
        return this._regs;
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

    /**
     * Flattens the graph of annotation items into an array. Mutates an argument array, which could introduce potential
     * for bugs.
     *
     * @param items a graph of annotations
     * @param arr array to place annotations into
     */
    private static collectAnnotationItems = (items: AnnotationData[], arr: AnnotationData[]) => {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.children.length > 0) {
                arr.push(item);
                AnnotationManager.collectAnnotationItems(item.children, arr);
            } else {
                arr.push(item);
            }
        }
    };

    /**
     * Cleans up annotation data in order for it to include runtime variables
     *
     * @param node annotation of interest
     */
    private static prepareAnnotationNode = (node: AnnotationData): AnnotationData => {
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
    };

    // Stores the master data for all categories of annotations
    private _structureAnnotations: AnnotationData[] = [];
    private _puzzleAnnotations: AnnotationData[] = [];
    private _solutionAnnotations: AnnotationData[] = [];

    // Holds the runtime objects for all annotations and layers
    // in the puzzle
    private _annotations: AnnotationDisplayObject[] = [];
    private _layers: AnnotationDisplayObject[] = [];

    private _toolbarType: ToolbarType;
    private _regs: RegistrationGroup | null;
    private _annotationModeActive: boolean = false;
    private _resetAnnotationPositions: boolean = false;
    private _ignoreCustomAnnotationPositions: boolean = false;
    public isMovingAnnotation: boolean = false;

    public static readonly ANNOTATION_UNHIGHLIGHTED_OPACITY = 0.5;
    public static readonly DEFAULT_ANNOTATION_SHIFT = 15;
    public static readonly ANNOTATION_PLACEMENT_ITERATION_TIMEOUT = 20;
    public static readonly ANNOTATION_LAYER_THRESHOLD = 1;
}
