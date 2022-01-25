import {
    AtomProxy, ConeBuffer,
    RepresentationRegistry,
    Structure, StructureRepresentation, StructureRepresentationParameters, Viewer, WidelineBuffer
} from 'ngl';
import type Buffer from 'ngl/dist/declarations/buffer/buffer';
import type {ConeBufferData} from 'ngl/dist/declarations/buffer/cone-buffer';
import type {CylinderBufferData} from 'ngl/dist/declarations/buffer/cylinder-buffer';
import type {EllipsoidBufferData} from 'ngl/dist/declarations/buffer/ellipsoid-buffer';
import type {WideLineBufferData} from 'ngl/dist/declarations/buffer/wideline-buffer';
import type {StructureRepresentationData} from 'ngl/dist/declarations/representation/structure-representation';
import type {
    AtomDataFields, BondData, BondDataFields, BondDataParams
} from 'ngl/dist/declarations/structure/structure-data';
import type StructureView from 'ngl/dist/declarations/structure/structure-view';
import {v4 as uuidv4} from 'uuid';
import {Value} from 'signals';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import EternaEllipsoidBuffer from './EternaEllipsoidBuffer';

enum BondColor {
    STRONG = 0xFFFFFF,
    MEDIUM = 0x8F9DB0,
    WEAK = 0x546986,
    NONE = 0xFFFFFF
}

export interface EternaRepresentationParameters extends StructureRepresentationParameters {
    vScale: number;
}

class EternaRepresentationImpl extends StructureRepresentation {
    constructor(
        structure: Structure,
        viewer: Viewer,
        params: Partial<EternaRepresentationParameters>,
        sequence: Value<Sequence>,
        secStruct: Value<SecStruct>
    ) {
        super(structure, viewer, params);
        this.type = 'eterna';
        this._sequence = sequence;
        this._secStruct = secStruct;
        this.init(params);
    }

    public init(params: Partial<EternaRepresentationParameters>) {
        const p = params || {};
        p.radiusSize = p.radiusSize ?? 0.3;
        this.vScale = p.vScale ?? 1;

        super.init(p);
    }

    private getBondData(sView: StructureView, what?: BondDataFields, params?: BondDataParams): BondData {
        const p = this.getBondParams(what, params);
        Object.assign(p.colorParams, {rung: true});

        return sView.getRungBondData(p);
    }

    public createData(sView: StructureView) {
        const bufferList: Buffer[] = [];

        const p = this.getBondParams({position: true, picking: true});
        const rawBondData = sView.getBondData(p);

        const bondData = this.getBondData(sView);
        this.fullBondData = bondData;

        const baseData = this.getBaseData(bondData, rawBondData);

        if (baseData) {
            const ellipsoidBuffer = new EternaEllipsoidBuffer(baseData, {vScale: this.vScale});
            ellipsoidBuffer.geometry.name = 'eternabase';

            bufferList.push(ellipsoidBuffer);

            const pairData = this.getPairData(bondData);
            if (pairData !== null) {
                const coneBuffer = new ConeBuffer(
                    (pairData[0] as ConeBufferData),
                    this.getBufferParams({
                        openEnded: false,
                        radialSegments: this.radialSegments,
                        disableImpostor: this.disableImpostor,
                        dullInterior: true
                    })
                );
                bufferList.push(coneBuffer);

                const coneBuffer2 = new ConeBuffer(
                    (pairData[1] as ConeBufferData),
                    this.getBufferParams({
                        openEnded: false,
                        radialSegments: this.radialSegments,
                        disableImpostor: this.disableImpostor,
                        dullInterior: true
                    })
                );
                bufferList.push(coneBuffer2);

                const lineBuffer = new WidelineBuffer(
                    pairData[2],
                    this.getBufferParams({linewidth: 1})
                );
                bufferList.push(lineBuffer);
            }
        }

        return {bufferList};
    }

