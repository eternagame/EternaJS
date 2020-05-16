import {
    ContainerObject, StyledTextBuilder, DisplayUtil, Flashbang
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import {Sprite, Point} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox from 'eterna/constraints/ConstraintBox';
import EPars from 'eterna/EPars';
import MultiStyleText from 'pixi-multistyle-text';
import MissionIntroConstraints from './MissionIntroConstraints';
import GameButton from './GameButton';
import PoseThumbnail, {PoseThumbnailType} from './PoseThumbnail';
import UITheme from './UITheme';

interface MissionIntroPanelProps {
    description: string;
    puzzleThumbnails: number[][];
    constraints: ConstraintBox[];
    customLayout?: Array<[number, number]>;
}

export default class MissionIntroPanel extends ContainerObject {
    private static theme = {
        spacing: 10
    };

    private _props: MissionIntroPanelProps;
    private _goalsBG: Sprite;
    private _thumbnail: Sprite;
    private _constraints: MissionIntroConstraints;
    private _titleLabel: PIXI.Text;
    private _descriptionLabel: MultiStyleText;
    private _thumbnailButtons?: GameButton[];

    constructor(props: MissionIntroPanelProps) {
        super();
        this._props = props;

        this._titleLabel = Fonts.stdBold('GOAL', 24).color(0xFAC244).build();
        this.container.addChild(this._titleLabel);

        this._goalsBG = Sprite.fromImage(Bitmaps.ImgGoalBackground);
        this.container.addChild(this._goalsBG);

        // Constraints
        this._constraints = new MissionIntroConstraints({
            constraints: props.constraints
        });
        this.addObject(this._constraints, this.container);

        // Thumbnails
        this._thumbnail = new Sprite();
        this.container.addChild(this._thumbnail);

        const setThumbnail = (targetPairs: number[]) => {
            const wrongPairs = new Array(targetPairs.length).fill(-1);
            const sequence = new Array(targetPairs.length).fill(EPars.RNABASE_ADENINE);
            PoseThumbnail.drawToSprite(
                this._thumbnail,
                sequence,
                targetPairs,
                6,
                PoseThumbnailType.WRONG_COLORED,
                0,
                wrongPairs,
                false,
                0,
                props.customLayout
            );
        };

        if (props.puzzleThumbnails.length > 1) {
            this._thumbnailButtons = props.puzzleThumbnails.map((t, index) => {
                const button = new GameButton().label((index + 1).toString(), 22);
                button.clicked.connect(() => setThumbnail(t));
                this.addObject(button, this.container);
                return button;
            });
        }

        setThumbnail(props.puzzleThumbnails[0]);
    }

    protected added() {
        const updateLayout = () => {
            const {theme} = MissionIntroPanel;
            this._constraints.updateLayout(Flashbang.stageWidth - (this._goalsBG.width + theme.spacing));
            const width = this._goalsBG.width + theme.spacing + this._constraints.actualWidth;

            // Description
            if (this._descriptionLabel) {
                this.container.removeChild(this._descriptionLabel);
            }
            this._descriptionLabel = new StyledTextBuilder({
                fontFamily: Fonts.STDFONT_REGULAR,
                fill: 0xFFFFFF,
                fontSize: Math.min(Flashbang.stageWidth * 0.025, 24),
                wordWrap: true,
                wordWrapWidth: width
            })
                .appendHTMLStyledText(this._props.description)
                .build();
            this.container.addChild(this._descriptionLabel);

            this._descriptionLabel.position.y = this._titleLabel.height + theme.spacing;
            this._goalsBG.position.y = this._descriptionLabel.position.y
                + this._descriptionLabel.height
                + theme.spacing;
            DisplayUtil.center(this._thumbnail, this._goalsBG);

            this._constraints.container.position = new Point(
                this._goalsBG.width,
                this._goalsBG.y + 20
            );

            if (this._thumbnailButtons) {
                this._thumbnailButtons.forEach((button, index) => {
                    button.display.position = new Point(
                        index * (button.container.width + theme.spacing),
                        this._goalsBG.position.y + this._goalsBG.height + theme.spacing
                    );
                });
            }

            const height = this._goalsBG.position.y
                + this._goalsBG.height
                + (this._thumbnailButtons ? (this._thumbnailButtons[0].container.height + theme.spacing) : 0);

            const {headerHeight} = UITheme.missionIntro;
            this.container.position = new Point(
                Math.max(Flashbang.stageWidth - width, 0) / 2,
                headerHeight + Math.max(Flashbang.stageHeight - headerHeight - height, 0) / 2
            );
        };
        updateLayout();
        this.regs.add(this.mode.resized.connect(updateLayout));
    }
}
