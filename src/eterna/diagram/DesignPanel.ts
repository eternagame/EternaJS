import { ContainerObject } from "flashbang/objects";
import { KeyboardListener, MouseWheelListener } from "flashbang/input";
import { EnergyScoreDisplay, ExplosionFactorPanel } from ".";
import { Point } from "pixi.js";
import RNADiagram from "./RNADiagram";

export default class DesignPanel extends ContainerObject implements KeyboardListener, MouseWheelListener {
    protected added() {
        super.added();

        this._primaryScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._primaryScoreEnergyDisplay.position = new Point(17, 118);
        this.container.addChild(this._primaryScoreEnergyDisplay);

        this._deltaScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._deltaScoreEnergyDisplay.position = new Point(17 + 119, 118);
        this.container.addChild(this._deltaScoreEnergyDisplay);

        this._substructureScoreEnergyDisplay = new EnergyScoreDisplay(111, 40);
        this._substructureScoreEnergyDisplay.position = new Point(17 + 119*2, 118);
        this._substructureScoreEnergyDisplay.visible = false;
        this.container.addChild(this._substructureScoreEnergyDisplay);

        this._explosionFactorPanel = new ExplosionFactorPanel();
        this._explosionFactorPanel.display.position = new Point(17, 118 + 82);
        this._explosionFactorPanel.display.visible = false;
        this._explosionFactorPanel.factorUpdated.connect((factor: number) => {
            // TODO
            //this._explosionFactor = factor;
            //this.computeLayout(true);
            //this._redraw = true;
        });
        this.addObject(this._explosionFactorPanel, this.container);
    }

    private _primaryScoreEnergyDisplay: EnergyScoreDisplay;
    private _deltaScoreEnergyDisplay: EnergyScoreDisplay;
    private _substructureScoreEnergyDisplay: EnergyScoreDisplay;
    private _explosionFactorPanel: ExplosionFactorPanel;
}