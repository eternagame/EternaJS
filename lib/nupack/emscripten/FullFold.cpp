#include "FullFold.h"
#include "EmscriptenUtils.h"

#include "../pfuncUtilsHeader.h"
#include "../DNAExternals.h"

FullFoldResult* FullFoldDefault (const std::string& string_in, const std::string& structure_in) {
    auto auto_string = MakeCString(string_in);
    auto auto_structure = MakeCString(structure_in);

    char* string = auto_string.get();
    char* structure = auto_structure.get();

//    char* constraints = (char *) malloc(sizeof(char)*(string_in.length() + 1));

    int seqNum[MAXSEQLENGTH+1];
    int tmpLength;
    dnaStructures mfeStructs = {NULL, 0, 0, 0, 0};
    DBL_TYPE mfe;

    tmpLength = strlen(string);
    convertSeq(string, seqNum, tmpLength);

    mfe = mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
                         DANGLETYPE, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
                         USE_LONG_HELIX_FOR_SALT_CORRECTION);

    for (int j = 0; j < mfeStructs.seqlength; j++) {
        if (mfeStructs.validStructs[0].theStruct[j] > j) {
            structure[j] = '(';
        } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
            structure[j] = '.';
        } else
            structure[j] = ')';

    }
    structure[mfeStructs.seqlength] = 0;
    mfe = mfeStructs.validStructs[0].correctedEnergy;
    clearDnaStructures(&mfeStructs);
//    free(constraints);

    FullFoldResult* result = new FullFoldResult();
    result->mfe = mfe;
    result->structure = structure;

    return result;
}

FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& string_in, const std::string& structure_in) {
    auto auto_string = MakeCString(string_in);
    auto auto_structure = MakeCString(structure_in);

    char* string = auto_string.get();
    char* structure = auto_structure.get();

//    char* constraints = (char *) malloc(sizeof(char)*(string_in.length() + 1));

    int seqNum[MAXSEQLENGTH+1];
    int tmpLength;
    dnaStructures mfeStructs = {NULL, 0, 0, 0, 0};
    DBL_TYPE mfe;
    int j;

    tmpLength = strlen(string);
    convertSeq(string, seqNum, tmpLength);

    mfe = mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
                         DANGLETYPE, temperature_in, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
                         USE_LONG_HELIX_FOR_SALT_CORRECTION);

    for (j = 0; j < mfeStructs.seqlength; j++) {
        if (mfeStructs.validStructs[0].theStruct[j] > j) {
            structure[j] = '(';
        } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
            structure[j] = '.';
        } else
            structure[j] = ')';

    }
    structure[mfeStructs.seqlength] = 0;
    mfe = mfeStructs.validStructs[0].correctedEnergy;
    clearDnaStructures(&mfeStructs);
//    free(constraints);

    FullFoldResult* result = new FullFoldResult();
    result->mfe = mfe;
    result->structure = structure;

    return result;
}