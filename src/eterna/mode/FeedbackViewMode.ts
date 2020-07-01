import * as log from 'loglevel';
import {DisplayObject, Point, Text} from 'pixi.js';
import Constants from 'eterna/Constants';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import Feedback from 'eterna/Feedback';
import UndoBlock from 'eterna/UndoBlock';
import Solution from 'eterna/puzzle/Solution';
import Puzzle from 'eterna/puzzle/Puzzle';
import Background from 'eterna/vfx/Background';
import Fonts from 'eterna/util/Fonts';
import Toolbar, {ToolbarType} from 'eterna/ui/Toolbar';
import PoseField from 'eterna/pose2D/PoseField';
import FolderManager from 'eterna/folding/FolderManager';
import Vienna from 'eterna/folding/Vienna';
import {
    VAlign, HAlign, DisplayUtil, KeyboardEventType, KeyCode, Assert
} from 'flashbang';
import EternaViewOptionsDialog, {EternaViewOptionsMode} from 'eterna/ui/EternaViewOptionsDialog';
import Utility from 'eterna/util/Utility';
import SpecBoxDialog from 'eterna/ui/SpecBoxDialog';
import Folder from 'eterna/folding/Folder';
import URLButton from 'eterna/ui/URLButton';
import GameMode from './GameMode';

enum PoseFoldMode {
    ESTIMATE = 'ESTIMATE',
    TARGET = 'TARGET',
}

export default class FeedbackViewMode extends GameMode {
    constructor(solution: Solution, puzzle: Puzzle) {
        super();
        this._solution = solution;
        this._puzzle = puzzle;
    }

    public get isOpaque(): boolean { return true; }
    public get puzzleID(): number { return this._puzzle.nodeID; }
    public get solutionID(): number { return this._solution.nodeID; }

