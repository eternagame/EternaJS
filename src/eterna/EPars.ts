import {IntLoopPars} from "./IntLoopPars";

export class EPars {

    public static INF: number = 1000000;
    public static NST: number = 0;
    public static MAXLOOP: number = 30;
    public static MAX_NINIO: number = 300;
    public static LXC: number = 107.856;
    public static TERM_AU: number = 50;
    public static NBPAIRS: number = 7;
    public static ML_INTERN37: number = 40;
    public static TURN: number = 3;
    public static DANGLES: number = 1;

    public static ML_BASE37: number = 0;
    public static ML_CLOSING37: number = 340;

    public static DUPLEX_INIT: number = 4.1;

    public static RNABASE_UNDEFINED: number = 0;
    public static RNABASE_GUANINE: number = 3;
    public static RNABASE_ADENINE: number = 1;
    public static RNABASE_URACIL: number = 4;
    public static RNABASE_CYTOSINE: number = 2;
    public static RNABASE_PAIR: number = 5;
    public static RNABASE_SELECT: number = 6;
    public static RNABASE_MAGIC: number = 7;
    public static RNABASE_RANDOM: number = 8;
    public static RNABASE_AU_PAIR: number = 9;
    public static RNABASE_GU_PAIR: number = 10;
    public static RNABASE_GC_PAIR: number = 11;

    public static RNABASE_ADD_BASE: number = 12;
    public static RNABASE_ADD_PAIR: number = 13;
    public static RNABASE_DELETE: number = 14;
    public static RNABASE_LOCK: number = 15;
    public static RNABASE_BINDING_SITE: number = 16;

    public static RNABASE_SHIFT: number = 17;
    //public static const RNABASE_ADD_ANNOTATION:int = 18; //Variable for adding an annotation by lullujune
    public static RNABASE_CUT: number = 19;

    // (almost) follows the Vienna convention for the BP array
    public static FORCE_PAIRED: number = -1;
    public static FORCE_PAIRED3P: number = -2;
    public static FORCE_PAIRED5P: number = -3;
    public static FORCE_UNPAIRED: number = -4;
    public static FORCE_IGNORE: number = -5;

    public static RNABASE_DYNAMIC_FIRST: number = 100;

    public static DEFAULT_TEMPERATURE: number = 37;

    public static F_ninio37: number[] = [0, 40, 50, 20, 10];
    /* only F[2] used */

    public static RNABASE_LAST20: number[] = [
        EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_GUANINE, EPars.RNABASE_ADENINE,
        EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_CYTOSINE, EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE,
        EPars.RNABASE_CYTOSINE, EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_CYTOSINE, EPars.RNABASE_ADENINE,
        EPars.RNABASE_ADENINE, EPars.RNABASE_CYTOSINE, EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_CYTOSINE];


    public static ml_intern(i: number): number {
        if (i > 2) {
            return EPars.ML_INTERN37 + EPars.TERM_AU;
        } else {
            return EPars.ML_INTERN37;
        }
    }

    public static get_barcode_hairpin(seq: string): string {
        let hairpin_match: string[] = (/[AGUC]{7}UUCG([AGUC]{7})AAAAGAAACAACAACAACAAC$/i).exec(seq);
        if (hairpin_match == null) {
            return null;
        }
        return hairpin_match[1];
    }


    public static get_longest_stack_length(pairs: number[]): number {
        let longlen: number = 0;

        let stack_start: number = -1;
        let last_stack_other: number = -1;

        for (let ii: number = 0; ii < pairs.length; ii++) {

            if (pairs[ii] > ii) {

                if (stack_start < 0) {
                    stack_start = ii;
                }

                let is_continued: boolean = false;

                if (last_stack_other < 0) {
                    is_continued = true;
                } else {
                    if (pairs[ii] == last_stack_other - 1) {
                        is_continued = true;
                    }
                }

                if (is_continued) {
                    last_stack_other = pairs[ii];
                } else {

                    if (stack_start >= 0 && ii - stack_start > longlen) {
                        longlen = ii - stack_start;
                    }

                    last_stack_other = -1;
                    stack_start = -1;
                }

            } else {

                if (stack_start >= 0 && ii - stack_start > longlen) {
                    longlen = ii - stack_start;
                }

                stack_start = -1;
                last_stack_other = -1;

            }
        }


        return longlen;

    }

