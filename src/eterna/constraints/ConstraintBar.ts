import {
    ContainerObject, Flashbang, ParallelTask, LocationTask, Easing, AlphaTask
} from 'flashbang';
import {
    Point, Graphics, Container, Sprite, InteractionEvent
} from 'pixi.js';
import {Value} from 'signals';
import Eterna from 'eterna/Eterna';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import ROPWait from 'eterna/rscript/ROPWait';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import Assert from 'flashbang/util/Assert';
import GraphicsObject from 'flashbang/objects/GraphicsObject';
import ShapeConstraint, {AntiShapeConstraint} from './constraints/ShapeConstraint';
import ConstraintBox from './ConstraintBox';
import Constraint, {BaseConstraintStatus, HighlightInfo, ConstraintContext} from './Constraint';

interface ConstraintWrapper {
    constraint: Constraint<BaseConstraintStatus>;
    constraintBox: ConstraintBox;
    highlightCache: HighlightInfo | null;
}

interface StateSpecificConstraintWrapper extends ConstraintWrapper {
    constraint: ShapeConstraint | AntiShapeConstraint;
}

function isSSCW(
    constraint: ConstraintWrapper | StateSpecificConstraintWrapper
): constraint is StateSpecificConstraintWrapper {
    return constraint.constraint instanceof ShapeConstraint || constraint.constraint instanceof AntiShapeConstraint;
}

export default class ConstraintBar extends ContainerObject {
    private static readonly config = {
        maxWidth: 0.75, // in percent of stage width
        animDuration: 0.2,
        startPos: new Point(17, 37),
        offset: 5,
        constraintHeight: 75,
        padding: 8,
        spacing: 8
    };

    public sequenceHighlights: Value<HighlightInfo[]> | Value<null> = new Value(null);

    private _collapsed = false;
    private _background: GraphicsObject;
    private _mask: Graphics;
    private _constraintsRoot: Container;
    private _constraintsLayer: Container;
    private _constraintsTooltips: Container;
    private _totalWidth = 0;
    private _selectedConstraint: ConstraintWrapper | null = null;
    private _selectionArrow: Sprite;
    private _drawerTip: Sprite;

    // Dragging
    private _potentialDrag = false;
    private _backgroundDrag = false;
    private _drag = false;
    private _previousDragPos = -1;

    constructor(constraints: Constraint<BaseConstraintStatus>[] | null, states = 1) {
        super();
        this._constraints = constraints
            ? constraints.map(
                (constraint) => ({constraint, constraintBox: new ConstraintBox(false, states), highlightCache: null})
            ) : [];

        Eterna.settings.highlightRestricted.connect(() => {
            this.updateHighlights();
        });
    }

    protected added() {
        const {config} = ConstraintBar;

        const drawerEnabled = this._constraints.length > 1;
        if (drawerEnabled) {
            // Background
            this._background = (() => {
                const bg = new GraphicsObject();
                this.addObject(bg, this.container);

                bg.pointerDown.connect((e: InteractionEvent) => {
                    this._backgroundDrag = true;
                    this._drag = true;
                    this._previousDragPos = e.data.global.x;
                });
                bg.pointerMove.connect((e: InteractionEvent) => {
                    if (!this._drag) {
                        return;
                    }
                    const deltaPos = e.data.global.x - this._previousDragPos;
                    this.scrollConstraints(deltaPos);
                    this._previousDragPos = e.data.global.x;
                });
                bg.pointerUp.connect((_e: InteractionEvent) => {
                    this._drag = false;
                    this._backgroundDrag = false;
                });
                bg.display.on('pointerupoutside', (_e: InteractionEvent) => {
                    this._drag = false;
                    this._backgroundDrag = false;
                });
                return bg;
            })();

            // Mask
            this._mask = new Graphics();

            // Selection Arrow
            this._selectionArrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgConstraintArrowUp));
            this._selectionArrow.visible = false;

