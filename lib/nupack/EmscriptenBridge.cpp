#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <math.h>
#include <string>

#include <emscripten.h>
#include <emscripten/bind.h>

#include "pfuncUtilsHeader.h"
#include "DNAExternals.h"

using namespace emscripten;

#define WATER_MOD 1
// water concentration modulation (which we need to cancel here)
#ifdef WATER_MOD
int water_mod = 0;
#endif

// Emits a console.log in js-land
void TraceJS (const char* text) {
    std::string output = "Module.print('(Emscripten) " + std::string(text) + "');";
    emscripten_run_script(output.c_str());
}

class FullAlchEvalResult {
public:
    std::vector<int> energyContributions;
    float energy;
};

static FullAlchEvalResult* gEvalResult = NULL;

// a callback that fills the array above with localized free energy contributions
static void _eos_cb(int index, int fe) {
    if (gEvalResult != NULL) {
        if (index < 0) {
#ifdef WATER_MOD
            if (index == -2) fe += water_mod;
#endif
            int to_insert[] = { index, fe };
            gEvalResult->energyContributions.insert(gEvalResult->energyContributions.begin(), to_insert, to_insert + 2);
        } else {
            gEvalResult->energyContributions.push_back(index);
            gEvalResult->energyContributions.push_back(fe);
        }
    }
}

extern void (*eos_cb)(int index, int fe);

static FullAlchEvalResult* fullAlchEval (int temperature_in, std::string string_in, std::string structure_in) {
    char* string = (char *) string_in.c_str();
    char* structure = (char *) structure_in.c_str();
    char* pc;
    float energy = 0.;
    int seqNum[MAXSEQLENGTH+1];
    int tmpLength;
    int num_cuts = 0;

    FullAlchEvalResult* result = new FullAlchEvalResult();
    gEvalResult = result; // set the collecting array
    eos_cb = _eos_cb; // activate the callback

    do {
        pc = strchr(string, '&');
        if (pc) {
            num_cuts++;
            (*pc) = '+';
            structure[pc - string] = '+';
        }
    } while(pc);
    if(0) TraceJS(string);
    if(0) TraceJS(structure);

#ifdef WATER_MOD
    water_mod = 0;
    if (num_cuts > 0) {
        water_mod = floor(0.5 + 100.0 * num_cuts * kB * (ZERO_C_IN_KELVIN+temperature_in) * log(WaterDensity(temperature_in)));
    }
#endif

    tmpLength = strlen(string);
    convertSeq(string, seqNum, tmpLength);

    energy = naEnergyPairsOrParensFullWithSym( NULL, structure,
                           seqNum, RNA,
                           DANGLETYPE, temperature_in, TRUE, SODIUM_CONC, MAGNESIUM_CONC,
                           USE_LONG_HELIX_FOR_SALT_CORRECTION);
#ifdef WATER_MOD
    energy += (water_mod * .01);
#endif
    if (0) {
        char buf[256];
        sprintf(buf, "FE=%6.3f", energy);
        TraceJS(buf);
    }
    fprintf(stderr, "done\n");

    // clean up
    eos_cb = NULL;
    gEvalResult = NULL;

    result->energy = energy;
    return result;
}

// static AS3_Val fullAlchEval(void* self, AS3_Val args)
// {
//     char* string = NULL;
//     char* structure = NULL;
//     char* pc;
//     AS3_Val thiz_;
//     int temperature_in;
//     float energy = 0.;
//     int seqNum[MAXSEQLENGTH+1];
//     int tmpLength;
//     int num_cuts = 0;

//     AS3_ArrayValue(args, "IntType, StrType, StrType, AS3ValType", &temperature_in, &string, &structure, &thiz_);
//     thiz = &thiz_; // set the collecting array
//     eos_cb = _eos_cb; // activate the callback

//     do {
//         pc = strchr(string, '&');
//         if (pc) {
//             num_cuts++;
//             (*pc) = '+';
//             structure[pc - string] = '+';
//         }
//     } while(pc);
//     if(0) TraceJS(string);
//     if(0) TraceJS(structure);

// #ifdef WATER_MOD
//     water_mod = 0;
//     if (num_cuts > 0) {
//         water_mod = floor(0.5 + 100.0 * num_cuts * kB * (ZERO_C_IN_KELVIN+temperature_in) * log(WaterDensity(temperature_in)));
//     }
// #endif

//     tmpLength = strlen(string);
//     convertSeq(string, seqNum, tmpLength);

