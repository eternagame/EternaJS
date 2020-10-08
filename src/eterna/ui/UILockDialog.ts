import * as log from 'loglevel';
import {AlphaTask} from 'flashbang';
import Dialog from './Dialog';

/** A "dialog" that simply dims the screen and eats UI events */
export default class UILockDialog extends Dialog<void> {
    protected added(): void {
        super.added();
        this.container.alpha = 0;
        this.addObject(new AlphaTask(1, 0.2));
    }

    public addRef(name?: string): void {
        if (name != null) {
            this._namedRefs.push(name);
        } else {
            this._anonymousRefs++;
        }
    }

    public releaseRef(name?: string): void {
        if (name != null) {
            const idx = this._namedRefs.indexOf(name);
            if (idx >= 0) {
                this._namedRefs.splice(idx, 1);
            } else {
                log.warn(`No such named ref '${name}'`);
            }
        } else {
            this._anonymousRefs--;
        }

        if (this._anonymousRefs === 0 && this._namedRefs.length === 0) {
            this.destroySelf();
        }
    }

    protected get bgAlpha(): number {
        return 0.2;
    }

    private _anonymousRefs: number = 0;
    private _namedRefs: string[] = [];
}