    public static get_letter_color(letter: string): number {
        if (letter == "G") {
            return 0xFF3333;
        } else if (letter == "A") {
            return 0xFFFF33;
        } else if (letter == "U") {
            return 0x7777FF;
        } else if (letter == "C") {
            return 0x33FF33;
        }

        return 0;
    }

    public static get_colored_letter(letter: string): string {
        if (letter == "G") {
            return "<FONT COLOR='#FF3333'>G</FONT>"
        } else if (letter == "A") {
            return "<FONT COLOR='#FFFF33'>A</FONT>"
        } else if (letter == "U") {
            return "<FONT COLOR='#7777FF'>U</FONT>";
        } else if (letter == "C") {
            return "<FONT COLOR='#33FF33'>C</FONT>";
        }

        return "";
    }

    public static get_colored_sequence(seq: string): string {
        let res: string = "";
        for (let ii: number = 0; ii < seq.length; ii++) {
            res += EPars.get_colored_letter(seq.charAt(ii));
        }
        return res;

    }

    public static get_exp_colored_sequence(seq: string, exp_data: number[]): string {
        if (exp_data == null) {
            return seq;
        }

        let offset: number = exp_data[0];
        let maxmax: number = exp_data[1];
        let minmin: number = exp_data[1];
        for (let ii: number = 1; ii < exp_data.length; ii++) {
            if (exp_data[ii] > maxmax) {
                maxmax = exp_data[ii];
            }

            if (exp_data[ii] < minmin) {
                minmin = exp_data[ii];
            }
        }

        let avg: number = (maxmax + minmin) / 2.0;

        let res: string = "";
        for (let ii = 0; ii < seq.length; ii++) {
            if (ii < offset - 1 || ii >= exp_data.length) {
                res += seq.charAt(ii);
            } else {
                if (exp_data[ii] < avg) {
                    res += "<FONT COLOR='#7777FF'>" + seq.charAt(ii) + "</FONT>";
                } else {
                    res += "<FONT COLOR='#FF7777'>" + seq.charAt(ii) + "</FONT>"
                }
            }
        }

        return res;
    }

    public static count_consecutive(sequence: number[], letter: number, locks: boolean[] | null = null): number {
        let max_consecutive: number = 0;

        let ii: number = 0;
        let start_index: number = -1;

        for (ii = 0; ii < sequence.length; ii++) {

            if (sequence[ii] == letter) {
                if (start_index < 0) {
                    start_index = ii;
                }
            } else {
                if (start_index >= 0) {
                    if (max_consecutive < ii - start_index) {
                        if (locks == null) {
                            max_consecutive = ii - start_index;
                        } else {
                            let all_locked: boolean = true;
                            let jj: number;
                            for (jj = start_index; jj < ii; jj++) {
                                all_locked = all_locked && locks[jj];
                            }
                            if (all_locked == false) {
                                max_consecutive = ii - start_index;
                            }
                        }
                    }
                    start_index = -1;
                }

            }
        }

        if (start_index >= 0) {
            if (max_consecutive < ii - start_index) {
                max_consecutive = ii - start_index;
            }
        }

        return max_consecutive;
    }

    public static get_restricted_consecutive(sequence: number[], letter: number, max_allowed: number, locks: boolean[] | null = null): number[] {
        let restricted: number[] = [];

        let ii: number = 0;
        let start_index: number = -1;

        if (max_allowed <= 0)
            return restricted;

        for (ii = 0; ii < sequence.length; ii++) {

            if (sequence[ii] == letter) {
                if (start_index < 0) {
                    start_index = ii;
                }
            } else {
                if (start_index >= 0) {
                    if (max_allowed < ii - start_index) {
                        if (locks == null) {
                            restricted.push(start_index);
                            restricted.push(ii - 1);
                        } else {
                            let all_locked: boolean = true;
                            let jj: number;
                            for (jj = start_index; jj < ii; jj++) {
                                all_locked = all_locked && locks[jj];
                            }
                            if (all_locked == false) {
                                restricted.push(start_index);
                                restricted.push(ii - 1);
                            }
                        }
                    }
                    start_index = -1;
                }

            }
        }
        // gotta check if we found a start_index without an end...
        if (start_index >= 0) {
            if (max_allowed < ii - start_index) {
                restricted.push(start_index);
                restricted.push(ii - 1);
            }
        }

        return restricted;
    }


