import {ContainerObject} from 'flashbang';
import ConstraintBox from 'eterna/constraints/ConstraintBox';
import Bitmaps from 'eterna/resources/Bitmaps';
import {Point, Sprite, Graphics} from 'pixi.js';
import BitmapManager from 'eterna/resources/BitmapManager';
import GameButton from './GameButton';
import UITheme from './UITheme';

interface MissionIntroConstraintsProps {
    constraints: ConstraintBox[];
}

export default class MissionIntroConstraints extends ContainerObject {
    private static theme = {
        spacing: 20,
        dotSpacing: 15,
        maxItemsPerPage: 3
    };

    private _props: MissionIntroConstraintsProps;
    private _actualWidth: number;
    private _currentPage = 0;
    private _pageCount = 0;
    private _maxItemsPerPage = 0;
    private _dots: ContainerObject;
    private _leftButton: GameButton;
    private _rightButton: GameButton;
    private _activePageDot: Sprite;
    private _separators: Graphics;

    public get actualWidth() {
        return this._actualWidth;
    }

    constructor(props: MissionIntroConstraintsProps) {
        super();
        this._props = props;
        const {theme} = MissionIntroConstraints;

        const maxConstraintHeight = this._props.constraints?.reduce(
            (prev, cur) => Math.max(prev, cur?.container.height),
            0
        ) ?? 0;
        this._leftButton = new GameButton()
            .up(Bitmaps.ImgArrowLeft)
            .over(Bitmaps.ImgArrowLeft)
            .down(Bitmaps.ImgArrowLeft);
        this._leftButton.display.position = new Point(0, 10);
        this._leftButton.clicked.connect(() => this.pageScroll(-1));
        this.addObject(this._leftButton, this.container);

        this._rightButton = new GameButton()
            .up(Bitmaps.ImgArrowRight)
            .over(Bitmaps.ImgArrowRight)
            .down(Bitmaps.ImgArrowRight);
        this._rightButton.display.position = new Point(0, 10);
        this._rightButton.clicked.connect(() => this.pageScroll(1));
        this.addObject(this._rightButton, this.container);

        // Page dots
        this._dots = new ContainerObject();
        this._dots.container.position.y = maxConstraintHeight + theme.spacing;
        this.addObject(this._dots, this.container);
        this._activePageDot = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgPageActiveDot));
        this._activePageDot.position.y = this._dots.container.position.y;
        this._activePageDot.visible = false;
        this.container.addChild(this._activePageDot);

        props.constraints.forEach((constraint) => {
            this.addObject(constraint, this.container);
            constraint.flare(false);
        });
    }

    public updateLayout(_maxWidth: number) {
        const {theme} = MissionIntroConstraints;
        const {maxConstraintWidth: constraintWidth} = UITheme.missionIntro;

        const evaluateWidth = (numConstraints: number) => this._leftButton.container.width
                + numConstraints * (constraintWidth + theme.spacing)
                - theme.spacing
                + this._rightButton.container.width;

        const maxWidth = Math.min(
            _maxWidth,
            evaluateWidth(Math.min(this._props.constraints.length, theme.maxItemsPerPage))
        );

        // Adapt visible pages to available space
        this._maxItemsPerPage = theme.maxItemsPerPage;
        for (let i = this._maxItemsPerPage; i > 1; --i) {
            const requiredWidth = evaluateWidth(i);
            if (requiredWidth <= maxWidth) {
                break;
            }
            --this._maxItemsPerPage;
        }

        this._pageCount = Math.ceil(this._props.constraints.length / this._maxItemsPerPage);
        this._currentPage = Math.min(this._currentPage, this._pageCount - 1);
        this._actualWidth = Math.min(evaluateWidth(this._maxItemsPerPage), maxWidth);

        const multiPage = this._pageCount > 1;
        this._dots.container.visible = multiPage;
        this._activePageDot.visible = multiPage;

        // Update page dots
        for (let i = 0; i < this._pageCount; ++i) {
            const dot = (() => {
                if (i < this._dots.container.children.length) {
                    return this._dots.container.children[i] as Sprite;
                } else {
                    const dotSprite = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgPageDot));
                    this._dots.container.addChild(dotSprite);
                    return dotSprite;
                }
            })();
            dot.visible = true;
            dot.position.x = i * (dot.width + theme.dotSpacing);
        }
        // Hide unused dots
        for (let i = this._pageCount; i < this._dots.container.children.length; ++i) {
            this._dots.container.children[i].visible = false;
        }

        const dotsWidth = this._pageCount * (this._activePageDot.width + theme.dotSpacing);
        this._dots.container.position.x = (this._actualWidth - dotsWidth) / 2;

        this.updatePages();
    }

    private pageScroll(direction: number) {
        const nextPage = Math.max(Math.min(this._currentPage + direction, this._pageCount - 1), 0);
        if (nextPage === this._currentPage) {
            return;
        }
        this._currentPage = nextPage;
        this.updatePages();
    }

    private updatePages() {
        const {theme} = MissionIntroConstraints;

        const multiPage = this._pageCount > 1;
        this._leftButton.container.visible = multiPage && this._currentPage > 0;
        this._rightButton.container.visible = multiPage && this._currentPage < this._pageCount - 1;

        // Place constraints
        const pageStart = this._currentPage * this._maxItemsPerPage;
        const pageEnd = (this._currentPage + 1) * this._maxItemsPerPage;
        let xWalker = this._leftButton.container.width;

        let lastVisibleConstraint: ConstraintBox | null = null;
        this._props.constraints.forEach((constraint, index) => {
            const visible = index >= pageStart && index < pageEnd;
            constraint.container.visible = visible;
            if (visible) {
                xWalker += Math.abs(constraint.sideTextOffset);
                constraint.container.position.x = xWalker;
                xWalker += constraint.width
                    + constraint.sideTextOffset
                    + theme.spacing;
                lastVisibleConstraint = constraint;
            }
        });

        // Update active dot position
        this._activePageDot.position.x = this._dots.container.position.x
            + this._currentPage * (this._activePageDot.width + theme.dotSpacing);

        // Update right button position
        this._rightButton.container.position.x = xWalker - theme.spacing;
    }
}
