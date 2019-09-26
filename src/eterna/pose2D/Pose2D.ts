import * as log from "loglevel";
import {Container, Graphics, Point, Sprite, Texture, Rectangle} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {Updatable} from "../../flashbang/core/Updatable";
import {Vector2} from "../../flashbang/geom/Vector2";
import {IsLeftMouse} from "../../flashbang/input/InputUtil";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {SceneObject} from "../../flashbang/objects/SceneObject";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {DelayTask} from "../../flashbang/tasks/DelayTask";
import {LocationTask} from "../../flashbang/tasks/LocationTask";
import {ParallelTask} from "../../flashbang/tasks/ParallelTask";
import {RepeatingTask} from "../../flashbang/tasks/RepeatingTask";
import {SelfDestructTask} from "../../flashbang/tasks/SelfDestructTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {Arrays} from "../../flashbang/util/Arrays";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Dragger} from "../../flashbang/util/Dragger";
import {Easing} from "../../flashbang/util/Easing";
import {Registration} from "../../signals/Registration";
import {EPars} from "../EPars";
import {Eterna} from "../Eterna";
import {ExpPainter} from "../ExpPainter";
import {Folder} from "../folding/Folder";
import {GameMode} from "../mode/GameMode";
import {Booster} from "../mode/PoseEdit/Booster";
import {BitmapManager} from "../resources/BitmapManager";
import {Sounds} from "../resources/Sounds";
import {ROPWait} from "../rscript/ROPWait";
import {TextBalloon} from "../ui/TextBalloon";
import {Fonts} from "../util/Fonts";
import {Utility} from "../util/Utility";
import {BaseGlow} from "../vfx/BaseGlow";
import {LightRay} from "../vfx/LightRay";
import {Base} from "./Base";
import {BaseDrawFlags} from "./BaseDrawFlags";
import {EnergyScoreDisplay} from "./EnergyScoreDisplay";
import {HighlightBox, HighlightType} from "./HighlightBox";
import {BaseRope} from "./BaseRope";
import {Molecule} from "./Molecule";
import {PaintCursor} from "./PaintCursor"
import {PoseField} from "./PoseField";
import {PoseUtil} from "./PoseUtil";
import {PuzzleEditOp} from "./PuzzleEditOp";
import {RNAAnchorObject} from "./RNAAnchorObject";
import {RNALayout, RNATreeNode} from "./RNALayout";
import {ScoreDisplayNode, ScoreDisplayNodeType} from "./ScoreDisplayNode";
import {ExplosionFactorPanel} from "./ExplosionFactorPanel";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export type PoseMouseDownCallback = (e: InteractionEvent, closest_dist: number, closest_index: number) => void;

export class Pose2D extends ContainerObject implements Updatable {
    public static readonly COLOR_CURSOR: number = 0xFFC0CB;
    public static readonly ZOOM_SPACINGS: number[] = [45, 30, 20, 14, 7];
    public static readonly BASE_TRACK_THICKNESS: number[] = [5, 4, 3, 2, 2];
    public static readonly BASE_TRACK_RADIUS: number[] = [15, 10, 7, 5, 3];

    public static readonly OLIGO_MODE_DIMER: number = 1;
    public static readonly OLIGO_MODE_EXT3P: number = 2;
    public static readonly OLIGO_MODE_EXT5P: number = 3;

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

        this.container.addChild(this._baseLayer);

        this._primaryScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._primaryScoreEnergyDisplay.position = new Point(17, 118);
        this.container.addChild(this._primaryScoreEnergyDisplay);

        this._deltaScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._deltaScoreEnergyDisplay.position = new Point(17 + 119, 118);
        this.container.addChild(this._deltaScoreEnergyDisplay);

        this._secondaryScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._secondaryScoreEnergyDisplay.position = new Point(17 + 119*2, 118);
        this._secondaryScoreEnergyDisplay.visible = false;
        this.container.addChild(this._secondaryScoreEnergyDisplay);

        this._explosionFactorPanel = new ExplosionFactorPanel();
        this._explosionFactorPanel.display.position = new Point(17, 118 + 82);
        this._explosionFactorPanel.display.visible = false;
        this._explosionFactorPanel.factorUpdated.connect((factor: number) => {
            this._explosionFactor = factor;
            this.computeLayout(true);
            this._redraw = true;
        });
        this.addObject(this._explosionFactorPanel, this.container);


        this._moleculeLayer = new Container();
        this.container.addChild(this._moleculeLayer);
        this._moleculeLayer.visible = false;

        this._paintCursor = new PaintCursor();
        this._paintCursor.display.visible = false;
        this.addObject(this._paintCursor, this.container);

        this._explosionRays = [];
        for (let ii: number = 0; ii < 10; ii++) {
            let ray = new LightRay();
            this._explosionRays.push(ray);
            this.addObject(ray, this.container);
        }

        this._selectionHighlightBox = new HighlightBox(this);
        this.addObject(this._selectionHighlightBox, this.container);

        this._restrictedHighlightBox = new HighlightBox(this);
        this.addObject(this._restrictedHighlightBox, this.container);

        this._unstableHighlightBox = new HighlightBox(this);
        this.addObject(this._unstableHighlightBox, this.container);

        this._userDefinedHighlightBox = new HighlightBox(this);
        this.addObject(this._userDefinedHighlightBox, this.container);

        this._forcedHighlightBox = new HighlightBox(this);
        this.addObject(this._forcedHighlightBox, this.container);

        this._shiftHighlightBox = new HighlightBox(this);
        this.addObject(this._shiftHighlightBox, this.container);

        if (!this._editable) {
            this._currentColor = -1;
        }

        this._auxInfoCanvas = new Graphics();
        this._auxInfoCanvas.visible = false;
        this.container.addChild(this._auxInfoCanvas);

        this._auxTextballoon = new TextBalloon("", 0x0, 0.9);
        this._auxTextballoon.display.visible = false;
        this.addObject(this._auxTextballoon, this._auxInfoCanvas);

        this._strandLabel = new TextBalloon("", 0x0, 0.8);
        this._strandLabel.display.visible = false;
        this.addObject(this._strandLabel, this.container);

        this.pointerMove.connect(() => this.onMouseMoved());
        this.pointerDown.filter(IsLeftMouse).connect(e => this.callStartMousedownCallback(e));
        this.pointerOut.connect(() => this.onMouseOut());