    public static get_sequence_repetition(seq_str: string, n: number): number {
        let dict: Set<string> = new Set<string>();
        let num_repeats: number = 0;

        for (let ii: number = 0; ii < seq_str.length - n; ii++) {
            let substr: string = seq_str.substr(ii, n);
            if (dict.has(substr)) {
                num_repeats++;
            } else {
                dict.add(substr);
            }
        }

        return num_repeats++;
    }

    public static string_to_sequence_array(seq: string): number[] {
        let seqarray: number[] = [];

        for (let ii: number = 0; ii < seq.length; ii++) {
            if (seq.charAt(ii) == 'A' || seq.charAt(ii) == 'a') {
                seqarray.push(EPars.RNABASE_ADENINE);
            } else if (seq.charAt(ii) == 'G' || seq.charAt(ii) == 'g') {
                seqarray.push(EPars.RNABASE_GUANINE);
            } else if (seq.charAt(ii) == 'U' || seq.charAt(ii) == 'u') {
                seqarray.push(EPars.RNABASE_URACIL);
            } else if (seq.charAt(ii) == 'C' || seq.charAt(ii) == 'c') {
                seqarray.push(EPars.RNABASE_CYTOSINE);
            } else if (seq.charAt(ii) == '&' || seq.charAt(ii) == '-') {
                seqarray.push(EPars.RNABASE_CUT);
            } else {
                seqarray.push(EPars.RNABASE_UNDEFINED);
            }
        }

        return seqarray;
    }

    public static sequence_array_to_string(sequence: number[]): string {

        let str: string = "";
        for (let ii: number = 0; ii < sequence.length; ii++) {
            if (sequence[ii] == EPars.RNABASE_ADENINE) {
                str += "A";
            } else if (sequence[ii] == EPars.RNABASE_URACIL) {
                str += "U";
            } else if (sequence[ii] == EPars.RNABASE_GUANINE) {
                str += "G";
            } else if (sequence[ii] == EPars.RNABASE_CYTOSINE) {
                str += "C";
            } else if (sequence[ii] == EPars.RNABASE_CUT) {
                str += "&";
            } else {
                str += "?";
            }
        }
        return str;
    }

    public static is_internal(index: number, pairs: number[]): number[] | null {
        let pair_start_here: number = -1;
        let pair_end_here: number = -1;
        let pair_start_there: number = -1;
        let pair_end_there: number = -1;

        if (pairs[index] >= 0)
            return null;

        let walker: number = index;
        while (walker >= 0) {
            if (pairs[walker] >= 0) {
                pair_start_here = walker;
                pair_start_there = pairs[walker];
                break;
            }
            walker--;
        }

        walker = index;
        while (walker < pairs.length) {
            if (pairs[walker] >= 0) {
                pair_end_here = walker;
                pair_end_there = pairs[walker];
                break;
            }
            walker++;
        }

        if (pair_start_here < 0 || pair_end_here < 0)
            return null;

        let there_start: number = Math.min(pair_start_there, pair_end_there);
        let there_end: number = Math.max(pair_start_there, pair_end_there);

        if (pair_start_here == there_start)
            return null;

        for (let ii: number = there_start + 1; ii < there_end; ii++) {
            if (pairs[ii] >= 0)
                return null;
        }

        let bases: number[] = [];

        for (let ii = pair_start_here; ii <= pair_end_here; ii++) {
            bases.push(ii);
        }

        for (let ii = there_start; ii <= there_end; ii++) {
            bases.push(ii);
        }

        return bases;
    }

