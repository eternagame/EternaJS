//Simple String Echo example
//mike chambers
//mchamber@adobe.com

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <math.h>
#include "fold.h"
#include "cofold.h"
#include "part_func.h"
#include "utils.h"
#include "fold_vars.h"
#include "PS_dot.h"

//#include "RNAfold.h"

extern int estimate_mode;

//Header file for AS3 interop APIs
//this is linked in by the compiler (when using flaccon)
#include "AS3.h"

struct plist *make_plist(int length, double pmin);
struct plist *b2plist(const char *struc);

//Method exposed to ActionScript
//Takes a String and echos it


// a pointer to an AS3 array
AS3_Val* thiz = NULL;
// a callback that fills the array above with localized free energy contributions
void _eos_cb(int index, int fe)
{
	if (thiz) {
		if (index < 0) {
			AS3_CallTS("unshift", *thiz, "IntType", fe);
			AS3_CallTS("unshift", *thiz, "IntType", index-1); // shift indices from 1-based to 0-based
		} else {
			if (cut_point >= 0 && index >= cut_point) index++;
			AS3_CallTS("push", *thiz, "IntType", index-1); // shift indices from 1-based to 0-based
			AS3_CallTS("push", *thiz, "IntType", fe);
		}
	}
}

extern void (*eos_cb)(int index, int fe);


static AS3_Val fullAlchEval(void* self, AS3_Val args)
{
	char* string = NULL;
	char* structure = NULL;
	char* cut = NULL;
	AS3_Val thiz_;
	int temperature_in;
	float energy;

	AS3_ArrayValue(args, "IntType, StrType, StrType, AS3ValType", &temperature_in, &string, &structure, &thiz_);
	temperature = temperature_in;

	cut = strchr(string, '&');
	if(cut) {
		*cut = '\0';
		strcat(string, cut+1);
		cut_point = cut - string;
		structure[cut_point] = '\0';
		strcat(structure, structure+cut_point+1);
		cut_point++;
	}

	thiz = &thiz_; // set the collecting array
	eos_cb = _eos_cb; // activate the callback

	update_fold_params();
	energy = energy_of_struct(string, structure);

	// clean up
	cut_point = -1;
	eos_cb = NULL;
	thiz = NULL;

	return AS3_Array("DoubleType", energy);
}


static AS3_Val AlchEval(void* self, AS3_Val args)
{
	char* string = NULL;
	char* structure = NULL;
	AS3_Val fold_type_args;
	int temperature_in;
	float energy;

	AS3_ArrayValue(args, "IntType, StrType, StrType", &temperature_in, &string, &structure);
	temperature = temperature_in;

	update_fold_params();

	energy = energy_of_struct(string, structure);

	return AS3_Array("DoubleType", energy);
}


