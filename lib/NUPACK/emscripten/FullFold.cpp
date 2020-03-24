#include "FullFold.h"
#include "EmscriptenUtils.h"

#include "src/thermo/utils/pfuncUtilsConstants.h"
#include "src/thermo/utils/pfuncUtilsHeader.h"
#include "src/shared/utilsHeader.h"
#include "src/thermo/utils/DNAExternals.h"
#include <vector>
#include <utility>

FullFoldResult* FullFoldDefault (const std::string& seqString, bool const pseudoknotted = false) {
    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();

    int seqNum[MAXSEQLENGTH+1];
    int tmpLength = strlen(string);
    dnaStructures mfeStructs = {NULL, 0, 0, 0, 0};

    convertSeq(string, seqNum, tmpLength);

    if ( pseudoknotted ) {
        mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 5, RNA,
                        1 /*DANGLETYPE*/, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
                        USE_LONG_HELIX_FOR_SALT_CORRECTION);
    } else {
        mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
                        1 /*DANGLETYPE*/, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
                        USE_LONG_HELIX_FOR_SALT_CORRECTION);
    }

    FullFoldResult* result = new FullFoldResult();
    result->mfe = mfeStructs.validStructs[0].correctedEnergy;

    for (int j = 0; j < mfeStructs.seqlength; j++) {
        // AMW TODO: pairs-to-dbn here
        if (mfeStructs.validStructs[0].theStruct[j] > j) {
            result->structure.push_back('(');
        } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
            result->structure.push_back('.');
        } else {
            result->structure.push_back(')');
        }
    }

    clearDnaStructures(&mfeStructs);

    return result;
}

FullFoldResult* FullFoldTemperature(double temperature_in, const std::string& seqString, bool const pseudoknotted = false) {
    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();

    int seqNum[MAXSEQLENGTH+1];
    int tmpLength = strlen(string);
    dnaStructures mfeStructs = {NULL, 0, 0, 0, 0};

    convertSeq(string, seqNum, tmpLength);

    // Note: perversely, though most conditionals suggest that >=5 is pseudoknotted,
    // in fact 6 is totally broken. The magic number is five. I take no pleasure in
    // reporting this.
    if ( pseudoknotted ) {
        mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 5, RNA,
                        1 /*DANGLETYPE*/, temperature_in, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
                        USE_LONG_HELIX_FOR_SALT_CORRECTION);
    } else {
        mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
                        1 /*DANGLETYPE*/, temperature_in, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
                        USE_LONG_HELIX_FOR_SALT_CORRECTION);
    }

    FullFoldResult* result = new FullFoldResult();
    result->mfe = mfeStructs.validStructs[0].correctedEnergy;

    if ( pseudoknotted ) {
        // given partner-style array, writes dot-parens notation string. handles pseudoknots!
        // example of partner-style array: '((.))' -> [4,3,-1,1,0]

        std::vector< std::pair< int, int > > bps;
        for (int ii = 0; ii < mfeStructs.seqlength; ++ii) {
            if (mfeStructs.validStructs[0].theStruct[ii] != -1 && mfeStructs.validStructs[0].theStruct[ii] > ii) {
                bps.push_back( std::make_pair( ii, mfeStructs.validStructs[0].theStruct[ii]) );
            }
        }
        
        std::vector< std::vector< std::pair< int, int > > > stems;
        // #bps: list of bp lists
        // # i.e. '((.))' is [[0,4],[1,3]]
        // # Returns list of (list of bp lists), now sorted into stems
        // # i.e. [ list of all bps in stem 1, list of all bps in stem 2]
        //if debug: print(bps)
        for (int ii = 0; ii < bps.size(); ++ii ) {
            bool added = false;
            for (int jj = 0; jj < stems.size(); ++jj) {
                // is this bp adjacent to any element of an existing stem?
                for (int kk = 0; kk < stems[jj].size(); ++kk) {
                    if ((bps[ii].first - 1 == stems[jj][kk].first && bps[ii].second + 1 == stems[jj][kk].second) ||
                            (bps[ii].first + 1 == stems[jj][kk].first && bps[ii].second - 1 == stems[jj][kk].second) ||
                            (bps[ii].first - 1 == stems[jj][kk].second && bps[ii].second + 1 == stems[jj][kk].first) ||
                            (bps[ii].first + 1 == stems[jj][kk].second && bps[ii].second - 1 == stems[jj][kk].first)) {
                        // add to this stem
                        stems[jj].push_back(bps[ii]);
                        added = true;
                        break;
                    }
                }
                if (added) break;
            }
            if (!added) {
                stems.push_back(std::vector< std::pair< int, int > >( 1, bps[ii] ) );
            }
        }
       
        std::string dbn( mfeStructs.seqlength, '.' );
        std::vector< char > chars_L{ '(', '{', '[', '<' };
        std::vector< char > chars_R{ ')', '}', ']', '>' };
        if ( !stems.empty() ) {
            for (int ii = 0; ii < stems.size(); ++ii ) {
                auto const & stem = stems[ii];
                
                size_t pk_ctr = 0;
                std::string substring = dbn.substr(stem[0].first+1,stem[0].second);
                //check to see how many delimiter types exist in between where stem is going to go
                // ah -- it's actually how many delimiters are only half-present, I think.
                while ( ( substring.find(chars_L[pk_ctr]) != std::string::npos && substring.find(chars_R[pk_ctr]) == std::string::npos )
                        || ( substring.find(chars_L[pk_ctr]) == std::string::npos && substring.find(chars_R[pk_ctr]) != std::string::npos ) ) {
                    pk_ctr += 1;
                }
                for (int jj = 0; jj < stem.size(); ++jj ) {
                    int i = stem[jj].first;
                    int j = stem[jj].second;
                    
                    dbn[i] = chars_L[pk_ctr];
                    dbn[j] = chars_R[pk_ctr];
                }
            }
        }
        for (int j = 0; j < mfeStructs.seqlength; j++) {
            result->structure.push_back(dbn[j]);
        }
    } else {
        for (int j = 0; j < mfeStructs.seqlength; j++) {
            if (mfeStructs.validStructs[0].theStruct[j] > j) {
                result->structure.push_back('(');
            } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
                result->structure.push_back('.');
            } else {
                result->structure.push_back(')');
            }
        }
    }

    clearDnaStructures(&mfeStructs);

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
    mfeFullWithSym(seqNum, tmpLength, &mfeStructs, 3, RNA,
                   1 /*DANGLETYPE*/, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
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

FullFoldResult* CoFoldSequence (const std::string& seqString) {
    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();

    int seqNum[MAXSEQLENGTH+1];
    dnaStructures mfeStructs = {NULL, 0, 0, 0, 0};
    int i, j;
    char* pc;

    do {
        pc = strchr(string, '&');
        if (pc) (*pc) = '+';
    } while(pc);

    int seqLength = strlen(string);
    convertSeq(string, seqNum, seqLength);

    mfeFullWithSym(seqNum, seqLength, &mfeStructs, 3, RNA,
                   1 /*DANGLETYPE*/, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
                   USE_LONG_HELIX_FOR_SALT_CORRECTION);

    std::string outStructure;
    for (j = 0; j < mfeStructs.seqlength; j++) {
        if (mfeStructs.validStructs[0].theStruct[j] > j) {
            outStructure.push_back('(');
        } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
            outStructure.push_back('.');
        } else {
            outStructure.push_back(')');
        }
    }

    std::string constraints = outStructure;
    for (pc = string, i = 0, j = 0; (*pc); pc++, j++) {
        auto value = ((*pc) == '+' ? '&' : constraints[i++]);
        if (j < outStructure.length()) {
            outStructure[j] = value;
        } else {
            outStructure.push_back(value);
        }
    }

    FullFoldResult* result = new FullFoldResult();
    result->mfe = mfeStructs.validStructs[0].correctedEnergy;
    result->structure = outStructure;

    clearDnaStructures(&mfeStructs);

    return result;
}

