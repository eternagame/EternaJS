// pose2DStore.ts
import Store from 'stores/store';
import Pose2DState, {Mut} from './pose2DState';

export default class Pose2DStore extends Store<Pose2DState> {
    constructor() {
        super(new Pose2DState());
    }

    pushMuts(mut: Mut) {
        this.setState({
            ...this.state,
            muts: this.state.muts.concat(mut)
        });
    }

    setLockUpdated(updated: boolean) {
        this.setState({
            ...this.state,
            lockUpdated: updated
        });
    }

    setBindingSiteUpdated(updated: boolean) {
        this.setState({
            ...this.state,
            bindingSiteUpdated: updated
        });
    }

    setDesignStructUpdated(updated: boolean) {
        this.setState({
            ...this.state,
            designStructUpdated: updated
        });
    }
}
