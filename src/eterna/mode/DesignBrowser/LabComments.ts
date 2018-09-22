import {Eterna} from "../../Eterna";
import {Utility} from "../../util/Utility";

export class LabComments {
    constructor(nid: number) {
        this._solution_nid = nid;
        this._comments_data = [];
    }

    public update(): Promise<any[]> {
        return Eterna.client.getSolutionComments(this._solution_nid)
            .then(data => {
                this._comments_data = data["data"]["comments"];
                return this._comments_data;
            });
    }

    public submit_comment(body: string): Promise<any[]> {
        body = Utility.stripHtmlTags(body);
        body = Utility.stripQuotationsAndNewlines(body);

        return Eterna.client.submitSolutionComment(this._solution_nid, body)
            .then(data => {
                this._comments_data = data["data"]["comments"];
                return this._comments_data;
            });
    }

    public get_comments(): any[] {
        return this._comments_data;
    }

    private readonly _solution_nid: number;
    private _comments_data: any[];
}
