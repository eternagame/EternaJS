import {EPars} from "../../EPars";
import {Folder} from "../Folder";
import {NuPACK} from "../NuPACK";
import {Vienna} from "../Vienna";
import {Vienna2} from "../Vienna2";

const SNOWFLAKE_SEQ: string = 'GUGGACAAGAUGAAACAUCAGUAACAAGCGCAAAGCGCGGGCAAAGCCCCCGGAAACCGGAAGUUACAGAACAAAGUUCAAGUUUACAAGUGGACAAGUUGAAACAACAGUUACAAGACGAAACGUCGGCCAAAGGCCCCAUAAAAUGGAAGUAACACUUGAAACAAGAAGUUUACAAGUUGACAAGUUCAAAGAACAGUUACAAGUGGAAACCACGCGCAAAGCGCCUCCAAAGGAGAAGUAACAGAAGAAACUUCAAGUUAGCAAGUGGUCAAGUACAAAGUACAGUAACAACAUCAAAGAUGGCGCAAAGCGCGAGCAAAGCUCAAGUUACAGAACAAAGUUCAAGAUUACAAGAGUGCAAGAAGAAACUUCAGAUAGAACUGCAAAGCAGCACCAAAGGUGGGGCAAAGCCCAACUAUCAGUUGAAACAACAAGUAUUCAAGAGGUCAAGAUCAAAGAUCAGUAACAAGUGCAAAGCACGGGCAAAGCCCGACCAAAGGUCAAGUUACAGUUCAAAGAACAAGAUUUC';
const SNOWFLAKE_STRUCT: string = '((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))';

const BASIC_SEQ: string = "AAAAAAAAAAAAAA";
const BASIC_RESULT: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];

const ZIPPERS_SEQ: string = "AAAAAGGGGAAAAAAAAACCCCAGCGGAAAAAACUGCAAA";
const ZIPPERS_BEST_PAIRS: string = ".....((((.........)))).((((......))))...";
const ZIPPERS_TEMP = 37;

function FoldSequence(folder: Folder, seq: string, struct: string): any[] {
    return folder.fold_sequence(EPars.string_to_sequence_array(seq), null, struct);
}

function CreateFolder(type: any): Promise<Folder> {
    return type.create();
}

for (let folderType of [Vienna, Vienna2, NuPACK]) {
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
            [NuPACK.NAME, -1110]
        ]);

        const NNFE: Map<string, number[]> = new Map([
            [Vienna.NAME, [-1,-360,5,-330,6,-330,7,-330,8,530,23,-340,24,-140,25,-210,26,430]],
            [Vienna2.NAME, [-1,-300,5,-330,6,-330,7,-330,8,530,23,-340,24,-140,25,-210,26,430]],
            [NuPACK.NAME, [-1,-360,26,360,25,-190,24,-120,23,-340,8,410,7,-290,6,-290,5,-290]],
        ]);

        let expectedTotalFe = TOTAL_FE.get(folderType.NAME);
        let expectedNNFE = NNFE.get(folderType.NAME);

        expect.assertions(3);
        return expect(CreateFolder(folderType)
            .then((folder) => {
                let outNNFE: number[] = [];
                let totalFe = folder.score_structures(
                    EPars.string_to_sequence_array(ZIPPERS_SEQ),
                    EPars.parenthesis_to_pair_array(ZIPPERS_BEST_PAIRS),
                    ZIPPERS_TEMP,
                    outNNFE);

                expect(totalFe).toBeCloseTo(expectedTotalFe);
                expect(outNNFE).toEqual(expectedNNFE);
            }))
            .resolves.toBeUndefined(); // (we're returning a promise)
    });
}
