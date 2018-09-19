export class ErrorUtil {
    /** Returns an appropriate Error object, if e can be coerced to one */
    public static getErrorObj(e: any): Error | null {
        if (e instanceof Error) {
            return e;
        } else if (e instanceof ErrorEvent) {
            return e.error;
        } else {
            return null;
        }
    }

    /** Returns a reasonable string value for an error object, if possible */
    public static getErrString(e: any): string {
        try {
            if (e == null) {
                return "Unknown error";
            } else if (e instanceof Error) {
                return e.stack;
            } else if (e instanceof ErrorEvent) {
                return e.error != null ? this.getErrString(e.error) : e.message;
            } else {
                return e.toString();
            }
        } catch (errStringError) {
            return "Unknown error";
        }
    }
}
