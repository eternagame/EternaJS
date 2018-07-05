export class PlayerRank {
    public name: string;
    public score: number;
    public rank: number;

    constructor(name: string, score: number) {
        this.name = name;
        this.score = score;
        this.rank = 0;
    }

    public toString(): string {
        return this.name + " " + this.score;
    }
}
