#ifndef CONTRAFOLD_FULLEVAL_H
#define CONTRAFOLD_FULLEVAL_H

#include <vector>
#include <string>
// #include "../contrafold/src/ParameterManager.hpp"

struct FullEvalResult {
    std::vector<int> nodes;
    float energy;
};

FullEvalResult* FullEval (int temperature_in, const std::string& seqString, const std::string& structString);



struct FullFoldResult {
    double mfe;
    std::string structure;
};

struct DotPlotResult {
    double energy;
    std::vector<double> plot;
};

FullFoldResult* FullFoldDefault (const std::string& seqString, double const gamma = 0.7);
FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& seqString, double const gamma = 0.7);
// DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString);
// FullFoldResult* FullFoldWithBindingSite (const std::string& string, int site_i, int site_p, int site_j, int site_q, int site_bonus);
// FullFoldResult* CoFoldSequence (const std::string& seqString);
// FullFoldResult* CoFoldSequenceWithBindingSite (const std::string& seqString, int site_i, int site_p, int site_j, int site_q, int site_bonus);


#endif //CONTRAFOLD_FULLEVAL_H
