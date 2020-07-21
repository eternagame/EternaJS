import Eterna from 'eterna/Eterna';
import Feedback from 'eterna/Feedback';
import {FoldData} from 'eterna/UndoBlock';

export default class Solution {
    constructor(nid: number, puzzleNID: number) {
        this._nid = nid;
        this._puzzleNid = puzzleNID;
    }

    public set freeEnergy(fe: number) {
        this._freeEnergy = fe;
    }

    public set round(round: number) {
        this._round = round;
    }

    public set desc(desc: string) {
        this._desc = desc;

        if (this._desc) {
            let newlinereg = /\n/g;
            this._shortDesc = this._desc.replace(newlinereg, ' ');
            newlinereg = /\r/g;
            this._shortDesc = this._shortDesc.replace(newlinereg, ' ');
        } else {
            this._shortDesc = 'No description available';
            this._desc = 'No description available';
        }
    }

    public set foldData(fd: FoldData[]) {
        this._foldData = fd;
        if (this._foldData != null) {
            this._hasFoldData = true;
        }
    }

    public get title(): string {
        return this._title;
    }

    public set title(title: string) {
        this._title = title;

        let newlinereg = /\n/g;
        this._title = this._title.replace(newlinereg, ' ');
        newlinereg = /\r/g;
        this._title = this._title.replace(newlinereg, ' ');
    }

    public get nodeID(): number {
        return this._nid;
    }

    public get puzzleNID(): number {
        return this._puzzleNid;
    }

    public get sequence(): string {
        return this._sequence;
    }

    public set sequence(sequence: string) {
        this._sequence = sequence;
    }

    public get expFeedback(): Feedback | null {
        return this._expFeedback;
    }

    public set expFeedback(fb: Feedback | null) {
        this._expFeedback = fb;
    }

    public get playerID(): number {
        return this._playerID;
    }

    public get playerName(): string {
        return this._playerName;
    }

    public get fullDescription(): string {
        return this._desc;
    }

    public get hasFoldData(): boolean {
        return this._hasFoldData;
    }

    public set hasFoldData(avail: boolean) {
        this._hasFoldData = avail;
    }

    public get synthetized() {
        return this.expFeedback?.isFailed() === 0;
    }

    public canVote(round: number) {
        return !this.synthetized
            && this.getProperty('Synthesized') === 'n'
            && this.getProperty('Round') === round;
    }

    public setNumPairs(gc: number, gu: number, ua: number): void {
        this._numGCs = gc;
        this._numGUs = gu;
        this._numUAs = ua;
    }

    public meltingPoint(mp: number) {
        this._meltingPoint = mp;
    }

    public setNumVotes(numVotes: number, numMyVotes: number): void {
        this._numVotes = numVotes;
        this._numMyVotes = numMyVotes;
    }

    public setPlayer(name: string, id: number): void {
        this._playerID = id;
        this._playerName = name;
    }

    public setSynthesis(round: number, score: number): void {
        this._synthesizedRound = round;
        if (this._synthesizedRound > 0) {
            this._synthesisScore = score;
        } else {
            this._synthesisScore = -1;
        }
    }

    public queryFoldData(): Promise<FoldData[] | null> {
        if (this._hasFoldData) {
            if (this._foldData != null) {
                return Promise.resolve(this._foldData);
            } else {
                return Eterna.client.getSolutionInfo(this._nid).then((json) => {
                    let data = json['data'];
                    if (data['solution'] != null) {
                        this.foldData = JSON.parse(data['solution']['fold-data']);
                    }

                    return this._foldData;
                });
            }
        } else {
            return Promise.resolve(null);
        }
    }

    // AMW TODO what why
    public getProperty(keyword: string): string | number {
        if (keyword === 'Title') {
            return this._title;
        } else if (keyword === 'GU Pairs') {
            return this._numGUs;
        } else if (keyword === 'GC Pairs') {
            return this._numGCs;
        } else if (keyword === 'UA Pairs') {
            return this._numUAs;
        } else if (keyword === 'Melting Point') {
            return this._meltingPoint;
        } else if (keyword === 'Designer') {
            return this._playerName;
        } else if (keyword === 'Sequence') {
            return this._sequence;
        } else if (keyword === 'Free Energy') {
            return this._freeEnergy;
        } else if (keyword === 'Description') {
            return this._shortDesc;
        } else if (keyword === 'Round') {
            return this._round;
        } else if (keyword === 'Votes') {
            if (this._synthesizedRound) {
                return -1;
            }
            return this._numVotes;
        } else if (keyword === 'My Votes') {
            if (this._synthesizedRound) {
                return -1;
            }
            return this._numMyVotes;
        } else if (keyword === 'Synthesized') {
            if (this._synthesizedRound > 0) {
                return 'y';
            } else {
                return 'n';
            }
        } else if (keyword === 'Synthesis score') {
            if (this._expFeedback != null && this._expFeedback.getShapeData() != null) {
                return this._synthesisScore;
            } else if (this._expFeedback != null && this._expFeedback.isFailed() !== 0) {
                return this._expFeedback.isFailed();
            } else {
                return Feedback.EXPCODES[Feedback.EXPSTRINGS.indexOf('NOT SYNTHESIZED')];
            }
        } else if (keyword === 'Id') {
            return this._nid;
        }

        throw new Error(`Undefiend solution property ${keyword}`);
    }

    private readonly _nid: number;
    private readonly _puzzleNid: number;

    private _sequence: string;
    private _title: string;
    private _playerID: number = -1;
    private _playerName: string = '';
    private _numGUs: number;
    private _numGCs: number;
    private _numUAs: number;
    private _meltingPoint: number = -1;
    private _freeEnergy: number;
    private _desc: string;
    private _round: number;
    private _numVotes: number = 0;
    private _numMyVotes: number = 0;
    private _synthesizedRound: number = 0;
    private _synthesisScore: number = 0;
    private _expFeedback: Feedback | null;
    private _shortDesc: string;
    private _hasFoldData: boolean = false;
    private _foldData: FoldData[] | null = null;
}
