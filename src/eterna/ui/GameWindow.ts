/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
    Assert, ContainerObject, DisplayUtil, Dragger, Flashbang, HAlign, MathUtil, SpriteObject, VAlign, Vector2
} from 'flashbang';
import {
    Container, Graphics, InteractionEvent, Point, Rectangle, Sprite
} from 'pixi.js';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {Signal, SignalView} from 'signals';
import GraphicsObject from 'flashbang/objects/GraphicsObject';
import RScriptArrow from 'eterna/rscript/RScriptArrow';
import GameButton from './GameButton';
import GamePanel from './GamePanel';
import ScrollBox from './ScrollBox';

type XTarget = { from: 'left' | 'center' | 'right' } & (
    {offsetExact: number} | {offsetRatio: number; offsetFromRatio?: number}
);
type YTarget = { from: 'top' | 'center' | 'bottom' } & (
    {offsetExact: number} | {offsetRatio: number; offsetFromRatio?: number}
);

/**
 * How much space on either side of the window border is valid as a resize target
 */
const RESIZE_MARGIN = 6;
/**
 * When ensuring the window is always on screen, the minimum space to leave on every side of the window
 * Otherwise, we at least ensure that the maximum window size is such that there could be that much space on every side
 */
const SCREEN_MARGIN = 10;

export default class GameWindow extends ContainerObject {
    public readonly contentSizeWillUpdate = new Signal<{width: number; height: number}>();
    public readonly contentPositionUpdated = new Signal<{x: number; y: number}>();

    constructor(
        props: {
            movable?: boolean;
            resizable?: boolean;
            closable?: boolean;
            title?: string;
            horizontalContentMargin?: number;
            verticalContentMargin?: number;
            ensureOnScreen?: boolean;
            contentHAlign?: HAlign;
            contentVAlign?: VAlign;
            bgColor?: number;
            bgAlpha?: number;
            titleFontSize?: number;
            titleUpperCase?: boolean;
        }
    ) {
        super();
        this._movable = props.movable ?? true;
        this._resizable = props.resizable ?? false;
        this._closable = props.closable ?? false;
        this._title = props.title;
        this._horizontalContentMargin = props.horizontalContentMargin ?? 20;
        this._verticalContentMargin = props.verticalContentMargin ?? 20;
        this._ensureOnScreen = props.ensureOnScreen ?? true;
        this._contentHAlign = props.contentHAlign ?? HAlign.CENTER;
        this._contentVAlign = props.contentVAlign ?? VAlign.CENTER;
        this._bgColor = props.bgColor;
        this._bgAlpha = props.bgAlpha;
        this._titleFontSize = props.titleFontSize;
        this._titleUpperCase = props.titleUpperCase;
    }

