import {EPars} from "../EPars";
import {Folder} from "../folding/Folder";
import { Assert } from "../../flashbang/util/Assert";

export class RNATreeNode {
    public isPair: boolean = false;
    public children: RNATreeNode[] = [];

    public indexA: number = -1;
    public indexB: number = -1;

    public score: number = 0;

    public x: number = 0;
    public y: number = 0;

    public goX: number = 0;
    public goY: number = 0;
}

export class RNALayout {
    public constructor(primSpace: number = 45, pairSpace: number = 45, exceptionIndices: number[] = null) {
        this._primarySpace = primSpace;
        this._pairSpace = pairSpace;
        if (exceptionIndices != null) {
            this._exceptionIndices = exceptionIndices.slice();
        }
    }

    public get root(): RNATreeNode {
        return this._root;
    }

    public setupTree(pairs: number[]): void {
        let dangling_start: number = 0;
        let dangling_end: number = 0;
        let ii: number;
        let bi_pairs: number[] = new Array(pairs.length);

        /// Delete old tree
        this._root = null;
        /// save for later
        this._origPairs = pairs.slice();

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

        // is dangling_end used for anything? -- rhiju
        for (ii = bi_pairs.length - 1; ii >= 0; ii--) {
            if (bi_pairs[ii] < 0) {
                dangling_end++;
            } else {
                break;
            }
        }

        /// Array that will be used for scoring
        this._biPairs = new Array(bi_pairs.length + 1);
        for (ii = 0; ii < bi_pairs.length; ii++) {
            this._biPairs[ii + 1] = bi_pairs[ii] + 1;
        }
        this._biPairs[0] = bi_pairs.length;

        if (dangling_start === bi_pairs.length) {
            return;
        }

        this._root = new RNATreeNode;

        for (let jj: number = 0; jj < bi_pairs.length; jj++) {
            if (bi_pairs[jj] >= 0) {
                this.addNodesRecursive(bi_pairs, this._root, jj, bi_pairs[jj]);
                jj = bi_pairs[jj];
            } else {
                let newsubnode: RNATreeNode = new RNATreeNode;
                newsubnode.isPair = false;
                newsubnode.indexA = jj;
                this._root.children.push(newsubnode);
            }
        }
    }

