import * as log from 'loglevel';
import {
    Container, Graphics, Point, Sprite, Texture, Rectangle, InteractionEvent
} from 'pixi.js';
import {Registration, Signal} from 'signals';
import EPars, {RNABase, RNAPaint} from 'eterna/EPars';
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
import {Oligo, OligoMode} from 'eterna/rnatypes/Oligo';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import AnnotationManager, {AnnotationData, AnnotationRange} from 'eterna/AnnotationManager';
import ContextMenu from 'eterna/ui/ContextMenu';
import Bitmaps from 'eterna/resources/Bitmaps';
import AnnotationView from 'eterna/ui/AnnotationView';
import AnnotationDialog from 'eterna/ui/AnnotationDialog';
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
import RNALayout, {RNATreeNode} from './RNALayout';
import ScoreDisplayNode, {ScoreDisplayNodeType} from './ScoreDisplayNode';
import triangulate from './triangulate';

interface Mut {
    pos: number;
    base: string;
}

export enum Layout {
    MOVE,
    ROTATE_STEM,
    FLIP_STEM
}

enum FrameUpdateState {
    IDLE,
    THIS_FRAME,
    NEXT_FRAME
}
export const PLAYER_MARKER_LAYER = 'Markers';
export const SCRIPT_MARKER_LAYER = 'Script';

export type PoseMouseDownCallback = (e: InteractionEvent, closestDist: number, closestIndex: number) => void;
export type PosePickCallback = (closestIndex: number) => void;

export default class Pose2D extends ContainerObject implements Updatable {
    public static readonly COLOR_CURSOR: number = 0xFFC0CB;
    public static readonly ZOOM_SPACINGS: number[] = [45, 30, 20, 14, 7];

    public readonly baseMarked = new Signal<number>();
    public readonly baseHovered = new Signal<number>();
    public readonly basesSparked = new Signal<number[]>();

    constructor(poseField: PoseField, editable: boolean, annotationManager: AnnotationManager) {
        super();
        this._poseField = poseField;
        this._editable = editable;
        this._annotationManager = annotationManager;
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

        this._moleculeLayer = new Container();
        this.container.addChild(this._moleculeLayer);
        this._moleculeLayer.visible = false;

        this._energyTextLayer = new Container();
        this.container.addChild(this._energyTextLayer);

        this._paintCursor = new PaintCursor();
        this._paintCursor.display.visible = false;
        this.addObject(this._paintCursor, this.container);

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

        this._libraryHighlightBox = new HighlightBox(this, HighlightType.LIBRARY_SELECT);
        this.addObject(this._libraryHighlightBox, this.container);

        this._annotationHighlightBox = new HighlightBox(this, HighlightType.ANNOTATION);
        this._annotationHighlightBox.display.cursor = 'pointer';
        this.addObject(this._annotationHighlightBox, this.container);

        if (!this._editable) {
            this._currentColor = -1;
        }

        this._annotationCanvas = new Graphics();
        this.container.addChild(this._annotationCanvas);

        this._annotationContextMenu = new ContextMenu({horizontal: true});
        this._annotationContextMenu.addItem(
            'Create',
            Bitmaps.ImgAnnotationCheckmark,
            'Create Annotation',
            0x54B54E
        ).clicked.connect(() => {
            this._annotationDialog = new AnnotationDialog({
                edit: false,
                title: false,
                sequenceLength: this.fullSequenceLength,
                customNumbering: this.customNumbering,
                initialRanges: this._annotationRanges,
                initialLayers: this._annotationManager.allLayers,
                activeCategory: this._annotationManager.activeCategory
            });
            this._annotationManager.persistentAnnotationDataUpdated.connect(() => {
                if (this._annotationDialog) {
                    this._annotationDialog.layers = this._annotationManager.allLayers;
                }
            });
            this._annotationDialog.onUpdateRanges.connect((ranges: AnnotationRange[] | null) => {
                if (ranges) this.setAnnotationRanges(ranges);
            });

            this._annotationDialog.closed.then((annotation: AnnotationData | null) => {
                this._annotationDialog = null;

                if (annotation) {
                    this._annotationManager.addAnnotation(annotation);
                }

                this.clearAnnotationRanges();
            });

            const menuX = this._annotationContextMenu.display.x;
            const menuY = this._annotationContextMenu.display.y;
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            this._annotationDialog.display.x = menuX + this._annotationDialog.display.width < Flashbang.stageWidth
                ? menuX : menuX - this._annotationDialog.display.width;
            this._annotationDialog.display.y = menuY + this._annotationDialog.display.height < Flashbang.stageWidth
                ? menuY : menuY - this._annotationDialog.display.height;

            this.addObject(this._annotationDialog, this.container);

            this.hideAnnotationContextMenu();
        });
        this._annotationContextMenu.addItem(
            'Cancel',
            Bitmaps.ImgAnnotationCross,
            'Cancel Annotation'
        ).clicked.connect(() => {
            this.clearAnnotationRanges();
            this.hideAnnotationContextMenu();
        });
        this.hideAnnotationContextMenu();
        this.addObject(this._annotationContextMenu, this.container);

        this._strandLabel = new TextBalloon('', 0x0, 0.8);
        this._strandLabel.display.visible = false;
        this.addObject(this._strandLabel, this.container);

        this.pointerMove.connect((p) => this.onMouseMoved(p.data.global));
        this.pointerDown.filter(InputUtil.IsLeftMouse).connect((e) => {
            this.callStartMousedownCallback(e);

            // deselect all annotations
            this._annotationManager.deselectSelected();
        });
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
        this.regs.add(Eterna.settings.simpleGraphics.connectNotify((value) => { this.useSimpleGraphics = value; }));
        this.regs.add(Eterna.settings.usePuzzlerLayout.connect(() => this.computeLayout()));

        this.regs.add(this._annotationManager.annotationModeActive.connect((active: boolean) => {
            if (active) {
                this.setBasesOpacity(AnnotationManager.ANNOTATION_UNHIGHLIGHTED_OPACITY);
                this.setAnnotationCanvasOpacity(AnnotationManager.ANNOTATION_UNHIGHLIGHTED_OPACITY);
            } else {
                this.clearAnnotationRanges();
                this.hideAnnotationContextMenu();
                this.setBasesOpacity(1);
                this.setAnnotationCanvasOpacity(1);
            }
        }));
        this.regs.add(this._annotationManager.highlights.connect((ranges: AnnotationRange[] | null) => {
            if (ranges) {
                this.setAnnotationRangeHighlight(ranges);
            }
        }));
        this.regs.add(this._annotationManager.viewAnnotationDataUpdated.connect(() => {
            this.redrawAnnotations(true);
        }));
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;

        this.container.hitArea = new Rectangle(0, 0, width, height);
        this.redrawAnnotations();
    }

    public set redraw(setting: boolean) {
        this._redraw = setting;
    }

