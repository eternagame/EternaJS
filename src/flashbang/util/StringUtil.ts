/** Contains useful static function for performing operations on Strings. */
export default class StringUtil {
    /**
     * Get a hashCode for the specified String. null returns 0.
     * This hashes identically to Java's String.hashCode().
     */
    public static hashCode(str: string): number {
        let code = 0;
        if (str != null) {
            for (let ii = 0; ii < str.length; ii++) {
                code = 31 * code + str.charCodeAt(ii);
            }
        }
        return code;
    }

    /** Is the specified string null, empty, or does it contain only whitespace? */
    public static isBlank(str: string): boolean {
        return (str == null) || (str.search('\\S') === -1);
    }

    /** Return the specified String, or "" if it is null. */
    public static deNull(str: string): string {
        return (str == null) ? '' : str;
    }

    /** Does the specified string end with any of the specified substrings. */
    public static endsWith(str: string, substr: string, ...additionalSubstrs: string[]): boolean {
        let startDex: number = str.length - substr.length;
        if ((startDex >= 0) && (str.indexOf(substr, startDex) >= 0)) {
            return true;
        }
        for (let additional of additionalSubstrs) {
            if (StringUtil.endsWith(str, additional)) {
                // Call the non-vararg version of ourselves to keep from repeating the logic
                return true;
            }
        }
        return false;
    }

    /** Does the specified string start with any of the specified substrings. */
    public static startsWith(str: string, substr: string, ...additionalSubstrs: string[]): boolean {
        if (str.indexOf(substr, 0) === 0) {
            return true;
        }
        for (let additional of additionalSubstrs) {
            if (str.indexOf(additional, 0) === 0) {
                return true;
            }
        }
        return false;
    }

    /** Return true iff the first character is a lower-case character. */
    public static isLowerCase(str: string): boolean {
        let firstChar: string = str.charAt(0);
        return (firstChar.toUpperCase() !== firstChar)
            && (firstChar.toLowerCase() === firstChar);
    }

    /** Return true iff the first character is an upper-case character. */
    public static isUpperCase(str: string): boolean {
        let firstChar: string = str.charAt(0);
        return (firstChar.toUpperCase() === firstChar)
            && (firstChar.toLowerCase() !== firstChar);
    }

    /**
     * Parse an integer more anally than the built-in parseInt() function,
     * throwing an ArgumentError if there are any invalid characters.
     *
     * The built-in parseInt() will ignore trailing non-integer characters.
     *
     * @param str The string to parse.
     * @param radix The radix to use, from 2 to 16. If not specified the radix will be 10,
     *        unless the String begins with "0x" in which case it will be 16,
     *        or the String begins with "0" in which case it will be 8.
     */
    public static parseInteger(str: string, radix = 0): number {
        return Number(StringUtil.parseInt0(str, radix, true));
    }

    /**
     * Parse an integer more anally than the built-in parseInt() function,
     * throwing an ArgumentError if there are any invalid characters.
     *
     * The built-in parseInt() will ignore trailing non-integer characters.
     *
     * @param str The string to parse.
     * @param radix The radix to use, from 2 to 16. If not specified the radix will be 10,
     *        unless the String begins with "0x" in which case it will be 16,
     *        or the String begins with "0" in which case it will be 8.
     */
    public static parseUnsignedInteger(str: string, radix = 0): number {
        let result: number = StringUtil.parseInt0(str, radix, false);
        if (result < 0) {
            throw new Error(`parseUnsignedInteger parsed negative value [value=${str}]`);
        }
        return result;
    }

    /**
     * Format the specified uint as a String color value, for example "0x000000".
     *
     * @param c the uint value to format.
     * @param prefix the prefix to place in front of it. @default "0x", other possibilities are
     * "#" or "".
     */
    public static toColorString(c: number, prefix = '0x'): string {
        return prefix + StringUtil.prepad(c.toString(16), 6, '0');
    }

    /** Format the specified numbers as coordinates, (e.g. "+3-2" or "-7.4432-54.23+6.3"). */
    public static toCoordsString(x: number, y: number, z = NaN): string {
        let result: string = ((x >= 0) ? '+' : '') + x + ((y >= 0) ? '+' : '') + y;
        if (!Number.isNaN(z)) {
            result += ((z >= 0) ? '+' : '') + z;
        }
        return result;
    }

    /** Format the specified number, nicely, with commas. */
    public static formatNumber(n: number): string {
        let postfix = '';
        let s: string = n.toString(); // use standard to-stringing

        // move any fractional portion to the postfix
        const dex: number = s.lastIndexOf('.');
        if (dex !== -1) {
            postfix = s.substring(dex);
            s = s.substring(0, dex);
        }

        // hackily add commas
        let prefixLength: number = (n < 0) ? 1 : 0;
        while (s.length - prefixLength > 3) {
            postfix = `,${s.substring(s.length - 3)}${postfix}`;
            s = s.substring(0, s.length - 3);
        }
        return s + postfix;
    }

