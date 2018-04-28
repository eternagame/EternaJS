import { Signal } from "typed-signals";

// We'd like to do `export type UnitSignal = Signal<() => void>`,
// but typescript does not support instantiating type aliases:
// https://github.com/Microsoft/TypeScript/issues/2559
export class UnitSignal extends Signal<() => void> {}
