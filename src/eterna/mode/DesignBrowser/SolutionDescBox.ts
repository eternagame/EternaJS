import MultiStyleText from 'pixi-multistyle-text';
import {Point, Text} from 'pixi.js';
import Feedback from 'eterna/Feedback';
import GamePanel, {GamePanelType} from 'eterna/ui/GamePanel';
import Puzzle from 'eterna/puzzle/Puzzle';
import Solution from 'eterna/puzzle/Solution';
import EternaURL from 'eterna/net/EternaURL';
import Utility from 'eterna/util/Utility';
import Fonts from 'eterna/util/Fonts';
import GameButton from 'eterna/ui/GameButton';
import VScrollBox from 'eterna/ui/VScrollBox';
import {
    VLayoutContainer,
    HAlign,
    SceneObject,
    RepeatingTask,
    SerialTask,
    AlphaTask
} from 'flashbang';
import LabComments from './LabComments';

interface SolutionDescBoxProps {
    solution: Solution;
    puzzle: Puzzle;
    width: number;
}

export default class SolutionDescBox extends GamePanel {
    private static readonly config = {
        nullDescription: 'No comment'
    };

    constructor(props: SolutionDescBoxProps) {
        super(GamePanelType.INVISIBLE, 1.0, 0x152843, 0.27, 0xC0DCE7);
        this._props = props;
        this._comments = new LabComments(props.solution.nodeID);
        this.setSize(200, 200);
    }

    protected added(): void {
        super.added();
        this.updateDescriptionAndComments();
    }

    public async loadComments() {
        const loadingText = SolutionDescBox.createLoadingText('Loading comments...');
        loadingText.display.position = new Point(
            (this._width - loadingText.display.width) * 0.5,
            this._height - 30
        );
        this.addObject(loadingText, this.container);

        const commentsData = await this._comments.update();
        loadingText.destroySelf();
        this.updateDescriptionAndComments(commentsData);
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
                break;
            case WheelEvent.DOM_DELTA_PAGE:
                pxdelta = e.deltaY * this._height;
                break;
            default:
                throw new Error('Unhandled scroll delta mode');
        }

        this._descriptionAndComments.scrollTo(
            this._descriptionAndComments.scrollProgress + pxdelta / this._descriptionAndComments.content.height
        );
    }

    public async submitComment(comment: string) {
        const submittingText = SolutionDescBox.createLoadingText('Submitting your comment...');
        this.addObject(submittingText, this.container);
        submittingText.display.position = new Point(
            (this._width - submittingText.display.width) * 0.5,
            this._height - 30
        );

        const commentsData = await this._comments.submitComment(comment);
        submittingText.destroySelf();
        this.updateDescriptionAndComments(commentsData);
    }

    protected updateView() {
        super.updateView();

        if (this.isLiveObject) {
            this._descriptionAndComments.setSize(this._width + 7, this._height);

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

        this._descriptionAndComments = new VScrollBox(this._width + 7, this._height);
        this._descriptionAndComments.scrollProgress = prevScroll;
        this.addObject(this._descriptionAndComments, this.container);

        this._descriptionAndCommentsTexts = [];

        let layout = new VLayoutContainer(10, HAlign.LEFT);
        let desc = this.getSolutionText(this._props.solution, this._props.puzzle);
        this._descriptionAndCommentsTexts.push(desc);
        layout.addChild(desc);

        if (commentsData !== undefined) {
            let commentsCount = commentsData != null ? commentsData.length : 0;
            layout.addChild(Fonts.stdBold(`Comments (${commentsCount})`, 13)
                .color(0xffffff).bold().build());

            if (commentsData != null) {
                for (let comment of commentsData) {
                    let commentLayout = new VLayoutContainer(4, HAlign.LEFT);
                    layout.addChild(commentLayout);

                    let url = EternaURL.createURL({page: 'player', uid: comment['uid']});
                    let userButton = new GameButton().label(comment['name'], 12, false);
                    this._descriptionAndComments.addObject(userButton, commentLayout);

                    // eslint-disable-next-line no-loop-func
                    userButton.clicked.connect(() => window.open(url, '_blank'));

                    commentLayout.addChild(Fonts.stdLight(comment['created'], 10).color(0xffffff).build());
                    commentLayout.addVSpacer(6);

                    const comm = Fonts.stdLight(comment['comment'], 14)
                        .color(0xffffff)
                        .wordWrap(true, this._width - 40)
                        .build();
                    this._descriptionAndCommentsTexts.push(comm);
                    commentLayout.addChild(comm);
                }
            }
        }

        layout.layout();
        this._descriptionAndComments.content.addChild(layout);

        // Force the scrollbox to recheck whether the scroll bar is needed
        // Note that the v margin is height + 1, to force the scrollcontainer to recalculate
        this._descriptionAndComments.setSize(this._width + 7, this._height + 1);
    }

    private static createLoadingText(text: string): SceneObject<Text> {
        let loadingText = new SceneObject(Fonts.stdBold(text, 14).color(0xffffff).build());
        loadingText.addObject(new RepeatingTask(() => new SerialTask(
            new AlphaTask(0, 0.7),
            new AlphaTask(1, 0.7)
        )));
        return loadingText;
    }

    private getSolutionText(solution: Solution, puzzle: Puzzle): MultiStyleText {
        let text = '';

        if (solution.expFeedback != null) {
            if (solution.expFeedback.isFailed() === 0) {
                text += '<bold>[SYNTHESIZED!]</bold>\n'
                    + '<orange>This design was synthesized with score </orange>'
                    + `<bold>${solution.getProperty('Synthesis score')} / 100</bold>\n`;
            } else {
                let failureIdx = Feedback.EXPCODES.indexOf(solution.expFeedback.isFailed());
                text += `${Feedback.EXPDISPLAYS_LONG[failureIdx]
                } Score : <bold>${Feedback.EXPSCORES[failureIdx]} / 100</bold>\n`;
            }
        } else if (solution.getProperty('Synthesized') === 'y') {
            text += '<bold>[WAITING]</bold>\n'
                    + '<orange>This design is being synthesized and waiting for results. </orange>\n';
        } else if (solution.getProperty('Round') < puzzle.round) {
            text += '<bold>[OLD]</bold>\n'
                    + '<orange>This design was submitted in round </orange>'
                    + `<bold>${solution.getProperty('Round')}.</bold>`
                    + "<orange> You can't vote on designs from previous rounds."
                    + 'But you can use or resubmit this design by clicking on </orange>'
                    + '<bold>"Modify".</bold>\n';
        }

        // text += '<bold>Design description</bold>\n\n';
        if (solution.fullDescription !== SolutionDescBox.config.nullDescription) {
            text += Utility.stripHtmlTags(solution.fullDescription);
        }

        return new MultiStyleText(text, {
            default: {
                fontFamily: Fonts.STDFONT_REGULAR,
                fontSize: 13,
                fill: 0xffffff,
                wordWrap: true,
                wordWrapWidth: this._width - 40
            },
            bold: {fontStyle: 'bold'},
            orange: {fill: 0xffcc00}
        });
    }

    private readonly _props: SolutionDescBoxProps;
    private readonly _comments: LabComments;

    private _descriptionAndComments: VScrollBox;
    private _descriptionAndCommentsTexts: Text[] = [];
}
