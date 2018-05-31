type JSONData = any;

export class GameClient {
    public constructor(baseURL: string) {
	    this._baseURL = baseURL;
    }

    /// ACCOUNT

    public authenticate(): Promise<Response> {
        return this.get("/eterna_authenticate.php");
    }

    public login(name: string, password: string): Promise<Response> {
        return this.post("/eterna_login.php", {"name": name, "pass": password, "type": "login"});
    }

    public logout(on_done: Function): Promise<Response> {
        return this.get("/eterna_logout.php", {"noredirect": true});
    }

    public get_banned_list(): Promise<Response> {
        return this.get("/banned.list");
    }

    /// PUZZLES

    public get_puzzle(puznid: number, scriptid: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {"type": "puzzle", "nid": puznid, "script": scriptid})
            .then((rsp: Response) => rsp.json());
    }

    public get_puzzle_votes(puznid: number, round: number): Promise<Response> {
        return this.get(GameClient.GET_URI, {"type": "votes", "puznid": puznid, "round": round});
    }

    public submit_solution(params: any): Promise<Response> {
        // TODO: split out these params!
        params["type"] = "post_solution";
        return this.post(GameClient.POST_URI, params);
    }

    public submit_puzzle(params: any): Promise<Response> {
        // TODO: split out these params!
        params["type"] = "puzzle";
        return this.post(GameClient.POST_URI, params);
    }

    public get_solutions(puznid: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {"type": "solutions", "puznid": puznid})
            .then(rsp => rsp.json());
    }

    public get_solution_info(solutionid: number): Promise<JSONData> {
        return this.get(GameClient.GET_URI, {"type": "solution_info", "solid": solutionid, "round": "1"})
            .then(rsp => rsp.json());
    }

    public get_solution_comments(solution_nid: number): Promise<Response> {
        return this.get(GameClient.GET_URI, {"nid": solution_nid, "type": "comments"});
    }

    public submit_solution_comment(solution_nid: number, body: string): Promise<Response> {
        return this.post(GameClient.POST_URI, {"type": "post_comment", "nid": solution_nid, "body": body});
    }

    public delete_solution(solution_nid: number): Promise<Response> {
        return this.post(GameClient.POST_URI, {'type': "delete_solution", "nid": solution_nid});
    }

    public toggle_solution_vote(solution_nid: number, puznid: number, myVotes: number): Promise<Response> {
        let post_params: any = {'solnid': solution_nid, "puznid": puznid};
        if (myVotes == 1) {
            post_params['type'] = "unvote";
        } else if (myVotes == 0) {
            post_params['type'] = "vote";
        } else {
            throw new Error("Wrong vote value - can't submit");
        }

        return this.post(GameClient.POST_URI, post_params);
    }

    public update_solution_fold_data(solution_nid: number, fold_data: any): Promise<Response> {
        let dataString: string = JSON.stringify(fold_data);
        return this.post(GameClient.POST_URI, {
            "type": "update_solution_fold_data",
            "nid": solution_nid,
            "fold-data": dataString
        });
    }

    /// OTHER

    public post_screenshot(imgBytes: any): Promise<Response> {
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

        return fetch(url.toString());
    }

    private post(urlString: string, params?: any): Promise<Response> {
        let url: URL = this.makeURL(urlString);
        let form: FormData = new FormData();

        if (params) {
            // POST requests put their params in the body
            Object.keys(params).forEach(key => form.append(key, JSON.stringify(params[key])));
        }

        return fetch(url.toString(), {
            method: "POST",
            body: form
        });
    }

    private makeURL(urlString: string): URL {
        return new URL(urlString, this._baseURL);
    }

    private readonly _baseURL: string;

    private static GET_URI: string = "/get/";
    private static POST_URI: string = "/post/";
}
