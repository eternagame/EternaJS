#ifndef VIENNA2_FULLFOLD_H
#define VIENNA2_FULLFOLD_H

#include <string>
#include <vector>

struct FullFoldResult {
    double mfe;
    std::string structure;
};

struct DotPlotResult {
    double energy;
    std::string probabilitiesString;
};

FullFoldResult* FullFoldDefault (const std::string& seqString, const std::string& structString);
FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& seqString, const std::string& structString);
DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString, const std::string& dotplotStructString);
FullFoldResult* FullFoldWithBindingSite (const std::string& seqString, const std::string& structString, int switch_bp_i, int switch_bp_p, int switch_bp_j, int switch_bp_q, int switch_bp_bonus);
FullFoldResult* CoFoldSequence (const std::string& seqString, const std::string& structString);
FullFoldResult* CoFoldSequenceWithBindingSite (const std::string& seqString, const std::string& structString, int switch_bp_i, int switch_bp_p, int switch_bp_j, int switch_bp_q, int switch_bp_bonus);

#endif //VIENNA2_FULLFOLD_H
