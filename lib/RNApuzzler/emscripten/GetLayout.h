#ifndef RNAPUZZLER_GETLAYOUT_H
#define RNAPUZZLER_GETLAYOUT_H

#include <string>
#include <vector>

// Consider pair.
struct LayoutResult {
    // std::vector< std::vector< double > > layout;
    std::vector< double > xs;
    std::vector< double > ys;
};


// LayoutResult* GetLayout (const std::vector< int > & pair_table);
LayoutResult* GetLayout (std::string const & pair_table);

#endif //RNAPUZZLER_GETLAYOUT_H
