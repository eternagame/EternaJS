import {ObjectTask} from "../core/ObjectTask";

/**
 * A Task that destroys its parent.
 */
export class SelfDestructTask extends ObjectTask {
    /*override*/ protected added() :void {
        this.parent.destroySelf();
    }
}
