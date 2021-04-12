import {BehaviorSubject, Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

type Index = string | number | symbol;

export default class Store<T extends object> {
    public state$: Observable<T>;
    private _state$: BehaviorSubject<T>;

    protected constructor(initialState: T) {
        this._state$ = new BehaviorSubject(initialState);
        this.state$ = this._state$.asObservable();
    }

    public get state(): T {
        return this._state$.getValue();
    }

    public setState(nextState: T) {
        this._state$.next(nextState);
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    public patchState(value: any, ...path: Index[]) {
        if (path.length < 1) {
            return;
        }
        this.setState(this.getUpdatedState(value, this.state, path));
    }

    public onChanges(...path: Index[]) {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        return this.state$.pipe(
            map((state) => path.reduce((result: any, part: Index) => {
                if (result === undefined || result === null) {
                    return undefined;
                }
                return result[part];
            }, state)),
            distinctUntilChanged()
        );
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private getUpdatedState(value: any, stateSubtree: any, path: Index[]): any {
        const key = path[0];
        if (path.length === 1) {
            return {
                ...stateSubtree,
                [key]: value
            };
        }
        if (stateSubtree[key] === undefined || stateSubtree[key] === null) {
            return {
                ...stateSubtree,
                [key]: this.createStateSubtree(value, path.slice(1))
            };
        }
        return {
            ...stateSubtree,
            [key]: this.getUpdatedState(
                value,
                stateSubtree[key],
                path.slice(1)
            )
        };
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    private createStateSubtree(value: any, path: Index[]): any {
        const key = path[0];
        if (path.length === 1) {
            return {
                [key]: value
            };
        }
        return {
            [key]: this.createStateSubtree(value, path.slice(1))
        };
    }
}
