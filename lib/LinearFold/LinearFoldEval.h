#ifndef LINEARFOLD_EVAL_H
#define LINEARFOLD_EVAL_H

#include <string>

#ifdef lv
typedef long ENERGY_TYPE;
#else
typedef float ENERGY_TYPE;
#endif

ENERGY_TYPE eval(std::string seq, std::string ref, bool is_verbose);

#endif