FullFoldResult* CoFoldSequenceWithBindingSite (const std::string& seqString, int site_i, int site_p, int site_j, int site_q, int site_bonus) {
    auto autoSeqString = MakeCString(seqString);
    char* string = autoSeqString.get();

    int seqNum[MAXSEQLENGTH+1];
    dnaStructures mfeStructs = {NULL, 0, 0, 0, 0};
    int i, j;

    char* pc;
    do {
        pc = strchr(string, '&');
        if (pc) (*pc) = '+';
    } while(pc);

    int seqLength = strlen(string);
    convertSeq(string, seqNum, seqLength);

    // activate binding site callbacks
    binding_cb = _binding_cb;
    binding_site_cb = _binding_site_cb;
    g_site_i = site_i;
    g_site_p = site_p;
    g_site_j = site_j;
    g_site_q = site_q;
    g_site_bonus = site_bonus;
    mfeFullWithSym(seqNum, seqLength, &mfeStructs, 3, RNA,
                   1 /*DANGLETYPE*/, 37, TRUE, 1, SODIUM_CONC, MAGNESIUM_CONC,
                   USE_LONG_HELIX_FOR_SALT_CORRECTION);
    // clean up
    binding_site_cb = NULL;
    binding_cb = NULL;

    std::string outStructure;
    for (j = 0; j < mfeStructs.seqlength; j++) {
        if (mfeStructs.validStructs[0].theStruct[j] > j) {
            outStructure.push_back('(');
        } else if( mfeStructs.validStructs[0].theStruct[j] == -1) {
            outStructure.push_back('.');
        } else {
            outStructure.push_back(')');
        }
    }

    std::string constraints = outStructure;
    for (pc = string, i = 0, j = 0; (*pc); pc++, j++) {
        auto value = ((*pc) == '+' ? '&' : constraints[i++]);
        if (j < outStructure.length()) {
            outStructure[j] = value;
        } else {
            outStructure.push_back(value);
        }
    }

    FullFoldResult* result = new FullFoldResult();
    result->mfe = mfeStructs.validStructs[0].correctedEnergy;
    result->structure = outStructure;

    clearDnaStructures(&mfeStructs);

    return result;
}
