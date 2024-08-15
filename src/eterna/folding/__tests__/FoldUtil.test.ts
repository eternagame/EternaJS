import FoldUtil, { BasePairProbabilityTransform } from "../FoldUtil";
import EternaFold from "../Eternafold";
import Sequence from "eterna/rnatypes/Sequence";
import SecStruct from "eterna/rnatypes/SecStruct";

test('FoldUtil:tea', () => {
    expect(EternaFold.create()
        .then((eternafold) => {
            if (eternafold === null) {
                expect(true).toBeTruthy();
                return;
            }

            const seq = Sequence.fromSequenceString('GGGGAAACCC');
            const bpps = eternafold.getDotPlot(seq);;
            expect(FoldUtil.expectedAccuracy(
                SecStruct.fromParens('(((....)))', false),
                bpps,
                BasePairProbabilityTransform.LEAVE_ALONE
            ).mcc).toBeCloseTo(0.8607, 4);
    }))
    .resolves.toBeUndefined();
});
