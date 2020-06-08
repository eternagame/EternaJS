
export default class Matrix44 {
    public static makeOrthoProjection(
        left: number,
        right: number,
        top: number,
        bottom: number,
        near: number,
        far: number
    ) {
        const m = new Matrix44();
        const te = m.data;
        const w = 1.0 / (right - left);
        const h = 1.0 / (top - bottom);
        const p = 1.0 / (far - near);

        const x = (right + left) * w;
        const y = (top + bottom) * h;
        const z = (far + near) * p;

        te[0] = 2 * w; te[4] = 0; te[8] = 0; te[12] = -x;
        te[1] = 0; te[5] = 2 * h; te[9] = 0; te[13] = -y;
        te[2] = 0; te[6] = 0; te[10] = -2 * p; te[14] = -z;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
        return m;
    }

    public data: number[] = [];

    constructor() {
        this.setIdentity();
    }

    public setIdentity() {
        const m = this.data;
        m[0] = 1; m[4] = 0; m[8] = 0; m[12] = 0;
        m[1] = 0; m[5] = 1; m[9] = 0; m[13] = 0;
        m[2] = 0; m[6] = 0; m[10] = 1; m[14] = 0;
        m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
        return this;
    }

    public scale(x: number, y: number, z: number) {
        const te = this.data;
        te[0] *= x; te[4] *= y; te[8] *= z;
        te[1] *= x; te[5] *= y; te[9] *= z;
        te[2] *= x; te[6] *= y; te[10] *= z;
        te[3] *= x; te[7] *= y; te[11] *= z;
        return this;
    }

    public setPosition(x: number, y: number, z: number) {
        const te = this.data;
        te[12] = x;
        te[13] = y;
        te[14] = z;
        return this;
    }
}
