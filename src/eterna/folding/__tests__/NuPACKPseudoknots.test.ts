import Sequence from 'eterna/rnatypes/Sequence';
import Folder from '../Folder';
import NuPACK from '../NuPACK';
import './jest-matcher-deep-close-to';

function CreateFolder(type: any): Promise<Folder | null> {
    return type.create();
}

// See https://github.com/eternagame/EternaJS/issues/654
/*
test(`NuPACK:PK_score_structures`, () => {
    // The engines output different results


    // let expectedTotalFe = TOTAL_FE.get(folderType.NAME);

    // expect.assertions(9);
    return expect(CreateFolder(NuPACK)
        .then((folder) => {
            if (folder === null) return;

            let outNNFE: number[] = [];
            let totalFe = folder.scoreStructures(
                Sequence.fromSequenceString("GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                SecStruct.fromParens("...............(((((((((((...{{{{{{{)))))))))))((((((((.........))).)))))...}}.}}}}}....", true),
                true,
                37,
                outNNFE);

            expect(totalFe).toBeCloseTo(19997459);
            // NNFE doesn't change because we don't do anything pseudoknotty about it?                         last two we added?
            // expect(outNNFE).toEqual([-1,10000000,54,290,53,-170,52,-180,51,180,50,-180,49,-210,48,-140,47,-200,15,9996510]);

            // This could realistically be the target structure because we're in fact fine with the hairpin at 5'
            let totalFe2 = folder.scoreStructures(
                Sequence.fromSequenceString(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                SecStruct.fromParens("(((....))).......(((((((((...{{{{{{{)))))))))..((((((((.........))).)))))...}}.}}}}}....", true),
                true,
                37,
                outNNFE);

            expect(totalFe2).toBeCloseTo(-2600);
            // NNFE doesn't change because we don't do anything pseudoknotty about it?                         last two we added?
            // expect(outNNFE).toEqual([-1,-190,54,290,53,-170,52,-180,51,180,50,-180,49,-210,48,-140,47,-200,17,-3320,2,260,1,-90,0,-210]);
            
            let seq = Sequence.fromSequenceString(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG");
            expect(seq).toEqual(new Sequence([3, 4, 4, 4, 4, 4, 1, 1, 1, 2, 3, 3, 3, 4, 4, 4, 3, 2, 3, 3, 4, 3, 4, 1, 1, 3, 4, 3, 2, 1, 3, 2, 2, 2, 3,
                4, 2, 4, 4, 1, 2, 1, 2, 2, 3, 4, 3, 2, 3, 3, 2, 1, 2, 1, 3, 3, 2, 1, 2, 4, 1, 3, 4, 1, 2, 4, 3, 1, 4, 3, 4, 2, 3, 4, 1, 4,
                1, 2, 1, 3, 3, 3, 2, 4, 4, 4, 4, 3]));
            let totalFe3 = folder.scoreStructures(
                seq, //                   GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG
                SecStruct.fromParens(".................(((((((((...{{{{{{{)))))))))..((((((((.........))).)))))...}}.}}}}}....", true),
                true,
                37,
                outNNFE);

            expect(totalFe3).toBeCloseTo(-2390);


            totalFe3 = folder.scoreStructures(
                Sequence.fromSequenceString(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"), 
                SecStruct.fromParens(".................(((((((((...{{{{{{{)))))))))..((((((((.........))).)))))...}}.}}}}}....", true),
                true, 37, 
                outNNFE);
            expect(totalFe3).toBeCloseTo(-2390);


            // NNFE doesn't change because we don't do anything pseudoknotty about it?                         last two we added?
            // expect(outNNFE).toEqual([-1,-20,54,290,53,-170,52,-180,51,180,50,-180,49,-210,48,-140,47,-200,17,-3320]);

            // This is the MFE structure, I think., with a longer PK with a bulge
            let totalFe4 = folder.scoreStructures(
                Sequence.fromSequenceString(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                SecStruct.fromParens("(((....))).......(((((((((...{{{{{{{)))))))))((((((((((.........))).))))))).}}.}}}}}....", true),
                true,
                37,
                outNNFE);
            expect(totalFe4).toBeCloseTo(-2830);

            // This is the true MFE structure maybe. It's at least coming up as native in EteRNA.
            let totalFe5 = folder.scoreStructures(
                Sequence.fromSequenceString(  "GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                SecStruct.fromParens("(((....))).......(((((((((...{{{{{..)))))))))((((((((((.........))).)))))))....}}}}}....", true),
                true,
                37,
                outNNFE);
            expect(totalFe5).toBeCloseTo(-2961); // -2960.0000381469727 in EteRNA, but good enough?

            let totalFe6 = folder.scoreStructures(
                //                               **
                Sequence.fromSequenceString(  "GUUUUUAGGCGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                SecStruct.fromParens("......(((((((.(((({{{{{{...)))))))))))}}}}}}.{{{{{{{.[[[[.[[.[[[....}}}}}}}]]].]]]]]]...", true),
                true,
                37,
                outNNFE);
            expect(totalFe6).toBeCloseTo(-2990); // notably NOT 19997409.375 -- caching issue

            // This is a mutation that appears to be giving a "wrong" score, as though the MFE 
            // is being found and then a bad score is returned for it.
            let totalFe7 = folder.scoreStructures(
                //                               **
                Sequence.fromSequenceString(  "GUUUUUAGGCGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                SecStruct.fromParens("......(((((((.(((({{{{{{...)))))))))))}}}}}}.(((((((.{{{{.{{........)))))))....}}}}}}...", true),
                true,
                37,
                outNNFE);
            expect(totalFe7).toBeCloseTo(19997409); // notably NOT 19997409.375

            // NNFE doesn't change because we don't do anything pseudoknotty about it?                         last two we added?
            // expect(outNNFE).toEqual([-1,-190,54,290,53,-170,52,-180,51,180,50,-180,49,-210,48,-140,47,-200,46,-210,45,-80,17,-3550,2,260,1,-90,0,-210]);
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});
*/

