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

    public flipSign: number = 1; // 1 or -1 for counterclockwise or clockwise
}

// The RNATree has a node for each unpaired base, each base pair, and each junction tracing a sort
//   of 'skeleton' through the layout.                  
//
//      5   4             
//      x   x
//       \ /     3      2      1  
// 6 x<-- x <--  x <--- x <--- x <--- x [root]
//       / \    10     11     12     / \     
//      x   x                       x   x     
//      7   8                      14   15
//
//      x = RNATreeNode
//
// * Root of tree is in the most exterior junction
// * Root node does not have indexA or indexB defined! It is centered at 0,0.
// * For each pair node, isPair = true, indexA and indexB are defined, and x,y center is at midpoint of two pairs.
// * For each  junction,  x,y center is at center of circle.
// * For each unpaired base node, center is at actual plot position.
// * Default rendering assumes path of RNA is counter-clockwise, different from most other codebases! 
//
//       (goX,goY)         is unit vector  pointing in 'direction' from previous node into current node. 
//       (crossX, crossY)  appears below as an orthogonal unit vector. For a base pair node, it points
//                              from the higher-number base to the lower-number base (consistent with 
//                              counterclockwise rendering)
//                 
// * Above rendering can be overridden by customLayout, an array of x,y positions that makes the RNA junctions  
//      look 'nice' perhaps echoing the 3D structure of the RNA. (a.k.a., "2.5D" layout). This customLayout
//      is applied to junctions that match the target structure (encoded in targetPairs). Note that
//      if the customLayout has clockwise helices in parts, that will override counterclockwise rendering of
//      any helices that are daughters through the flipSign variable (-1 for clockwise, +1 for counterclockwise)                     
//
// TODO: The recursions below copy some code, unfortunately.
// TODO: Its probably not necessary for user to initialize, drawTree, and getCoords separately -- these aren't really 
//           operations that are useful in separate chunks.
//        
//    -- rhiju, 2019, reviewing/updating code that was written ages ago by someone else.
//
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

    public setupTree(pairs: number[], targetPairs : number[]): void {
        let ii: number;
        let bi_pairs: number[] = new Array(pairs.length);

        /// Delete old tree
        this._root = null;
        /// save for later
        this._origPairs = pairs.slice();
        this._targetPairs = targetPairs;

        /// bi_pairs is 'symmetrized'. Like pairs,
        ///   an array the same length as RNA
        ///   with -1 for unpaired bases, and
        ///   with the partner number for each paired base.
        for (ii = 0; ii < pairs.length; ii++) {
            bi_pairs[ii] = -1;
        }

        for (ii = 0; ii < pairs.length; ii++) {
            if (ii < pairs[ii]) {
                bi_pairs[ii] = pairs[ii];
                bi_pairs[pairs[ii]] = ii;
            }
        }

        /// Array that will be used for scoring
        /// Shifts so that
        this._biPairs = new Array(bi_pairs.length + 1);
        for (ii = 0; ii < bi_pairs.length; ii++) {
            this._biPairs[ii + 1] = bi_pairs[ii] + 1;
        }
        this._biPairs[0] = bi_pairs.length;

        /// no tree if there are no pairs -- special case to be handled
        ///  separately in getCoords.
        let foundPair: boolean = false;
        for (ii = 0; ii < bi_pairs.length; ii++) {
            if (bi_pairs[ii] >= 0) {
                foundPair = true;
                break;
            }
        }
        if (!foundPair) {
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
                //   This should be easy to unify, but why is circle_radius not updated along with circle_length?
                //    Need to think through an oligo case carefully -- rhiju
                let circle_length: number = (xarray.length + 1) * this._primarySpace + this._pairSpace;
                let circle_radius: number = circle_length / (2 * Math.PI);
                let oligo_displacement: number = 0;
                for (let ii = 0; ii < xarray.length; ii++) {
                    if (this._exceptionIndices != null && this._exceptionIndices.indexOf(ii) >= 0) {
                        oligo_displacement += 2 * this._primarySpace;
                    }
                }
                circle_length += oligo_displacement;

                let length_walker: number = this._pairSpace / 2.0;
                let go_x: number = 0;
                let go_y: number = 1;
                let _root_x: number = go_x * circle_radius;
                let _root_y: number = go_y * circle_radius;
                let cross_x: number = -go_y;
                let cross_y: number = go_x;
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

    public drawTree( customLayout : Array<[number,number]> ): void {
        this._customLayout = customLayout;
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

        if (this._customLayout && this.junctionMatchesTarget(rootnode, parentnode)) {
            this.drawTreeCustomLayout(rootnode, parentnode, start_x, start_y, go_x, go_y);
            return;
        }
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
        } else {
            rootnode.x = start_x;
            rootnode.y = start_y;
        }

    }

    private drawTreeCustomLayout(rootnode: RNATreeNode, parentnode: RNATreeNode, start_x: number, start_y: number, go_x: number, go_y: number): void {
        let ii: number;
        let cross_x: number = -go_y;
        let cross_y: number = go_x;

        rootnode.x = start_x;
        rootnode.y = start_y;
        let anchor_x: number = 0;
        let anchor_y: number = 0;
        let anchor_custom_x: number = 0;
        let anchor_custom_y: number = 0;
        let anchor_custom_go_x: number = 0;
        let anchor_custom_go_y: number = 1;
        let anchor_custom_cross_x: number = -1;
        let anchor_custom_cross_y: number = 0;
        let anchor_defined : boolean = false;

        if (parentnode && parentnode.isPair) {
            // this is the case in junctions, where root is 'pseudonode' in middle of junction, 
            //  and parent is the exterior pair (or the global root)
            anchor_x = parentnode.x;
            anchor_y = parentnode.y;
            let custom_coordA: [number, number] = this._customLayout[parentnode.indexA]
            let custom_coordB: [number, number] = this._customLayout[parentnode.indexB]
            anchor_custom_x = (custom_coordA[0] + custom_coordB[0]) / 2;
            anchor_custom_y = (custom_coordA[1] + custom_coordB[1]) / 2;
            anchor_custom_cross_x = (custom_coordA[0] - custom_coordB[0]);
            anchor_custom_cross_y = (custom_coordA[1] - custom_coordB[1]);
            anchor_custom_go_x = anchor_custom_cross_y;
            anchor_custom_go_y = -anchor_custom_cross_x;
            anchor_defined = true;
        } else if ( rootnode && rootnode.isPair ) {
            // this can be the case in stacked pairs.
            anchor_x = rootnode.x;
            anchor_y = rootnode.y;
            let custom_coordA: [number, number] = this._customLayout[rootnode.indexA]
            let custom_coordB: [number, number] = this._customLayout[rootnode.indexB]
            anchor_custom_x = (custom_coordA[0] + custom_coordB[0]) / 2;
            anchor_custom_y = (custom_coordA[1] + custom_coordB[1]) / 2;
            anchor_custom_cross_x = (custom_coordA[0] - custom_coordB[0]);
            anchor_custom_cross_y = (custom_coordA[1] - custom_coordB[1]);
            anchor_custom_go_x = anchor_custom_cross_y;
            anchor_custom_go_y = -anchor_custom_cross_x;        
            anchor_defined = true;
        }
        for (ii = 0; ii < rootnode.children.length; ii++) {
            // read out where this point should be based on 'this._customLayout'. get coordinates in 
            // "local coordinate frame" set by parent pair in this._customLayout. 
            // This would be a lot easier to read if we had a notion of an (x,y) pair, dot products, and cross products.
            let custom_coord: [number, number] = this._customLayout[rootnode.children[ii].indexA].slice();
            if (rootnode.children[ii].isPair) {
                let custom_coordA: [number, number] = this._customLayout[rootnode.children[ii].indexA];
                let custom_coordB: [number, number] = this._customLayout[rootnode.children[ii].indexB];
                custom_coord[0] = (custom_coordA[0] + custom_coordB[0]) / 2;
                custom_coord[1] = (custom_coordA[1] + custom_coordB[1]) / 2;
            }

            let child_x: number = 0.0;
            let child_y: number = 0.0;
            let child_go_x: number = 0.0;
            let child_go_y: number = 0.0;
            child_x = custom_coord[0] * this._primarySpace;
            child_y = custom_coord[1] * this._primarySpace;
            if (anchor_defined) {
                let dev_x: number = custom_coord[0] - anchor_custom_x;
                let dev_y: number = custom_coord[1] - anchor_custom_y;
                let template_x: number = dev_x * anchor_custom_cross_x + dev_y * anchor_custom_cross_y;
                let template_y: number = dev_x * anchor_custom_go_x + dev_y * anchor_custom_go_y;
                template_x *= this._primarySpace;
                template_y *= this._primarySpace;
                // go to Eterna RNALayout global frame.
                child_x = anchor_x + cross_x * template_x + go_x * template_y;
                child_y = anchor_y + cross_y * template_x + go_y * template_y;
            }

            if (rootnode.children[ii].isPair) {
                let custom_coordA: [number, number] = this._customLayout[rootnode.children[ii].indexA];
                let custom_coordB: [number, number] = this._customLayout[rootnode.children[ii].indexB];
                let custom_cross_x: number = (custom_coordA[0] - custom_coordB[0]);
                let custom_cross_y: number = (custom_coordA[1] - custom_coordB[1]);
                let custom_go_x: number = custom_cross_y;
                let custom_go_y: number = -custom_cross_x;

                child_go_x = custom_go_x;
                child_go_y = custom_go_y;
                if (anchor_defined) {
                    let template_go_x = custom_go_x * anchor_custom_cross_x + custom_go_y * anchor_custom_cross_y;
                    let template_go_y = custom_go_x * anchor_custom_go_x + custom_go_y * anchor_custom_go_y;
                    child_go_x = cross_x * template_go_x + go_x * template_go_y;
                    child_go_y = cross_y * template_go_x + go_y * template_go_y;
                }
            }
            let child_go_len: number = Math.sqrt(child_go_x * child_go_x + child_go_y * child_go_y);

            this.drawTreeRecursive(rootnode.children[ii], rootnode, child_x, child_y,
                child_go_x / child_go_len, child_go_y / child_go_len);
        }
    }

    private getTotalScoreRecursive(rootnode: RNATreeNode): number {
        let score: number = rootnode.score;
        for (let ii: number = 0; ii < rootnode.children.length; ii++) {
            score += this.getTotalScoreRecursive(rootnode.children[ii]);
        }
        return score;
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

    private junctionMatchesTarget( rootnode : RNATreeNode, parentnode : RNATreeNode ) : boolean {
        if (this._targetPairs == null) return false;

        if (parentnode && parentnode.isPair) {
            // is initial pair of junction paired in target structure?
            if (this._targetPairs[parentnode.indexA] != parentnode.indexB) {
                return false;
            }
        }
        if (rootnode.children.length == 1 && rootnode.children[0].indexA < 0 ) return false;

        for ( let ii : number = 0; ii < rootnode.children.length; ii++) {
            if (rootnode.children[ii].isPair) {
                // all other pairs of junction paired in target structure?
                if (this._targetPairs[rootnode.children[ii].indexA] != rootnode.children[ii].indexB) {
                    return false;
                }
            } else {
                // all unpaired bases of junction also unpaired in target structure?
                if (this._targetPairs[rootnode.children[ii].indexA] > 0) {
                   return false;
                }
            }
        }

        return true;
    }

    private readonly _primarySpace: number;
    private readonly _pairSpace: number;
    // indices that need to be streched (e.g., connectors for oligos)
    private readonly _exceptionIndices: number[];

    private _root: RNATreeNode;
    private _origPairs: number[];
    private _targetPairs: number[];
    private _customLayout: Array<[number, number]>;

    /// "New" method to gather NN free energies, just use the folding engine
    private _biPairs: number[];

    private static readonly NODE_R = 10;
}
