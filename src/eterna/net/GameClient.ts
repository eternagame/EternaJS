import * as log from 'loglevel';
import {Base64} from 'flashbang';
import {FoldData} from 'eterna/UndoBlock';
import {VoteData} from 'eterna/mode/DesignBrowser/VoteProcessor';
import {RankScrollData} from 'eterna/rank/RankScroll';
import {PuzzleJSON} from 'eterna/puzzle/PuzzleManager';

// we MUST do this, because we use a dom method that gives us
// any. long term AMW TODO build interfaces for each get/post
// response json.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONData = any;

interface VoteResponse {
    data: VoteDataWrapper;
}
interface VoteDataWrapper {
    votes: VoteData[];
}

type Params = Record<string, string | number | boolean | PuzzleJSON | RankScrollData | null | undefined >;

export default class GameClient {
    public readonly baseURL: string;

    constructor(baseURL: string) {
        log.info(`GameClient baseURL=${baseURL}`);
        this.baseURL = baseURL;
    }

    // / ACCOUNT

    /**
     * Authenticates the logged-in player.
     *
     * @returns resolves to a pair of user name and ID
     */
    public authenticate(): Promise<[string, number]> {
        return this.get('/eterna_authenticate.php')
            .then((rsp) => rsp.text())
            .then((res) => {
                if (res === 'NOT LOGGED IN') {
                    return Promise.resolve<[string, number]>(['Anonymous', 0]);
                } else {
                    const match = res.match(/^(.+)\s(\d+)$/);
                    if (match === null) {
                        throw new Error('Authentication response malformed');
                    } else {
                        const [, username, uid] = match;
                        return Promise.resolve<[string, number]>([username, Number(uid)]);
                    }
                }
            });
    }

    /**
     * Logs the player in.
     *
     * @returns resolves with the player's UID if successful.
     */
    public login(name: string, password: string): Promise<number> {
        return this.post('/login/', {name, pass: password, type: 'login'})
            .then((rsp) => rsp.json())
            .then((json) => {
                if (json['error'] != null) {
                    throw new Error(`Failed to log in as ${name}: ${json['error']}`);
                } else if (json['data'] == null || json['data']['uid'] == null) {
                    throw new Error('Failed to log in (bad response data)');
                }

                return Number(json['data']['uid']);
            });
    }

    /**
     * Logs the player out.
     */
    public logout(): Promise<void> {
        return this.get('/eterna_logout.php', {noredirect: true})
            .then((rsp) => rsp.text()).then(() => {});
    }

    /**
     * Gets the ban list
     *
     * @returns resolves to the JSON-data contents of the ban list
     */
    public getBannedList(): Promise<JSONData> {
        return this.get('/banned.list').then((rsp) => rsp.json());
    }

    // / PUZZLES

