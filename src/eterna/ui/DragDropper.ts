import {
    Point,
    Rectangle,
    Graphics,
    Container
} from 'pixi.js';
import {Signal, Value} from 'signals';
import {
    ContainerObject,
    DisplayObjectPointerTarget,
    Dragger,
    DisplayUtil,
    GameObjectRef
} from 'flashbang';

export enum DragDropType {
    SOURCE,
    TARGET,
}

export interface Item {
    id: number | string;
    index: number | number[];
    type: string;
    globalX?: number;
    globalY?: number;
    payload?: object | string;
}

interface DragDropperProps {
    dropType: DragDropType;
    itemDisplayObject: Container;
    pointerTarget: Container;
    item: Item;
    acceptItemType?: string;
    draggingBorderColor?: number;
    canDrop?: (item: Item) => boolean;
    onDrop?: (item: Item) => void;
    onHoverStart?: () => void;
    onHoverEnd?: () => void;
}

// Broadly modeled after React DnD: https://react-dnd.github.io/react-dnd/docs/overview
export default class DragDropper extends ContainerObject {
    public readonly dragChanged = new Signal<Item>();
    public readonly itemDropped = new Signal<Item>();
    public readonly isDragging: Value<boolean> = new Value<boolean>(true);

    constructor(props: DragDropperProps) {
        super();
        // Store drop type
        this._dropType = props.dropType;
        // Store display object
        this._displayObject = props.itemDisplayObject;
        // Store item
        this._item = props.item;

        // Generate pointer target
        const pointerTarget = new DisplayObjectPointerTarget(props.pointerTarget);

        if (props.dropType === DragDropType.SOURCE) {
            // Set display cursor to grab
            this._displayObject.cursor = 'grab';

            // Store canDrop
            if (props.canDrop) {
                this._canDrop = props.canDrop;
            }

            // Store border color
            if (props.draggingBorderColor) {
                this._draggingBorderColor = props.draggingBorderColor;
            }

            // Begin Drag
            pointerTarget.pointerDown.connect((e) => {
                e.stopPropagation();

                // We use a timeout to allow for selecting annotation item
                // as well as dragging
                this._dragTimeout = setTimeout(() => {
                    this.onMouseDown();
                }, DragDropper.DRAG_TIMEOUT_DURATION);
            });
            pointerTarget.pointerUp.connect(() => {
                if (this._dragTimeout) {
                    clearTimeout(this._dragTimeout);
                    this._dragTimeout = null;
                }
            });
        }

        if (props.dropType === DragDropType.TARGET) {
            if (props.acceptItemType) {
                this._acceptItemType = props.acceptItemType;
            }

            if (props.onDrop) {
                this._onDrop = props.onDrop;
            }

            if (props.onHoverStart) {
                this._onHoverStart = props.onHoverStart;
            }

            if (props.onHoverEnd) {
                this._onHoverEnd = props.onHoverEnd;
            }
        }
    }

    protected added() {
        super.added();
    }

    public observeDragSource(source: DragDropper) {
        if (this._dropType === DragDropType.TARGET) {
            this._observedDragSources.push(source);

            this.regs.add(source.dragChanged.connect((item: Item) => {
                if (
                    this._acceptItemType
                    && item.type === this._acceptItemType
                    && item.id !== this._item.id
                ) {
                    // Only accept items that conform to desired item
                    this._tempItem = item;
                }

                if (!this.mode || !this.mode.container) return;
                const globalBoxBounds = DisplayUtil.getBoundsRelative(this._displayObject, this.mode.container);

                // Update isOver value: i.e. if drag source is above drop target
                if (
                    !this._isOver
                    && item.id !== this._item.id
                    && item.globalX
                    && item.globalY
                    && item.globalX >= globalBoxBounds.x
                    && item.globalX <= globalBoxBounds.x + globalBoxBounds.width
                    && item.globalY >= globalBoxBounds.y
                    && item.globalY <= globalBoxBounds.y + globalBoxBounds.height
                    && this._dropType === DragDropType.TARGET
                ) {
                    // Drag source is above this drop target
                    if (this._onHoverStart) {
                        this._onHoverStart();
                    }

                    this._isOver = true;
                } else if (
                    this._isOver
                    && item.id !== this._item.id
                    && item.globalX
                    && item.globalY
                    && (
                        (
                            item.globalX < globalBoxBounds.x
                            || item.globalX > globalBoxBounds.x + globalBoxBounds.width
                        )
                        || (
                            item.globalY < globalBoxBounds.y
                            || item.globalY > globalBoxBounds.y + globalBoxBounds.height
                        )
                    )
                    && this._dropType === DragDropType.TARGET
                ) {
                    // Drag source is no longer above this drop target
                    if (this._onHoverEnd) {
                        this._onHoverEnd();
                    }

                    this._isOver = false;
                }
            }));

            this.regs.add(source.itemDropped.connect((item: Item) => {
                if (
                    this._acceptItemType
                    && item.type === this._acceptItemType
                    && item.id !== this._item.id
                ) {
                    // Only accept items that conform to desired item
                    this._tempItem = item;
                }

                if (
                    this._dropType === DragDropType.TARGET
                    && this._tempItem
                    && this._isOver
                ) {
                    if (this._onDrop) {
                        this._onDrop(this._tempItem);
                    }
                }

                this._isOver = false;
                this._tempItem = null;
            }));
        }
    }

