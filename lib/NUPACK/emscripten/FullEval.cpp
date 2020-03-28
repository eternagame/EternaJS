#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <cmath>

#include "FullEval.h"
#include "EmscriptenUtils.h"

#include "src/thermo/utils/pfuncUtilsConstants.h"
#include "src/thermo/utils/pfuncUtilsHeader.h"
#include "src/shared/utilsHeader.h"
#include "src/thermo/utils/DNAExternals.h"

#define WATER_MOD 1
// water concentration modulation (which we need to cancel here)
#ifdef WATER_MOD
static int water_mod = 0;
#endif

static FullEvalResult* gEvalResult = NULL;

// a callback that fills the array above with localized free energy contributions
static void _eos_cb(int index, int fe) {
    if (gEvalResult != NULL) {
        if (index < 0) {
#ifdef WATER_MOD
            if (index == -2) fe += water_mod;
#endif
            int to_insert[] = { index, fe };
            gEvalResult->nodes.insert(gEvalResult->nodes.begin(), to_insert, to_insert + 2);
        } else {
            gEvalResult->nodes.push_back(index);
            gEvalResult->nodes.push_back(fe);
        }
    }
}

extern void (*eos_cb)(int index, int fe);

FullEvalResult* FullEval (int temperature_in, const std::string& seqString, const std::string& structString) {
    // structString will have braces for pseudoknots if applicable
    auto auto_string = MakeCString(seqString);
    auto auto_structure = MakeCString(structString);

    char* string = auto_string.get();
    char* structure = auto_structure.get();
    char* pc;
    float energy = 0;
    int seqNum[MAXSEQLENGTH+1];
    int tmpLength;
    int num_cuts = 0;

    FullEvalResult* result = new FullEvalResult();

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

#ifdef WATER_MOD
    water_mod = 0;
    if (num_cuts > 0) {
        water_mod = (int) floor(0.5 + 100.0 * num_cuts * kB * (ZERO_C_IN_KELVIN+temperature_in) * log(WaterDensity(temperature_in)));
    }
#endif

    tmpLength = strlen(string);
    convertSeq(string, seqNum, tmpLength);

    energy = (float) naEnergyPairsOrParensFullWithSym(NULL, structure,
                                               seqNum, RNA,
                                               1 /*DANGLETYPE*/, temperature_in, TRUE, SODIUM_CONC, MAGNESIUM_CONC,
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
