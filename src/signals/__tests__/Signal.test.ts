import {Connection, Signal, SignalView, UnitSignal} from "signals";
import Counter from "./Counter";

test("signalToSlot", () => {
    let signal: Signal<number> = new Signal();
    let slot: AccSlot = new AccSlot();
    signal.connect((value) => slot.onEmit(value));
    signal.emit(1);
    signal.emit(2);
    signal.emit(3);
    expect(slot.events).toEqual([1, 2, 3]);
});

test("oneShotSlot", () => {
    let signal: Signal<number> = new Signal();
    let slot: AccSlot = new AccSlot();
    signal.connect((value) => slot.onEmit(value)).once();
    signal.emit(1); // slot should be removed after this emit
    signal.emit(2);
    signal.emit(3);
    expect(slot.events).toEqual([1]);
});

test("slotPriority", () => {
    let counter: any = {val: 0};
    let slot1: PriorityTestSlot = new PriorityTestSlot(counter);
    let slot2: PriorityTestSlot = new PriorityTestSlot(counter);
    let slot3: PriorityTestSlot = new PriorityTestSlot(counter);
    let slot4: PriorityTestSlot = new PriorityTestSlot(counter);

    let signal: UnitSignal = new UnitSignal();
    signal.connect(() => slot3.onEmit()).atPriority(3);
    signal.connect(() => slot1.onEmit()).atPriority(1);
    signal.connect(() => slot2.onEmit()).atPriority(2);
    signal.connect(() => slot4.onEmit()).atPriority(4);
    signal.emit();
    expect(slot1.order).toEqual(4);
    expect(slot2.order).toEqual(3);
    expect(slot3.order).toEqual(2);
    expect(slot4.order).toEqual(1);
});

test("addDuringDispatch", () => {
    let signal: Signal<number> = new Signal();
    let toAdd: AccSlot = new AccSlot();

    signal.connect(() => {
        signal.connect((value) => toAdd.onEmit(value));
    }).once();

    // this will connect our new signal but not dispatch to it
    signal.emit(5);
    expect(toAdd.events.length).toEqual(0);

    // now dispatch an event that should go to the added signal
    signal.emit(42);
    expect(toAdd.events).toEqual([42]);
});

test("removeDuringDispatch", () => {
    let signal: Signal<number> = new Signal();
    let toRemove: AccSlot = new AccSlot();
    let rconn: Connection = signal.connect((value) => {
        toRemove.onEmit(value)
    });

    // dispatch one event and make sure it's received
    signal.emit(5);
    expect(toRemove.events).toEqual([5]);

    // now add our removing signal, and dispatch again
    signal.connect(() => {
        rconn.close();
    }).atPriority(1); // ensure that we're before toRemove
    signal.emit(42);

    // toRemove will have been removed during this dispatch, so it should not have received
    // the signal
    expect(toRemove.events).toEqual([5]);
});

test("addAndRemoveDuringDispatch", () => {
    let signal: Signal<number> = new Signal();
    let toAdd: AccSlot = new AccSlot();
    let toRemove: AccSlot = new AccSlot();
    let rconn: Connection = signal.connect((value) => toRemove.onEmit(value));

    // dispatch one event and make sure it's received by toRemove
    signal.emit(5);
    expect(toRemove.events).toEqual([5]);

    // now add our adder/remover signal, and dispatch again
    signal.connect(() => {
        rconn.close();
        signal.connect((value) => toAdd.onEmit(value));
    });
    signal.emit(42);
    // make sure toRemove got this event and toAdd didn't
    expect(toRemove.events).toEqual([5, 42]);
    expect(toAdd.events.length).toEqual(0);

    // finally emit one more and ensure that toAdd got it and toRemove didn't
    signal.emit(9);
    expect(toAdd.events).toEqual([9]);
    expect(toRemove.events).toEqual([5, 42]);
});

test("unitSlot", () => {
    let signal: Signal<number> = new Signal();
    let fired: boolean = false;
    signal.connect(() => {
        fired = true;
    });
    signal.emit(42);
    expect(fired).toBe(true);
});

test("singleFailure", () => {
    expect(() => {
        let signal: UnitSignal = new UnitSignal();
        signal.connect(() => {
            throw new Error("Bang!");
        });
        signal.emit();
    }).toThrowError();
});

test("multiFailure", () => {
    expect(() => {
        let signal: UnitSignal = new UnitSignal();
        signal.connect(() => {
            throw new Error("Bing!");
        });
        signal.connect(() => {
            throw new Error("Bang!");
        });
        signal.emit();
    }).toThrowError();
});

test("mappedSignal", () => {
    let signal: Signal<number> = new Signal();
    let mapped: SignalView<string> = signal.map((value) => "" + value);

    let counter: Counter = new Counter();
    let c1: Connection = mapped.connect((value) => counter.onEmit(value));
    let c2: Connection = mapped.connect((value) => expect(value).toEqual("15"));

    signal.emit(15);
    counter.assertTriggered(1);
    signal.emit(15);
    counter.assertTriggered(2);

    // disconnect from the mapped signal and ensure that it clears its connection
    c1.close();
    c2.close();
    expect(signal.hasConnections).toBeFalsy();
});

class AccSlot {
    public events: any[] = [];

    public onEmit(event: any): void {
        this.events.push(event);
    }
}

class PriorityTestSlot {
    public order: number;
    public counter: any;

    constructor(counter: any) {
        this.counter = counter;
    }

    public onEmit(event: any = null): void {
        this.order = ++(this.counter.val);
    }
}
