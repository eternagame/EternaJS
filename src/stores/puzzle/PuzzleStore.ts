import Store from 'stores/store';
import PuzzleState from './PuzzleState';

export default class PuzzleStore extends Store<PuzzleState> {
    constructor() {
        super(new PuzzleState());
    }
}
