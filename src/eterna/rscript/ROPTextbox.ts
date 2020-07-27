import * as log from 'loglevel';
import {TextStyleExtended} from 'pixi-multistyle-text';
import {Point} from 'pixi.js';
import FancyTextBalloon from 'eterna/ui/FancyTextBalloon';
import Fonts from 'eterna/util/Fonts';
import {
    StyledTextBuilder, Flashbang, Vector2, GameObject, ColorUtil, Assert
} from 'flashbang';
import RNAAnchorObject from 'eterna/pose2D/RNAAnchorObject';
import TextUtil from 'eterna/util/TextUtil';
import ROPWait from './ROPWait';
import RScriptArrow from './RScriptArrow';
import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';

export enum ROPTextboxMode {
    TEXTBOX_LOCATION = 'TEXTBOX_LOCATION',
    TEXTBOX_NUCLEOTIDE = 'TEXTBOX_NUCLEOTIDE',
    TEXTBOX_DEFAULT = 'TEXTBOX_DEFAULT',
    ARROW_LOCATION = 'ARROW_LOCATION',
    ARROW_NUCLEOTIDE = 'ARROW_NUCLEOTIDE',
    ARROW_ENERGY = 'ARROW_ENERGY',
    ARROW_DEFAULT = 'ARROW_DEFAULT',
}

export default class ROPTextbox extends RScriptOp {
    public static readonly ID_POSTFIX = '_textbox_';

    constructor(env: RScriptEnv, show: boolean, mode: ROPTextboxMode) {
        super(env);
        this._show = show;
        this._mode = mode;
    }

    /* override */
    public initialize(op: string, args: string): void {
        super.initialize(op, args);
        this._id = ROPTextbox.processID(this._id, this._mode);
        this._parentID = ROPTextbox.processID(this._parentID, ROPTextboxMode.TEXTBOX_LOCATION);
        this._text = this._text ? TextUtil.processTags(this._text) : '';
    }

