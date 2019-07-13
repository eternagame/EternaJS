import {
    Container, Graphics, Point, Sprite, Text
} from 'pixi.js';
import {UnitSignal} from 'signals';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import ExpPainter from 'eterna/ExpPainter';
import Dialog from 'eterna/ui/Dialog';
import Solution from 'eterna/puzzle/Solution';
import Puzzle from 'eterna/puzzle/Puzzle';
import GamePanel from 'eterna/ui/GamePanel';
import {
    HLayoutContainer, MathUtil, Flashbang, DisplayUtil, HAlign, VAlign
} from 'flashbang';
import PoseThumbnail, {PoseThumbnailType} from 'eterna/ui/PoseThumbnail';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import SolutionDescBox from './SolutionDescBox';

export default class ViewSolutionDialog extends Dialog<void> {
    public readonly playClicked = new UnitSignal();
    public readonly seeResultClicked = new UnitSignal();
    public readonly sortClicked = new UnitSignal();
    public readonly voteClicked = new UnitSignal();
    public readonly editClicked = new UnitSignal();
    public readonly deleteClicked = new UnitSignal();

    constructor(solution: Solution, puzzle: Puzzle, voteDisabled: boolean) {
        super();
        this._solution = solution;
        this._puzzle = puzzle;
        this._voteDisabled = voteDisabled;
    }

    protected added(): void {
        super.added();

        this._content = new Container();
        this.container.addChild(this._content);

        this._panelBG = new GamePanel(0, 1.0, 0x152843, 0.27, 0xC0DCE7);
        this.addObject(this._panelBG, this._content);

        this._actionButtonsLayout = new HLayoutContainer(25);
        this._content.addChild(this._actionButtonsLayout);

        let playThumbnail = new Sprite();
        PoseThumbnail.drawToSprite(playThumbnail,
            EPars.stringToSequence(this._solution.sequence),
            EPars.parenthesisToPairs(this._puzzle.getSecstruct()),
            3, PoseThumbnailType.BASE_COLORED);
        let playButton = new ThumbnailAndTextButton()
            .text('View/Copy')
            .thumbnail(playThumbnail)
            .tooltip('Click to view this design in the game.\nYou can also modify the design and create a new one.');
        playButton.clicked.connect(() => this.playClicked.emit());
        this.addObject(playButton, this._actionButtonsLayout);

        if (this._solution.expFeedback != null && this._solution.expFeedback.isFailed() === 0) {
            // SEE RESULT (allowed if the solution is synthesized)
            let expdata = this._solution.expFeedback;
            let shapeData = ExpPainter.transformData(
                expdata.getShapeData(), expdata.getShapeMax(), expdata.getShapeMin()
            );
            let resultThumbnail = new Sprite();
            PoseThumbnail.drawToSprite(
                resultThumbnail,
                shapeData,
                EPars.parenthesisToPairs(this._puzzle.getSecstruct()),
                3,
                PoseThumbnailType.EXP_COLORED,
                expdata.getShapeStartIndex(),
                null,
                true,
                expdata.getShapeThreshold()
            );

            let seeResultButton = new ThumbnailAndTextButton()
                .text('See Result')
                .thumbnail(resultThumbnail)
                .tooltip('Click to see the experimental result!');
            seeResultButton.clicked.connect(() => this.seeResultClicked.emit());
            this.addObject(seeResultButton, this._actionButtonsLayout);
        } else if (
            this._solution.getProperty('Synthesized') === 'n'
            && this._solution.getProperty('Round') === this._puzzle.round
        ) {
            // VOTE (disallowed is solution is synthesized or old)
            let voteButton = new ThumbnailAndTextButton();
            if (this._solution.getProperty('My Votes') === 0) {
                voteButton
                    .thumbnail(Sprite.fromImage(Bitmaps.ImgVotes))
                    .text('Vote')
                    .tooltip('Vote on this design.');
            } else {
                let rotatedSprite = Sprite.fromImage(Bitmaps.ImgVotes);
                rotatedSprite.rotation = MathUtil.deg2Rad * 180;
                let thumbnail = new Container();
                thumbnail.addChild(rotatedSprite);
                voteButton
                    .thumbnail(thumbnail)
                    .text('Unvote')
                    .tooltip('Take back your vote on this design.');
            }
            voteButton.clicked.connect(() => this.voteClicked.emit());
            this.addObject(voteButton, this._actionButtonsLayout);
        }

        let sortImage = Sprite.fromImage(Bitmaps.ImgNextInside);
        sortImage.scale = new Point(0.3, 0.3);
        let sortButton = new ThumbnailAndTextButton()
            .text('Sort')
            .thumbnail(sortImage)
            .tooltip('Sort based on similarity to this design.');
        sortButton.clicked.connect(() => this.sortClicked.emit());
        this.addObject(sortButton, this._actionButtonsLayout);

        // DELETE (only allowed if the puzzle belongs to us and has no votes)
        if (
            this._solution.getProperty('Round') === this._puzzle.round
            && this._solution.playerID === Eterna.playerID
            && this._solution.getProperty('Votes') === 0
        ) {
            let deleteButton = new ThumbnailAndTextButton()
                .text('Delete')
                .thumbnail(new Graphics()
                    .beginFill(0, 0)
                    .lineStyle(2, 0xC0DCE7)
                    .drawRoundedRect(0, 0, 75, 75, 10)
                    .endFill()
                    .moveTo(10, 10)
                    .lineTo(65, 65)
                    .moveTo(65, 10)
                    .lineTo(10, 65))
                .tooltip('Delete this design to retrieve your slots for this round');
            deleteButton.clicked.connect(() => this.deleteClicked.emit());
            this.addObject(deleteButton, this._actionButtonsLayout);
        }

        this._actionButtonsLayout.layout();

        this._cancelButton = new GameButton().label('Cancel', 12);
        this.addObject(this._cancelButton, this._content);
        this._cancelButton.clicked.connect(() => this.close(null));

        if (Eterna.DEV_MODE) {
            this._editButton = new GameButton().label('Edit', 12);
            this.addObject(this._editButton, this._content);
            this._editButton.clicked.connect(() => this.editClicked.emit());
        }

        this._solutionDescBox = new SolutionDescBox(this._solution, this._puzzle);
        this.addObject(this._solutionDescBox, this._content);

        this.regs.add(this.mode.resized.connect(() => this.updateLayout()));
        this.updateLayout();
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        this._solutionDescBox.updateScroll(e);
        return true;
    }