static AS3_Val fullAlchFold(void* self, AS3_Val args)
{
	char* string = NULL;
	char* structure = NULL;
	char* constraints = NULL;
	char* dotplot_structure = NULL;
	char* cut = NULL;
	int fold_type = NULL;
	int switch_bp_i = NULL;
	int switch_bp_j = NULL;
	int switch_bp_p = NULL;
	int switch_bp_q = NULL;
	int switch_bp_bonus = NULL;
	AS3_Val fold_type_args;

	int   i, length;
	double energy;
	double min_en;
	double kT, sfact=1.07;
	double tmp;
	char *probabilities;
	char *probIndex;
    
	plist *pl,*mf,*pl1;
	
	AS3_ArrayValue(args, "IntType, AS3ValType, StrType, StrType", &fold_type, &fold_type_args, &string, &structure);
	
	if(string == NULL) {
		return AS3_Array("DoubleType, StrType", 0.0, NULL);
	}

	constraints = (char *) space(sizeof(char)*(strlen(string) + 1));

	// convention for the structure variable:
	// - empty => no constraints, normal fold
	// - same length as sequence => the Vienna-style constraint .|<>()
	// - twice the length of the sequence => estimate mode, pairs of (U|P) combined with [-9,+9]
	//
	if(strlen(structure) == 0) {
		fold_constrained = 0;
		estimate_mode = 0;
		
	} else {
		if(strlen(structure) != strlen(string) * 2) {
			estimate_mode = 0;
			if(strlen(structure) != strlen(string)) {
				fprintf(stderr,"ViennaRNA : Wrong constraint length %d %d", strlen(structure), strlen(string));
				fold_constrained = 0;
			} else {
				strcpy(constraints, structure);
				fold_constrained = 1;
			}
		} else {
			int ii;
			fold_constrained = 1;
			estimate_mode = 1;

			for(ii=0; ii<strlen(string); ii++) {
				
				char multiplier = 1;
				int num = structure[2*ii+1] - '0';
				char level = 0;

				if(num < 0 || num > 9) {
					fold_constrained = 0;
					fprintf(stderr,"ViennaRNA : Wrong constraint weight");
					break;
				}

				level = (char)(num);
				
				if(structure[2*ii] == 'P') {
					multiplier = -1;
				} else if(structure[2*ii] == 'U') {
					multiplier = 1;
				} else {
					fprintf(stderr,"ViennaRNA : unrecognized constraint");
					fold_constrained = 0;
					break;
				}

				constraints[ii] = level * multiplier;
			}			
		}
	}



	switch(fold_type)
	{
		case 0:
			//the default fold
			energy = fold(string, constraints);
			strcpy(structure, constraints);
			free_arrays();
			free(constraints);

			return AS3_Array("DoubleType, StrType", energy, structure);
			break;
		case 1: 
			//temperature fold
			temperature = AS3_NumberValue(fold_type_args);
			energy = fold(string, constraints);
			strcpy(structure, constraints);
			free_arrays();
			free(constraints);

			return AS3_Array("DoubleType, StrType", energy, structure);
			break;
		case 2:		
			//pf_fold
			length = (int) strlen(string);
			
			AS3_ArrayValue(fold_type_args, "DoubleType, StrType, StrType", &temperature, &probabilities, &dotplot_structure);
			probabilities = (char *) malloc(sizeof(char) * length * length * 30);
			probIndex = probabilities;
	
			kT = (temperature+273.15)*1.98717/1000.; /* in Kcal */
			pf_scale = exp(-(sfact*min_en)/kT/length);

			init_pf_fold(length);
			energy = pf_fold(string,constraints);
			
			pl = make_plist(length, 1e-5);
			mf = b2plist(dotplot_structure);

			//fprintf(stderr, "case 1-2 %d", sizeof(char) * length * length * 30);

			/* print boxes in upper right half*/
			//int pcount = 0;
			for (pl1=pl; pl1->i>0; pl1++) {
				tmp = sqrt(pl1->p);
				//pcount++;
				probIndex += sprintf(probIndex, "%d %d %1.9f ubox ", pl1->i, pl1->j, tmp);
			}
			
			  /* print boxes in lower left half (mfe) */
			for (pl1=mf; pl1->i>0; pl1++) {
				tmp = sqrt(pl1->p);
				//pcount++;
				probIndex += sprintf(probIndex, "%d %d %1.7f lbox ", pl1->i, pl1->j, tmp);
			}
			
			free_pf_arrays();	
			free(constraints);
			free(pl);
			free(mf);

			return AS3_Array("DoubleType, StrType, StrType", energy, dotplot_structure, probabilities);
			break;
		
		case 3:
			length = (int) strlen(string);
			
			AS3_ArrayValue(fold_type_args, "IntType, IntType, IntType, IntType, IntType", &switch_bp_i, &switch_bp_p, &switch_bp_j, &switch_bp_q, &switch_bp_bonus);
			energy = fold_with_binding_site(string, constraints,switch_bp_i,  switch_bp_p, switch_bp_j, switch_bp_q, switch_bp_bonus);
			strcpy(structure, constraints);
			free_arrays();
			free(constraints);

			return AS3_Array("DoubleType, StrType", energy, structure);
			break;

		case 4:
			if(0) fprintf(stderr,"ViennaRNA : string: %s", string);
			cut = strchr(string, '&');
			if (cut) {
				*cut = '\0';
				strcat(string, cut+1);
				cut_point = cut - string;
				if (constraints[0]) {
					constraints[cut_point] = '\0';
					strcat(constraints, constraints+cut_point+1);
				}
				cut_point++;
			} else {
				fprintf(stderr, "missing cut point\n");
				return AS3_Array("DoubleType, StrType", 0.0, NULL);
			}
			energy = cofold(string, constraints);
			cut_point--; // back to 0-based
			strcpy(structure, constraints);
			structure[cut_point] = 0;
			strcat(structure, "&");
			strcat(structure, constraints+cut_point);
			// clean-up
			cut_point = -1;
			free_co_arrays(); // IMPORTANT, NOT free_arrays()
			free(constraints);

			return AS3_Array("DoubleType, StrType", energy, structure);
			break;

		case 5:
			length = (int) strlen(string);
			
			AS3_ArrayValue(fold_type_args, "IntType, IntType, IntType, IntType, IntType", &switch_bp_i, &switch_bp_p, &switch_bp_j, &switch_bp_q, &switch_bp_bonus);
			if(0) fprintf(stderr,"ViennaRNA : string: %s", string);
			cut = strchr(string, '&');
			if (cut) {
				*cut = '\0';
				strcat(string, cut+1);
				cut_point = cut - string;
				if (constraints[0]) {
					constraints[cut_point] = '\0';
					strcat(constraints, constraints+cut_point+1);
				}
				cut_point++;
			} else {
				fprintf(stderr, "missing cut point\n");
				return AS3_Array("DoubleType, StrType", 0.0, NULL);
			}
			energy = cofold_with_binding_site(string, constraints,switch_bp_i,  switch_bp_p, switch_bp_j, switch_bp_q, switch_bp_bonus);
			cut_point--; // back to 0-based
			strcpy(structure, constraints);
			structure[cut_point] = 0;
			strcat(structure, "&");
			strcat(structure, constraints+cut_point);
			// clean-up
			cut_point = -1;
			free_co_arrays(); // IMPORTANT, NOT free_arrays()
			free(constraints);

			return AS3_Array("DoubleType, StrType", energy, structure);
			break;

		default: 
			fprintf(stderr, "default case\n");
			return AS3_Array("DoubleType, StrType", 0.0, NULL);
	}
	
	return AS3_Array("DoubleType, StrType", 0.0, NULL);
}

