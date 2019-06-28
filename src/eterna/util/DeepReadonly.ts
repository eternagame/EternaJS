export type DeepReadonly<T> =
    T extends Function ? T : 
	T extends ReadonlyArray<infer R> ? IDRArray<R> :
	T extends Map<infer K, infer V> ? IDRMap<K, V> : 
	T extends object ? DRObject<T> :
	T

interface IDRArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

interface IDRMap<K, V> extends ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> {}

type DRObject<T> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
}