    private updateLayout(): void {
        let width = Flashbang.stageWidth - 90;
        let height = Flashbang.stageHeight - MathUtil.clamp(Flashbang.stageHeight * 0.23, 80, 220);

        this._panelBG.setSize(width, height);

        this._solutionDescBox.setSize(width - 20, height - 120);
        DisplayUtil.positionRelative(
            this._solutionDescBox.display, HAlign.CENTER, VAlign.TOP,
            this._panelBG.display, HAlign.CENTER, VAlign.TOP, 0, 10
        );

        if (this._editButton != null) {
            DisplayUtil.positionRelative(
                this._editButton.display, HAlign.CENTER, VAlign.BOTTOM,
                this._panelBG.display, HAlign.CENTER, VAlign.BOTTOM, 0, -12
            );
        }

        DisplayUtil.positionRelative(
            this._cancelButton.display, HAlign.RIGHT, VAlign.BOTTOM,
            this._panelBG.display, HAlign.RIGHT, VAlign.BOTTOM, -12, -12
        );

        DisplayUtil.positionRelative(
            this._actionButtonsLayout, HAlign.LEFT, VAlign.BOTTOM,
            this._panelBG.container, HAlign.LEFT, VAlign.BOTTOM, 38, -12
        );

        DisplayUtil.positionRelativeToStage(
            this._content, HAlign.CENTER, VAlign.CENTER,
            HAlign.CENTER, VAlign.CENTER
        );
    }

    private readonly _solution: Solution;
    private readonly _puzzle: Puzzle;
    private readonly _voteDisabled: boolean;

    private _content: Container;
    private _panelBG: GamePanel;
    private _solutionDescBox: SolutionDescBox;
    private _actionButtonsLayout: HLayoutContainer;

    private _cancelButton: GameButton;
    private _editButton: GameButton;
}

class ThumbnailAndTextButton extends GameButton {
    constructor() {
        super();

        this._view = new Container();
        this.container.addChild(this._view);

        this._bgFrame = new Graphics()
            .lineStyle(2, 0xC0DCE7)
            .beginFill(0x0, 0)
            .drawRoundedRect(0, 0, 75, 75, 10)
            .endFill();
        this._view.addChild(this._bgFrame);

        this._textField = Fonts.arial('', 14).bold().color(0xffffff).build();
        this._view.addChild(this._textField);

        this.allStates(this._view);
    }

    public text(value: string): ThumbnailAndTextButton {
        this._textField.text = value;
        DisplayUtil.positionRelative(
            this._textField, HAlign.CENTER, VAlign.TOP,
            this._bgFrame, HAlign.CENTER, VAlign.BOTTOM, 0, 3
        );
        return this;
    }

    public thumbnail(disp: Container): ThumbnailAndTextButton {
        if (this._thumbnail != null) {
            this._thumbnail.destroy({children: true});
        }
        this._thumbnail = disp;
        if (this._thumbnail != null) {
            this._view.addChildAt(this._thumbnail, 1);
            DisplayUtil.positionRelative(
                this._thumbnail, HAlign.CENTER, VAlign.CENTER,
                this._bgFrame, HAlign.CENTER, VAlign.CENTER
            );
        }
        return this;
    }

    public tooltip(text: string): ThumbnailAndTextButton {
        super.tooltip(text);
        return this;
    }

    private readonly _view: Container;
    private readonly _bgFrame: Graphics;
    private readonly _textField: Text;
    private _thumbnail: Container;
}
