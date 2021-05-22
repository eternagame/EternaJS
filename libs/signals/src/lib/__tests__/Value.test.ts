import * as assert from 'assert';
import { Connection, Value, ValueView } from 'signals';
import Counter from './Counter';

test('simpleListener', () => {
    const value: Value<number> = new Value(42);
    let fired: boolean = false;
    value.connect((nvalue: number, ovalue: number) => {
        expect(ovalue).toEqual(42);
        expect(nvalue).toEqual(15);
        fired = true;
    });

    expect(value.updateForce(15)).toEqual(42);
    expect(value.value).toEqual(15);
    expect(fired).toBeTruthy();
});

test('valueAsSignal', () => {
    const value: Value<number> = new Value(42);
    let fired: boolean = false;
    value.connect((value: number) => {
        expect(value).toEqual(15);
        fired = true;
    });
    value.value = 15;
    expect(fired).toBeTruthy();
});

test('valueAsOnceSignal', () => {
    const value: Value<number> = new Value(42);
    const counter: Counter = new Counter();
    value.connect((value) => counter.onEmit(value)).once();
    value.value = 15;
    value.value = 42;
    counter.assertTriggered(1);
});

test('mappedValue', () => {
    const value: Value<number> = new Value(42);
    const mapped: ValueView<string> = value.map((value) => value.toString());

    const counter: Counter = new Counter();
    const c1: Connection = mapped.connect((value) => counter.onEmit(value));
    const c2: Connection = mapped.connect((value) =>
        expect(value).toEqual('15')
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
    let fired: boolean = false;
    value.connectNotify((val: number) => {
        expect(val).toEqual(42);
        fired = true;
    });
    expect(fired).toBeTruthy();
});

test('disconnect', () => {
    const value: Value<number> = new Value(42);
    let expectedValue: number = value.value;
    let fired: number = 0;

    const listener = (newValue: number) => {
        expect(newValue).toEqual(expectedValue);
        fired += 1;
        value.disconnect(listener);
    };

    const conn: Connection = value.connectNotify(listener);
    value.value = expectedValue = 12;
    assert.strictEqual(fired, 1, 'Disconnecting in listenNotify disconnects');
    conn.close(); // Ensure no error when calling close while already closed

    const dummy = new Counter();

    value.connect(listener);
    value.connect(() => dummy.onEmit(value));
    value.connect(listener);
    value.value = expectedValue = 13;
    value.value = expectedValue = 14;
    assert.strictEqual(fired, 3, 'Disconnecting in listen disconnects');

    value.connect(listener).close();
    value.value = expectedValue = 15;
    assert.strictEqual(
        fired,
        3,
        'Disconnecting before geting an update still disconnects'
    );
});

test('slot', () => {
    const value: Value<number> = new Value(42);
    let expectedValue: number = value.value;
    let fired: number = 0;
    const listener = (newValue: number) => {
        expect(newValue).toEqual(expectedValue);
        fired += 1;
        value.disconnect(listener);
    };

    value.connect(listener);
    value.value = expectedValue = 12;
    assert.strictEqual(1, fired, 'Calling disconnect with a slot disconnects');

    value.connect(listener).close();
    value.value = expectedValue = 14;
    assert.strictEqual(1, fired);
});
