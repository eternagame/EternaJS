#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <cmath>

#include "FullEval.h"
#include "EmscriptenUtils.h"

extern "C" {
    #include "fold.h"
    #include "fold_vars.h"
}


static FullEvalResult* gEvalResult = NULL;
// a callback that fills the array above with localized free energy contributions
void _eos_cb(int index, int fe) {
    if (gEvalResult != NULL) {
        if (index < 0) {
            int to_insert[] = { index-1, fe }; // shift indices from 1-based to 0-based
            gEvalResult->nodes.insert(gEvalResult->nodes.begin(), to_insert, to_insert + 2);
        } else {
            if (cut_point >= 0 && index >= cut_point) index++;
            gEvalResult->nodes.push_back(index - 1); // shift indices from 1-based to 0-based
            gEvalResult->nodes.push_back(fe);
        }
    }
}

extern void (*eos_cb)(int index, int fe);

FullEvalResult* FullEval (int temperature_in, const std::string& seqString, const std::string& structString) {
    auto auto_string = MakeCString(seqString);
    auto auto_structure = MakeCString(structString);

    char* string = auto_string.get();
    char* structure = auto_structure.get();
    char* cut = NULL;
    float energy;

    temperature = temperature_in;

    cut = strchr(string, '&');
    if(cut) {
        *cut = '\0';
        strcat(string, cut+1);
        cut_point = cut - string;
        structure[cut_point] = '\0';
        strcat(structure, structure+cut_point+1);
        cut_point++;
    }

    FullEvalResult* result = new FullEvalResult();

    gEvalResult = result; // set the collecting array
    eos_cb = _eos_cb; // activate the callback

    update_fold_params();
    energy = energy_of_struct(string, structure);

    // clean up
    cut_point = -1;
    eos_cb = NULL;
    gEvalResult = NULL;

    result->energy = energy;
    return result;
}