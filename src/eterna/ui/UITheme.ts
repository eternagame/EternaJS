import Fonts from 'eterna/util/Fonts';
import HTMLTextObject from './HTMLTextObject';

export default class UITheme {
    public static readonly colors = {
        background: 0x122944,
        border: 0xC0DCE7
    };

    public static readonly panel = {
        padding: 15,
        borderSize: 1.5
    };

    public static readonly missionIntro = {
        headerHeight: 61,
        maxConstraintWidth: 200
    };

    public static readonly constraints = {
        borderColor: 0x1B588A,
        borderRadius: 5
    };

    private static readonly designBrowserFontSize = 14;

    public static readonly designBrowser = {
        colors: {
            background: 0x021E46,
            header: 0x043468
        },
        fontSize: UITheme.designBrowserFontSize,
        rowHeight: Fonts.std(' ', UITheme.designBrowserFontSize).computeLineHeight(),
        headerHeight: 36,
        filterHeight: 50,
        filterPadding: 10,
        dataPadding: Fonts.std(' ', UITheme.designBrowserFontSize).computeLineHeight() - 16
    };

    public static textInput = {
        colors: {
            background: 0x021E46,
            border: 0x2F94D1,
            text: 0xFFFFFF
        }
    };

    public static fileInput = {
        colors: {
            background: 0x021E46,
            border: 0x2F94D1,
            text: 0xFFFFFF
        }
    };

    public static makeTitle(title: string, color: number) {
        return new HTMLTextObject(title, undefined, undefined, true)
            .font(Fonts.STDFONT)
            .fontSize(14)
            .bold()
            .selectable(false)
            .color(color);
    }
}
