#include <string>
#include "src/thermo/utils/pfuncUtilsHeader.h"

std::string getDotParens(bool pseudoknotted, const int seqlength, oneDnaStruct *currentStruct);
std::string getDotParensNew(char* RNAseq, const int *thepairs, bool makeForEterna);