import {Stage} from 'ngl';
import {
    BufferGeometry, Group, Mesh, MeshBasicMaterial, Vector3
} from 'three';
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass';
import EternaEllipsoidBuffer from './EternaEllipsoidBuffer';

type HighlightMesh = Mesh & {material: MeshBasicMaterial};

export default class BaseHighlightGroup extends Group {
    constructor(stage: Stage, selectedOutlinePass: OutlinePass) {
        super();
        this._stage = stage;
        this._selectedOutlinePass = selectedOutlinePass;
    }

    public clearHover() {
        if (this._hoverHighlight) {
            this.remove(this._hoverHighlight.mesh);
            const baseIndex = this._hoverHighlight.baseIndex;
            this._hoverHighlight = null;
            // Since we're no longer highlighted, shrink the changed highlight to be just around
            // the base rather than the highlight
            if (this._changeHighlights.has(baseIndex)) {
                this.addChanged(baseIndex, false);
            }
        }
    }

    public switchHover(baseIndex: number, color: number) {
        this.clearHover();

        const newMesh = this.highlight(baseIndex, color, 0.6, 1.3);
        if (newMesh) {
            this._hoverHighlight = {baseIndex, mesh: newMesh};
            // Since we're now highlighted, expand the changed highlight to be around the entire
            // hover highlight rather than just the base (as otherwise it would look weird since the
            // change highlight would be partially masked by the hover highlight)
            if (this._changeHighlights.has(baseIndex)) this.addChanged(baseIndex, false);
        }
    }

    public updateHoverColor(getColor: (baseIndex: number) => number) {
        if (this._hoverHighlight) {
            this.switchHover(this._hoverHighlight.baseIndex, getColor(this._hoverHighlight.baseIndex));
        }
    }

    public addChanged(baseIndex: number, resetExpire: boolean = true) {
        if (resetExpire) {
            const oldHighlight = this._changeHighlights.get(baseIndex);
            if (oldHighlight) {
                clearTimeout(oldHighlight.expireHandle);
                oldHighlight.expireHandle = setTimeout(
                    this.clearChangedHighlight.bind(this) as TimerHandler, 3000, baseIndex
                );
            } else {
                const hovered = this._hoverHighlight?.baseIndex === baseIndex;
                const newMesh = this.highlight(baseIndex, 0xFFFFFF, 0, hovered ? 1.3 : 1);
                if (newMesh) {
                    const expireHandle = setTimeout(
                        this.clearChangedHighlight.bind(this) as TimerHandler, 3000, baseIndex
                    );
                    this._changeHighlights.set(baseIndex, {mesh: newMesh, expireHandle});
                }
            }
        } else {
            // Just re-generate the mesh without affecting the highlight expiration
            const highlight = this._changeHighlights.get(baseIndex);
            if (!highlight) return;

            this.remove(highlight.mesh);

            const hovered = this._hoverHighlight?.baseIndex === baseIndex;
            const newMesh = this.highlight(baseIndex, 0xFFFFFF, 0, hovered ? 1.3 : 1);
            if (newMesh) highlight.mesh = newMesh;
        }

        // While technically wasteful to do this in all cases even if highlights haven't changed, we'll
        // do this here for robustness just to make sure we don't miss any edge cases
        this._selectedOutlinePass.selectedObjects = Array
            .from(this._changeHighlights.values())
            .map((highlight) => highlight.mesh);
    }

    private clearChangedHighlight(baseIndex: number) {
        const oldHighlight = this._changeHighlights.get(baseIndex);
        if (oldHighlight) {
            this.remove(oldHighlight.mesh);
            this._changeHighlights.delete(baseIndex);
        }

        this._selectedOutlinePass.selectedObjects = Array
            .from(this._changeHighlights.values())
            .map((highlight) => highlight.mesh);

        this._stage.viewer.requestRender();
    }

    public toggleMark(baseIndex: number) {
        const oldMesh = this._markHighlights.get(baseIndex);
        if (oldMesh) {
            this.remove(oldMesh);
            this._markHighlights.delete(baseIndex);
        } else {
            const newMesh = this.highlight(baseIndex, 0x000000, 0.6, 1);
            if (newMesh) this._markHighlights.set(baseIndex, newMesh);
        }
        this.updateFlashing();
    }

    private updateFlashing() {
        const shouldBeFlashing = this._markHighlights.size > 0;
        if (shouldBeFlashing && this._flashHandle === null) {
            this._flashHandle = setInterval(this.flash.bind(this) as TimerHandler, 500);
        } else if (!shouldBeFlashing && this._flashHandle !== null) {
            clearInterval(this._flashHandle);
            this._flashHandle = null;
        }
    }

    private flash() {
        this._flashCount++;

        for (const mesh of this._markHighlights.values()) {
            mesh.material.opacity = (this._flashCount % 2) * 0.6;
        }

        this._stage.viewer.requestRender();
    }

    private highlight(baseIndex: number, color: number, opacity: number, scale: number): HighlightMesh | null {
        const rep = this._stage.getRepresentationsByName('eterna').first;
        if (!rep) return null;

        const baseBuff = rep.repr.bufferList.find(
            (buff): buff is EternaEllipsoidBuffer => buff instanceof EternaEllipsoidBuffer
        );
        if (!baseBuff) return null;

        const basePositions: Vector3[] = [];
        const positions = baseBuff.geometry.getAttribute('position').array;
        const ids = baseBuff.geometry.getAttribute('primitiveId').array;
        for (let i = 0; i < ids.length; i++) {
            if (ids[i] === baseIndex) {
                basePositions.push(new Vector3(
                    positions[i * 3],
                    positions[i * 3 + 1],
                    positions[i * 3 + 2]
                ));
            }
        }

        const selGeometry = new BufferGeometry();
        selGeometry.setFromPoints(basePositions);

        if (scale !== 1) {
            const avgPos = new Vector3();
            for (const pos of basePositions) {
                avgPos.add(pos);
            }
            avgPos.divideScalar(basePositions.length);

            selGeometry.translate(-avgPos.x, -avgPos.y, -avgPos.z);
            selGeometry.scale(scale, scale, scale);
            selGeometry.translate(avgPos.x, avgPos.y, avgPos.z);
        }

        const mat = new MeshBasicMaterial({
            color,
            opacity,
            transparent: true,
            depthWrite: false
        });
        const mesh = new Mesh(selGeometry, mat);
        mesh.name = baseIndex.toString();
        this.add(mesh);

        this._stage.viewer.requestRender();

        return mesh;
    }

    private _stage: Stage;
    private _selectedOutlinePass: OutlinePass;

    private _hoverHighlight: {baseIndex: number, mesh: HighlightMesh} | null = null;
    private _changeHighlights = new Map<number, {mesh: HighlightMesh; expireHandle: number}>();
    private _markHighlights = new Map<number, HighlightMesh>();

    private _flashHandle: number | null = null;
    private _flashCount = 0;
}
