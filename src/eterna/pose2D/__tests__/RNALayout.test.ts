import RNALayout from "../RNALayout"

test(`RNALayout:setupTree`, () => {
    let rnalayout: RNALayout = new RNALayout();

    // imagine (((....)))
    let pairs: number[] = [10, 9, 8, -1, -1, -1, -1, 3, 2, 1];
    rnalayout.setupTree(pairs);
    expect(rnalayout["_scoreBiPairs"][0]).toBe(11);
});
