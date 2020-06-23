/*
 *nnfe_eval.cpp, based on LinearFoldEval.cpp and adapted for Contrafold MFE *
 Evaluate the energy of a given RNA structure.

 author: He Zhang
 edited by: 12/2018
*/

#include <stack>
#include <string>
#include <vector>

#include "nnfe_utility.h"

using namespace std;

typedef float ENERGY_TYPE;

void (*eos_cb)(int index, int fe) = NULL;


ENERGY_TYPE eval(string seq, string ref, bool is_verbose) {
    int seq_length = seq.length();

    if (cache_single[0][1] < 1) {
        initialize_cachesingle();
    }

    vector<int> if_tetraloops;
    vector<int> if_hexaloops;
    vector<int> if_triloops;

    vector<int> eval_nucs;
    eval_nucs.clear();
    eval_nucs.resize(seq_length);
    for (int i = 0; i < seq_length; ++i) {
        eval_nucs[i] = GET_ACGU_NUM(seq[i]);
    }

    ENERGY_TYPE total_energy = 0;

    ENERGY_TYPE external_energy = 0;

    ENERGY_TYPE M1_energy[seq_length];

    // AMW maybe
    long multi_number_unpaired[seq_length];
    // int external_number_unpaired = 0;

    stack<pair<int, int>> stk; // tuple of (index, page)
    tuple<int, int> inner_loop;

    int num_external_unpaired = 0;
    // bool all_unpaired = true;
    for (int j=0; j<seq_length; j++) {
        M1_energy[j] = 0; // init multi of position j
        multi_number_unpaired[j] = 0;

        if (ref[j] == '.') {
            if (!stk.empty())
                multi_number_unpaired[stk.top().first] += 1;
            else
                num_external_unpaired += 1;
        }

        else if (ref[j] == '(') {
            // all_unpaired = false;
            if (!stk.empty()) { // +1 for outer loop page
                stk.top().second ++;
            }
            stk.push(make_pair(j, 0)); // init page=0
        }

        else if (ref[j] == ')') {
            // all_unpaired = false;
            assert(!stk.empty());
            tuple<int, int> top = stk.top();
            int i = get<0>(top), page = get<1>(top);
            stk.pop();

            int nuci = eval_nucs[i];
            int nucj = eval_nucs[j];
            int nuci1 = (i + 1) < seq_length ? eval_nucs[i + 1] : -1;
            int nucj_1 = (j - 1) > -1 ? eval_nucs[j - 1] : -1;
            int nuci_1 = (i-1>-1) ? eval_nucs[i-1] : -1; // only for calculating v_score_M1
            int nucj1 = (j+1) < seq_length ? eval_nucs[j+1] : -1; // only for calculating v_score_M1

            if (page == 0) { // hairpin
                ENERGY_TYPE newscore = - 100.0 * score_hairpin(i, j, nuci, nuci1, nucj_1, nucj);
                if (eos_cb) (*eos_cb)(i+1, newscore);
                if (is_verbose)
                    printf("Hairpin loop ( %d, %d) %c%c : %.2f\n", i+1, j+1, seq[i], seq[j], newscore);
                total_energy += newscore;
            }

            else if (page == 1) { //single
                int p = get<0>(inner_loop), q = get<1>(inner_loop);

                int nucp_1 = eval_nucs[p-1], nucp = eval_nucs[p], nucq = eval_nucs[q], nucq1 = eval_nucs[q+1];

                ENERGY_TYPE newscore = 0;
                if ((p == i - 1 && q == j + 1) || (p == i + 1 && q == j - 1)) {
                        newscore = -100.0 * score_helix(nuci, nuci1, nucj_1, nucj);
                } else {
                    // single branch

                        newscore = -100.0 * score_single(i, j, p, q, seq_length, nuci, nuci1, nucj_1, nucj, nucp_1, nucp, nucq, nucq1);
                        //newscore = //score_junction_B(p, q, nucp, nucp_1, nucq1, nucq);// +
                            //score_junction_B(j, i, nucj, nucj1, nuci_1, nuci);// + // could move this part out
                            // score_single_without_junctionB(p, q, i, j, nuci_1, nuci, nucj, nucj1)
                            // score_single_without_junctionB(i, j, p, q, nucp, nucp_1, nucq1, nucq);
                }

                // len is actually unused by score_single, so using 0 in its place.
                // ENERGY_TYPE newscore = - score_helix(i,j,p,q);
                //ENERGY_TYPE newscore = - score_helix(nuci, nuci1, nucj_1, nucj);
                if (eos_cb) (*eos_cb)(i+1, newscore);
                if (is_verbose)
                    printf("Interior loop ( %d, %d) %c%c; ( %d, %d) %c%c : %.2f\n", i+1, j+1, seq[i], seq[j], p+1, q+1, seq[p],seq[q], newscore);
                total_energy += newscore;
            }

            else { //multi
                ENERGY_TYPE multi_score = 0;
                multi_score += M1_energy[i];
                multi_score += -100.0 * score_multi(i, j, nuci, nuci1, nucj_1, nucj, seq_length);
                multi_score += -100.0 * score_multi_unpaired(i+1, i + multi_number_unpaired[i]); // current model is 0
                if (eos_cb) (*eos_cb)(i+1, multi_score);
                if (is_verbose)
                    printf("Multi loop ( %d, %d) %c%c : %.2f\n", i+1, j+1, seq[i], seq[j], multi_score);
                total_energy += multi_score;
            }

            //update inner_loop
            inner_loop = make_tuple(i, j);

            // possible M
            if (!stk.empty()) {
                M1_energy[stk.top().first] += -100.0 * score_M1(i, j, j, nuci_1, nuci, nucj, nucj1, seq_length);
            }

            // check if adding external energy
            if (stk.empty()) {
                int k = i - 1;
                int nuck = k > -1 ? eval_nucs[k] : -1;
                int nuck1 = eval_nucs[k+1];
                external_energy +=  - 100.0 * score_external_paired(k+1, j, nuck, nuck1,
                                                            nucj, nucj1, seq_length);
                if (is_verbose) {
                    printf("Adding external_paired ( %d, %d) %c %c %c %c %d : %.2f %.2f\n", k+1, j, nuck, nuck1, nucj, nucj1, seq_length, score_external_paired(k+1, j, nuck, nuck1,
                                                            nucj, nucj1, seq_length), external_energy);
                }

                // external_energy += 0; currently external unpaired is 0
            }
        }
    }

    // accumulated external unpaired number
    external_energy += -100.0 * num_external_unpaired * external_unpaired;

    if (is_verbose)
        printf("External loop : %.2f\n", external_energy);
    if (eos_cb) (*eos_cb)(0, external_energy);
    total_energy += external_energy;

    // if (all_unpaired) return 0;

    return -1 * total_energy;
}
