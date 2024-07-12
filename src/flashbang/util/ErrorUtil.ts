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
    public static getErrString(e: Error | ErrorEvent | string | null | unknown, includeStack = true): string {
        try {
            if (e == null) {
                return 'Unknown error';
            } else if (e instanceof Error) {
                return includeStack && e.stack ? e.stack : e.message;
            } else if (e instanceof ErrorEvent) {
                return e.error != null ? this.getErrString(e.error, includeStack) : e.message;
            } else if (typeof e === 'string') {
                return e;
            } else if (typeof e === 'object') {
                return `Unknown error type: object/${e.constructor.name}`;
            } else if (typeof e === 'function') {
                return `Unknown error type: function/${e.name}`;
            } else if (typeof e === 'function') {
                return `Unknown error type: function/${e.name}`;
            } else {
                return `Unknown error type: ${typeof e}`;
            }
        } catch (errStringError) {
            return 'Unknown error';
        }
    }
}