    private showTextbox(): void {
        let textBox = new FancyTextBalloon(0x122944, 1.0, true, 0xC0DCE7);
        if (this._initialShow) {
            // if (this._forceTopmost && false) {
            // parent = Application.instance.get_front_object_container();
            // Application.instance.get_front_object_container().add_object(textBox);
            // } else {
            this._env.addObject(textBox, this._env.container);
            // }
        }

        this._env.setVar(this._id, textBox);

        let textStyle: TextStyleExtended = {
            fontFamily: Fonts.STDFONT,
            fontSize: 13,
            fill: 0xC0DCE7

            // TSC: wordWrap + letterSpacing is currently broken:
            // https://github.com/tleunen/pixi-multistyle-text/issues/67
            // letterSpacing: 1.0
        };

        if (this._fixedSize) {
            textBox.fixedWidth = 215;
            textStyle.wordWrap = true;
            textStyle.wordWrapWidth = 185;
        }

        textBox.styledText = new StyledTextBuilder(textStyle).appendHTMLStyledText(this._text);

        if (this._title.length > 0) {
            textBox.title = this._title;
        }

        if (this._buttonText !== '') {
            textBox.showButton(true).clicked.connect(() => this.onClickEvent());
        } else {
            textBox.showButton(false);
        }

        let updateLocation = () => {
            if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                Assert.assertIsDefined(Flashbang.stageWidth);
                Assert.assertIsDefined(Flashbang.stageHeight);
                textBox.display.position = new Point(
                    Flashbang.stageWidth * this._xPos + this._xRel,
                    Flashbang.stageHeight * this._yPos + this._yRel
                );
            } else if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                // Get position of the textbox based on position of the nucleotide.
                let p: Point = this._env.pose.getBaseLoc(this._targetIndex);
                let offset = new Point(ROPTextbox.DEFAULT_X_OFFSET, -(textBox.container.height * 0.5) - 10);
                if (this._hasXOffset) {
                    offset.x = this._xOffset;
                }

                if (this._hasYOffset) {
                    offset.y = this._yOffset;
                }

                textBox.display.position = new Point(p.x + offset.x, p.y + offset.y);
                this._env.pose.addAnchoredObject(new RNAAnchorObject(textBox, this._targetIndex, offset));
            } else if (this._mode === ROPTextboxMode.TEXTBOX_DEFAULT) {
                this._env.setTextboxVisible(this._id, true);
            }
        };

        Assert.assertIsDefined(this._env.mode);
        textBox.regs.add(this._env.mode.resized.connect(updateLocation));
        updateLocation();
    }

    private showArrow(): void {
        let parent: FancyTextBalloon | null = null;
        if (this._hasParent) {
            let parentVal = this._env.getVar(this._parentID);
            if (parentVal instanceof FancyTextBalloon) {
                parent = parentVal;
            } else if (parentVal === undefined) {
                this._hasParent = false;
            } else {
                log.warn(`${this._parentID}: is not a FancyTextBalloon`);
                this._hasParent = false;
            }
        }

        // Draw Arrow.
        let newArrow = new RScriptArrow(this._myWidth + 20, 60, this._outlineColor, this._fillColor);
        this._env.addObject(newArrow, this._env.container);

        let updateLocation = () => {
            if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                Assert.assertIsDefined(Flashbang.stageHeight);
                Assert.assertIsDefined(Flashbang.stageWidth);
                newArrow.display.position = new Point(
                    Flashbang.stageWidth * this._xPos + this._xRel,
                    Flashbang.stageHeight * this._yPos + this._yRel
                );
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                newArrow.display.position = this._env.pose.getBaseLoc(this._targetIndex);
            } else if (this._mode === ROPTextboxMode.ARROW_ENERGY) {
                newArrow.display.position = this._env.pose.getEnergyScorePos(this._targetIndex);
            }

            // Determine where we want to draw the tip of the arrow
            if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                newArrow.display.position.x += 6;
            }

            if (this._hasParent) {
                // We verified this earlier, but TS isn't smart enough to figure it out
                Assert.assertIsDefined(parent);

                // Modify degree and length if textbox is present.
                // We want the arrow to point to the area FROM the textbox and it should extend all the way to the
                // textbox as well.
                let xdiff: number = (parent.display.x + parent.container.width / 2) - newArrow.display.x;
                let ydiff: number = parent.display.y - newArrow.display.y;
                if (ydiff < 0.0) {
                    ydiff += parent.container.height;
                }

                if (xdiff !== 0) {
                    this._arrowRotation = (Math.atan(ydiff / xdiff) * 180) / Math.PI;
                } else {
                    this._arrowRotation = 0.0;
                }

                if (ydiff > 0.0 && xdiff < 0.0) {
                    this._arrowRotation += 180;
                } else if (ydiff < 0.0 && xdiff < 0.0) {
                    this._arrowRotation += 180;
                }

                if (ydiff < 0.0) { // Above
                    this._arrowLength = Vector2.distance(
                        newArrow.display.x, newArrow.display.y,
                        parent.display.x + parent.container.width * 0.5, parent.display.y + parent.container.height
                    );
                } else { // Below
                    this._arrowLength = Vector2.distance(
                        newArrow.display.x, newArrow.display.y,
                        parent.display.x + parent.container.width / 2, parent.display.y - 50
                    );
                }
            }

            newArrow.rotation = this._arrowRotation;
            newArrow.baseLength = this._arrowLength;
            newArrow.redrawIfDirty();

            const calcOffset = () => {
                const offset = new Vector2();
                offset.x = Math.cos((this._arrowRotation * Math.PI) / 180);
                offset.y = Math.sin((this._arrowRotation * Math.PI) / 180);
                if (!this._hasXOffset) {
                    offset.length = ROPTextbox.DEFAULT_ARROW_OFFSET;
                } else {
                    offset.length = this._xOffset;
                }
                return offset;
            };

            if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                const offset = calcOffset();
                const p = this._env.pose.getBaseLoc(this._targetIndex);
                newArrow.display.position = new Point(p.x + offset.x, p.y + offset.y);
                log.debug('TODO: set_anchor_nucleotide?');
                // TSC - I'm not sure if this is ever called or what it should do
                // newArrow.set_anchor_nucleotide(this._env.GetRNA(), this._nuc_idx, offset.x, offset.y);
            } else if (this._mode === ROPTextboxMode.ARROW_ENERGY) {
                const offset = calcOffset();
                const p = this._env.pose.getEnergyScorePos(this._targetIndex);
                newArrow.display.position = new Point(
                    p.x + offset.x + ROPTextbox.DEFAULT_ENERGY_ARROW_OFFSET.x,
                    p.y + offset.y + ROPTextbox.DEFAULT_ENERGY_ARROW_OFFSET.y
                );
            }
        };

        updateLocation();
        Assert.assertIsDefined(this._env.mode);
        newArrow.regs.add(this._env.mode.resized.connect(updateLocation));

        this._env.setVar(this._id, newArrow);
        if (this._hasParent) {
            // We verified this earlier, but TS isn't smart enough to figure it out
            Assert.assertIsDefined(parent);
            parent.addChildArrow(newArrow);
        }
    }

    public exec(): void {
        if (this._env.hasVar(this._id)) {
            if (ROPTextbox.isTextbox(this._mode)) {
                this.removeTextbox();
            } else {
                let prevArr = this._env.getVar(this._id);
                if (prevArr instanceof GameObject) {
                    this.removeArrow(prevArr);
                } else {
                    log.warn(`${this._id} is not an arrow`);
                }
            }
        }

        if (this._show && ROPTextbox.isTextbox(this._mode)) {
            this.showTextbox();
        } else if (this._show && ROPTextbox.isArrow(this._mode)) {
            this.showArrow();
        }
    }

    /* override */
    protected parseArgument(arg: string, i: number): void {
        let rx = /^([^+-]*)((?:\+|-).+)$/g;
        let regResult: RegExpExecArray | null = null;
        switch (i) {
            case 0: // Always text in "Show". Is the ID in Hide and regular Show or for arrows.
                if (
                    this._show
                    && (
                        this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE
                        || this._mode === ROPTextboxMode.TEXTBOX_LOCATION
                    )
                ) {
                    this._text = this._env.getStringRef(arg);
                } else if (this._show && this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    if ((regResult = rx.exec(arg)) != null) {
                        this._xPos = Number(regResult[1]);
                        this._xRel = Number(regResult[2]);
                    } else {
                        this._xPos = Number(arg);
                    }
                } else if (this._show
                    && (
                        this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE
                        || this._mode === ROPTextboxMode.ARROW_ENERGY
                    )
                ) {
                    this._targetIndex = Number(arg) - 1;
                } else {
                    this._id = this._env.getStringRef(arg);
                }
                break;
            case 1: // X in mode 0. Nucleotide index in mode 1.
                if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                    if ((regResult = rx.exec(arg)) != null) {
                        this._xPos = Number(regResult[1]);
                        this._xRel = Number(regResult[2]);
                    } else {
                        this._xPos = Number(arg);
                    }
                } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    if ((regResult = rx.exec(arg)) != null) {
                        this._yPos = Number(regResult[1]);
                        this._yRel = Number(regResult[2]);
                    } else {
                        this._yPos = Number(arg);
                    }
                } else if (
                    this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE
                    || this._mode === ROPTextboxMode.ARROW_ENERGY
                ) {
                    this._id = this._env.getStringRef(arg);
                } else {
                    this._targetIndex = Number(arg) - 1;
                }
                break;
            case 2: // Y in mode 0. Title in mode 1.
                if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                    if ((regResult = rx.exec(arg)) != null) {
                        this._yPos = Number(regResult[1]);
                        this._yRel = Number(regResult[2]);
                    } else {
                        this._yPos = Number(arg);
                    }
                } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    this._id = this._env.getStringRef(arg);
                } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                    this._arrowRotation = Number(arg);
                } else {
                    this._title = this._env.getStringRef(arg);
                }
                break;
            case 3: // Title in mode 0. Id in mode 1.
                if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                    this._title = this._env.getStringRef(arg);
                } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    this._arrowRotation = Number(arg);
                } else if (
                    this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE
                    || this._mode === ROPTextboxMode.ARROW_ENERGY
                ) {
                    this._arrowLength = Number(arg);
                } else {
                    this._id = this._env.getStringRef(arg);
                }
                break;
            case 4: // Id in mode 0. Button text in mode 1.
                if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                    this._id = this._env.getStringRef(arg);
                } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    this._arrowLength = Number(arg);
                } else if (
                    this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE
                    || this._mode === ROPTextboxMode.ARROW_ENERGY
                ) {
                    this._myWidth = Number(arg);
                } else {
                    this._buttonText = this._env.getStringRef(arg);
                }
                break;
            case 5: // Button text in mode 1.
                if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                    this._buttonText = this._env.getStringRef(arg);
                } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    this._myWidth = Number(arg);
                } else if (
                    this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE
                    || this._mode === ROPTextboxMode.ARROW_ENERGY
                ) {
                    this._hasParent = ROPTextbox.parseBool(arg);
                } else {
                    this._initialShow = ROPTextbox.parseBool(arg);
                }
                break;
            case 6:
                if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    this._hasParent = ROPTextbox.parseBool(arg);
                } else if (
                    this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE
                    || this._mode === ROPTextboxMode.ARROW_ENERGY
                ) {
                    this._parentID = this._env.getStringRef(arg);
                } else if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                    this._fixedSize = ROPTextbox.parseBool(arg);
                } else {
                    this._initialShow = ROPTextbox.parseBool(arg);
                }
                break;
            case 7:
                if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    this._parentID = this._env.getStringRef(arg);
                } else if (
                    this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE
                    || this._mode === ROPTextboxMode.ARROW_ENERGY
                ) {
                    this._fillColor = ColorUtil.fromString(`#${this._env.getStringRef(arg)}`);
                } else if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                    this._fixedSize = ROPTextbox.parseBool(arg);
                } else if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                    this._forceTopmost = ROPTextbox.parseBool(arg);
                }
                break;
            case 8:
                if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    this._fillColor = ColorUtil.fromString(`#${this._env.getStringRef(arg)}`);
                } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                    this._outlineColor = ColorUtil.fromString(`#${this._env.getStringRef(arg)}`);
                } else if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                    this._forceTopmost = ROPTextbox.parseBool(arg);
                } else if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                    this._hasXOffset = true;
                    this._xOffset = Number(arg);
                }
                break;
            case 9:
                if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                    this._hasYOffset = true;
                    this._yOffset = Number(arg);
                } else if (
                    this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE
                    || this._mode === ROPTextboxMode.ARROW_ENERGY
                ) {
                    this._hasXOffset = true;
                    this._xOffset = Number(arg);
                } else {
                    this._outlineColor = ColorUtil.fromString(`#${this._env.getStringRef(arg)}`);
                }
                break;

            default:
                throw new Error(`Invalid argument for ROP: Textbox -- ${this._env.getStringRef(arg)}`);
        }
    }

    /* override */
    protected verifyArguments(): void {
    }

    private onClickEvent(): void {
        ROPWait.notifyTextboxProgress(this._id);
    }

    private removeTextbox(): void {
        this._env.deleteVar(this._id);
    }

    private removeArrow(inArr: GameObject): void {
        inArr.destroySelf();
    }

    private static processID(id: string, type: string): string {
        let usePostfix: string = ROPTextbox.isArrow(type) ? ROPTextbox.ARROW_ID_POSTFIX : ROPTextbox.ID_POSTFIX;
        return id ? id + usePostfix : usePostfix;
    }

    private static parseBool(arg: string): boolean {
        return arg.toUpperCase() === 'TRUE';
    }

    private static isTextbox(mode: string): boolean {
        return mode === ROPTextboxMode.TEXTBOX_LOCATION
            || mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE
            || mode === ROPTextboxMode.TEXTBOX_DEFAULT;
    }

    private static isArrow(mode: string): boolean {
        return !ROPTextbox.isTextbox(mode);
    }

    private readonly _show: boolean;
    private readonly _mode: ROPTextboxMode;

    private _text: string;
    private _title: string = '';
    private _xPos: number = 0;
    private _yPos: number = 0;
    private _xRel: number = 0;
    private _yRel: number = 0;
    private _targetIndex: number = 0;
    private _id: string = '';
    private _buttonText: string = 'Next';
    private _initialShow: boolean = true;
    private _arrowRotation: number = 0;
    private _arrowLength: number = 100;
    private _myWidth: number = 20;
    private _hasParent: boolean = false;
    private _parentID: string = '';
    private _fillColor: number = 0xFF0000;
    private _outlineColor: number = 0x000000;
    private _fixedSize: boolean = true;
    private _forceTopmost: boolean = false;
    private _hasXOffset: boolean = false;
    private _xOffset: number;
    private _hasYOffset: boolean = false;
    private _yOffset: number;

    private static readonly ARROW_ID_POSTFIX = '_arrow_';

    private static readonly DEFAULT_X_OFFSET = 35;
    private static readonly DEFAULT_ARROW_OFFSET = 12;
    private static readonly DEFAULT_ENERGY_ARROW_OFFSET = new Point(15, 7);
}
