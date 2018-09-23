import {Point} from "pixi.js";
import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GridLines} from "../mode/DesignBrowser/GridLines";
import {Fonts} from "../util/Fonts";

export class TestMode extends AppMode {
    protected setup(): void {
        super.setup();

        let line_height = Fonts.arial("", 14).computeLineHeight();
        let gridlines = new GridLines(2, 0x4A5F73, 5 * line_height);
        gridlines.position = new Point(10, 168);
        this.container.addChild(gridlines);

        const updateLayout = () => {
            gridlines.setSize(
                Flashbang.stageWidth - 20,
                Flashbang.stageHeight - gridlines.position.y);
        };
        updateLayout();
        this.resized.connect(updateLayout);
    }

    public onContextMenuEvent(e: Event): void {
        e.preventDefault();
    }
}
