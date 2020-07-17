import ROPWait from './ROPWait';
import RScriptOp from './RScriptOp';

/*
 * RScript Operation Tree.
 * Clearly organizes all of the input operations into a tree.
 * :: Note - Use a tree so that we can support if conditionals easily in the near future.
 * :: Note - Only one entry point.
 */
export default class RScriptOpTree {
    public addNode(node: RScriptOp | null): void {
        if (!node) {
            return;
        }

        if (this._head == null) {
            this._head = node;
            this._curptr = node;
        } else {
            this._curptr.addChildOp(node);
            this._curptr = node;
        }
    }

    public finishCreation(): void {
        this._curptr = this._head;
    }

    public next(): RScriptOp | null {
        if (!this._curptr) {
            return null;
        }

        if (this._curptr instanceof ROPWait) {
            this._curptr.exec();
            let waitRet: RScriptOp = this._curptr.getPauseNext();
            if (waitRet !== this._curptr && this._curptr.isPaused() && waitRet instanceof ROPWait) {
                // If the next instruction can be executed (as determined by ROPWait),
                // then execute it.
                this._waitQueue.push(this._curptr);
                this._curptr = waitRet;
                return waitRet;
            } else if (this._curptr.isPaused() && this._waitQueue.indexOf(this._curptr)) {
                this._waitQueue.push(this._curptr);
                return null;
            } else if (this.checkWaitQueueContinue()) {
                // If it cannot then see if the wait queue is clear.
                // Clear queue and proceed.
                this._waitQueue.splice(0);
            } else {
                return null;
            }
        }

        let ret: RScriptOp = this._curptr;
        this._curptr = this._curptr.next();
        return ret;
    }

    private checkWaitQueueContinue(): boolean {
        for (let op of this._waitQueue) {
            if (op.isPaused()) {
                return false;
            }
        }
        return true;
    }

    private _head: RScriptOp;
    private _curptr: RScriptOp;
    private _waitQueue: RScriptOp[] = [];
}
