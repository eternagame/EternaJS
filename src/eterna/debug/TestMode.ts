import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {StyledTextBuilder} from "../../flashbang/util/StyledTextBuilder";
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
    }
}