        // handle view settings
        this.regs.add(Eterna.settings.showNumbers.connectNotify(value => this.showNumbering = value));
        this.regs.add(Eterna.settings.showRope.connectNotify(value => this.showBaseRope = value));
        this.regs.add(Eterna.settings.showLetters.connectNotify(value => this.lettermode = value));
        this.regs.add(Eterna.settings.useContinuousColors.connectNotify(value => this.useContinuousExpColors = value));
        this.regs.add(Eterna.settings.useExtendedColors.connectNotify(value => this.useExtendedScale = value));
        this.regs.add(Eterna.settings.displayFreeEnergies.connectNotify(value => this.displayScoreTexts = value));
        this.regs.add(Eterna.settings.highlightRestricted.connectNotify(value => this.highlightRestricted = value));
        this.regs.add(Eterna.settings.displayAuxInfo.connectNotify(value => this.displayAuxInfo = value));
        this.regs.add(Eterna.settings.simpleGraphics.connectNotify(value => this.useSimpleGraphics = value))
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
        for (let ii: number = 0; ii < this._anchoredObjects.length; ++ii) {
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

    public visualizeFeedback(dat: number[], mid: number, lo: number, hi: number, start_index: number): void {
        // coloring
        let newdat: number[] = ExpPainter.transformData(dat, hi, lo);
        this._expPainter = new ExpPainter(newdat, start_index);
        this._expMid = mid;
        this._expHi = hi;
        this.paintFeedback();

        // print feedback score
        for (let ii: number = 0; ii < this._feedbackObjs.length; ii++) {
            this.removeObject(this._feedbackObjs[ii]);
        }

        this._feedbackObjsNum = dat.length;
        this._feedbackObjsStartInd = start_index;
        this.printFeedback(dat);
        this.updatePrintFeedback();
    }

    public paintFeedback(): void {
        if (!this._expPainter) {
            return;
        }

        this._expPainter.continuous = this._expContinuous;
        this._expPainter.extendedScale = this._expExtendedScale;

        for (let ii: number = 0; ii < this._sequence.length; ii++) {
            this._bases[ii].setColorLevel(true, this._expPainter.getColorLevelWithMidpoint(ii, this._expMid, this._expHi));
        }
        this._redraw = true;
    }

    public clearFeedback(): void {
        for (let ii: number = 0; ii < this._sequence.length; ii++) {
            this._bases[ii].setColorLevel(false, -1);
        }
        this._redraw = true;
    }

    public get zoomLevel(): number {
        return this._zoomLevel;
    }

    public setZoomLevel(zoom_level: number, animate: boolean = true, center: boolean = false): void {
        if ((this._zoomLevel !== zoom_level || center) && animate) {
            if (this._zoomLevel === zoom_level && center) {
                if (Math.abs(this._width / 2 - this._offX) + Math.abs(this._height / 2 - this._offY) < 50) {
                    return;
                }
            }

            this._startOffsetX = this._offX;
            this._startOffsetY = this._offY;

            let scaler: number = 1;
            if (zoom_level > this._zoomLevel) {
                scaler = Pose2D.ZOOM_SPACINGS[zoom_level] / Pose2D.ZOOM_SPACINGS[this._zoomLevel];
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

            this._zoomLevel = zoom_level;
            this.computeLayout(true);
            this._redraw = true;

        } else if (this._zoomLevel !== zoom_level) {
            this._zoomLevel = zoom_level;
            this.computeLayout(true);
            this._redraw = true;
        }
    }

    public computeDefaultZoomLevel(): number {
        let n: number = this.fullSequenceLength;
        let xarray: number[] = new Array(n);
        let yarray: number[] = new Array(n);

        let rna_coords: RNALayout;
        rna_coords = new RNALayout(Pose2D.ZOOM_SPACINGS[0], Pose2D.ZOOM_SPACINGS[0]);
        rna_coords.setupTree(this._pairs);
        rna_coords.drawTree();
        rna_coords.getCoords(xarray, yarray);

        let xmin: number = xarray[0];
        let xmax: number = xarray[0];
        let ymin: number = yarray[0];
        let ymax: number = yarray[0];

        for (let ii: number = 0; ii < n; ii++) {
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

        let xdiff: number = xmax - xmin;
        let ydiff: number = ymax - ymin;
        let xscale: number = xdiff / this._width;
        let yscale: number = ydiff / this._height;

        let scale: number = Math.max(xscale, yscale);
        if (scale < 1.0) {
            return 0;
        } else if (30 / 45 * scale < 1.0) {
            return 1;
        } else if (20 / 45 * scale < 1.0) {
            return 2;
        } else if (14 / 45 * scale < 1.0) {
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

        let need_update: boolean = false;

        if (this._mutatedSequence == null) {
            return;
        }

        if (this._mutatedSequence.length !== this.fullSequenceLength) {
            throw new Error("Mutated sequence and original sequence lengths don't match");
        }

        let num_mut: number = 0;
        let muts: any[] = [];
        let div: number = 1;
        if (this._currentColor === EPars.RNABASE_PAIR
            || this._currentColor === EPars.RNABASE_GC_PAIR
            || this._currentColor === EPars.RNABASE_AU_PAIR
            || this._currentColor === EPars.RNABASE_GU_PAIR) {

            div = 2;
        }

        let ofs: number = (this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_EXT5P ? this._oligo.length : 0);
        let ii: number;
        for (ii = 0; ii < this._sequence.length; ii++) {
            if (this._sequence[ii] !== this._mutatedSequence[ii + ofs]) {
                num_mut++;
                this._sequence[ii] = this._mutatedSequence[ii + ofs];
                muts.push({pos: ii + 1, base: EPars.sequenceToString([this._sequence[ii]])});
                need_update = true;
            }
        }
        if (need_update) {
            this.callTrackMovesCallback(num_mut / div, muts);
        }

        if (need_update || this._lockUpdated || this._bindingSiteUpdated || this._designStructUpdated) {
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

    public setMutated(seq_arr: number[]): void {
        let n: number = Math.min(this._mutatedSequence.length, seq_arr.length);
        let ofs: number = (this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_EXT5P ? this._oligo.length : 0);

        for (let ii: number = 0; ii < n; ii++) {
            if (this._mutatedSequence[ii] !== seq_arr[ii] && !this.isLocked(ofs + ii)) {
                this._mutatedSequence[ii] = seq_arr[ii];
                this._bases[ofs + ii].setType(seq_arr[ii]);
            }
        }
    }

    public pasteSequence(sequence: number[]): void {
        if (sequence == null) {
            return;
        }

        let num_mut: number = 0;
        let muts: any[] = [];

        let n: number = Math.min(sequence.length, this._sequence.length);
        let need_update: boolean = false;
        let ofs: number = (this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_EXT5P ? this._oligo.length : 0);

        for (let ii: number = 0; ii < n; ii++) {
            if (this._sequence[ii] !== sequence[ii] && !this.isLocked(ofs + ii)) {
                num_mut++;
                this._sequence[ii] = sequence[ii];
                muts.push({pos: ii + 1, base: EPars.sequenceToString([this._sequence[ii]])});
                this._bases[ofs + ii].setType(sequence[ii]);
                need_update = true;
            }
        }

        if (need_update) {
            this.callTrackMovesCallback(num_mut, muts);

            this.checkPairs();
            this.updateMolecule();
            this.generateScoreNodes();
            this.callPoseEditCallback();
        }
    }

    public getBaseXY(seq: number, out: Point = null): Point {
        if (out == null) {
            out = new Point();
        }
        out.x = this._bases[seq].x + this._offX;
        out.y = this._bases[seq].y + this._offY;
        return out;
    }

    public getBaseOutXY(seq: number, out: Point = null): Point {
        out = this._bases[seq].getOutXY(out);
        out.x += this._offX;
        out.y += this._offY;
        return out;
    }

    public clearMouse(): void {
        //document.getElementById(Eterna.PIXI_CONTAINER_ID).style.cursor = '';
        this._paintCursor.display.visible = false;
        this._strandLabel.display.visible = false;
    }

    public parseCommand(command: number, closest_index: number): any[] {
        switch (command) {
        case EPars.RNABASE_ADD_BASE:
            return PoseUtil.addBaseWithIndex(closest_index, this._pairs);

        case EPars.RNABASE_ADD_PAIR:
            return PoseUtil.addPairWithIndex(closest_index, this._pairs);

        case EPars.RNABASE_DELETE:
            return this.deleteBaseWithIndex(closest_index);

        default:
            return null;
        }
    }

    public parseCommandWithPairs(command: number, closest_index: number, pairs: number[]): any[] {
        switch (command) {
        case EPars.RNABASE_ADD_BASE:
            return PoseUtil.addBaseWithIndex(closest_index, pairs);

        case EPars.RNABASE_DELETE:
            return this.deleteBaseWithIndexPairs(closest_index, pairs);

        default:
            return null;
        }
    }

    public onPoseMouseDownPropagate(e: InteractionEvent, closest_index: number): void {
        let altDown: boolean = Flashbang.app.isAltKeyDown;
        let ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;

        if ((this._coloring && !altDown) || ctrlDown) {
            if (ctrlDown && closest_index >= this.sequence.length) {
                return;
            }
            this.onPoseMouseDown(e, closest_index);
        }
    }

    public onPoseMouseDown(e: InteractionEvent, closest_index: number): void {
        let altDown: boolean = Flashbang.app.isAltKeyDown;
        let shiftDown: boolean = Flashbang.app.isShiftKeyDown;
        let ctrlDown: boolean = Flashbang.app.isControlKeyDown || Flashbang.app.isMetaKeyDown;

        if (closest_index >= 0) {
            this._mouseDownAltKey = altDown;
            if (ctrlDown && closest_index < this.fullSequenceLength) {
                this.toggleBaseMark(closest_index);
                return;
            }
            if (shiftDown) {
                if (closest_index < this.sequenceLength) {
                    this._shiftStart = closest_index;
                    this._shiftEnd = closest_index;
                    this.updateShiftHighlight();

                    let reg: Registration = null;
                    reg = this.pointerUp.connect(() => {
                        this._shiftStart = -1;
                        this._shiftEnd = -1;
                        reg.close();
                    });
                }
                e.stopPropagation();
                return;
            }
            this._lastShiftedCommand = -1;
            this._lastShiftedIndex = -1;
            let cmd: any[] = this.parseCommand(this._currentColor, closest_index);
            if (cmd == null) {
                let dragger = new Dragger();
                this.addObject(dragger);
                dragger.dragged.connect(() => this.onMouseMoved());
                dragger.dragComplete.connect(() => this.onMouseUp());

                this.onBaseMouseDown(closest_index, ctrlDown);
            } else {
                this._lastShiftedCommand = this._currentColor;
                this._lastShiftedIndex = closest_index;

                this.callAddBaseCallback(cmd[0], cmd[1], closest_index);
            }

            e.stopPropagation();
        } else {
            if (shiftDown) {
                this._shiftStart = -1;
                this._shiftEnd = -1;
                this.updateShiftHighlight();
            }
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
            if(typeof(colors) === "number")
                colors = [colors];
            ROPWait.notifyBlackMark(baseIndex, true);
            const markBox = new Graphics();
            this.container.addChild(markBox);
            this._trackedIndices.push({ baseIndex: baseIndex, colors, markBox });
            this.drawBaseMark({markBox, baseIndex, colors});
        }
        
    }

    public removeBaseMark(baseIndex: number): void {
        let index: number = this._trackedIndices.findIndex(mark => mark.baseIndex === baseIndex);
        if (index !== -1) {
            this._trackedIndices[index].markBox.destroy();
            this._trackedIndices.splice(index, 1);
            ROPWait.notifyBlackMark(baseIndex, false);
        }
    }

    public isTrackedIndex(index: number): boolean {
        return this._trackedIndices.some(mark => mark.baseIndex === index);
    }

    private drawBaseMark({markBox, baseIndex, colors}: {markBox: Graphics, baseIndex: number, colors: number[]}){
        const angle = Math.PI * 2 / colors.length;
        if(baseIndex >= this.fullSequenceLength){
            markBox.visible = false;
            return;
        }

        let center: Point = this.getBaseXY(baseIndex);

        markBox.clear();
        colors.forEach((color, colorIndex) => {
            markBox.x = center.x;
            markBox.y = center.y;
            markBox.visible = true;
            markBox.lineStyle(Pose2D.BASE_TRACK_THICKNESS[this.zoomLevel], color);
            markBox.arc(0, 0, Pose2D.BASE_TRACK_RADIUS[this.zoomLevel],
                               colorIndex * angle, (colorIndex + 1) * angle);
        });
    }

    public onMouseMoved(): void {
        if (!this._poseField.containsPoint(Flashbang.globalMouse.x, Flashbang.globalMouse.y)) {
            this.onMouseOut();
            return;
        }

        if (!this._coloring) {
            this.clearMouse();
        }

        this.container.toLocal(Flashbang.globalMouse, null, Pose2D.P);
        let mouseX = Pose2D.P.x;
        let mouseY = Pose2D.P.y;

        this._paintCursor.display.x = mouseX;
        this._paintCursor.display.y = mouseY;

        let closest_dist: number = -1;
        let closest_index: number = -1;
        for (let ii = 0; ii < this.fullSequenceLength; ii++) {
            let mouseDist: number = this._bases[ii].isClicked(mouseX - this._offX, mouseY - this._offY, this._zoomLevel, this._coloring);
            if (mouseDist >= 0) {
                if (closest_index < 0 || mouseDist < closest_dist) {
                    closest_index = ii;
                    closest_dist = mouseDist;
                }
            }
        }

        if (closest_index >= 0 && this._currentColor >= 0) {
            this.onBaseMouseMove(closest_index);
            //document.getElementById(Eterna.PIXI_CONTAINER_ID).style.cursor = 'none';
            this._paintCursor.display.visible = true;
            this._paintCursor.setShape(this._currentColor);

            let strandName: string = this.getStrandName(closest_index);
            if (strandName != null) {
                this._strandLabel.setText(strandName);
                if (mouseX + 16 + this._strandLabel.width > this._width) {
                    this._strandLabel.display.position = new Point(
                        mouseX - 16 - this._strandLabel.width,
                        mouseY + 16);
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
                    if (ii === closest_index) {
                        continue;
                    }
                    this._feedbackObjs[ii].display.visible = false;
                }
                if (closest_index >= 0) {
                    this._feedbackObjs[closest_index].display.visible = true;
                }
            }
        }
    }

    public onMouseUp(): void {
        this.doneColoring();
        this._mouseDownAltKey = false;
        ROPWait.notifyEndPaint();
    }

    public deleteBaseWithIndexPairs(index: number, pairs: number[]): any[] {
        if (this.isTrackedIndex(index)) {
            this.toggleBaseMark(index);
        }

        return PoseUtil.deleteNopairWithIndex(index, pairs);
    }

    public clearTracking(): void {
        while (this._trackedIndices.length > 0) {
            this._trackedIndices.pop().markBox.destroy();
        }
    }

    public get trackedIndices(): { baseIndex: number, colors: number[] }[] {
        return this._trackedIndices.map(mark => ({ baseIndex: mark.baseIndex, colors: mark.colors}));
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

    public setOffset(off_x: number, off_y: number): void {
        this._offX = off_x;
        this._offY = off_y;
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

    public set puzzleLocks(puzlocks: boolean[]) {
        if (puzlocks == null) {
            this._locks = null;
        } else {
            this._locks = puzlocks.slice();
        }

        this._redraw = true;
    }

    public get puzzleLocks(): boolean[] {
        if (this._locks == null) {
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

    public set forcedStruct(forced: number[]) {
        let len: number = this.fullSequenceLength;
        if (forced == null) {
            this._forcedStruct = null;
        } else {
            if (forced.length !== len) {
                throw new Error("Forced structure length does not match sequence length " + forced.length + " " + this._sequence.length + " " + this._pairs.length);
            }

            this._forcedStruct = forced.slice();
        }

        for (let ii: number = 0; ii < len; ii++) {
            this._bases[ii].forced = this._forcedStruct != null && this._forcedStruct[ii] !== EPars.FORCE_IGNORE;
        }
    }

    public get forcedStruct(): number[] {
        if (this._forcedStruct != null) {
            return this._forcedStruct.slice();
        }

        let temp: number[] = [];
        for (let ii: number = 0; ii < this.fullSequenceLength; ii++) {
            temp.push(EPars.FORCE_IGNORE);
        }

        return temp;
    }

    public set forcedHighlights(elems: number[]) {
        if (elems == null) {
            this._forcedHighlightBox.clear();
        } else {
            this._forcedHighlightBox.setHighlight(HighlightType.FORCED, elems);
        }
    }

    public set structConstraints(do_care: boolean[]) {
        let ii: number;
        let len: number = this.fullSequenceLength;
        let dc: boolean[] = (do_care == null ? null : do_care.slice());
        if (dc != null && this._oligosOrder != null) {
            let idx_map: number[] = this.getOrderMap(null);
            for (ii = 0; ii < len; ii++) {
                dc[ii] = do_care[idx_map.indexOf(ii)];
            }
        }
        for (ii = 0; ii < len; ii++) {
            this._bases[ii].dontcare = dc == null ? false : !dc[ii];
        }
    }

    public clearDesignStruct(): void {
        for (let jj: number = 0; jj < this.fullSequenceLength; jj++) {
            this._designStruct[jj] = false;
        }
        this.updateDesignHighlight();
    }

    public toggleDesignStruct(seqnum: number): boolean {
        if (this._designStruct.length !== this.fullSequenceLength) {
            this._designStruct = new Array(this.fullSequenceLength);
        }

        this._designStruct[seqnum] = !this._designStruct[seqnum];
        ROPWait.notifyBlueMark(seqnum, this._designStruct[seqnum]);
        this.updateDesignHighlight();
        let segments: number[] = this.designSegments;
        return (segments.length === 4
            && segments[1] - segments[0] === segments[3] - segments[2]
            && (segments[2] - segments[1] > 3
                || EPars.hasCut(this.fullSequence, segments[1], segments[2])));
    }

    public get designSegments(): number[] {
        let elems: number[] = [];
        let curr: number = 0;
        for (let jj: number = 0; jj < this.fullSequenceLength; jj++) {
            let stat: number = this._designStruct[jj] ? 1 : 0;
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
        let q: number[] = this._shiftHighlightBox.getQueue();
        if (q == null) {
            return;
        }

        let first: number = q[1];
        let last: number = q[2];
        let ii: number;
        // can't shift locked bases
        for (ii = first; ii <= last; ii++) {
            if (this._locks[ii]) {
                return;
            }
        }
        // find the next acceptable spot
        let ofs: number = 1;
        let len: number = this.sequenceLength;
        while (last + ofs < len) {
            for (ii = first + ofs; ii <= last + ofs; ii++) {
                if (this._locks[ii]) {
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
            segment = this._sequence.slice(first, last + 1 + 1);
            segment.unshift(segment.pop());
            mutated = this._sequence.slice(0, first)
                .concat(segment)
                .concat(this._sequence.slice(last + 1 + 1));
        } else {
            mutated = this._sequence.slice();
            for (ii = first; ii <= last; ii++) {
                let xx: number = mutated[ii + ofs];
                mutated[ii + ofs] = mutated[ii];
                mutated[ii] = xx;
            }
        }

        this._mutatedSequence = this.fullSequence.slice();
        this.setMutated(mutated);
        this.doneColoring();
        this._shiftHighlightBox.setHighlight(HighlightType.SHIFT, [first + ofs, last + ofs]);
    }

    public shift5Prime(): void {
        let q: number[] = this._shiftHighlightBox.getQueue();
        if (q == null) {
            return;
        }

        let first: number = q[1];
        let last: number = q[2];
        let ii: number;
        // can't shift locked bases
        for (ii = first; ii <= last; ii++) {
            if (this._locks[ii]) {
                return;
            }
        }
        // find the next acceptable spot
        let ofs: number = -1;
        while (first + ofs >= 0) {
            for (ii = first + ofs; ii <= last + ofs; ii++) {
                if (this._locks[ii]) {
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
            segment = this._sequence.slice(first - 1, last + 1);
            segment.push(segment.shift());
            mutated = this._sequence.slice(0, first - 1)
                .concat(segment)
                .concat(this._sequence.slice(last + 1));
        } else {
            mutated = this._sequence.slice();
            for (ii = first; ii <= last; ii++) {
                let xx: number = mutated[ii + ofs];
                mutated[ii + ofs] = mutated[ii];
                mutated[ii] = xx;
            }
        }

        this._mutatedSequence = this.fullSequence.slice();
        this.setMutated(mutated);
        this.doneColoring();
        this._shiftHighlightBox.setHighlight(HighlightType.SHIFT, [first + ofs, last + ofs]);
    }

    public isDesignStructureHighlighted(index: number): boolean {
        return (this._designStruct[index] === true);
    }

    public getSequenceString(): string {
        return EPars.sequenceToString(this._sequence);
    }

    public get satisfied(): boolean {
        for (let ii: number = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii && !this.isPairSatisfied(ii, this._pairs[ii])) {
                return false;
            }
        }

        return true;
    }

    public set showNumbering(show: boolean) {
        this._numberingMode = show;
        this._redraw = true;
    }

    public get showNumbering(): boolean {
        return this._numberingMode;
    }

    public set showBaseRope(show: boolean) {
        this._baseRopeMode = show;
        this._redraw = true;
    }

    public get showRope(): boolean {
        return this._baseRopeMode;
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

    public highlightStack(action: number[]): void {
        this._selectionHighlightBox.setHighlight(HighlightType.STACK, action.slice(1));
    }

    public highlightLoop(action: number[]): void {
        this._selectionHighlightBox.setHighlight(HighlightType.LOOP, action.slice(1));
    }

    /// For restricted queue
    public clearRestrictedHighlight(): void {
        this._restrictedHighlightBox.clear();
    }

    public highlightRestrictedSequence(restricted: number[]): void {
        this._restrictedHighlightBox.setHighlight(HighlightType.RESTRICTED, restricted);
    }

    public clearUnstableHighlight(): void {
        this._unstableHighlightBox.clear();
    }

    public highlightUnstableSequence(unstable: number[]): void {
        this._unstableHighlightBox.setHighlight(HighlightType.UNSTABLE, unstable);
    }

    public clearUserDefinedHighlight(): void {
        this._userDefinedHighlightBox.clear();
    }

    public highlightUserDefinedSequence(user_defined: number[]): void {
        this._userDefinedHighlightBox.setHighlight(HighlightType.USER_DEFINED, user_defined);
    }

    public clearShiftHighlight(): void {
        this._shiftHighlightBox.clear();
    }

    public praiseStack(stack_start: number, stack_end: number): void {
        this._praiseQueue.push(stack_start);
        this._praiseQueue.push(stack_end);
    }

    public praiseSequence(seq_start: number, seq_end: number): void {
        this._praiseSeq.push(seq_start);
        this._praiseSeq.push(seq_end);
    }

    private onPraiseStack(stack_start: number, stack_end: number, play_sound: boolean): void {
        let x_pos: number = 0;
        let y_pos: number = 0;

        let play_ua: boolean = false;
        let play_gc: boolean = false;
        let play_gu: boolean = false;

        for (let kk: number = stack_start; kk <= stack_end; kk++) {
            if (this._pairs[kk] < 0) {
                return;
            }
        }

        for (let ii: number = stack_start; ii <= stack_end; ii++) {

            let aa: number = ii;
            let bb: number = this._pairs[ii];

            if ((this._sequence[aa] === EPars.RNABASE_ADENINE && this._sequence[bb] === EPars.RNABASE_URACIL) ||
                (this._sequence[bb] === EPars.RNABASE_ADENINE && this._sequence[aa] === EPars.RNABASE_URACIL)) {
                play_ua = true;
            } else if ((this._sequence[aa] === EPars.RNABASE_GUANINE && this._sequence[bb] === EPars.RNABASE_CYTOSINE) ||
                (this._sequence[bb] === EPars.RNABASE_GUANINE && this._sequence[aa] === EPars.RNABASE_CYTOSINE)) {
                play_gc = true;
            } else if ((this._sequence[aa] === EPars.RNABASE_GUANINE && this._sequence[bb] === EPars.RNABASE_URACIL) ||
                (this._sequence[bb] === EPars.RNABASE_GUANINE && this._sequence[aa] === EPars.RNABASE_URACIL)) {
                play_gu = true;
            }

            this._bases[ii].startSparking();
            this._bases[this._pairs[ii]].startSparking();
            let p: Point = this.getBaseXY(ii);
            let p2: Point = this.getBaseXY(this._pairs[ii]);

            x_pos += p.x;
            y_pos += p.y;

            x_pos += p2.x;
            y_pos += p2.y;
        }

        let stack_len: number = (stack_end - stack_start) + 1;

        x_pos /= stack_len * 2;
        y_pos /= stack_len * 2;

        let praiseText = stack_len > 1 ? "Great Pairings!" : "Great Pairing!";
        let praise_obj = new SceneObject(Fonts.arial(praiseText, 20).bold().color(0xffffff).build());
        praise_obj.display.position = new Point(x_pos - DisplayUtil.width(praise_obj.display) * 0.5, y_pos);
        this.addObject(praise_obj, this.container);

        praise_obj.display.alpha = 0;
        praise_obj.addObject(new SerialTask(
            new ParallelTask(
                new AlphaTask(0.85, 0.33, Easing.easeOut),
                new LocationTask(praise_obj.display.x, praise_obj.display.y - 80, 0.33, Easing.easeOut)
            ),
            new DelayTask(1),
            new ParallelTask(
                new AlphaTask(0, 0.33, Easing.easeOut),
                new LocationTask(praise_obj.display.x, praise_obj.display.y - 120, 0.33, Easing.easeOut)
            ),
            new SelfDestructTask()
        ));

        if (play_sound) {
            if (play_gc) {
                Eterna.sound.playSound(Sounds.SoundRG);
            } else if (play_ua) {
                Eterna.sound.playSound(Sounds.SoundYB);
            } else if (play_gu) {
                Eterna.sound.playSound(Sounds.SoundRB);
            }
        }
    }

    public createNewHighlight(nucleotides: number[]): RNAHighlightState {
        let hl: RNAHighlightState = new RNAHighlightState();

        // If any of the nucleotides are part of a stack, highlight its pair as well.
        let addition: number[] = [];
        for (let i: number = 0; i < nucleotides.length; ++i) {
            if (this._pairs[nucleotides[i]] !== -1) {
                addition.push(this._pairs[nucleotides[i]]);
            }
        }
        nucleotides = nucleotides.concat(addition);

        hl.nuc = nucleotides;
        this._allNewHighlights.push(hl);

        this._redraw = true;
        return hl;
    }

    public removeNewHighlight(highlight: RNAHighlightState): void {
        let idx: number = this._allNewHighlights.indexOf(highlight);
        if (idx >= 0) {
            this._allNewHighlights.splice(idx, 1);
            this._redraw = true;
        }
    }

    private onPraiseSeq(seq_start: number, seq_end: number): void {
        for (let ii: number = seq_start; ii <= seq_end; ii++) {
            if (ii >= 0 && ii < this.fullSequenceLength) {
                this._bases[ii].startSparking();
            }
        }
    }

    public set displayAuxInfo(display: boolean) {
        this._displayAuxInfo = display;
        this._auxInfoCanvas.visible = display;
    }

    public set auxInfo(aux_info: any) {
        this._auxInfo = aux_info;

        if (this._auxInfo != null && this._auxInfo[Pose2D.CLEAVING_SITE] != null) {
            this._auxTextballoon.display.visible = true;
            this._auxTextballoon.setText("Ribozyme cleaving site");
        }
    }

    public startExplosion(): Promise<void> {
        this._isExploding = true;
        this._explosionStartTime = -1;

        if (this._explosionRays.length >= this._sequence.length) {
            for (let ii: number = 0; ii < this._sequence.length; ii++) {
                const ray = this._explosionRays[ii];
                ray.display.visible = false;
                ray.draw(
                    Vector2.fromPolar(Math.max(this._width, this._height), Math.random() * 2 * Math.PI),
                    this._sequence[ii]);

            }
        } else {
            let diff: number = (this._sequence.length - this._explosionRays.length) / this._explosionRays.length;
            let diff_walker: number = 0;
            let ray_walker: number = 0;

            for (let ii = 0; ii < this._sequence.length; ii++) {
                if (diff_walker < 1) {
                    if (ray_walker >= this._explosionRays.length) {
                        continue;
                    }

                    const ray = this._explosionRays[ray_walker];
                    ray.display.visible = false;
                    ray.draw(
                        Vector2.fromPolar(Math.max(this._width, this._height), Math.random() * 2 * Math.PI),
                        this._sequence[ii]);

                    ray_walker++;
                    diff_walker += diff;

                } else {
                    diff_walker -= 1;
                }
            }
        }

        // If there was an explosion in progress, ensure its promise gets resolved
        if (this._onExplosionComplete != null) {
            this.callExplosionCompleteCallback();
        }

        return new Promise((resolve) => this._onExplosionComplete = resolve);
    }

    private callExplosionCompleteCallback(): void {
        if (this._onExplosionComplete != null) {
            let onComplete = this._onExplosionComplete;
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

        for (let ray of this._explosionRays) {
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

    public set trackMovesCallback(cb: (count: number, moves: any[]) => void) {
        this._trackMovesCallback = cb;
    }

    public callTrackMovesCallback(count: number, moves: any[]): void {
        if (this._trackMovesCallback != null) {
            this._trackMovesCallback(count, moves);
        }
    }

    public set addBaseCallback(cb: (parenthesis: string, op: PuzzleEditOp, index: number) => void) {
        this._addBaseCallback = cb;
    }

    public callAddBaseCallback(parenthesis: string = null, op: PuzzleEditOp = null, index: number = -1): void {
        if (this._addBaseCallback != null) {
            this._addBaseCallback(parenthesis, op, index);
        }
    }

    public set startMousedownCallback(cb: PoseMouseDownCallback) {
        this._startMousedownCallback = cb;
    }

    public callStartMousedownCallback(e: InteractionEvent): void {
        e.data.getLocalPosition(this.display, Pose2D.P);
        let mouseX: number = Pose2D.P.x;
        let mouseY: number = Pose2D.P.y;

        let closest_dist: number = -1;
        let closest_index: number = -1;

        if (this._startMousedownCallback != null) {
            for (let ii: number = 0; ii < this.fullSequenceLength; ii++) {
                let mouseDist: number = this._bases[ii].isClicked(mouseX - this._offX, mouseY - this._offY, this._zoomLevel, false);
                if (mouseDist >= 0) {
                    if (closest_index < 0 || mouseDist < closest_dist) {
                        closest_index = ii;
                        closest_dist = mouseDist;
                    }
                }
            }
            this._startMousedownCallback(e, closest_dist, closest_index);
        } else {
            this.onPoseMouseDown(e, closest_index);
        }
    }

    public get satisfiedPairs(): number[] {
        return EPars.getSatisfiedPairs(this._pairs, this.fullSequence);
    }

    public set sequence(sequence: number[]) {
        if (Arrays.shallowEqual(this._sequence, sequence)) {
            return;
        }

        if (this._locks == null) {
            this._locks = Pose2D.createDefaultLocks(this._sequence.length);
        }

        this._sequence = sequence.slice();
        if (this._sequence.length > this._bases.length) {
            let diff: number = (this._sequence.length - this._bases.length);
            for (let ii: number = 0; ii < diff; ii++) {
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

        let n: number = this.fullSequenceLength;
        for (let ii: number = 0; ii < n; ii++) {
            if (ii < this._sequence.length) {
                this._bases[ii].setType(this._sequence[ii]);
            }
            this._bases[ii].baseIndex = ii;
        }

        this.checkPairs();
        this.updateMolecule();
        this.generateScoreNodes();
    }

    public set molecularBindingBonus(bonus: number) {
        this._molecularBindingBonus = bonus;
    }

    public set molecularStructure(pairs: number[]) {
        if (pairs != null) {
            this._moleculeTargetPairs = pairs.slice();
        } else {
            this._moleculeTargetPairs = null;
        }
    }

    public get molecularStructure(): number[] {
        return this._moleculeTargetPairs;
    }

    public set molecularBindingSite(bindingSite: boolean[]) {
        if (bindingSite != null) {
            this._bindingSite = bindingSite.slice();
        } else {
            this._bindingSite = null;
            this.setMolecularBinding(null, null, this._molecularBindingBonus);
            return;
        }

        let target_pairs: number[] = this._moleculeTargetPairs.slice();
        if (!target_pairs) {
            throw new Error("Can't find molecular target structure");
        }

        let binding_bases: number[] = [];
        let binding_pairs: number[] = [];
        for (let ii: number = 0; ii < bindingSite.length; ii++) {
            if (bindingSite[ii]) {
                binding_bases.push(ii);
                binding_pairs.push(target_pairs[ii]);
            }
        }
        this.setMolecularBinding(binding_bases, binding_pairs, this._molecularBindingBonus);
    }

    public get molecularBindingSite(): boolean[] {
        if (this._bindingSite) {
            return this._bindingSite.slice();
        }

        let temp: boolean[] = [];
        for (let ii: number = 0; ii < this._sequence.length; ii++) {
            temp.push(false);
        }
        return temp;
    }

    public setMolecularBinding(binding_sites: number[], binding_pairs: number[], binding_bonus: number): void {
        if (this._molecule != null) {
            this._molecule.destroy({children: true});
            this._molecule = null;
        }

        if (this._molecularBindingBases != null) {
            for (let glow of this._molecularBindingBases) {
                if (glow != null) {
                    glow.destroy({children: true});
                }
            }
            this._molecularBindingBases = null;
        }

        this._molecularBindingPairs = null;

        if (binding_sites == null || binding_sites.length === 0) {
            return;
        }

        this._molecularBindingBases = new Array(this._sequence.length);
        this._molecularBindingPairs = new Array(this._sequence.length);
        this._molecularBindingBonus = binding_bonus;

        this._molecule = new Molecule();
        this._moleculeLayer.addChild(this._molecule);

        for (let ii: number = 0; ii < binding_sites.length; ii++) {
            let idx = binding_sites[ii];
            let baseGlow = new BaseGlow();
            this._moleculeLayer.addChild(baseGlow);

            this._molecularBindingBases[idx] = baseGlow;
            this._molecularBindingPairs[idx] = binding_pairs[ii];
        }

        this.updateMolecule();
    }

    private updateMolecule(): void {
        if (this._molecularBindingBases == null || this._molecule == null) {
            return;
        }

        let bound_render: boolean = true;
        let bound_real: boolean = true;
        let satisfied_pairs: number[] = this.satisfiedPairs;

        for (let ii: number = 0; ii < this._molecularBindingPairs.length; ii++) {
            if (this._molecularBindingBases[ii] == null) {
                continue;
            }
            if (this._molecularBindingPairs[ii] !== this._pairs[ii]) {
                bound_render = false;
            }

            if (this._molecularBindingPairs[ii] !== satisfied_pairs[ii]) {
                bound_real = false;
                this._molecularBindingBases[ii].isWrong = true;
            } else {
                this._molecularBindingBases[ii].isWrong = false;
            }
        }
        this._molecule.isWrong = !bound_real;
        this._moleculeIsBound = bound_render;
        this._moleculeIsBoundReal = bound_real;
    }

    public setOligos(oligos: Oligo[], order: number[] = null, num_paired: number = 0): void {
        if (oligos == null) {
            this._oligos = null;
            this._oligosOrder = null;
            this._oligosPaired = 0;
            return;
        }

        let same: boolean = (this._oligos != null && oligos.length === this._oligos.length);
        if (same) {
            for (let k = 0; k < oligos.length && same; k++) {
                if (!Arrays.shallowEqual(this._oligos[k].sequence, oligos[k].sequence)) {
                    same = false;
                    break;
                }
            }
        }

        let prev_order: number[] = this._oligosOrder;
        this._oligos = JSON.parse(JSON.stringify(oligos));
        if (order == null) {
            this._oligosOrder = [];
            for (let k = 0; k < this._oligos.length; k++) {
                this._oligosOrder[k] = k;
            }
        } else {
            this._oligosOrder = order.slice();
        }
        this._oligosPaired = num_paired;

        let seq: number[] = this.fullSequence;
        if (seq.length > this._bases.length) {
            let diff: number = (seq.length - this._bases.length);
            for (let k = 0; k < diff; k++) {
                this.createBase();
            }
        }

        let n: number = seq.length;
        for (let k = 0; k < n; k++) {
            this._bases[k].setType(seq[k]);
            this._bases[k].baseIndex = k;
        }

        // if possible, maintain visual consistency
        // (strands "fly" from their previous location in the previous oligo order)
        if (same && JSON.stringify(prev_order) !== JSON.stringify(this._oligosOrder)) {
            let old_x: number[] = [];
            let old_y: number[] = [];
            let idx_map: number[] = this.getOrderMap(prev_order);
            for (let k = 0; k < seq.length; k++) {
                old_x[k] = this._bases[k].x;
                old_y[k] = this._bases[k].y;
            }
            for (let k = 0; k < seq.length; k++) {
                this._bases[idx_map[k]].setXY(old_x[k], old_y[k]);
            }
        }
    }

    public getOligos(): Oligo[] {
        return (this._oligos != null ? JSON.parse(JSON.stringify(this._oligos)) : null);
    }

    public getOrderMap(other_order: number[]): number[] {
        if (this._oligos == null) {
            return null;
        }

        let idx_map: number[] = [];
        let ofs: number[] = [];
        let ii: number = this._sequence.length;
        let jj: number;
        for (jj = 0; jj < this._oligos.length; jj++) {
            ofs[this._oligosOrder[jj]] = ii;
            ii += 1 + this._oligos[this._oligosOrder[jj]].sequence.length;
        }
        for (ii = 0; ii < this._sequence.length; ii++) idx_map[ii] = ii;
        for (jj = 0; jj < this._oligos.length; jj++) {
            let zz: number = (other_order == null ? jj : other_order[jj]);
            let kk: number = ofs[zz];
            let xx: number;
            for (xx = 0; xx <= this._oligos[zz].sequence.length; xx++) {
                idx_map[ii + xx] = kk + xx;
            }
            ii += xx;
        }
        return idx_map;
    }

    public saveMarkersContext(): void {
        if (this._oligos == null) {
            this._prevOligosOrder = null;
        } else if (this._prevOligosOrder == null) {
            this._prevOligosOrder = this._oligosOrder.slice();
        }
    }

    public transformMarkers(): void {
        if (this._prevOligosOrder == null || this._oligosOrder == null || this._prevOligosOrder.length !== this._oligosOrder.length) {
            this._prevOligosOrder = null;
            return;
        }

        let idx_map: number[] = this.getOrderMap(this._prevOligosOrder);
        this._prevOligosOrder = null;

        // base marks
        let indices = this.trackedIndices;
        this.clearTracking();
        let ii: number;
        for (ii = 0; ii < indices.length; ii++) {
            indices[ii].baseIndex = idx_map[indices[ii].baseIndex];
            this.addBaseMark(indices[ii].baseIndex, indices[ii].colors);
        }

        // blue highlights ("magic glue")
        let new_design: boolean[] = [];
        for (ii = 0; ii < this.fullSequenceLength; ii++) {
            new_design[idx_map[ii]] = this._designStruct[ii];
        }
        this._designStruct = new_design;
        this.updateDesignHighlight();
    }

    public setOligo(oligo: number[], mode: number | string = Pose2D.OLIGO_MODE_DIMER, o_name: string = null): void {
        if (oligo == null) {
            this._oligo = null;
            return;
        }

        this._oligo = oligo.slice();
        this._oligoName = o_name;

        // Puzzle JSON encodes oligoMode as a string, for some reason
        this._oligoMode = typeof(mode) === "number" ? mode : Number(mode);

        let seq: number[] = this.fullSequence;
        if (seq.length > this._bases.length) {
            let diff: number = (seq.length - this._bases.length);
            for (let i: number = 0; i < diff; i++) {
                this.createBase();
            }
        }

        let n: number = seq.length;
        for (let k: number = 0; k < n; k++) {
            this._bases[k].setType(seq[k]);
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
        let changed: boolean = (this._oligoPaired !== paired);
        this._oligoPaired = paired;
        if (changed) this.updateScoreNodeGui();
    }

    public get fullSequence(): number[] {
        if (this._oligo == null && this._oligos == null) {
            return this._sequence;
        }
        let seq: number[] = this._sequence.slice();
        if (this._oligos == null) {
            if (this._oligoMode === Pose2D.OLIGO_MODE_EXT5P) {
                seq = this._oligo.concat(seq);
            } else {
                if (this._oligoMode === Pose2D.OLIGO_MODE_DIMER) seq.push(EPars.RNABASE_CUT);
                seq = seq.concat(this._oligo);
            }
            return seq;
        }
        // _oligos != null, we have a multistrand target
        for (let ii: number = 0; ii < this._oligos.length; ii++) {
            seq.push(EPars.RNABASE_CUT);
            seq = seq.concat(this._oligos[this._oligosOrder[ii]].sequence);
        }
        return seq;
    }

    public get fullSequenceLength(): number {
        let len: number = this._sequence.length;
        if (this._oligo == null && this._oligos == null) {
            return len;
        }
        if (this._oligos == null) {
            len += this._oligo.length;
            if (this._oligoMode === Pose2D.OLIGO_MODE_DIMER) len++;
            return len;
        }
        for (let ii: number = 0; ii < this._oligos.length; ii++) {
            len += 1 + this._oligos[ii].sequence.length;
        }
        return len;
    }

    public getStrandName(seqnum: number): string {
        if (this._oligos != null && seqnum >= this._sequence.length) {
            let seq: number[] = this._sequence.slice();
            for (let ii: number = 0; ii < this._oligos.length; ii++) {
                seq.push(EPars.RNABASE_CUT);
                seq = seq.concat(this._oligos[this._oligosOrder[ii]].sequence);
                if (seqnum < seq.length) {
                    let o_name: string = this._oligos[this._oligosOrder[ii]]['name'];
                    if (o_name == null) o_name = "Oligo " + (this._oligosOrder[ii] + 1).toString();
                    return o_name;
                }
            }
        }
        if (this._oligo != null && seqnum >= this._sequence.length) {
            return this._oligoName;
        }
        return null;
    }

    public getBoundSequence(): number[] {
        if (this._oligos == null) {
            return this._sequence;
        }
        let seq: number[] = this._sequence.slice();
        for (let ii: number = 0; ii < this._oligosPaired; ii++) {
            seq.push(EPars.RNABASE_CUT);
            seq = seq.concat(this._oligos[this._oligosOrder[ii]].sequence);
        }
        return seq;
    }

    public set pairs(pairs: number[]) {
        let seq: number[] = this.fullSequence;
        if (pairs.length !== seq.length) {
            log.debug(pairs.length, seq.length);
            throw new Error("Pair length doesn't match sequence length");
        }

        if (EPars.arePairsSame(pairs, this._pairs)) {
            return;
        }

        this._pairs = pairs.slice();

        for (let ii: number = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii) {
                this._pairs[this._pairs[ii]] = ii;
            }
        }

        /// Recompute sequence layout
        this.computeLayout(false);
        this.checkPairs();
        this.updateMolecule();
        this.generateScoreNodes();
    }

    public isPairSatisfied(a: number, b: number): boolean {
        if (b < a) {
            let temp: number = a;
            a = b;
            b = temp;
        }

        if (this._pairs[a] !== b) {
            return false;
        }

        let fullSeq: number[] = this.fullSequence;
        return (EPars.pairType(fullSeq[a], fullSeq[b]) !== 0);
    }

    public get sequenceLength(): number {
        return this._sequence.length;
    }

    public get sequence(): number[] {
        return this._sequence.slice();
    }

    public getSequenceAt(seq: number): number {
        return this._sequence[seq];
    }

    public getBaseAt(seq: number): Base {
        return this._bases[seq];
    }

    public get pairs(): number[] {
        return this._pairs.slice();
    }

    public checkOverlap(): boolean {
        let radius: number = Pose2D.ZOOM_SPACINGS[0];
        let rna_drawer: RNALayout = new RNALayout(radius, radius);
        rna_drawer.setupTree(this._pairs);
        rna_drawer.drawTree();
        let xarray: number[] = new Array(this._bases.length);
        let yarray: number[] = new Array(this._bases.length);
        rna_drawer.getCoords(xarray, yarray);
        for (let ii: number = 0; ii < this._bases.length; ii++) {
            let ax: number = xarray[ii];
            let ay: number = yarray[ii];
            for (let jj: number = ii + 2; jj < this._bases.length; jj++) {
                let bx: number = xarray[jj];
                let by: number = yarray[jj];
                bx = ax - bx;
                by = ay - by;
                if (bx * bx + by * by < radius * radius / 10) {
                    return true;
                }
            }
        }
        return false;
    }

    //highlight the base before the cursor
    public trackCursor(index: number): void {
        this._cursorIndex = index;
        if (this._cursorIndex > 0) {
            let center: Point = this.getBaseXY(this._cursorIndex - 1);
            if (this._cursorBox == null) {
                this._cursorBox = new Graphics();
                this.container.addChild(this._cursorBox);
            }
            this._cursorBox.x = center.x;
            this._cursorBox.y = center.y;
            this._cursorBox.visible = true;
            this._cursorBox.clear();
            this._cursorBox.lineStyle(Pose2D.BASE_TRACK_THICKNESS[this.zoomLevel], Pose2D.COLOR_CURSOR);
            this._cursorBox.drawCircle(0, 0, Pose2D.BASE_TRACK_RADIUS[this.zoomLevel]);
        } else if (this._cursorBox != null) {
            this._cursorBox.destroy({children: true});
            this._cursorBox = null;
        }
    }

    public get trackedCursorIdx(): number {
        return this._cursorIndex;
    }

    /*override*/
    public update(dt: number): void {
        if (!this.display.worldVisible) {
            // update is expensive, so don't bother doing it if we're not visible
            return;
        }

        let current_time: number = this.mode.time;
        for (let anchor of this._anchoredObjects) {
            if (anchor.isLive) {
                let p: Point = this.getBaseXY(anchor.base);
                anchor.object.display.position = new Point(p.x + anchor.offset.x, p.y + anchor.offset.y);
            }
        }

        let fullSeq: number[] = this.fullSequence;
        let center: Point;

        // Hide bases that aren't part of our current sequence
        for (let ii = 0; ii < this._bases.length; ++ii) {
            this._bases[ii].display.visible = ii < fullSeq.length && this._bases[ii].type !== EPars.RNABASE_CUT;
        }

        var basesMoved = false;
        if (this._baseToX) {
            basesMoved = true;
            // Update base locations

            if (this._foldStartTime < 0) {
                this._foldStartTime = current_time;
            }

            let prog = (current_time - this._foldStartTime) / (this._foldDuration);
            let done: boolean = false;

            if (prog >= 1) {
                prog = 1;
                done = true;
                this._offsetTranslating = false;
            }

            if (this._offsetTranslating) {
                this._redraw = true;
                this._offX = prog * this._endOffsetX + (1 - prog) * this._startOffsetX;
                this._offY = prog * this._endOffsetY + (1 - prog) * this._startOffsetY;
            }

            for (let ii = 0; ii < fullSeq.length; ii++) {
                let vx: number = this._baseToX[ii] - this._baseFromX[ii];
                let vy: number = this._baseToY[ii] - this._baseFromY[ii];

                let current_x: number = this._baseFromX[ii] + (vx + (vx * prog)) / 2 * prog;
                let current_y: number = this._baseFromY[ii] + (vy + (vy * prog)) / 2 * prog;

                this._bases[ii].setXY(current_x, current_y);
            }

            if (done) {
                this._baseToX = null;
                this._baseToY = null;
                this._baseFromX = null;
                this._baseFromY = null;

                this.updateScoreNodeGui();

                if (this.checkOverlap()) {
                    // If overlaps have been introduced, make sure the explosion factor input is shown
                    this._explosionFactorPanel.display.visible = true;
                } else if (this._explosionFactorPanel.display.visible == true) {
                    // If all overlaps have been removed, remove the explosion
                    this._explosionFactor = 1;
                    this._explosionFactorPanel.display.visible = false;
                    this.computeLayout(true);
                    this._redraw = true;
                }
            }

        } else {
            if (current_time - this.lastSampledTime > 2 && !this._isExploding) {
                this.lastSampledTime = current_time;

                for (let ii = 0; ii < fullSeq.length; ii++) {
                    if (this._pairs[ii] < 0 && !this._simpleGraphicsMods && Math.random() > 0.7) {
                        this._bases[ii].animate();
                    }
                }
            }
        }

        /// Update score node
        this.updateScoreNodeVisualization(this._offX !== this._prevOffsetX || this._offY !== this._prevOffsetY);

        /// Bitblt rendering
        let need_redraw: boolean = false;

        for (let ii = 0; ii < fullSeq.length && !need_redraw; ii++) {
            need_redraw = need_redraw || this._bases[ii].needRedraw(this._simpleGraphicsMods);
        }

        if (need_redraw || this._redraw) {
            // Create highlight state to pass to bases.
            let hl_state: RNAHighlightState = null;
            if (this._allNewHighlights.length > 0) {
                hl_state = new RNAHighlightState();
                hl_state.nuc = [];
                hl_state.isOn = true;
                for (let existingHighlight of this._allNewHighlights) {
                    hl_state.nuc = hl_state.nuc.concat(existingHighlight.nuc);
                }
            }

            for (let ii = 0; ii < fullSeq.length; ii++) {
                // skip the oligo separator
                if (fullSeq[ii] === EPars.RNABASE_CUT) {
                    continue;
                }

                let use_barcode: boolean = false;
                if (this._barcodes != null && this._barcodes.indexOf(ii) >= 0) {
                    use_barcode = true;
                }

                this._bases[ii].forceUnpaired = (this._forcedStruct != null && this._forcedStruct[ii] === EPars.FORCE_UNPAIRED);

                let drawFlags: number = BaseDrawFlags.builder()
                    .locked(this.isLocked(ii))
                    .letterMode(this._lettermode)
                    .lowPerform(this._simpleGraphicsMods)
                    .useBarcode(use_barcode)
                    .result();

                let numberBitmap: Texture = null;
                if (this._numberingMode && (ii === 0 || (ii + 1) % 5 === 0 || ii === fullSeq.length - 1)) {
                    numberBitmap = BitmapManager.getNumberBitmap(ii + 1);
                }

                this._bases[ii].setDrawParams(this._zoomLevel, this._offX, this._offY, current_time, drawFlags, numberBitmap, hl_state);
            }

            if (this._displayAuxInfo) {
                this.renderAuxInfo();
            }

            if (this._feedbackObjs.length > 0) {
                this.updatePrintFeedback(false);
            }
        }

        this._baseRope._visible = this._baseRopeMode;

        if (this._redraw || basesMoved) {   
            let n: number = this._trackedIndices.length;
            for (let ii = 0; ii < n; ii++) {
                this.drawBaseMark(this._trackedIndices[ii]);
            }

            this._baseRope.redraw( true /* force baseXY*/ );
            // this._baseRope.makeVisibleIfLongSpacings();

            if (this._cursorIndex > 0) {
                center = this.getBaseXY(this._cursorIndex - 1);
                this._cursorBox.x = center.x;
                this._cursorBox.y = center.y;
                this._cursorBox.visible = true;
                this._cursorBox.clear();
                this._cursorBox.lineStyle(Pose2D.BASE_TRACK_THICKNESS[this.zoomLevel], Pose2D.COLOR_CURSOR);
                this._cursorBox.drawCircle(0, 0, Pose2D.BASE_TRACK_RADIUS[this.zoomLevel]);
            }
        }

        this._redraw = false;

        this._moleculeLayer.visible = false;
        if (this._molecularBindingBases != null && this._molecule != null) {
            let mol_x: number = 0;
            let mol_y: number = 0;
            let nbases: number = 0;
            for (let ii = 0; ii < fullSeq.length; ii++) {
                let baseglow: BaseGlow = this._molecularBindingBases[ii];
                if (baseglow != null) {
                    let pos: Point = this._bases[ii].getLastDrawnPos();
                    baseglow.updateView(this._zoomLevel, pos.x, pos.y, current_time);
                    mol_x += pos.x;
                    mol_y += pos.y;
                    nbases += 1;
                }
            }

            if (nbases > 0) {
                mol_x /= nbases;
                mol_y /= nbases;
            }

            if (!this._moleculeIsBound) {
                mol_x = 30;
                mol_y = 200;
            }

            this._molecule.updateView(this._zoomLevel, mol_x, mol_y, current_time);
            this._moleculeLayer.visible = true;
        }

        if (fullSeq.indexOf(EPars.RNABASE_CUT) >= 0) {
            if (this._oligoBases == null) {
                this._oligoBases = new Array(fullSeq.length);
            }

            let bound_len: number = this.getBoundSequence().length;
            for (let ii = fullSeq.indexOf(EPars.RNABASE_CUT) + 1; ii < fullSeq.length; ii++) {
                let baseglow = this._oligoBases[ii];
                if (baseglow == null) {
                    baseglow = new BaseGlow();
                    this._oligoBases[ii] = baseglow;
                }
                if ((this._oligoPaired || (this._oligosPaired > 0 && ii < bound_len)) && this._pairs[ii] >= 0) {
                    baseglow.isWrong = this._restrictedHighlightBox.isInQueue(ii);
                    let pos = this._bases[ii].getLastDrawnPos();
                    baseglow.updateView(this._zoomLevel, pos.x, pos.y, current_time);
                    this._moleculeLayer.visible = true;
                }
            }
        }

        let go_x: number = 0;
        let go_y: number = 0;

        for (let ii = 0; ii < fullSeq.length - 1; ii++) {
            let out_x: number = go_x;
            let out_y: number = go_y;

            if (this._sequence.length < fullSeq.length && ii === this._sequence.length - 1) {
                this._bases[ii].setGoDir(go_x, go_y);
                this._bases[ii].setOutDir(-go_y, go_x);
                this._bases[ii].setLast(true);
                continue;
            }

            go_x = this._bases[ii + 1].x - this._bases[ii].x;
            go_y = this._bases[ii + 1].y - this._bases[ii].y;

            out_x += go_x;
            out_y += go_y;

            if (ii > 0) {
                out_x /= 2.0;
                out_y /= 2.0;
            }

            this._bases[ii].setGoDir(go_x, go_y);
            this._bases[ii].setOutDir(-out_y, out_x);
            this._bases[ii].setLast(false);
        }

        if (fullSeq.length >= 1) {

            this._bases[fullSeq.length - 1].setGoDir(go_x, go_y);
            this._bases[fullSeq.length - 1].setOutDir(-go_y, go_x);
            this._bases[fullSeq.length - 1].setLast(true);

        }

        /// Praise stacks when RNA is not moving
        if (!this._offsetTranslating && this._baseToX == null) {
            if (this._praiseQueue.length > 0) {
                for (let ii = 0; ii < this._praiseQueue.length; ii += 2) {
                    this.onPraiseStack(
                        this._praiseQueue[ii],
                        this._praiseQueue[ii + 1],
                        (ii + 1) === (this._praiseQueue.length - 1));
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
                this._explosionStartTime = current_time;
                this._origOffsetX = this._offX;
                this._origOffsetY = this._offY;
            }

            this._offX = this._origOffsetX + (Math.random() * 2 - 1) * 5;
            this._offY = this._origOffsetY + (Math.random() * 2 - 1) * 5;
            this._redraw = true;

            let prog = (current_time - this._explosionStartTime) * 5;

            if (this._explosionRays.length >= fullSeq.length) {
                for (let ii = 0; ii < Math.min(prog, fullSeq.length); ii++) {
                    const ray = this._explosionRays[ii];

                    if (!ray.display.visible) {
                        ray.display.alpha = 0;
                        ray.display.visible = true;
                        ray.fadeIn();
                    }

                    ray.display.position = this.getBaseXY(ii);
                }
            } else {
                let diff: number = (fullSeq.length - this._explosionRays.length) / this._explosionRays.length;
                let diff_walker: number = 0;
                let ray_walker: number = 0;

                for (let ii = 0; ii < fullSeq.length; ii++) {
                    if (diff_walker < 1) {
                        if (ray_walker >= this._explosionRays.length || ray_walker >= prog) {
                            continue;
                        }

                        const ray = this._explosionRays[ray_walker];
                        if (!ray.display.visible) {
                            ray.display.alpha = 0;
                            ray.display.visible = true;
                            ray.fadeIn();
                        }

                        ray.display.position = this.getBaseXY(ii);
                        ray_walker++;
                        diff_walker += diff;

                    } else {
                        diff_walker -= 1;
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

    public numPairs(satisfied: boolean): number {
        let n: number = 0;
        for (let ii: number = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii && (!satisfied || this.isPairSatisfied(ii, this._pairs[ii]))) {
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
        this._deltaScoreEnergyDisplay.visible = (show && this._scoreFolder != null);
        this._secondaryScoreEnergyDisplay.visible =
            (show && this._scoreFolder != null && this._secondaryScoreEnergyDisplay.hasText);
    }

    public get showExplosionFactor(): boolean {
        return this._explosionFactorPanel.display.visible;
    }

    public set showExplosionFactor(show: boolean) {
        this._explosionFactorPanel.display.visible = show;
    }

    public set scoreFolder(folder: Folder) {
        if (this._scoreFolder != folder) {
            this._scoreFolder = folder;
            this.showTotalEnergy = this._showTotalEnergy;
            this.generateScoreNodes();
        }
    }

    public baseShiftWithCommand(command: number, index: number): void {
        let cmd: any[] = this.parseCommand(command, index);
        if (cmd != null) {
            let parenthesis: string = cmd[0];
            let op: PuzzleEditOp = cmd[1];
            this.baseShift(parenthesis, op, index);
        }
    }

    public baseShift(parenthesis: string, op: PuzzleEditOp, index: number): void {
        let sequence: number[] = this.sequence;
        let locks: boolean[] = this.puzzleLocks;
        let binding_site: boolean[] = this.molecularBindingSite;
        let sequence_backup: number[] = this.sequence;
        let locks_backup: boolean[] = this.puzzleLocks;
        let binding_site_backup: boolean[] = this.molecularBindingSite;
        let pindex: number;

        if (sequence.length > parenthesis.length) {
            sequence = sequence.slice(0, parenthesis.length);
            locks = locks.slice(0, parenthesis.length);
            binding_site = binding_site.slice(0, parenthesis.length);
        }

        for (let ii: number = sequence.length; ii < parenthesis.length; ii++) {
            sequence.push(EPars.RNABASE_ADENINE);
            locks.push(false);
            binding_site.push(false);
        }
        // BASE SHIFTING MODIFIED HERE. Delete comments to apply the changes
        if (op === PuzzleEditOp.ADD_BASE) {
            // Add a base
            let after_index: number[] = sequence.slice(index);
            let after_lock_index: boolean[] = locks.slice(index);
            let after_binding_site_index: boolean[] = binding_site.slice(index);

            sequence[index] = EPars.RNABASE_ADENINE;
            locks[index] = false;
            binding_site[index] = false;

            for (let ii = 0; ii < after_index.length - 1; ii++) {
                sequence[ii + index + 1] = after_index[ii];
                locks[ii + index + 1] = after_lock_index[ii];
                binding_site[ii + index + 1] = after_binding_site_index[ii];
            }
        } else if (op === PuzzleEditOp.ADD_PAIR) {
            // Add a pair
            pindex = this.pairs[index];
            let after_index = sequence.slice(index);
            let after_lock_index = locks.slice(index);
            let after_binding_site_index = binding_site.slice(index);

            sequence[index] = EPars.RNABASE_ADENINE;
            sequence[pindex + 2] = EPars.RNABASE_ADENINE;
            locks[index] = false;
            locks[pindex + 2] = false;
            binding_site[index] = false;
            binding_site[pindex + 2] = false;

            for (let ii = 0; ii < after_index.length - 2; ii++) {
                if (ii + index > pindex) {
                    sequence[ii + index + 2] = after_index[ii];
                    locks[ii + index + 2] = after_lock_index[ii];
                    binding_site[ii + index + 2] = after_binding_site_index[ii];
                } else {
                    sequence[ii + index + 1] = after_index[ii];
                    locks[ii + index + 1] = after_lock_index[ii];
                    binding_site[ii + index + 1] = after_binding_site_index[ii];
                }

            }

        } else if (op === PuzzleEditOp.ADD_CYCLE) {
            // Add a cycle of length 3
            let after_index = sequence.slice(index);
            let after_lock_index = locks.slice(index);
            let after_binding_site_index = binding_site.slice(index);

            sequence[index] = EPars.RNABASE_ADENINE;
            sequence[index + 1] = EPars.RNABASE_ADENINE;
            sequence[index + 2] = EPars.RNABASE_ADENINE;
            sequence[index + 3] = EPars.RNABASE_ADENINE;
            sequence[index + 4] = EPars.RNABASE_ADENINE;

            locks[index] = false;
            locks[index + 1] = false;
            locks[index + 2] = false;
            locks[index + 3] = false;
            locks[index + 4] = false;

            binding_site[index] = false;
            binding_site[index + 1] = false;
            binding_site[index + 2] = false;
            binding_site[index + 3] = false;
            binding_site[index + 4] = false;

            for (let ii = 0; ii < after_index.length - 5; ii++) {
                sequence[ii + index + 5] = after_index[ii];
                locks[ii + index + 5] = after_lock_index[ii];
                binding_site[ii + index + 5] = after_binding_site_index[ii];
            }

        } else if (op === PuzzleEditOp.DELETE_PAIR) {
            // Delete a pair
            pindex = this.pairs[index];
            let after_index = sequence_backup.slice(index + 1);
            let after_lock_index = locks_backup.slice(index + 1);
            let after_binding_site_index = binding_site_backup.slice(index + 1);

            for (let ii = 0; ii < after_index.length - 1; ii++) {
                if (ii + index >= pindex - 1) {
                    sequence[ii + index] = after_index[ii + 1];
                    locks[ii + index] = after_lock_index[ii + 1];
                    binding_site[ii + index] = after_binding_site_index[ii + 1];
                } else {
                    sequence[ii + index] = after_index[ii];
                    locks[ii + index] = after_lock_index[ii];
                    binding_site[ii + index] = after_binding_site_index[ii];
                }
            }

        } else if (op === PuzzleEditOp.DELETE_BASE) {
            // Delete a base
            let after_index = sequence_backup.slice(index + 1);
            let after_lock_index = locks_backup.slice(index + 1);
            let after_binding_site_index = binding_site_backup.slice(index + 1);

            for (let ii = 0; ii < after_index.length; ii++) {
                sequence[ii + index] = after_index[ii];
                locks[ii + index] = after_lock_index[ii];
                binding_site[ii + index] = after_binding_site_index[ii];
            }
        }

        this.sequence = sequence;
        this.puzzleLocks = locks;
        this.molecularStructure = EPars.parenthesisToPairs(parenthesis);
        this.molecularBindingSite = binding_site;
        this.parenthesis = parenthesis;
    }

    public registerPaintTool(paint_color: number, tool: Booster): void {
        this._dynPaintColors.push(paint_color);
        this._dynPaintTools.push(tool);
    }

    public get lastShiftedIndex(): number {
        return this._lastShiftedIndex;
    }

    public get lastShiftedCommand(): number {
        return this._lastShiftedCommand;
    }

    public set parenthesis(parenthesis: string) {
        this._parenthesis = parenthesis;
    }

    public setBaseColor(seq: number, inColor: number): void {
        this._mutatedSequence = this._sequence.slice();
        this._mutatedSequence[seq] = inColor;
        this._bases[seq].setType(inColor, true);

        this._lastColoredIndex = seq;
        this._bases[seq].animate();
        this.doneColoring();
    }

    public forceEditable(b: boolean, edit_list: number[] = null): void {
        this._editable = b;
        this._editable_indices = edit_list;
    }

    private computeLayout(fast: boolean = false): void {
        let fullSeq: number[] = this.fullSequence;

        if (fullSeq.length > this._bases.length) {
            log.debug(fullSeq.length, this._bases.length);
            throw new Error("Sequence length and pose length don't match");
        }

        let n: number = fullSeq.length;
        let x_mid: number = 0;
        let y_mid: number = 0;

        let xarray: number[] = new Array(n);
        let yarray: number[] = new Array(n);

        let rna_drawer: RNALayout;

        let exception_indices: number[] = null;
        if (fullSeq.indexOf(EPars.RNABASE_CUT) >= 0) {
            exception_indices = [];
            exception_indices.push(0);
            let oligo_index: number = -1;
            // array of positions of connectors "&"
            while (fullSeq.indexOf(EPars.RNABASE_CUT, oligo_index + 1) >= 0) {
                oligo_index = fullSeq.indexOf(EPars.RNABASE_CUT, oligo_index + 1);
                exception_indices.push(oligo_index);
            }
        }
        rna_drawer = new RNALayout(
            Pose2D.ZOOM_SPACINGS[this._zoomLevel],
            Pose2D.ZOOM_SPACINGS[this._zoomLevel] * this._explosionFactor,
            exception_indices
        );

        rna_drawer.setupTree(this._pairs);
        rna_drawer.drawTree();
        rna_drawer.getCoords(xarray, yarray);

        if (this._desiredAngle === 90) {
            let tmp = xarray;
            xarray = yarray;
            yarray = tmp;
        }

        let xmin: number = xarray[0];
        let xmax: number = xarray[0];
        let ymin: number = yarray[0];
        let ymax: number = yarray[0];

        for (let ii: number = 0; ii < n; ii++) {
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

        x_mid = (xmax + xmin) / 2.0;
        y_mid = (ymax + ymin) / 2.0;

        this._baseFromX = new Array(n);
        this._baseFromY = new Array(n);
        this._baseToX = new Array(n);
        this._baseToY = new Array(n);

        for (let ii: number = 0; ii < n; ii++) {
            this._baseFromX[ii] = this._bases[ii].x;
            this._baseFromY[ii] = this._bases[ii].y;

            this._baseToX[ii] = xarray[ii] - x_mid;
            this._baseToY[ii] = yarray[ii] - y_mid;
        }

        this._foldStartTime = -1;
        if (fast) {
            this._foldDuration = 0.45;
        } else {
            this._foldDuration = 0.7;
        }
    }

    private printFeedback(dat: any[]): void {
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
        //     this._feedback_objs[ii].graphics.drawRoundRect(0, 0, this._feedback_objs[ii].text_width(), this._feedback_objs[ii].text_height(), 12);
        // }
    }

    private onMouseOut(): void {
        this.clearMouse();
        this.updateScoreNodeGui();
    }

    private deleteBaseWithIndex(index: number): any[] {
        if (this.isTrackedIndex(index)) {
            this.toggleBaseMark(index);
        }

        if (this._pairs[index] < 0 || this.isLocked(this._pairs[index])) {
            return PoseUtil.deleteNopairWithIndex(index, this._pairs);
        } else {
            return PoseUtil.deletePairWithIndex(index, this._pairs);
        }
    }

    private onBaseMouseDown(seqnum: number, togglelock: boolean): void {
        this._lastColoredIndex = seqnum;

        if (!togglelock && this.isEditable(seqnum)) {
            this._coloring = true;
            this._mutatedSequence = this.fullSequence.slice();

            if (this._currentColor === EPars.RNABASE_LOCK) {
                if (!this._locks) {
                    this._locks = [];
                    for (let ii = 0; ii < this._sequence.length; ii++) {
                        this._locks.push(false);
                    }
                }
                this._locks[seqnum] = !this._locks[seqnum];
                this._bases[seqnum].setDirty();
                this._lockUpdated = true;

            } else if (this._currentColor === EPars.RNABASE_BINDING_SITE) {
                if (this._bindingSite != null && this._bindingSite[seqnum]) {
                    this._bindingSite = [];
                    for (let ii = 0; ii < this._sequence.length; ii++) {
                        this._bindingSite.push(false);
                    }
                    this.molecularBindingSite = this._bindingSite;
                    this._bindingSiteUpdated = true;
                } else {
                    let binding_bases: number[] = EPars.isInternal(seqnum, this._pairs);
                    if (binding_bases != null && binding_bases.length > 4) {
                        this._bindingSite = [];
                        for (let ii = 0; ii < this._sequence.length; ii++) {
                            this._bindingSite.push(false);
                        }

                        for (let ii = 0; ii < binding_bases.length; ii++) {
                            this._bindingSite[binding_bases[ii]] = true;
                        }
                        this.molecularBindingSite = this._bindingSite;
                        this._bindingSiteUpdated = true;
                    } else {
                        (this.mode as GameMode).showNotification(
                            "Binding site can be only formed at loops between 2 stacks\n(Internal loops and Bulges)");
                    }
                }

            } else if (this._mouseDownAltKey) {
                if (this.toggleDesignStruct(seqnum)) {
                    this._designStructUpdated = true;
                }
            } else {

                if (!this.isLocked(seqnum)) {

                    if (this._currentColor >= 1 && this._currentColor <= 4) {
                        this._mutatedSequence[seqnum] = this._currentColor;
                        ROPWait.notifyPaint(seqnum, this._bases[seqnum].type, this._currentColor);
                        this._bases[seqnum].setType(this._currentColor, true);
                    } else if (this._currentColor === EPars.RNABASE_RANDOM) {
                        let randbase: number = Math.floor(Math.random() * 4) % 4 + 1;
                        this._mutatedSequence[seqnum] = randbase;
                        this._bases[seqnum].setType(randbase, true)
                    } else if (this._currentColor === EPars.RNABASE_PAIR) {
                        if (this._pairs[seqnum] >= 0) {
                            let pi = this._pairs[seqnum];

                            if (this.isLocked(pi)) {
                                return;
                            }

                            let click_base: number = this._mutatedSequence[seqnum];

                            this._mutatedSequence[seqnum] = this._mutatedSequence[pi];
                            this._mutatedSequence[pi] = click_base;

                            this._bases[seqnum].setType(this._mutatedSequence[seqnum], true);
                            this._bases[pi].setType(this._mutatedSequence[pi], true);
                        }
                    } else if (this._currentColor === EPars.RNABASE_MAGIC) {
                        this._mutatedSequence[seqnum] = this._currentColor;
                        this._bases[seqnum].setType(this._currentColor);
                    } else if (this._currentColor === EPars.RNABASE_AU_PAIR) {
                        if (this._pairs[seqnum] >= 0) {
                            let pi = this._pairs[seqnum];

                            if (this.isLocked(pi)) {
                                return;
                            }

                            this._mutatedSequence[seqnum] = EPars.RNABASE_ADENINE;
                            this._mutatedSequence[pi] = EPars.RNABASE_URACIL;

                            this._bases[seqnum].setType(this._mutatedSequence[seqnum], true);
                            this._bases[pi].setType(this._mutatedSequence[pi], true);
                        }
                    } else if (this._currentColor === EPars.RNABASE_GC_PAIR) {
                        if (this._pairs[seqnum] >= 0) {
                            let pi = this._pairs[seqnum];

                            if (this.isLocked(pi)) {
                                return;
                            }

                            this._mutatedSequence[seqnum] = EPars.RNABASE_GUANINE;
                            this._mutatedSequence[pi] = EPars.RNABASE_CYTOSINE;

                            this._bases[seqnum].setType(this._mutatedSequence[seqnum], true);
                            this._bases[pi].setType(this._mutatedSequence[pi], true);
                        }
                    } else if (this._currentColor === EPars.RNABASE_GU_PAIR) {
                        if (this._pairs[seqnum] >= 0) {
                            let pi = this._pairs[seqnum];

                            if (this.isLocked(pi)) {
                                return;
                            }

                            this._mutatedSequence[seqnum] = EPars.RNABASE_URACIL;
                            this._mutatedSequence[pi] = EPars.RNABASE_GUANINE;

                            this._bases[seqnum].setType(this._mutatedSequence[seqnum], true);
                            this._bases[pi].setType(this._mutatedSequence[pi], true);
                        }
                    } else if (this._dynPaintColors.indexOf(this._currentColor) >= 0) {
                        let index: number = this._dynPaintColors.indexOf(this._currentColor);
                        this._dynPaintTools[index].onPaint(this, seqnum);
                    }
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

        if (this._currentColor === EPars.RNABASE_LOCK) {
            if (!this._locks) {
                this._locks = [];
                for (let ii: number = 0; ii < this._sequence.length; ii++) {
                    this._locks.push(false);
                }
            }
            this._locks[seqnum] = !this._locks[seqnum];
            this._bases[seqnum].setDirty();
            this._lockUpdated = true;

        } else if (this._mouseDownAltKey) {
            if (this.toggleDesignStruct(seqnum)) {
                this._designStructUpdated = true;
            }

        } else {
            if (!this.isLocked(seqnum)) {
                if (this._currentColor >= 1 && this._currentColor <= 4) {
                    this._mutatedSequence[seqnum] = this._currentColor;
                    ROPWait.notifyPaint(seqnum, this._bases[seqnum].type, this._currentColor);
                    this._bases[seqnum].setType(this._currentColor, true);

                } else if (this._currentColor === EPars.RNABASE_RANDOM) {
                    let randbase: number = Math.floor(Math.random() * 4) % 4 + 1;
                    this._mutatedSequence[seqnum] = randbase;
                    this._bases[seqnum].setType(randbase, true)
                } else if (this._currentColor === EPars.RNABASE_PAIR) {
                    if (this._pairs[seqnum] >= 0) {
                        let pi = this._pairs[seqnum];
                        if (this._pairs[seqnum] >= 0) {
                            pi = this._pairs[seqnum];

                            if (this.isLocked(pi)) {
                                return;
                            }

                            let click_base: number = this._mutatedSequence[seqnum];

                            this._mutatedSequence[seqnum] = this._mutatedSequence[pi];
                            this._mutatedSequence[pi] = click_base;

                            this._bases[seqnum].setType(this._mutatedSequence[seqnum], true);
                            this._bases[pi].setType(this._mutatedSequence[pi], true);
                        }
                    }
                } else if (this._currentColor === EPars.RNABASE_MAGIC) {
                    this._mutatedSequence[seqnum] = this._currentColor;
                    this._bases[seqnum].setType(this._currentColor);
                } else if (this._currentColor === EPars.RNABASE_AU_PAIR) {
                    if (this._pairs[seqnum] >= 0) {
                        let pi = this._pairs[seqnum];

                        if (this.isLocked(pi)) {
                            return;
                        }

                        this._mutatedSequence[seqnum] = EPars.RNABASE_ADENINE;
                        this._mutatedSequence[pi] = EPars.RNABASE_URACIL;

                        this._bases[seqnum].setType(this._mutatedSequence[seqnum], true);
                        this._bases[pi].setType(this._mutatedSequence[pi], true);
                    }
                } else if (this._currentColor === EPars.RNABASE_GC_PAIR) {
                    if (this._pairs[seqnum] >= 0) {
                        let pi = this._pairs[seqnum];

                        if (this.isLocked(pi)) {
                            return;
                        }

                        this._mutatedSequence[seqnum] = EPars.RNABASE_GUANINE;
                        this._mutatedSequence[pi] = EPars.RNABASE_CYTOSINE;

                        this._bases[seqnum].setType(this._mutatedSequence[seqnum], true);
                        this._bases[pi].setType(this._mutatedSequence[pi], true);
                    }
                } else if (this._currentColor === EPars.RNABASE_GU_PAIR) {
                    if (this._pairs[seqnum] >= 0) {
                        let pi = this._pairs[seqnum];

                        if (this.isLocked(pi)) {
                            return;
                        }

                        this._mutatedSequence[seqnum] = EPars.RNABASE_URACIL;
                        this._mutatedSequence[pi] = EPars.RNABASE_GUANINE;

                        this._bases[seqnum].setType(this._mutatedSequence[seqnum], true);
                        this._bases[pi].setType(this._mutatedSequence[pi], true);
                    }
                } else if (this._dynPaintColors.indexOf(this._currentColor) >= 0) {
                    let index: number = this._dynPaintColors.indexOf(this._currentColor);
                    this._dynPaintTools[index].onPainting(this, seqnum);
                }
            }
        }
        this._lastColoredIndex = seqnum;
        this._bases[seqnum].animate();
    }

    private updateDesignHighlight(): void {
        let elems: number[] = this.designSegments;
        if (elems.length === 0) {
            this._selectionHighlightBox.clear();
        } else {
            this._selectionHighlightBox.setHighlight(HighlightType.DESIGN, elems);
            this._selectionHighlightBox.isOn = false;
        }
    }

    private updateShiftHighlight(): void {
        if (this._shiftStart < 0) {
            this._shiftHighlightBox.clear();
        } else {
            this._shiftHighlightBox.setHighlight(HighlightType.SHIFT, this._shiftEnd < this._shiftStart ? [this._shiftEnd, this._shiftStart] : [this._shiftStart, this._shiftEnd]);
            this._shiftHighlightBox.isOn = false;
        }
    }

    private static drawEnergyHighlight(hilite: Graphics, energy: Sprite): Graphics {
        // Draw highlight around the energy reading.
        // Give it a bit of padding so the highlight isn't so tight.
        const PADDING: number = 2;
        return hilite.clear()
            .lineStyle(1, 0xFFFFFF, 0.7)
            .drawRoundedRect(
                energy.x - PADDING, energy.y - PADDING,
                energy.width + PADDING, energy.height + PADDING, 10);
    }

    private updateEnergyHighlight(energy: Sprite, idx: number, vis: boolean): void {
        if (idx >= this._energyHighlights.length) {
            if (!this._highlightEnergyText) {
                return;
            }

            let obj = new SceneObject(Pose2D.drawEnergyHighlight(new Graphics(), energy));
            obj.display.alpha = 0;
            obj.addObject(new RepeatingTask((): SerialTask => {
                return new SerialTask(
                    new AlphaTask(1, 0.5),
                    new AlphaTask(0, 0.5)
                )
            }));

            this.addObject(obj, this.container);
            this._energyHighlights.push(obj);

        } else {
            let obj = this._energyHighlights[idx];
            obj.display.visible = vis;
            Pose2D.drawEnergyHighlight(obj.display as Graphics, energy);
        }
    }

    private clearEnergyHighlights(): void {
        for (let obj of this._energyHighlights) {
            obj.destroySelf();
        }

        this._energyHighlights = [];
    }

    private renderAuxInfo(): void {
        this._auxInfoCanvas.clear();

        if (!this._displayAuxInfo || this._auxInfo == null || !this._auxInfo[Pose2D.CLEAVING_SITE]) {
            return;
        }

        let cleaving_site: number = this._auxInfo[Pose2D.CLEAVING_SITE];
        if (cleaving_site < this._bases.length - 1) {
            let b_x: number = this._bases[cleaving_site].x + this._offX;
            let b_y: number = this._bases[cleaving_site].y + this._offY;

            let b_next_x: number = this._bases[cleaving_site + 1].x + this._offX;
            let b_next_y: number = this._bases[cleaving_site + 1].y + this._offY;

            let c_x: number = (b_x + b_next_x) / 2.0;
            let c_y: number = (b_y + b_next_y) / 2.0;

            let go_x: number = b_next_y - b_y;
            let go_y: number = -(b_next_x - b_x);

            this._auxInfoCanvas.lineStyle(3, 0xFF0000, 0.9);
            this._auxInfoCanvas.moveTo(c_x + go_x / 2.0, c_y + go_y / 2.0);
            this._auxInfoCanvas.lineTo(c_x - go_x / 2.0, c_y - go_y / 2.0);

            this._auxTextballoon.display.position = new Point(c_x + go_x / 2.0, c_y + go_y / 2.0);
        }
    }

    private checkPairs(): void {
        let fullSeq: number[] = this.fullSequence;

        for (let ii: number = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] >= 0 && this.isPairSatisfied(ii, this._pairs[ii])) {

                let pair_str: number = Pose2D.getPairStrength(fullSeq[ii], fullSeq[this._pairs[ii]]);

                if (this._baseToX) {
                    this._bases[ii].setPairing(true,
                        this._baseToX[this._pairs[ii]] - this._baseToX[ii],
                        this._baseToY[this._pairs[ii]] - this._baseToY[ii],
                        0.5, pair_str);
                } else {
                    this._bases[ii].setPairing(true,
                        this._bases[this._pairs[ii]].x - this._bases[ii].x,
                        this._bases[this._pairs[ii]].y - this._bases[ii].y,
                        0.5, pair_str);
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

            if (this._scoreNodeIndex >= 0 && this._scoreNodes[this._scoreNodeIndex] != null) {
                this._scoreNodeHighlight.lineStyle(0, 0, 0);
                this._scoreNodeHighlight.beginFill(0xFFFFFF, 0.22);
                let indices: number[] = this._scoreNodes[this._scoreNodeIndex].baseIndices;

                for (let ii: number = 0; ii < indices.length; ii++) {
                    let p: Point = this.getBaseXY(indices[ii]);

                    if (ii === 0) {
                        this._scoreNodeHighlight.moveTo(p.x, p.y);
                    } else {
                        this._scoreNodeHighlight.lineTo(p.x, p.y);
                    }
                }
                this._scoreNodeHighlight.endFill();
            }
            this._lastScoreNodeIndex = this._scoreNodeIndex;
        }

        if (this._scoreTexts != null) {
            for (let ii = 0; ii < this._scoreNodes.length; ii++) {
                let indices: number[] = this._scoreNodes[ii].baseIndices;
                let x_avg: number = 0;
                let y_avg: number = 0;

                for (let jj: number = 0; jj < indices.length; jj++) {
                    let p: Point = this.getBaseXY(indices[jj]);
                    x_avg += p.x;
                    y_avg += p.y;
                }

                if (indices.length > 0) {
                    x_avg /= indices.length;
                    y_avg /= indices.length;
                }

                x_avg -= this._scoreTexts[ii].width / 2;
                y_avg -= this._scoreTexts[ii].height / 2;

                this._scoreTexts[ii].position = new Point(x_avg, y_avg);
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
            let totalScore: number = 0;
            let nodeFound: boolean = false;
            let nodeTxt: string = "";
            let nodeLabel: string = "";
            let nodeScore: string = "";

            if (this._poseField.containsPoint(Flashbang.globalMouse.x, Flashbang.globalMouse.y)) {
                let mouse_p: Point = this.display.toLocal(Flashbang.globalMouse, undefined, Pose2D.MOUSE_LOC);
                let base_xys: Point[] = [];

                for (let ii: number = 0; ii < this.fullSequenceLength; ii++) {
                    base_xys.push(this.getBaseXY(ii));
                }
                for (let ii = 0; ii < this._scoreNodes.length; ii++) {
                    let base_indices: number[] = this._scoreNodes[ii].baseIndices;
                    let node_points: Point[] = [];

                    for (let jj: number = 0; jj < base_indices.length; jj++) {
                        node_points.push(base_xys[base_indices[jj]]);
                    }

                    if (!nodeFound && Utility.isPointWithin(mouse_p, node_points)) {
                        nodeTxt = this._scoreNodes[ii].text;
                        nodeLabel = this._scoreNodes[ii].textLabel;
                        nodeScore = this._scoreNodes[ii].textScore;
                        nodeFound = true;
                        this._scoreNodeIndex = ii;
                    }
                }
            }

            for (let scoreNode of this._scoreNodes) {
                totalScore += scoreNode.score;
            }

            let scoreLabel = "Total";
            let scoreScore = "";
            let factor: number = 0;
            if ((this._molecularBindingBases != null) ||
                (this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_DIMER) ||
                (this._oligos != null)) {

                let label_elems: string[] = [];
                let score_elems: string[] = [];

                if (this._molecularBindingBases != null) {
                    factor++;
                    if (this._moleculeIsBoundReal) {
                        label_elems.push(EnergyScoreDisplay.green("Molecule Bound"));
                        // Round to 2 decimal places
                        let bonus = Math.round(this._molecularBindingBonus * 1e2) / 1e2;
                        score_elems.push(EnergyScoreDisplay.green(` ${bonus} kcal`));
                    } else {
                        label_elems.push(EnergyScoreDisplay.grey("Molecule Not Bound"));
                        score_elems.push(EnergyScoreDisplay.grey(" (0 kcal)"));
                    }
                }
                if (this._oligo != null && this._oligoMode === Pose2D.OLIGO_MODE_DIMER) {
                    factor++;
                    let malus: number = this._duplexCost + Math.round(this._oligoMalus);
                    if (this._oligoPaired) {
                        label_elems.push(EnergyScoreDisplay.green("Oligo Bound"));
                        score_elems.push(EnergyScoreDisplay.red(` ${malus.toFixed(2)} kcal`));
                    } else {
                        label_elems.push(EnergyScoreDisplay.grey("Oligo Not Bound"));
                        score_elems.push(EnergyScoreDisplay.grey(` ${malus.toFixed(2)} kcal`));
                    }
                }
                if (this._oligos != null) {
                    factor++;
                    if (this._oligosPaired === 0) {
                        if (this._oligos.length > 1) {
                            label_elems.push(EnergyScoreDisplay.grey("No Oligo Bound"));
                        } else {
                            label_elems.push(EnergyScoreDisplay.grey("Oligo Not Bound"));
                        }
                        score_elems.push(EnergyScoreDisplay.grey(" (0 kcal)"));
                    } else {
                        let malus = this._duplexCost;
                        for (let ii = 0; ii < this._oligosPaired; ii++) {
                            malus += Math.round(this._oligos[this._oligosOrder[ii]].malus);
                        }
                        if (this._oligosPaired > 1) {
                            label_elems.push(EnergyScoreDisplay.green("Oligos Bound"));
                        } else {
                            label_elems.push(EnergyScoreDisplay.green("Oligo Bound"));
                        }
                        score_elems.push(EnergyScoreDisplay.red(` ${malus.toFixed(2)} kcal`));
                    }
                }

                scoreLabel += EnergyScoreDisplay.grey(" (") + label_elems.join(", ") + EnergyScoreDisplay.grey(")");
                scoreScore = (totalScore / 100).toString() + score_elems.join("");

            } else {
                scoreScore = (totalScore / 100).toString() + " kcal";
            }
            this.updateEnergyDisplaySizeLocation(factor);

            this._primaryScoreEnergyDisplay.setEnergyText(scoreLabel, scoreScore);
            this._secondaryScoreEnergyDisplay.setEnergyText(nodeLabel, nodeScore);
            this._secondaryScoreEnergyDisplay.visible = (this._showTotalEnergy && nodeFound);

            // This is because the undo stack isn't populated yet when this is run on puzzle boot/changing folders,
            // which is needed for the delta - TODO: Handle this in a less hacky way
            let attemptSetDelta = () => {
                try {
                    this._deltaScoreEnergyDisplay.setEnergyText(
                        "Natural/Target Delta",
                        Math.round(this._getEnergyDelta()) / 100 + " kcal"
                    );
                } catch (e) {
                    setTimeout(attemptSetDelta, 1000);
                }
            }
            setTimeout(attemptSetDelta, 50);
        }
    }

    private updateEnergyDisplaySizeLocation(factor: number): void {
        this._primaryScoreEnergyDisplay.position = new Point(17, 118);
        this._primaryScoreEnergyDisplay.setSize(111 + factor * 59, 40);

        this._deltaScoreEnergyDisplay.position = new Point(17 + 119 + factor * 59, 118)
        this._deltaScoreEnergyDisplay.setSize(111, 40);

        this._secondaryScoreEnergyDisplay.position = new Point(17 + 119*2 + factor * 59, 118);
        this._secondaryScoreEnergyDisplay.setSize(111, 40);
    }

    private clearScoreTexts(): void {
        if (this._scoreTexts != null) {
            for (let score_text of this._scoreTexts) {
                score_text.destroy({children: true});
            }
            this._scoreTexts = null;
        }
    }

    private generateScoreNodes(): void {
        this._scoreNodes = null;
        this._scoreNodeHighlight.clear();
        this.clearEnergyHighlights();

        if (this._scoreFolder == null ||
            this._sequence == null ||
            this._sequence.length === 0 ||
            this._pairs == null ||
            this._pairs.length !== this.fullSequenceLength) {

            this.clearScoreTexts();
            return;
        }

        /// JEE : It's a bit of waste to generate RNALayout twice (once here, once when drawing rna)
        /// But this is cheap, so it shouldn't matter too much
        let score_tree: RNALayout = new RNALayout;
        score_tree.setupTree(this.satisfiedPairs);

        let treeroot: RNATreeNode = score_tree.root;
        score_tree.scoreTree(this.fullSequence, this._scoreFolder);

        let score_nodes: ScoreDisplayNode[] = [];
        let root_coords: number[] = [];
        this.generateScoreNodesRecursive(treeroot, root_coords, score_nodes);
        this._scoreNodes = score_nodes;

        this.clearScoreTexts();
        if (this._displayScoreTexts) {
            this._scoreTexts = [];
            for (let scoreNode of this._scoreNodes) {
                let scoreText = new Sprite(BitmapManager.getTextBitmap(scoreNode.scoreString, scoreNode.scoreColor));
                scoreText.visible = false;
                this._scoreTexts.push(scoreText);
                this.container.addChild(scoreText);
            }
        }

        this.updateScoreNodeGui();
    }

    private generateScoreNodesRecursive(root: RNATreeNode, coords: number[], nodes: ScoreDisplayNode[]): void {
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

        let child_coords: number[];

        if (root.isPair) {
            if (root.children.length > 1) {
                throw new Error("Something's wrong with score tree");
            }

            if (root.children.length !== 0) {
                if (root.children[0].isPair) {
                    child_coords = [];

                    child_coords.push(root.indexA);
                    child_coords.push(root.indexB);

                    child_coords.push(root.children[0].indexB);
                    child_coords.push(root.children[0].indexA);

                    let newnode = new ScoreDisplayNode();
                    nodes.push(newnode);
                    newnode.setType(ScoreDisplayNodeType.STACK, child_coords, root.score);

                    this.generateScoreNodesRecursive(root.children[0], null, nodes);
                } else {
                    child_coords = [];

                    child_coords.push(root.indexB);
                    child_coords.push(root.indexA);

                    this.generateScoreNodesRecursive(root.children[0], child_coords, nodes);
                }
            }

        } else {
            for (let child of root.children) {
                this.generateScoreNodesRecursive(child, coords, nodes);
            }

            if (coords != null) {
                let newnode = new ScoreDisplayNode();
                nodes.push(newnode);

                newnode.setType(ScoreDisplayNodeType.LOOP, coords, root.score);
            }
        }
    }

    private isEditable(seqnum: number): boolean {
        if (this._editable_indices != null) {
            let in_list: boolean = (this._editable_indices.indexOf(seqnum) !== -1);
            return this._editable ? in_list : !in_list;
        } else {
            return this._editable;
        }
    }

    private createBase(): Base {
        let base: Base = new Base(this, EPars.RNABASE_GUANINE);
        this.addObject(base, this._baseLayer);
        this._bases.push(base);
        return base;
    }

    private static createDefaultLocks(sequenceLength: number): boolean[] {
        let locks: boolean[] = new Array<boolean>(sequenceLength);
        for (let ii = 0; ii < sequenceLength; ++ii) {
            locks[ii] = false;
        }
        return locks;
    }

    private static getPairStrength(s1: number, s2: number): number {
        if (Pose2D.isPair(s1, s2, EPars.RNABASE_ADENINE, EPars.RNABASE_URACIL)) {
            return 2;
        } else if (Pose2D.isPair(s1, s2, EPars.RNABASE_GUANINE, EPars.RNABASE_URACIL)) {
            return 1;
        } else if (Pose2D.isPair(s1, s2, EPars.RNABASE_GUANINE, EPars.RNABASE_CYTOSINE)) {
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

    /// Array of sequence/pairs
    private _sequence: number[] = [];
    private _mutatedSequence: number[];
    private _pairs: number[] = [];
    private _bases: Base[] = [];
    private _locks: boolean[] = [];
    private _forcedStruct: number[] = [];
    private _designStruct: boolean[] = [];
    private _bindingSite: boolean[];
    private _molecularBindingBases: BaseGlow[] = null;
    private _molecularBindingPairs: number[] = null;
    private _molecule: Molecule = null;
    private _moleculeIsBound: boolean = false;
    private _moleculeIsBoundReal: boolean = false;
    private _molecularBindingBonus: number = 0;
    private _moleculeTargetPairs: number[];
    private _parenthesis: string;
    private _shiftLimit: number;

    /// Oligos
    private _oligo: number[] = null;
    private _oligoMode: number = Pose2D.OLIGO_MODE_DIMER;
    private _oligoName: string = null;
    private _duplexCost: number = EPars.DUPLEX_INIT; // total for all strands
    private _oligoMalus: number = 0; // concentration related penalty
    private _oligoBases: BaseGlow[] = null; // for glows
    private _oligoPaired: boolean = false;

    /// Multistrands
    private _oligos: Oligo[] = null;
    private _oligosOrder: number[] = null;
    private _prevOligosOrder: number[];
    private _oligosPaired: number = 0;
    private _strandLabel: TextBalloon;

    private _barcodes: number[];
    private _moleculeLayer: Container;

    private _coloring: boolean = false;
    private _currentColor: number = EPars.RNABASE_URACIL;
    private _lastColoredIndex: number;
    private _lockUpdated: boolean;
    private _bindingSiteUpdated: boolean;
    private _designStructUpdated: boolean;

    // Rope connecting bases for crazy user-defined layouts
    private _baseRope: BaseRope;

    /// Scripted painters
    private _dynPaintColors: number[] = [];
    private _dynPaintTools: Booster[] = [];

    /// Is this pose editable?
    private _editable: boolean;
    private _editable_indices: number[] = null;

    /// Pointer to callback function to be called after change in pose
    private _poseEditCallback: () => void = null;
    private _trackMovesCallback: (count: number, moves: any[]) => void = null;
    private _addBaseCallback: (parenthesis: string, op: PuzzleEditOp, index: number) => void;
    private _startMousedownCallback: PoseMouseDownCallback;
    private _mouseDownAltKey: boolean = false;

    /// Pointer to function that needs to be called in a GameMode to have access to appropriate state
    private _getEnergyDelta: () => number;

    private _lettermode: boolean = false;
    private _displayScoreTexts: boolean;

    private _redraw: boolean = true;

    /// Time which we sampled bases to animate last time;
    private lastSampledTime: number = -1;

    /// Pose position offset
    private _offX: number = 0;
    private _offY: number = 0;
    private _prevOffsetX: number = 0;
    private _prevOffsetY: number = 0;
    private _offsetTranslating: boolean;
    private _startOffsetX: number;
    private _startOffsetY: number;
    private _endOffsetX: number;
    private _endOffsetY: number;

    /// For base moving animation
    private _baseFromX: number[];
    private _baseFromY: number[];
    private _baseToX: number[];
    private _baseToY: number[];
    private _foldStartTime: number;
    private _foldDuration: number;
    private _paintCursor: PaintCursor;

    private _zoomLevel: number = 0;
    private _desiredAngle: number = 0;

    /// Is explosion animation on going?
    private _isExploding: boolean = false;
    private _explosionStartTime: number = -1;
    private _explosionRays: LightRay[];
    private _origOffsetX: number;
    private _origOffsetY: number;

    private _onExplosionComplete: () => void;

    /// Selection box
    private _selectionHighlightBox: HighlightBox;
    private _restrictedHighlightBox: HighlightBox;
    private _highlightRestricted: boolean = false;
    private _unstableHighlightBox: HighlightBox;
    private _forcedHighlightBox: HighlightBox;
    private _userDefinedHighlightBox: HighlightBox;
    private _shiftHighlightBox: HighlightBox;
    private _shiftStart: number = -1;
    private _shiftEnd: number = -1;

    /// For praising stacks
    private _praiseQueue: number[] = [];
    private _praiseSeq: number[] = [];

    /// Score display nodes
    private _scoreNodes: ScoreDisplayNode[];
    private _scoreTexts: Sprite[];
    private _scoreFolder: Folder;
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

    /// For tracking a base
    private _trackedIndices: { baseIndex: number, colors: number[], markBox: Graphics }[] = [];
    private _cursorIndex: number = 0;
    private _cursorBox: Graphics = null;
    private _lastShiftedIndex: number = -1;
    private _lastShiftedCommand: number = -1;

    /// Rendering mode
    private _numberingMode: boolean = false;
    private _baseRopeMode: boolean = false;
    private _simpleGraphicsMods: boolean = false;

    /// Last exp paint data
    private _expPainter: ExpPainter = null;
    private _expMid: number = 0;
    private _expHi: number = 0;
    private _expContinuous: boolean = false;
    private _expExtendedScale: boolean = false;
    private _displayAuxInfo: boolean;
    private _auxInfo: any;
    private _auxInfoCanvas: Graphics;
    private _auxTextballoon: TextBalloon;

    private _feedbackObjs: SceneObject[] = [];
    private _feedbackObjsNum: number;
    private _feedbackObjsStartInd: number;

    private _anchoredObjects: RNAAnchorObject[] = [];
    private _highlightEnergyText: boolean = false;
    private _energyHighlights: SceneObject[] = [];
    /*
	 * NEW HIGHLIGHT.
	 * 	- Input: List of nucleotides that we wish to highlight.
	 * 	- Unhighlighted Nucleotides: Draw at 65% opacity.
	 *	- Highlight Nucleotides: Brighten glow around the nucleotide.
	 */
    private _allNewHighlights: RNAHighlightState[] = [];

    private static readonly CLEAVING_SITE = "cleaving_site";

    private static readonly P: Point = new Point();
}

export interface Oligo {
    malus: number;
    name: string;
    sequence: number[];
}

export class RNAHighlightState {
    public nuc: number[] = null;  // nucleotides
    public isOn: boolean = false;
}
