import RNALayout from '../RNALayout';
import {SecStruct} from 'eterna/EPars';

test(`RNALayout:setupTree`, () => {
    const rnalayout: RNALayout = new RNALayout();

    // imagine (((....)))
    const pairs = new SecStruct([10, 9, 8, -1, -1, -1, -1, 3, 2, 1]);
    rnalayout.setupTree(pairs);
    expect(rnalayout["_scoreBiPairs"][0]).toBe(11);
});
