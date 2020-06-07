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

function FoldSequence(folder: Folder, seq: string, struct: string): any[] | null {
    return folder.foldSequence(EPars.stringToSequence(seq), null, struct);
}

function CreateFolder(type: any): Promise<Folder> {
    return type.create();
}

test('linearfoldC:MFETests', () => {
    return expect(CreateFolder(LinearFoldC).then((folder) => {
        let expectedFE: number[] = [
            -430,// -4.29,
            -248,
            -621,
            -430, //-4.32, //-4.30,
            -1018, //-10.19, //-10.18,
            -252,
            -867,
            -491,
        ];
        let expectedNNFE: number[][] = [
            [4,636,3,-239,2,-239,1,-239,0,-239,-1,-108],
            [4, 636,  3, -239, 2, -225,  1, -108, 0, -239, -1, -71],
            [7, 694, 6, -239, 5, 227, 4, -239, 3, -239, 2, -239, 1, -239, 0, -239, -1, -108],
            [13, 598, 12, -130, 11, -197, 10, -98, 9, -103, 8, -203, 36, 548, 35, -239, 34, -209, 33, -103, 6, -627, 5, -103, 4, -203, 3, -130, 2, -204, 1, -202, -1, -74],
            [
                12,  573, 11, -209, 10, -130,  9, -204,
                30,  534, 29, -204, 28, -202, 27, -209,
                26, -130, 52,  479, 51, -239, 50, -239,
                49, -225, 48, -108,  6, -478,  5, -203,
                 4,  -84,  3, -115,  2, -202,  1,  -20,
                 0, -239, -1, -114
              ],
            [14, 582, 13, -239, 12, -239, 11, -239, 68, 492, 67, -239, 66, -239, -1, -130],
            [14, 492, 13, -239, 12, -204, 11, -225, 98, 551, 97, -209, 96, -76, 95, 19, 85, 461, 84, -98, 83, -74, 82, -103, 81, -225, 80, -98, 79, -103, 78, -225, 77, -74, 76, -74, 75, -115, 74, -202, 73, 11, 71, 330, 70, -202, 68, 139, 67, -108, 66, -239, -1, 28],
            [16, 598, 15, -239, 14, -239, 13, -239, 3, 453, 2, -239, 1, -239, 0, -239, -1, -108],
        ];
        let structures: number[][] = [
            EPars.parenthesisToPairs("(((((........)))))"),
            EPars.parenthesisToPairs("(((((........)))))"),
            EPars.parenthesisToPairs("((((((((...........)).))))))"),
            EPars.parenthesisToPairs(".((((((.((((((......)))))).......((((.....))))...))))))."),
            EPars.parenthesisToPairs("(((((((..((((........)))).(((((.......))))).....(((((.......))))))))))))."),
            EPars.parenthesisToPairs("...........((((....))))...........................................(((....)))........."),
            EPars.parenthesisToPairs("...........((((....))))...........................................(((.((.(((((((((((((.........((((.....))))........))))))))))))))).)))........."),
            EPars.parenthesisToPairs("((((.........((((.....))))........))))"),
            
        ];
        let sequences: number[][] = [
            EPars.stringToSequence(  "GGGGGAAAAAAAACCCCC"),
            EPars.stringToSequence(  "CCAGGAAAAAAAACCUGG"),
            EPars.stringToSequence(  "GGGGGGGGAAAACGGAAAGCCACCCCCC"),
            EPars.stringToSequence(  "ACGCUGUCUGUACUUGUAUCAGUACACUGACGAGUCCCUAAAGGACGAAACAGCGC"),
            EPars.stringToSequence(  "GGGGAUGUAGCUCAUAUGGUAGAGCGCUCGCUUUGCAUGCGAGAGGCACAGGGUUCGAUUCCCUGCAUCUCCA"),
            EPars.stringToSequence(  "AAGGUAACUAAGGGGGGUUCCCCAAACUUGAUCUCCACAAAAAAAAAAAAAAAAAAAAAAAAAAAACCCAAAAGGGAAAAAAAAA"),
            EPars.stringToSequence(  "CCUACUAGGGGAGCCAAAAGGCUGAGAUGAAUGUAUUCAGACCCUUAUAACCUGAUUUGGUUAAUACCAACGUAGGAAAGUAGUUAUUAACUAUUCGUCAUUGAGAUGUCUUGGUCUAACUACUUUCUUCGCUGGGAAGUAGUU"),
            EPars.stringToSequence(  "GGGGUAACUAUUCGGGGUUGAGCCCCCUUGAUCUCCCC"),
        ];

        for (let ii: number = 0; ii < sequences.length; ++ii ) {
            expect(folder.foldSequence(sequences[ii], [])).toEqual(structures[ii])

            let outNNFE: number[] = [];
            let FE = folder.scoreStructures(
                sequences[ii],
                structures[ii],
                false,
                37,
                outNNFE);
            
            expect(FE).toBeDeepCloseTo(expectedFE[ii], 0);
            expect(outNNFE).toEqual(expectedNNFE[ii]);
        }
    })).resolves.toBeUndefined();
    // toEqual([
    //     EPars.parenthesisToPairs("(((((........)))))")
    // ]);
});


