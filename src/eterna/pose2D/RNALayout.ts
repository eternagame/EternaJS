import {EPars} from "../EPars";
import {Folder} from "../folding/Folder";
import {RNATreeNode} from "./RNATreeNode";

export class RNALayout {
    public constructor(prim_space: number = 45, pair_space: number = 45, exception_indices: number[] = null) {
        this._primarySpace = prim_space;
        this._pairSpace = pair_space;
        if (exception_indices != null) {
            this._exception_indices = exception_indices.slice();
        }
    }

    public get_root(): RNATreeNode {
        return this._root;
    }

    public setup_tree(pairs: number[]): void {
        let dangling_start: number = 0;
        let dangling_end: number = 0;
        let ii: number;
        let bi_pairs: number[] = new Array(pairs.length);

        /// Delete old tree
        this._root = null;
        /// save for later
        this._orig_pairs = pairs.slice();

        for (ii = 0; ii < pairs.length; ii++) {
            bi_pairs[ii] = -1;
        }

        for (ii = 0; ii < pairs.length; ii++) {
            if (ii < pairs[ii]) {
                bi_pairs[ii] = pairs[ii];
                bi_pairs[pairs[ii]] = ii;
            }
        }

        for (ii = 0; ii < bi_pairs.length; ii++) {
            if (bi_pairs[ii] < 0) {
                dangling_start++;
            } else {
                break;
            }
        }

        for (ii = bi_pairs.length - 1; ii >= 0; ii--) {
            if (bi_pairs[ii] < 0) {
                dangling_end++;
            } else {
                break;
            }
        }

        /// Array that will be used for scoring
        this._bi_pairs = new Array(bi_pairs.length + 1);
        for (ii = 0; ii < bi_pairs.length; ii++) {
            this._bi_pairs[ii + 1] = bi_pairs[ii] + 1;
        }
        this._bi_pairs[0] = bi_pairs.length;

        if (dangling_start === bi_pairs.length) {
            return;
        }

        this._root = new RNATreeNode;

        for (let jj: number = 0; jj < bi_pairs.length; jj++) {
            if (bi_pairs[jj] >= 0) {
                this.add_nodes_recursive(bi_pairs, this._root, jj, bi_pairs[jj]);
                jj = bi_pairs[jj];
            } else {
                let newsubnode: RNATreeNode = new RNATreeNode;
                newsubnode._is_pair = false;
                newsubnode._index_a = jj;
                this._root._children.push(newsubnode);
            }
        }
    }

    public get_coords(xarray: number[], yarray: number[]): void {
        if (this._root != null) {
            this.get_coords_recursive(this._root, xarray, yarray);
        } else {
            // there is no structure (no pairs)
            if (xarray.length < 3) {
                // really short, just place them in a vertical line
                for (let ii = 0; ii < xarray.length; ii++) {
                    xarray[ii] = 0;
                    yarray[ii] = ii * this._primarySpace;
                }
            } else {
                // if longer, make the sequence form a circle instead
                // FIXME: there's a bit of code duplication here, somewhat inelegant...
                let circle_length: number = (xarray.length + 1) * this._primarySpace + this._pairSpace;
                let circle_radius: number = circle_length / (2 * Math.PI);
                let length_walker: number = this._pairSpace / 2.0;
                let go_x: number = 0;
                let go_y: number = 1;
                let _root_x: number = go_x * circle_radius;
                let _root_y: number = go_y * circle_radius;
                let cross_x: number = -go_y;
                let cross_y: number = go_x;
                let oligo_displacement: number = 0;

                for (let ii = 0; ii < xarray.length; ii++) {
                    if (this._exception_indices != null && this._exception_indices.indexOf(ii) >= 0) {
                        oligo_displacement += 2 * this._primarySpace;
                    }
                }
                circle_length += oligo_displacement;

                for (let ii = 0; ii < xarray.length; ii++) {
                    length_walker += this._primarySpace;
                    if (this._exception_indices != null && this._exception_indices.indexOf(ii) >= 0) {
                        length_walker += 2 * this._primarySpace;
                    }

                    let rad_angle: number = length_walker / circle_length * 2 * Math.PI - Math.PI / 2.0;
                    xarray[ii] = _root_x + Math.cos(rad_angle) * cross_x * circle_radius + Math.sin(rad_angle) * go_x * circle_radius;
                    yarray[ii] = _root_y + Math.cos(rad_angle) * cross_y * circle_radius + Math.sin(rad_angle) * go_y * circle_radius;
                }
            }
        }
    }