    private getBaseData(bondData: BondData, rawBondData: BondData) {
        const pos1 = bondData.position1;
        const pos2 = bondData.position2;

        if (!pos1 || !pos2) return null;

        const majorAxis = [];
        const minorAxis = [];
        const position = new Float32Array(pos1.length);
        const radius = new Float32Array(pos1.length / 3);
        for (let i = 0; i < pos1.length / 3; i++) {
            const i3 = i * 3;
            position[i3] = (pos1[i3] + pos2[i3]) / 2;
            position[i3 + 1] = (pos1[i3 + 1] + pos2[i3 + 1]) / 2;
            position[i3 + 2] = (pos1[i3 + 2] + pos2[i3 + 2]) / 2;

            let r = 0;
            r += (pos1[i3] - position[i3]) * (pos1[i3] - position[i3]);
            r += (pos1[i3 + 1] - position[i3 + 1]) * (pos1[i3 + 1] - position[i3 + 1]);
            r += (pos1[i3 + 2] - position[i3 + 2]) * (pos1[i3 + 2] - position[i3 + 2]);
            radius[i] = Math.sqrt(r);

            const x = (pos2[i3] - position[i3]);
            const y = (pos2[i3 + 1] - position[i3 + 1]);
            const z = (pos2[i3 + 2] - position[i3 + 2]);
            majorAxis.push(x);
            majorAxis.push(y);
            majorAxis.push(z);

            let x1;
            let y1;
            let z1;
            if (bondData.picking && rawBondData.picking) {
                const atomIndex2 = bondData.picking.bondStore.atomIndex2;
                const id = atomIndex2[i];
                let id2;
                let n1;
                if ((n1 = rawBondData.picking.bondStore.atomIndex1.indexOf(id), n1 >= 0)) {
                    id2 = rawBondData.picking.bondStore.atomIndex2[n1];
                } else if ((n1 = rawBondData.picking.bondStore.atomIndex2.indexOf(id), n1 >= 0)) {
                    id2 = rawBondData.picking.bondStore.atomIndex1[n1];
                } else id2 = id + 1;

                const ap1 = new AtomProxy(bondData.picking.structure);
                ap1.index = id;
                const ap2 = new AtomProxy(bondData.picking.structure);
                ap2.index = id2;
                const dx = ap2.x - ap1.x;
                const dy = ap2.y - ap1.y;
                const dz = ap2.z - ap1.z;
                x1 = y * dz - z * dy;
                y1 = z * dx - x * dz;
                z1 = x * dy - y * dx;
            } else if (z !== 0) {
                x1 = 1;
                y1 = 1;
                z1 = -(x1 * x + y1 * y) / z;
            } else if (y !== 0) {
                x1 = 1;
                z1 = 1;
                y1 = -(x1 * x + z1 * z) / y;
            } else {
                y1 = 1;
                z1 = 1;
                x1 = -(y1 * y + z1 * z) / x;
            }
            const d1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
            x1 /= d1;
            y1 /= d1;
            z1 /= d1;
            const wScale = 0.05;
            minorAxis.push(x1 * r * wScale);
            minorAxis.push(y1 * r * wScale);
            minorAxis.push(z1 * r * wScale);
        }

        return {
            ...bondData,
            position,
            radius,
            majorAxis: new Float32Array(majorAxis),
            minorAxis: new Float32Array(minorAxis)
        };
    }

