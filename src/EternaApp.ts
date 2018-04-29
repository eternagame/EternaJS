import {Application, Sprite} from "pixi.js";
import {Background} from "./Background";
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
        return new Application(1024, 768, {backgroundColor: 0x1099bb});
    }

    protected setup (): void {
        this._modeStack.pushMode(new TestMode());
    }
}

class TestMode extends AppMode {
    protected setup (): void {
        this.addObject(new Background(20, false), this.modeSprite);

        // let clock: SpriteObject = new SpriteObject(Sprite.fromImage('assets/clock.png'));
        //
        // // center the sprite's anchor point
        // clock.sprite.anchor.set(0.5);
        //
        // // move the sprite to the center of the screen
        // clock.sprite.x = Flashbang.stageWidth * 0.5;
        // clock.sprite.y = Flashbang.stageHeight * 0.5;
        //
        // this.addObject(clock, this._modeSprite);
        //
        // clock.addObject(new RepeatingTask((): ObjectTask => {
        //     return new SerialTask(
        //         new RotationTask(Math.PI * 2, 1, Easing.linear),
        //         new RotationTask(0, 0)
        //     );
        // }));
    }
}