    public draw_tree(): void {
        if (this._root != null) {
            this.draw_tree_recursive(this._root, null, 0, 0, 0, 1);
        }
    }

    public get_total_score(): number {
        if (this._root == null) {
            return 0;
        }

        return this.get_total_score_recursive(this._root);
    }

    /// DO NOT remove these _old methods until the new ones (below) are fully validated
    public score_tree_old(seq: number[], folder: Folder): void {
        if (this._bi_pairs == null || seq.length !== (this._bi_pairs.length - 1)) {
            throw new Error("Layout tree is not properly setup for scoring " + this._bi_pairs.length + " " + seq.length);
        }

        if (this._root == null) {
            return;
        }

        let S: number[] = new Array(seq.length + 2);
        S[0] = seq.length;

        for (let ii = 0; ii < seq.length; ii++) {
            S[ii + 1] = seq[ii];
        }

        this.score_tree_recursive_old(S, folder, this._root, null)
    }

    public score_tree(seq: number[], folder: Folder): void {
        if (this._bi_pairs == null) {
            throw new Error("Layout tree is not properly setup for scoring");
        }

        if (this._root == null) {
            return;
        }

        let nnfe: number[] = [];

        folder.scoreStructures(seq, this._orig_pairs, EPars.DEFAULT_TEMPERATURE, nnfe);
        this.score_tree_recursive(nnfe, this._root, null);
    }

    private add_nodes_recursive(bi_pairs: number[], rootnode: RNATreeNode, start_index: number, end_index: number): void {
        if (start_index > end_index) {
            throw new Error("Error occured while drawing RNA");
        }

        let newnode: RNATreeNode;
        if (bi_pairs[start_index] === end_index) {
            newnode = new RNATreeNode;
            newnode._is_pair = true;
            newnode._index_a = start_index;
            newnode._index_b = end_index;

            this.add_nodes_recursive(bi_pairs, newnode, start_index + 1, end_index - 1);

        } else {
            newnode = new RNATreeNode;

            for (let jj = start_index; jj <= end_index; jj++) {
                if (bi_pairs[jj] >= 0) {
                    this.add_nodes_recursive(bi_pairs, newnode, jj, bi_pairs[jj]);
                    jj = bi_pairs[jj];
                } else {
                    let newsubnode: RNATreeNode = new RNATreeNode;
                    newsubnode._is_pair = false;
                    newsubnode._index_a = jj;
                    newnode._children.push(newsubnode);
                }
            }
        }

        rootnode._children.push(newnode);

    }

    private get_coords_recursive(rootnode: RNATreeNode, xarray: number[], yarray: number[]): void {
        if (rootnode._is_pair) {
            let cross_x: number = -rootnode._go_y;
            let cross_y: number = rootnode._go_x;

            xarray[rootnode._index_a] = rootnode._x + cross_x * this._pairSpace / 2.0;
            xarray[rootnode._index_b] = rootnode._x - cross_x * this._pairSpace / 2.0;

            yarray[rootnode._index_a] = rootnode._y + cross_y * this._pairSpace / 2.0;
            yarray[rootnode._index_b] = rootnode._y - cross_y * this._pairSpace / 2.0;
        } else if (rootnode._index_a >= 0) {
            xarray[rootnode._index_a] = rootnode._x;
            yarray[rootnode._index_a] = rootnode._y;
        }

        for (let ii: number = 0; ii < rootnode._children.length; ii++) {
            this.get_coords_recursive(rootnode._children[ii], xarray, yarray);
        }

    }

