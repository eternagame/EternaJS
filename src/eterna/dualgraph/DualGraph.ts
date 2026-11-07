import SecStruct from 'eterna/rnatypes/SecStruct';

/**
 * A helix after RAG's merge rule has been applied. Both strands are inclusive
 * ranges of 0-based nucleotide indices, and `fiveStart` pairs with `threeEnd`
 * while `fiveEnd` pairs with `threeStart`.
 */
export interface Helix {
    fiveStart: number;
    fiveEnd: number;
    threeStart: number;
    threeEnd: number;
}

export interface DualGraphEdge {
    /** vertex indices, equal when this edge is a hairpin */
    a: number;
    b: number;
    /** the unpaired stretch this edge came from, as [first, last]; empty if adjacent */
    gap: [number, number] | null;
}

export interface DualGraph {
    /** one per merged helix, in 5'->3' order of their 5' strand */
    helices: Helix[];
    /** V x V. Off-diagonal = loops between helices. Diagonal = 2 x hairpins. */
    adjacency: number[][];
    edges: DualGraphEdge[];
    vertices: number;
    /** always 2V-1 for a connected dual graph */
    edgeCount: number;
    hairpins: number;
    degrees: number[];
    /** stems before the merge rule was applied; a vertex is not a stem */
    stemsBeforeMerge: number;
    merged: boolean;
}

/**
 * Secondary structure -> RNA-As-Graphs dual graph.
 *
 * Stems become vertices, loops become edges, hairpins become self-loops. Stem
 * lengths and loop sizes are discarded, so many base-pairing patterns collapse
 * onto one graph -- which is the point of the representation.
 *
 * This is a reimplementation of the Schlick lab's `changeHelices` +
 * `connectHelices` in TypeScript, kept deliberately faithful to it:
 * disagreeing with their reference would make any ID we later assign wrong.
 * The Python oracle to diff against is github.com/cailyx/rna-dual-graphs.
 */
export default class DualGraphBuilder {
    /**
     * Raw stacks of consecutive base pairs, before any merging.
     * `SecStruct.stems()` finds them; this only normalises the shape.
     */
    public static helicesOf(secstruct: SecStruct): Helix[] {
        const helices: Helix[] = [];
        for (const stem of secstruct.stems()) {
            if (stem.length === 0) continue;
            let fiveStart = Infinity;
            let fiveEnd = -Infinity;
            let threeStart = Infinity;
            let threeEnd = -Infinity;
            for (const [i, j] of stem) {
                const lo = Math.min(i, j);
                const hi = Math.max(i, j);
                fiveStart = Math.min(fiveStart, lo);
                fiveEnd = Math.max(fiveEnd, lo);
                threeStart = Math.min(threeStart, hi);
                threeEnd = Math.max(threeEnd, hi);
            }
            helices.push({
                fiveStart, fiveEnd, threeStart, threeEnd
            });
        }
        helices.sort((p, q) => p.fiveStart - q.fiveStart);
        return helices;
    }

    /**
     * RAG's merge rule, following `changeHelices` in dualGraphs.py.
     *
     * Only CONSECUTIVE helices in 5'->3' order are candidates, and only when
     * properly nested. Two merge when the unpaired gaps either side total
     * fewer than two nucleotides (a bulge) or are exactly one on each side
     * (a 1x1 internal loop).
     *
     * Single-base-pair helices are deleted AFTER merging, not before -- the
     * order matters, because a 1-bp stack can first merge into a longer one.
     */
    public static merge(raw: Helix[]): Helix[] {
        // Which consecutive pairs merge, decided against the ORIGINAL list, so
        // that a run of mergeable neighbours collapses together as it does in
        // the reference implementation.
        const joins: boolean[] = [];
        for (let i = 0; i + 1 < raw.length; ++i) {
            const h1 = raw[i];
            const h2 = raw[i + 1];
            // not nested: h2's 3' strand ends after h1's begins
            if (h2.threeEnd > h1.threeStart) {
                joins.push(false);
                continue;
            }
            const gap5 = Math.abs(h2.fiveStart - h1.fiveEnd) - 1;
            const gap3 = Math.abs(h1.threeStart - h2.threeEnd) - 1;
            joins.push(Math.abs(gap5 + gap3) < 2 || (Math.abs(gap5) === 1 && Math.abs(gap3) === 1));
        }

        const merged: Helix[] = [];
        let i = 0;
        while (i < raw.length) {
            let j = i;
            while (j + 1 < raw.length && joins[j]) j++;
            merged.push({
                fiveStart: raw[i].fiveStart,
                fiveEnd: raw[j].fiveEnd,
                threeStart: raw[j].threeStart,
                threeEnd: raw[i].threeEnd
            });
            i = j + 1;
        }

        // now drop anything still only one base pair wide
        return merged.filter((h) => h.fiveStart !== h.fiveEnd || h.threeStart !== h.threeEnd);
    }

