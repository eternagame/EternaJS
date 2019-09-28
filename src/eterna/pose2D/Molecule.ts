import {
    Container, Point, Sprite, Texture
} from 'pixi.js';
import int from 'eterna/util/int';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import EternaTextureUtil from 'eterna/util/EternaTextureUtil';

export default class Molecule extends Container {
    constructor() {
        super();
        Molecule.initTextures();

        this.addChild(this._glow);
        this.addChild(this._body);
    }

    public set isWrong(wrong: boolean) {
        this._isWrong = wrong;
    }

    public getLastDrawnPos(): Point {
        return new Point(this._lastDrawnX, this._lastDrawnY);
    }

    public updateView(zoomLevel: number, x: number, y: number, currentTime: number): void {
        if (this._animStartTime < 0) {
            this._animStartTime = currentTime;
        }

        let elapsedTime = currentTime - this._animStartTime;
        let prog = Math.sin((elapsedTime * Math.PI) / (Molecule.ANIMATION_SPAN)) + 0.95;
        prog = Math.max(0, prog);
        let progInd = int(int((prog / 2.0) * Molecule.NUM_ANIMATION_STEPS) % Molecule.NUM_ANIMATION_STEPS);

        let glowTex = this._isWrong
            ? Molecule._glowWrongTex[zoomLevel][progInd]
            : Molecule._glowTex[zoomLevel][progInd];

        this._glow.texture = glowTex;
        this._glow.pivot.x = glowTex.width * 0.5;
        this._glow.pivot.y = glowTex.height * 0.5;

        progInd = int(
            int(
                (elapsedTime / Molecule.BODY_ANIMATION_SPAN) * Molecule.NUM_ANIMATION_STEPS
            ) % Molecule.NUM_ANIMATION_STEPS
        );
        let bodyTex = Molecule._bodyTex[zoomLevel][progInd];

        this._body.texture = bodyTex;
        this._body.pivot.x = bodyTex.width * 0.5;
        this._body.pivot.y = bodyTex.height * 0.5;

        this._lastDrawnX = x;
        this._lastDrawnY = y;

        this.x = x;
        this.y = y;
    }

    public static initTextures(): void {
        if (Molecule._glowTex != null) {
            return;
        }

        Molecule._glowTex = [];
        Molecule._glowWrongTex = [];
        Molecule._bodyTex = [];

        let originalGlowTex = BitmapManager.getBitmap(Bitmaps.ImgMoleculeOuter);
        let originalBodyTex = BitmapManager.getBitmap(Bitmaps.ImgMoleculeInner);

        for (let zoomStep = 0; zoomStep < 5; zoomStep++) {
            let texturesInZoom: Texture[] = [];
            let wrongTexturesInZoom: Texture[] = [];
            let bodyTexturesInZoom: Texture[] = [];

            let scaleFactor = 1.0 - zoomStep * 0.1;
            let scaledGlowTex = EternaTextureUtil.scaleBy(originalGlowTex, scaleFactor);
            let scaledBodyTex = EternaTextureUtil.scaleBy(originalBodyTex, scaleFactor);

            for (let ii = 0; ii < Molecule.NUM_ANIMATION_STEPS; ii++) {
                let glowTex = EternaTextureUtil.colorTransformAlpha(
                    scaledGlowTex, 255, 255, 255, 1.0 - (ii / Molecule.NUM_ANIMATION_STEPS) * 0.5, 0, 0, 0, 0
                );
                texturesInZoom.push(glowTex);

                let wrongGlowTex = EternaTextureUtil.colorTransform(glowTex, 255, 0, 0, 0, 0, 0);
                wrongTexturesInZoom.push(wrongGlowTex);

                let bodyTex = EternaTextureUtil.rotate(scaledBodyTex, (360 * ii) / Molecule.NUM_ANIMATION_STEPS);
                bodyTexturesInZoom.push(bodyTex);
            }

            Molecule._glowTex.push(texturesInZoom);
            Molecule._glowWrongTex.push(wrongTexturesInZoom);
            Molecule._bodyTex.push(bodyTexturesInZoom);
        }
    }

    private readonly _glow: Sprite = new Sprite();
    private readonly _body: Sprite = new Sprite();

    private _animStartTime: number = -1;
    private _isWrong: boolean = false;
    private _lastDrawnY: number = 0;
    private _lastDrawnX: number = 0;

    private static _glowTex: Texture[][];
    private static _glowWrongTex: Texture[][];
    private static _bodyTex: Texture[][];

    private static readonly NUM_ANIMATION_STEPS: number = 60;
    private static readonly ANIMATION_SPAN: number = 1.1;
    private static readonly BODY_ANIMATION_SPAN: number = 2.2;
}
