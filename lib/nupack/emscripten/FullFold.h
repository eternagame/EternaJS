#ifndef NUPACK_FULLFOLD_H
#define NUPACK_FULLFOLD_H

#include <string>

struct FullFoldResult {
    double mfe;
    std::string structure;
};

FullFoldResult* FullFoldDefault (const std::string& string, const std::string& structure);
FullFoldResult* FullFoldTemperature (double temperature_in, const std::string& string, const std::string& structure);

#endif //NUPACK_FULLFOLD_H
