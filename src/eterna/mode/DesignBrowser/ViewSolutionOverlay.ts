import {
    Container, Graphics, Point, Sprite, Text
} from 'pixi.js';
import {UnitSignal} from 'signals';
import EPars from 'eterna/EPars';
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
    VLayoutContainer
} from 'flashbang';
import PoseThumbnail, {PoseThumbnailType} from 'eterna/ui/PoseThumbnail';
import Bitmaps from 'eterna/resources/Bitmaps';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import BitmapManager from 'eterna/resources/BitmapManager';
import Utility from 'eterna/util/Utility';
import EternaURL from 'eterna/net/EternaURL';
import TextInputObject from 'eterna/ui/TextInputObject';
import SolutionDescBox from './SolutionDescBox';
import CopyTextDialogMode from '../CopyTextDialogMode';
import ThumbnailAndTextButton from './ThumbnailAndTextButton';
import GameMode from '../GameMode';
import ButtonWithIcon from './ButtonWithIcon';

interface ViewSolutionOverlayProps {
    solution: Solution;
    puzzle: Puzzle;
    voteDisabled: boolean;
    onPrevious: () => void;
    onNext: () => void;
}

export default class ViewSolutionOverlay extends ContainerObject {
    private static readonly theme = {
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

    public readonly playClicked = new UnitSignal();
    public readonly seeResultClicked = new UnitSignal();
    public readonly sortClicked = new UnitSignal();
    public readonly voteClicked = new UnitSignal();
    public readonly editClicked = new UnitSignal();
    public readonly deleteClicked = new UnitSignal();

    public get solution() { return this._props.solution; }

    constructor(props: ViewSolutionOverlayProps) {
        super();
        this._props = props;
    }

    public showSolution(solution: Solution) {
        this.container.visible = true;
        if (solution !== this._props.solution) {
            this._props.solution = solution;
            this.populate();
        }
    }

    protected added(): void {
        super.added();
        const {theme} = ViewSolutionOverlay;

        // Background
        this._panelBG = new SceneObject(new Graphics());
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
        });
        closeButton.container.position = new Point(
            theme.width - theme.margin.right - closeButtonIcon.width,
            theme.margin.top
        );
        this.addObject(closeButton, this.container);

