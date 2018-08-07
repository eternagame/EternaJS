import * as log from "loglevel";
import {ExtendedTextStyle} from "pixi-multistyle-text";
import {Point} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GameObject} from "../../flashbang/core/GameObject";
import {Vector2} from "../../flashbang/geom/Vector2";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {StyledTextBuilder} from "../../flashbang/util/StyledTextBuilder";
import {RNAAnchorObject} from "../pose2D/RNAAnchorObject";
import {FancyTextBalloon} from "../ui/FancyTextBalloon";
import {ColorUtil} from "../util/ColorUtil";
import {Fonts} from "../util/Fonts";
import {ROPWait} from "./ROPWait";
import {RScriptArrow} from "./RScriptArrow";
import {RScriptEnv} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";

export enum ROPTextboxMode {
    TEXTBOX_LOCATION = "TEXTBOX_LOCATION",
    TEXTBOX_NUCLEOTIDE = "TEXTBOX_NUCLEOTIDE",
    TEXTBOX_DEFAULT = "TEXTBOX_DEFAULT",
    ARROW_LOCATION = "ARROW_LOCATION",
    ARROW_NUCLEOTIDE = "ARROW_NUCLEOTIDE",
    ARROW_DEFAULT = "ARROW_DEFAULT",
}

export class ROPTextbox extends RScriptOp {
    public static readonly id_postfix: string = "_textbox_";

    public constructor(env: RScriptEnv, show: boolean, mode: ROPTextboxMode) {
        super(env);
        this._show = show;
        this._mode = mode;
    }

    /* override */
    public InitializeROP(op: string, args: string): void {
        super.InitializeROP(op, args);
        this._id = ROPTextbox.ProcessId(this._id, this._mode);
        this._parent_id = ROPTextbox.ProcessId(this._parent_id, ROPTextboxMode.TEXTBOX_LOCATION);
        this._text = ROPTextbox.ProcessText(this._text);
    }

    /* override */
    public exec(): void {
        if (this._env.Exists(this._id)) {
            if (ROPTextbox.isTextbox(this._mode)) {
                this.RemoveTextbox();
            } else {
                let prevArr = this._env.GetVar(this._id);
                if (prevArr instanceof GameObject) {
                    this.RemoveArrow(prevArr);
                } else {
                    log.warn(`${this._id} is not an arrow`);
                }
            }
        }

        if (this._show && ROPTextbox.isTextbox(this._mode)) {
            let textBox = new FancyTextBalloon(0x122944, 1.0, true, 0xC0DCE7);
            let parent: ContainerObject = this._env;
            if (this._initial_show) {
                if (this._forceTopmost && false) {
                    // parent = Application.instance.get_front_object_container();
                    // Application.instance.get_front_object_container().add_object(textBox);
                } else {
                    this._env.addObject(textBox, this._env.container);
                }
            }

            this._env.StoreVar(this._id, textBox, parent);

            let textStyle: ExtendedTextStyle = {
                fontFamily: Fonts.ARIAL,
                fontSize: 13,
                fill: 0xC0DCE7

                // TSC: wordWrap + letterSpacing is currently broken:
                // https://github.com/tleunen/pixi-multistyle-text/issues/67
                // letterSpacing: 1.0
            };

            if (this._fixedSize) {
                textBox.set_fixed_width(215);
                textStyle.wordWrap = true;
                textStyle.wordWrapWidth = 185;
            }

            // textBox.use_html(true);
            textBox.set_styled_text(new StyledTextBuilder(textStyle).append(this._text));

            if (this._title.length > 0) {
                textBox.set_title(this._title);
            }

            if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                textBox.display.position = new Point(
                    Flashbang.stageWidth * this._x_pos + this._x_rel,
                    Flashbang.stageHeight * this._y_pos + this._y_rel
                );
                // textBox.set_pos(new UDim(this._x_pos, this._y_pos, this._x_rel, this._y_rel));
            } else if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                // Get position of the textbox based on position of the nucleotide.
                let p: Point = this._env.GetRNA().get_base_xy(this._nuc_idx);
                // trace((-1.0 * textBox.height / 2) + " " + _y_offset_specified + " " + _y_offset);
                let offset = new Point(ROPTextbox.DEFAULT_X_OFFSET, -(textBox.container.height * 0.5) - 10);
                if (this._x_offset_specified) {
                    offset.x = this._x_offset;
                }

                if (this._y_offset_specified) {
                    offset.y = this._y_offset;
                }

                textBox.display.position = new Point(p.x + offset.x, p.y + offset.y);
                this._env.GetRNA().add_anchored_object(new RNAAnchorObject(textBox, this._nuc_idx, offset));
            } else if (this._mode === ROPTextboxMode.TEXTBOX_DEFAULT) {
                this._env.SetTextboxVisible(this._id, true);
                return;
            }

