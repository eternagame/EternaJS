#include "FullFold.h"
#include "EmscriptenUtils.h"

#include "../pfuncUtilsHeader.h"
#include "../DNAExternals.h"

FullFoldResult* FullFoldDefault (const std::string& seqString, const std::string& structString) {
    auto autoSeqString = MakeCString(seqString);
    auto autoStructure = MakeCString(structString);

    char* string = autoSeqString.get();
    char* structure = autoStructure.get();

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

FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& seqString, const std::string& structString) {
    auto autoSeqString = MakeCString(seqString);
    auto autoStructure = MakeCString(structString);

    char* string = autoSeqString.get();
    char* structure = autoStructure.get();

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

DotPlotResult* GetDotPlot (double temperature_in, const std::string& seqString) {
    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();

    double energy = 0;

    int seqNum[MAXSEQLENGTH+1];
    int tmpLength;

    DotPlotResult* result = new DotPlotResult();

    tmpLength = strlen(string);
    convertSeq(string, seqNum, tmpLength);

    pairPr = (DBL_TYPE*) calloc( (tmpLength+1)*(tmpLength+1), sizeof(DBL_TYPE));

    energy = pfuncFull( seqNum, 3, RNA, 1, temperature_in, 1, 1.0, 0.0, 0);

    for (int i = 0; i < tmpLength; i++) {
        for (int j = i+1; j < tmpLength; j++) {
            int k = (tmpLength+1)*i + j;
            if (pairPr[k] < 1e-5) continue;

            result->plot.push_back(i + 1);
            result->plot.push_back(j + 1);
            result->plot.push_back(pairPr[k]);
        }
    }

    if (pairPr) {
        free(pairPr);
        pairPr = NULL;
    }

    result->energy = energy;
    return result;
}

// binding site data
int g_site_i, g_site_j, g_site_p, g_site_q, g_site_bonus;
int _binding_cb(int i, int j, int* d, int* e) {
    if ((i == g_site_i) && (j == g_site_j)) {
        // fprintf(stderr, "query i:%d j:%d\n", i, j);
        (*d) = g_site_p;
        (*e) = g_site_q;
        return 1;
    }
    return 0;
}

DBL_TYPE _binding_site_cb(int i, int j, int p, int q) {
    // fprintf(stderr, "cb i:%d j:%d p:%d q:%d\n", i, j, p, q);
    if ((i == g_site_i) && (j == g_site_j) && (p == g_site_p) && (q == g_site_q)) {
        // fprintf(stderr, "cb match\n");
        return g_site_bonus * -.01;
    }

    return 0.;
}

extern int (*binding_cb)(int i, int j, int* d, int* e);
extern DBL_TYPE (*binding_site_cb)(int i, int j, int p, int q);

FullFoldResult* FullFoldWithBindingSite (const std::string& seqString, int site_i, int site_p, int site_j, int site_q, int site_bonus) {
    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();

    int seqNum[MAXSEQLENGTH+1];
    int tmpLength;
    dnaStructures mfeStructs = {NULL, 0, 0, 0, 0};
    int j;

    tmpLength = strlen(string);
    convertSeq(string, seqNum, tmpLength);

    // activate binding site callbacks
    binding_cb = _binding_cb;
    binding_site_cb = _binding_site_cb;
    g_site_i = site_i;
    g_site_p = site_p;
    g_site_j = site_j;
    g_site_q = site_q;
    g_site_bonus = site_bonus;
    double energy = mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
                            DANGLETYPE, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
                            USE_LONG_HELIX_FOR_SALT_CORRECTION);
    // clean up
    binding_site_cb = NULL;
    binding_cb = NULL;

    FullFoldResult* result = new FullFoldResult();

    for (j = 0; j < mfeStructs.seqlength; j++) {
        if (mfeStructs.validStructs[0].theStruct[j] > j) {
            result->structure.push_back('(');
        } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
            result->structure.push_back('.');
        } else {
            result->structure.push_back(')');
        }

    }

    result->mfe = mfeStructs.validStructs[0].correctedEnergy;
    clearDnaStructures(&mfeStructs);

    return result;
}

FullFoldResult* CoFoldSequence (double temperature_in, const std::string& seqString, const std::string& structString) {
    auto autoSeqString = MakeCString(seqString);
    auto autoStructure = MakeCString(structString);

    char* string = autoSeqString.get();
    char* structure = autoStructure.get();

    int seqNum[MAXSEQLENGTH+1];
    int tmpLength;
    dnaStructures mfeStructs = {NULL, 0, 0, 0, 0};
    DBL_TYPE mfe;
    int j;
    char* pc;

    do {
        pc = strchr(string, '&');
        if (pc) (*pc) = '+';
    } while(pc);
    if (0) TraceJS(string);

    tmpLength = strlen(string);
    convertSeq(string, seqNum, tmpLength);

    FullFoldResult* result = new FullFoldResult();
    result->mfe = mfe;
    result->structure = structure;

    mfe = mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
                         DANGLETYPE, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
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
    strcpy(constraints, structure);
    for (pc = string, i = 0, j = 0; (*pc); pc++ ) {
        if ((*pc) == '+') {
            structure[j++] = '&';
        } else {
            structure[j++] = constraints[i++];
        }
    }
    structure[j] = 0;
    result->mfe = mfeStructs.validStructs[0].correctedEnergy;
    clearDnaStructures(&mfeStructs);
    free(constraints);

    return result;
}