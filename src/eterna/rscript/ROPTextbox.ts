import {Point, Graphics} from "pixi.js"
import {GameObject} from "../../flashbang/core/GameObject";
import {RNAAnchorObject} from "../pose2D/RNAAnchorObject";
import {FancyTextBalloon} from "../ui/FancyTextBalloon";
import {UDim} from "../util/UDim";
import {ROPWait} from "./ROPWait";
import {RScriptEnv} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";
import * as log from "loglevel";

export class ROPTextbox extends RScriptOp {
    public static readonly id_postfix: string = "_textbox_";
    public static readonly arrow_id_postfix: string = "_arrow_";

    /*
     * isVisible - True for Show. False for Hide.
     * inMode - 0 for location based. 1 for nucleotide based. 2 for just regular show.
     */
    constructor(isVisible: boolean, inMode: number, env: RScriptEnv) {
        super(env);
        this._op_visible = isVisible;
        this._mode = inMode;
        if (inMode < 0 || inMode > 5) {
            throw new Error("Invalid RScript Textbox Command. Mode: " + String(inMode));
        }
    }

    /*override*/
    public InitializeROP(op: string, args: string): void {
        super.InitializeROP(op, args);
        this._id = ROPTextbox.ProcessId(this._id, this._mode);
        this._parent_id = ROPTextbox.ProcessId(this._parent_id, 0);
        this._text = ROPTextbox.ProcessText(this._text);
    }

