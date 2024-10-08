import {FontLoader, TextBuilder} from 'flashbang';
import {FontWeight} from 'flashbang/util/TextBuilder';
import log from 'loglevel';

export default class Fonts {
    // Non-global fonts are defined via fonts.css
    public static readonly STDFONT = 'Open Sans';
    public static readonly MONOSPACE = 'monospace';

    public static loadFonts(): Promise<void> {
        log.info('Loading fonts...');
        const loaders = Fonts.LOCAL_FONT_FAMILIES.map((fontFamily) => FontLoader.load(fontFamily));

        return Promise.all(loaders)
            .then(() => log.info('Fonts loaded'))
            .catch((e) => log.error('Error loading fonts: ', e));
    }

    public static monospace(
        text: string = '',
        fontSize: number = 12,
        weight: FontWeight = FontWeight.REGULAR
    ): TextBuilder {
        return new TextBuilder(text).font(this.MONOSPACE).fontSize(fontSize).fontWeight(weight);
    }

    public static std(
        text: string = '',
        fontSize: number = 12,
        weight: FontWeight = FontWeight.REGULAR
    ): TextBuilder {
        return new TextBuilder(text).font(this.STDFONT).fontSize(fontSize).fontWeight(weight);
    }

    // The fonts we specifically load that we want to wait on
    private static readonly LOCAL_FONT_FAMILIES: string[] = [
        `${Fonts.STDFONT}:n3`,
        `${Fonts.STDFONT}:n4`,
        `${Fonts.STDFONT}:n6`,
        `${Fonts.STDFONT}:n7`,
        `${Fonts.STDFONT}:n8`,
        `${Fonts.STDFONT}:i3`,
        `${Fonts.STDFONT}:i4`,
        `${Fonts.STDFONT}:i6`,
        `${Fonts.STDFONT}:i7`,
        `${Fonts.STDFONT}:i8`
    ];
}
