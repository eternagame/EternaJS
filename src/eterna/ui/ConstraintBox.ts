import * as log from "loglevel";
import {Container, Graphics, Point, Sprite, Text, Texture} from "pixi.js";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {SceneObject} from "../../flashbang/objects/SceneObject";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {DelayTask} from "../../flashbang/tasks/DelayTask";
import {LocationTask} from "../../flashbang/tasks/LocationTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {Assert} from "../../flashbang/util/Assert";
import {Easing} from "../../flashbang/util/Easing";
import {RegistrationGroup} from "../../signals/RegistrationGroup";
import {EPars} from "../EPars";
import {BitmapManager} from "../util/BitmapManager";
import {Fonts} from "../util/Fonts";
import {Band} from "./Band";
import {PoseThumbnail} from "./PoseThumbnail";
import {TextBalloon} from "./TextBalloon";

export class ConstraintBox extends ContainerObject {
    public constructor(minVersion: boolean = false) {
        super();

        this.container.interactive = true;

        this._puz_small_clear_bg = BitmapManager.get_bitmap(BitmapManager.NovaPuzThumbSmallMet);
        this._puz_small_fail_bg = BitmapManager.get_bitmap(BitmapManager.NovaPuzThumbSmallFail);
        this._puz_large_clear_bg = BitmapManager.get_bitmap(BitmapManager.NovaPuzThumbLargeMet);
        this._puz_large_fail_bg = BitmapManager.get_bitmap(BitmapManager.NovaPuzThumbLargeFail);

        this._success_outline = BitmapManager.get_bitmap(BitmapManager.NovaPassOutline);
        this._fail_outline = BitmapManager.get_bitmap(BitmapManager.NovaFailOutline);
        this._min_version = minVersion;

        if (ConstraintBox._A == null) {
            ConstraintBox._A = BitmapManager.get_bitmap(BitmapManager.BaseAMid);
            ConstraintBox._G = BitmapManager.get_bitmap(BitmapManager.BaseGMid);
            ConstraintBox._U = BitmapManager.get_bitmap(BitmapManager.BaseUMid);
            ConstraintBox._C = BitmapManager.get_bitmap(BitmapManager.BaseCMid);
            ConstraintBox._W = BitmapManager.get_bitmap(BitmapManager.BaseWMidPattern);
        }

        this._bgGraphics = new Graphics();
        this.container.addChild(this._bgGraphics);

        this._backlight = new Sprite(null);
        this._backlight.visible = false;
        this.container.addChild(this._backlight);

        this._req = new Sprite();
        this._req.visible = false;
        this.container.addChild(this._req);

        this._bg = new Sprite();
        this._bg.visible = false;
        this.container.addChild(this._bg);

        this._bases = new Container();
        this._bases.visible = false;
        this.container.addChild(this._bases);

        this._base1 = new Sprite();
        this._base1.visible = false;
        this.container.addChild(this._base1);

        this._base2 = new Sprite();
        this._base2.visible = false;
        this.container.addChild(this._base2);

        this._bond = new Band(5, 2, 1);
        this._bond.display.visible = false;
        this.addObject(this._bond, this.container);

        this._base3 = new Sprite();
        this._base3.visible = false;
        this.container.addChild(this._base3);

        this._base4 = new Sprite();
        this._base4.visible = false;
        this.container.addChild(this._base4);

        this._bond2 = new Band(5, 2, 1);
        this._bond2.display.visible = false;
        this.addObject(this._bond2, this.container);

        this._icon = new Sprite(null);
        this._icon.visible = false;
        this.container.addChild(this._icon);

        this._enlarged = false;

        this._val_text = Fonts.arial("", 18).color(0xffffff).bold().build();
        this._val_text.visible = false;
        this.container.addChild(this._val_text);

        this._big_text = Fonts.arial("", 23).color(0xffffff).bold().build();
        this._big_text.visible = false;
        this.container.addChild(this._big_text);

        this._no_text = Fonts.arial("NO", 16).color(0xffffff).bold().build();
        this._no_text.position = new Point(35, 0);
        this._no_text.visible = false;
        this.container.addChild(this._no_text);

        this._state_text = Fonts.arial("", 18).color(0xffffff).bold().build();
        this._state_text.position = new Point(3, 45);
        this._state_text.visible = false;
        this.container.addChild(this._state_text);

        this._req_clarify_text = Fonts.arial("", 11).color(0xC0DCE7).build();
        this._req_clarify_text.position = new Point(50, 30);
        this._req_clarify_text.visible = false;
        this.container.addChild(this._req_clarify_text);

        this._req_stat_txt = Fonts.arial("", 11).color(0xC0DCE7).build();
        this._req_stat_txt.position = new Point(50, 50);
        this._req_stat_txt.visible = false;
        this.container.addChild(this._req_stat_txt);

        this._small_thumbnail = new Sprite();
        this._small_thumbnail.position = new Point(6, 6);
        this.container.addChild(this._small_thumbnail);

        this._big_thumbnail = new Sprite();
        this._big_thumbnail.position = new Point(6, 6);
        this._big_thumbnail.scale = new Point(0.5, 0.5);
        this.container.addChild(this._big_thumbnail);

        this._flag = new Graphics();
        this._flag.clear();
        this._flag.beginFill(0xBEDCE7, 1.0);
        this._flag.drawRect(0, 0, 5, 5);
        this._flag.endFill();
        this._flag.position = new Point(4, 4);
        this.container.addChild(this._flag);

        this._side_txt = Fonts.std_regular("", 16).color(0xffffff).build();
        this._side_txt.visible = this._min_version;
        this.container.addChild(this._side_txt);

        this._check = new Sprite(BitmapManager.get_bitmap(BitmapManager.NovaGreenCheck));
        this._check.position = new Point(80, 50);
        this._check.visible = false;
        this.container.addChild(this._check);

        this._outline = new Sprite();
        this._outline.visible = false;
        this.container.addChild(this._outline);

        this._fglow = new Sprite(null);
        this._fglow.visible = false;
        this.container.addChild(this._fglow);
    }

