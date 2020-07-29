import ObjectTask from 'flashbang/core/ObjectTask';
import Assert from 'flashbang/util/Assert';

type TaskCreator = () => ObjectTask | null;

/**
 * A Task that repeats.
 *
 * @param taskCreator a function that takes 0 parameters and returns an ObjectTask, or null.
 * When the RepeatingTask completes its task, it will call taskCreator to regenerate the task.
 * If taskCreator returns null, the RepeatingTask will complete; else it will keep running.
 */
export default class RepeatingTask extends ObjectTask {
    constructor(taskCreator: TaskCreator) {
        super();
        this._taskCreator = taskCreator;
    }

    /* override */
    protected added(): void {
        this.restart();
    }

    /* override */
    protected removed(): void {
        if (this._curTask != null) {
            this._curTask.destroySelf();
            this._curTask = null;
        }
    }

    protected restart(): void {
        if (!this.isLiveObject || (this.parent && !this.parent.isLiveObject)) {
            return;
        }

        this._curTask = this._taskCreator();
        if (this._curTask == null) {
            this.destroySelf();
            return;
        }
        this.regs.add(this._curTask.destroyed.connect(() => {
            this.restart();
        }));
        if (this.parent) {
            this.parent.addObject(this._curTask);
        }
    }

    protected _taskCreator: TaskCreator;
    protected _curTask: ObjectTask | null;
}

export function Repeat(count: number, taskCreator: TaskCreator): RepeatingTask {
    return new RepeatingTask((): ObjectTask | null => (count-- > 0 ? taskCreator() : null));
}