    /**
     * Parse a Number from a String, throwing an ArgumentError if there are any
     * invalid characters.
     *
     * 1.5, 2e-3, -Infinity, Infinity, and NaN are all valid Strings.
     *
     * @param str the String to parse.
     */
    public static parseNumber(str: string): number {
        if (str == null) {
            throw new Error('Cannot parseNumber(null)');
        }

        // deal with a few special cases
        if (str === 'Infinity') {
            return Infinity;
        } else if (str === '-Infinity') {
            return -Infinity;
        } else if (str === 'NaN') {
            return NaN;
        }

        const noCommas: string = str.replace(',', '');

        if (StringUtil.DECIMAL_REGEXP.exec(noCommas) == null) {
            throw new Error(`Could not convert '${str}' to Number`);
        }

        return parseFloat(noCommas);
    }

    /**
     * Parse a Boolean from a String, throwing an ArgumentError if the String
     * contains invalid characters.
     *
     * "1", "0", and any capitalization variation of "true" and "false" are
     * the only valid input values.
     *
     * @param str the String to parse.
     */
    public static parseBoolean(str: string): boolean {
        let originalString: string = str;

        if (str != null) {
            str = str.toLowerCase();
            if (str === 'true' || str === '1') {
                return true;
            } else if (str === 'false' || str === '0') {
                return false;
            }
        }

        throw new Error(`Could not convert '${str}' to boolean`);
    }

    /**
     * Append 0 or more copies of the padChar String to the input String
     * until it is at least the specified length.
     */
    public static pad(str: string, length: number, padChar = ' '): string {
        while (str.length < length) {
            str += padChar;
        }
        return str;
    }

    /**
     * Prepend 0 or more copies of the padChar String to the input String
     * until it is at least the specified length.
     */
    public static prepad(str: string, length: number, padChar = ' '): string {
        while (str.length < length) {
            str = padChar + str;
        }
        return str;
    }

    /**
     * Returns a string representation of the number that's prepadded with zeros to be at least
     * the specified length.
     */
    public static zeroPad(n: number, length = 2): string {
        return StringUtil.prepad(n.toString(), length, '0');
    }

    /**
     * Substitute "{n}" tokens for the corresponding passed-in arguments.
     */
    public static substitute(str: string, ...args: string[]): string {
        let len: number = args.length;
        // TODO: FIXME: this might be wrong, if your {0} replacement has a {1} in it, then
        // that'll get replaced next iteration.
        for (let ii = 0; ii < len; ii++) {
            str = str.replace(new RegExp(`\\{${ii}\\}`, 'g'), args[ii]);
        }
        return str;
    }

    /** Utility function that strips whitespace from the beginning and end of a String. */
    public static trim(str: string): string | null {
        return StringUtil.trimEnd(StringUtil.trimBeginning(str));
    }

    /** Utility function that strips whitespace from the beginning of a String. */
    public static trimBeginning(str: string): string | null {
        if (str == null) {
            return null;
        }

        let startIdx = 0;
        // this works because charAt() with an invalid index returns "", which is not whitespace
        while (StringUtil.isWhitespace(str.charAt(startIdx))) {
            startIdx++;
        }

        // TODO: is this optimization necessary? It's possible that str.slice() does the same
        // check and just returns 'str' if it's the full length
        return (startIdx > 0) ? str.slice(startIdx, str.length) : str;
    }

    /** Utility function that strips whitespace from the end of a String. */
    public static trimEnd(str: string | null): string | null {
        if (str == null) {
            return null;
        }

        let endIdx: number = str.length;
        // this works because charAt() with an invalid index returns "", which is not whitespace
        while (StringUtil.isWhitespace(str.charAt(endIdx - 1))) {
            endIdx--;
        }

        // TODO: is this optimization necessary? It's possible that str.slice() does the same
        // check and just returns 'str' if it's the full length
        return (endIdx < str.length) ? str.slice(0, endIdx) : str;
    }

    /**
     * @return true if the specified String is === to a single whitespace character.
     */
    public static isWhitespace(character: string): boolean {
        switch (character) {
            case ' ':
            case '\t':
            case '\r':
            case '\n':
            case '\f':
                return true;
            default:
                return false;
        }
    }

    /**
     * Truncate the specified String if it is longer than maxLength.
     * The string will be truncated at a position such that it is
     * maxLength chars long after the addition of the 'append' String.
     *
     * @param append a String to add to the truncated String only after
     * truncation.
     */
    public static truncate(
        s: string, maxLength: number, append = ''
    ): string {
        if ((s == null) || (s.length <= maxLength)) {
            return s;
        } else {
            return s.substring(0, maxLength - append.length) + append;
        }
    }

