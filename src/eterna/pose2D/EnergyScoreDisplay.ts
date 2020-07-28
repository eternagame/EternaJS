import MultiStyleText from 'pixi-multistyle-text';
import {Container, Graphics, Point} from 'pixi.js';
import {VLayoutContainer, HAlign} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import {FontWeight} from 'flashbang/util/TextBuilder';

export default class EnergyScoreDisplay extends Container {
    public static grey(text: string): string {
        return `<grey>${text}</grey>`;
    }

    public static green(text: string): string {
        return `<green>${text}</green>`;
    }

    public static red(text: string): string {
        return `<red>${text}</red>`;
    }

    constructor(width: number, height: number) {
        super();

        this._width = width;
        this._height = height;

        this._bg = new Graphics();
        this.addChild(this._bg);
        this.updateBG();

        let textLayout: VLayoutContainer = new VLayoutContainer(2, HAlign.LEFT);

        this._labelText = new MultiStyleText('Total', {
            default: {
                fontFamily: Fonts.STDFONT,
                fontSize: 11,
                fill: 0xffffff
            },
            grey: {fill: 0x777777},
            green: {fill: 0x33AA33},
            red: {fill: 0xFF4747}
        });
        textLayout.addChild(this._labelText);

        this._energyText = new MultiStyleText('5.2 kcal', {
            default: {
                fontFamily: Fonts.STDFONT,
                fontWeight: FontWeight.SEMIBOLD,
                fontSize: 13,
                fill: 0xffffff
            },
            grey: {fill: 0x777777},
            green: {fill: 0x33AA33},
            red: {fill: 0xFF4747}
        });
        textLayout.addChild(this._energyText);

        textLayout.layout();
        textLayout.position = new Point(5, 4);
        this.addChild(textLayout);

        this.setEnergyText('', '');
    }

    public get hasText(): boolean {
        return (this._labelText.text.length > 0 && this._labelText.text !== ' ')
            || (this._energyText.text.length > 0 && this._energyText.text !== ' ');
    }

    public setEnergyText(label: string, energy: string): void {
        this._labelText.text = label;
        this._energyText.text = energy;
    }

    public setSize(width: number, height: number): void {
        if (width !== this._width || height !== this._height) {
            this._width = width;
            this._height = height;
            this.updateBG();
        }
    }

    private updateBG(): void {
        this._bg.clear();
        this._bg.beginFill(0x33465F);
        this._bg.drawRoundedRect(0, 0, this._width, this._height, 10);
        this._bg.endFill();
        this._bg.alpha = 0.5;
    }

    private readonly _labelText: MultiStyleText;
    private readonly _energyText: MultiStyleText;
    private readonly _bg: Graphics;

    private _width: number;
    private _height: number;
}
