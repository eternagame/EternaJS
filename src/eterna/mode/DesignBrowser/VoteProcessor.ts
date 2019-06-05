import Eterna from "eterna/Eterna";
import {SolutionManager} from "eterna/puzzle";
import {int} from "eterna/util";

export default class VoteProcessor {
    public process_data(data: any[]): void {
        let solutionIDs: number[] = [];
        let voteCounts: number[] = [];
        let myVoteCounts: number[] = [];
        let totalMyVotes = 0;

        this._votesLeft = 0;

        for (let ii = data.length - 1; ii >= 0; ii--) {
            let obj: any = data[ii];

            let nid = Number(obj["solnid"]);
            let is_mine: boolean = Eterna.playerID == Number(obj["uid"]);
            let vote_count: number = int(obj["count"]);

            let index = solutionIDs.indexOf(nid);

            if (index < 0) {
                solutionIDs.push(nid);
                voteCounts.push(vote_count);
                if (is_mine) {
                    myVoteCounts.push(vote_count);
                    totalMyVotes += vote_count;
                } else {
                    myVoteCounts.push(0);
                }
            } else {
                voteCounts[index] += vote_count;
                if (is_mine) {
                    myVoteCounts[index] += vote_count;
                    totalMyVotes += vote_count;
                }
            }
        }

        for (let solution of SolutionManager.instance.solutions) {
            let idx = solutionIDs.indexOf(solution.nodeID);
            if (idx >= 0) {
                solution.setNumVotes(voteCounts[idx], myVoteCounts[idx]);
            }
        }

        this._votesLeft = VoteProcessor.MAX_VOTES - totalMyVotes;
    }

    public get votesLeft(): number {
        return this._votesLeft;
    }

    public update_votes(puznid: number, round: number): Promise<void> {
        return Eterna.client.getPuzzleVotes(puznid, round).then((json) => {
            let data: any = json["data"];
            this.process_data(data["votes"]);
        });
    }

    private _votesLeft: number = 0;

    private static readonly MAX_VOTES = 8;
}
