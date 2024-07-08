import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import './jest-matcher-deep-close-to';
import RNNet from '../RNNet';

test('RNNet-SS:MFETests', () => {
    return expect(RNNet.create().then(async (folder) => {
        if (folder === null) return;

        let structures: SecStruct[] = [
            SecStruct.fromParens("(((((........)))))", true),
            SecStruct.fromParens("(((((........)))))", true),
            SecStruct.fromParens("((((((((....(.....))).))))))", true),
            SecStruct.fromParens(".(((((((((((((......))))))..)....((((.....))))...)))))).", true),
            SecStruct.fromParens("(((((((..((((.....{..)))).(((((.......))))).....(((((..}....)))))))))))).", true),
            SecStruct.fromParens(".(......)...((({.{.)))...........................................}}((....))..........", true),
            SecStruct.fromParens(".(((((((((.((((....))))....((((....))))..))))..(((((......)))))...(((.((.(((((((((((((...((((..((((.....))))...)))).))))))))))))))).)))..)))))..", true),
            SecStruct.fromParens("((((.........((((.....).))).......))))", true),
        ];
        let sequences: Sequence[] = [
            Sequence.fromSequenceString("GGGGGAAAAAAAACCCCC"),
            Sequence.fromSequenceString("CCAGGAAAAAAAACCUGG"),
            Sequence.fromSequenceString("GGGGGGGGAAAACGGAAAGCCACCCCCC"),
            Sequence.fromSequenceString("ACGCUGUCUGUACUUGUAUCAGUACACUGACGAGUCCCUAAAGGACGAAACAGCGC"),
            Sequence.fromSequenceString("GGGGAUGUAGCUCAUAUGGUAGAGCGCUCGCUUUGCAUGCGAGAGGCACAGGGUUCGAUUCCCUGCAUCUCCA"),
            Sequence.fromSequenceString("AAGGUAACUAAGGGGGGUUCCCCAAACUUGAUCUCCACAAAAAAAAAAAAAAAAAAAAAAAAAAAACCCAAAAGGGAAAAAAAAA"),
            Sequence.fromSequenceString("CCUACUAGGGGAGCCAAAAGGCUGAGAUGAAUGUAUUCAGACCCUUAUAACCUGAUUUGGUUAAUACCAACGUAGGAAAGUAGUUAUUAACUAUUCGUCAUUGAGAUGUCUUGGUCUAACUACUUUCUUCGCUGGGAAGUAGUU"),
            Sequence.fromSequenceString("GGGGUAACUAUUCGGGGUUGAGCCCCCUUGAUCUCCCC"),
        ];

        const folded = await Promise.all(sequences.map((seq) => folder.foldSequence(seq)));
        for (const [idx, structure] of folded.entries()) {
            expect(structure).toEqual(structures[idx]);
        }
    })).resolves.toBeUndefined();
}, 30000);

test('RNNet-SS:eF1Tests', () => {
    return expect(RNNet.create().then(async (folder) => {
        if (folder === null) return;

        const expectedEstimates = [
            [ 0.9301262935652272, 0 ],
            [ 0.9578995377499582, 0 ],
            [ 0.7351492080490463, 0 ],
            [ 0.9026708523526348, 0 ],
            [ 0.9532047010819431, 0.7426239755621307 ],
            [ 0.5704961397861434, 0.38134011623612074 ],
            [ 0.897274917932763, 0 ],
            [ 0.9133847848282128, 0 ]
        ];
        let sequences: Sequence[] = [
            Sequence.fromSequenceString("GGGGGAAAAAAAACCCCC"),
            Sequence.fromSequenceString("CCAGGAAAAAAAACCUGG"),
            Sequence.fromSequenceString("GGGGGGGGAAAACGGAAAGCCACCCCCC"),
            Sequence.fromSequenceString("ACGCUGUCUGUACUUGUAUCAGUACACUGACGAGUCCCUAAAGGACGAAACAGCGC"),
            Sequence.fromSequenceString("GGGGAUGUAGCUCAUAUGGUAGAGCGCUCGCUUUGCAUGCGAGAGGCACAGGGUUCGAUUCCCUGCAUCUCCA"),
            Sequence.fromSequenceString("AAGGUAACUAAGGGGGGUUCCCCAAACUUGAUCUCCACAAAAAAAAAAAAAAAAAAAAAAAAAAAACCCAAAAGGGAAAAAAAAA"),
            Sequence.fromSequenceString("CCUACUAGGGGAGCCAAAAGGCUGAGAUGAAUGUAUUCAGACCCUUAUAACCUGAUUUGGUUAAUACCAACGUAGGAAAGUAGUUAUUAACUAUUCGUCAUUGAGAUGUCUUGGUCUAACUACUUUCUUCGCUGGGAAGUAGUU"),
            Sequence.fromSequenceString("GGGGUAACUAUUCGGGGUUGAGCCCCCUUGAUCUCCCC"),
        ];

        const estimates = await Promise.all(sequences.map(async (seq) => [
            await folder.getEf1(seq),
            await folder.getEf1CrossPair(seq)
        ]));
        for (const [idx, estimate] of estimates.entries()) {
            expect(estimate).toBeDeepCloseTo(expectedEstimates[idx]);
        }
    })).resolves.toBeUndefined();
}, 30000);

test(`RNNet-SS:get_dot_plot(complex)`, () => {
    expect.assertions(2);
    const SEQ = 'AAAAACCCCAAAAAAAAAGGGGACCCCAAAAAAGGGGAAA';

    return expect(RNNet.create()
        .then(async (folder) => {
            if (folder === null) {
                expect(true).toBeTruthy();
                return;
            }
            
            const calcdResult = await folder.getDotPlot(Sequence.fromSequenceString(SEQ));
            expect(calcdResult?.data).toMatchSnapshot();
        }))
        .resolves.toBeUndefined();
});
