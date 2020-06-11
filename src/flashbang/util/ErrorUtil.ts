export default class ErrorUtil {
    /** Returns an appropriate Error object, if e can be coerced to one */
    public static getErrorObj(e: Error | ErrorEvent | null): Error | null {
        if (e instanceof Error) {
            return e;
        } else if (e instanceof ErrorEvent) {
            return e.error;
        } else {
            return null;
        }
    }

    /** Returns a reasonable string value for an error object, if possible */
    public static getErrString(e: Error | ErrorEvent | null, includeStack = true): string {
        try {
            if (e == null) {
                return 'Unknown error';
            } else if (e instanceof Error) {
                return includeStack && e.stack ? e.stack : e.message;
            } else if (e instanceof ErrorEvent) {
                return e.error != null ? this.getErrString(e.error, includeStack) : e.message;
            } else {
                return ''; // unreachable, but necessary for return typechecker
            }
        } catch (errStringError) {
            return 'Unknown error';
        }
    }
}
