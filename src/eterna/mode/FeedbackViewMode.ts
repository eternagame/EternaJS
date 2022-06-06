import * as log from 'loglevel';
import {
    DisplayObject, Sprite
} from 'pixi.js';
import Constants from 'eterna/Constants';
import Eterna from 'eterna/Eterna';
import Feedback from 'eterna/Feedback';
import UndoBlock, {TargetConditions} from 'eterna/UndoBlock';
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
import EternaSettingsDialog, {EternaViewOptionsMode} from 'eterna/ui/EternaSettingsDialog';
import SpecBoxDialog from 'eterna/ui/SpecBoxDialog';
import Folder from 'eterna/folding/Folder';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameButton from 'eterna/ui/GameButton';
import EternaURL from 'eterna/net/EternaURL';
import BitmapManager from 'eterna/resources/BitmapManager';
import GameDropdown from 'eterna/ui/GameDropdown';
import {MappedValue, ValueView} from 'signals';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import UITheme from 'eterna/ui/UITheme';
import AnnotationManager from 'eterna/AnnotationManager';
import ViewSolutionOverlay from './DesignBrowser/ViewSolutionOverlay';
import GameMode from './GameMode';

enum PoseFoldMode {
    ESTIMATE = 'ESTIMATE',
    TARGET = 'TARGET',
}

export default class FeedbackViewMode extends GameMode {
    constructor(solution: Solution, puzzle: Puzzle, solutions: Solution[] | null = null) {
        super();
        this._solution = solution;
        this._puzzle = puzzle;
        if (solutions) this._solutions = solutions;
    }

    public get isOpaque(): boolean { return true; }
    public get puzzleID(): number { return this._puzzle.nodeID; }
    public get solutionID(): number { return this._solution.nodeID; }