    /*override*/
    public exec(): void {
        log.debug("TODO: ROPTextbox.exec");
        // let p: Point;
        // let offset: Point;
        //
        // if (this._env.Exists(this._id)) {
        //     if (this._mode <= 2) {
        //         let prevTB: FancyTextBalloon = this._env.GetVar(this._id);
        //         this.RemoveTextbox(prevTB);
        //     } else {
        //         let prevArr: GameObject = this._env.GetVar(this._id);
        //         this.RemoveArrow(prevArr);
        //     }
        // }
        //
        // if (this._op_visible && this._mode <= 2) {
        //     let textBox: FancyTextBalloon = new FancyTextBalloon(this._text, 0xC0DCE7, 0x122944, 1.0, true, 0xC0DCE7);
        //     if (this._fixedSize) {
        //         textBox.set_fixed_width(215);
        //         textBox.get_game_text().set_autosize(false, false, 185);
        //     }
        //     textBox.use_html(true);
        //     textBox.set_fancy_text(this._text, 13, 0xC0DCE7, "Arial", false, 1.0);
        //     if (this._title.length > 0) {
        //         // TODO: Fix the title bar so that it does not overlap with text.
        //         textBox.set_title(this._title);
        //     }
        //     if (this._mode == 0) {
        //         textBox.set_pos(new UDim(this._x_pos, this._y_pos, this._x_rel, this._y_rel));
        //     } else if (this._mode == 1) {
        //         // Get position of the textbox based on position of the nucleotide.
        //         p = this._env.GetRNA().get_base_xy(this._nuc_idx);
        //         //trace((-1.0 * textBox.height / 2) + " " + _y_offset_specified + " " + _y_offset);
        //         offset = new Point(ROPTextbox.DEFAULT_X_OFFSET, -1.0 * textBox.height / 2 - 10);
        //         if (this._x_offset_specified) {
        //             offset.x = this._x_offset;
        //         }
        //
        //         if (this._y_offset_specified) {
        //             offset.y = this._y_offset;
        //         }
        //
        //         textBox.display.position = new Point(p.x + offset.x, p.y + offset.y);
        //         this._env.GetRNA().add_anchored_object(new RNAAnchorObject(textBox, this._nuc_idx, offset));
        //     } else if (this._mode == 2) {
        //         this._env.SetTextboxVisible(this._id, true);
        //         return;
        //     }
        //
        //     if (this._button_text != "") {
        //         textBox.set_button_text(this._button_text);
        //         textBox.showButton(true).clicked.connect(() => this.OnClickEvent());
        //     } else {
        //         textBox.showButton(false);
        //     }
        //     let par: Object = this._env;
        //     if (this._initial_show) {
        //         if (this._forceTopmost) {
        //             par = Application.instance.get_front_object_container();
        //             Application.instance.get_front_object_container().add_object(textBox);
        //         } else {
        //             this._env.add_object(textBox);
        //         }
        //     }
        //     this._env.StoreVar(this._id, textBox, par);
        // } else if (this._op_visible && this._mode <= 5) {
        //     let parent: GameObject = null;
        //     if (this._has_parent) {
        //         parent = this._env.GetVar(this._parent_id);
        //         if (!parent) {
        //             this._has_parent = false;
        //         }
        //     }
        //
        //     // Draw Arrow.
        //     let newArrow: Graphics = new Graphics();
        //     let dir: Point = new Point(1, 0);
        //
        //     if (this._mode == 3) {
        //         newArrow.set_pos(new UDim(this._x_pos, this._y_pos, this._x_rel, this._y_rel));
        //     } else if (this._mode == 4) {
        //         p = this._env.GetRNA().get_base_xy(this._nuc_idx);
        //         newArrow.position = new Point(p.x, p.y);
        //     }
        //
        //     // Determine where we want to draw the tip of the arrow
        //     let endPoint: Point = new Point(0, 0);
        //     newArrow.endPoint = endPoint;
        //     if (this._mode == 4) {
        //         endPoint.x += 6;
        //     }
        //
        //     if (this._has_parent) {
        //         // Modify degree and length if textbox is present.
        //         // We want the arrow to point to the area FROM the textbox and it should extend all the way to the
        //         // textbox as well.
        //         let xdiff: number = (parent.x + parent.width / 2) - newArrow.x;
        //         let ydiff: number = parent.y - newArrow.y;
        //         if (ydiff < 0.0) {
        //             ydiff += parent.height;
        //         }
        //
        //         if (xdiff != 0) {
        //             this._degree = Math.atan(ydiff / xdiff) * 180 / Math.PI;
        //         } else {
        //             this._degree = 0.0;
        //         }
        //
        //         if (ydiff > 0.0 && xdiff < 0.0) {
        //             this._degree += 180;
        //         } else if (ydiff < 0.0 && xdiff < 0.0) {
        //             this._degree += 180;
        //         }
        //
        //         if (ydiff < 0.0) { // Above
        //             this._length = Point.distance(new Point(newArrow.x, newArrow.y),
        //                 new Point(parent.x + parent.width / 2, parent.y + parent.height));
        //         } else {  // Below
        //             this._length = Point.distance(new Point(newArrow.x, newArrow.y),
        //                 new Point(parent.x + parent.width / 2, parent.y - 50));
        //         }
        //     }
        //
        //     // Draw Triangle with the tip at endPoint.
        //     let trianglePoints: number[] = [];
        //     trianglePoints.push(endPoint.x, endPoint.y);
        //
        //     newArrow._my_width = this._my_width;
        //     newArrow._fillColor = this._fillColor;
        //     newArrow._outlineColor = this._outlineColor;
        //     // Create an equilaterial triangle.
        //     // It should be just a bit wider than the width of the rectangle specified by
        //     // 	_my_width.
        //     let triWidth: number = this._my_width + 20; // 20 is a random number. subject to change yolo.
        //     let triHeight: number = triWidth / 2 * Math.sqrt(2);
        //     let perp_dir: Point = new Point(-1 * dir.y, dir.x);
        //     perp_dir.normalize(1);
        //     let basePoint: Point = endPoint.add(new Point(dir.x * triHeight, dir.y * triHeight));
        //     let n1: Point = basePoint.add(new Point(perp_dir.x * triWidth / 2, perp_dir.y * triWidth / 2));
        //     let n2: Point = basePoint.add(new Point(perp_dir.x * triWidth / -2, perp_dir.y * triWidth / -2));
        //     trianglePoints.push(n1.x, n1.y);
        //     trianglePoints.push(n2.x, n2.y);
        //
        //     newArrow.clear();
        //     newArrow.lineStyle(1, Number("0x" + this._outlineColor));
        //     newArrow.beginFill(Number("0x" + this._fillColor), 1.0);
        //     newArrow.drawTriangles(trianglePoints);
        //
        //     // Now draw the rectangle going in the same dir.
        //     let r_start: Point = basePoint.subtract(new Point(perp_dir.x * this._my_width / 2, perp_dir.y * this._my_width / 2));
        //     newArrow.drawRect(r_start.x, r_start.y, this._length, this._my_width);
        //     newArrow.endFill();
        //
        //     newArrow.lineStyle(NaN);
        //     newArrow.beginFill(Number("0x" + this._fillColor), 1.0);
        //     newArrow.drawRect(r_start.x - 5, r_start.y + 1, 20, this._my_width - 1);
        //     newArrow.rotation = this._degree;
        //
        //     newArrow.endFill();
        //
        //     if (this._mode == 4) {
        //         offset = new Point();
        //         offset.x = Math.cos(this._degree * Math.PI / 180);
        //         offset.y = Math.sin(this._degree * Math.PI / 180);
        //         if (!this._x_offset_specified) {
        //             offset.normalize(ROPTextbox.DEFAULT_ARROW_OFFSET);
        //         } else {
        //             offset.normalize(this._x_offset);
        //         }
        //         p = this._env.GetRNA().get_base_xy(this._nuc_idx);
        //         newArrow.set_pos(new UDim(0, 0, p.x + offset.x, p.y + offset.y));
        //         newArrow.set_anchor_nucleotide(this._env.GetRNA(), this._nuc_idx, offset.x, offset.y);
        //     }
        //     this._env.add_object(newArrow);
        //     this._env.StoreVar(this._id, newArrow, this._env);
        //     if (this._has_parent) {
        //         FancyTextBalloon(parent).add_child_arrow(newArrow);
        //     }
        // }
    }

