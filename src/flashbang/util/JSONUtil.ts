export default class JSONUtil {
    public static require<T>(json: any, name: string): T {
        if (!Object.prototype.hasOwnProperty.call(json, name)) {
            throw new Error(`Missing required property '${name}'`);
        }
        return json[name];
    }
}
