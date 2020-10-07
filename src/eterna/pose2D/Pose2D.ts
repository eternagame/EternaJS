import * as log from 'loglevel';
import {
    Container, Graphics, Point, Sprite, Texture, Rectangle
} from 'pixi.js';
import {Registration} from 'signals';
import EPars, {RNABase} from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import ExpPainter from 'eterna/ExpPainter';
import {
    ContainerObject, InputUtil, Flashbang, Dragger, DisplayUtil, SceneObject, SerialTask, Easing,
    ParallelTask, AlphaTask, LocationTask, DelayTask, SelfDestructTask, Vector2, Arrays,
    RepeatingTask, Updatable, Assert
} from 'flashbang';
import {Move} from 'eterna/mode/PoseEdit/PoseEditMode';
import LightRay from 'eterna/vfx/LightRay';
import TextBalloon from 'eterna/ui/TextBalloon';
import ROPWait from 'eterna/rscript/ROPWait';
import Fonts from 'eterna/util/Fonts';
import Sounds from 'eterna/resources/Sounds';
import BaseGlow from 'eterna/vfx/BaseGlow';
import BitmapManager from 'eterna/resources/BitmapManager';
import Booster from 'eterna/mode/PoseEdit/Booster';
import GameMode from 'eterna/mode/GameMode';
import Utility from 'eterna/util/Utility';
import Folder from 'eterna/folding/Folder';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import Base from './Base';
import BaseDrawFlags from './BaseDrawFlags';
import EnergyScoreDisplay from './EnergyScoreDisplay';
import HighlightBox, {HighlightType} from './HighlightBox';
import BaseRope from './BaseRope';
import PseudoknotLines from './PseudoknotLines';
import Molecule from './Molecule';
import PaintCursor from './PaintCursor';
import PoseField from './PoseField';
import PoseUtil from './PoseUtil';
import PuzzleEditOp from './PuzzleEditOp';
import RNAAnchorObject from './RNAAnchorObject';
import RNALayout, {RNATreeNode} from './RNALayout';
import ScoreDisplayNode, {ScoreDisplayNodeType} from './ScoreDisplayNode';
import ExplosionFactorPanel from './ExplosionFactorPanel';
import triangulate from './triangulate';

type InteractionEvent = PIXI.interaction.InteractionEvent;

interface Mut {
    pos: number;
    base: string;
}

interface AuxInfo {
    cleavingSite?: number;
}

export type PoseMouseDownCallback = (e: InteractionEvent, closestDist: number, closestIndex: number) => void;

export default class Pose2D extends ContainerObject implements Updatable {
    public static readonly COLOR_CURSOR: number = 0xFFC0CB;
    public static readonly ZOOM_SPACINGS: number[] = [45, 30, 20, 14, 7];

    public static readonly OLIGO_MODE_DIMER: number = 1;
    public static readonly OLIGO_MODE_EXT3P: number = 2;
    public static readonly OLIGO_MODE_EXT5P: number = 3;

    private static readonly SCORES_POSITION_Y = 128;

    constructor(poseField: PoseField, editable: boolean) {
        super();
        this._poseField = poseField;
        this._editable = editable;
    }

    protected added() {
        super.added();

        this._scoreNodeHighlight = new Graphics();
        this.container.addChild(this._scoreNodeHighlight);

        this._baseRope = new BaseRope(this);
        this.addObject(this._baseRope, this.container);

        this._pseudoknotLines = new PseudoknotLines(this);
        this.addObject(this._pseudoknotLines, this.container);

        this.container.addChild(this._baseLayer);

        this._primaryScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._primaryScoreEnergyDisplay.position = new Point(17, Pose2D.SCORES_POSITION_Y);
        this.container.addChild(this._primaryScoreEnergyDisplay);

        this._deltaScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._deltaScoreEnergyDisplay.position = new Point(17 + 119, Pose2D.SCORES_POSITION_Y);
        this._deltaScoreEnergyDisplay.visible = false;
        this.container.addChild(this._deltaScoreEnergyDisplay);

        this._secondaryScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._secondaryScoreEnergyDisplay.position = new Point(17 + 119 * 2, Pose2D.SCORES_POSITION_Y);
        this._secondaryScoreEnergyDisplay.visible = false;
        this.container.addChild(this._secondaryScoreEnergyDisplay);

        this._moleculeLayer = new Container();
        this.container.addChild(this._moleculeLayer);
        this._moleculeLayer.visible = false;

        this._energyTextLayer = new Container();
        this.container.addChild(this._energyTextLayer);

        this._paintCursor = new PaintCursor();
        this._paintCursor.display.visible = false;
        this.addObject(this._paintCursor, this.container);

        this._explosionFactorPanel = new ExplosionFactorPanel();
        this._explosionFactorPanel.display.position = new Point(17, Pose2D.SCORES_POSITION_Y + 82);
        this._explosionFactorPanel.display.visible = false;
        this._explosionFactorPanel.factorUpdated.connect((factor: number) => {
            this._explosionFactor = factor;
            this.computeLayout(true);
            this._redraw = true;
        });
        this.addObject(this._explosionFactorPanel, this.container);

        this._explosionRays = [];
        for (let ii = 0; ii < 10; ii++) {
            const ray = new LightRay();
            this._explosionRays.push(ray);
            this.addObject(ray, this.container);
        }

        this._selectionHighlightBox = new HighlightBox(this, HighlightType.DESIGN);
        this.addObject(this._selectionHighlightBox, this.container);

        this._restrictedHighlightBox = new HighlightBox(this, HighlightType.RESTRICTED);
        this.addObject(this._restrictedHighlightBox, this.container);

        this._unstableHighlightBox = new HighlightBox(this, HighlightType.UNSTABLE);
        this.addObject(this._unstableHighlightBox, this.container);

        this._userDefinedHighlightBox = new HighlightBox(this, HighlightType.USER_DEFINED);
        this.addObject(this._userDefinedHighlightBox, this.container);

        this._forcedHighlightBox = new HighlightBox(this, HighlightType.FORCED);
        this.addObject(this._forcedHighlightBox, this.container);

        this._shiftHighlightBox = new HighlightBox(this, HighlightType.SHIFT);
        this.addObject(this._shiftHighlightBox, this.container);

        if (!this._editable) {
            this._currentColor = -1;
        }

        this._auxInfoCanvas = new Graphics();
        this._auxInfoCanvas.visible = false;
        this.container.addChild(this._auxInfoCanvas);

        this._auxTextballoon = new TextBalloon('', 0x0, 0.9);
        this._auxTextballoon.display.visible = false;
        this.addObject(this._auxTextballoon, this._auxInfoCanvas);

        this._strandLabel = new TextBalloon('', 0x0, 0.8);
        this._strandLabel.display.visible = false;
        this.addObject(this._strandLabel, this.container);

        this.pointerMove.connect((p) => this.onMouseMoved(p.data.global));
        this.pointerDown.filter(InputUtil.IsLeftMouse).connect((e) => this.callStartMousedownCallback(e));
        this.pointerOut.connect(() => this.onMouseOut());

        // handle view settings
        this.regs.add(Eterna.settings.showNumbers.connectNotify((value) => { this.showNumbering = value; }));
        this.regs.add(Eterna.settings.showRope.connectNotify((value) => { this.showRope = value; }));
        this.regs.add(Eterna.settings.showLetters.connectNotify((value) => { this.lettermode = value; }));
        this.regs.add(
            Eterna.settings.useContinuousColors.connectNotify((value) => { this.useContinuousExpColors = value; })
        );
        this.regs.add(Eterna.settings.useExtendedColors.connectNotify((value) => { this.useExtendedScale = value; }));
        this.regs.add(
            Eterna.settings.displayFreeEnergies.connectNotify((value) => { this.displayScoreTexts = value; })
        );
        this.regs.add(
            Eterna.settings.highlightRestricted.connectNotify((value) => { this.highlightRestricted = value; })
        );
        this.regs.add(Eterna.settings.displayAuxInfo.connectNotify((value) => { this.displayAuxInfo = value; }));
        this.regs.add(Eterna.settings.simpleGraphics.connectNotify((value) => { this.useSimpleGraphics = value; }));
        this.regs.add(Eterna.settings.usePuzzlerLayout.connect(() => this.computeLayout()));
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;

        this.container.hitArea = new Rectangle(0, 0, width, height);
    }

    public get primaryScoreDisplay(): EnergyScoreDisplay {
        return this._primaryScoreEnergyDisplay;
    }

    public get secondaryScoreDisplay(): EnergyScoreDisplay {
        return this._secondaryScoreEnergyDisplay;
    }

    public addAnchoredObject(obj: RNAAnchorObject): void {
        this._anchoredObjects.push(obj);
    }

    public removeAnchoredObject(obj: RNAAnchorObject): void {
        for (let ii = 0; ii < this._anchoredObjects.length; ++ii) {
            if (obj === this._anchoredObjects[ii]) {
                this._anchoredObjects.splice(ii, 1);
                break;
            }
        }
    }

    public get isAnimating(): boolean {
        return this._baseToX != null;
    }

    public get isFolding(): boolean {
        return (this.lastSampledTime - this._foldStartTime < this._foldDuration);
    }

    public visualizeFeedback(dat: number[], mid: number, lo: number, hi: number, startIndex: number): void {
        // coloring
        const newdat: number[] = ExpPainter.transformData(dat, hi, lo);
        this._expPainter = new ExpPainter(newdat, startIndex);
        this._expMid = mid;
        this._expHi = hi;
        this.paintFeedback();

        // print feedback score
        for (let ii = 0; ii < this._feedbackObjs.length; ii++) {
            this.removeObject(this._feedbackObjs[ii]);
        }

        this.printFeedback(dat);
        this.updatePrintFeedback();
    }

    public paintFeedback(): void {
        if (!this._expPainter) {
            return;
        }

        this._expPainter.continuous = this._expContinuous;
        this._expPainter.extendedScale = this._expExtendedScale;

        for (let ii = 0; ii < this._sequence.length; ii++) {
            this._bases[ii].setColorLevel(
                true, this._expPainter.getColorLevelWithMidpoint(ii, this._expMid, this._expHi)
            );
        }
        this._redraw = true;
    }

    public clearFeedback(): void {
        for (let ii = 0; ii < this._sequence.length; ii++) {
            this._bases[ii].setColorLevel(false, -1);
        }
        this._redraw = true;
    }

    public get zoomLevel(): number {
        return this._zoomLevel;
    }

    public setZoomLevel(zoomLevel: number, animate: boolean = true, center: boolean = false): void {
        if ((this._zoomLevel !== zoomLevel || center) && animate) {
            if (this._zoomLevel === zoomLevel && center) {
                if (Math.abs(this._width / 2 - this._offX) + Math.abs(this._height / 2 - this._offY) < 50) {
                    return;
                }
            }

            this._startOffsetX = this._offX;
            this._startOffsetY = this._offY;

            let scaler = 1;
            if (zoomLevel > this._zoomLevel) {
                scaler = Pose2D.ZOOM_SPACINGS[zoomLevel] / Pose2D.ZOOM_SPACINGS[this._zoomLevel];
            }

            if (!this._offsetTranslating && !center) {
                this._endOffsetX = scaler * (this._offX - this._width / 2) + this._width / 2;
                this._endOffsetY = scaler * (this._offY - this._height / 2) + this._height / 2;
            } else if (this._offsetTranslating) {
                this._endOffsetX = scaler * (this._endOffsetX - this._width / 2) + this._width / 2;
                this._endOffsetY = scaler * (this._endOffsetY - this._height / 2) + this._height / 2;
            } else {
                this._endOffsetX = this._width / 2;
                this._endOffsetY = this._height / 2;
            }

            this._offsetTranslating = true;

            this._zoomLevel = zoomLevel;
            this.computeLayout(true);
            this._redraw = true;
        } else if (this._zoomLevel !== zoomLevel) {
            this._zoomLevel = zoomLevel;
            this.computeLayout(true);
            this._redraw = true;
        }
    }

    public computeDefaultZoomLevel(): number {
        const n: number = this.fullSequenceLength;
        const xarray: number[] = new Array(n);
        const yarray: number[] = new Array(n);

        const rnaCoords: RNALayout = new RNALayout(Pose2D.ZOOM_SPACINGS[0], Pose2D.ZOOM_SPACINGS[0]);
        rnaCoords.setupTree(this._pairs, this._targetPairs);
        rnaCoords.drawTree(this._customLayout);
        rnaCoords.getCoords(xarray, yarray);

        const xmin: number = Math.min(...xarray);// xarray[0];
        const xmax: number = Math.max(...xarray);
        const ymin: number = Math.min(...yarray);
        const ymax: number = Math.max(...yarray);
        const xdiff: number = xmax - xmin;
        const ydiff: number = ymax - ymin;
        const xscale: number = xdiff / this._width;
        const yscale: number = ydiff / this._height;

        const scale: number = Math.max(xscale, yscale);
        if (scale < 1.0) {
            return 0;
        } else if ((30 / 45) * scale < 1.0) {
            return 1;
        } else if ((20 / 45) * scale < 1.0) {
            return 2;
        } else if ((14 / 45) * scale < 1.0) {
            return 3;
        } else {
            return 4;
        }
    }

    public set currentColor(col: number) {
        this._currentColor = col;
    }

    public get currentColor(): number {
        return this._currentColor;
    }

    public doneColoring(): void {
        this._coloring = false;

        let needUpdate = false;

        if (this._mutatedSequence == null) {
            return;
        }

        if (this._mutatedSequence.length !== this.fullSequenceLength) {
            throw new Error("Mutated sequence and original sequence lengths don't match");
        }

        let numMut = 0;
        const muts: Mut[] = [];
        let div = 1;
        if (this._currentColor === RNABase.PAIR
            || this._currentColor === RNABase.GC_PAIR
            || this._currentColor === RNABase.AU_PAIR
            || this._currentColor === RNABase.GU_PAIR) {
            div = 2;
        }

        const ofs: number = (
            this._oligo != null
            && this._oligoMode === Pose2D.OLIGO_MODE_EXT5P
        ) ? this._oligo.length : 0;
        let ii: number;
        for (ii = 0; ii < this._sequence.length; ii++) {
            if (this._sequence.baseArray[ii] !== this._mutatedSequence.baseArray[ii + ofs]) {
                numMut++;
                this._sequence.baseArray[ii] = this._mutatedSequence.baseArray[ii + ofs];
                muts.push({pos: ii + 1, base: EPars.sequenceToString([this._sequence.baseArray[ii]])});
                needUpdate = true;
            }
        }
        if (needUpdate) {
            this.callTrackMovesCallback(numMut / div, muts);
        }

        if (needUpdate || this._lockUpdated || this._bindingSiteUpdated || this._designStructUpdated) {
            this.checkPairs();
            this.updateMolecule();
            this.generateScoreNodes();
            this.callPoseEditCallback();
        }

        this._mutatedSequence = null;
        this._lockUpdated = false;
        this._bindingSiteUpdated = false;
        this._designStructUpdated = false;
    }

    public setMutated(seqArr: number[]): void {
        Assert.assertIsDefined(this._mutatedSequence);
        const n: number = Math.min(this._mutatedSequence.length, seqArr.length);
        const ofs: number = (
            this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_EXT5P
        ) ? this._oligo.length : 0;

        for (let ii = 0; ii < n; ii++) {
            if (this._mutatedSequence.baseArray[ii] !== seqArr[ii] && !this.isLocked(ofs + ii)) {
                this._mutatedSequence.baseArray[ii] = seqArr[ii];
                this._bases[ofs + ii].setType(seqArr[ii]);
            }
        }
    }