            if (this._button_text !== "") {
                textBox.showButton(true).clicked.connect(() => this.OnClickEvent());
            } else {
                textBox.showButton(false);
            }
        } else if (this._show) {
            let parent: FancyTextBalloon = null;
            if (this._has_parent) {
                let parentVal = this._env.GetVar(this._parent_id);
                if (parentVal instanceof FancyTextBalloon) {
                    parent = parentVal;
                } else if (parentVal == null) {
                    this._has_parent = false;
                } else {
                    log.warn(`${this._parent_id}: is not a FancyTextBalloon`);
                    this._has_parent = false;
                }
            }

            // Draw Arrow.
            let newArrow = new RScriptArrow(this._my_width + 20, 60, this._outlineColor, this._fillColor);

            if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                newArrow.display.position = new Point(
                    Flashbang.stageWidth * this._x_pos + this._x_rel,
                    Flashbang.stageHeight * this._y_pos + this._y_rel
                );
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                newArrow.display.position = this._env.GetRNA().get_base_xy(this._nuc_idx);
            }

            // Determine where we want to draw the tip of the arrow
            if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                newArrow.display.position.x += 6;
            }

            if (this._has_parent) {
                // Modify degree and length if textbox is present.
                // We want the arrow to point to the area FROM the textbox and it should extend all the way to the
                // textbox as well.
                let xdiff: number = (parent.display.x + parent.container.width / 2) - newArrow.display.x;
                let ydiff: number = parent.display.y - newArrow.display.y;
                if (ydiff < 0.0) {
                    ydiff += parent.container.height;
                }

                if (xdiff !== 0) {
                    this._arrowRotation = Math.atan(ydiff / xdiff) * 180 / Math.PI;
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

            if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                let offset = new Vector2();
                offset.x = Math.cos(this._arrowRotation * Math.PI / 180);
                offset.y = Math.sin(this._arrowRotation * Math.PI / 180);
                if (!this._x_offset_specified) {
                    offset.length = ROPTextbox.DEFAULT_ARROW_OFFSET;
                } else {
                    offset.length = this._x_offset;
                }
                let p = this._env.GetRNA().get_base_xy(this._nuc_idx);
                newArrow.display.position = new Point(p.x + offset.x, p.y + offset.y);
                log.debug("TODO: set_anchor_nucleotide?");
                // TSC - I'm not sure if this is ever called or what it should do
                // newArrow.set_anchor_nucleotide(this._env.GetRNA(), this._nuc_idx, offset.x, offset.y);
            }
            this._env.addObject(newArrow, this._env.container);
            this._env.StoreVar(this._id, newArrow, this._env);
            if (this._has_parent) {
                parent.add_child_arrow(newArrow);
            }
        }
    }

    /* override */
    protected ParseArgument(arg: string, i: number): void {
        let rx: RegExp = /^([^+-]*)((?:\+|-).+)$/g;
        let regResult: RegExpExecArray = null;
        switch (i) {
        case 0: // Always text in "Show". Is the ID in Hide and regular Show or for arrows.
            if (this._show && (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE || this._mode === ROPTextboxMode.TEXTBOX_LOCATION)) {
                this._text = this._env.GetStringRef(arg);
            } else if (this._show && this._mode === ROPTextboxMode.ARROW_LOCATION) {
                if ((regResult = rx.exec(arg)) != null) {
                    this._x_pos = Number(regResult[1]);
                    this._x_rel = Number(regResult[2]);
                } else {
                    this._x_pos = Number(arg);
                }
            } else if (this._show && this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._nuc_idx = Number(arg) - 1;
            } else {
                this._id = this._env.GetStringRef(arg);
            }
            break;
        case 1: // X in mode 0. Nucleotide index in mode 1.
            if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                if ((regResult = rx.exec(arg)) != null) {
                    this._x_pos = Number(regResult[1]);
                    this._x_rel = Number(regResult[2]);
                } else {
                    this._x_pos = Number(arg);
                }
            } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                if ((regResult = rx.exec(arg)) != null) {
                    this._y_pos = Number(regResult[1]);
                    this._y_rel = Number(regResult[2]);
                } else {
                    this._y_pos = Number(arg);
                }
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._id = this._env.GetStringRef(arg);
            } else {
                this._nuc_idx = Number(arg) - 1;
            }
            break;
        case 2: // Y in mode 0. Title in mode 1.
            if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                if ((regResult = rx.exec(arg)) != null) {
                    this._y_pos = Number(regResult[1]);
                    this._y_rel = Number(regResult[2]);
                } else {
                    this._y_pos = Number(arg);
                }
            } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._arrowRotation = Number(arg);
            } else {
                this._title = this._env.GetStringRef(arg);
            }
            break;
        case 3: // Title in mode 0. Id in mode 1.
            if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                this._title = this._env.GetStringRef(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                this._arrowRotation = Number(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._arrowLength = Number(arg);
            } else {
                this._id = this._env.GetStringRef(arg);
            }
            break;
        case 4: // Id in mode 0. Button text in mode 1.
            if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                this._arrowLength = Number(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._my_width = Number(arg);
            } else {
                this._button_text = this._env.GetStringRef(arg);
            }
            break;
        case 5: // Button text in mode 1.
            if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                this._button_text = this._env.GetStringRef(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                this._my_width = Number(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._has_parent = ROPTextbox.parseBool(arg);
            } else {
                this._initial_show = ROPTextbox.parseBool(arg);
            }
            break;
        case 6:
            if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                this._has_parent = ROPTextbox.parseBool(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._parent_id = this._env.GetStringRef(arg);
            } else if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                this._fixedSize = ROPTextbox.parseBool(arg);
            } else {
                this._initial_show = ROPTextbox.parseBool(arg);
            }
            break;
        case 7:
            if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                this._parent_id = this._env.GetStringRef(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._fillColor = ColorUtil.fromString(`#${this._env.GetStringRef(arg)}`);
            } else if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                this._fixedSize = ROPTextbox.parseBool(arg);
            } else if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                this._forceTopmost = ROPTextbox.parseBool(arg);
            }
            break;
        case 8:
            if (this._mode === ROPTextboxMode.ARROW_LOCATION) {
                this._fillColor = ColorUtil.fromString(`#${this._env.GetStringRef(arg)}`);
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._outlineColor = ColorUtil.fromString(`#${this._env.GetStringRef(arg)}`);
            } else if (this._mode === ROPTextboxMode.TEXTBOX_LOCATION) {
                this._forceTopmost = ROPTextbox.parseBool(arg);
            } else if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                this._x_offset_specified = true;
                this._x_offset = Number(arg);
            }
            break;
        case 9:
            if (this._mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE) {
                this._y_offset_specified = true;
                this._y_offset = Number(arg);
            } else if (this._mode === ROPTextboxMode.ARROW_NUCLEOTIDE) {
                this._x_offset_specified = true;
                this._x_offset = Number(arg);
            } else {
                this._outlineColor = ColorUtil.fromString(`#${this._env.GetStringRef(arg)}`);
            }
            break;

        default:
            throw new Error(`Invalid argument for ROP: Textbox -- ${this._env.GetStringRef(arg)}`);
        }
    }

    /* override */
    protected VerifyArguments(): void {
    }

    private OnClickEvent(): void {
        ROPWait.NotifyTextboxProgress(this._id);
    }

    private RemoveTextbox(): void {
        this._env.DeleteVar(this._id);
    }

    private RemoveArrow(inArr: GameObject): void {
        inArr.destroySelf();
    }

    private static ProcessId(inId: string, type: string): string {
        let use_postfix: string = ROPTextbox.isArrow(type) ? ROPTextbox.arrow_id_postfix : ROPTextbox.id_postfix;
        if (!inId) return use_postfix;
        return inId + use_postfix;
    }

    private static ProcessText(inText: string): string {
        if (!inText) return "";
        inText = inText.replace(/\<color/gi, "<font color");
        inText = inText.replace(/\<red/gi, `<font color = "#${ROPTextbox.STD_RED_COLOR}"`);
        inText = inText.replace(/\<green/gi, `<font color = "#${ROPTextbox.STD_GREEN_COLOR}"`);
        inText = inText.replace(/\<blue/gi, `<font color = "#${ROPTextbox.STD_BLUE_COLOR}"`);
        inText = inText.replace(/\<yellow/gi, `<font color = "#${ROPTextbox.STD_YELLOW_COLOR}"`);

        inText = inText.replace(/\/(color|red|green|blue|yellow)/gi, "/font");
        return inText;
    }

    private static parseBool(arg: string): boolean {
        return arg.toUpperCase() === "TRUE";
    }

    private static isTextbox(mode: string): boolean {
        return mode === ROPTextboxMode.TEXTBOX_LOCATION || mode === ROPTextboxMode.TEXTBOX_NUCLEOTIDE || mode === ROPTextboxMode.TEXTBOX_DEFAULT;
    }

    private static isArrow(mode: string): boolean {
        return !ROPTextbox.isTextbox(mode);
    }

    private readonly _show: boolean;
    private readonly _mode: ROPTextboxMode;

    private _text: string;
    private _title: string = "";
    private _x_pos: number = 0;
    private _y_pos: number = 0;
    private _x_rel: number = 0;
    private _y_rel: number = 0;
    private _nuc_idx: number = 0;
    private _id: string = "";
    private _button_text: string = "Next";
    private _initial_show: boolean = true;
    private _arrowRotation: number = 0;
    private _arrowLength: number = 100;
    private _my_width: number = 20;
    private _has_parent: boolean = false;
    private _parent_id: string = "";
    private _fillColor: number = 0xFF0000;
    private _outlineColor: number= 0x000000;
    private _fixedSize: boolean = true;
    private _forceTopmost: boolean = false;
    private _x_offset_specified: boolean = false;
    private _x_offset: number;
    private _y_offset_specified: boolean = false;
    private _y_offset: number;

    private static readonly arrow_id_postfix: string = "_arrow_";
    private static readonly DEFAULT_X_OFFSET: number = 35;
    private static readonly DEFAULT_ARROW_OFFSET: number = 12;
    private static readonly STD_RED_COLOR: string = "F85F00";
    private static readonly STD_BLUE_COLOR: string = "00BFF9";
    private static readonly STD_GREEN_COLOR: string = "01EC04";
    private static readonly STD_YELLOW_COLOR: string = "FFFA00";
}
