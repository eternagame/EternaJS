import {
    Container, Graphics, Sprite, Text
} from 'pixi.js';
import {UnitSignal} from 'signals';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Eterna from 'eterna/Eterna';
import ExpPainter from 'eterna/ExpPainter';
import Solution from 'eterna/puzzle/Solution';
import Puzzle from 'eterna/puzzle/Puzzle';
import {
    HLayoutContainer,
    Flashbang,
    HAlign,
    Assert,
    ContainerObject,
    SceneObject,
    VLayoutContainer,
    RepeatingTask,
    AlphaTask,
    SerialTask,
    InputUtil,
    KeyCode
} from 'flashbang';
import PoseThumbnail, {PoseThumbnailType} from 'eterna/ui/PoseThumbnail';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import BitmapManager from 'eterna/resources/BitmapManager';
import EternaURL from 'eterna/net/EternaURL';
import TextInputObject from 'eterna/ui/TextInputObject';
import VScrollBox from 'eterna/ui/VScrollBox';
import MultiStyleText from 'pixi-multistyle-text';
import Feedback from 'eterna/Feedback';
import SliderBar from 'eterna/ui/SliderBar';
import {FontWeight} from 'flashbang/util/TextBuilder';
import HTMLTextObject from 'eterna/ui/HTMLTextObject';
import GraphicsObject from 'flashbang/objects/GraphicsObject';
import ThumbnailAndTextButton from './ThumbnailAndTextButton';
import GameMode from '../GameMode';
import ButtonWithIcon from './ButtonWithIcon';
import LabComments, {CommentsData} from './LabComments';
import FeedbackViewMode from '../FeedbackViewMode';
import PoseEditMode from '../PoseEdit/PoseEditMode';
import DesignBrowserMode, {DesignCategory} from './DesignBrowserMode';
import CopyTextDialogMode from '../CopyTextDialogMode';

interface ViewSolutionOverlayProps {
    solution: Solution;
    puzzle: Puzzle;
    voteDisabled: boolean;
    onPrevious: () => void;
    onNext: () => void;
    parentMode: GameMode;
}

export default class ViewSolutionOverlay extends ContainerObject {
    public static readonly theme = {
        width: 427,
        margin: {
            left: 17,
            top: 18,
            right: 17
        },
        colors: {
            links: 0xFAC244,
            commentsBackground: 0x010101,
            commentsBorder: 0x707070
        }
    };

    private static readonly config = {
        nullDescription: 'No comment'
    };

    public readonly playClicked = new UnitSignal();
    public readonly seeResultClicked = new UnitSignal();
    public readonly sortClicked = new UnitSignal();
    public readonly returnClicked = new UnitSignal();
    public readonly voteClicked = new UnitSignal();
    public readonly deleteClicked = new UnitSignal();

    public get solution() { return this._props.solution; }

    constructor(props: ViewSolutionOverlayProps) {
        super();
        this._props = props;
        this._parentMode = props.parentMode;
    }

    protected added(): void {
        super.added();
        const {theme} = ViewSolutionOverlay;

        // Background
        this._panelBG = new GraphicsObject();
        this._panelBG.pointerMove.connect((e) => {
            if (e.data.getLocalPosition(this._panelBG.display).x > 0) {
                e.stopPropagation();
            }
        });
        this.addObject(this._panelBG, this.container);

        // Close button
        const closeButtonIcon = BitmapManager.getBitmap(Bitmaps.BtnClose);
        const closeButton = new GameButton().allStates(closeButtonIcon);
        closeButton.clicked.connect(() => {
            this.container.visible = false;
            this._parentMode.onResized(); // public unlike updateLayout
        });
        closeButton.container.position.set(
            theme.width - theme.margin.right - closeButtonIcon.width,
            theme.margin.top
        );
        this.addObject(closeButton, this.container);

        this.populate();

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(() => this.updateLayout()));
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        if (!this.container.visible || e.x < this.container.position.x) {
            return false;
        }

