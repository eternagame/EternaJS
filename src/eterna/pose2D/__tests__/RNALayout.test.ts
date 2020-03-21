import RNALayout from "../RNALayout"
import EPars from "eterna/EPars";

test(`RNALayout:setupTree`, () => {
    let rnalayout: RNALayout = new RNALayout();

    // imagine (((....)))
    let pairs: number[] = [10, 9, 8, -1, -1, -1, -1, 3, 2, 1];
    rnalayout.setupTree(pairs);
    expect(rnalayout["_scoreBiPairs"][0]).toBe(11);
});

test(`RNALayout:filterForPseudoknots`, () => {
    let rnalayout: RNALayout = new RNALayout();

    let pairs = EPars.parenthesisToPairs("...............(((((((((((...{{{{{{{)))))))))))((((((((.........))).)))))...}}.}}}}}....", true);
    let filtered = rnalayout.filterForPseudoknots(pairs);
    let newStruct = EPars.pairsToParenthesis(filtered, null, true);
    expect(newStruct).toEqual("...............(((((((((((..........)))))))))))((((((((.........))).)))))...............");
});
