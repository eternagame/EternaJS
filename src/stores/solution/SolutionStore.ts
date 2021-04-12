import Store from 'stores/store';
import SolutionState from './SolutionState';

export default class SolutionStore extends Store<SolutionState> {
    constructor() {
        super(new SolutionState());
    }
}
