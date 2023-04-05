import Folder from '../Folder';
// import './jest-matcher-deep-close-to';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import EternaFoldThreshknot from 'eterna/folding/EternafoldThreshknot';

function CreateFolder(type: any): Promise<Folder | null> {
    return type.create();
}

test(`EternaFoldThreshknot:folds_structures`, () => {
    const testSequences = [
        "AAAAAA",
        "AUAUCAAAAAAGAUAU", // Simple Hairpin
        "GGGGGGGGAAAACGGAAAGCCACCCCCC",
        "CCCAGGUCGUAGAACUAAAGCGCCAAAAGGACGCAAUUAGAACUACAUGCAUAGCAUGACCAAAGGG",
        "CCUACUAGGGGAGCCAAAAGGCUGAGAUGAAUGUAUUCAGACCCUUAUAACCUGAUUUGGUUAAUACCAACGUAGGAAAGUAGUUAUUAACUAUUCGUCAUUGAGAUGUCUUGGUCUAACUACUUUCUUCGCUGGGAAGUAGUU",
    ];
    const testStructures = [
        "......",
        "(((((......)))))",
        "((((((((...........)).))))))",
        "(((.((((((((..((((.(((((....)).)))..))))..))))((((...))))))))...)))",
        ".(((((((((.((((....))))....((((....))))..))))..(((((......)))))...(((.((.(((((((((((((...((((..((((.....))))...)))).))))))))))))))).)))..))))).."
    ];

    return expect(CreateFolder(EternaFoldThreshknot)
        .then((folder) => {
            if (folder === null) return;

            testSequences.map((sequence, index) => {
                const foldedStructure =  folder.foldSequence(Sequence.fromSequenceString(sequence), new SecStruct());
                expect(foldedStructure?.getParenthesis(null, true)).toBe(testStructures[index])
            })
        })).resolves.toBeUndefined();
});

test(`EternaFoldThreshknot:predicts_pseudoknots`, () => {
    const testSequences = [
        "GGGAACGACUCGAGUAGAGUCGAAAACUCUGGUCUCUACGACUCUACUCGAUAGAGGCUGGAGUAGUCGUUCCCGACGACAUGUUCGCGUGUCGAAAAGAAACAACAACAACAAC",
        "GGGAACGACUCGAGUAGAGUCGAAAAUGGUGGAGGAGGUGGAAAGCUCGGCAUUAAAGGGAUAAAAACAUCUUCCCGUUCGGGUUCGCCCGAACAAAAGAAACAACAACAACAAC",
        "GGGAACGACUCGAGUAGAGUCGAAAACAUGCAGAAAUAAGCAUGGUGCUCAAAAAGUAGAACGAAAGAUCAAAAAUUGAGAAAAUGAUCCAACGAACUACAAGAGCGGAUCAUAAACGCGAUCUUCGGAUCGCGAAAAGAAACAACAACAACAAC",
        "GGGAACGACUCGAGUAGAGUCGAAAAGCAUCGAGCUAGCAAGAGCAUGUUGGAAGCUAGCAACCUUCAUGCCGAUGCAAUCCCAGGCUAAUGCCAACGACUCUACUCGAGUCGACAGCUUUGUUUCGACAAAGCAAAAGAAACAACAACAACAAC"
    ];

    return expect(CreateFolder(EternaFoldThreshknot)
        .then((folder) => {
            if (folder === null) return;

            testSequences.map((sequence) => {
                const foldedStructure =  folder.foldSequence(Sequence.fromSequenceString(sequence), new SecStruct());
                expect(foldedStructure?.getParenthesis(null, true)).toContain("{")
            })
        })).resolves.toBeUndefined();
});