import Store from 'stores/store';
import DotPlotState from './DotPlotState';

export default class DotPlotStore extends Store<DotPlotState> {
    constructor() {
        super(new DotPlotState());
    }
}
