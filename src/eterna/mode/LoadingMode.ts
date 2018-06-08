import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {ObjectTask} from "../../flashbang/core/ObjectTask";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {RepeatingTask} from "../../flashbang/tasks/RepeatingTask";
import {ScaleTask} from "../../flashbang/tasks/ScaleTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Easing} from "../../flashbang/util/Easing";
import {Fonts} from "../util/Fonts";

/** Displays a simple animation while we're loading assets */
export class LoadingMode extends AppMode {
    protected setup(): void {
        super.setup();

        let text = Fonts.std_bold("Loading...", 36).color(0xffffff).build();
        text.x = -DisplayUtil.width(text) * 0.5;
        text.y = -DisplayUtil.height(text) * 0.5;

        let container = new ContainerObject();
        container.container.addChild(text);

        container.display.x = Flashbang.stageWidth * 0.5;
        container.display.y = Flashbang.stageHeight * 0.5;
        this.addObject(container, this.modeSprite);

        container.addObject(new RepeatingTask((): ObjectTask => {
            return new SerialTask(
                new ScaleTask(0.8, 0.8, 1, Easing.easeInOut),
                new ScaleTask(1, 1, 1, Easing.easeInOut)
            );
        }));
    }
}
