import EPars from 'eterna/EPars';
import Folder from '../Folder';
import './jest-matcher-deep-close-to';
import EternaFold from '../Eternafold';
import Vienna2 from '../Vienna2';

function FoldSequence(folder: Folder, seq: string, struct: string): any[] | null {
    return folder.foldSequence(EPars.stringToSequence(seq), null, struct);
}

function CreateFolder(type: any): Promise<Folder | null> {
    return type.create();
}

// Cfold_dG Efold_dG Cfold_struct Efold_struct
// 6.84126  13.6834 .(((((((((((((......))))))..)....((((.....))))...)))))). .(((((((((((((......))))))..)....((((.....))))...)))))).
// 3.35437  8.90618 (((((.(((.(.................(((.......))).....).)))))))).... ((((.((((.((................(((.......)))....)).))))))))....
// 5.43142  10.7529 .....................((.(((((.((.((...........)).)).))))).)) .........(((.....))).((.(((((.((.((...........)).)).))))).))
// 5.33369  10.5007 ...(........).....((((((((.(.(((.(.....).)))..).)))))))).... ..((........))....((((((((.(((((.(.....).))).)).))))))))....
// 7.16413  13.9372 ..............((((((...))))))(((((((.((((......))).)))))))). .....((.....)).(((((...))))).((((((.(((((......))).)))))))).
// 8.35295  14.9653 .......(.(((((((...(((((((((....(...)))))...)))))..)))))))). .......((.((((((...(((((((..(((((...))))))).)))))..)))))))).
// 2.39232  7.01528 ..(((......................................)))(((.......))). .((((.....((((.................))))........))))((.......))..
// 9.42705  15.8632 ..(((((.((((.......)))).))))).(((((......)))))(((....))).... ..(((((.((((.......)))).)))))((..((((........)))).))........
// 9.67115  18.4347 .(((((((....)))...))))((((((....(((((.(.....).)))))...)))))) .(((((((....)))...))))((((((....(((((.(.....).)))))...))))))
// 1.87342  7.00216 ........(((.(((.((.......))..))).)))........((((.......)))). ........(((.((((((.......))).))).)))........((((.......)))).

