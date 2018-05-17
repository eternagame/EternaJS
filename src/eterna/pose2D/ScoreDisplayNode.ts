import {Utility} from "../util/Utility";

export class ScoreDisplayNode {

    public static SCORENODE_STACK: number = 0;
    public static SCORENODE_LOOP: number = 1;
    public static SCORENODE_UNDEFINED: number = 2;

    private _type: number;
    private _base_indices: any[];
    private _score: number;

    public constructor() {
    }

    public get_base_indices(): any[] {
        return this._base_indices;
    }

    public set_type(type: number, base_indices: any[], score: number): void {
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
        if (this._type == ScoreDisplayNode.SCORENODE_STACK) {
            return "Stack";
        }
        return "Loop";

    }

    public get_text_score(): string {
        return (this._score / 100).toString() + " kcal";
    }

    public get_text(): string {
        let txt: string = "";

        if (this._type == ScoreDisplayNode.SCORENODE_STACK) {
            txt += "Stack\n";
        } else {
            txt += "Loop\n"
        }

        txt += (this._score / 100).toString() + " kcal";

        return txt;
    }

    public get_number(): string {
        return (this._score / 100).toString();
    }

    public get_colored_number(): string {
        let r: number = 0;
        let g: number = 0;
        let b: number = 0;

        let score: number = this._score / 100.0;
        let prog: number = 0;

        if (score > 0) {
            prog = score / 5.0;
            if (prog > 1)
                prog = 1;
            if (prog < 0)
                prog = 0;

            r = 255;
            g = 255 * (1 - prog) + 30 * prog;
            b = 255 * (1 - prog) + 30 * prog;
        } else {
            prog = score / -5.0;
            if (prog > 1)
                prog = 1;
            if (prog < 0)
                prog = 0;

            g = 255;
            r = 255 * (1 - prog) + 30 * prog;
            b = 255 * (1 - prog) + 30 * prog;
        }

        let color: string = Utility.byte2hex(r) + Utility.byte2hex(g) + Utility.byte2hex(b);

        return "<FONT COLOR=\"#" + color + "\">" + (score).toString() + "</FONT>";

    }
}
