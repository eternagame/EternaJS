import {Utility} from "../util/Utility";

export class EternaURL {
    public static readonly BARCODE_HELP: string = "/web/lab/manual/#barcode";
    public static readonly STRATEGY_GUIDE: string = "http://getsatisfaction.com/eternagame/topics/the_strategy_guide_to_solve_eterna_puzzles";

    public static generate_url(params: any): string {
        if (params == null) {
            params = {};
        }

        if (params['page'] == "player") {
            return "/web/player/" + params['uid'] + "/";
        } else if (params['page'] == "lab_bench") {
            return "/web/";
        } else if (params['page'] == "me") {
            return "/web/";
        } else if (params['page'] == "roadmap") {
            return "/web/roadmap/";
        } else if (params['page'] == "about") {
            return "/web/about/";
        } else if (params['page'] == "tutorials") {
            return "/web/tutorials/";
        } else if (params['page'] == "challenges") {
            return "/web/challenges/";
        } else if (params['page'] == "playerpuzzles") {
            return "/web/playerpuzzles/";
        } else if (params['page'] == "currentlabs") {
            return "/web/labs/";
        } else if (params['page'] == "proposedlabs") {
            return "/web/labs/proposed/";
        } else if (params['page'] == "waitinglabs") {
            return "/web/labs/waiting/";
        } else if (params['page'] == "pastlabs") {
            return "/web/labs/past/";
        } else if (params['page'] == "strategymarket") {
            return "/web/strategymarket/";
        } else if (params['page'] == "scripts") {
            return "/web/script/";
        } else if (params['page'] == "manual") {
            return "/web/lab/manual/";
        } else if (params['page'] == "newslist") {
            return "/web/news/";
        } else if (params['page'] == "players") {
            return "/web/players/";
        } else if (params['page'] == "register") {
            return "/web/register/";
        } else if (params['page'] == "puzzle") {
            return "/web/puzzle/" + params['nid'] + "/";
        } else if (params['page'] == "strategy_guides") {
            return "/web/strategy_guides/";
        } else if (params['page'] == "blog") {
            return "/web/blog/";
        } else if (params['page'] == "lab_browser") {
            return "/web/browse/" + params['nid'] + "/";
        } else if (params['page'] == "browse_solution" || params['page'] == "browse_player") {
            let url: string = "/game/browse/" + params['puznid'] + "/?";
            delete params['page'];
            delete params['puznid'];
            return url + Utility.generate_parameter_string(params);
        } else if (params['page'] == "script") {
            return "/web/script/";
        } else if (params['page'] == "group") {
            return "/web/group/";
        } else if (params['page'] == "conduct") {
            return "/web/conduct/";
        }

        return "/web/";
    }

}