    public static validate_parenthesis(parenthesis: string, letteronly: boolean = true, length_limit: number = -1): string | null {
        let pair_stack: number[] = [];

        if (length_limit >= 0 && parenthesis.length > length_limit) {
            return "Structure length limit is " + length_limit;
        }


        for (let jj: number = 0; jj < parenthesis.length; jj++) {
            if (parenthesis.charAt(jj) == '(') {
                pair_stack.push(jj);
            } else if (parenthesis.charAt(jj) == ')') {
                if (pair_stack.length == 0) {
                    return "Unbalanced parenthesis notation";
                }

                pair_stack.pop();
            } else if (parenthesis.charAt(jj) == '.') {

            } else {
                return "Unrecognized character " + parenthesis.charAt(jj);
            }
        }

        if (pair_stack.length != 0) {
            return "Unbalanced parenthesis notation";
        }

        if (letteronly)
            return null;

        let index: number = parenthesis.indexOf("(.)");
        if (index >= 0) {
            return "There is a length 1 hairpin loop which is impossible at base " + (index + 2);
        }

        index = parenthesis.indexOf("(..)");

        if (index >= 0) {
            return "There is a length 2 hairpin loop which is impossible at base " + (index + 2);
        }


        return null;
    }


    public static parenthesis_to_pair_array(parenthesis: string): number[] {

        let pairs: number[] = [];
        let pair_stack: number[] = [];

        for (let jj: number = 0; jj < parenthesis.length; jj++) {
            pairs.push(-1);
        }

        for (let jj = 0; jj < parenthesis.length; jj++) {
            if (parenthesis.charAt(jj) == '(') {
                pair_stack.push(jj);
            } else if (parenthesis.charAt(jj) == ')') {
                if (pair_stack.length == 0)
                    throw new Error("Invalid parenthesis notation");

                pairs[pair_stack[pair_stack.length - 1]] = jj;
                pair_stack.pop();
            }
        }

        for (let jj = 0; jj < pairs.length; jj++) {
            if (pairs[jj] >= 0) pairs[pairs[jj]] = jj;
        }


        return pairs;
    }

    public static get_satisfied_pairs(pairs: number[], seq: number[]): number[] {
        let ret_pairs: number[] = new Array(pairs.length);

        for (let ii: number = 0; ii < pairs.length; ii++) {
            if (pairs[ii] < 0) {
                ret_pairs[ii] = -1;
            } else if (pairs[ii] > ii) {
                if (EPars.pair_type(seq[ii], seq[pairs[ii]]) != 0) {
                    ret_pairs[ii] = pairs[ii];
                    ret_pairs[pairs[ii]] = ii;
                } else {
                    ret_pairs[ii] = -1;
                    ret_pairs[pairs[ii]] = -1;
                }
            }

        }

        return ret_pairs;
    }

