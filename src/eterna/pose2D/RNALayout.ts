import EPars from 'eterna/EPars';
import {Folder} from 'eterna/folding';

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

    public setupTree(pairs: number[]): void {
        let danglingStart = 0;
        let danglingEnd = 0;
        let ii: number;
        let biPairs: number[] = new Array(pairs.length);

        // / Delete old tree
        this._root = null;
        // / save for later
        this._origPairs = pairs.slice();

        for (ii = 0; ii < pairs.length; ii++) {
            biPairs[ii] = -1;
        }

        for (ii = 0; ii < pairs.length; ii++) {
            if (ii < pairs[ii]) {
                biPairs[ii] = pairs[ii];
                biPairs[pairs[ii]] = ii;
            }
        }

        for (ii = 0; ii < biPairs.length; ii++) {
            if (biPairs[ii] < 0) {
                danglingStart++;
            } else {
                break;
            }
        }

        for (ii = biPairs.length - 1; ii >= 0; ii--) {
            if (biPairs[ii] < 0) {
                danglingEnd++;
            } else {
                break;
            }
        }

        // / Array that will be used for scoring
        this._biPairs = new Array(biPairs.length + 1);
        for (ii = 0; ii < biPairs.length; ii++) {
            this._biPairs[ii + 1] = biPairs[ii] + 1;
        }
        this._biPairs[0] = biPairs.length;

        if (danglingStart === biPairs.length) {
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
            let circleLength: number = (xarray.length + 1) * this._primarySpace + this._pairSpace;
            let circleRadius: number = circleLength / (2 * Math.PI);
            let lengthWalker: number = this._pairSpace / 2.0;
            let goX = 0;
            let goY = 1;
            let _rootX: number = goX * circleRadius;
            let _rootY: number = goY * circleRadius;
            let crossX: number = -goY;
            let crossY: number = goX;
            let oligoDisplacement = 0;

            for (let ii = 0; ii < xarray.length; ii++) {
                if (this._exceptionIndices != null && this._exceptionIndices.indexOf(ii) >= 0) {
                    oligoDisplacement += 2 * this._primarySpace;
                }
            }
            circleLength += oligoDisplacement;

            for (let ii = 0; ii < xarray.length; ii++) {
                lengthWalker += this._primarySpace;
                if (this._exceptionIndices != null && this._exceptionIndices.indexOf(ii) >= 0) {
                    lengthWalker += 2 * this._primarySpace;
                }

                let radAngle: number = lengthWalker / circleLength * 2 * Math.PI - Math.PI / 2.0;
                xarray[ii] = (
                    _rootX + Math.cos(radAngle) * crossX * circleRadius + Math.sin(radAngle) * goX * circleRadius
                );
                yarray[ii] = (
                    _rootY + Math.cos(radAngle) * crossY * circleRadius + Math.sin(radAngle) * goY * circleRadius
                );
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

    // / DO NOT remove these _old methods until the new ones (below) are fully validated
    public scoreTreeOld(seq: number[], folder: Folder): void {
        if (this._biPairs == null || seq.length !== (this._biPairs.length - 1)) {
            throw new Error(`Layout tree is not properly setup for scoring ${this._biPairs.length} ${seq.length}`);
        }

        if (this._root == null) {
            return;
        }

        let S: number[] = new Array(seq.length + 2);
        S[0] = seq.length;

        for (let ii = 0; ii < seq.length; ii++) {
            S[ii + 1] = seq[ii];
        }

        this.scoreTreeRecursiveOld(S, folder, this._root, null);
    }

    public scoreTree(seq: number[], folder: Folder): void {
        if (this._biPairs == null) {
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
            let crossX: number = -rootnode.goY;
            let crossY: number = rootnode.goX;

            xarray[rootnode.indexA] = rootnode.x + crossX * this._pairSpace / 2.0;
            xarray[rootnode.indexB] = rootnode.x - crossX * this._pairSpace / 2.0;

            yarray[rootnode.indexA] = rootnode.y + crossY * this._pairSpace / 2.0;
            yarray[rootnode.indexB] = rootnode.y - crossY * this._pairSpace / 2.0;
        } else if (rootnode.indexA >= 0) {
            xarray[rootnode.indexA] = rootnode.x;
            yarray[rootnode.indexA] = rootnode.y;
        }

        for (let ii = 0; ii < rootnode.children.length; ii++) {
            this.getCoordsRecursive(rootnode.children[ii], xarray, yarray);
        }
    }

    private drawTreeRecursive(
        rootnode: RNATreeNode, parentnode: RNATreeNode, startX: number, startY: number, goX: number, goY: number
    ): void {
        let crossX: number = -goY;
        let crossY: number = goX;

        let childrenWidth: number = rootnode.children.length * RNALayout.NODE_R * 2;
        let oligoDisplacement = 0;

        rootnode.goX = goX;
        rootnode.goY = goY;

        if (rootnode.children.length === 1) {
            rootnode.x = startX;
            rootnode.y = startY;

            if (rootnode.children[0].isPair) {
                this.drawTreeRecursive(
                    rootnode.children[0], rootnode,
                    startX + goX * this._primarySpace, startY + goY * this._primarySpace, goX, goY
                );
            } else if (!rootnode.children[0].isPair && rootnode.children[0].indexA < 0) {
                this.drawTreeRecursive(rootnode.children[0], rootnode, startX, startY, goX, goY);
            } else {
                this.drawTreeRecursive(
                    rootnode.children[0], rootnode,
                    startX + goX * this._primarySpace, startY + goY * this._primarySpace, goX, goY
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

                let radAngle = lengthWalker / circleLength * 2 * Math.PI - Math.PI / 2.0;
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
                    childGoX / childGoLen, childGoY / childGoLen);

                if (rootnode.children[ii].isPair) {
                    lengthWalker += this._pairSpace / 2.0;
                }
            }
        } else {
            rootnode.x = startX;
            rootnode.y = startY;
        }
    }

    private getTotalScoreRecursive(rootnode: RNATreeNode): number {
        let score: number = rootnode.score;
        for (let ii = 0; ii < rootnode.children.length; ii++) {
            score += this.getTotalScoreRecursive(rootnode.children[ii]);
        }
        return score;
    }

    private scoreTreeRecursiveOld(S: number[], folder: Folder, rootnode: RNATreeNode, parentnode: RNATreeNode): void {
        let type1: number; let
            type2: number;

        if (rootnode.isPair) {
            // / Pair node
            if (rootnode.children.length > 1) {
                throw new Error('Pair node should never have more than one child');
            }

            if (rootnode.children.length === 0) {
                throw new Error("Pair node can't be childless");
            }

            if (rootnode.children[0].isPair) {
                type1 = EPars.pairType(S[rootnode.indexA + 1], S[rootnode.indexB + 1]);
                type2 = EPars.pairType(S[rootnode.children[0].indexB + 1], S[rootnode.children[0].indexA + 1]);
                rootnode.score = folder.loopEnergy(
                    0, 0, type1, type2, S[rootnode.indexA + 1 + 1], S[rootnode.indexB - 1 + 1],
                    S[rootnode.children[0].indexA + 1 + 1], S[rootnode.children[0].indexB - 1 + 1], true, true
                );
            }

            this.scoreTreeRecursiveOld(S, folder, rootnode.children[0], rootnode);
        } else if (!rootnode.isPair && rootnode.indexA >= 0) {
            // / Single residue node

        } else {
            // / Virtual node

            // / Top root case
            if (parentnode == null) {
                // / initial ml scoring
                rootnode.score = folder.mlEnergy(this._biPairs, S, 0, true);
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
                i = parentnode.indexA + 1;
                j = parentnode.indexB + 1;
                p = rootnode.children[firstStackIndex].indexA + 1;
                q = rootnode.children[firstStackIndex].indexB + 1;

                type1 = EPars.pairType(S[i], S[j]);
                type2 = EPars.pairType(S[q], S[p]);
                rootnode.score = folder.loopEnergy(
                    p - i - 1, j - q - 1, type1, type2, S[i + 1], S[j - 1], S[p - 1], S[q + 1], true, true
                );
            } else if (numStacks === 0) {
                i = parentnode.indexA + 1;
                j = parentnode.indexB + 1;

                let type: number = EPars.pairType(S[i], S[j]);
                rootnode.score = folder.hairpinEnergy(j - i - 1, type, S[i + 1], S[j - 1], S, i, j);
            } else if (numStacks > 1 && parentnode != null) {
                i = parentnode.indexA + 1;
                let cuti: number = folder.cutInLoop(i);
                rootnode.score = (cuti === 0)
                    ? folder.mlEnergy(this._biPairs, S, i, false) : folder.mlEnergy(this._biPairs, S, cuti, true);
            }

            for (ii = 0; ii < rootnode.children.length; ii++) {
                this.scoreTreeRecursiveOld(S, folder, rootnode.children[ii], rootnode);
            }
        }
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

    private readonly _primarySpace: number;
    private readonly _pairSpace: number;
    // indices that need to be streched (e.g., connectors for oligos)
    private readonly _exceptionIndices: number[];

    private _root: RNATreeNode;
    private _origPairs: number[];

    // / "New" method to gather NN free energies, just use the folding engine
    private _biPairs: number[];

    private static readonly NODE_R = 10;
}