    public setLocation(p: Point, animate: boolean = false, animTime: number = 0.5): void {
        if (animate) {
            this.replaceNamedObject(
                ConstraintBox.LOCATION_ANIM,
                new LocationTask(p.x, p.y, animTime, Easing.easeIn));

        } else {
            this.removeNamedObjects(ConstraintBox.LOCATION_ANIM);
            this.display.position = p;
        }
    }

    public set_disabled(dis: boolean): void {
        this.display.visible = !dis;
    }

    public set_min_version(min: boolean): void {
        this._min_version = min;
        this._side_txt.visible = this._min_version;
    }

    public show_big_text(show_txt: boolean): void {
        if (!show_txt) {
            this.replaceNamedObject(
                ConstraintBox.BIG_TEXT_FADE_ANIM,
                new AlphaTask(0, 0.3, Easing.linear, this._big_text));
        } else {
            this.removeNamedObjects(ConstraintBox.BIG_TEXT_FADE_ANIM);
            this._big_text.alpha = 1;
            this._big_text.visible = true;
            this.display.alpha = 1;
        }
    }

    public is_satisfied(): boolean {
        return this._satisfied;
    }

    public GetKeyword(): string {
        return this._keyword;
    }

    public get_wrong_pairs(native_pairs: number[], target_pairs: number[], structure_constraints: any[], satisfied: boolean): number[] {
        let wrong_pairs: number[] = new Array(native_pairs.length);

        if (this._keyword == "SHAPE") {
            for (let ii = 0; ii < wrong_pairs.length; ii++) {
                wrong_pairs[ii] = -1;
            }
            for (let ii = 0; ii < wrong_pairs.length; ii++) {
                if (native_pairs[ii] != target_pairs[ii]) {
                    if (structure_constraints == null || structure_constraints[ii]) {
                        wrong_pairs[ii] = 1;
                    } else {
                        wrong_pairs[ii] = 0;
                    }
                } else {
                    if (structure_constraints == null || structure_constraints[ii]) {
                        wrong_pairs[ii] = -1;
                    } else {
                        wrong_pairs[ii] = 0;
                    }
                }
            }
        } else if (this._keyword == "ANTISHAPE") {
            for (let ii = 0; ii < wrong_pairs.length; ii++) {
                wrong_pairs[ii] = 0;
            }
            for (let ii = 0; ii < wrong_pairs.length; ii++) {
                if (structure_constraints == null || structure_constraints[ii]) {
                    if (satisfied) {
                        wrong_pairs[ii] = -1;
                    } else {
                        wrong_pairs[ii] = 1;
                    }
                }
            }

        }
        return wrong_pairs;
    }

    public set_flagged(vis: boolean): void {
        this._flag.visible = vis;
    }

    public refresh_content(): void {
        this.set_content(this._keyword, this._val, this._satisfied, this._stat);
    }

