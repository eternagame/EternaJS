/** \file **/

/*
                  minimum free energy
                  RNA secondary structure prediction

                  c Ivo Hofacker, Chrisoph Flamm
                  original implementation by
                  Walter Fontana
                  g-quadruplex support and threadsafety
                  by Ronny Lorenz

                  Vienna RNA package
*/

#include "config.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <ctype.h>
#include <string.h>
#include <limits.h>

#include "utils.h"
#include "energy_par.h"
#include "fold_vars.h"
#include "pair_mat.h"
#include "params.h"
#include "loop_energies.h"
#include "data_structures.h"
#include "gquad.h"
#include "fold.h"

#ifdef _OPENMP
#include <omp.h>
#endif


#define PAREN
#define STACK_BULGE1      1       /* stacking energies for bulges of size 1 */
#define NEW_NINIO         1       /* new asymetry penalty */
#define MAXSECTORS        500     /* dimension for a backtrack array */
#define LOCALITY          0.      /* locality parameter for base-pairs */

#define SAME_STRAND(I,J)  (((I)>=cut_point)||((J)<cut_point))

/*
#################################
# GLOBAL VARIABLES              #
#################################
*/
PUBLIC  int logML     = 0;  /* if nonzero use logarithmic ML energy in energy_of_struct */
PUBLIC  int uniq_ML   = 0;  /* do ML decomposition uniquely (for subopt) */
PUBLIC  int cut_point = -1; /* set to first pos of second seq for cofolding */
PUBLIC  int eos_debug = 0;  /* verbose info from energy_of_struct */

PUBLIC  int estimate_mode = 0; /* EteRNA labs */

// JEEFIX binding site spec
PUBLIC int binding_site_i = -1;
PUBLIC int binding_site_j = -1;
PUBLIC int binding_site_p = -1;
PUBLIC int binding_site_q = -1;
PUBLIC int binding_site_bonus = 0;

/*
#################################
# PRIVATE VARIABLES             #
#################################
*/
PRIVATE int     *indx     = NULL; /* index for moving in the triangle matrices c[] and fMl[]*/
PRIVATE int     *c        = NULL; /* energy array, given that i-j pair */
PRIVATE int     *cc       = NULL; /* linear array for calculating canonical structures */
PRIVATE int     *cc1      = NULL; /*   "     "        */
PRIVATE int     *f5       = NULL; /* energy of 5' end */
PRIVATE int     *f53      = NULL; /* energy of 5' end with 3' nucleotide not available for mismatches */
PRIVATE int     *fML      = NULL; /* multi-loop auxiliary energy array */
PRIVATE int     *fM1      = NULL; /* second ML array, only for subopt */
PRIVATE int     *fM2      = NULL; /* fM2 = multiloop region with exactly two stems, extending to 3' end        */
PRIVATE int     *Fmi      = NULL; /* holds row i of fML (avoids jumps in memory) */
PRIVATE int     *DMLi     = NULL; /* DMLi[j] holds MIN(fML[i,k]+fML[k+1,j])  */
PRIVATE int     *DMLi1    = NULL; /*             MIN(fML[i+1,k]+fML[k+1,j])  */
PRIVATE int     *DMLi2    = NULL; /*             MIN(fML[i+2,k]+fML[k+1,j])  */
PRIVATE int     *DMLi_a   = NULL; /* DMLi_a[j] holds min energy for at least two multiloop stems in [i,j], where j is available for dangling onto a surrounding stem */
PRIVATE int     *DMLi_o   = NULL; /* DMLi_o[j] holds min energy for at least two multiloop stems in [i,j], where j is unavailable for dangling onto a surrounding stem */
PRIVATE int     *DMLi1_a  = NULL;
PRIVATE int     *DMLi1_o  = NULL;
PRIVATE int     *DMLi2_a  = NULL;
PRIVATE int     *DMLi2_o  = NULL;
PRIVATE int     Fc, FcH, FcI, FcM;  /* parts of the exterior loop energies */
PRIVATE sect    sector[MAXSECTORS]; /* stack of partial structures for backtracking */
PRIVATE char    *ptype = NULL;      /* precomputed array of pair types */
PRIVATE short   *S = NULL, *S1 = NULL;
PRIVATE paramT  *P          = NULL;
PRIVATE int     init_length = -1;
PRIVATE int     *BP = NULL; /* contains the structure constrainsts: BP[i]
                        -1: | = base must be paired
                        -2: < = base must be paired with j<i
                        -3: > = base must be paired with j>i
                        -4: x = base must not pair
                        positive int: base is paired with int      */
PRIVATE short   *pair_table         = NULL; /* needed by energy of struct */
PRIVATE bondT   *base_pair2         = NULL; /* this replaces base_pair from fold_vars.c */
PRIVATE int     circular            = 0;
PRIVATE int     struct_constrained  = 0;
PRIVATE int     with_gquad          = 0;

PRIVATE int     *ggg = NULL;    /* minimum free energies of the gquadruplexes */

#ifdef _OPENMP

#pragma omp threadprivate(indx, c, cc, cc1, f5, f53, fML, fM1, fM2, Fmi,\
                          DMLi, DMLi1, DMLi2, DMLi_a, DMLi_o, DMLi1_a, DMLi1_o, DMLi2_a, DMLi2_o,\
                          Fc, FcH, FcI, FcM,\
                          sector, ptype, S, S1, P, init_length, BP, pair_table, base_pair2, circular, struct_constrained,\
                          ggg, with_gquad)

#endif

/*
#################################
# PRIVATE FUNCTION DECLARATIONS #
#################################
*/
PRIVATE void  get_arrays(unsigned int size);
PRIVATE int   stack_energy(int i, const char *string, int verbostiy_level);
PRIVATE int   energy_of_extLoop_pt(int i, short *pair_table);
PRIVATE int   energy_of_ml_pt(int i, short *pt);
PRIVATE int   ML_Energy(int i, int is_extloop);
PRIVATE void  make_ptypes(const short *S, const char *structure, paramT *P);
PRIVATE void  backtrack(const char *sequence, int s);
PRIVATE int   fill_arrays(const char *sequence);
PRIVATE void  fill_arrays_circ(const char *string, int *bt);
PRIVATE void  init_fold(int length, paramT *parameters);
/* needed by cofold/eval */
PRIVATE int   cut_in_loop(int i);

/* deprecated functions */
/*@unused@*/
int oldLoopEnergy(int i, int j, int p, int q, int type, int type_2);
int LoopEnergy(int n1, int n2, int type, int type_2, int si1, int sj1, int sp1, int sq1);
int HairpinE(int size, int type, int si1, int sj1, const char *string);

/* EteRNA (binding site) */
int E_IntLoopNew(int n1, int n2, int type, int type_2, int si1, int sj1, int sp1, int sq1,
                 int index_i, int index_p, int index_j, int index_q, paramT* P);

/*
#################################
# BEGIN OF FUNCTION DEFINITIONS #
#################################
*/

/* allocate memory for folding process */
PRIVATE void init_fold(int length, paramT *parameters){

#ifdef _OPENMP
/* Explicitly turn off dynamic threads */
  omp_set_dynamic(0);
#endif

  if (length<1) nrerror("initialize_fold: argument must be greater 0");
  free_arrays();
  get_arrays((unsigned) length);
  init_length=length;

  indx = get_indx((unsigned)length);

  update_fold_params_par(parameters);
}

/*--------------------------------------------------------------------------*/

PRIVATE void get_arrays(unsigned int size){
  if(size >= (unsigned int)sqrt((double)INT_MAX))
    nrerror("get_arrays@fold.c: sequence length exceeds addressable range");

  c     = (int *) space(sizeof(int)*((size*(size+1))/2+2));
  fML   = (int *) space(sizeof(int)*((size*(size+1))/2+2));
  if (uniq_ML)
    fM1 = (int *) space(sizeof(int)*((size*(size+1))/2+2));

  ptype = (char *)space(sizeof(char)*((size*(size+1))/2+2));
  f5    = (int *) space(sizeof(int)*(size+2));
  f53   = (int *) space(sizeof(int)*(size+2));
  cc    = (int *) space(sizeof(int)*(size+2));
  cc1   = (int *) space(sizeof(int)*(size+2));
  Fmi   = (int *) space(sizeof(int)*(size+1));
  DMLi  = (int *) space(sizeof(int)*(size+1));
  DMLi1 = (int *) space(sizeof(int)*(size+1));
  DMLi2 = (int *) space(sizeof(int)*(size+1));

  DMLi_a  = (int *) space(sizeof(int)*(size+1));
  DMLi_o  = (int *) space(sizeof(int)*(size+1));
  DMLi1_a = (int *) space(sizeof(int)*(size+1));
  DMLi1_o = (int *) space(sizeof(int)*(size+1));
  DMLi2_a = (int *) space(sizeof(int)*(size+1));
  DMLi2_o = (int *) space(sizeof(int)*(size+1));

  base_pair2 = (bondT *) space(sizeof(bondT)*(1+size/2));

  /* extra array(s) for circfold() */
  if(circular) fM2 =  (int *) space(sizeof(int)*(size+2));
}

/*--------------------------------------------------------------------------*/

PUBLIC void free_arrays(void){
  if(indx)      free(indx);
  if(c)         free(c);
  if(fML)       free(fML);
  if(f5)        free(f5);
  if(f53)       free(f53);
  if(cc)        free(cc);
  if(cc1)       free(cc1);
  if(ptype)     free(ptype);
  if(fM1)       free(fM1);
  if(fM2)       free(fM2);
  if(base_pair2) free(base_pair2);
  if(Fmi)       free(Fmi);
  if(DMLi)      free(DMLi);
  if(DMLi1)     free(DMLi1);
  if(DMLi2)     free(DMLi2);
  if(DMLi_a)    free(DMLi_a);
  if(DMLi_o)    free(DMLi_o);
  if(DMLi1_a)   free(DMLi1_a);
  if(DMLi1_o)   free(DMLi1_o);
  if(DMLi2_a)   free(DMLi2_a);
  if(DMLi2_o)   free(DMLi2_o);
  if(P)         free(P);
  if(ggg)       free(ggg);

  indx = c = fML = f5 = f53 = cc = cc1 = fM1 = fM2 = Fmi = DMLi = DMLi1 = DMLi2 = ggg = NULL;
  DMLi_a = DMLi_o = DMLi1_a = DMLi1_o = DMLi2_a = DMLi2_o = NULL;
  ptype       = NULL;
  base_pair   = NULL;
  base_pair2  = NULL;
  P           = NULL;
  init_length = 0;
}

/*--------------------------------------------------------------------------*/

PUBLIC void export_fold_arrays( int **f5_p,
                                int **c_p,
                                int **fML_p,
                                int **fM1_p,
                                int **indx_p,
                                char **ptype_p){
  /* make the DP arrays available to routines such as subopt() */
  *f5_p     = f5;
  *c_p      = c;
  *fML_p    = fML;
  *fM1_p    = fM1;
  *indx_p   = indx;
  *ptype_p  = ptype;
}

PUBLIC void export_fold_arrays_par( int **f5_p,
                                    int **c_p,
                                    int **fML_p,
                                    int **fM1_p,
                                    int **indx_p,
                                    char **ptype_p,
                                    paramT **P_p){
  export_fold_arrays(f5_p, c_p, fML_p, fM1_p, indx_p,ptype_p);
  *P_p = P;
}

PUBLIC void export_circfold_arrays( int *Fc_p,
                                    int *FcH_p,
                                    int *FcI_p,
                                    int *FcM_p,
                                    int **fM2_p,
                                    int **f5_p,
                                    int **c_p,
                                    int **fML_p,
                                    int **fM1_p,
                                    int **indx_p,
                                    char **ptype_p){
  /* make the DP arrays available to routines such as subopt() */
  *f5_p     = f5;
  *c_p      = c;
  *fML_p    = fML;
  *fM1_p    = fM1;
  *fM2_p    = fM2;
  *Fc_p     = Fc;
  *FcH_p    = FcH;
  *FcI_p    = FcI;
  *FcM_p    = FcM;
  *indx_p   = indx;
  *ptype_p  = ptype;
}

PUBLIC void export_circfold_arrays_par( int *Fc_p,
                                    int *FcH_p,
                                    int *FcI_p,
                                    int *FcM_p,
                                    int **fM2_p,
                                    int **f5_p,
                                    int **c_p,
                                    int **fML_p,
                                    int **fM1_p,
                                    int **indx_p,
                                    char **ptype_p,
                                    paramT **P_p){
  export_circfold_arrays(Fc_p, FcH_p, FcI_p, FcM_p, fM2_p, f5_p, c_p, fML_p, fM1_p, indx_p, ptype_p);
  *P_p = P;
}
/*--------------------------------------------------------------------------*/


PUBLIC float fold(const char *string, char *structure){
  return fold_par(string, structure, NULL, fold_constrained, 0);
}

PUBLIC float circfold(const char *string, char *structure){
  return fold_par(string, structure, NULL, fold_constrained, 1);
}

