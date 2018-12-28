#ifndef LINEARFOLD_FULLFOLD_H
#define LINEARFOLD_FULLFOLD_H

#include <string>

struct FullFoldResult {
    std::string structure;
};

FullFoldResult* FullFoldDefault (std::string seqString);


#endif //LINEARFOLD_FULLFOLD_H
