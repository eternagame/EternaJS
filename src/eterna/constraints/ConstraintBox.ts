import {
    ContainerObject, Enableable, SceneObject, StyledTextBuilder, DisplayUtil, HAlign, VAlign,
    SerialTask, DelayTask, AlphaTask, TextureUtil, LocationTask, Easing, ParallelTask, ScaleTask, VisibleTask, Flashbang
} from 'flashbang';
import {
    Graphics, Sprite, Text, Point, Texture, Container
} from 'pixi.js';
import MultiStyleText from 'pixi-multistyle-text';
import Fonts from 'eterna/util/Fonts';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import EPars from 'eterna/EPars';
import TextBalloon from 'eterna/ui/TextBalloon';
import {RegistrationGroup} from 'signals';
import Sounds from 'eterna/resources/Sounds';
import UITheme from 'eterna/ui/UITheme';
import {FontWeight} from 'flashbang/util/TextBuilder';

export interface ConstraintBoxConfig {
    // Toggle checkmark, green vs red outline
    satisfied: boolean;
    // Tooltip on hover
    tooltip: string | StyledTextBuilder;
    // Show the green/red outline
    showOutline?: boolean;
    // Used when the constraint image includes a background
    // Due to a type constraint from Pixi, we need this to be nullable, not optional
    fullTexture?: Texture;
    // Whether to draw the transparent background
    drawBG?: boolean;
    // Used with drawBG, constraint image without background. If a string, it will be parsed as a base64 encoded image
    icon?: Texture | Graphics | string;
    // Alternative to drawBG, used for SHAPE constraints
    thumbnailBG?: boolean;
    // Alternative to iconTexture, used for SHAPE constraints
    thumbnail?: Graphics;
    // Text used to augment the constraint graphic to describe the constraint
    clarificationText?: string | StyledTextBuilder;
    // Text describing the current state of the constraint/the value it's "monitoring"
    statText?: string | StyledTextBuilder;
    // Displays large number in a corner of the constraint box
    stateNumber?: number;
    // Displays large "NO" in a corner of the constraint box
    noText?: boolean;
}