struct plist *make_plist(int length, double pmin) {
  /* convert matrix of pair probs to plist */
  struct plist *pl;
  int i,j,k=0,maxl;
  maxl = 2*length;
  pl = (struct plist *)space(maxl*sizeof(struct plist));
  k=0;
  for (i=1; i<length; i++)
    for (j=i+1; j<=length; j++) {
      if (pr[iindx[i]-j]<pmin) continue;
      if (k>=maxl-1) {
	maxl *= 2;
	pl = (struct plist *)xrealloc(pl,maxl*sizeof(struct plist));
      }
      pl[k].i = i;
      pl[k].j = j;
      pl[k++].p = pr[iindx[i]-j];
    }
  pl[k].i=0;
  pl[k].j=0;
  pl[k++].p=0.;
  return pl;
}

struct plist *b2plist(const char *struc) {
  /* convert bracket string to plist */
  short *pt;
  struct plist *pl;
  int i,k=0;
  pt = make_pair_table(struc);
  pl = (struct plist *)space(strlen(struc)/2*sizeof(struct plist));
  for (i=1; i<strlen(struc); i++) {
    if (pt[i]>i) {
      pl[k].i = i;
      pl[k].j = pt[i];
      pl[k++].p = 0.95*0.95;
    }
  }
  free(pt);
  pl[k].i=0;
  pl[k].j=0;
  pl[k++].p=0.;
  return pl;
}

/**
static AS3_Val heat_capacity(void* self, AS3_Val args)
{

	char *string
	float T_min
	float T_max,
	float h
	int m

   int length, i;
   char *structure;
   float hc, kT, min_en;
   
   AS3_ArrayValue( args, "StrType, DoubleTyp, DoubleType, DoubleType, IntType", &string, &T_min, &T_max, &h, &m);
   
   length = (int) strlen(string);
   
   do_backtrack = 0;   

   temperature = T_min -m*h;
   initialize_fold(length);
   structure = (char *) space((unsigned) length+1);
   min_en = fold(string, structure);
   free(structure); free_arrays();
   kT = (temperature+K0)*GASCONST/1000;    // in kcal
   pf_scale = exp(-(1.07*min_en)/kT/length );
   init_pf_fold(length);
   
   for (i=0; i<2*m+1; i++) {
      F[i] = pf_fold(string, NULL);   // T_min -2h
      temperature += h;
      kT = (temperature+K0)*GASCONST/1000;
      pf_scale=exp(-(F[i]/length +h*0.00727)/kT); // try to extrapolate F
      update_pf_params(length); 
   }
   while (temperature <= (T_max+m*h+h)) {
      
      hc = - ddiff(F,h,m)* (temperature +K0 - m*h -h); 
      printf("%g   %g\n", (temperature-m*h-h), hc);  
      
      for (i=0; i<2*m; i++)
	 F[i] = F[i+1];
      F[2*m] = pf_fold(string, NULL); 
      temperature += h;
      kT = (temperature+K0)*GASCONST/1000;
      pf_scale=exp(-(F[i]/length +h*0.00727)/kT);
      update_pf_params(length); 
   }
   free_pf_arrays();
}
**/


//entry point for code
int main()
{
	//define the methods exposed to ActionScript
	//typed as an ActionScript Function instance
	AS3_Val fullFoldMethod = AS3_Function (NULL, fullAlchFold );
	AS3_Val evalMethod = AS3_Function (NULL, AlchEval);
	AS3_Val fullEvalMethod = AS3_Function (NULL, fullAlchEval );
	// construct an object that holds references to the functions
	AS3_Val result = AS3_Object("fullAlchFold: AS3ValType, AlchEval: AS3ValType, fullAlchEval: AS3ValType", fullFoldMethod, evalMethod, fullEvalMethod);

	// Release
	AS3_Release( fullFoldMethod );
	AS3_Release( evalMethod );
	AS3_Release( fullEvalMethod );

	// notify that we initialized -- THIS DOES NOT RETURN!
	AS3_LibInit( result);

	// should never get here!
	return 0;
}