    public static pairs_array_to_parenthesis(pairs: number[], seq: number[] | null = null): string {
        let bi_pairs: number[] = new Array(pairs.length);

        for (let ii: number = 0; ii < pairs.length; ii++) {
            bi_pairs[ii] = -1;
        }

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                bi_pairs[ii] = pairs[ii];
                bi_pairs[pairs[ii]] = ii;
            }
        }

        let str: string = "";

        for (let ii = 0; ii < bi_pairs.length; ii++) {
            if (bi_pairs[ii] > ii) {
                str += '(';
            } else if (bi_pairs[ii] >= 0) {
                str += ')';
            } else {
                if (seq != null && seq[ii] == EPars.RNABASE_CUT) {
                    str += '&';
                } else {
                    str += '.';
                }
            }
        }

        return str;
    }

    public static parenthesis_to_forced_array(parenthesis: string): number[] {

        let forced: number[] = [];
        let pair_stack: number[] = [];

        for (let jj: number = 0; jj < parenthesis.length; jj++) {
            forced.push(EPars.FORCE_IGNORE);
        }

        for (let jj = 0; jj < parenthesis.length; jj++) {
            if (parenthesis.charAt(jj) == '.') {
                continue;
            } else if (parenthesis.charAt(jj) == '|') {
                forced[jj] = EPars.FORCE_PAIRED;
            } else if (parenthesis.charAt(jj) == '<') {
                forced[jj] = EPars.FORCE_PAIRED3P;
            } else if (parenthesis.charAt(jj) == '>') {
                forced[jj] = EPars.FORCE_PAIRED5P;
            } else if (parenthesis.charAt(jj) == 'x') {
                forced[jj] = EPars.FORCE_UNPAIRED;
            } else if (parenthesis.charAt(jj) == '(') {
                pair_stack.push(jj);
            } else if (parenthesis.charAt(jj) == ')') {
                if (pair_stack.length == 0)
                    throw new Error("Invalid parenthesis notation");

                forced[pair_stack[pair_stack.length - 1]] = jj;
                pair_stack.pop();
            }
        }

        for (let jj = 0; jj < forced.length; jj++) {
            if (forced[jj] >= 0) forced[forced[jj]] = jj;
        }

        return forced;
    }

    public static forced_array_to_parenthesis(forced: number[]): string {
        let str: string = "";

        for (let ii: number = 0; ii < forced.length; ii++) {

            if (forced[ii] > ii) {
                str = str.concat('(');
            } else if (forced[ii] >= 0) {
                str = str.concat(')');
            } else if (forced[ii] == EPars.FORCE_PAIRED) {
                str = str.concat('|');
            } else if (forced[ii] == EPars.FORCE_PAIRED3P) {
                str = str.concat('<');
            } else if (forced[ii] == EPars.FORCE_PAIRED5P) {
                str = str.concat('>');
            } else if (forced[ii] == EPars.FORCE_UNPAIRED) {
                str = str.concat('x');
            } else {
                str = str.concat('.');
            }
        }

        return str;
    }

    public static num_pairs(pairs: number[]): number {
        let ret: number = 0;

        for (let ii: number = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                ret++;
            }
        }
        return ret;
    }

    public static num_gu_pairs(sequence: number[], pairs: number[]): number {
        let ret: number = 0;

        for (let ii: number = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                if (sequence[ii] == EPars.RNABASE_GUANINE && sequence[pairs[ii]] == EPars.RNABASE_URACIL) {
                    ret++;
                }
                if (sequence[ii] == EPars.RNABASE_URACIL && sequence[pairs[ii]] == EPars.RNABASE_GUANINE) {
                    ret++;
                }
            }
        }

        return ret;
    }


    public static num_gc_pairs(sequence: number[], pairs: number[]): number {
        let ret: number = 0;

        for (let ii: number = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                if (sequence[ii] == EPars.RNABASE_GUANINE && sequence[pairs[ii]] == EPars.RNABASE_CYTOSINE) {
                    ret++;
                }
                if (sequence[ii] == EPars.RNABASE_CYTOSINE && sequence[pairs[ii]] == EPars.RNABASE_GUANINE) {
                    ret++;
                }
            }
        }

        return ret;
    }


    public static num_ua_pairs(sequence: number[], pairs: number[]): number {
        let ret: number = 0;

        for (let ii: number = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                if (sequence[ii] == EPars.RNABASE_ADENINE && sequence[pairs[ii]] == EPars.RNABASE_URACIL) {
                    ret++;
                }
                if (sequence[ii] == EPars.RNABASE_URACIL && sequence[pairs[ii]] == EPars.RNABASE_ADENINE) {
                    ret++;
                }
            }
        }

        return ret;
    }

    public static sequence_diff(seq1: number[], seq2: number[]): number {
        let diff: number = 0;
        for (let ii: number = 0; ii < seq1.length; ii++) {
            if (seq1[ii] != seq2[ii])
                diff++;
        }
        return diff;
    }


    public static are_pairs_same(a_pairs: number[], b_pairs: number[], constraints: any[] | null = null): boolean {
        if (a_pairs.length != b_pairs.length) {
            return false;
        }

        for (let ii: number = 0; ii < a_pairs.length; ii++) {
            if (b_pairs[ii] >= 0) {
                if (b_pairs[ii] != a_pairs[ii]) {
                    if (constraints == null || constraints[ii])
                        return false;
                }
            }

            if (a_pairs[ii] >= 0) {
                if (b_pairs[ii] != a_pairs[ii]) {
                    if (constraints == null || constraints[ii])
                        return false;
                }
            }

        }
        return true;
    }

    public static has_cut(seq: number[], from: number, to: number): boolean {
        for (let ii: number = from; ii <= to; ii++) {
            if (seq[ii] == EPars.RNABASE_CUT) {
                return true;
            }
        }
        return false;
    }

    public static pair_type_mat: number[] = [
        /* _  A  C  G  U  X  K  I */
        1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 5, 0, 0, 5,
        0, 0, 0, 1, 0, 0, 0, 0,
        0, 0, 2, 0, 3, 0, 0, 0,
        0, 6, 0, 4, 0, 0, 0, 6,
        0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 0, 0, 1, 0, 0,
        0, 6, 0, 0, 5, 0, 0, 0];

    public static pair_type(a: number, b: number): number {
        return EPars.pair_type_mat[a * (EPars.NBPAIRS + 1) + b];
    }

    public static reverse_pair_type: number[] = [0, 2, 1, 4, 3, 6, 5, 7];

    public static hairpin37: number[] = [
        EPars.INF, EPars.INF, EPars.INF, 570, 560, 560, 540, 590, 560, 640, 650,
        660, 670, 678, 686, 694, 701, 707, 713, 719, 725,
        730, 735, 740, 744, 749, 753, 757, 761, 765, 769];

    public static bulge37: number[] = [
        EPars.INF, 380, 280, 320, 360, 400, 440, 459, 470, 480, 490,
        500, 510, 519, 527, 534, 541, 548, 554, 560, 565,
        571, 576, 580, 585, 589, 594, 598, 602, 605, 609];

    public static get_bulge(i: number): number {
        return EPars.bulge37[30] + (Number)(EPars.LXC * Math.log((Number)(i) / 30.));
    }

    public static internal37: number[] = [
        EPars.INF, EPars.INF, 410, 510, 170, 180, 200, 220, 230, 240, 250,
        260, 270, 278, 286, 294, 301, 307, 313, 319, 325,
        330, 335, 340, 345, 349, 353, 357, 361, 365, 369];

    public static get_internal(i: number): number {
        return EPars.internal37[30] + (Number)(EPars.LXC * Math.log((Number)(i) / 30.));
    }

    public static hairpin_mismatch(type: number, s1: number, s2: number): number {
        return EPars.mismatchH37[type * 25 + s1 * 5 + s2];
    }

    public static internal_mismatch(type: number, s1: number, s2: number): number {
        return EPars.mismatchI37[type * 25 + s1 * 5 + s2];
    }

    public static mismatchI37: number[] = [
        0,0,0,0,0,
        0,0,0,0,0,
        0,0,0,0,0,
        0,0,0,0,0,
        0,0,0,0,0,

        /* CG */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,    0,    0, -110,    0, /* A@  AA  AC  AG  AU */
        0,    0,    0,    0,    0, /* C@  CA  CC  CG  CU */
        0, -110,    0,    0,    0, /* G@  GA  GC  GG  GU */
        0,    0,    0,    0,  -70,/* U@  UA  UC  UG  UU */


        /* GC */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,    0,    0, -110,    0, /* A@  AA  AC  AG  AU */
        0,    0,    0,    0,    0, /* C@  CA  CC  CG  CU */
        0, -110,    0,    0,    0, /* G@  GA  GC  GG  GU */
        0,    0,    0,    0,  -70,/* U@  UA  UC  UG  UU */

        /* GU */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,   70,   70,  -40,   70, /* A@  AA  AC  AG  AU */
        0,   70,   70,   70,   70, /* C@  CA  CC  CG  CU */
        0,  -40,   70,   70,   70, /* G@  GA  GC  GG  GU */
        0,   70,   70,   70,    0,/* U@  UA  UC  UG  UU */

        /* UG */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,   70,   70,  -40,   70, /* A@  AA  AC  AG  AU */
        0,   70,   70,   70,   70, /* C@  CA  CC  CG  CU */
        0,  -40,   70,   70,   70, /* G@  GA  GC  GG  GU */
        0,   70,   70,   70,    0,/* U@  UA  UC  UG  UU */

        /* AU */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,   70,   70,  -40,   70, /* A@  AA  AC  AG  AU */
        0,   70,   70,   70,   70, /* C@  CA  CC  CG  CU */
        0,  -40,   70,   70,   70, /* G@  GA  GC  GG  GU */
        0,   70,   70,   70,    0,/* U@  UA  UC  UG  UU */

        /* UA */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,   70,   70,  -40,   70, /* A@  AA  AC  AG  AU */
        0,   70,   70,   70,   70, /* C@  CA  CC  CG  CU */
        0,  -40,   70,   70,   70, /* G@  GA  GC  GG  GU */
        0,   70,   70,   70,    0,/* U@  UA  UC  UG  UU */

        /* @@ */
        90, 90, 90, 90, 90,
        90, 90, 90, 90,-20,
        90, 90, 90, 90, 90,
        90,-20, 90, 90, 90,
        90, 90, 90, 90, 20
    ];

    public static mismatchH37: number[] = [
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,

        /* CG */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        -90, -150, -150, -140, -180, /* A@  AA  AC  AG  AU */
        -90, -100,  -90, -290,  -80, /* C@  CA  CC  CG  CU */
        -90, -220, -200, -160, -110, /* G@  GA  GC  GG  GU */
        -90, -170, -140, -180, -200,/* U@  UA  UC  UG  UU */
        /* GC */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        -70, -110, -150, -130, -210, /* A@  AA  AC  AG  AU */
        -70, -110,  -70, -240,  -50, /* C@  CA  CC  CG  CU */
        -70, -240, -290, -140, -120, /* G@  GA  GC  GG  GU */
        -70, -190, -100, -220, -150,/* U@  UA  UC  UG  UU */
        /* GU */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,   20,  -50,  -30,  -30, /* A@  AA  AC  AG  AU */
        0,  -10,  -20, -150,  -20, /* C@  CA  CC  CG  CU */
        0,  -90, -110,  -30,    0, /* G@  GA  GC  GG  GU */
        0,  -30,  -30,  -40, -110,/* U@  UA  UC  UG  UU */
        /* UG */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,  -50,  -30,  -60,  -50, /* A@  AA  AC  AG  AU */
        0,  -20,  -10, -170,    0, /* C@  CA  CC  CG  CU */
        0,  -80, -120,  -30,  -70, /* G@  GA  GC  GG  GU */
        0,  -60,  -10,  -60,  -80,/* U@  UA  UC  UG  UU */
        /* AU */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,  -30,  -50,  -30,  -30, /* A@  AA  AC  AG  AU */
        0,  -10,  -20, -150,  -20, /* C@  CA  CC  CG  CU */
        0, -110, -120,  -20,   20, /* G@  GA  GC  GG  GU */
        0,  -30,  -30,  -60, -110,/* U@  UA  UC  UG  UU */
        /* UA */
        0,    0,    0,    0,    0, /* @@  @A  @C  @G  @U */
        0,  -50,  -30,  -60,  -50, /* A@  AA  AC  AG  AU */
        0,  -20,  -10, -120,   -0, /* C@  CA  CC  CG  CU */
        0, -140, -120,  -70,  -20, /* G@  GA  GC  GG  GU */
        0,  -30,  -10,  -50,  -80,/* U@  UA  UC  UG  UU */
        /* @@ */
        0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
        0,  0,  0,  0,  0,  0,  0,  0,  0,  0
    ];

    public static stack37: number[] = [
            /*          CG     GC     GU     UG     AU     UA  */
            EPars.INF,   EPars.INF,   EPars.INF,   EPars.INF,   EPars.INF,   EPars.INF,   EPars.INF, EPars.INF,
            EPars.INF,  -240,  -330,  -210,  -140,  -210,  -210, EPars.NST,
            EPars.INF,  -330,  -340,  -250,  -150,  -220,  -240, EPars.NST,
            EPars.INF,  -210,  -250,   130,   -50,  -140,  -130, EPars.NST,
            EPars.INF,  -140,  -150,   -50,    30,   -60,  -100, EPars.NST,
            EPars.INF,  -210,  -220,  -140,   -60,  -110,   -90, EPars.NST,
            EPars.INF,  -210,  -240,  -130,  -100,   -90,  -130, EPars.NST,
            EPars.INF,   EPars.NST,   EPars.NST,   EPars.NST,   EPars.NST,   EPars.NST,   EPars.NST, EPars.NST
        ];


    public static get_stack_score(t1: number, t2: number, b1: boolean, b2: boolean): number {
        if (b1 && b2)
            return EPars.stack37[t1 * (EPars.NBPAIRS + 1) + t2];
        else if ((!b1) && (!b2))
            return EPars.stack37[t1 * (EPars.NBPAIRS + 1) + t2] + 200;
        else
            return EPars.stack37[t1 * (EPars.NBPAIRS + 1) + t2] + 100;
    }

    public static dangle5_37: number[] = [
        EPars.INF,  EPars.INF,  EPars.INF,  EPars.INF,  EPars.INF, /* no pair */
        EPars.INF,  -50,  -30,  -20,  -10, /* CG  (stacks on C) */
        EPars.INF,  -20,  -30,   -0,   -0, /* GC  (stacks on G) */
        EPars.INF,  -30,  -30,  -40,  -20, /* GU */
        EPars.INF,  -30,  -10,  -20,  -20, /* UG */
        EPars.INF,  -30,  -30,  -40,  -20, /* AU */
        EPars.INF,  -30,  -10,  -20,  -20, /* UA */
        0,    0,     0,    0,   0  /*  @ */
    ];

    public static dangle3_37: number[] = [
        /*   @     A     C     G     U   */
        EPars.INF,  EPars.INF,  EPars.INF,  EPars.INF,  EPars.INF,  /* no pair */
        EPars.INF, -110,  -40, -130,  -60,  /* CG  (stacks on G) */
        EPars.INF, -170,  -80, -170, -120,  /* GC */
        EPars.INF,  -70,  -10,  -70,  -10,  /* GU */
        EPars.INF,  -80,  -50,  -80,  -60,  /* UG */
        EPars.INF,  -70,  -10,  -70,  -10,  /* AU */
        EPars.INF,  -80,  -50,  -80,  -60,  /* UA */
        0,    0,     0,    0,   0   /*  @ */
    ];

    public static tetra_energy_37: number[] = [
        300, -300, -300, -300, -300, -300, -300, -300, -300, -250, -250, -250,
        -250, -250, -200, -200, -200, -200, -200, -150, -150, -150, -150, -150,
        -150, -150, -150, -150, -150, -150];

    public static tetra_loops: string[] = [
        "GGGGAC", "GGUGAC", "CGAAAG", "GGAGAC", "CGCAAG", "GGAAAC", "CGGAAG", "CUUCGG", "CGUGAG", "CGAAGG",
        "CUACGG", "GGCAAC", "CGCGAG", "UGAGAG", "CGAGAG", "AGAAAU", "CGUAAG", "CUAACG", "UGAAAG", "GGAAGC",
        "GGGAAC", "UGAAAA", "AGCAAU", "AGUAAU", "CGGGAG", "AGUGAU", "GGCGAC", "GGGAGC", "GUGAAC", "UGGAAA"];


    public static get_tetra_loop_bonus(loop: string): number {
        for (let ii: number = 0; ii < EPars.tetra_loops.length; ii++) {
            if (EPars.tetra_loops[ii] == loop) {
                return EPars.tetra_energy_37[ii];
            }
        }

        return 0;
    }

    public static get_dangle5_score(t1: number, s: number): number {
        let ret: number = EPars.dangle5_37[t1 * 5 + s];
        if (ret > 0) {
            return 0;
        } else {
            return ret;
        }
    }

    public static get_dangle3_score(t1: number, s: number): number {
        let ret: number = EPars.dangle3_37[t1 * 5 + s];
        if (ret > 0) {
            return 0;
        } else {
            return ret;
        }
    }

    public static get_int11(t1: number, t2: number, s1: number, s2: number): number {
        return IntLoopPars.int11_37[s2 + s1 * 5 + t2 * 25 + t1 * (EPars.NBPAIRS + 1) * 25];
    }

    public static get_int21(t1: number, t2: number, s1: number, s2: number, s3: number): number {
        return IntLoopPars.int21_37[s3 + s2 * 5 + s1 * 25 + t2 * 125 + t1 * (EPars.NBPAIRS + 1) * 125];
    }

    public static get_int22(t1: number, t2: number, s1: number, s2: number, s3: number, s4: number): number {
        if (t1 == 0) {
            return 0;
        } else if (t1 == 1) {
            return IntLoopPars.int22_37_1[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 == 2) {
            return IntLoopPars.int22_37_2[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 == 3) {
            return IntLoopPars.int22_37_3[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 == 4) {
            return IntLoopPars.int22_37_4[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 == 5) {
            return IntLoopPars.int22_37_5[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 == 6) {
            return IntLoopPars.int22_37_6[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else {
            return IntLoopPars.int22_37_7[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        }
    }

}
