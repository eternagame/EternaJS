export class JSONUtil {
    public static require<T>(json: any, name: string): T {
        if (!json.hasOwnProperty(name)) {
            throw new Error(`Missing required property '${name}'`);
        }
        return json[name];
    }
}