    private getPairData(data: BondData): [ConeBufferData, ConeBufferData, WideLineBufferData] | null {
        if (data.position2 !== undefined) {
            const pairs = this._secStruct.value.pairs;
            const seq = this._sequence.value.toString();

            const pos01 = [];
            const pos02 = [];
            const colors0: number[] = [];
            const pos1 = [];
            const pos2 = [];
            const colors: number[] = [];
            const radius: number[] = [];
            const pairMap = new Map();
            const strengthArray = [];

            for (let i = 0; i < pairs.length; i++) {
                const pairNum = pairs[i];
                if (pairNum < 0) continue;
                if (pairMap.get(i) === pairNum || pairMap.get(pairNum) === i) continue;
                pairMap.set(i, pairNum);

                let strength = 0;
                if ((seq[i] === 'G' && seq[pairNum] === 'C') || (seq[i] === 'C' && seq[pairNum] === 'G')) {
                    strength = 3;
                } else if ((seq[i] === 'A' && seq[pairNum] === 'U') || (seq[i] === 'U' && seq[pairNum] === 'A')) {
                    strength = 2;
                } else if ((seq[i] === 'U' && seq[pairNum] === 'G') || (seq[i] === 'G' && seq[pairNum] === 'U')) {
                    strength = 1;
                }

                let x1 = data.position2[i * 3];
                let y1 = data.position2[i * 3 + 1];
                let z1 = data.position2[i * 3 + 2];
                let x2 = data.position2[pairNum * 3];
                let y2 = data.position2[pairNum * 3 + 1];
                let z2 = data.position2[pairNum * 3 + 2];
                const dx = x2 - x1;
                x1 += dx / 40;
                x2 -= dx / 40;
                const dy = y2 - y1;
                y1 += dy / 40;
                y2 -= dy / 40;
                const dz = z2 - z1;
                z1 += dz / 40;
                z2 -= dz / 40;

                if (strength > 0) {
                    pos1.push(x1);
                    pos1.push(y1);
                    pos1.push(z1);
                    pos2.push(x2);
                    pos2.push(y2);
                    pos2.push(z2);

                    radius.push(0.2 * strength);
                    strengthArray.push(strength);
                } else {
                    pos01.push(x1);
                    pos01.push(y1);
                    pos01.push(z1);
                    pos02.push(x2);
                    pos02.push(y2);
                    pos02.push(z2);
                }

                if (strength === 3) {
                    const color = BondColor.STRONG;
                    const r = (color >> 16) & 255;
                    const g = (color >> 8) & 255;
                    const b = color & 255;
                    colors.push(r / 255.0);
                    colors.push(g / 255.0);
                    colors.push(b / 255.0);
                } else if (strength === 2) {
                    const color = BondColor.MEDIUM;
                    const r = (color >> 16) & 255;
                    const g = (color >> 8) & 255;
                    const b = color & 255;
                    colors.push(r / 255.0);
                    colors.push(g / 255.0);
                    colors.push(b / 255.0);
                } else if (strength === 1) {
                    const color:number = BondColor.WEAK;
                    const r = (color >> 16) & 255;
                    const g = (color >> 8) & 255;
                    const b = color & 255;
                    colors.push(r / 255.0);
                    colors.push(g / 255.0);
                    colors.push(b / 255.0);
                } else {
                    const color:number = BondColor.NONE;
                    const r = (color >> 16) & 255;
                    const g = (color >> 8) & 255;
                    const b = color & 255;
                    colors0.push(r / 255.0);
                    colors0.push(g / 255.0);
                    colors0.push(b / 255.0);
                }
            }

            const bondData: CylinderBufferData = {
                position1: new Float32Array(pos1),
                position2: new Float32Array(pos2),
                radius: new Float32Array(radius),
                color: new Float32Array(colors),
                color2: new Float32Array(colors)
            };

            const weight = [0.0, 0.55, 0.8, 1.0];
            const rweight = [0, 4, 4, 4];
            const bond1Pos = [];
            if (bondData.position1 && bondData.position2) {
                for (let i = 0; i < bondData.position1.length / 3; i++) {
                    const strength = strengthArray[i];
                    bond1Pos.push(
                        bondData.position1[3 * i] * (1 - weight[strength])
                        + bondData.position2[3 * i] * weight[strength]
                    );
                    bond1Pos.push(
                        bondData.position1[3 * i + 1] * (1 - weight[strength])
                        + bondData.position2[3 * i + 1] * weight[strength]
                    );
                    bond1Pos.push(
                        bondData.position1[3 * i + 2] * (1 - weight[strength])
                        + bondData.position2[3 * i + 2] * weight[strength]
                    );
                    bondData.radius[i] = 0.2 * rweight[strength];
                }
            }
            const bondData1: CylinderBufferData = {
                position1: bondData.position1,
                position2: new Float32Array(bond1Pos),
                radius: bondData.radius,
                color: bondData.color,
                color2: bondData.color2
            };

            const bond2Pos = [];
            if (bondData.position1 && bondData.position2) {
                for (let i = 0; i < bondData.position1.length / 3; i++) {
                    const strength = strengthArray[i];
                    bond2Pos.push(
                        bondData.position2[3 * i] * (1 - weight[strength])
                        + bondData.position1[3 * i] * weight[strength]
                    );
                    bond2Pos.push(
                        bondData.position2[3 * i + 1] * (1 - weight[strength])
                        + bondData.position1[3 * i + 1] * weight[strength]
                    );
                    bond2Pos.push(
                        bondData.position2[3 * i + 2] * (1 - weight[strength])
                        + bondData.position1[3 * i + 2] * weight[strength]
                    );
                    bondData.radius[i] = 0.2 * rweight[strength];
                }
            }
            const bondData2: CylinderBufferData = {
                position1: bondData.position2,
                position2: new Float32Array(bond2Pos),
                radius: bondData.radius,
                color: bondData.color,
                color2: bondData.color2
            };

            const bondData3: WideLineBufferData = {
                position1: new Float32Array(pos01),
                position2: new Float32Array(pos02),
                color: new Float32Array(colors0),
                color2: new Float32Array(colors0)
            };

            return [bondData1, bondData2, bondData3];
        }
        return null;
    }

    public updateData(what: BondDataFields | AtomDataFields, data: StructureRepresentationData) {
        if (this.multipleBond !== 'off' && what && what.radius) {
            what.position = true;
        }
        if (data.bufferList == null) return;

        const bondData = this.getBondData(data.sview as StructureView, what);

        const ellipsoidData: Partial<EllipsoidBufferData> = {};

        if (!what || what.color) {
            Object.assign(ellipsoidData, {
                color: bondData.color,
                color2: bondData.color2
            });
        }
        data.bufferList[0].setAttributes(ellipsoidData);

        const pairData = this.getPairData(this.fullBondData);
        if (pairData !== null) {
            data.bufferList[1].setAttributes(pairData[0]);
            data.bufferList[2].setAttributes(pairData[1]);
            data.bufferList[3].setAttributes(pairData[2]);
        }
        this.build();
    }

    private _secStruct: Value<SecStruct>;
    private _sequence: Value<Sequence>;
}

export default function createEternaRepresentation(
    sequence: Value<Sequence>,
    secStruct: Value<SecStruct>
) {
    class EternaRepresentation extends EternaRepresentationImpl {
        constructor(structure: Structure, viewer: Viewer, params: Partial<EternaRepresentationParameters>) {
            super(structure, viewer, params, sequence, secStruct);
        }
    }

    const id = `eterna-${uuidv4()}`;
    RepresentationRegistry.add(id, EternaRepresentation);
    return id;
}
