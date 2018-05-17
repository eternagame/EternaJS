import * as Cookies from "js-cookie";

export class AutosaveManager {
    /*Token must be unique for each different piece of data*/
    public static saveObjects(objs: any[], token: string): void {
        Cookies.set(token, objs, {expires: AutosaveManager.NEVER});
    }

    public static loadObjects(token: string): any[] {
        return Cookies.getJSON(token) as any[];
    }

    /** Clear all saved data */
    public static clear (): void {
        for (let cookieName in Cookies.get()) {
            Cookies.remove(cookieName);
        }
    }

    private static readonly NEVER: Date = new Date(8640000000000000 - 1);
}
