import * as _ from "lodash";
import * as log from "loglevel";
import {TextStyle} from "pixi.js";
import {FontLoader} from "../../flashbang/resources/FontLoader";
import {TextBuilder} from "../../flashbang/util/TextBuilder";

export class Fonts {
    public static readonly ARIAL: string = "Arial";
    public static readonly MONOSPACE: string = "monospace";

    public static readonly STDFONT_LIGHT: string = "OpenSans-Light";
    public static readonly STDFONT_REGULAR: string = "OpenSans-Regular";
    public static readonly STDFONT_MEDIUM: string = "OpenSans-SemiBold";
    public static readonly STDFONT_BOLD: string = "OpenSans-Bold";

    public static loadFonts(): Promise<any> {
        log.info("Loading fonts...");
        let loaders = _.map(Fonts.LOCAL, (fontFamily: string) => {
            return FontLoader.loadFromCSS(require("assets/Fonts/fonts.css"), fontFamily)
        });

        return Promise.all(loaders)
            .then(() => log.info("Fonts loaded"))
            .catch((e) => log.error("Error loading fonts: ", e));
    }

    public static monospace(text: string = "", fontSize: number = 12) :TextBuilder {
        return new TextBuilder(text).font(this.MONOSPACE).fontSize(fontSize);
    }

    public static arial(text: string = "", fontSize: number = 12) :TextBuilder {
        return new TextBuilder(text).font(this.ARIAL).fontSize(fontSize);
    }

    public static std_light(text: string = "", fontSize: number = 12) :TextBuilder {
        return new TextBuilder(text).font(this.STDFONT_LIGHT).fontSize(fontSize);
    }

    public static std_regular(text: string = "", fontSize: number = 12) :TextBuilder {
        return new TextBuilder(text).font(this.STDFONT_REGULAR).fontSize(fontSize);
    }

    public static std_medium(text: string = "", fontSize: number = 12) :TextBuilder {
        return new TextBuilder(text).font(this.STDFONT_MEDIUM).fontSize(fontSize);
    }

    public static std_bold(text: string = "", fontSize: number = 12) :TextBuilder {
        return new TextBuilder(text).font(this.STDFONT_BOLD).fontSize(fontSize);
    }

    public static get_font(name: string, size: number, color: number = 0x0): TextStyle {
        if (name == null) {
            name = Fonts.ARIAL;
        }

        return new TextStyle({
            fontFamily: name,
            fontSize: size,
            leading: 0,
            fill: color
        });
    }

    // Local fonts that we serve from our assets/ directory.
    // These names are defined in fonts.css
    private static readonly LOCAL: string[] = [
        Fonts.STDFONT_LIGHT,
        Fonts.STDFONT_REGULAR,
        Fonts.STDFONT_MEDIUM,
        Fonts.STDFONT_BOLD
    ];
}