//     energy = naEnergyPairsOrParensFullWithSym( NULL, structure,
//                            seqNum, RNA,
//                            DANGLETYPE, temperature_in, TRUE, SODIUM_CONC, MAGNESIUM_CONC,
//                            USE_LONG_HELIX_FOR_SALT_CORRECTION);
// #ifdef WATER_MOD
//     energy += (water_mod * .01);
// #endif
//     if (0) {
//         char buf[256];
//         sprintf(buf, "FE=%6.3f", energy);
//         TraceJS(buf);
//     }
//     fprintf(stderr, "done\n");

//     // clean up
//     eos_cb = NULL;
//     thiz = NULL;

//     return AS3_Array("DoubleType", energy);
// }


// static AS3_Val AlchEval(void* self, AS3_Val args)
// {
//     char* string = NULL;
//     char* structure = NULL;
//     AS3_Val fold_type_args;
//     int temperature_in;
//     float energy = 0.;

//     AS3_ArrayValue(args, "IntType, StrType, StrType", &temperature_in, &string, &structure);
//     // temperature = temperature_in;

//     // update_fold_params();
//     // energy = energy_of_structure(string, structure, 0);

//     return AS3_Array("DoubleType", energy);
// }



// binding site data
int site_i, site_j, site_p, site_q, site_bonus;
//
int _binding_cb(int i, int j, int* d, int* e)
{
    if ((i == site_i) && (j == site_j)) {
        // fprintf(stderr, "query i:%d j:%d\n", i, j);
        (*d) = site_p;
        (*e) = site_q;
        return 1;
    }
    return 0;
}
//
DBL_TYPE _binding_site_cb(int i, int j, int p, int q)
{
    // fprintf(stderr, "cb i:%d j:%d p:%d q:%d\n", i, j, p, q);
    if ((i == site_i) && (j == site_j) && (p == site_p) && (q == site_q)) {
        // fprintf(stderr, "cb match\n");
        return site_bonus * -.01;
    }

    return 0.;
}

extern int (*binding_cb)(int i, int j, int* d, int* e);
extern DBL_TYPE (*binding_site_cb)(int i, int j, int p, int q);


// static AS3_Val fullAlchFold(void* self, AS3_Val args)
// {
//     char* constraints = NULL;
//     char* dotplot_structure = NULL;

//     int   i, length;
//     double temperature_in;
//     double energy = 0.;
//     double min_en;
//     double kT, sfact=1.07;
//     double tmp;
//     char *probabilities;
//     char *probIndex;


//     int fold_type = 0;
//     AS3_Val fold_type_args;
//     char* string = NULL;
//     char* structure = NULL;
//     char* pc;


//     AS3_ArrayValue(args, "IntType, AS3ValType, StrType, StrType", &fold_type, &fold_type_args, &string, &structure);

//     if (string == NULL) {
//         return AS3_Array("DoubleType, StrType", 0.0, NULL);
//     }

//     constraints = (char *) malloc(sizeof(char)*(strlen(string) + 1));

//     // convention for the structure variable:
//     // - empty => no constraints, normal fold
//     // - same length as sequence => the Vienna-style constraint .|<>()
//     // - twice the length of the sequence => estimate mode, pairs of (U|P) combined with [-9,+9]
//     //
//     if (strlen(structure) == 0) {
//         // fold_constrained = 0;
//         // estimate_mode = 0;

//     } else {
//         if (strlen(structure) != strlen(string) * 2) {
//             // estimate_mode = 0;
//             if (strlen(structure) != strlen(string)) {
//                 fprintf(stderr,"ViennaRNA : Wrong constraint length %d %d", strlen(structure), strlen(string));
//                 // fold_constrained = 0;
//             } else {
//                 // strcpy(constraints, structure);
//                 // fold_constrained = 1;
//             }
//         } else {
//             int ii;
//             // fold_constrained = 1;
//             // estimate_mode = 1;

//             for (ii=0; ii<strlen(string); ii++) {

//                 char multiplier = 1;
//                 int num = structure[2*ii+1] - '0';
//                 char level = 0;

//                 if (num < 0 || num > 9) {
//                     // fold_constrained = 0;
//                     fprintf(stderr,"ViennaRNA : Wrong constraint weight");
//                     break;
//                 }

//                 level = (char)(num);

//                 if (structure[2*ii] == 'P') {
//                     multiplier = -1;
//                 } else if (structure[2*ii] == 'U') {
//                     multiplier = 1;
//                 } else {
//                     fprintf(stderr,"ViennaRNA : unrecognized constraint");
//                     // fold_constrained = 0;
//                     break;
//                 }

//                 // constraints[ii] = level * multiplier;
//             }
//         }
//     }


