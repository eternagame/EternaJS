import * as assert from "assert";
import {Connection, Value, ValueView} from "signals";
import Counter from "./Counter";

test("simpleListener", () => {
    let value: Value<number> = new Value(42);
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

test("valueAsSignal", () => {
    let value: Value<number> = new Value(42);
    let fired: boolean = false;
    value.connect((value: number) => {
        expect(value).toEqual(15);
        fired = true;
    });
    value.value = 15;
    expect(fired).toBeTruthy();
});

test("valueAsOnceSignal", () => {
    let value: Value<number> = new Value(42);
    let counter: Counter = new Counter();
    value.connect((value) => counter.onEmit(value)).once();
    value.value = 15;
    value.value = 42;
    counter.assertTriggered(1);
});

test("mappedValue", () => {
    let value: Value<number> = new Value(42);
    let mapped: ValueView<string> = value.map((value) => value.toString());

    let counter: Counter = new Counter();
    let c1: Connection = mapped.connect((value) => counter.onEmit(value));
    let c2: Connection = mapped.connect((value) => expect(value).toEqual("15"));

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

test("connectNotify", () => {
    let value: Value<number> = new Value(42);
    let fired: boolean = false;
    value.connectNotify((val: number) => {
        expect(val).toEqual(42);
        fired = true;
    });
    expect(fired).toBeTruthy();
});

test("disconnect", () => {
    let value: Value<number> = new Value(42);
    let expectedValue: number = value.value;
    let fired: number = 0;

    let listener = (newValue: number) => {
        expect(newValue).toEqual(expectedValue);
        fired += 1;
        value.disconnect(listener);
    };

    let conn: Connection = value.connectNotify(listener);
    value.value = expectedValue = 12;
    assert.strictEqual(fired, 1, "Disconnecting in listenNotify disconnects");
    conn.close(); // Ensure no error when calling close while already closed

    let dummy = new Counter();

    value.connect(listener);
    value.connect(() => dummy.onEmit(value));
    value.connect(listener);
    value.value = expectedValue = 13;
    value.value = expectedValue = 14;
    assert.strictEqual(fired, 3, "Disconnecting in listen disconnects");

    value.connect(listener).close();
    value.value = expectedValue = 15;
    assert.strictEqual(fired, 3, "Disconnecting before geting an update still disconnects");
});

test("slot", () => {
    let value: Value<number> = new Value(42);
    let expectedValue: number = value.value;
    let fired: number = 0;
    let listener = (newValue: number) => {
        expect(newValue).toEqual(expectedValue);
        fired += 1;
        value.disconnect(listener);
    };

    value.connect(listener);
    value.value = expectedValue = 12;
    assert.strictEqual(1, fired, "Calling disconnect with a slot disconnects");

    value.connect(listener).close();
    value.value = expectedValue = 14;
    assert.strictEqual(1, fired);
});
