import {Point, Text} from "pixi.js";
import {SceneObject} from "../../../flashbang/objects/SceneObject";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {RepeatingTask} from "../../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../../flashbang/tasks/SerialTask";
import {Feedback} from "../../Feedback";
import {EternaURL} from "../../net/EternaURL";
import {Puzzle} from "../../puzzle/Puzzle";
import {Solution} from "../../puzzle/Solution";
import {GameButton} from "../../ui/GameButton";
import {GamePanel, GamePanelType} from "../../ui/GamePanel";
import {GameTextBox} from "../../ui/GameTextBox";
import {HTMLTextObject} from "../../ui/HTMLTextObject";
import {TextInputObject} from "../../ui/TextInputObject";
import {Fonts} from "../../util/Fonts";
import {Utility} from "../../util/Utility";
import {GameMode} from "../GameMode";
import {LabComments} from "./LabComments";

export class SolutionDescBox extends GamePanel {
    constructor(solution: Solution, puzzle: Puzzle) {
        super(GamePanelType.INVISIBLE, 1.0, 0x152843, 0.27, 0xC0DCE7);
        this._solution = solution;
        this._puzzle = puzzle;
        this._comments = new LabComments(this._solution.nodeID);
        this.setSize(200, 200);
    }

    protected added(): void {
        super.added();

        let boxTitleText =
            "<FONT COLOR=\"#FFCC00\">" + Utility.stripHtmlTags(this._solution.title) + "</FONT> by <A HREF=\"" +
            EternaURL.createURL({"page": "player", "uid": this._solution.playerID}) +
            "\" TARGET=\"_PLAYER\"><U>" + Utility.stripHtmlTags(this._solution.playerName) + "</U></A>";

        this._boxTitle = new HTMLTextObject(boxTitleText).font(Fonts.ARIAL).fontSize(16).bold();
        this._boxTitle.display.position = new Point(20, 20);
        this.addObject(this._boxTitle, this.container);

        this._descBox = new GameTextBox([1]);
        this._descBox.display.position = new Point(10, 40);
        this.addObject(this._descBox, this.container);

        this._copySolutionButton = new GameButton().label("Get URL for this design", 10);
        this._copySolutionButton.display.position = new Point(20, 45);
        this.addObject(this._copySolutionButton, this.container);

        this._copyPlayerButton = new GameButton().label("Get URL for all designs by this player", 10);
        this._copyPlayerButton.display.position = new Point(20 + this._copySolutionButton.container.width + 10, 45);
        this.addObject(this._copyPlayerButton, this.container);

        this._commentInput = new TextInputObject(14).placeholderText("Enter your comment here");
        this.addObject(this._commentInput, this.container);

        this._commentButton = new GameButton().label("Post", 14);
        this._commentButton.clicked.connect(() => this.submitComment());
        this.addObject(this._commentButton, this.container);

        let solutionurl: string = EternaURL.createURL({
            "page": "browse_solution",
            "puznid": this._puzzle.nodeID,
            "filter1": "Id",
            "filter1_arg1": this._solution.nodeID,
            "filter1_arg2": this._solution.nodeID
        });

        let playerurl: string = EternaURL.createURL({
            "page": "browse_player",
            "puznid": this._puzzle.nodeID,
            "filter1": "Designer",
            "filter1_arg1": this._solution.playerName
        });

        // let host: string = Eterna.SERVER_URL;
        // this._copy_this._solution_button.set_click_callback(function (): void {
        //     Application.instance.copy_url(host + this._solutionurl);
        // });
        // this._copy_player_button.set_click_callback(function (): void {
        //     Application.instance.copy_url(host + playerurl);
        // });

        this._descBox.set_scroll_to(0);
        this._descBox.set_text([SolutionDescBox.getSolutionText(this._solution, this._puzzle)]);

        this._commentInput.display.visible = false;
        this._commentButton.display.visible = false;

        let loadingText = SolutionDescBox.createLoadingText("Loading comments...");
        loadingText.display.position = new Point(
            (this._width - loadingText.display.width) * 0.5,
            this._height - 30);
        this.addObject(loadingText, this.container);

        this._comments.update().then((commentsData: any[]) => {
            loadingText.destroySelf();

            this._commentInput.display.visible = true;
            this._commentButton.display.visible = true;
            this._commentInput.text = "";

            this._descBox.set_text([
                SolutionDescBox.getSolutionText(this._solution, this._puzzle) + "\n\n" +
                SolutionDescBox.getCommentsText(commentsData)]);
        });

        this.updateView();
    }