        this.populate();

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(() => this.updateLayout()));
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        if (e.x < this.container.position.x) {
            return false;
        }
        this._solutionDescBox.updateScroll(e);
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

    private populate() {
        const {theme} = ViewSolutionOverlay;

        if (this._content) {
            this._content.destroySelf();
        }

        this._content = new SceneObject(new Container());
        this.addObject(this._content, this.container);

        // Header
        this._header = new VLayoutContainer(10, HAlign.LEFT);
        this._header.position = new Point(theme.margin.left, theme.margin.top);
        this._content.display.addChild(this._header);

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

        const solutionName = Fonts.stdBold()
            .text(Utility.stripHtmlTags(this._props.solution.title))
            .fontSize(24)
            .color(0xffffff)
            .wordWrap(true, theme.width - theme.margin.left - theme.margin.right)
            .build();
        this._header.addChild(solutionName);

        const playerName = Fonts.stdBold()
            .text(`By ${Utility.stripHtmlTags(this._props.solution.playerName)}`)
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
                const solutionURL = Eterna.SERVER_URL + EternaURL.createURL({
                    page: 'browse_solution',
                    puznid: this._props.puzzle.nodeID,
                    filter1: 'Id',
                    // TODO: Update website so that these can be camelcase
                    /* eslint-disable @typescript-eslint/camelcase */
                    filter1_arg1: this._props.solution.nodeID,
                    filter1_arg2: this._props.solution.nodeID
                    /* eslint-enable @typescript-eslint/camelcase */
                });
                this.modeStack.pushMode(new CopyTextDialogMode(solutionURL, 'Solution URL'));
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
                const playerURL = Eterna.SERVER_URL + EternaURL.createURL({
                    page: 'browse_player',
                    puznid: this._props.puzzle.nodeID,
                    filter1: 'Designer',
                    // TODO: Update website so that these can be camelcase
                    /* eslint-disable @typescript-eslint/camelcase */
                    filter1_arg1: this._props.solution.playerName
                    /* eslint-enable @typescript-eslint/camelcase */
                });
                this.modeStack.pushMode(new CopyTextDialogMode(playerURL, 'Player URL'));
            }
        );

        this._content.addObject(playerDesigns, headerLinks);

        // Scrollable content
        if (this._solutionDescBox) {
            this._solutionDescBox.destroySelf();
        }
        this._solutionDescBox = new SolutionDescBox({
            solution: this._props.solution,
            puzzle: this._props.puzzle,
            width: theme.width - theme.margin.left - theme.margin.right
        });
        this._content.addObject(this._solutionDescBox, this._content.display);

        // Footer
        this._footer = new VLayoutContainer(12, HAlign.LEFT);
        this._content.display.addChild(this._footer);

        const playThumbnail = new Sprite();
        let customLayout: Array<[number, number] | [null, null]> | null = null;
        if (this._props.puzzle.targetConditions && this._props.puzzle.targetConditions[0]) {
            customLayout = this._props.puzzle.targetConditions[0]['custom-layout'];
        }

        // Footer buttons
        this._inputContainer = new VLayoutContainer(10, HAlign.RIGHT);
        this._footer.addChild(this._inputContainer);
        this._commentInput = new TextInputObject({
            fontSize: 14,
            bgColor: theme.colors.commentsBackground,
            borderColor: theme.colors.commentsBorder,
            // TextInputObject seems to be 10px bigger than specified in the width param.
            // TODO investigate
            width: theme.width - theme.margin.left - theme.margin.right - 10,
            rows: 3
        })
            .placeholderText('Enter your comment here')
            .showFakeTextInputWhenNotFocused();
        this._content.addObject(this._commentInput, this._inputContainer);

        const commentButtonIcon = new Graphics()
            .beginFill(0x54B54E)
            .drawRoundedRect(0, 0, 64, 30, 5)
            .endFill();
        this._commentButton = new GameButton()
            .customStyleBox(commentButtonIcon)
            .label('Post', 14);
        this._commentButton.clicked.connect(() => this.submitComment());
        this._commentButton.container.x = theme.width - commentButtonIcon.width;
        this._content.addObject(this._commentButton, this._inputContainer);

        PoseThumbnail.drawToSprite(
            playThumbnail,
            EPars.stringToSequence(this._props.solution.sequence),
            EPars.parenthesisToPairs(this._props.puzzle.getSecstruct()),
            3, PoseThumbnailType.BASE_COLORED,
            0, null, false, 0, customLayout
        );
        const playButton = new ThumbnailAndTextButton({
            thumbnail: playThumbnail,
            text: 'View/Copy design'
        }).tooltip('Click to view this design in the game.\nYou can also modify the design and create a new one.');
        playButton.clicked.connect(() => this.playClicked.emit());
        this._content.addObject(playButton, this._footer);

        if (this._props.solution.expFeedback != null && this._props.solution.expFeedback.isFailed() === 0) {
            // SEE RESULT (allowed if the solution is synthesized)
            let expdata = this._props.solution.expFeedback;
            let shapeData = ExpPainter.transformData(
                expdata.getShapeData(), expdata.getShapeMax(), expdata.getShapeMin()
            );
            let resultThumbnail = new Sprite();
            PoseThumbnail.drawToSprite(
                resultThumbnail,
                shapeData,
                EPars.parenthesisToPairs(this._props.puzzle.getSecstruct()),
                3,
                PoseThumbnailType.EXP_COLORED,
                expdata.getShapeStartIndex(),
                null,
                true,
                expdata.getShapeThreshold(),
                customLayout
            );

            const seeResultButton = new ThumbnailAndTextButton({
                thumbnail: resultThumbnail,
                text: 'See Result'
            })
                .tooltip('Click to see the experimental result!');
            seeResultButton.clicked.connect(() => this.seeResultClicked.emit());
            this._content.addObject(seeResultButton, this._footer);
        } else if (
            this._props.solution.getProperty('Synthesized') === 'n'
            && this._props.solution.getProperty('Round') === this._props.puzzle.round
            && !this._props.voteDisabled
        ) {
            // VOTE (disallowed is solution is synthesized or old)
            this._voteButton = new ButtonWithIcon({text: {text: ''}, icon: Bitmaps.ImgVote});
            this._voteButton.clicked.connect(() => this.voteClicked.emit());
            this.setVoteStatus(this._props.solution.getProperty('My Votes') > 0);
            this._footer.addChildAt(this._voteButton.container, 1);
        }

        const sortImage = Sprite.fromImage(Bitmaps.ImgSort);
        // sortImage.scale = new Point(0.3, 0.3);
        const sortButton = new ThumbnailAndTextButton({
            thumbnail: sortImage,
            text: 'Sort by sequence similarity'
        })
            .tooltip('Sort based on similarity to this design.');
        sortButton.clicked.connect(() => this.sortClicked.emit());
        this._content.addObject(sortButton, this._footer);

        // DELETE (only allowed if the puzzle belongs to us and has no votes)
        if (
            this._props.solution.getProperty('Round') === this._props.puzzle.round
            && this._props.solution.playerID === Eterna.playerID
            && this._props.solution.getProperty('Votes') === 0
        ) {
            const deleteButton = new ThumbnailAndTextButton({
                thumbnail: new Graphics()
                    .beginFill(0, 0)
                    .lineStyle(2, 0xC0DCE7)
                    .drawRoundedRect(0, 0, 75, 75, 10)
                    .endFill()
                    .moveTo(10, 10)
                    .lineTo(65, 65)
                    .moveTo(65, 10)
                    .lineTo(10, 65),
                text: 'Delete'
            })
                .tooltip('Delete this design to retrieve your slots for this round');
            deleteButton.clicked.connect(() => this.deleteClicked.emit());
            this._content.addObject(deleteButton, this._footer);
        }

        if (Eterna.DEV_MODE) {
            this._editButton = new GameButton().label('Edit', 12);
            this._content.addObject(this._editButton, this._footer);
            this._editButton.clicked.connect(() => this.editClicked.emit());
        }

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
        previous.clicked.connect(() => this._props.onPrevious());
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
        next.clicked.connect(() => this._props.onNext());
        next.container.position.x = theme.width - theme.margin.right - theme.margin.left - next.container.width;
        this._content.addObject(next, footerLinks);

        this._footer.addVSpacer(20);

        // Load comments
        this._inputContainer.visible = false;
        this._solutionDescBox.loadComments().then(() => {
            this._inputContainer.visible = true;
            this._commentInput.text = '';
            this.updateLayout();
        });

        this.updateLayout();
    }

    private updateLayout(): void {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        const {theme} = ViewSolutionOverlay;
        this.container.position = new Point(Flashbang.stageWidth - theme.width, 0);

        this._panelBG.display.clear();
        this._panelBG.display.beginFill(0x101010);
        this._panelBG.display.drawRect(0, 0, theme.width, Flashbang.stageHeight);

        this._header.layout(true);
        this._inputContainer.layout(true);
        this._footer.layout(true);
        this._footer.position = new Point(theme.margin.left, Flashbang.stageHeight - this._footer.height);

        this._solutionDescBox.container.position = new Point(
            theme.margin.left,
            this._header.position.y + this._header.height + theme.margin.top
        );
        this._solutionDescBox.setSize(
            theme.width - theme.margin.left - theme.margin.right,
            Flashbang.stageHeight - this._solutionDescBox.container.y - this._footer.height - 20
        );
    }

    private async submitComment() {
        if (this._commentInput.text === '') {
            (this.mode as GameMode).showNotification('You cannot post an empty comment');
            return;
        }

        this._inputContainer.visible = false;
        await this._solutionDescBox.submitComment(this._commentInput.text);
        this._commentInput.text = '';
        this._inputContainer.visible = true;
    }

    private readonly _props: ViewSolutionOverlayProps;

    private _content: SceneObject<Container>;
    private _panelBG: SceneObject<Graphics>;
    private _solutionDescBox: SolutionDescBox;
    private _inputContainer: VLayoutContainer;
    private _commentInput: TextInputObject;
    private _commentButton: GameButton;
    private _voteButton: ButtonWithIcon;

    private _cancelButton: GameButton;
    private _editButton: GameButton;

    private _header: VLayoutContainer;
    private _footer: VLayoutContainer;
}
