export default abstract class ObservabilityReporter {
    abstract recordEvent(event: {name: string, details?: unknown}): void;
}