test(`NuPACK:PK_foldSequence`, () => {
    // The engines output different results


    // let expectedTotalFe = TOTAL_FE.get(folderType.NAME);

    expect.assertions(3);
    return expect(CreateFolder(NuPACK)
        .then((folder) => {
            if (folder === null) {
                expect(true).toBeTruthy();
                expect(true).toBeTruthy();
                return;
            }

            let pairs = folder.foldSequence(
                Sequence.fromSequenceString("GUUUUUAAACGGGUUUGCGGUGUAAGUGCAGCCCGUCUUACACCGUGCGGCACAGGCACUAGUACUGAUGUCGUAUACAGGGCUUUUG"),
                null, null, true, 37);

            expect(pairs).toBeDefined();
            expect(pairs!.getParenthesis(null, true))
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
            if (folder === null) {
                expect(true).toBeTruthy();
                expect(true).toBeTruthy();
                return;
            }

            let pairs = folder.foldSequence(
                Sequence.fromSequenceString("GGCGCGGCACCGUCCGCGGAACAAACGG"),
                null, null, true, 37);

            expect(pairs).toBeDefined();
            expect(pairs!.getParenthesis(null, true))
                .toEqual("..(((((..{{{{)))))......}}}}");
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});

// See https://github.com/eternagame/EternaJS/issues/654
/*
test(`NuPACK:PK_score1L2X`, () => {
    // The engines output different results


    // let expectedTotalFe = TOTAL_FE.get(folderType.NAME);

    expect.assertions(2);
    return expect(CreateFolder(NuPACK)
        .then((folder) => {
            if (folder === null) {
                expect(true).toBeTruthy();
                return;
            }

            let outNNFE: number[] = [];
            let score = folder.scoreStructures(
                Sequence.fromSequenceString("GGCGCGGCACCGUCCGCGGAACAAACGG"),
                SecStruct.fromParens("..(((((..{{{{)))))......}}}}", true),
                true, 37, outNNFE);

            expect(score).toEqual(-940);
        }))
        .resolves.toBeUndefined(); // (we're returning a promise)
});
*/
