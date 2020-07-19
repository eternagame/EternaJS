/**
 * An exception thrown to communicate multiple listener failures.
 */
export default class MultiFailureError extends Error {
    public get failures(): (Error | ErrorEvent)[] {
        return this._failures;
    }

    public addFailure(e: Error | ErrorEvent): void {
        if (e instanceof MultiFailureError) {
            this._failures = this._failures.concat((e as MultiFailureError).failures);
        } else {
            this._failures[this._failures.length] = e;
        }
        this.message = this.getMessage();
    }

    public getMessage(): string {
        let buf = '';
        for (let failure of this._failures) {
            if (buf.length > 0) {
                buf += ', ';
            }
            buf += MultiFailureError.getMessageInternal(failure, false);
        }
        return `${this._failures.length}${this._failures.length !== 1 ? ' failures: ' : ' failure: '}${buf}`;
    }

    private static getMessageInternal(error: string | Error | ErrorEvent, wantStackTrace: boolean): string | undefined {
        // NB: do NOT use the class-cast operator for converting to typed error objects.
        // Error() is a top-level function that creates a new error object, rather than performing
        // a class-cast, as expected.

        if (typeof (error) === 'string') {
            return error as string;
        } else if (error instanceof Error) {
            let e: Error = error;
            return (wantStackTrace ? e.stack : e.message || '');
        } else if (error instanceof ErrorEvent) {
            let ee: ErrorEvent = error;
            // AMW: I do not know why the strategy had been to cast the ErrorEvent
            // to any and then ask for its name. It seems like asking for the error
            // name is wiser.
            return `${ee.error.name
            } [errorID=${ee.error
            }, type='${ee.type}'`
                + `, text='${ee.message}']`;
        }

        return `An error occurred: ${error}`;
    }

    private _failures: (Error | ErrorEvent)[] = [];
}
