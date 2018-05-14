#ifndef VIENNA_FULLFOLD_H
#define VIENNA_FULLFOLD_H

#include <string>
#include <vector>

struct FullFoldResult {
    double mfe;
    std::string structure;
};

struct DotPlotResult {
    double energy;
    std::string structure;
    std::string probabilitiesString;
};

FullFoldResult* FullFoldDefault (const std::string& seqString, const std::string& structString);
FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& seqString, const std::string& structString);
DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString, const std::string& dotplotStructString);
FullFoldResult* FullFoldWithBindingSite (const std::string& string, int site_i, int site_p, int site_j, int site_q, int site_bonus);
FullFoldResult* CoFoldSequence (const std::string& seqString, const std::string& structString);
FullFoldResult* CoFoldSequenceWithBindingSite (const std::string& seqString, const std::string& structString, int site_i, int site_p, int site_j, int site_q, int site_bonus);

#endif //VIENNA_FULLFOLD_H
