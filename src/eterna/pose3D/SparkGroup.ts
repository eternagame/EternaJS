import Bitmaps from 'eterna/resources/Bitmaps';
import {Stage} from 'ngl';
import {
    Group, Sprite, SpriteMaterial, TextureLoader, Vector3
} from 'three';
import EternaEllipsoidBuffer from './EternaEllipsoidBuffer';

export default class SparkGroup extends Group {
    constructor(stage: Stage) {
        super();
        this._stage = stage;
    }

    public spark(baseIndices: number[]) {
        const group = new Group();
        this.add(group);
        let sparkDistance = 0;

        const angles = new Map<Sprite, Vector3>();

        for (const baseIndex of baseIndices) {
            const rep = this._stage.getRepresentationsByName('eterna').first;
            if (!rep) return;

            const baseBuff = rep.repr.bufferList.find(
                (buff): buff is EternaEllipsoidBuffer => buff instanceof EternaEllipsoidBuffer
            );
            if (!baseBuff) return;

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

            const avgPos = new Vector3();
            const maxPos = new Vector3();
            for (const pos of basePositions) {
                avgPos.add(pos);
                maxPos.max(pos);
            }
            avgPos.divideScalar(basePositions.length);

            const R = maxPos.distanceTo(avgPos);
            sparkDistance = Math.max(sparkDistance, R);

            const forwardDirection = new Vector3().random();

            const forwardSprite = new Sprite(this.MAT);
            forwardSprite.position.set(avgPos.x, avgPos.y, avgPos.z);
            forwardSprite.scale.set(5, 5, 1);
            group.add(forwardSprite);
            angles.set(forwardSprite, forwardDirection);

            const reverseSprite = new Sprite(this.MAT);
            reverseSprite.position.set(avgPos.x, avgPos.y, avgPos.z);
            reverseSprite.scale.set(5, 5, 1);
            group.add(reverseSprite);
            angles.set(reverseSprite, forwardDirection.clone().negate());
        }

        const expiration = 1000;
        let startTime = 0;
        let handle: number;
        const update: TimerHandler = () => {
            // Since everything runs on the main thread, in large puzzles everything may be frozen
            // a bit before the graphics actually update and we start animating. Waiting to set the
            // start time until now ensures the animation actually plays instead of just expiring
            // before we even start.
            if (startTime === 0) startTime = (new Date()).getTime();

            const timeDiff = new Date().getTime() - startTime;
            if (timeDiff > expiration) {
                this.remove(group);
                clearInterval(handle);
            }

            const opacity = 1.0 - timeDiff / expiration;
            for (const sprite of group.children as Sprite[]) {
                if (sprite.visible) {
                    const delta = (((sparkDistance / 24) * (expiration - timeDiff)) / expiration);
                    const direction = angles.get(sprite);
                    if (direction) sprite.translateOnAxis(direction, delta);
                    sprite.material.opacity = opacity;
                }
            }

            this._stage.viewer.requestRender();
        };
        handle = setInterval(update, 1);
    }

    private _stage: Stage;

    private readonly MAT = new SpriteMaterial({
        map: new TextureLoader().load(Bitmaps.BonusSymbol),
        color: 0xffffff,
        fog: true
    });
}
