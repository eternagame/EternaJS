import {Container, Graphics, Point, Text} from "pixi.js";
import {Align} from "../../flashbang/core/Align";
import {VLayoutContainer} from "../../flashbang/layout/VLayoutContainer";
import {Fonts} from "../util/Fonts";

export class EnergyScoreDisplay extends Container {
    public constructor(width: number, height: number) {
        super();

        this._width = width;
        this._height = height;

        this._bg = new Graphics();
        this.addChild(this._bg);
        this.updateBG();

        let textLayout: VLayoutContainer = new VLayoutContainer(2, Align.LEFT);

        this._labelText = Fonts.std_regular("Total", 11).color(0xffffff).build();
        textLayout.addChild(this._labelText);

        this._energyText = Fonts.std_medium("5.2 kcal", 13).color(0xffffff).build();
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
        if (width != this._width || height != this._height) {
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

    private readonly _labelText: Text;
    private readonly _energyText: Text;
    private readonly _bg: Graphics;

    private _width: number;
    private _height :number;

    private static readonly WIDTH: number = 111;
    private static readonly HEIGHT: number = 40;
}