export default class ConstraintBox extends ContainerObject implements Enableable {
    constructor(forMissionScreen: boolean, states = 1) {
        super();
        this._forMissionScreen = forMissionScreen;
        this._states = states;

        this._bgGraphics = new Graphics();
        this._bgGraphics.interactiveChildren = false;
        this.container.addChild(this._bgGraphics);

        this._backlight = new Graphics();
        this._backlight.visible = false;
        this.container.addChild(this._backlight);

        this._opaqueBackdrop = new Graphics();
        this._opaqueBackdrop.visible = false;
        this.container.addChild(this._opaqueBackdrop);

        this._req = new Sprite();
        this._req.visible = false;
        this.container.addChild(this._req);

        this._bg = new Sprite();
        this._bg.visible = false;
        this.container.addChild(this._bg);

        this._icon = new Sprite();
        this._icon.visible = false;
        this.container.addChild(this._icon);

        this._noText = Fonts.std('NO', 16).bold().color(0xffffff).letterSpacing(-0.5)
            .build();
        this._noText.position = new Point(35, 0);
        this._noText.visible = false;
        this.container.addChild(this._noText);

        this._stateText = Fonts.std('', 18).bold().color(0xffffff).letterSpacing(-0.5)
            .build();
        this._stateText.position = new Point(3, 45);
        this._stateText.visible = false;
        this.container.addChild(this._stateText);

        this._reqClarifyText = new MultiStyleText('', {
            default: {
                fontFamily: Fonts.STDFONT,
                fontSize: 11,
                fill: 0xC0DCE7,
                letterSpacing: -0.5,
                align: 'center'
            }
        });
        this._reqClarifyText.position = new Point(50, 30);
        this._reqClarifyText.visible = false;
        this.container.addChild(this._reqClarifyText);

        this._reqStatText = new MultiStyleText('', {
            default: {
                fontFamily: Fonts.STDFONT,
                fontSize: 11,
                fill: 0xC0DCE7,
                letterSpacing: -0.5
            }
        });
        this._reqStatText.position = new Point(50, 50);
        this._reqStatText.visible = false;
        this.container.addChild(this._reqStatText);

        this._smallThumbnail = new Sprite();
        this._smallThumbnail.position = new Point(6, 6);
        this.container.addChild(this._smallThumbnail);

        this._flag = new Graphics();
        this._flag.clear();
        this._flag.beginFill(0xBEDCE7, 1.0);
        this._flag.drawRect(0, 0, 5, 5);
        this._flag.endFill();
        this._flag.position = new Point(4, 4);
        this.container.addChild(this._flag);
        this._flag.visible = false;

        if (this._forMissionScreen) {
            this._sideText = new MultiStyleText('', {});
            this.container.addChild(this._sideText);
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

    public setContent(config: ConstraintBoxConfig, toolTipContainer?: Container): void {
        this._check.visible = config.satisfied && !this._forMissionScreen;

        let reqClarifyMultiLine = this._reqClarifyText.text.includes('\n')
        || (config.clarificationText as string)?.includes('\n');

        this._req.visible = config.fullTexture !== undefined;
        if (config.fullTexture !== undefined) {
            this._req.texture = config.fullTexture;

            // Add border
            const border = new Graphics();
            border.interactiveChildren = false;
            border.lineStyle(UITheme.panel.borderSize, UITheme.constraints.borderColor, 1);
            border.drawRoundedRect(
                0,
                0,
                this._req.texture.width,
                this._req.texture.height,
                UITheme.constraints.borderRadius
            );
            this._req.addChild(border);
            this.initOpaqueBackdrop(config.fullTexture.width, config.fullTexture.height);
        }

        this._outline.visible = config.showOutline || false;
        if (this._outline.visible) {
            this._outline.texture = config.satisfied
                ? BitmapManager.getBitmap(Bitmaps.NovaPassOutline)
                : BitmapManager.getBitmap(Bitmaps.NovaFailOutline);
        }

        this._reqClarifyText.visible = config.clarificationText !== undefined;
        if (config.clarificationText !== undefined) {
            // We know config.clarificationText is not undefined because of the
            // above condition, so we can type guard
            this.setPossiblyStyledText(config.clarificationText, this._reqClarifyText);
            let yOffset = reqClarifyMultiLine ? 27 : 32;
            DisplayUtil.positionRelative(
                this._reqClarifyText, HAlign.CENTER, VAlign.TOP,
                this._outline, HAlign.CENTER, VAlign.TOP, 2, yOffset
            );
            this._check.position.y = reqClarifyMultiLine ? 55 : 50;
        }

        this._reqStatText.visible = config.statText !== undefined && !this._forMissionScreen;
        if (config.statText !== undefined && !this._forMissionScreen) {
            // We know config.statText isn't undefined due to the above condition
            this.setPossiblyStyledText(config.statText, this._reqStatText);
            let yOffset = reqClarifyMultiLine ? 55 : 50;
            DisplayUtil.positionRelative(
                this._reqStatText, HAlign.CENTER, VAlign.TOP,
                this._outline, HAlign.CENTER, VAlign.TOP, 0, yOffset
            );
        }

        let tooltipText = config.tooltip instanceof StyledTextBuilder
            ? config.tooltip : ConstraintBox.createTextStyle().append(config.tooltip);

        if (!config.satisfied && !this._forMissionScreen) {
            tooltipText = tooltipText.clone().append('\n').append('Unsatisfied', {fill: 0xff0000});
        }

        let balloon = new TextBalloon('', 0x0, 0.8);
        balloon.styledText = tooltipText;
        this.setMouseOverObject(balloon, toolTipContainer);

        this._bgGraphics.visible = config.drawBG || false;
        if (this._bgGraphics.visible) {
            this._bgGraphics.clear();
            this._bgGraphics.beginFill(0x1E314B, 0.5);
            this._bgGraphics.drawRoundedRect(0, 0, 111, this._forMissionScreen ? 55 : 75, 15);
            this._bgGraphics.endFill();
            this.initOpaqueBackdrop(this._bgGraphics.width, this._bgGraphics.height);
        }

        this._bg.visible = config.thumbnailBG || false;
        if (this._bg.visible) {
            if (config.satisfied) {
                this._bg.texture = BitmapManager.getBitmap(Bitmaps.NovaPuzThumbSmallMet);
            } else {
                this._bg.texture = BitmapManager.getBitmap(Bitmaps.NovaPuzThumbSmallFail);
            }

            this.initOpaqueBackdrop(this._bg.texture.width, this._bg.texture.height);
            this._check.position = new Point(55, 50);
            this._noText.position = new Point(35, 1);
            this._stateText.position = new Point(3, 45);
        }

        if (this._forMissionScreen) {
            this._outline.visible = false;
            tooltipText.apply(this._sideText);
            // Make the icon look centered with respect to the text
            const deltaWidth = Math.max(0, this._sideText.width - this._opaqueBackdrop.width);
            this._sideText.position = new Point(-deltaWidth / 2, this._opaqueBackdrop.height + 10);
        }

        if (config.stateNumber && !this._forMissionScreen && this._states > 1) {
            this._stateText.visible = true;
            this._stateText.text = config.stateNumber.toString();
        }

        if (config.thumbnail) {
            this._smallThumbnail.visible = true;
            this._smallThumbnail.removeChildren();
            this._smallThumbnail.addChild(config.thumbnail);
            DisplayUtil.center(this._smallThumbnail, this._bg);
        }

        if (config.icon) {
            this._icon.visible = true;
            this._icon.removeChildren();
            this._icon.texture = Texture.EMPTY;
            if (config.icon instanceof Texture) {
                this._icon.texture = config.icon;
                this._icon.position = new Point((111 - this._icon.width) * 0.5, 2);
            } else if (config.icon instanceof Graphics) {
                this._icon.addChild(config.icon);
            } else {
                TextureUtil.fromBase64PNG(config.icon).then((tex) => {
                    this._icon.texture = tex;
                    this._icon.position = new Point((111 - this._icon.width) * 0.5, 2);
                });
            }
        }

        this._noText.visible = config.noText || false;

        if (config.satisfied && !this._satisfied) {
            Flashbang.sound.playSound(Sounds.SoundCondition);
            this.flare(true);
        } else if (!config.satisfied && this._satisfied) {
            Flashbang.sound.playSound(Sounds.SoundDecondition);
            this.flare(false);
        }

        this._satisfied = config.satisfied;
    }

    public set flagged(vis: boolean) {
        this._flag.visible = vis;
    }

    public get flagged(): boolean {
        return this._flag.visible;
    }

    public get enabled(): boolean {
        return this.display.visible;
    }

    public set enabled(value: boolean) {
        this.display.visible = value;
    }

    public get width() {
        if (this._forMissionScreen) {
            return Math.max(this._sideText.width, this._opaqueBackdrop.width);
        } else {
            return this._opaqueBackdrop.width;
        }
    }

    public get sideTextOffset() {
        return this._sideText.position.x;
    }

    /** Creates a StyledTextBuilder with the ConstraintBox's default settings */
    public static createTextStyle(): StyledTextBuilder {
        let style: StyledTextBuilder = new StyledTextBuilder({
            fontFamily: Fonts.STDFONT,
            fontSize: 14,
            fill: 0xffffff,
            letterSpacing: -0.5,
            wordWrap: true,
            wordWrapWidth: UITheme.missionIntro.maxConstraintWidth
        }).addStyle('altText', {
            fontFamily: Fonts.STDFONT,
            fontWeight: FontWeight.SEMIBOLD,
            leading: 10
        }).addStyle('altTextMain', {
            fontFamily: Fonts.STDFONT,
            leading: 5
        });

        EPars.addLetterStyles(style);

        return style;
    }

    private setPossiblyStyledText(str: string | StyledTextBuilder, text: MultiStyleText): void {
        if (str instanceof StyledTextBuilder) {
            str.defaultStyle(text.style);
            str.apply(text);
        } else {
            text.text = str;
        }
    }

    private setMouseOverObject(obj: SceneObject, container?: Container): void {
        const FADE_IN_DELAY = 1.0;

        if (this._mouseOverObject != null) {
            this._mouseOverObject.destroySelf();
            this._mouseOverObject = null;
            if (this._mouseOverRegs != null) {
                this._mouseOverRegs.close();
                this._mouseOverRegs = null;
            }
        }

        if (obj != null) {
            obj.display.x = 0;
            obj.display.y = 78;
            obj.display.visible = false;
            obj.display.interactive = false;
            this.addObject(obj, container ?? this.container);

            this._mouseOverObject = obj;

            const MOUSE_OVER_ANIM = 'MouseOverAnim';

            let isMouseOver = false;
            this._mouseOverRegs = new RegistrationGroup();
            this._mouseOverRegs.add(this.pointerOver.connect(() => {
                if (!isMouseOver) {
                    isMouseOver = true;
                    obj.display.visible = true;
                    obj.display.alpha = 0;
                    if (obj.display.parent !== this.container) {
                        obj.display.x = this.display.x;
                    }
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

    private initOpaqueBackdrop(width: number, height: number) {
        this._opaqueBackdrop.clear();
        this._opaqueBackdrop.beginFill(0x142640, 1);
        this._opaqueBackdrop.drawRoundedRect(0, 0, width, height, 15);
        this._opaqueBackdrop.endFill();
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

    public flare(satisfied: boolean): void {
        if (this._forMissionScreen) {
            this.removeNamedObjects(ConstraintBox.BACKLIGHT_ANIM);
            this.removeNamedObjects(ConstraintBox.FGLOW_ANIM);
            this._backlight.visible = false;
            this._fglow.visible = false;

            return;
        }

        let lineWidth = 6;

        this._fglow.clear();
        this._fglow.lineStyle(lineWidth, satisfied ? 0x00FF00 : 0xFF0000, 1.0);
        this._fglow.drawRoundedRect(
            lineWidth / 2,
            lineWidth / 2,
            this.display.width - lineWidth,
            this.display.height - lineWidth,
            10
        );
        this._fglow.scale.x = 1;
        this._fglow.scale.y = 1;
        this._fglow.alpha = 0;
        this._fglow.visible = true;
        this._fglow.position = new Point(0, 0);
        this.replaceNamedObject(ConstraintBox.FGLOW_ANIM, new ParallelTask(
            new LocationTask(0, -lineWidth, 1.6, Easing.easeIn, this._fglow),
            new ScaleTask(1.0, 1.0 + (2 * (lineWidth + 1)) / this.display.width, 1.6, Easing.easeIn, this._fglow),
            new SerialTask(
                new AlphaTask(1, 0.8, Easing.linear, this._fglow),
                new AlphaTask(0, 0.8, Easing.linear, this._fglow),
                new VisibleTask(false, this._fglow)
            )
        ));

        this._backlight.clear();
        this._backlight.beginFill(satisfied ? 0x00FF00 : 0xFF0000, 0.7);
        this._backlight.drawRoundedRect(0, 0, this.display.width, this.display.height, 10);
        this._backlight.endFill();
        this._backlight.alpha = 0;
        this._backlight.visible = true;
        this._backlight.position = new Point(0, 0);
        this.replaceNamedObject(ConstraintBox.BACKLIGHT_ANIM, new SerialTask(
            new AlphaTask(1, 0.8, Easing.easeInOut, this._backlight),
            new AlphaTask(0, 0.8, Easing.easeInOut, this._backlight),
            new VisibleTask(false, this._backlight)
        ));
    }

    public flash(color: number): void {
        this._backlight.clear();
        this._backlight.beginFill(color, 0.9);
        this._backlight.drawRoundedRect(0, 0, this.display.width, this.display.height, 10);
        this._backlight.endFill();
        this._backlight.alpha = 0;
        this._backlight.visible = true;
        this._backlight.position = new Point(0, 0);

        this.replaceNamedObject(ConstraintBox.BACKLIGHT_ANIM, new SerialTask(
            new AlphaTask(1, 0.15, Easing.easeInOut, this._backlight),
            new AlphaTask(0, 0.15, Easing.easeInOut, this._backlight),
            new AlphaTask(1, 0.3, Easing.easeInOut, this._backlight),
            new AlphaTask(0, 0.4, Easing.easeInOut, this._backlight),
            new VisibleTask(false, this._backlight)
        ));
    }

    public setOpaqueBackdropVisible(visible: boolean) {
        this._opaqueBackdrop.visible = visible;
    }

    private _forMissionScreen: boolean;

    private _satisfied: boolean;

    private readonly _states: number;

    private _bgGraphics: Graphics;
    private _backlight: Graphics;
    private _req: Sprite;
    private _bg: Sprite;
    private _icon: Sprite;
    private _noText: Text;
    private _stateText: Text;
    private _reqClarifyText: MultiStyleText;
    private _reqStatText: MultiStyleText;
    private _smallThumbnail: Sprite;
    private _flag: Graphics;
    private _sideText: MultiStyleText;
    private _check: Sprite;
    private _outline: Sprite;
    private _fglow: Graphics;
    private _opaqueBackdrop: Graphics;

    private _mouseOverRegs: RegistrationGroup | null;
    private _mouseOverObject: SceneObject | null;

    private static readonly LOCATION_ANIM = 'AnimateLocation';
    private static readonly BACKLIGHT_ANIM = 'BacklightAnim';
    private static readonly FGLOW_ANIM = 'FGlowAnim';
}
