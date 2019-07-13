import ObjectTask from 'flashbang/core/ObjectTask';

type TaskCreator = () => ObjectTask;

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
        if (!this.isLiveObject || !this.parent.isLiveObject) {
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
        this.parent.addObject(this._curTask);
    }

    protected _taskCreator: TaskCreator;
    protected _curTask: ObjectTask;
}

export function Repeat(count: number, taskCreator: TaskCreator): RepeatingTask {
    return new RepeatingTask((): ObjectTask => (count-- > 0 ? taskCreator() : null));
}
