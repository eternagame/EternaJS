import {Application, Sprite} from "pixi.js";
import {AppMode} from "./flashbang/core/AppMode";
import {Flashbang} from "./flashbang/core/Flashbang";
import {FlashbangApp} from "./flashbang/core/FlashbangApp";
import {ObjectTask} from "./flashbang/core/ObjectTask";
import {SpriteObject} from "./flashbang/objects/SpriteObject";
import {RepeatingTask} from "./flashbang/tasks/RepeatingTask";
import {RotationTask} from "./flashbang/tasks/RotationTask";
import {SerialTask} from "./flashbang/tasks/SerialTask";
import {Easing} from "./flashbang/util/Easing";

export class EternaApp extends FlashbangApp {
    protected createPixi (): Application {
        return new Application(800, 600, {backgroundColor: 0x1099bb});
    }

    protected setup (): void {
        this._modeStack.pushMode(new TestMode());
    }
}

class TestMode extends AppMode {
    protected setup (): void {
        let bunny: SpriteObject = new SpriteObject(Sprite.fromImage('assets/bunny.png'));

        // center the sprite's anchor point
        bunny.sprite.anchor.set(0.5);

        // move the sprite to the center of the screen
        bunny.sprite.x = Flashbang.stageWidth * 0.5;
        bunny.sprite.y = Flashbang.stageHeight * 0.5;

        this.addObject(bunny, this._modeSprite);

        bunny.addObject(new RepeatingTask((): ObjectTask => {
            return new SerialTask(
                new RotationTask(Math.PI * 2, 1, Easing.linear),
                new RotationTask(0, 0)
            );
        }));
    }
}
