import EPars, {SecStruct} from "../EPars";

test(`EPars:filterForPseudoknots`, () => {
    const pairs = SecStruct.fromParens("...............(((((((((((...{{{{{{{)))))))))))((((((((.........))).)))))...}}.}}}}}....", true);
    const filtered = pairs.filterForPseudoknots();
    const newStruct = filtered.getParenthesis( null, true);
    expect(newStruct).toEqual("...............(((((((((((..........)))))))))))((((((((.........))).)))))...............");
});
