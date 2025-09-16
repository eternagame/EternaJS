import log from 'loglevel';
import ObservabilityReporter from './ObservabilityReporter';

export default class ConsoleReporter implements ObservabilityReporter {
    public recordEvent(event: {name: string, details?: unknown}) {
        log.debug('O11Y EVENT', event);
    }
}
