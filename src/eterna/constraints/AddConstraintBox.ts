import {Graphics, Point} from 'pixi.js';
import {
    ContainerObject, DisplayUtil, HAlign, VAlign
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';

export default class AddConstraintBox extends ContainerObject {
    constructor() {
        super();

        this._bgGraphics = new Graphics();
        this._redrawBGGraphics(false);
        this.container.addChild(this._bgGraphics);

        const BAR_WIDTH = 6;
        const BAR_LENGTH = 12;

        let addPoints = [];
        let lastPoint = new Point(
            this.BOX_WIDTH / 2 - (BAR_WIDTH / 2),
            this.BOX_HEIGHT / 2 - (BAR_WIDTH / 2) - (BAR_LENGTH) - 10
        );
        addPoints.push(lastPoint.clone());
        lastPoint.x += BAR_WIDTH;
        addPoints.push(lastPoint.clone());
        lastPoint.y += BAR_LENGTH;
        addPoints.push(lastPoint.clone());
        lastPoint.x += BAR_LENGTH;
        addPoints.push(lastPoint.clone());
        lastPoint.y += BAR_WIDTH;
        addPoints.push(lastPoint.clone());
        lastPoint.x -= BAR_LENGTH;
        addPoints.push(lastPoint.clone());
        lastPoint.y += BAR_LENGTH;
        addPoints.push(lastPoint.clone());
        lastPoint.x -= BAR_WIDTH;
        addPoints.push(lastPoint.clone());
        lastPoint.y -= BAR_LENGTH;
        addPoints.push(lastPoint.clone());
        lastPoint.x -= BAR_LENGTH;
        addPoints.push(lastPoint.clone());
        lastPoint.y -= BAR_WIDTH;
        addPoints.push(lastPoint.clone());
        lastPoint.x += BAR_LENGTH;
        addPoints.push(lastPoint.clone());
        lastPoint.y -= BAR_LENGTH;
        addPoints.push(lastPoint.clone());

        let addGraphics = new Graphics();
        addGraphics.beginFill(0xFFFFFF);
        addGraphics.drawPolygon(addPoints);
        addGraphics.endFill();
        this.container.addChild(addGraphics);

        let addText = Fonts.stdRegular('Add Constraint', 11).color(0xC0DCE7).build();
        DisplayUtil.positionRelative(
            addText, HAlign.CENTER, VAlign.BOTTOM, this._bgGraphics,
            HAlign.CENTER, VAlign.BOTTOM, 0, -10
        );
        this.container.addChild(addText);

        this.pointerOver.connect(() => { this._redrawBGGraphics(true); });
        this.pointerOut.connect(() => { this._redrawBGGraphics(false); });
    }

    private _redrawBGGraphics(highlighted: boolean) {
        this._bgGraphics.clear();
        this._bgGraphics.beginFill(highlighted ? 0x3E566A : 0x1E314B, 0.5);
        this._bgGraphics.drawRoundedRect(0, 0, this.BOX_WIDTH, this.BOX_HEIGHT, 15);
        this._bgGraphics.endFill();
    }

    private readonly BOX_WIDTH = 111;
    private readonly BOX_HEIGHT = 75;
    private _bgGraphics: Graphics;
}
