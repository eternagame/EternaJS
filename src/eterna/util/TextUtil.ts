
export default class TextUtil {
    private static readonly STD_RED_COLOR = 'F85F00';
    private static readonly STD_BLUE_COLOR = '00BFF9';
    private static readonly STD_GREEN_COLOR = '01EC04';
    private static readonly STD_YELLOW_COLOR = 'FFFA00';

    public static processTags(text: string) {
        return text.replace(/<color/gi, '<font color')
            .replace(/<red/gi, `<font color = "#${TextUtil.STD_RED_COLOR}"`)
            .replace(/<green/gi, `<font color = "#${TextUtil.STD_GREEN_COLOR}"`)
            .replace(/<blue/gi, `<font color = "#${TextUtil.STD_BLUE_COLOR}"`)
            .replace(/<yellow/gi, `<font color = "#${TextUtil.STD_YELLOW_COLOR}"`)
            .replace(/\/(color|red|green|blue|yellow)/gi, '/font')
            .replace(/<newline>/g, '\n');
    }
}
