import {ColorUtil, MathUtil} from 'flashbang';

export enum ScoreDisplayNodeType {
    STACK = 0, LOOP
}

export default class ScoreDisplayNode {
    public get baseIndices(): number[] | null {
        return this._baseIndices;
    }

    public setType(type: number, baseIndices: number[], score: number): void {
        this._type = type;
        this._baseIndices = baseIndices.slice();
        this._score = score;
    }

    public get score(): number {
        return this._score;
    }

    public clean(): void {
        this._baseIndices = null;
    }

    public get textLabel(): string {
        return (this._type === ScoreDisplayNodeType.STACK ? 'Stack' : 'Loop');
    }

    public get textScore(): string {
        return `${(this._score / 100).toString()} kcal`;
    }

    public get text(): string {
        return `${this.textLabel}\n${(this._score / 100).toString()} kcal`;
    }

    public get scoreColor(): number {
        let r = 0;
        let g = 0;
        let b = 0;

        let score: number = this._score / 100.0;
        let prog = 0;

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
    private _baseIndices: number[] | null;
    private _score: number;
}
