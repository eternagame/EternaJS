import { Updatable } from "flashbang/core";
import { ContainerObject } from "flashbang/objects";
import { Graphics, Container } from "pixi.js";

export default class RNADiagram extends ContainerObject implements Updatable {
    protected added() {
        super.added();

        this._scoreNodeHighlight = new Graphics();
        this.container.addChild(this._scoreNodeHighlight);

        this._baseLayer = new Container();
        this.container.addChild(this._baseLayer);

        this._moleculeLayer = new Container();
        this.container.addChild(this._moleculeLayer);
        this._moleculeLayer.visible = false;
    }

    private _baseLayer: Container;
    private _moleculeLayer: Container;

    private _scoreNodeHighlight: Graphics;
}