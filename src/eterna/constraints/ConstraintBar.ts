import {ContainerObject, Flashbang} from 'flashbang';
import {Point} from 'pixi.js';
import {Value} from 'signals';
import Eterna from 'eterna/Eterna';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import ROPWait from 'eterna/rscript/ROPWait';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import ShapeConstraint, {AntiShapeConstraint} from './constraints/ShapeConstraint';
import ConstraintBox from './ConstraintBox';
import Constraint, {BaseConstraintStatus, HighlightInfo, ConstraintContext} from './Constraint';

interface ConstraintWrapper {
    constraint: Constraint<BaseConstraintStatus>;
    constraintBox: ConstraintBox;
    highlightCache?: HighlightInfo;
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
    public sequenceHighlights: Value<HighlightInfo[]> = new Value(null);

    constructor(constraints: Constraint<BaseConstraintStatus>[]) {
        super();
        this._constraints = constraints.map(
            (constraint) => ({constraint, constraintBox: new ConstraintBox(false)})
        );

        Eterna.settings.highlightRestricted.connect(() => {
            this.updateHighlights();
        });
    }

    protected added() {
        for (let constraint of this._constraints) {
            this.addObject(constraint.constraintBox, this.container);
            constraint.constraintBox.pointerDown.connect(() => {
                this.onConstraintBoxClicked(constraint);
            });
        }
    }

    /**
     * @param animate "Fly in" constraints from the middle of the screen
     * @param pipStates If > 1, lay out structure-related constraints such that they align (as best as possible)
     * to the states they're intended for in PiP mode
     */
    public layout(animate: boolean, pipStates: number) {
        let nonStateConstraints = this._constraints.filter((constraint) => !isSSCW(constraint));

        if (animate) {
            for (let [idx, constraint] of this._constraints.entries()) {
                constraint.constraintBox.setLocation(new Point(
                    (Flashbang.stageWidth * 0.3),
                    (Flashbang.stageHeight * 0.4) + (idx * 77)
                ));
            }
        }

        let xWalker = 17;
        let yPos = 35;

        for (let constraint of nonStateConstraints) {
            let box = constraint.constraintBox;
            box.setLocation(new Point(xWalker, yPos), animate);
            xWalker += 119;
        }

        if (nonStateConstraints.length > 0) {
            xWalker += 25;
        }

        let stateConstraints = this._constraints.filter(isSSCW).sort(
            (a, b) => ((
                (a.constraint instanceof ShapeConstraint && b.constraint instanceof AntiShapeConstraint)
                || a.constraint.stateIndex < b.constraint.stateIndex
            ) ? -1 : 1)
        );

        for (let constraint of stateConstraints) {
            xWalker = pipStates > 1
                ? Math.max(xWalker, (constraint.constraint.stateIndex / pipStates) * Flashbang.stageWidth + 17)
                : xWalker;

            let box = constraint.constraintBox;
            box.setLocation(new Point(xWalker, yPos), animate);
            xWalker += 77;
        }
    }

    public updateHighlights(): void {
        let highlights: HighlightInfo[] = [];
        for (let constraint of this._constraints) {
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
    }

    public updateConstraints(context: ConstraintContext): boolean {
        let satisfied = true;

        for (let constraint of this._constraints) {
            let status = constraint.constraint.evaluate(context);
            constraint.constraintBox.setContent(
                constraint.constraint.getConstraintBoxConfig(
                    status,
                    false,
                    context.undoBlocks,
                    context.targetConditions
                )
            );
            constraint.highlightCache = status.satisfied
                ? null : constraint.constraint.getHighlight(status, context);
            satisfied = satisfied && status.satisfied;
        }

        this.updateHighlights();

        return satisfied;
    }

    /**
     * Fade the constraints for states that aren't being shown on screen
     * @param stateIndex pass -1 to return all boxes to normal
     */
    public highlightState(stateIndex: number): void {
        let stateConstraints = this._constraints.filter(isSSCW);
        for (let constraint of stateConstraints) {
            constraint.constraintBox.display.alpha = (
                constraint.constraint.stateIndex === stateIndex || stateIndex === -1
            ) ? 1.0 : 0.3;
        }
    }

    public getConstraintBox(index: number): ConstraintBox {
        return this._constraints[index].constraintBox;
    }

    public getShapeBox(index: number): ConstraintBox {
        return this._constraints.filter(
            (constraint) => (
                constraint.constraint instanceof ShapeConstraint
                && constraint.constraint.stateIndex === index
            )
        )[0].constraintBox;
    }

    public serializeConstraints(): string {
        return this._constraints.map(
            (constraint) => constraint.constraint.serialize()
        ).reduce(
            (all, current) => all.concat(current),
            []
        ).join(',');
    }

    private _constraints: ConstraintWrapper[];
    private _flaggedConstraint: ConstraintWrapper;
}
