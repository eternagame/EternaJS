export default class PlayerRank {
    public name: string;
    public score: number;
    public rank: number;

    constructor(name: string, score: number | string) {
        this.name = name;
        this.score = Number(score);
        this.rank = 0;
    }

    public clone(): PlayerRank {
        let theClone = new PlayerRank(this.name, this.score);
        theClone.rank = this.rank;
        return theClone;
    }

    public toString(): string {
        return `${this.name} ${this.score}`;
    }
}
