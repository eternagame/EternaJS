import EPars from 'eterna/EPars';
import Folder from '../Folder';
import './jest-matcher-deep-close-to';
import ContraFold from '../Contrafold';

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

test(`ContraFold:many_score_structures`, () => {
    // expect.assertions: the async code should result in X assertions being called
    // https://facebook.github.io/jest/docs/en/expect.html#expectassertionsnumber

    return expect(CreateFolder(ContraFold)
        .then((folder) => {
            if (folder === null) return;
            
            const seqs: number[][] = [
                EPars.stringToSequence('ACGCUGUCUGUACUUGUAUCAGUACACUGACGAGUCCCUAAAGGACGAAACAGCGC'),
                EPars.stringToSequence('GGACAAUCAGCUAGAAUGCAAAGUGACGGGCGAUGAAGGCCAAUGAGGUGAUGUCCCAUG'),
                EPars.stringToSequence('CAUAUGUAUAUGCUCACCAUAGUUGACAGUGCCAGAACGAAGCUGACUAGCUCUGUCUGC'),
                EPars.stringToSequence('AUUCUGCUUAUAGGGUUAUUAGAUCAUAUCUCUGUUCGGCCGAGCGUCUGAUCUAGGCGA'),
                EPars.stringToSequence('UAAAGGUGAUACACUGCUCCCCAGGGGCGUCGCCUGACGAUAAUUGCAUCCGUAGGCGAA'),
                EPars.stringToSequence('GUGAACUUAGAGGGAAGUAUUCCGCGACCGACAUUUUGUCGCGACGGAGGAUUCCUUUAU'),
                EPars.stringToSequence('UGGCGGUCAAGUUGGGACGAUCUUUAUAACACAGCAGAAUAAACGCCUAACAUUUAUAGG'),
                EPars.stringToSequence('UACGCGGCGCCGGGUAGUACGGCACUGCGGCAAGAUCUACCUCUUGAUCAGCAGAUUAAU'),
                EPars.stringToSequence('AGAGACCCAGUAGGGGAUUCUCUGGGGCAAACGGGGCUCAUUUAGCGUCCUCUAGCUCCA'),
                EPars.stringToSequence('AUAUUUUAAAGGGCCAAUCUAUUACAUUCGGCACUUCUUCUCACGACAAUAGACAUGUCA'),
                EPars.stringToSequence('CGGCACGGCCUGCUCUACUAGUUAUUGGUAAAUCUGAAAAUAAGGCCGACAGAACUACAC'),
            ];
    
            const strs: string[] = [
                '.((((((.((((((......)))))).......((((.....))))...)))))).',
                '............................(((.......)))...................',
                '.....................((.(((((.((.((...........)).)).))))).))',
                '...................(((((((...(((.........)))....))))))).....',
                '...............(((((...))))).(((((((..(((......)))..))))))).',
                '.........(((((((...(((((((((.........))))))..)))...)))))))..',
                '............................................................',
                '..(((((.((((.......)))).)))))...............................',
                '((((((((....)))...)))))(((((....(((((.........)))))...))))).',
                '............................................................',
                '.....((((((...............................))))))............',
            ];
            
            const scores: number[] = [
                -426,
                  38,
                -251,
                -134,
                -323,
                -412,
                  58,
                -706,
                -568,
                  58,
                -264,
            ];
            
            const NNFEs: number[][] = [
                [13, 598, 12, -130, 11, -197, 10, -98, 9, -103, 8, -203, 36, 548, 35, -239, 34, -209, 33, -103,
                    6, 626, 5, -103, 4, -203, 3, -130, 2, -204, 1, -202, -1, -74],
                [30, 543, 29, -204, 28, -239, -1, -62],
                [34, 686, 33, -225, 31, 212, 30, -204, 28, 31, 27, -225, 26, -108, 25,
                    -197, 24, -115, 22, 49, 21, -47, -1, -108],
                [31, 603, 30, -209, 29, -130, 25, 376, 24, -108, 23, -209, 22, -84, 21, -115, 20, -225, 19, -98, -1, 65],
                [19, 682, 18, -239, 17, -176, 16, -47, 15, -204, 40, 653, 39, -84, 38, -115, 35, 201, 34, 12, 33, -130,
                    32, -239, 31, -204, 30, -202, 29, -209, -1, -22],
                [27, 645, 26, -197, 25, -115, 24, -202, 23, -204, 22, -202, 21, 329, 20, -176, 19, 5, 15, 328, 14, -74,
                    13, -115, 12, -239, 11, -202, 10, 11, 9, -55, -1, 52],
                [-1, 58],
                [11, 481, 10, -202, 9, -239, 8, -204, 6, 100, 5, -202, 4, 19, 3, -204, 2, -202, -1, -53],
                [7, 492, 6, -239, 5, -239, 4, 420, 3, -115, 2, -225, 1, -115, 0, -225, 36, 603, 35, -203, 34, -20, 33,
                    -239, 32, -202, 27, 453, 26, -204, 25, -202, 24, -20, 23, -239, -1, -49],
                [-1, 58],
                [10, 787, 9, -130, 8, -239, 7, -204, 6, -239, 5, -202, -1, -37]
            ];

            for (let ii = 0; ii < seqs.length; ++ii ) {
                let seq = seqs[ii];
                let str = strs[ii];
                let scr = scores[ii];
                let NNFE = NNFEs[ii];

                let struct = folder.foldSequence(
                    seq,
                    null);
                expect(struct).toBeDefined();
                expect(EPars.pairsToParenthesis(struct!)).toEqual(str);

                let outNNFE: number[] = [];
                let score = folder.scoreStructures(
                    seq,
                    struct!,
                    false,
                    37,
                    outNNFE);
                expect(score).toBeDeepCloseTo(scr, 0);
                expect(outNNFE).toEqual(NNFE);

                // internal consistency: FE should equal summed outNNFEs
                // This is not necessarily the case due to ROUNDING ERROR
                // but can be used to find BIG issues.
                let NNFEsum = 0;
                for (let jj: number = 1; jj < outNNFE.length; jj += 2) {
                    NNFEsum += outNNFE[jj];
                }
                console.log(score);
                console.log(NNFEsum);
                expect(score).toBeDeepCloseTo(NNFEsum, 0);
            }
        })
        // Shoot -- we actually can't do this. This is clever but it is too
        // generic: it will also catch any unit test failures!
        //
        // .catch(err => {
        //     // folder not present
        //     return undefined;
        // })
        ).resolves.toBeUndefined();
});