    // Places drag source in global coordinate space while dragging
    private onMouseDown(): void {
        if (
            this._isDraggable
            && this._dropType === DragDropType.SOURCE
        ) {
            this.isDragging.value = true;

            this._draggerRef.destroyObject();

            // Cache original drag source parent
            this._originalParent = this._displayObject.parent;

            if (!this.mode || !this.mode.container) return;
            // Cache original drag source location
            this._originalLocation = new Rectangle(
                this._displayObject.x,
                this._displayObject.y,
                this._displayObject.width,
                this._displayObject.height
            );

            // Place drag source in global coordinate space
            this._displayObject.setParent(this.mode.container);

            const dragger = new Dragger();
            this._draggerRef = this.addObject(dragger);

            // Cache initial cursor offset relative to drag source
            const draggerRelToParentPosition = this._originalParent.toLocal(new Point(dragger.curX, dragger.curY));
            const draggerRelToDisplayPosition = new Point(
                draggerRelToParentPosition.x - this._originalLocation.x,
                draggerRelToParentPosition.y - this._originalLocation.y
            );

            // Move to correct location in global coordinate space
            const startMouse = this._displayObject.parent.toLocal(new Point(dragger.curX, dragger.curY));
            this._displayObject.x = startMouse.x - draggerRelToDisplayPosition.x;
            this._displayObject.y = startMouse.y - draggerRelToDisplayPosition.y;

            // Change display presentation
            this._originalOpacity = this._displayObject.alpha;
            this._displayObject.alpha = Math.max(0.1, this._displayObject.alpha - DragDropper.DRAGGING_OPACITY_DIFF);

            // Add dragging border if specified
            if (this._draggingBorderColor) {
                this._draggingBorder = new Graphics()
                    .lineStyle(
                        DragDropper.DRAGGING_BORDER_WEIGHT,
                        this._draggingBorderColor
                    )
                    .drawRect(
                        0,
                        0,
                        this._displayObject.width,
                        this._displayObject.height
                    );
                this._displayObject.addChild(this._draggingBorder);
            }

            // Create placeholder object for dragged object
            // Add to parent container
            this._placeholderObject = new Graphics()
                .beginFill(0x112238)
                .drawRect(
                    this._originalLocation.x,
                    this._originalLocation.y,
                    this._originalLocation.width,
                    this._originalLocation.height
                ).endFill();
            this._originalParent.addChildAt(this._placeholderObject, 0); // zero index places it behind dragged object

            const startItem = {
                id: this._item.id,
                index: this._item.index,
                type: this._item.type,
                globalX: startMouse.x,
                globalY: startMouse.y
            };

            // Broadcast item
            this.dragChanged.emit(startItem);

            // Set up dragger
            dragger.dragComplete.connect(() => {
                if (
                    this._isDraggable
                    && this._dropType === DragDropType.SOURCE
                    && this._canDrop
                    && this._canDrop(this._item)
                ) {
                    const mouse = this._displayObject.parent.toLocal(new Point(dragger.curX, dragger.curY));

                    // emit on drop
                    const item = {
                        id: this._item.id,
                        index: this._item.index,
                        type: this._item.type,
                        globalX: mouse.x,
                        globalY: mouse.y
                    };

                    // Broadcast item
                    this.itemDropped.emit(item);
                }

                // Return object to original location
                if (this._originalLocation) {
                    this._displayObject.x = this._originalLocation.x;
                    this._displayObject.y = this._originalLocation.y;
                }

                // Return object to original parent
                if (this._originalParent) {
                    this._displayObject.setParent(this._originalParent);
                }

                // Return opacity to normal
                if (this._originalOpacity) {
                    this._displayObject.alpha = this._originalOpacity;
                    this._originalOpacity = null;
                }

                // Remove dragging border
                if (this._draggingBorder) {
                    this._draggingBorder.destroy();
                    this._draggingBorder = null;
                }

                this.isDragging.value = false;
                this._originalLocation = null;
                this._originalParent = null;
                // Remove placeholder
                if (this._placeholderObject) {
                    this._placeholderObject.destroy();
                    this._placeholderObject = null;
                }

                dragger.destroySelf();
            });
            dragger.dragged.connect(() => {
                const mouse = this._displayObject.parent.toLocal(new Point(dragger.curX, dragger.curY));
                this._displayObject.x = mouse.x - draggerRelToDisplayPosition.x;
                this._displayObject.y = mouse.y - draggerRelToDisplayPosition.y;

                const item = {
                    id: this._item.id,
                    index: this._item.index,
                    type: this._item.type,
                    globalX: mouse.x,
                    globalY: mouse.y
                };

                // Broadcast item
                this.dragChanged.emit(item);
            });
        }
    }

    public get isOver(): boolean {
        return this._isOver;
    }

    public set isDraggable(draggable: boolean) {
        this._isDraggable = draggable;
    }

    // Common
    private _item: Item;
    private _displayObject: Container;
    private _dropType: DragDropType;
    private _draggerRef: GameObjectRef = GameObjectRef.NULL;

    // Source
    private _isDraggable: boolean = true;
    private _draggingBorderColor: number;
    private _canDrop: (item: Item) => boolean;
    private _originalLocation: Rectangle | null;
    private _originalParent: Container | null;
    private _originalOpacity: number | null;
    private _placeholderObject: Graphics | null;
    private _draggingBorder: Graphics | null;
    private _dragTimeout: ReturnType<typeof setTimeout> | null;

    // Target
    private _observedDragSources: DragDropper[] = [];
    private _acceptItemType: string;
    private _tempItem: Item | null;
    private _isOver: boolean = false;
    private _onDrop: (item: Item) => void;
    private _onHoverStart: () => void; // make sure id's arent the same
    private _onHoverEnd: () => void; // make sure id's arent the same

    private static readonly DRAGGING_OPACITY_DIFF = 0.4;
    private static readonly DRAGGING_BORDER_WEIGHT = 3;
    private static readonly DRAG_TIMEOUT_DURATION = 200;
}
