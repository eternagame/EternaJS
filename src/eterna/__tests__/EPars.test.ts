import EPars from "../EPars";

test(`EPars:filterForPseudoknots`, () => {
    let pairs = EPars.parenthesisToPairs("...............(((((((((((...{{{{{{{)))))))))))((((((((.........))).)))))...}}.}}}}}....", true);
    let filtered = EPars.filterForPseudoknots(pairs);
    let newStruct = EPars.pairsToParenthesis(filtered, null, true);
    expect(newStruct).toEqual("...............(((((((((((..........)))))))))))((((((((.........))).)))))...............");
});
