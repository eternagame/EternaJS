import Booster from 'eterna/mode/PoseEdit/Booster';
import PoseEditMode from 'eterna/mode/PoseEdit/PoseEditMode';
import {BoostersData} from 'eterna/puzzle/Puzzle';
import {HAlign, VAlign, VLayoutContainer} from 'flashbang';
import WindowDialog from './WindowDialog';

export default class BoosterDialog extends WindowDialog<void> {
    constructor(boostersData: BoostersData) {
        super({
            title: 'Boosters',
            contentHAlign: HAlign.LEFT,
            contentVAlign: VAlign.TOP
        });
        this._boostersData = boostersData;
    }

    protected added() {
        super.added();

        const content = new VLayoutContainer(15, HAlign.LEFT);
        this._window.content.addChild(content);

        if (this._boostersData.actions !== undefined) {
            for (const data of this._boostersData.actions) {
                Booster.create(this.mode as PoseEditMode, data).then((booster) => {
                    const button = booster.createButton(14);
                    this.addObject(button, content);
                    button.clicked.connect(() => { booster.onRun(); });
                    content.layout();
                    this._window.layout();
                });
            }
        }

        content.layout();
        this._window.layout();
    }

    private readonly _boostersData: BoostersData;
}
