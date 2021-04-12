import {RNABase} from 'eterna/EPars';
import Store from 'stores/store';
import SequenceState from './SequenceState';

export default class SequenceStore extends Store<SequenceState> {
    constructor() {
        super(new SequenceState());
    }

    initBaseArray(baseArray: RNABase[]) {
        this.setState({
            ...this.state,
            baseArray
        });
    }

    setBaseNt(ii: number, rb: RNABase) {
        this.setState({
            ...this.state,
            baseArray: this.state.baseArray.map((b, i) => ((i === ii) ? rb : b))
        });
    }
}
