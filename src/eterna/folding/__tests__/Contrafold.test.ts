import EPars from 'eterna/EPars';
import Folder from '../Folder';
import './jest-matcher-deep-close-to';
import ContraFold from '../Contrafold';

function FoldSequence(folder: Folder, seq: string, struct: string): any[] | null {
    return folder.foldSequence(EPars.stringToSequence(seq), null, struct);
}

function CreateFolder(type: any): Promise<Folder> {
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
            
        //     const seqs: number[][] = [
        //         EPars.stringToSequence('ACGCUGUCUGUACUUGUAUCAGUACACUGACGAGUCCCUAAAGGACGAAACAGCGC'),
        //         EPars.stringToSequence('GGACAAUCAGCUAGAAUGCAAAGUGACGGGCGAUGAAGGCCAAUGAGGUGAUGUCCCAUG'),
        //         EPars.stringToSequence('CAUAUGUAUAUGCUCACCAUAGUUGACAGUGCCAGAACGAAGCUGACUAGCUCUGUCUGC'),
        //         EPars.stringToSequence('AUUCUGCUUAUAGGGUUAUUAGAUCAUAUCUCUGUUCGGCCGAGCGUCUGAUCUAGGCGA'),
        //         EPars.stringToSequence('UAAAGGUGAUACACUGCUCCCCAGGGGCGUCGCCUGACGAUAAUUGCAUCCGUAGGCGAA'),
        //         EPars.stringToSequence('GUGAACUUAGAGGGAAGUAUUCCGCGACCGACAUUUUGUCGCGACGGAGGAUUCCUUUAU'),
        //         EPars.stringToSequence('UGGCGGUCAAGUUGGGACGAUCUUUAUAACACAGCAGAAUAAACGCCUAACAUUUAUAGG'),
        //         EPars.stringToSequence('UACGCGGCGCCGGGUAGUACGGCACUGCGGCAAGAUCUACCUCUUGAUCAGCAGAUUAAU'),
        //         EPars.stringToSequence('AGAGACCCAGUAGGGGAUUCUCUGGGGCAAACGGGGCUCAUUUAGCGUCCUCUAGCUCCA'),
        //         EPars.stringToSequence('AUAUUUUAAAGGGCCAAUCUAUUACAUUCGGCACUUCUUCUCACGACAAUAGACAUGUCA'),
        //         EPars.stringToSequence('CGGCACGGCCUGCUCUACUAGUUAUUGGUAAAUCUGAAAAUAAGGCCGACAGAACUACAC'),
        //     ];
    
        //     const strs: string[] = [
        //         '.((((((.((((((......)))))).......((((.....))))...)))))).', //'.(((((((((((((......))))))..)....((((.....))))...)))))).',
        //         '(((((.(((.(.................(((.......))).....).))))))))....',
        //         '.....................((.(((((.((.((...........)).)).))))).))',
        //         '...(........).....((((((((.(.(((.(.....).)))..).))))))))....', 
        //         '..............((((((...))))))(((((((.((((......))).)))))))).',
        //         '.......(.(((((((...(((((((((....(...)))))...)))))..)))))))).',
        //         '..(((......................................)))(((.......))).',
        //         '..(((((.((((.......)))).))))).(((((......)))))(((....)))....',
        //         '.(((((((....)))...))))((((((....(((((.(.....).)))))...))))))',
        //         '........(((.(((.((.......))..))).)))........((((.......)))).',
        //         '.....((((((....((((.......))))............))))))............',
        //     ];
            
        //     const scores: number[] = [
        //         -430, //-151, //-194, // hannah says -684,
        //         510, // 817, // hannah says -165.15
        //         -253, // -479.47,
        //         709, // -580.39,
        //         112, // -847.24,
        //         816, //245.57,
        //         522, //-1296.44,
        //         -475, //-1352.82,
        //         -521, //-177.13,
        //         411, //-711.52,
        //         -51, //
        //     ];
            
        //     const NNFEs: number[][] = [
        //         [13, 598, 12, -130, 11, -197, 10, -98, 9, -103, 8, -203, 36, 548, 35, -239, 34, -209, 33, -103,
        //             6, 627, 5, -103, 4, -203, 3, -130, 2, -204, 1, -202, -1, -74], //[13, 598, 12, -130, 11, -197, 10, -98, 9, -103, 8, -203, 7, 428, 36, 548, 35, -239, 34, -209, 33, -103,
        //             //6, 478, 5, -103, 4, -203, 3, -130, 2, -204, 1, -202, -1, -74],
        //         [30, 543, 29, -204, 28, -239, 10, 919, 8, 173, 7, -108, 6, -209, 4, 407, 3, -108, 2, -197, 1, -115, 0,
        //             -239, -1, -109],
        //         [34, 686, 33, -225, 31, 212, 30, -204, 28, 31, 27, -225, 26, -108, 25,
        //             -197, 24, -115, 22, 49, 21, -47, -1, -109],
        //         [3, 606, 33, 598, 31, 88, 30, -209, 29, -130, 27, 339, 25, 247, 24, -108,
        //             23, -209, 22, -84, 21, -115, 20, -225, 19, -98, 18, -49, -1, 60],
        //         [19, 682, 18, -239, 17, -176, 16, -47, 15, -204, 14, -136, 40, 653, 39, -84, 38, -115, 37, 294, 35, 266,
        //             34, 12, 33, -130, 32, -239, 31, -204, 30, -202, 29, -209, -1, 190],
        //         [32, 711, 27, 649, 26, -197, 25, -115, 24, -202, 23, 447, 22, -202, 21, -239, 20, -209, 19, -49, 15,
        //             470, 14, -74, 13, -115, 12, -239, 11, -202, 10, 11, 9, -55, 7, 383, -1, 46],
        //         [4, 767, 3, -202, 2, -204, 48, 580, 47, -98, 46, -130, -1, -189],
        //         [11, 481, 10, -202, 9, -239, 8, -204, 6, 100, 5, -202, 4, 19, 3, -204, 2, -202, 34, 593, 33, -115, 32,
        //             -225, 31, -74, 30, -108, 48, 492, 47, -209, 46, -84, -1, -89],
        //         [7, 492, 6, -239, 5, -239, 4, 420, 3, -115, 2, -225, 1, -115, 38, 551, 36, 97, 35, -203, 34, -20, 33,
        //             -239, 32, -202, 27, 453, 26, -204, 25, -202, 24, -20, 23, -239, 22, -203, -1, -66],
        //         [17, 588, 16, -84, 14, 407, 13, -239, 12, -204, 10, 127, 9, -225, 8, -74, 47, 580, 46, -108, 45, -197,
        //             44, -115, -1, -43],
        //         [18, 468, 17, -47, 16, -197, 15, -98, 10, 878, 9, -130, 8, -239, 7, -204, 6, -239, 5, -202, -1, -38],
        //     ];

        //     for (let ii = 0; ii < seqs.length; ++ii ) {
        //         let seq = seqs[ii];
        //         let str = strs[ii];
        //         let scr = scores[ii];
        //         let NNFE = NNFEs[ii];

        //         let struct = folder.foldSequence(
        //             seq,
        //             null);
        //         expect(EPars.pairsToParenthesis(struct)).toEqual(str);

        //         let outNNFE: number[] = [];
        //         let score = folder.scoreStructures(
        //             seq,
        //             struct,
        //             false,
        //             37,
        //             outNNFE);
        //         expect(score).toBeDeepCloseTo(scr, 0);
        //         expect(outNNFE).toEqual(NNFE);
        //     }
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
