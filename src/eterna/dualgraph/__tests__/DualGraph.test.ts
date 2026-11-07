import SecStruct from 'eterna/rnatypes/SecStruct';
import DualGraphBuilder from '../DualGraph';

/**
 * Every expectation here was produced by the Python reference implementation
 * (github.com/cailyx/rna-dual-graphs), which wraps the Schlick lab's own code.
 * If a case below fails, this file is right and DualGraph.ts is wrong.
 */
function graph(parens: string, pseudoknots = false) {
    return DualGraphBuilder.build(SecStruct.fromParens(parens, pseudoknots));
}

describe('DualGraph: the complete set of two-stem topologies', () => {
    // E = 2V-1 = 3 for all three; they differ only in how the budget is spent
    test('2_1, two hairpins: 2 self-loops, 1 connecting edge, lambda2 = 2', () => {
        const g = graph('((((....))))....((((....))))....');
        expect(g.vertices).toEqual(2);
        expect(g.edgeCount).toEqual(3);
        expect(g.hairpins).toEqual(2);
        expect(g.adjacency).toEqual([[2, 1], [1, 2]]);
        expect(DualGraphBuilder.lambda2(g.adjacency)).toBeCloseTo(2, 9);
    });

    test('2_2, nested: 1 self-loop, 2 connecting edges, lambda2 = 4', () => {
        const g = graph('((((....((((....))))....))))....');
        expect(g.vertices).toEqual(2);
        expect(g.edgeCount).toEqual(3);
        expect(g.hairpins).toEqual(1);
        expect(g.adjacency).toEqual([[0, 2], [2, 2]]);
        expect(DualGraphBuilder.lambda2(g.adjacency)).toBeCloseTo(4, 9);
    });

    test('2_3, pseudoknot: no self-loop, 3 connecting edges, lambda2 = 6', () => {
        const g = graph('((((....[[[[....))))....]]]]....', true);
        expect(g.vertices).toEqual(2);
        expect(g.edgeCount).toEqual(3);
        expect(g.hairpins).toEqual(0);
        expect(g.adjacency).toEqual([[0, 3], [3, 0]]);
        expect(DualGraphBuilder.lambda2(g.adjacency)).toBeCloseTo(6, 9);
    });
});

describe("DualGraph: RAG's merge rule", () => {
    // A vertex is NOT a stem. These are the cases where they differ.
    test('a 1-nt bulge merges two stacks into one vertex', () => {
        const g = graph('((((.((((....))))))))');
        expect(g.stemsBeforeMerge).toEqual(2);
        expect(g.vertices).toEqual(1);
        expect(g.merged).toBe(true);
        expect(g.adjacency).toEqual([[2]]);
    });

    test('a 2-nt bulge does not merge', () => {
        const g = graph('((((..((((....))))))))');
        expect(g.stemsBeforeMerge).toEqual(2);
        expect(g.vertices).toEqual(2);
        expect(g.merged).toBe(false);
        expect(g.adjacency).toEqual([[0, 2], [2, 2]]);
    });

    test('a 1x1 internal loop merges', () => {
        const g = graph('((((.((((....)))).))))');
        expect(g.vertices).toEqual(1);
        expect(g.merged).toBe(true);
    });

    test('a 2x2 internal loop does not', () => {
        const g = graph('((((..((((....))))..))))');
        expect(g.vertices).toEqual(2);
        expect(g.adjacency).toEqual([[0, 2], [2, 2]]);
    });

    test('a single-base-pair helix is deleted', () => {
        const g = graph('(.((((....)))).)');
        expect(g.stemsBeforeMerge).toEqual(2);
        expect(g.vertices).toEqual(1);
        expect(g.adjacency).toEqual([[2]]);
    });
});

describe('DualGraph: invariants and coarse-graining', () => {
    test('E = 2V - 1 holds', () => {
        for (const [s, pk] of [
            ['((((....))))', false],
            ['((((....))))....((((....))))....', false],
            ['((((....[[[[....))))....]]]]....', true]
        ] as [string, boolean][]) {
            const g = graph(s, pk);
            expect(g.edgeCount).toEqual(2 * g.vertices - 1);
        }
    });

    test('stem length and loop position are discarded', () => {
        // three different patterns, one graph -- the whole point of the method
        const gs = ['((((....))))', '.((((....))))..', '((((....)))).....']
            .map((s) => graph(s));
        for (const g of gs) {
            expect(g.vertices).toEqual(1);
            expect(g.adjacency).toEqual([[2]]);
        }
    });

    test('lambda2 cannot see hairpins, by construction', () => {
        // 2_1 and 2_3 differ only in hairpin count; the diagonal is zeroed
        // before the Laplacian, so lambda2 reads the connecting edges alone
        expect(DualGraphBuilder.lambda2([[2, 1], [1, 2]])).toBeCloseTo(2, 9);
        expect(DualGraphBuilder.lambda2([[0, 1], [1, 0]])).toBeCloseTo(2, 9);
    });

    test('a five-stem pseudoknotted structure (atlas 5_36)', () => {
        const g = graph(
            '((((....((((....[[[[....))))....((((....((((....))))'
            + '....))))....]]]]....))))....', true
        );
        expect(g.vertices).toEqual(5);
        expect(g.edgeCount).toEqual(9);
        expect(g.hairpins).toEqual(1);
        expect(g.degrees).toEqual([2, 4, 4, 4, 4]);
        expect(DualGraphBuilder.lambda2(g.adjacency)).toBeCloseTo(1.096788, 5);
    });
});
