export default abstract class LayoutEngine {
    public abstract get name (): string;

    public getLayout(pairTable: number[]): [number, number][] {
        return [];
    }
}
