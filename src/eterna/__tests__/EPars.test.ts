import SecStruct from "eterna/rnatypes/SecStruct";

test(`EPars:filterForPseudoknots`, () => {
    const pairs = SecStruct.fromParens("...............(((((((((((...{{{{{{{)))))))))))((((((((.........))).)))))...}}.}}}}}....", true);
    const filtered = pairs.filterForPseudoknots();
    const newStruct = filtered.getParenthesis({ pseudoknots: true });
    expect(newStruct).toEqual("...............(((((((((((..........)))))))))))((((((((.........))).)))))...............");
});
