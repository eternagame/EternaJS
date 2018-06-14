import {EPars} from "../../EPars";
import {Folder} from "../Folder";
import {NuPACK} from "../NuPACK";
import {Vienna} from "../Vienna";

const SNOWFLAKE_SEQ: string = 'GUGGACAAGAUGAAACAUCAGUAACAAGCGCAAAGCGCGGGCAAAGCCCCCGGAAACCGGAAGUUACAGAACAAAGUUCAAGUUUACAAGUGGACAAGUUGAAACAACAGUUACAAGACGAAACGUCGGCCAAAGGCCCCAUAAAAUGGAAGUAACACUUGAAACAAGAAGUUUACAAGUUGACAAGUUCAAAGAACAGUUACAAGUGGAAACCACGCGCAAAGCGCCUCCAAAGGAGAAGUAACAGAAGAAACUUCAAGUUAGCAAGUGGUCAAGUACAAAGUACAGUAACAACAUCAAAGAUGGCGCAAAGCGCGAGCAAAGCUCAAGUUACAGAACAAAGUUCAAGAUUACAAGAGUGCAAGAAGAAACUUCAGAUAGAACUGCAAAGCAGCACCAAAGGUGGGGCAAAGCCCAACUAUCAGUUGAAACAACAAGUAUUCAAGAGGUCAAGAUCAAAGAUCAGUAACAAGUGCAAAGCACGGGCAAAGCCCGACCAAAGGUCAAGUUACAGUUCAAAGAACAAGAUUUC';
const SNOWFLAKE_STRUCT: string = '((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))';

const BASIC_SEQ: string = "AAAAAAAAAAAAAA";
const BASIC_RESULT: number[] = [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1];

function FoldSequence(folder: Folder, seq: string, struct: string): any[] {
    return folder.fold_sequence(EPars.string_to_sequence_array(seq), null, struct);
}

function CreateFolder(type: any): Promise<Folder> {
    return type.create();
}

for (let folderType of [Vienna, NuPACK]) {
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
}
