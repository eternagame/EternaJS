#include "FullFold.h"

FullFoldResult* FullFoldDefault (const std::string& seqString, const std::string& structString) {
    return NULL;
}

FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& seqString, const std::string& structString) {
    return NULL;
}

DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString, const std::string& dotplotStructString) {
    return NULL;
}

FullFoldResult* FullFoldWithBindingSite (const std::string& seqString, const std::string& structString, int switch_bp_i, int switch_bp_p, int switch_bp_j, int switch_bp_q, int switch_bp_bonus) {
    return NULL;
}

FullFoldResult* CoFoldSequence (const std::string& seqString, const std::string& structString) {
    return NULL;
}

FullFoldResult* CoFoldSequenceWithBindingSite (const std::string& seqString, const std::string& structString, int site_i, int site_p, int site_j, int site_q, int site_bonus) {
    return NULL;
}