    public get baseLayer(): Container {
        return this._baseLayer;
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
        const rnaCoords: RNALayout = new RNALayout(Pose2D.ZOOM_SPACINGS[0], Pose2D.ZOOM_SPACINGS[0]);
        rnaCoords.setupTree(this._pairs, this._targetPairs);
        rnaCoords.drawTree(this._customLayout);
        const {
            xbounds,
            ybounds
        } = rnaCoords.getCoords(this.fullSequenceLength);

        const [xmin, xmax] = xbounds;
        const [ymin, ymax] = ybounds;
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

    public set currentColor(col: RNAPaint | RNABase) {
        this._currentColor = col;
    }

    public get currentColor(): RNAPaint | RNABase {
        return this._currentColor;
    }

    public set currentArrangementTool(col: Layout) {
        this._currentArrangementTool = col;
    }

    public get currentArrangementTool(): Layout {
        return this._currentArrangementTool;
    }

    public doneColoring(): void {
        this._coloring = false;

        let needUpdate = false;

        if (this._customLayoutChanged || this._librarySelectionsChanged) {
            this.checkPairs();
            this.updateMolecule();
            this.generateScoreNodes();
            this.callPoseEditCallback();
            this.redrawAnnotations();
            this._librarySelectionsChanged = false;
            return;
        }

        if (this._mutatedSequence == null) {
            return;
        }

        if (this._mutatedSequence.length !== this.fullSequenceLength) {
            throw new Error("Mutated sequence and original sequence lengths don't match");
        }

        let div = 1;
        if (this._currentColor === RNAPaint.PAIR
            || this._currentColor === RNAPaint.GC_PAIR
            || this._currentColor === RNAPaint.AU_PAIR
            || this._currentColor === RNAPaint.GU_PAIR) {
            div = 2;
        }

        const offset: number = (
            this._oligo != null
            && this._oligoMode === OligoMode.EXT5P
        ) ? this._oligo.length : 0;
        let numMut = 0;
        const muts: Mut[] = [];
        for (let ii = 0; ii < this._sequence.length; ii++) {
            if (this._sequence.nt(ii) !== this._mutatedSequence.nt(ii + offset)) {
                numMut++;
                this._sequence.setNt(ii, this._mutatedSequence.nt(ii + offset));
                muts.push({pos: ii + 1, base: EPars.nucleotideToString(this._sequence.nt(ii))});
                needUpdate = true;
            }
        }
        if (needUpdate) {
            this.callTrackMovesCallback(numMut / div, muts);
        }
        if (
            needUpdate
            || this._lockUpdated
            || this._bindingSiteUpdated
            || this._designStructUpdated
        ) {
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

    public setMutated(seqArr: Sequence): void {
        Assert.assertIsDefined(this._mutatedSequence);
        const n: number = Math.min(this._mutatedSequence.length, seqArr.length);
        const offset: number = (
            this._oligo != null && this._oligoMode === OligoMode.EXT5P
        ) ? this._oligo.length : 0;

        for (let ii = 0; ii < n; ii++) {
            if (this._mutatedSequence.nt(ii) !== seqArr.nt(ii) && !this.isLocked(offset + ii)) {
                this._mutatedSequence.setNt(ii, seqArr.nt(ii));
                this._bases[offset + ii].setType(seqArr.nt(ii));
            }
        }
    }

    public pasteSequence(sequence: Sequence): void {
        if (sequence == null) {
            return;
        }

        let numMut = 0;
        const muts: Mut[] = [];

        const n: number = Math.min(sequence.length, this._sequence.length);
        let needUpdate = false;
        const offset: number = (
            this._oligo != null && this._oligoMode === OligoMode.EXT5P
        ) ? this._oligo.length : 0;

        // Without this, there is some weird behavior where pasting a sequence across multiple
        // poses fails to update sequences on all poses. There may be a better fix for that.
        this._sequence = this._sequence.slice(0);

        for (let ii = 0; ii < n; ii++) {
            if (sequence.nt(ii) === RNABase.UNDEFINED) continue;
            if (this._sequence.nt(ii) !== sequence.nt(ii) && !this.isLocked(offset + ii)) {
                numMut++;
                this._sequence.setNt(ii, sequence.nt(ii));
                muts.push({pos: ii + 1, base: EPars.nucleotideToString(this._sequence.nt(ii))});
                this._bases[offset + ii].setType(sequence.nt(ii));
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

    public parseCommand(command: RNAPaint | RNABase, closestIndex: number): [string, PuzzleEditOp, RNABase[]?] | null {
        switch (command) {
            case RNAPaint.ADD_BASE:
                return PoseUtil.addBaseWithIndex(closestIndex, this._pairs);

            case RNAPaint.ADD_PAIR:
                return PoseUtil.addPairWithIndex(closestIndex, this._pairs);

            case RNAPaint.DELETE:
                return this.deleteBaseWithIndex(closestIndex);

            default:
                return null;
        }
    }

    public parseCommandWithPairs(
        command: RNAPaint, closestIndex: number, pairs: SecStruct
    ): [string, PuzzleEditOp, RNABase[]?] | null {
        switch (command) {
            case RNAPaint.ADD_BASE:
                return PoseUtil.addBaseWithIndex(closestIndex, pairs);

            case RNAPaint.DELETE:
                return this.deleteBaseWithIndexPairs(closestIndex, pairs);

            default:
                return null;
        }
    }

    public onPoseMouseDownPropagate(e: InteractionEvent, closestIndex: number): void {
        const altDown: boolean = Flashbang.app.isAltKeyDown;
        const ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;
        const ctrlDownOrBaseMarking = ctrlDown || this.currentColor === RNAPaint.BASE_MARK;

        if ((this._coloring && !altDown) || ctrlDownOrBaseMarking) {
            if (ctrlDownOrBaseMarking && closestIndex >= this.sequence.length) {
                return;
            }
            this.onPoseMouseDown(e, closestIndex);
        }
    }

    public onVirtualPoseMouseDownPropagate(closestIndex: number): void {
        const altDown: boolean = Flashbang.app.isAltKeyDown;
        const ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;
        const ctrlDownOrBaseMarking = ctrlDown || this.currentColor === RNAPaint.BASE_MARK;

        if ((this._coloring && !altDown) || ctrlDownOrBaseMarking) {
            if (ctrlDownOrBaseMarking && closestIndex >= this.sequence.length) {
                return;
            }
            this.onVirtualPoseMouseDown(closestIndex);
        }
    }

    /**
     * Rotate the stem containing nucleotide idx. Save your results in the
     * customLayout. To achieve this: figure out what stem you're in (helper);
     * find its center (for an axis of rotation); figure out what orientation
     * is clockwise of its current orientation, then get there. We do not store
     * persistent stem orientations, because we would then have to reset them
     * elsewhere with every refold.
     *
     * @param idx
     */
    public rotateStem(startIdx: number): void {
        // If this idx is not paired, it won't be in a stem; return.
        if (!this._targetPairs.isPaired(startIdx)) {
            return;
        }

        // 1. Get coords and set up a customLayout
        const rnaCoords: RNALayout = new RNALayout(
            Pose2D.ZOOM_SPACINGS[this._zoomLevel], Pose2D.ZOOM_SPACINGS[this._zoomLevel]
        );
        // rnaCoords.setupTree(this._pairs.filterForPseudoknots(), this._targetPairs.filterForPseudoknots());
        rnaCoords.setupTree(this._pairs, this._targetPairs);
        rnaCoords.drawTree(this._customLayout);
        const {xarray, yarray} = rnaCoords.getCoords(this._bases.length);

        const localCustomLayout: ([number, number] | [null, null])[] = [];
        for (let ii = 0; ii < this._bases.length; ++ii) {
            if (xarray[ii] === undefined || yarray[ii] === undefined) continue;
            localCustomLayout.push([
                xarray[ii],
                yarray[ii]
            ]);
        }

        // id stem
        const stem = this._targetPairs.stemWith(startIdx);

        // What is center of stem? Average coordinate. Could simplify calculation
        // a little by finding the bases of median index first or something, but
        // that itself takes a bit of work. Unlikely to become bottleneck.
        const center = ((s: [number, number][]) => {
            let x = 0;
            let y = 0;
            for (const bp of s) {
                for (const idx of bp) {
                    x += this._bases[idx].x;
                    y += this._bases[idx].y;
                }
            }
            return [x / (s.length * 2), y / (s.length * 2)];
        })(stem);

        // Determine stem orientation. Really we only care about the "next"
        // orientation, the one we want to impose. We do this by orienting the
        // single bp that is kind of a minimal stem, guaranteed to be there.
        // If the vector from smaller to larger index has +x and -y, we rotate
        // to be +x0y. That goes to 0x+y, to -x0y, to 0x-y.
        const vecBP = ((s: [number, number][], n: number) => {
            for (const bp of s) {
                if (bp[0] === n || bp[1] === n) {
                    if (bp[0] < bp[1]) {
                        return [
                            this._bases[bp[1]].x - this._bases[bp[0]].x,
                            this._bases[bp[1]].y - this._bases[bp[0]].y
                        ];
                    } else {
                        return [
                            this._bases[bp[1]].x - this._bases[bp[0]].x,
                            this._bases[bp[1]].y - this._bases[bp[0]].y
                        ];
                    }
                }
            }
            return [0, 0];
        })(stem, startIdx);

        // Find and sort the (smallest, largest) bp. Let's assume it's first.
        const firstbp = stem[0][0] < stem[0][1]
            ? stem[0]
            : [stem[0][1], stem[0][0]];
        const pairSpace = Pose2D.ZOOM_SPACINGS[this._zoomLevel];
        const primSpace = Pose2D.ZOOM_SPACINGS[this._zoomLevel];

        // Calculate new stem positions
        if (vecBP[1] < 0) {
            // new orientation is bottom-to-top
            for (const bp of stem) {
                // First work with smaller value, which is either smaller or
                // bigger than the center bp
                this._bases[bp[0]].setXY(
                    center[0] - pairSpace / 2,
                    center[1] + (bp[0] - firstbp[0] + 0.5 - stem.length / 2) * primSpace
                );
                this._bases[bp[0]].setDirty();
                this._bases[bp[1]].setXY(
                    center[0] + pairSpace / 2,
                    center[1] + (bp[0] - firstbp[0] + 0.5 - stem.length / 2) * primSpace
                );
                this._bases[bp[1]].setDirty();
            }
        } else if (vecBP[0] > 0) {
            // new orientation is right-to-left
            for (const bp of stem) {
                // First work with smaller value, which is either smaller or
                // bigger than the center bp
                this._bases[bp[0]].setXY(
                    center[0] - (bp[0] - firstbp[0] + 0.5 - stem.length / 2) * primSpace,
                    center[1] - pairSpace / 2
                );
                this._bases[bp[0]].setDirty();
                this._bases[bp[1]].setXY(
                    center[0] - (bp[0] - firstbp[0] + 0.5 - stem.length / 2) * primSpace,
                    center[1] + pairSpace / 2
                );
                this._bases[bp[1]].setDirty();
            }
        } else if (vecBP[1] > 0) {
            // new orientation is top-to-bottom
            for (const bp of stem) {
                // First work with smaller value, which is either smaller or
                // bigger than the center bp
                this._bases[bp[0]].setXY(
                    center[0] + pairSpace / 2,
                    center[1] - (bp[0] - firstbp[0] + 0.5 - stem.length / 2) * primSpace
                );
                this._bases[bp[0]].setDirty();
                this._bases[bp[1]].setXY(
                    center[0] - pairSpace / 2,
                    center[1] - (bp[0] - firstbp[0] + 0.5 - stem.length / 2) * primSpace
                );
                this._bases[bp[1]].setDirty();
            }
        } else if (vecBP[0] < 0) {
            // new orientation is left-to-right
            for (const bp of stem) {
                // First work with smaller value, which is either smaller or
                // bigger than the center bp
                this._bases[bp[0]].setXY(
                    center[0] + (bp[0] - firstbp[0] + 0.5 - stem.length / 2) * primSpace,
                    center[1] + pairSpace / 2
                );
                this._bases[bp[0]].setDirty();
                this._bases[bp[1]].setXY(
                    center[0] + (bp[0] - firstbp[0] + 0.5 - stem.length / 2) * primSpace,
                    center[1] - pairSpace / 2
                );
                this._bases[bp[1]].setDirty();
            }
        }
        for (const bp of stem) {
            for (let ii = 0; ii < localCustomLayout.length; ++ii) {
                localCustomLayout[bp[0]] = [
                    localCustomLayout[ii][0] as number + this._bases[bp[0]].x - this._bases[ii].x,
                    localCustomLayout[ii][1] as number + this._bases[bp[0]].y - this._bases[ii].y
                ];
                localCustomLayout[bp[1]] = [
                    localCustomLayout[ii][0] as number + this._bases[bp[1]].x - this._bases[ii].x,
                    localCustomLayout[ii][1] as number + this._bases[bp[1]].y - this._bases[ii].y
                ];
            }
        }

        // Use setter to force redraw
        this.customLayout = localCustomLayout;
        this._baseRope.enabled = true;
        this._baseRope.redraw(true);
        this._pseudoknotLines.redraw(true);
        this._customLayoutChanged = true;
    }

    /**
     * Flip the stem containing nucleotide idx. Save your results in the
     * customLayout. To achieve this: swap the position of each nt with its bp
     * partner. We do not store persistent stem orientations, because we would
     * then have to reset them elsewhere with every refold.
     *
     * @param idx
     */
    public flipStem(startIdx: number): void {
        // If this idx is not paired, it won't be in a stem; return.
        if (!this._targetPairs.isPaired(startIdx)) {
            return;
        }

        // 1. Get coords and set up a customLayout
        const rnaCoords: RNALayout = new RNALayout(
            Pose2D.ZOOM_SPACINGS[this._zoomLevel], Pose2D.ZOOM_SPACINGS[this._zoomLevel]
        );
        rnaCoords.setupTree(this._pairs, this._targetPairs);
        rnaCoords.drawTree(this._customLayout);
        const {xarray, yarray} = rnaCoords.getCoords(this._bases.length);

        const localCustomLayout: ([number, number] | [null, null])[] = [];
        for (let ii = 0; ii < this._bases.length; ++ii) {
            if (xarray[ii] === undefined || yarray[ii] === undefined) continue;
            localCustomLayout.push([
                (xarray[ii]), // * (Pose2D.ZOOM_SPACINGS[0] / Pose2D.ZOOM_SPACINGS[this._zoomLevel]),
                (yarray[ii])// * (Pose2D.ZOOM_SPACINGS[0] / Pose2D.ZOOM_SPACINGS[this._zoomLevel])
            ]);
        }

        // id stem
        const stem = this._targetPairs.stemWith(startIdx);

        // Calculate new stem positions
        for (const bp of stem) {
            // First work with smaller value, which is either smaller or
            // bigger than the center bp
            const tmp = [
                this._bases[bp[0]].x,
                this._bases[bp[0]].y
            ];
            this._bases[bp[0]].setXY(
                this._bases[bp[1]].x,
                this._bases[bp[1]].y
            );
            this._bases[bp[0]].setDirty();
            this._bases[bp[1]].setXY(
                tmp[0],
                tmp[1]
            );
            this._bases[bp[1]].setDirty();
        }

        for (const bp of stem) {
            for (let ii = 0; ii < localCustomLayout.length; ++ii) {
                localCustomLayout[bp[0]] = [
                    localCustomLayout[ii][0] as number + this._bases[bp[0]].x - this._bases[ii].x,
                    localCustomLayout[ii][1] as number + this._bases[bp[0]].y - this._bases[ii].y
                ];
                localCustomLayout[bp[1]] = [
                    localCustomLayout[ii][0] as number + this._bases[bp[1]].x - this._bases[ii].x,
                    localCustomLayout[ii][1] as number + this._bases[bp[1]].y - this._bases[ii].y
                ];
            }
        }
        // Use setter to ensure structure update.
        this.customLayout = localCustomLayout;
        this._baseRope.enabled = true;
        this._baseRope.redraw(true);
        this._pseudoknotLines.redraw(true);
        this._customLayoutChanged = true;
    }

    /**
     * Snap every base to a grid of size pairSpace/5. This is a nice even number
     * such that you get SOME gradations that are smaller than the space between
     * paired bases, but not so much that the whole thing feels sloppy. Also
     * permits nice tetraloop layouts. Only affects paired nucleotides.
     *
     * @param idx
     */
    public snapToGrid(): void {
        const pairSpace = Pose2D.ZOOM_SPACINGS[this._zoomLevel];
        const gridSpace = pairSpace;

        // 1. Get coords and set up a customLayout
        const rnaCoords: RNALayout = new RNALayout(
            pairSpace, pairSpace
        );
        rnaCoords.setupTree(this._pairs, this._targetPairs);
        rnaCoords.drawTree(this._customLayout);
        const {xarray, yarray} = rnaCoords.getCoords(this._bases.length);

        const localCustomLayout: ([number, number] | [null, null])[] = [];
        for (let ii = 0; ii < this._bases.length; ++ii) {
            if (xarray[ii] === undefined || yarray[ii] === undefined) continue;
            localCustomLayout.push([
                (xarray[ii]), // * (Pose2D.ZOOM_SPACINGS[0] / Pose2D.ZOOM_SPACINGS[this._zoomLevel]),
                (yarray[ii])// * (Pose2D.ZOOM_SPACINGS[0] / Pose2D.ZOOM_SPACINGS[this._zoomLevel])
            ]);
        }

        // Calculate new base positions
        for (let ii = 0; ii < this._bases.length; ++ii) {
            if (!this._pairs.isPaired(ii)) continue;
            // First work with smaller value, which is either smaller or
            // bigger than the center bp
            this._bases[ii].setXY(
                Math.round(this._bases[ii].x / gridSpace) * gridSpace,
                Math.round(this._bases[ii].y / gridSpace) * gridSpace
            );
            this._bases[ii].setDirty();
        }
        for (let ii = 0; ii < this._bases.length; ++ii) {
            if (!this._pairs.isPaired(ii)) continue;
            for (let jj = 0; jj < localCustomLayout.length; ++jj) {
                localCustomLayout[jj] = [
                    localCustomLayout[jj][0] as number + this._bases[jj].x - this._bases[ii].x,
                    localCustomLayout[jj][1] as number + this._bases[jj].y - this._bases[ii].y
                ];
            }
        }
        // Use setter to force redraw
        this.customLayout = localCustomLayout;
        this._baseRope.enabled = true;
        this._baseRope.redraw(true);
        this._pseudoknotLines.redraw(true);
        this._customLayoutChanged = true;
    }

    public onPoseMouseDown(e: InteractionEvent, closestIndex: number): void {
        const altDown: boolean = Flashbang.app.isAltKeyDown;
        const shiftDown: boolean = Flashbang.app.isShiftKeyDown;
        const ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;

        if (this._annotationManager.isMovingAnnotation) {
            return;
        }

        // ctrl + shift: drag base around; ctrl: base mark; shift: shift highlight
        if (closestIndex >= 0) {
            this._mouseDownAltKey = altDown;
            if (ctrlDown && shiftDown) {
                const dragger = new Dragger();
                this.addObject(dragger);

                if (this._currentArrangementTool === Layout.MOVE) {
                    dragger.dragged.connect((p) => {
                        this.onMouseMoved(p as Point, closestIndex);
                    });
                } else if (this._currentArrangementTool === Layout.ROTATE_STEM) {
                    this.rotateStem(closestIndex);
                } else if (this._currentArrangementTool === Layout.FLIP_STEM) {
                    this.flipStem(closestIndex);
                }
                dragger.dragComplete.connect(() => {
                    this.onMouseUp();
                });
                return;
            }
            if (
                (ctrlDown || this.currentColor === RNAPaint.BASE_MARK)
                && closestIndex < this.fullSequenceLength
                && !this._annotationManager.annotationModeActive.value
            ) {
                this.toggleBaseMark(closestIndex);
                return;
            }
            if (shiftDown && !this._annotationManager.annotationModeActive.value) {
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
            if (this._annotationManager.annotationModeActive.value) {
                this.hideAnnotationContextMenu();

                if (closestIndex < this.sequenceLength) {
                    const rangeIndex = this._annotationRanges.findIndex((range) => (
                        closestIndex >= range.start && closestIndex <= range.end)
                        || (closestIndex <= range.start && closestIndex >= range.end));

                    if (rangeIndex === -1) {
                        // Start annotation selection
                        this._selectingAnnotationRange = true;

                        this._annotationRanges.push({
                            start: closestIndex,
                            end: closestIndex
                        });
                    } else {
                        // Deselect clicked base

                        // Get range that was clicked
                        const range = {...this._annotationRanges[rangeIndex]};

                        // Remove existing range
                        this._annotationRanges.splice(rangeIndex, 1);

                        // Split range
                        if (range.start <= range.end && closestIndex > range.start) {
                            const leftRange = {
                                start: range.start,
                                end: closestIndex - 1
                            };
                            this._annotationRanges.push(leftRange);
                        } else if (range.start >= range.end && closestIndex < range.start) {
                            const leftRange = {
                                start: closestIndex + 1,
                                end: range.start
                            };
                            this._annotationRanges.push(leftRange);
                        } else {
                            // Do nothing
                        }

                        if (range.start <= range.end && closestIndex < range.end) {
                            const rightRange = {
                                start: closestIndex + 1,
                                end: range.end
                            };
                            this._annotationRanges.push(rightRange);
                        } else if (range.start >= range.end && closestIndex > range.end) {
                            const rightRange = {
                                start: range.end,
                                end: closestIndex - 1
                            };
                            this._annotationRanges.push(rightRange);
                        } else {
                            // Do nothing
                        }
                    }

                    let reg: Registration | null = null;
                    reg = this.pointerUp.connect(() => {
                        this._selectingAnnotationRange = false;
                        if (!this._annotationDialog && this._annotationRanges[this._annotationRanges.length - 1]) {
                            this.updateAnnotationContextMenu(
                                this._annotationRanges[this._annotationRanges.length - 1].end
                            );
                        }
                        this.mergeAnnotationRanges();
                        this.updateAnnotationRangeHighlight();
                        this._annotationDialog?.setRanges(this._annotationRanges);
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
        } else if (shiftDown && !this._annotationManager.annotationModeActive.value) {
            this._shiftStart = -1;
            this._shiftEnd = -1;
            this.updateShiftHighlight();
        }
    }

    public onVirtualPoseMouseDown(closestIndex: number): void {
        const altDown: boolean = Flashbang.app.isAltKeyDown;
        const ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;

        if (this._annotationManager.isMovingAnnotation) {
            return;
        }

        // ctrl + shift: drag base around; ctrl: base mark; shift: shift highlight
        if (closestIndex >= 0) {
            this._mouseDownAltKey = altDown;
            if (
                (ctrlDown || this.currentColor === RNAPaint.BASE_MARK)
                && closestIndex < this.fullSequenceLength
                && !this._annotationManager.annotationModeActive.value
            ) {
                this.toggleBaseMark(closestIndex);
                return;
            }
            this._lastShiftedCommand = -1;
            this._lastShiftedIndex = -1;
            const cmd: [string, PuzzleEditOp, number[]?] | null = this.parseCommand(this._currentColor, closestIndex);
            if (cmd == null) {
                this.onBaseMouseDown(closestIndex, ctrlDown);
                this.onMouseUp();
            } else {
                this._lastShiftedCommand = this._currentColor;
                this._lastShiftedIndex = closestIndex;

                this.callAddBaseCallback(cmd[0], cmd[1], closestIndex);
            }
        }
    }

    public setMarkerLayer(layer: string) {
        this._currentMarkerLayer = layer;
        for (const base of this._bases) {
            base.setMarkerLayer(layer);
        }
    }

    public toggleBaseMark(baseIndex: number): void {
        this.baseMarked.emit(baseIndex);

        if (!this.isTrackedLayer(baseIndex, PLAYER_MARKER_LAYER)) {
            this.addBaseMark(baseIndex, PLAYER_MARKER_LAYER);
        } else {
            this.removeBaseMark(baseIndex, PLAYER_MARKER_LAYER);
        }
    }

    public addBaseMark(baseIndex: number, layer: string, colors: number | number[] = 0x000000): void {
        if (typeof (colors) === 'number') colors = [colors];
        ROPWait.notifyBlackMark(baseIndex, true);
        this._bases[baseIndex].mark(colors, layer);
    }

    public removeBaseMark(baseIndex: number, layer: string): void {
        this._bases[baseIndex].unmarkLayer(layer);
        ROPWait.notifyBlackMark(baseIndex, false);
    }

    private isTrackedLayer(index: number, layer: string) {
        return this._bases[index].isLayerMarked(layer);
    }

    public onMouseMoved(point: Point, startIdx?: number): void {
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

        // First, handle the case where you have supplied startIdx, indicating
        // that you are dragging a base to a new location.
        if (startIdx !== undefined) {
            // if (this.customLayout === undefined) {
            const rnaCoords: RNALayout = new RNALayout(
                Pose2D.ZOOM_SPACINGS[this._zoomLevel], Pose2D.ZOOM_SPACINGS[this._zoomLevel]
            );
            rnaCoords.setupTree(this._pairs, this._targetPairs);
            rnaCoords.drawTree(this._customLayout);
            const {xarray, yarray} = rnaCoords.getCoords(this._bases.length);
            // The simplest thing to do is to use the x/y coords as the new customLayout.
            // This minimizes the calculations you have to do later.
            const localCustomLayout: ([number, number] | [null, null])[] = [];
            for (let ii = 0; ii < this._bases.length; ++ii) {
                if (xarray[ii] === undefined || yarray[ii] === undefined) continue;
                localCustomLayout.push([
                    (xarray[ii]), // * (Pose2D.ZOOM_SPACINGS[0] / Pose2D.ZOOM_SPACINGS[this._zoomLevel]),
                    (yarray[ii])// * (Pose2D.ZOOM_SPACINGS[0] / Pose2D.ZOOM_SPACINGS[this._zoomLevel])
                ]);
            }

            // Ooh, you should drag a helix as a unit.
            if (!this._targetPairs.isPaired(startIdx)) {
                // Update individual base coordinates.
                this._bases[startIdx].setXY(
                    (mouseX - this._offX),
                    (mouseY - this._offY)
                );

                // Update the customLayout in the same way.
                // Actually, after writing this, I no longer know why it works.
                for (let ii = 0; ii < localCustomLayout.length; ++ii) {
                    localCustomLayout[startIdx] = [
                        localCustomLayout[ii][0] as number + (mouseX - this._offX) - this._bases[ii].x,
                        localCustomLayout[ii][1] as number + (mouseY - this._offY) - this._bases[ii].y
                    ];
                }

                this._bases[startIdx].setDirty();
            } else {
                // Find each nt in helix and apply same offset.
                const stem = this._targetPairs.stemWith(startIdx);
                const origX = this._bases[startIdx].x;
                const origY = this._bases[startIdx].y;
                for (const bp of stem) {
                    for (const idx of bp) {
                        this._bases[idx].setXY(
                            mouseX + this._bases[idx].x - origX - this._offX,
                            mouseY + this._bases[idx].y - origY - this._offY
                        );
                        this._bases[idx].setDirty();

                        for (let ii = 0; ii < localCustomLayout.length; ++ii) {
                            localCustomLayout[idx] = [
                                localCustomLayout[ii][0] as number + this._bases[idx].x - this._bases[ii].x,
                                localCustomLayout[ii][1] as number + this._bases[idx].y - this._bases[ii].y
                            ];
                        }
                    }
                }
            }
            // Use setter to force redraw
            this.customLayout = localCustomLayout;
            this._baseRope.enabled = true;
            this._baseRope.redraw(true);
            this._pseudoknotLines.redraw(true);
            this._customLayoutChanged = true;
            return;
        }

        this._paintCursor.display.x = mouseX;
        this._paintCursor.display.y = mouseY;

        let closestDist = -1;
        let closestIndex = -1;
        const fullSeqLen = this.fullSequenceLength;
        for (let ii = 0; ii < fullSeqLen; ii++) {
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
            this.baseHovered.emit(closestIndex);

            this.onBaseMouseMove(closestIndex);

            if (!this._annotationManager.annotationModeActive.value) {
                this._paintCursor.display.visible = true;
                this._paintCursor.setShape(this._currentColor);
            }

            const strandName: string | null = this.getStrandName(closestIndex);
            if (strandName != null) {
                this._strandLabel.setText(strandName);
                if (mouseX + 16 + this._strandLabel.width > this._width) {
                    this._strandLabel.display.position.set(
                        mouseX - 16 - this._strandLabel.width,
                        mouseY + 16
                    );
                } else {
                    this._strandLabel.display.position.set(mouseX + 16, mouseY + 16);
                }
                this._strandLabel.display.visible = true;
            }
        } else {
            this._lastColoredIndex = -1;
            this.baseHovered.emit(-1);
        }

        if (!this._coloring) {
            this.updateScoreNodeGui();
        }
    }

    public on3DPickingMouseMoved(closestIndex: number): void {
        if (!this._coloring) {
            this.clearMouse();
        }
        const mouseX = this._bases[closestIndex].x + this._offX;
        const mouseY = this._bases[closestIndex].y + this._offY;

        this._paintCursor.display.x = mouseX;
        this._paintCursor.display.y = mouseY;

        if (closestIndex >= 0 && this._currentColor >= 0) {
            this.onBaseMouseMove(closestIndex);

            if (!this._annotationManager.annotationModeActive.value) {
                this._paintCursor.display.visible = true;
                this._paintCursor.setShape(this._currentColor);
            }

            const strandName: string | null = this.getStrandName(closestIndex);
            if (strandName != null) {
                this._strandLabel.setText(strandName);
                if (mouseX + 16 + this._strandLabel.width > this._width) {
                    this._strandLabel.display.position.set(
                        mouseX - 16 - this._strandLabel.width,
                        mouseY + 16
                    );
                } else {
                    this._strandLabel.display.position.set(mouseX + 16, mouseY + 16);
                }
                this._strandLabel.display.visible = true;
            }
        }

        if (!this._coloring) {
            this.updateScoreNodeGui();
        }
    }

    public onMouseUp(): void {
        this.doneColoring();
        this._mouseDownAltKey = false;
        ROPWait.notifyEndPaint();
    }

    public deleteBaseWithIndexPairs(index: number, pairs: SecStruct): [string, PuzzleEditOp, RNABase[]?] {
        return PoseUtil.deleteNopairWithIndex(index, pairs);
    }

    public clearLayerTracking(layer: string): void {
        for (const base of this._bases) {
            base.unmarkLayer(layer);
        }
    }

    public clearTrackingAllLayers(): void {
        for (const base of this._bases) {
            base.unmarkAllLayers();
        }
    }

    public get trackedIndices(): number[] {
        const result: number[] = [];
        this._bases.forEach((base, baseIndex) => {
            if (base.isCurrentLayerMarked()) {
                result.push(baseIndex);
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
        if (this._annotationContextMenu.display.visible) {
            this._annotationContextMenu.display.x -= (this.xOffset - offX);
            this._annotationContextMenu.display.y -= (this.yOffset - offY);
        } else if (this._annotationDialog) {
            this._annotationDialog.display.x -= (this.xOffset - offX);
            this._annotationDialog.display.y -= (this.yOffset - offY);
        }
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
        if (this._oligo != null && this._oligoMode === OligoMode.EXT5P) {
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
        const fullSeqLen = this.fullSequenceLength;
        for (let ii = 0; ii < fullSeqLen; ii++) {
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

    private updateLibraryHighlights() {
        this._libraryHighlightBox.clear();
        const elems = this._librarySelections.map((selected, idx) => (selected ? idx : null))
            .filter((idx): idx is number => idx != null)
            .map((idx) => [idx, idx])
            .flat();
        this._libraryHighlightBox.setHighlight(elems);
    }

    private toggleLibrarySelection(seqnum: number) {
        // Don't allow bases to be selected if they don't "actually exist" (eg, in the PTC
        // puzzles where we have a subset of a larger solution that isn't contiguous and we added
        // "padding" bases
        if (this.customNumbering && !this.customNumbering[seqnum]) return;

        // This might break on multistrand puzzles, but I'm also not sure what would be
        // required there - if for some reason we ever need that, some testing and thought is needed
        if (this._librarySelections.length === 0) {
            this._librarySelections = new Array(this._sequence.length);
        }

        this._librarySelections[seqnum] = !this._librarySelections[seqnum];
        this.updateLibraryHighlights();
    }

    public get librarySelections(): number[] | undefined {
        const sels = this._librarySelections.map((selected, idx) => (selected ? idx : null))
            .filter((idx): idx is number => idx != null);

        if (this.customNumbering) {
            return sels.map((idx) => this.customNumbering && this.customNumbering[idx])
                .filter((idx): idx is number => idx !== null);
        } else {
            return sels.map((idx) => idx + 1);
        }
    }

    public set librarySelections(selections: number[] | undefined) {
        this._librarySelections = new Array(this._sequence.length);
        if (!selections) return;

        for (const idx of selections) {
            const customNumbering = this.customNumbering;
            if (customNumbering) this._librarySelections[customNumbering.indexOf(idx)] = true;
            else this._librarySelections[idx - 1] = true;
        }
        this.updateLibraryHighlights();
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
        const fullSeqLen = this.fullSequenceLength;
        for (let jj = 0; jj < fullSeqLen; jj++) {
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
        let offset = 1;
        const len: number = this.sequenceLength;
        while (last + offset < len) {
            for (ii = first + offset; ii <= last + offset; ii++) {
                if (this._locks && this._locks[ii]) {
                    break;
                }
            }
            if (ii > last + offset) {
                break;
            }
            offset++;
        }
        // if not found, give up
        if (last + offset >= len) {
            return;
        }

        let mutated: RNABase[];
        let segment: RNABase[];
        if (offset === 1) {
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
                const xx: number = mutated[ii + offset];
                mutated[ii + offset] = mutated[ii];
                mutated[ii] = xx;
            }
        }

        this._mutatedSequence = this.fullSequence.slice(0);
        this.setMutated(new Sequence(mutated));
        this.doneColoring();
        this._customLayoutChanged = false;
        this._shiftHighlightBox.clear();
        this._shiftHighlightBox.setHighlight([first + offset, last + offset]);
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

        let mutated: RNABase[];
        let segment: RNABase[];
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
        this.setMutated(new Sequence(mutated));
        this.doneColoring();
        this._shiftHighlightBox.clear();
        this._shiftHighlightBox.setHighlight([first + ofs, last + ofs]);
    }

    public isDesignStructureHighlighted(index: number): boolean {
        return (this._designStruct[index] === true);
    }

    public getSequenceString(): string {
        return this._sequence.sequenceString();
    }

    public get satisfied(): boolean {
        const fullSeq = this.fullSequence;
        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs.pairingPartner(ii) > ii
                && !this.isPairSatisfied(fullSeq, ii, this._pairs.pairingPartner(ii))) {
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

    public setAnnotationRanges(ranges: AnnotationRange[]): void {
        this._annotationRanges = ranges;
        this.updateAnnotationRangeHighlight();
    }

    public clearAnnotationRanges(): void {
        this._annotationRanges = [];
        this._annotationManager.highlights.value = [];

        if (
            this._annotationManager
            && this._annotationManager.annotationModeActive.value
        ) {
            for (const base of this._bases) {
                base.container.alpha = AnnotationManager.ANNOTATION_UNHIGHLIGHTED_OPACITY;
            }
        }
    }

    private updateAnnotationContextMenu(baseIndex: number): void {
        const CONTEXT_MENU_OFFSET = 10;
        const basePosition = this.getBaseLoc(baseIndex);
        this._annotationContextMenu.display.x = basePosition.x + CONTEXT_MENU_OFFSET;
        this._annotationContextMenu.display.y = basePosition.y - CONTEXT_MENU_OFFSET;

        this._annotationContextMenu.display.visible = true;
    }

    public hideAnnotationContextMenu(): void {
        this._annotationContextMenu.display.visible = false;
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
            if (!this._pairs.isPaired(kk)) {
                return;
            }
        }

        const sparked: number[] = [];

        for (let ii: number = stackStart; ii <= stackEnd; ii++) {
            const aa: number = ii;
            const bb: number = this._pairs.pairingPartner(ii);

            if ((this._sequence.nt(aa) === RNABase.ADENINE
                && this._sequence.nt(bb) === RNABase.URACIL)
                || (this._sequence.nt(bb) === RNABase.ADENINE
                    && this._sequence.nt(aa) === RNABase.URACIL)) {
                playUA = true;
            } else if ((this._sequence.nt(aa) === RNABase.GUANINE
                && this._sequence.nt(bb) === RNABase.CYTOSINE)
                || (this._sequence.nt(bb) === RNABase.GUANINE
                    && this._sequence.nt(aa) === RNABase.CYTOSINE)) {
                playGC = true;
            } else if ((this._sequence.nt(aa) === RNABase.GUANINE
                && this._sequence.nt(bb) === RNABase.URACIL)
                || (this._sequence.nt(bb) === RNABase.GUANINE
                    && this._sequence.nt(aa) === RNABase.URACIL)) {
                playGU = true;
            }

            this._bases[ii].startSparking();
            this._bases[this._pairs.pairingPartner(ii)].startSparking();
            sparked.push(ii);
            sparked.push(this._pairs.pairingPartner(ii));
            const p: Point = this.getBaseLoc(ii);
            const p2: Point = this.getBaseLoc(this._pairs.pairingPartner(ii));

            xPos += p.x;
            yPos += p.y;

            xPos += p2.x;
            yPos += p2.y;
        }

        this.basesSparked.emit(sparked);

        const stackLen: number = (stackEnd - stackStart) + 1;

        xPos /= stackLen * 2;
        yPos /= stackLen * 2;

        const praiseText = stackLen > 1 ? 'Great Pairings!' : 'Great Pairing!';
        const praiseObj = new SceneObject(Fonts.std(praiseText, 20).bold().color(0xffffff).build());
        praiseObj.display.position.set(xPos - DisplayUtil.width(praiseObj.display) * 0.5, yPos);
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
            if (this._pairs.isPaired(nuc)) {
                addition.push(this._pairs.pairingPartner(nuc));
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
        const fullSeqLen = this.fullSequenceLength;

        const sparked: number[] = [];

        for (let ii: number = seqStart; ii <= seqEnd; ii++) {
            if (ii >= 0 && ii < fullSeqLen) {
                this._bases[ii].startSparking();
                sparked.push(ii);
            }
        }

        this.basesSparked.emit(sparked);
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
                    this._sequence.nt(ii)
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
                        this._sequence.nt(ii)
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

    public set startPickCallback(cb: PosePickCallback) {
        this._startPickCallback = cb;
    }

    public simulateMousedownCallback(closestIndex:number): void {
        if (this._startPickCallback != null && closestIndex >= 0) {
            this._startPickCallback(closestIndex);
        }
        // deselect all annotations
        this._annotationManager.deselectSelected();
    }

    public callStartMousedownCallback(e: InteractionEvent): void {
        e.data.getLocalPosition(this.display, Pose2D.P);
        const mouseX: number = Pose2D.P.x;
        const mouseY: number = Pose2D.P.y;

        let closestDist = -1;
        let closestIndex = -1;

        if (this._startMousedownCallback != null) {
            const fullSeqLen = this.fullSequenceLength;
            for (let ii = 0; ii < fullSeqLen; ii++) {
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
        return this._pairs.getSatisfiedPairs(this.fullSequence.slice(0));
    }

    public set molecularBindingBonus(bonus: number) {
        this._molecularBindingBonus = bonus;
    }

    public set molecularStructure(pairs: SecStruct | null) {
        if (pairs != null) {
            this._moleculeTargetPairs = pairs.slice(0);
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
            ? this._moleculeTargetPairs.slice(0)
            : null;
        if (!targetPairs) {
            throw new Error("Can't find molecular target structure");
        }

        const bindingBases: number[] = [];
        const bindingPairs: number[] = [];
        for (let ii = 0; ii < bindingSite.length; ii++) {
            if (bindingSite[ii]) {
                bindingBases.push(ii);
                bindingPairs.push(targetPairs.pairingPartner(ii));
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
            if (this._molecularBindingPairs[ii] !== this._pairs.pairingPartner(ii)) {
                boundRender = false;
            }

            if (this._molecularBindingPairs[ii] !== satisfiedPairs.pairingPartner(ii)) {
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
            this._bases[k].setType(seq.nt(k));
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
        const baseMarkerData = this._bases.map((base, baseIdx) => ({
            markerData: base.markerData,
            baseIdx
        }));
        this.clearTrackingAllLayers();
        for (const baseInfo of baseMarkerData) {
            const newIdx = idxMap[baseInfo.baseIdx];
            baseInfo.markerData.forEach((colors, layer) => {
                this.addBaseMark(newIdx, layer, colors);
            });
        }

        // blue highlights ("magic glue")
        const newDesign: boolean[] = [];
        const fullSeqLen = this.fullSequenceLength;
        for (let ii = 0; ii < fullSeqLen; ii++) {
            newDesign[idxMap[ii]] = this._designStruct[ii];
        }
        this._designStruct = newDesign;
        this.updateDesignHighlight();
    }

    public setOligo(
        oligo: number[] | undefined,
        mode: number | string | null = OligoMode.DIMER,
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
            this._bases[k].setType(seq.nt(k));
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
        return EPars.constructFullSequence(
            this._sequence,
            this._oligo ? this._oligo : undefined,
            this._oligos,
            this._oligosOrder,
            this._oligoMode
        );
    }

    public get fullSequenceLength(): number {
        let len: number = this._sequence.length;
        if (this._oligo == null && this._oligos == null) {
            return len;
        }
        if (this._oligos == null && this._oligo !== null) {
            len += this._oligo.length;
            if (this._oligoMode === OligoMode.DIMER) len++;
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
            let seq: RNABase[] = this._sequence.baseArray.slice();
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

    public getBoundSequence(): RNABase[] {
        if (this._oligos === undefined || this._oligosOrder === undefined) {
            return this._sequence.baseArray;
        }
        let seq: RNABase[] = this._sequence.baseArray.slice();
        for (let ii = 0; ii < this._oligosPaired; ii++) {
            seq.push(RNABase.CUT);
            seq = seq.concat(this._oligos[this._oligosOrder[ii]].sequence);
        }
        return seq;
    }

    public isPairSatisfied(fullSequence: Sequence, a: number, b: number): boolean {
        // AMW TODO why swap? do we assume asymmetrical pairs
        if (b < a) {
            const temp: number = a;
            a = b;
            b = temp;
        }

        if (this._pairs.pairingPartner(a) !== b) {
            return false;
        }

        return (EPars.pairType(fullSequence.nt(a), fullSequence.nt(b)) !== 0);
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
        }

        const n: number = this.fullSequenceLength;
        for (let ii = 0; ii < n; ii++) {
            if (ii < this._sequence.length) {
                this._bases[ii].setType(this._sequence.nt(ii));
            }
            this._bases[ii].baseIndex = ii;
        }

        this.checkPairs();
        this.updateMolecule();
        this.generateScoreNodes();
    }

    public get sequence(): Sequence {
        return this._sequence.slice(0);
    }

    public getSequenceAt(seq: number): RNABase {
        return this._sequence.nt(seq);
    }

    public set secstruct(pairs: SecStruct) {
        const seq: Sequence = this.fullSequence;
        if (pairs.length !== seq.length) {
            log.debug(pairs.length, seq.length);
            throw new Error("Pair length doesn't match sequence length");
        }

        if (EPars.arePairsSame(pairs, this._pairs)) {
            return;
        }

        this._pairs = pairs.slice(0);

        // AMW: We don't have to worry about this case where... pairs are
        // asymmetric somehow?
        // for (let ii = 0; ii < this._pairs.length; ii++) {
        //     if (this._pairs.pairingPartner(ii) > ii) {
        //         this._pairs.pairingPartner(this._pairs.pairingPartner(ii) = ii;
        //     }
        // }

        // Recompute sequence layout
        this.computeLayout(false);
        this.checkPairs();
        this.updateMolecule();
        this.generateScoreNodes();
    }

    public get secstruct(): SecStruct {
        return this._pairs.slice(0);
    }

    public set targetPairs(setting: SecStruct) {
        this._targetPairs = setting.slice(0);
        // for (let ii = 0; ii < this._targetPairs.length; ii++) {
        //     // AMW TODO: symmetrizing the secstruct directly; seems not ideal.
        //     if (this._targetPairs.pairingPartner(ii) > ii) {
        //         this._targetPairs.pairingPartner(this._targetPairs.pairingPartner(ii)) = ii;
        //     }
        // }
    }

    public set customLayout(setting: Array<[number, number] | [null, null]> | undefined) {
        // Compare first
        if (setting === undefined) {
            if (this.customLayout !== undefined) {
                this._customLayout = setting;
                this.computeLayout(false);
            }
        } else if (this.customLayout === undefined) {
            this._customLayout = setting;
            this.computeLayout(false);
        } else {
            let diff = false;
            for (let ii = 0; ii < setting.length; ++ii) {
                if (setting[ii] !== this._customLayout?.[ii] ?? null) {
                    diff = true;
                    break;
                }
            }
            if (!diff) return;
            this._customLayout = setting;
            this.computeLayout(false);
        }
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

        const {xarray, yarray} = rnaDrawer.getCoords(this._bases.length);
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

    private makeHighlightState() {
        if (this._allNewHighlights.length === 0) {
            return undefined;
        }

        const hlState = new RNAHighlightState();
        hlState.nuc = this._allNewHighlights
            .map((h) => h.nuc)
            .filter((n): n is number[] => n !== null)
            .flat();
        hlState.isOn = true;

        return hlState;
    }

    private setAllDrawParams(fullSeq: Sequence, currentTime: number, hlState?: RNAHighlightState): void {
        for (let ii = 0; ii < fullSeq.length; ii++) {
            // skip the oligo separator
            if (fullSeq.nt(ii) === RNABase.CUT) {
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
    }

    /* override */
    public update(_dt: number): void {
        if (!this.display.worldVisible) {
            // update is expensive, so don't bother doing it if we're not visible
            return;
        }
        Assert.assertIsDefined(this.mode);
        const currentTime: number = this.mode.time;

        const fullSeq: Sequence = this.fullSequence;
        let center: Point;

        // Hide bases that aren't part of our current sequence
        if (!this._showNucleotideRange) {
            for (let ii = 0; ii < this._bases.length; ++ii) {
                this._bases[ii].display.visible = this.isNucleotidePartOfSequence(fullSeq, ii);
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

                this.redrawAnnotations();
            } else {
                // Don't show annotations while animating. If we recomputed it each frame it would
                // be laggy, if we don't the annotation locations may be in visually bizarre locations
                this.clearAnnotationCanvas();
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
                if (!this._pairs.isPaired(ii) && !this._simpleGraphicsMods && Math.random() > 0.7) {
                    this._bases[ii].animate();
                }
            }
        }

        // Update score node
        this.updateScoreNodeVisualization(this._offX !== this._prevOffsetX || this._offY !== this._prevOffsetY);

        // / Bitblt rendering
        const needRedraw = this._bases.some(
            (base) => base.needRedraw(this._simpleGraphicsMods)
        );

        if (needRedraw || this._redraw) {
            // Create highlight state to pass to bases, then set up draw params.
            this.setAllDrawParams(fullSeq, currentTime, this.makeHighlightState());
        }

        // AMW TODO: this means that PuzzleEditMode can get a baserope showing
        // if the custom layout tools are used.
        this._baseRope.enabled = this._showBaseRope
            || this._customLayout != null
            || Eterna.settings.usePuzzlerLayout.value;
        this._pseudoknotLines.enabled = this._pseudoknotPairs
            && this._pseudoknotPairs.nonempty();

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

        if (fullSeq.findCut() >= 0) {
            if (this._oligoBases == null) {
                this._oligoBases = new Array(fullSeq.length);
            }

            const boundLen: number = this.getBoundSequence().length;
            for (let ii = fullSeq.findCut() + 1; ii < fullSeq.length; ii++) {
                if (this._oligoBases[ii] === undefined) {
                    this._oligoBases[ii] = new BaseGlow();
                }
                const baseglow = this._oligoBases[ii];
                if ((this._oligoPaired || (this._oligosPaired > 0 && ii < boundLen)) && this._pairs.isPaired(ii)) {
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

                    ray.display.position.copyFrom(this.getBaseLoc(ii));
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

                        ray.display.position.copyFrom(this.getBaseLoc(ii));
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

    public lateUpdate(_dt: number): void {
        // For some reason, if we attempt to recompute position rotations before things are
        // redrawn to the screen, it incorrectly determines where the bases actually are.
        // Maybe DisplayObject#getLocalBounds only updates after a draw? Dunno.
        if (this._redrawAnnotations === FrameUpdateState.NEXT_FRAME) {
            this._redrawAnnotations = FrameUpdateState.THIS_FRAME;
        } else if (this._redrawAnnotations === FrameUpdateState.THIS_FRAME) {
            // If we just went from 1 annotation to 0, we still need to make sure we clear it.
            this.clearAnnotationCanvas();
            if (this._annotationManager.allAnnotations.length > 0) {
                if (!this._redrawAnnotationUseCache || this.annotationSpaceAvailability.size === 0) {
                    this.updateAnnotationSpaceAvailability();
                }
                this._annotationManager.drawAnnotations({
                    pose: this,
                    reset: true,
                    ignoreCustom: false
                });
            }
            this._redrawAnnotations = FrameUpdateState.IDLE;
        }
    }

    public setAnimationProgress(progress: number) {
        if (this._baseToX && this._baseToY && this._baseFromX && this._baseFromY) {
            const fullSeq = this.fullSequence;
            for (let ii = 0; ii < fullSeq.length; ii++) {
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
        }
    }

    public numPairs(satisfied: boolean): number {
        // AMW TODO: this is very similar to SecStruct::numPairs, but with satisfied.
        let n = 0;
        const fullSeq = this.fullSequence;
        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs.pairingPartner(ii) > ii
                && (!satisfied || this.isPairSatisfied(fullSeq, ii, this._pairs.pairingPartner(ii)))) {
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

    public set scoreFolder(folder: Folder | null) {
        if (this._scoreFolder !== folder) {
            this._scoreFolder = folder;
            // this.showTotalEnergy = this._showTotalEnergy;
            this.generateScoreNodes();
        }
    }

    public get scoreFolder(): Folder | null {
        return this._scoreFolder;
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
        let sequence: RNABase[] = this.sequence.baseArray;
        let locks: boolean[] | undefined = this.puzzleLocks;
        let bindingSite: boolean[] | null = this.molecularBindingSite;
        const sequenceBackup: RNABase[] = this.sequence.baseArray;
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
            pindex = this.secstruct.pairingPartner(index);
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
            pindex = this.secstruct.pairingPartner(index);
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

        this.sequence = new Sequence(sequence);
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

    public setBaseColor(seqpos: number, inColor: RNABase): void {
        this._mutatedSequence = this._sequence.slice(0);
        this._mutatedSequence.setNt(seqpos, inColor);
        this._bases[seqpos].setType(inColor, true);

        this._lastColoredIndex = seqpos;
        this._bases[seqpos].animate();
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

        const fullSeq: Sequence = this.fullSequence;
        for (let i = 0; i < this._bases.length; ++i) {
            this._bases[i].container.visible = i >= (start - 1)
                && i < end
                && this.isNucleotidePartOfSequence(fullSeq, i);
        }
    }

    public fastLayout(): void {
        this.computeLayout(true);
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

        let exceptionIndices: number[] | undefined;
        if (fullSeq.findCut() >= 0) {
            exceptionIndices = [];
            exceptionIndices.push(0);
            let oligoIndex = -1;
            // array of positions of connectors "&"
            while (fullSeq.findCut(oligoIndex + 1) >= 0) {
                oligoIndex = fullSeq.findCut(oligoIndex + 1);
                exceptionIndices.push(oligoIndex);
            }
        }
        const rnaDrawer: RNALayout = new RNALayout(
            Pose2D.ZOOM_SPACINGS[this._zoomLevel],
            Pose2D.ZOOM_SPACINGS[this._zoomLevel] * this._poseField.explosionFactor,
            exceptionIndices
        );

        rnaDrawer.setupTree(this._pairs, this._targetPairs);
        rnaDrawer.drawTree(this._customLayout);
        const rnaCoords = rnaDrawer.getCoords(n);
        let {xarray, yarray} = rnaCoords;
        const {xbounds, ybounds} = rnaCoords;
        this._pseudoknotPairs = rnaDrawer.pseudoknotPairs;

        this._baseRotationDirectionSign = new Array(n);
        rnaDrawer.getRotationDirectionSign(this._baseRotationDirectionSign);

        if (this._desiredAngle === 90) {
            const tmp = xarray;
            xarray = yarray;
            yarray = tmp;
        }

        const [xmin, xmax] = xbounds;
        const [ymin, ymax] = ybounds;
        xMid = (xmax + xmin) / 2.0;
        yMid = (ymax + ymin) / 2.0;

        this._baseFromX = this._bases.map((b) => b.x);
        this._baseFromY = this._bases.map((b) => b.y);
        this._baseToX = xarray.map((x) => x - xMid);
        this._baseToY = yarray.map((y) => y - yMid);

        this._foldStartTime = -1;
        if (fast) {
            this._foldDuration = 0.45;
        } else {
            this._foldDuration = 0.7;
        }
    }

    private onMouseOut(): void {
        this.clearMouse();
        this.updateScoreNodeGui();
    }

    private deleteBaseWithIndex(index: number): [string, PuzzleEditOp, RNABase[]?] {
        if (!this._pairs.isPaired(index) || this.isLocked(this._pairs.pairingPartner(index))) {
            return PoseUtil.deleteNopairWithIndex(index, this._pairs);
        } else {
            return PoseUtil.deletePairWithIndex(index, this._pairs);
        }
    }

    private onBaseMouseDown(seqnum: number, togglelock: boolean): void {
        this._lastColoredIndex = seqnum;

        if (togglelock || !this.isEditable(seqnum)) return;

        this._coloring = true;
        this._mutatedSequence = this.fullSequence.slice(0);

        if (this._currentColor === RNAPaint.LOCK) {
            if (!this._locks) {
                this._locks = [];
                for (let ii = 0; ii < this._sequence.length; ii++) {
                    this._locks.push(false);
                }
            }
            this._locks[seqnum] = !this._locks[seqnum];
            this._bases[seqnum].setDirty();
            this._lockUpdated = true;
        } else if (this._currentColor === RNAPaint.BINDING_SITE) {
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
        } else if (this._mouseDownAltKey || this._currentColor === RNAPaint.MAGIC_GLUE) {
            if (this.toggleDesignStruct(seqnum)) {
                this._designStructUpdated = true;
            }
        } else if (!this.isLocked(seqnum)) {
            if (
                this._currentColor === RNABase.ADENINE || this._currentColor === RNABase.URACIL
                || this._currentColor === RNABase.GUANINE || this._currentColor === RNABase.CYTOSINE
            ) {
                this._mutatedSequence.setNt(seqnum, this._currentColor);
                ROPWait.notifyPaint(seqnum, this._bases[seqnum].type, this._currentColor);
                this._bases[seqnum].setType(this._currentColor, true);
            } else if (this._currentColor === RNAPaint.PAIR && this._pairs.isPaired(seqnum)) {
                const pi = this._pairs.pairingPartner(seqnum);
                if (this.isLocked(pi)) {
                    return;
                }

                const clickBase: RNABase = this._mutatedSequence.nt(seqnum);

                this._mutatedSequence.setNt(seqnum, this._mutatedSequence.nt(pi));
                this._mutatedSequence.setNt(pi, clickBase);

                this._bases[seqnum].setType(this._mutatedSequence.nt(seqnum), true);
                this._bases[pi].setType(this._mutatedSequence.nt(pi), true);
            } else if (this._currentColor === RNAPaint.AU_PAIR && this._pairs.isPaired(seqnum)) {
                const pi = this._pairs.pairingPartner(seqnum);
                if (this.isLocked(pi)) {
                    return;
                }

                this._mutatedSequence.setNt(seqnum, RNABase.ADENINE);
                this._mutatedSequence.setNt(pi, RNABase.URACIL);

                this._bases[seqnum].setType(this._mutatedSequence.nt(seqnum), true);
                this._bases[pi].setType(this._mutatedSequence.nt(pi), true);
            } else if (this._currentColor === RNAPaint.GC_PAIR && this._pairs.isPaired(seqnum)) {
                const pi = this._pairs.pairingPartner(seqnum);
                if (this.isLocked(pi)) {
                    return;
                }

                this._mutatedSequence.setNt(seqnum, RNABase.GUANINE);
                this._mutatedSequence.setNt(pi, RNABase.CYTOSINE);

                this._bases[seqnum].setType(this._mutatedSequence.nt(seqnum), true);
                this._bases[pi].setType(this._mutatedSequence.nt(pi), true);
            } else if (this._currentColor === RNAPaint.GU_PAIR && this._pairs.isPaired(seqnum)) {
                const pi = this._pairs.pairingPartner(seqnum);
                if (this.isLocked(pi)) {
                    return;
                }

                this._mutatedSequence.setNt(seqnum, RNABase.URACIL);
                this._mutatedSequence.setNt(pi, RNABase.GUANINE);

                this._bases[seqnum].setType(this._mutatedSequence.nt(seqnum), true);
                this._bases[pi].setType(this._mutatedSequence.nt(pi), true);
            } else if (this._dynPaintColors.indexOf(this._currentColor) >= 0) {
                const index: number = this._dynPaintColors.indexOf(this._currentColor);
                this._dynPaintTools[index].onPaint(this, seqnum);
            } else if (this._currentColor === RNAPaint.LIBRARY_SELECT && seqnum < this.sequenceLength) {
                this.toggleLibrarySelection(seqnum);
                this._librarySelectionsChanged = true;
            }
        }
    }

    private onBaseMouseMove(seqnum: number): void {
        if (!this._coloring && this._shiftStart >= 0 && seqnum < this.sequenceLength) {
            this._shiftEnd = seqnum;
            this.updateShiftHighlight();
        } else if (
            !this._coloring
            && this._annotationManager.annotationModeActive.value
            && this._annotationRanges.length > 0
            && this._selectingAnnotationRange
            && seqnum < this.sequenceLength
        ) {
            this._annotationRanges[this._annotationRanges.length - 1].end = seqnum;
            this.updateAnnotationRangeHighlight();
        }

        if (!this._coloring || (seqnum === this._lastColoredIndex)) {
            return;
        }

        if (this._currentColor === RNAPaint.LOCK) {
            if (!this._locks) {
                this._locks = [];
                for (let ii = 0; ii < this._sequence.length; ii++) {
                    this._locks.push(false);
                }
            }
            this._locks[seqnum] = !this._locks[seqnum];
            this._bases[seqnum].setDirty();
            this._lockUpdated = true;
        } else if (this._mouseDownAltKey || this._currentColor === RNAPaint.MAGIC_GLUE) {
            if (this.toggleDesignStruct(seqnum)) {
                this._designStructUpdated = true;
            }
        } else if (!this.isLocked(seqnum)) {
            if (this._mutatedSequence === null) {
                throw new Error('The clicked base is not locked, but the mutated sequence is null: critical error!');
            }
            if (
                this._currentColor === RNABase.ADENINE || this._currentColor === RNABase.URACIL
                || this._currentColor === RNABase.GUANINE || this._currentColor === RNABase.CYTOSINE
            ) {
                this._mutatedSequence.setNt(seqnum, this._currentColor);
                ROPWait.notifyPaint(seqnum, this._bases[seqnum].type, this._currentColor);
                this._bases[seqnum].setType(this._currentColor, true);
            } else if (this._currentColor === RNAPaint.PAIR) {
                if (this._pairs.isPaired(seqnum)) {
                    const pi = this._pairs.pairingPartner(seqnum);

                    if (this.isLocked(pi)) {
                        return;
                    }

                    const clickBase: number = this._mutatedSequence.nt(seqnum);

                    this._mutatedSequence.setNt(seqnum, this._mutatedSequence.nt(pi));
                    this._mutatedSequence.setNt(pi, clickBase);

                    this._bases[seqnum].setType(this._mutatedSequence.nt(seqnum), true);
                    this._bases[pi].setType(this._mutatedSequence.nt(pi), true);
                }
            } else if (this._currentColor === RNAPaint.AU_PAIR) {
                if (this._pairs.isPaired(seqnum)) {
                    const pi = this._pairs.pairingPartner(seqnum);

                    if (this.isLocked(pi)) {
                        return;
                    }

                    this._mutatedSequence.setNt(seqnum, RNABase.ADENINE);
                    this._mutatedSequence.setNt(pi, RNABase.URACIL);

                    this._bases[seqnum].setType(this._mutatedSequence.nt(seqnum), true);
                    this._bases[pi].setType(this._mutatedSequence.nt(pi), true);
                }
            } else if (this._currentColor === RNAPaint.GC_PAIR) {
                if (this._pairs.isPaired(seqnum)) {
                    const pi = this._pairs.pairingPartner(seqnum);

                    if (this.isLocked(pi)) {
                        return;
                    }

                    this._mutatedSequence.setNt(seqnum, RNABase.GUANINE);
                    this._mutatedSequence.setNt(pi, RNABase.CYTOSINE);

                    this._bases[seqnum].setType(this._mutatedSequence.nt(seqnum), true);
                    this._bases[pi].setType(this._mutatedSequence.nt(pi), true);
                }
            } else if (this._currentColor === RNAPaint.GU_PAIR) {
                if (this._pairs.isPaired(seqnum)) {
                    const pi = this._pairs.pairingPartner(seqnum);

                    if (this.isLocked(pi)) {
                        return;
                    }

                    this._mutatedSequence.setNt(seqnum, RNABase.URACIL);
                    this._mutatedSequence.setNt(pi, RNABase.GUANINE);

                    this._bases[seqnum].setType(this._mutatedSequence.nt(seqnum), true);
                    this._bases[pi].setType(this._mutatedSequence.nt(pi), true);
                }
            } else if (this._dynPaintColors.indexOf(this._currentColor) >= 0) {
                const index: number = this._dynPaintColors.indexOf(this._currentColor);
                this._dynPaintTools[index].onPainting(this, seqnum);
            } else if (this._currentColor === RNAPaint.LIBRARY_SELECT && seqnum <= this.sequenceLength) {
                this.toggleLibrarySelection(seqnum);
                this._librarySelectionsChanged = true;
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

    /**
     * Used to temporarily set annotation range highlights when a player mouses over an annotation
     *
     * @param ranges ranges of bases to highlight
     */
    private setAnnotationRangeHighlight(ranges: AnnotationRange[]): void {
        this._annotationHighlightBox.clear();
        for (const range of ranges) {
            this._annotationHighlightBox.setHighlight([range.start, range.end]);
        }
    }

    /**
     * Used to update annotation range highlights when creating an annotation
     */
    private updateAnnotationRangeHighlight(): void {
        this._annotationHighlightBox.clear();

        if (this._annotationManager.annotationModeActive.value) {
            for (let i = 0; i < this._bases.length; i++) {
                this._bases[i].container.alpha = AnnotationManager.ANNOTATION_UNHIGHLIGHTED_OPACITY;
            }
        }

        for (const range of this._annotationRanges) {
            const highlightExtents: number[] = range.end < range.start
                ? [range.end, range.start]
                : [range.start, range.end];
            this._annotationHighlightBox.setHighlight(highlightExtents);

            for (let i = highlightExtents[0]; i <= highlightExtents[1]; i++) {
                this._bases[i].container.alpha = 1;
            }
        }
    }

    private mergeAnnotationRanges(): void {
        if (this._annotationRanges.length > 1) {
            // Sort ranges in increasing order
            let sortedRanges = [...this._annotationRanges];
            sortedRanges = sortedRanges.map((range: AnnotationRange) => ({
                start: Math.min(range.start, range.end),
                end: Math.max(range.start, range.end)
            }));
            sortedRanges.sort((a: AnnotationRange, b: AnnotationRange) => a.start - b.start);

            const updatedRanges: AnnotationRange[] = [];
            let focusedRangeIndex = 0;
            let comparatorRangeIndexDiff = 1;

            while (focusedRangeIndex + comparatorRangeIndexDiff < sortedRanges.length) {
                if (sortedRanges[focusedRangeIndex + comparatorRangeIndexDiff].start
                    - sortedRanges[focusedRangeIndex + comparatorRangeIndexDiff - 1].end <= 1
                ) {
                    if (focusedRangeIndex + comparatorRangeIndexDiff + 1 === sortedRanges.length) {
                        updatedRanges.push({
                            start: sortedRanges[focusedRangeIndex].start,
                            end: sortedRanges[focusedRangeIndex + comparatorRangeIndexDiff].end
                        });
                    }

                    comparatorRangeIndexDiff += 1;
                } else {
                    updatedRanges.push({
                        start: sortedRanges[focusedRangeIndex].start,
                        end: sortedRanges[focusedRangeIndex + comparatorRangeIndexDiff - 1].end
                    });

                    if (focusedRangeIndex + comparatorRangeIndexDiff + 1 === sortedRanges.length) {
                        updatedRanges.push(sortedRanges[focusedRangeIndex + comparatorRangeIndexDiff]);
                    }

                    focusedRangeIndex += comparatorRangeIndexDiff;
                    comparatorRangeIndexDiff = 1;
                }
            }
            this._annotationRanges = updatedRanges;
        }
    }

    public get annotationSpaceAvailability(): Map<string, boolean> {
        return this._annotationSpaceAvailability;
    }

    private setBasesOpacity(opacity: number): void {
        for (const base of this._bases) {
            base.container.alpha = opacity;
        }
    }

    private setAnnotationCanvasOpacity(opacity: number): void {
        this._annotationCanvas.alpha = opacity;
    }

    private redrawAnnotations(useCachedSpaceAvailability = false) {
        this._redrawAnnotations = FrameUpdateState.NEXT_FRAME;
        this._redrawAnnotationUseCache = useCachedSpaceAvailability;
    }

    public addAnnotationView(view: AnnotationView) {
        if (!view.isLiveObject) {
            this.addObject(view, this._annotationCanvas);
        }

        this._annotationViews.push(view);
    }

    public removeAnnotationView(view: AnnotationView) {
        this._annotationViews = this._annotationViews.filter((v: AnnotationView) => v !== view);
        this.removeObject(view);
    }

    public getAnnotationViewDims(id: string | number, positionIndex: number) {
        const desiredView = this._annotationViews.find(
            (view) => view.annotationID === id && view.positionIndex === positionIndex
        );

        if (desiredView) {
            return {
                width: desiredView.width,
                height: desiredView.height
            };
        }

        return null;
    }

    public clearAnnotationCanvas(): void {
        for (const view of this._annotationViews) {
            this.removeObject(view);
        }
        this._annotationViews = [];
    }

    private updateAnnotationSpaceAvailability(): void {
        // These are SUPER expensive getters which basically have to touch all the objects in
        // the container. There's no reason the width and height change while running this function,
        // so let's only compute them once.
        const baseLayerHeight = Math.ceil(this._baseLayer.height);
        const baseLayerWidth = Math.ceil(this._baseLayer.width);

        this._annotationSpaceAvailability = new Map();

        const baseLayerBounds = DisplayUtil.getBoundsRelative(this._baseLayer, this.container);

        // Populate with bases
        for (let i = 0; i < this._bases.length; i++) {
            const base = this._bases[i];
            const baseBounds = DisplayUtil.getBoundsRelative(base.display, this._baseLayer);
            const baseRowStart = Math.max(0, Math.floor(baseBounds.y - baseLayerBounds.y));
            const baseRowEnd = Math.min(
                baseLayerHeight,
                Math.ceil(baseBounds.y - baseLayerBounds.y + baseBounds.height)
            );
            const baseColStart = Math.max(0, Math.floor(baseBounds.x - baseLayerBounds.x));
            const baseColEnd = Math.min(
                baseLayerWidth,
                Math.ceil(baseBounds.x - baseLayerBounds.x + baseBounds.width)
            );

            for (let row = baseRowStart; row < baseRowEnd; row++) {
                for (let col = baseColStart; col < baseColEnd; col++) {
                    this._annotationSpaceAvailability.set(`${row}-${col}`, true);
                }
            }
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

    private checkPairs(): void {
        const fullSeq = this.fullSequence;

        for (let ii = 0; ii < this._pairs.length; ii++) {
            const pi = this._pairs.pairingPartner(ii);
            if (this._pairs.isPaired(ii) && this.isPairSatisfied(fullSeq, ii, pi)) {
                const pairStr: number = PoseUtil.getPairStrength(
                    fullSeq.nt(ii), fullSeq.nt(pi)
                );

                if (this.isAnimating) {
                    Assert.assertIsDefined(this._baseToX);
                    Assert.assertIsDefined(this._baseToY);
                    this._bases[ii].setPairing(true,
                        this._baseToX[pi] - this._baseToX[ii],
                        this._baseToY[pi] - this._baseToY[ii],
                        0.5, pairStr);
                } else {
                    this._bases[ii].setPairing(true,
                        this._bases[pi].x - this._bases[ii].x,
                        this._bases[pi].y - this._bases[ii].y,
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

        if (this.isAnimating) {
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

        if (this._scoreTexts == null) return;

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

            this._scoreTexts[ii].position.set(xAvg, yAvg);
            this._scoreTexts[ii].visible = (this._zoomLevel < 4);
            this.updateEnergyHighlight(this._scoreTexts[ii], ii, this._scoreTexts[ii].visible);
        }
    }

    public set getEnergyDelta(cb: () => number) {
        this._getEnergyDelta = cb;
    }

    private static readonly MOUSE_LOC: Point = new Point();
    private updateScoreNodeGui(): void {
        this._scoreNodeIndex = -1;

        if (this._pseudoknotted) {
            // See https://github.com/eternagame/EternaJS/issues/654
            this._poseField.disableEnergyGui('Unavailable');
            return;
        }

        if (this._scoreNodes != null) {
            let totalScore = 0;
            let nodeFound = false;
            let nodeLabel = '';
            let nodeScore = '';

            Assert.assertIsDefined(Flashbang.globalMouse);
            if (this._poseField.containsPoint(Flashbang.globalMouse.x, Flashbang.globalMouse.y)) {
                let mouseP: Point = new Point(0, 0);
                mouseP = mouseP.copyFrom(this.display.toLocal(Flashbang.globalMouse, undefined, Pose2D.MOUSE_LOC));
                const baseXys: Point[] = [];

                const fullSeqLen = this.fullSequenceLength;
                for (let ii = 0; ii < fullSeqLen; ii++) {
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
                        nodeLabel = this._scoreNodes[ii].textLabel;
                        nodeScore = this._scoreNodes[ii].textScore;
                        nodeFound = true;
                        this._scoreNodeIndex = ii;
                    }
                }
            }

            if (this._pseudoknotted && this._scoreFolder !== null) {
                totalScore = Math.round(this._scoreFolder.scoreStructures(
                    this._sequence, this._pairs.getSatisfiedPairs(this._sequence), true
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
                || (this._oligo != null && this._oligoMode === OligoMode.DIMER)
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
                if (this._oligo != null && this._oligoMode === OligoMode.DIMER) {
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

            this._poseField.updateEnergyGui(
                factor, scoreLabel, scoreScore, nodeLabel, nodeScore, nodeFound, this._getEnergyDelta
            );
        }
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

        if (root.isPair) {
            if (root.children.length > 1) {
                throw new Error("Something's wrong with score tree");
            }

            if (root.children.length !== 0) {
                if (root.children[0].isPair) {
                    const childCoords = [];

                    childCoords.push(root.indexA);
                    childCoords.push(root.indexB);

                    childCoords.push(root.children[0].indexB);
                    childCoords.push(root.children[0].indexA);

                    const newnode = new ScoreDisplayNode();
                    nodes.push(newnode);
                    newnode.setType(ScoreDisplayNodeType.STACK, childCoords, root.score);

                    this.generateScoreNodesRecursive(root.children[0], null, nodes);
                } else {
                    const childCoords = [];

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
        const base: Base = new Base(RNABase.GUANINE);
        base.setMarkerLayer(this._currentMarkerLayer);
        this.addObject(base, this._baseLayer);
        this._bases.push(base);
        return base;
    }

    private isNucleotidePartOfSequence(fullSequence: Sequence, index: number) {
        return index < fullSequence.length && this._bases[index].type !== RNABase.CUT;
    }

    private static createDefaultLocks(sequenceLength: number): boolean[] {
        return new Array<boolean>(sequenceLength).fill(false);
    }

    private readonly _baseLayer: Container = new Container();
    private readonly _poseField: PoseField;

    private _width: number = 0;
    private _height: number = 0;

    // Array of sequence/pairs
    private _sequence: Sequence = new Sequence([]);
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
    private _molecule: Molecule | null = null;
    private _moleculeIsBound: boolean = false;
    private _moleculeIsBoundReal: boolean = false;
    private _molecularBindingBonus: number | undefined = 0;
    private _moleculeTargetPairs: SecStruct | null;
    private _shiftLimit: number;
    private _customLayout: Array<[number, number] | [null, null]> | undefined = undefined;
    private _customLayoutChanged: boolean = false;
    private _pseudoknotted: boolean = false;
    private _librarySelections: boolean[] = [];
    private _librarySelectionsChanged: boolean = false;

    // Oligos
    private _oligo: number[] | null = null;
    private _oligoMode: number = OligoMode.DIMER;
    private _oligoName: string | null = null;
    private _duplexCost: number = 4.1; // total for all strands
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
    private _currentColor: RNABase | RNAPaint = RNABase.URACIL;
    private _lastColoredIndex: number;
    private _lockUpdated: boolean;
    private _bindingSiteUpdated: boolean;
    private _designStructUpdated: boolean;

    private _currentArrangementTool: Layout = Layout.MOVE;

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
    private _startPickCallback: PosePickCallback;
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
    private _libraryHighlightBox: HighlightBox;

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

    // Base rings
    private _cursorIndex: number | null = 0;
    private _cursorBox: Graphics | null = null;
    private _currentMarkerLayer: string = PLAYER_MARKER_LAYER;

    // Adding/removing bases
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

    private _highlightEnergyText: boolean = false;
    private _energyHighlights: SceneObject[] = [];

    private _showNucleotideRange: boolean = false;

    // Annotations
    private _annotationManager: AnnotationManager;
    private _annotationCanvas: Graphics;
    private _annotationViews: AnnotationView[] = [];
    private _annotationHighlightBox: HighlightBox;
    private _annotationContextMenu: ContextMenu;
    private _annotationDialog: AnnotationDialog | null = null;
    private _annotationSpaceAvailability: Map<string, boolean> = new Map();
    private _annotationRanges: AnnotationRange[] = [];
    private _selectingAnnotationRange: boolean = false;
    private _redrawAnnotations: FrameUpdateState = FrameUpdateState.IDLE;
    private _redrawAnnotationUseCache: boolean = false;

    /*
     * NEW HIGHLIGHT.
     *  - Input: List of nucleotides that we wish to highlight.
     *  - Unhighlighted Nucleotides: Draw at 65% opacity.
     *  - Highlight Nucleotides: Brighten glow around the nucleotide.
     */
    private _allNewHighlights: RNAHighlightState[] = [];

    private static readonly P: Point = new Point();
}

export class RNAHighlightState {
    public nuc: number[] | null = null; // nucleotides
    public isOn: boolean = false;
}
