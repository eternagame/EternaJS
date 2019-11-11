#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <cmath>

#include "FullEval.h"
#include "LinearFoldEval.h"

static FullEvalResult* gEvalResult = NULL;
// a callback that fills the array above with localized free energy contributions
void _eos_cb(int index, int fe) {
    if (gEvalResult != NULL) {
        if (index < 0) {
            int to_insert[] = { index-1, fe }; // shift indices from 1-based to 0-based
            gEvalResult->nodes.insert(gEvalResult->nodes.begin(), to_insert, to_insert + 2);
        } else {
            gEvalResult->nodes.push_back(index - 1); // shift indices from 1-based to 0-based
            gEvalResult->nodes.push_back(fe);
        }
    }
}

extern void (*eos_cb)(int index, int fe);

FullEvalResult* FullEval (const std::string& seqString, const std::string& structString) {
    double energy;
    FullEvalResult* result = new FullEvalResult();

    gEvalResult = result; // set the collecting array
    eos_cb = _eos_cb; // activate the callback

    energy = eval(seqString, structString, false) / -100.0;

    // clean up
    eos_cb = NULL;
    gEvalResult = NULL;

    result->energy = energy;
    return result;
}