        // update scroll
        const pxdelta: number = InputUtil.scrollAmount(e, 13, this._scrollView.height);
        this._scrollView.scrollLocation += pxdelta;

        return true;
    }

    public setVoteStatus(voted: boolean) {
        const [icon, text, toolTip] = (() => {
            if (voted) {
                return [
                    Bitmaps.ImgUnvote,
                    'UNVOTE',
                    'Take back your vote on this design.'
                ];
            } else {
                return [
                    Bitmaps.ImgVote,
                    'VOTE',
                    'Vote on this design.'
                ];
            }
        })();
        this._voteButton.updateView({text: {text}, icon});
        this._voteButton.tooltip(toolTip);
    }

    public set parentMode(foo: GameMode) {
        this._parentMode = foo;
    }

    public get parentMode(): GameMode {
        return this._parentMode;
    }

    private populate() {
        const {theme} = ViewSolutionOverlay;

        if (this._content) {
            this._content.destroySelf();
        }

        this._content = new ContainerObject();
        this.addObject(this._content, this.container);

        // Header
        this._header = new VLayoutContainer(10, HAlign.LEFT);
        this._header.position.set(theme.margin.left, theme.margin.top);
        this._content.display.addChild(this._header);

        if (!(this._parentMode instanceof DesignBrowserMode)) {
            const returnToBrowserButton = new GameButton()
                .up(Bitmaps.ImgPrevious)
                .over(Bitmaps.ImgPrevious)
                .down(Bitmaps.ImgPrevious)
                .tooltip('Return to design browser')
                .label('RETURN TO DESIGN BROWSER', 12);
            returnToBrowserButton.clicked.connect(() => this.returnClicked.emit());
            this._content.addObject(returnToBrowserButton, this._header);
        }

        const title = new ButtonWithIcon({
            icon: Bitmaps.ImgInfo,
            text: {
                text: 'DESIGN DETAILS',
                color: 0x4a90e2,
                size: 12
            },
            frame: null
        });
        this._content.addObject(title, this._header);
        this._header.addVSpacer(20);

        const solutionName = Fonts.std()
            .bold()
            .text(this._props.solution.title)
            .fontSize(24)
            .color(0xffffff)
            .wordWrap(true, theme.width - theme.margin.left - theme.margin.right)
            .build();
        this._header.addChild(solutionName);

        const playerName = Fonts.std()
            .bold()
            .text(`By ${this._props.solution.playerName}`)
            .fontSize(18)
            .color(0xffffff)
            .wordWrap(true, theme.width - theme.margin.left - theme.margin.right)
            .build();
        this._header.addChild(playerName);
        this._header.addVSpacer(5);

        // Links
        const headerLinks = new HLayoutContainer(40);
        this._header.addChild(headerLinks);

        const permalink = new ButtonWithIcon({
            icon: Bitmaps.ImgLink,
            text: {
                text: 'Permalink',
                color: theme.colors.links,
                size: 12
            },
            frame: null
        });
        permalink.clicked.connect(
            () => {
                Assert.assertIsDefined(this.modeStack);
                const solutionURL = EternaURL.createURL({
                    page: 'browse_solution',
                    puznid: this._props.puzzle.nodeID,
                    filter1: 'Id',
                    // TODO: Update website so that these can be camelcase
                    /* eslint-disable @typescript-eslint/naming-convention */
                    filter1_arg1: this._props.solution.nodeID,
                    filter1_arg2: this._props.solution.nodeID
                    /* eslint-enable camelcase */
                });
                this.modeStack.pushMode(new CopyTextDialogMode(solutionURL, 'Solution URL'));
                // (this.mode as GameMode).showDialog(new CopyTextDialog(solutionURL, 'Solution URL'));
            }
        );
        this._content.addObject(permalink, headerLinks);

        const playerDesigns = new ButtonWithIcon({
            icon: Bitmaps.ImgLink,
            text: {
                text: 'All designs by this player',
                color: theme.colors.links,
                size: 12
            },
            frame: null
        });
        playerDesigns.clicked.connect(
            () => {
                Assert.assertIsDefined(this.modeStack);
                const playerURL = EternaURL.createURL({
                    page: 'browse_player',
                    puznid: this._props.puzzle.nodeID,
                    filter1: 'Designer',
                    // TODO: Update website so that these can be camelcase
                    /* eslint-disable @typescript-eslint/naming-convention */
                    filter1_arg1: this._props.solution.playerName
                    /* eslint-enable camelcase */
                });
                this.modeStack.pushMode(new CopyTextDialogMode(playerURL, 'Player URL'));
                // (this.mode as GameMode).showDialog(new CopyTextDialog(playerURL, 'Player URL'));
            }
        );

        this._content.addObject(playerDesigns, headerLinks);

        // Scrollable content
        this._scrollViewContainer = new Container();
        this._content.display.addChild(this._scrollViewContainer);
        this._scrollView = new VScrollBox(200, 200);
        this._content.addObject(this._scrollView, this._scrollViewContainer);
        this._contentLayout = new VLayoutContainer(10, HAlign.LEFT);
        this._scrollView.content.addChild(this._contentLayout);

        // Solution description
        const preDescription = this.getSolutionText();
        this._contentLayout.addChild(preDescription);
        if (this._props.solution.fullDescription !== ViewSolutionOverlay.config.nullDescription) {
            const description = new HTMLTextObject(
                this._props.solution.fullDescription,
                theme.width - 40,
                this._scrollView.htmlWrapper,
                true
            ).color(0xffffff).font(Fonts.STDFONT).fontSize(13);
            this._content.addObject(description, this._contentLayout);
        }
        this._contentLayout.addVSpacer(6);

        // Vote button
        if (
            !this._props.voteDisabled
            && this._props.solution.canVote(this._props.puzzle.round)
        ) {
            // VOTE (disallowed is solution is synthesized or old)
            this._voteButton = new ButtonWithIcon({text: {text: ''}, icon: Bitmaps.ImgVote});
            this._voteButton.clicked.connect(() => this.voteClicked.emit());
            this.setVoteStatus(this._props.solution.getProperty(DesignCategory.MY_VOTES) > 0);
            this._content.addObject(this._voteButton, this._contentLayout);
        }

        // Play button
        const playThumbnail = new Sprite();
        const customLayout: Array<[number, number] | [null, null]> | undefined = (
            this._props.puzzle.targetConditions && this._props.puzzle.targetConditions[0]
                ? this._props.puzzle.targetConditions[0]['custom-layout'] : undefined
        );
        PoseThumbnail.drawToSprite(
            playThumbnail,
            this._props.solution.sequence.baseArray,
            SecStruct.fromParens(this._props.puzzle.getSecstruct()),
            3, PoseThumbnailType.BASE_COLORED,
            0, null, false, 0, customLayout
        );
        playThumbnail.scale.set(0.8, 0.8);
        if (!(this._parentMode instanceof PoseEditMode)) {
            const playButton = new ThumbnailAndTextButton({
                thumbnail: playThumbnail,
                text: 'View/Copy design'
            }).tooltip('Click to view this design in the game.\nYou can also modify the design and create a new one.');
            playButton.clicked.connect(() => this.playClicked.emit());
            this._content.addObject(playButton, this._contentLayout);
        }

        // See result button
        if (this._props.solution.synthetized && this._props.solution.expFeedback) {
            // technically this._props.solution.expFeedback is guaranteed
            // if this._props.solution.synthesized, but it doesn't hurt to
            // make that explicit.
            const expdata = this._props.solution.expFeedback;
            const shapeData = ExpPainter.transformData(
                expdata.getShapeData(), expdata.getShapeMax(), expdata.getShapeMin()
            );
            const resultThumbnail = new Sprite();
            PoseThumbnail.drawToSprite(
                resultThumbnail,
                shapeData,
                SecStruct.fromParens(this._props.puzzle.getSecstruct()),
                3,
                PoseThumbnailType.EXP_COLORED,
                expdata.getShapeStartIndex(),
                null,
                true,
                expdata.getShapeThreshold(),
                customLayout
            );
            resultThumbnail.scale.set(0.8, 0.8);

            if (!(this._parentMode instanceof FeedbackViewMode)) {
                const seeResultButton = new ThumbnailAndTextButton({
                    thumbnail: resultThumbnail,
                    text: 'See Result'
                })
                    .tooltip('Click to see the experimental result!');
                seeResultButton.clicked.connect(() => this.seeResultClicked.emit());
                this._content.addObject(seeResultButton, this._contentLayout);
            }
        }

        // Sort button
        const sortImage = Sprite.from(Bitmaps.ImgSort);
        const sortButton = new ThumbnailAndTextButton({
            thumbnail: sortImage,
            text: 'Sort by sequence similarity'
        })
            .tooltip('Sort based on similarity to this design.');
        sortButton.clicked.connect(() => this.sortClicked.emit());
        this._content.addObject(sortButton, this._contentLayout);

        // DELETE (only allowed if the puzzle belongs to us and has no votes)
        if (
            this._props.solution.getProperty(DesignCategory.ROUND) === this._props.puzzle.round
            && this._props.solution.playerID === Eterna.playerID
            && this._props.solution.getProperty(DesignCategory.VOTES) === 0
        ) {
            const deleteButton = new ThumbnailAndTextButton({
                thumbnail: new Graphics()
                    .beginFill(0, 0)
                    .lineStyle(2, 0xC0DCE7)
                    .drawRoundedRect(0, 0, 52, 52, 10)
                    .endFill()
                    .moveTo(10, 10)
                    .lineTo(42, 42)
                    .moveTo(42, 10)
                    .lineTo(10, 42),
                text: 'Delete'
            })
                .tooltip('Delete this design to retrieve your slots for this round');
            deleteButton.clicked.connect(() => this.deleteClicked.emit());
            this._content.addObject(deleteButton, this._contentLayout);
        }

        if (Eterna.DEV_MODE) {
            const editButton = new GameButton().label('Edit', 12);
            this._content.addObject(editButton, this._contentLayout);
            editButton.clicked.connect(() => {
                window.open(`${Eterna.SERVER_URL}/node/${this.solution.nodeID}/edit`, 'soleditwindow');
            });
        }

        this._contentLayout.addVSpacer(10);
        // Comment input
        this._commentsTitle = Fonts.std('Comments', 13).color(0xffffff).bold().build();
        this._contentLayout.addChild(this._commentsTitle);
        this._inputContainer = new VLayoutContainer(10, HAlign.RIGHT);
        this._contentLayout.addChild(this._inputContainer);

        this._commentsInput = new TextInputObject({
            fontSize: 14,
            bgColor: theme.colors.commentsBackground,
            borderColor: theme.colors.commentsBorder,
            // TextInputObject seems to be 10px bigger than specified in the width param.
            // TODO investigate
            width: theme.width - theme.margin.left - theme.margin.right - 10 - SliderBar.THUMB_SIZE,
            rows: 3
        })
            .placeholderText('Enter your comment here');
        this._content.addObject(this._commentsInput, this._inputContainer);

        const commentButtonIcon = new Graphics()
            .beginFill(0x54B54E)
            .drawRoundedRect(0, 0, 64, 30, 5)
            .endFill();
        this._commentsButton = new GameButton()
            .customStyleBox(commentButtonIcon)
            .label('Post', 14);
        this._commentsButton.clicked.connect(() => this.submitComment());
        this._commentsButton.container.x = theme.width - commentButtonIcon.width;
        this._content.addObject(this._commentsButton, this._inputContainer);

        this._commentsContainer = new VLayoutContainer(10, HAlign.LEFT);
        this._contentLayout.addChild(this._commentsContainer);

        // Footer
        this._footer = new VLayoutContainer(12, HAlign.LEFT);
        this._content.display.addChild(this._footer);

        // Footer separator
        this._footer.addChild((() => {
            const line = new Graphics();
            line.lineStyle(1, 0x70707080);
            line.moveTo(0, 1);
            line.lineTo(theme.width - theme.margin.left - theme.margin.right, 1);
            return line;
        })());

        // Footer links
        const footerLinks = new Container();
        this._footer.addChild(footerLinks);

        // Previous
        const previous = new ButtonWithIcon({
            icon: Bitmaps.ImgPrevious,
            text: {
                text: 'Previous',
                color: theme.colors.links,
                size: 12
            },
            frame: null
        });
        this.regs.add(previous.clicked.connect(() => this._props.onPrevious()));
        previous.hotkey(KeyCode.KeyU);
        this._content.addObject(previous, footerLinks);

        // Next
        const next = new ButtonWithIcon({
            icon: Bitmaps.ImgNext,
            iconPosition: 'right',
            text: {
                text: 'Next',
                color: theme.colors.links,
                size: 12
            },
            frame: null
        });
        this.regs.add(next.clicked.connect(() => this._props.onNext()));
        next.container.position.x = theme.width - theme.margin.right - theme.margin.left - next.container.width;
        next.hotkey(KeyCode.KeyD);
        this._content.addObject(next, footerLinks);

        this._footer.addVSpacer(20);

        this.updateLayout();

        this._scrollView.doLayout();

        // Load comments
        this._comments = new LabComments(this._props.solution.nodeID);
        this._inputContainer.visible = false;
        this.loadComments().then(() => {
            if (!this.isLiveObject) return;
            this._inputContainer.visible = true;
            this._commentsInput.text = '';
            this.updateLayout();
        });
    }

    private updateLayout(): void {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        const {theme} = ViewSolutionOverlay;
        this.container.position.set(Flashbang.stageWidth - theme.width, 0);

        this._panelBG.display.clear();
        this._panelBG.display.beginFill(0x101010);
        this._panelBG.display.drawRect(0, 0, theme.width, Flashbang.stageHeight);
        this._header.layout(true);
        this._footer.layout(true);
        this._footer.position.set(theme.margin.left, Flashbang.stageHeight - this._footer.height);

        this._contentLayout.layout(true);
        this._scrollViewContainer.position.set(
            theme.margin.left,
            this._header.position.y + this._header.height + theme.margin.top
        );
        this.updateScrollViewSize();
    }

    private async submitComment() {
        if (this._commentsInput.text === '') {
            (this.mode as GameMode).showNotification('You cannot post an empty comment');
            return;
        }

        this._commentsContainer.removeChildren();
        this._inputContainer.visible = false;
        const submittingText = ViewSolutionOverlay.createLoadingText('Submitting your comment...');
        this._content.addObject(submittingText, this._commentsContainer);
        const commentsData = await this._comments.submitComment(this._commentsInput.text);
        submittingText.destroySelf();

        this._commentsInput.text = '';
        this._inputContainer.visible = true;

        if (commentsData) {
            this.updateCommentsView(commentsData);
            this.updateLayout();
        }
    }

    private async loadComments() {
        const loadingText = ViewSolutionOverlay.createLoadingText('Loading comments...');
        this._content.addObject(loadingText, this._commentsContainer);

        const commentsData = await this._comments.update();
        loadingText.destroySelf();
        if (commentsData && this.isLiveObject) {
            this.updateCommentsView(commentsData);
        }
    }

    private updateCommentsView(commentsData: CommentsData[]) {
        const {theme} = ViewSolutionOverlay;
        const commentsCount = commentsData?.length ?? 0;
        this._commentsTitle.text = `Comments (${commentsCount})`;

        this._content.removeNamedObjects('comment');
        this._commentsContainer.removeChildren();
        for (const comment of commentsData) {
            const commentLayout = new VLayoutContainer(4, HAlign.LEFT);
            this._commentsContainer.addChild(commentLayout);

            const url = EternaURL.createURL({page: 'player', uid: comment['uid']});
            const userButton = new GameButton().label(comment['name'], 12, false);
            this._content.addObject(userButton, commentLayout);

            // eslint-disable-next-line no-loop-func
            userButton.clicked.connect(() => window.open(url, '_blank'));

            commentLayout.addChild(
                Fonts.std(comment['created'], 10)
                    .fontWeight(FontWeight.LIGHT)
                    .color(0xffffff)
                    .build()
            );
            commentLayout.addVSpacer(6);

            const comm = new HTMLTextObject(comment['comment'], theme.width - 40, this._scrollView.htmlWrapper, true)
                .color(0xffffff)
                .fontWeight(FontWeight.LIGHT);
            this._content.addNamedObject('comment', comm, commentLayout);
        }

        this._commentsContainer.layout(true);
        this.updateScrollViewSize(true);
    }

    private getSolutionText() {
        const {solution, puzzle} = this._props;
        let text = '';

        if (solution.expFeedback != null) {
            if (solution.expFeedback.isFailed() === 0) {
                text += '<bold>[SYNTHESIZED!]</bold>\n'
                    + '<orange>This design was synthesized with score </orange>'
                    + `<bold>${solution.getProperty(DesignCategory.SYNTHESIS_SCORE)} / 100</bold>\n`;
            } else {
                const failureIdx = Feedback.EXPCODES.indexOf(solution.expFeedback.isFailed());
                text += `${Feedback.EXPDISPLAYS_LONG[failureIdx]
                } Score : <bold>${Feedback.EXPSCORES[failureIdx]} / 100</bold>\n`;
            }
        } else if (solution.getProperty(DesignCategory.SYNTHESIZED) === 'y') {
            text += '<bold>[WAITING]</bold>\n'
                    + '<orange>This design is being synthesized and waiting for results. </orange>\n';
        } else if (solution.getProperty(DesignCategory.ROUND) < puzzle.round) {
            text += '<bold>[OLD]</bold>\n'
                    + '<orange>This design was submitted in round </orange>'
                    + `<bold>${solution.getProperty(DesignCategory.ROUND)}.</bold>`
                    + "<orange> You can't vote on designs from previous rounds."
                    + 'But you can use or resubmit this design by clicking on </orange>'
                    + '<bold>"Modify".</bold>\n';
        }

        const {theme} = ViewSolutionOverlay;
        return new MultiStyleText(text, {
            default: {
                fontFamily: Fonts.STDFONT,
                fontSize: 13,
                fill: 0xffffff,
                wordWrap: true,
                wordWrapWidth: theme.width - 40
            },
            bold: {fontWeight: 'bold'},
            orange: {fill: 0xffcc00}
        });
    }

    private updateScrollViewSize(forceScrollBarCheck?: boolean) {
        const {theme} = ViewSolutionOverlay;
        const width = theme.width - theme.margin.left;
        Assert.assertIsDefined(Flashbang.stageHeight);
        let height = Flashbang.stageHeight - this._scrollViewContainer.y - this._footer.height - 20;

        // Based on previous code, it seems the scrollbox only updates the bar if it receives a different height
        if (forceScrollBarCheck) {
            height++;
        }

        this._scrollView.setSize(width, height);
    }

    private static createLoadingText(text: string): SceneObject<Text> {
        const loadingText = new SceneObject(Fonts.std(text, 14).bold().color(0xffffff).build());
        loadingText.addObject(new RepeatingTask(() => new SerialTask(
            new AlphaTask(0, 0.7),
            new AlphaTask(1, 0.7)
        )));
        return loadingText;
    }

    private readonly _props: ViewSolutionOverlayProps;

    private _content: ContainerObject;
    private _panelBG: GraphicsObject;

    private _inputContainer: VLayoutContainer;
    private _commentsTitle: Text;
    private _commentsInput: TextInputObject;
    private _commentsButton: GameButton;
    private _commentsContainer: VLayoutContainer;
    private _comments: LabComments;

    private _header: VLayoutContainer;
    private _scrollViewContainer: Container;
    private _scrollView: VScrollBox;
    private _contentLayout: VLayoutContainer;
    private _voteButton: ButtonWithIcon;
    private _footer: VLayoutContainer;
    private _parentMode: GameMode;
}
