import {
    VLayoutContainer, HLayoutContainer, HAlign, VAlign, ContainerObject
} from 'flashbang';
import {Graphics} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import {Signal} from 'signals';
import Pose2D from 'eterna/pose2D/Pose2D';
import Folder from 'eterna/folding/Folder';
import Solver from 'eterna/assistant/Solver';
import type {SolverResult} from 'eterna/assistant/Solver';
import SolverManager from 'eterna/assistant/SolverManager';
import type {SolverParamsComponent} from 'eterna/assistant/SolverManager';
import Eterna from 'eterna/Eterna';
import WindowDialog from './WindowDialog';
import GameButton from './GameButton';
import FolderSwitcher from './FolderSwitcher';
import GameDropdown from './GameDropdown';
import ScrollBox from './ScrollBox';

type ActiveParams = ContainerObject & SolverParamsComponent;

export default class AutoSolverDialog extends WindowDialog<void> {
    public readonly submitClicked: Signal<string> = new Signal();

    constructor({targetStructure, pose, defaultFolder}: {
        targetStructure: string;
        pose: Pose2D;
        defaultFolder?: Folder;
    }) {
        super({title: 'AI Assistant Settings'});
        this._targetStructure = targetStructure;
        this._pose = pose;
        this._defaultFolder = defaultFolder;
    }

    protected added(): void {
        super.added();

        this._content = new VLayoutContainer(16);
        this._window.content.addChild(this._content);

        // Two-column layout
        const columns = new HLayoutContainer(20, VAlign.TOP);
        this._content.addChild(columns);

        // Left column: controls
        this._leftCol = new VLayoutContainer(20, HAlign.LEFT);
        columns.addChild(this._leftCol);

        // Solver selector
        const solverGroup = new VLayoutContainer(4, HAlign.LEFT);
        this._leftCol.addChild(solverGroup);
        solverGroup.addChild(Fonts.std('Solving Algorithm', 12).color(0xC0DCE7).bold().build());
        const solverNames = SolverManager.instance.getRegisteredSolvers();
        this._solverDropdown = new GameDropdown({
            fontSize: 14,
            options: solverNames,
            defaultOption: solverNames[0] ?? '',
            color: 0x043468,
            textColor: 0xFFFFFF,
            height: 32,
            borderWidth: 0,
            dropShadow: true
        });
        this.addObject(this._solverDropdown, solverGroup);

        // Folding engine selector (only scoreable engines)
        const folderGroup = new VLayoutContainer(4, HAlign.LEFT);
        this._leftCol.addChild(folderGroup);
        folderGroup.addChild(Fonts.std('Folding Engine', 12).color(0xC0DCE7).bold().build());
        const folderSubLabel = 'Algorithms use folding engines to evaluate and improve sequences';
        folderGroup.addChild(Fonts.std(folderSubLabel, 10).color(0x9AADCE).build());
        const canScore = (folder: Folder) => folder.canScoreStructures(false);
        const validDefault = this._defaultFolder && canScore(this._defaultFolder)
            ? this._defaultFolder : undefined;
        this._folderSwitcher = new FolderSwitcher(canScore, validDefault);
        this.addObject(this._folderSwitcher, folderGroup);

        // Per-solver options (populated by swapSolver)
        this._optionsGroup = new VLayoutContainer(4, HAlign.LEFT);
        this._leftCol.addChild(this._optionsGroup);
        this._optionsGroup.addChild(Fonts.std('Solver Options', 12).color(0xC0DCE7).bold().build());

        // Right column: scrollable log
        const rightCol = new VLayoutContainer(8, HAlign.LEFT);
        columns.addChild(rightCol);
        rightCol.addChild(Fonts.std('Log', 12).color(0xC0DCE7).bold().build());
        const LOG_W = 220;
        const LOG_H = 260;
        const LOG_R = 4;
        this._logBox = new ScrollBox(LOG_W, LOG_H, LOG_R);
        this.addObject(this._logBox, rightCol);

        const logBg = new Graphics();
        logBg.roundRect(0, 0, LOG_W, LOG_H, LOG_R).fill(0x021E46);
        this._logBox.display.addChildAt(logBg, 0);

        this._logLines = new VLayoutContainer(2, HAlign.LEFT);
        this._logBox.content.addChild(this._logLines);
        this._logBox.doLayout();

        this._submitButton = new GameButton().label('Submit', 14);
        this._submitButton.enabled = false;
        this.addObject(this._submitButton, this._content);
        this._submitButton.clicked.connect(() => this.onSubmit());

        const initialSolver = solverNames[0] ?? '';
        this.swapSolver(initialSolver);
        this.loadSolver(initialSolver);

        solverGroup.layout();
        folderGroup.layout();
        this._optionsGroup.layout();
        this._leftCol.layout();
        rightCol.layout();
        columns.layout();
        this._content.layout();
        this._window.layout();

        this.regs?.add(this._solverDropdown.selectedOption.connect((name) => {
            this.swapSolver(name);
            this.loadSolver(name);
        }));
    }

