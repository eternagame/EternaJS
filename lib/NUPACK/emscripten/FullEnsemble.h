#ifndef NUPACK_FULLENSEMBLE_H
#define NUPACK_FULLENSEMBLE_H

#include <string>
#include <vector>
#include "src/thermo/utils/pfuncUtilsHeader.h"

struct FullAdvancedResult {
    double ensembleDefect;
    double ensembleDefectNormalized;
    double mfeDefect;
    double mfeDefectNormalized;
    std::vector<std::string> suboptStructures;
    std::vector<double> suboptEnergyError;
    std::vector<double> suboptFreeEnergy;
};

FullAdvancedResult* FullEnsembleNoBindingSite (const std::string& seqString, int temperature, float kcalDeltaRange, bool const pseudoknotted);
FullAdvancedResult* FullEnsembleWithOligos (const std::string& seqString, int temperature, float kcalDeltaRange,  bool const pseudoknotted);
std::string getDotParens(bool pseudoknotted, const int seqlength, oneDnaStruct *currentStruct);
void getEnsembleDefect(char* seqChar, char* dotParensStructure, int temperature, bool pseudoknot, 
                       bool multiFold, double *returnEnsembleDefect, bool mfeDefect);
#endif //NUPACK_FULLENSEMBLE_H
