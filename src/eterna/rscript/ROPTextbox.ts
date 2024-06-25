import log from 'loglevel';
import {TextStyleExtended} from 'pixi-multistyle-text';
import {Container, Point, Sprite} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import {
    StyledTextBuilder, Flashbang, Vector2, GameObject, ColorUtil, Assert, VLayoutContainer, HAlign
} from 'flashbang';
import RNAAnchorObject from 'eterna/pose2D/RNAAnchorObject';
import TextUtil from 'eterna/util/TextUtil';
import GameWindow from 'eterna/ui/GameWindow';
import GameButton from 'eterna/ui/GameButton';
import Bitmaps from 'eterna/resources/Bitmaps';
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
        const PADDING = 10;

        const window = new GameWindow({
            movable: this._mode !== ROPTextboxMode.TEXTBOX_NUCLEOTIDE,
            resizable: true,
            closable: false,
            ensureOnScreen: this._mode !== ROPTextboxMode.TEXTBOX_NUCLEOTIDE,
            title: this._title,
            verticalContentMargin: PADDING,
            horizontalContentMargin: PADDING,
            titleFontSize: 14
        });
        window.display.visible = this._initialShow;

        // TODO: Not sure why forceTopmost was never reimplemented in the transition from Flash.
        // Is this a bug? Did our layer handling change? Should this get re-added somehow?

        // if (this._forceTopmost && false) {
        // parent = Application.instance.get_front_object_container();
        // Application.instance.get_front_object_container().add_object(textBox);
        // } else {
        this._env.addObject(window, this._env.container);
        // }

        this._env.setVar(this._id, window);

        const textStyle: TextStyleExtended = {
            fontFamily: Fonts.STDFONT,
            fontSize: 13,
            fill: 0xC0DCE7,
            // Even when disabled, apparently this counts towards the width/height, even though the
            // position starts at the visible location. That throws our sizing calculations off
            dropShadowDistance: 0
            // TSC: wordWrap + letterSpacing is currently broken:
            // https://github.com/tleunen/pixi-multistyle-text/issues/67
            // letterSpacing: 1.0
        };

        const FIXED_SIZE = 215;
        if (this._fixedSize) {
            window.setTargetBounds({width: FIXED_SIZE});
            textStyle.wordWrap = true;
            textStyle.wordWrapWidth = 185;
        }

        const vLayout = new VLayoutContainer(10, HAlign.LEFT);
        window.content.addChild(vLayout);

        // Parse out directives that aren't plain text. We do this by extracting, then removing,
        // reserved patterns, and then rearranging them back in their original order
        const imgPattern = /<img src='([^']+)'\/?>/i;
        const specialPatterns = `(?:${[imgPattern].map((re) => re.source.replace('(', '(?:')).join(')|(?:')})`;

        const specialComponents = this._text.match(new RegExp(specialPatterns, 'ig')) ?? [];
        const textComponents = this._text.split(new RegExp(specialPatterns, 'ig'));

        const components: {type: 'text' | 'img'; value: string; }[] = [];
        for (let i = 0; i < textComponents.length; i++) {
            if (textComponents[i]) components.push({type: 'text', value: textComponents[i]});
            if (specialComponents[i]) {
                const imgMatch = specialComponents[i].match(imgPattern);
                if (imgMatch && imgMatch[1] && imgMatch[1].match(/^(https?:)|(\/)/)) {
                    components.push({type: 'img', value: imgMatch[1]});
                }
            }
        }

        for (const component of components) {
            if (component.type === 'text') {
                const textContainer = new Container();
                vLayout.addChild(textContainer);
                const text = new StyledTextBuilder(textStyle).appendHTMLStyledText(component.value).build();
                textContainer.addChild(text);
                window.regs.add(window.contentSizeWillUpdate.connect(({width}) => {
                    textContainer.removeChildren();
                    const newText = new StyledTextBuilder({
                        ...textStyle,
                        wordWrapWidth: width
                    }).appendHTMLStyledText(component.value).build();
                    textContainer.addChild(newText);
                }));
            } else if (component.type === 'img') {
                const sprite = Sprite.from(component.value);
                sprite.texture.baseTexture.on('loaded', () => {
                    sprite.width = Math.min(vLayout.width, sprite.texture.width);
                    sprite.scale.y = sprite.scale.x;
                    vLayout.layout(true);
                    // Why layout twice? Well, if we have a button, when we call it the first time,
                    // it will compute the target height based on the height with the button at its
                    // old position, *before* it repositioned itself to be below the content now that
                    // the content has pushed it down. The second layout call makes the target height
                    // include the full height including the buttons new position further downward
                    window.layout();
                    window.layout();
                });
                window.regs.add(window.contentSizeWillUpdate.connect(({width}) => {
                    sprite.width = Math.min(width, sprite.texture.width);
                    sprite.scale.y = sprite.scale.x;
                }));
                vLayout.addChild(sprite);
            }
        }

        vLayout.layout(true);
        window.regs.add(window.contentSizeWillUpdate.connect(() => vLayout.layout(true)));

        if (this._buttonText !== '') {
            const button = new GameButton()
                .up(Bitmaps.NovaNext)
                .over(Bitmaps.NovaNextOver)
                .down(Bitmaps.NovaNextHit);
            window.addObject(button, window.content);
            button.display.width = 60;
            button.display.height = 25;
            const reposition = (forceDynamicSize: boolean) => {
                button.display.x = (
                    this._fixedSize && !forceDynamicSize ? FIXED_SIZE - 2 * PADDING : vLayout.width
                ) - button.display.width;
                button.display.y = vLayout.height + 10;
            };
            reposition(false);
            window.regs.add(window.contentSizeWillUpdate.connect(() => reposition(true)));
            button.clicked.connect(() => this.onClickEvent());
        }

        // Not all cases below force a relayout
        window.layout();

        if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
            window.setTargetBounds({
                x: {from: 'left', offsetRatio: this._xPos, offsetFromRatio: this._xRel},
                y: {from: 'top', offsetRatio: this._yPos, offsetFromRatio: this._yRel}
            });
        } else if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
            // Get position of the textbox based on position of the nucleotide.
            const p: Point = this._env.pose.getBaseLoc(this._targetIndex);
            const offset = new Point(ROPTextbox.DEFAULT_X_OFFSET, -(window.container.height * 0.5) - 10);
            if (this._hasXOffset) {
                offset.x = this._xOffset;
            }

            if (this._hasYOffset) {
                offset.y = this._yOffset;
            }

            window.setTargetBounds({
                x: {from: 'left', offsetExact: p.x + offset.x},
                y: {from: 'top', offsetExact: p.y + offset.y}
            });
            this._env.poseField.addAnchoredObject(new RNAAnchorObject(window, this._targetIndex, offset));
        } else if (this._mode === ROPTextboxMode.TEXTBOX_DEFAULT) {
            this._env.setTextboxVisible(this._id, true);
        }
    }

    private showArrow(): void {
        // let parent: FancyTextBalloon | null = null;
        let parent: GameWindow | null = null;
        if (this._hasParent) {
            const parentVal = this._env.getVar(this._parentID);
            // We're no longer using TextBalloon, but GameWindow - is there a reason why this was tied down specifically
            // to TextBalloon?
            // if (parentVal instanceof FancyTextBalloon) {
            if (parentVal instanceof GameWindow) {
                parent = parentVal;
            } else if (parentVal === undefined) {
                this._hasParent = false;
            } else {
                log.warn(`${this._parentID}: is not a FancyTextBalloon`);
                this._hasParent = false;
            }
        }

        // Draw Arrow.
        const newArrow = new RScriptArrow(this._myWidth + 20, 60, this._outlineColor, this._fillColor);
        this._env.addObject(newArrow, this._env.container);

        const updateLocation = () => {
            if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                Assert.assertIsDefined(Flashbang.stageHeight);
                Assert.assertIsDefined(Flashbang.stageWidth);
                newArrow.display.position.set(
                    Flashbang.stageWidth * this._xPos + this._xRel,
                    Flashbang.stageHeight * this._yPos + this._yRel
                );
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                newArrow.display.position.copyFrom(this._env.pose.getBaseLoc(this._targetIndex));
            } else if (this._mode === ROPTextboxMode.ARROW_ENERGY) {
                newArrow.display.position.copyFrom(this._env.pose.getEnergyScorePos(this._targetIndex));
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
                const xdiff: number = (parent.display.x + parent.container.width / 2) - newArrow.display.x;
                const ydiff: number = parent.display.y < newArrow.display.y
                    ? parent.display.y - newArrow.display.y + parent.container.height
                    : parent.display.y - newArrow.display.y;

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
                newArrow.display.position.set(p.x + offset.x, p.y + offset.y);
                log.debug('TODO: set_anchor_nucleotide?');
                // TSC - I'm not sure if this is ever called or what it should do
                // newArrow.set_anchor_nucleotide(this._env.GetRNA(), this._nuc_idx, offset.x, offset.y);
            } else if (this._mode === ROPTextboxMode.ARROW_ENERGY) {
                const offset = calcOffset();
                const p = this._env.pose.getEnergyScorePos(this._targetIndex);
                newArrow.display.position.set(
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
                const prevArr = this._env.getVar(this._id);
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
        const rx = /^([^+-]*)((?:\+|-).+)$/g;
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
                    // this._forceTopmost = ROPTextbox.parseBool(arg);
                }
                break;
            case 8:
                if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                    this._fillColor = ColorUtil.fromString(`#${this._env.getStringRef(arg)}`);
                } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                    this._outlineColor = ColorUtil.fromString(`#${this._env.getStringRef(arg)}`);
                } else if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                    // this._forceTopmost = ROPTextbox.parseBool(arg);
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
        const usePostfix: string = ROPTextbox.isArrow(type) ? ROPTextbox.ARROW_ID_POSTFIX : ROPTextbox.ID_POSTFIX;
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
    private _hasXOffset: boolean = false;
    private _xOffset: number;
    private _hasYOffset: boolean = false;
    private _yOffset: number;

    private static readonly ARROW_ID_POSTFIX = '_arrow_';

    private static readonly DEFAULT_X_OFFSET = 35;
    private static readonly DEFAULT_ARROW_OFFSET = 12;
    private static readonly DEFAULT_ENERGY_ARROW_OFFSET = new Point(15, 7);
}
