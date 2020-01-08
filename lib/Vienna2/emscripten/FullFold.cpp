#include "FullFold.h"
#include "EmscriptenUtils.h"

#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <cmath>

extern "C" {
#include "config.h"
#include "fold.h"
#include "cofold.h"
#include "part_func.h"
#include "utils.h"
#include "fold_vars.h"
#include "PS_dot.h"
#include "energy_par.h"
#include "read_epars.h"
}

struct plist *make_plist(int length, double pmin) {
    /* convert matrix of pair probs to plist */
    struct plist *pl;
    int i, j, k = 0, maxl;
    maxl = 2 * length;
    pl = (struct plist *) space(maxl * sizeof(struct plist));
    k = 0;
    for (i = 1; i < length; i++)
        for (j = i + 1; j <= length; j++) {
            if (pr[iindx[i] - j] < pmin) continue;
            if (k >= maxl - 1) {
                maxl *= 2;
                pl = (struct plist *) xrealloc(pl, maxl * sizeof(struct plist));
            }
            pl[k].i = i;
            pl[k].j = j;
            pl[k++].p = pr[iindx[i] - j];
        }
    pl[k].i = 0;
    pl[k].j = 0;
    pl[k++].p = 0;
    return pl;
}

struct plist *b2plist(const char *struc) {
    /* convert bracket string to plist */
    short *pt;
    struct plist *pl;
    int i, k = 0;
    pt = make_pair_table(struc);
    pl = (struct plist *) space(strlen(struc) / 2 * sizeof(struct plist));
    for (i = 1; i < strlen(struc); i++) {
        if (pt[i] > i) {
            pl[k].i = i;
            pl[k].j = pt[i];
            pl[k++].p = 0.95 * 0.95;
        }
    }
    free(pt);
    pl[k].i = 0;
    pl[k].j = 0;
    pl[k++].p = 0;
    return pl;
}

static char* InitConstraints (const char* string, const char* structure) {
    char* constraints = (char *) space(sizeof(char)*(strlen(string) + 1));

    // convention for the structure variable:
    // - empty => no constraints, normal fold
    // - same length as sequence => the Vienna-style constraint .|<>()
    // - twice the length of the sequence => estimate mode, pairs of (U|P) combined with [-9,+9]
    //
    if(strlen(structure) == 0) {
        fold_constrained = 0;
        estimate_mode = 0;

    } else {
        if(strlen(structure) != strlen(string) * 2) {
            estimate_mode = 0;
            if(strlen(structure) != strlen(string)) {
                fprintf(stderr,"ViennaRNA : Wrong constraint length %d %d", strlen(structure), strlen(string));
                fold_constrained = 0;
            } else {
                strcpy(constraints, structure);
                fold_constrained = 1;
            }
        } else {
            int ii;
            fold_constrained = 1;
            estimate_mode = 1;

            for(ii=0; ii<strlen(string); ii++) {

                char multiplier = 1;
                int num = structure[2*ii+1] - '0';
                char level = 0;

                if(num < 0 || num > 9) {
                    fold_constrained = 0;
                    fprintf(stderr,"ViennaRNA : Wrong constraint weight");
                    break;
                }

                level = (char)(num);

                if(structure[2*ii] == 'P') {
                    multiplier = -1;
                } else if(structure[2*ii] == 'U') {
                    multiplier = 1;
                } else {
                    fprintf(stderr,"ViennaRNA : unrecognized constraint");
                    fold_constrained = 0;
                    break;
                }

                constraints[ii] = level * multiplier;
            }
        }
    }

    return constraints;
}

FullFoldResult* FullFoldDefault (const std::string& seqString, const std::string& structString) {
    auto autoSeqString = MakeCString(seqString);
    auto autoStructure = MakeCString(structString);

    char* string = autoSeqString.get();
    char* structure = autoStructure.get();

    char* constraints = InitConstraints(string, structure);
    double energy = fold(string, constraints);

    FullFoldResult* result = new FullFoldResult();
    result->mfe = energy;
    result->structure = constraints;

    free_arrays();
    free(constraints);

    return result;
}

FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& seqString, const std::string& structString) {
    auto autoSeqString = MakeCString(seqString);
    auto autoStructure = MakeCString(structString);

    char* string = autoSeqString.get();
    char* structure = autoStructure.get();

    char* constraints = InitConstraints(string, structure);

    temperature = temperature_in;
    double energy = fold(string, constraints);

    FullFoldResult* result = new FullFoldResult();
    result->mfe = energy;
    result->structure = constraints;

    free_arrays();
    free(constraints);

    return result;
}

DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString, const std::string& dotplotStructString) {
    auto autoSeqString = MakeCString(seqString);
    auto autoDotPlotString = MakeCString(dotplotStructString);
    char* string = autoSeqString.get();
    char* dotplot_structure = autoDotPlotString.get();

    const char* structure = "";

    char* constraints = InitConstraints(string, structure);

    int    length;
    double energy;
    double min_en = 0;
    double kT, sfact=1.07;
    double tmp;
    char *probabilities;
    char *probIndex;

    plist *pl,*mf,*pl1;

    length = (int) strlen(string);

    temperature = temperature_in;
    probabilities = (char *) calloc(sizeof(char), length * length * 30);
    probIndex = probabilities;

    kT = (temperature+273.15)*1.98717/1000.; /* in Kcal */
    pf_scale = exp(-(sfact*min_en)/kT/length);

    // init_pf_fold(length); // obsolete
    energy = pf_fold(string,constraints);

    pl = make_plist(length, 1e-5);
    mf = b2plist(dotplot_structure);

    //fprintf(stderr, "case 1-2 %d", sizeof(char) * length * length * 30);

    /* print boxes in upper right half*/
    //int pcount = 0;
    for (pl1=pl; pl1->i>0; pl1++) {
        tmp = sqrt(pl1->p);
        //pcount++;
        probIndex += sprintf(probIndex, "%d %d %1.9f ubox ", pl1->i, pl1->j, tmp);
    }

    /* print boxes in lower left half (mfe) */
    for (pl1=mf; pl1->i>0; pl1++) {
        tmp = sqrt(pl1->p);
        //pcount++;
        probIndex += sprintf(probIndex, "%d %d %1.7f lbox ", pl1->i, pl1->j, tmp);
    }

    DotPlotResult* result = new DotPlotResult();
    result->energy = energy;
    result->probabilitiesString = probabilities;

    free_pf_arrays();
    free(constraints);
    free(pl);
    free(mf);
    free(probabilities);

    return result;
}

FullFoldResult* FullFoldWithBindingSite (const std::string& seqString, const std::string& structString, int switch_bp_i, int switch_bp_p, int switch_bp_j, int switch_bp_q, int switch_bp_bonus) {
    auto autoSeqString = MakeCString(seqString);
    auto autoStructure = MakeCString(structString);

    char* string = autoSeqString.get();
    char* structure = autoStructure.get();

    char* constraints = InitConstraints(string, structure);

    double energy = fold_with_binding_site(string, constraints,switch_bp_i,  switch_bp_p, switch_bp_j, switch_bp_q, switch_bp_bonus);

    FullFoldResult* result = new FullFoldResult();
    result->mfe = energy;
    result->structure = constraints;

    free_arrays();
    free(constraints);

    return result;
}

FullFoldResult* CoFoldSequence (const std::string& seqString, const std::string& structString) {
    auto autoSeqString = MakeCString(seqString);
    auto autoStructure = MakeCString(structString);

    char* string = autoSeqString.get();
    char* structure = autoStructure.get();

    char* constraints = InitConstraints(string, structure);

    char* cut = strchr(string, '&');
    if (cut) {
        *cut = '\0';
        strcat(string, cut+1);
        cut_point = cut - string;
        if (constraints[0]) {
            constraints[cut_point] = '\0';
            strcat(constraints, constraints+cut_point+1);
        }
        cut_point++;
    } else {
        fprintf(stderr, "missing cut point\n");

        FullFoldResult* result = new FullFoldResult();
        result->mfe = 0;
        result->structure = "";
        return result;
    }

    double energy = cofold(string, constraints);
    cut_point--; // back to 0-based

    FullFoldResult* result = new FullFoldResult();
    result->mfe = energy;
    
    result->structure = constraints;
    result->structure.insert(cut_point, "&");

    // clean-up
    cut_point = -1;
    free_co_arrays(); // IMPORTANT, NOT free_arrays()
    free(constraints);

    return result;
}

FullFoldResult* CoFoldSequenceWithBindingSite (const std::string& seqString, const std::string& structString, int switch_bp_i, int switch_bp_p, int switch_bp_j, int switch_bp_q, int switch_bp_bonus) {
    auto autoSeqString = MakeCString(seqString);
    auto autoStructure = MakeCString(structString);

    char* string = autoSeqString.get();
    char* structure = autoStructure.get();

    char* constraints = InitConstraints(string, structure);

    char* cut = strchr(string, '&');
    if (cut) {
        *cut = '\0';
        strcat(string, cut+1);
        cut_point = cut - string;
        if (constraints[0]) {
            constraints[cut_point] = '\0';
            strcat(constraints, constraints+cut_point+1);
        }
        cut_point++;
    } else {
        fprintf(stderr, "missing cut point\n");
        FullFoldResult* result = new FullFoldResult();
        result->mfe = 0;
        result->structure = "";
        return result;
    }

    double energy = cofold_with_binding_site(string, constraints,switch_bp_i,  switch_bp_p, switch_bp_j, switch_bp_q, switch_bp_bonus);
    cut_point--; // back to 0-based

    fprintf(stderr, "Tim: double-check suspicious string manipulation (%s:%d)\n", __FILE__, __LINE__);
    strcpy(structure, constraints);
    structure[cut_point] = 0;
    strcat(structure, "&");
    strcat(structure, constraints+cut_point);

    FullFoldResult* result = new FullFoldResult();
    result->mfe = energy;
    result->structure = structure;

    // clean-up
    cut_point = -1;
    free_co_arrays(); // IMPORTANT, NOT free_arrays()
    free(constraints);

    return result;
}