//     int seqNum[MAXSEQLENGTH+1];
//     int tmpLength;
//     dnaStructures mfeStructs = {NULL, 0, 0, 0, 0};
//     DBL_TYPE mfe;
//     int j;

//     AS3_Val plot;

//     switch(fold_type)
//     {
//         case 0:
//             //the default fold

//             tmpLength = strlen(string);
//             convertSeq(string, seqNum, tmpLength);

//             mfe = mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
//                                         DANGLETYPE, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
//                                                                 USE_LONG_HELIX_FOR_SALT_CORRECTION);

//             for (j = 0; j < mfeStructs.seqlength; j++) {
//                 if (mfeStructs.validStructs[0].theStruct[j] > j) {
//                     structure[j] = '(';
//                 } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
//                     structure[j] = '.';
//                 } else
//                     structure[j] = ')';

//             }
//             structure[mfeStructs.seqlength] = 0;
//             mfe = mfeStructs.validStructs[0].correctedEnergy;
//             clearDnaStructures(&mfeStructs);
//             free(constraints);

//             return AS3_Array("DoubleType, StrType", mfe, structure);
//             break;
//         case 1:
//             //temperature fold
//             temperature_in = AS3_NumberValue(fold_type_args);

//             tmpLength = strlen(string);
//             convertSeq(string, seqNum, tmpLength);

//             mfe = mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
//                                         DANGLETYPE, temperature_in, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
//                                                                 USE_LONG_HELIX_FOR_SALT_CORRECTION);

//             for (j = 0; j < mfeStructs.seqlength; j++) {
//                 if (mfeStructs.validStructs[0].theStruct[j] > j) {
//                     structure[j] = '(';
//                 } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
//                     structure[j] = '.';
//                 } else
//                     structure[j] = ')';

//             }
//             structure[mfeStructs.seqlength] = 0;
//             mfe = mfeStructs.validStructs[0].correctedEnergy;
//             clearDnaStructures(&mfeStructs);
//             free(constraints);

//             return AS3_Array("DoubleType, StrType", mfe, structure);
//             break;
//         case 2:
//             //pf_fold
//             length = (int) strlen(string);

//             AS3_ArrayValue(fold_type_args, "DoubleType, AS3ValType", &temperature_in, &plot);

//             tmpLength = strlen(string);
//             convertSeq(string, seqNum, tmpLength);

//             pairPr = (DBL_TYPE*) calloc( (tmpLength+1)*(tmpLength+1), sizeof(DBL_TYPE));

//             energy = pfuncFull( seqNum, 3, RNA, 1, temperature_in, 1, 1.0, 0.0, 0);

//             for (i = 0; i < tmpLength; i++) {
//                 for (j = i+1; j < tmpLength; j++) {
//                     int k = (tmpLength+1)*i + j;
//                     if (pairPr[k] < 1e-5) continue;

//                     AS3_CallTS("push", plot, "IntType", i+1);
//                     AS3_CallTS("push", plot, "IntType", j+1);
//                     AS3_CallTS("push", plot, "DoubleType", pairPr[k]);
//                 }
//             }

//             if (pairPr) {
//                 free(pairPr);
//                 pairPr = NULL;
//             }
//             free(constraints);

//             return AS3_Array("DoubleType", energy);
//             break;

//         case 3:
//             length = (int) strlen(string);

//             AS3_ArrayValue(fold_type_args, "IntType, IntType, IntType, IntType, IntType",
//                     &site_i, &site_p, &site_j, &site_q, &site_bonus);
//             // fprintf(stderr, "site i:%d j:%d p:%d q:%d bonus:%d\n", site_i, site_j, site_p, site_q, site_bonus);

//             tmpLength = strlen(string);
//             convertSeq(string, seqNum, tmpLength);

//             // activate binding site callbacks
//             binding_cb = _binding_cb;
//             binding_site_cb = _binding_site_cb;
//             energy = mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
//                                         DANGLETYPE, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
//                         USE_LONG_HELIX_FOR_SALT_CORRECTION);
//             // clean up
//             binding_site_cb = NULL;
//             binding_cb = NULL;

//             for (j = 0; j < mfeStructs.seqlength; j++) {
//                 if (mfeStructs.validStructs[0].theStruct[j] > j) {
//                     structure[j] = '(';
//                 } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
//                     structure[j] = '.';
//                 } else
//                     structure[j] = ')';

//             }
//             structure[mfeStructs.seqlength] = 0;
//             energy = mfeStructs.validStructs[0].correctedEnergy;
//             clearDnaStructures(&mfeStructs);
//             free(constraints);

//             return AS3_Array("DoubleType, StrType", energy, structure);
//             break;

//         case 4:
//             if(0) fprintf(stderr,"ViennaRNA : string: %s", string);

