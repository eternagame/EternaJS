import EPars from 'eterna/EPars';
import Folder from '../Folder';
import LinearFoldC from '../LinearFoldC';
import LinearFoldE from '../LinearFoldE'; // debugging matching dot plots?
import './jest-matcher-deep-close-to';

function FoldSequence(folder: Folder, seq: string, struct: string): any[] | null {
    return folder.foldSequence(EPars.stringToSequence(seq), null, struct);
}

function CreateFolder(type: any): Promise<Folder | null> {
    return type.create();
}

test('linearfoldC:MFETests', () => {
    return expect(CreateFolder(LinearFoldC).then((folder) => {
        if (folder === null) return;

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
            [13, 598, 12, -130, 11, -197, 10, -98, 9, -103, 8, -203, 36, 548, 35, -239, 34, -209, 33, -103, 6, 627, 5,
                -103, 4, -203, 3, -130, 2, -204, 1, -202, -1, -74],
            [12,  573, 11, -209, 10, -130,  9, -204, 30,  534, 29, -204, 28, -202, 27, -209, 26, -130, 52,  479, 51,
                -239, 50, -239, 49, -225, 48, -108,  6, 478,  5, -203, 4,  -84,  3, -115,  2, -202,  1,  -20,0, -239, 
                -1, -114],
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
        if (folder === null) return;
        
        let expectedFE: number[] = [
            192,
            9,
            -2092,
            -1889,
            -2015,
        ];
        let expectedNNFE: number[][] = [
            [1, 539, 0, -239, -1, -108],
            [-1, 9],
            [11, 608, 10, -204, 9, -239, 25, 492, 24, -239, 23, -239, 22, -239, 21, -239, 20, -204, 43, 685, 42, -204,
                41, -239, 40, -202, 39, -239, 38, -204, 6,  254,  5, -204, 4, -239, 3, -202, 2, -204, 1, -239, 0, -239,
                -1, -108],
            [11, 608, 10, -204, 9, -225, 25, 492, 24, -239, 23, -239, 22, -239, 21, -239, 20, -204, 43, 685, 42, -204,
                41, -239, 40, -202, 39, -239, 38, -204, 6,  443,  5, -204, 4, -239, 3, -202, 2, -204, 1, -239, 0, -239,
                -1, -108],
            [11, 685, 10, -204, 9, -239, 25, 492, 24, -239, 23, -239, 22, -239, 21, -239, 20, -204, 43, 685, 42, -204,
                41, -239, 40, -202, 39, -239, 38, -204, 6,  254,  5, -204, 4, -239, 3, -202, 2, -204, 1, -239, 0, -239,
                -1, -108]
        ];
        let structures: number[][] = [
            EPars.parenthesisToPairs("((......))"),
            EPars.parenthesisToPairs(".........."),
            EPars.parenthesisToPairs("(((((((..(((...)))..((((((....))))))..((((((...))))))..)))))))"),
            EPars.parenthesisToPairs("(((((((..(((...)))..((((((....))))))..((((((...))))))..)))))))"),
            EPars.parenthesisToPairs("(((((((..(((...)))..((((((....))))))..((((((...))))))..)))))))"),
            
        ];
        let sequences: number[][] = [
            EPars.stringToSequence(  "GGGGAAAACC"),
            EPars.stringToSequence(  "GGGGAAAACC"),
            EPars.stringToSequence(  "GGGCGGCAAGGCGAAGCCAAGCCCCCAAAAGGGGGCAAGCCGGCAAAGCCGGCAAGCCGCCC"),
            EPars.stringToSequence(  "GGGCGGCAAAGCGAAGCUAAGCCCCCAAAAGGGGGCAAGCCGGCAAAGCCGGCAAGCCGCCC"),
            EPars.stringToSequence(  "GGGCGGCAAGGCAAAGCCAAGCCCCCAAAAGGGGGCAAGCCGGCAAAGCCGGCAAGCCGCCC"),
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

            // internal consistency: FE should equal summed outNNFEs
            // This is not necessarily the case due to ROUNDING ERROR
            // but can be used to find BIG issues.
            // let NNFEsum = 0;
            // for (let jj: number = 1; jj < outNNFE.length; jj += 2) {
            //     NNFEsum += outNNFE[jj];
            // }
            // console.log(FE);
            // console.log(NNFEsum);
            // expect(FE).toBeDeepCloseTo(NNFEsum, 0);

        }
    })).resolves.toBeUndefined();
    // toEqual([
    //     EPars.parenthesisToPairs("(((((........)))))")
    // ]);
});