PUBLIC float fold_par(const char *string,
                      char *structure,
                      paramT *parameters,
                      int is_constrained,
                      int is_circular){

  int i, length, energy, bonus, bonus_cnt, s;

  bonus               = 0;
  bonus_cnt           = 0;
  s                   = 0;
  circular            = is_circular;
  struct_constrained  = is_constrained;
  length              = (int) strlen(string);

#ifdef _OPENMP
  init_fold(length, parameters);
#else
  if (parameters) init_fold(length, parameters);
  else if (length>init_length) init_fold(length, parameters);
  else if (fabs(P->temperature - temperature)>1e-6) update_fold_params();
#endif

  with_gquad  = P->model_details.gquad;
  S           = encode_sequence(string, 0);
  S1          = encode_sequence(string, 1);
  BP          = (int *)space(sizeof(int)*(length+2));
  if(with_gquad){ /* add a guess of how many G's may be involved in a G quadruplex */
    if(base_pair2)
      free(base_pair2);
    base_pair2 = (bondT *) space(sizeof(bondT)*(4*(1+length/2)));
  }

  make_ptypes(S, structure, P);

  energy = fill_arrays(string);

  if(circular){
    fill_arrays_circ(string, &s);
    energy = Fc;
  }
  backtrack(string, s);

#ifdef PAREN
  parenthesis_structure(structure, base_pair2, length);
#else
  letter_structure(structure, base_pair2, length);
#endif

  /*
  *  Backward compatibility:
  *  This block may be removed if deprecated functions
  *  relying on the global variable "base_pair" vanishs from within the package!
  */
  base_pair = base_pair2;
  /*
  {
    if(base_pair) free(base_pair);
    base_pair = (bondT *)space(sizeof(bondT) * (1+length/2));
    memcpy(base_pair, base_pair2, sizeof(bondT) * (1+length/2));
  }
  */

  if (!estimate_mode) {
    /* check constraints */
    for(i=1;i<=length;i++) {
      if((BP[i]<0)&&(BP[i]>-4)) {
        bonus_cnt++;
        if((BP[i]==-3)&&(structure[i-1]==')')) bonus++;
        if((BP[i]==-2)&&(structure[i-1]=='(')) bonus++;
        if((BP[i]==-1)&&(structure[i-1]!='.')) bonus++;
      }

      if(BP[i]>i) {
        int l;
        bonus_cnt++;
        for(l=1; l<=base_pair2[0].i; l++)
          if(base_pair2[l].i != base_pair2[l].j)
            if((i==base_pair2[l].i)&&(BP[i]==base_pair2[l].j)) bonus++;
      }
    }
  }

  if (bonus_cnt>bonus) fprintf(stderr,"\ncould not enforce all constraints\n");
  bonus*=BONUS;

  free(S); free(S1); free(BP);

  energy += bonus;      /*remove bonus energies from result */

  if (backtrack_type=='C')
    return (float) c[indx[length]+1]/100.;
  else if (backtrack_type=='M')
    return (float) fML[indx[length]+1]/100.;
  else
    return (float) energy/100.;
}

/// JEEFIX
float fold_with_binding_site(const char *string, char *structure, int i, int p, int j, int q, int bonus) {
  binding_site_i = i;
  binding_site_j = j;
  binding_site_p = p;
  binding_site_q = q;
  binding_site_bonus = bonus;

  float e = fold(string,structure);
  binding_site_i = -1;
  binding_site_j = -1;
  binding_site_p = -1;
  binding_site_q = -1;
  binding_site_bonus = 0;
  return e;
}
                        
/**
*** fill "c", "fML" and "f5" arrays and return  optimal energy
**/
PRIVATE int fill_arrays(const char *string) {

  int   i, j, k, length, energy, en, mm5, mm3;
  int   decomp, new_fML, max_separation;
  int   no_close, type, type_2, tt;
  int   bonus=0;
  
  int   dangle_model, noGUclosure, with_gquads;

  dangle_model  = P->model_details.dangles;
  noGUclosure   = P->model_details.noGUclosure;

  length = (int) strlen(string);

  max_separation = (int) ((1.-LOCALITY)*(double)(length-2)); /* not in use */

  if(with_gquad)
    ggg = get_gquad_matrix(S, P);


  for (j=1; j<=length; j++) {
    Fmi[j]=DMLi[j]=DMLi1[j]=DMLi2[j]=INF;
  }

  for (j = 1; j<=length; j++)
    for (i=(j>TURN?(j-TURN):1); i<j; i++) {
      c[indx[j]+i] = fML[indx[j]+i] = INF;
      if (uniq_ML) fM1[indx[j]+i] = INF;
    }

  if (length <= TURN) return 0;

  for (i = length-TURN-1; i >= 1; i--) { /* i,j in [1..length] */

    for (j = i+TURN+1; j <= length; j++) {
      int p, q, ij, jj, ee;
      int minq, maxq, l1, up, c0, c1, c2, c3;
      int MLenergy;
      ij = indx[j]+i;
      bonus = 0;
      type = ptype[ij];
      energy = INF;
      /* enforcing structure constraints */
      if (estimate_mode) {
        if(BP[i] < 0) bonus += BONUS * BP[i];
        if(BP[j] < 0) bonus += BONUS * BP[j];
        if(BP[i] > 0) bonus += BONUS * BP[i];
        if(BP[j] > 0) bonus += BONUS * BP[j];
      } else {
        if ((BP[i]==j)||(BP[i]==-1)||(BP[i]==-2)) bonus -= BONUS;
        if ((BP[j]==-1)||(BP[j]==-3)) bonus -= BONUS;
        if ((BP[i]==-4)||(BP[j]==-4)) type=0;
      }

      no_close = (((type==3)||(type==4))&&noGUclosure&&(bonus==0));

      if (j-i-1 > max_separation) type = 0;  /* forces locality degree */

      if (type) {   /* we have a pair */
        int new_c=0, stackEnergy=INF;
        /* hairpin ----------------------------------------------*/

        new_c = (no_close) ? FORBIDDEN : E_Hairpin(j-i-1, type, S1[i+1], S1[j-1], string+i-1, P);

        /*--------------------------------------------------------
          check for elementary structures involving more than one
          closing pair.
          --------------------------------------------------------*/

        for (p = i+1; p <= MIN2(j-2-TURN,i+MAXLOOP+1) ; p++) {
          minq = j-i+p-MAXLOOP-2;
          if (minq<p+1+TURN) minq = p+1+TURN;
          for (q = minq; q < j; q++) {
            type_2 = ptype[indx[q]+p];

            if (type_2==0) continue;
            type_2 = rtype[type_2];

            if (noGUclosure)
              if (no_close||(type_2==3)||(type_2==4))
                if ((p>i+1)||(q<j-1)) continue;  /* continue unless stack */

            energy = E_IntLoopNew(p-i-1, j-q-1, type, type_2,
                                S1[i+1], S1[j-1], S1[p-1], S1[q+1], i, p, j, q, P);

            ee = energy+c[indx[q]+p];
            new_c = MIN2(new_c, ee);
            if ((p==i+1)&&(j==q+1)) stackEnergy = energy; /* remember stack energy */

          } /* end q-loop */
        } /* end p-loop */
        /* multi-loop decomposition ------------------------*/


        if (!no_close) {
          decomp = DMLi1[j-1];
          tt = rtype[type];
          switch(dangle_model){
            /* no dangles */
            case 0:   decomp += E_MLstem(tt, -1, -1, P);
                      break;

            /* double dangles */
            case 2:   decomp += E_MLstem(tt, S1[j-1], S1[i+1], P);
                      break;

            /* normal dangles, aka dangles = 1 || 3 */
            default:  decomp += E_MLstem(tt, -1, -1, P);
                      decomp = MIN2(decomp, DMLi2[j-1] + E_MLstem(tt, -1, S1[i+1], P) + P->MLbase);
                      decomp = MIN2(decomp, DMLi2[j-2] + E_MLstem(tt, S1[j-1], S1[i+1], P) + 2*P->MLbase);
                      decomp = MIN2(decomp, DMLi1[j-2] + E_MLstem(tt, S1[j-1], -1, P) + P->MLbase);
                      break;
          }
          MLenergy = decomp + P->MLclosing;
          new_c = MIN2(new_c, MLenergy);
        }

        /* coaxial stacking of (i.j) with (i+1.k) or (k+1.j-1) */

        if (dangle_model==3) {
          decomp = INF;
          for (k = i+2+TURN; k < j-2-TURN; k++) {
            type_2 = rtype[ptype[indx[k]+i+1]];
            if (type_2)
              decomp = MIN2(decomp, c[indx[k]+i+1]+P->stack[type][type_2]+fML[indx[j-1]+k+1]);
            type_2 = rtype[ptype[indx[j-1]+k+1]];
            if (type_2)
              decomp = MIN2(decomp, c[indx[j-1]+k+1]+P->stack[type][type_2]+fML[indx[k]+i+1]);
          }
          /* no TermAU penalty if coax stack */
          decomp += 2*P->MLintern[1] + P->MLclosing;
          new_c = MIN2(new_c, decomp);
        }

        if(with_gquad){
          /* include all cases where a g-quadruplex may be enclosed by base pair (i,j) */
          if (!no_close) {
            tt = rtype[type];
            energy = E_GQuad_IntLoop(i, j, type, S1, ggg, indx, P);
            new_c = MIN2(new_c, energy);
          }
        }

        new_c = MIN2(new_c, cc1[j-1]+stackEnergy);
        cc[j] = new_c + bonus;
        if (noLonelyPairs)
          c[ij] = cc1[j-1]+stackEnergy+bonus;
        else
          c[ij] = cc[j];

      } /* end >> if (pair) << */

      else c[ij] = INF;

      /* done with c[i,j], now compute fML[i,j] and fM1[i,j] */

      /* (i,j) + MLstem ? */
      new_fML = INF;
      if(type){
        new_fML = c[ij];
        switch(dangle_model){
          case 2:   new_fML += E_MLstem(type, (i==1) ? S1[length] : S1[i-1], S1[j+1], P);
                    break;
          default:  new_fML += E_MLstem(type, -1, -1, P);
                    break;
        }
      }

      if(with_gquad){
        new_fML = MIN2(new_fML, ggg[indx[j] + i] + E_MLstem(0, -1, -1, P));
      }

      if (uniq_ML){
        fM1[ij] = MIN2(fM1[indx[j-1]+i] + P->MLbase, new_fML);
      }

      /* free ends ? -----------------------------------------*/
      /*  we must not just extend 3'/5' end by unpaired nucleotides if
      *   dangle_model == 1, this could lead to d5+d3 contributions were
      *   mismatch must be taken!
      */
      switch(dangle_model){
        /* no dangles */
        case 0:   new_fML = MIN2(new_fML, fML[ij+1]+P->MLbase);
                  new_fML = MIN2(fML[indx[j-1]+i]+P->MLbase, new_fML);
                  break;

        /* double dangles */
        case 2:   new_fML = MIN2(new_fML, fML[ij+1]+P->MLbase);
                  new_fML = MIN2(fML[indx[j-1]+i]+P->MLbase, new_fML);
                  break;

        /* normal dangles, aka dangle_model = 1 || 3 */
        default:  mm5 = ((i>1) || circular) ? S1[i] : -1;
                  mm3 = ((j<length) || circular) ? S1[j] : -1;
                  new_fML = MIN2(new_fML, fML[ij+1] + P->MLbase);
                  new_fML = MIN2(new_fML, fML[indx[j-1]+i] + P->MLbase);
                  tt = ptype[ij+1];
                  if(tt) new_fML = MIN2(new_fML, c[ij+1] + E_MLstem(tt, mm5, -1, P) + P->MLbase);
                  tt = ptype[indx[j-1]+i];
                  if(tt) new_fML = MIN2(new_fML, c[indx[j-1]+i] + E_MLstem(tt, -1, mm3, P) + P->MLbase);
                  tt = ptype[indx[j-1]+i+1];
                  if(tt) new_fML = MIN2(new_fML, c[indx[j-1]+i+1] + E_MLstem(tt, mm5, mm3, P) + 2*P->MLbase);
                  break;
      }

      /* modular decomposition -------------------------------*/
      for (decomp = INF, k = i + 1 + TURN; k <= j - 2 - TURN; k++)
        decomp = MIN2(decomp, Fmi[k]+fML[indx[j]+k+1]);
      DMLi[j] = decomp;               /* store for use in ML decompositon */
      new_fML = MIN2(new_fML,decomp);

      /* coaxial stacking */
      if (dangle_model==3) {
        /* additional ML decomposition as two coaxially stacked helices */
        for (decomp = INF, k = i+1+TURN; k <= j-2-TURN; k++) {
          type = ptype[indx[k]+i]; type = rtype[type];
          type_2 = ptype[indx[j]+k+1]; type_2 = rtype[type_2];
          if (type && type_2)
            decomp = MIN2(decomp,
                          c[indx[k]+i]+c[indx[j]+k+1]+P->stack[type][type_2]);
        }

        decomp += 2*P->MLintern[1];        /* no TermAU penalty if coax stack */
#if 0
        /* This is needed for Y shaped ML loops with coax stacking of
           interior pairts, but backtracking will fail if activated */
        DMLi[j] = MIN2(DMLi[j], decomp);
        DMLi[j] = MIN2(DMLi[j], DMLi[j-1]+P->MLbase);
        DMLi[j] = MIN2(DMLi[j], DMLi1[j]+P->MLbase);
        new_fML = MIN2(new_fML, DMLi[j]);
#endif
        new_fML = MIN2(new_fML, decomp);
      }
      fML[ij] = Fmi[j] = new_fML;     /* substring energy */

    }

    {
      int *FF; /* rotate the auxilliary arrays */
      FF = DMLi2; DMLi2 = DMLi1; DMLi1 = DMLi; DMLi = FF;
      FF = cc1; cc1=cc; cc=FF;
      for (j=1; j<=length; j++) {cc[j]=Fmi[j]=DMLi[j]=INF; }
    }
  }

  /* calculate energies of 5' and 3' fragments */

  f5[TURN+1]= 0;
  /* duplicated code may be faster than conditions inside loop ;) */
  switch(dangle_model){
    /* dont use dangling end and mismatch contributions at all */
    case 0:   for(j=TURN+2; j<=length; j++){
                f5[j] = f5[j-1];
                for (i=j-TURN-1; i>1; i--){

                  if(with_gquad){
                    f5[j] = MIN2(f5[j], f5[i-1] + ggg[indx[j]+i]);
                  }

                  type = ptype[indx[j]+i];
                  if(!type) continue;
                  en = c[indx[j]+i];
                  f5[j] = MIN2(f5[j], f5[i-1] + en + E_ExtLoop(type, -1, -1, P));
                }

                if(with_gquad){
                  f5[j] = MIN2(f5[j], ggg[indx[j]+1]);
                }

                type=ptype[indx[j]+1];
                if(!type) continue;
                en = c[indx[j]+1];
                f5[j] = MIN2(f5[j], en + E_ExtLoop(type, -1, -1, P));
              }
              break;

    /* always use dangles on both sides */
    case 2:   for(j=TURN+2; j<length; j++){
                f5[j] = f5[j-1];
                for (i=j-TURN-1; i>1; i--){

                  if(with_gquad){
                    f5[j] = MIN2(f5[j], f5[i-1] + ggg[indx[j]+i]);
                  }

                  type = ptype[indx[j]+i];
                  if(!type) continue;
                  en = c[indx[j]+i];
                  f5[j] = MIN2(f5[j], f5[i-1] + en + E_ExtLoop(type, S1[i-1], S1[j+1], P));
                }

                if(with_gquad){
                  f5[j] = MIN2(f5[j], ggg[indx[j]+1]);
                }

                type=ptype[indx[j]+1];
                if(!type) continue;
                en = c[indx[j]+1];
                f5[j] = MIN2(f5[j], en + E_ExtLoop(type, -1, S1[j+1], P));
              }
              f5[length] = f5[length-1];
              for (i=length-TURN-1; i>1; i--){

                if(with_gquad){
                  f5[length] = MIN2(f5[length], f5[i-1] + ggg[indx[length]+i]);
                }

                type = ptype[indx[length]+i];
                if(!type) continue;
                en = c[indx[length]+i];
                f5[length] = MIN2(f5[length], f5[i-1] + en + E_ExtLoop(type, S1[i-1], -1, P));
              }

              if(with_gquad){
                f5[length] = MIN2(f5[length], ggg[indx[length]+1]);
              }

              type=ptype[indx[length]+1];
              if(!type) break;
              en = c[indx[length]+1];
              f5[length] = MIN2(f5[length], en + E_ExtLoop(type, -1, -1, P));


              break;

    /* normal dangles, aka dangle_model = 1 || 3 */
    default:  for(j=TURN+2; j<=length; j++){
                f5[j] = f5[j-1];
                for (i=j-TURN-1; i>1; i--){

                  if(with_gquad){
                    f5[j] = MIN2(f5[j], f5[i-1] + ggg[indx[j]+i]);
                  }

                  type = ptype[indx[j]+i];
                  if(type){
                    en = c[indx[j]+i];
                    f5[j] = MIN2(f5[j], f5[i-1] + en + E_ExtLoop(type, -1, -1, P));
                    f5[j] = MIN2(f5[j], f5[i-2] + en + E_ExtLoop(type, S1[i-1], -1, P));
                  }
                  type = ptype[indx[j-1]+i];
                  if(type){
                    en = c[indx[j-1]+i];
                    f5[j] = MIN2(f5[j], f5[i-1] + en + E_ExtLoop(type, -1, S1[j], P));
                    f5[j] = MIN2(f5[j], f5[i-2] + en + E_ExtLoop(type, S1[i-1], S1[j], P));
                  }
                }

                if(with_gquad){
                  f5[j] = MIN2(f5[j], ggg[indx[j]+1]);
                }

                type = ptype[indx[j]+1];
                if(type) f5[j] = MIN2(f5[j], c[indx[j]+1] + E_ExtLoop(type, -1, -1, P));
                type = ptype[indx[j-1]+1];
                if(type) f5[j] = MIN2(f5[j], c[indx[j-1]+1] + E_ExtLoop(type, -1, S1[j], P));
              }
  }
  return f5[length];
}

