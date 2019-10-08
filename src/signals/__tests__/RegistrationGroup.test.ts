import RegistrationGroup from "../RegistrationGroup";
import UnitSignal from "../UnitSignal";
import Counter from "./Counter";

test("registrationGroup", () => {
    let group: RegistrationGroup = new RegistrationGroup();
    let sig: UnitSignal = new UnitSignal();
    let counter: Counter = new Counter();
    group.add(sig.connect((value) => counter.slot(value)));
    sig.emit();
    group.close();
    sig.emit();

    counter.assertTriggered(1, "RegistrationGroup close all connections");
});