test(`LinearFoldC:get_dot_plot(complex)`, () => {
    expect.assertions(2);
    const SEQ = 'AAAAACCCCAAAAAAAAAGGGGACCCCAAAAAAGGGGAAA';
    const STRUCT = '.....((((.........)))).((((......))))...';

    const expectedResults: number[][] = [
        [6, 19, 0.0001927018165588379, 6, 20, 0.005589544773101807,
            6, 21, 0.06411212682723999, 6, 22, 0.688054084777832,
            6, 35, 0.00015222281217575073, 6, 36, 0.0016865693032741547,
            6, 37, 0.017163366079330444, 7, 19, 0.005924403667449951,
            7, 20, 0.06936651468276978, 7, 21, 0.7702905535697937,
            7, 22, 0.022137045860290527, 7, 34, 0.00014823302626609802,
            7, 35, 0.0017479099333286285, 7, 36, 0.018705815076828003,
            7, 37, 0.001071687787771225, 8, 19, 0.06819826364517212,
            8, 20, 0.7767842411994934, 8, 21, 0.02456575632095337,
            8, 22, 0.0019697099924087524, 8, 34, 0.0016399361193180084,
            8, 35, 0.018716901540756226, 8, 36, 0.0011317357420921326,
            8, 37, 0.0001540929079055786, 9, 19, 0.7435870170593262,
            9, 20, 0.023385703563690186, 9, 21, 0.0020838044583797455,
            9, 22, 0.00008499994874000549, 9, 34, 0.017640382051467896,
            9, 35, 0.0009768977761268616, 9, 36, 0.00014451146125793457,
            19, 24, 0.002365570515394211, 19, 25, 0.004539370536804199,
            19, 26, 0.004722565412521362, 19, 27, 0.0062722861766815186,
            20, 24, 0.0045351386070251465, 20, 25, 0.0047980546951293945,
            20, 26, 0.006379425525665283, 20, 27, 0.0010544955730438232,
            21, 25, 0.004812151193618774, 21, 26, 0.001148570328950882,
            21, 27, 0.0002776980400085449, 22, 26, 0.0002814754843711853,
            22, 27, 0.0002533569931983948, 24, 34, 0.0004156045615673065,
            24, 35, 0.006127089262008667, 24, 36, 0.13685446977615356,
            24, 37, 0.6187341213226318, 25, 34, 0.006383448839187622,
            25, 35, 0.14861714839935303, 25, 36, 0.6923220157623291,
            25, 37, 0.046909987926483154, 26, 34, 0.1462939977645874,
            26, 35, 0.6967782974243164, 26, 36, 0.05236208438873291,
            26, 37, 0.0021603070199489594, 27, 34, 0.6606990694999695,
            27, 35, 0.05001801252365112, 27, 36, 0.002211257815361023,
            27, 37, 0.00016619637608528137]];

    return expect(CreateFolder(LinearFoldC)
        .then((folder) => {
            if (folder === null) {
                expect(true).toBeTruthy();
                return;
            }
            
            expect(folder.getDotPlot(
                EPars.stringToSequence(SEQ),
                EPars.parenthesisToPairs(STRUCT),
                37
            )).toBeDeepCloseTo(expectedResults[0], 5);
        }))
        .resolves.toBeUndefined();
});

test(`LinearFoldE:get_dot_plot(complex)`, () => {
    expect.assertions(2);
    const SEQ = 'AAAAACCCCAAAAAAAAAGGGGACCCCAAAAAAGGGGAAA';
    const STRUCT = '.....((((.........)))).((((......))))...';

    const expectedResults: number[][] = [
        [6, 19, 0.00010864436626434326, 6, 20, 0.0022844895720481873,
            6, 21, 0.06806319952011108, 6, 22, 0.8076976537704468,
            6, 36, 0.0004901140928268433, 6, 37, 0.007207900285720825,
            7, 19, 0.002313949167728424, 7, 20, 0.0706377625465393,
            7, 21, 0.8700963854789734, 7, 22, 0.026654541492462158,
            7, 35, 0.0004878006875514984, 7, 36, 0.0075502097606658936,
            7, 37, 0.00037490203976631165, 8, 19, 0.06898313760757446,
            8, 20, 0.8727161884307861, 8, 21, 0.028683066368103027,
            8, 22, 0.0008869878947734833, 8, 34, 0.0004644244909286499,
            8, 35, 0.0075446367263793945, 8, 36, 0.00039262697100639343,
            9, 19, 0.8492370247840881, 9, 20, 0.027912259101867676,
            9, 21, 0.0009294226765632629, 9, 34, 0.0072329044342041016,
            9, 35, 0.00037156417965888977, 19, 24, 0.00023651868104934692,
            19, 25, 0.0013454481959342957, 19, 26, 0.0015603899955749512,
            19, 27, 0.004240363836288452, 20, 24, 0.0012600161135196686,
            20, 25, 0.001520048826932907, 20, 26, 0.004353940486907959,
            20, 27, 0.00040626898407936096, 21, 25, 0.003340393304824829,
            21, 26, 0.00040648505091667175, 21, 27, 0.00010367482900619507,
            22, 26, 0.000059138983488082886, 24, 34, 0.0001268722116947174,
            24, 35, 0.002602856606245041, 24, 36, 0.08941715955734253,
            24, 37, 0.7845816612243652, 25, 34, 0.0026294738054275513,
            25, 35, 0.09307640790939331, 25, 36, 0.8449437022209167,
            25, 37, 0.03477710485458374, 26, 34, 0.09141772985458374,
            26, 35, 0.8471155166625977, 26, 36, 0.037525951862335205,
            26, 37, 0.0010270774364471436, 27, 34, 0.8198640942573547,
            27, 35, 0.036784470081329346, 27, 36, 0.0010711252689361572]];

    return expect(CreateFolder(LinearFoldE)
        .then((folder) => {
            if (folder === null) {
                expect(true).toBeTruthy();
                return;
            }
            
            expect(folder.getDotPlot(
                EPars.stringToSequence(SEQ),
                EPars.parenthesisToPairs(STRUCT),
                37
            )).toBeDeepCloseTo(expectedResults[0], 5);
        }))
        .resolves.toBeUndefined();
});