    protected updateView(): void {
        super.updateView();

        if (this.isLiveObject) {
            this._boxTitle.width = this._width - 40;
            this._descBox.setSize(this._width - 20, this._height - 50);

            this._commentInput.width = this._width - 90;
            this._commentInput.display.position = new Point(20, this._height - 30);

            this._commentButton.display.position = new Point(this._width - 50, this._height - 30);
        }
    }

    private submitComment(): void {
        if (this._commentInput.text == "") {
            (this.mode as GameMode).showNotification("You cannot post an empty comment");
            return;
        }

        this._commentInput.display.visible = false;
        this._commentButton.display.visible = false;

        let submittingText = SolutionDescBox.createLoadingText("Submitting your comment...");
        this.addObject(submittingText, this.container);
        submittingText.display.position = new Point(
            (this._width - submittingText.display.width) * 0.5,
            this._height - 30);

        this._comments.submit_comment(this._commentInput.text)
            .then((commentsData) => {
                submittingText.destroySelf();

                this._commentInput.display.visible = true;
                this._commentButton.display.visible = true;
                this._commentInput.text = "";

                this._descBox.set_text([
                    SolutionDescBox.getSolutionText(this._solution, this._puzzle) + "\n\n" +
                    SolutionDescBox.getCommentsText(commentsData)]);

                this._descBox.set_scroll_to(1);
            });
    }

    private static createLoadingText(text: string): SceneObject<Text> {
        let loadingText = new SceneObject(Fonts.arial(text, 14).color(0xffffff).build());
        loadingText.addObject(new RepeatingTask(() => {
            return new SerialTask(
                new AlphaTask(0, 0.7),
                new AlphaTask(1, 0.7),
            );
        }));
        return loadingText;
    }

    private static getCommentsText(comments_data: any[]): string {
        let comments_count: number = 0;
        if (comments_data) {
            comments_count = comments_data.length;
        }

        let comments_str = `\n\n<B>Comments (${comments_count})</B>\n\n`;

        if (comments_data) {
            for (let ii = 0; ii < comments_data.length; ii++) {
                let comment: any = comments_data[ii];
                let url = EternaURL.createURL({page: "player", uid: comment['uid']});
                comments_str += `<A HREF="${url}" TARGET="_BLANK"><U><B>${comment['name']}</B></U></A> : `;
                comments_str += comment['comment'] + "\n";
            }
        }
        return comments_str;
    }

    private static getSolutionText(solution: Solution, puzzle: Puzzle): string {
        let text = "";

        if (solution.expFeedback != null) {
            if (solution.expFeedback.isFailed() == 0) {
                text += "<B>[SYNTHESIZED!]</B>\n<FONT COLOR=\"#FFCC00\">This design was synthesized with score </FONT><B>" + solution.getProperty("Synthesis score") + " / 100</B>\n\n";
            } else {
                let failure_index: number = Feedback.EXPCODES.indexOf(solution.expFeedback.isFailed());
                text += Feedback.EXPDISPLAYS_LONG[failure_index] + " Score : <B>" + Feedback.EXPSCORES[failure_index] + " / 100</B>\n\n";
            }
        } else {
            if (solution.getProperty("Synthesized") == "y") {
                text += "<B>[WAITING]</B>\n<FONT COLOR=\"#FFCC00\">This design is being synthesized and waiting for results. </FONT>\n\n"
            } else if (solution.getProperty("Round") < puzzle.round) {
                text += "<B>[OLD]</B>\n<FONT COLOR=\"#FFCC00\">This design was submitted in round </FONT><B>" + solution.getProperty("Round") + ".</B><FONT COLOR=\"#FFCC00\"> You can't vote on designs from previous rounds. But you can use or resubmit this design by clicking on </FONT><B>\"Modify\".</B>\n\n"
            }

        }

        text += "<B>Design description</B>\n\n";
        text += Utility.stripHtmlTags(solution.fullDescription);
        return text;
    }

    private readonly _solution: Solution;
    private readonly _puzzle: Puzzle;
    private readonly _comments: LabComments;

    private _descBox: GameTextBox;
    private _boxTitle: HTMLTextObject;
    private _copySolutionButton: GameButton;
    private _copyPlayerButton: GameButton;
    private _commentInput: TextInputObject;
    private _commentButton: GameButton;

}
