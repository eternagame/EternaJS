import {Viewer} from 'ngl';
import {WebGLRenderer, WebGLRenderTarget} from 'three';
import {Pass} from 'three/examples/jsm/postprocessing/Pass';

export default class NGLRenderPass extends Pass {
    constructor(renderFunc: typeof Viewer.prototype.render) {
        super();

        this.needsSwap = false;

        this._renderFunc = renderFunc;
    }

    public render(_renderer: WebGLRenderer, _writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget) {
        this._renderFunc(false, this.renderToScreen ? undefined : readBuffer);
    }

    private _renderFunc: typeof Viewer.prototype.render;
}
