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
    // expect.assertions(2);
    // const SEQ = 'AAAAACCCCAAAAAAAAAGGGGACCCCAAAAAAGGGGAAA';
    // const STRUCT = '.....((((.........)))).((((......))))...';
    const SEQ = 'GACAAAAGUC';
    const STRUCT = '(((....)))';

    // Vienna2 example
    // 6,20,0.003204861,6,21,0.050702623,6,22,0.994967823,6,37,0.014707212,
    // 7,20,0.050686163,7,21,0.997305727,7,22,0.049737799,7,36,0.014697534,
    // 8,19,0.048807822,8,20,0.997265654,8,21,0.049896478,8,35,0.014696120,
    // 9,19,0.981161504,9,20,0.048955465,9,34,0.014664345,
    // 19,24,0.007318126,19,26,0.006963470,19,27,0.007932088,
    // 20,25,0.006957857,20,26,0.007936614,20,27,0.007544318,
    // 21,25,0.006246202,21,26,0.007525488,
    // 24,36,0.036388827,24,37,0.996200675,
    // 25,35,0.036287239,25,36,0.998544617,25,37,0.035832064,
    // 26,34,0.035331676,26,35,0.998545990,26,36,0.035898986,
    // 27,34,0.982421238,27,35,0.035432802
 
    // crap eternafold
    // [7, 32, 0.00010864436626434326, 7, 33, 0.002284456044435501, 7, 34, 0.06806290149688721, 7, 35, 0.8076875805854797,
    // 8, 17, 0.0004900619387626648, 8, 18, 0.007207214832305908, 8, 34, 0.002339053899049759, 8, 35, 0.07060292363166809, 8, 36, 0.87010258436203, 8, 37, 0.026668071746826172,
    // 9, 19, 0.0004613623023033142, 9, 20, 0.007520020008087158, 9, 21, 0.0003748498857021332, 9, 36, 0.06891314685344696, 9, 37, 0.8725764751434326, 9, 38, 0.02868368849158287, 9, 39, 0.0008785612881183624, 10, 21, 0.00046030059456825256, 10, 22, 0.007505059242248535, 10, 23, 0.0003572702407836914, 10, 38, 0.8491100668907166, 10, 39, 0.027876298874616623, 11, 24, 0.007216960191726685, 11, 25, 0.0003654584288597107, 22, 26, 0.00020601600408554077, 22, 27, 0.0012299232184886932, 22, 28, 0.0015472285449504852, 22, 29, 0.004195462912321091, 23, 30, 0.0012008249759674072, 23, 31, 0.0014639906585216522, 23, 32, 0.004343818873167038, 23, 33, 0.00032024085521698, 24, 35, 0.003328174352645874, 24, 36, 0.00038011372089385986, 24, 37, 0.00005405023694038391, 29, 33, 0.0001226961612701416, 29, 34, 0.00258665531873703, 29, 35, 0.08943452686071396, 29, 36, 0.7845752835273743, 30, 39, 0.002653934061527252, 31, 32, 0.8449463248252869, 31, 33, 0.03477674722671509, 32, 37, 0.09133726358413696, 32, 38, 0.8469791412353516, 32, 39, 0.037470899522304535, 34, 38, 0.819756031036377, 34, 39, 0.03672247380018234]


    //[1, 9, 0.006296048, 1, 10, 0.82370913, 2, 9, 0.834843159, 3, 8, 0.834671676, 4, 9, 0.008077959, 5, 9, 0.00537841, 10, 1, 0.95, 9, 2, 0.95, 8, 3, 0.95]
    //[2, 10, 0.000989764928817749, 2, 11, 0.46370774507522583, 3, 10, 0.47023865580558777, 4, 9, 0.44359806180000305, 5, 10, 0.0004097260534763336, 6, 10, 0.00014490261673927307]]
    // no plus 1 -- very bad.
    //[3, 4, 0.46370774507522583, 4, 5, 0.47023865580558777, 5, 6, 0.44359806180000305, 6, 9, 0.0004097260534763336]
    const expectedResult: number[][] = [
        [1, 9, 0.000989764928817749, 1, 10, 0.46370774507522583, 2, 9, 0.47023865580558777, 3, 8, 0.44359806180000305, 4, 9, 0.0004097260534763336, 5, 9, 0.00014490261673927307]
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