#include "circfold.inc"

/**
*** trace back through the "c", "f5" and "fML" arrays to get the
*** base pairing list. No search for equivalent structures is done.
*** This is fast, since only few structure elements are recalculated.
***
*** normally s=0.
*** If s>0 then s items have been already pushed onto the sector stack
**/
PRIVATE void backtrack(const char *string, int s) {
  int   i, j, ij, k, l1, mm5, mm3, length, energy, en, new;
  int   no_close, type, type_2, tt, minq, maxq, c0, c1, c2, c3;
  int   bonus;
  int   b=0;
  int   dangle_model = P->model_details.dangles;

  length = strlen(string);
  if (s==0) {
    sector[++s].i = 1;
    sector[s].j = length;
    sector[s].ml = (backtrack_type=='M') ? 1 : ((backtrack_type=='C')? 2: 0);
  }
  while (s>0) {
    int ml, fij, fi, cij, traced, i1, j1, p, q, jj=0, gq=0;
    int canonical = 1;     /* (i,j) closes a canonical structure */
    i  = sector[s].i;
    j  = sector[s].j;
    ml = sector[s--].ml;   /* ml is a flag indicating if backtracking is to
                              occur in the fML- (1) or in the f-array (0) */
    if (ml==2) {
      base_pair2[++b].i = i;
      base_pair2[b].j   = j;
      goto repeat1;
    }

    else if(ml==7) { /* indicates that i,j are enclosing a gquadruplex */
      /* actually, do something here */
    }

    if (j < i+TURN+1) continue; /* no more pairs in this interval */

    fij = (ml == 1)? fML[indx[j]+i] : f5[j];
    fi  = (ml == 1)?(fML[indx[j-1]+i]+P->MLbase): f5[j-1];

    if (fij == fi) {  /* 3' end is unpaired */
      sector[++s].i = i;
      sector[s].j   = j-1;
      sector[s].ml  = ml;
      continue;
    }

    if (ml == 0) { /* backtrack in f5 */
      switch(dangle_model){
        case 0:   /* j is paired. Find pairing partner */
                  for(k=j-TURN-1,traced=0; k>=1; k--){

                    if(with_gquad){
                      if(fij == f5[k-1] + ggg[indx[j]+k]){
                        /* found the decomposition */
                        traced = j; jj = k - 1; gq = 1;
                        break;
                      }
                    }

                    type = ptype[indx[j]+k];
                    if(type)
                      if(fij == E_ExtLoop(type, -1, -1, P) + c[indx[j]+k] + f5[k-1]){
                        traced=j; jj = k-1;
                        break;
                      }
                  }
                  break;

        case 2:   mm3 = (j<length) ? S1[j+1] : -1;
                  for(k=j-TURN-1,traced=0; k>=1; k--){

                    if(with_gquad){
                      if(fij == f5[k-1] + ggg[indx[j]+k]){
                        /* found the decomposition */
                        traced = j; jj = k - 1; gq = 1;
                        break;
                      }
                    }

                    type = ptype[indx[j]+k];
                    if(type)
                      if(fij == E_ExtLoop(type, (k>1) ? S1[k-1] : -1, mm3, P) + c[indx[j]+k] + f5[k-1]){
                        traced=j; jj = k-1;
                        break;
                      }
                  }
                  break;

        default:  for(traced = 0, k=j-TURN-1; k>1; k--){

                    if(with_gquad){
                      if(fij == f5[k-1] + ggg[indx[j]+k]){
                        /* found the decomposition */
                        traced = j; jj = k - 1; gq = 1;
                        break;
                      }
                    }

                    type = ptype[indx[j] + k];
                    if(type){
                      en = c[indx[j] + k];
                      if(fij == f5[k-1] + en + E_ExtLoop(type, -1, -1, P)){
                        traced = j;
                        jj = k-1;
                        break;
                      }
                      if(fij == f5[k-2] + en + E_ExtLoop(type, S1[k-1], -1, P)){
                        traced = j;
                        jj = k-2;
                        break;
                      }
                    }
                    type = ptype[indx[j-1] + k];
                    if(type){
                      en = c[indx[j-1] + k];
                      if(fij == f5[k-1] + en + E_ExtLoop(type, -1, S1[j], P)){
                        traced = j-1;
                        jj = k-1;
                        break;
                      }
                      if(fij == f5[k-2] + en + E_ExtLoop(type, S1[k-1], S1[j], P)){
                        traced = j-1;
                        jj = k-2;
                        break;
                      }
                    }
                  }
                  if(!traced){

                    if(with_gquad){
                      if(fij == ggg[indx[j]+1]){
                        /* found the decomposition */
                        traced = j; jj = 0; gq = 1;
                        break;
                      }
                    }

                    type = ptype[indx[j]+1];
                    if(type){
                      if(fij == c[indx[j]+1] + E_ExtLoop(type, -1, -1, P)){
                        traced = j;
                        jj = 0;
                        break;
                      }
                    }
                    type = ptype[indx[j-1]+1];
                    if(type){
                      if(fij == c[indx[j-1]+1] + E_ExtLoop(type, -1, S1[j], P)){
                        traced = j-1;
                        jj = 0;
                        break;
                      }
                    }
                  }
                  break;
      }

      if (!traced){
        fprintf(stderr, "%s\n", string);
        nrerror("backtrack failed in f5");
      }
      /* push back the remaining f5 portion */
      sector[++s].i = 1;
      sector[s].j   = jj;
      sector[s].ml  = ml;

      /* trace back the base pair found */
      i=k; j=traced;

      if(with_gquad && gq){
        /* goto backtrace of gquadruplex */
        goto repeat_gquad;
      }

      base_pair2[++b].i = i;
      base_pair2[b].j   = j;
      goto repeat1;
    }
    else { /* trace back in fML array */
      if (fML[indx[j]+i+1]+P->MLbase == fij) { /* 5' end is unpaired */
        sector[++s].i = i+1;
        sector[s].j   = j;
        sector[s].ml  = ml;
        continue;
      }

      ij  = indx[j]+i;

      if(with_gquad){
        if(fij == ggg[ij] + E_MLstem(0, -1, -1, P)){
          /* go to backtracing of quadruplex */
          goto repeat_gquad;
        }
      }

      tt  = ptype[ij];
      en  = c[ij];
      switch(dangle_model){
        case 0:   if(fij == en + E_MLstem(tt, -1, -1, P)){
                    base_pair2[++b].i = i;
                    base_pair2[b].j   = j;
                    goto repeat1;
                  }
                  break;

        case 2:   if(fij == en + E_MLstem(tt, S1[i-1], S1[j+1], P)){
                    base_pair2[++b].i = i;
                    base_pair2[b].j   = j;
                    goto repeat1;
                  }
                  break;

        default:  if(fij == en + E_MLstem(tt, -1, -1, P)){
                    base_pair2[++b].i = i;
                    base_pair2[b].j   = j;
                    goto repeat1;
                  }
                  tt = ptype[ij+1];
                  if(fij == c[ij+1] + E_MLstem(tt, S1[i], -1, P) + P->MLbase){
                    base_pair2[++b].i = ++i;
                    base_pair2[b].j   = j;
                    goto repeat1;
                  }
                  tt = ptype[indx[j-1]+i];
                  if(fij == c[indx[j-1]+i] + E_MLstem(tt, -1, S1[j], P) + P->MLbase){
                    base_pair2[++b].i = i;
                    base_pair2[b].j   = --j;
                    goto repeat1;
                  }
                  tt = ptype[indx[j-1]+i+1];
                  if(fij == c[indx[j-1]+i+1] + E_MLstem(tt, S1[i], S1[j], P) + 2*P->MLbase){
                    base_pair2[++b].i = ++i;
                    base_pair2[b].j   = --j;
                    goto repeat1;
                  }
                  break;
      }

      for(k = i + 1 + TURN; k <= j - 2 - TURN; k++)
        if(fij == (fML[indx[k]+i]+fML[indx[j]+k+1]))
          break;

      if ((dangle_model==3)&&(k > j - 2 - TURN)) { /* must be coax stack */
        ml = 2;
        for (k = i+1+TURN; k <= j - 2 - TURN; k++) {
          type    = rtype[ptype[indx[k]+i]];
          type_2  = rtype[ptype[indx[j]+k+1]];
          if (type && type_2)
            if (fij == c[indx[k]+i]+c[indx[j]+k+1]+P->stack[type][type_2]+
                       2*P->MLintern[1])
              break;
        }
      }
      sector[++s].i = i;
      sector[s].j   = k;
      sector[s].ml  = ml;
      sector[++s].i = k+1;
      sector[s].j   = j;
      sector[s].ml  = ml;

      if (k>j-2-TURN) nrerror("backtrack failed in fML");
      continue;
    }

  repeat1:

    /*----- begin of "repeat:" -----*/
    ij = indx[j]+i;
    if (canonical)  cij = c[ij];

    type = ptype[ij];

    bonus = 0;
    if (struct_constrained) {
      if (estimate_mode) {
        if(BP[i] < 0) bonus += BONUS * BP[i];
        if(BP[j] < 0) bonus += BONUS * BP[j];
        if(BP[i] > 0) bonus += BONUS * BP[i];
        if(BP[j] > 0) bonus += BONUS * BP[j];
      } else {
        if ((BP[i]==j)||(BP[i]==-1)||(BP[i]==-2)) bonus -= BONUS;
        if ((BP[j]==-1)||(BP[j]==-3)) bonus -= BONUS;
      }
    }
    if (noLonelyPairs)
      if (cij == c[ij]){
        /* (i.j) closes canonical structures, thus
           (i+1.j-1) must be a pair                */
        type_2 = ptype[indx[j-1]+i+1]; type_2 = rtype[type_2];
        cij -= P->stack[type][type_2] + bonus;
        base_pair2[++b].i = i+1;
        base_pair2[b].j   = j-1;
        i++; j--;
        canonical=0;
        goto repeat1;
      }
    canonical = 1;


    no_close = (((type==3)||(type==4))&&no_closingGU&&(bonus==0));
    if (no_close) {
      if (cij == FORBIDDEN) continue;
    } else
      if (cij == E_Hairpin(j-i-1, type, S1[i+1], S1[j-1],string+i-1, P)+bonus)
        continue;

    for (p = i+1; p <= MIN2(j-2-TURN,i+MAXLOOP+1); p++) {
      minq = j-i+p-MAXLOOP-2;
      if (minq<p+1+TURN) minq = p+1+TURN;
      for (q = j-1; q >= minq; q--) {

        type_2 = ptype[indx[q]+p];
        if (type_2==0) continue;
        type_2 = rtype[type_2];
        if (no_closingGU)
          if (no_close||(type_2==3)||(type_2==4))
            if ((p>i+1)||(q<j-1)) continue;  /* continue unless stack */

        /* energy = oldLoopEnergy(i, j, p, q, type, type_2); */
        energy = E_IntLoopNew(p-i-1, j-q-1, type, type_2,
                            S1[i+1], S1[j-1], S1[p-1], S1[q+1], i, p, j, q, P);

        new = energy+c[indx[q]+p]+bonus;
        traced = (cij == new);
        if (traced) {
          base_pair2[++b].i = p;
          base_pair2[b].j   = q;
          i = p, j = q;
          goto repeat1;
        }
      }
    }

    /* end of repeat: --------------------------------------------------*/

    /* (i.j) must close a multi-loop */
    tt = rtype[type];
    i1 = i+1; j1 = j-1;

    if(with_gquad){
      /*
        The case that is handled here actually resembles something like
        an interior loop where the enclosing base pair is of regular
        kind and the enclosed pair is not a canonical one but a g-quadruplex
        that should then be decomposed further...
      */
      if(backtrack_GQuad_IntLoop(cij - bonus, i, j, type, S, ggg, indx, &p, &q, P)){
        i = p; j = q;
        goto repeat_gquad;
      }
    }

    sector[s+1].ml  = sector[s+2].ml = 1;

    switch(dangle_model){
      case 0:   en = cij - E_MLstem(tt, -1, -1, P) - P->MLclosing - bonus;
                for(k = i+2+TURN; k < j-2-TURN; k++){
                  if(en == fML[indx[k]+i+1] + fML[indx[j-1]+k+1])
                    break;
                }
                break;

      case 2:   en = cij - E_MLstem(tt, S1[j-1], S1[i+1], P) - P->MLclosing - bonus;
                for(k = i+2+TURN; k < j-2-TURN; k++){
                    if(en == fML[indx[k]+i+1] + fML[indx[j-1]+k+1])
                      break;
                }
                break;

      default:  for(k = i+2+TURN; k < j-2-TURN; k++){
                  en = cij - P->MLclosing - bonus;
                  if(en == fML[indx[k]+i+1] + fML[indx[j-1]+k+1] + E_MLstem(tt, -1, -1, P)){
                    break;
                  }
                  else if(en == fML[indx[k]+i+2] + fML[indx[j-1]+k+1] + E_MLstem(tt, -1, S1[i+1], P) + P->MLbase){
                    i1 = i+2;
                    break;
                  }
                  else if(en == fML[indx[k]+i+1] + fML[indx[j-2]+k+1] + E_MLstem(tt, S1[j-1], -1, P) + P->MLbase){
                    j1 = j-2;
                    break;
                  }
                  else if(en == fML[indx[k]+i+2] + fML[indx[j-2]+k+1] + E_MLstem(tt, S1[j-1], S1[i+1], P) + 2*P->MLbase){
                    i1 = i+2;
                    j1 = j-2;
                    break;
                  }
                  /* coaxial stacking of (i.j) with (i+1.k) or (k.j-1) */
                  /* use MLintern[1] since coax stacked pairs don't get TerminalAU */
                  if(dangle_model == 3){
                    type_2 = rtype[ptype[indx[k]+i+1]];
                    if (type_2) {
                      en = c[indx[k]+i+1]+P->stack[type][type_2]+fML[indx[j-1]+k+1];
                      if (cij == en+2*P->MLintern[1]+P->MLclosing) {
                        ml = 2;
                        sector[s+1].ml  = 2;
                        traced = 1;
                        break;
                      }
                    }
                    type_2 = rtype[ptype[indx[j-1]+k+1]];
                    if (type_2) {
                      en = c[indx[j-1]+k+1]+P->stack[type][type_2]+fML[indx[k]+i+1];
                      if (cij == en+2*P->MLintern[1]+P->MLclosing) {
                        sector[s+2].ml = 2;
                        traced = 1;
                        break;
                      }
                    }
                  }
                }
                break;
    }

    if (k<=j-3-TURN) { /* found the decomposition */
      sector[++s].i = i1;
      sector[s].j   = k;
      sector[++s].i = k+1;
      sector[s].j   = j1;
    } else {
#if 0
      /* Y shaped ML loops fon't work yet */
      if (dangle_model==3) {
        d5 = P->dangle5[tt][S1[j-1]];
        d3 = P->dangle3[tt][S1[i+1]];
        /* (i,j) must close a Y shaped ML loop with coax stacking */
        if (cij ==  fML[indx[j-2]+i+2] + mm + d3 + d5 + P->MLbase + P->MLbase) {
          i1 = i+2;
          j1 = j-2;
        } else if (cij ==  fML[indx[j-2]+i+1] + mm + d5 + P->MLbase)
          j1 = j-2;
        else if (cij ==  fML[indx[j-1]+i+2] + mm + d3 + P->MLbase)
          i1 = i+2;
        else /* last chance */
          if (cij != fML[indx[j-1]+i+1] + mm + P->MLbase)
            fprintf(stderr,  "backtracking failed in repeat");
        /* if we arrive here we can express cij via fML[i1,j1]+dangles */
        sector[++s].i = i1;
        sector[s].j   = j1;
      }
      else
#endif
        nrerror("backtracking failed in repeat");
    }

    continue; /* this is a workarround to not accidentally proceed in the following block */

  repeat_gquad:
    /*
      now we do some fancy stuff to backtrace the stacksize and linker lengths
      of the g-quadruplex that should reside within position i,j
    */
    {
      int l[3], L, a;
      L = -1;
      
      get_gquad_pattern_mfe(S, i, j, P, &L, l);
      if(L != -1){
        /* fill the G's of the quadruplex into base_pair2 */
        for(a=0;a<L;a++){
          base_pair2[++b].i = i+a;
          base_pair2[b].j   = i+a;
          base_pair2[++b].i = i+L+l[0]+a;
          base_pair2[b].j   = i+L+l[0]+a;
          base_pair2[++b].i = i+L+l[0]+L+l[1]+a;
          base_pair2[b].j   = i+L+l[0]+L+l[1]+a;
          base_pair2[++b].i = i+L+l[0]+L+l[1]+L+l[2]+a;
          base_pair2[b].j   = i+L+l[0]+L+l[1]+L+l[2]+a;
        }
        goto repeat_gquad_exit;
      }
      nrerror("backtracking failed in repeat_gquad");
    }
  repeat_gquad_exit:
    /*asm("nop")*/;

  } /* end of infinite while loop */

  base_pair2[0].i = b;    /* save the total number of base pairs */
}