test('linearfoldC:SubOptTests', () => {
    return expect(CreateFolder(LinearFoldC).then((folder) => {
        let expectedFE: number[] = [
            192,
            9,
        ];
        let expectedNNFE: number[][] = [
            [1, 539, 0, -239, -1, -108],
            [-1, 9],
        ];
        let structures: number[][] = [
            EPars.parenthesisToPairs("((......))"),
            EPars.parenthesisToPairs(".........."),
            
        ];
        let sequences: number[][] = [
            EPars.stringToSequence(  "GGGGAAAACC"),
            EPars.stringToSequence(  "GGGGAAAACC"),
        ];

        for (let ii: number = 0; ii < sequences.length; ++ii ) {

            let outNNFE: number[] = [];
            let FE = folder.scoreStructures(
                sequences[ii],
                structures[ii],
                false,
                37,
                outNNFE);
            
            expect(FE).toBeDeepCloseTo(expectedFE[ii], 0);
            expect(outNNFE).toEqual(expectedNNFE[ii]);
        }
    })).resolves.toBeUndefined();
    // toEqual([
    //     EPars.parenthesisToPairs("(((((........)))))")
    // ]);
});

for (let folderType of [Vienna, Vienna2, NuPACK, LinearFoldV]) {
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
        if (expectedTotalFe === undefined) {
            throw new Error("Total FE gold standard energy missing from TOTAL_FE!");
        }
        let expectedNNFE = NNFE.get(folderType.NAME);
        if (expectedNNFE === undefined) {
            throw new Error("NNFE gold standard energy missing from NNFE!");
        }

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

                expect(totalFe).toBeCloseTo(expectedTotalFe!);
                expect(outNNFE).toEqual(expectedNNFE!);
            }))
            .resolves.toBeUndefined(); // (we're returning a promise)
    });

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
            [LinearFoldV.NAME, [6, 21,   0.004033207893371582, 6, 22,      0.980380117893219, 6, 37,  0.0001462996006011963, 7, 20,   0.004030853509902954, 7, 21,     0.9892160892486572, 7, 22,   0.006421893835067749, 7, 36,  0.0001468956470489502, 8, 19,   0.003999501466751099, 8, 20,     0.9892876744270325, 8, 21,   0.006440162658691406, 8, 35, 0.00014690309762954712, 9, 19,       0.98785001039505, 9, 20,   0.006417781114578247, 9, 34,  0.0001466497778892517, 19, 27, 0.00013893842697143555, 20, 26, 0.00013919919729232788, 21, 25, 0.00013643503189086914, 24, 36,  0.0018515288829803467, 24, 37,     0.9861026406288147, 25, 35,  0.0018385015428066254, 25, 36,     0.9949905276298523, 25, 37,  0.0028720200061798096, 26, 34,  0.0018141455948352814, 26, 35,     0.9950662851333618, 26, 36,   0.002869546413421631, 27, 34,      0.993351936340332, 27, 35,   0.002846658229827881]],
            [LinearFoldC.NAME, [6, 19, 0.0001927018165588379, 6, 20, 0.005589544773101807, 6, 21, 0.06411212682723999, 6, 22, 0.688054084777832, 6, 35, 0.00015222281217575073, 6, 36, 0.0016865693032741547, 6, 37, 0.017163366079330444, 7, 19, 0.005924403667449951, 7, 20, 0.06936651468276978, 7, 21, 0.7702905535697937, 7, 22, 0.022137045860290527, 7, 34, 0.00014823302626609802, 7, 35, 0.0017479099333286285, 7, 36, 0.018705815076828003, 7, 37, 0.001071687787771225, 8, 19, 0.06819826364517212, 8, 20, 0.7767842411994934, 8, 21, 0.02456575632095337, 8, 22, 0.0019697099924087524, 8, 34, 0.0016399361193180084, 8, 35, 0.018716901540756226, 8, 36, 0.0011317357420921326, 8, 37, 0.0001540929079055786, 9, 19, 0.7435870170593262, 9, 20, 0.023385703563690186, 9, 21, 0.0020838044583797455, 9, 22, 0.00008499994874000549, 9, 34, 0.017640382051467896, 9, 35, 0.0009768977761268616, 9, 36, 0.00014451146125793457, 19, 24, 0.002365570515394211, 19, 25, 0.004539370536804199, 19, 26, 0.004722565412521362, 19, 27, 0.0062722861766815186, 20, 24, 0.0045351386070251465, 20, 25, 0.0047980546951293945, 20, 26, 0.006379425525665283, 20, 27, 0.0010544955730438232, 21, 25, 0.004812151193618774, 21, 26, 0.001148570328950882, 21, 27, 0.0002776980400085449, 22, 26, 0.0002814754843711853, 22, 27, 0.0002533569931983948, 24, 34, 0.0004156045615673065, 24, 35, 0.006127089262008667, 24, 36, 0.13685446977615356, 24, 37, 0.6187341213226318, 25, 34, 0.006383448839187622, 25, 35, 0.14861714839935303, 25, 36, 0.6923220157623291, 25, 37, 0.046909987926483154, 26, 34, 0.1462939977645874, 26, 35, 0.6967782974243164, 26, 36, 0.05236208438873291, 26, 37, 0.0021603070199489594, 27, 34, 0.6606990694999695, 27, 35, 0.05001801252365112, 27, 36, 0.002211257815361023, 27, 37, 0.00016619637608528137]],
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

    expect.assertions(3);
    return expect(CreateFolder(NuPACK)
        .then((folder) => {
            let pairs = folder.foldSequence(
                EPars.stringToSequence("GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                null, null, true, 37);

            expect(pairs).toBeDefined();
            expect(EPars.pairsToParenthesis(pairs!, null, true))
                .toEqual("(((....))).......(((((((((...{{{{{..)))))))))((((((((((.........))).)))))))....}}}}}....");
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});

test(`NuPACK:PK_fold1L2X`, () => {
    // The engines output different results


    // let expectedTotalFe = TOTAL_FE.get(folderType.NAME);

    expect.assertions(3);
    return expect(CreateFolder(NuPACK)
        .then((folder) => {
            let pairs = folder.foldSequence(
                EPars.stringToSequence("GGCGCGGCACCGUCCGCGGAACAAACGG"),
                null, null, true, 37);

            expect(pairs).toBeDefined();
            expect(EPars.pairsToParenthesis(pairs!, null, true))
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