    public pasteSequence(sequence: number[]): void {
        if (sequence == null) {
            return;
        }

        let numMut = 0;
        const muts: Mut[] = [];

        const n: number = Math.min(sequence.length, this._sequence.length);
        let needUpdate = false;
        const ofs: number = (
            this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_EXT5P
        ) ? this._oligo.length : 0;

        for (let ii = 0; ii < n; ii++) {
            if (sequence[ii] === RNABase.UNDEFINED) continue;
            if (this._sequence.baseArray[ii] !== sequence[ii] && !this.isLocked(ofs + ii)) {
                numMut++;
                this._sequence.baseArray[ii] = sequence[ii];
                muts.push({pos: ii + 1, base: EPars.sequenceToString([this._sequence.baseArray[ii]])});
                this._bases[ofs + ii].setType(sequence[ii]);
                needUpdate = true;
            }
        }

        if (needUpdate) {
            this.callTrackMovesCallback(numMut, muts);

            this.checkPairs();
            this.updateMolecule();
            this.generateScoreNodes();
            this.callPoseEditCallback();
        }
    }

    public getBaseLoc(seq: number, out: Point | null = null): Point {
        if (out == null) {
            out = new Point();
        }
        out.x = this._bases[seq].x + this._offX;
        out.y = this._bases[seq].y + this._offY;
        return out;
    }

    public getEnergyScorePos(index: number, out: Point | null = null): Point {
        if (out === null) {
            out = new Point();
        }
        Assert.assertIsDefined(
            this._scoreTexts,
            "Can't get substructure score position, because the scores do not exist"
        );
        out.x = this._scoreTexts[index].x;
        out.y = this._scoreTexts[index].y;
        return out;
    }

    public getBaseOutXY(seq: number, out: Point | null = null): Point {
        out = this._bases[seq].getOutXY(out);
        out.x += this._offX;
        out.y += this._offY;
        return out;
    }

    public clearMouse(): void {
        // document.getElementById(Eterna.PIXI_CONTAINER_ID).style.cursor = '';
        this._paintCursor.display.visible = false;
        this._strandLabel.display.visible = false;
    }

    public parseCommand(command: number, closestIndex: number): [string, PuzzleEditOp, number[]?] | null {
        switch (command) {
            case RNABase.ADD_BASE:
                return PoseUtil.addBaseWithIndex(closestIndex, this._pairs);

            case RNABase.ADD_PAIR:
                return PoseUtil.addPairWithIndex(closestIndex, this._pairs);

            case RNABase.DELETE:
                return this.deleteBaseWithIndex(closestIndex);

            default:
                return null;
        }
    }

    public parseCommandWithPairs(
        command: number, closestIndex: number, pairs: SecStruct
    ): [string, PuzzleEditOp, number[]?] | null {
        switch (command) {
            case RNABase.ADD_BASE:
                return PoseUtil.addBaseWithIndex(closestIndex, pairs);

            case RNABase.DELETE:
                return this.deleteBaseWithIndexPairs(closestIndex, pairs);

            default:
                return null;
        }
    }

    public onPoseMouseDownPropagate(e: InteractionEvent, closestIndex: number): void {
        const altDown: boolean = Flashbang.app.isAltKeyDown;
        const ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;
        const ctrlDownOrBaseMarking = ctrlDown || this.currentColor === RNABase.BASE_MARK;

        if ((this._coloring && !altDown) || ctrlDownOrBaseMarking) {
            if (ctrlDownOrBaseMarking && closestIndex >= this.sequence.length) {
                return;
            }
            this.onPoseMouseDown(e, closestIndex);
        }
    }

    public onPoseMouseDown(e: InteractionEvent, closestIndex: number): void {
        const altDown: boolean = Flashbang.app.isAltKeyDown;
        const shiftDown: boolean = Flashbang.app.isShiftKeyDown;
        const ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;

        if (closestIndex >= 0) {
            this._mouseDownAltKey = altDown;
            if ((ctrlDown || this.currentColor === RNABase.BASE_MARK) && closestIndex < this.fullSequenceLength) {
                this.toggleBaseMark(closestIndex);
                return;
            }
            if (shiftDown) {
                if (closestIndex < this.sequenceLength) {
                    this._shiftStart = closestIndex;
                    this._shiftEnd = closestIndex;
                    this.updateShiftHighlight();

                    let reg: Registration | null = null;
                    reg = this.pointerUp.connect(() => {
                        this._shiftStart = -1;
                        this._shiftEnd = -1;
                        if (reg) reg.close();
                    });
                }
                e.stopPropagation();
                return;
            }
            this._lastShiftedCommand = -1;
            this._lastShiftedIndex = -1;
            const cmd: [string, PuzzleEditOp, number[]?] | null = this.parseCommand(this._currentColor, closestIndex);
            if (cmd == null) {
                const dragger = new Dragger();
                this.addObject(dragger);
                dragger.dragged.connect((p) => {
                    this.onMouseMoved(p as Point);
                });
                dragger.dragComplete.connect(() => this.onMouseUp());

                this.onBaseMouseDown(closestIndex, ctrlDown);
            } else {
                this._lastShiftedCommand = this._currentColor;
                this._lastShiftedIndex = closestIndex;

                this.callAddBaseCallback(cmd[0], cmd[1], closestIndex);
            }

            e.stopPropagation();
        } else if (shiftDown) {
            this._shiftStart = -1;
            this._shiftEnd = -1;
            this.updateShiftHighlight();
        }
    }

    public toggleBaseMark(baseIndex: number): void {
        if (!this.isTrackedIndex(baseIndex)) {
            this.addBaseMark(baseIndex);
        } else {
            this.removeBaseMark(baseIndex);
        }
    }

    public addBaseMark(baseIndex: number, colors: number | number[] = 0x000000): void {
        if (!this.isTrackedIndex(baseIndex)) {
            if (typeof (colors) === 'number') colors = [colors];
            ROPWait.notifyBlackMark(baseIndex, true);
            this._bases[baseIndex].mark(colors);
        }
    }

    public removeBaseMark(baseIndex: number): void {
        this._bases[baseIndex].unmark();
        ROPWait.notifyBlackMark(baseIndex, false);
    }

    public isTrackedIndex(index: number): boolean {
        return this._bases[index].isMarked();
    }

    public onMouseMoved(point: Point): void {
        if (!this._poseField.containsPoint(point.x, point.y)) {
            this.onMouseOut();
            return;
        }

        if (!this._coloring) {
            this.clearMouse();
        }

        this.container.toLocal(point, undefined, Pose2D.P);
        const mouseX = Pose2D.P.x;
        const mouseY = Pose2D.P.y;

        this._paintCursor.display.x = mouseX;
        this._paintCursor.display.y = mouseY;

        let closestDist = -1;
        let closestIndex = -1;
        for (let ii = 0; ii < this.fullSequenceLength; ii++) {
            const mouseDist: number = this._bases[ii].isClicked(
                mouseX - this._offX, mouseY - this._offY, this._zoomLevel, this._coloring
            );
            if (mouseDist >= 0) {
                if (closestIndex < 0 || mouseDist < closestDist) {
                    closestIndex = ii;
                    closestDist = mouseDist;
                }
            }
        }

        if (closestIndex >= 0 && this._currentColor >= 0) {
            this.onBaseMouseMove(closestIndex);
            // document.getElementById(Eterna.PIXI_CONTAINER_ID).style.cursor = 'none';
            this._paintCursor.display.visible = true;
            this._paintCursor.setShape(this._currentColor);

            const strandName: string | null = this.getStrandName(closestIndex);
            if (strandName != null) {
                this._strandLabel.setText(strandName);
                if (mouseX + 16 + this._strandLabel.width > this._width) {
                    this._strandLabel.display.position = new Point(
                        mouseX - 16 - this._strandLabel.width,
                        mouseY + 16
                    );
                } else {
                    this._strandLabel.display.position = new Point(mouseX + 16, mouseY + 16);
                }
                this._strandLabel.display.visible = true;
            }
        } else {
            this._lastColoredIndex = -1;
        }

        if (!this._coloring) {
            this.updateScoreNodeGui();
            if (this._feedbackObjs.length > 0) {
                for (let ii = 0; ii < this._feedbackObjs.length; ii++) {
                    if (ii === closestIndex) {
                        continue;
                    }
                    this._feedbackObjs[ii].display.visible = false;
                }
                if (closestIndex >= 0) {
                    this._feedbackObjs[closestIndex].display.visible = true;
                }
            }
        }
    }

    public onMouseUp(): void {
        this.doneColoring();
        this._mouseDownAltKey = false;
        ROPWait.notifyEndPaint();
    }

    public deleteBaseWithIndexPairs(index: number, pairs: SecStruct): [string, PuzzleEditOp, number[]?] {
        if (this.isTrackedIndex(index)) {
            this.toggleBaseMark(index);
        }

        return PoseUtil.deleteNopairWithIndex(index, pairs);
    }

    public clearTracking(): void {
        for (const base of this._bases) {
            base.unmark();
        }
    }

    public get trackedIndices(): { baseIndex: number; colors: number[] }[] {
        const result = [] as { baseIndex: number; colors: number[] }[];
        this._bases.forEach((base, baseIndex) => {
            if (base.isMarked()) {
                result.push({baseIndex, colors: base.markerColors});
            }
        });
        return result;
    }

    public getBase(ind: number): Base {
        return this._bases[ind];
    }

    public get xOffset(): number {
        return this._offX;
    }

    public get yOffset(): number {
        return this._offY;
    }

    public setOffset(offX: number, offY: number): void {
        this._offX = offX;
        this._offY = offY;
        this._redraw = true;
    }

    public get shiftLimit(): number {
        return this._shiftLimit;
    }

    public set shiftLimit(limit: number) {
        this._shiftLimit = limit + this._sequence.length;
    }

    public set barcodes(barcodes: number[]) {
        this._barcodes = barcodes.slice();
    }

    public set puzzleLocks(puzlocks: boolean[] | undefined) {
        if (puzlocks === undefined) {
            this._locks = undefined;
        } else {
            this._locks = puzlocks.slice();
        }

        this._redraw = true;
    }

    public get puzzleLocks(): boolean[] | undefined {
        if (this._locks === undefined) {
            this._locks = Pose2D.createDefaultLocks(this._sequence.length);
        }
        return this._locks.slice();
    }

    public isLocked(seqnum: number): boolean {
        if (this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_EXT5P) {
            seqnum -= this._oligo.length;
        }

        if (seqnum < 0 || seqnum >= this._sequence.length) {
            return true;
        } else {
            return this._locks != null && this._locks.length > seqnum && this._locks[seqnum];
        }
    }

    public set forcedStruct(forced: number[] | null) {
        const len: number = this.fullSequenceLength;
        if (forced == null) {
            this._forcedStruct = null;
        } else {
            if (forced.length !== len) {
                throw new Error(`Forced structure length does not match sequence length ${forced.length} ${this._sequence.length} ${this._pairs.length}`);
            }

            this._forcedStruct = forced.slice();
        }

        for (let ii = 0; ii < len; ii++) {
            this._bases[ii].forced = this._forcedStruct != null && this._forcedStruct[ii] !== EPars.FORCE_IGNORE;
        }
    }

    public get forcedStruct(): number[] | null {
        if (this._forcedStruct != null) {
            return this._forcedStruct.slice();
        }

        const temp: number[] = [];
        for (let ii = 0; ii < this.fullSequenceLength; ii++) {
            temp.push(EPars.FORCE_IGNORE);
        }

        return temp;
    }

    public get pseudoknotPairs(): SecStruct {
        return this._pseudoknotPairs;
    }

    public set forcedHighlights(elems: number[]) {
        this._forcedHighlightBox.clear();
        this._forcedHighlightBox.setHighlight(elems);
    }

    public set structConstraints(doCare: boolean[] | undefined) {
        let ii: number;
        const len: number = this.fullSequenceLength;
        const dc: boolean[] | null = (doCare == null ? null : doCare.slice());
        if (dc != null && this._oligosOrder != null) {
            const idxMap: number[] | null = this.getOrderMap(undefined);
            if (idxMap !== null && dc !== null && doCare !== undefined) {
                for (ii = 0; ii < len; ii++) {
                    dc[ii] = doCare[idxMap.indexOf(ii)];
                }
            }
        }
        for (ii = 0; ii < len; ii++) {
            this._bases[ii].dontcare = dc == null ? false : !dc[ii];
        }
    }

    public clearDesignStruct(): void {
        this._designStruct.fill(false);
        this.updateDesignHighlight();
    }

    public toggleDesignStruct(seqnum: number): boolean {
        if (this._designStruct.length !== this.fullSequenceLength) {
            this._designStruct = new Array(this.fullSequenceLength);
        }

        this._designStruct[seqnum] = !this._designStruct[seqnum];
        ROPWait.notifyBlueMark(seqnum, this._designStruct[seqnum]);
        this.updateDesignHighlight();
        const segments: number[] = this.designSegments;
        return (segments.length === 4
            && segments[1] - segments[0] === segments[3] - segments[2]
            && (segments[2] - segments[1] > 3
                || this.fullSequence.hasCut(segments[1], segments[2])));
    }

    public get designSegments(): number[] {
        const elems: number[] = [];
        let curr = 0;
        for (let jj = 0; jj < this.fullSequenceLength; jj++) {
            const stat: number = this._designStruct[jj] ? 1 : 0;
            if ((curr ^ stat) !== 0) {
                elems.push(jj - curr);
                curr = stat;
            }
        }
        if ((elems.length % 2) === 1) {
            elems.push(this.fullSequenceLength - 1);
        }

        return elems;
    }

    public shift3Prime(): void {
        const q: number[] | null = this._shiftHighlightBox.getQueue();
        if (q == null) {
            return;
        }

        const first: number = q[0];
        const last: number = q[1];
        let ii: number;
        // can't shift locked bases
        for (ii = first; ii <= last; ii++) {
            if (this._locks && this._locks[ii]) {
                return;
            }
        }
        // find the next acceptable spot
        let ofs = 1;
        const len: number = this.sequenceLength;
        while (last + ofs < len) {
            for (ii = first + ofs; ii <= last + ofs; ii++) {
                if (this._locks && this._locks[ii]) {
                    break;
                }
            }
            if (ii > last + ofs) {
                break;
            }
            ofs++;
        }
        // if not found, give up
        if (last + ofs >= len) {
            return;
        }

        let mutated: number[];
        let segment: number[];
        if (ofs === 1) {
            // obtain the segment you are trying to move, plus one 3' base
            segment = this._sequence.baseArray.slice(first, last + 1 + 1);
            // remove the base from the 3' end
            const base = segment.pop();
            Assert.assertIsDefined(base);
            // put the base on the 5' end
            segment.unshift(base);
            mutated = this._sequence.baseArray.slice(0, first)
                .concat(segment)
                .concat(this._sequence.baseArray.slice(last + 1 + 1));
        } else {
            mutated = this._sequence.baseArray.slice();
            for (ii = first; ii <= last; ii++) {
                const xx: number = mutated[ii + ofs];
                mutated[ii + ofs] = mutated[ii];
                mutated[ii] = xx;
            }
        }

        this._mutatedSequence = this.fullSequence.slice(0);
        this.setMutated(mutated);
        this.doneColoring();
        this._shiftHighlightBox.clear();
        this._shiftHighlightBox.setHighlight([first + ofs, last + ofs]);
    }

