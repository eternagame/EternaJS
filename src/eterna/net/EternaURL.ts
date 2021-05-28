import Eterna from 'eterna/Eterna';

interface EternaURLParams {
    page: string;
    puznid?: number;
    uid?: number;
    nid?: number;
    filter1?: string;
    filter1_arg1?: number | string;
    filter1_arg2?: number;
}

export default class EternaURL {
    public static readonly BARCODE_HELP: string = '/web/lab/manual/#barcode';
    public static readonly STRATEGY_GUIDE: string =
    'http://getsatisfaction.com/eternagame/topics/the_strategy_guide_to_solve_eterna_puzzles';

    public static getFeedURL(): string {
        return Eterna.playerID === 0
            ? EternaURL.createURL({page: 'register'})
            : EternaURL.createURL({page: 'me'});
    }

    /**
     * Route a set of parameters to the correct URL subdirectory
     *
     * @param params an object containing a 'page' value and possibly a 'puznid' for browsing
     *
     * @returns a URL string
     */
    public static createURL(params: EternaURLParams | null): string {
        if (params == null) {
            params = {page: 'me'};
        }

        let url = '/web/';

        if (params['page'] === 'player') {
            url = `/web/player/${params['uid']}/`;
        } else if (params['page'] === 'home') {
            url = '/web/';
        } else if (params['page'] === 'me') {
            url = '/web/';
        } else if (params['page'] === 'roadmap') {
            url = '/web/roadmap/';
        } else if (params['page'] === 'about') {
            url = '/web/about/';
        } else if (params['page'] === 'tutorials') {
            url = '/web/tutorials/';
        } else if (params['page'] === 'challenges') {
            url = '/web/challenges/';
        } else if (params['page'] === 'playerpuzzles') {
            url = '/web/playerpuzzles/';
        } else if (params['page'] === 'currentlabs') {
            url = '/web/labs/';
        } else if (params['page'] === 'proposedlabs') {
            url = '/web/labs/proposed/';
        } else if (params['page'] === 'waitinglabs') {
            url = '/web/labs/waiting/';
        } else if (params['page'] === 'pastlabs') {
            url = '/web/labs/past/';
        } else if (params['page'] === 'strategymarket') {
            url = '/web/strategymarket/';
        } else if (params['page'] === 'scripts') {
            url = '/web/script/';
        } else if (params['page'] === 'manual') {
            url = '/web/lab/manual/';
        } else if (params['page'] === 'newslist') {
            url = '/web/news/';
        } else if (params['page'] === 'players') {
            url = '/web/players/';
        } else if (params['page'] === 'register') {
            url = '/web/register/';
        } else if (params['page'] === 'puzzle') {
            url = `/web/puzzle/${params['nid']}/`;
        } else if (params['page'] === 'strategy_guides') {
            url = '/web/strategy_guides/';
        } else if (params['page'] === 'blog') {
            url = '/web/blog/';
        } else if (params['page'] === 'lab_browser') {
            url = `/web/browse/${params['nid']}/`;
        } else if (params['page'] === 'browse_solution' || params['page'] === 'browse_player') {
            url = `/game/browse/${params['puznid']}/?`;
            url += new URLSearchParams({
                filter1: params.filter1 as string,
                /* eslint-disable @typescript-eslint/naming-convention */
                filter1_arg1: String(params.filter1_arg1) as string,
                filter1_arg2: String(params.filter1_arg2) as string
                /* eslint-enable camelcase */
            });
        } else if (params['page'] === 'script') {
            url = '/web/script/';
        } else if (params['page'] === 'group') {
            url = '/web/group/';
        } else if (params['page'] === 'conduct') {
            url = '/web/conduct/';
        }

        return Eterna.SERVER_URL + url;
    }
}
