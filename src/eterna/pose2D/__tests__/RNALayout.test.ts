import RNALayout, {RNATreeNode} from '../RNALayout';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import Folder from 'eterna/folding/Folder';
import FoldUtil from 'eterna/folding/FoldUtil';

class MockFolder extends Folder<true> {
    protected readonly _isSync = true;
    name = 'MockFolder';

    public get isFunctional(): boolean {
        return true;
    }

    public scoreStructures(_seq: Sequence, _secstruct: SecStruct, _pseudoknotted?: boolean, _temp?: number, outNodes?: number[] | null): number {
        // See NuPACK:scoreStructures (multistrand) in src/eterna/folding/__tests__/NuPACKMultistrand.test.ts
        if (outNodes != null) {
            FoldUtil.arrayCopy(outNodes, [
                -2,  409,   -1, -200,   59,  210,   58, -170,   57, -110,   56,
              -100,   55, -140,   54, -180,   53,  -90,   52, -180,   51, -210,
                50, -110,   49, -170,   48, -230,   47,  -90,   46, -110,   45,
               -50,   44, -230,   43, -200,   42, -210,   41, -110,   40,  -90,
                39,  -90,   38, -230,   37, -120,   36, -110,   35,  -90,   34,
              -180,   33, -210,   32,  -20,   31, -210,   30, -180,   29, -210,
                 9,    0,    8, -230,    7, -120,    6, -190,    5, -230,    4,
               -90,    3, -210,    2, -170,    1,  -90,    0, -110
            ]);
        }
        return -5452;
    }
}

interface ScoreTreeJSON {
    score: number;
    children: ScoreTreeJSON[];
}

function scoreTreeToJSON(node: RNATreeNode): ScoreTreeJSON {
    return {
        score: node.score,
        children: node.children.map(child => scoreTreeToJSON(child))
    };
}

test(`RNALayout:setupTree`, () => {
    const rnalayout: RNALayout = new RNALayout();

    // imagine (((....)))
    const pairs = new SecStruct([10, 9, 8, -1, -1, -1, -1, 3, 2, 1]);
    rnalayout.setupTree(pairs);
    expect(rnalayout["_scoreBiPairs"][0]).toBe(11);
});

test('RNALayout:scoreTree (multistrand)', () => {
    const scoreTree: RNALayout = new RNALayout();
    const pairs = SecStruct.fromParens('((((((((((.))))))))))........(((((((((((((((((((((((((((((((....))))))))))))))))))))))))))))))).');
    scoreTree.setupTree(pairs);

    const seq = Sequence.fromSequenceString('UAAGUUCUGA&UCGGAACUUAGCUUAGAUGGUUGCGUUGAAUUCGAGAUCUACAUGGUAGUUCGCUAUCAUGUAGAUUUCGGGUUCCAUCUGCAGU', true);
    scoreTree.scoreTree(seq, new MockFolder());

    expect(scoreTreeToJSON(scoreTree.root!)).toEqual(
        {"score":-200,"children":[{"score":-110,"children":[{"score":-90,"children":[{"score":-170,"children":[{"score":-210,"children":[{"score":-90,"children":[{"score":-230,"children":[{"score":-190,"children":[{"score":-120,"children":[{"score":-230,"children":[{"score":0,"children":[{"score":409,"children":[{"score":0,"children":[]}]}]}]}]}]}]}]}]}]}]}]},{"score":0,"children":[]},{"score":0,"children":[]},{"score":0,"children":[]},{"score":0,"children":[]},{"score":0,"children":[]},{"score":0,"children":[]},{"score":0,"children":[]},{"score":0,"children":[]},{"score":-210,"children":[{"score":-180,"children":[{"score":-210,"children":[{"score":-20,"children":[{"score":-210,"children":[{"score":-180,"children":[{"score":-90,"children":[{"score":-110,"children":[{"score":-120,"children":[{"score":-230,"children":[{"score":-90,"children":[{"score":-90,"children":[{"score":-110,"children":[{"score":-210,"children":[{"score":-200,"children":[{"score":-230,"children":[{"score":-50,"children":[{"score":-110,"children":[{"score":-90,"children":[{"score":-230,"children":[{"score":-170,"children":[{"score":-110,"children":[{"score":-210,"children":[{"score":-180,"children":[{"score":-90,"children":[{"score":-180,"children":[{"score":-140,"children":[{"score":-100,"children":[{"score":-110,"children":[{"score":-170,"children":[{"score":0,"children":[{"score":210,"children":[{"score":0,"children":[]},{"score":0,"children":[]},{"score":0,"children":[]},{"score":0,"children":[]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]}]},{"score":0,"children":[]}]}   
    );
});