    public getCoords(xarray: number[], yarray: number[]): void {
        if (this._root != null) {
            this.getCoordsRecursive(this._root, xarray, yarray);
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
                    if (this._exceptionIndices != null && this._exceptionIndices.indexOf(ii) >= 0) {
                        oligo_displacement += 2 * this._primarySpace;
                    }
                }
                circle_length += oligo_displacement;

                for (let ii = 0; ii < xarray.length; ii++) {
                    length_walker += this._primarySpace;
                    if (this._exceptionIndices != null && this._exceptionIndices.indexOf(ii) >= 0) {
                        length_walker += 2 * this._primarySpace;
                    }

                    let rad_angle: number = length_walker / circle_length * 2 * Math.PI - Math.PI / 2.0;
                    xarray[ii] = _root_x + Math.cos(rad_angle) * cross_x * circle_radius + Math.sin(rad_angle) * go_x * circle_radius;
                    yarray[ii] = _root_y + Math.cos(rad_angle) * cross_y * circle_radius + Math.sin(rad_angle) * go_y * circle_radius;
                }
            }
        }
    }

    public drawTree(): void {
        if (this._root != null) {
            this.drawTreeRecursive(this._root, null, 0, 0, 0, 1);
        }
    }

    public get totalScore(): number {
        if (this._root == null) {
            return 0;
        }

        return this.getTotalScoreRecursive(this._root);
    }

    /// DO NOT remove these _old methods until the new ones (below) are fully validated
    public scoreTreeOld(seq: number[], folder: Folder): void {
        if (this._biPairs == null || seq.length !== (this._biPairs.length - 1)) {
            throw new Error("Layout tree is not properly setup for scoring " + this._biPairs.length + " " + seq.length);
        }

        if (this._root == null) {
            return;
        }

        let S: number[] = new Array(seq.length + 2);
        S[0] = seq.length;

        for (let ii = 0; ii < seq.length; ii++) {
            S[ii + 1] = seq[ii];
        }

        this.scoreTreeRecursiveOld(S, folder, this._root, null)
    }

    public scoreTree(seq: number[], folder: Folder): void {
        if (this._biPairs == null) {
            throw new Error("Layout tree is not properly setup for scoring");
        }

        if (this._root == null) {
            return;
        }

        let nnfe: number[] = [];

        folder.scoreStructures(seq, this._origPairs, EPars.DEFAULT_TEMPERATURE, nnfe);
        this.scoreTreeRecursive(nnfe, this._root, null);
    }

    private addNodesRecursive(bi_pairs: number[], rootnode: RNATreeNode, start_index: number, end_index: number): void {
        if (start_index > end_index) {
            throw new Error("Error occured while drawing RNA");
        }

        let newnode: RNATreeNode;
        if (bi_pairs[start_index] === end_index) {
            newnode = new RNATreeNode;
            newnode.isPair = true;
            newnode.indexA = start_index;
            newnode.indexB = end_index;

            this.addNodesRecursive(bi_pairs, newnode, start_index + 1, end_index - 1);

        } else {
            newnode = new RNATreeNode;

            for (let jj = start_index; jj <= end_index; jj++) {
                if (bi_pairs[jj] >= 0) {
                    this.addNodesRecursive(bi_pairs, newnode, jj, bi_pairs[jj]);
                    jj = bi_pairs[jj];
                } else {
                    let newsubnode: RNATreeNode = new RNATreeNode;
                    newsubnode.isPair = false;
                    newsubnode.indexA = jj;
                    newnode.children.push(newsubnode);
                }
            }
        }

        rootnode.children.push(newnode);

    }

    private getCoordsRecursive(rootnode: RNATreeNode, xarray: number[], yarray: number[]): void {
        if (rootnode.isPair) {
            let cross_x: number = -rootnode.goY;
            let cross_y: number = rootnode.goX;

            xarray[rootnode.indexA] = rootnode.x + cross_x * this._pairSpace / 2.0;
            xarray[rootnode.indexB] = rootnode.x - cross_x * this._pairSpace / 2.0;

            yarray[rootnode.indexA] = rootnode.y + cross_y * this._pairSpace / 2.0;
            yarray[rootnode.indexB] = rootnode.y - cross_y * this._pairSpace / 2.0;
        } else if (rootnode.indexA >= 0) {
            xarray[rootnode.indexA] = rootnode.x;
            yarray[rootnode.indexA] = rootnode.y;
        }

        for (let ii: number = 0; ii < rootnode.children.length; ii++) {
            this.getCoordsRecursive(rootnode.children[ii], xarray, yarray);
        }

    }

    private drawTreeRecursive(rootnode: RNATreeNode, parentnode: RNATreeNode, start_x: number, start_y: number, go_x: number, go_y: number): void {
        let cross_x: number = -go_y;
        let cross_y: number = go_x;

        let oligo_displacement: number = 0;

        rootnode.goX = go_x;
        rootnode.goY = go_y;

        if (rootnode.children.length === 1) {
            rootnode.x = start_x;
            rootnode.y = start_y;

            if (rootnode.children[0].isPair) {
                this.drawTreeRecursive(rootnode.children[0], rootnode, start_x + go_x * this._primarySpace, start_y + go_y * this._primarySpace, go_x, go_y);
            } else if (!rootnode.children[0].isPair && rootnode.children[0].indexA < 0) {
                this.drawTreeRecursive(rootnode.children[0], rootnode, start_x, start_y, go_x, go_y);
            } else {
                this.drawTreeRecursive(rootnode.children[0], rootnode, start_x + go_x * this._primarySpace, start_y + go_y * this._primarySpace, go_x, go_y);
            }
        } else if (rootnode.children.length > 1) {

            let ii: number;
            let npairs: number = 0;
            for (ii = 0; ii < rootnode.children.length; ii++) {
                if (rootnode.children[ii].isPair) {
                    npairs++;
                }
                if (this._exceptionIndices != null && (this._exceptionIndices.indexOf(rootnode.children[ii].indexA) >= 0 || this._exceptionIndices.indexOf(rootnode.children[ii].indexB) >= 0)) {
                    oligo_displacement += 2 * this._primarySpace;
                }
            }

            let circle_length: number = (rootnode.children.length + 1) * this._primarySpace + (npairs + 1) * this._pairSpace;
            circle_length += oligo_displacement;
            let circle_radius: number = circle_length / (2 * Math.PI);
            let length_walker: number = this._pairSpace / 2.0;

            // TODO. pre-identify any junctions that are 'special cases'. This is hardwired in for puzzle 9386151 in dev server. (1L2X pseudoknot)
            let special_case: boolean = ( ( (parentnode) && (parentnode.indexA == 6) && (rootnode.children.length == 6) ) || (parentnode == null) && (rootnode.children.length == 13) );
            
            if ( special_case ) {
                // TODO. read this in via puzzle JSON
                let native_layout : Array[[number,number]] = [[1.349030,1.182363], [1.349030,2.182363], [1.849030,3.182363], [1.849030,4.182363], [1.849030,5.182363], [1.849030,6.182363], [1.849030,7.182363], [1.182363,9.099030], [2.432363,11.099030], [3.932363,11.099030], [3.932363,10.099030], [3.932363,9.099030], [3.432363,8.099030], [2.849030,7.182363], [2.849030,6.182363], [2.849030,5.182363], [2.849030,4.182363], [2.849030,3.182363], [4.182363,2.349030], [5.182363,2.849030], [5.682363,3.849030], [5.682363,5.099030], [5.682363,6.099030], [5.432363,7.099030], [5.432363,8.099030], [4.932363,9.099030], [4.932363,10.099030], [4.932363,11.099030]];            
                rootnode.x = 0;
                rootnode.y = 0;
                let parent_native_x : number = 0;
                let parent_native_y : number = 0;
                let parent_native_go_x : number = 0;
                let parent_native_go_y : number = 1;
                let parent_native_cross_x : number = -1;
                let parent_native_cross_y : number = 0;
                if (parentnode && parentnode.isPair ) {
                    rootnode.x = parentnode.x;
                    rootnode.y = parentnode.y;
                    let native_coordA : [number,number] = native_layout[ parentnode.indexA ]
                    let native_coordB : [number,number] = native_layout[ parentnode.indexB ]
                    parent_native_x = ( native_coordA[ 0 ] + native_coordB[ 0 ] ) / 2;
                    parent_native_y = ( native_coordA[ 1 ] + native_coordB[ 1 ] ) / 2;
                    parent_native_cross_x = ( native_coordA[ 0 ] - native_coordB[ 0 ] );
                    parent_native_cross_y = ( native_coordA[ 1 ] - native_coordB[ 1 ] );
                    parent_native_go_x = parent_native_cross_y;
                    parent_native_go_y = -parent_native_cross_x;
                }
                for (ii = 0; ii < rootnode.children.length; ii++) {
                    // read out where this point should be based on 'native_layout'. get coordinates in 
                    // "local coordinate frame" set by parent pair in native_layout. 
                    // This would be a lot easier to read if we had a notion of an (x,y) pair, dot products, and cross products.
                    let native_coord : [number,number] = native_layout[ rootnode.children[ii].indexA ];
                    if ( rootnode.children[ii].isPair ) {
                        let native_coordA : [number,number] = native_layout[ rootnode.children[ii].indexA ];
                        let native_coordB : [number,number] = native_layout[ rootnode.children[ii].indexB ];
                        native_coord[ 0 ] = ( native_coordA[ 0 ] + native_coordB[ 0 ] ) / 2;
                        native_coord[ 1 ] = ( native_coordA[ 1 ] + native_coordB[ 1 ] ) / 2;
                    }

                    let dev_x : number = native_coord[0] - parent_native_x;
                    let dev_y : number = native_coord[1] - parent_native_y;
                    let template_x : number = dev_x * parent_native_cross_x + dev_y * parent_native_cross_y;
                    let template_y : number = dev_x * parent_native_go_x + dev_y * parent_native_go_y;
                    template_x *= this._primarySpace;
                    template_y *= this._primarySpace;

                    // go to Eterna RNALayout global frame.
                    let child_x : number = rootnode.x + cross_x * template_x + go_x * template_y;                    
                    let child_y : number = rootnode.y + cross_y * template_x + go_y * template_y;
                    let child_go_x: number = 0;
                    let child_go_y: number = 1;
                    if ( rootnode.children[ii].isPair ) {
                        let native_coordA : [number,number] = native_layout[ rootnode.children[ii].indexA ];
                        let native_coordB : [number,number] = native_layout[ rootnode.children[ii].indexB ];
                        let native_cross_x : number = ( native_coordA[ 0 ] - native_coordB[ 0 ] );
                        let native_cross_y : number = ( native_coordA[ 1 ] - native_coordB[ 1 ] );
                        let native_go_x : number = native_cross_y;
                        let native_go_y : number = -native_cross_x;
                        child_go_x = native_go_x * parent_native_cross_x + native_go_y * parent_native_cross_y;
                        child_go_y = native_go_x * parent_native_go_x    + native_go_y * parent_native_go_y;
                    }
                    let child_go_len: number = Math.sqrt(child_go_x * child_go_x + child_go_y * child_go_y);

                    this.drawTreeRecursive(rootnode.children[ii], rootnode, child_x, child_y,
                        child_go_x / child_go_len, child_go_y / child_go_len);

                }
            } else {
                if (parentnode == null) {
                    rootnode.x = go_x * circle_radius;
                    rootnode.y = go_y * circle_radius;
                } else {
                    rootnode.x = parentnode.x + go_x * circle_radius;
                    rootnode.y = parentnode.y + go_y * circle_radius;
                }

                for (ii = 0; ii < rootnode.children.length; ii++) {

                    length_walker += this._primarySpace;
                    if (this._exceptionIndices != null && (this._exceptionIndices.indexOf(rootnode.children[ii].indexA) >= 0 || this._exceptionIndices.indexOf(rootnode.children[ii].indexB) >= 0)) {
                        length_walker += 2 * this._primarySpace;
                    }

                    if (rootnode.children[ii].isPair) {
                        length_walker += this._pairSpace / 2.0;
                    }

                    let rad_angle: number = length_walker / circle_length * 2 * Math.PI - Math.PI / 2.0;
                    let child_x: number = rootnode.x + Math.cos(rad_angle) * cross_x * circle_radius + Math.sin(rad_angle) * go_x * circle_radius;
                    let child_y: number = rootnode.y + Math.cos(rad_angle) * cross_y * circle_radius + Math.sin(rad_angle) * go_y * circle_radius;

                    let child_go_x: number = child_x - rootnode.x;
                    let child_go_y: number = child_y - rootnode.y;
                    let child_go_len: number = Math.sqrt(child_go_x * child_go_x + child_go_y * child_go_y);

                    this.drawTreeRecursive(rootnode.children[ii], rootnode, child_x, child_y,
                        child_go_x / child_go_len, child_go_y / child_go_len);

                    if (rootnode.children[ii].isPair) {
                        length_walker += this._pairSpace / 2.0;
                    }
                }
            }
        } else {
            rootnode.x = start_x;
            rootnode.y = start_y;
        }

    }

    private getTotalScoreRecursive(rootnode: RNATreeNode): number {
        let score: number = rootnode.score;
        for (let ii: number = 0; ii < rootnode.children.length; ii++) {
            score += this.getTotalScoreRecursive(rootnode.children[ii]);
        }
        return score;
    }

    private scoreTreeRecursiveOld(S: number[], folder: Folder, rootnode: RNATreeNode, parentnode: RNATreeNode): void {

        let type1: number, type2: number;

        if (rootnode.isPair) {
            /// Pair node
            if (rootnode.children.length > 1) {
                throw new Error("Pair node should never have more than one child");
            }

            if (rootnode.children.length === 0) {
                throw new Error("Pair node can't be childless");
            }

            if (rootnode.children[0].isPair) {

                type1 = EPars.pairType(S[rootnode.indexA + 1], S[rootnode.indexB + 1]);
                type2 = EPars.pairType(S[rootnode.children[0].indexB + 1], S[rootnode.children[0].indexA + 1]);
                rootnode.score = folder.loopEnergy(0, 0, type1, type2, S[rootnode.indexA + 1 + 1], S[rootnode.indexB - 1 + 1],
                    S[rootnode.children[0].indexA + 1 + 1], S[rootnode.children[0].indexB - 1 + 1], true, true);
            }

            this.scoreTreeRecursiveOld(S, folder, rootnode.children[0], rootnode);

        } else if (!rootnode.isPair && rootnode.indexA >= 0) {
            /// Single residue node
            return;
        } else {
            /// Virtual node

            /// Top root case
            if (parentnode == null) {
                /// initial ml scoring
                rootnode.score = folder.mlEnergy(this._biPairs, S, 0, true);
            } else {
                if (!parentnode.isPair) {
                    throw new Error("Parent node must be a pair");
                }
            }

            let ii: number;
            let num_stacks: number = 0;
            let first_stack_index: number = -1;

            for (ii = 0; ii < rootnode.children.length; ii++) {
                if (rootnode.children[ii].isPair) {
                    num_stacks++;
                    if (first_stack_index < 0) {
                        first_stack_index = ii;
                    }
                } else if (rootnode.children[ii].indexA < 0) {
                    throw new Error("Virtual node should not have a virtual node child");
                }
            }
            let i: number, j: number, p: number, q: number;

            if (num_stacks === 1 && parentnode != null) {

                i = parentnode.indexA + 1;
                j = parentnode.indexB + 1;
                p = rootnode.children[first_stack_index].indexA + 1;
                q = rootnode.children[first_stack_index].indexB + 1;

                type1 = EPars.pairType(S[i], S[j]);
                type2 = EPars.pairType(S[q], S[p]);
                rootnode.score = folder.loopEnergy(p - i - 1, j - q - 1, type1, type2, S[i + 1], S[j - 1], S[p - 1], S[q + 1], true, true);

            } else if (num_stacks === 0) {
                i = parentnode.indexA + 1;
                j = parentnode.indexB + 1;

                let type: number = EPars.pairType(S[i], S[j]);
                rootnode.score = folder.hairpinEnergy(j - i - 1, type, S[i + 1], S[j - 1], S, i, j);
            } else if (num_stacks > 1 && parentnode != null) {

                i = parentnode.indexA + 1;
                let cuti: number = folder.cutInLoop(i);
                rootnode.score = (cuti === 0) ? folder.mlEnergy(this._biPairs, S, i, false) : folder.mlEnergy(this._biPairs, S, cuti, true);
            }

            for (ii = 0; ii < rootnode.children.length; ii++) {
                this.scoreTreeRecursiveOld(S, folder, rootnode.children[ii], rootnode);
            }

        }

    }

    private scoreTreeRecursive(nnfe: number[], rootnode: RNATreeNode, parentnode: RNATreeNode): void {
        if (rootnode.isPair) {
            /// Pair node
            if (rootnode.children.length > 1) {
                throw new Error("Pair node should never have more than one child");
            }

            if (rootnode.children.length === 0) {
                throw new Error("Pair node can't be childless");
            }

            if (rootnode.children[0].isPair) {
                rootnode.score = RNALayout.lookupFe(nnfe, rootnode.indexA);
            }

            this.scoreTreeRecursive(nnfe, rootnode.children[0], rootnode);

        } else if (!rootnode.isPair && rootnode.indexA >= 0) {
            /// Single residue node
            return;

        } else {
            /// Virtual node

            /// Top root case
            if (parentnode == null) {
                /// initial ml scoring
                rootnode.score = RNALayout.lookupFe(nnfe, -1);
            } else {
                if (!parentnode.isPair) {
                    throw new Error("Parent node must be a pair");
                }
            }

            let ii: number;
            let num_stacks: number = 0;
            let first_stack_index: number = -1;

            for (ii = 0; ii < rootnode.children.length; ii++) {
                if (rootnode.children[ii].isPair) {
                    num_stacks++;
                    if (first_stack_index < 0) {
                        first_stack_index = ii;
                    }
                } else if (rootnode.children[ii].indexA < 0) {
                    throw new Error("Virtual node should not have a virtual node child");
                }
            }
            let i: number, j: number, p: number, q: number;

            if (num_stacks === 1 && parentnode != null) {
                rootnode.score = RNALayout.lookupFe(nnfe, parentnode.indexA);
            } else if (num_stacks === 0) {
                rootnode.score = RNALayout.lookupFe(nnfe, parentnode.indexA);
            } else if (num_stacks > 1 && parentnode != null) {
                rootnode.score = RNALayout.lookupFe(nnfe, parentnode.indexA);
            }

            for (ii = 0; ii < rootnode.children.length; ii++) {
                this.scoreTreeRecursive(nnfe, rootnode.children[ii], rootnode);
            }
        }
    }

    /// FIXME: there's surely a smarter way to do this...
    private static lookupFe(nnfe: number[], index: number): number {
        for (let ii: number = 0; ii < nnfe.length - 1; ii += 2) {
            if (nnfe[ii] === index) return nnfe[ii + 1];
        }
        return 0;
    }

    private readonly _primarySpace: number;
    private readonly _pairSpace: number;
    // indices that need to be streched (e.g., connectors for oligos)
    private readonly _exceptionIndices: number[];

    private _root: RNATreeNode;
    private _origPairs: number[];

    /// "New" method to gather NN free energies, just use the folding engine
    private _biPairs: number[];

    private static readonly NODE_R = 10;
}
