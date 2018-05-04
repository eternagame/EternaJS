/*
  DNAGlobals.c is part of the NUPACK software suite
  Copyright (c) 2007 Caltech. All rights reserved.
  Coded by: Robert Dirks 3/2006, Justin Bois 1/2007

  Global variables describing fundamental properties of DNA, such as
  base types, dangles, etc.
*/
#include "pfuncUtilsHeader.h"

int mfe_sort_method = 0;
int NUPACK_VALIDATE = 0;
int NupackShowHelp = 0;

DBL_TYPE Stack[36];
DBL_TYPE loop37[90];
int tloops[6*4096];//has tetra loop sequences+cp, (6 ints per tetra loop)
DBL_TYPE tloop_energy[ 4096]; //energies of tetraloops
int triloops[5*1024]; //triloops equences + closing pairs
DBL_TYPE triloop_energy[ 2048]; //number of triloops

//Mismatch energies  (see functions.h)
DBL_TYPE MMEnergiesHP[6*16];
DBL_TYPE MMEnergiesIL[256];
DBL_TYPE IL_SInt2[16*36]; //Symmetric Interior Loops, size 2
DBL_TYPE IL_SInt4[256*36]; // Symmetric Interior Loops, size 4
DBL_TYPE IL_AsInt1x2[64*36]; // Asymmetric Interior Loop, size 3
DBL_TYPE dangle_energy[48]; // Dangle Energies
DBL_TYPE asymmetry_penalty[4]; // Asymmetric loop penalties
DBL_TYPE max_asymmetry;
long int maxGapIndex;
DBL_TYPE *sizeTerm;
DBL_TYPE BIMOLECULAR;

DBL_TYPE AT_PENALTY;
DBL_TYPE POLYC3;
DBL_TYPE POLYCSLOPE;
DBL_TYPE POLYCINT;
DBL_TYPE ALPHA_1; //multiloop penalties
DBL_TYPE ALPHA_2;
DBL_TYPE ALPHA_3;
DBL_TYPE BETA_1; //pseudoknot penalties
DBL_TYPE BETA_2;
DBL_TYPE BETA_3;
DBL_TYPE BETA_1M;
DBL_TYPE BETA_1P;

DBL_TYPE SODIUM_CONC;
DBL_TYPE MAGNESIUM_CONC;
int USE_LONG_HELIX_FOR_SALT_CORRECTION;
DBL_TYPE SALT_CORRECTION;
DBL_TYPE TEMP_K;
int DANGLETYPE;
int DNARNACOUNT;
int DO_PSEUDOKNOTS;
int ONLY_ONE_MFE;
int USE_MFE;

DBL_TYPE *pairPr;
DBL_TYPE *pairPrPbg;
DBL_TYPE *pairPrPb;

DBL_TYPE * EXTERN_QB = NULL;
DBL_TYPE * EXTERN_Q = NULL;

char PARAM_FILE[100]="";

int nupack_sample = 0;
int nupack_num_samples = 0;