test(`EternaFold:many_score_structures`, () => {
    // expect.assertions: the async code should result in X assertions being called
    // https://facebook.github.io/jest/docs/en/expect.html#expectassertionsnumber

    return expect(CreateFolder(EternaFold)
        .then((folder) => {
            if (folder === null) return;

            let expectedFE: number[] = [
                -837,
                -46, //-45,
                -566,
                -1326, //-1325,
                -1064, //
                -2025, // ~ 6 off
                -2255, // ~ 9 off
            ];
            let expectedNNFE: number[][] = [
                [4, 330, 3, -315, 2, -315, 1, -315, 0, -315, -1, 93],
                [2, 491, 1, -315, 0, -315, -1, 93],
                [4, 330, 3, -315, 2, -289, 1, -97, 0, -315, -1, 121],
                [7, 368, 6, -315, 5, 103, 4, -315, 3, -315, 2, -315, 1, -315, 0, -315, -1, 93],
                [13, 261, 12, -100, 11, -259, 10, -107, 9, -100, 8, -256, 36, 205, 35, -315, 34, -280, 33, -100, 6, 786,
                    5, -100, 4, -256, 3, -100, 2, -239, 1, -251, -1, 147],
                [12, 270, 11, -280, 10, -100, 9, -239, 30, 199, 29, -239, 28, -251, 27, -280, 26, -100, 52, 211, 51,
                    -315, 50, -315, 49, -289, 48, -97, 6, 737, 5, -256, 4, -81, 3, -121, 2, -275, 1, -23, 0, -315, -1, 134],
                [14, 269, 13, -315, 12, -239, 11, -289, 9, 698, 8, -315, 7, -315, 6, -289, 51, 209, 50, -315, 49, -259,
                    48, -50, 47, -107, 98, 235, 97, -280, 96, -98, 95, 48, 92, 185, 91, -39, 90, -48, 89, -259, 85, 458,
                    84, -107, 83, -50, 82, -100, 81, -289, 80, -107, 79, -100, 78, -289, 77, -50, 76, -50, 75, -121, 74,
                    -275, 73, 25, 71, 259, 70, -251, 68, 118, 67, -97, 66, -315, 5, 1051, 4, -100, 3, -259, 2, -107, 1,
                    -100, -1, 174]
            ];
            let structures: string[] = [
                "(((((........)))))",
                "(((...)))",
                "(((((........)))))",
                "((((((((...........)).))))))",
                ".((((((.((((((......)))))).......((((.....))))...)))))).",
                "(((((((..((((........)))).(((((.......))))).....(((((.......)))))))))))).",
                ".(((((((((.((((....))))..................))))..(((((......)))))...(((.((.(((((((((((((...((((..((((.....))))...)))).))))))))))))))).)))..))))).."
            ];
            let sequences: string[] = [
                "GGGGGAAAAAAAACCCCC",
                "GGGAAACCC",
                "CCAGGAAAAAAAACCUGG",
                "GGGGGGGGAAAACGGAAAGCCACCCCCC",
                "ACGCUGUCUGUACUUGUAUCAGUACACUGACGAGUCCCUAAAGGACGAAACAGCGC",
                "GGGGAUGUAGCUCAUAUGGUAGAGCGCUCGCUUUGCAUGCGAGAGGCACAGGGUUCGAUUCCCUGCAUCUCCA",
                "CCUACUAGGGGAGCCAAAAGGCUGAGAUGAAUGUAUUCAGACCCUUAUAACCUGAUUUGGUUAAUACCAACGUAGGAAAGUAGUUAUUAACUAUUCGUCAUUGAGAUGUCUUGGUCUAACUACUUUCUUCGCUGGGAAGUAGUU",
            ];
    
            for (let ii: number = 0; ii < sequences.length; ++ii ) {
                let struct = folder.foldSequence(EPars.stringToSequence(sequences[ii]), []);
                expect(struct).toBeDefined();
                expect(EPars.pairsToParenthesis(struct!)).toEqual(structures[ii])
    
                let outNNFE: number[] = [];
                let FE = folder.scoreStructures(
                    EPars.stringToSequence(sequences[ii]),
                    EPars.parenthesisToPairs(structures[ii]),
                    false,
                    37,
                    outNNFE);
                
                expect(FE).toBeDeepCloseTo(expectedFE[ii], 0);
                expect(outNNFE).toEqual(expectedNNFE[ii]);
    
    
                // internal consistency: FE should equal summed outNNFEs
                let NNFEsum = 0;
                for (let jj: number = 1; jj < outNNFE.length; jj += 2) {
                    NNFEsum += outNNFE[jj];
                }
                // console.log(FE);
                // console.log(NNFEsum);
                expect(FE).toBeDeepCloseTo(NNFEsum, 0);
            }

            // const seqs: number[][] = [
            //     EPars.stringToSequence('ACGCUGUCUGUACUUGUAUCAGUACACUGACGAGUCCCUAAAGGACGAAACAGCGC'),
            //     EPars.stringToSequence('GGACAAUCAGCUAGAAUGCAAAGUGACGGGCGAUGAAGGCCAAUGAGGUGAUGUCCCAUG'),
            //     // EPars.stringToSequence('CAUAUGUAUAUGCUCACCAUAGUUGACAGUGCCAGAACGAAGCUGACUAGCUCUGUCUGC'),
            //     // EPars.stringToSequence('AUUCUGCUUAUAGGGUUAUUAGAUCAUAUCUCUGUUCGGCCGAGCGUCUGAUCUAGGCGA'),
            //     // EPars.stringToSequence('UAAAGGUGAUACACUGCUCCCCAGGGGCGUCGCCUGACGAUAAUUGCAUCCGUAGGCGAA'),
            //     // EPars.stringToSequence('GUGAACUUAGAGGGAAGUAUUCCGCGACCGACAUUUUGUCGCGACGGAGGAUUCCUUUAU'),
            //     // EPars.stringToSequence('UGGCGGUCAAGUUGGGACGAUCUUUAUAACACAGCAGAAUAAACGCCUAACAUUUAUAGG'),
            //     // EPars.stringToSequence('UACGCGGCGCCGGGUAGUACGGCACUGCGGCAAGAUCUACCUCUUGAUCAGCAGAUUAAU'),
            //     // EPars.stringToSequence('AGAGACCCAGUAGGGGAUUCUCUGGGGCAAACGGGGCUCAUUUAGCGUCCUCUAGCUCCA'),
            //     // EPars.stringToSequence('AUAUUUUAAAGGGCCAAUCUAUUACAUUCGGCACUUCUUCUCACGACAAUAGACAUGUCA'),
            //     // EPars.stringToSequence('CGGCACGGCCUGCUCUACUAGUUAUUGGUAAAUCUGAAAAUAAGGCCGACAGAACUACAC'),
            // ];
    
            // const strs: string[] = [
            //     '.((((((.((((((......)))))).......((((.....))))...)))))).', // hannah says .(((((((((((((......))))))..)....((((.....))))...)))))).
            //     '((((.((((.((................(((.......)))....)).))))))))....',
            //     // '........................(((((.((.................)).)))))...',
            //     // '....................(((((........(((((())))))....)))))......',
            //     // '................((((...))))..((((((...((........))...)))))).',
            //     // '...........((((.....((((....((((.....))))...))))....))))....',
            //     // '.((..........................................)).............',
            //     // '..(((((.((((.......)))).)))))...............................',
            //     // '.(((((((....)))...)))).(((((....(((((.........)))))...))))).',
            //     // '..........(.(((..............))).)..........................',
            //     // '.....((((((...............................))))))............',
            // ];
            
            // const scores: number[] = [
            //     -1068, // hannah says -1368, but that's for another structure
            //     // -238.68,
            //     // -575.70,
            //     // -479.47,
            //     // -580.39,
            //     // -847.24,
            //     // 245.57,
            //     // -1296.44,
            //     // -1352.82,
            //     // -177.13,
            //     // -711.52,
            // ];

            // const NNFEs: number[][] = [
                
            // ];

            // for (let ii = 0; ii < seqs.length; ++ii ) {
            //     console.error(ii);
            //     let seq = seqs[ii];
            //     let str = strs[ii];
            //     let scr = scores[ii];
            //     let NNFE = NNFEs[ii];

            //     let struct = folder.foldSequence(
            //         seq,
            //         null);
            //     expect(EPars.pairsToParenthesis(struct)).toEqual(str);

            //     let outNNFE: number[];
            //     let score = folder.scoreStructures(
            //         seq,
            //         struct,
            //         false,
            //         37,
            //         outNNFE);
            //     expect(score).toBeDeepCloseTo(scr, 0);
            //     expect(outNNFE).toEqual(NNFE);
            // }
        })
        // .catch(err => {
        //     // folder not present
        //     return undefined;
        // }
        ).resolves.toBeUndefined();
});

test(`EternaFold:get_dot_plot`, () => {
    const SEQ = 'GACAAAAGUC';
    const STRUCT = '(((....)))';

    const expectedResult: number[][] = [
        [1, 9, 0.00098976, 1, 10, 0.46370775, 2, 9, 0.47023866, 3, 8, 0.44359806, 4, 9, 0.00040973, 5, 9, 0.00014490]
    ];
 
    expect(CreateFolder(EternaFold)
        .then((folder) => {
            if (folder === null) {
                expect(true).toBeTruthy();
                return;
            }
            
            expect(folder.getDotPlot(
                EPars.stringToSequence(SEQ),
                EPars.parenthesisToPairs(STRUCT),
                37
            )).toBeDeepCloseTo(expectedResult[0], 5);
        }))
        .resolves.toBeUndefined();
});