    private swapSolver(solverName: string): void {
        if (this._activeParams) {
            this._activeParams.destroySelf();
            this._activeParams = null;
        }

        const domParent = this._window.contentHtmlWrapper;
        this._activeParams = SolverManager.instance.createParams(solverName, domParent) as ActiveParams | null;

        if (this._activeParams) {
            this.addObject(this._activeParams, this._optionsGroup);
            this.relayout();
        }
    }

    private relayout(): void {
        this._optionsGroup.layout();
        this._leftCol.layout();
        this._content.layout();
        this._window.layout();
    }

    private appendLog(text: string, color: number = 0xFFFFFF): void {
        this._logLines.addChild(Fonts.std(text, 11).color(color).wordWrap(true, 200).build());
        this._logLines.layout();
        this._logBox.doLayout();
        this._logBox.yScrollLocation = Number.MAX_SAFE_INTEGER;
    }

    private loadSolver(name: string): void {
        this._solver = null;
        this._submitButton.enabled = false;
        this.appendLog(`Loading ${name}...`, 0x9AADCE);

        SolverManager.instance.loadSolver(name).then((solver) => {
            this._solver = solver;
            if (solver) {
                this.appendLog(`${name} ready`, 0x88CC88);
                this._submitButton.enabled = true;
            } else {
                this.appendLog(`Failed to load ${name}`, 0xFF8888);
            }
        }).catch((err) => {
            this.appendLog(`Error: ${err}`, 0xFF8888);
        });
    }

    private async onSubmit() {
        this._submitButton.enabled = false;

        try {
            this.appendLog('Running...', 0x9AADCE);
            if (!this._solver) throw new Error('Solver not loaded');
            if (!this._activeParams) throw new Error('No solver params available');

            const options = {
                foldingPackage: this._folderSwitcher.selectedFolder.value.name,
                startingSequence: this._pose.sequence.sequenceString(),
                targetStructure: this._targetStructure,
                onProgress: (update: {degscore?: number}) => {
                    if (update.degscore != null) {
                        this.appendLog(`Best DegScore: ${update.degscore.toFixed(2)}`);
                    }
                },
                ...this._activeParams.getParameters()
            };

            Eterna.observability.recordEvent('RunTool:Autosolver', {
                solver: this._solver.name,
                options: JSON.parse(JSON.stringify(options))
            });
            const result: SolverResult = await this._solver.solve(options);

            if (!result.success) {
                this.appendLog(`Error: ${result.error}`, 0xFF8888);
                this._submitButton.enabled = true;
                return;
            }

            this.appendLog('Solver Results:', 0x88CC88);
            this.appendLog(`Sequence: ${result.sequence}`, 0x88CC88);
            this.appendLog(`Structure: ${result.structure}`, 0x88CC88);
            this.appendLog(`Energy: ${result.energy.toFixed(2)} kcal/mol`, 0x88CC88);
            if (result.aminoAcids) {
                this.appendLog(`AAs: ${result.aminoAcids}`, 0x88CC88);
            }
            this._submitButton.enabled = true;
            this.submitClicked.emit(result.sequence);
        } catch (err) {
            this.appendLog(`Error: ${err}`, 0xFF8888);
            this._submitButton.enabled = true;
        }
    }

    private _content: VLayoutContainer;
    private _leftCol: VLayoutContainer;
    private _optionsGroup: VLayoutContainer;
    private _targetStructure: string;
    private _pose: Pose2D;
    private _defaultFolder: Folder | undefined;
    private _submitButton: GameButton;
    private _activeParams: ActiveParams | null = null;
    private _solverDropdown: GameDropdown;
    private _folderSwitcher: FolderSwitcher;
    private _solver: Solver<boolean> | null;
    private _logBox: ScrollBox;
    private _logLines: VLayoutContainer;
}
