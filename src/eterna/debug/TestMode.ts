import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {RepeatingTask} from "../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {Easing} from "../../flashbang/util/Easing";
import {StyledTextBuilder} from "../../flashbang/util/StyledTextBuilder";
import {ExternalInterface} from "../util/ExternalInterface";
import {Background} from "../vfx/Background";

export class TestMode extends AppMode {
    protected setup(): void {
        super.setup();

        this.addObject(new Background(), this.modeSprite);

        const text = "Make 5 or more <font color = \"#00BFF9\">BLUE</font> bases";
        let builder = new StyledTextBuilder({
            fill: 0xffffff
        });
        builder.appendHTMLStyledText(text);

        let tf = builder.build();
        tf.x = (Flashbang.stageWidth - tf.width) * 0.5;
        tf.y = (Flashbang.stageHeight - tf.height) * 0.5;
        this.modeSprite.addChild(tf);

        ExternalInterface.addCallback("Animate", (time?: number) => {
            if (this.hasNamedObject("Animate")) {
                this.removeNamedObjects("Animate");
                return "Stopped!";
            } else {
                if (time === undefined) {
                    time = 0.25;
                }

                this.addNamedObject("Animate", new RepeatingTask(() => {
                    return new SerialTask(
                        new AlphaTask(0, time, Easing.easeInOut, tf),
                        new AlphaTask(1, time, Easing.easeInOut, tf),
                    );
                }));
            }

            return "Started!";
        });
    }
}
