import MappedSignal from './MappedSignal';
import SignalView from './SignalView';
import Connection from './Connection';

export default class FilteredSignal<T> extends MappedSignal<T> {
    constructor(source: SignalView<T>, pred: (value: T) => boolean) {
        super();
        this._source = source;
        this._pred = pred;
    }

    /* override */
    protected connectToSource(): Connection {
        return this._source.connect((value): void => {
            if (this._pred(value)) {
                this.notifyEmit(value);
            }
        });
    }

    protected _source: SignalView<T>;
    protected _pred: (value: T) => boolean;
}
