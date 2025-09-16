import ObservabilityReporter from './ObservabilityReporter';

interface ObservabilityCapture {
    reporter: ObservabilityReporter;
    filter?: (event: {name: string, details?: unknown}) => boolean;
}

export default class ObservabilityManager {
    public startCapture(
        reporter: ObservabilityReporter,
        filter?: ObservabilityCapture['filter']
    ) {
        this._captures.push({reporter, filter});
    }

    public endCapture(reporter: ObservabilityReporter) {
        this._captures = this._captures.filter((capture) => capture.reporter !== reporter);
    }

    public recordEvent(name: string, details?: unknown) {
        for (const capture of this._captures) {
            if (!capture.filter || capture.filter({name, details})) {
                if (details !== undefined) capture.reporter.recordEvent({name, details});
                else capture.reporter.recordEvent({name});
            }
        }
    }

    private _captures: ObservabilityCapture[] = [];
}
