import EPars from "eterna/EPars";
import Folder from "../Folder";
import NuPACK from "../NuPACK";
import Vienna from "../Vienna";
import Vienna2 from "../Vienna2";
import LinearFoldC from "../LinearFoldC";
import LinearFoldV from "../LinearFoldV";
import "./jest-matcher-deep-close-to";

const SNOWFLAKE_SEQ = 'GUGGACAAGAUGAAACAUCAGUAACAAGCGCAAAGCGCGGGCAAAGCCCCCGGAAACCGGAAGUUACAGAACAAAGUUCAAGUUUACAAGUGGACAAGUUGAAACAACAGUUACAAGACGAAACGUCGGCCAAAGGCCCCAUAAAAUGGAAGUAACACUUGAAACAAGAAGUUUACAAGUUGACAAGUUCAAAGAACAGUUACAAGUGGAAACCACGCGCAAAGCGCCUCCAAAGGAGAAGUAACAGAAGAAACUUCAAGUUAGCAAGUGGUCAAGUACAAAGUACAGUAACAACAUCAAAGAUGGCGCAAAGCGCGAGCAAAGCUCAAGUUACAGAACAAAGUUCAAGAUUACAAGAGUGCAAGAAGAAACUUCAGAUAGAACUGCAAAGCAGCACCAAAGGUGGGGCAAAGCCCAACUAUCAGUUGAAACAACAAGUAUUCAAGAGGUCAAGAUCAAAGAUCAGUAACAAGUGCAAAGCACGGGCAAAGCCCGACCAAAGGUCAAGUUACAGUUCAAAGAACAAGAUUUC';
const SNOWFLAKE_STRUCT = '((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))';

const BASIC_SEQ = "AAAAAAAAAAAAAA";
const BASIC_RESULT = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];

const ZIPPERS_SEQ = "AAAAAGGGGAAAAAAAAACCCCAGCGGAAAAAACUGCAAA";
const ZIPPERS_BEST_PAIRS = ".....((((.........)))).((((......))))...";
const ZIPPERS_TEMP = 37;

function FoldSequence(folder: Folder, seq: string, struct: string): any[] {
    return folder.foldSequence(EPars.stringToSequence(seq), null, struct);
}

function CreateFolder(type: any): Promise<Folder> {
    return type.create();
}

