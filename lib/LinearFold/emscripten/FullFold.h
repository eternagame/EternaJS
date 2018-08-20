#ifndef FASTCKY_FULLFOLD_H
#define FASTCKY_FULLFOLD_H

#include <string>

struct FullFoldResult {
    std::string structure;
};

FullFoldResult* FullFoldDefault (std::string seqString);


#endif //FASTCKY_FULLFOLD_H
