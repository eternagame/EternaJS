import EPars from 'eterna/EPars';
import Folder from 'eterna/folding/Folder';

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
export default class RNALayout {
    constructor(primSpace: number = 45, pairSpace: number = 45, exceptionIndices: number[] = null) {
        this._primarySpace = primSpace;
        this._pairSpace = pairSpace;
        if (exceptionIndices != null) {
            this._exceptionIndices = exceptionIndices.slice();
        }
    }

    public get root(): RNATreeNode {
        return this._root;
    }

    public setupTree(pairs: number[], targetPairs: number[] = null): void {
        let ii: number;
        let biPairs: number[] = new Array(pairs.length);

        // / Delete old tree
        this._root = null;
        // / save for later
        this._origPairs = pairs.slice();
        this._targetPairs = targetPairs;

        // / biPairs is 'symmetrized'. Like pairs,
        // /   an array the same length as RNA
        // /   with -1 for unpaired bases, and
        // /   with the partner number for each paired base.
        for (ii = 0; ii < pairs.length; ii++) {
            biPairs[ii] = -1;
        }

        for (ii = 0; ii < pairs.length; ii++) {
            if (ii < pairs[ii]) {
                biPairs[ii] = pairs[ii];
                biPairs[pairs[ii]] = ii;
            }
        }

        // / Array that will be used for scoring
        // / Shifts so that
        this._scoreBiPairs = new Array(biPairs.length + 1);
        for (ii = 0; ii < biPairs.length; ii++) {
            this._scoreBiPairs[ii + 1] = biPairs[ii] + 1;
        }
        this._scoreBiPairs[0] = biPairs.length;

        // / no tree if there are no pairs -- special case to be handled
        // /  separately in getCoords.
        let foundPair = false;
        for (ii = 0; ii < biPairs.length; ii++) {
            if (biPairs[ii] >= 0) {
                foundPair = true;
                break;
            }
        }
        if (!foundPair) {
            return;
        }

        this._root = new RNATreeNode();

        for (let jj = 0; jj < biPairs.length; jj++) {
            if (biPairs[jj] >= 0) {
                this.addNodesRecursive(biPairs, this._root, jj, biPairs[jj]);
                jj = biPairs[jj];
            } else {
                let newsubnode: RNATreeNode = new RNATreeNode();
                newsubnode.isPair = false;
                newsubnode.indexA = jj;
                this._root.children.push(newsubnode);
            }
        }
    }

    public getCoords(xarray: number[], yarray: number[]): void {
        if (this._root != null) {
            this.getCoordsRecursive(this._root, xarray, yarray);
        } else if (xarray.length < 3) {
            // there is no structure (no pairs)
            // really short, just place them in a vertical line
            for (let ii = 0; ii < xarray.length; ii++) {
                xarray[ii] = 0;
                yarray[ii] = ii * this._primarySpace;
            }
        } else {
            // if longer, make the sequence form a circle instead
            // FIXME: there's a bit of code duplication here, somewhat inelegant...
            //   This should be easy to unify, but why is circleRadius not updated along with circleLength?
            //    Need to think through an oligo case carefully -- rhiju
            let circleLength: number = (xarray.length + 1) * this._primarySpace + this._pairSpace;
            let circleRadius: number = circleLength / (2 * Math.PI);
            let oligoDisplacement = 0;
            for (let ii = 0; ii < xarray.length; ii++) {
                if (this._exceptionIndices != null && this._exceptionIndices.indexOf(ii) >= 0) {
                    oligoDisplacement += 2 * this._primarySpace;
                }
            }
            circleLength += oligoDisplacement;

            let lengthWalker: number = this._pairSpace / 2.0;
            let goX = 0;
            let goY = 1;
            let _rootX: number = goX * circleRadius;
            let _rootY: number = goY * circleRadius;
            let crossX: number = -goY;
            let crossY: number = goX;
            for (let ii = 0; ii < xarray.length; ii++) {
                lengthWalker += this._primarySpace;
                if (this._exceptionIndices != null && this._exceptionIndices.indexOf(ii) >= 0) {
                    lengthWalker += 2 * this._primarySpace;
                }

                let radAngle: number = (lengthWalker / circleLength) * 2 * Math.PI - Math.PI / 2.0;
                xarray[ii] = (
                    _rootX + Math.cos(radAngle) * crossX * circleRadius + Math.sin(radAngle) * goX * circleRadius
                );
                yarray[ii] = (
                    _rootY + Math.cos(radAngle) * crossY * circleRadius + Math.sin(radAngle) * goY * circleRadius
                );
            }
        }
    }

