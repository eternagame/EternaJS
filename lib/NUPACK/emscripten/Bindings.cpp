#include "FullEval.h"
#include "FullFold.h"

#include "src/thermo/utils/pfuncUtilsConstants.h"
#include "src/thermo/utils/pfuncUtilsHeader.h"
#include "src/shared/utilsHeader.h"
#include "src/thermo/utils/DNAExternals.h"

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

#ifdef __EMSCRIPTEN__

#include <emscripten.h>
#include <emscripten/bind.h>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(EmscriptenBridge) {
    register_vector<int>("VectorInt");
    register_vector<double>("VectorDouble");

    class_<FullEvalResult>("FullEvalResult")
        .constructor()
        .property("nodes", &FullEvalResult::nodes)
        .property("energy", &FullEvalResult::energy);

    function("FullEval", &FullEval, allow_raw_pointers());

    class_<FullFoldResult>("FullFoldResult")
        .property("mfe", &FullFoldResult::mfe)
        .property("structure", &FullFoldResult::structure);

    function("FullFoldDefault", &FullFoldDefault, allow_raw_pointers());
    function("FullFoldTemperature", &FullFoldTemperature, allow_raw_pointers());
    function("FullFoldWithBindingSite", &FullFoldWithBindingSite, allow_raw_pointers());
    function("CoFoldSequence", &CoFoldSequence, allow_raw_pointers());
    function("CoFoldSequenceWithBindingSite", &CoFoldSequenceWithBindingSite, allow_raw_pointers());

    class_<DotPlotResult>("DotPlotResult")
        .property("energy", &DotPlotResult::energy)
        .property("plot", &DotPlotResult::plot);

    function("GetDotPlot", &GetDotPlot, allow_raw_pointers());
}

#endif
