import RegistrationGroup from '../RegistrationGroup';
import UnitSignal from '../UnitSignal';
import Counter from './Counter';

test('registrationGroup', () => {
    const group: RegistrationGroup = new RegistrationGroup();
    const sig: UnitSignal = new UnitSignal();
    const counter: Counter = new Counter();
    group.add(sig.connect((value) => counter.slot(value)));
    sig.emit();
    group.close();
    sig.emit();

    counter.assertTriggered(1, 'RegistrationGroup close all connections');
});
