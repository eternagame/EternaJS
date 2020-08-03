import {TextBuilder} from 'flashbang';

export default class Fonts {
    // Non-global fonts  are defined via fonts.css
    public static readonly STDFONT = 'Open Sans';
    public static readonly MONOSPACE = 'monospace';

    public static monospace(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.MONOSPACE).fontSize(fontSize);
    }

    public static std(text: string = '', fontSize: number = 12): TextBuilder {
        return new TextBuilder(text).font(this.STDFONT).fontSize(fontSize);
    }
}