//             do {
//                 pc = strchr(string, '&');
//                 if (pc) (*pc) = '+';
//             } while(pc);
//             if (0) TraceJS(string);

//             tmpLength = strlen(string);
//             convertSeq(string, seqNum, tmpLength);

//             mfe = mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
//                                         DANGLETYPE, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
//                                                                 USE_LONG_HELIX_FOR_SALT_CORRECTION);

//             for (j = 0; j < mfeStructs.seqlength; j++) {
//                 if (mfeStructs.validStructs[0].theStruct[j] > j) {
//                     structure[j] = '(';
//                 } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
//                     structure[j] = '.';
//                 } else
//                     structure[j] = ')';

//             }
//             structure[mfeStructs.seqlength] = 0;
//             strcpy(constraints, structure);
//             for (pc = string, i = 0, j = 0; (*pc); pc++ ) {
//                 if ((*pc) == '+') {
//                     structure[j++] = '&';
//                 } else {
//                     structure[j++] = constraints[i++];
//                 }
//             }
//             structure[j] = 0;
//             mfe = mfeStructs.validStructs[0].correctedEnergy;
//             clearDnaStructures(&mfeStructs);
//             free(constraints);

//             return AS3_Array("DoubleType, StrType", mfe, structure);
//             break;

//         case 5:
//             if(0) fprintf(stderr,"ViennaRNA : string: %s", string);

//             AS3_ArrayValue(fold_type_args, "IntType, IntType, IntType, IntType, IntType",
//                     &site_i, &site_p, &site_j, &site_q, &site_bonus);
//             // fprintf(stderr, "site i:%d j:%d p:%d q:%d bonus:%d\n", site_i, site_j, site_p, site_q, site_bonus);

//             do {
//                 pc = strchr(string, '&');
//                 if (pc) (*pc) = '+';
//             } while(pc);
//             if (0) TraceJS(string);

//             tmpLength = strlen(string);
//             convertSeq(string, seqNum, tmpLength);

//             // activate binding site callbacks
//             binding_cb = _binding_cb;
//             binding_site_cb = _binding_site_cb;
//             mfe = mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
//                                         DANGLETYPE, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
//                                                                 USE_LONG_HELIX_FOR_SALT_CORRECTION);
//             // clean up
//             binding_site_cb = NULL;
//             binding_cb = NULL;

//             for (j = 0; j < mfeStructs.seqlength; j++) {
//                 if (mfeStructs.validStructs[0].theStruct[j] > j) {
//                     structure[j] = '(';
//                 } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
//                     structure[j] = '.';
//                 } else
//                     structure[j] = ')';

//             }
//             structure[mfeStructs.seqlength] = 0;
//             strcpy(constraints, structure);
//             for (pc = string, i = 0, j = 0; (*pc); pc++ ) {
//                 if ((*pc) == '+') {
//                     structure[j++] = '&';
//                 } else {
//                     structure[j++] = constraints[i++];
//                 }
//             }
//             structure[j] = 0;
//             mfe = mfeStructs.validStructs[0].correctedEnergy;
//             clearDnaStructures(&mfeStructs);
//             free(constraints);

//             return AS3_Array("DoubleType, StrType", mfe, structure);
//             break;

//         default:
//             fprintf(stderr, "default case\n");
//             return AS3_Array("DoubleType, StrType", 0.0, NULL);
//     }

//     return AS3_Array("DoubleType, StrType", 0.0, NULL);
// }

//entry point for code
int main()
{
    DNARNACOUNT = RNA;
    DANGLETYPE = 1;
    TEMP_K = 37.0 + ZERO_C_IN_KELVIN;
    DO_PSEUDOKNOTS = 0;
    ONLY_ONE_MFE = 1;
    USE_MFE = 0;
    mfe_sort_method = 0;
    SODIUM_CONC = 1.0;
    MAGNESIUM_CONC = 0.0;
    USE_LONG_HELIX_FOR_SALT_CORRECTION = 0;
    NUPACK_VALIDATE=0;
    EXTERN_QB = NULL;
    EXTERN_Q = NULL;

    return 0;
}


EMSCRIPTEN_BINDINGS(EmscriptenBridge) {
    register_vector<int>("VectorInt");

    class_<FullAlchEvalResult>("FullAlchEvalResult")
        .constructor()
        .property("energyContributions", &FullAlchEvalResult::energyContributions)
        .property("energy", &FullAlchEvalResult::energy);

    // fullAlchEval returns a raw pointer, so we need to use allow_raw_pointers()
    function("fullAlchEval", &fullAlchEval, allow_raw_pointers());
}

