#ifndef LINEARFOLD_FULLFOLD_H
#define LINEARFOLD_FULLFOLD_H

#include <string>
#include <vector>

struct FullFoldResult {
    std::string structure;
};

struct DotPlotResult {
    double energy;
    // std::string probabilitiesString;
    std::vector< double > plot;
};

FullFoldResult* FullFoldDefault (std::string seqString);
DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString, const std::string& dotplotStructString);


#endif //LINEARFOLD_FULLFOLD_H