for (let folderType of [Vienna, Vienna2, NuPACK, LinearFoldC, LinearFoldV]) {
    test(`${folderType.NAME}:snowflake`, () => {
        // expect.assertions: the async code should result in X assertions being called
        // https://facebook.github.io/jest/docs/en/expect.html#expectassertionsnumber
        expect.assertions(1);
        return expect(CreateFolder(folderType)
            .then((folder: any) => FoldSequence(folder, SNOWFLAKE_SEQ, SNOWFLAKE_STRUCT)))
            .resolves.toBeTruthy();
    });

    test(`${folderType.NAME}:emptyStructure`, () => {
        expect.assertions(1);
        return expect(CreateFolder(folderType)
            .then((folder) => FoldSequence(folder, BASIC_SEQ, "")))
            .resolves.toEqual(BASIC_RESULT);
    });

    test(`${folderType.NAME}:cachedQuery`, () => {
        expect.assertions(1);
        return expect(CreateFolder(folderType)
            .then((folder) => {
                return [
                    FoldSequence(folder, BASIC_SEQ, ""),
                    FoldSequence(folder, BASIC_SEQ, "")
                ];
            }))
            .resolves.toEqual([BASIC_RESULT, BASIC_RESULT]);
    });

    test(`${folderType.NAME}:score_structures`, () => {
        // The engines output different results

        const TOTAL_FE: Map<string, number> = new Map([
            [Vienna.NAME, -1080],
            [Vienna2.NAME, -1019.999],
            [NuPACK.NAME, -1111],
            [LinearFoldC.NAME, -1019.999],
            [LinearFoldV.NAME, -1019.999],
        ]);

        const NNFE: Map<string, number[]> = new Map([
            [Vienna.NAME, [-1,-360,5,-330,6,-330,7,-330,8,530,23,-340,24,-140,25,-210,26,430]],
            [Vienna2.NAME, [-1,-300,5,-330,6,-330,7,-330,8,530,23,-340,24,-140,25,-210,26,430]],
            [NuPACK.NAME, [-1,-360,26,360,25,-190,24,-120,23,-340,8,410,7,-290,6,-290,5,-290]],
            [LinearFoldC.NAME, [8,530,7,-330,6,-330,5,-330,26,430,25,-210,24,-140,23,-340,-1,-300]],
            [LinearFoldV.NAME, [8,530,7,-330,6,-330,5,-330,26,430,25,-210,24,-140,23,-340,-1,-300]],
        ]);

        let expectedTotalFe = TOTAL_FE.get(folderType.NAME);
        let expectedNNFE = NNFE.get(folderType.NAME);

        expect.assertions(3);
        return expect(CreateFolder(folderType)
            .then((folder) => {
                let outNNFE: number[] = [];
                let totalFe = folder.scoreStructures(
                    EPars.stringToSequence(ZIPPERS_SEQ),
                    EPars.parenthesisToPairs(ZIPPERS_BEST_PAIRS),
                    false,
                    ZIPPERS_TEMP,
                    outNNFE);

                expect(totalFe).toBeCloseTo(expectedTotalFe);
                expect(outNNFE).toEqual(expectedNNFE);
            }))
            .resolves.toBeUndefined(); // (we're returning a promise)
    });

    if ( folderType == LinearFoldC || folderType == LinearFoldV ) {
        // dot plot not implemented
        continue;
    }

    test(`${folderType.NAME}:get_dot_plot(simple)`, () => {
        expect.assertions(1);
        const SEQ = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
        const STRUCT = "........................................";
        return expect(CreateFolder(folderType)
            .then((folder) => {
                return folder.getDotPlot(
                    EPars.stringToSequence(SEQ),
                    EPars.parenthesisToPairs(STRUCT),
                    37);
            }))
            .resolves.toEqual([]);
    });

    test(`${folderType.NAME}:get_dot_plot(complex)`, () => {
        expect.assertions(1);
        const SEQ = "AAAAACCCCAAAAAAAAAGGGGACCCCAAAAAAGGGGAAA";
        const STRUCT = ".....((((.........)))).((((......))))...";

        const RESULT: Map<string, number[]> = new Map([
            [Vienna.NAME, [6,20,0.003204861,6,21,0.050702623,6,22,0.994967823,6,37,0.014707212,7,20,0.050686163,7,21,0.997305727,7,22,0.049737799,7,36,0.014697534,8,19,0.048807822,8,20,0.997265654,8,21,0.049896478,8,35,0.014696120,9,19,0.981161504,9,20,0.048955465,9,34,0.014664345,19,24,0.007318126,19,26,0.006963470,19,27,0.007932088,20,25,0.006957857,20,26,0.007936614,20,27,0.007544318,21,25,0.006246202,21,26,0.007525488,24,36,0.036388827,24,37,0.996200675,25,35,0.036287239,25,36,0.998544617,25,37,0.035832064,26,34,0.035331676,26,35,0.998545990,26,36,0.035898986,27,34,0.982421238,27,35,0.035432802,22,6,0.9500000,21,7,0.9500000,20,8,0.9500000,19,9,0.9500000,37,24,0.9500000,36,25,0.9500000,35,26,0.9500000,34,27,0.9500000]],
            [Vienna2.NAME, [6,20,0.003988738,6,21,0.063180796,6,22,0.990143360,6,37,0.010712919,7,19,0.003988932,7,20,0.063162002,7,21,0.994601699,7,22,0.080314175,7,36,0.010755485,8,19,0.062911053,8,20,0.994635139,8,21,0.080430352,8,22,0.005083604,8,35,0.010755360,9,19,0.993906409,9,20,0.080288216,9,21,0.005089970,9,34,0.010736979,19,27,0.010233688,20,26,0.010250062,21,25,0.010084667,24,35,0.004329294,24,36,0.042500942,24,37,0.993037693,25,34,0.004338242,25,35,0.042344422,25,36,0.997512167,25,37,0.053864061,26,34,0.042051181,26,35,0.997550468,26,36,0.053844965,26,37,0.005520726,27,34,0.996686512,27,35,0.053666033,27,36,0.005535491,22,6,0.9500000,21,7,0.9500000,20,8,0.9500000,19,9,0.9500000,37,24,0.9500000,36,25,0.9500000,35,26,0.9500000,34,27,0.9500000]],
            [NuPACK.NAME, [6,20,0.00008970054198092353,6,21,0.011729698180047701,6,22,0.9518105848284347,6,37,0.00013243831310604377,7,19,0.00008966039871562371,7,20,0.011765385207831875,7,21,0.9706162858666628,7,22,0.01646028859436443,7,36,0.0001335489962994577,8,19,0.01165052568341233,8,20,0.9707744900721356,8,21,0.016940341777949973,8,22,0.00012670333368449728,8,35,0.000133538023219132,9,19,0.9675496328284401,9,20,0.016956501549632304,9,21,0.00012999690753806768,9,34,0.0001330854144430546,19,27,0.00011754782629591105,20,26,0.00011791135581604513,20,27,0.000011669987801284624,21,25,0.00011089605008890967,21,26,0.000011523889683633583,24,35,0.000029551724038800597,24,36,0.003875727609563238,24,37,0.9498782980469551,25,34,0.000029769294840305784,25,35,0.003914869980310296,25,36,0.9688162119970055,25,37,0.026286887200841713,26,34,0.003873729342074498,26,35,0.9689829022099249,26,36,0.02661923191621384,26,37,0.00020224064169583236,27,34,0.9666645006689871,27,35,0.02659916084138646,27,36,0.00020447901551065852]],
        ]);

        let expectedResult = RESULT.get(folderType.NAME);

        return expect(CreateFolder(folderType)
            .then((folder) => {
                return folder.getDotPlot(
                    EPars.stringToSequence(SEQ),
                    EPars.parenthesisToPairs(STRUCT),
                    37);
            }))
            .resolves.toBeDeepCloseTo(expectedResult, 5);
    });
}

