import ObservabilityManager from '../ObservabilityManager';

test('ObservabilityCapture - immediate capture', () => {
    const om = new ObservabilityManager();
    const cap = om.eventCapture();
    om.recordEvent('FIRST', {a:1, b:2, c:3});
    om.recordEvent('SECOND');
    expect(cap.report()).toMatchInlineSnapshot(`
[
  {
    "details": {
      "a": 1,
      "b": 2,
      "c": 3,
    },
    "name": "FIRST",
  },
  {
    "name": "SECOND",
  },
]
`)
})

test('ObservabilityCapture - skipped event', () => {
    const om = new ObservabilityManager();
    om.recordEvent('FIRST', {});
    const cap = om.eventCapture();
    om.recordEvent('SECOND', {});
    om.recordEvent('THIRD', {});
    expect(cap.report()).toMatchInlineSnapshot(`
[
  {
    "details": {},
    "name": "SECOND",
  },
  {
    "details": {},
    "name": "THIRD",
  },
]
`)
})

test('ObservabilityCapture - mixed lifetimes', () => {
    const om = new ObservabilityManager();
    om.recordEvent('FIRST', {});
    const cap = om.eventCapture();
    om.recordEvent('SECOND', {});
    const cap2 = om.eventCapture();
    om.recordEvent('THIRD', {});
    expect(cap.report()).toMatchInlineSnapshot(`
[
  {
    "details": {},
    "name": "SECOND",
  },
  {
    "details": {},
    "name": "THIRD",
  },
]
`)
    expect(cap2.report()).toMatchInlineSnapshot(`
[
  {
    "details": {},
    "name": "THIRD",
  },
]
`)
})

test('ObservabilityCapture - mixed lifetimes', () => {
    const om = new ObservabilityManager();
    om.recordEvent('FIRST', {});
    const cap = om.eventCapture();
    om.recordEvent('SECOND', {});
    const cap2 = om.eventCapture();
    om.recordEvent('THIRD', {});
    expect(cap.report()).toMatchInlineSnapshot(`
[
  {
    "details": {},
    "name": "SECOND",
  },
  {
    "details": {},
    "name": "THIRD",
  },
]
`)
    expect(cap2.report()).toMatchInlineSnapshot(`
[
  {
    "details": {},
    "name": "THIRD",
  },
]
`)
})