    public shift5Prime(): void {
        const q: number[] | null = this._shiftHighlightBox.getQueue();
        if (q == null) {
            return;
        }

        const first: number = q[0];
        const last: number = q[1];
        let ii: number;
        // can't shift locked bases
        for (ii = first; ii <= last; ii++) {
            if (this._locks && this._locks[ii]) {
                return;
            }
        }
        // find the next acceptable spot
        let ofs = -1;
        while (first + ofs >= 0) {
            for (ii = first + ofs; ii <= last + ofs; ii++) {
                if (this._locks && this._locks[ii]) {
                    break;
                }
            }
            if (ii > last + ofs) {
                break;
            }
            ofs--;
        }
        // if not found, give up
        if (first + ofs < 0) {
            return;
        }

        let mutated: number[];
        let segment: number[];
        if (ofs === -1) {
            segment = this._sequence.baseArray.slice(first - 1, last + 1);
            const base = segment.shift();
            Assert.assertIsDefined(base);
            segment.push(base);
            mutated = this._sequence.baseArray.slice(0, first - 1)
                .concat(segment)
                .concat(this._sequence.baseArray.slice(last + 1));
        } else {
            mutated = this._sequence.baseArray.slice();
            for (ii = first; ii <= last; ii++) {
                const xx: number = mutated[ii + ofs];
                mutated[ii + ofs] = mutated[ii];
                mutated[ii] = xx;
            }
        }

        this._mutatedSequence = this.fullSequence.slice(0);
        this.setMutated(mutated);
        this.doneColoring();
        this._shiftHighlightBox.clear();
        this._shiftHighlightBox.setHighlight([first + ofs, last + ofs]);
    }

    public isDesignStructureHighlighted(index: number): boolean {
        return (this._designStruct[index] === true);
    }

    public getSequenceString(): string {
        return EPars.sequenceToString(this._sequence.baseArray);
    }

