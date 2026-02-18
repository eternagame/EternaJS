import log from 'loglevel';

export default class LegacyPatchUtil {
    /**
     * Fix behavior for modified native classes.
     * See `website/frontend/coffee/utils.coffee`
     */
    public static patchModifiedPrototypes(): void {
        // Finds non-standard methods added to Array's prototype using empty array
        // eslint-disable-next-line no-restricted-syntax, guard-for-in
        for (const prop in []) {
            log.warn(`Array.prototype.${prop}`);
            this.patchMethod(Array.prototype, prop);
        }

        // @ts-expect-error Checking if String's prototype was modified using empty string
        // eslint-disable-next-line no-restricted-syntax, guard-for-in
        for (const prop in '') {
            log.warn(`String.prototype.${prop}`);
            this.patchMethod(String.prototype, prop);
        }
    }

    /**
     * Removes enumerability for method of prototype
     */
    private static patchMethod<P>(prototype: P, methodName: string) {
        const descriptor = Object.getOwnPropertyDescriptor(
            prototype,
            methodName
        );

        // Only alter if it's enumerable.
        // Will not affect properly polyfilled methods.
        if (descriptor?.enumerable) {
            Object.defineProperty(prototype, methodName, {
                ...descriptor,
                enumerable: false
            });
        }
    }
}