    public drawTree(customLayout: Array<[number, number]> = null ): void {
        this._customLayout = customLayout;
        if (this._root != null) {
            this.drawTreeRecursive(this._root, null, 0, 0, 0, 1, 1);
        }
    }

    public get totalScore(): number {
        if (this._root == null) {
            return 0;
        }

        return this.getTotalScoreRecursive(this._root);
    }

    public scoreTree(seq: number[], folder: Folder): void {
        if (this._scoreBiPairs == null) {
            throw new Error('Layout tree is not properly setup for scoring');
        }

        if (this._root == null) {
            return;
        }

        let nnfe: number[] = [];

        folder.scoreStructures(seq, this._origPairs, EPars.DEFAULT_TEMPERATURE, nnfe);
        this.scoreTreeRecursive(nnfe, this._root, null);
    }

    private addNodesRecursive(biPairs: number[], rootnode: RNATreeNode, startIndex: number, endIndex: number): void {
        if (startIndex > endIndex) {
            throw new Error('Error occured while drawing RNA');
        }

        let newnode: RNATreeNode;
        if (biPairs[startIndex] === endIndex) {
            newnode = new RNATreeNode();
            newnode.isPair = true;
            newnode.indexA = startIndex;
            newnode.indexB = endIndex;

            this.addNodesRecursive(biPairs, newnode, startIndex + 1, endIndex - 1);
        } else {
            newnode = new RNATreeNode();

            for (let jj = startIndex; jj <= endIndex; jj++) {
                if (biPairs[jj] >= 0) {
                    this.addNodesRecursive(biPairs, newnode, jj, biPairs[jj]);
                    jj = biPairs[jj];
                } else {
                    let newsubnode: RNATreeNode = new RNATreeNode();
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
            let crossX: number = -rootnode.goY * rootnode.flipSign;
            let crossY: number = rootnode.goX * rootnode.flipSign;

            xarray[rootnode.indexA] = rootnode.x + (crossX * this._pairSpace) / 2.0;
            xarray[rootnode.indexB] = rootnode.x - (crossX * this._pairSpace) / 2.0;

            yarray[rootnode.indexA] = rootnode.y + (crossY * this._pairSpace) / 2.0;
            yarray[rootnode.indexB] = rootnode.y - (crossY * this._pairSpace) / 2.0;
        } else if (rootnode.indexA >= 0) {
            xarray[rootnode.indexA] = rootnode.x;
            yarray[rootnode.indexA] = rootnode.y;
        }

        for (let ii = 0; ii < rootnode.children.length; ii++) {
            this.getCoordsRecursive(rootnode.children[ii], xarray, yarray);
        }
    }


    private drawTreeRecursive(rootnode: RNATreeNode, parentnode: RNATreeNode, startX: number, startY: number, goX: number, goY: number, flipSign: number = 1): void {
        let crossX: number = -goY * flipSign;
        let crossY: number = goX * flipSign;

        let oligoDisplacement = 0;

        rootnode.goX = goX;
        rootnode.goY = goY;
        rootnode.flipSign = flipSign;

        if (this._customLayout && this.junctionMatchesTarget(rootnode, parentnode)) {
            this.drawTreeCustomLayout(rootnode, parentnode, startX, startY, goX, goY, flipSign);
            return;
        }
        if (rootnode.children.length === 1) {
            rootnode.x = startX;
            rootnode.y = startY;

            if (rootnode.children[0].isPair) {
                this.drawTreeRecursive(
                    rootnode.children[0], rootnode,
                    startX + goX * this._primarySpace, startY + goY * this._primarySpace, goX, goY, flipSign
                );
            } else if (!rootnode.children[0].isPair && rootnode.children[0].indexA < 0) {
                this.drawTreeRecursive(rootnode.children[0], rootnode, startX, startY, goX, goY, flipSign);
            } else {
                this.drawTreeRecursive(
                    rootnode.children[0], rootnode,
                    startX + goX * this._primarySpace, startY + goY * this._primarySpace, goX, goY, flipSign
                );
            }
        } else if (rootnode.children.length > 1) {
            let ii: number;
            let npairs = 0;
            for (ii = 0; ii < rootnode.children.length; ii++) {
                if (rootnode.children[ii].isPair) {
                    npairs++;
                }
                if (
                    this._exceptionIndices != null
                    && (
                        this._exceptionIndices.indexOf(rootnode.children[ii].indexA) >= 0
                        || this._exceptionIndices.indexOf(rootnode.children[ii].indexB) >= 0
                    )
                ) {
                    oligoDisplacement += 2 * this._primarySpace;
                }
            }

            let circleLength = (rootnode.children.length + 1) * this._primarySpace + (npairs + 1) * this._pairSpace;
            circleLength += oligoDisplacement;

            let circleRadius = circleLength / (2 * Math.PI);
            let lengthWalker = this._pairSpace / 2.0;

            if (parentnode == null) {
                rootnode.x = goX * circleRadius;
                rootnode.y = goY * circleRadius;
            } else {
                rootnode.x = parentnode.x + goX * circleRadius;
                rootnode.y = parentnode.y + goY * circleRadius;
            }

            for (ii = 0; ii < rootnode.children.length; ii++) {
                lengthWalker += this._primarySpace;
                if (
                    this._exceptionIndices != null
                    && (
                        this._exceptionIndices.indexOf(rootnode.children[ii].indexA) >= 0
                        || this._exceptionIndices.indexOf(rootnode.children[ii].indexB) >= 0
                    )
                ) {
                    lengthWalker += 2 * this._primarySpace;
                }

                if (rootnode.children[ii].isPair) {
                    lengthWalker += this._pairSpace / 2.0;
                }

                let radAngle = (lengthWalker / circleLength) * 2 * Math.PI - Math.PI / 2.0;
                let childX = (
                    rootnode.x + Math.cos(radAngle) * crossX * circleRadius + Math.sin(radAngle) * goX * circleRadius
                );
                let childY = (
                    rootnode.y + Math.cos(radAngle) * crossY * circleRadius + Math.sin(radAngle) * goY * circleRadius
                );

                let childGoX = childX - rootnode.x;
                let childGoY = childY - rootnode.y;
                let childGoLen = Math.sqrt(childGoX * childGoX + childGoY * childGoY);

                this.drawTreeRecursive(rootnode.children[ii], rootnode, childX, childY,
                    childGoX / childGoLen, childGoY / childGoLen, flipSign);

                if (rootnode.children[ii].isPair) {
                    lengthWalker += this._pairSpace / 2.0;
                }
            }
        } else {
            rootnode.x = startX;
            rootnode.y = startY;
        }
    }

    private drawTreeCustomLayout(rootnode: RNATreeNode, parentnode: RNATreeNode, startX: number, startY: number, goX: number, goY: number, flipSign: number): void {
        let ii: number;
        let crossX: number = -goY * flipSign;
        let crossY: number = goX * flipSign;

        rootnode.x = startX;
        rootnode.y = startY;
        let anchor_x = 0;
        let anchor_y = 0;
        let anchor_custom_x = 0;
        let anchor_custom_y = 0;
        let anchor_custom_goX = 0;
        let anchor_custom_goY = 1;
        let anchor_custom_crossX = -1;
        let anchor_custom_crossY = 0;
        let anchor_custom_whichway = 1;

        let anchornode: RNATreeNode = null;
        if (parentnode && parentnode.isPair) {
            // this is the case in junctions, where root is 'pseudonode' in middle of junction,
            //  and parent is the exterior pair (or the global root)
            anchornode = parentnode;
        } else if (rootnode && rootnode.isPair) {
            // this can be the case in stacked pairs.
            anchornode = rootnode;
        }
        if (anchornode != null) {
            anchor_x = anchornode.x;
            anchor_y = anchornode.y;
            let custom_coordA: [number, number] = this._customLayout[anchornode.indexA];
            let custom_coordB: [number, number] = this._customLayout[anchornode.indexB];
            anchor_custom_x = (custom_coordA[0] + custom_coordB[0]) / 2;
            anchor_custom_y = (custom_coordA[1] + custom_coordB[1]) / 2;
            anchor_custom_crossX = (custom_coordA[0] - custom_coordB[0]);
            anchor_custom_crossY = (custom_coordA[1] - custom_coordB[1]);
            anchor_custom_goX = anchor_custom_crossY;
            anchor_custom_goY = -anchor_custom_crossX;

            // are we rendering counterclockwise (default) or clockwise (non-default, flipSign = -1)
            // NOTE POTENTIAL ISSUE in edge case where anchornode.indexA is at edge of pairing...
            // basically checking dot product of next base after pair with putative go direction above.
            let anchor_custom_coord_next: [number, number] = this._customLayout[anchornode.indexA + 1];
            let anchor_custom_go_next_x: number = anchor_custom_coord_next[0] - anchor_custom_x;
            let anchor_custom_go_next_y: number = anchor_custom_coord_next[1] - anchor_custom_y;
            anchor_custom_whichway = Math.sign(anchor_custom_go_next_x * anchor_custom_goX + anchor_custom_go_next_y * anchor_custom_goY);
            anchor_custom_goX *= anchor_custom_whichway;
            anchor_custom_goY *= anchor_custom_whichway;
        }

        for (ii = 0; ii < rootnode.children.length; ii++) {
            // read out where this point should be based on 'this._customLayout'. get coordinates in
            // "local coordinate frame" set by parent pair in this._customLayout.
            // This would be a lot easier to read if we had a notion of an (x,y) pair, dot products, and cross products.
            let custom_coord: number[] = this._customLayout[rootnode.children[ii].indexA].slice();
            if (rootnode.children[ii].isPair) {
                let custom_coordA: [number, number] = this._customLayout[rootnode.children[ii].indexA];
                let custom_coordB: [number, number] = this._customLayout[rootnode.children[ii].indexB];
                custom_coord[0] = (custom_coordA[0] + custom_coordB[0]) / 2;
                custom_coord[1] = (custom_coordA[1] + custom_coordB[1]) / 2;
            }

            let child_x = 0.0;
            let child_y = 0.0;
            let child_goX = 0.0;
            let child_goY = 0.0;
            child_x = custom_coord[0] * this._primarySpace;
            child_y = custom_coord[1] * this._primarySpace;
            if (anchornode != null) {
                let dev_x: number = custom_coord[0] - anchor_custom_x;
                let dev_y: number = custom_coord[1] - anchor_custom_y;
                let template_x: number = dev_x * anchor_custom_crossX + dev_y * anchor_custom_crossY;
                let template_y: number = dev_x * anchor_custom_goX + dev_y * anchor_custom_goY;
                template_x *= this._primarySpace;
                template_y *= this._primarySpace;
                // go to Eterna RNALayout global frame.
                child_x = anchor_x + crossX * template_x + goX * template_y;
                child_y = anchor_y + crossY * template_x + goY * template_y;
            }

            let child_flipSign: number = flipSign;
            if (rootnode.children[ii].isPair) {
                let custom_coordA: [number, number] = this._customLayout[rootnode.children[ii].indexA];
                let custom_coordB: [number, number] = this._customLayout[rootnode.children[ii].indexB];
                let custom_crossX: number = (custom_coordA[0] - custom_coordB[0]);
                let custom_crossY: number = (custom_coordA[1] - custom_coordB[1]);
                let custom_goX: number = custom_crossY;
                let custom_goY: number = -custom_crossX;

                let custom_coord_next: [number, number] = this._customLayout[rootnode.children[ii].indexA + 1];
                let custom_go_next_x: number = custom_coord_next[0] - custom_coord[0];
                let custom_go_next_y: number = custom_coord_next[1] - custom_coord[1];
                let child_custom_whichway: number = Math.sign(custom_go_next_x * custom_goX + custom_go_next_y * custom_goY);
                custom_goX *= child_custom_whichway;
                custom_goY *= child_custom_whichway;

                child_goX = custom_goX;
                child_goY = custom_goY;
                child_flipSign = flipSign * child_custom_whichway / anchor_custom_whichway;
                if (anchornode != null) {
                    let template_goX = custom_goX * anchor_custom_crossX + custom_goY * anchor_custom_crossY;
                    let template_goY = custom_goX * anchor_custom_goX + custom_goY * anchor_custom_goY;
                    child_goX = crossX * template_goX + goX * template_goY;
                    child_goY = crossY * template_goX + goY * template_goY;
                }
            }
            let child_go_len: number = Math.sqrt(child_goX * child_goX + child_goY * child_goY);

            this.drawTreeRecursive(rootnode.children[ii], rootnode, child_x, child_y,
                child_goX / child_go_len, child_goY / child_go_len, child_flipSign);
        }
    }

    private getTotalScoreRecursive(rootnode: RNATreeNode): number {
        let score: number = rootnode.score;
        for (let ii = 0; ii < rootnode.children.length; ii++) {
            score += this.getTotalScoreRecursive(rootnode.children[ii]);
        }
        return score;
    }


    private scoreTreeRecursive(nnfe: number[], rootnode: RNATreeNode, parentnode: RNATreeNode): void {
        if (rootnode.isPair) {
            // / Pair node
            if (rootnode.children.length > 1) {
                throw new Error('Pair node should never have more than one child');
            }

            if (rootnode.children.length === 0) {
                throw new Error("Pair node can't be childless");
            }

            if (rootnode.children[0].isPair) {
                rootnode.score = RNALayout.lookupFe(nnfe, rootnode.indexA);
            }

            this.scoreTreeRecursive(nnfe, rootnode.children[0], rootnode);
        } else if (!rootnode.isPair && rootnode.indexA >= 0) {
            // / Single residue node


        } else {
            // / Virtual node

            // / Top root case
            if (parentnode == null) {
                // / initial ml scoring
                rootnode.score = RNALayout.lookupFe(nnfe, -1);
            } else if (!parentnode.isPair) {
                throw new Error('Parent node must be a pair');
            }

            let ii: number;
            let numStacks = 0;
            let firstStackIndex = -1;

            for (ii = 0; ii < rootnode.children.length; ii++) {
                if (rootnode.children[ii].isPair) {
                    numStacks++;
                    if (firstStackIndex < 0) {
                        firstStackIndex = ii;
                    }
                } else if (rootnode.children[ii].indexA < 0) {
                    throw new Error('Virtual node should not have a virtual node child');
                }
            }
            let i: number; let j: number; let p: number; let
                q: number;

            if (numStacks === 1 && parentnode != null) {
                rootnode.score = RNALayout.lookupFe(nnfe, parentnode.indexA);
            } else if (numStacks === 0) {
                rootnode.score = RNALayout.lookupFe(nnfe, parentnode.indexA);
            } else if (numStacks > 1 && parentnode != null) {
                rootnode.score = RNALayout.lookupFe(nnfe, parentnode.indexA);
            }

            for (ii = 0; ii < rootnode.children.length; ii++) {
                this.scoreTreeRecursive(nnfe, rootnode.children[ii], rootnode);
            }
        }
    }

    // / FIXME: there's surely a smarter way to do this...
    private static lookupFe(nnfe: number[], index: number): number {
        for (let ii = 0; ii < nnfe.length - 1; ii += 2) {
            if (nnfe[ii] === index) return nnfe[ii + 1];
        }
        return 0;
    }

    private junctionMatchesTarget(rootnode: RNATreeNode, parentnode: RNATreeNode): boolean {
        if (this._targetPairs == null) return false;

        if (parentnode && parentnode.isPair) {
            // is initial pair of junction paired in target structure?
            if (this._targetPairs[parentnode.indexA] != parentnode.indexB) {
                return false;
            }
        }
        if (rootnode.children.length == 1 && rootnode.children[0].indexA < 0) return false;

        for (let ii = 0; ii < rootnode.children.length; ii++) {
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

    // / "New" method to gather NN free energies, just use the folding engine
    private _scoreBiPairs: number[];

    private static readonly NODE_R = 10;
}
