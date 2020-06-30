import EPars from 'eterna/EPars';
import Folder from 'eterna/folding/Folder';
import NuPACK from 'eterna/folding/NuPACK';
import LayoutEngineManager from 'eterna/layout/LayoutEngineManager';
import RNApuzzler from 'eterna/layout/RNApuzzler';
import Eterna from 'eterna/Eterna';
import {Assert} from 'flashbang';

enum RotationDirection {
    CCW = -1, // counterclockwise
    CW = 1 // clockwise
}

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

    public rotationDirection: RotationDirection;
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
//      any helices that are daughters through the rotationDirectionSign variable (-1 for clockwise,
//                                          +1 for counterclockwise)
//
// TODO: The recursions below copy some code, unfortunately.
// TODO: Its probably not necessary for user to initialize, drawTree, and getCoords separately -- these aren't really
//           operations that are useful in separate chunks.
//
//    -- rhiju, 2019, reviewing/updating code that was written ages ago by someone else.
//
export default class RNALayout {
    constructor(primSpace: number = 45, pairSpace: number = 45, exceptionIndices: number[] | null = null) {
        this._primarySpace = primSpace;
        this._pairSpace = pairSpace;
        if (exceptionIndices != null) {
            this._exceptionIndices = exceptionIndices.slice();
        }
    }

    public get root(): RNATreeNode | null {
        return this._root;
    }

    public get pseudoknotPairs(): number[] {
        return this._pseudoknotPairs;
    }

