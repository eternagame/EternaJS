import Eterna from 'eterna/Eterna';
import Utility from 'eterna/util/Utility';

export interface CommentsData {
    name: string;
    comment: string;
    uid: number;
    created: string;
}

export default class LabComments {
    constructor(nid: number) {
        this._solutionNID = nid;
        this._commentsData = [];
    }

    public update(): Promise<CommentsData[]> {
        return Eterna.client.getSolutionComments(this._solutionNID)
            .then((data) => {
                this._commentsData = data['data']['comments'];
                return this._commentsData;
            });
    }

    public submitComment(body: string): Promise<CommentsData[]> {
        return Eterna.client.submitSolutionComment(this._solutionNID, body)
            .then((data) => {
                this._commentsData = data['data']['comments'];
                return this._commentsData;
            });
    }

    public getComments(): CommentsData[] {
        return this._commentsData;
    }

    private readonly _solutionNID: number;
    private _commentsData: CommentsData[];
}
