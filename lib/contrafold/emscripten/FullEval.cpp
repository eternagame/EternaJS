#include <cstdlib>
#include <cstdio>
#include <cstring>
#include <cmath>

#include "FullEval.h"
#include "EmscriptenUtils.h"

#include "../contrafold/src/Defaults.ipp"
#include "../contrafold/src/InferenceEngine.hpp"
#include "../contrafold/src/ParameterManager.ipp"
#include "nnfe_eval.h"

static FullEvalResult* gEvalResult = NULL;

// a callback that fills the array above with localized free energy contributions
// static void _eos_cb(int index, int fe) {
//     if (gEvalResult != NULL) {
//         if (index < 0) {
// #ifdef WATER_MOD
//             if (index == -2) fe += water_mod;
// #endif
//             int to_insert[] = { index, fe };
//             gEvalResult->nodes.insert(gEvalResult->nodes.begin(), to_insert, to_insert + 2);
//         } else {
//             gEvalResult->nodes.push_back(index);
//             gEvalResult->nodes.push_back(fe);
//         }
//     }
// }

void _eos_cb(int index, int fe) {
    if (gEvalResult != NULL) {
        if (index < 0) {
            int to_insert[] = { index-1, fe }; // shift indices from 1-based to 0-based
            gEvalResult->nodes.insert(gEvalResult->nodes.begin(), to_insert, to_insert + 2);
        } else {
            gEvalResult->nodes.push_back(index - 1); // shift indices from 1-based to 0-based
            gEvalResult->nodes.push_back(fe);
        }
    }
}

extern void (*eos_cb)(int index, int fe);

FullEvalResult* FullEval (int temperature_in, const std::string& seqString, const std::string& structString) {

    double energy;
    FullEvalResult* result = new FullEvalResult();

    gEvalResult = result; // set the collecting array
    eos_cb = _eos_cb; // activate the callback

    // printf("struct string: %s\n", structString.c_str());
    energy = eval(seqString, structString, false) / -100.0;

    // clean up
    eos_cb = NULL;
    gEvalResult = NULL;

    result->energy = energy;
    return result;
}



FullFoldResult* FullFoldDefault (const std::string& seqString, double const gamma) {

    ParameterManager<float> parameter_manager;
    InferenceEngine<float> inference_engine(false);
    inference_engine.RegisterParameters(parameter_manager);
    // ComputationEngine<float> computation_engine(options, descriptions, inference_engine, parameter_manager);
    // ComputationWrapper<float> computation_wrapper(computation_engine);

    SStruct sstruct;
    sstruct.LoadString(seqString);
    inference_engine.LoadSequence(sstruct);

    std::vector<float> w;
    // const std::vector<RealT> w(shared.w, shared.w + parameter_manager.GetNumLogicalParameters());
    // inference_engine.LoadValues(w * shared.log_base);
    w = GetDefaultComplementaryValues<float>();
    inference_engine.LoadValues(w);// * 2.71);


    inference_engine.ComputeInside();
    // float logZ_unconstrained = inference_engine.ComputeLogPartitionCoefficient();

    // MEA
    // inference_engine.ComputeOutside();
    // inference_engine.ComputePosterior();
    // SStruct solution(sstruct);
    // solution.SetMapping(inference_engine.PredictPairingsPosterior(gamma));

    // MFE
    inference_engine.ComputeViterbi();
    SStruct solution(sstruct);
    solution.SetMapping(inference_engine.PredictPairingsViterbi());


    FullFoldResult* result = new FullFoldResult();
    result->structure = solution.ConvertMappingToParens(solution.GetMapping()).substr(1);
    // std::cout << "result structure " << result->structure << std::endl;

    // Now use a constraint to this sequence to produce the energy.
    inference_engine.LoadSequence(solution);
    inference_engine.UseConstraints(solution.GetMapping());
    inference_engine.ComputeInside();

    result->mfe = 0 - inference_engine.ComputeLogPartitionCoefficient();
    return result;
}

FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& seqString, double const gamma) {
    return FullFoldDefault(seqString, gamma);
}

#if false
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

#endif
