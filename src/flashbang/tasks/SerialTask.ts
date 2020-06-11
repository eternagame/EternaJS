import ObjectTask from 'flashbang/core/ObjectTask';
import Assert from 'flashbang/util/Assert';

export default class SerialTask extends ObjectTask {
    constructor(...tasks: ObjectTask[]) {
        super();
        this._subtasks = tasks.concat();
    }

    public get numSubtasks(): number {
        return this._subtasks.length;
    }

    public addTask(task: ObjectTask): void {
        Assert.isTrue(this.parent == null, "Can't modify a running SerialTask");
        this._subtasks.push(task);
    }

    /* override */
    protected added(): void {
        this.nextTask();
    }

    protected nextTask(): void {
        if (!this.isLiveObject || !this.parent || !this.parent.isLiveObject) {
            return;
        }

        if (this._nextIdx < this._subtasks.length) {
            let newTask: ObjectTask = this._subtasks[this._nextIdx++];
            this.regs.add(newTask.destroyed.connect(() => {
                this.nextTask();
            }));
            this.parent.addObject(newTask);
        } else {
            this.destroySelf();
        }
    }

    /* override */
    protected removed(): void {
        if (this._subtasks.length > 0 && this._nextIdx <= this._subtasks.length) {
            // destroy the active task
            this._subtasks[this._nextIdx - 1].destroySelf();
        }
    }

    private readonly _subtasks: ObjectTask[];
    private _nextIdx: number = 0;
}
