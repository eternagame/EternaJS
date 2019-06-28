import { ConstraintBox } from "eterna/ui";

export default abstract class Constraint {
    public abstract constraintBox: ConstraintBox;
    public static readonly NAME: string;
}