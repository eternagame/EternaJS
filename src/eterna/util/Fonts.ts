import * as log from 'loglevel';
import {FontLoader, TextBuilder} from 'flashbang';

export default class Fonts {
    public static readonly ARIAL = 'Arial';
    public static readonly MONOSPACE = 'monospace';

    public static readonly STDFONT_LIGHT = 'OpenSans-Light';
    public static readonly STDFONT_REGULAR = 'OpenSans-Regular';
    public static readonly STDFONT_MEDIUM = 'OpenSans-SemiBold';
    public static readonly STDFONT_BOLD = 'OpenSans-Bold';

    public static loadFonts(): Promise<void> {
        log.info('Loading fonts...');
        let loaders = Fonts.LOCAL.map((fontFamily) => FontLoader.load(fontFamily));

        return Promise.all(loaders)
            .then(() => log.info('Fonts loaded'))
            .catch((e) => log.error('Error loading fonts: ', e));
    }

    public static monospace(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.MONOSPACE).fontSize(fontSize);
    }

    public static arial(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.ARIAL).fontSize(fontSize);
    }

    public static stdLight(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.STDFONT_LIGHT).fontSize(fontSize);
    }

    public static stdRegular(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.STDFONT_REGULAR).fontSize(fontSize);
    }

    public static stdMedium(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.STDFONT_MEDIUM).fontSize(fontSize);
    }

    public static stdBold(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.STDFONT_BOLD).fontSize(fontSize);
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
