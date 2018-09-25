import {Container, Graphics, Point, Sprite, Text} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Puzzle} from "../../puzzle/Puzzle";
import {Solution} from "../../puzzle/Solution";
import {Bitmaps} from "../../resources/Bitmaps";
import {Dialog} from "../../ui/Dialog";
import {GameButton} from "../../ui/GameButton";
import {GamePanel} from "../../ui/GamePanel";
import {Fonts} from "../../util/Fonts";
import {SolutionDescBox} from "./SolutionDescBox";

export class ActionBox extends Dialog<void> {
    public playButton: ThumbnailAndTextButton;
    public expButton: ThumbnailAndTextButton;
    public sortButton: GameButton;
    public voteButton: ThumbnailAndTextButton;
    public cancelButton: GameButton;
    public editButton: GameButton;
    public deleteButton: GameButton;

    public constructor(solution: Solution, puzzle: Puzzle, voteDisabled: boolean) {
        super();
        this._solution = solution;
        this._puzzle = puzzle;
        this._voteDisabled = voteDisabled;
    }

    protected added(): void {
        super.added();

        /// Pop up action box
        this._actionbox = new GamePanel(0, 1.0, 0x152843, 0.27, 0xC0DCE7);
        this.addObject(this._actionbox, this.container);

        this.playButton = new ThumbnailAndTextButton()
            .text("View/Copy")
            .tooltip("Click to view this design in the game.\nYou can also modify the design and create a new one.");
        // this.playButton.clicked.connect(() => this.start_game_with_sequence());
        this._actionbox.addObject(this.playButton, this._actionbox.container);

        let sortImage = Sprite.fromImage(Bitmaps.ImgNextInside);
        sortImage.scale = new Point(0.3, 0.3);
        this.sortButton = new ThumbnailAndTextButton()
            .text("Sort")
            .thumbnail(sortImage)
            .tooltip("Sort based on similarity to this design.");
        // this.sortButton.clicked.connect(() => this.set_anchor());
        this._actionbox.addObject(this.sortButton, this._actionbox.container);

        this.expButton = new ThumbnailAndTextButton()
            .text("See Result")
            .tooltip("Click to see the experimental result!");
        // this.expButton.clicked.connect(() => this.review_exp());
        this._actionbox.addObject(this.expButton, this._actionbox.container);

        this.voteButton = new ThumbnailAndTextButton()
            .text("Vote")
            .thumbnail(Sprite.fromImage(Bitmaps.ImgVotes));
        // this.voteButton.clicked.connect(() => this.vote());
        this._actionbox.addObject(this.voteButton, this._actionbox.container);

        this.deleteButton = new ThumbnailAndTextButton()
            .text("Delete")
            .thumbnail(new Graphics()
                .beginFill(0, 0)
                .lineStyle(2, 0xC0DCE7)
                .drawRoundedRect(0, 0, 75, 75, 20)
                .endFill()
                .moveTo(10, 10)
                .lineTo(65, 65)
                .moveTo(65, 10)
                .lineTo(10, 65))
            .tooltip("Delete this design to retrieve your slots for this round");
        // this.deleteButton.clicked.connect(() => this.unpublish());
        this._actionbox.addObject(this.deleteButton, this._actionbox.container);

        this.cancelButton = new GameButton().label("Cancel", 12);
        this._actionbox.addObject(this.cancelButton, this._actionbox.container);
        this.cancelButton.clicked.connect(() => this.close(null));

        this.editButton = new GameButton().label("Edit", 12);
        this._actionbox.addObject(this.editButton, this._actionbox.container);
        // this.editButton.clicked.connect(() => this.navigate_to_solution());

        this._solution_desc = new SolutionDescBox(this._solution, this._puzzle);
        this._solution_desc.display.position = new Point(10, 10);
        this._actionbox.addObject(this._solution_desc, this._actionbox.container);

        this.regs.add(this.mode.resized.connect(() => this.updateLayout()));
        this.updateLayout();
    }

    private updateLayout(): void {
        let width = Flashbang.stageWidth - 90;
        let height = Flashbang.stageHeight - 220;

        this._actionbox.setSize(width, height);
        this._solution_desc.setSize(this._actionbox.width - 20, this._actionbox.height - 120);

        DisplayUtil.positionRelativeToStage(
            this._actionbox.display, HAlign.CENTER, VAlign.CENTER,
            HAlign.CENTER, VAlign.CENTER);
    }

    private readonly _solution: Solution;
    private readonly _puzzle: Puzzle;
    private readonly _voteDisabled: boolean;

    private _actionbox: GamePanel;
    private _solution_desc: SolutionDescBox;
}

class ThumbnailAndTextButton extends GameButton {
    public constructor() {
        super();

        this._view = new Container();
        this.container.addChild(this._view);

        this._bgFrame = new Graphics()
            .lineStyle(2, 0xC0DCE7)
            .drawRoundedRect(0, 0, 75, 75, 20);
        this._view.addChild(this._bgFrame);

        this._textField = Fonts.arial("", 14).bold().build();
        this._view.addChild(this._textField);

        this.allStates(this._view);
    }

    public text(value: string): ThumbnailAndTextButton {
        this._textField.text = value;
        DisplayUtil.positionRelative(
            this._textField, HAlign.CENTER, VAlign.TOP,
            this._bgFrame, HAlign.CENTER, VAlign.BOTTOM, 0, 3);
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
                this._bgFrame, HAlign.CENTER, VAlign.CENTER);
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