            // Drawer tip
            this._drawerTip = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgConstraintDrawerTip));
            this._background.display.addChild(this._drawerTip);
            this._drawerTip.interactive = true;
            this._drawerTip.on('pointertap', (_e: InteractionEvent) => this.collapse());
            this._drawerTip.visible = false;
        }

        // Constraint boxes
        const constraintsContainer = new Container(); // contains the constraints and the selection arrow
        this._constraintsLayer = new Container();
        this._constraintsRoot = new Container();
        this._constraintsRoot.position.y = config.startPos.y;
        constraintsContainer.addChild(this._constraintsLayer);
        this._constraintsRoot.addChild(constraintsContainer);
        this.container.addChild(this._constraintsRoot);

        if (this._selectionArrow) {
            constraintsContainer.addChild(this._selectionArrow);
        }

        this._constraintsTooltips = new Container();
        this._constraintsTooltips.position.y = this._constraintsLayer.position.y;
        this._constraintsRoot.addChild(this._constraintsTooltips);

        if (this._mask) {
            constraintsContainer.mask = this._mask;
        }

        for (const constraint of this._constraints) {
            this.addObject(constraint.constraintBox, this._constraintsLayer);

            if (drawerEnabled) {
                constraint.constraintBox.pointerDown.connect((e: InteractionEvent) => {
                    this._potentialDrag = true;
                    this._previousDragPos = e.data.global.x;
                });

                constraint.constraintBox.pointerMove.connect((e: InteractionEvent) => {
                    if (!this._potentialDrag) {
                        return;
                    }
                    const deltaPos = e.data.global.x - this._previousDragPos;
                    if (Math.abs(deltaPos) > 0) {
                        this._drag = true;
                    }

                    if (!this._drag) {
                        return;
                    }

                    this.scrollConstraints(deltaPos);
                    this._previousDragPos = e.data.global.x;
                });

                constraint.constraintBox.pointerOut.connect((_e: InteractionEvent) => {
                    if (this._backgroundDrag) {
                        return;
                    }
                    this._drag = false;
                    this._potentialDrag = false;
                });
            }

            constraint.constraintBox.pointerTap.connect((_e: InteractionEvent) => {
                this._potentialDrag = false;
                if (this._drag) {
                    this._drag = false;
                    return;
                }
                this.onConstraintBoxClicked(constraint);
            });
        }
    }

    public layout() {
        const {config} = ConstraintBar;
        const positioning = this.getPositioningInfo();
        this._totalWidth = positioning.totalWidth;

        if (!this._collapsed) {
            // Position boxes
            positioning.positions.forEach((info) => {
                const box = info.constraint.constraintBox;
                box.setLocation(new Point(info.position, 0));
            });
        }

        // Drawer elements
        if (this._background && this.display.visible) {
            Assert.assertIsDefined(Flashbang.stageWidth);
            const drawerWidth = Math.min(Flashbang.stageWidth * config.maxWidth, positioning.totalWidth);
            const backgroundY = config.startPos.y - config.padding;
            const backgroundHeight = config.constraintHeight + config.padding * 2;
            this._background.display.clear();
            this._background.display.beginFill(0x2A4366, 1);
            this._background.display.drawRect(
                0,
                backgroundY,
                drawerWidth,
                backgroundHeight
            );
            this._background.display.endFill();

            this._mask.clear();
            this._mask.beginFill(0, 1);
            this._mask.drawRect(0, backgroundY, drawerWidth, backgroundHeight);
            this._mask.endFill();

            this._drawerTip.visible = true;
            this._drawerTip.position.set(drawerWidth, backgroundY);
            this._drawerTip.height = backgroundHeight;

            // Selection arrow
            if (!this._collapsed) {
                this._selectionArrow.visible = true;
                if (!this._selectedConstraint) {
                    this._selectedConstraint = positioning.positions[0].constraint;
                }
                this._selectionArrow.position.set(
                    (() => {
                        const info = positioning.positions.find((p) => p.constraint === this._selectedConstraint);
                        // AMW TODO: What is the correct behavior here?
                        Assert.assertIsDefined(info);
                        return info.position + info.size / 2 - this._selectionArrow.width / 2;
                    })(),
                    config.constraintHeight
                );
            }

            // Clamp scroll position whithin bounds if necessary
            this.scrollConstraints(0);
        }
    }

    public updateHighlights(): void {
        if (!this._constraints) return;
        const highlights: HighlightInfo[] = [];
        for (const constraint of this._constraints) {
            if (constraint.highlightCache != null && (
                (
                    constraint.highlightCache.color === HighlightType.UNSTABLE
                    && constraint === this._flaggedConstraint
                ) || (
                    constraint.highlightCache.color === HighlightType.RESTRICTED
                    && Eterna.settings.highlightRestricted.value
                ) || (
                    constraint.highlightCache.color === HighlightType.USER_DEFINED
                )
            )) {
                highlights.push(constraint.highlightCache);
            }
        }
        this.sequenceHighlights.value = highlights;
    }

    public onConstraintBoxClicked(constraint: ConstraintWrapper): void {
        if (isSSCW(constraint)) {
            if (this._flaggedConstraint === constraint) {
                this._flaggedConstraint.constraintBox.flagged = false;
                this._flaggedConstraint = null;
                this.updateHighlights();
            } else {
                if (this._flaggedConstraint) this._flaggedConstraint.constraintBox.flagged = false;
                this._flaggedConstraint = constraint;
                constraint.constraintBox.flagged = true;
                this.updateHighlights();
            }
            ROPWait.notifyClickUI(RScriptUIElementID.SHAPEOBJECTIVE);
        }

        if (this._collapsed) {
            this.expand();
        } else {
            this._selectedConstraint = constraint;
            this.layout();
        }
    }

    public updateConstraints(context: ConstraintContext, soft: boolean = false): boolean {
        let satisfied = true;

        for (const constraint of this._constraints) {
            const status = constraint.constraint.evaluate(context);
            constraint.constraintBox.setContent(
                constraint.constraint.getConstraintBoxConfig(
                    status,
                    false,
                    context.undoBlocks,
                    context.targetConditions
                ),
                this._constraintsTooltips
            );
            constraint.highlightCache = status.satisfied
                ? null : constraint.constraint.getHighlight(status, context);

            // Hack to allow certain constraints to be required to be met even if the SOFT
            // constraint would otherwise mean no constraint is required. Really we should allow
            // individual constraints to be enabled/disabled in the puzzle definition rather than it
            // being all or nothing
            const isSoft = soft && !constraint.constraint.hard;
            satisfied = satisfied && (status.satisfied || isSoft);
        }

        this.updateHighlights();

        return satisfied;
    }

    /**
     * Fade the constraints for states that aren't being shown on screen
     * @param stateIndex pass -1 to return all boxes to normal
     */
    public highlightState(stateIndex: number): void {
        if (!this._constraints) return;
        const stateConstraints = this._constraints.filter(isSSCW);
        for (const constraint of stateConstraints) {
            constraint.constraintBox.display.alpha = (
                constraint.constraint.stateIndex === stateIndex || stateIndex === -1
            ) ? 1.0 : 0.3;
        }
    }

    public getConstraintBox(index: number): ConstraintBox | null {
        if (!this._constraints) return null;
        return this._constraints[index]?.constraintBox;
    }

    public getShapeBox(index: number): ConstraintBox | null {
        if (!this._constraints) return null;
        return this._constraints.filter(
            (constraint) => (
                constraint.constraint instanceof ShapeConstraint
                && constraint.constraint.stateIndex === index
            )
        )[0].constraintBox;
    }

    public serializeConstraints(): string | undefined {
        if (!this._constraints) return undefined;
        return this._constraints.map(
            (constraint) => constraint.constraint.serialize()
        ).reduce(
            (all, current) => (all as string[]).concat(current as string[]) as [string, string]
        ).join(',');
    }

    private scrollConstraints(offset: number) {
        this._constraintsRoot.x = Math.min(
            0,
            Math.max(this._constraintsRoot.x + offset, this._mask.width - this._totalWidth)
        );
    }

    private collapse() {
        Assert.assertIsDefined(this._selectedConstraint);
        this._collapsed = true;
        const {config} = ConstraintBar;

        // Ensure top constraint in the stack is opaque
        this._selectedConstraint.constraintBox.setOpaqueBackdropVisible(true);
        const selectedContainer = this._selectedConstraint.constraintBox.container;

        const childIndex = this._constraintsLayer.children.indexOf(selectedContainer);
        if (childIndex !== this._constraintsLayer.children.length) {
            // Swap constraint with last element, to make it look on top
            const previousTop = this._constraintsLayer.children.slice(-1)[0];
            this._constraintsLayer.children[this._constraintsLayer.children.length - 1] = selectedContainer;
            this._constraintsLayer.children[childIndex] = previousTop;
        }

        // Collapse
        this.addObject(
            new ParallelTask(
                // In case layer was scrolled, bring it back to 0
                new LocationTask(
                    0,
                    this._constraintsRoot.position.y,
                    config.animDuration,
                    Easing.easeIn,
                    this._constraintsRoot
                ),
                // Move constraint boxes
                ...this._constraintsLayer.children.map((c, index) => new LocationTask(
                    config.startPos.x + (this._constraintsLayer.children.length - index) * config.offset,
                    c.position.y,
                    config.animDuration,
                    Easing.easeIn,
                    c
                ))
            )
        );

        // Fade-out
        this.addObject(
            new ParallelTask(
                new AlphaTask(0, config.animDuration, Easing.easeIn, this._background.display),
                new AlphaTask(0, config.animDuration, Easing.easeIn, this._drawerTip),
                new AlphaTask(0, config.animDuration, Easing.easeIn, this._selectionArrow)
            )
        );
    }

    private expand() {
        Assert.assertIsDefined(this._selectedConstraint);

        this._collapsed = false;
        const {config} = ConstraintBar;

        this._selectedConstraint.constraintBox.setOpaqueBackdropVisible(false);

        const positioning = this.getPositioningInfo();
        this.addObject(
            new ParallelTask(
                ...positioning.positions.map((position) => new LocationTask(
                    position.position,
                    position.constraint.constraintBox.container.position.y,
                    config.animDuration,
                    Easing.easeIn,
                    position.constraint.constraintBox.container
                ))
            )
        );

        // Fade-in
        this.addObject(
            new ParallelTask(
                new AlphaTask(1, config.animDuration, Easing.easeIn, this._background.display),
                new AlphaTask(1, config.animDuration, Easing.easeIn, this._drawerTip),
                new AlphaTask(1, config.animDuration, Easing.easeIn, this._selectionArrow)
            )
        );
    }

    private getPositioningInfo() {
        const nonStateConstraints = {
            constraints: this._constraints.filter((constraint) => !isSSCW(constraint)),
            size: 110
        };

        const stateConstraints = {
            constraints: this._constraints.filter(isSSCW).sort(
                (a, b) => ((
                    (a.constraint instanceof ShapeConstraint && b.constraint instanceof AntiShapeConstraint)
                    || a.constraint.stateIndex < b.constraint.stateIndex
                ) ? -1 : 1)
            ),
            size: 74
        };
        const constraints = [nonStateConstraints, stateConstraints];

        const {config} = ConstraintBar;
        let xWalker = config.startPos.x;
        const positions = constraints.reduce((prev, cur) => prev.concat(cur.constraints.map((constraint) => {
            const info = {
                constraint,
                position: xWalker,
                size: cur.size
            };
            xWalker += cur.size + config.spacing;
            return info;
        })), [] as Array<{
            constraint: ConstraintWrapper;
            position: number;
            size: number;
        }>);

        return {
            positions,
            totalWidth: xWalker
        };
    }

    private _constraints: ConstraintWrapper[];
    private _flaggedConstraint: ConstraintWrapper | null;
}
