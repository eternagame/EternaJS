import {EllipsoidBuffer} from 'ngl';
import type {EllipsoidBufferData} from 'ngl/dist/declarations/buffer/ellipsoid-buffer';

type EternaEllipsoidBufferParameters = EternaEllipsoidBuffer['defaultParameters'];

export default class EternaEllipsoidBuffer extends EllipsoidBuffer {
    public get defaultParameters() {
        return {
            ...super.defaultParameters,
            vScale: 1
        };
    }

    constructor(data: EllipsoidBufferData, params: Partial<EternaEllipsoidBufferParameters> = {}) {
        super(data, params);
        this._vScale = params.vScale ?? 1;
        // Reset the attributes now that we have our proper vScale set
        this.setAttributes(data, true);
    }

    public setAttributes(data: Partial<EllipsoidBufferData> = {}, initNormals?: boolean) {
        // Scale sphere in 3 axises to make ellipsoid
        const radius = data.radius ? data.radius.map((r) => r * this._vScale) : undefined;
        super.setAttributes({...data, radius}, initNormals);
    }

    private _vScale: number = 1;
}
