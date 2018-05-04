#include <emscripten.h>
#include <emscripten/bind.h>

#include "FullEval.h"
#include "EmscriptenUtils.h"

#include "../pfuncUtilsHeader.h"
#include "../DNAExternals.h"

using namespace emscripten;

//entry point for code
int main() {
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

    class_<FullEvalResult>("FullAlchEvalResult")
            .constructor()
            .property("energyContributions", &FullEvalResult::energyContributions)
            .property("energy", &FullEvalResult::energy);

    function("FullEval", &FullEval, allow_raw_pointers());
}
