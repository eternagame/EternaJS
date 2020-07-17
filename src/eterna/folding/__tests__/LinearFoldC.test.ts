import EPars from 'eterna/EPars';
import Folder from '../Folder';
import LinearFoldC from '../LinearFoldC';
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