import * as assert from 'assert';
import { Connection, Value, ValueView } from '@eternagame/signals';
import Counter from './Counter';

test('simpleListener', () => {
    const value: Value<number> = new Value(42);
    let fired = false;
    value.connect((newValue: number, oldValue: number) => {
        expect(oldValue).toEqual(42);
        expect(newValue).toEqual(15);
        fired = true;
    });

    expect(value.updateForce(15)).toEqual(42);
    expect(value.value).toEqual(15);
    expect(fired).toBeTruthy();
});

test('valueAsSignal', () => {
    const value: Value<number> = new Value(42);
    let fired = false;
    value.connect((newValue: number) => {
        expect(newValue).toEqual(15);
        fired = true;
    });
    value.value = 15;
    expect(fired).toBeTruthy();
});

test('valueAsOnceSignal', () => {
    const value: Value<number> = new Value(42);
    const counter: Counter<number> = new Counter();
    value.connect((newValue) => counter.onEmit(newValue)).once();
    value.value = 15;
    value.value = 42;
    counter.assertTriggered(1);
});

test('mappedValue', () => {
    const value: Value<number> = new Value(42);
    const mapped: ValueView<string> = value.map((newValue) =>
        newValue.toString()
    );

    const counter: Counter<string> = new Counter();
    const c1: Connection = mapped.connect((newValue) =>
        counter.onEmit(newValue)
    );
    const c2: Connection = mapped.connect((newValue) =>
        expect(newValue).toEqual('15')
    );

    value.value = 15;
    counter.assertTriggered(1);
    value.value = 15;
    counter.assertTriggered(1);
    value.updateForce(15);
    counter.assertTriggered(2);

    // disconnect from the mapped value and ensure that it disconnects in turn
    c1.close();
    c2.close();
    expect(value.hasConnections).toBeFalsy();
});

test('connectNotify', () => {
    const value: Value<number> = new Value(42);
    let fired = false;
    value.connectNotify((newValue: number) => {
        expect(newValue).toEqual(42);
        fired = true;
    });
    expect(fired).toBeTruthy();
});

test('disconnect', () => {
    const value: Value<number> = new Value(42);
    let expectedValue: number = value.value;
    let fired = 0;

    const listener = (newValue: number) => {
        expect(newValue).toEqual(expectedValue);
        fired += 1;
        value.disconnect(listener);
    };

    const conn: Connection = value.connectNotify(listener);
    expectedValue = 12;
    value.value = expectedValue;
    assert.strictEqual(fired, 1, 'Disconnecting in listenNotify disconnects');
    conn.close(); // Ensure no error when calling close while already closed

    const dummy = new Counter();

    value.connect(listener);
    value.connect(() => dummy.onEmit(value));
    value.connect(listener);
    expectedValue = 13;
    value.value = expectedValue;
    expectedValue = 14;
    value.value = expectedValue;
    assert.strictEqual(fired, 3, 'Disconnecting in listen disconnects');

    value.connect(listener).close();
    expectedValue = 15;
    value.value = expectedValue;
    assert.strictEqual(
        fired,
        3,
        'Disconnecting before geting an update still disconnects'
    );
});

test('slot', () => {
    const value: Value<number> = new Value(42);
    let expectedValue = value.value;
    let fired = 0;
    const listener = (newValue: number) => {
        expect(newValue).toEqual(expectedValue);
        fired += 1;
        value.disconnect(listener);
    };

    value.connect(listener);
    expectedValue = 12;
    value.value = expectedValue;
    assert.strictEqual(1, fired, 'Calling disconnect with a slot disconnects');

    value.connect(listener).close();
    expectedValue = 14;
    value.value = expectedValue;
    assert.strictEqual(1, fired);
});
