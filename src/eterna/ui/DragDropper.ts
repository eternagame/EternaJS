import {
    Point,
    Rectangle,
    Graphics,
    DisplayObject
} from 'pixi.js';
import {Signal} from 'signals';
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
    type: string;
    payload: object | string;
}

interface DragDropperProps {
    dropType: DragDropType;
    displayObject: DisplayObject;
    item: Item;
    dragDroppers: DragDropper[];
    acceptItemType?: string;
    canDrop?: (item: object) => boolean;
    onDrop?: (item: object) => void;
    onHoverStart?: () => void;
    onHoverEnd?: () => void;
}

// Broadly modeled after React DnD: https://react-dnd.github.io/react-dnd/docs/overview
export default class DragDropper extends ContainerObject {
    public readonly dragChanged = new Signal<Item>();
    public readonly itemDropped = new Signal<Item>();

    constructor(props: DragDropperProps) {
        super();
        // Store drop type
        this._dropType = props.dropType;
        // Store display object
        this._displayObject = props.displayObject;
        // Store item
        this._item = props.item;
        // Store all items
        this._dragDroppers = props.dragDroppers;
        // Generate pointer target
        const pointerTarget = new DisplayObjectPointerTarget(props.displayObject);

        if (props.dropType === DragDropType.SOURCE) {
            // Set display cursor to grab
            this._displayObject.cursor = 'grab';

            // Store canDrop
            if (props.canDrop) {
                this._canDrop = props.canDrop;
            }

            // Begin Drag
            pointerTarget.pointerDown.connect(() => this.onMouseDown());

            // End Drag
            pointerTarget.pointerUp.connect(() => this.onMouseUp());
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

            // Update Drag
            pointerTarget.pointerOver.connect(() => this.onHoverOverStart());

            // Drag Past
            pointerTarget.pointerOut.connect(() => this.onHoverOverEnd());
        }
    }

    protected added() {
        super.added();
        if (this._dropType === DragDropType.TARGET) {
            for (const dragDropper of this._dragDroppers) {
                this.regs.add(dragDropper.dragChanged.connect((item: Item) => {
                    if (
                        this._acceptItemType
                        && item.type === this._acceptItemType
                    ) {
                        // Only accept items that conform to desired item
                        this._tempItem = item;
                    }
                }));
                this.regs.add(dragDropper.itemDropped.connect((item: Item) => {
                    if (
                        this._acceptItemType
                        && item.type === this._acceptItemType
                    ) {
                        // Only accept items that conform to desired item
                        this._tempItem = item;
                    }

                    if (
                        this._dropType === DragDropType.TARGET
                        && this._tempItem
                        && this._tempItem.id !== this._item.id
                    ) {
                        if (this._onDrop) {
                            this._onDrop(this._tempItem);
                        }
                    }

                    this._isOver = false;
                }));
            }
        }
    }

    private onMouseDown(): void {
        if (
            this._isDraggable
            && this._dropType === DragDropType.SOURCE
        ) {
            this._isDragging = true;

            this._draggerRef.destroyObject();

            const dragger = new Dragger();
            this._draggerRef = this.addObject(dragger);

            // Cache start location
            this._startLocation = new Rectangle(
                this._displayObject.x,
                this._displayObject.y,
                DisplayUtil.width(this._displayObject),
                DisplayUtil.height(this._displayObject)
            );

            // Create placeholder object for dragged object
            // Add to parent container
            this._placeholderObject = new Graphics()
                .beginFill(0x375B89)
                .drawRoundedRect(
                    this._startLocation.x,
                    this._startLocation.y,
                    this._startLocation.width,
                    this._startLocation.height,
                    5
                ).endFill();
            this._displayObject.parent.addChild(this._placeholderObject);
            // TODO: Find a way to put it under current object display zIndex

            const item = {
                id: this._item.id,
                type: this._item.type,
                payload: 'hello world'
            };

            // Broadcast item
            this.dragChanged.emit(item);

            // Set up dragger
            dragger.dragComplete.connect(() => {
                dragger.destroySelf();
            });
            dragger.dragged.connect(() => {
                const mouse = this.container.toLocal(new Point(dragger.curX, dragger.curY));
                this._displayObject.x = mouse.x;
                this._displayObject.y = mouse.y;

                // Broadcast item
                this.dragChanged.emit(item);
            });
        }
    }

    private onMouseUp(): void {
        if (
            this._isDraggable
            && this._dropType === DragDropType.SOURCE
            && this._canDrop
            && this._canDrop(this._item)
        ) {
            // emit on drop
            const item = {
                id: this._item.id,
                type: this._item.type,
                payload: 'hello world'
            };

            // Broadcast item
            this.itemDropped.emit(item);
        }

        // Return object to original location
        if (this._startLocation) {
            this._displayObject.x = this._startLocation.x;
            this._displayObject.y = this._startLocation.y;
        }

        this._isDragging = false;
        this._startLocation = null;
        this._placeholderObject = null;
    }

    private onHoverOverStart(): void {
        this._isOver = false;

        if (
            this._dropType === DragDropType.TARGET
            // this._tempItem &&
            // this._tempItem.id != this._item.id
        ) {
            if (this._onHoverStart) {
                this._onHoverStart();
            }
        }
    }

    private onHoverOverEnd(): void {
        if (
            this._dropType === DragDropType.TARGET
            // this._tempItem &&
            // this._tempItem.id != this._item.id
        ) {
            if (this._onHoverEnd) {
                this._onHoverEnd();
            }
        }

        this._isOver = false;
    }

    public get isOver(): boolean {
        return this._isOver;
    }

    public get isDragging(): boolean {
        return this._isDragging;
    }

    public set isDraggable(draggable: boolean) {
        this._isDraggable = draggable;
    }

    // Common
    private _item: Item;
    private _dragDroppers: DragDropper[];
    private _displayObject: DisplayObject;
    private _dropType: DragDropType;
    private _draggerRef: GameObjectRef = GameObjectRef.NULL;

    // Source
    private _isDragging: boolean = false;
    private _isDraggable: boolean = true;
    private _canDrop: (item: object) => boolean;
    private _startLocation: Rectangle | null;
    private _placeholderObject: Graphics | null;

    // Target
    private _acceptItemType: string;
    private _tempItem: Item;
    private _isOver: boolean = false;
    private _onDrop: (item: object) => void;
    private _onHoverStart: () => void; // make sure id's arent the same
    private _onHoverEnd: () => void; // make sure id's arent the same
}
