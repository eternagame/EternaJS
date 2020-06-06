import MultiFailureError from './MultiFailureError';
import Registration from './Registration';

/** Collects Registrations to allow mass operations on them. */
export default class RegistrationGroup implements Registration {
    /**
     * Adds a Registration to the manager.
     * @return the Registration passed to the function.
     */
    public add(r: Registration): Registration {
        if (this._regs == null) {
            this._regs = new Set();
        }
        this._regs.add(r);
        return r;
    }

    /** Removes a Registration from the group without disconnecting it. */
    public remove(r: Registration): void {
        if (this._regs != null) {
            this._regs.delete(r);
        }
    }

    /** Closes all Registrations that have been added to the manager. */
    public close(): void {
        if (this._regs != null) {
            let regs = this._regs;
            this._regs = null;

            let err: MultiFailureError | null = null;
            for (let r of regs) {
                try {
                    r.close();
                } catch (e) {
                    if (err == null) {
                        err = new MultiFailureError();
                    }
                    err.addFailure(e);
                }
            }

            if (err != null) {
                throw err;
            }
        }
    }

    private _regs: Set<Registration> | null; // lazily instantiated
}