    /*override*/
    public VerifyArguments(): void {
    }

    /*override*/
    protected ParseArgument(arg: string, i: number): void {
        let rx: RegExp = /^([^+-]*)((?:\+|-).+)$/g;
        let regResult: any[] = null;
        switch (i) {
        case 0: // Always text in "Show". Is the ID in Hide and regular Show or for arrows.
            if (this._op_visible && this._mode < 2) {
                this._text = this._env.GetStringRef(arg);
            } else if (this._op_visible && this._mode == 3) {
                if ((regResult = rx.exec(arg)) != null) {
                    this._x_pos = Number(regResult[1]);
                    this._x_rel = Number(regResult[2]);
                } else {
                    this._x_pos = Number(arg);
                }
            } else if (this._op_visible && this._mode == 4) {
                this._nuc_idx = Number(arg) - 1;
            } else {
                this._id = this._env.GetStringRef(arg);
            }
            break;
        case 1: // X in mode 0. Nucleotide index in mode 1.
            if (this._mode == 0) {
                if ((regResult = rx.exec(arg)) != null) {
                    this._x_pos = Number(regResult[1]);
                    this._x_rel = Number(regResult[2]);
                } else {
                    this._x_pos = Number(arg);
                }
            } else if (this._mode == 3) {
                if ((regResult = rx.exec(arg)) != null) {
                    this._y_pos = Number(regResult[1]);
                    this._y_rel = Number(regResult[2]);
                } else {
                    this._y_pos = Number(arg);
                }
            } else if (this._mode == 4) {
                this._id = this._env.GetStringRef(arg);
            } else {
                this._nuc_idx = Number(arg) - 1;
            }
            break;
        case 2: // Y in mode 0. Title in mode 1.
            if (this._mode == 0) {
                if ((regResult = rx.exec(arg)) != null) {
                    this._y_pos = Number(regResult[1]);
                    this._y_rel = Number(regResult[2]);
                } else {
                    this._y_pos = Number(arg);
                }
            } else if (this._mode == 3) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._mode == 4) {
                this._degree = Number(arg);
            } else {
                this._title = this._env.GetStringRef(arg);
            }
            break;
        case 3: // Title in mode 0. Id in mode 1.
            if (this._mode == 0) {
                this._title = this._env.GetStringRef(arg);
            } else if (this._mode == 3) {
                this._degree = Number(arg);
            } else if (this._mode == 4) {
                this._length = Number(arg);
            } else {
                this._id = this._env.GetStringRef(arg);
            }
            break;
        case 4: // Id in mode 0. Button text in mode 1.
            if (this._mode == 0) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._mode == 3) {
                this._length = Number(arg);
            } else if (this._mode == 4) {
                this._my_width = Number(arg);
            } else {
                this._button_text = this._env.GetStringRef(arg);
            }
            break;
        case 5: // Button text in mode 1.
            if (this._mode == 0) {
                this._button_text = this._env.GetStringRef(arg);
            } else if (this._mode == 3) {
                this._my_width = Number(arg);
            } else if (this._mode == 4) {
                this._has_parent = ROPTextbox.parseBool(arg);
            } else {
                this._initial_show = ROPTextbox.parseBool(arg);
            }
            break;
        case 6:
            if (this._mode == 3) {
                this._has_parent = ROPTextbox.parseBool(arg);
            } else if (this._mode == 4) {
                this._parent_id = this._env.GetStringRef(arg);
            } else if (this._mode == 1) {
                this._fixedSize = ROPTextbox.parseBool(arg);
            } else {
                this._initial_show = ROPTextbox.parseBool(arg);
            }
            break;
        case 7:
            if (this._mode == 3) {
                this._parent_id = this._env.GetStringRef(arg);
            } else if (this._mode == 4) {
                this._fillColor = this._env.GetStringRef(arg);
            } else if (this._mode == 0) {
                this._fixedSize = ROPTextbox.parseBool(arg);
            } else if (this._mode == 1) {
                this._forceTopmost = ROPTextbox.parseBool(arg);
            }
            break;
        case 8:
            if (this._mode == 3) {
                this._fillColor = this._env.GetStringRef(arg);
            } else if (this._mode == 4) {
                this._outlineColor = this._env.GetStringRef(arg);
            } else if (this._mode == 0) {
                this._forceTopmost = ROPTextbox.parseBool(arg);
            } else if (this._mode == 1) {
                this._x_offset_specified = true;
                this._x_offset = Number(arg);
            }
            break;
        case 9:
            if (this._mode == 1) {
                this._y_offset_specified = true;
                this._y_offset = Number(arg);
            } else if (this._mode == 4) {
                this._x_offset_specified = true;
                this._x_offset = Number(arg);
            } else {
                this._outlineColor = this._env.GetStringRef(arg);
            }
            break;

