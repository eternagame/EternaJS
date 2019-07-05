import {ObjectTask} from '../core';

/**
 * A Task that destroys its parent.
 */
export default class SelfDestructTask extends ObjectTask {
    /* override */
    protected added(): void {
        this.parent.destroySelf();
    }
}
