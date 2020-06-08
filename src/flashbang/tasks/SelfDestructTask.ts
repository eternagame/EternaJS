import ObjectTask from 'flashbang/core/ObjectTask';

/**
 * A Task that destroys its parent.
 */
export default class SelfDestructTask extends ObjectTask {
    /* override */
    protected added(): void {
        if (this.parent) this.parent.destroySelf();
    }
}
