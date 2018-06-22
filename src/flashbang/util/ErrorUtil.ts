export class ErrorUtil {
    /** Returns a reasonable string value for an error object, if possible */
    public static getErrString(e: any): string {
        try {
            if (e instanceof Error) {
                return e.stack;
            } else if (e instanceof ErrorEvent) {
                return this.getErrString(e.error);
            } else {
                return e.toString();
            }
        } catch (e) {
            return "Unknown error";
        }
    }
}
