import {ContainerObject, Enableable} from 'flashbang';
import {Value, ValueView} from 'signals';
import {Sprite} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import BitmapManager from 'eterna/resources/BitmapManager';
import {PLAYER_MARKER_LAYER} from 'eterna/pose2D/Pose2D';
import GameDropdown from './GameDropdown';

export default class MarkerSwitcher extends ContainerObject implements Enableable {
    public readonly selectedLayer: ValueView<string> = new Value(PLAYER_MARKER_LAYER);

    protected added() {
        const icon = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgRing));
        this.display.addChild(icon);
        icon.position.set(0, (32 - icon.height) / 2);
        this.addDropdown([PLAYER_MARKER_LAYER], PLAYER_MARKER_LAYER);
    }

    protected addDropdown(options: string[], selectedOption: string) {
        if (this._dropdown) {
            this.removeObject(this._dropdown);
        }

        this._dropdown = new GameDropdown({
            fontSize: 14,
            options,
            defaultOption: selectedOption,
            color: 0x043468,
            textColor: this.enabled ? 0xFFFFFF : 0x6189A9,
            height: 32,
            borderWidth: 0,
            dropShadow: true
        });
        this._dropdown.disabled = !this.enabled;
        this._dropdown.display.position.x = 32;
        this.addObject(this._dropdown, this.container);
        this.regs?.add(this._dropdown.selectedOption.connectNotify((val) => { this.selectedLayer.value = val; }));
    }

    public addMarkerLayer(layer: string, resetSelectedLayer: boolean = true) {
        if (this._dropdown.options.includes(layer)) {
            // It's already there, don't bother recreating the dropdown
            return;
        }

        const newOptions = this._dropdown
            ? [...this._dropdown.options, layer]
            : [PLAYER_MARKER_LAYER, layer];

        this.addDropdown(newOptions, resetSelectedLayer ? layer : this.selectedLayer.value);
    }

    public set enabled(val: boolean) {
        this._enabled = val;
        this.addDropdown(this._dropdown.options, this.selectedLayer.value);
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    private _dropdown: GameDropdown;
    private _enabled: boolean = true;
}