    /**
     * Initializes the tree structure of the RNALayout based on provided BPs.
     *
     * @param pairs An array as long as the structure. -1 for unpaired bases,
     * index of the base it is paired to for a paired base
     * @param targetPairs An optional array stored in the RNALayout that shows
     * the structure of the puzzle "goal." A
     * comparison of pairs to targetPairs will influence application of the customLayout
     */
    public setupTree(pairs: number[], targetPairs: number[] | null = null): void {
        let ii: number;
        let biPairs: number[] = new Array(pairs.length);

        // / Delete old tree
        this._root = null;
        // / save for later
        this._origPairs = pairs.slice();
        this._targetPairs = targetPairs;

        if (targetPairs == null) this._targetPairs = pairs;

        // / biPairs is 'symmetrized'. Like pairs,
        // /   an array the same length as RNA
        // /   with -1 for unpaired bases, and
        // /   with the partner number for each paired base.
        biPairs.fill(-1);

        for (ii = 0; ii < pairs.length; ii++) {
            if (ii < pairs[ii]) {
                biPairs[ii] = pairs[ii];
                biPairs[pairs[ii]] = ii;
            }
        }

        // / Array that will be used for scoring
        // / Shifted to be effectively 1-indexed
        // / with the zero-indexed length at index 0
        this._scoreBiPairs = new Array(biPairs.length + 1);
        for (ii = 0; ii < biPairs.length; ii++) {
            this._scoreBiPairs[ii + 1] = biPairs[ii] + 1;
        }
        this._scoreBiPairs[0] = biPairs.length;

        this._pseudoknotPairs = (new Array(biPairs.length)).fill(-1);
        this._nopseudoknotPairs = (new Array(biPairs.length)).fill(-1);

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

        // the targetPairs that exist for the sake of seeing what matches the goal
        // need to have PKs removed.
        // AMW TODO: Rhiju, we should eventually be able to remove this condition,
        // once you work out how layouts can handle pseudoknots.
        this._pseudoknotPairs = EPars.onlyPseudoknots(biPairs);
        this._nopseudoknotPairs = EPars.filterForPseudoknots(biPairs);
        biPairs = EPars.filterForPseudoknots(biPairs);
        if (this._targetPairs !== null) {
            this._targetPairs = EPars.filterForPseudoknots(this._targetPairs);
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

    /**
     * Provides actual coordinates for the layout whose structure is encoded
     * by this object.
     *
     * @param xarray x-coordinates (output param)
     * @param yarray y-coordinates (output param)
     */
    public getCoords(xarray: number[], yarray: number[]): void {
        // FIXME add documentation. And its confusing that xarray,yarray are changeable by function ('outparams').

        // If there is a root node in the layout, use the recursive function
        // starting from root. The first two nt can be in a vertical line.
        // After that, start making a circle.
        if (this._root != null) {
            this.getCoordsRecursive(this._root, xarray, yarray);
        } else if (xarray.length <= 4) {
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

    /**
     * Generate base positions for this RNALayout
     *
     * @param customLayout An array of x,y tuples defining all base positions,
     * which will override the "normal" geometry wherever the base pairs match
     * the target pairs in the structure.
     */
    public drawTree(customLayout: Array<[number, number] | [null, null]> | null = null): void {
        this.initializeCustomLayout(customLayout);
        if (Eterna.settings.usePuzzlerLayout.value) {
            this.initializePuzzlerLayout();
        }
        if (this._root != null) {
            this.drawTreeRecursive(this._root, null, 0, 0, 0, 1, RotationDirection.CW);
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

        if (this._targetPairs !== null
                && (EPars.pairsToParenthesis(this._targetPairs).includes('{')
                || EPars.pairsToParenthesis(this._targetPairs).includes('['))
                && folder.name === NuPACK.NAME) {
            folder.scoreStructures(seq, this._origPairs, true, EPars.DEFAULT_TEMPERATURE, nnfe);
        } else {
            folder.scoreStructures(seq, this._origPairs, false, EPars.DEFAULT_TEMPERATURE, nnfe);
        }
        this.scoreTreeRecursive(nnfe, this._root, null);
    }

    private addNodesRecursive(biPairs: number[], rootnode: RNATreeNode, startIndex: number, endIndex: number): void {
        if (startIndex > endIndex) {
            throw new Error(`Error occured while drawing RNA for indices ${startIndex} ${endIndex}`);
            // let tmp = endIndex;
            // endIndex = startIndex;
            // startIndex = tmp;
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
            let crossX: number = -rootnode.goY * rootnode.rotationDirection;
            let crossY: number = rootnode.goX * rootnode.rotationDirection;

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

    public getRotationDirectionSign(rotationDirectionSign: number[]): void {
        if (this._root != null) {
            this.getRotationDirectionSignRecursive(this._root, rotationDirectionSign);
        } else {
            for (let ii = 0; ii < rotationDirectionSign.length; ii++) {
                rotationDirectionSign[ii] = 1;
            }
        }
    }

    private getRotationDirectionSignRecursive(rootnode: RNATreeNode, rotationDirectionSign: number[]): void {
        if (rootnode.isPair) {
            rotationDirectionSign[rootnode.indexA] = rootnode.rotationDirection;
            rotationDirectionSign[rootnode.indexB] = rootnode.rotationDirection;
        } else if (rootnode.indexA >= 0) {
            rotationDirectionSign[rootnode.indexA] = rootnode.rotationDirection;
        }
        for (let ii = 0; ii < rootnode.children.length; ii++) {
            this.getRotationDirectionSignRecursive(rootnode.children[ii], rotationDirectionSign);
        }
    }

    /**
     * Called only by drawTree, a wrapper that first iniitalizes the
     * customLayout, this function determines and sets the base positions for the RNA
     * structure embodied by this object.
     *
     * @param rootnode the root node for this recursive call
     * @param parentnode the parent of this subtree's root; null when this
     * function is called on the tree's root
     * @param startX a plausible starting X for root, likely to be modified
     * @param startY a plausible starting Y for root, likely to be modified
     * @param goX X component of unit vector from parent to root
     * @param goY Y component of unit vector from parent to root
     * @param rotationDirection mapping from CW (1)/CCW (-1) to 5' => 3' direction
     */
    private drawTreeRecursive(
        rootnode: RNATreeNode, parentnode: RNATreeNode | null,
        startX: number, startY: number,
        goX: number, goY: number, rotationDirection: RotationDirection = RotationDirection.CW
    ): void {
        let crossX: number = -goY * rotationDirection;
        let crossY: number = goX * rotationDirection;

        let oligoDisplacement = 0;

        rootnode.goX = goX;
        rootnode.goY = goY;
        rootnode.rotationDirection = rotationDirection;

        if (this._customLayout && this.junctionMatchesTarget(rootnode, parentnode)) {
            this.drawTreeCustomLayout(rootnode, parentnode, startX, startY, goX, goY, rotationDirection);
            return;
        }
        if (Eterna.settings.usePuzzlerLayout.value) {
            // This is equivalent to enforcing just one of the junctionMatchesTarget conditions
            // but I'm not really sure where it comes from. Maybe just the start.
            if (!(rootnode.children.length === 1 && rootnode.children[0].indexA < 0)) {
                this.drawTreePuzzlerLayout(rootnode, parentnode, startX, startY, goX, goY, rotationDirection);
                return;
            }
        }
        if (rootnode.children.length === 1) {
            rootnode.x = startX;
            rootnode.y = startY;

            if (rootnode.children[0].isPair) {
                this.drawTreeRecursive(
                    rootnode.children[0], rootnode,
                    startX + goX * this._primarySpace, startY + goY * this._primarySpace, goX, goY,
                    rotationDirection
                );
            } else if (!rootnode.children[0].isPair && rootnode.children[0].indexA < 0) {
                this.drawTreeRecursive(rootnode.children[0], rootnode, startX, startY, goX, goY,
                    rotationDirection);
            } else {
                this.drawTreeRecursive(
                    rootnode.children[0], rootnode,
                    startX + goX * this._primarySpace, startY + goY * this._primarySpace, goX, goY,
                    rotationDirection
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
                    childGoX / childGoLen, childGoY / childGoLen, rotationDirection);

                if (rootnode.children[ii].isPair) {
                    lengthWalker += this._pairSpace / 2.0;
                }
            }
        } else {
            rootnode.x = startX;
            rootnode.y = startY;
        }
    }

    /**
     * Called if the customLayout is defined AND if the junction locally
     * matches the target structure.
     *
     * @param rootnode the root node for this recursive call
     * @param parentnode the parent of this subtree's root; null when this
     * function is called on the tree's root
     * @param startX a plausible starting X for root, likely to be modified
     * @param startY a plausible starting Y for root, likely to be modified
     * @param goX X component of unit vector from parent to root
     * @param goY Y component of unit vector from parent to root
     * @param rotationDirection mapping from CW (1)/CCW (-1) to 5' => 3' direction
     */
    private drawTreeCustomLayout(
        rootnode: RNATreeNode, parentnode: RNATreeNode | null,
        startX: number, startY: number,
        goX: number, goY: number, rotationDirection: RotationDirection
    ): void {
        // Cheap throw if customLayout null but made to this function
        if (this._customLayout === null) {
            throw new Error('Made it to drawTreeCustomLayout, but the _customLayout is null!');
        }

        let ii: number;
        let crossX: number = -goY * rotationDirection;
        let crossY: number = goX * rotationDirection;

        rootnode.x = startX;
        rootnode.y = startY;
        let anchorX = 0;
        let anchorY = 0;
        let anchorCustomX = 0;
        let anchorCustomY = 0;
        let anchorCustomGoX = 0;
        let anchorCustomGoY = 1;
        let anchorCustomCrossX = -1;
        let anchorCustomCrossY = 0;
        let anchorCustomRotationDirection = 1;

        let anchornode: RNATreeNode | null = null;
        if (parentnode && parentnode.isPair) {
            // this is the case in junctions, where root is 'pseudonode' in middle of junction,
            //  and parent is the exterior pair (or the global root)
            anchornode = parentnode;
        } else if (rootnode && rootnode.isPair) {
            // this can be the case in stacked pairs.
            anchornode = rootnode;
        }

        if (anchornode != null) {
            anchorX = anchornode.x;
            anchorY = anchornode.y;
            let customCoordA: [number, number] | [null, null] = this._customLayout[anchornode.indexA];
            let customCoordB: [number, number] | [null, null] = this._customLayout[anchornode.indexB];
            if (
                customCoordA[0] !== null
                && customCoordA[1] !== null
                && customCoordB[0] !== null
                && customCoordB[1] !== null
            ) {
                anchorCustomX = (customCoordA[0] + customCoordB[0]) / 2;
                anchorCustomY = (customCoordA[1] + customCoordB[1]) / 2;
                anchorCustomCrossX = (customCoordA[0] - customCoordB[0]);
                anchorCustomCrossY = (customCoordA[1] - customCoordB[1]);
            }
            anchorCustomGoX = anchorCustomCrossY;
            anchorCustomGoY = -anchorCustomCrossX;

            // are we rendering counterclockwise (default) or clockwise (non-default, rotationDirection = -1)
            // NOTE POTENTIAL ISSUE in edge case where anchornode.indexA is at edge of pairing...
            // basically checking dot product of next base after pair with putative go direction above.
            let anchorCustomCoordNext: [number, number] | [null, null] = this._customLayout[anchornode.indexA + 1];
            if (anchorCustomCoordNext[0] != null) {
                let anchorCustomGoNextX: number | null = anchorCustomCoordNext[0] - anchorCustomX;
                let anchorCustomGoNextY: number | null = anchorCustomCoordNext[1] - anchorCustomY;
                let anchorCustomDotProd = anchorCustomGoNextX * anchorCustomGoX + anchorCustomGoNextY * anchorCustomGoY;
                anchorCustomRotationDirection = Math.sign(anchorCustomDotProd);
                if (
                    anchorCustomRotationDirection === 0
                    || anchorCustomCoordNext[0] === null
                    || Math.abs(anchorCustomDotProd) < 1e-3
                ) {
                    anchorCustomRotationDirection = 1;
                }
                anchorCustomGoX *= anchorCustomRotationDirection;
                anchorCustomGoY *= anchorCustomRotationDirection;
            }
        }

        for (ii = 0; ii < rootnode.children.length; ii++) {
            // read out where this point should be based on 'this._customLayout'. get coordinates in
            // "local coordinate frame" set by parent pair in this._customLayout.
            // This would be a lot easier to read if we had a notion of an (x,y) pair, dot products, and cross products.
            let customCoord: number[] | null[] = this._customLayout[rootnode.children[ii].indexA].slice();
            if (rootnode.children[ii].isPair) {
                let customCoordA: [number, number] | [null, null] = this._customLayout[rootnode.children[ii].indexA];
                let customCoordB: [number, number] | [null, null] = this._customLayout[rootnode.children[ii].indexB];
                if (
                    customCoordA[0] !== null
                    && customCoordA[1] !== null
                    && customCoordB[0] !== null
                    && customCoordB[1] !== null
                ) {
                    customCoord[0] = (customCoordA[0] + customCoordB[0]) / 2;
                    customCoord[1] = (customCoordA[1] + customCoordB[1]) / 2;
                }
            }

            let childX = 0.0;
            let childY = 0.0;
            let childGoX = 0.0;
            let childGoY = 0.0;
            if (
                customCoord[0] !== null
                && customCoord[1] !== null
            ) {
                childX = customCoord[0] * this._primarySpace;
                childY = customCoord[1] * this._primarySpace;
            }
            if (anchornode != null) {
                if (customCoord[0] !== null && customCoord[1] !== null) {
                    let devX: number = customCoord[0] - anchorCustomX;
                    let devY: number = customCoord[1] - anchorCustomY;
                    let templateX: number = devX * anchorCustomCrossX + devY * anchorCustomCrossY;
                    let templateY: number = devX * anchorCustomGoX + devY * anchorCustomGoY;
                    templateX *= this._primarySpace;
                    templateY *= this._primarySpace;
                    // go to Eterna RNALayout global frame.
                    childX = anchorX + crossX * templateX + goX * templateY;
                    childY = anchorY + crossY * templateX + goY * templateY;
                }
            }

            let childRotationDirection: number = rotationDirection;
            if (rootnode.children[ii].isPair) {
                let customCoordA: [number, number] | [null, null] = this._customLayout[rootnode.children[ii].indexA];
                let customCoordB: [number, number] | [null, null] = this._customLayout[rootnode.children[ii].indexB];
                if (customCoordA[0] !== null && customCoordB[0] !== null) {
                    let customCrossX: number = (customCoordA[0] - customCoordB[0]);
                    let customCrossY: number = (customCoordA[1] - customCoordB[1]);
                    let customGoX: number = customCrossY;
                    let customGoY: number = -customCrossX;
                    let customCoordNext = this._customLayout[rootnode.children[ii].indexA + 1];
                    let childCustomRotationDirection: RotationDirection = 0;
                    let childCustomDotProd = 0;
                    if (
                        customCoordNext[0] !== null
                        && customCoordNext[1] !== null
                        && customCoord[0] !== null
                        && customCoord[1] !== null
                    ) {
                        let customGoNextX: number = customCoordNext[0] - customCoord[0];
                        let customGoNextY: number = customCoordNext[1] - customCoord[1];
                        childCustomDotProd = customGoNextX * customGoX + customGoNextY * customGoY;
                        childCustomRotationDirection = Math.sign(childCustomDotProd);
                    }
                    if (customCoordNext[0] === null) {
                        childCustomRotationDirection = anchorCustomRotationDirection;
                    } else if (childCustomRotationDirection === 0
                        || Math.abs(childCustomDotProd) < 1e-3) {
                        childCustomRotationDirection = 1;
                    }
                    customGoX *= childCustomRotationDirection;
                    customGoY *= childCustomRotationDirection;

                    childGoX = customGoX;
                    childGoY = customGoY;
                    childRotationDirection = rotationDirection
                        * (childCustomRotationDirection / anchorCustomRotationDirection);
                    if (anchornode != null) {
                        let templateGoX = customGoX * anchorCustomCrossX + customGoY * anchorCustomCrossY;
                        let templateGoY = customGoX * anchorCustomGoX + customGoY * anchorCustomGoY;
                        childGoX = crossX * templateGoX + goX * templateGoY;
                        childGoY = crossY * templateGoX + goY * templateGoY;
                    }
                }
            }

            let childGoLength: number = Math.sqrt(childGoX * childGoX + childGoY * childGoY);

            this.drawTreeRecursive(rootnode.children[ii], rootnode, childX, childY,
                childGoX / childGoLength, childGoY / childGoLength, childRotationDirection);
        }
    }

    /**
     * Called if the puzzle is big enough that it needs a puzzlerLayout. Still
     * will call the 'master function' on the next recursion, but that's mostly
     * because it should swap back to a local customLayout if one happens to be
     * defined.
     *
     * @param rootnode the root node for this recursive call
     * @param parentnode the parent of this subtree's root; null when this
     * function is called on the tree's root
     * @param startX a plausible starting X for root, likely to be modified
     * @param startY a plausible starting Y for root, likely to be modified
     * @param goX X component of unit vector from parent to root
     * @param goY Y component of unit vector from parent to root
     * @param rotationDirection mapping from CW (1)/CCW (-1) to 5' => 3' direction
     */
    private drawTreePuzzlerLayout(
        rootnode: RNATreeNode, parentnode: RNATreeNode | null,
        startX: number, startY: number,
        goX: number, goY: number, rotationDirection: RotationDirection
    ): void {
        let ii: number;
        let crossX: number = -goY * rotationDirection;
        let crossY: number = goX * rotationDirection;

        rootnode.x = startX;
        rootnode.y = startY;
        let anchorX = 0;
        let anchorY = 0;
        let anchorPuzzlerX = 0;
        let anchorPuzzlerY = 0;
        let anchorPuzzlerGoX = 0;
        let anchorPuzzlerGoY = 1;
        let anchorPuzzlerCrossX = -1;
        let anchorPuzzlerCrossY = 0;
        let anchorPuzzlerRotationDirection = 1;

        let anchornode: RNATreeNode | null = null;
        if (parentnode && parentnode.isPair) {
            // this is the case in junctions, where root is 'pseudonode' in middle of junction,
            //  and parent is the exterior pair (or the global root)
            anchornode = parentnode;
        } else if (rootnode && rootnode.isPair) {
            // this can be the case in stacked pairs.
            anchornode = rootnode;
        }

        if (anchornode != null) {
            anchorX = anchornode.x;
            anchorY = anchornode.y;
            let puzzlerCoordA: [number, number] = this._puzzlerLayout[anchornode.indexA];
            let puzzlerCoordB: [number, number] = this._puzzlerLayout[anchornode.indexB];
            anchorPuzzlerX = (puzzlerCoordA[0] + puzzlerCoordB[0]) / 2;
            anchorPuzzlerY = (puzzlerCoordA[1] + puzzlerCoordB[1]) / 2;
            anchorPuzzlerCrossX = (puzzlerCoordA[0] - puzzlerCoordB[0]);
            anchorPuzzlerCrossY = (puzzlerCoordA[1] - puzzlerCoordB[1]);
            anchorPuzzlerGoX = anchorPuzzlerCrossY;
            anchorPuzzlerGoY = -anchorPuzzlerCrossX;

            // are we rendering counterclockwise (default) or clockwise (non-default, rotationDirection = -1)
            // NOTE POTENTIAL ISSUE in edge case where anchornode.indexA is at edge of pairing...
            // basically checking dot product of next base after pair with putative go direction above.
            let anchorPuzzlerCoordNext: [number, number] = this._puzzlerLayout[anchornode.indexA + 1];
            let anchorPuzzlerGoNextX: number = anchorPuzzlerCoordNext[0] - anchorPuzzlerX;
            let anchorPuzzlerGoNextY: number = anchorPuzzlerCoordNext[1] - anchorPuzzlerY;
            let anchorPuzzlerDotProd = anchorPuzzlerGoNextX * anchorPuzzlerGoX
                + anchorPuzzlerGoNextY * anchorPuzzlerGoY;
            anchorPuzzlerRotationDirection = Math.sign(anchorPuzzlerDotProd);
            if (anchorPuzzlerRotationDirection === 0
                || anchorPuzzlerCoordNext[0] === null
                || Math.abs(anchorPuzzlerDotProd) < 1e-3) {
                anchorPuzzlerRotationDirection = 1;
            }
            anchorPuzzlerGoX *= anchorPuzzlerRotationDirection;
            anchorPuzzlerGoY *= anchorPuzzlerRotationDirection;
        }

        for (ii = 0; ii < rootnode.children.length; ii++) {
            // read out where this point should be based on 'this._puzzlerLayout'. get coordinates in
            // "local coordinate frame" set by parent pair in this._puzzlerLayout.
            // This would be a lot easier to read if we had a notion of an (x,y) pair, dot products, and cross products.
            let puzzlerCoord: number[] = this._puzzlerLayout[rootnode.children[ii].indexA].slice();
            if (rootnode.children[ii].isPair) {
                let puzzlerCoordA: [number, number] = this._puzzlerLayout[rootnode.children[ii].indexA];
                let puzzlerCoordB: [number, number] = this._puzzlerLayout[rootnode.children[ii].indexB];
                puzzlerCoord[0] = (puzzlerCoordA[0] + puzzlerCoordB[0]) / 2;
                puzzlerCoord[1] = (puzzlerCoordA[1] + puzzlerCoordB[1]) / 2;
            }

            let childX = 0.0;
            let childY = 0.0;
            let childGoX = 0.0;
            let childGoY = 0.0;
            childX = puzzlerCoord[0] * this._primarySpace;
            childY = puzzlerCoord[1] * this._primarySpace;
            if (anchornode != null) {
                let devX: number = puzzlerCoord[0] - anchorPuzzlerX;
                let devY: number = puzzlerCoord[1] - anchorPuzzlerY;
                let templateX: number = devX * anchorPuzzlerCrossX + devY * anchorPuzzlerCrossY;
                let templateY: number = devX * anchorPuzzlerGoX + devY * anchorPuzzlerGoY;
                templateX *= this._primarySpace;
                templateY *= this._primarySpace;
                // go to Eterna RNALayout global frame.
                childX = anchorX + crossX * templateX + goX * templateY;
                childY = anchorY + crossY * templateX + goY * templateY;
            }

            let childRotationDirection: number = rotationDirection;
            if (rootnode.children[ii].isPair) {
                let puzzlerCoordA: [number, number] = this._puzzlerLayout[rootnode.children[ii].indexA];
                let puzzlerCoordB: [number, number] = this._puzzlerLayout[rootnode.children[ii].indexB];
                let puzzlerCrossX: number = (puzzlerCoordA[0] - puzzlerCoordB[0]);
                let puzzlerCrossY: number = (puzzlerCoordA[1] - puzzlerCoordB[1]);
                let puzzlerGoX: number = puzzlerCrossY;
                let puzzlerGoY: number = -puzzlerCrossX;

                let puzzlerCoordNext: [number, number] = this._puzzlerLayout[rootnode.children[ii].indexA + 1];
                let puzzlerGoNextX: number = puzzlerCoordNext[0] - puzzlerCoord[0];
                let puzzlerGoNextY: number = puzzlerCoordNext[1] - puzzlerCoord[1];
                let childPuzzlerDotProd = puzzlerGoNextX * puzzlerGoX + puzzlerGoNextY * puzzlerGoY;
                let childPuzzlerLayoutRotationDirection: RotationDirection = Math.sign(childPuzzlerDotProd);
                if (puzzlerCoordNext[0] === null) {
                    childPuzzlerLayoutRotationDirection = anchorPuzzlerRotationDirection;
                } else if (childPuzzlerLayoutRotationDirection === 0
                    || Math.abs(childPuzzlerDotProd) < 1e-3) {
                    childPuzzlerLayoutRotationDirection = 1;
                }
                puzzlerGoX *= childPuzzlerLayoutRotationDirection;
                puzzlerGoY *= childPuzzlerLayoutRotationDirection;

                childGoX = puzzlerGoX;
                childGoY = puzzlerGoY;
                childRotationDirection = rotationDirection
                    * (childPuzzlerLayoutRotationDirection / anchorPuzzlerRotationDirection);
                if (anchornode != null) {
                    let templateGoX = puzzlerGoX * anchorPuzzlerCrossX + puzzlerGoY * anchorPuzzlerCrossY;
                    let templateGoY = puzzlerGoX * anchorPuzzlerGoX + puzzlerGoY * anchorPuzzlerGoY;
                    childGoX = crossX * templateGoX + goX * templateGoY;
                    childGoY = crossY * templateGoX + goY * templateGoY;
                }
            }

            let childGoLength: number = Math.sqrt(childGoX * childGoX + childGoY * childGoY);

            this.drawTreeRecursive(rootnode.children[ii], rootnode, childX, childY,
                childGoX / childGoLength, childGoY / childGoLength, childRotationDirection);
        }
    }

    /**
     * Adds up the tree score by summing this node and childrens' score (typically free energy)
     * @param rootnode Node for score evaluation
     *
     * @returns the total score
     */
    private getTotalScoreRecursive(rootnode: RNATreeNode): number {
        let score: number = rootnode.score;
        for (let ii = 0; ii < rootnode.children.length; ii++) {
            score += this.getTotalScoreRecursive(rootnode.children[ii]);
        }
        return score;
    }

    /**
     * Actually assigns scores to each node.
     *
     * @param nnfe list of nearest neighbor free energies
     * @param rootnode current node for consideration
     * @param parentnode parent of roonode, null if rootnode is root_
     */
    private scoreTreeRecursive(nnfe: number[], rootnode: RNATreeNode, parentnode: RNATreeNode | null): void {
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
            } else if (numStacks === 0 && parentnode != null) {
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
    /**
     * Find a particular nnfe element. Why isn't this a dict? Right now it is a
     * list of pairs, basically... is JS dict lookup superlinear?
     *
     * @param nnfe Array of nearest neighbor parameters
     * @param index A desired index from the structure, for which we must search
     */
    private static lookupFe(nnfe: number[], index: number): number {
        for (let ii = 0; ii < nnfe.length - 1; ii += 2) {
            if (nnfe[ii] === index) return nnfe[ii + 1];
        }
        return 0;
    }

    /**
     * Judge whether a junction (defined by a node and its parent) matches the
     * target structure, which is necessary for customLayout
     *
     * @param rootnode the root node defining the junction
     * @param parentnode the root node's parent, if applicable
     *
     * @returns true if junction is target-like, false otherwise
     */
    private junctionMatchesTarget(rootnode: RNATreeNode, parentnode: RNATreeNode | null): boolean {
        if (this._customLayout === null) {
            throw new Error('Call to junctionMatchesTarget likely in error, since customLayout is not defined!');
        }
        if (this._targetPairs == null) return false;

        if (parentnode && parentnode.isPair) {
            // is initial pair of junction paired in target structure?
            if (this._targetPairs[parentnode.indexA] !== parentnode.indexB) {
                return false;
            }
        }

        if (rootnode && rootnode.isPair) {
            // is initial pair of a stacked pair also paired in target structure?
            if (this._targetPairs[rootnode.indexA] !== rootnode.indexB) {
                return false;
            }
        }

        if (rootnode.children.length === 1 && rootnode.children[0].indexA < 0) return false;

        for (let ii = 0; ii < rootnode.children.length; ii++) {
            if (this._customLayout[rootnode.children[ii].indexA][0] == null) return false;
            if (this._customLayout[rootnode.children[ii].indexA][1] == null) return false;
            if (rootnode.children[ii].isPair) {
                // all other pairs of junction paired in target structure?
                if (this._targetPairs[rootnode.children[ii].indexA] !== rootnode.children[ii].indexB) {
                    return false;
                }
            } else if (this._targetPairs[rootnode.children[ii].indexA] > 0) {
                // all unpaired bases of junction also unpaired in target structure?
                return false;
            }
        }

        return true;
    }

    /**
     * Called by drawTree, this function takes an array of x,y coords and scales
     * it to something Eterna-compatible.
     *
     * @param customLayout An array of x,y coords defining "custom" nt positions
     */
    private initializeCustomLayout(customLayout: Array<[number, number] | [null, null]> | null): void {
        if (customLayout === null) {
            this._customLayout = null;
            return;
        }
        let scaleFactor = this.inferCustomLayoutScaleFactor(customLayout);
        this._customLayout = [];
        for (const coord of customLayout) {
            if (coord[0] === null || coord[1] === null) {
                this._customLayout.push([null, null]);
            } else {
                this._customLayout.push([coord[0] * scaleFactor, coord[1] * scaleFactor]);
            }
        }
    }

    /**
     * Called by initializePuzzlerLayout, this function actually makes the array
     * of x,y coords using the RNApuzzler algorithm.
     *
     */
    private generatePuzzlerLayout(): Array<[number, number]> {
        // its idea of a pair table starts with
        // the length of the pair table, i guess.
        // oh, that means two things:
        // we encode pairs as -1 == unpaired, 0-indexed seqpos == paired
        // that means that EACH of their entries need to be ++ed
        let pairTable: number[] = [this._nopseudoknotPairs.length,
            ...this._nopseudoknotPairs.slice().map((value: number) => value + 1)];

        let rnap = LayoutEngineManager.instance.getLayoutEngine(RNApuzzler.NAME);

        Assert.assertIsDefined(rnap, 'Attempted to use RNAPuzzler, but it was not able to be laoded');

        return rnap.getLayout(pairTable);
    }

    /**
     * Called by drawTree, this function generates an array of x,y coords for
     * RNAs where the ordinary layout would fail, and scales it to something
     * Eterna-compatible.
     *
     */
    private initializePuzzlerLayout(): void {
        let puzzlerLayout = this.generatePuzzlerLayout();
        let scaleFactor = this.inferCustomLayoutScaleFactor(puzzlerLayout);
        this._puzzlerLayout = [];
        for (const coord of puzzlerLayout) {
            this._puzzlerLayout.push([coord[0] * scaleFactor, coord[1] * scaleFactor]);
        }
    }

    /**
     * Called by initalizeCustomLayout, this function is needed so that
     * externally defined customLayouts don't need to know anything fixed about
     * Eterna display conventions.
     *
     * @param customLayout An array of x,y coords defining "custom" nt positions
     *
     * @returns the normalization factor to make it Eterna-compatible
     */
    private inferCustomLayoutScaleFactor(customLayout: Array<[number, number] | [null, null]> | null): number {
        // Looks for a stacked pair and normalizes the distance between bases,
        // returning the normalization factor.
        let scaleFactor = 1.0;
        if (customLayout === null) {
            return scaleFactor;
        }
        if (this._targetPairs !== null) {
            for (let ii = 0; ii < this._targetPairs.length - 1; ii++) {
                // look for a stacked pair
                if (this._targetPairs[ii] === this._targetPairs[ii + 1] + 1) {
                    const customA = customLayout[ii];
                    const customB = customLayout[ii + 1];
                    if (
                        customA[0] === null
                        || customA[1] === null
                        || customB[0] === null
                        || customB[1] === null
                    ) {
                        continue;
                    }
                    let goX = customA[0] - customB[0];
                    let goY = customA[1] - customB[1];
                    let L = Math.sqrt(goX * goX + goY * goY);
                    scaleFactor = 1.0 / L;
                    return scaleFactor;
                }
            }
        }
        return scaleFactor;
    }

    private readonly _primarySpace: number;
    private readonly _pairSpace: number;
    // indices that need to be streched (e.g., connectors for oligos)
    private readonly _exceptionIndices: number[];

    private _root: RNATreeNode | null;
    private _origPairs: number[];
    private _targetPairs: number[] | null;
    private _pseudoknotPairs: number[];
    private _nopseudoknotPairs: number[];
    private _customLayout: Array<[number, number] | [null, null]> | null;
    private _puzzlerLayout: Array<[number, number]>;

    // / "New" method to gather NN free energies, just use the folding engine
    private _scoreBiPairs: number[];
}
