export class CSVParser {
    public static parse_into_array(csl: string): string[] {
        let vals: string[] = [];
        let last_comma: number = -1;
        let ii: number;

        for (ii = 0; ii < csl.length; ii++) {
            if (csl.charAt(ii) == ",") {
                vals.push(csl.substr(last_comma + 1, ii - (last_comma + 1)));
                last_comma = ii;
            }
        }

        if (last_comma < ii) {
            vals.push(csl.substr(last_comma + 1, ii - (last_comma + 1)));
        }

        return vals;
    }

    public static parse_into_array_with_white_spaces(csl: string): string[] {
        let vals: string[] = [];
        let last_comma: number = -1;
        let ii: number;

        for (ii = 0; ii < csl.length; ii++) {
            if (csl.charAt(ii) == " ") {
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
