
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

    public data: number[];

    constructor(data?: number[]) {
        this.data = data ?? [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }
}
