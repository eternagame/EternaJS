import RNALayout from "../RNALayout"
//jest.mock('../RNALayout');

test(`RNALayout:setupTree`, () => {
    let rnalayout: RNALayout = new RNALayout();

    // imagine (((....)))
    let pairs: number[] = [10, 9, 8, -1, -1, -1, -1, 3, 2, 1];
    rnalayout.setupTree(pairs);
    expect(rnalayout["_scoreBiPairs"][0]).toBe(11);
    //expect(RNALayout.mock["addNodesRecursive"].calls.length).toBe(3);
    // should call addNodesRecursive three times, or maybe six
    
});