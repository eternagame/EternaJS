import {Container} from 'pixi.js';
import GameObjectBase from './GameObjectBase';

export default class ObjectTask extends GameObjectBase {
    /* internal */
    public _attachToDisplayList(displayParent: Container, displayIdx: number): void {
        throw new Error('Tasks cannot manage DisplayObjects');
    }
}
