#ifndef NUPACK_FULLFOLD_H
#define NUPACK_FULLFOLD_H

#include <string>
#include <vector>

struct FullFoldResult {
    double mfe;
    std::string structure;
};

struct DotPlotResult {
    double energy;
    std::vector<double> plot;
};

FullFoldResult* FullFoldDefault (const std::string& seqString, const std::string& structure);
FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& seqString, const std::string& structure);
DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString);
FullFoldResult* FullFoldWithBindingSite (const std::string& string, int site_i, int site_p, int site_j, int site_q, int site_bonus);

#endif //NUPACK_FULLFOLD_H
