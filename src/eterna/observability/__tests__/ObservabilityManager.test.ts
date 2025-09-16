import {jest} from '@jest/globals'
import ObservabilityManager from '../ObservabilityManager';
import ObservabilityReporter from '../ObservabilityReporter';

function createReporter() {
  class NullReporter extends ObservabilityReporter {
    recordEvent = jest.fn();
  }
  return new NullReporter();
}

test('ObservabilityManager - basic', () => {
  const manager = new ObservabilityManager();
  const reporter = createReporter();
  manager.startCapture(reporter);
  manager.recordEvent('EV1');
  manager.recordEvent('EV2', {abc: 123});
  expect(reporter.recordEvent.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "name": "EV1",
    },
  ],
  [
    {
      "details": {
        "abc": 123,
      },
      "name": "EV2",
    },
  ],
]
`);
})

test('ObservabilityManager - filter', () => {
  const manager = new ObservabilityManager();
  const reporter = createReporter();
  manager.startCapture(reporter, (ev) => ev.name === 'EV2');
  manager.recordEvent('EV1');
  manager.recordEvent('EV2');
  expect(reporter.recordEvent.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "name": "EV2",
    },
  ],
]
`);
})

test('ObservabilityManager - multiple', () => {
  const manager = new ObservabilityManager();
  const reporter = createReporter();
  const reporter2 = createReporter();
  manager.startCapture(reporter, (ev) => ev.name === 'EV1');
  manager.startCapture(reporter2, (ev) => ev.name === 'EV2');
  manager.recordEvent('EV1');
  manager.recordEvent('EV2');
  expect(reporter.recordEvent.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "name": "EV1",
    },
  ],
]
`);
  expect(reporter2.recordEvent.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "name": "EV2",
    },
  ],
]
`);
})

test('ObservabilityManager - registration lifetimes', () => {
  const manager = new ObservabilityManager();
  const reporter = createReporter();
  const reporter2 = createReporter();
  manager.startCapture(reporter);
  manager.recordEvent('EV1');
  manager.startCapture(reporter2);
  manager.recordEvent('EV2');
  manager.endCapture(reporter);
  manager.recordEvent('EV3');
  expect(reporter.recordEvent.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "name": "EV1",
    },
  ],
  [
    {
      "name": "EV2",
    },
  ],
]
`);
  expect(reporter2.recordEvent.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "name": "EV2",
    },
  ],
  [
    {
      "name": "EV3",
    },
  ],
]
`);
})
