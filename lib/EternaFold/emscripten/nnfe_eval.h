#ifndef NNFE_EVAL_H
#define NNFE_EVAL_H

using namespace std;

typedef float ENERGY_TYPE;

// void (*eos_cb)(int index, int fe) = NULL;

ENERGY_TYPE eval(string seq, string ref, bool is_verbose);

#endif