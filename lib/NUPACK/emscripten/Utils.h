#include <string>
#include <vector>
#include <utility>
#include "EmscriptenUtils.h"
#include "src/thermo/utils/pfuncUtilsHeader.h"

struct SequenceStructureInfo {
    //sequence stuff
    std::string sequenceString;
    char* sequenceChar;
    int* sequenceNumber;
    int sequenceLength;

    //structure stuff
    std::string structureString;
    char *structChar;
    int *thePairs;
    dnaStructures ensemebleStructs={NULL, 0, 0, 0, NAD_INFINITY}; 
    oneDnaStruct currentStruct;
    
    //pknotStuff
    bool isPknot;
    int complexity; 

    //other stuff
    int temperature;  
};

std::string getDotParens(bool pseudoknotted, const int seqlength, oneDnaStruct *currentStruct);
void setSequenceInfo(const std::string& seqString, SequenceStructureInfo *info);
void setStructureInfo(const std::string& structString, SequenceStructureInfo *info);
void setGlobals(bool useMFE, bool onlyOneMFE, bool doPseudoknot, int temperature, SequenceStructureInfo *info);