    protected setup(): void {
        super.setup();

        const background = new Background();
        this.addObject(background, this.bgLayer);

        this._homeButton = new GameButton()
            .up(Bitmaps.ImgHome)
            .over(Bitmaps.ImgHome)
            .down(Bitmaps.ImgHome);
        this._homeButton.display.position.set(18, 10);
        this._homeButton.clicked.connect(() => {
            if (Eterna.MOBILE_APP) {
                Assert.assertIsDefined(window.frameElement);
                window.frameElement.dispatchEvent(new CustomEvent('navigate', {detail: '/'}));
            } else {
                window.location.href = EternaURL.createURL({page: 'home'});
            }
        });
        this.addObject(this._homeButton, this.uiLayer);

        const homeArrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgHomeArrow));
        homeArrow.position.set(45, 14);
        this.uiLayer.addChild(homeArrow);

        const puzzleTitle = UITheme.makeTitle(this._puzzle.getName(!Eterna.MOBILE_APP), 0xffffff);
        puzzleTitle.hideWhenModeInactive();
        this.addObject(puzzleTitle, this.uiLayer);
        DisplayUtil.positionRelative(
            puzzleTitle.display, HAlign.LEFT, VAlign.CENTER,
            homeArrow, HAlign.RIGHT, VAlign.CENTER, 8, 8
        );

        this._toolbar = new Toolbar(ToolbarType.FEEDBACK, {states: this._puzzle.getSecstructs().length}, {
            pairSwapButtonHandler: () => {
            },
            baseMarkerButtonHandler: () => {
            },
            settingsButtonHandler: () => this.showSettingsDialog(),
            updateScriptViews: () => { this._resized.emit(); }
        });
        this.addObject(this._toolbar, this.uiLayer);
        this.addObject(this._toolbar.estimateButton, this.uiLayer);
        this.addObject(this._toolbar.targetButton, this.uiLayer);

        Assert.assertIsDefined(this._toolbar.zoomOutButton);
        this._toolbar.zoomOutButton.clicked.connect(() => {
            for (const poseField of this._poseFields) {
                poseField.zoomOut();
            }
        });

        Assert.assertIsDefined(this._toolbar.zoomInButton);
        this._toolbar.zoomInButton.clicked.connect(() => {
            for (const poseField of this._poseFields) {
                poseField.zoomIn();
            }
        });

        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()));
        this._toolbar.viewSolutionsButton.clicked.connect(() => this.loadDesignBrowser());
        this._toolbar.letterColorButton.clicked.connect(() => this.showBaseColors());
        this._toolbar.expColorButton.clicked.connect(() => this.showExperimentalColors());
        this._toolbar.specButton.clicked.connect(() => this.showSpec());
        this._toolbar.pipButton.clicked.connect(() => this.togglePip());
        this._toolbar.estimateButton.clicked.connect(() => this.setToEstimateMode());
        this._toolbar.targetButton.clicked.connect(() => this.setToTargetMode());

        this._toolbar.nucleotideFindButton.clicked.connect(() => this.findNucleotide());
        this._toolbar.nucleotideRangeButton.clicked.connect(() => this.showNucleotideRange());
        this._toolbar.explosionFactorButton.clicked.connect(() => this.changeExplosionFactor());

        this._targetConditions = this._puzzle.targetConditions;

        this._foldMode = PoseFoldMode.TARGET;

        this._isExpColor = false;
        this._currentIndex = 0;

        const secstructs: string[] = this._puzzle.getSecstructs();

        const sequence = this._solution.sequence;
        for (let ii = 0; ii < secstructs.length; ii++) {
            let secs: string = secstructs[ii];
            if (secs != null && secs.length !== sequence.length) {
                log.warn(
                    "Solution secondary structure and sequence length doesn't match",
                    secs.length,
                    sequence.length
                );
                if (secs.length < sequence.length) {
                    const diff: number = sequence.length - secs.length;
                    for (let jj = 0; jj < diff; ++jj) {
                        secs += '.';
                    }
                } else {
                    secs = secs.slice(0, sequence.length);
                }
                secstructs[ii] = secs;
            }
            this._secstructs.push(SecStruct.fromParens(secstructs[ii]));
        }

        this._solutionView = new ViewSolutionOverlay({
            solution: this._solution,
            puzzle: this._puzzle,
            voteDisabled: false,
            onPrevious: () => this.showNextSolution(-1),
            onNext: () => this.showNextSolution(1),
            parentMode: (() => this)()
        });
        this.addObject(this._solutionView, this.dialogLayer);
        this._solutionView.playClicked.connect(() => this.switchToPoseEditForSolution(this._solution));
        this._solutionView.sortClicked.connect(() => this.switchToBrowser(this._solution, true));
        this._solutionView.returnClicked.connect(() => this.switchToBrowser(this._solution));

        this._info = new GameButton()
            .up(Bitmaps.ImgInfoControl)
            .over(Bitmaps.ImgInfoControlHover)
            .down(Bitmaps.ImgInfoControl)
            .hotkey(KeyCode.KeyI, true)
            .tooltip('Design Information (ctrl+I/cmd+I)');

        // Here, we don't need to reconstruct the ViewSolutionOverlay, because
        // we are not changing the solution.
        this._info.clicked.connect(() => {
            if (this._solutionView) {
                this._solutionView.container.visible = !this._solutionView.container.visible;
                this.onResized();
            }
        });
        this.addObject(this._info, this.uiLayer);

        const poseFields: PoseField[] = [];
        // We don't support annotations here right now, but the pose calls some methods on it
        const annotationManager = new AnnotationManager(ToolbarType.FEEDBACK);
        for (let ii = 0; ii < secstructs.length; ii++) {
            const poseField: PoseField = new PoseField(false, annotationManager);
            this.addObject(poseField, this.poseLayer);

            const vienna: Folder | null = FolderManager.instance.getFolder(Vienna.NAME);
            if (!vienna) {
                throw new Error("Critical error: can't create a Vienna folder instance by name");
            }
            poseField.pose.scoreFolder = vienna;
            poseFields.push(poseField);
        }
        this.setPoseFields(poseFields);
        this.setSolution(this._solution);

        this._dropdown = new GameDropdown({
            fontSize: 14,
            options: this._solution.expFeedback?.conditions ?? ['SHAPE'],
            defaultOption: 'SHAPE',
            borderWidth: 0
        });

        this._dropdown.disabled = false;
        this._dropdown.selectedOption.connect(() => this.showExperimentalColors());

        // for now this is fine; we turn the dropdown options
        // into themselves. that's all we need to access the JSON
        // of data we will receive (or not)
        this._dataOption = MappedValue.create(
            this._dropdown.selectedOption,
            (name) => name
        );

        this.addObject(this._dropdown, this.uiLayer);
        this._dropdown.display.position.set(18, 50);

        if (this._feedback !== null) {
            this.showExperimentalColors();
        }

        this.changeTarget(0);
        this.setPip(false);

        this.updateUILayout();
    }

    private setSolution(solution: Solution) {
        this._solution = solution;
        this._sequence = solution.sequence.slice(0);
        this._feedback = this._solution.expFeedback;
        this.setupShape();
        for (const poseField of this._poseFields) {
            poseField.pose.sequence = this._sequence;
        }

        this._undoBlocks = [];
        for (let ii = 0; ii < this._secstructs.length; ii++) {
            const datablock: UndoBlock = new UndoBlock(this._sequence, Vienna.NAME);
            datablock.setPairs(this._secstructs[ii]);
            datablock.setBasics();
            this._undoBlocks.push(datablock);
        }
    }

    private async switchToPoseEditForSolution(solution: Solution): Promise<void> {
        this.pushUILock();
        try {
            // AMW: this is very similar to the DesignBrowserMode method, but we
            // don't know about a bunch of solutions -- so instead we switch with
            // only this one available.
            // AH: This loads the cached solutions if they're available (they should be)
            // and falls back to the current solution if they're not
            await Eterna.app.switchToPoseEdit(
                this._puzzle, false, {initSolution: solution, solutions: [...this._solutions || solution]}
            );
        } catch (e) {
            log.error(e);
        } finally {
            this.popUILock();
        }
    }

    private async switchToBrowser(solution: Solution, sortOnSolution: boolean = false): Promise<void> {
        this.pushUILock();
        try {
            // AMW: this is very similar to the DesignBrowserMode method, but we
            // don't know about a bunch of solutions -- so instead we switch with
            // only this one available.
            await Eterna.app.switchToDesignBrowser(
                this.puzzleID,
                solution,
                sortOnSolution
            );
        } catch (e) {
            log.error(e);
        } finally {
            this.popUILock();
        }
    }

    public onResized(): void {
        this.updateUILayout();
        super.onResized();
    }

    private get _solDialogOffset() {
        return this._solutionView !== undefined && this._solutionView.container.visible
            ? ViewSolutionOverlay.theme.width : 0;
    }

    private updateUILayout(): void {
        this._toolbar.onResized();

        // DisplayUtil.positionRelativeToStage(
        //     this._homeButton.display, HAlign.RIGHT, VAlign.TOP,
        //     HAlign.RIGHT, VAlign.TOP, 0 - this._solDialogOffset, 5
        // );

        DisplayUtil.positionRelativeToStage(
            this._info.display, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, 0 - this._solDialogOffset, 0
        );
    }

    private showSettingsDialog(): void {
        this.showDialog(new EternaSettingsDialog(EternaViewOptionsMode.LAB));
    }

    public onKeyboardEvent(e: KeyboardEvent): void {
        let handled: boolean = this.keyboardInput.handleKeyboardEvent(e);

        if (!handled && e.type === KeyboardEventType.KEY_DOWN) {
            const key = e.code;
            const ctrl = e.ctrlKey;

            if (!ctrl && key === KeyCode.KeyN) {
                Eterna.settings.showNumbers.value = !Eterna.settings.showNumbers.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.KeyG) {
                Eterna.settings.displayFreeEnergies.value = !Eterna.settings.displayFreeEnergies.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.KeyS) {
                this.showSpec();
                handled = true;
            } else if (key === KeyCode.BracketLeft) {
                const factor = Math.max(0, Math.round((this._poseFields[0].explosionFactor - 0.25) * 1000) / 1000);
                for (const pf of this._poseFields) {
                    pf.explosionFactor = factor;
                }
                handled = true;
            } else if (key === KeyCode.BracketRight) {
                const factor = Math.max(0, Math.round((this._poseFields[0].explosionFactor + 0.25) * 1000) / 1000);
                for (const pf of this._poseFields) {
                    pf.explosionFactor = factor;
                }
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

            const minZoom = Math.max(...this._poses.map(
                (pose) => pose.computeDefaultZoomLevel()
            ));

            for (let ii = 0; ii < this._poses.length; ii++) {
                const field: PoseField = this._poseFields[ii];
                if (this._targetConditions[ii] !== undefined) {
                    const tc = this._targetConditions[ii] as TargetConditions;
                    if (tc['type'] === 'aptamer') {
                        // we know bonus will be present for any 'aptamer' puzzle
                        // AMW TODO: encode as type constraint?
                        field.pose.setMolecularBinding(
                            tc['site'],
                            tc['binding_pairs'],
                            tc['bonus'] as number / 100.0
                        );
                    } else {
                        field.pose.setMolecularBinding(undefined, undefined, undefined);
                    }
                } else {
                    field.pose.setMolecularBinding(undefined, undefined, 0);
                }
            }

            for (const pose of this._poses) {
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
            const pose = this._poses[0];
            pose.setZoomLevel(pose.computeDefaultZoomLevel(), true, true);
        }
    }

    protected createScreenshot(): ArrayBuffer {
        const visibleState: Map<DisplayObject, boolean> = new Map();
        const pushVisibleState = (disp: DisplayObject) => {
            visibleState.set(disp, disp.visible);
            disp.visible = false;
        };

        pushVisibleState(this.bgLayer);
        pushVisibleState(this.uiLayer);
        pushVisibleState(this.dialogLayer);
        pushVisibleState(this.achievementsLayer);

        const energyVisible: boolean[] = [];
        for (const poseField of this._poseFields) {
            energyVisible.push(poseField.showTotalEnergy);
            poseField.showTotalEnergy = false;
        }

        Assert.assertIsDefined(this.container);
        const tempBG = DisplayUtil.fillStageRect(0x061A34);
        this.container.addChildAt(tempBG, 0);

        const info = `Designer: ${this._solution.playerName}\n`
            + `Design ID: ${this._solution.nodeID}\n`
            + `Design Title: ${this._solution.title}\n`;
        const infoText = Fonts.std(info).color(0xffffff).build();
        this.container.addChild(infoText);

        DisplayUtil.positionRelativeToStage(
            infoText, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, -3, 3
        );

        const pngData = DisplayUtil.renderToPNG(this.container);

        tempBG.destroy({children: true});
        infoText.destroy({children: true});

        for (const [disp, wasVisible] of visibleState.entries()) {
            disp.visible = wasVisible;
        }

        for (let ii = 0; ii < this._poseFields.length; ++ii) {
            this._poseFields[ii].showTotalEnergy = energyVisible[ii];
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
            for (let ii = 0; ii < this._secstructs.length; ii++) {
                this._poseFields[ii].pose.secstruct = this._secstructs[ii];
            }
        } else {
            this._poseFields[0].pose.secstruct = this._secstructs[this._currentIndex];
        }
    }

    private setToEstimateMode(): void {
        this._foldMode = PoseFoldMode.ESTIMATE;
        this._toolbar.estimateButton.hotkey();
        this._toolbar.targetButton.hotkey(KeyCode.Space);
        this._toolbar.estimateButton.toggled.value = true;
        this._toolbar.targetButton.toggled.value = false;
        if (this._isPipMode) {
            for (let ii = 0; ii < this._secstructs.length; ii++) {
                if (this._shapePairs[ii] !== null) {
                    this._poseFields[ii].pose.secstruct = this._shapePairs[ii] as SecStruct;
                }
            }
        } else if (this._shapePairs[this._currentIndex] !== null) {
            this._poseFields[0].pose.secstruct = this._shapePairs[this._currentIndex] as SecStruct;
        }
    }

    private changeTarget(targetIndex: number): void {
        this._currentIndex = targetIndex;

        if (this._targetConditions[this._currentIndex] !== undefined) {
            const tc = this._targetConditions[this._currentIndex] as TargetConditions;
            if (tc['type'] === 'aptamer') {
                // we know bonus will be present for any 'aptamer' puzzle
                // AMW TODO: encode as type constraint?
                // AMW TODO: duplicates code from onSetPip?
                this._poseFields[0].pose.setMolecularBinding(
                    tc['site'],
                    tc['binding_pairs'],
                    tc['bonus'] as number / 100.0
                );
            } else {
                this._poseFields[0].pose.setMolecularBinding(undefined, undefined, undefined);
            }
        } else {
            this._poseFields[0].pose.setMolecularBinding(undefined, undefined, 0);
        }

        if (this._foldMode === PoseFoldMode.ESTIMATE) {
            this.setToEstimateMode();
        } else {
            this.setToTargetMode();
        }

        if (this._isExpColor) {
            this.showExperimentalColors();
        }
    }

    private showExperimentalColors(): void {
        Assert.assertIsDefined(this._feedback);

        this._isExpColor = true;
        this._toolbar.letterColorButton.toggled.value = false;
        this._toolbar.expColorButton.toggled.value = true;

        if (this._dataOption.value === 'SHAPE') {
            if (this._isPipMode) {
                for (let ii = 0; ii < this._poseFields.length; ii++) {
                    this._poseFields[ii].pose.visualizeFeedback(
                        this._feedback.getShapeData(ii, this._dataOption.value),
                        this._feedback.getShapeThreshold(ii, this._dataOption.value),
                        this._feedback.getShapeMin(ii, this._dataOption.value),
                        this._feedback.getShapeMax(ii, this._dataOption.value),
                        this._feedback.getShapeStartIndex(ii, this._dataOption.value)
                    );
                }
            } else {
                this._poseFields[0].pose.visualizeFeedback(
                    this._feedback.getShapeData(this._currentIndex, this._dataOption.value),
                    this._feedback.getShapeThreshold(this._currentIndex, this._dataOption.value),
                    this._feedback.getShapeMin(this._currentIndex, this._dataOption.value),
                    this._feedback.getShapeMax(this._currentIndex, this._dataOption.value),
                    this._feedback.getShapeStartIndex(this._currentIndex, this._dataOption.value)
                );
            }
        } else if (this._isPipMode) {
            for (let ii = 0; ii < this._poseFields.length; ii++) {
                this._poseFields[ii].pose.visualizeFeedback(
                    this._feedback.getDegradationData(ii, this._dataOption.value),
                    this._feedback.getDegradationThreshold(ii, this._dataOption.value),
                    this._feedback.getDegradationMin(ii, this._dataOption.value),
                    this._feedback.getDegradationMax(ii, this._dataOption.value),
                    this._feedback.getDegradationStartIndex(ii, this._dataOption.value)
                );
            }
        } else {
            this._poseFields[0].pose.visualizeFeedback(
                this._feedback.getDegradationData(this._currentIndex, this._dataOption.value),
                this._feedback.getDegradationThreshold(this._currentIndex, this._dataOption.value),
                this._feedback.getDegradationMin(this._currentIndex, this._dataOption.value),
                this._feedback.getDegradationMax(this._currentIndex, this._dataOption.value),
                this._feedback.getDegradationStartIndex(this._currentIndex, this._dataOption.value)
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

    private setupShape(): void {
        for (let ss = 0; ss < this._puzzle.getSecstructs().length; ss++) {
            this.foldEstimate(ss);
        }
    }

    private foldEstimate(index: number): void {
        // This won't work if _feedback is null
        if (this._feedback == null) return;

        const shapeThreshold: number = this._feedback.getShapeThreshold(index);
        const shapeData: number[] = this._feedback.getShapeData(index);
        const startIndex: number = this._feedback.getShapeStartIndex(index);
        const {puzzleLocks} = this._puzzle;
        const shapeMax: number = this._feedback.getShapeMax(index);
        const shapeMin: number = this._feedback.getShapeMin(index);

        let desiredPairs = '';

        for (let ii = 0; ii < startIndex; ii++) {
            desiredPairs += (puzzleLocks[ii]) ? 'U0' : 'P0';
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
            desiredPairs += (puzzleLocks[ii]) ? 'U0' : 'P0';
        }

        const folder: Folder | null = FolderManager.instance.getFolder(Vienna.NAME);
        if (!folder) {
            throw new Error("Critical error: can't create a Vienna folder instance by name");
        }
        // AMW TODO: I don't know if this will still work, but Vienna depends on
        // desiredPairs working differently from ANY OTHER PAIR CONSTRAINT which is
        // not a string.
        this._shapePairs[index] = folder.foldSequence(this._sequence, null, desiredPairs);
    }

    private loadDesignBrowser(): void {
        this.pushUILock();
        Eterna.app.switchToDesignBrowser(this._puzzle.nodeID, this._solution, false)
            .then(() => this.popUILock())
            .catch((e) => {
                log.error(e);
                this.popUILock();
            });
    }

    private showSpec(): void {
        const puzzleState = this._undoBlocks[this._currentIndex];
        puzzleState.updateMeltingPointAndDotPlot();
        this.showDialog(new SpecBoxDialog(puzzleState, false));
    }

    private showNextSolution(indexOffset: number): void {
        if (this._solutions == null || this._solutions.length === 0) {
            return;
        }

        const curSolutionIdx = this._solutions.indexOf(this._solution);
        let nextSolutionIdx = (curSolutionIdx >= 0 ? curSolutionIdx + indexOffset : 0) % this._solutions.length;
        if (nextSolutionIdx < 0) {
            nextSolutionIdx = this._solutions.length + nextSolutionIdx;
        }

        const solution = this._solutions[nextSolutionIdx];
        Assert.notNull(solution);

        this.setSolution(solution);
        this.changeTarget(this._currentIndex);

        if (this._feedback !== null && this._toolbar.expColorButton.toggled.value) {
            this.showExperimentalColors();
        }

        if (this._solutionView) {
            const visible = this._solutionView.container.visible;
            this.removeObject(this._solutionView);
            this._solutionView = new ViewSolutionOverlay({
                solution,
                puzzle: this._puzzle,
                voteDisabled: false,
                onPrevious: () => this.showNextSolution(-1),
                onNext: () => this.showNextSolution(1),
                parentMode: (() => this)()
            });
            this._solutionView.container.visible = visible;
            this.addObject(this._solutionView, this.dialogLayer);
            this._solutionView.playClicked.connect(() => {
                this.switchToPoseEditForSolution(this._solution);
            });
            this._solutionView.sortClicked.connect(() => this.switchToBrowser(this._solution, true));
            this._solutionView.returnClicked.connect(() => this.switchToBrowser(this._solution));
        }
    }

    private _solution: Solution;
    private readonly _puzzle: Puzzle;
    private _solutions: Solution[];

    private _toolbar: Toolbar;
    private _homeButton: GameButton;

    private _undoBlocks: UndoBlock[] = [];
    private _currentIndex: number;

    private _foldMode: PoseFoldMode;
    private _feedback: Feedback | null;
    private _sequence: Sequence;
    private _secstructs: SecStruct[] = [];
    private _shapePairs: (SecStruct | null)[] = [];
    protected _targetConditions: (TargetConditions | undefined)[];
    private _isExpColor: boolean;
    private _solutionView?: ViewSolutionOverlay;
    private _info: GameButton;
    private _dropdown: GameDropdown;
    private _dataOption: ValueView<string>;
}
