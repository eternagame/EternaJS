export class FoldUtil {
    public static next_perm(v: number[]): boolean {
        let more: boolean = false;
        let ii: number = v.length;
        if (ii <= 1) return more;
        ii--;
        while (true) {
            let jj: number = ii;
            ii--;
            if (v[ii] < v[jj]) {
                let kk: number = v.length;
                do {
                    kk--;
                } while (v[ii] >= v[kk]);
                let vv: number = v[ii];
                v[ii] = v[kk];
                v[kk] = vv;
                let r: number[] = v.slice(jj).reverse();
                v.splice(jj, v.length);
                for (kk = 0; kk < r.length; kk++) v.push(r[kk]);
                more = true;
                break;
            }
            if (ii == 0) {
                v.reverse();
                break;
            }
        }
        return more;
    }

    public static binding_site_formed(pairs: number[], groups: number[][]): boolean {
        if (pairs[groups[0][0]] != groups[1][groups[1].length - 1]) return false;
        if (pairs[groups[0][groups[0].length - 1]] != groups[1][0]) return false;
        for (let ii = 1; ii < groups[0].length - 1; ii++) {
            if (pairs[groups[0][ii]] != -1) return false;
        }
        for (let ii = 1; ii < groups[1].length - 1; ii++) {
            if (pairs[groups[1][ii]] != -1) return false;
        }

        return true;
    }
}
