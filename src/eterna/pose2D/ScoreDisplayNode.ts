import {MathUtil} from "../../flashbang/util/MathUtil";
import {ColorUtil} from "../util/ColorUtil";

export enum ScoreDisplayNodeType {
    STACK = 0, LOOP
}

export class ScoreDisplayNode {
    public get baseIndices(): number[] {
        return this._baseIndices;
    }

    public setType(type: number, base_indices: number[], score: number): void {
        this._type = type;
        this._baseIndices = base_indices.slice();
        this._score = score;
    }

    public get score(): number {
        return this._score;
    }

    public clean(): void {
        this._baseIndices = null;
    }

    public get textLabel(): string {
        return (this._type === ScoreDisplayNodeType.STACK ? "Stack" : "Loop");
    }

    public get textScore(): string {
        return (this._score / 100).toString() + " kcal";
    }

    public get text(): string {
        return this.textLabel + "\n" + (this._score / 100).toString() + " kcal";
    }

    public get scoreColor(): number {
        let r: number = 0;
        let g: number = 0;
        let b: number = 0;

        let score: number = this._score / 100.0;
        let prog: number = 0;

        if (score > 0) {
            prog = MathUtil.clamp(score / 5.0, 0, 1);
            r = 1;
            g = (1 - prog) + (30 / 255) * prog;
            b = (1 - prog) + (30 / 255) * prog;

        } else {
            prog = MathUtil.clamp(score / -5.0, 0, 1);
            g = 1;
            r = (1 - prog) + (30 / 255) * prog;
            b = (1 - prog) + (30 / 255) * prog;
        }

        return ColorUtil.compose(r, g, b);
    }

    public get scoreString(): string {
        return (this._score / 100.0).toString();

    }

    private _type: number;
    private _baseIndices: number[];
    private _score: number;
}
