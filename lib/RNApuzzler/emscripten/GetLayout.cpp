#include "GetLayout.h"

extern "C" {
#include <string.h>
#include "ViennaRNA/utils.h"
#include "ViennaRNA/RNApuzzler/RNApuzzler.h"
}


// LayoutResult* GetLayout (const std::vector< int > & pair_table) {
LayoutResult* GetLayout (const std::string & pair_table) {
    // printf("top of getlayout\n");
    //std::vector<double> x, y, arc_coords;
    // these should actually be vrna_alloc'ed float arrays.

    //const short* pt = &pair_table[0];

    std::vector<short> pt_vec;

    char *cstr_pt = new char[pair_table.length() + 1];
    strcpy(cstr_pt, pair_table.c_str());

    char* tok = strtok(cstr_pt, ",");
    int ii = 0;
    while (tok != NULL) {
        // printf("%s %s\n",tok, cstr_pt);
        pt_vec.push_back(atoi(tok));
        tok = strtok(NULL, ",");
        // if (++ii > 100) break;
    }

    short *pt = &pt_vec[0];



    // short *pt;
    // pt = (short *) vrna_alloc((pair_table.size())* sizeof(short));
    // for (int ii = 0; ii < pair_table.size(); ++ii ) {
    //     pt[ii] = pair_table[ii];
    // }

    float *X, *Y;
    X = (float *) vrna_alloc((pair_table.size()+1)*sizeof(float));
    Y = (float *) vrna_alloc((pair_table.size()+1)*sizeof(float));
    double *arc_coords;
    arc_coords = (double *) vrna_alloc(6*pair_table.size()*sizeof(double));


    auto len = layout_RNApuzzler(pt, X, Y, arc_coords, createPuzzlerOptions());

    LayoutResult* result = new LayoutResult();
    for (int ii = 0; ii < len; ++ii) {
        // result->layout.emplace_back(std::vector<double>({X[ii], Y[ii]}));
        result->xs.emplace_back(X[ii]);
        result->ys.emplace_back(Y[ii]);
    }

    free(X);
    free(Y);
    free(arc_coords);

    return result;
}

