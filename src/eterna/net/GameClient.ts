import * as log from "loglevel";

type JSONData = any;

export class GameClient {
    public constructor(baseURL: string) {
        log.info(`GameClient baseURL=${baseURL}`);
        this._baseURL = baseURL;
    }

    // / ACCOUNT

    /** Authenticates the logged-in player. */
    public authenticate(): Promise<[string, number]> {
        return this.get("/eterna_authenticate.php")
            .then(rsp => rsp.text())
            .then((res) => {
                if (res === "NOT LOGGED IN") {
                    return Promise.resolve<[string, number]>(["Anonymous", 0]);
                } else {
                    try {
                        let [match, username, uid] = res.match(/^(.+)\s(\d+)$/);
                        return Promise.resolve<[string, number]>([username, Number(uid)]);
                    } catch (e) {
                        throw new Error("Authentication response malformed");
                    }
                }
            });
    }

    /** Logs the player in. Resolves with the player's UID if successful. */
    public login(name: string, password: string): Promise<number> {
        return this.post("/login/", {name, pass: password, type: "login"})
            .then(rsp => rsp.json())
            .then((json) => {
                if (json["error"] != null) {
                    throw new Error(`Failed to log in as ${name}: ${json["error"]}`);
                } else if (json["data"] == null || json["data"]["uid"] == null) {
                    throw new Error("Failed to log in (bad response data)");
                }

                return Number(json["data"]["uid"]);
            });
    }

    public logout(): Promise<void> {
        return this.get("/eterna_logout.php", {noredirect: true})
            .then(rsp => rsp.text()).then(() => {});
    }

    public get_banned_list(): Promise<JSONData> {
        return this.get("/banned.list").then(rsp => rsp.json());
    }

    // / PUZZLES

    public get_puzzle(puznid: number, scriptid: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {type: "puzzle", nid: puznid, script: scriptid})
            .then((rsp: Response) => rsp.json());
    }

    public get_puzzle_votes(puznid: number, round: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {type: "votes", puznid, round})
            .then(rsp => rsp.json());
    }

    public submit_solution(params: any): Promise<JSONData> {
        // TODO: split out these params!
        params["type"] = "post_solution";
        return this.post(GameClient.POST_URI, params).then(rsp => rsp.json());
    }

    public submit_puzzle(params: any): Promise<JSONData> {
        // TODO: split out these params!
        params["type"] = "puzzle";
        return this.post(GameClient.POST_URI, params).then(rsp => rsp.json());
    }

    public get_solutions(puznid: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {type: "solutions", puznid})
            .then(rsp => rsp.json());
    }

    public get_solution_info(solutionid: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {type: "solution_info", solid: solutionid, round: "1"})
            .then(rsp => rsp.json());
    }

    public get_solution_comments(solution_nid: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {nid: solution_nid, type: "comments"})
            .then(rsp => rsp.json());
    }

    public submit_solution_comment(solution_nid: number, body: string): Promise<JSONData> {
        return this.post(GameClient.POST_URI, {type: "post_comment", nid: solution_nid, body})
            .then(rsp => rsp.json());
    }

    public delete_solution(solution_nid: number): Promise<JSONData> {
        return this.post(GameClient.POST_URI, {type: "delete_solution", nid: solution_nid})
            .then(rsp => rsp.json());
    }

    public toggle_solution_vote(solution_nid: number, puznid: number, myVotes: number): Promise<JSONData> {
        let post_params: any = {solnid: solution_nid, puznid};
        if (myVotes === 1) {
            post_params["type"] = "unvote";
        } else if (myVotes === 0) {
            post_params["type"] = "vote";
        } else {
            throw new Error("Wrong vote value - can't submit");
        }

        return this.post(GameClient.POST_URI, post_params).then(rsp => rsp.json());
    }

    public update_solution_fold_data(solution_nid: number, fold_data: any): Promise<string> {
        let dataString: string = JSON.stringify(fold_data);
        return this.post(GameClient.POST_URI, {
            type: "update_solution_fold_data",
            nid: solution_nid,
            "fold-data": dataString
        }).then(rsp => rsp.text());
    }

    // / OTHER

    public post_screenshot(imgBytes: any): Promise<JSONData> {
        throw new Error("TODO");
        // let imageString: string = Base64.encodeByteArray(imgBytes);
        // return this.post(GameClient.POST_URI, {"data": imageString, "type": "screenshot"});
    }

    private get(urlString: string, params?: any): Promise<Response> {
        let url: URL = this.makeURL(urlString);

        if (params) {
            // GET requests put their parameters in the URL
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        }

        return fetch(url.toString(), {
            headers: new Headers({"Content-Type": "text/plain"}),
            credentials: "include"
        }).then((rsp) => {
            if (!rsp.ok) {
                throw new Error(`HTTP status code: ${rsp.status}`);
            }
            return rsp;
        }).catch((err) => {
            throw new Error(`${url.toString()}: ${err}`);
        });
    }

    private post(urlString: string, params?: any): Promise<Response> {
        let url: URL = this.makeURL(urlString);

        let postParams = new URLSearchParams();
        if (params) {
            // POST requests pass params in the body
            Object.keys(params).forEach(key => postParams.append(key, params[key]));
        }

        return fetch(url.toString(), {
            method: "POST",
            body: postParams.toString(),
            headers: new Headers({"Content-Type": "application/x-www-form-urlencoded"}),
            credentials: "include"
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
        return new URL(urlString, this._baseURL);
    }

    private readonly _baseURL: string;

    private static GET_URI: string = "/get/";
    private static POST_URI: string = "/post/";
}
