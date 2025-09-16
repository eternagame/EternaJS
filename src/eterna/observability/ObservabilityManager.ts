class ObservabilityEvent {
    constructor(name: string, details: unknown) {
        this.name = name;
        this.details = details;
    }

    public readonly name: string;
    public readonly details: unknown;
    public next: ObservabilityEvent | null;
}

class RootEvent {
    public next: ObservabilityEvent | null;
}

export class ObservabilityEventCapture {
    constructor(firstEvent: ObservabilityEvent | RootEvent) {
        this._firstEvent = firstEvent;
    }

    public report() {
        const out = [];
        let ev = this._firstEvent.next;
        while (ev) {
            if (ev.details !== undefined) {
                out.push({name: ev.name, details: ev.details});
            } else {
                out.push({name: ev.name});
            }
            ev = ev.next;
        }
        return out;
    }

    private _firstEvent: ObservabilityEvent | RootEvent;
}

export default class ObservabilityManager {
    public eventCapture(): ObservabilityEventCapture {
        const capture = new ObservabilityEventCapture(this._lastEvent);
        return capture;
    }

    public recordEvent(name: string, details?: unknown) {
        const event = new ObservabilityEvent(name, details);
        if (this._lastEvent) {
            this._lastEvent.next = event;
        }
        this._lastEvent = event;
    }

    private _lastEvent: ObservabilityEvent | RootEvent = new RootEvent();
}
