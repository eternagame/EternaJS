// import './jest-matcher-deep-close-to';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import EternaFoldThreshknot from 'eterna/folding/EternafoldThreshknot';
import EternaFold from 'eterna/folding/Eternafold';

test(`EternaFoldThreshknot:folds_structures`, () => {
    const testSequences = [
        "AAAAAA",
        "AUAUCAAAAAAGAUAU", // Simple Hairpin
        "GGGGGGGGAAAACGGAAAGCCACCCCCC",
        "CCCAGGUCGUAGAACUAAAGCGCCAAAAGGACGCAAUUAGAACUACAUGCAUAGCAUGACCAAAGGG",
        "CCUACUAGGGGAGCCAAAAGGCUGAGAUGAAUGUAUUCAGACCCUUAUAACCUGAUUUGGUUAAUACCAACGUAGGAAAGUAGUUAUUAACUAUUCGUCAUUGAGAUGUCUUGGUCUAACUACUUUCUUCGCUGGGAAGUAGUU",
        "GGGAACGACUCGAGUAGAGUCGAAAAAUCUUCAUAACUGAAUACAAAGGUAGAAGAUUAUUCAGUUAUAUUAAAAAGGAUGUCUUCGGGCAUUCAAAAGAAACAACAACAACAAC"
    ];
    const testStructures = [
        "......",
        "(((((......)))))",
        "((((((((...........)).))))))",
        "(((.((((((((..((((.(((((....)).)))..))))..))))((((...))))))))...)))",
        ".(((((((((.((((....))))....((((....))))..))))..(((((......)))))...(((.((.(((((((((((((...((((..((((.....))))...)))).))))))))))))))).)))..)))))..",
        ".....((((((.....))))))....(((((({{{{{{{{{{{........))))))}}}}}}}}}}}........(((((((....)))))))....................."
    ];

    return expect(EternaFoldThreshknot.create()
        .then((folder) => {
            if (folder === null) return;

            testSequences.map((sequence, index) => {
                const foldedStructure =  folder.foldSequence(Sequence.fromSequenceString(sequence), new SecStruct(), null, true);
                // console.log(foldedStructure?.getParenthesis(null, true))
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

    const testStructures = [
        "((((((((((((({{{{{{)))...((((((((((((((((}}}}}}))).)))))))))))))))))))))))..(((((((....))))))).....................",
        ".....((((((.....)))))).............(((((.................{{{{......)))))}}}}(((((((....))))))).....................",
        ".....((((((.....))))))....(((((........)))))..((((.....((((..((....................{{{{{{{..))..))))..))))}}}}}}}...(((((((....))))))).....................",
        ".....(((((((((((((((((....(((((({{{(({{{...{{{{{..{{....))....}}..}}}}})).}}}........}}}.))))...)))))))))))))))))...(((((((....)))))))....................."
    ];

    return expect(EternaFoldThreshknot.create()
        .then((folder) => {
            if (folder === null) return;

            testSequences.map((sequence, index) => {
                const foldedStructure =  folder.foldSequence(Sequence.fromSequenceString(sequence), new SecStruct(), null, true);
                // console.log(foldedStructure?.getParenthesis(null, true))
                expect(foldedStructure?.getParenthesis(null, true)).toBe(testStructures[index])
            })
        })).resolves.toBeUndefined();
});

test('EternaFoldThreshknot:matches_Eternafold_w/o_pseudoknots', () => {    
    
    const testSequences = [
        "GGGAACGACUCGAGUAGAGUCGAAAAGAAUACGUUGGGAAACGCCUUCGAACGAUCCCACGCGAUCGUCUGUUCGAGGUAAUUUUCGAAUUACCAAAAGAAACAACAACAACAAC",
        "GGGAACGACUCGAGUAGAGUCGAAAAGAAAGCGUGCGGACGAACGUGCGUGCGUGCGAACGGACGUGCGUAAGCAACGUUAUAUUCGUAUAACGAAAAGAAACAACAACAACAAC"
    ];

    return expect(EternaFoldThreshknot.create()
        .then((folderTK) => {
            EternaFold.create().then((folderEF) => {
                if (folderTK === null) return;
                if (folderEF === null) return;

                testSequences.map((sequence) => {
                    const foldedStructureTK =  folderTK.foldSequence(Sequence.fromSequenceString(sequence), new SecStruct(), null, false);
                    const foldedStructureEF =  folderEF.foldSequence(Sequence.fromSequenceString(sequence), new SecStruct());
                    const dbnTK = foldedStructureTK?.getParenthesis(null, false);
                    const dbnEF = foldedStructureEF?.getParenthesis(null, false);
                    expect(dbnTK).toBe(dbnEF)
                })
            })
        })).resolves.toBeUndefined();
})  

test('EternaFoldThreshknot:removes_single_pair_helices', () => {
// This sequence is predicted to be (((.(.((....)).).))) by Eternafold
// This test checks that Threshknot removes the single pair helix
    
const testSequences = [
    "CGGAGACCAAAAGGACACCG"
];

const testStructures = [
    "(((...((....))...)))"
];

 return expect(EternaFoldThreshknot.create()
    .then((folder) => {
        if (folder === null) return;

        testSequences.map((sequence, index) => {
            const foldedStructure =  folder.foldSequence(Sequence.fromSequenceString(sequence), new SecStruct(), null, true);
            expect(foldedStructure?.getParenthesis(null, true)).toBe(testStructures[index])
        })
    })).resolves.toBeUndefined();
})