    private draw_tree_recursive(rootnode: RNATreeNode, parentnode: RNATreeNode, start_x: number, start_y: number, go_x: number, go_y: number): void {
        let cross_x: number = -go_y;
        let cross_y: number = go_x;

        let children_width: number = rootnode._children.length * RNALayout.NODE_R * 2;
        let oligo_displacement: number = 0;

        rootnode._go_x = go_x;
        rootnode._go_y = go_y;

        if (rootnode._children.length === 1) {
            rootnode._x = start_x;
            rootnode._y = start_y;

            if (rootnode._children[0]._is_pair) {
                this.draw_tree_recursive(rootnode._children[0], rootnode, start_x + go_x * this._primarySpace, start_y + go_y * this._primarySpace, go_x, go_y);
            } else if (!rootnode._children[0]._is_pair && rootnode._children[0]._index_a < 0) {
                this.draw_tree_recursive(rootnode._children[0], rootnode, start_x, start_y, go_x, go_y);
            } else {
                this.draw_tree_recursive(rootnode._children[0], rootnode, start_x + go_x * this._primarySpace, start_y + go_y * this._primarySpace, go_x, go_y);
            }
        } else if (rootnode._children.length > 1) {

            let ii: number;
            let npairs: number = 0;
            for (ii = 0; ii < rootnode._children.length; ii++) {
                if (rootnode._children[ii]._is_pair) {
                    npairs++;
                }
                if (this._exception_indices != null && (this._exception_indices.indexOf(rootnode._children[ii]._index_a) >= 0 || this._exception_indices.indexOf(rootnode._children[ii]._index_b) >= 0)) {
                    oligo_displacement += 2 * this._primarySpace;
                }
            }

            let circle_length: number = (rootnode._children.length + 1) * this._primarySpace + (npairs + 1) * this._pairSpace;
            circle_length += oligo_displacement;

            let circle_radius: number = circle_length / (2 * Math.PI);
            let length_walker: number = this._pairSpace / 2.0;

            if (parentnode == null) {
                rootnode._x = go_x * circle_radius;
                rootnode._y = go_y * circle_radius;
            } else {
                rootnode._x = parentnode._x + go_x * circle_radius;
                rootnode._y = parentnode._y + go_y * circle_radius;
            }
            for (ii = 0; ii < rootnode._children.length; ii++) {

                length_walker += this._primarySpace;
                if (this._exception_indices != null && (this._exception_indices.indexOf(rootnode._children[ii]._index_a) >= 0 || this._exception_indices.indexOf(rootnode._children[ii]._index_b) >= 0)) {
                    length_walker += 2 * this._primarySpace;
                }

                if (rootnode._children[ii]._is_pair) {
                    length_walker += this._pairSpace / 2.0;
                }

                let rad_angle: number = length_walker / circle_length * 2 * Math.PI - Math.PI / 2.0;
                let child_x: number = rootnode._x + Math.cos(rad_angle) * cross_x * circle_radius + Math.sin(rad_angle) * go_x * circle_radius;
                let child_y: number = rootnode._y + Math.cos(rad_angle) * cross_y * circle_radius + Math.sin(rad_angle) * go_y * circle_radius;

                let child_go_x: number = child_x - rootnode._x;
                let child_go_y: number = child_y - rootnode._y;
                let child_go_len: number = Math.sqrt(child_go_x * child_go_x + child_go_y * child_go_y);

                this.draw_tree_recursive(rootnode._children[ii], rootnode, child_x, child_y,
                    child_go_x / child_go_len, child_go_y / child_go_len);

                if (rootnode._children[ii]._is_pair) {
                    length_walker += this._pairSpace / 2.0;
                }
            }
        } else {
            rootnode._x = start_x;
            rootnode._y = start_y;
        }

    }

    private get_total_score_recursive(rootnode: RNATreeNode): number {
        let score: number = rootnode._score;
        for (let ii: number = 0; ii < rootnode._children.length; ii++) {
            score += this.get_total_score_recursive(rootnode._children[ii]);
        }
        return score;
    }