PUBLIC char *backtrack_fold_from_pair(char *sequence, int i, int j) {
  char *structure;
  sector[1].i  = i;
  sector[1].j  = j;
  sector[1].ml = 2;
  base_pair2[0].i=0;
  S   = encode_sequence(sequence, 0);
  S1  = encode_sequence(sequence, 1);
  backtrack(sequence, 1);
  structure = (char *) space((strlen(sequence)+1)*sizeof(char));
  parenthesis_structure(structure, base_pair2, strlen(sequence));
  free(S);free(S1);
  return structure;
}

/*---------------------------------------------------------------------------*/

PUBLIC void letter_structure(char *structure, bondT *bp, int length){
  int   n, k, x, y;
  char  alpha[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  for (n = 0; n < length; structure[n++] = ' ');
  structure[length] = '\0';

  for (n = 0, k = 1; k <= bp[0].i; k++) {
    y = bp[k].j;
    x = bp[k].i;
    if (x-1 > 0 && y+1 <= length) {
      if (structure[x-2] != ' ' && structure[y] == structure[x-2]) {
        structure[x-1] = structure[x-2];
        structure[y-1] = structure[x-1];
        continue;
      }
    }
    if (structure[x] != ' ' && structure[y-2] == structure[x]) {
      structure[x-1] = structure[x];
      structure[y-1] = structure[x-1];
      continue;
    }
    n++;
    structure[x-1] = alpha[n-1];
    structure[y-1] = alpha[n-1];
  }
}

/*---------------------------------------------------------------------------*/

PUBLIC void parenthesis_structure(char *structure, bondT *bp, int length){
  int n, k;

  for (n = 0; n < length; structure[n++] = '.');
  structure[length] = '\0';

  for (k = 1; k <= bp[0].i; k++){

    if(bp[k].i == bp[k].j){ /* Gquad bonds are marked as bp[i].i == bp[i].j */
      structure[bp[k].i-1] = '+';
    } else { /* the following ones are regular base pairs */
      structure[bp[k].i-1] = '(';
      structure[bp[k].j-1] = ')';
    }
  }
}

PUBLIC void parenthesis_zuker(char *structure, bondT *bp, int length){
  int k, i, j, temp;

  for (k = 0; k < length; structure[k++] = '.');
  structure[length] = '\0';

  for (k = 1; k <= bp[0].i; k++) {
    i=bp[k].i;
    j=bp[k].j;
    if (i>length) i-=length;
    if (j>length) j-=length;
    if (i>j) {
      temp=i; i=j; j=temp;
    }
    if(i == j){ /* Gquad bonds are marked as bp[i].i == bp[i].j */
      structure[i-1] = '+';
    } else { /* the following ones are regular base pairs */
      structure[i-1] = '(';
      structure[j-1] = ')';
    }
  }
}


/*---------------------------------------------------------------------------*/

PUBLIC void update_fold_params(void){
  update_fold_params_par(NULL);
}

PUBLIC void update_fold_params_par(paramT *parameters){
  if(P) free(P);
  if(parameters){
    P = get_parameter_copy(parameters);
  } else {
    model_detailsT md;
    set_model_details(&md);
    P = get_scaled_parameters(temperature, md);
  }
  make_pair_matrix();
  if (init_length < 0) init_length=0;
}

void (*eos_cb)(int index, int fe) = NULL;

/*---------------------------------------------------------------------------*/
PUBLIC float energy_of_structure(const char *string, const char *structure, int verbosity_level){
  return energy_of_struct_par(string, structure, NULL, verbosity_level);
}

PUBLIC float energy_of_struct_par(const char *string,
                                  const char *structure,
                                  paramT *parameters,
                                  int verbosity_level){
  int   energy;
  short *ss, *ss1;

  update_fold_params_par(parameters);

  if (strlen(structure)!=strlen(string))
    nrerror("energy_of_struct: string and structure have unequal length");

  /* save the S and S1 pointers in case they were already in use */
  ss = S; ss1 = S1;
  S   = encode_sequence(string, 0);
  S1  = encode_sequence(string, 1);

  pair_table = make_pair_table(structure);

  energy = energy_of_structure_pt(string, pair_table, S, S1, verbosity_level);

  free(pair_table);
  free(S); free(S1);
  S=ss; S1=ss1;
  return  (float) energy/100.;
}

/*  returns a correction term that may be added to the energy retrieved
    from energy_of_struct_par() to correct misinterpreted loops. This
    correction is necessary since energy_of_struct_par() will forget 
    about the existance of gquadruplexes and just treat them as unpaired
    regions.

    recursive variant
*/
PRIVATE int en_corr_of_loop_gquad(int i,
                                  int j,
                                  const char *string,
                                  const char *structure,
                                  short *pt,
                                  int *loop_idx,
                                  const short *s1){

  int pos, energy, p, q, r, s, u, type, type2;
  int L, l[3];

  energy = 0;
  q = i;
  while((pos = parse_gquad(structure + q-1, &L, l)) > 0){
    q += pos-1;
    p = q - 4*L - l[0] - l[1] - l[2] + 1;
    if(q > j) break;
    /* we've found the first g-quadruplex at position [p,q] */
    energy += E_gquad(L, l, P);
    /* check if it's enclosed in a base pair */
    if(loop_idx[p] == 0){ q++; continue; /* g-quad in exterior loop */}
    else{
      energy += E_MLstem(0, -1, -1, P); /*  do not forget to remove this energy if
                                            the gquad is the only one surrounded by
                                            the enclosing pair
                                        */

      /*  find its enclosing pair */
      int num_elem, num_g, elem_i, elem_j, up_mis;
      num_elem  = 0;
      num_g     = 1;
      r         = p - 1;
      up_mis    = q - p + 1;

      /* seek for first pairing base located 5' of the g-quad */
      for(r = p - 1; !pt[r] && (r >= i); r--);
      if(r < i) nrerror("this should not happen");

      if(r < pt[r]){ /* found the enclosing pair */
        s = pt[r];
      } else {
        num_elem++;
        elem_i = pt[r];
        elem_j = r;
        r = pt[r]-1 ;
        /* seek for next pairing base 5' of r */
        for(; !pt[r] && (r >= i); r--);
        if(r < i) nrerror("so nich");
        if(r < pt[r]){ /* found the enclosing pair */
          s = pt[r];
        } else {
          /* hop over stems and unpaired nucleotides */
          while((r > pt[r]) && (r >= i)){
            if(pt[r]){ r = pt[r]; num_elem++;}
            r--;
          }
          if(r < i) nrerror("so nich");
          s = pt[r]; /* found the enclosing pair */
        }
      }
      /* now we have the enclosing pair (r,s) */

      u = q+1;
      /* we know everything about the 5' part of this loop so check the 3' part */
      while(u<s){
        if(structure[u-1] == '.') u++;
        else if (structure[u-1] == '+'){ /* found another gquad */
          pos = parse_gquad(structure + u - 1, &L, l);
          if(pos > 0){
            energy += E_gquad(L, l, P) + E_MLstem(0, -1, -1, P);
            up_mis += pos;
            u += pos;
            num_g++;
          }
        } else { /* we must have found a stem */
          if(!(u < pt[u])) nrerror("wtf!");
          num_elem++; elem_i = u; elem_j = pt[u];
          energy += en_corr_of_loop_gquad(u, pt[u], string, structure, pt, loop_idx, s1);
          u = pt[u] + 1;
        }
      }
      if(u!=s) nrerror("what the hell");
      else{ /* we are done since we've found no other 3' structure element */
        switch(num_elem){
          /* g-quad was misinterpreted as hairpin closed by (r,s) */
          case 0:   /* if(num_g == 1)
                      if((p-r-1 == 0) || (s-q-1 == 0))
                        nrerror("too few unpaired bases");
                    */
                    type = pair[s1[r]][s1[s]];
                    if(dangles == 2)
                      energy += P->mismatchI[type][s1[r+1]][s1[s-1]];
                    if(type > 2)
                      energy += P->TerminalAU;
                    energy += P->internal_loop[s - r - 1 - up_mis];
                    energy -= E_MLstem(0, -1, -1, P);
                    energy -= E_Hairpin(s - r - 1,
                                        type,
                                        s1[r + 1],
                                        s1[s - 1],
                                        string + r - 1,
                                        P);
                    break;
          /* g-quad was misinterpreted as interior loop closed by (r,s) with enclosed pair (elem_i, elem_j) */
          case 1:   type = pair[s1[r]][s1[s]];
                    type2 = pair[s1[elem_i]][s1[elem_j]];
                    energy += P->MLclosing
                              + E_MLstem(rtype[type], s1[s-1], s1[r+1], P)
                              + (elem_i - r - 1 + s - elem_j - 1 - up_mis) * P->MLbase
                              + E_MLstem(type2, s1[elem_i-1], s1[elem_j+1], P);
                    energy -= E_IntLoop(elem_i - r - 1,
                                        s - elem_j - 1,
                                        type,
                                        rtype[type2],
                                        s1[r + 1],
                                        s1[s - 1],
                                        s1[elem_i - 1],
                                        s1[elem_j + 1],
                                        P);
                    break;
          /* gquad was misinterpreted as unpaired nucleotides in a multiloop */
          default:  energy -= (up_mis) * P->MLbase;
                    break;
        }
      }
      q = s+1;
    }
  }
  return energy;
}

PUBLIC float
energy_of_gquad_structure(const char *string,
                          const char *structure,
                          int verbosity_level){

  return energy_of_gquad_struct_par(string, structure, NULL, verbosity_level);
}

PUBLIC float
energy_of_gquad_struct_par( const char *string,
                            const char *structure,
                            paramT *parameters,
                            int verbosity_level){

  int   energy, gge, *loop_idx;
  short *ss, *ss1;

  update_fold_params_par(parameters);

  if (strlen(structure)!=strlen(string))
    nrerror("energy_of_struct: string and structure have unequal length");

  /* save the S and S1 pointers in case they were already in use */
  ss = S; ss1 = S1;
  S   = encode_sequence(string, 0);
  S1  = encode_sequence(string, 1);

  /* the pair_table looses every information about the gquad position
     thus we have to find add the energy contributions for each loop
     that contains a gquad by ourself, substract all miscalculated
     contributions, i.e. loops that actually contain a gquad, from
     energy_of_structure_pt()
  */
  pair_table  = make_pair_table(structure);
  energy      = energy_of_structure_pt(string, pair_table, S, S1, verbosity_level);

  loop_idx    = make_loop_index_pt(pair_table);
  gge         = en_corr_of_loop_gquad(1, S[0], string, structure, pair_table, loop_idx, S1);
  energy     += gge;

  free(pair_table);
  free(loop_idx);
  free(S); free(S1);
  S=ss; S1=ss1;
  return  (float) energy/100.;
}

PUBLIC int energy_of_structure_pt(const char *string,
                                  short *ptable,
                                  short *s,
                                  short *s1,
                                  int verbosity_level){
  return energy_of_struct_pt_par(string, ptable, s, s1, NULL, verbosity_level);
}

PUBLIC int energy_of_struct_pt_par( const char *string,
                                    short *ptable,
                                    short *s,
                                    short *s1,
                                    paramT *parameters,
                                    int verbosity_level){
  /* auxiliary function for kinfold,
     for most purposes call energy_of_struct instead */

  int   i, length, energy;
  short *ss, *ss1;

  update_fold_params_par(parameters);

  pair_table = ptable;
  ss  = S;
  ss1 = S1;
  S = s;
  S1 = s1;

  length = S[0];
/*   energy =  backtrack_type=='M' ? ML_Energy(0, 0) : ML_Energy(0, 1); */
    energy =  backtrack_type=='M' ? energy_of_ml_pt(0, ptable) : energy_of_extLoop_pt(0, ptable);
  if (eos_cb) (*eos_cb)(0, energy);
  if (verbosity_level>0)
    printf("External loop                           : %5d\n", energy);
  for (i=1; i<=length; i++) {
    if (pair_table[i]==0) continue;
    energy += stack_energy(i, string, verbosity_level);
    i=pair_table[i];
  }
  for (i=1; !SAME_STRAND(i,length); i++) {
    if (!SAME_STRAND(i,pair_table[i])) {
      energy+=P->DuplexInit;
      if (eos_cb) (*eos_cb)(-1, P->DuplexInit);
      break;
    }
  }
  S   = ss;
  S1  = ss1;
  return energy;
}

PUBLIC float energy_of_circ_structure(const char *string,
                                      const char *structure,
                                      int verbosity_level){
  return energy_of_circ_struct_par(string, structure, NULL, verbosity_level);
}

PUBLIC float energy_of_circ_struct_par( const char *string,
                                        const char *structure,
                                        paramT *parameters,
                                        int verbosity_level){

  int   i, j, length, energy=0, en0, degree=0, type;
  short *ss, *ss1;

  update_fold_params_par(parameters);

  int dangle_model = P->model_details.dangles;

  if (strlen(structure)!=strlen(string))
    nrerror("energy_of_struct: string and structure have unequal length");

  /* save the S and S1 pointers in case they were already in use */
  ss = S; ss1 = S1;
  S   = encode_sequence(string, 0);
  S1  = encode_sequence(string, 1);

  pair_table = make_pair_table(structure);

  length = S[0];

  for (i=1; i<=length; i++) {
    if (pair_table[i]==0) continue;
    degree++;
    energy += stack_energy(i, string, verbosity_level);
    i=pair_table[i];
  }

  if (degree==0) return 0.;
  for (i=1; pair_table[i]==0; i++);
  j = pair_table[i];
  type=pair[S[j]][S[i]];
  if (type==0) type=7;
  if (degree==1) {
    char loopseq[10];
    int u, si1, sj1;
    for (i=1; pair_table[i]==0; i++);
    u = length-j + i-1;
    if (u<7) {
      strcpy(loopseq , string+j-1);
      strncat(loopseq, string, i);
    }
    si1 = (i==1)?S1[length] : S1[i-1];
    sj1 = (j==length)?S1[1] : S1[j+1];
    en0 = E_Hairpin(u, type, sj1, si1, loopseq, P);
  } else
    if (degree==2) {
      int p,q, u1,u2, si1, sq1, type_2;
      for (p=j+1; pair_table[p]==0; p++);
      q=pair_table[p];
      u1 = p-j-1;
      u2 = i-1 + length-q;
      type_2 = pair[S[q]][S[p]];
      if (type_2==0) type_2=7;
      si1 = (i==1)? S1[length] : S1[i-1];
      sq1 = (q==length)? S1[1] : S1[q+1];
      en0 = E_IntLoop(u1, u2, type, type_2,
                       S1[j+1], si1, S1[p-1], sq1,P);
    } else { /* degree > 2 */
      en0 = ML_Energy(0, 0) - P->MLintern[0];
      if (dangle_model) {
        int d5, d3;
        if (pair_table[1]) {
          j = pair_table[1];
          type = pair[S[1]][S[j]];
          if (dangle_model==2)
            en0 += P->dangle5[type][S1[length]];
          else { /* dangle_model==1 */
            if (pair_table[length]==0) {
              d5 = P->dangle5[type][S1[length]];
              if (pair_table[length-1]!=0) {
                int tt;
                tt = pair[S[pair_table[length-1]]][S[length-1]];
                d3 = P->dangle3[tt][S1[length]];
                if (d3<d5) d5 = 0;
                else d5 -= d3;
              }
              en0 += d5;
            }
          }
        }
        if (pair_table[length]) {
          i = pair_table[length];
          type = pair[S[i]][S[length]];
          if (dangle_model==2)
            en0 += P->dangle3[type][S1[1]];
          else { /* dangle_model==1 */
            if (pair_table[1]==0) {
              d3 = P->dangle3[type][S1[1]];
              if (pair_table[2]) {
                int tt;
                tt = pair[S[2]][S[pair_table[2]]];
                d5 = P->dangle5[tt][1];
                if (d5<d3) d3=0;
                else d3 -= d5;
              }
              en0 += d3;
            }
          }
        }
      }
    }

  if (eos_cb) (*eos_cb)(0, en0);
  if (verbosity_level>0)
    printf("External loop                           : %5d\n", en0);
  energy += en0;
  /* fprintf(stderr, "ext loop degree %d tot %d\n", degree, energy); */
  free(S); free(S1);
  S=ss; S1=ss1;
  return  (float) energy/100.0;
}

/*---------------------------------------------------------------------------*/
PRIVATE int stack_energy(int i, const char *string, int verbosity_level)
{
  /* calculate energy of substructure enclosed by (i,j) */
  int ee, energy = 0;
  int j, p, q, type;

  j=pair_table[i];
  type = pair[S[i]][S[j]];
  if (type==0) {
    type=7;
    if (verbosity_level>=0)
      fprintf(stderr,"WARNING: bases %d and %d (%c%c) can't pair!\n", i, j,
              string[i-1],string[j-1]);
  }

  p=i; q=j;
  while (p<q) { /* process all stacks and interior loops */
    int type_2;
    while (pair_table[++p]==0);
    while (pair_table[--q]==0);
    if ((pair_table[q]!=(short)p)||(p>q)) break;
    type_2 = pair[S[q]][S[p]];
    if (type_2==0) {
      type_2=7;
      if (verbosity_level>=0)
        fprintf(stderr,"WARNING: bases %d and %d (%c%c) can't pair!\n", p, q,
                string[p-1],string[q-1]);
    }
    /* energy += LoopEnergy(i, j, p, q, type, type_2); */
    if ( SAME_STRAND(i,p) && SAME_STRAND(q,j) )
      ee = E_IntLoopNew(p-i-1, j-q-1, type, type_2, S1[i+1], S1[j-1], S1[p-1], S1[q+1], i, p, j, q, P);
    else
      ee = energy_of_extLoop_pt(cut_in_loop(i), pair_table);
    if (eos_cb) (*eos_cb)(i, ee);
    if (verbosity_level>0)
      printf("Interior loop (%3d,%3d) %c%c; (%3d,%3d) %c%c: %5d\n",
             i,j,string[i-1],string[j-1],p,q,string[p-1],string[q-1], ee);
    energy += ee;
    i=p; j=q; type = rtype[type_2];
  } /* end while */

  /* p,q don't pair must have found hairpin or multiloop */

  if (p>q) {                       /* hair pin */
    if (SAME_STRAND(i,j))
      ee = E_Hairpin(j-i-1, type, S1[i+1], S1[j-1], string+i-1, P);
    else
      ee = energy_of_extLoop_pt(cut_in_loop(i), pair_table);
    energy += ee;
    if (eos_cb) (*eos_cb)(i, ee);
    if (verbosity_level>0)
      printf("Hairpin  loop (%3d,%3d) %c%c              : %5d\n",
             i, j, string[i-1],string[j-1], ee);

    return energy;
  }

  /* (i,j) is exterior pair of multiloop */
  while (p<j) {
    /* add up the contributions of the substructures of the ML */
    energy += stack_energy(p, string, verbosity_level);
    p = pair_table[p];
    /* search for next base pair in multiloop */
    while (pair_table[++p]==0);
  }
  {
    int ii;
    ii = cut_in_loop(i);
    ee = (ii==0) ? energy_of_ml_pt(i, pair_table) : energy_of_extLoop_pt(ii, pair_table);
  }
  energy += ee;
  if (eos_cb) (*eos_cb)(i, ee);
  if (verbosity_level>0)
    printf("Multi    loop (%3d,%3d) %c%c              : %5d\n",
           i,j,string[i-1],string[j-1],ee);

  return energy;
}

/*---------------------------------------------------------------------------*/



/**
*** Calculate the energy contribution of
*** stabilizing dangling-ends/mismatches
*** for all stems branching off the exterior
*** loop
**/
PRIVATE int energy_of_extLoop_pt(int i, short *pair_table) {
  int energy, mm5, mm3;
  int p, q, q_prev;
  int length = (int)pair_table[0];

  /* helper variables for dangles == 1 case */
  int E3_available;  /* energy of 5' part where 5' mismatch is available for current stem */
  int E3_occupied;   /* energy of 5' part where 5' mismatch is unavailable for current stem */

  int dangle_model = P->model_details.dangles;

  /* initialize vars */
  energy      = 0;
  p           = (i==0) ? 1 : i;
  q_prev      = -1;

  if(dangle_model%2 == 1){
    E3_available = INF;
    E3_occupied  = 0;
  }

  /* seek to opening base of first stem */
  while(p <= length && !pair_table[p]) p++;

  while(p < length){
    int tt;
    /* p must have a pairing partner */
    q  = (int)pair_table[p];
    /* get type of base pair (p,q) */
    tt = pair[S[p]][S[q]];
    if(tt==0) tt=7;

    switch(dangle_model){
      /* no dangles */
      case 0:   energy += E_ExtLoop(tt, -1, -1, P);
                break;
      /* the beloved double dangles */
      case 2:   mm5 = ((SAME_STRAND(p-1,p)) && (p>1))       ? S1[p-1] : -1;
                mm3 = ((SAME_STRAND(q,q+1)) && (q<length))  ? S1[q+1] : -1;
                energy += E_ExtLoop(tt, mm5, mm3, P);
                break;

      default:  {
                  int tmp;
                  if(q_prev + 2 < p){
                    E3_available = MIN2(E3_available, E3_occupied);
                    E3_occupied  = E3_available;
                  }
                  mm5 = ((SAME_STRAND(p-1,p)) && (p>1) && !pair_table[p-1])       ? S1[p-1] : -1;
                  mm3 = ((SAME_STRAND(q,q+1)) && (q<length) && !pair_table[q+1])  ? S1[q+1] : -1;
                  tmp = MIN2(
                                                E3_occupied  + E_ExtLoop(tt, -1, mm3, P),
                                                E3_available + E_ExtLoop(tt, mm5, mm3, P)
                                              );
                  E3_available =       MIN2(
                                                E3_occupied  + E_ExtLoop(tt, -1, -1, P),
                                                E3_available + E_ExtLoop(tt, mm5, -1, P)
                                              );
                  E3_occupied = tmp;
                }
                break;

    } /* end switch dangle_model */
    /* seek to the next stem */
    p = q + 1;
    q_prev = q;
    while (p <= length && !pair_table[p]) p++;
    if(p==i) break; /* cut was in loop */
  }

  if(dangle_model%2 == 1)
    energy = MIN2(E3_occupied, E3_available);

  return energy;
}

/**
*** i is the 5'-base of the closing pair
***
*** since each helix can coaxially stack with at most one of its
*** neighbors we need an auxiliarry variable  cx_energy
*** which contains the best energy given that the last two pairs stack.
*** energy  holds the best energy given the previous two pairs do not
*** stack (i.e. the two current helices may stack)
*** We don't allow the last helix to stack with the first, thus we have to
*** walk around the Loop twice with two starting points and take the minimum
***/
PRIVATE int energy_of_ml_pt(int i, short *pt){

  int energy, cx_energy, tmp, tmp2, best_energy=INF;
  int i1, j, p, q, q_prev, q_prev2, u, x, type, count, mm5, mm3, tt, ld5, new_cx, dang5, dang3, dang;
  int mlintern[NBPAIRS+1];

  /* helper variables for dangles == 1|5 case */
  int E_mm5_available;  /* energy of 5' part where 5' mismatch of current stem is available */
  int E_mm5_occupied;   /* energy of 5' part where 5' mismatch of current stem is unavailable */
  int E2_mm5_available; /* energy of 5' part where 5' mismatch of current stem is available with possible 3' dangle for enclosing pair (i,j) */
  int E2_mm5_occupied;  /* energy of 5' part where 5' mismatch of current stem is unavailable with possible 3' dangle for enclosing pair (i,j) */
  int dangle_model = P->model_details.dangles;

  if(i >= pt[i])
    nrerror("energy_of_ml_pt: i is not 5' base of a closing pair!");

  j = (int)pt[i];

  /* init the variables */
  energy      = 0;
  p           = i+1;
  q_prev      = i-1;
  q_prev2     = i;

  for (x = 0; x <= NBPAIRS; x++) mlintern[x] = P->MLintern[x];

  /* seek to opening base of first stem */
  while(p <= j && !pair_table[p]) p++;
  u = p - i - 1;

  switch(dangle_model){
    case 0:   while(p < j){
                /* p must have a pairing partner */
                q  = (int)pair_table[p];
                /* get type of base pair (p,q) */
                tt = pair[S[p]][S[q]];
                if(tt==0) tt=7;
                energy += E_MLstem(tt, -1, -1, P);
                /* seek to the next stem */
                p = q + 1;
                q_prev = q_prev2 = q;
                while (p <= j && !pair_table[p]) p++;
                u += p - q - 1; /* add unpaired nucleotides */
              }
              /* now lets get the energy of the enclosing stem */
              type = pair[S[j]][S[i]]; if (type==0) type=7;
              energy += E_MLstem(type, -1, -1, P);
              break;

    case 2:   while(p < j){
                /* p must have a pairing partner */
                q  = (int)pair_table[p];
                /* get type of base pair (p,q) */
                tt = pair[S[p]][S[q]];
                if(tt==0) tt=7;
                mm5 = (SAME_STRAND(p-1,p))  ? S1[p-1] : -1;
                mm3 = (SAME_STRAND(q,q+1))  ? S1[q+1] : -1;
                energy += E_MLstem(tt, mm5, mm3, P);
                /* seek to the next stem */
                p = q + 1;
                q_prev = q_prev2 = q;
                while (p <= j && !pair_table[p]) p++;
                u += p - q - 1; /* add unpaired nucleotides */
              }
              type = pair[S[j]][S[i]]; if (type==0) type=7;
              mm5 = ((SAME_STRAND(j-1,j)) && !pair_table[j-1])  ? S1[j-1] : -1;
              mm3 = ((SAME_STRAND(i,i+1)) && !pair_table[i+1])  ? S1[i+1] : -1;
              energy += E_MLstem(type, S1[j-1], S1[i+1], P);
              break;

    case 3:   /* we treat helix stacking different */
              for (count=0; count<2; count++) { /* do it twice */
                ld5 = 0; /* 5' dangle energy on prev pair (type) */
                if ( i==0 ) {
                  j = (unsigned int)pair_table[0]+1;
                  type = 0;  /* no pair */
                }
                else {
                  j = (unsigned int)pair_table[i];
                  type = pair[S[j]][S[i]]; if (type==0) type=7;
                  /* prime the ld5 variable */
                  if (SAME_STRAND(j-1,j)) {
                    ld5 = P->dangle5[type][S1[j-1]];
                    if ((p=(unsigned int)pair_table[j-2]) && SAME_STRAND(j-2, j-1))
                    if (P->dangle3[pair[S[p]][S[j-2]]][S1[j-1]]<ld5) ld5 = 0;
                  }
                }
                i1=i; p = i+1; u=0;
                energy = 0; cx_energy=INF;
                do { /* walk around the multi-loop */
                  new_cx = INF;

                  /* hop over unpaired positions */
                  while (p <= (unsigned int)pair_table[0] && pair_table[p]==0) p++;

                  /* memorize number of unpaired positions */
                  u += p-i1-1;
                  /* get position of pairing partner */
                  if ( p == (unsigned int)pair_table[0]+1 ){
                    q = 0;tt = 0; /* virtual root pair */
                  } else {
                    q  = (unsigned int)pair_table[p];
                    /* get type of base pair P->q */
                    tt = pair[S[p]][S[q]]; if (tt==0) tt=7;
                  }

                  energy += mlintern[tt];
                  cx_energy += mlintern[tt];

                  dang5=dang3=0;
                  if ((SAME_STRAND(p-1,p))&&(p>1))
                    dang5=P->dangle5[tt][S1[p-1]];      /* 5'dangle of pq pair */
                  if ((SAME_STRAND(i1,i1+1))&&(i1<(unsigned int)S[0]))
                    dang3 = P->dangle3[type][S1[i1+1]]; /* 3'dangle of previous pair */

                  switch (p-i1-1) {
                    case 0:   /* adjacent helices */
                              if (i1!=0){
                                if (SAME_STRAND(i1,p)) {
                                  new_cx = energy + P->stack[rtype[type]][rtype[tt]];
                                  /* subtract 5'dangle and TerminalAU penalty */
                                  new_cx += -ld5 - mlintern[tt]-mlintern[type]+2*mlintern[1];
                                }
                                ld5=0;
                                energy = MIN2(energy, cx_energy);
                              }
                              break;
                    case 1:   /* 1 unpaired base between helices */
                              dang = MIN2(dang3, dang5);
                              energy = energy +dang; ld5 = dang - dang3;
                              /* may be problem here: Suppose
                                cx_energy>energy, cx_energy+dang5<energy
                                and the following helices are also stacked (i.e.
                                we'll subtract the dang5 again */
                              if (cx_energy+dang5 < energy) {
                                energy = cx_energy+dang5;
                                ld5 = dang5;
                              }
                              new_cx = INF;  /* no coax stacking with mismatch for now */
                              break;
                    default:  /* many unpaired base between helices */
                              energy += dang5 +dang3;
                              energy = MIN2(energy, cx_energy + dang5);
                              new_cx = INF;  /* no coax stacking possible */
                              ld5 = dang5;
                              break;
                  }
                  type = tt;
                  cx_energy = new_cx;
                  i1 = q; p=q+1;
                } while (q!=i);
                best_energy = MIN2(energy, best_energy); /* don't use cx_energy here */
                /* fprintf(stderr, "%6.2d\t", energy); */
                /* skip a helix and start again */
                while (pair_table[p]==0) p++;
                if (i == (unsigned int)pair_table[p]) break;
                i = (unsigned int)pair_table[p];
              } /* end doing it twice */
              energy = best_energy;
              break;

    default:  E_mm5_available = E2_mm5_available  = INF;
              E_mm5_occupied  = E2_mm5_occupied   = 0;
              while(p < j){
                /* p must have a pairing partner */
                q  = (int)pair_table[p];
                /* get type of base pair (p,q) */
                tt = pair[S[p]][S[q]];
                if(tt==0) tt=7;
                if(q_prev + 2 < p){
                  E_mm5_available = MIN2(E_mm5_available, E_mm5_occupied);
                  E_mm5_occupied  = E_mm5_available;
                }
                if(q_prev2 + 2 < p){
                  E2_mm5_available  = MIN2(E2_mm5_available, E2_mm5_occupied);
                  E2_mm5_occupied   = E2_mm5_available;
                }
                mm5 = ((SAME_STRAND(p-1,p)) && !pair_table[p-1])  ? S1[p-1] : -1;
                mm3 = ((SAME_STRAND(q,q+1)) && !pair_table[q+1])  ? S1[q+1] : -1;
                tmp =                   MIN2(
                                              E_mm5_occupied  + E_MLstem(tt, -1, mm3, P),
                                              E_mm5_available + E_MLstem(tt, mm5, mm3, P)
                                            );
                tmp   =                 MIN2(tmp, E_mm5_available + E_MLstem(tt, -1, mm3, P));
                tmp2  =                 MIN2(
                                              E_mm5_occupied  + E_MLstem(tt, -1, -1, P),
                                              E_mm5_available + E_MLstem(tt, mm5, -1, P)
                                            );
                E_mm5_available =       MIN2(tmp2, E_mm5_available  + E_MLstem(tt, -1, -1, P));
                E_mm5_occupied  = tmp;

                tmp =                  MIN2(
                                              E2_mm5_occupied  + E_MLstem(tt, -1, mm3, P),
                                              E2_mm5_available + E_MLstem(tt, mm5, mm3, P)
                                            );
                tmp =                   MIN2(tmp, E2_mm5_available + E_MLstem(tt, -1, mm3, P));
                tmp2 =                  MIN2(
                                              E2_mm5_occupied  + E_MLstem(tt, -1, -1, P),
                                              E2_mm5_available + E_MLstem(tt, mm5, -1, P)
                                            );
                E2_mm5_available =      MIN2(tmp2, E2_mm5_available + E_MLstem(tt, -1, -1, P));
                E2_mm5_occupied = tmp;
                /* printf("(%d,%d): \n E_o = %d, E_a = %d, E2_o = %d, E2_a = %d\n", p, q, E_mm5_occupied,E_mm5_available,E2_mm5_occupied,E2_mm5_available); */
                /* seek to the next stem */
                p = q + 1;
                q_prev = q_prev2 = q;
                while (p <= j && !pair_table[p]) p++;
                u += p - q - 1; /* add unpaired nucleotides */
              }
              /* now lets see how we get the minimum including the enclosing stem */
              type = pair[S[j]][S[i]]; if (type==0) type=7;
              mm5 = ((SAME_STRAND(j-1,j)) && !pair_table[j-1])  ? S1[j-1] : -1;
              mm3 = ((SAME_STRAND(i,i+1)) && !pair_table[i+1])  ? S1[i+1] : -1;
              if(q_prev + 2 < p){
                E_mm5_available = MIN2(E_mm5_available, E_mm5_occupied);
                E_mm5_occupied  = E_mm5_available;
              }
              if(q_prev2 + 2 < p){
                E2_mm5_available  = MIN2(E2_mm5_available, E2_mm5_occupied);
                E2_mm5_occupied   = E2_mm5_available;
              }
              energy = MIN2(E_mm5_occupied  + E_MLstem(type, -1, -1, P),
                            E_mm5_available + E_MLstem(type, mm5, -1, P)
                          );
              energy = MIN2(energy, E_mm5_available   + E_MLstem(type, -1, -1, P));
              energy = MIN2(energy, E2_mm5_occupied   + E_MLstem(type, -1, mm3, P));
              energy = MIN2(energy, E2_mm5_occupied   + E_MLstem(type, -1, -1, P));
              energy = MIN2(energy, E2_mm5_available  + E_MLstem(type, mm5, mm3, P));
              energy = MIN2(energy, E2_mm5_available  + E_MLstem(type, -1, mm3, P));
              energy = MIN2(energy, E2_mm5_available  + E_MLstem(type, mm5, -1, P));
              energy = MIN2(energy, E2_mm5_available  + E_MLstem(type, -1, -1, P));
              break;
  }/* end switch dangle_model */

  energy += P->MLclosing;
  /* logarithmic ML loop energy if logML */
  if(logML && (u>6))
    energy += 6*P->MLbase+(int)(P->lxc*log((double)u/6.));
  else
    energy += (u*P->MLbase);

  return energy;
}

/*---------------------------------------------------------------------------*/

PUBLIC int loop_energy(short * ptable, short *s, short *s1, int i) {
  /* compute energy of a single loop closed by base pair (i,j) */
  int j, type, p,q, energy;
  short *Sold, *S1old, *ptold;

  ptold=pair_table;   Sold = S;   S1old = S1;
  pair_table = ptable;   S = s;   S1 = s1;

  if (i==0) { /* evaluate exterior loop */
    energy = energy_of_extLoop_pt(0,pair_table);
    pair_table=ptold; S=Sold; S1=S1old;
    return energy;
  }
  j = pair_table[i];
  if (j<i) nrerror("i is unpaired in loop_energy()");
  type = pair[S[i]][S[j]];
  if (type==0) {
    type=7;
    if (eos_debug>=0)
      fprintf(stderr,"WARNING: bases %d and %d (%c%c) can't pair!\n", i, j,
              Law_and_Order[S[i]],Law_and_Order[S[j]]);
  }
  p=i; q=j;


  while (pair_table[++p]==0);
  while (pair_table[--q]==0);
  if (p>q) { /* Hairpin */
    char loopseq[8] = "";
    if (SAME_STRAND(i,j)) {
      if (j-i-1<7) {
        int u;
        for (u=0; i+u<=j; u++) loopseq[u] = Law_and_Order[S[i+u]];
        loopseq[u] = '\0';
      }
      energy = E_Hairpin(j-i-1, type, S1[i+1], S1[j-1], loopseq, P);
    } else {
      energy = energy_of_extLoop_pt(cut_in_loop(i), pair_table);
    }
  }
  else if (pair_table[q]!=(short)p) { /* multi-loop */
    int ii;
    ii = cut_in_loop(i);
    energy = (ii==0) ? energy_of_ml_pt(i, pair_table) : energy_of_extLoop_pt(ii, pair_table);
  }
  else { /* found interior loop */
    int type_2;
    type_2 = pair[S[q]][S[p]];
    if (type_2==0) {
      type_2=7;
      if (eos_debug>=0)
        fprintf(stderr,"WARNING: bases %d and %d (%c%c) can't pair!\n", p, q,
                Law_and_Order[S[p]],Law_and_Order[S[q]]);
    }
    /* energy += LoopEnergy(i, j, p, q, type, type_2); */
    if ( SAME_STRAND(i,p) && SAME_STRAND(q,j) )
      energy = E_IntLoopNew(p-i-1, j-q-1, type, type_2,
                          S1[i+1], S1[j-1], S1[p-1], S1[q+1], i, p, j, q, P);
    else
      energy = energy_of_extLoop_pt(cut_in_loop(i), pair_table);
  }

  pair_table=ptold; S=Sold; S1=S1old;
  return energy;
}

/*---------------------------------------------------------------------------*/


PUBLIC float energy_of_move(const char *string, const char *structure, int m1, int m2) {
  int   energy;
  short *ss, *ss1;

#ifdef _OPENMP
  if(P == NULL) update_fold_params();
#else
  if((init_length<0)||(P==NULL)) update_fold_params();
#endif

  if (fabs(P->temperature - temperature)>1e-6) update_fold_params();

  if (strlen(structure)!=strlen(string))
    nrerror("energy_of_struct: string and structure have unequal length");

  /* save the S and S1 pointers in case they were already in use */
  ss = S; ss1 = S1;
  S   = encode_sequence(string, 0);
  S1  = encode_sequence(string, 1);

  pair_table = make_pair_table(structure);

  energy = energy_of_move_pt(pair_table, S, S1, m1, m2);

  free(pair_table);
  free(S); free(S1);
  S=ss; S1=ss1;
  return  (float) energy/100.;
}

/*---------------------------------------------------------------------------*/

PUBLIC int energy_of_move_pt(short *pt, short *s, short *s1, int m1, int m2) {
  /*compute change in energy given by move (m1,m2)*/
  int en_post, en_pre, i,j,k,l, len;

  len = pt[0];
  k = (m1>0)?m1:-m1;
  l = (m2>0)?m2:-m2;
  /* first find the enclosing pair i<k<l<j */
  for (j=l+1; j<=len; j++) {
    if (pt[j]<=0) continue; /* unpaired */
    if (pt[j]<k) break;   /* found it */
    if (pt[j]>j) j=pt[j]; /* skip substructure */
    else {
      fprintf(stderr, "%d %d %d %d ", m1, m2, j, pt[j]);
      nrerror("illegal move or broken pair table in energy_of_move()");
    }
  }
  i = (j<=len) ? pt[j] : 0;
  en_pre = loop_energy(pt, s, s1, i);
  en_post = 0;
  if (m1<0) { /*it's a delete move */
    en_pre += loop_energy(pt, s, s1, k);
    pt[k]=0;
    pt[l]=0;
  } else { /* insert move */
    pt[k]=l;
    pt[l]=k;
    en_post += loop_energy(pt, s, s1, k);
  }
  en_post += loop_energy(pt, s, s1, i);
  /*  restore pair table */
  if (m1<0) {
    pt[k]=l;
    pt[l]=k;
  } else {
    pt[k]=0;
    pt[l]=0;
  }

  /* Cofolding -- Check if move changes COFOLD-Penalty */
  if (!SAME_STRAND(k,l)) {
    int p, c; p=c=0;
    for (p=1; p < cut_point; ) { /* Count basepairs between two strands */
      if (pt[p] != 0) {
        if (SAME_STRAND(p,pt[p])) /* Skip stuff */
          p=pt[p];
        else if (++c > 1) break; /* Count a basepair, break if we have more than one */
      }
      p++;
    }
    if (m1<0 && c==1) /* First and only inserted basepair */
      return (en_post - en_pre - P->DuplexInit);
    else
      if (c==0) /* Must have been a delete move */
        return (en_post - en_pre + P->DuplexInit);
  }

  return (en_post - en_pre);
}



PRIVATE int cut_in_loop(int i) {
  /* walk around the loop;  return j pos of pair after cut if
     cut_point in loop else 0 */
  int  p, j;
  p = j = pair_table[i];
  do {
    i  = pair_table[p];  p = i+1;
    while ( pair_table[p]==0 ) p++;
  } while (p!=j && SAME_STRAND(i,p));
  return SAME_STRAND(i,p) ? 0 : j;
}

/*---------------------------------------------------------------------------*/

PRIVATE void make_ptypes(const short *S, const char *structure, paramT *P) {
  int n,i,j,k,l;

  n=S[0];
  for (k=1; k<n-TURN; k++)
    for (l=1; l<=2; l++) {
      int type,ntype=0,otype=0;
      i=k; j = i+TURN+l; if (j>n) continue;
      type = pair[S[i]][S[j]];
      while ((i>=1)&&(j<=n)) {
        if ((i>1)&&(j<n)) ntype = pair[S[i-1]][S[j+1]];
        if (noLonelyPairs && (!otype) && (!ntype))
          type = 0; /* i.j can only form isolated pairs */
        ptype[indx[j]+i] = (char) type;
        otype =  type;
        type  = ntype;
        i--; j++;
      }
    }

  if (struct_constrained && (structure != NULL)){
    constrain_ptypes(structure, (unsigned int)n, ptype, BP, TURN, 0);
    if(P->model_details.canonicalBPonly)
      for(i=1;i<n;i++)
        for(j=i+1;j<=n;j++)
          if(ptype[indx[j]+i] == 7){
            warn_user("removing non-canonical base pair from constraint");
            ptype[indx[j]+i] = 0;
          }
  }
}

PUBLIC void assign_plist_from_db(plist **pl, const char *struc, float pr){
  /* convert bracket string to plist */
  short *pt;
  int i, k = 0, size, n;
  plist *gpl, *ptr;

  size  = strlen(struc);
  n     = 2;

  pt  = make_pair_table(struc);
  *pl = (plist *)space(n*size*sizeof(plist));
  for(i = 1; i < size; i++){
    if(pt[i]>i){
      (*pl)[k].i      = i;
      (*pl)[k].j      = pt[i];
      (*pl)[k].p      = pr;
      (*pl)[k++].type = 0;
    }
  }

  gpl = get_plist_gquad_from_db(struc, pr);
  for(ptr = gpl; ptr->i != 0; ptr++){
    if (k == n * size - 1){
      n *= 2;
      *pl = (plist *)xrealloc(*pl, n * size * sizeof(plist));
    }
    (*pl)[k].i      = ptr->i;
    (*pl)[k].j      = ptr->j;
    (*pl)[k].p       = ptr->p;
    (*pl)[k++].type = ptr->type;
  }
  free(gpl);

  (*pl)[k].i      = 0;
  (*pl)[k].j      = 0;
  (*pl)[k].p      = 0.;
  (*pl)[k++].type = 0.;
  free(pt);
  *pl = (plist *)xrealloc(*pl, k * sizeof(plist));
}


/*###########################################*/
/*# deprecated functions below              #*/
/*###########################################*/

PUBLIC int HairpinE(int size, int type, int si1, int sj1, const char *string) {
  int energy;

  energy = (size <= 30) ? P->hairpin[size] :
    P->hairpin[30]+(int)(P->lxc*log((size)/30.));

  if (tetra_loop){
    if (size == 4) { /* check for tetraloop bonus */
      char tl[7]={0}, *ts;
      strncpy(tl, string, 6);
      if ((ts=strstr(P->Tetraloops, tl)))
        return (P->Tetraloop_E[(ts - P->Tetraloops)/7]);
    }
    if (size == 6) {
      char tl[9]={0}, *ts;
      strncpy(tl, string, 8);
      if ((ts=strstr(P->Hexaloops, tl)))
        return (energy = P->Hexaloop_E[(ts - P->Hexaloops)/9]);
    }
    if (size == 3) {
      char tl[6]={0,0,0,0,0,0}, *ts;
      strncpy(tl, string, 5);
      if ((ts=strstr(P->Triloops, tl))) {
        return (P->Triloop_E[(ts - P->Triloops)/6]);
      }
      if (type>2)  /* neither CG nor GC */
        energy += P->TerminalAU; /* penalty for closing AU GU pair IVOO??
                                    sind dass jetzt beaunuesse oder mahlnuesse (vorzeichen?)*/
      return energy;
    }
   }
   energy += P->mismatchH[type][si1][sj1];

  return energy;
}

/*---------------------------------------------------------------------------*/

int E_IntLoopNew(int n1, int n2, int type, int type_2, int si1, int sj1, int sp1, int sq1, 
                 int index_i, int index_p, int index_j, int index_q, paramT* P)
{
  int le = E_IntLoop(n1,n2,type,type_2,si1,sj1,sp1,sq1,P);
  if(index_p == binding_site_p && index_q == binding_site_q && index_i == binding_site_i && index_j == binding_site_j) {
    //fprintf(stderr,"MATCH!!!");
    le -= binding_site_bonus;
  } 
  return le;	
}
                          
/*---------------------------------------------------------------------------*/

PUBLIC int oldLoopEnergy(int i, int j, int p, int q, int type, int type_2) {
  /* compute energy of degree 2 loop (stack bulge or interior) */
  int n1, n2, m, energy;
  n1 = p-i-1;
  n2 = j-q-1;

  if (n1>n2) { m=n1; n1=n2; n2=m; } /* so that n2>=n1 */

  if (n2 == 0)
    energy = P->stack[type][type_2];   /* stack */

  else if (n1==0) {                  /* bulge */
    energy = (n2<=MAXLOOP)?P->bulge[n2]:
      (P->bulge[30]+(int)(P->lxc*log(n2/30.)));

#if STACK_BULGE1
    if (n2==1) energy+=P->stack[type][type_2];
#endif
  } else {                           /* interior loop */

    if ((n1+n2==2)&&(james_rule))
      /* special case for loop size 2 */
      energy = P->int11[type][type_2][S1[i+1]][S1[j-1]];
    else {
      energy = (n1+n2<=MAXLOOP)?(P->internal_loop[n1+n2]):
        (P->internal_loop[30]+(int)(P->lxc*log((n1+n2)/30.)));

#if NEW_NINIO
      energy += MIN2(MAX_NINIO, (n2-n1)*P->ninio[2]);
#else
      m       = MIN2(4, n1);
      energy += MIN2(MAX_NINIO,((n2-n1)*P->ninio[m]));
#endif
      energy += P->mismatchI[type][S1[i+1]][S1[j-1]]+
        P->mismatchI[type_2][S1[q+1]][S1[p-1]];
    }
  }
  return energy;
}

/*--------------------------------------------------------------------------*/

PUBLIC int LoopEnergy(int n1, int n2, int type, int type_2,
                      int si1, int sj1, int sp1, int sq1) {
  /* compute energy of degree 2 loop (stack bulge or interior) */
  int nl, ns, energy;

  if (n1>n2) { nl=n1; ns=n2;}
  else {nl=n2; ns=n1;}

  if (nl == 0)
    return P->stack[type][type_2];    /* stack */

  if (ns==0) {                       /* bulge */
    energy = (nl<=MAXLOOP)?P->bulge[nl]:
      (P->bulge[30]+(int)(P->lxc*log(nl/30.)));
    if (nl==1) energy += P->stack[type][type_2];
    else {
      if (type>2) energy += P->TerminalAU;
      if (type_2>2) energy += P->TerminalAU;
    }
    return energy;
  }
  else {                             /* interior loop */
    if (ns==1) {
      if (nl==1)                     /* 1x1 loop */
        return P->int11[type][type_2][si1][sj1];
      if (nl==2) {                   /* 2x1 loop */
        if (n1==1)
          energy = P->int21[type][type_2][si1][sq1][sj1];
        else
          energy = P->int21[type_2][type][sq1][si1][sp1];
        return energy;
      }
        else {  /* 1xn loop */
        energy = (nl+1<=MAXLOOP)?(P->internal_loop[nl+1]):
        (P->internal_loop[30]+(int)(P->lxc*log((nl+1)/30.)));
        energy += MIN2(MAX_NINIO, (nl-ns)*P->ninio[2]);
        energy += P->mismatch1nI[type][si1][sj1]+
        P->mismatch1nI[type_2][sq1][sp1];
        return energy;
        }
    }
    else if (ns==2) {
      if(nl==2)      {   /* 2x2 loop */
        return P->int22[type][type_2][si1][sp1][sq1][sj1];}
      else if (nl==3)  { /* 2x3 loop */
        energy = P->internal_loop[5]+P->ninio[2];
        energy += P->mismatch23I[type][si1][sj1]+
          P->mismatch23I[type_2][sq1][sp1];
        return energy;
      }

    }
    { /* generic interior loop (no else here!)*/
      energy = (n1+n2<=MAXLOOP)?(P->internal_loop[n1+n2]):
        (P->internal_loop[30]+(int)(P->lxc*log((n1+n2)/30.)));

      energy += MIN2(MAX_NINIO, (nl-ns)*P->ninio[2]);

      energy += P->mismatchI[type][si1][sj1]+
        P->mismatchI[type_2][sq1][sp1];
    }
  }
  return energy;
}

PRIVATE int ML_Energy(int i, int is_extloop) {
  /* i is the 5'-base of the closing pair (or 0 for exterior loop)
     loop is scored as ML if extloop==0 else as exterior loop

     since each helix can coaxially stack with at most one of its
     neighbors we need an auxiliarry variable  cx_energy
     which contains the best energy given that the last two pairs stack.
     energy  holds the best energy given the previous two pairs do not
     stack (i.e. the two current helices may stack)
     We don't allow the last helix to stack with the first, thus we have to
     walk around the Loop twice with two starting points and take the minimum
  */

  int energy, cx_energy, best_energy=INF;
  int i1, j, p, q, u, x, type, count;
  int mlintern[NBPAIRS+1], mlclosing, mlbase;
  int dangle_model = P->model_details.dangles;

  if (is_extloop) {
    for (x = 0; x <= NBPAIRS; x++)
      mlintern[x] = P->MLintern[x]-P->MLintern[1]; /* 0 or TerminalAU */
    mlclosing = mlbase = 0;
  } else {
    for (x = 0; x <= NBPAIRS; x++) mlintern[x] = P->MLintern[x];
    mlclosing = P->MLclosing; mlbase = P->MLbase;
  }

  /*  as we do not only have dangling end but also mismatch contributions,
  **  we do this a bit different to previous implementations
  */
  if(is_extloop){
    energy = 0;
    i1  = i;
    p   = i+1;

    int E_mm5_available, E_mm5_occupied;
    /* find out if we may have 5' mismatch for the next stem */
    while (p <= (int)pair_table[0] && pair_table[p]==0) p++;
    /* get position of pairing partner */
    if(p < (int)pair_table[0]){
        E_mm5_occupied  = (p - i - 1 > 0) ? INF : 0;
        E_mm5_available = (p - i - 1 > 0) ? 0 : INF;
    }

    if(p < (int)pair_table[0])
      do{
        int tt;
        /* p must have a pairing partner */
        q  = (int)pair_table[p];
        /* get type of base pair (p,q) */
        tt = pair[S[p]][S[q]];
        if(tt==0) tt=7;

        int mm5 = ((SAME_STRAND(p-1,p)) && (p>1)) ? S1[p-1]: -1;
        int mm3 = ((SAME_STRAND(q,q+1)) && (q<(unsigned int)pair_table[0])) ? S1[q+1]: -1;

        switch(dangle_model){
          /* dangle_model == 0 */
          case 0: energy += E_ExtLoop(tt, -1, -1, P);
                  break;
          /* dangle_model == 1 */
          case 1: {
                    /* check for unpaired nucleotide 3' to the current stem */
                    int u3 = ((q < pair_table[0]) && (pair_table[q+1] == 0)) ? 1 : 0;
                    if(pair_table[p-1] != 0) mm5 = -1;

                    if(!u3){
                      mm3 = -1;
                      E_mm5_occupied  = MIN2(
                                              E_mm5_occupied  + E_ExtLoop(tt, -1, -1, P),
                                              E_mm5_available + E_ExtLoop(tt, mm5, -1, P)
                                            );
                      E_mm5_available = E_mm5_occupied;
                    }
                    else{
                      E_mm5_occupied  = MIN2(
                                              E_mm5_occupied  + E_ExtLoop(tt, -1, mm3, P),
                                              E_mm5_available + E_ExtLoop(tt, mm5, mm3, P)
                                            );
                      E_mm5_available = MIN2(
                                              E_mm5_occupied  + E_ExtLoop(tt, -1, -1, P),
                                              E_mm5_available + E_ExtLoop(tt, mm5, -1, P)
                                            );
                    }
                  }
                  break;

          /* the beloved case dangle_model == 2 */
          case 2: energy += E_ExtLoop(tt, mm5, mm3, P);
                  break;

          /* dangle_model == 3 a.k.a. helix stacking */
          case 3: break;

        } /* end switch dangle_model */

        /* seek to the next stem */
        p = q + 1;
        while (p <= (int)pair_table[0] && pair_table[p]==0) p++;
        if(p == (int)pair_table[0] + 1){
          if(dangle_model == 1)
            energy = (p > q + 1) ? E_mm5_occupied : E_mm5_available;
          q = 0;
          break;
        }
      } while(q != i);
  }
  /* not exterior loop */
  else{
    for (count=0; count<2; count++) { /* do it twice */
      int ld5 = 0; /* 5' dangle energy on prev pair (type) */
      if ( i==0 ) {
        j = (unsigned int)pair_table[0]+1;
        type = 0;  /* no pair */
      }
      else {
        j = (unsigned int)pair_table[i];
        type = pair[S[j]][S[i]]; if (type==0) type=7;

        if (dangle_model==3) { /* prime the ld5 variable */
          if (SAME_STRAND(j-1,j)) {
            ld5 = P->dangle5[type][S1[j-1]];
            if ((p=(unsigned int)pair_table[j-2]) && SAME_STRAND(j-2, j-1))
                if (P->dangle3[pair[S[p]][S[j-2]]][S1[j-1]]<ld5) ld5 = 0;
          }
        }
      }
      i1=i; p = i+1; u=0;
      energy = 0; cx_energy=INF;
      do { /* walk around the multi-loop */
        int tt, new_cx = INF;

        /* hop over unpaired positions */
        while (p <= (unsigned int)pair_table[0] && pair_table[p]==0) p++;

        /* memorize number of unpaired positions */
        u += p-i1-1;
        /* get position of pairing partner */
        if ( p == (unsigned int)pair_table[0]+1 ){
          q = 0;tt = 0; /* virtual root pair */
        } else {
        q  = (unsigned int)pair_table[p];
          /* get type of base pair P->q */
        tt = pair[S[p]][S[q]]; if (tt==0) tt=7;
        }

        energy += mlintern[tt];
        cx_energy += mlintern[tt];

        if (dangle_model) {
          int dang5=0, dang3=0, dang;
          if ((SAME_STRAND(p-1,p))&&(p>1))
            dang5=P->dangle5[tt][S1[p-1]];      /* 5'dangle of pq pair */
          if ((SAME_STRAND(i1,i1+1))&&(i1<(unsigned int)S[0]))
            dang3 = P->dangle3[type][S1[i1+1]]; /* 3'dangle of previous pair */

          switch (p-i1-1) {
          case 0: /* adjacent helices */
            if (dangle_model==2)
              energy += dang3+dang5;
            else if (dangle_model==3 && i1!=0) {
              if (SAME_STRAND(i1,p)) {
                new_cx = energy + P->stack[rtype[type]][rtype[tt]];
                /* subtract 5'dangle and TerminalAU penalty */
                new_cx += -ld5 - mlintern[tt]-mlintern[type]+2*mlintern[1];
              }
              ld5=0;
              energy = MIN2(energy, cx_energy);
            }
            break;
          case 1: /* 1 unpaired base between helices */
            dang = (dangle_model==2)?(dang3+dang5):MIN2(dang3, dang5);
            if (dangle_model==3) {
              energy = energy +dang; ld5 = dang - dang3;
              /* may be problem here: Suppose
                 cx_energy>energy, cx_energy+dang5<energy
                 and the following helices are also stacked (i.e.
                 we'll subtract the dang5 again */
              if (cx_energy+dang5 < energy) {
                energy = cx_energy+dang5;
                ld5 = dang5;
              }
              new_cx = INF;  /* no coax stacking with mismatch for now */
            } else
              energy += dang;
            break;
          default: /* many unpaired base between helices */
            energy += dang5 +dang3;
            if (dangle_model==3) {
              energy = MIN2(energy, cx_energy + dang5);
              new_cx = INF;  /* no coax stacking possible */
              ld5 = dang5;
            }
          }
          type = tt;
        }
        if (dangle_model==3) cx_energy = new_cx;
        i1 = q; p=q+1;
      } while (q!=i);
      best_energy = MIN2(energy, best_energy); /* don't use cx_energy here */
      /* fprintf(stderr, "%6.2d\t", energy); */
      if (dangle_model!=3 || is_extloop) break;  /* may break cofold with co-ax */
      /* skip a helix and start again */
      while (pair_table[p]==0) p++;
      if (i == (unsigned int)pair_table[p]) break;
      i = (unsigned int)pair_table[p];
    }
    energy = best_energy;
    energy += mlclosing;
    /* logarithmic ML loop energy if logML */
    if ( (!is_extloop) && logML && (u>6) )
      energy += 6*mlbase+(int)(P->lxc*log((double)u/6.));
    else
      energy += mlbase*u;
    /* fprintf(stderr, "\n"); */
  }
  return energy;
}

PUBLIC void initialize_fold(int length){
  /* DO NOTHING */
}

PUBLIC float energy_of_struct(const char *string, const char *structure){
  return energy_of_structure(string, structure, eos_debug);
}

PUBLIC int energy_of_struct_pt(const char *string, short * ptable, short *s, short *s1){
  return energy_of_structure_pt(string, ptable, s, s1, eos_debug);
}

PUBLIC float energy_of_circ_struct(const char *string, const char *structure){
  return energy_of_circ_structure(string, structure, eos_debug);
}

