import MultiStyleText from "pixi-multistyle-text";
import {Point, Text} from "pixi.js";
import {HAlign} from "../../../flashbang/core/Align";
import {HLayoutContainer} from "../../../flashbang/layout/HLayoutContainer";
import {VLayoutContainer} from "../../../flashbang/layout/VLayoutContainer";
import {SceneObject} from "../../../flashbang/objects/SceneObject";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {RepeatingTask} from "../../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../../flashbang/tasks/SerialTask";
import {Eterna} from "../../Eterna";
import {Feedback} from "../../Feedback";
import {EternaURL} from "../../net/EternaURL";
import {Puzzle} from "../../puzzle/Puzzle";
import {Solution} from "../../puzzle/Solution";
import {GameButton} from "../../ui/GameButton";
import {GamePanel, GamePanelType} from "../../ui/GamePanel";
import {HTMLTextObject} from "../../ui/HTMLTextObject";
import {TextInputObject} from "../../ui/TextInputObject";
import {VScrollBox} from "../../ui/VScrollBox";
import {Fonts} from "../../util/Fonts";
import {Utility} from "../../util/Utility";
import {CopyTextDialogMode} from "../CopyTextDialogMode";
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

        const boxTitleText =
            "<FONT COLOR=\"#FFCC00\">" + Utility.stripHtmlTags(this._solution.title) + "</FONT> by <A HREF=\"" +
            EternaURL.createURL({"page": "player", "uid": this._solution.playerID}) +
            "\" TARGET=\"_PLAYER\"><U>" + Utility.stripHtmlTags(this._solution.playerName) + "</U></A>";

        this._boxTitle = new HTMLTextObject(boxTitleText).font(Fonts.ARIAL).fontSize(16).selectable(false).bold();
        this._boxTitle.display.position = new Point(20, 20);
        this.addObject(this._boxTitle, this.container);

        this._copySolutionButton = new GameButton().label("Get URL for this design", 10);
        this._copySolutionButton.display.position = new Point(20, 45);
        this.addObject(this._copySolutionButton, this.container);

        const solutionURL = Eterna.SERVER_URL + EternaURL.createURL({
            "page": "browse_solution",
            "puznid": this._puzzle.nodeID,
            "filter1": "Id",
            "filter1_arg1": this._solution.nodeID,
            "filter1_arg2": this._solution.nodeID
        });
        this._copySolutionButton.clicked.connect(
            () => this.modeStack.pushMode(new CopyTextDialogMode(solutionURL, "Solution URL")));

        this._copyPlayerButton = new GameButton().label("Get URL for all designs by this player", 10);
        this._copyPlayerButton.display.position = new Point(20 + this._copySolutionButton.container.width + 10, 45);
        this.addObject(this._copyPlayerButton, this.container);

        const playerURL = Eterna.SERVER_URL + EternaURL.createURL({
            "page": "browse_player",
            "puznid": this._puzzle.nodeID,
            "filter1": "Designer",
            "filter1_arg1": this._solution.playerName
        });
        this._copyPlayerButton.clicked.connect(
            () => this.modeStack.pushMode(new CopyTextDialogMode(playerURL, "Player URL")));

        this._commentInput = new TextInputObject(14)
            .placeholderText("Enter your comment here")
            .showFakeTextInputWhenNotFocused();
        this.addObject(this._commentInput, this.container);

        this._commentButton = new GameButton().label("Post", 14);
        this._commentButton.clicked.connect(() => this.submitComment());
        this.addObject(this._commentButton, this.container);

        this.updateDescriptionAndComments();

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

            this.updateDescriptionAndComments(commentsData);
        });

        this.updateView();
    }

    public updateScroll(e: WheelEvent) {
        let pxdelta: number;
        switch (e.deltaMode) {
            case WheelEvent.DOM_DELTA_PIXEL:
                pxdelta = e.deltaY;
                break;
            case WheelEvent.DOM_DELTA_LINE:
                // 13 -> body font size
                pxdelta = e.deltaY * 13;
                break
            case WheelEvent.DOM_DELTA_PAGE:
                pxdelta = e.deltaY * this._height;
                break;
        }

        this._descriptionAndComments.scrollTo(
            this._descriptionAndComments.scrollProgress + pxdelta / this._descriptionAndComments.content.height
        );
    }

    protected updateView(): void {
        super.updateView();

        if (this.isLiveObject) {
            this._boxTitle.width = this._width - 40;
            this._descriptionAndComments.setSize(this._width - 30, this._height - 130);

            this._commentInput.width = this._width - 90;
            this._commentInput.display.position = new Point(20, this._height - 30);

            this._commentButton.display.position = new Point(this._width - 50, this._height - 30);

            for (let text of this._descriptionAndCommentsTexts) {
                text.style.wordWrapWidth = this._width - 40;
                text.dirty = true;
            }
        }
    }

    private updateDescriptionAndComments(commentsData?: any[]): void {
        let prevScroll = 0;
        if (this._descriptionAndComments != null) {
            prevScroll = this._descriptionAndComments.scrollProgress;
            this._descriptionAndComments.destroySelf();
        }

        this._descriptionAndComments = new VScrollBox(this._width - 30, this._height - 130);
        this._descriptionAndComments.scrollProgress = prevScroll;
        this._descriptionAndComments.display.position = new Point(20, 80);
        this.addObject(this._descriptionAndComments, this.container);

        this._descriptionAndCommentsTexts = [];

        let layout = new VLayoutContainer(0, HAlign.LEFT);
        let desc = this.getSolutionText(this._solution, this._puzzle);
        this._descriptionAndCommentsTexts.push(desc);
        layout.addChild(desc);

        if (commentsData !== undefined) {
            layout.addVSpacer(45);

            let commentsCount = commentsData != null ? commentsData.length : 0;
            layout.addChild(Fonts.arial(`Comments (${commentsCount})`, 13)
                .color(0xffffff).bold().build());

            if (commentsData != null) {
                layout.addVSpacer(15);

                for (let comment of commentsData) {
                    let commentLayout = new HLayoutContainer(4);
                    layout.addChild(commentLayout);

                    let url = EternaURL.createURL({page: "player", uid: comment['uid']});
                    let userButton = new GameButton().label(comment["name"], 10);
                    userButton.clicked.connect(() => window.open(url, "_blank"));

                    this._descriptionAndComments.addObject(userButton, commentLayout);
                    let comm = Fonts.arial(comment["comment"], 13).color(0xffffff).wordWrap(true, this._width - 40).build();
                    this._descriptionAndCommentsTexts.push(comm);
                    commentLayout.addChild(comm);
                }
            }
        }

        layout.layout();
        this._descriptionAndComments.content.addChild(layout);

        // Force the scrollbox to recheck whether the scroll bar is needed
        // Note that the v margin is 131 not 130, to force the scrollcontainer to recalculate
        this._descriptionAndComments.setSize(this._width - 30, this._height - 131);
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
            .then(commentsData => {
                submittingText.destroySelf();

                this._commentInput.display.visible = true;
                this._commentButton.display.visible = true;
                this._commentInput.text = "";

                this.updateDescriptionAndComments(commentsData);
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

    private getSolutionText(solution: Solution, puzzle: Puzzle): MultiStyleText {
        let text = "";

        if (solution.expFeedback != null) {
            if (solution.expFeedback.isFailed() == 0) {
                text += `<bold>[SYNTHESIZED!]</bold>\n` +
                    `<orange>This design was synthesized with score </orange>` +
                    `<bold>${solution.getProperty("Synthesis score")} / 100</bold>\n\n`;
            } else {
                let failureIdx = Feedback.EXPCODES.indexOf(solution.expFeedback.isFailed());
                text += Feedback.EXPDISPLAYS_LONG[failureIdx] +
                    ` Score : <bold>${Feedback.EXPSCORES[failureIdx]} / 100</bold>\n\n`;
            }
        } else {
            if (solution.getProperty("Synthesized") == "y") {
                text += `<bold>[WAITING]</bold>\n` +
                    `<orange>This design is being synthesized and waiting for results. </orange>\n\n`;
            } else if (solution.getProperty("Round") < puzzle.round) {
                text += `<bold>[OLD]</bold>\n` +
                    `<orange>This design was submitted in round </orange>` +
                    `<bold>${solution.getProperty("Round")}.</bold>` +
                    `<orange> You can't vote on designs from previous rounds. But you can use or resubmit this design by clicking on </orange>` +
                    `<bold>"Modify".</bold>\n\n`;
            }
        }

        text += "<bold>Design description</bold>\n\n";
        text += Utility.stripHtmlTags(solution.fullDescription);

        return new MultiStyleText(text, {
            default: {
                fontFamily: Fonts.ARIAL,
                fontSize: 13,
                fill: 0xffffff,
                wordWrap: true,
                wordWrapWidth: this._width - 40
            },
            bold: { fontStyle: "bold" },
            orange: { fill: 0xffcc00 },
        });
    }

    private readonly _solution: Solution;
    private readonly _puzzle: Puzzle;
    private readonly _comments: LabComments;

    private _descriptionAndComments: VScrollBox;
    private _descriptionAndCommentsTexts: Text[] = [];
    private _boxTitle: HTMLTextObject;
    private _copySolutionButton: GameButton;
    private _copyPlayerButton: GameButton;
    private _commentInput: TextInputObject;
    private _commentButton: GameButton;

}
