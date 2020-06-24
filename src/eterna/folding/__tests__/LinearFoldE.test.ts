import EPars from 'eterna/EPars';
import Folder from '../Folder';
import LinearFoldE from '../LinearFoldE';
import './jest-matcher-deep-close-to';

function FoldSequence(folder: Folder, seq: string, struct: string): any[] | null {
    return folder.foldSequence(EPars.stringToSequence(seq), null, struct);
}

function CreateFolder(type: any): Promise<Folder | null> {
	return type.create();
}

test('linearfoldE:MFETests', () => {
    return expect(CreateFolder(LinearFoldE).then((folder) => {
		if (folder === null) {
			return;
		}
        let expectedFE: number[] = [
            -837,
            -45,
            -566,
            -1325,
            -1068, // ~ 4 off the NNFE sum
            -2029, // ~ 6 off
            -2262, // ~ 9 off
        ];
        let expectedNNFE: number[][] = [
            [4, 330, 3, -315, 2, -315, 1, -315, 0, -315, -1, 93],
            [2, 491, 1, -315, 0, -315, -1, 93],
            [4, 330, 3, -315, 2, -289, 1, -97, 0, -315, -1, 121],
            [7, 368, 6, -315, 5, 103, 4, -315, 3, -315, 2, -315, 1, -315, 0, -315, -1, 93],
            [13, 261, 12, -100, 11, -259, 10, -107, 9, -100, 8, -256, 36, 205, 35, -315, 34, -280, 33, -100, 6, 786, 5, 
                -100, 4, -256, 3, -100, 2, -239, 1, -251, -1, 147],
            [12, 270, 11, -280, 10, -100, 9, -239, 30, 199, 29, -239, 28, -251, 27, -280, 26, -100, 52, 211, 51, -315, 
                50, -315, 49, -289, 48, -97, 6, 739, 5, -256, 4, -81, 3, -121, 2, -275, 1, -23, 0, -315, -1, 134],
            [14, 269, 13, -315, 12, -239, 11, -289, 9, 698, 8, -315, 7, -315, 6, -289, 51, 209, 50, -315, 49, -259, 48,
                -50, 47, -107, 98, 235, 97, -280, 96, -98, 95, 48, 92, 185, 91, -39, 90, -48, 89, -259, 85, 458, 84,
                -107, 83, -50, 82, -100, 81, -289, 80, -107, 79, -100, 78, -289, 77, -50, 76, -50, 75, -121, 74, -275,
                73, 25, 71, 259, 70, -251, 68, 118, 67, -97, 66, -315, 5, 1052, 4, -100, 3, -259, 2, -107, 1, -100, 
                -1, 175]
        ];
        let structures: number[][] = [
            EPars.parenthesisToPairs("(((((........)))))"),
            EPars.parenthesisToPairs("(((...)))"),
            EPars.parenthesisToPairs("(((((........)))))"),
            EPars.parenthesisToPairs("((((((((...........)).))))))"),
            EPars.parenthesisToPairs(".((((((.((((((......)))))).......((((.....))))...))))))."),
            EPars.parenthesisToPairs("(((((((..((((........)))).(((((.......))))).....(((((.......))))))))))))."),
            EPars.parenthesisToPairs(".(((((((((.((((....))))..................))))..(((((......)))))...(((.((.(((((((((((((...((((..((((.....))))...)))).))))))))))))))).)))..))))).."),  
        ];
        let sequences: number[][] = [
            EPars.stringToSequence(  "GGGGGAAAAAAAACCCCC"),
            EPars.stringToSequence(  "GGGAAACCC"),
            EPars.stringToSequence(  "CCAGGAAAAAAAACCUGG"),
            EPars.stringToSequence(  "GGGGGGGGAAAACGGAAAGCCACCCCCC"),
            EPars.stringToSequence(  "ACGCUGUCUGUACUUGUAUCAGUACACUGACGAGUCCCUAAAGGACGAAACAGCGC"),
            EPars.stringToSequence(  "GGGGAUGUAGCUCAUAUGGUAGAGCGCUCGCUUUGCAUGCGAGAGGCACAGGGUUCGAUUCCCUGCAUCUCCA"),
            EPars.stringToSequence(  "CCUACUAGGGGAGCCAAAAGGCUGAGAUGAAUGUAUUCAGACCCUUAUAACCUGAUUUGGUUAAUACCAACGUAGGAAAGUAGUUAUUAACUAUUCGUCAUUGAGAUGUCUUGGUCUAACUACUUUCUUCGCUGGGAAGUAGUU"),
        ];

        for (let ii: number = 0; ii < sequences.length; ++ii ) {
            // console.log(EPars.sequenceToString(sequences[ii]));
            // console.log(EPars.pairsToParenthesis(folder.foldSequence(sequences[ii], [])));
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


            // internal consistency: FE should equal summed outNNFEs
            // This is not necessarily the case due to ROUNDING ERROR
            // but can be used to find BIG issues.
            let NNFEsum = 0;
            for (let jj: number = 1; jj < outNNFE.length; jj += 2) {
                NNFEsum += outNNFE[jj];
            }
            console.log(FE);
            console.log(NNFEsum);
            //expect(FE).toBeDeepCloseTo(NNFEsum, 0);
        }
    })).resolves.toBeUndefined();
});