    public static build(secstruct: SecStruct): DualGraph {
        const raw = DualGraphBuilder.helicesOf(secstruct);
        const helices = DualGraphBuilder.merge(raw);
        const V = helices.length;

        const adjacency: number[][] = Array.from({length: V}, () => new Array<number>(V).fill(0));
        const edges: DualGraphEdge[] = [];

        // Walk the backbone. Each helix puts two blocks on it; every gap
        // between consecutive blocks is one edge, which gives 2V-1 edges.
        // A gap whose two blocks belong to the same helix is a hairpin.
        const blocks: {start: number; end: number; helix: number}[] = [];
        helices.forEach((h, k) => {
            blocks.push({start: h.fiveStart, end: h.fiveEnd, helix: k});
            blocks.push({start: h.threeStart, end: h.threeEnd, helix: k});
        });
        blocks.sort((p, q) => p.start - q.start);

        for (let k = 0; k + 1 < blocks.length; ++k) {
            const a = blocks[k].helix;
            const b = blocks[k + 1].helix;
            const from = blocks[k].end + 1;
            const to = blocks[k + 1].start - 1;
            edges.push({a, b, gap: to >= from ? [from, to] : null});
            if (a === b) {
                adjacency[a][a] += 2;       // RAG convention: diagonal is 2 x hairpins
            } else {
                adjacency[a][b] += 1;
                adjacency[b][a] += 1;
            }
        }

        let hairpins = 0;
        for (let k = 0; k < V; ++k) hairpins += adjacency[k][k] / 2;
        const degrees = adjacency.map((row) => row.reduce((s, x) => s + x, 0));

        return {
            helices,
            adjacency,
            edges,
            vertices: V,
            edgeCount: edges.length,
            hairpins,
            degrees,
            stemsBeforeMerge: raw.length,
            merged: raw.length !== V
        };
    }

    /**
     * Fiedler value (algebraic connectivity), a compactness measure.
     *
     * Self-loops are REMOVED before the Laplacian is formed, matching the
     * reference `calcEigenValues`. lambda2 is therefore blind to hairpins by
     * construction -- if you want hairpins, read `graph.hairpins`.
     *
     * Jacobi eigenvalue iteration; V is at most a few dozen here.
     */
    public static lambda2(adjacency: number[][]): number {
        const n = adjacency.length;
        if (n < 2) return 0;
        const a: number[][] = adjacency.map((row, i) => row.map((x, j) => (i === j ? 0 : x)));
        const lap: number[][] = Array.from({length: n}, () => new Array<number>(n).fill(0));
        for (let i = 0; i < n; ++i) {
            let deg = 0;
            for (let j = 0; j < n; ++j) {
                if (i !== j) {
                    lap[i][j] = -a[i][j];
                    deg += a[i][j];
                }
            }
            lap[i][i] = deg;
        }
        for (let sweep = 0; sweep < 100; ++sweep) {
            let off = 0;
            for (let i = 0; i < n; ++i) {
                for (let j = i + 1; j < n; ++j) off += lap[i][j] * lap[i][j];
            }
            if (off < 1e-20) break;
            for (let p = 0; p < n; ++p) {
                for (let q = p + 1; q < n; ++q) {
                    if (Math.abs(lap[p][q]) < 1e-15) continue;
                    const theta = (lap[q][q] - lap[p][p]) / (2 * lap[p][q]);
                    const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
                    const c = 1 / Math.sqrt(t * t + 1);
                    const s = t * c;
                    for (let k = 0; k < n; ++k) {
                        const akp = lap[k][p];
                        const akq = lap[k][q];
                        lap[k][p] = c * akp - s * akq;
                        lap[k][q] = s * akp + c * akq;
                    }
                    for (let k = 0; k < n; ++k) {
                        const apk = lap[p][k];
                        const aqk = lap[q][k];
                        lap[p][k] = c * apk - s * aqk;
                        lap[q][k] = s * apk + c * aqk;
                    }
                }
            }
        }
        const eig: number[] = [];
        for (let i = 0; i < n; ++i) eig.push(lap[i][i]);
        eig.sort((x, y) => x - y);
        return eig[1];
    }
}
