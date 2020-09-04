import EPars from "../EPars";

test(`EPars:filterForPseudoknots`, () => {
    const pairs = EPars.parenthesisToPairs("...............(((((((((((...{{{{{{{)))))))))))((((((((.........))).)))))...}}.}}}}}....", true);
    const filtered = EPars.filterForPseudoknots(pairs);
    const newStruct = EPars.pairsToParenthesis(filtered, null, true);
    expect(newStruct).toEqual("...............(((((((((((..........)))))))))))((((((((.........))).)))))...............");
});