    protected setup(): void {
        super.setup();

        let background = new Background();
        this.addObject(background, this.bgLayer);

        this._puzzleTitle = Fonts.arial(this._puzzle.getName(false), 14).color(0xffffff).bold().build();
        this._puzzleTitle.position = new Point(33, 8);
        this.uiLayer.addChild(this._puzzleTitle);

        this._title = Fonts.arial('', 12).color(0xffffff).bold().build();
        this._title.position = new Point(33, 30);
        this.uiLayer.addChild(this._title);

        this._homeButton = GameMode.createHomeButton();
        this._homeButton.hideWhenModeInactive();
        this.addObject(this._homeButton, this.uiLayer);

        this._toolbar = new Toolbar(ToolbarType.FEEDBACK, {states: this._puzzle.getSecstructs().length});
        this.addObject(this._toolbar, this.uiLayer);

        Assert.assertIsDefined(this._toolbar.zoomOutButton);
        this._toolbar.zoomOutButton.clicked.connect(() => {
            for (let poseField of this._poseFields) {
                poseField.zoomOut();
            }
        });

        Assert.assertIsDefined(this._toolbar.zoomInButton);
        this._toolbar.zoomInButton.clicked.connect(() => {
            for (let poseField of this._poseFields) {
                poseField.zoomIn();
            }
        });

        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()));
        this._toolbar.viewSolutionsButton.clicked.connect(() => this.loadDesignBrowser());
        this._toolbar.viewOptionsButton.clicked.connect(() => this.showViewOptionsDialog());
        this._toolbar.letterColorButton.clicked.connect(() => this.showBaseColors());
        this._toolbar.expColorButton.clicked.connect(() => this.showExperimentalColors());
        this._toolbar.specButton.clicked.connect(() => this.showSpec());
        this._toolbar.pipButton.clicked.connect(() => this.togglePip());
        this._toolbar.estimateButton.clicked.connect(() => this.setToEstimateMode());
        this._toolbar.targetButton.clicked.connect(() => this.setToTargetMode());

        this._feedback = this._solution.expFeedback;
        this._targetConditions = this._puzzle.targetConditions;

        this._foldMode = PoseFoldMode.TARGET;

        this._isExpColor = false;
        this._currentIndex = 0;

        this._sequence = EPars.stringToSequence(this._solution.sequence);

        let secstructs: string[] = this._puzzle.getSecstructs();
        let poseFields: PoseField[] = [];
        for (let ii = 0; ii < secstructs.length; ii++) {
            let secs: string = secstructs[ii];
            if (secs != null && secs.length !== this._sequence.length) {
                log.warn(
                    "Solution secondary structure and sequence length doesn't match",
                    secs.length,
                    this._sequence.length
                );
                if (secs.length < this._sequence.length) {
                    let diff: number = this._sequence.length - secs.length;
                    for (let jj = 0; jj < diff; ++jj) {
                        secs += '.';
                    }
                } else {
                    secs = secs.slice(0, this._sequence.length);
                }
                secstructs[ii] = secs;
            }
            this._pairs.push(EPars.parenthesisToPairs(secstructs[ii]));
            let datablock: UndoBlock = new UndoBlock(this._sequence);
            datablock.setPairs(this._pairs[ii]);
            let vienna: Folder | null = FolderManager.instance.getFolder(Vienna.NAME);
            if (!vienna) {
                throw new Error("Critical error: can't create a Vienna folder instance by name");
            }
            datablock.setBasics(vienna);
            this._undoBlocks.push(datablock);

            let poseField: PoseField = new PoseField(false);
            this.addObject(poseField, this.poseLayer);

            poseField.pose.scoreFolder = vienna;
            poseField.pose.sequence = this._sequence;
            poseField.pose.pairs = this._pairs[ii];
            poseFields.push(poseField);
        }

        this.setPoseFields(poseFields);

        this.setupShape();

        let seeShape: boolean = (this._feedback !== null && this._feedback.getShapeData() != null);
        if (seeShape) {
            this.showExperimentalColors();
        }

        this.scoreFeedback();
        this.changeTarget(0);
        this.setPip(false);

        this.updateUILayout();
    }

    public onResized(): void {
        this.updateUILayout();
        super.onResized();
    }

    private updateUILayout(): void {
        DisplayUtil.positionRelativeToStage(
            this._toolbar.display, HAlign.CENTER, VAlign.BOTTOM,
            HAlign.CENTER, VAlign.BOTTOM, 20, -20
        );

        DisplayUtil.positionRelativeToStage(
            this._homeButton.display, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, 0, 5
        );
    }

    private showViewOptionsDialog(): void {
        this.showDialog(new EternaViewOptionsDialog(EternaViewOptionsMode.LAB));
    }

    public onKeyboardEvent(e: KeyboardEvent): void {
        let handled: boolean = this.keyboardInput.handleKeyboardEvent(e);

        if (!handled && e.type === KeyboardEventType.KEY_DOWN) {
            let key = e.code;
            let ctrl = e.ctrlKey;

            if (!ctrl && key === KeyCode.KeyN) {
                Eterna.settings.showNumbers.value = !Eterna.settings.showNumbers.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.KeyG) {
                Eterna.settings.displayFreeEnergies.value = !Eterna.settings.displayFreeEnergies.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.KeyS) {
                this.showSpec();
                handled = true;
            }
        }

        if (handled) {
            e.stopPropagation();
        }
    }

    /* override */
    protected onSetPip(pipMode: boolean): void {
        if (pipMode) {
            if (this._toolbar.stateToggle != null) {
                this._toolbar.stateToggle.display.visible = false;
            }

            if (this._foldMode === PoseFoldMode.ESTIMATE) {
                this.setToEstimateMode();
            } else {
                this.setToTargetMode();
            }

            let minZoom = -1;
            for (let pose of this._poses) {
                minZoom = Math.max(minZoom, pose.computeDefaultZoomLevel());
            }

            for (let ii = 0; ii < this._poses.length; ii++) {
                let field: PoseField = this._poseFields[ii];
                if (this._targetConditions[ii] != null) {
                    if (this._targetConditions[ii]['type'] === 'aptamer') {
                        field.pose.setMolecularBinding(
                            this._targetConditions[ii]['site'],
                            this._targetConditions[ii]['binding_pairs'],
                            this._targetConditions[ii]['bonus'] / 100.0
                        );
                    } else {
                        field.pose.setMolecularBinding(null, null, null);
                    }
                } else {
                    field.pose.setMolecularBinding(null, null, 0);
                }
            }

            for (let pose of this._poses) {
                pose.setZoomLevel(minZoom, true, true);
            }

            if (this._isExpColor) {
                this.showExperimentalColors();
            }
        } else {
            if (this._toolbar.stateToggle != null) {
                this._toolbar.stateToggle.display.visible = true;
            }

            this.changeTarget(this._currentIndex);
            let pose = this._poses[0];
            pose.setZoomLevel(pose.computeDefaultZoomLevel(), true, true);
        }
    }

    protected createScreenshot(): ArrayBuffer {
        let visibleState: Map<DisplayObject, boolean> = new Map();
        let pushVisibleState = (disp: DisplayObject) => {
            visibleState.set(disp, disp.visible);
            disp.visible = false;
        };

        pushVisibleState(this.bgLayer);
        pushVisibleState(this.uiLayer);
        pushVisibleState(this.dialogLayer);
        pushVisibleState(this.achievementsLayer);

        let energyVisible: boolean[] = [];
        for (let pose of this._poses) {
            energyVisible.push(pose.showTotalEnergy);
            pose.showTotalEnergy = false;
        }

        Assert.assertIsDefined(this.container);
        let tempBG = DisplayUtil.fillStageRect(0x061A34);
        this.container.addChildAt(tempBG, 0);

        let info = `Designer: ${this._solution.playerName}\n`
            + `Design ID: ${this._solution.nodeID}\n`
            + `Design Title: ${this._solution.title}\n`;
        let infoText = Fonts.arial(info).color(0xffffff).build();
        this.container.addChild(infoText);

        DisplayUtil.positionRelativeToStage(
            infoText, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, -3, 3
        );

        let pngData = DisplayUtil.renderToPNG(this.container);

        tempBG.destroy({children: true});
        infoText.destroy({children: true});

        for (let [disp, wasVisible] of visibleState.entries()) {
            disp.visible = wasVisible;
        }

        for (let ii = 0; ii < this._poses.length; ++ii) {
            this._poses[ii].showTotalEnergy = energyVisible[ii];
        }

        return pngData;
    }

    private setToTargetMode(): void {
        this._foldMode = PoseFoldMode.TARGET;
        this._toolbar.targetButton.hotkey();
        this._toolbar.estimateButton.hotkey(KeyCode.Space);
        this._toolbar.estimateButton.toggled.value = false;
        this._toolbar.targetButton.toggled.value = true;
        if (this._isPipMode) {
            for (let ii = 0; ii < this._pairs.length; ii++) {
                this._poseFields[ii].pose.pairs = this._pairs[ii];
            }
        } else {
            this._poseFields[0].pose.pairs = this._pairs[this._currentIndex];
        }
    }

    private setToEstimateMode(): void {
        this._foldMode = PoseFoldMode.ESTIMATE;
        this._toolbar.estimateButton.hotkey();
        this._toolbar.targetButton.hotkey(KeyCode.Space);
        this._toolbar.estimateButton.toggled.value = true;
        this._toolbar.targetButton.toggled.value = false;
        if (this._isPipMode) {
            for (let ii = 0; ii < this._pairs.length; ii++) {
                this._poseFields[ii].pose.pairs = this._shapePairs[ii];
            }
        } else {
            this._poseFields[0].pose.pairs = this._shapePairs[this._currentIndex];
        }
    }

    private changeTarget(targetIndex: number): void {
        this._currentIndex = targetIndex;

        if (this._targetConditions[this._currentIndex] != null) {
            if (this._targetConditions[this._currentIndex]['type'] === 'aptamer') {
                this._poseFields[0].pose.setMolecularBinding(
                    this._targetConditions[this._currentIndex]['site'],
                    this._targetConditions[this._currentIndex]['binding_pairs'],
                    this._targetConditions[this._currentIndex]['bonus'] / 100.0
                );
            } else {
                this._poseFields[0].pose.setMolecularBinding(null, null, null);
            }
        } else {
            this._poseFields[0].pose.setMolecularBinding(null, null, 0);
        }

        if (this._foldMode === PoseFoldMode.ESTIMATE) {
            this.setToEstimateMode();
        } else {
            this.setToTargetMode();
        }

        if (this._isExpColor) {
            this.showExperimentalColors();
        }

        this.scoreFeedback();
    }

    private showExperimentalColors(): void {
        Assert.assertIsDefined(this._feedback);

        this._isExpColor = true;
        this._toolbar.letterColorButton.toggled.value = false;
        this._toolbar.expColorButton.toggled.value = true;

        if (this._isPipMode) {
            for (let ii = 0; ii < this._poseFields.length; ii++) {
                this._poseFields[ii].pose.visualizeFeedback(
                    this._feedback.getShapeData(ii),
                    this._feedback.getShapeThreshold(ii),
                    this._feedback.getShapeMin(ii),
                    this._feedback.getShapeMax(ii),
                    this._feedback.getShapeStartIndex(ii)
                );
            }
        } else {
            this._poseFields[0].pose.visualizeFeedback(
                this._feedback.getShapeData(this._currentIndex),
                this._feedback.getShapeThreshold(this._currentIndex),
                this._feedback.getShapeMin(this._currentIndex),
                this._feedback.getShapeMax(this._currentIndex),
                this._feedback.getShapeStartIndex(this._currentIndex)
            );
        }
    }

    private showBaseColors(): void {
        this._isExpColor = false;
        this._toolbar.letterColorButton.toggled.value = true;
        this._toolbar.expColorButton.toggled.value = false;
        for (let ii = 0; ii < this._poseFields.length; ii++) {
            this._poseFields[ii].pose.clearFeedback();
        }
    }

    private scoreFeedback(): void {
        Assert.assertIsDefined(this._feedback);

        let titleText = '';
        let brentData: any = this._feedback.brentTheoData;
        let score: number;

        if (brentData != null) {
            // / Brent's theophylline data
            titleText += (`${this._solution.title}\n`);
            titleText += `Cleavage suppression : x ${brentData['score'].toFixed(2)}\n`;
            titleText += `(Cleavage without Theophylline molecule : ${brentData['ribo_without_theo'].toFixed(2)}`;
            titleText += ` / with Theophylline : ${brentData['ribo_with_theo'].toFixed(2)})`;
        } else {
            // / Default fallback to usual SHAPE data
            if (Eterna.DEV_MODE) {
                score = Feedback.scoreFeedback(
                    this._feedback.getShapeData(this._currentIndex),
                    this._puzzle.getSecstruct(this._currentIndex),
                    this._feedback.getShapeStartIndex(this._currentIndex),
                    this._feedback.getShapeMin(this._currentIndex),
                    this._feedback.getShapeThreshold(this._currentIndex),
                    this._feedback.getShapeMax(this._currentIndex)
                );
                titleText += (`${this._solution.title}\nSynthesis score : ${score} / 100`);
            } else {
                titleText += (`${this._solution.title}\nSynthesis score : ${this._solution.getProperty('Synthesis score')} / 100`);
            }

            if (this._targetConditions.length > 1) {
                titleText += '\n(';
                for (let ii = 0; ii < this._targetConditions.length; ii++) {
                    if (ii > 0) {
                        titleText += ', ';
                    }

                    score = Feedback.scoreFeedback(
                        this._feedback.getShapeData(ii),
                        this._puzzle.getSecstruct(ii),
                        this._feedback.getShapeStartIndex(ii),
                        this._feedback.getShapeMin(ii),
                        this._feedback.getShapeThreshold(ii),
                        this._feedback.getShapeMax(ii)
                    );

                    titleText += `state ${ii + 1} : ${score} / 100`;
                }
                titleText += ')';
            }
        }
        this._title.text = titleText;
    }

    private setupShape(): void {
        for (let ss = 0; ss < this._puzzle.getSecstructs().length; ss++) {
            this.foldEstimate(ss);
        }
    }

    private foldEstimate(index: number): void {
        // This won't work if _feedback is null
        Assert.assertIsDefined(this._feedback);
        let shapeThreshold: number = this._feedback.getShapeThreshold(index);
        let shapeData: number[] = this._feedback.getShapeData(index);
        let startIndex: number = this._feedback.getShapeStartIndex(index);
        let {puzzleLocks} = this._puzzle;
        let shapeMax: number = this._feedback.getShapeMax(index);
        let shapeMin: number = this._feedback.getShapeMin(index);

        let desiredPairs = '';

        for (let ii = 0; ii < startIndex; ii++) {
            if (puzzleLocks[ii]) {
                desiredPairs += 'U0';
            } else {
                desiredPairs += 'P0';
            }
        }

        for (let ii = 0; ii < shapeData.length; ii++) {
            if (ii + startIndex >= this._sequence.length) {
                break;
            }

            if (puzzleLocks[ii + startIndex]) {
                desiredPairs += 'U0';
                continue;
            }

            if (shapeData[ii] < shapeThreshold) {
                desiredPairs += 'P';
                let lev = 0;
                if (Math.abs(shapeThreshold - shapeMin) > Constants.EPSILON) {
                    lev = (shapeThreshold - shapeData[ii]) / (shapeThreshold - shapeMin);
                    if (lev >= 1) {
                        lev = 0.95;
                    } else if (lev < 0) {
                        lev = 0;
                    }
                }

                desiredPairs += Number(Math.floor(lev * 10)).toString();
            } else if (shapeData[ii] > shapeThreshold) {
                desiredPairs += 'U';
                let lev = 0;
                if (Math.abs(shapeMax - shapeThreshold) > Constants.EPSILON) {
                    lev = (shapeData[ii] - shapeThreshold) / (shapeMax - shapeThreshold);
                    if (lev >= 1) {
                        lev = 0.95;
                    } else if (lev < 0) {
                        lev = 0;
                    }
                }
                desiredPairs += Number(Math.floor(lev * 10)).toString();
            } else {
                desiredPairs += 'P0';
            }
        }

        for (let ii = shapeData.length + startIndex; ii < this._sequence.length; ii++) {
            if (puzzleLocks[ii]) {
                desiredPairs += 'U0';
            } else {
                desiredPairs += 'P0';
            }
        }

        let folder: Folder | null = FolderManager.instance.getFolder(Vienna.NAME);
        if (!folder) {
            throw new Error("Critical error: can't create a Vienna folder instance by name");
        }
        this._shapePairs[index] = folder.foldSequence(this._sequence, null, desiredPairs);
    }

    private loadDesignBrowser(): void {
        this.pushUILock();
        Eterna.app.switchToDesignBrowser(this._puzzle.nodeID)
            .then(() => this.popUILock())
            .catch((e) => {
                log.error(e);
                this.popUILock();
            });
    }

    private showSpec(): void {
        let puzzleState = this._undoBlocks[this._currentIndex];
        let vienna: Folder | null = FolderManager.instance.getFolder(Vienna.NAME);
        if (!vienna) {
            throw new Error("Critical error: can't create a Vienna folder instance by name");
        }
        puzzleState.updateMeltingPointAndDotPlot(vienna);
        this.showDialog(new SpecBoxDialog(puzzleState, false));
    }

    private readonly _solution: Solution;
    private readonly _puzzle: Puzzle;

    private _toolbar: Toolbar;
    private _homeButton: URLButton;

    private _undoBlocks: UndoBlock[] = [];
    private _currentIndex: number;

    private _foldMode: PoseFoldMode;
    private _puzzleTitle: Text;
    private _title: Text;
    private _feedback: Feedback | null;
    private _sequence: number[];
    private _pairs: number[][] = [];
    private _shapePairs: any[] = [];
    protected _targetConditions: any[];
    private _isExpColor: boolean;
}
