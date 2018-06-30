import {ColorUtil} from "../util/ColorUtil";

export enum ScoreDisplayNodeType {
    STACK = 0, LOOP
}

export class ScoreDisplayNode {
    public get_base_indices(): number[] {
        return this._base_indices;
    }

    public set_type(type: number, base_indices: number[], score: number): void {
        this._type = type;
        this._base_indices = base_indices.slice();
        this._score = score;
    }

    public get_score(): number {
        return this._score;
    }

    public clean(): void {
        this._base_indices = null;
    }

    public get_text_label(): string {
        return (this._type == ScoreDisplayNodeType.STACK ? "Stack" : "Loop");
    }

    public get_text_score(): string {
        return (this._score / 100).toString() + " kcal";
    }

    public get_text(): string {
        return this.get_text_label() + "\n" + (this._score / 100).toString() + " kcal";
    }

    public getScoreColor(): number {
        let r: number = 0;
        let g: number = 0;
        let b: number = 0;

        let score: number = this._score / 100.0;
        let prog: number = 0;

        if (score > 0) {
            prog = score / 5.0;
            if (prog > 1) {
                prog = 1;
            }
            if (prog < 0) {
                prog = 0;
            }

            r = 1;
            g = (1 - prog) + (30 / 255) * prog;
            b = (1 - prog) + (30 / 255) * prog;
        } else {
            prog = score / -5.0;
            if (prog > 1) {
                prog = 1;
            }
            if (prog < 0) {
                prog = 0;
            }

            g = 1;
            r = (1 - prog) + (30 / 255) * prog;
            b = (1 - prog) + (30 / 255) * prog;
        }

        return ColorUtil.compose(r, g, b);
    }

    public getScoreString(): string {
        return (this._score / 100.0).toString();

    }

    private _type: number;
    private _base_indices: number[];
    private _score: number;
}
