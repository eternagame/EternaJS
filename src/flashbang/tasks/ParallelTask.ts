import ObjectTask from 'flashbang/core/ObjectTask';
import Assert from 'flashbang/util/Assert';

export default class ParallelTask extends ObjectTask {
    constructor(...tasks: ObjectTask[]) {
        super();
        this._subtasks = tasks.concat();
    }

    public get numSubtasks(): number {
        return this._subtasks.length;
    }

    public addTask(task: ObjectTask): void {
        Assert.isTrue(this.parent == null, "Can't modify a running ParallelTask");
        this._subtasks.push(task);
    }

    /* override */
    protected added(): void {
        this._numActive = this._subtasks.length;
        Assert.assertIsDefined(this.parent);
        for (let task of this._subtasks) {
            this.regs.add(task.destroyed.connect(() => {
                this.onTaskComplete();
            }));
            this.parent.addObject(task);
        }
    }

    private onTaskComplete(): void {
        if (--this._numActive === 0) {
            this.destroySelf();
        }
    }

    /* override */
    protected removed(): void {
        for (let task of this._subtasks) {
            task.destroySelf();
        }
    }

    private readonly _subtasks: ObjectTask[];
    private _numActive: number = 0;
}