test(`NuPACK:PK_score_structures`, () => {
    // The engines output different results


    // let expectedTotalFe = TOTAL_FE.get(folderType.NAME);

    // expect.assertions(9);
    return expect(CreateFolder(NuPACK)
        .then((folder) => {
            let outNNFE: number[] = [];
            let totalFe = folder.scoreStructures(
                EPars.stringToSequence("GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                EPars.parenthesisToPairs("...............(((((((((((...{{{{{{{)))))))))))((((((((.........))).)))))...}}.}}}}}....", true),
                true,
                37,
                outNNFE);

            expect(totalFe).toBeCloseTo(19997459);
            // NNFE doesn't change because we don't do anything pseudoknotty about it?                         last two we added?
            // expect(outNNFE).toEqual([-1,10000000,54,290,53,-170,52,-180,51,180,50,-180,49,-210,48,-140,47,-200,15,9996510]);

            // This could realistically be the target structure because we're in fact fine with the hairpin at 5'
            let totalFe2 = folder.scoreStructures(
                EPars.stringToSequence(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                EPars.parenthesisToPairs("(((....))).......(((((((((...{{{{{{{)))))))))..((((((((.........))).)))))...}}.}}}}}....", true),
                true,
                37,
                outNNFE);

            expect(totalFe2).toBeCloseTo(-2600);
            // NNFE doesn't change because we don't do anything pseudoknotty about it?                         last two we added?
            // expect(outNNFE).toEqual([-1,-190,54,290,53,-170,52,-180,51,180,50,-180,49,-210,48,-140,47,-200,17,-3320,2,260,1,-90,0,-210]);
            
            let seq = EPars.stringToSequence(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG");
            expect(seq).toEqual([3, 4, 4, 4, 4, 4, 1, 1, 1, 2, 3, 3, 3, 4, 4, 4, 3, 2, 3, 3, 4, 3, 4, 1, 1, 3, 4, 3, 2, 1, 3, 2, 2, 2, 3,
                4, 2, 4, 4, 1, 2, 1, 2, 2, 3, 4, 3, 2, 3, 3, 2, 1, 2, 1, 3, 3, 2, 1, 2, 4, 1, 3, 4, 1, 2, 4, 3, 1, 4, 3, 4, 2, 3, 4, 1, 4,
                1, 2, 1, 3, 3, 3, 2, 4, 4, 4, 4, 3]);
            let totalFe3 = folder.scoreStructures(
                seq, //                   GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG
                EPars.parenthesisToPairs(".................(((((((((...{{{{{{{)))))))))..((((((((.........))).)))))...}}.}}}}}....", true),
                true,
                37,
                outNNFE);

            expect(totalFe3).toBeCloseTo(-2390);


            totalFe3 = folder.scoreStructures(
                EPars.stringToSequence(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"), 
                EPars.parenthesisToPairs(".................(((((((((...{{{{{{{)))))))))..((((((((.........))).)))))...}}.}}}}}....", true),
                true, 37, 
                outNNFE);
            expect(totalFe3).toBeCloseTo(-2390);


            // NNFE doesn't change because we don't do anything pseudoknotty about it?                         last two we added?
            // expect(outNNFE).toEqual([-1,-20,54,290,53,-170,52,-180,51,180,50,-180,49,-210,48,-140,47,-200,17,-3320]);

            // This is the MFE structure, I think., with a longer PK with a bulge
            let totalFe4 = folder.scoreStructures(
                EPars.stringToSequence(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                EPars.parenthesisToPairs("(((....))).......(((((((((...{{{{{{{)))))))))((((((((((.........))).))))))).}}.}}}}}....", true),
                true,
                37,
                outNNFE);
            expect(totalFe4).toBeCloseTo(-2830);

            // This is the true MFE structure maybe. It's at least coming up as native in EteRNA.
            let totalFe5 = folder.scoreStructures(
                EPars.stringToSequence(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                EPars.parenthesisToPairs("(((....))).......(((((((((...{{{{{..)))))))))((((((((((.........))).)))))))....}}}}}....", true),
                true,
                37,
                outNNFE);
            expect(totalFe5).toBeCloseTo(-2961); // -2960.0000381469727 in EteRNA, but good enough?

            let totalFe6 = folder.scoreStructures(
                //                               **
                EPars.stringToSequence(  "GUUUUUAGGCGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                EPars.parenthesisToPairs("......(((((((.(((({{{{{{...)))))))))))}}}}}}.{{{{{{{.[[[[.[[.[[[....}}}}}}}]]].]]]]]]...", true),
                true,
                37,
                outNNFE);
            expect(totalFe6).toBeCloseTo(-2990); // notably NOT 19997409.375 -- caching issue

            // This is a mutation that appears to be giving a "wrong" score, as though the MFE 
            // is being found and then a bad score is returned for it.
            let totalFe7 = folder.scoreStructures(
                //                               **
                EPars.stringToSequence(  "GUUUUUAGGCGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                EPars.parenthesisToPairs("......(((((((.(((({{{{{{...)))))))))))}}}}}}.(((((((.{{{{.{{........)))))))....}}}}}}...", true),
                true,
                37,
                outNNFE);
            expect(totalFe7).toBeCloseTo(19997409); // notably NOT 19997409.375

            // NNFE doesn't change because we don't do anything pseudoknotty about it?                         last two we added?
            // expect(outNNFE).toEqual([-1,-190,54,290,53,-170,52,-180,51,180,50,-180,49,-210,48,-140,47,-200,46,-210,45,-80,17,-3550,2,260,1,-90,0,-210]);
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});

test(`NuPACK:PK_foldSequence`, () => {
    // The engines output different results


    // let expectedTotalFe = TOTAL_FE.get(folderType.NAME);

    expect.assertions(2);
    return expect(CreateFolder(NuPACK)
        .then((folder) => {
            let pairs = folder.foldSequence(
                EPars.stringToSequence("GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                null, null, true, 37);

            console.error(pairs);
            expect(EPars.pairsToParenthesis(pairs, null, true))
                .toEqual("(((....))).......(((((((((...{{{{{..)))))))))((((((((((.........))).)))))))....}}}}}....");
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});

test(`NuPACK:PK_fold1L2X`, () => {
    // The engines output different results


    // let expectedTotalFe = TOTAL_FE.get(folderType.NAME);

    expect.assertions(2);
    return expect(CreateFolder(NuPACK)
        .then((folder) => {
            let pairs = folder.foldSequence(
                EPars.stringToSequence("GGCGCGGCACCGUCCGCGGAACAAACGG"),
                null, null, true, 37);

            expect(EPars.pairsToParenthesis(pairs, null, true))
                .toEqual("..(((((..{{{{)))))......}}}}");
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});

test(`NuPACK:PK_score1L2X`, () => {
    // The engines output different results


    // let expectedTotalFe = TOTAL_FE.get(folderType.NAME);

    expect.assertions(2);
    return expect(CreateFolder(NuPACK)
        .then((folder) => {
            let outNNFE: number[] = [];
            let score = folder.scoreStructures(
                EPars.stringToSequence("GGCGCGGCACCGUCCGCGGAACAAACGG"),
                EPars.parenthesisToPairs("..(((((..{{{{)))))......}}}}", true),
                true, 37, outNNFE);

            expect(score).toEqual(-940);
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});
