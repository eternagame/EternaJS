import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {Dialog} from "./Dialog";

/** A "dialog" that simply dims the screen and eats UI events */
export class UILockDialog extends Dialog<void> {
    protected added(): void {
        super.added();
        this.container.alpha = 0;
        this.addObject(new AlphaTask(1, 0.2));
    }

    public addRef(): void {
        this._refCount++;
    }

    public releaseRef(): void {
        if (--this._refCount === 0) {
            this.destroySelf();
        }
    }

    protected get bgAlpha(): number {
        return 0.35;
    }

    private _refCount: number = 1;
}