    private score_tree_recursive_old(S: number[], folder: Folder, rootnode: RNATreeNode, parentnode: RNATreeNode): void {

        let type1: number, type2: number;

        if (rootnode._is_pair) {
            /// Pair node
            if (rootnode._children.length > 1) {
                throw new Error("Pair node should never have more than one child");
            }

            if (rootnode._children.length === 0) {
                throw new Error("Pair node can't be childless");
            }

            if (rootnode._children[0]._is_pair) {

                type1 = EPars.pair_type(S[rootnode._index_a + 1], S[rootnode._index_b + 1]);
                type2 = EPars.pair_type(S[rootnode._children[0]._index_b + 1], S[rootnode._children[0]._index_a + 1]);
                rootnode._score = folder.loopEnergy(0, 0, type1, type2, S[rootnode._index_a + 1 + 1], S[rootnode._index_b - 1 + 1],
                    S[rootnode._children[0]._index_a + 1 + 1], S[rootnode._children[0]._index_b - 1 + 1], true, true);
            }

            this.score_tree_recursive_old(S, folder, rootnode._children[0], rootnode);

        } else if (!rootnode._is_pair && rootnode._index_a >= 0) {
            /// Single residue node
            return;
        } else {
            /// Virtual node

            /// Top root case
            if (parentnode == null) {
                /// initial ml scoring
                rootnode._score = folder.mlEnergy(this._bi_pairs, S, 0, true);
            } else {
                if (!parentnode._is_pair) {
                    throw new Error("Parent node must be a pair");
                }
            }

            let ii: number;
            let num_stacks: number = 0;
            let first_stack_index: number = -1;

            for (ii = 0; ii < rootnode._children.length; ii++) {
                if (rootnode._children[ii]._is_pair) {
                    num_stacks++;
                    if (first_stack_index < 0) {
                        first_stack_index = ii;
                    }
                } else if (rootnode._children[ii]._index_a < 0) {
                    throw new Error("Virtual node should not have a virtual node child");
                }
            }
            let i: number, j: number, p: number, q: number;

            if (num_stacks === 1 && parentnode != null) {

                i = parentnode._index_a + 1;
                j = parentnode._index_b + 1;
                p = rootnode._children[first_stack_index]._index_a + 1;
                q = rootnode._children[first_stack_index]._index_b + 1;

                type1 = EPars.pair_type(S[i], S[j]);
                type2 = EPars.pair_type(S[q], S[p]);
                rootnode._score = folder.loopEnergy(p - i - 1, j - q - 1, type1, type2, S[i + 1], S[j - 1], S[p - 1], S[q + 1], true, true);

            } else if (num_stacks === 0) {
                i = parentnode._index_a + 1;
                j = parentnode._index_b + 1;

                let type: number = EPars.pair_type(S[i], S[j]);
                rootnode._score = folder.hairpinEnergy(j - i - 1, type, S[i + 1], S[j - 1], S, i, j);
            } else if (num_stacks > 1 && parentnode != null) {

                i = parentnode._index_a + 1;
                let cuti: number = folder.cutInLoop(i);
                rootnode._score = (cuti === 0) ? folder.mlEnergy(this._bi_pairs, S, i, false) : folder.mlEnergy(this._bi_pairs, S, cuti, true);
            }

            for (ii = 0; ii < rootnode._children.length; ii++) {
                this.score_tree_recursive_old(S, folder, rootnode._children[ii], rootnode);
            }

        }

    }

    private score_tree_recursive(nnfe: number[], rootnode: RNATreeNode, parentnode: RNATreeNode): void {

        if (rootnode._is_pair) {
            /// Pair node
            if (rootnode._children.length > 1) {
                throw new Error("Pair node should never have more than one child");
            }

            if (rootnode._children.length === 0) {
                throw new Error("Pair node can't be childless");
            }

            if (rootnode._children[0]._is_pair) {
                rootnode._score = RNALayout.lookup_fe(nnfe, rootnode._index_a);
            }

            this.score_tree_recursive(nnfe, rootnode._children[0], rootnode);

        } else if (!rootnode._is_pair && rootnode._index_a >= 0) {
            /// Single residue node
            return;

        } else {
            /// Virtual node

            /// Top root case
            if (parentnode == null) {
                /// initial ml scoring
                rootnode._score = RNALayout.lookup_fe(nnfe, -1);
            } else {
                if (!parentnode._is_pair) {
                    throw new Error("Parent node must be a pair");
                }
            }

            let ii: number;
            let num_stacks: number = 0;
            let first_stack_index: number = -1;

            for (ii = 0; ii < rootnode._children.length; ii++) {
                if (rootnode._children[ii]._is_pair) {
                    num_stacks++;
                    if (first_stack_index < 0) {
                        first_stack_index = ii;
                    }
                } else if (rootnode._children[ii]._index_a < 0) {
                    throw new Error("Virtual node should not have a virtual node child");
                }
            }
            let i: number, j: number, p: number, q: number;

            if (num_stacks === 1 && parentnode != null) {
                rootnode._score = RNALayout.lookup_fe(nnfe, parentnode._index_a);
            } else if (num_stacks === 0) {
                rootnode._score = RNALayout.lookup_fe(nnfe, parentnode._index_a);
            } else if (num_stacks > 1 && parentnode != null) {
                rootnode._score = RNALayout.lookup_fe(nnfe, parentnode._index_a);
            }

            for (ii = 0; ii < rootnode._children.length; ii++) {
                this.score_tree_recursive(nnfe, rootnode._children[ii], rootnode);
            }
        }
    }

    /// FIXME: there's surely a smarter way to do this...
    private static lookup_fe(nnfe: number[], index: number): number {
        for (let ii: number = 0; ii < nnfe.length - 1; ii += 2) {
            if (nnfe[ii] === index) return nnfe[ii + 1];
        }
        return 0;
    }

    private readonly _primarySpace: number;
    private readonly _pairSpace: number;

    private _root: RNATreeNode;
    private _orig_pairs: number[];

    /// "New" method to gather NN free energies, just use the folding engine
    private _bi_pairs: number[];
    //indices that need to be streched (e.g., connectors for oligos)
    private _exception_indices: number[];

    private static readonly NODE_R: number = 10;
}