    public set_content(keyword: string, val: any, satisfied: boolean, stat: number): void {
        this._keyword = keyword;
        this._val = val;
        this._satisfied = satisfied;
        this._stat = stat;

        // let style: StyleSheet = new StyleSheet;
        // style.setStyle(".altText", {
        //     fontFamily: Fonts.STDFONT_MEDIUM,
        //     leading: 10
        // });
        // style.setStyle(".altTextMain", {
        //     fontFamily: Fonts.STDFONT_REGULAR,
        //     leading: 5
        // });
        // this._side_txt.GetTextBox().styleSheet = style;
        // this._side_txt.GetTextBox().embedFonts = true;

        this._big_text.position = new Point(85, 17);

        this._bases.visible = false;
        this._base1.visible = false;
        this._base2.visible = false;
        this._base3.visible = false;
        this._base4.visible = false;
        this._bond.display.visible = false;
        this._bond2.display.visible = false;
        this._val_text.visible = false;
        this._no_text.visible = false;
        this._state_text.visible = false;
        this._icon.visible = false;
        this._small_thumbnail.visible = false;
        this._big_thumbnail.visible = false;
        this._flag.visible = false;
        this._check.visible = satisfied && !this._min_version;
        if (keyword.toUpperCase().substr(-5) == "SHAPE") {
            if (this._enlarged) {
                this._check.position = new Point(144, 144);
                this._no_text.position = new Point(124, 1);
                this._state_text.position = new Point(1, 132);
            } else {
                this._check.position = new Point(55, 55);
                this._no_text.position = new Point(35, 1);
                this._state_text.position = new Point(3, 45);
            }
        }

        let txt: string = "";
        let txt_prefix: string = "";
        let new_txt: string = "";
        let useDescribe: string;

        if (!satisfied) {
            txt_prefix = "\n<FONT COLOR='#FF0000'>Unsatisfied</FONT>";
            this._outline.texture = this._fail_outline;
        } else {
            this._outline.texture = this._success_outline;
        }

        if (keyword == "BOOST") {
            this._val_text.visible = true;
            this._req_clarify_text.visible = true;
            this._req_stat_txt.visible = true;

            if (this._min_version) {
                txt = "<span class='altTextMain'>You ";
            } else {
                txt = "You ";
            }

            txt += "must have " + val.toString() + " or ";

            if (this._min_version) {
                txt += "<span class='altText'>more</span> ";
            } else {
                txt += "more ";
            }
            txt += "boosted loops.";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            new_txt += (Number(val)).toString() + " OR MORE";

            this._req_clarify_text.text = new_txt;
            this._req_stat_txt.text = stat.toString();

            this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaBoostReq);
            if (this._min_version) {
                txt += "</span>";
                this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaBoostMissionReq);
            }

            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword == "NOGU") {
            this._val_text.visible = true;
            this._req_clarify_text.visible = true;
            this._req_stat_txt.visible = true;

            if (this._min_version) {
                txt = "<span class='altTextMain'>You ";
            } else {
                txt = "You ";
            }

            txt += "must have";

            if (this._min_version) {
                txt += " <span class='altText'>no</span> ";
            } else {
                txt += " no ";
            }
            txt += EPars.get_colored_letter("U") + "-" + EPars.get_colored_letter("G") + " pairs.";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            new_txt += "NO UG PAIRS";

            this._req_clarify_text.text = new_txt;
            this._req_stat_txt.text = stat.toString();

            this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaNoGUReq);
            if (this._min_version) {
                txt += "</span>";
                this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaNoGUMissionReq);
            }

            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword == "GU") {
            this._val_text.visible = true;
            this._req_clarify_text.visible = true;
            this._req_stat_txt.visible = true;

            if (this._min_version) {
                txt = "<span class='altTextMain'>You ";
            } else {
                txt = "You ";
            }

            txt += "must have " + val.toString() + " or ";

            if (this._min_version) {
                txt += "<span class='altText'>more</span> ";
            } else {
                txt += "more ";
            }
            txt += EPars.get_colored_letter("U") + "-" + EPars.get_colored_letter("G") + " pairs.";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            new_txt += (Number(val)).toString() + " OR MORE";

            this._req_clarify_text.text = new_txt;
            this._req_stat_txt.text = stat.toString();

            this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaGUReq);
            if (this._min_version) {
                txt += "</span>";
                this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaGUMissionReq);
            }

            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword == "GC" || keyword == "GCMIN" || keyword == "NOGC") {
            this._val_text.visible = true;
            this._req_clarify_text.visible = true;
            this._req_stat_txt.visible = true;

            if (this._min_version) {
                txt = "<span class='altTextMain'>You ";
            } else {
                txt = "You ";
            }

            txt += "must have ";

            useDescribe = "";
            if (keyword == "GCMIN") {
                useDescribe = val.toString() + " or more";
                new_txt += (Number(val)).toString() + " OR MORE";

            } else if (keyword == "GC") {
                useDescribe = "<span class='altText'>at most</span> " + (Number(val)).toString();
                new_txt += (Number(val)).toString() + " OR FEWER";

            } else if (keyword == "NOGC") {
                useDescribe = "no";
                new_txt += "NO GC PAIRS";
            }

            txt += useDescribe + " ";
            txt += EPars.get_colored_letter("G") + "-" + EPars.get_colored_letter("C") + " pairs.</span>";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            this._req_clarify_text.text = new_txt;
            this._req_stat_txt.text = stat.toString();

            this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaGCReq);
            if (keyword == "NOGC") {
                this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaNoGCReq);
                if (this._min_version) {
                    this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaNoGCMissionReq);
                }
            } else {
                if (this._min_version) {
                    this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaGCMissionReq);
                }
            }

            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword == "AU" || keyword == "AUMAX") {
            this._val_text.visible = true;
            this._req_clarify_text.visible = true;
            this._req_stat_txt.visible = true;

            if (this._min_version) {
                txt = "<span class='altTextMain'>You ";
            } else {
                txt = "You ";
            }
            txt += "must have ";

            useDescribe = "";
            if (keyword == "AU") {
                useDescribe = val.toString() + " or more";
                new_txt += (Number(val)).toString() + " OR MORE";
            } else if (keyword == "AUMAX") {
                useDescribe = "<span class='altText'>at most</span> " + (Number(val)).toString();
                new_txt += (Number(val)).toString() + " OR FEWER";
            }
            txt += useDescribe + " ";
            txt += EPars.get_colored_letter("A") + "-" + EPars.get_colored_letter("U") + " pairs.</span>";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            this._req_clarify_text.text = new_txt;
            this._req_stat_txt.text = stat.toString();

            this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaAUReq);
            if (this._min_version) {
                this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaAUMissionReq);
            }
            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword == "SHAPE") {
            txt = "Your RNA must fold into the outlined structure.";

            this.changeShapeThumbnailBG();
            this._bg.visible = true;

            if (val.index != null) {
                txt = "In state " + (val.index + 1) + ", your RNA must fold into the outlined structure.";
                this._state_text.visible = true;
                this._state_text.text = val.index + 1;
            }

            let target_pairs: number[] = val.target;
            let native_pairs: number[] = val.native;
            let structure_constraints: any[] = val.structure_constraints;
            let wrong_pairs: number[] = this.get_wrong_pairs(native_pairs, target_pairs, structure_constraints, satisfied);

            let sequence: number[] = new Array(native_pairs.length);
            for (let ii = 0; ii < wrong_pairs.length; ii++) {
                sequence[ii] = EPars.RNABASE_ADENINE;
            }

            PoseThumbnail.drawToSprite(this._big_thumbnail, sequence, target_pairs, 7, PoseThumbnail.THUMBNAIL_WRONG_COLORED, 0, wrong_pairs, false, 0);
            PoseThumbnail.drawToSprite(this._small_thumbnail, sequence, target_pairs, 3, PoseThumbnail.THUMBNAIL_WRONG_COLORED, 0, wrong_pairs, false, 0);

            if (this._enlarged) {
                this._small_thumbnail.visible = false;
                this._big_thumbnail.visible = true;
            } else {
                this._small_thumbnail.visible = true;
                this._big_thumbnail.visible = false;
            }

            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));
            this._big_text.text = txt;

        } else if (keyword == "ANTISHAPE") {
            txt = "Your RNA must NOT have the structure in white outline.";

            this.changeShapeThumbnailBG();
            this._bg.visible = true;

            if (val.index != null) {
                txt = "In state " + (val.index + 1) + ", your RNA must NOT have the structure in white outline.";
                this._state_text.visible = true;
                this._state_text.text = val.index + 1;
            }

            let target_pairs: number[] = val.target;
            let native_pairs: number[] = val.native;
            let structure_constraints: any[] = val.structure_constraints;
            let wrong_pairs: number[] = this.get_wrong_pairs(native_pairs, target_pairs, structure_constraints, satisfied);

            let sequence: number[] = new Array(native_pairs.length);
            for (let ii = 0; ii < wrong_pairs.length; ii++) {
                sequence[ii] = EPars.RNABASE_ADENINE;
            }

            PoseThumbnail.drawToSprite(this._big_thumbnail, sequence, target_pairs, 7, PoseThumbnail.THUMBNAIL_WRONG_COLORED, 0, wrong_pairs, false, 0);
            PoseThumbnail.drawToSprite(this._small_thumbnail, sequence, target_pairs, 3, PoseThumbnail.THUMBNAIL_WRONG_COLORED, 0, wrong_pairs, false, 0);

            if (this._enlarged) {
                this._small_thumbnail.visible = false;
                this._big_thumbnail.visible = true;
            } else {
                this._small_thumbnail.visible = true;
                this._big_thumbnail.visible = false;
            }

            this._no_text.visible = true;

            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));
            this._big_text.text = txt;

        } else if (keyword == "BINDINGS") {
            this._req_clarify_text.visible = true;

            if (this._min_version) txt += "<span class='altTextMain'>";
            txt += "In state " + (Number(val.index) + 1).toString() + ", your RNA must:\n";
            new_txt = "";

            for (let ii = 0; ii < val.bind.length; ii++) {
                txt += "- ";
                if (this._min_version) txt += "<span class='altText'>";
                txt += val.bind[ii] ? "bind" : "NOT bind";
                if (this._min_version) txt += "</span>";
                txt += " with " + val.oligo_name[ii] + "\n";

                if (ii > 0) new_txt += "&#x2003;";
                if (val.bind[ii]) {
                    new_txt += " <FONT COLOR='#FFFFFF'>" + val.label[ii] + "</FONT>";
                } else {
                    new_txt += " <FONT COLOR='#808080'>" + val.label[ii] + "</FONT>";
                }
            }

            if (this._min_version) txt += "</span>";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            this._req_clarify_text.text = new_txt;

            let tw: number = Math.min(101, 15 * (2 * val.bind.length - 1));
            let step: number = tw / (2 * val.bind.length - 1);
            let orig: number = (111 - tw) * 0.5;
            if (val.bind.length == 1) tw = 45;

            this._bgGraphics.clear();
            this._bgGraphics.beginFill(0x1E314B, 0.5);
            this._bgGraphics.drawRoundedRect(0, 0, 111, this._min_version ? 55 : 75, 20);
            this._bgGraphics.endFill();

            this._bgGraphics.lineStyle(2.5, 0xFFFFFF, 0.9);
            this._bgGraphics.moveTo((111 - tw) * 0.5, 27);
            this._bgGraphics.lineTo((111 + tw) * 0.5, 27);

            for (let ii = 0; ii < val.bind.length; ii++) {
                let ctrl_y: number = (val.bind[ii] ? 22 : 14);
                this._bgGraphics.moveTo(orig + (ii * 2) * step, ctrl_y);
                this._bgGraphics.lineTo(orig + (ii * 2 + 1) * step, ctrl_y);
            }
            this._bg.visible = true;

            this._state_text.visible = true;
            this._state_text.text = val.index + 1;

            this._outline.visible = true;

        } else if (keyword == "A" || keyword == "AMAX"
            || keyword == "C" || keyword == "CMAX"
            || keyword == "G" || keyword == "GMAX"
            || keyword == "U" || keyword == "UMAX") {
            if (this._min_version) {
                txt = "<span class='altTextMain'>You ";
            } else {
                txt = "You ";
            }
            txt += "must have ";

            let letter: string = keyword.substr(0, 1);
            useDescribe = "";
            if (keyword == letter) {
                useDescribe = val.toString() + " or more";
            } else {
                useDescribe = "<span class='altText'>at most</span> " + (Number(val)).toString();
            }
            txt += useDescribe + " ";
            txt += EPars.get_colored_letter(letter) + "s.</span>";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            if (keyword == letter) {
                new_txt += (Number(val)).toString() + " OR MORE";
            } else {
                new_txt += (Number(val)).toString() + " OR FEWER";
            }

            this._req_clarify_text.text = new_txt;
            this._req_stat_txt.text = stat.toString();

            this._val_text.visible = true;
            this._req_clarify_text.visible = true;
            this._req_stat_txt.visible = true;

            if (this._min_version) {
                this._req.texture = BitmapManager.get_bitmap_named("Nova" + letter + "MissionReq");
            } else {
                this._req.texture = BitmapManager.get_bitmap_named("Nova" + letter + "Req");
            }

            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword == "PAIRS") {
            this._req_clarify_text.visible = true;
            this._req_stat_txt.visible = true;

            if (this._min_version) {
                txt = "<span class='altTextMain'>You ";
            } else {
                txt = "You ";
            }
            txt += "must have ";

            useDescribe = val.toString() + " or more";
            txt += useDescribe + " pairs.</span>";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            new_txt += (Number(val)).toString() + " OR MORE";
            this._req_clarify_text.text = new_txt;

            this._req_stat_txt.text = stat.toString();

            this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaPairsReq);
            if (this._min_version) {
                this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaPairsMissionReq);
            }
            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword == "MUTATION") {
            this._base1.texture = ConstraintBox._A;
            this._base2.texture = ConstraintBox._G;
            this._base3.texture = ConstraintBox._U;
            this._base4.texture = ConstraintBox._C;
            this._base1.visible = true;
            this._base2.visible = true;
            this._base3.visible = true;
            this._base4.visible = true;

            this._base1.x = 3;
            this._base1.y = 8;

            this._base2.x = 11;
            this._base2.y = 8;

            this._base3.x = 19;
            this._base3.y = 8;

            this._base4.x = 27;
            this._base4.y = 7;

            this._val_text.visible = true;

            if (satisfied) {
                txt += "<FONT COLOR='#00AA00'>";
            } else {
                txt += "<FONT COLOR='#AA0000'>";
            }

            txt += stat.toString();
            txt += "</FONT>/";
            txt += val.toString();
            this._val_text.text = txt;

            txt = "You can only mutate up to " + val.toString() + " bases";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));
            this._big_text.text = txt;

        } else if (keyword == "STACK") {
            this._base1.texture = ConstraintBox._W;
            this._base2.texture = ConstraintBox._W;
            this._base3.texture = ConstraintBox._W;
            this._base4.texture = ConstraintBox._W;
            this._base1.visible = true;
            this._base2.visible = true;
            this._base3.visible = true;
            this._base4.visible = true;

            this._base1.x = 8;
            this._base1.y = 1;

            this._base2.x = 33;
            this._base2.y = 1;

            this._base3.x = 8;
            this._base3.y = 15;

            this._base4.x = 33;
            this._base4.y = 15;

            this._bond.display.position = new Point(22, 3);
            this._bond.display.visible = true;
            this._bond.set_strength(1);

            this._bond2.display.position = new Point(22, 17);
            this._bond2.display.visible = true;
            this._bond2.set_strength(1);

            this._val_text.visible = true;

            if (satisfied) {
                txt += "<FONT COLOR='#00AA00'>";
            } else {
                txt += "<FONT COLOR='#AA0000'>";
            }

            txt += stat.toString();
            txt += "</FONT>/";
            txt += val.toString();
            this._val_text.text = txt;

            txt = "You must have a stack with " + val.toString() + " or more pairs.";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));
            this._big_text.text = txt;

        } else if (keyword.lastIndexOf("CONSECUTIVE_") >= 0) {
            this._val_text.visible = true;
            this._req_clarify_text.visible = true;
            this._req_stat_txt.visible = true;

            if (this._min_version) {
                txt = "<span class='altTextMain'>You ";
            } else {
                txt = "You ";
            }
            txt += "must have ";

            let letter: string = keyword.substr(12, 1);
            txt += "<span class='altText'>at most</span> " + (Number(val) - 1).toString() + " ";
            txt += EPars.get_colored_letter(letter) + "s in a row.</span>";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            new_txt += "AT MOST " + (Number(val) - 1).toString() + " IN A ROW";

            this._req_clarify_text.text = new_txt;
            this._req_stat_txt.text = stat.toString();

            this._req.texture = BitmapManager.get_bitmap_named("Nova" + letter + "RowReq");
            if (this._min_version) {
                this._req.texture = BitmapManager.get_bitmap_named("Nova" + letter + "RowMissionReq");
            }
            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword == "LAB_REQUIREMENTS") {
            this._bg.visible = true;
            this._bgGraphics.clear();
            this._bgGraphics.beginFill(0x1E314B, 0.5);
            this._bgGraphics.drawRoundedRect(0, 0, 111, this._min_version ? 55 : 75, 20);
            this._bgGraphics.endFill();

            this._icon.visible = true;
            this._icon.texture = BitmapManager.get_bitmap(BitmapManager.ImgLabReq);
            this._icon.position = new Point((111 - this._icon.width) * 0.5, 2);

            if (!this._min_version) {
                let no_good: string[] = [];
                let value = "";

                let good: boolean = (val.g_count < val.g_max);
                if (!good) no_good.push("<FONT COLOR='#FF0000'>" + (val.g_count).toString() + "</FONT>G");

                good = (val.c_count < val.c_max);
                if (!good) no_good.push("<FONT COLOR='#FF0000'>" + (val.c_count).toString() + "</FONT>C");

                good = (val.a_count < val.a_max);
                if (!good) no_good.push("<FONT COLOR='#FF0000'>" + (val.a_count).toString() + "</FONT>A");

                if (no_good.length > 0) {
                    value = no_good.join(" ");
                } else {
                    value = "OK";
                }

                this._req_stat_txt.visible = true;
                this._req_stat_txt.text = value;
            } else {
                this._req_stat_txt.visible = false;
            }

            if (this._min_version) txt += "<span class='altTextMain'>";
            txt += "You must have:\n";
            txt += "- <span class='altText'>at most</span> " + (val.g_max - 1).toString() + " ";
            txt += EPars.get_colored_letter("G") + "s in a row\n</span>";
            txt += "- <span class='altText'>at most</span> " + (val.c_max - 1).toString() + " ";
            txt += EPars.get_colored_letter("C") + "s in a row\n</span>";
            txt += "- <span class='altText'>at most</span> " + (val.a_max - 1).toString() + " ";
            txt += EPars.get_colored_letter("A") + "s in a row\n</span>";
            if (this._min_version) txt += "</span>";

            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            this._outline.visible = true;

        } else if (keyword == "BARCODE") {

            this._req_clarify_text.visible = true;

            if (this._min_version) {
                txt = "<span class='altTextMain'>You ";
            } else {
                txt = "You ";
            }

            txt += "must have a ";

            if (this._min_version) {
                txt += "<span class='altText'>unique</span> ";
            } else {
                txt += "unique ";
            }
            txt += "barcode.";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            new_txt = "MUST BE UNIQUE";

            this._req_clarify_text.text = new_txt;

            this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaBarcodeReq);
            if (this._min_version) {
                txt += "</span>";
                this._req.texture = BitmapManager.get_bitmap(BitmapManager.NovaBarcodeMissionReq);
            }

            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword.lastIndexOf("OLIGO_") >= 0) {
            this._req_clarify_text.visible = true;

            let binder: boolean = (keyword.lastIndexOf("UNBOUND") < 0);

            if (this._min_version) txt += "<span class='altTextMain'>";
            txt += "In state " + (Number(val) + 1).toString() + ", the oligo must ";
            if (this._min_version) txt += "<span class='altText'>";
            txt += binder ? "bind" : "NOT bind";
            if (this._min_version) txt += "</span>";
            txt += " with your RNA.";
            if (this._min_version) txt += "</span>";
            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            new_txt = binder ? "MUST BIND" : "MAY NOT BIND";

            this._req_clarify_text.text = new_txt;

            let ico: string = binder ? "Bound" : "Unbound";
            if (this._min_version) {
                this._req.texture = BitmapManager.get_bitmap_named("Nova" + ico + "OligoMissionReq");
            } else {
                this._req.texture = BitmapManager.get_bitmap_named("Nova" + ico + "OligoReq");
            }

            this._req.visible = true;
            this._outline.visible = true;

        } else if (keyword == "SCRIPT") {
            let nid: string = val.nid;
            let goal: string = val.goal;
            let name: string = val.name;
            if (name.length > 5) name = name.substr(0, 5) + "..";
            let value: string = val.value;

            this._bg.visible = true;
            this._bgGraphics.clear();
            this._bgGraphics.beginFill(0x1E314B, 0.5);
            this._bgGraphics.drawRoundedRect(0, 0, 111, this._min_version ? 55 : 75, 20);
            this._bgGraphics.endFill();

            let data_png: string = val.data_png;
            if (data_png != null) {
                this._icon.visible = true;
                Assert.isTrue(true, "TODO: set_bitmap_from_datauri");
                // this._icon.set_bitmap_from_datauri(data_png, function (): void {
                //     this._icon.set_pos(new UDim(0, 0, (111 - this._icon.width) / 2, 2));
                // });
            } else {
                this._icon.visible = false;
                this._icon.texture = Texture.EMPTY;
            }

            if (name != null && name.length > 0) {
                this._no_text.visible = true;
                this._no_text.text = name;
                this._no_text.position = new Point(30 - this._no_text.width * 0.5, 10);
            } else {
                this._no_text.visible = false;
            }

            if (val.index != null) {
                this._state_text.visible = true;
                this._state_text.text = val.index;
            }

            if (!this._min_version && value != null && value.length > 0) {
                this._req_stat_txt.visible = true;
                this._req_stat_txt.text = value;
            } else {
                this._req_stat_txt.visible = false;
            }

            txt = "Your puzzle must satisfy script " + nid;
            if (goal != null && goal.length > 0) {
                txt = goal;
            }

            this.set_mouse_over_object(new TextBalloon(txt + txt_prefix, 0x0, 0.8));

            this._outline.visible = true;

        }

        this._val_text.position = new Point(30 - this._val_text.width * 0.5, 37);
        this._req_stat_txt.visible = !this._min_version;
        if (this._min_version) {
            this._outline.visible = false;
            // this._side_txt.set_use_style(true);
            this._side_txt.text = txt;
            // this._side_txt.set_autosize(false, false, 250);
            if (this._req.width > 0) {
                this._side_txt.position = new Point(this._req.width + 18, this._req.height / 2 - this._side_txt.height / 2);
            } else {
                this._side_txt.position = new Point(111 + 18, 55 / 2 - this._side_txt.height / 2);
            }
        }

        let more: number = new_txt.indexOf("MORE");
        let less: number = new_txt.indexOf("FEWER");
        let idx: number = (more == -1) ? less : more;
        // let bf: TextFormat = Fonts.arial(11, true);
        // if (idx != -1) {
        //     this._req_clarify_text.GetTextBox().setTextFormat(bf, idx, idx + (more == -1 ? 5 : 4));
        // }
        //
        // if (keyword == "NOGC") {
        //     this._req_clarify_text.GetTextBox().setTextFormat(bf, 0, 2);
        // }

        this._req_clarify_text.position = new Point(55 - this._req_clarify_text.width * 0.5, 32);
        this._req_stat_txt.position = new Point(55 - this._req_stat_txt.width * 0.5, 50);
    }

    public scale(): void {
        if (this._small_thumbnail.visible) {
            this.enlarge_thumbnail_scale();
        } else {
            this.shrink_thumbnail_scale();
        }
    }

    public enlarge_thumbnail_scale(): void {
        /// Don't do this while the constraint box is moving around
        if (this.hasNamedObject(ConstraintBox.LOCATION_ANIM)) {
            return;
        }

        this._enlarged = true;

        this._small_thumbnail.visible = false;
        this._big_thumbnail.visible = true;
        this.changeShapeThumbnailBG();

        this._outline.width = 165;
        this._outline.height = 165;

        this._check.position = new Point(144, 144);
        this._no_text.position = new Point(124, 1);
        this._state_text.position = new Point(1, 132);
    }

    public shrink_thumbnail_scale(): void {
        if (this.hasNamedObject(ConstraintBox.LOCATION_ANIM)) {
            return;
        }

        this._enlarged = false;

        this._small_thumbnail.visible = true;
        this._big_thumbnail.visible = false;
        this.changeShapeThumbnailBG();
        this._check.position = new Point(55, 55);
        this._no_text.position = new Point(35, 1);
        this._state_text.position = new Point(3, 45);

        this._outline.width = 75;
        this._outline.height = 75;
    }

    public real_width(): number {
        return this._outline.visible ? 111 : 75;
    }

    public flash(color: number): void {
        log.debug("TODO: flash");
        // let sx: number = (this._outline.visible ? 111 : 75);
        // let sy: number = 75;
        //
        // this._backlight.set_bitmap(new Texture(sx, sy, true, 0));
        // this._backlight.graphics.clear();
        // this._backlight.graphics.beginFill(color, 0.9);
        // this._backlight.graphics.drawRoundRect(0, 0, sx, sy, 20);
        // this._backlight.graphics.endFill();
        // this._backlight.alpha = 0;
        // this._backlight.visible = true;
        // this._backlight.set_pos(new UDim(0, 0, 0, 0));
        // this._backlight.remove_all_animators();
        // this._backlight.push_animator(new GameAnimatorFader(0, 1, 0.15, false, false));
        // this._backlight.push_animator(new GameAnimatorFader(1, 0, 0.15, true, false, 0.15));
        // this._backlight.push_animator(new GameAnimatorFader(0, 1, 0.1, true, false, 0.3));
        // this._backlight.push_animator(new GameAnimatorFader(1, 0, 0.5, true, false, 0.4));
    }

    public flare(res: boolean): void {
        log.debug("TODO: flare");
        // if (this._min_version) {
        //     this._backlight.visible = false;
        //     this._backlight.remove_all_animators();
        //     this._fglow.visible = false;
        //     this._fglow.remove_all_animators();
        //
        //     return;
        // }
        //
        // let lw: number = 6;
        // let sx: number = (this._outline.visible ? 111 : 75);
        // let sy: number = 75;
        //
        // this._fglow.set_bitmap(new Texture(sx, sy, true, 0));
        // this._fglow.graphics.clear();
        // this._fglow.graphics.lineStyle(lw, res ? 0x00FF00 : 0xFF0000, 1.0);
        // this._fglow.graphics.drawRoundRect(2 + lw / 2, 2 + lw / 2, sx - lw - 4, sy - lw - 4, 20);
        // this._fglow.scaleX = 1;
        // this._fglow.scaleY = 1;
        // this._fglow.alpha = 0;
        // this._fglow.visible = true;
        // this._fglow.set_pos(new UDim(0, 0, 0, 0));
        // this._fglow.remove_all_animators();
        // this._fglow.push_animator(new GameAnimatorMover(new UDim(0, 0, -lw, -lw), 1.6, false, false, false));
        // this._fglow.push_animator(new GameAnimatorFader(0, 1, 0.8, false, false));
        // this._fglow.push_animator(new GameAnimatorFader(1, 0, 0.8, true, false, 0.8));
        // this._fglow.push_animator(new GameAnimatorScaler(1.0, 1.0 + 2 * (lw + 1) / sx, 1.6));
        //
        // this._backlight.set_bitmap(new Texture(sx, sy, true, 0));
        // this._backlight.graphics.clear();
        // this._backlight.graphics.beginFill(res ? 0x00FF00 : 0xFF0000, 0.7);
        // this._backlight.graphics.drawRoundRect(0, 0, sx, sy, 20);
        // this._backlight.graphics.endFill();
        // this._backlight.alpha = 0;
        // this._backlight.visible = true;
        // this._backlight.set_pos(new UDim(0, 0, 0, 0));
        // this._backlight.remove_all_animators();
        // this._backlight.push_animator(new GameAnimatorFader(0, 1, 0.8, false, false));
        // this._backlight.push_animator(new GameAnimatorFader(1, 0, 0.8, true, false, 0.8));
    }

    private changeShapeThumbnailBG(): void {
        if (this._satisfied && this._enlarged) {
            this._bg.texture = this._puz_large_clear_bg;
        } else if (!this._satisfied && this._enlarged) {
            this._bg.texture = this._puz_large_fail_bg;
        } else if (this._satisfied && !this._enlarged) {
            this._bg.texture = this._puz_small_clear_bg;
        } else if (!this._satisfied && !this._enlarged) {
            this._bg.texture = this._puz_small_fail_bg;
        }
    }

    private set_mouse_over_object(obj: SceneObject): void {
        const FADE_IN_DELAY: number = 1.0;

        if (this._mouse_over_object != null) {
            this._mouse_over_object.destroySelf();
            this._mouse_over_object = null;
            this._mouseOverRegs.close();
            this._mouseOverRegs = null;
        }

        if (obj != null) {
            obj.display.x = 0;
            obj.display.y = 78;
            obj.display.visible = false;
            this.addObject(obj, this.container);

            this._mouse_over_object = obj;

            const MOUSE_OVER_ANIM: string = "MouseOverAnim";

            let isMouseOver: boolean = false;
            this._mouseOverRegs = new RegistrationGroup();
            this._mouseOverRegs.add(this.pointerOver.connect(() => {
                if (!isMouseOver) {
                    isMouseOver = true;
                    obj.display.visible = true;
                    obj.display.alpha = 0;
                    obj.replaceNamedObject(MOUSE_OVER_ANIM, new SerialTask(
                        new DelayTask(FADE_IN_DELAY),
                        new AlphaTask(1, 0.1)));
                }
            }));

            this._mouseOverRegs.add(this.pointerOut.connect(() => {
                if (isMouseOver) {
                    isMouseOver = false;
                    obj.removeNamedObjects(MOUSE_OVER_ANIM);
                    obj.display.visible = false;
                }
            }));
        }
    }

    private readonly _icon: Sprite;
    private readonly _bases: Container;
    private readonly _base1: Sprite;
    private readonly _base2: Sprite;
    private readonly _bond: Band;
    private readonly _base3: Sprite;
    private readonly _base4: Sprite;
    private readonly _bond2: Band;
    private readonly _val_text: Text;
    private readonly _big_text: Text;
    private readonly _small_thumbnail: Sprite;
    private readonly _big_thumbnail: Sprite;
    private readonly _flag: Graphics;
    private readonly _no_text: Text;
    private readonly _state_text: Text;
    private readonly _bgGraphics: Graphics;
    private readonly _bg: Sprite;
    private readonly _puz_small_clear_bg: Texture;
    private readonly _puz_small_fail_bg: Texture;
    private readonly _puz_large_clear_bg: Texture;
    private readonly _puz_large_fail_bg: Texture;
    private readonly _fglow: Sprite;
    private readonly _backlight: Sprite;
    private readonly _check: Sprite;
    private readonly _req: Sprite;
    private readonly _outline: Sprite;
    private readonly _fail_outline: Texture;
    private readonly _success_outline: Texture;
    private readonly _req_clarify_text: Text;
    private readonly _req_stat_txt: Text;
    private readonly _side_txt: Text;

    private _enlarged: boolean = false;
    private _satisfied: boolean = false;
    private _min_version: boolean = true;
    private _keyword: string = "";
    private _val: any = null;
    private _stat: number = 0;

    private _mouseOverRegs: RegistrationGroup;
    private _mouse_over_object: SceneObject;

    private static _A: Texture;
    private static _G: Texture;
    private static _U: Texture;
    private static _C: Texture;
    private static _W: Texture;

    private static readonly LOCATION_ANIM: string = "AnimateLocation";
    private static readonly BIG_TEXT_FADE_ANIM: string = "BigTextFadeAnim";
}
