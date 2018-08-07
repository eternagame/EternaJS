import MultiStyleText from "pixi-multistyle-text";
import {Container, Graphics, Point} from "pixi.js";
import {Align} from "../../flashbang/core/Align";
import {VLayoutContainer} from "../../flashbang/layout/VLayoutContainer";
import {Fonts} from "../util/Fonts";

export class EnergyScoreDisplay extends Container {
    public static grey(text: string): string {
        return `<grey>${text}</grey>`;
    }

    public static green(text: string): string {
        return `<green>${text}</green>`;
    }

    public static red(text: string): string {
        return `<red>${text}</red>`;
    }

    public constructor(width: number, height: number) {
        super();

        this._width = width;
        this._height = height;

        this._bg = new Graphics();
        this.addChild(this._bg);
        this.updateBG();

        let textLayout: VLayoutContainer = new VLayoutContainer(2, Align.LEFT);

        this._labelText = new MultiStyleText("Total", {
            "default": {
                fontFamily: Fonts.STDFONT_REGULAR,
                fontSize: 11,
                fill: 0xffffff,
            },
            "grey": { fill: 0x777777 },
            "green": { fill: 0x33AA33 },
            "red": { fill: 0xFF4747 }
        });
        textLayout.addChild(this._labelText);

        this._energyText = new MultiStyleText("5.2 kcal", {
            "default": {
                fontFamily: Fonts.STDFONT_MEDIUM,
                fontSize: 13,
                fill: 0xffffff,
            },
            "grey": { fill: 0x777777 },
            "green": { fill: 0x33AA33 },
            "red": { fill: 0xFF4747 }
        });
        textLayout.addChild(this._energyText);

        textLayout.layout();
        textLayout.position = new Point(5, 4);
        this.addChild(textLayout);

        this.set_energy_text("", "");
    }

    public set_energy_text(label: string, energy: string): void {
        this._labelText.text = label;
        this._energyText.text = energy;
    }

    public set_size(width: number, height: number): void {
        if (width !== this._width || height !== this._height) {
            this._width = width;
            this._height = height;
            this.updateBG();
        }
    }

    private updateBG(): void {
        this._bg.clear();
        this._bg.beginFill(0x33465F);
        this._bg.drawRoundedRect(0, 0, this._width, this._height, 15);
        this._bg.endFill();
        this._bg.alpha = 0.5;
    }

    private readonly _labelText: MultiStyleText;
    private readonly _energyText: MultiStyleText;
    private readonly _bg: Graphics;

    private _width: number;
    private _height :number;

    private static readonly WIDTH: number = 111;
    private static readonly HEIGHT: number = 40;
}