    public get satisfied(): boolean {
        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs.pairs[ii] > ii && !this.isPairSatisfied(ii, this._pairs.pairs[ii])) {
                return false;
            }
        }

        return true;
    }

    public set showNumbering(show: boolean) {
        // FIXME: change  _numberingMode to _showNumbering?
        this._numberingMode = show;
        this._redraw = true;
    }

    public get showNumbering(): boolean {
        return this._numberingMode;
    }

    public set showRope(show: boolean) {
        this._showBaseRope = show;
        this._redraw = true;
    }

    public get showRope(): boolean {
        return this._showBaseRope;
    }

    public set showPseudoknots(show: boolean) {
        this._showPseudoknots = show;
        this._redraw = true;
    }

    public get showPseudoknots(): boolean {
        return this._showPseudoknots;
    }

    public set useSimpleGraphics(simpleGraphics: boolean) {
        this._simpleGraphicsMods = simpleGraphics;
        this._redraw = true;
    }

    public get useSimpleGraphics(): boolean {
        return this._simpleGraphicsMods;
    }

    public set highlightRestricted(highlight: boolean) {
        this._highlightRestricted = highlight;
        this._restrictedHighlightBox.enabled = highlight;
    }

    public get highlightRestricted(): boolean {
        return this._highlightRestricted;
    }

    public set useContinuousExpColors(cont: boolean) {
        this._expContinuous = cont;
        this._redraw = true;

        if (this._expPainter) {
            this.paintFeedback();
        }
    }

    public set useExtendedScale(extended: boolean) {
        this._expExtendedScale = extended;
        this._redraw = true;

        if (this._expPainter) {
            this.paintFeedback();
        }
    }

    public get displayScoreTexts(): boolean {
        return this._displayScoreTexts;
    }

    public set displayScoreTexts(dis: boolean) {
        this._displayScoreTexts = dis;
        this.generateScoreNodes();
    }

    public updateHighlightsAndScores(): void {
        this._prevOffsetX = -1;
        this._prevOffsetY = -1;
        this.generateScoreNodes();
    }

    public set showEnergyHighlight(display: boolean) {
        this._highlightEnergyText = display;
        this.generateScoreNodes();
    }

    public clearHighlight(): void {
        this._selectionHighlightBox.clear();
    }

    // / For restricted queue
    public clearRestrictedHighlight(): void {
        this._restrictedHighlightBox.clear();
    }

    public highlightRestrictedSequence(restricted: number[]): void {
        this._restrictedHighlightBox.setHighlight(restricted);
    }

    public clearUnstableHighlight(): void {
        this._unstableHighlightBox.clear();
    }

    public highlightUnstableSequence(unstable: number[]): void {
        this._unstableHighlightBox.setHighlight(unstable);
    }

    public clearUserDefinedHighlight(): void {
        this._userDefinedHighlightBox.clear();
    }

    public highlightUserDefinedSequence(userDefined: number[]): void {
        this._userDefinedHighlightBox.setHighlight(userDefined);
    }

    public clearShiftHighlight(): void {
        this._shiftHighlightBox.clear();
    }

    public praiseStack(stackStart: number, stackEnd: number): void {
        this._praiseQueue.push(stackStart);
        this._praiseQueue.push(stackEnd);
    }

    public praiseSequence(seqStart: number, seqEnd: number): void {
        this._praiseSeq.push(seqStart);
        this._praiseSeq.push(seqEnd);
    }

    private onPraiseStack(stackStart: number, stackEnd: number, playSound: boolean): void {
        let xPos = 0;
        let yPos = 0;

        let playUA = false;
        let playGC = false;
        let playGU = false;

        for (let kk: number = stackStart; kk <= stackEnd; kk++) {
            if (this._pairs.pairs[kk] < 0) {
                return;
            }
        }

        for (let ii: number = stackStart; ii <= stackEnd; ii++) {
            const aa: number = ii;
            const bb: number = this._pairs.pairs[ii];

            if ((this._sequence.baseArray[aa] === RNABase.ADENINE
                && this._sequence.baseArray[bb] === RNABase.URACIL)
                || (this._sequence.baseArray[bb] === RNABase.ADENINE
                    && this._sequence.baseArray[aa] === RNABase.URACIL)) {
                playUA = true;
            } else if ((this._sequence.baseArray[aa] === RNABase.GUANINE
                && this._sequence.baseArray[bb] === RNABase.CYTOSINE)
                || (this._sequence.baseArray[bb] === RNABase.GUANINE
                    && this._sequence.baseArray[aa] === RNABase.CYTOSINE)) {
                playGC = true;
            } else if ((this._sequence.baseArray[aa] === RNABase.GUANINE
                && this._sequence.baseArray[bb] === RNABase.URACIL)
                || (this._sequence.baseArray[bb] === RNABase.GUANINE
                    && this._sequence.baseArray[aa] === RNABase.URACIL)) {
                playGU = true;
            }

            this._bases[ii].startSparking();
            this._bases[this._pairs.pairs[ii]].startSparking();
            const p: Point = this.getBaseLoc(ii);
            const p2: Point = this.getBaseLoc(this._pairs.pairs[ii]);

            xPos += p.x;
            yPos += p.y;

            xPos += p2.x;
            yPos += p2.y;
        }

        const stackLen: number = (stackEnd - stackStart) + 1;

        xPos /= stackLen * 2;
        yPos /= stackLen * 2;

        const praiseText = stackLen > 1 ? 'Great Pairings!' : 'Great Pairing!';
        const praiseObj = new SceneObject(Fonts.std(praiseText, 20).bold().color(0xffffff).build());
        praiseObj.display.position = new Point(xPos - DisplayUtil.width(praiseObj.display) * 0.5, yPos);
        this.addObject(praiseObj, this.container);

        praiseObj.display.alpha = 0;
        praiseObj.addObject(new SerialTask(
            new ParallelTask(
                new AlphaTask(0.85, 0.33, Easing.easeOut),
                new LocationTask(praiseObj.display.x, praiseObj.display.y - 80, 0.33, Easing.easeOut)
            ),
            new DelayTask(1),
            new ParallelTask(
                new AlphaTask(0, 0.33, Easing.easeOut),
                new LocationTask(praiseObj.display.x, praiseObj.display.y - 120, 0.33, Easing.easeOut)
            ),
            new SelfDestructTask()
        ));

        if (playSound) {
            if (playGC) {
                Flashbang.sound.playSound(Sounds.SoundRG);
            } else if (playUA) {
                Flashbang.sound.playSound(Sounds.SoundYB);
            } else if (playGU) {
                Flashbang.sound.playSound(Sounds.SoundRB);
            }
        }
    }

    public createNewHighlight(nucleotides: number[]): RNAHighlightState {
        const hl: RNAHighlightState = new RNAHighlightState();

        // If any of the nucleotides are part of a stack, highlight its pair as well.
        const addition: number[] = [];
        for (const nuc of nucleotides) {
            if (this._pairs.pairs[nuc] !== -1) {
                addition.push(this._pairs.pairs[nuc]);
            }
        }
        nucleotides = nucleotides.concat(addition);

        hl.nuc = nucleotides;
        this._allNewHighlights.push(hl);

        this._redraw = true;
        return hl;
    }

    public removeNewHighlight(highlight: RNAHighlightState): void {
        const idx: number = this._allNewHighlights.indexOf(highlight);
        if (idx >= 0) {
            this._allNewHighlights.splice(idx, 1);
            this._redraw = true;
        }
    }

    private onPraiseSeq(seqStart: number, seqEnd: number): void {
        for (let ii: number = seqStart; ii <= seqEnd; ii++) {
            if (ii >= 0 && ii < this.fullSequenceLength) {
                this._bases[ii].startSparking();
            }
        }
    }

    public set displayAuxInfo(display: boolean) {
        this._displayAuxInfo = display;
        this._auxInfoCanvas.visible = display;
    }

    public set auxInfo(auxInfo: AuxInfo | null) {
        this._auxInfo = auxInfo;

        if (this._auxInfo != null && this._auxInfo[Pose2D.CLEAVING_SITE] != null) {
            this._auxTextballoon.display.visible = true;
            this._auxTextballoon.setText('Ribozyme cleaving site');
        }
    }

    public startExplosion(): Promise<void> {
        this._isExploding = true;
        this._explosionStartTime = -1;

        if (this._explosionRays.length >= this._sequence.length) {
            for (let ii = 0; ii < this._sequence.length; ii++) {
                const ray = this._explosionRays[ii];
                ray.display.visible = false;
                ray.draw(
                    Vector2.fromPolar(Math.max(this._width, this._height), Math.random() * 2 * Math.PI),
                    this._sequence.baseArray[ii]
                );
            }
        } else {
            const diff: number = (this._sequence.length - this._explosionRays.length)
                / this._explosionRays.length;
            let diffWalker = 0;
            let rayWalker = 0;

            for (let ii = 0; ii < this._sequence.length; ii++) {
                if (diffWalker < 1) {
                    if (rayWalker >= this._explosionRays.length) {
                        continue;
                    }

                    const ray = this._explosionRays[rayWalker];
                    ray.display.visible = false;
                    ray.draw(
                        Vector2.fromPolar(Math.max(this._width, this._height), Math.random() * 2 * Math.PI),
                        this._sequence.baseArray[ii]
                    );

                    rayWalker++;
                    diffWalker += diff;
                } else {
                    diffWalker -= 1;
                }
            }
        }

        // If there was an explosion in progress, ensure its promise gets resolved
        if (this._onExplosionComplete != null) {
            this.callExplosionCompleteCallback();
        }

        return new Promise((resolve) => { this._onExplosionComplete = resolve; });
    }

    private callExplosionCompleteCallback(): void {
        if (this._onExplosionComplete != null) {
            const onComplete = this._onExplosionComplete;
            this._onExplosionComplete = null;
            onComplete();
        }
    }

    public clearExplosion(): void {
        if (!this._isExploding) {
            return;
        }

        this._isExploding = false;
        this._explosionStartTime = -1;

        for (const ray of this._explosionRays) {
            ray.fadeOutAndHide();
        }

        this.callExplosionCompleteCallback();
    }

    public set poseEditCallback(cb: () => void) {
        this._poseEditCallback = cb;
    }

    public callPoseEditCallback(): void {
        if (this._poseEditCallback != null) {
            this._poseEditCallback();
        }
    }

    public set trackMovesCallback(cb: (count: number, moves: Move[]) => void) {
        this._trackMovesCallback = cb;
    }

    public callTrackMovesCallback(count: number, moves: Move[]): void {
        if (this._trackMovesCallback != null) {
            this._trackMovesCallback(count, moves);
        }
    }

    public set addBaseCallback(cb: (parenthesis: string | null, op: PuzzleEditOp | null, index: number) => void) {
        this._addBaseCallback = cb;
    }

    public callAddBaseCallback(
        parenthesis: string | null = null, op: PuzzleEditOp | null = null, index: number = -1
    ): void {
        if (this._addBaseCallback != null) {
            this._addBaseCallback(parenthesis, op, index);
        }
    }

    public set startMousedownCallback(cb: PoseMouseDownCallback) {
        this._startMousedownCallback = cb;
    }

    public callStartMousedownCallback(e: InteractionEvent): void {
        e.data.getLocalPosition(this.display, Pose2D.P);
        const mouseX: number = Pose2D.P.x;
        const mouseY: number = Pose2D.P.y;

        let closestDist = -1;
        let closestIndex = -1;

        if (this._startMousedownCallback != null) {
            for (let ii = 0; ii < this.fullSequenceLength; ii++) {
                const mouseDist: number = this._bases[ii].isClicked(
                    mouseX - this._offX, mouseY - this._offY, this._zoomLevel, false
                );
                if (mouseDist >= 0) {
                    if (closestIndex < 0 || mouseDist < closestDist) {
                        closestIndex = ii;
                        closestDist = mouseDist;
                    }
                }
            }
            this._startMousedownCallback(e, closestDist, closestIndex);
        } else {
            this.onPoseMouseDown(e, closestIndex);
        }
    }

    public get satisfiedPairs(): SecStruct {
        // AMW TODO: this is built up in the getter to append the oligos, so
        // maybe it's not a Sequence. So we should definitely change that later.
        return this._pairs.getSatisfiedPairs(this.fullSequence.slice(0));
    }

    public set molecularBindingBonus(bonus: number) {
        this._molecularBindingBonus = bonus;
    }

    public set molecularStructure(pairs: SecStruct | null) {
        if (pairs != null) {
            this._moleculeTargetPairs = new SecStruct(pairs.pairs);
        } else {
            this._moleculeTargetPairs = null;
        }
    }

    public get molecularStructure(): SecStruct | null {
        return this._moleculeTargetPairs;
    }

    public set molecularBindingSite(bindingSite: boolean[] | null) {
        if (bindingSite != null) {
            this._bindingSite = bindingSite.slice();
        } else {
            this._bindingSite = null;
            this.setMolecularBinding(undefined, undefined, this._molecularBindingBonus);
            return;
        }

        const targetPairs: SecStruct | null = this._moleculeTargetPairs
            ? new SecStruct(this._moleculeTargetPairs.pairs)
            : null;
        if (!targetPairs) {
            throw new Error("Can't find molecular target structure");
        }

        const bindingBases: number[] = [];
        const bindingPairs: number[] = [];
        for (let ii = 0; ii < bindingSite.length; ii++) {
            if (bindingSite[ii]) {
                bindingBases.push(ii);
                bindingPairs.push(targetPairs.pairs[ii]);
            }
        }
        this.setMolecularBinding(bindingBases, bindingPairs, this._molecularBindingBonus);
    }

    public get molecularBindingSite(): boolean[] | null {
        if (this._bindingSite) {
            return this._bindingSite.slice();
        }

        const temp: boolean[] = [];
        for (let ii = 0; ii < this._sequence.length; ii++) {
            temp.push(false);
        }
        return temp;
    }

    public setMolecularBinding(
        bindingSites: number[] | undefined, bindingPairs: number[] | undefined, bindingBonus: number | undefined
    ): void {
        if (this._molecule != null) {
            this._molecule.destroy({children: true});
            this._molecule = null;
        }

        if (this._molecularBindingBases != null) {
            for (const glow of this._molecularBindingBases) {
                if (glow != null) {
                    glow.destroy({children: true});
                }
            }
            this._molecularBindingBases = null;
        }

        if (bindingSites === undefined || bindingSites.length === 0) {
            return;
        }

        this._molecularBindingBases = new Array(this._sequence.length);
        this._molecularBindingPairs = new Array(this._sequence.length);
        this._molecularBindingBonus = bindingBonus;

        this._molecule = new Molecule();
        this._moleculeLayer.addChild(this._molecule);

        if (bindingPairs === undefined) {
            return;
        }
        for (let ii = 0; ii < bindingSites.length; ii++) {
            const idx = bindingSites[ii];
            const baseGlow = new BaseGlow();
            this._moleculeLayer.addChild(baseGlow);

            this._molecularBindingBases[idx] = baseGlow;
            this._molecularBindingPairs[idx] = bindingPairs[ii];
        }

        this.updateMolecule();
    }

    private updateMolecule(): void {
        if (
            this._molecularBindingBases == null
            || this._molecule == null
        ) {
            return;
        }

        let boundRender = true;
        let boundReal = true;
        const satisfiedPairs: SecStruct = this.satisfiedPairs;

        for (let ii = 0; ii < this._molecularBindingPairs.length; ii++) {
            if (this._molecularBindingBases[ii] == null) {
                continue;
            }
            if (this._molecularBindingPairs[ii] !== this._pairs.pairs[ii]) {
                boundRender = false;
            }

            if (this._molecularBindingPairs[ii] !== satisfiedPairs.pairs[ii]) {
                boundReal = false;
                this._molecularBindingBases[ii].isWrong = true;
            } else {
                this._molecularBindingBases[ii].isWrong = false;
            }
        }
        this._molecule.isWrong = !boundReal;
        this._moleculeIsBound = boundRender;
        this._moleculeIsBoundReal = boundReal;
    }

    public setOligos(oligos?: Oligo[], order?: number[], numPaired: number = 0): void {
        if (oligos === undefined) {
            this._oligos = undefined;
            this._oligosOrder = undefined;
            this._oligosPaired = 0;
            return;
        }

        let same: boolean = this._oligos !== undefined && oligos.length === this._oligos.length;

        if (same) {
            Assert.assertIsDefined(this._oligos);
            for (let k = 0; k < oligos.length && same; k++) {
                if (!Arrays.shallowEqual(this._oligos[k].sequence, oligos[k].sequence)) {
                    same = false;
                    break;
                }
            }
        }

        const prevOrder: number[] | undefined = this._oligosOrder;
        this._oligos = JSON.parse(JSON.stringify(oligos));
        if (order == null) {
            this._oligosOrder = [];
            if (!this._oligos) {
                throw new Error('this._oligos null when we need it not to be!');
            }
            for (let k = 0; k < this._oligos.length; k++) {
                this._oligosOrder[k] = k;
            }
        } else {
            this._oligosOrder = order.slice();
        }
        this._oligosPaired = numPaired;

        const seq: Sequence = this.fullSequence;
        if (seq.length > this._bases.length) {
            const diff: number = (seq.length - this._bases.length);
            for (let k = 0; k < diff; k++) {
                this.createBase();
            }
        }

        const n: number = seq.length;
        for (let k = 0; k < n; k++) {
            this._bases[k].setType(seq.baseArray[k]);
            this._bases[k].baseIndex = k;
        }

        // if possible, maintain visual consistency
        // (strands "fly" from their previous location in the previous oligo order)
        if (same && JSON.stringify(prevOrder) !== JSON.stringify(this._oligosOrder)) {
            const oldX: number[] = [];
            const oldY: number[] = [];
            const idxMap: number[] | null = this.getOrderMap(prevOrder);
            if (idxMap === null) {
                throw new Error('idxMap is null!');
            }
            for (let k = 0; k < seq.length; k++) {
                oldX[k] = this._bases[k].x;
                oldY[k] = this._bases[k].y;
            }
            for (let k = 0; k < seq.length; k++) {
                this._bases[idxMap[k]].setXY(oldX[k], oldY[k]);
            }
        }
    }

    public getOligos(): Oligo[] | null {
        return (this._oligos !== undefined ? JSON.parse(JSON.stringify(this._oligos)) : null);
    }

    public getOrderMap(otherOrder: number[] | undefined): number[] | null {
        if (this._oligos === undefined || this._oligosOrder === undefined) {
            return null;
        }

        const idxMap: number[] = [];
        const ofs: number[] = [];
        let ii: number = this._sequence.length;
        let jj: number;
        for (jj = 0; jj < this._oligos.length; jj++) {
            ofs[this._oligosOrder[jj]] = ii;
            ii += 1 + this._oligos[this._oligosOrder[jj]].sequence.length;
        }
        for (ii = 0; ii < this._sequence.length; ii++) idxMap[ii] = ii;
        for (jj = 0; jj < this._oligos.length; jj++) {
            const zz: number = (otherOrder === undefined ? jj : otherOrder[jj]);
            const kk: number = ofs[zz];
            let xx: number;
            for (xx = 0; xx <= this._oligos[zz].sequence.length; xx++) {
                idxMap[ii + xx] = kk + xx;
            }
            ii += xx;
        }
        return idxMap;
    }

    public saveMarkersContext(): void {
        if (this._oligos === undefined) {
            this._prevOligosOrder = undefined;
        } else if (this._prevOligosOrder === undefined && this._oligosOrder !== undefined) {
            this._prevOligosOrder = this._oligosOrder.slice();
        }
    }

    public transformMarkers(): void {
        if (
            this._prevOligosOrder == null
            || this._oligosOrder == null
            || this._prevOligosOrder.length !== this._oligosOrder.length
        ) {
            this._prevOligosOrder = undefined;
            return;
        }

        const idxMap: number[] | null = this.getOrderMap(this._prevOligosOrder);
        if (idxMap === null) {
            throw new Error('idxMap is null!');
        }
        this._prevOligosOrder = undefined;

        // base marks
        const indices = this.trackedIndices;
        this.clearTracking();
        for (const index of indices) {
            index.baseIndex = idxMap[index.baseIndex];
            this.addBaseMark(index.baseIndex, index.colors);
        }

        // blue highlights ("magic glue")
        const newDesign: boolean[] = [];
        for (let ii = 0; ii < this.fullSequenceLength; ii++) {
            newDesign[idxMap[ii]] = this._designStruct[ii];
        }
        this._designStruct = newDesign;
        this.updateDesignHighlight();
    }

    public setOligo(
        oligo: number[] | undefined,
        mode: number | string | null = Pose2D.OLIGO_MODE_DIMER,
        oName: string | null = null
    ): void {
        if (oligo == null) {
            this._oligo = null;
            return;
        }

        this._oligo = oligo.slice();
        this._oligoName = oName;

        // Puzzle JSON encodes oligoMode as a string, for some reason
        this._oligoMode = typeof (mode) === 'number' ? mode : Number(mode);

        const seq: Sequence = this.fullSequence;
        if (seq.length > this._bases.length) {
            const diff: number = (seq.length - this._bases.length);
            for (let i = 0; i < diff; i++) {
                this.createBase();
            }
        }

        const n: number = seq.length;
        for (let k = 0; k < n; k++) {
            this._bases[k].setType(seq.baseArray[k]);
            this._bases[k].baseIndex = k;
        }
    }

    public set oligoMalus(malus: number) {
        this._oligoMalus = malus;
    }

    public set duplexCost(cost: number) {
        this._duplexCost = cost;
    }

    public set oligoPaired(paired: boolean) {
        const changed: boolean = (this._oligoPaired !== paired);
        this._oligoPaired = paired;
        if (changed) this.updateScoreNodeGui();
    }

    public get fullSequence(): Sequence {
        if (this._oligo == null && this._oligos === undefined) {
            return this._sequence.slice(0);
        }
        let seq: number[] = this._sequence.baseArray.slice();
        if (this._oligos === undefined || this._oligosOrder === undefined) {
            Assert.assertIsDefined(this._oligo);
            if (this._oligoMode === Pose2D.OLIGO_MODE_EXT5P) {
                seq = this._oligo.concat(seq);
            } else {
                if (this._oligoMode === Pose2D.OLIGO_MODE_DIMER) seq.push(RNABase.CUT);
                seq = seq.concat(this._oligo);
            }
            return Sequence.fromBaseArray(seq);
        }
        // _oligos != null, we have a multistrand target
        for (let ii = 0; ii < this._oligos.length; ii++) {
            seq.push(RNABase.CUT);
            seq = seq.concat(this._oligos[this._oligosOrder[ii]].sequence);
        }
        return Sequence.fromBaseArray(seq);
    }

    public get fullSequenceLength(): number {
        let len: number = this._sequence.length;
        if (this._oligo == null && this._oligos == null) {
            return len;
        }
        if (this._oligos == null && this._oligo !== null) {
            len += this._oligo.length;
            if (this._oligoMode === Pose2D.OLIGO_MODE_DIMER) len++;
            return len;
        }
        Assert.assertIsDefined(this._oligos);
        for (const oligo of this._oligos) {
            len += 1 + oligo.sequence.length;
        }
        return len;
    }

    public getStrandName(seqnum: number): string | null {
        if (this._oligos != null && this._oligosOrder != null && seqnum >= this._sequence.length) {
            let seq: number[] = this._sequence.baseArray.slice();
            for (let ii = 0; ii < this._oligos.length; ii++) {
                seq.push(RNABase.CUT);
                seq = seq.concat(this._oligos[this._oligosOrder[ii]].sequence);
                if (seqnum < seq.length) {
                    let oName: string | undefined = this._oligos[this._oligosOrder[ii]]['name'];
                    if (oName === undefined) oName = `Oligo ${(this._oligosOrder[ii] + 1).toString()}`;
                    return oName;
                }
            }
        }
        if (this._oligo != null && seqnum >= this._sequence.length) {
            return this._oligoName;
        }
        return null;
    }

    public getBoundSequence(): number[] {
        if (this._oligos === undefined || this._oligosOrder === undefined) {
            return this._sequence.baseArray;
        }
        let seq: number[] = this._sequence.baseArray.slice();
        for (let ii = 0; ii < this._oligosPaired; ii++) {
            seq.push(RNABase.CUT);
            seq = seq.concat(this._oligos[this._oligosOrder[ii]].sequence);
        }
        return seq;
    }

    public isPairSatisfied(a: number, b: number): boolean {
        // AMW TODO
        if (b < a) {
            const temp: number = a;
            a = b;
            b = temp;
        }

        if (this._pairs.pairs[a] !== b) {
            return false;
        }

        const fullSeq: number[] = this.fullSequence.baseArray;
        return (EPars.pairType(fullSeq[a], fullSeq[b]) !== 0);
    }

    public get sequenceLength(): number {
        return this._sequence.length;
    }

    public set sequence(sequence: Sequence) {
        if (Arrays.shallowEqual(this._sequence.baseArray, sequence.baseArray)) {
            return;
        }

        if (this._locks == null) {
            this._locks = Pose2D.createDefaultLocks(this._sequence.length);
        }

        this._sequence = sequence;
        if (this._sequence.length > this._bases.length) {
            const diff: number = (this._sequence.length - this._bases.length);
            for (let ii = 0; ii < diff; ii++) {
                this.createBase();
                this._locks.push(false);
            }
        } else if (this._sequence.length < this._bases.length) {
            for (let ii: number = this._sequence.length; ii < this._bases.length; ii++) {
                if (this.isTrackedIndex(ii)) {
                    this.removeBaseMark(ii);
                }
            }
        }

        const n: number = this.fullSequenceLength;
        for (let ii = 0; ii < n; ii++) {
            if (ii < this._sequence.length) {
                this._bases[ii].setType(this._sequence.baseArray[ii]);
            }
            this._bases[ii].baseIndex = ii;
        }

        this.checkPairs();
        this.updateMolecule();
        this.generateScoreNodes();
    }

    public get sequence(): Sequence {
        return this._sequence; // .slice();
    }

    public getSequenceAt(seq: number): number {
        return this._sequence.baseArray[seq];
    }

    public set pairs(pairs: SecStruct) {
        const seq: number[] = this.fullSequence.baseArray;
        if (pairs.length !== seq.length) {
            log.debug(pairs.length, seq.length);
            throw new Error("Pair length doesn't match sequence length");
        }

        if (EPars.arePairsSame(pairs, this._pairs)) {
            return;
        }

        this._pairs = new SecStruct(pairs.pairs);

        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs.pairs[ii] > ii) {
                this._pairs.pairs[this._pairs.pairs[ii]] = ii;
            }
        }

        // / Recompute sequence layout
        this.computeLayout(false);
        this.checkPairs();
        this.updateMolecule();
        this.generateScoreNodes();
    }

    public get pairs(): SecStruct {
        return new SecStruct(this._pairs.pairs);
    }

    public set targetPairs(setting: SecStruct) {
        this._targetPairs = new SecStruct(setting.pairs);
        for (let ii = 0; ii < this._targetPairs.length; ii++) {
            // AMW TODO: symmetrizing the secstruct directly; seems not ideal.
            if (this._targetPairs.pairs[ii] > ii) {
                this._targetPairs.pairs[this._targetPairs.pairs[ii]] = ii;
            }
        }
    }

    public set customLayout(setting: Array<[number, number] | [null, null]> | undefined) {
        this._customLayout = setting;
    }

    public get customLayout(): Array<[number, number] | [null, null]> | undefined {
        return this._customLayout;
    }

    public set customNumbering(setting: (number | null)[] | undefined) {
        this._customNumbering = setting;
    }

    public get customNumbering(): (number | null)[] | undefined {
        return this._customNumbering;
    }

    public set pseudoknotted(pk: boolean) {
        this._pseudoknotted = pk;
    }

    public get pseudoknotted(): boolean {
        return this._pseudoknotted;
    }

    public checkOverlap(): boolean {
        const radius: number = Pose2D.ZOOM_SPACINGS[0];
        const rnaDrawer: RNALayout = new RNALayout(radius, radius);
        rnaDrawer.setupTree(this._pairs, this._targetPairs);
        rnaDrawer.drawTree(this._customLayout);

        const xarray: number[] = new Array(this._bases.length);
        const yarray: number[] = new Array(this._bases.length);
        rnaDrawer.getCoords(xarray, yarray);
        for (let ii = 0; ii < this._bases.length; ii++) {
            const ax: number = xarray[ii];
            const ay: number = yarray[ii];
            for (let jj: number = ii + 2; jj < this._bases.length; jj++) {
                let bx: number = xarray[jj];
                let by: number = yarray[jj];
                bx = ax - bx;
                by = ay - by;
                if (bx * bx + by * by < (radius * radius) / 10) {
                    return true;
                }
            }
        }
        return false;
    }

    // highlight the base before the cursor
    public trackCursor(index: number | null): void {
        this._cursorIndex = index;
        if (this._cursorIndex !== null && this._cursorIndex > 0) {
            const center: Point = this.getBaseLoc(this._cursorIndex - 1);
            if (this._cursorBox == null) {
                this._cursorBox = new Graphics();
                this.container.addChild(this._cursorBox);
            }
            this._cursorBox.x = center.x;
            this._cursorBox.y = center.y;
            this._cursorBox.visible = true;
            this._cursorBox.clear();
            this._cursorBox.lineStyle(Base.MARKER_THICKNESS * Base.MARKER_RADIUS[this.zoomLevel],
                Pose2D.COLOR_CURSOR);
            this._cursorBox.drawCircle(0, 0, Base.MARKER_RADIUS[this.zoomLevel]);
        } else if (this._cursorBox != null) {
            this._cursorBox.destroy({children: true});
            this._cursorBox = null;
        }
    }

    public get trackedCursorIdx(): number | null {
        return this._cursorIndex;
    }

    /* override */
    public update(dt: number): void {
        if (!this.display.worldVisible) {
            // update is expensive, so don't bother doing it if we're not visible
            return;
        }
        Assert.assertIsDefined(this.mode);
        const currentTime: number = this.mode.time;
        for (const anchor of this._anchoredObjects) {
            if (anchor.isLive) {
                const p: Point = this.getBaseLoc(anchor.base);
                anchor.object.display.position = new Point(p.x + anchor.offset.x, p.y + anchor.offset.y);
            }
        }

        const fullSeq: Sequence = this.fullSequence;
        let center: Point;

        // Hide bases that aren't part of our current sequence
        if (!this._showNucleotideRange) {
            for (let ii = 0; ii < this._bases.length; ++ii) {
                this._bases[ii].display.visible = this.isNucleotidePartOfSequence(ii);
            }
        }

        const basesMoved = this._baseToX && this._baseToY && this._baseFromX && this._baseFromY;
        if (basesMoved) {
            // Update base locations

            if (this._foldStartTime < 0) {
                this._foldStartTime = currentTime;
            }

            let prog = (currentTime - this._foldStartTime) / (this._foldDuration);

            if (prog >= 1) {
                prog = 1;
                this._offsetTranslating = false;
            }

            if (this._offsetTranslating) {
                this._redraw = true;
                this._offX = prog * this._endOffsetX + (1 - prog) * this._startOffsetX;
                this._offY = prog * this._endOffsetY + (1 - prog) * this._startOffsetY;
            }

            this.setAnimationProgress(prog);
        } else if (currentTime - this.lastSampledTime > 2 && !this._isExploding) {
            this.lastSampledTime = currentTime;

            for (let ii = 0; ii < fullSeq.length; ii++) {
                if (this._pairs.pairs[ii] < 0 && !this._simpleGraphicsMods && Math.random() > 0.7) {
                    this._bases[ii].animate();
                }
            }
        }

        // / Update score node
        this.updateScoreNodeVisualization(this._offX !== this._prevOffsetX || this._offY !== this._prevOffsetY);

        // / Bitblt rendering
        const needRedraw = this._bases.some(
            (base) => base.needRedraw(this._simpleGraphicsMods)
        );

        if (needRedraw || this._redraw) {
            // Create highlight state to pass to bases.
            let hlState: RNAHighlightState | undefined;
            if (this._allNewHighlights.length > 0) {
                hlState = new RNAHighlightState();
                hlState.nuc = [];
                hlState.isOn = true;
                for (const existingHighlight of this._allNewHighlights) {
                    if (existingHighlight.nuc !== null) {
                        hlState.nuc = hlState.nuc.concat(existingHighlight.nuc);
                    }
                }
            }

            for (let ii = 0; ii < fullSeq.length; ii++) {
                // skip the oligo separator
                if (fullSeq.baseArray[ii] === RNABase.CUT) {
                    continue;
                }

                const useBarcode = (this._barcodes != null && this._barcodes.indexOf(ii) >= 0);

                this._bases[ii].forceUnpaired = (
                    this._forcedStruct != null && this._forcedStruct[ii] === EPars.FORCE_UNPAIRED
                );

                const drawFlags: number = BaseDrawFlags.builder()
                    .locked(this.isLocked(ii))
                    .letterMode(this._lettermode)
                    .lowPerform(this._simpleGraphicsMods)
                    .useBarcode(useBarcode)
                    .result();

                let numberBitmap: Texture | null = null;
                if (this._numberingMode) {
                    let displayNumber: number | null = ii + 1;
                    if (this._customNumbering != null) displayNumber = this._customNumbering[ii];
                    if ((displayNumber != null)
                        && (ii === 0 || displayNumber % 5 === 0 || ii === fullSeq.length - 1)) {
                        numberBitmap = BitmapManager.getNumberBitmap(displayNumber);
                    }
                }

                this._bases[ii].setDrawParams(
                    this._zoomLevel, this._offX, this._offY, currentTime, drawFlags, numberBitmap, hlState
                );
            }

            if (this._displayAuxInfo) {
                this.renderAuxInfo();
            }

            if (this._feedbackObjs.length > 0) {
                this.updatePrintFeedback(false);
            }
        }

        this._baseRope.enabled = this._showBaseRope || (this._customLayout != null);
        this._pseudoknotLines.enabled = this._pseudoknotPairs
            && this._pseudoknotPairs.pairs.filter((it) => it !== -1).length !== 0;

        if (this._redraw || basesMoved) {
            this._baseRope.redraw(true /* force baseXY */);
            if (this.pseudoknotPairs && this.pseudoknotPairs.length !== 0) {
                this._pseudoknotLines.redraw(true /* force baseXY */);
            }

            if (this._cursorIndex != null && this._cursorIndex > 0 && this._cursorBox !== null) {
                center = this.getBaseLoc(this._cursorIndex - 1);
                this._cursorBox.x = center.x;
                this._cursorBox.y = center.y;
                this._cursorBox.visible = true;
                this._cursorBox.clear();
                this._cursorBox.lineStyle(Base.MARKER_THICKNESS * Base.MARKER_RADIUS[this.zoomLevel],
                    Pose2D.COLOR_CURSOR);
                this._cursorBox.drawCircle(0, 0, Base.MARKER_RADIUS[this.zoomLevel]);
            }
        }

        this._redraw = false;

        this._moleculeLayer.visible = false;
        if (this._molecularBindingBases != null && this._molecule != null) {
            let molX = 0;
            let molY = 0;
            let nbases = 0;
            for (let ii = 0; ii < fullSeq.length; ii++) {
                const baseglow: BaseGlow = this._molecularBindingBases[ii];
                if (baseglow != null) {
                    const pos: Point = this._bases[ii].getLastDrawnPos();
                    baseglow.updateView(this._zoomLevel, pos.x, pos.y, currentTime);
                    molX += pos.x;
                    molY += pos.y;
                    nbases += 1;
                }
            }

            if (nbases > 0) {
                molX /= nbases;
                molY /= nbases;
            }

            if (!this._moleculeIsBound) {
                molX = 30;
                molY = 200;
            }

            this._molecule.updateView(this._zoomLevel, molX, molY, currentTime);
            this._moleculeLayer.visible = true;
        }

        if (fullSeq.baseArray.indexOf(RNABase.CUT) >= 0) {
            if (this._oligoBases == null) {
                this._oligoBases = new Array(fullSeq.length);
            }

            const boundLen: number = this.getBoundSequence().length;
            for (let ii = fullSeq.baseArray.indexOf(RNABase.CUT) + 1; ii < fullSeq.length; ii++) {
                const baseglow = this._oligoBases[ii];
                if ((this._oligoPaired || (this._oligosPaired > 0 && ii < boundLen)) && this._pairs.pairs[ii] >= 0) {
                    baseglow.isWrong = this._restrictedHighlightBox.isInQueue(ii);
                    const pos = this._bases[ii].getLastDrawnPos();
                    baseglow.updateView(this._zoomLevel, pos.x, pos.y, currentTime);
                    this._moleculeLayer.visible = true;
                }
            }
        }

        let goX = 0;
        let goY = 0;

        for (let ii = 0; ii < fullSeq.length - 1; ii++) {
            let outX: number = goX;
            let outY: number = goY;
            let dirSign = 1;
            if (ii < this._baseRotationDirectionSign.length) dirSign = this._baseRotationDirectionSign[ii];

            if (this._sequence.length < fullSeq.length && ii === this._sequence.length - 1) {
                this._bases[ii].setGoDir(goX, goY);
                this._bases[ii].setOutDir(dirSign * -goY, dirSign * goX);
                this._bases[ii].setLast(true);
                continue;
            }

            goX = this._bases[ii + 1].x - this._bases[ii].x;
            goY = this._bases[ii + 1].y - this._bases[ii].y;

            const goLength: number = Math.sqrt(goX * goX + goY * goY);
            if (goLength > Pose2D.ZOOM_SPACINGS[this._zoomLevel]) {
                goX *= (Pose2D.ZOOM_SPACINGS[this._zoomLevel] / goLength);
                goY *= (Pose2D.ZOOM_SPACINGS[this._zoomLevel] / goLength);
            }

            outX += goX;
            outY += goY;

            if (ii > 0) {
                outX /= 2.0;
                outY /= 2.0;
            }

            this._bases[ii].setGoDir(goX, goY);
            this._bases[ii].setOutDir(dirSign * -outY, dirSign * outX);
            this._bases[ii].setLast(false);
        }

        if (fullSeq.length >= 1) {
            this._bases[fullSeq.length - 1].setGoDir(goX, goY);
            this._bases[fullSeq.length - 1].setOutDir(-goY, goX);
            this._bases[fullSeq.length - 1].setLast(true);
        }

        // / Praise stacks when RNA is not moving
        if (!this._offsetTranslating && this._baseToX == null) {
            if (this._praiseQueue.length > 0) {
                for (let ii = 0; ii < this._praiseQueue.length; ii += 2) {
                    this.onPraiseStack(
                        this._praiseQueue[ii],
                        this._praiseQueue[ii + 1],
                        (ii + 1) === (this._praiseQueue.length - 1)
                    );
                }
                this._praiseQueue = [];
            } else if (this._praiseSeq.length > 0) {
                for (let ii = 0; ii < this._praiseSeq.length; ii += 2) {
                    this.onPraiseSeq(this._praiseSeq[ii], this._praiseSeq[ii + 1]);
                }
                this._praiseSeq = [];
            }
        }

        if (this._isExploding && !this._offsetTranslating && this._baseToX == null) {
            if (this._explosionStartTime < 0) {
                this._explosionStartTime = currentTime;
                this._origOffsetX = this._offX;
                this._origOffsetY = this._offY;
            }

            this._offX = this._origOffsetX + (Math.random() * 2 - 1) * 5;
            this._offY = this._origOffsetY + (Math.random() * 2 - 1) * 5;
            this._redraw = true;

            const prog = (currentTime - this._explosionStartTime) * 5;

            if (this._explosionRays.length >= fullSeq.length) {
                for (let ii = 0; ii < Math.min(prog, fullSeq.length); ii++) {
                    const ray = this._explosionRays[ii];

                    if (!ray.display.visible) {
                        ray.display.alpha = 0;
                        ray.display.visible = true;
                        ray.fadeIn();
                    }

                    ray.display.position = this.getBaseLoc(ii);
                }
            } else {
                const diff: number = (fullSeq.length - this._explosionRays.length) / this._explosionRays.length;
                let diffWalker = 0;
                let rayWalker = 0;

                for (let ii = 0; ii < fullSeq.length; ii++) {
                    if (diffWalker < 1) {
                        if (rayWalker >= this._explosionRays.length || rayWalker >= prog) {
                            continue;
                        }

                        const ray = this._explosionRays[rayWalker];
                        if (!ray.display.visible) {
                            ray.display.alpha = 0;
                            ray.display.visible = true;
                            ray.fadeIn();
                        }

                        ray.display.position = this.getBaseLoc(ii);
                        rayWalker++;
                        diffWalker += diff;
                    } else {
                        diffWalker -= 1;
                    }
                }
            }

            if (prog >= Math.min(fullSeq.length, this._explosionRays.length) + 10) {
                this.clearExplosion();
            }
        }

        this._prevOffsetX = this._offX;
        this._prevOffsetY = this._offY;
    }

    public setAnimationProgress(progress: number) {
        if (this._baseToX && this._baseToY && this._baseFromX && this._baseFromY) {
            for (let ii = 0; ii < this.fullSequence.length; ii++) {
                const vx: number = this._baseToX[ii] - this._baseFromX[ii];
                const vy: number = this._baseToY[ii] - this._baseFromY[ii];

                const currentX: number = this._baseFromX[ii] + ((vx + (vx * progress)) / 2) * progress;
                const currentY: number = this._baseFromY[ii] + ((vy + (vy * progress)) / 2) * progress;

                this._bases[ii].setXY(currentX, currentY);
            }
        }

        if (progress >= 1) {
            this._baseToX = null;
            this._baseToY = null;
            this._baseFromX = null;
            this._baseFromY = null;

            this.updateScoreNodeGui();

            if (this.checkOverlap()) {
                // If overlaps have been introduced, make sure the explosion factor input is shown
                this._explosionFactorPanel.display.visible = true;
            } else if (this._explosionFactorPanel.display.visible === true) {
                // If all overlaps have been removed, remove the explosion
                this._explosionFactor = 1;
                this._explosionFactorPanel.display.visible = false;
                this.computeLayout(true);
                this._redraw = true;
            }
        }
    }

    public numPairs(satisfied: boolean): number {
        let n = 0;
        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs.pairs[ii] > ii && (!satisfied || this.isPairSatisfied(ii, this._pairs.pairs[ii]))) {
                n++;
            }
        }
        return n;
    }

    public set lettermode(lettermode: boolean) {
        this._lettermode = lettermode;
        this._redraw = true;
    }

    public get lettermode(): boolean {
        return this._lettermode;
    }

    public get showTotalEnergy(): boolean {
        return this._showTotalEnergy;
    }

    public set showTotalEnergy(show: boolean) {
        this._showTotalEnergy = show;
        this._primaryScoreEnergyDisplay.visible = (show && this._scoreFolder != null);
        this._secondaryScoreEnergyDisplay.visible = (
            show && this._scoreFolder != null && this._secondaryScoreEnergyDisplay.hasText
        );
        this._deltaScoreEnergyDisplay.visible = show && this._scoreFolder != null;
    }

    public get showExplosionFactor(): boolean {
        return this._explosionFactorPanel.display.visible;
    }

    public set showExplosionFactor(show: boolean) {
        this._explosionFactorPanel.display.visible = show;
    }

    public set scoreFolder(folder: Folder | null) {
        if (this._scoreFolder !== folder) {
            this._scoreFolder = folder;
            this.showTotalEnergy = this._showTotalEnergy;
            this.generateScoreNodes();
        }
    }

    public baseShiftWithCommand(command: number, index: number): void {
        const cmd: [string, PuzzleEditOp, number[]?] | null = this.parseCommand(command, index);
        if (cmd != null) {
            const parenthesis: string = cmd[0];
            const op: PuzzleEditOp = cmd[1];
            this.baseShift(parenthesis, op, index);
        }
    }

    public baseShift(parenthesis: string, op: PuzzleEditOp, index: number): void {
        let sequence: number[] = this.sequence.baseArray;
        let locks: boolean[] | undefined = this.puzzleLocks;
        let bindingSite: boolean[] | null = this.molecularBindingSite;
        const sequenceBackup: number[] = this.sequence.baseArray;
        const locksBackup: boolean[] | undefined = this.puzzleLocks;
        const bindingSiteBackup: boolean[] | null = this.molecularBindingSite;
        let pindex: number;

        if (sequence.length > parenthesis.length) {
            sequence = sequence.slice(0, parenthesis.length);
            locks = locks ? locks.slice(0, parenthesis.length) : undefined;
            bindingSite = bindingSite ? bindingSite.slice(0, parenthesis.length) : null;
        }

        for (let ii: number = sequence.length; ii < parenthesis.length; ii++) {
            sequence.push(RNABase.ADENINE);
            if (locks) locks.push(false);
            if (bindingSite) bindingSite.push(false);
        }
        // BASE SHIFTING MODIFIED HERE. Delete comments to apply the changes
        if (op === PuzzleEditOp.ADD_BASE) {
            // Add a base
            const afterIndex: number[] = sequence.slice(index);
            const afterLockIndex: boolean[] | null = locks ? locks.slice(index) : null;
            const afterBindingSiteIndex: boolean[] | null = bindingSite ? bindingSite.slice(index) : null;

            sequence[index] = RNABase.ADENINE;
            if (locks) locks[index] = false;
            if (bindingSite) bindingSite[index] = false;

            for (let ii = 0; ii < afterIndex.length - 1; ii++) {
                sequence[ii + index + 1] = afterIndex[ii];
                if (locks && afterLockIndex) locks[ii + index + 1] = afterLockIndex[ii];
                if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index + 1] = afterBindingSiteIndex[ii];
            }
        } else if (op === PuzzleEditOp.ADD_PAIR) {
            // Add a pair
            pindex = this.pairs.pairs[index];
            const afterIndex = sequence.slice(index);
            const afterLockIndex = locks ? locks.slice(index) : null;
            const afterBindingSiteIndex = bindingSite ? bindingSite.slice(index) : null;

            sequence[index] = RNABase.ADENINE;
            sequence[pindex + 2] = RNABase.ADENINE;
            if (locks) locks[index] = false;
            if (locks) locks[pindex + 2] = false;
            if (bindingSite) bindingSite[index] = false;
            if (bindingSite) bindingSite[pindex + 2] = false;

            for (let ii = 0; ii < afterIndex.length - 2; ii++) {
                if (ii + index > pindex) {
                    sequence[ii + index + 2] = afterIndex[ii];
                    if (locks && afterLockIndex) locks[ii + index + 2] = afterLockIndex[ii];
                    if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index + 2] = afterBindingSiteIndex[ii];
                } else {
                    sequence[ii + index + 1] = afterIndex[ii];
                    if (locks && afterLockIndex) locks[ii + index + 1] = afterLockIndex[ii];
                    if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index + 1] = afterBindingSiteIndex[ii];
                }
            }
        } else if (op === PuzzleEditOp.ADD_CYCLE) {
            // Add a cycle of length 3
            const afterIndex = sequence.slice(index);
            const afterLockIndex = locks ? locks.slice(index) : null;
            const afterBindingSiteIndex = bindingSite ? bindingSite.slice(index) : null;

            sequence[index] = RNABase.ADENINE;
            sequence[index + 1] = RNABase.ADENINE;
            sequence[index + 2] = RNABase.ADENINE;
            sequence[index + 3] = RNABase.ADENINE;
            sequence[index + 4] = RNABase.ADENINE;

            if (locks) {
                locks[index] = false;
                locks[index + 1] = false;
                locks[index + 2] = false;
                locks[index + 3] = false;
                locks[index + 4] = false;
            }

            if (bindingSite) {
                bindingSite[index] = false;
                bindingSite[index + 1] = false;
                bindingSite[index + 2] = false;
                bindingSite[index + 3] = false;
                bindingSite[index + 4] = false;
            }

            for (let ii = 0; ii < afterIndex.length - 5; ii++) {
                sequence[ii + index + 5] = afterIndex[ii];
                if (locks && afterLockIndex) locks[ii + index + 5] = afterLockIndex[ii];
                if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index + 5] = afterBindingSiteIndex[ii];
            }
        } else if (op === PuzzleEditOp.DELETE_PAIR) {
            // Delete a pair
            pindex = this.pairs.pairs[index];
            const afterIndex = sequenceBackup.slice(index + 1);
            const afterLockIndex = locksBackup ? locksBackup.slice(index + 1) : null;
            const afterBindingSiteIndex = bindingSiteBackup ? bindingSiteBackup.slice(index + 1) : null;

            for (let ii = 0; ii < afterIndex.length - 1; ii++) {
                if (ii + index >= pindex - 1) {
                    sequence[ii + index] = afterIndex[ii + 1];
                    if (locks && afterLockIndex) locks[ii + index] = afterLockIndex[ii + 1];
                    if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index] = afterBindingSiteIndex[ii + 1];
                } else {
                    sequence[ii + index] = afterIndex[ii];
                    if (locks && afterLockIndex) locks[ii + index] = afterLockIndex[ii];
                    if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index] = afterBindingSiteIndex[ii];
                }
            }
        } else if (op === PuzzleEditOp.DELETE_BASE) {
            // Delete a base
            const afterIndex = sequenceBackup.slice(index + 1);
            const afterLockIndex = locksBackup ? locksBackup.slice(index + 1) : null;
            const afterBindingSiteIndex = bindingSiteBackup ? bindingSiteBackup.slice(index + 1) : null;

            for (let ii = 0; ii < afterIndex.length; ii++) {
                sequence[ii + index] = afterIndex[ii];
                if (locks && afterLockIndex) locks[ii + index] = afterLockIndex[ii];
                if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index] = afterBindingSiteIndex[ii];
            }
        }

        this.sequence.baseArray = sequence;
        this.puzzleLocks = locks;
        this.molecularStructure = SecStruct.fromParens(parenthesis);
        this.molecularBindingSite = bindingSite;
    }

    public registerPaintTool(paintColor: number, tool: Booster): void {
        this._dynPaintColors.push(paintColor);
        this._dynPaintTools.push(tool);
    }

    public get lastShiftedIndex(): number {
        return this._lastShiftedIndex;
    }

    public get lastShiftedCommand(): number {
        return this._lastShiftedCommand;
    }

    public setBaseColor(seq: number, inColor: number): void {
        this._mutatedSequence = this._sequence.slice(0);
        this._mutatedSequence.baseArray[seq] = inColor;
        this._bases[seq].setType(inColor, true);

        this._lastColoredIndex = seq;
        this._bases[seq].animate();
        this.doneColoring();
    }

    public forceEditable(b: boolean, editList: number[] | null = null): void {
        this._editable = b;
        this._editableIndices = editList;
    }

    /**
     * Center a nucleotide into view
     * @param index: 1-based index of the nucleotide, or its custom display number
     *
     */
    public focusNucleotide(index: number) {
        const baseIndex = (() => {
            if (this._customNumbering) {
                return this._customNumbering.findIndex((e) => e === index);
            } else {
                return index - 1;
            }
        })();

        if (baseIndex < 0 || baseIndex >= this._bases.length) {
            // eslint-disable-next-line
            console.warn(`Can't focus nucleotide with index '${index}'`);
            return;
        }

        this.setOffset(
            this._width / 2 - this._bases[baseIndex].x,
            this._height / 2 - this._bases[baseIndex].y
        );
    }

    public showNucleotideRange(range: [number, number] | null) {
        const [start, end] = range ?? [1, this._bases.length];
        if (start < 1 || end > this._bases.length || start >= end) {
            // eslint-disable-next-line
            console.warn(`Invalid nucleotide range [${start}, ${end}]`);
            return;
        }

        this._showNucleotideRange = Boolean(range);
        if (!range) {
            return;
        }

        for (let i = 0; i < this._bases.length; ++i) {
            this._bases[i].container.visible = i >= (start - 1)
                && i < end
                && this.isNucleotidePartOfSequence(i);
        }
    }

    private computeLayout(fast: boolean = false): void {
        const fullSeq: Sequence = this.fullSequence;

        if (fullSeq.length > this._bases.length) {
            log.debug(fullSeq.length, this._bases.length);
            throw new Error("Sequence length and pose length don't match");
        }

        const n: number = fullSeq.length;
        let xMid = 0;
        let yMid = 0;

        let xarray: number[] = new Array(n);
        let yarray: number[] = new Array(n);

        let exceptionIndices: number[] | undefined;
        if (fullSeq.baseArray.indexOf(RNABase.CUT) >= 0) {
            exceptionIndices = [];
            exceptionIndices.push(0);
            let oligoIndex = -1;
            // array of positions of connectors "&"
            while (fullSeq.baseArray.indexOf(RNABase.CUT, oligoIndex + 1) >= 0) {
                oligoIndex = fullSeq.baseArray.indexOf(RNABase.CUT, oligoIndex + 1);
                exceptionIndices.push(oligoIndex);
            }
        }
        const rnaDrawer: RNALayout = new RNALayout(
            Pose2D.ZOOM_SPACINGS[this._zoomLevel],
            Pose2D.ZOOM_SPACINGS[this._zoomLevel] * this._explosionFactor,
            exceptionIndices
        );

        rnaDrawer.setupTree(this._pairs, this._targetPairs);
        rnaDrawer.drawTree(this._customLayout);
        rnaDrawer.getCoords(xarray, yarray);
        this._pseudoknotPairs = rnaDrawer.pseudoknotPairs;

        this._baseRotationDirectionSign = new Array(n);
        rnaDrawer.getRotationDirectionSign(this._baseRotationDirectionSign);

        if (this._desiredAngle === 90) {
            const tmp = xarray;
            xarray = yarray;
            yarray = tmp;
        }

        let xmin: number = xarray[0];
        let xmax: number = xarray[0];
        let ymin: number = yarray[0];
        let ymax: number = yarray[0];

        for (let ii = 0; ii < n; ii++) {
            if (xarray[ii] < xmin) {
                xmin = xarray[ii];
            }

            if (xarray[ii] > xmax) {
                xmax = xarray[ii];
            }

            if (yarray[ii] < ymin) {
                ymin = yarray[ii];
            }

            if (yarray[ii] > ymax) {
                ymax = yarray[ii];
            }
        }

        xMid = (xmax + xmin) / 2.0;
        yMid = (ymax + ymin) / 2.0;

        this._baseFromX = new Array(n);
        this._baseFromY = new Array(n);
        this._baseToX = new Array(n);
        this._baseToY = new Array(n);

        for (let ii = 0; ii < n; ii++) {
            this._baseFromX[ii] = this._bases[ii].x;
            this._baseFromY[ii] = this._bases[ii].y;

            this._baseToX[ii] = xarray[ii] - xMid;
            this._baseToY[ii] = yarray[ii] - yMid;
        }

        this._foldStartTime = -1;
        if (fast) {
            this._foldDuration = 0.45;
        } else {
            this._foldDuration = 0.7;
        }
    }

    private printFeedback(dat: number[]): void {
        // for (let i: number = 0; i < dat.length; i++) {
        //     let feedback_obj: GameText = null;
        //     feedback_obj = new GameText(Fonts.arial(12, true));
        //     feedback_obj.set_text(dat[i]);
        //     this._feedback_objs.push(feedback_obj);
        //     this.addObject(this._feedback_objs[i]);
        // }
    }

    private updatePrintFeedback(hide: boolean = true): void {
        // for (let ii: number = 0; ii < this._feedback_objs_num; ii++) {
        //     let obj_p: Point = this.get_base_xy(ii + this._feedback_objs_start_ind);
        //     let out_p: Point = this.get_base_out_xy(ii + this._feedback_objs_start_ind);
        //     obj_p.x += 1.6 * (out_p.x - this._off_x) - this._feedback_objs[ii].text_width() / 2;
        //     obj_p.y += 1.6 * (out_p.y - this._off_y) - this._feedback_objs[ii].text_height() / 2;
        //     if (hide) this._feedback_objs[ii].visible = false;
        //     this._feedback_objs[ii].set_pos(new UDim(0, 0, obj_p.x, obj_p.y));
        //     this._feedback_objs[ii].graphics.clear();
        //     this._feedback_objs[ii].graphics.beginFill(0x000000, 0.35);
        //     this._feedback_objs[ii].graphics.drawRoundRect(
        //         0, 0, this._feedback_objs[ii].text_width(), this._feedback_objs[ii].text_height(), 12
        //     );
        // }
    }

    private onMouseOut(): void {
        this.clearMouse();
        this.updateScoreNodeGui();
    }

    private deleteBaseWithIndex(index: number): [string, PuzzleEditOp, number[]?] {
        if (this.isTrackedIndex(index)) {
            this.toggleBaseMark(index);
        }

        if (this._pairs.pairs[index] < 0 || this.isLocked(this._pairs.pairs[index])) {
            return PoseUtil.deleteNopairWithIndex(index, this._pairs);
        } else {
            return PoseUtil.deletePairWithIndex(index, this._pairs);
        }
    }

    private onBaseMouseDown(seqnum: number, togglelock: boolean): void {
        this._lastColoredIndex = seqnum;

        if (!togglelock && this.isEditable(seqnum)) {
            this._coloring = true;
            this._mutatedSequence = this.fullSequence.slice(0);

            if (this._currentColor === RNABase.LOCK) {
                if (!this._locks) {
                    this._locks = [];
                    for (let ii = 0; ii < this._sequence.length; ii++) {
                        this._locks.push(false);
                    }
                }
                this._locks[seqnum] = !this._locks[seqnum];
                this._bases[seqnum].setDirty();
                this._lockUpdated = true;
            } else if (this._currentColor === RNABase.BINDING_SITE) {
                if (this._bindingSite != null && this._bindingSite[seqnum]) {
                    this._bindingSite = [];
                    for (let ii = 0; ii < this._sequence.length; ii++) {
                        this._bindingSite.push(false);
                    }
                    this.molecularBindingSite = this._bindingSite;
                    this._bindingSiteUpdated = true;
                } else {
                    const bindingBases: number[] | null = this._pairs.isInternal(seqnum);
                    if (bindingBases != null && bindingBases.length > 4) {
                        this._bindingSite = [];
                        for (let ii = 0; ii < this._sequence.length; ii++) {
                            this._bindingSite.push(false);
                        }

                        for (let ii = 0; ii < bindingBases.length; ii++) {
                            this._bindingSite[bindingBases[ii]] = true;
                        }
                        this.molecularBindingSite = this._bindingSite;
                        this._bindingSiteUpdated = true;
                    } else {
                        (this.mode as GameMode).showNotification(
                            'Binding site can be only formed at loops between 2 stacks\n(Internal loops and Bulges)'
                        );
                    }
                }
            } else if (this._mouseDownAltKey || this._currentColor === RNABase.MAGIC_GLUE) {
                if (this.toggleDesignStruct(seqnum)) {
                    this._designStructUpdated = true;
                }
            } else if (!this.isLocked(seqnum)) {
                if (this._currentColor >= 1 && this._currentColor <= 4) {
                    this._mutatedSequence.baseArray[seqnum] = this._currentColor;
                    ROPWait.notifyPaint(seqnum, this._bases[seqnum].type, this._currentColor);
                    this._bases[seqnum].setType(this._currentColor, true);
                } else if (this._currentColor === RNABase.RANDOM) {
                    const randbase: number = (Math.floor(Math.random() * 4) % 4) + 1;
                    this._mutatedSequence.baseArray[seqnum] = randbase;
                    this._bases[seqnum].setType(randbase, true);
                } else if (this._currentColor === RNABase.PAIR) {
                    if (this._pairs.pairs[seqnum] >= 0) {
                        const pi = this._pairs.pairs[seqnum];

                        if (this.isLocked(pi)) {
                            return;
                        }

                        const clickBase: number = this._mutatedSequence.baseArray[seqnum];

                        this._mutatedSequence.baseArray[seqnum] = this._mutatedSequence.baseArray[pi];
                        this._mutatedSequence.baseArray[pi] = clickBase;

                        this._bases[seqnum].setType(this._mutatedSequence.baseArray[seqnum], true);
                        this._bases[pi].setType(this._mutatedSequence.baseArray[pi], true);
                    }
                } else if (this._currentColor === RNABase.MAGIC_GLUE) {
                    this._mutatedSequence.baseArray[seqnum] = this._currentColor;
                    this._bases[seqnum].setType(this._currentColor);
                } else if (this._currentColor === RNABase.AU_PAIR) {
                    if (this._pairs.pairs[seqnum] >= 0) {
                        const pi = this._pairs.pairs[seqnum];

                        if (this.isLocked(pi)) {
                            return;
                        }

                        this._mutatedSequence.baseArray[seqnum] = RNABase.ADENINE;
                        this._mutatedSequence.baseArray[pi] = RNABase.URACIL;

                        this._bases[seqnum].setType(this._mutatedSequence.baseArray[seqnum], true);
                        this._bases[pi].setType(this._mutatedSequence.baseArray[pi], true);
                    }
                } else if (this._currentColor === RNABase.GC_PAIR) {
                    if (this._pairs.pairs[seqnum] >= 0) {
                        const pi = this._pairs.pairs[seqnum];

                        if (this.isLocked(pi)) {
                            return;
                        }

                        this._mutatedSequence.baseArray[seqnum] = RNABase.GUANINE;
                        this._mutatedSequence.baseArray[pi] = RNABase.CYTOSINE;

                        this._bases[seqnum].setType(this._mutatedSequence.baseArray[seqnum], true);
                        this._bases[pi].setType(this._mutatedSequence.baseArray[pi], true);
                    }
                } else if (this._currentColor === RNABase.GU_PAIR) {
                    if (this._pairs.pairs[seqnum] >= 0) {
                        const pi = this._pairs.pairs[seqnum];

                        if (this.isLocked(pi)) {
                            return;
                        }

                        this._mutatedSequence.baseArray[seqnum] = RNABase.URACIL;
                        this._mutatedSequence.baseArray[pi] = RNABase.GUANINE;

                        this._bases[seqnum].setType(this._mutatedSequence.baseArray[seqnum], true);
                        this._bases[pi].setType(this._mutatedSequence.baseArray[pi], true);
                    }
                } else if (this._dynPaintColors.indexOf(this._currentColor) >= 0) {
                    const index: number = this._dynPaintColors.indexOf(this._currentColor);
                    this._dynPaintTools[index].onPaint(this, seqnum);
                }
            }
        }
    }

    private onBaseMouseMove(seqnum: number): void {
        if (!this._coloring && this._shiftStart >= 0 && seqnum < this.sequenceLength) {
            this._shiftEnd = seqnum;
            this.updateShiftHighlight();
        }

        if (!this._coloring || (seqnum === this._lastColoredIndex)) {
            return;
        }

        if (this._currentColor === RNABase.LOCK) {
            if (!this._locks) {
                this._locks = [];
                for (let ii = 0; ii < this._sequence.length; ii++) {
                    this._locks.push(false);
                }
            }
            this._locks[seqnum] = !this._locks[seqnum];
            this._bases[seqnum].setDirty();
            this._lockUpdated = true;
        } else if (this._mouseDownAltKey || this._currentColor === RNABase.MAGIC_GLUE) {
            if (this.toggleDesignStruct(seqnum)) {
                this._designStructUpdated = true;
            }
        } else if (!this.isLocked(seqnum)) {
            if (this._mutatedSequence === null) {
                throw new Error('The clicked base is not locked, but the mutated sequence is null: critical error!');
            }
            if (this._currentColor >= 1 && this._currentColor <= 4) {
                this._mutatedSequence.baseArray[seqnum] = this._currentColor;
                ROPWait.notifyPaint(seqnum, this._bases[seqnum].type, this._currentColor);
                this._bases[seqnum].setType(this._currentColor, true);
            } else if (this._currentColor === RNABase.RANDOM) {
                const randbase: number = (Math.floor(Math.random() * 4) % 4) + 1;
                this._mutatedSequence.baseArray[seqnum] = randbase;
                this._bases[seqnum].setType(randbase, true);
            } else if (this._currentColor === RNABase.PAIR) {
                if (this._pairs.pairs[seqnum] >= 0) {
                    let pi = this._pairs.pairs[seqnum];
                    if (this._pairs.pairs[seqnum] >= 0) {
                        pi = this._pairs.pairs[seqnum];

                        if (this.isLocked(pi)) {
                            return;
                        }

                        const clickBase: number = this._mutatedSequence.baseArray[seqnum];

                        this._mutatedSequence.baseArray[seqnum] = this._mutatedSequence.baseArray[pi];
                        this._mutatedSequence.baseArray[pi] = clickBase;

                        this._bases[seqnum].setType(this._mutatedSequence.baseArray[seqnum], true);
                        this._bases[pi].setType(this._mutatedSequence.baseArray[pi], true);
                    }
                }
            } else if (this._currentColor === RNABase.MAGIC_GLUE) {
                this._mutatedSequence.baseArray[seqnum] = this._currentColor;
                this._bases[seqnum].setType(this._currentColor);
            } else if (this._currentColor === RNABase.AU_PAIR) {
                if (this._pairs.pairs[seqnum] >= 0) {
                    const pi = this._pairs.pairs[seqnum];

                    if (this.isLocked(pi)) {
                        return;
                    }

                    this._mutatedSequence.baseArray[seqnum] = RNABase.ADENINE;
                    this._mutatedSequence.baseArray[pi] = RNABase.URACIL;

                    this._bases[seqnum].setType(this._mutatedSequence.baseArray[seqnum], true);
                    this._bases[pi].setType(this._mutatedSequence.baseArray[pi], true);
                }
            } else if (this._currentColor === RNABase.GC_PAIR) {
                if (this._pairs.pairs[seqnum] >= 0) {
                    const pi = this._pairs.pairs[seqnum];

                    if (this.isLocked(pi)) {
                        return;
                    }

                    this._mutatedSequence.baseArray[seqnum] = RNABase.GUANINE;
                    this._mutatedSequence.baseArray[pi] = RNABase.CYTOSINE;

                    this._bases[seqnum].setType(this._mutatedSequence.baseArray[seqnum], true);
                    this._bases[pi].setType(this._mutatedSequence.baseArray[pi], true);
                }
            } else if (this._currentColor === RNABase.GU_PAIR) {
                if (this._pairs.pairs[seqnum] >= 0) {
                    const pi = this._pairs.pairs[seqnum];

                    if (this.isLocked(pi)) {
                        return;
                    }

                    this._mutatedSequence.baseArray[seqnum] = RNABase.URACIL;
                    this._mutatedSequence.baseArray[pi] = RNABase.GUANINE;

                    this._bases[seqnum].setType(this._mutatedSequence.baseArray[seqnum], true);
                    this._bases[pi].setType(this._mutatedSequence.baseArray[pi], true);
                }
            } else if (this._dynPaintColors.indexOf(this._currentColor) >= 0) {
                const index: number = this._dynPaintColors.indexOf(this._currentColor);
                this._dynPaintTools[index].onPainting(this, seqnum);
            }
        }
        this._lastColoredIndex = seqnum;
        this._bases[seqnum].animate();
    }

    private updateDesignHighlight(): void {
        const elems: number[] = this.designSegments;
        this._selectionHighlightBox.clear();
        this._selectionHighlightBox.setHighlight(elems);
    }

    private updateShiftHighlight(): void {
        this._shiftHighlightBox.clear();
        if (this._shiftStart >= 0) {
            this._shiftHighlightBox.setHighlight(
                this._shiftEnd < this._shiftStart
                    ? [this._shiftEnd, this._shiftStart] : [this._shiftStart, this._shiftEnd]
            );
        }
    }

    private static drawEnergyHighlight(hilite: Graphics, energy: Sprite): Graphics {
        // Draw highlight around the energy reading.
        // Give it a bit of padding so the highlight isn't so tight.
        const PADDING = 2;
        return hilite.clear()
            .lineStyle(1, 0xFFFFFF, 0.7)
            .drawRoundedRect(
                energy.x - PADDING, energy.y - PADDING,
                energy.width + PADDING, energy.height + PADDING, 10
            );
    }

    private updateEnergyHighlight(energy: Sprite, idx: number, vis: boolean): void {
        if (idx >= this._energyHighlights.length) {
            if (!this._highlightEnergyText) {
                return;
            }

            const obj = new SceneObject(Pose2D.drawEnergyHighlight(new Graphics(), energy));
            obj.display.alpha = 0;
            obj.addObject(new RepeatingTask((): SerialTask => new SerialTask(
                new AlphaTask(1, 0.5),
                new AlphaTask(0, 0.5)
            )));

            this.addObject(obj, this.container);
            this._energyHighlights.push(obj);
        } else {
            const obj = this._energyHighlights[idx];
            obj.display.visible = vis;
            Pose2D.drawEnergyHighlight(obj.display as Graphics, energy);
        }
    }

    private clearEnergyHighlights(): void {
        for (const obj of this._energyHighlights) {
            obj.destroySelf();
        }

        this._energyHighlights = [];
    }

    private renderAuxInfo(): void {
        this._auxInfoCanvas.clear();

        if (!this._displayAuxInfo || this._auxInfo == null || this._auxInfo[Pose2D.CLEAVING_SITE] === undefined) {
            return;
        }

        const cleavingSite: number = this._auxInfo[Pose2D.CLEAVING_SITE] as number;
        if (cleavingSite < this._bases.length - 1) {
            const bX: number = this._bases[cleavingSite].x + this._offX;
            const bY: number = this._bases[cleavingSite].y + this._offY;

            const bNextX: number = this._bases[cleavingSite + 1].x + this._offX;
            const bNextY: number = this._bases[cleavingSite + 1].y + this._offY;

            const cX: number = (bX + bNextX) / 2.0;
            const cY: number = (bY + bNextY) / 2.0;

            const goX: number = bNextY - bY;
            const goY: number = -(bNextX - bX);

            this._auxInfoCanvas.lineStyle(3, 0xFF0000, 0.9);
            this._auxInfoCanvas.moveTo(cX + goX / 2.0, cY + goY / 2.0);
            this._auxInfoCanvas.lineTo(cX - goX / 2.0, cY - goY / 2.0);

            this._auxTextballoon.display.position = new Point(cX + goX / 2.0, cY + goY / 2.0);
        }
    }

    private checkPairs(): void {
        const fullSeq = this.fullSequence;

        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs.pairs[ii] >= 0 && this.isPairSatisfied(ii, this._pairs.pairs[ii])) {
                const pairStr: number = Pose2D.getPairStrength(
                    fullSeq.baseArray[ii], fullSeq.baseArray[this._pairs.pairingPartner(ii)]
                );

                if (this._baseToX && this._baseToY) {
                    this._bases[ii].setPairing(true,
                        this._baseToX[this._pairs.pairs[ii]] - this._baseToX[ii],
                        this._baseToY[this._pairs.pairs[ii]] - this._baseToY[ii],
                        0.5, pairStr);
                } else {
                    this._bases[ii].setPairing(true,
                        this._bases[this._pairs.pairs[ii]].x - this._bases[ii].x,
                        this._bases[this._pairs.pairs[ii]].y - this._bases[ii].y,
                        0.5, pairStr);
                }
            } else {
                this._bases[ii].setPairing(false, -1, -1, 0.5, -1);
            }
        }
    }

    private updateScoreNodeVisualization(offsetChanged: boolean): void {
        if (this._scoreNodes == null) {
            this._scoreNodeHighlight.clear();
            return;
        }

        if (this._baseToX != null) {
            this._scoreNodeIndex = -1;
        }

        if (this._scoreNodeIndex !== this._lastScoreNodeIndex || offsetChanged) {
            this._scoreNodeHighlight.clear();

            if (
                this._scoreNodeIndex >= 0
                && this._scoreNodes[this._scoreNodeIndex] != null
                && this._scoreNodes[this._scoreNodeIndex].baseIndices !== null
            ) {
                const origIndices = this._scoreNodes[this._scoreNodeIndex].baseIndices;
                Assert.assertIsDefined(origIndices);
                this._scoreNodeHighlight.lineStyle(0, 0, 0);
                this._scoreNodeHighlight.beginFill(0xFFFFFF, 0.22);
                const indices: number[] = origIndices.slice();

                const contour: number[] = [];
                for (let ii = 0; ii < indices.length; ii++) {
                    const p: Point = this.getBaseLoc(indices[ii]);
                    contour.push(p.x);
                    contour.push(p.y);
                }
                const triangleVerts = triangulate(contour);
                for (let ii = 0; ii < triangleVerts.length / 6; ii++) {
                    this._scoreNodeHighlight.moveTo(triangleVerts[6 * ii], triangleVerts[6 * ii + 1]);
                    this._scoreNodeHighlight.lineTo(triangleVerts[6 * ii + 2], triangleVerts[6 * ii + 3]);
                    this._scoreNodeHighlight.lineTo(triangleVerts[6 * ii + 4], triangleVerts[6 * ii + 5]);
                }
                this._scoreNodeHighlight.endFill();
            }
            this._lastScoreNodeIndex = this._scoreNodeIndex;
        }

        if (this._scoreTexts != null) {
            for (let ii = 0; ii < this._scoreNodes.length; ii++) {
                const indices: number[] | null = this._scoreNodes[ii].baseIndices;
                Assert.assertIsDefined(indices);
                let xAvg = 0;
                let yAvg = 0;

                for (let jj = 0; jj < indices.length; jj++) {
                    const p: Point = this.getBaseLoc(indices[jj]);
                    xAvg += p.x;
                    yAvg += p.y;
                }

                if (indices.length > 0) {
                    xAvg /= indices.length;
                    yAvg /= indices.length;
                }

                xAvg -= this._scoreTexts[ii].width / 2;
                yAvg -= this._scoreTexts[ii].height / 2;

                this._scoreTexts[ii].position = new Point(xAvg, yAvg);
                this._scoreTexts[ii].visible = (this._zoomLevel < 4);
                this.updateEnergyHighlight(this._scoreTexts[ii], ii, this._scoreTexts[ii].visible);
            }
        }
    }

    public set getEnergyDelta(cb: () => number) {
        this._getEnergyDelta = cb;
    }

    private static readonly MOUSE_LOC: Point = new Point();
    private updateScoreNodeGui(): void {
        this._scoreNodeIndex = -1;

        if (this._scoreNodes != null) {
            let totalScore = 0;
            let nodeFound = false;
            let nodeTxt = '';
            let nodeLabel = '';
            let nodeScore = '';

            Assert.assertIsDefined(Flashbang.globalMouse);
            if (this._poseField.containsPoint(Flashbang.globalMouse.x, Flashbang.globalMouse.y)) {
                // AMW TODO POINT IPOINT
                let mouseP: Point = new Point(0, 0);
                mouseP = mouseP.copyFrom(this.display.toLocal(Flashbang.globalMouse, undefined, Pose2D.MOUSE_LOC));
                const baseXys: Point[] = [];

                for (let ii = 0; ii < this.fullSequenceLength; ii++) {
                    baseXys.push(this.getBaseLoc(ii));
                }
                for (let ii = 0; ii < this._scoreNodes.length; ii++) {
                    const baseIndices: number[] | null = this._scoreNodes[ii].baseIndices;
                    Assert.assertIsDefined(baseIndices);
                    const nodePoints: Point[] = [];

                    for (let jj = 0; jj < baseIndices.length; jj++) {
                        nodePoints.push(baseXys[baseIndices[jj]]);
                    }

                    if (!nodeFound && Utility.isPointWithin(mouseP, nodePoints)) {
                        nodeTxt = this._scoreNodes[ii].text;
                        nodeLabel = this._scoreNodes[ii].textLabel;
                        nodeScore = this._scoreNodes[ii].textScore;
                        nodeFound = true;
                        this._scoreNodeIndex = ii;
                    }
                }
            }

            if (this._pseudoknotted && this._scoreFolder !== null) {
                totalScore = Math.round(this._scoreFolder.scoreStructures(
                    this._sequence, this._pairs.getSatisfiedPairs(this._sequence)
                ));
            } else {
                for (const scoreNode of this._scoreNodes) {
                    totalScore += scoreNode.score;
                }
            }

            let scoreLabel = 'Total';
            let scoreScore = '';
            let factor = 0;
            if ((this._molecularBindingBases != null)
                || (this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_DIMER)
                || (this._oligos != null)) {
                const labelElems: string[] = [];
                const scoreElems: string[] = [];

                if (this._molecularBindingBases != null && this._molecularBindingBonus !== undefined) {
                    factor++;
                    if (this._moleculeIsBoundReal) {
                        labelElems.push(EnergyScoreDisplay.green('Molecule Bound'));
                        // Round to 2 decimal places
                        const bonus = Math.round(this._molecularBindingBonus * 1e2) / 1e2;
                        scoreElems.push(EnergyScoreDisplay.green(` ${bonus} kcal`));
                    } else {
                        labelElems.push(EnergyScoreDisplay.grey('Molecule Not Bound'));
                        scoreElems.push(EnergyScoreDisplay.grey(' (0 kcal)'));
                    }
                }
                if (this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_DIMER) {
                    factor++;
                    const malus: number = this._duplexCost + Math.round(this._oligoMalus);
                    if (this._oligoPaired) {
                        labelElems.push(EnergyScoreDisplay.green('Oligo Bound'));
                        scoreElems.push(EnergyScoreDisplay.red(` ${malus.toFixed(2)} kcal`));
                    } else {
                        labelElems.push(EnergyScoreDisplay.grey('Oligo Not Bound'));
                        scoreElems.push(EnergyScoreDisplay.grey(` ${malus.toFixed(2)} kcal`));
                    }
                }
                if (this._oligos !== undefined && this._oligosOrder !== undefined) {
                    factor++;
                    if (this._oligosPaired === 0) {
                        if (this._oligos.length > 1) {
                            labelElems.push(EnergyScoreDisplay.grey('No Oligo Bound'));
                        } else {
                            labelElems.push(EnergyScoreDisplay.grey('Oligo Not Bound'));
                        }
                        scoreElems.push(EnergyScoreDisplay.grey(' (0 kcal)'));
                    } else {
                        let malus = this._duplexCost;
                        for (let ii = 0; ii < this._oligosPaired; ii++) {
                            malus += Math.round(this._oligos[this._oligosOrder[ii]].malus);
                        }
                        if (this._oligosPaired > 1) {
                            labelElems.push(EnergyScoreDisplay.green('Oligos Bound'));
                        } else {
                            labelElems.push(EnergyScoreDisplay.green('Oligo Bound'));
                        }
                        scoreElems.push(EnergyScoreDisplay.red(` ${malus.toFixed(2)} kcal`));
                    }
                }

                scoreLabel += EnergyScoreDisplay.grey(' (') + labelElems.join(', ') + EnergyScoreDisplay.grey(')');
                scoreScore = (totalScore / 100).toString() + scoreElems.join('');
            } else {
                scoreScore = `${(totalScore / 100).toString()} kcal`;
            }
            this.updateEnergyDisplaySizeLocation(factor);

            this._primaryScoreEnergyDisplay.setEnergyText(scoreLabel, scoreScore);
            this._secondaryScoreEnergyDisplay.setEnergyText(nodeLabel, nodeScore);
            this._secondaryScoreEnergyDisplay.visible = (this._showTotalEnergy && nodeFound);

            // This is because the undo stack isn't populated yet when this is run on puzzle boot/changing folders,
            // which is needed for the delta - TODO: Handle this in a less hacky way
            const attemptSetDelta = () => {
                try {
                    this._deltaScoreEnergyDisplay.setEnergyText(
                        'Natural/Target Delta',
                        `${Math.round(this._getEnergyDelta()) / 100} kcal`
                    );
                    this._deltaScoreEnergyDisplay.visible = (this._showTotalEnergy && this._scoreFolder != null);
                } catch (e) {
                    this._deltaScoreEnergyDisplay.visible = false;
                    setTimeout(attemptSetDelta, 1000);
                }
            };
            setTimeout(attemptSetDelta, 50);
        }
    }

    private updateEnergyDisplaySizeLocation(factor: number): void {
        this._primaryScoreEnergyDisplay.position = new Point(17, Pose2D.SCORES_POSITION_Y);
        this._primaryScoreEnergyDisplay.setSize(111 + factor * 59, 40);

        this._deltaScoreEnergyDisplay.position = new Point(17 + 119 + factor * 59, Pose2D.SCORES_POSITION_Y);
        this._deltaScoreEnergyDisplay.setSize(111, 40);

        this._secondaryScoreEnergyDisplay.position = new Point(17 + 119 * 2 + factor * 59, Pose2D.SCORES_POSITION_Y);
        this._secondaryScoreEnergyDisplay.setSize(111, 40);
    }

    private clearScoreTexts(): void {
        if (this._scoreTexts != null) {
            for (const scoreText of this._scoreTexts) {
                scoreText.destroy({children: true});
            }
            this._scoreTexts = null;
        }
    }

    private generateScoreNodes(): void {
        this._scoreNodes = null;
        this._scoreNodeHighlight.clear();
        this.clearEnergyHighlights();

        if (this._scoreFolder == null
            || this._sequence == null
            || this._sequence.length === 0
            || this._pairs == null
            || this._pairs.length !== this.fullSequenceLength) {
            this.clearScoreTexts();
            return;
        }

        // / JEE : It's a bit of waste to generate RNALayout twice (once here, once when drawing rna)
        // / But this is cheap, so it shouldn't matter too much
        const scoreTree: RNALayout = new RNALayout();
        scoreTree.setupTree(this.satisfiedPairs);

        const treeroot: RNATreeNode | null = scoreTree.root;
        scoreTree.scoreTree(this.fullSequence, this._scoreFolder);

        const scoreNodes: ScoreDisplayNode[] = [];
        const rootCoords: number[] = [];
        this.generateScoreNodesRecursive(treeroot, rootCoords, scoreNodes);
        this._scoreNodes = scoreNodes;

        this.clearScoreTexts();
        if (this._displayScoreTexts && !this._pseudoknotted) {
            this._scoreTexts = [];
            for (const scoreNode of this._scoreNodes) {
                const scoreText = new Sprite(BitmapManager.getTextBitmap(scoreNode.scoreString, scoreNode.scoreColor));
                scoreText.visible = false;
                this._scoreTexts.push(scoreText);
                this._energyTextLayer.addChild(scoreText);
            }
        }

        this.updateScoreNodeGui();
    }

    private generateScoreNodesRecursive(
        root: RNATreeNode | null, coords: number[] | null, nodes: ScoreDisplayNode[]
    ): void {
        if (root == null) {
            return;
        }

        if (coords != null) {
            if (root.isPair) {
                coords.push(root.indexA);
                coords.push(root.indexB);
            } else if (root.indexA >= 0) {
                coords.push(root.indexA);
                return;
            }
        }

        let childCoords: number[];

        if (root.isPair) {
            if (root.children.length > 1) {
                throw new Error("Something's wrong with score tree");
            }

            if (root.children.length !== 0) {
                if (root.children[0].isPair) {
                    childCoords = [];

                    childCoords.push(root.indexA);
                    childCoords.push(root.indexB);

                    childCoords.push(root.children[0].indexB);
                    childCoords.push(root.children[0].indexA);

                    const newnode = new ScoreDisplayNode();
                    nodes.push(newnode);
                    newnode.setType(ScoreDisplayNodeType.STACK, childCoords, root.score);

                    this.generateScoreNodesRecursive(root.children[0], null, nodes);
                } else {
                    childCoords = [];

                    childCoords.push(root.indexB);
                    childCoords.push(root.indexA);

                    this.generateScoreNodesRecursive(root.children[0], childCoords, nodes);
                }
            }
        } else {
            for (const child of root.children) {
                this.generateScoreNodesRecursive(child, coords, nodes);
            }

            if (coords != null) {
                const newnode = new ScoreDisplayNode();
                nodes.push(newnode);

                newnode.setType(ScoreDisplayNodeType.LOOP, coords, root.score);
            }
        }
    }

    private isEditable(seqnum: number): boolean {
        if (this._editableIndices != null) {
            const inList: boolean = (this._editableIndices.indexOf(seqnum) !== -1);
            return this._editable ? inList : !inList;
        } else {
            return this._editable;
        }
    }

    private createBase(): Base {
        const base: Base = new Base(this, RNABase.GUANINE);
        this.addObject(base, this._baseLayer);
        this._bases.push(base);
        return base;
    }

    private isNucleotidePartOfSequence(index: number) {
        return index < this.fullSequence.length && this._bases[index].type !== RNABase.CUT;
    }

    private static createDefaultLocks(sequenceLength: number): boolean[] {
        const locks: boolean[] = new Array<boolean>(sequenceLength);
        for (let ii = 0; ii < sequenceLength; ++ii) {
            locks[ii] = false;
        }
        return locks;
    }

    private static getPairStrength(s1: number, s2: number): number {
        if (Pose2D.isPair(s1, s2, RNABase.ADENINE, RNABase.URACIL)) {
            return 2;
        } else if (Pose2D.isPair(s1, s2, RNABase.GUANINE, RNABase.URACIL)) {
            return 1;
        } else if (Pose2D.isPair(s1, s2, RNABase.GUANINE, RNABase.CYTOSINE)) {
            return 3;
        } else {
            return -1;
        }
    }

    private static isPair(s1: number, s2: number, type1: number, type2: number): boolean {
        return (s1 === type1 && s2 === type2) || (s1 === type2 && s2 === type1);
    }

    private readonly _baseLayer: Container = new Container();
    private readonly _poseField: PoseField;

    private _width: number = 0;
    private _height: number = 0;

    // Array of sequence/pairs
    private _sequence: Sequence = new Sequence('');
    private _mutatedSequence: Sequence | null;
    private _pairs: SecStruct = new SecStruct();
    private _targetPairs: SecStruct = new SecStruct();
    private _pseudoknotPairs: SecStruct = new SecStruct();
    private _bases: Base[] = [];
    private _locks: boolean[] | undefined = [];
    private _forcedStruct: number[] | null = [];
    private _designStruct: boolean[] = [];
    private _bindingSite: boolean[] | null;
    private _molecularBindingBases: BaseGlow[] | null = null;
    private _molecularBindingPairs: number[] = [];
    private _molecule: Molecule | null= null;
    private _moleculeIsBound: boolean = false;
    private _moleculeIsBoundReal: boolean = false;
    private _molecularBindingBonus: number | undefined = 0;
    private _moleculeTargetPairs: SecStruct | null;
    private _shiftLimit: number;
    private _customLayout: Array<[number, number] | [null, null]> | undefined = undefined;
    private _pseudoknotted: boolean = false;

    // Oligos
    private _oligo: number[] | null = null;
    private _oligoMode: number = Pose2D.OLIGO_MODE_DIMER;
    private _oligoName: string | null = null;
    private _duplexCost: number = EPars.DUPLEX_INIT; // total for all strands
    private _oligoMalus: number = 0; // concentration related penalty
    private _oligoBases: BaseGlow[] | null = null; // for glows
    private _oligoPaired: boolean = false;

    // Multistrands
    private _oligos: Oligo[] | undefined = undefined;
    private _oligosOrder: number[] | undefined = undefined;
    private _prevOligosOrder: number[] | undefined;
    private _oligosPaired: number = 0;
    private _strandLabel: TextBalloon;

    private _barcodes: number[];
    private _moleculeLayer: Container;
    private _energyTextLayer: Container;

    private _coloring: boolean = false;
    private _currentColor: number = RNABase.URACIL;
    private _lastColoredIndex: number;
    private _lockUpdated: boolean;
    private _bindingSiteUpdated: boolean;
    private _designStructUpdated: boolean;

    // Rope connecting bases for crazy user-defined layouts
    private _baseRope: BaseRope;

    // lines connecting pseudoknotted BPs
    private _pseudoknotLines: PseudoknotLines;

    // Scripted painters
    private _dynPaintColors: number[] = [];
    private _dynPaintTools: Booster[] = [];

    // Is this pose editable?
    private _editable: boolean;
    private _editableIndices: number[] | null = null;

    // Pointer to callback function to be called after change in pose
    private _poseEditCallback: (() => void) | null = null;
    private _trackMovesCallback: ((count: number, moves: Move[]) => void) | null = null;
    private _addBaseCallback: (parenthesis: string | null, op: PuzzleEditOp | null, index: number) => void;
    private _startMousedownCallback: PoseMouseDownCallback;
    private _mouseDownAltKey: boolean = false;

    // Pointer to function that needs to be called in a GameMode to have access to appropriate state
    private _getEnergyDelta: () => number;

    private _lettermode: boolean = false;
    private _displayScoreTexts: boolean;

    private _redraw: boolean = true;

    // Time which we sampled bases to animate last time;
    private lastSampledTime: number = -1;

    // Pose position offset
    private _offX: number = 0;
    private _offY: number = 0;
    private _prevOffsetX: number = 0;
    private _prevOffsetY: number = 0;
    private _offsetTranslating: boolean;
    private _startOffsetX: number;
    private _startOffsetY: number;
    private _endOffsetX: number;
    private _endOffsetY: number;

    // For base moving animation
    private _baseFromX: number[] | null;
    private _baseFromY: number[] | null;
    private _baseToX: number[] | null;
    private _baseToY: number[] | null;
    private _foldStartTime: number;
    private _foldDuration: number;
    private _paintCursor: PaintCursor;
    private _baseRotationDirectionSign: number[];

    private _zoomLevel: number = 0;
    private _desiredAngle: number = 0;

    // Is explosion animation on going?
    private _isExploding: boolean = false;
    private _explosionStartTime: number = -1;
    private _explosionRays: LightRay[];
    private _origOffsetX: number;
    private _origOffsetY: number;

    private _onExplosionComplete: (() => void) | null;

    // Selection box
    private _selectionHighlightBox: HighlightBox;
    private _restrictedHighlightBox: HighlightBox;
    private _highlightRestricted: boolean = false;
    private _unstableHighlightBox: HighlightBox;
    private _forcedHighlightBox: HighlightBox;
    private _userDefinedHighlightBox: HighlightBox;
    private _shiftHighlightBox: HighlightBox;
    private _shiftStart: number = -1;
    private _shiftEnd: number = -1;

    // For praising stacks
    private _praiseQueue: number[] = [];
    private _praiseSeq: number[] = [];

    // Score display nodes
    private _scoreNodes: ScoreDisplayNode[] | null;
    private _scoreTexts: Sprite[] | null;
    private _scoreFolder: Folder | null;
    private _scoreNodeIndex: number = -1;
    private _lastScoreNodeIndex: number = -1;
    private _scoreNodeHighlight: Graphics;

    // New Score Display panels
    private _primaryScoreEnergyDisplay: EnergyScoreDisplay;
    private _secondaryScoreEnergyDisplay: EnergyScoreDisplay;
    private _deltaScoreEnergyDisplay: EnergyScoreDisplay;
    private _showTotalEnergy: boolean = true;

    // Explosion Factor (RNALayout pairSpace multiplier)
    private _explosionFactor: number = 1;
    private _explosionFactorPanel: ExplosionFactorPanel;

    // For tracking a base
    private _cursorIndex: number | null = 0;
    private _cursorBox: Graphics | null = null;
    private _lastShiftedIndex: number = -1;
    private _lastShiftedCommand: number = -1;

    // Rendering mode
    private _numberingMode: boolean = false;
    private _showBaseRope: boolean = false;
    private _showPseudoknots: boolean = false;
    private _simpleGraphicsMods: boolean = false;

    // customNumbering
    private _customNumbering: (number | null)[] | undefined = undefined;

    // Last exp paint data
    private _expPainter: ExpPainter | null = null;
    private _expMid: number = 0;
    private _expHi: number = 0;
    private _expContinuous: boolean = false;
    private _expExtendedScale: boolean = false;
    private _displayAuxInfo: boolean;
    private _auxInfo: AuxInfo | null;
    private _auxInfoCanvas: Graphics;
    private _auxTextballoon: TextBalloon;

    private _feedbackObjs: SceneObject[] = [];

    private _anchoredObjects: RNAAnchorObject[] = [];
    private _highlightEnergyText: boolean = false;
    private _energyHighlights: SceneObject[] = [];

    private _showNucleotideRange = false;

    /*
     * NEW HIGHLIGHT.
     *  - Input: List of nucleotides that we wish to highlight.
     *  - Unhighlighted Nucleotides: Draw at 65% opacity.
     *  - Highlight Nucleotides: Brighten glow around the nucleotide.
     */
    private _allNewHighlights: RNAHighlightState[] = [];

    private static readonly CLEAVING_SITE = 'cleavingSite';

    private static readonly P: Point = new Point();
}

export interface Oligo {
    malus: number;
    name?: string;
    sequence: number[];
}

export class RNAHighlightState {
    public nuc: number[] | null = null; // nucleotides
    public isOn: boolean = false;
}
