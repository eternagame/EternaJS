import * as log from 'loglevel';
import {FontLoader, TextBuilder} from 'flashbang';
import fontcss from 'assets/Fonts/fonts.css';

export default class Fonts {
    public static readonly STDFONT = 'Open Sans';
    public static readonly MONOSPACE = 'monospace';

    public static loadFonts(): Promise<void> {
        log.info('Loading fonts...');
        let loaders = Fonts.LOCAL_FONT_FAMILIES.map((fontFamily) => FontLoader.load(fontFamily, fontcss));

        return Promise.all(loaders)
            .then(() => log.info('Fonts loaded'))
            .catch((e) => log.error('Error loading fonts: ', e));
    }

    public static monospace(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.MONOSPACE).fontSize(fontSize);
    }

    public static std(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.STDFONT).fontSize(fontSize);
    }

    // Local fonts that we serve from our assets/ directory.
    // These names are defined in fonts.css
    private static readonly LOCAL_FONT_FAMILIES: string[] = [
        Fonts.STDFONT
    ];
}
