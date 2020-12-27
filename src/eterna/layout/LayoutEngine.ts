export default abstract class LayoutEngine {
    public abstract get name (): string;

    public getLayout(_pairTable: number[]): [number, number][] {
        return [];
    }
}
