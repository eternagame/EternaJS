export default interface ObservabilityReporter {
    recordEvent(event: {name: string, details?: unknown}): void;
}