    /** Returns a version of the supplied string with the first letter capitalized. */
    public static capitalize(s: string): string {
        if (StringUtil.isBlank(s)) {
            return s;
        }
        return s.substr(0, 1).toUpperCase() + s.substr(1);
    }

    /**
     * Returns a version of the string where the first letter of every word is capitalized. The
     * other letters are lower cased. e.g.
     *     toTitleCase("The wind in thE WILLOWS") -> "The Wind In The Willows"
     */
    public static toTitleCase(s: string): string {
        return s.toLowerCase().replace(/\b[a-z]/g, String.prototype.toUpperCase.call);
    }

    /**
     * Locate URLs in a string, return an array in which even elements
     * are plain text, odd elements are urls (as Strings). Any even element
     * may be an empty string.
     */
    public static parseURLs(s: string): string[] {
        let array: string[] = [];
        while (true) {
            let result: RegExpExecArray | null = StringUtil.URL_REGEXP.exec(s);
            if (result == null) {
                break;
            }

            let {index} = result;
            let url: string = result[0];
            array.push(s.substring(0, index));
            s = s.substring(index + url.length);
            // clean up the url if necessary
            if (StringUtil.startsWith(url.toLowerCase(), 'www.')) {
                url = `http://${url}`;
            }
            array.push(url);
        }

        if (s !== '' || array.length === 0) { // avoid putting an empty string on the end
            array.push(s);
        }
        return array;
    }

    /**
     * Return a hexadecimal representation of an unsigned int, potentially left-padded with
     * zeroes to arrive at of precisely the requested width, e.g.
     *       toHex(131, 4) -> "0083"
     */
    public static toHex(n: number, width: number): string {
        return StringUtil.prepad(n.toString(16), width, '0');
    }

    /**
     * Internal helper function for parseInteger and parseUnsignedInteger.
     */
    private static parseInt0(str: string, radix: number, allowNegative: boolean): number {
        if (str == null) {
            throw new Error('Cannot parseInt(null)');
        }

        let negative: boolean = (str.charAt(0) === '-');
        if (negative) {
            str = str.substring(1);
        }

        // handle this special case immediately, to prevent confusion about
        // a leading 0 meaning "parse as octal"
        if (str === '0') {
            return 0;
        }

        if (radix === 0) {
            if (StringUtil.startsWith(str, '0x')) {
                str = str.substring(2);
                radix = 16;
            } else if (StringUtil.startsWith(str, '0')) {
                str = str.substring(1);
                radix = 8;
            } else {
                radix = 10;
            }
        } else if (radix === 16 && StringUtil.startsWith(str, '0x')) {
            str = str.substring(2);
        } else if (radix < 2 || radix > 16) {
            throw new Error(`Radix out of range: ${radix}`);
        }

        // now verify that str only contains valid chars for the radix
        for (let ii = 0; ii < str.length; ii++) {
            let dex: number = StringUtil.HEX.indexOf(str.charAt(ii).toLowerCase());
            if (dex === -1 || dex >= radix) {
                throw new Error(`Invalid characters in String [string=${str}, radix=${radix}`);
            }
        }

        let result: number = parseInt(str, radix);
        if (Number.isNaN(result)) {
            // this shouldn't happen..
            throw new Error(`Could not parseInt: ${str}`);
        }
        if (negative) {
            result *= -1;
        }
        return result;
    }

    /** Hexidecimal digits. */
    private static HEX: string[] = ['0', '1', '2', '3', '4',
        '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

    private static DECIMAL_REGEXP = /^-?[0-9]*\.?[0-9]+(e-?[0-9]+)?$/;

    /**
     * A regular expression that finds URLs.
     * From John Gruber: https://gist.github.com/gruber/8891611#file-liberal-regex-pattern-for-web-urls-L7
     */
    private static URL_REGEXP =
    /\b((?:(?:http|ftp)s?:(?:\/{1,3}|[a-z0-9%])|[a-z0-9.-]+[.](?:com|net|org|edu|gov|mil|aero|asia|biz|cat|coop|info|int|jobs|mobi|museum|name|post|pro|tel|travel|xxx|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|dd|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|Ja|sk|sl|sm|sn|so|sr|ss|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zw)\/)(?:[^\s()<>{}[\]]+|\([^\s()]*?\([^\s()]+\)[^\s()]*?\)|\([^\s]+?\))+(?:\([^\s()]*?\([^\s()]+\)[^\s()]*?\)|\([^\s]+?\)|[^\s`!()[\]{};:'".,<>?«»“”‘’])|(?:(?:(?!@).|^)[a-z0-9]+(?:[.-][a-z0-9]+)*[.](?:com|net|org|edu|gov|mil|aero|asia|biz|cat|coop|info|int|jobs|mobi|museum|name|post|pro|tel|travel|xxx|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|dd|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|Ja|sk|sl|sm|sn|so|sr|ss|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zw)\b\/?(?!@)))/im;
}