    public getPuzzle(puznid: number, scriptid: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {type: 'puzzle', nid: puznid, script: scriptid})
            .then((rsp: Response) => rsp.json());
    }

    public getPuzzleVotes<T extends VoteResponse>(puznid: number, round: number): Promise<T> {
        return this.get(GameClient.GET_URI, {type: 'votes', puznid, round})
            .then((rsp) => rsp.json());
    }

    public submitSolution(params: Params): Promise<JSONData> {
        params['type'] = 'post_solution';
        return this.post(GameClient.POST_URI, params).then((rsp) => rsp.json());
    }

    public submitPuzzle(params: Params): Promise<void> {
        params['type'] = 'puzzle';
        return this.post(GameClient.POST_URI, params)
            .then((rsp) => rsp.json())
            .then((json) => {
                let data = json['data'];
                if (data['success']) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(data['error']);
                }
            });
    }

    public getSolutions(puzzleID: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {type: 'solutions', puznid: puzzleID})
            .then((rsp) => rsp.json());
    }

    public getSolutionInfo(solutionID: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {type: 'solution_info', solid: solutionID, round: '1'})
            .then((rsp) => rsp.json());
    }

    public getSolutionComments(solutionID: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {nid: solutionID, type: 'comments'})
            .then((rsp) => rsp.json());
    }

    public submitSolutionComment(solutionID: number, body: string): Promise<JSONData> {
        return this.post(GameClient.POST_URI, {type: 'post_comment', nid: solutionID, body})
            .then((rsp) => rsp.json());
    }

    /** Deletes a solution. Returns nothing on success, and an error string if there was a problem. */
    public deleteSolution(solutionID: number): Promise<void> {
        return this.post(GameClient.POST_URI, {type: 'delete_solution', nid: solutionID})
            .then((rsp) => rsp.json())
            .then((json) => {
                let data = json['data'];
                if (data['success']) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(data['error']);
                }
            });
    }

    public toggleSolutionVote(solutionID: number, puznid: number, myVotes: number): Promise<JSONData> {
        let postParams: Params = {solnid: solutionID, puznid};
        if (myVotes === 1) {
            postParams['type'] = 'unvote';
        } else if (myVotes === 0) {
            postParams['type'] = 'vote';
        } else {
            throw new Error("Wrong vote value - can't submit");
        }

        return this.post(GameClient.POST_URI, postParams)
            .then((rsp) => rsp.json())
            .then((json) => {
                let data = json['data'];
                if (data['success']) {
                    return data;
                } else {
                    return Promise.reject(data['error']);
                }
            });
    }

    public updateSolutionFoldData(solutionID: number, foldData: FoldData[]): Promise<string> {
        let dataString: string = JSON.stringify(foldData);
        return this.post(GameClient.POST_URI, {
            type: 'update_solution_fold_data',
            nid: solutionID,
            'fold-data': dataString
        }).then((rsp) => rsp.text());
    }

    /** Resolves with the screenshot's hosted filename, on success */
    public postScreenshot(imgBytes: ArrayBuffer): Promise<string> {
        let encoded = Base64.encodeBytes(imgBytes);
        return this.post(GameClient.POST_URI, {
            type: 'screenshot',
            data: encoded
        }).then((rsp) => rsp.json())
            .then((jsonData) => {
                let data = jsonData['data'];
                if (data['success']) {
                    return data['filename'];
                } else {
                    throw new Error(`Failed to post screenshot: ${data['error']}`);
                }
            });
    }

    private get(urlString: string, params?: Params): Promise<Response> {
        let url: URL = this.makeURL(urlString);

        if (params) {
            // GET requests put their parameters in the URL
            Object.keys(params).forEach((key) => {
                if (typeof params[key] === 'string') {
                    url.searchParams.append(key, params[key] as string);
                } else {
                    url.searchParams.append(key, String(params[key]));
                }
            });
        }

        return fetch(url.toString(), {
            headers: new Headers({'Content-Type': 'text/plain'}),
            credentials: 'include'
        }).then((rsp) => {
            if (!rsp.ok) {
                throw new Error(`HTTP status code: ${rsp.status}`);
            }
            return rsp;
        }).catch((err) => {
            throw new Error(`${url.toString()}: ${err}`);
        });
    }

    private post(urlString: string, params?: Params): Promise<Response> {
        let url: URL = this.makeURL(urlString);

        let postParams = new URLSearchParams();
        if (params) {
            // POST requests pass params in the body
            Object.keys(params).forEach((key) => {
                if (typeof params[key] === 'string') {
                    postParams.append(key, params[key] as string);
                } else {
                    postParams.append(key, String(params[key]));
                }
            });
        }

        return fetch(url.toString(), {
            method: 'POST',
            body: postParams.toString(),
            headers: new Headers({'Content-Type': 'application/x-www-form-urlencoded'}),
            credentials: 'include'
        }).then((rsp) => {
            if (!rsp.ok) {
                throw new Error(`HTTP status code: ${rsp.status}`);
            }
            return rsp;
        }).catch((err) => {
            throw new Error(`${url.toString()}: ${err}`);
        });

        // Passing params in a FormData is more correct, I think,
        // but the server might choke with this approach?

        // let form = new FormData();
        // if (params) {
        //     // POST requests pass params via FormData, in the body
        //     Object.keys(params).forEach(key => form.append(key, params[key]));
        // }
        //
        // return fetch(url.toString(), {
        //     method: "POST",
        //     body: form,
        // }).then((rsp) => {
        //     if (!rsp.ok) {
        //         throw new Error("HTTP status code: " + rsp.status);
        //     }
        //     return rsp;
        // }).catch((err) => {
        //     throw new Error(url.toString() + ": " + err);
        // });
    }

    private makeURL(urlString: string): URL {
        return new URL(urlString, this.baseURL);
    }

    private static GET_URI: string = '/get/';
    private static POST_URI: string = '/post/';
}
