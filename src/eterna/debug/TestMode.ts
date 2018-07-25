import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GraphicsUtil} from "../util/GraphicsUtil";
import {Background} from "../vfx/Background";

export class TestMode extends AppMode {
    protected setup(): void {
        super.setup();

        this.addObject(new Background(), this.modeSprite);

        let arrow = GraphicsUtil.drawArrow(75, 60, 0xDAE8F6, 0xDAE8F6);
        arrow.x = Flashbang.stageWidth * 0.5;
        arrow.y = Flashbang.stageHeight * 0.5;
        this.modeSprite.addChild(arrow);
    }
}
