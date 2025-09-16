export default class PostMessageReporter {
    constructor(id: string, targetOrigin?: string) {
        this._id = id;
        this._targetOrigin = targetOrigin;
    }

    public recordEvent(event: {name: string, details?: unknown}) {
        window.postMessage({
            type: 'observability-event',
            reporterId: this._id,
            event
        }, {targetOrigin: this._targetOrigin});
    }

    private _id: string;
    private _targetOrigin?: string;
}
