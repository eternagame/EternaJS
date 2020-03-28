#ifndef LINEARFOLD_FULLFOLD_H
#define LINEARFOLD_FULLFOLD_H

#include <string>

struct FullFoldResult {
    std::string structure;
};

struct DotPlotResult {
    double energy;
    std::string probabilitiesString;
};

FullFoldResult* FullFoldDefault (std::string seqString);
DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString, const std::string& dotplotStructString);


#endif //LINEARFOLD_FULLFOLD_H