    protected added() {
        this._panel = new GamePanel({
            color: this._bgColor,
            alpha: this._bgAlpha,
            // Even if we don't have a title, we need the title bar to be there as a drag handle
            // and/or as a place for the close button
            forceTitleBar: this._movable || this._closable,
            titleFontSize: this._titleFontSize,
            titleUpperCase: this._titleUpperCase
        });
        if (this._title) this._panel.title = this._title;
        this.addObject(this._panel, this.container);

        this._closeButton = new GameButton()
            .allStates(BitmapManager.getBitmap(Bitmaps.ImgDlgClose))
            .over(BitmapManager.getBitmap(Bitmaps.ImgOverDlgClose));
        if (!this._closable) this._closeButton.display.visible = false;
        this.addObject(this._closeButton, this.container);
        this._closeButton.display.width = this.closeButtonSize;
        this._closeButton.display.height = this.closeButtonSize;

        this._dragRibbing = new Graphics();
        this.container.addChild(this._dragRibbing);
        this._dragRibbing.visible = this._movable;

        if (this._movable) {
            this.regs.add(this._panel.titlePointerDown.connect((e) => this.handleMove(e)));
        }

        this._content = new ScrollBox(0, 0, undefined, -10, 0);
        this.addObject(this._content, this.container);

        // RESIZE_MARGIN * 2 gets us to the center of the diagonal of the handle
        this._dragHandleLeft = new SpriteObject(Sprite.from(Bitmaps.Img3DLeft));
        this._dragHandleLeft.display.width = 15;
        this._dragHandleLeft.display.height = 15;
        this.addObject(this._dragHandleLeft, this.container);
        this._dragHandleRight = new SpriteObject(Sprite.from(Bitmaps.Img3DRight));
        this._dragHandleRight.display.width = 15;
        this._dragHandleRight.display.height = 15;
        this.addObject(this._dragHandleRight, this.container);
        if (!this._resizable) {
            this._dragHandleLeft.display.visible = false;
            this._dragHandleRight.display.visible = false;
        }

        this._resizeHitTarget = new GraphicsObject();
        this._resizeHitTarget.display.alpha = 0;
        this.addObject(this._resizeHitTarget, this.container);
        if (this._resizable) {
            this.regs.add(this._resizeHitTarget.pointerDown.connect((e) => {
                const localPos = e.data.getLocalPosition(this._panel.display);
                const bottom = localPos.y > this._panel.height - (RESIZE_MARGIN * 2);
                const top = !bottom && localPos.y < (RESIZE_MARGIN * 2);
                const right = localPos.x > this._panel.width - (RESIZE_MARGIN * 2);
                const left = !right && localPos.x < (RESIZE_MARGIN * 2);
                this.handleResize(e, {
                    bottom,
                    top,
                    right,
                    left
                });
            }));

            this.regs.add(this._resizeHitTarget.pointerMove.connect((e) => {
                const localPos = e.data.getLocalPosition(this._panel.display);
                // TODO: Move cursor?
                if (this._resizable) {
                    const bottom = localPos.y > this._panel.height - (RESIZE_MARGIN * 2);
                    const top = !bottom && localPos.y < (RESIZE_MARGIN * 2);
                    const right = localPos.x > this._panel.width - (RESIZE_MARGIN * 2);
                    const left = !right && localPos.x < (RESIZE_MARGIN * 2);
                    if ((bottom && right) || (top && left)) {
                        this._resizeHitTarget.display.cursor = 'nwse-resize';
                    } else if ((bottom && left) || (top && right)) {
                        this._resizeHitTarget.display.cursor = 'nesw-resize';
                    } else if (top || bottom) {
                        this._resizeHitTarget.display.cursor = 'ns-resize';
                    } else if (left || right) {
                        this._resizeHitTarget.display.cursor = 'ew-resize';
                    } else {
                        this._resizeHitTarget.display.cursor = 'initial';
                    }
                }
            }));
        }

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(() => this.layout()));
        this.layout();
    }

    public layout() {
        if (!this.isLiveObject) return;

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        //        ◄─────────────width─────────────►
        //    ▲   ┌───────────────────────────────┐
        //    │   │               │ title height  │
        //    │   ├───────────────┬───────────────┤
        //    │   │               │ vmargin       │
        //    │   │  ┌────────────┴────────────┐  │
        //    │   │  │                         │  │       ▲
        //    │   │  │                         │  │       │
        //    │   │  │                         │  │       │
        //    │   │  │                         │  │       │
        //    │   │  │                         │  │       │
        // height ├──┘                         ├──┤       │
        //    │   │hmargin                     │  │ content height
        //    │   │  │                         │  │       │
        //    │   │  │                         │  │       │
        //    │   │  │                         │  │       │
        //    │   │  │                         │  │       │
        //    │   │  │                         │  │       │
        //    │   │  └────────────┬────────────┘  │       ▼
        //    │   │               │               │
        //    ▼   └───────────────┴───────────────┘
        //            ◄─────content width──────►
        const hMargin = this._horizontalContentMargin;
        const vMargin = this._verticalContentMargin;
        const targetWidth = this._targetWidth ?? Math.max(
            (this._content.content.width + (hMargin * 2)),
            this.minWidth
        );
        const targetHeight = this._targetHeight ?? (
            this._content.content.height + (vMargin * 2) + this._panel.titleHeight
        );
        const panelWidth = Math.min(targetWidth, this.maxWidth);
        const panelHeight = Math.min(targetHeight, this.maxHeight);
        this._panel.setSize(panelWidth, panelHeight);

        const maxContentWidth = panelWidth - (hMargin * 2);
        const maxContentHeight = panelHeight - this._panel.titleHeight - (vMargin * 2);
        this.contentSizeWillUpdate.emit({width: maxContentWidth, height: maxContentHeight});
        const contentWidth = Math.min(this.content.width, maxContentWidth);
        const contentHeight = Math.min(this.content.height, maxContentHeight);
        this._content.setSize(contentWidth, contentHeight);

        // For some reason, due to how the width of the window and content are used in calculating the position,
        // particularly when positioned relative to the center of the screen, we have to recalculate
        // the position twice in order to ensure the position is "stable" (otherwise, you'll see something like the)
        // top/left edge of the window momentarily "fluttering" when resizing the bottom/right.
        // TODO: Investigate further and try to come up with a more robust solution
        this.reposition(false);
        this.reposition();
    }

    private reposition(emit = true) {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        const hOffset = (() => {
            switch (this._contentHAlign) {
                case HAlign.CENTER: return 0;
                case HAlign.LEFT: return this._horizontalContentMargin;
                case HAlign.RIGHT: return -this._horizontalContentMargin;
                default: return Assert.unreachable(this._contentHAlign);
            }
        })();
        const vOffset = (() => {
            switch (this._contentVAlign) {
                case VAlign.CENTER: return 0;
                case VAlign.TOP: return this._verticalContentMargin;
                case VAlign.BOTTOM: return -this._verticalContentMargin;
                default: return Assert.unreachable(this._contentVAlign);
            }
        })();
        DisplayUtil.positionRelativeToBounds(
            this._content.display, this._contentHAlign, this._contentVAlign,
            new Rectangle(
                this._panel.display.x,
                this._panel.display.y + this._panel.titleHeight,
                this._panel.width,
                this._panel.height - this._panel.titleHeight
            ), this._contentHAlign, this._contentVAlign,
            hOffset, vOffset
        );

        // Center the close button, and use the same vertical margin for the horizontal margin
        this._closeButton.display.position.set(
            this._panel.width - this.closeButtonSize - this.titleMargin,
            this.titleMargin
        );

        const RIB_WIDTH = 2;
        const margin = Math.max(this.titleMargin, 5);
        // Color is arbitrary, we can probably do better...
        this._dragRibbing
            .clear()
            .beginFill(0xFFFFFF, 0.15);
        if (this._title) {
            // Draw on either side of the title
            const leftWidth = (this._panel.width - this._panel.titleTextWidth - (margin * 4)) / 2;
            const rightWidth = leftWidth - (
                this._closable ? this.closeButtonSize + margin : 0
            );
            const rightStart = margin + leftWidth + margin + this._panel.titleTextWidth + margin;
            this._dragRibbing
                .drawRect(margin, (this.titleHeight - RIB_WIDTH) * 0.35, leftWidth, RIB_WIDTH)
                .drawRect(margin, (this.titleHeight - RIB_WIDTH) * 0.5, leftWidth, RIB_WIDTH)
                .drawRect(margin, (this.titleHeight - RIB_WIDTH) * 0.65, leftWidth, RIB_WIDTH)
                .drawRect(rightStart, (this.titleHeight - RIB_WIDTH) * 0.35, rightWidth, RIB_WIDTH)
                .drawRect(rightStart, (this.titleHeight - RIB_WIDTH) * 0.5, rightWidth, RIB_WIDTH)
                .drawRect(rightStart, (this.titleHeight - RIB_WIDTH) * 0.65, rightWidth, RIB_WIDTH);
        } else {
            const width = this._panel.width - (margin * 2) - (
                this._closable ? this.closeButtonSize + margin : 0
            );
            this._dragRibbing
                .drawRect(margin, (this.titleHeight - RIB_WIDTH) * 0.35, width, RIB_WIDTH)
                .drawRect(margin, (this.titleHeight - RIB_WIDTH) * 0.5, width, RIB_WIDTH)
                .drawRect(margin, (this.titleHeight - RIB_WIDTH) * 0.65, width, RIB_WIDTH);
        }
        this._dragRibbing.endFill();

        this._dragHandleLeft.display.position.set(0, this._panel.height - this._dragHandleLeft.display.height);
        this._dragHandleRight.display.position.set(
            this._panel.width - this._dragHandleRight.display.width,
            this._panel.height - this._dragHandleRight.display.height
        );

        this._resizeHitTarget.display.clear()
            .beginFill(0x000000)
            .drawRoundedRect(
                -RESIZE_MARGIN,
                -RESIZE_MARGIN,
                this._panel.width + (RESIZE_MARGIN * 2),
                this._panel.height + (RESIZE_MARGIN * 2),
                this._panel.borderRadius
            )
            .endFill()
            .beginHole()
            .drawRoundedRect(
                RESIZE_MARGIN,
                RESIZE_MARGIN,
                this._panel.width - (RESIZE_MARGIN * 2),
                this._panel.height - (RESIZE_MARGIN * 2),
                this._panel.borderRadius
            )
            .endHole();

        const x = this._ensureOnScreen ? MathUtil.clamp(
            this.targetXPixels - RESIZE_MARGIN,
            SCREEN_MARGIN,
            Flashbang.stageWidth - SCREEN_MARGIN - this._panel.width
        ) : this.targetXPixels - RESIZE_MARGIN;
        const y = this._ensureOnScreen ? MathUtil.clamp(
            this.targetYPixels - RESIZE_MARGIN,
            SCREEN_MARGIN,
            Flashbang.stageHeight - SCREEN_MARGIN - this._panel.height
        ) : this.targetYPixels - RESIZE_MARGIN;
        this.display.x = x;
        this.display.y = y;
        // Ensure the HTML mask is drawn in the correct position
        this._content.doLayout();

        if (emit) this.contentPositionUpdated.emit(this._content.display.getGlobalPosition());
    }

    public setTargetBounds(bounds: {
        width?: number | null;
        height?: number | null;
        maxWidth?: number | null;
        maxHeight?: number | null;
        x?: XTarget;
        y?: YTarget;
    }) {
        if (bounds.width !== undefined) {
            if (bounds.width === null) {
                this._targetWidth = null;
            } else {
                this._targetWidth = Math.max(bounds.width, this.minWidth);
            }
        }

        if (bounds.height !== undefined) {
            if (bounds.height === null) {
                this._targetHeight = null;
            } else {
                this._targetHeight = Math.max(bounds.height, this.minHeight);
            }
        }

        // TODO: Added these max properties for the ModeBar which needs to manage that itself.
        // I have a feeling there's a cleaner API to manage this.
        if (bounds.maxWidth !== undefined) {
            if (bounds.maxWidth === null) {
                this._targetMaxWidth = null;
            } else {
                this._targetMaxWidth = Math.max(bounds.maxWidth, this.minWidth);
            }
        }

        if (bounds.maxHeight !== undefined) {
            if (bounds.maxHeight === null) {
                this._targetMaxHeight = null;
            } else {
                this._targetMaxHeight = Math.max(bounds.maxHeight, this.minHeight);
            }
        }

        if (bounds.height !== undefined) {
            if (bounds.height === null) {
                this._targetHeight = null;
            } else {
                this._targetHeight = Math.max(bounds.height, this.minHeight);
            }
        }

        if (bounds.x !== undefined) {
            this._targetX = bounds.x;
        }

        if (bounds.y !== undefined) {
            this._targetY = bounds.y;
        }

        this.layout();
    }

    private handleMove(e: InteractionEvent) {
        const dragger = new Dragger();
        this.addObject(dragger);

        const dragStartingPoint = e.data.global.clone();
        const initialX = this.display.x + RESIZE_MARGIN;
        const initialY = this.display.y + RESIZE_MARGIN;
        this.regs.add(dragger.dragged.connect((p: Point) => {
            const newXPos = initialX + (p.x - dragStartingPoint.x);
            const newYPos = initialY + (p.y - dragStartingPoint.y);

            this.setTargetBounds({
                x: this.getXOffsetTargetFromPixels(newXPos, this._panel.width),
                y: this.getYOffsetTargetFromPixels(newYPos, this._panel.height)
            });
        }));
    }

    private handleResize(e: InteractionEvent, from: {
        bottom?: boolean;
        top?: boolean;
        left?: boolean;
        right?: boolean;
    }) {
        const dragger = new Dragger();
        this.addObject(dragger);

        const dragStartingPoint = e.data.global.clone();
        // Note that we're using the actual width/height to modify, not the target. If we shrink the
        // screen to the point we have to shrink beyond the target width but don't resize,
        // expanding the screen again should bring it back to the original target. However if we
        // resize, it makes sense to assume that the desired size is now based on the smaller window
        // size and not related to the original target.
        const initialWidth = this._panel.width;
        const initialHeight = this._panel.height;
        const initialX = this.display.x + RESIZE_MARGIN;
        const initialY = this.display.y + RESIZE_MARGIN;

        this.regs.add(dragger.dragged.connect((p: Point) => {
            // Signed pixel distance of how far we've moved from starting point
            const xDiff = p.x - dragStartingPoint.x;
            const yDiff = p.y - dragStartingPoint.y;

            if (from.right) {
                const width = MathUtil.clamp(initialWidth + xDiff, this.minWidth, this.maxWidth);
                this.setTargetBounds({
                    width,
                    x: this.getXOffsetTargetFromPixels(initialX, width)
                });
            } else if (from.left) {
                const width = MathUtil.clamp(initialWidth - xDiff, this.minWidth, this.maxWidth);
                const actualChange = width - initialWidth;
                this.setTargetBounds({
                    width,
                    x: this.getXOffsetTargetFromPixels(initialX - actualChange, width)
                });
            }

            if (from.bottom) {
                const height = MathUtil.clamp(initialHeight + yDiff, this.minHeight, this.maxHeight);
                this.setTargetBounds({
                    height,
                    y: this.getYOffsetTargetFromPixels(initialY, height)
                });
            } else if (from.top) {
                const height = MathUtil.clamp(initialHeight - yDiff, this.minHeight, this.maxHeight);
                const actualChange = height - initialHeight;
                this.setTargetBounds({
                    height,
                    y: this.getYOffsetTargetFromPixels(initialY - actualChange, height)
                });
            }
        }));
    }

    public get content(): Container {
        return this._content.content;
    }

    public get contentHtmlWrapper(): HTMLDivElement {
        return this._content.htmlWrapper;
    }

    public get closeClicked(): SignalView<void> {
        return this._closeButton.clicked;
    }

    private get targetXPixels(): number {
        Assert.assertIsDefined(Flashbang.stageWidth);
        const offsetPx = 'offsetExact' in this._targetX
            ? this._targetX.offsetExact
            : this._targetX.offsetRatio * Flashbang.stageWidth + (this._targetX.offsetFromRatio ?? 0);

        switch (this._targetX.from) {
            case 'left':
                return offsetPx;
            case 'right':
                return Flashbang.stageWidth - this._panel.width - offsetPx;
            case 'center':
                return (Flashbang.stageWidth / 2) - ((this._panel.width) / 2) + offsetPx;
            default:
                return Assert.unreachable(this._targetX.from);
        }
    }

    private get targetYPixels(): number {
        Assert.assertIsDefined(Flashbang.stageHeight);
        const offsetPx = 'offsetExact' in this._targetY
            ? this._targetY.offsetExact
            : this._targetY.offsetRatio * Flashbang.stageHeight + (this._targetY.offsetFromRatio ?? 0);

        switch (this._targetY.from) {
            case 'top':
                return offsetPx;
            case 'bottom':
                return Flashbang.stageHeight - this._panel.height - offsetPx;
            case 'center':
                return (Flashbang.stageHeight / 2) - (this._panel.height / 2) + offsetPx;
            default:
                return Assert.unreachable(this._targetY.from);
        }
    }

    private getXOffsetTargetFromPixels(x: number, width: number): XTarget {
        Assert.assertIsDefined(Flashbang.stageWidth);

        const leftOfWindow = x;
        const centerOfWindow = x + (width / 2);
        const rightOfWindow = x + width;

        if (centerOfWindow < 0.25 * Flashbang.stageWidth || leftOfWindow < SCREEN_MARGIN * 20) {
            return {
                from: 'left',
                offsetRatio: x / Flashbang.stageWidth
            };
        } else if (
            centerOfWindow > 0.75 * Flashbang.stageWidth
            || rightOfWindow > Flashbang.stageWidth - (SCREEN_MARGIN * 20)
        ) {
            return {
                from: 'right',
                offsetRatio: (Flashbang.stageWidth - rightOfWindow) / Flashbang.stageWidth
            };
        } else {
            return {
                from: 'center',
                offsetRatio: (centerOfWindow - (Flashbang.stageWidth / 2)) / Flashbang.stageWidth
            };
        }
    }

    private getYOffsetTargetFromPixels(y: number, height: number): YTarget {
        Assert.assertIsDefined(Flashbang.stageHeight);

        const topOfWindow = y;
        const centerOfWindow = y + (height / 2);
        const bottomOfWindow = y + height;

        if (centerOfWindow < 0.25 * Flashbang.stageHeight || topOfWindow < SCREEN_MARGIN) {
            return {
                from: 'top',
                offsetRatio: y / Flashbang.stageHeight
            };
        } else if (
            centerOfWindow > 0.75 * Flashbang.stageHeight
            || bottomOfWindow > Flashbang.stageHeight - SCREEN_MARGIN
        ) {
            return {
                from: 'bottom',
                offsetRatio: (Flashbang.stageHeight - bottomOfWindow) / Flashbang.stageHeight
            };
        } else {
            return {
                from: 'center',
                offsetRatio: (centerOfWindow - (Flashbang.stageHeight / 2)) / Flashbang.stageHeight
            };
        }
    }

    private get closeButtonSize(): number {
        return this._title ? 20 : 18;
    }

    private get titleMargin(): number {
        return (this._panel.titleHeight - this.closeButtonSize) / 2;
    }

    private get minWidth(): number {
        // Accounts for space on both sides of the title (the left ribbing will be wider than the right
        // if there's a close button since we center the title irrespective of the close button and
        // the ribbing takes whatever space is left)
        const DRAG_RIBBING_MIN_WIDTH = 30;
        // Don't allow a width that doesn't fit both drag handles or the close button (if present)
        return Math.max(
            this._resizable ? this._dragHandleLeft.display.width + this._dragHandleRight.display.width : 0,
            // TODO: Would it be better to not tie the min width to the title width and mask it instead to
            // allow for greater flexibility?
            this._panel.titleTextWidth
                + (this._closable ? 2 * (this.closeButtonSize + 2 * this.titleMargin) : 0)
                + (this._movable ? DRAG_RIBBING_MIN_WIDTH + 2 * this.titleMargin : 0)
        );
    }

    private get minHeight(): number {
        // Don't allow a height that doesn't fit the title bar and drag handles (if present)
        return this._panel.titleHeight + (this._resizable ? this._dragHandleLeft.display.height : 0);
    }

    private get maxWidth(): number {
        Assert.assertIsDefined(Flashbang.stageWidth);
        return this._targetMaxWidth ?? Flashbang.stageWidth - (SCREEN_MARGIN * 2);
    }

    private get maxHeight(): number {
        Assert.assertIsDefined(Flashbang.stageHeight);
        return this._targetMaxHeight ?? Flashbang.stageHeight - (SCREEN_MARGIN * 2);
    }

    public getMaxContentSize(): { width: number; height: number; } {
        return {
            width: this._panel.width - (this._horizontalContentMargin * 2),
            height: this._panel.height - this._panel.titleHeight - (this._verticalContentMargin * 2)
        };
    }

    public get titleHeight(): number {
        return this._panel.titleHeight;
    }

    public addChildArrow(arrow: RScriptArrow): void {
        this._childrenArrows.push(arrow);
    }

    public update(_dt: number): void {
        // This is for rscript where an arrow can be "parented" to a text box such that it will point from
        // the textbox to wherever it should go. Handling this in GameWindow may not be the best option
        // (maybe we should create a subclass of GameWindow/wrapper class specifically for tutorial text boxes),
        // but I'm doing so for the sake of expediency (it maps closely to how it was handled with FancyTextBalloon)
        for (const arrow of this._childrenArrows) {
            const xdiff: number = (this.display.x + this.container.width / 2) - arrow.display.x;
            const ydiff: number = this.display.y < arrow.display.y
                ? this.display.y - arrow.display.y + this.container.height
                : this.display.y - arrow.display.y;

            if (xdiff !== 0) {
                arrow.rotation = (Math.atan(ydiff / xdiff) * 180) / Math.PI;
            } else {
                arrow.rotation = 0.0;
            }

            if (ydiff > 0.0 && xdiff < 0.0) {
                arrow.rotation += 180;
            } else if (ydiff < 0.0 && xdiff < 0.0) {
                arrow.rotation += 180;
            }

            if (ydiff < 0.0) { // Above
                arrow.baseLength = Vector2.distance(
                    arrow.display.x, arrow.display.y,
                    this.display.x + this.container.width / 2, this.display.y + this.container.height
                );
            } else { // Below
                arrow.baseLength = Vector2.distance(
                    arrow.display.x, arrow.display.y,
                    this.display.x + this.container.width / 2, this.display.y - 50
                );
            }

            arrow.redrawIfDirty();
        }
    }

    private _childrenArrows: RScriptArrow[] = [];

    private _panel: GamePanel;
    private _closeButton: GameButton;
    private _content: ScrollBox;
    private _dragHandleLeft: SpriteObject;
    private _dragHandleRight: SpriteObject;
    private _resizeHitTarget: GraphicsObject;
    private _dragRibbing: Graphics;
    private _ensureOnScreen: boolean;
    private _targetWidth: number | null = null;
    private _targetHeight: number | null = null;
    private _targetMaxWidth: number | null = null;
    private _targetMaxHeight: number | null = null;
    private _targetX: XTarget = {from: 'left', offsetExact: 0};
    private _targetY: YTarget = {from: 'top', offsetExact: 0};
    private _horizontalContentMargin: number;
    private _verticalContentMargin: number;
    private _contentVAlign: VAlign;
    private _contentHAlign: HAlign;

    private _title?: string;
    private _movable: boolean;
    private _resizable: boolean;
    private _closable: boolean;

    private _bgColor?: number;
    private _bgAlpha?: number;
    private _titleFontSize?: number;
    private _titleUpperCase?: boolean;
}
