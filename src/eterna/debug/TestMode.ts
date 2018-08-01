import {Point} from "pixi.js";
import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {StyledTextBuilder} from "../../flashbang/util/StyledTextBuilder";
import {FancyTextBalloon} from "../ui/FancyTextBalloon";
import {Fonts} from "../util/Fonts";
import {Background} from "../vfx/Background";

export class TestMode extends AppMode {
    protected setup(): void {
        super.setup();

        this.addObject(new Background(), this.modeSprite);

        const text = "This is a game where you become an RNA scientist. By solving puzzles, you will build a virtual lab.  Then you will help invent new RNA molecules to combat infectious diseases like tuberculosis.  Ready?";
        const title = "Welcome to Eterna!";
        const button_text = "Next";

        let textBox: FancyTextBalloon = new FancyTextBalloon("", 0xC0DCE7, 0x122944, 1.0, true, 0xC0DCE7);
        textBox.set_fixed_width(215);

        textBox.set_styled_text(new StyledTextBuilder({
            fontFamily: Fonts.ARIAL,
            fontSize: 13,
            fill: 0xC0DCE7,
            wordWrap: true,
            wordWrapWidth: 185
        }).append(text));

        if (title.length > 0) {
            // TODO: Fix the title bar so that it does not overlap with text.
            textBox.set_title(title);
        }

        textBox.set_button_text(button_text);

        textBox.display.position = new Point(Flashbang.stageWidth * 0.5, Flashbang.stageHeight * 0.5);
        this.addObject(textBox, this.modeSprite);
    }
}
