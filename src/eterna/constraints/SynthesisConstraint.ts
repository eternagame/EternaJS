import Constraint from "./Constraint";
import { ConsecutiveAConstraint, ConsecutiveGConstraint, ConsecutiveCConstraint } from "./ConsecutiveBaseConstraint";

export default class SynthesisConstraint extends Constraint {
    public static readonly NAME = "LAB_REQUIREMENTS";

    private _consecutiveAConstraint = new ConsecutiveAConstraint(5);
    private _consecutiveGConstraint = new ConsecutiveGConstraint(4);
    private _consecutiveCConstraint = new ConsecutiveCConstraint(4);
}