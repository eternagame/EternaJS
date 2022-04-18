import {Sprite, Texture} from 'pixi.js';
import {
    VLayoutContainer, HAlign, VAlign, DisplayUtil, Flashbang, Assert, TextureUtil
} from 'flashbang';
import {BoostersData} from 'eterna/puzzle/Puzzle';
import PoseEditMode from 'eterna/mode/PoseEdit/PoseEditMode';
import Booster from 'eterna/mode/PoseEdit/Booster';
import GameButton from './GameButton';
import VScrollBox from './VScrollBox';
import FloatDialog from './FloatDialog';

export default class BoosterDialog extends FloatDialog<BoostersData> {
    constructor(boostersData: BoostersData) {
        super('Boosters');
        this._boostersData = boostersData;
    }

    protected added(): void {
        super.added();

        const vLayout: VLayoutContainer = new VLayoutContainer(15, HAlign.LEFT);
        this._viewLayout = new VLayoutContainer(22, HAlign.CENTER);
        this._viewLayout.addChild(vLayout);
        this._viewLayout.layout();

        this.scrollBox = new VScrollBox(0, 0);
        this.addObject(this.scrollBox, this.contentVLay);
        this.scrollBox.content.addChild(this._viewLayout);

        if (this._boostersData.actions !== undefined) {
            const count = this._boostersData.actions.length;
            for (let i = 0; i < count; i++) {
                const data = this._boostersData.actions[i];
                Booster.create(this.mode as PoseEditMode, data).then((booster) => {
                    const texture = booster._buttonStateTextures[0] as Texture;
                    const sprite = new Sprite(texture);
                    sprite.width = 24;
                    sprite.height = 24;
                    const button = new GameButton();
                    if (data.label) {
                        button.label(data.label, 14);
                    }
                    if (texture) {
                        button.allStates(TextureUtil.renderToTexture(sprite));
                    }
                    this.addObject(button, vLayout);
                    button.clicked.connect(() => { booster.onRun(); });

                    vLayout.layout();
                    this._viewLayout.layout();
                    this.updateLocation2();
                });
            }
        }

        this.updateLocation2();
    }

    public updateLocation2() {
        Assert.assertIsDefined(Flashbang.stageHeight);
        const idealHeight = this._viewLayout.height + 40 + this.titleArea.height;
        const maxHeight = Flashbang.stageHeight * 0.8;
        const panelHeight = Math.min(idealHeight, maxHeight);

        this.scrollBox.setSize(this._viewLayout.width, panelHeight - 40 - this.titleArea.height);
        this.scrollBox.doLayout();

        DisplayUtil.positionRelative(
            this.scrollBox.display, HAlign.CENTER, VAlign.TOP,
            this.titleArea, HAlign.CENTER, VAlign.TOP, 0, this.titleArea.height + 10
        );
        super.updateFloatLocation();
    }

    private _viewLayout: VLayoutContainer;
    private readonly _boostersData: BoostersData;
    private scrollBox: VScrollBox;
}
