import {Text} from 'pixi.js';

export default class TextUtil {
    /**
     * Trims the given text field to fit into the given max width, if possible.
     * If trimmedPostfix is non-null, and the textfield must be trimmed, the
     * postfix will be added to the trimmed text.
     */
    public static trimTextToWidth(text: Text, maxWidth: number, trimmedPostfix: string | null = null): void {
        if (text.width <= maxWidth) {
            return;
        }

        trimmedPostfix = trimmedPostfix || '';

        const originalString = text.text;
        const originalWidth = text.width;
        text.text += trimmedPostfix;
        const postfixWidth = text.width - originalWidth;
        text.text = originalString;

        maxWidth = Math.max(maxWidth - postfixWidth, 0);
        while (text.text.length > 0 && text.width > maxWidth) {
            text.text = text.text.substr(0, text.text.length - 1);
        }

        text.text += trimmedPostfix;
    }
}
