export class ErrorUtil {
    /** Returns a reasonable string value for an error object, if possible */
    public static getErrString(e: any): string {
        try {
            if (e == null) {
                return "Unknown error";
            } else if (e instanceof Error) {
                return e.stack;
            } else if (e instanceof ErrorEvent) {
                return e.message;
            } else {
                return e.toString();
            }
        } catch (errStringError) {
            return "Unknown error";
        }
    }
}
