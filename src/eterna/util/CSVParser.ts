export class CSVParser {
    public static splitOnComma(csl: string): string[] {
        let vals: string[] = [];
        let last_comma = -1;
        let ii: number;

        for (ii = 0; ii < csl.length; ii++) {
            if (csl.charAt(ii) === ",") {
                vals.push(csl.substr(last_comma + 1, ii - (last_comma + 1)));
                last_comma = ii;
            }
        }

        if (last_comma < ii) {
            vals.push(csl.substr(last_comma + 1, ii - (last_comma + 1)));
        }

        return vals;
    }

    public static splitOnWhitespace(csl: string): string[] {
        let vals: string[] = [];
        let last_comma = -1;
        let ii: number;

        for (ii = 0; ii < csl.length; ii++) {
            if (csl.charAt(ii) === " ") {
                if (last_comma < ii - 1) {
                    vals.push(csl.substr(last_comma + 1, ii - (last_comma + 1)));
                    last_comma = ii;
                }
            }
        }

        if (last_comma < ii - 1) {
            vals.push(csl.substr(last_comma + 1, ii - (last_comma + 1)));
        }

        return vals;
    }
}