        default:
            throw new Error("Invalid argument for ROP: Textbox -- " + this._env.GetStringRef(arg));
        }
    }

    private OnClickEvent(): void {
        ROPWait.NotifyTextboxProgress(this._id);
    }

    private RemoveTextbox(inTB: FancyTextBalloon): void {
        this._env.DeleteVar(this._id, false);
    }

    private RemoveArrow(inArr: GameObject): void {
        log.debug("TODO: RemoveArrow");
        // this._env.remove_object(inArr);
    }

    private static ProcessId(inId: string, inMode: number): string {
        let use_postfix: string = ROPTextbox.id_postfix;
        if (inMode >= 3) {
            use_postfix = ROPTextbox.arrow_id_postfix;
        }
        if (!inId) return use_postfix;
        return inId + use_postfix;
    }

    private static ProcessText(inText: string): string {
        if (!inText) return "";
        inText = inText.replace(/\<color/gi, "<font color");
        inText = inText.replace(/\<red/gi, "<font color = \"#" + ROPTextbox.STD_RED_COLOR + "\"");
        inText = inText.replace(/\<green/gi, "<font color = \"#" + ROPTextbox.STD_GREEN_COLOR + "\"");
        inText = inText.replace(/\<blue/gi, "<font color = \"#" + ROPTextbox.STD_BLUE_COLOR + "\"");
        inText = inText.replace(/\<yellow/gi, "<font color = \"#" + ROPTextbox.STD_YELLOW_COLOR + "\"");

        inText = inText.replace(/\/(color|red|green|blue|yellow)/gi, "/font");
        return inText;
    }

    private static parseBool(arg: string): boolean {
        return arg.toUpperCase() == "TRUE";
    }

    private readonly _op_visible: boolean;
    private readonly _mode: number;

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
    private _degree: number = 0;
    private _length: number = 100;
    private _my_width: number = 20;
    private _has_parent: boolean = false;
    private _parent_id: string = "";
    private _fillColor: string = "FF0000";
    private _outlineColor: string = "000000";
    private _fixedSize: boolean = true;
    private _forceTopmost: boolean = false;
    private _x_offset_specified: boolean = false;
    private _x_offset: number = 0;
    private _y_offset_specified: boolean = false;
    private _y_offset: number = 0;

    private static readonly DEFAULT_X_OFFSET: number = 35;
    private static readonly DEFAULT_Y_OFFSET: number = 10;
    private static readonly DEFAULT_ARROW_OFFSET: number = 12;
    private static readonly STD_RED_COLOR: string = "F85F00";
    private static readonly STD_BLUE_COLOR: string = "00BFF9";
    private static readonly STD_GREEN_COLOR: string = "01EC04";
    private static readonly STD_YELLOW_COLOR: string = "FFFA00";
}
