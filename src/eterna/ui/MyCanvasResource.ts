import {
    ALPHA_MODES, BaseTexture, GLTexture, Renderer, Resource
} from 'pixi.js';

export default class MyCanvasResource extends Resource {
    private _canvas: HTMLCanvasElement;
    constructor(canvas:HTMLCanvasElement) {
        super(canvas.width, canvas.height);
        this._canvas = canvas;
    }

    get canvas() {
        return this._canvas;
    }

    set canvas(c) {
        this._canvas = c;
        this.resize(this._canvas.width, this._canvas.height);
    }

    upload(renderer: Renderer, baseTexture: BaseTexture, glTexture: GLTexture): boolean {
        const {width} = this; // default size or from baseTexture?
        const {height} = this; // your choice.

        const canvas2 = document.createElement('canvas');
        canvas2.width = width;
        canvas2.height = height;

        const ctx = canvas2.getContext('2d');
        if (ctx) {
        // const grd = ctx.createLinearGradient(0, 0, width, 0);
        // grd.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
        // grd.addColorStop(0.3, 'cyan');
        // grd.addColorStop(0.7, 'red');
        // grd.addColorStop(1, 'green');

            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, width, height);
        }

        // temporary canvas, we dont need it after texture is uploaded to GPU
        // This info ios usseful if upload happens second time
        // Some people use that to track used memory
        glTexture.width = width;
        glTexture.height = height;

        // PURE WEBGL CALLS - that's what its all about.
        // PixiJS cant wrap all that API, we give you acceess to it!
        // console.log(baseTexture);
        const {gl} = renderer;
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, baseTexture.alphaMode === ALPHA_MODES.UNPACK);
        if (baseTexture.target && baseTexture.format && baseTexture.type) {
            gl.texImage2D(baseTexture.target, 0,
                baseTexture.format, baseTexture.format, baseTexture.type, canvas2);
        }

        return true;
    }
}
