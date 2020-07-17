export default class TextUtil {
    public static readonly STD_RED_COLOR = 0xF85F00;
    public static readonly STD_BLUE_COLOR = 0x00BFF9;
    public static readonly STD_GREEN_COLOR = 0x01EC04;
    public static readonly STD_YELLOW_COLOR = 0xFFFA00;

    public static processTags(text: string) {
        return text.replace(/<color/gi, '<font color')
            .replace(/<red/gi, `<font color = "#${TextUtil.STD_RED_COLOR.toString(16)}"`)
            .replace(/<green/gi, `<font color = "#${TextUtil.STD_GREEN_COLOR.toString(16)}"`)
            .replace(/<blue/gi, `<font color = "#${TextUtil.STD_BLUE_COLOR.toString(16)}"`)
            .replace(/<yellow/gi, `<font color = "#${TextUtil.STD_YELLOW_COLOR.toString(16)}"`)
            .replace(/\/(color|red|green|blue|yellow)/gi, '/font')
            .replace(/<newline>/g, '\n');
    }
}
