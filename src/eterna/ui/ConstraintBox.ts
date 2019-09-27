import MultiStyleText from 'pixi-multistyle-text';
import {
    Container, Graphics, Point, Sprite, Text, Texture
} from 'pixi.js';
import {RegistrationGroup} from 'signals';
import EPars from 'eterna/EPars';
import {
    ContainerObject, Enableable, Easing, LocationTask, AlphaTask, StyledTextBuilder,
    DisplayUtil, TextureUtil, HAlign, VAlign, SerialTask, VisibleTask, ParallelTask, ScaleTask, SceneObject, DelayTask
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {ConstraintType} from 'eterna/puzzle/Constraints';
import TextBalloon from './TextBalloon';
import PoseThumbnail, {PoseThumbnailType} from './PoseThumbnail';
import Band from './Band';

export enum ConstraintBoxType {
    DEFAULT = 'DEFAULT',
    MISSION_SCREEN = 'MISSION_SCREEN' // slightly minimized, requirements text on the right
}

export default class ConstraintBox extends ContainerObject implements Enableable {
    constructor(type: ConstraintBoxType = ConstraintBoxType.DEFAULT) {
        super();

        this._boxType = type;

        this._bgGraphics = new Graphics();
        this._bgGraphics.interactiveChildren = false;
        this.container.addChild(this._bgGraphics);

        this._backlight = new Graphics();
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

        this._valText = new MultiStyleText('', {
            default: {
                fontFamily: Fonts.ARIAL,
                fontSize: 18,
                fill: 0xffffff,
                fontStyle: 'bold',
                letterSpacing: -0.5
            }
        });
        this._valText.visible = false;
        this.container.addChild(this._valText);

        this._bigText = new MultiStyleText('', {
            default: {
                fontFamily: Fonts.ARIAL,
                fontSize: 23,
                fill: 0xffffff,
                fontStyle: 'bold',
                letterSpacing: -0.5
            }
        });
        this._bigText.visible = false;
        this.container.addChild(this._bigText);

        this._noText = Fonts.arial('NO', 16).color(0xffffff).bold().letterSpacing(-0.5)
            .build();
        this._noText.position = new Point(35, 0);
        this._noText.visible = false;
        this.container.addChild(this._noText);

        this._stateText = Fonts.arial('', 18).color(0xffffff).bold().letterSpacing(-0.5)
            .build();
        this._stateText.position = new Point(3, 45);
        this._stateText.visible = false;
        this.container.addChild(this._stateText);

        this._reqClarifyText = new MultiStyleText('', {
            default: {
                fontFamily: Fonts.ARIAL,
                fontSize: 11,
                fill: 0xC0DCE7,
                letterSpacing: -0.5
            }
        });
        this._reqClarifyText.position = new Point(50, 30);
        this._reqClarifyText.visible = false;
        this.container.addChild(this._reqClarifyText);

        this._reqStatTxt = new MultiStyleText('', {
            default: {
                fontFamily: Fonts.ARIAL,
                fontSize: 11,
                fill: 0xC0DCE7,
                letterSpacing: -0.5
            }
        });
        this._reqStatTxt.position = new Point(50, 50);
        this._reqStatTxt.visible = false;
        this.container.addChild(this._reqStatTxt);

        this._smallThumbnail = new Sprite();
        this._smallThumbnail.position = new Point(6, 6);
        this.container.addChild(this._smallThumbnail);

        this._bigThumbnail = new Sprite();
        this._bigThumbnail.position = new Point(6, 6);
        this._bigThumbnail.scale = new Point(0.5, 0.5);
        this.container.addChild(this._bigThumbnail);

        this._flag = new Graphics();
        this._flag.clear();
        this._flag.beginFill(0xBEDCE7, 1.0);
        this._flag.drawRect(0, 0, 5, 5);
        this._flag.endFill();
        this._flag.position = new Point(4, 4);
        this.container.addChild(this._flag);

        if (this._boxType === ConstraintBoxType.MISSION_SCREEN) {
            this._sideTxt = new MultiStyleText('', {
                default: {
                    fontFamily: Fonts.STDFONT_REGULAR,
                    fontSize: 16,
                    fill: 0xffffff,
                    letterSpacing: -0.5,
                    wordWrap: true,
                    wordWrapWidth: 250
                }
            });
            this.container.addChild(this._sideTxt);
        }

        this._check = new Sprite(BitmapManager.getBitmap(Bitmaps.NovaGreenCheck));
        this._check.position = new Point(80, 50);
        this._check.visible = false;
        this.container.addChild(this._check);

        this._outline = new Sprite();
        this._outline.visible = false;
        this.container.addChild(this._outline);

        this._fglow = new Graphics();
        this._fglow.visible = false;
        this.container.addChild(this._fglow);
    }

    public setLocation(p: Point, animate: boolean = false, animTime: number = 0.5): void {
        if (animate) {
            this.replaceNamedObject(
                ConstraintBox.LOCATION_ANIM,
                new LocationTask(p.x, p.y, animTime, Easing.easeIn)
            );
        } else {
            this.removeNamedObjects(ConstraintBox.LOCATION_ANIM);
            this.display.position = p;
        }
    }

    public get enabled(): boolean {
        return this.display.visible;
    }

    public set enabled(value: boolean) {
        this.display.visible = value;
    }

    public set showBigText(show: boolean) {
        if (!show) {
            this.replaceNamedObject(
                ConstraintBox.BIG_TEXT_FADE_ANIM,
                new AlphaTask(0, 0.3, Easing.linear, this._bigText)
            );
        } else {
            this.removeNamedObjects(ConstraintBox.BIG_TEXT_FADE_ANIM);
            this._bigText.alpha = 1;
            this._bigText.visible = true;
            this.display.alpha = 1;
        }
    }

    public get isSatisfied(): boolean {
        return this._satisfied;
    }

    public get constraintType(): ConstraintType {
        return this._constraintType;
    }

    public getWrongPairs(
        naturalPairs: number[], targetPairs: number[], structureConstraints: any[], satisfied: boolean
    ): number[] {
        let wrongPairs: number[] = new Array(naturalPairs.length);

        if (this._constraintType === ConstraintType.SHAPE) {
            for (let ii = 0; ii < wrongPairs.length; ii++) {
                wrongPairs[ii] = -1;
            }
            for (let ii = 0; ii < wrongPairs.length; ii++) {
                if (naturalPairs[ii] !== targetPairs[ii]) {
                    if (structureConstraints == null || structureConstraints[ii]) {
                        wrongPairs[ii] = 1;
                    } else {
                        wrongPairs[ii] = 0;
                    }
                } else if (structureConstraints == null || structureConstraints[ii]) {
                    wrongPairs[ii] = -1;
                } else {
                    wrongPairs[ii] = 0;
                }
            }
        } else if (this._constraintType === ConstraintType.ANTISHAPE) {
            for (let ii = 0; ii < wrongPairs.length; ii++) {
                wrongPairs[ii] = 0;
            }
            for (let ii = 0; ii < wrongPairs.length; ii++) {
                if (structureConstraints == null || structureConstraints[ii]) {
                    if (satisfied) {
                        wrongPairs[ii] = -1;
                    } else {
                        wrongPairs[ii] = 1;
                    }
                }
            }
        }
        return wrongPairs;
    }

    public set flagged(vis: boolean) {
        this._flag.visible = vis;
    }

    public refreshContent(): void {
        this.setContent(this._constraintType, this._val, this._satisfied, this._stat);
    }

    public setContent(constraintType: ConstraintType, val: any, satisfied: boolean, stat: number): void {
        this._constraintType = constraintType;
        this._val = val;
        this._satisfied = satisfied;
        this._stat = stat;

        this._bigText.position = new Point(85, 17);

        this._bg.visible = false;
        this._outline.visible = false;
        this._icon.visible = false;
        this._bases.visible = false;
        this._base1.visible = false;
        this._base2.visible = false;
        this._base3.visible = false;
        this._base4.visible = false;
        this._bond.display.visible = false;
        this._bond2.display.visible = false;
        this._smallThumbnail.visible = false;
        this._bigThumbnail.visible = false;

        this._valText.visible = false;
        this._bigText.visible = false;
        this._reqClarifyText.visible = false;
        this._reqStatTxt.visible = false;
        this._noText.visible = false;
        this._stateText.visible = false;

        this._flag.visible = false;
        this._bgGraphics.visible = false;
        this._check.visible = satisfied && this._boxType === ConstraintBoxType.DEFAULT;
        this._req.visible = false;

        if (constraintType === ConstraintType.SHAPE || constraintType === ConstraintType.ANTISHAPE) {
            if (this._enlarged) {
                this._check.position = new Point(144, 144);
                this._noText.position = new Point(124, 1);
                this._stateText.position = new Point(1, 132);
            } else {
                this._check.position = new Point(55, 55);
                this._noText.position = new Point(35, 1);
                this._stateText.position = new Point(3, 45);
            }
        }

        let tooltip: StyledTextBuilder = ConstraintBox.createTextStyle();

        this._outline.texture = satisfied
            ? BitmapManager.getBitmap(Bitmaps.NovaPassOutline)
            : BitmapManager.getBitmap(Bitmaps.NovaFailOutline);
        const isMissionScreen: boolean = this._boxType === ConstraintBoxType.MISSION_SCREEN;

        if (constraintType === ConstraintType.BOOST) {
            this._valText.visible = true;
            this._reqClarifyText.visible = true;
            this._reqStatTxt.visible = true;

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append(`You must have ${val.toString()} or `);

            if (isMissionScreen) {
                tooltip.append('more', 'altText');
            } else {
                tooltip.append('more');
            }

            tooltip.append('boosted loops.');

            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._reqClarifyText.text = `${(Number(val)).toString()} OR MORE`;
            this._reqStatTxt.text = stat.toString();

            this._req.texture = isMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaBoostMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaBoostReq);

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType === ConstraintType.NOGU) {
            this._valText.visible = true;
            this._reqClarifyText.visible = true;
            this._reqStatTxt.visible = true;

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append('You must have');

            if (isMissionScreen) {
                tooltip.append(' no ', 'altText');
            } else {
                tooltip.append(' no ');
            }

            tooltip.append(`${EPars.getColoredLetter('U')}-${EPars.getColoredLetter('G')} pairs.`);

            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._reqClarifyText.text = 'NO UG PAIRS';
            this._reqStatTxt.text = stat.toString();

            this._req.texture = isMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaNoGUMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaNoGUReq);

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType === ConstraintType.GU) {
            this._valText.visible = true;
            this._reqClarifyText.visible = true;
            this._reqStatTxt.visible = true;

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append(`You must have ${val.toString()} or `);

            if (isMissionScreen) {
                tooltip.append('more ', 'altText');
            } else {
                tooltip.append('more ');
            }

            tooltip.append(`${EPars.getColoredLetter('U')}-${EPars.getColoredLetter('G')} pairs.`);
            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._reqClarifyText.text = `${(Number(val)).toString()} OR MORE`;
            this._reqStatTxt.text = stat.toString();

            this._req.texture = isMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaGUMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaGUReq);

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType === ConstraintType.GC
            || constraintType === ConstraintType.GCMIN
            || constraintType === ConstraintType.NOGC) {
            this._valText.visible = true;
            this._reqClarifyText.visible = true;
            this._reqStatTxt.visible = true;

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append('You must have ');

            let newClarifyText = '';

            if (constraintType === ConstraintType.GCMIN) {
                tooltip.append(`${val.toString()} or more`);
                newClarifyText += `${(Number(val)).toString()} OR MORE`;
            } else if (constraintType === ConstraintType.GC) {
                tooltip.append('at most', 'altText').append(` ${(Number(val)).toString()}`);
                newClarifyText += `${(Number(val)).toString()} OR FEWER`;
            } else if (constraintType === ConstraintType.NOGC) {
                tooltip.append('no');
                newClarifyText += 'NO GC PAIRS';
            }

            tooltip.append(` ${EPars.getColoredLetter('G')}-${EPars.getColoredLetter('C')} pairs.`);
            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._reqClarifyText.text = newClarifyText;
            this._reqStatTxt.text = stat.toString();

            if (constraintType === ConstraintType.NOGC) {
                this._req.texture = isMissionScreen
                    ? BitmapManager.getBitmap(Bitmaps.NovaNoGCMissionReq)
                    : BitmapManager.getBitmap(Bitmaps.NovaNoGCReq);
            } else if (isMissionScreen) {
                this._req.texture = BitmapManager.getBitmap(Bitmaps.NovaGCMissionReq);
            } else {
                this._req.texture = BitmapManager.getBitmap(Bitmaps.NovaGCReq);
            }

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType === ConstraintType.AU || constraintType === ConstraintType.AUMAX) {
            this._valText.visible = true;
            this._reqClarifyText.visible = true;
            this._reqStatTxt.visible = true;

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append('You must have ');

            let newClarifyText = '';
            if (constraintType === ConstraintType.AU) {
                tooltip.append(`${val.toString()} or more`);
                newClarifyText += `${(Number(val)).toString()} OR MORE`;
            } else if (constraintType === ConstraintType.AUMAX) {
                tooltip.append('at most', 'altText').append((Number(val)).toString());
                newClarifyText += `${(Number(val)).toString()} OR FEWER`;
            }
            tooltip.append(` ${EPars.getColoredLetter('A')}-${EPars.getColoredLetter('U')} pairs.`);
            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._reqClarifyText.text = newClarifyText;
            this._reqStatTxt.text = stat.toString();

            this._req.texture = isMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaAUMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaAUReq);

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType === ConstraintType.SHAPE) {
            this.updateBG();
            this._bg.visible = true;

            if (val.index != null) {
                tooltip.append(`In state ${val.index + 1}, your RNA must fold into the outlined structure.`);
                this._stateText.visible = true;
                this._stateText.text = val.index + 1;
            } else {
                tooltip.append('Your RNA must fold into the outlined structure.');
            }

            let targetPairs: number[] = val.target;
            let naturalPairs: number[] = val.native;
            let {structureConstraints} = val;
            let wrongPairs: number[] = this.getWrongPairs(naturalPairs, targetPairs, structureConstraints, satisfied);

            let sequence: number[] = new Array(naturalPairs.length);
            for (let ii = 0; ii < wrongPairs.length; ii++) {
                sequence[ii] = EPars.RNABASE_ADENINE;
            }

            if (this._enlarged) {
                this._smallThumbnail.visible = false;
                this._bigThumbnail.visible = true;
                PoseThumbnail.drawToSprite(
                    this._bigThumbnail, sequence, targetPairs,
                    7, PoseThumbnailType.WRONG_COLORED, 0, wrongPairs, false, 0
                );
                DisplayUtil.center(this._bigThumbnail, this._bg);
            } else {
                this._bigThumbnail.visible = false;
                this._smallThumbnail.visible = true;
                PoseThumbnail.drawToSprite(
                    this._smallThumbnail, sequence, targetPairs,
                    3, PoseThumbnailType.WRONG_COLORED, 0, wrongPairs, false, 0
                );
                DisplayUtil.center(this._smallThumbnail, this._bg);
            }

            tooltip.apply(this._bigText);
        } else if (constraintType === ConstraintType.ANTISHAPE) {
            this.updateBG();
            this._bg.visible = true;

            if (val.index != null) {
                tooltip.append(`In state ${val.index + 1}, your RNA must NOT have the structure in white outline.`);
                this._stateText.visible = true;
                this._stateText.text = val.index + 1;
            } else {
                tooltip.append('Your RNA must NOT have the structure in white outline.');
            }

            let targetPairs: number[] = val.target;
            let naturalPairs: number[] = val.native;
            let {structureConstraints} = val;
            let wrongPairs: number[] = this.getWrongPairs(naturalPairs, targetPairs, structureConstraints, satisfied);

            let sequence: number[] = new Array(naturalPairs.length);
            for (let ii = 0; ii < wrongPairs.length; ii++) {
                sequence[ii] = EPars.RNABASE_ADENINE;
            }

            if (this._enlarged) {
                this._smallThumbnail.visible = false;
                this._bigThumbnail.visible = true;
                PoseThumbnail.drawToSprite(
                    this._bigThumbnail, sequence, targetPairs,
                    7, PoseThumbnailType.WRONG_COLORED, 0, wrongPairs, false, 0
                );
                DisplayUtil.center(this._bigThumbnail, this._bg);
            } else {
                this._bigThumbnail.visible = false;
                this._smallThumbnail.visible = true;
                PoseThumbnail.drawToSprite(
                    this._smallThumbnail, sequence, targetPairs,
                    3, PoseThumbnailType.WRONG_COLORED, 0, wrongPairs, false, 0
                );
                DisplayUtil.center(this._smallThumbnail, this._bg);
            }

            this._noText.visible = true;

            tooltip.apply(this._bigText);
        } else if (constraintType === ConstraintType.BINDINGS) {
            this._reqClarifyText.visible = true;

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }

            tooltip.append(`In state ${(Number(val.index) + 1).toString()}, your RNA must:\n`);

            let clarifyTextBuilder = new StyledTextBuilder(this._reqClarifyText.style);
            for (let ii = 0; ii < val.bind.length; ii++) {
                tooltip.append('- ');
                if (isMissionScreen) {
                    tooltip.pushStyle('altText');
                }
                tooltip.append(val.bind[ii] ? 'bind' : 'NOT bind');
                if (isMissionScreen) {
                    tooltip.popStyle();
                }
                tooltip.append(` with ${val.oligoNames[ii]}\n`);

                if (ii > 0) {
                    clarifyTextBuilder.append('\u2003');
                }

                clarifyTextBuilder.append(` ${val.label[ii]}`, {fill: val.bind[ii] ? 0xffffff : 0x808080});
            }

            if (isMissionScreen) {
                tooltip.popStyle();
            }

            clarifyTextBuilder.apply(this._reqClarifyText);

            let tw: number = Math.min(101, 15 * (2 * val.bind.length - 1));
            let step: number = tw / (2 * val.bind.length - 1);
            let orig: number = (111 - tw) * 0.5;
            if (val.bind.length === 1) tw = 45;

            this._bgGraphics.visible = true;
            this._bgGraphics.clear();
            this._bgGraphics.beginFill(0x1E314B, 0.5);
            this._bgGraphics.drawRoundedRect(0, 0, 111, isMissionScreen ? 55 : 75, 15);
            this._bgGraphics.endFill();

            this._bgGraphics.lineStyle(2.5, 0xFFFFFF, 0.9);
            this._bgGraphics.moveTo((111 - tw) * 0.5, 27);
            this._bgGraphics.lineTo((111 + tw) * 0.5, 27);

            for (let ii = 0; ii < val.bind.length; ii++) {
                let ctrlY: number = (val.bind[ii] ? 22 : 14);
                this._bgGraphics.moveTo(orig + (ii * 2) * step, ctrlY);
                this._bgGraphics.lineTo(orig + (ii * 2 + 1) * step, ctrlY);
            }
            this._bg.visible = true;

            this._stateText.visible = true;
            this._stateText.text = val.index + 1;

            this._outline.visible = true;
        } else if (constraintType === ConstraintType.A || constraintType === ConstraintType.AMAX
            || constraintType === ConstraintType.C || constraintType === ConstraintType.CMAX
            || constraintType === ConstraintType.G || constraintType === ConstraintType.GMAX
            || constraintType === ConstraintType.U || constraintType === ConstraintType.UMAX) {
            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append('You must have ');

            let letter: string = constraintType.substr(0, 1);
            if (constraintType === letter) {
                tooltip.append(`${val.toString()} or more`);
            } else {
                tooltip.append('at most', 'altText').append(` ${(Number(val)).toString()}`);
            }
            tooltip.append(` ${EPars.getColoredLetter(letter)}s.`);
            if (isMissionScreen) {
                tooltip.popStyle();
            }

            let newClarifyText = constraintType === letter
                ? `${(Number(val)).toString()} OR MORE`
                : `${(Number(val)).toString()} OR FEWER`;

            this._reqClarifyText.text = newClarifyText;
            this._reqStatTxt.text = stat.toString();

            this._valText.visible = true;
            this._reqClarifyText.visible = true;
            this._reqStatTxt.visible = true;

            this._req.texture = isMissionScreen
                ? BitmapManager.getBitmapNamed(`Nova${letter}MissionReq`)
                : BitmapManager.getBitmapNamed(`Nova${letter}Req`);

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType === ConstraintType.PAIRS) {
            this._reqClarifyText.visible = true;
            this._reqStatTxt.visible = true;

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append(`You must have ${val.toString()} or more pairs`);
            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._reqClarifyText.text = `${(Number(val)).toString()} OR MORE`;

            this._reqStatTxt.text = stat.toString();

            this._req.texture = isMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaPairsMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaPairsReq);

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType === ConstraintType.MUTATION) {
            this._bg.visible = true;
            this._bgGraphics.visible = true;
            this._bgGraphics.clear();
            this._bgGraphics.beginFill(0x1E314B, 0.5);
            this._bgGraphics.drawRoundedRect(0, 0, 111, isMissionScreen ? 55 : 75, 15);
            this._bgGraphics.endFill();

            this._base1.texture = BitmapManager.getBitmap(Bitmaps.BaseAMid);
            this._base2.texture = BitmapManager.getBitmap(Bitmaps.BaseGMid);
            this._base3.texture = BitmapManager.getBitmap(Bitmaps.BaseUMid);
            this._base4.texture = BitmapManager.getBitmap(Bitmaps.BaseCMid);
            this._base1.visible = true;
            this._base2.visible = true;
            this._base3.visible = true;
            this._base4.visible = true;

            this._base1.x = 28;
            this._base1.y = 8;

            this._base2.x = 36;
            this._base2.y = 8;

            this._base3.x = 44;
            this._base3.y = 8;

            this._base4.x = 52;
            this._base4.y = 7;

            this._reqClarifyText.visible = true;
            this._reqClarifyText.text = `AT MOST ${val} CHANGES`;
            this._reqStatTxt.visible = true;

            ConstraintBox.createTextStyle()
                .append(stat.toString(), {fill: (satisfied ? 0x00aa00 : 0xaa0000)})
                .append(`/${val.toString()}`)
                .apply(this._reqStatTxt);

            tooltip.append(`You can only mutate up to ${val.toString()} bases`);
            tooltip.apply(this._bigText);

            this._outline.visible = true;
        } else if (constraintType === ConstraintType.STACK) {
            let baseTexture = BitmapManager.getBitmap(Bitmaps.BaseWMidPattern);
            this._base1.texture = baseTexture;
            this._base2.texture = baseTexture;
            this._base3.texture = baseTexture;
            this._base4.texture = baseTexture;
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
            this._bond.strength = 1;

            this._bond2.display.position = new Point(22, 17);
            this._bond2.display.visible = true;
            this._bond2.strength = 1;

            this._valText.visible = true;

            ConstraintBox.createTextStyle()
                .append(`${stat}`, {fill: satisfied ? 0x00aa00 : 0xaa0000})
                .append(`${val}`)
                .apply(this._valText);

            tooltip.append(`You must have a stack with ${val.toString()} or more pairs.`);
            tooltip.apply(this._bigText);
        } else if (constraintType.lastIndexOf('CONSECUTIVE_') >= 0) {
            this._valText.visible = true;
            this._reqClarifyText.visible = true;
            this._reqStatTxt.visible = true;

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append('You must have ');

            let letter: string = constraintType.substr(12, 1);
            tooltip.append('at most', 'altText')
                .append(` ${(Number(val) - 1).toString()} ${EPars.getColoredLetter(letter)}s in a row.`);
            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._reqClarifyText.text = `AT MOST ${(Number(val) - 1).toString()} IN A ROW`;
            this._reqStatTxt.text = stat.toString();

            this._req.texture = isMissionScreen
                ? BitmapManager.getBitmapNamed(`Nova${letter}RowMissionReq`)
                : BitmapManager.getBitmapNamed(`Nova${letter}RowReq`);

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType === ConstraintType.LAB_REQUIREMENTS) {
            this._bg.visible = true;
            this._bgGraphics.visible = true;
            this._bgGraphics.clear();
            this._bgGraphics.beginFill(0x1E314B, 0.5);
            this._bgGraphics.drawRoundedRect(0, 0, 111, isMissionScreen ? 55 : 75, 15);
            this._bgGraphics.endFill();

            this._icon.visible = true;
            this._icon.texture = BitmapManager.getBitmap(Bitmaps.ImgLabReq);
            this._icon.position = new Point((111 - this._icon.width) * 0.5, 2);

            if (!isMissionScreen) {
                let noGoodBuilder = new StyledTextBuilder({
                    fontFamily: Fonts.ARIAL,
                    fontSize: 11,
                    fill: 0xC0DCE7,
                    letterSpacing: -0.5
                });
                noGoodBuilder.addStyle('redText', {fill: 0xff0000});

                if (!(val.gCount < val.gMax)) {
                    noGoodBuilder.append((val.gCount).toString(), 'redText').append('G');
                }

                if (!(val.cCount < val.cMax)) {
                    noGoodBuilder.append((val.cCount).toString(), 'redText').append('C');
                }

                if (!(val.aCount < val.aMax)) {
                    noGoodBuilder.append((val.aCount).toString(), 'redText').append('A');
                }

                this._reqStatTxt.visible = true;
                if (noGoodBuilder.text.length > 0) {
                    noGoodBuilder.apply(this._reqStatTxt);
                } else {
                    this._reqStatTxt.text = 'OK';
                }
            } else {
                this._reqStatTxt.visible = false;
            }

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append('You must have:\n')
                .append('- ').append('at most', 'altText').append(` ${val.gMax - 1} `)
                .append(`${EPars.getColoredLetter('G')}s in a row\n`)
                .append('- ')
                .append('at most', 'altText')
                .append(` ${val.cMax - 1} `)
                .append(`${EPars.getColoredLetter('C')}s in a row\n`)
                .append('- ')
                .append('at most', 'altText')
                .append(` ${val.aMax - 1} `)
                .append(`${EPars.getColoredLetter('A')}s in a row\n`);
            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._outline.visible = true;
        } else if (constraintType === ConstraintType.BARCODE) {
            this._reqClarifyText.visible = true;

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append('You must have a ');

            if (isMissionScreen) {
                tooltip.append('unique ', 'altText');
            } else {
                tooltip.append('unique ');
            }
            tooltip.append('barcode.');

            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._reqClarifyText.text = 'MUST BE UNIQUE';

            this._req.texture = isMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaBarcodeMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaBarcodeReq);

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType.lastIndexOf('OLIGO_') >= 0) {
            this._reqClarifyText.visible = true;

            let binder: boolean = (constraintType.lastIndexOf('UNBOUND') < 0);

            if (isMissionScreen) {
                tooltip.pushStyle('altTextMain');
            }
            tooltip.append(`In state ${(Number(val) + 1).toString()}, the oligo must `);
            if (isMissionScreen) {
                tooltip.pushStyle('altText');
            }
            tooltip.append(binder ? 'bind' : 'NOT bind');
            if (isMissionScreen) {
                tooltip.popStyle();
            }
            tooltip.append(' with your RNA.');
            if (isMissionScreen) {
                tooltip.popStyle();
            }

            this._reqClarifyText.text = binder ? 'MUST BIND' : 'MAY NOT BIND';

            const ico = binder ? 'Bound' : 'Unbound';
            this._req.texture = isMissionScreen
                ? BitmapManager.getBitmapNamed(`Nova${ico}OligoMissionReq`)
                : BitmapManager.getBitmapNamed(`Nova${ico}OligoReq`);

            this._req.visible = true;
            this._outline.visible = true;
        } else if (constraintType === ConstraintType.SCRIPT) {
            let {nid} = val;
            let {goal} = val;
            let {name} = val;
            if (name.length > 5) name = `${name.substr(0, 5)}..`;
            let {value} = val;

            this._bg.visible = true;
            this._bgGraphics.visible = true;
            this._bgGraphics.clear();
            this._bgGraphics.beginFill(0x1E314B, 0.5);
            this._bgGraphics.drawRoundedRect(0, 0, 111, isMissionScreen ? 55 : 75, 15);
            this._bgGraphics.endFill();

            let dataPNG = val['dataPNG'];
            if (dataPNG != null) {
                this._icon.visible = true;
                TextureUtil.fromBase64PNG(dataPNG).then((tex) => {
                    this._icon.texture = tex;
                    this._icon.position = new Point((111 - this._icon.width) * 0.5, 2);
                });
            } else {
                this._icon.visible = false;
                this._icon.texture = Texture.EMPTY;
            }

            if (name != null && name.length > 0) {
                this._noText.visible = true;
                this._noText.text = name;
                this._noText.position = new Point(30 - this._noText.width * 0.5, 10);
            } else {
                this._noText.visible = false;
            }

            if (val.index != null) {
                this._stateText.visible = true;
                this._stateText.text = val.index;
            }

            if (!isMissionScreen && value != null && value.length > 0) {
                this._reqStatTxt.visible = true;
                this._reqStatTxt.text = value;
            } else {
                this._reqStatTxt.visible = false;
            }

            tooltip.append(goal != null && goal.length > 0 ? goal : `Your puzzle must satisfy script ${nid}`);
            this._outline.visible = true;
        }

        this.setTooltip(tooltip, satisfied);

        this._valText.position = new Point(30 - this._valText.width * 0.5, 37);
        this._reqStatTxt.visible = !isMissionScreen;
        if (isMissionScreen) {
            this._outline.visible = false;
            tooltip.apply(this._sideTxt);
            if (this._req.visible) {
                this._sideTxt.position = new Point(
                    this._req.width + 18, this._req.height / 2 - this._sideTxt.height / 2
                );
            } else {
                this._sideTxt.position = new Point(111 + 18, 55 / 2 - this._sideTxt.height / 2);
            }
        }

        // let more: number = newClarifyText.indexOf("MORE");
        // let less: number = newClarifyText.indexOf("FEWER");
        // let idx: number = (more === -1) ? less : more;
        // let bf: TextFormat = Fonts.arial(11, true);
        // if (idx !== -1) {
        //     this._req_clarify_text.GetTextBox().setTextFormat(bf, idx, idx + (more === -1 ? 5 : 4));
        // }
        //
        // if (keyword === "NOGC") {
        //     this._req_clarify_text.GetTextBox().setTextFormat(bf, 0, 2);
        // }

        DisplayUtil.positionRelative(
            this._reqClarifyText, HAlign.CENTER, VAlign.TOP,
            this._outline, HAlign.CENTER, VAlign.TOP, 2, 32
        );

        DisplayUtil.positionRelative(
            this._reqStatTxt, HAlign.CENTER, VAlign.TOP,
            this._outline, HAlign.CENTER, VAlign.TOP, 0, 50
        );
    }

    public get width(): number {
        return this._outline.visible ? 111 : 75;
    }

    public get height(): number {
        return 75;
    }

    public flash(color: number): void {
        this._backlight.clear();
        this._backlight.beginFill(color, 0.9);
        this._backlight.drawRoundedRect(0, 0, this.width, this.height, 10);
        this._backlight.endFill();
        this._backlight.alpha = 0;
        this._backlight.visible = true;
        this._backlight.position = new Point(0, 0);

        this.replaceNamedObject(ConstraintBox.BACKLIGHT_ANIM, new SerialTask(
            new AlphaTask(1, 0.15, Easing.easeInOut, this._backlight),
            new AlphaTask(0, 0.15, Easing.easeInOut, this._backlight),
            new AlphaTask(1, 0.3, Easing.easeInOut, this._backlight),
            new AlphaTask(0, 0.4, Easing.easeInOut, this._backlight),
            new VisibleTask(false, this._backlight),
        ));
    }

    public flare(satisfied: boolean): void {
        if (this._boxType === ConstraintBoxType.MISSION_SCREEN) {
            this.removeNamedObjects(ConstraintBox.BACKLIGHT_ANIM);
            this.removeNamedObjects(ConstraintBox.FGLOW_ANIM);
            this._backlight.visible = false;
            this._fglow.visible = false;

            return;
        }

        let lineWidth = 6;

        this._fglow.clear();
        this._fglow.lineStyle(lineWidth, satisfied ? 0x00FF00 : 0xFF0000, 1.0);
        this._fglow.drawRoundedRect(lineWidth / 2, lineWidth / 2, this.width - lineWidth, this.height - lineWidth, 10);
        this._fglow.scale.x = 1;
        this._fglow.scale.y = 1;
        this._fglow.alpha = 0;
        this._fglow.visible = true;
        this._fglow.position = new Point(0, 0);
        this.replaceNamedObject(ConstraintBox.FGLOW_ANIM, new ParallelTask(
            new LocationTask(0, -lineWidth, 1.6, Easing.easeIn, this._fglow),
            new ScaleTask(1.0, 1.0 + 2 * (lineWidth + 1) / this.width, 1.6, Easing.easeIn, this._fglow),
            new SerialTask(
                new AlphaTask(1, 0.8, Easing.linear, this._fglow),
                new AlphaTask(0, 0.8, Easing.linear, this._fglow),
                new VisibleTask(false, this._fglow)
            ),
        ));

        this._backlight.clear();
        this._backlight.beginFill(satisfied ? 0x00FF00 : 0xFF0000, 0.7);
        this._backlight.drawRoundedRect(0, 0, this.width, this.height, 10);
        this._backlight.endFill();
        this._backlight.alpha = 0;
        this._backlight.visible = true;
        this._backlight.position = new Point(0, 0);
        this.replaceNamedObject(ConstraintBox.BACKLIGHT_ANIM, new SerialTask(
            new AlphaTask(1, 0.8, Easing.easeInOut, this._backlight),
            new AlphaTask(0, 0.8, Easing.easeInOut, this._backlight),
            new VisibleTask(false, this._backlight),
        ));
    }

    private updateBG(): void {
        if (this._satisfied && this._enlarged) {
            this._bg.texture = BitmapManager.getBitmap(Bitmaps.NovaPuzThumbLargeMet);
        } else if (!this._satisfied && this._enlarged) {
            this._bg.texture = BitmapManager.getBitmap(Bitmaps.NovaPuzThumbLargeFail);
        } else if (this._satisfied && !this._enlarged) {
            this._bg.texture = BitmapManager.getBitmap(Bitmaps.NovaPuzThumbSmallMet);
        } else if (!this._satisfied && !this._enlarged) {
            this._bg.texture = BitmapManager.getBitmap(Bitmaps.NovaPuzThumbSmallFail);
        }
    }

    private setTooltip(styledText: StyledTextBuilder, satisfied: boolean): void {
        if (!satisfied) {
            styledText = styledText.clone().append('\n').append('Unsatisfied', {fill: 0xff0000});
        }

        let balloon = new TextBalloon('', 0x0, 0.8);
        balloon.styledText = styledText;
        this.setMouseOverObject(balloon);
    }

    private setMouseOverObject(obj: SceneObject): void {
        const FADE_IN_DELAY = 1.0;

        if (this._mouseOverObject != null) {
            this._mouseOverObject.destroySelf();
            this._mouseOverObject = null;
            this._mouseOverRegs.close();
            this._mouseOverRegs = null;
        }

        if (obj != null) {
            obj.display.x = 0;
            obj.display.y = 78;
            obj.display.visible = false;
            obj.display.interactive = false;
            this.addObject(obj, this.container);

            this._mouseOverObject = obj;

            const MOUSE_OVER_ANIM = 'MouseOverAnim';

            let isMouseOver = false;
            this._mouseOverRegs = new RegistrationGroup();
            this._mouseOverRegs.add(this.pointerOver.connect(() => {
                if (!isMouseOver) {
                    isMouseOver = true;
                    obj.display.visible = true;
                    obj.display.alpha = 0;
                    obj.replaceNamedObject(MOUSE_OVER_ANIM, new SerialTask(
                        new DelayTask(FADE_IN_DELAY),
                        new AlphaTask(1, 0.1)
                    ));
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

    /** Creates a StyledTextBuilder with the ConstraintBox's default settings */
    private static createTextStyle(): StyledTextBuilder {
        let style: StyledTextBuilder = new StyledTextBuilder({
            fontFamily: Fonts.STDFONT_REGULAR,
            fontSize: 16,
            fill: 0xffffff,
            letterSpacing: -0.5,
            wordWrap: true,
            wordWrapWidth: 250
        }).addStyle('altText', {
            fontFamily: Fonts.STDFONT_MEDIUM,
            leading: 10
        }).addStyle('altTextMain', {
            fontFamily: Fonts.STDFONT_REGULAR,
            leading: 5
        });

        EPars.addLetterStyles(style);

        return style;
    }

    private readonly _boxType: ConstraintBoxType;

    private readonly _bg: Sprite;
    private readonly _outline: Sprite;
    private readonly _icon: Sprite;
    private readonly _bases: Container;
    private readonly _base1: Sprite;
    private readonly _base2: Sprite;
    private readonly _base3: Sprite;
    private readonly _base4: Sprite;
    private readonly _bond: Band;
    private readonly _bond2: Band;
    private readonly _smallThumbnail: Sprite;
    private readonly _bigThumbnail: Sprite;

    private readonly _valText: MultiStyleText;
    private readonly _bigText: MultiStyleText;
    private readonly _reqClarifyText: MultiStyleText;
    private readonly _reqStatTxt: MultiStyleText;
    private readonly _noText: Text;
    private readonly _stateText: Text;

    private readonly _sideTxt: MultiStyleText;

    private readonly _flag: Graphics;
    private readonly _bgGraphics: Graphics;
    private readonly _check: Sprite;
    private readonly _req: Sprite;

    private readonly _fglow: Graphics;
    private readonly _backlight: Graphics;

    private _enlarged: boolean = false;
    private _satisfied: boolean = false;
    private _constraintType: ConstraintType = null;
    private _val: any = null;
    private _stat: number = 0;

    private _mouseOverRegs: RegistrationGroup;
    private _mouseOverObject: SceneObject;

    private static readonly LOCATION_ANIM = 'AnimateLocation';
    private static readonly BIG_TEXT_FADE_ANIM = 'BigTextFadeAnim';
    private static readonly BACKLIGHT_ANIM = 'BacklightAnim';
    private static readonly FGLOW_ANIM = 'FGlowAnim';
}
