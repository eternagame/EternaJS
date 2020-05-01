import UndoBlock, {BasePairProbabilityTransform} from "../UndoBlock";
import EPars from "../EPars";
import Folder from "../folding/Folder";
import Vienna2 from "../folding/Vienna2";
import LinearFoldV from "eterna/folding/LinearFoldV";

function CreateFolder(type: any): Promise<Folder> {
    return type.create();
}

test(`UndoBlock:ensembleBranchiness`, () => {
    let foo: UndoBlock = new UndoBlock(EPars.stringToSequence('gcgcaaaagcgc'));
    // Imagine you have:
    // gcgcaaaagcgc => [1,12,1,2,11,1,3,10,1,4,9,1]
    let bpp: number[] = [1,12,1,2,11,1,3,10,1,4,9,1];
    // 11+9+7+5 divided by four bps is 8
    expect(foo.ensembleBranchiness(bpp, BasePairProbabilityTransform.SQUARE)).toEqual(8);

    // now imagine:
    // gcgcaaaagcgcgc => [1,12,0.50,2,11,0.50,3,10,0.50,4,9,0.50,1,14,0.50,2,13,0.50,3,12,0.50,4,11,0.50]
    foo = new UndoBlock(EPars.stringToSequence('GCGCAAAAGCGC'));
    bpp = [1,12,0.50,2,11,0.50,3,10,0.50,4,9,0.50,1,14,0.50,2,13,0.50,3,12,0.50,4,11,0.50];
    // 11+9+7+5 
    expect(foo.ensembleBranchiness(bpp, BasePairProbabilityTransform.SQUARE)).toEqual(9);

});

test(`UndoBlock:branchiness`, () => {
    let foo: UndoBlock = new UndoBlock(EPars.stringToSequence('GCGCAAAAGCGC'));
    // Imagine you have:
    // gcgcaaaagcgc => [1,12,1,2,11,1,3,10,1,4,9,1]
    let pairs: number[] = [11,10,9,8,-1,-1,-1,-1,3,2,1,0];
    // 11+9+7+5 divided by four bps is 8
    expect(foo.branchiness(pairs)).toEqual(8);

    // now imagine:
    // gcgcaaaagcgcgc => [1,12,0.50,2,11,0.50,3,10,0.50,4,9,0.50,1,14,0.50,2,13,0.50,3,12,0.50,4,11,0.50]
    foo = new UndoBlock(EPars.stringToSequence('GCGCAAAAGCGCGC'));
    pairs = [13,12,11,10,-1,-1,-1,-1,-1,-1,3,2,1,0];
    // 11+9+7+5 
    expect(foo.branchiness(pairs)).toEqual(10);

});

test('UndoBlock:bpprox_vienna', () => {
    expect(CreateFolder(Vienna2)
        .then((vienna) => {
            
            let seq: number[] = EPars.stringToSequence('GGGGAAAACCCC');
            let foo: UndoBlock = new UndoBlock(seq);
            let bpps: number[] = vienna.getDotPlot(seq, [], 37, false);
            expect(foo.ensembleBranchiness(bpps, BasePairProbabilityTransform.SQUARE)).toBeCloseTo(7.992, 3);

            seq = EPars.stringToSequence('GCUAGAAAUGGGUG');
            foo = new UndoBlock(seq);
            bpps = vienna.getDotPlot(seq, [], 37, false);
            expect(foo.ensembleBranchiness(bpps, BasePairProbabilityTransform.SQUARE)).toBeCloseTo(7.808, 3);
    }))
    .resolves.toBeUndefined();
});

test('UndoBlock:punp_vienna', () => {
    expect(CreateFolder(Vienna2)
        .then((vienna) => {
            
            let seq: number[] = EPars.stringToSequence('GGGGAAAACCCC');
            let foo: UndoBlock = new UndoBlock(seq);
            let bpps: number[] = vienna.getDotPlot(seq, [], 37, false);
            expect(foo.sumProbUnpaired(bpps, BasePairProbabilityTransform.SQUARE)).toBeCloseTo(4.3256, 4);

            seq = EPars.stringToSequence('GCUAGAAAUGGGUG');
            foo = new UndoBlock(seq);
            bpps = vienna.getDotPlot(seq, [], 37, false);
            expect(foo.sumProbUnpaired(bpps, BasePairProbabilityTransform.SQUARE)).toBeCloseTo(10.2378, 4);
    }))
    .resolves.toBeUndefined();
});
