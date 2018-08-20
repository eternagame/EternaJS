/*
 *beamckypar.cpp*
 the main LinearFold parser.

 author: Kai Zhao, Dezhong Deng
 edited by: 02/2018
*/

#include "beamckypar.h"

#include <fstream>
#include <iostream>
#include <sys/time.h>
#include <stack>
#include <tuple>
#include <cassert>
#include <unordered_map>

#include "cxxopts.hpp"

#include "utility.h"
#include "utility_v.h"

#define SPECIAL_HP

using namespace std;

void BeamCKYParser::get_parentheses(char* result) {
    memset(result, '.', seq_length);
    result[seq_length] = 0;


    stack<tuple<int, int, State>> stk;

    stk.push(make_tuple(0, seq_length-1, bestC[seq_length-1]));

    while ( !stk.empty() ) {
        tuple<int, int, State> top = stk.top();
        int i = get<0>(top), j = get<1>(top);
        State& state = get<2>(top);
        stk.pop();

        //printf("%d %d: %d %f\n", i, j, state.manner, state.score);

        int k, p, q;

        switch (state.manner) {
            case MANNER_H:
                // this state should not be traced
                break;
            case MANNER_HAIRPIN:
                result[i] = '(';
                result[j] = ')';
                break;
            case MANNER_SINGLE:
                result[i] = '(';
                result[j] = ')';
                p = i + state.trace.paddings.l1;
                q = j - state.trace.paddings.l2;
                stk.push(make_tuple(p, q, bestP[q][p]));
                break;
            case MANNER_HELIX:
                result[i] = '(';
                result[j] = ')';
                stk.push(make_tuple(i+1, j-1, bestP[j-1][i+1]));
                break;
            case MANNER_MULTI:
                p = i + state.trace.paddings.l1;
                q = j - state.trace.paddings.l2;
                stk.push(make_tuple(p, q, bestM2[q][p]));
                break;
            case MANNER_P_eq_MULTI:
                result[i] = '(';
                result[j] = ')';
                stk.push(make_tuple(i, j, bestMulti[j][i]));
                break;
            case MANNER_M2_eq_M_plus_P:
                k = state.trace.split;
                stk.push(make_tuple(i, k, bestM[k][i]));
                stk.push(make_tuple(k+1, j, bestP[j][k+1]));
                break;
            case MANNER_M_eq_M2:
                stk.push(make_tuple(i, j, bestM2[j][i]));
                break;
            case MANNER_M_eq_M_plus_U:
                stk.push(make_tuple(i, j-1, bestM[j-1][i]));
                break;
            case MANNER_M_eq_P:
                stk.push(make_tuple(i, j, bestP[j][i]));
                break;
            // case MANNER_C_eq_U:
            //     // i=0,  skip from i to j
            //     break;
            // case MANNER_C_eq_P:
            //     stk.push(make_tuple(i, j, bestP[j][i]));
            //     break;
            case MANNER_C_eq_C_plus_U:
                k = j - 1;
                if (k != -1)
                    stk.push(make_tuple(0, k, bestC[k]));
                break;
            case MANNER_C_eq_C_plus_P:
                k = state.trace.split;
                if (k != -1) {
                    stk.push(make_tuple(0, k, bestC[k]));
                    stk.push(make_tuple(k+1, j, bestP[j][k+1]));
                }
                else {
                  stk.push(make_tuple(i, j, bestP[j][i]));
                }
                break;
            default:  // MANNER_NONE or other cases
                printf("wrong manner at %d, %d: manner %d\n", i, j, state.manner); fflush(stdout);
                assert(false);
        }
    }

    return;
}


unsigned long quickselect_partition(vector<pair<double, int>>& scores, unsigned long lower, unsigned long upper) {
    double pivot = scores[upper].first;
    while (lower < upper) {
        while (scores[lower].first < pivot) ++lower;
        while (scores[upper].first > pivot) --upper;
        if (scores[lower].first == scores[upper].first) ++lower;
        else if (lower < upper) swap(scores[lower], scores[upper]);

    }
    return upper;
}

// in-place quick-select
double quickselect(vector<pair<double, int>>& scores, unsigned long lower, unsigned long upper, unsigned long k) {
    if ( lower == upper ) return scores[lower].first;
    unsigned long split = quickselect_partition(scores, lower, upper);
    unsigned long length = split - lower + 1;
    if (length == k) return scores[split].first;
    else if (k  < length) return quickselect(scores, lower, split-1, k);
    else return quickselect(scores, split+1, upper, k - length);
}


double BeamCKYParser::beam_prune(std::unordered_map<int, State> &beamstep) {
    scores.clear();
    for (auto &item : beamstep) {
        int i = item.first;
        State &cand = item.second;
        int k = i - 1;
        double newscore = (k >= 0 ? bestC[k].score : 0) + cand.score;
        scores.push_back(make_pair(newscore, i));
    }
    if (scores.size() <= beam) return DOUBLE_MIN;
    //printf("start %d: %d %d\n", j, scores.size()-1, scores.size()-beam);
    double threshold = quickselect(scores, 0, scores.size() - 1, scores.size() - beam);
    for (auto &p : scores) {
        if (p.first < threshold) beamstep.erase(p.second);
    }

    return threshold;
}



void BeamCKYParser::sortM(double threshold,
                          std::unordered_map<int, State> &beamstep,
                          std::vector<std::pair<double, int>> &sorted_stepM) {
    sorted_stepM.clear();
    if (threshold == DOUBLE_MIN) {
        // no beam pruning before, so scores vector not usable
        for (auto &item : beamstep) {
            int i = item.first;
            State &cand = item.second;
            int k = i - 1;
            double newscore = (k >= 0 ? bestC[k].score : 0) + cand.score;
            sorted_stepM.push_back(make_pair(newscore, i));
        }
    } else {
        for (auto &p : scores) {
            if (p.first >= threshold) sorted_stepM.push_back(p);
        }
    }

    sort(sorted_stepM.begin(), sorted_stepM.end(), std::greater<pair<double, int>>());
}


void BeamCKYParser::prepare(unsigned len) {
    seq_length = len;

    bestH.clear();
    bestH.resize(seq_length);
    bestP.clear();
    bestP.resize(seq_length);
    bestM2.clear();
    bestM2.resize(seq_length);
    bestM.clear();
    bestM.resize(seq_length);
    bestC.clear();
    bestC.resize(seq_length);
    bestMulti.clear();
    bestMulti.resize(seq_length);

    if(is_cube_pruning) {
        sorted_bestM.clear();
        sorted_bestM.resize(seq_length);
    }

    nucs.clear();
    nucs.resize(seq_length);

    scores.reserve(seq_length);
}


BeamCKYParser::DecoderResult BeamCKYParser::parse(string& seq) {
    struct timeval starttime, endtime;

    // number of states
    unsigned long nos_H = 0, nos_P = 0, nos_M2 = 0,
            nos_M = 0, nos_C = 0, nos_Multi = 0;

    gettimeofday(&starttime, NULL);

    prepare(static_cast<unsigned>(seq.length()));

    for (int i = 0; i < seq_length; ++i)
        nucs[i] = GET_ACGU_NUM(seq[i]);

    vector<int> next_pair[NOTON];
    {
        for (int nuci = 0; nuci < NOTON; ++nuci) {
            next_pair[nuci].resize(seq_length, -1);
            int next = -1;
            for (int j = seq_length-1; j >=0; --j) {
                next_pair[nuci][j] = next;
                if (_allowed_pairs[nuci][nucs[j]]) next = j;
            }
        }
    }

    vector<int> if_tetraloops;
    vector<int> if_hexaloops;
    vector<int> if_triloops;

#ifdef SPECIAL_HP
    //if(special_hp)
    if (use_vienna)
        v_init_tetra_hex_tri(seq, seq_length, if_tetraloops, if_hexaloops, if_triloops);
#endif

    // start CKY decoding
    if (use_vienna) {
        if(seq_length > 0) bestC[0].set(- v_score_external_unpaired(0, 0), MANNER_C_eq_C_plus_U);
        if(seq_length > 1) bestC[1].set(- v_score_external_unpaired(0, 1), MANNER_C_eq_C_plus_U);
    }
    else {
        if(seq_length > 0) bestC[0].set(score_external_unpaired(0, 0), MANNER_C_eq_C_plus_U);
        if(seq_length > 1) bestC[1].set(score_external_unpaired(0, 1), MANNER_C_eq_C_plus_U);
    }
    ++nos_C;

    // from left to right
    for(int j = 0; j < seq_length; ++j) {
        int nucj = nucs[j];
        int nucj1 = (j+1) < seq_length ? nucs[j+1] : -1;

        unordered_map<int, State>& beamstepH = bestH[j];
        unordered_map<int, State>& beamstepMulti = bestMulti[j];
        unordered_map<int, State>& beamstepP = bestP[j];
        unordered_map<int, State>& beamstepM2 = bestM2[j];
        unordered_map<int, State>& beamstepM = bestM[j];
        State& beamstepC = bestC[j];

        // beam of H
        {
            if (beam > 0 && beamstepH.size() > beam) beam_prune(beamstepH);

            {
                // for nucj put H(j, j_next) into H[j_next]
                int jnext = next_pair[nucj][j];
                if (no_sharp_turn) while (jnext - j < 4 && jnext != -1) jnext = next_pair[nucj][jnext];
                if (jnext != -1) {
                    int nucjnext = nucs[jnext];
                    int nucjnext_1 = (jnext - 1) > -1 ? nucs[jnext - 1] : -1;

                    double newscore;

                    if (use_vienna) {
                        int tetra_hex_tri = -1;
#ifdef SPECIAL_HP
                        // if (special_hp) {
                        if (jnext-j-1 == 4) // 6:tetra
                            tetra_hex_tri = if_tetraloops[j];
                        else if (jnext-j-1 == 6) // 8:hexa
                            tetra_hex_tri = if_hexaloops[j];
                        else if (jnext-j-1 == 3) // 5:tri
                            tetra_hex_tri = if_triloops[j];
                        // }
#endif
                        newscore = - v_score_hairpin(j, jnext, nucj, nucj1, nucjnext_1, nucjnext, tetra_hex_tri);
                    }
                    else
                        newscore = score_hairpin(j, jnext, nucj, nucj1, nucjnext_1, nucjnext);
                    // this candidate must be the best one at [j, jnext]
                    // so no need to check the score
                    update_if_better(bestH[jnext][j], newscore, MANNER_H);
                    ++ nos_H;
                }
            }

            {
                // for every state h in H[j]
                //   1. extend h(i, j) to h(i, jnext)
                //   2. generate p(i, j)
                for (auto &item : beamstepH) {
                    int i = item.first;
                    State &state = item.second;
                    int nuci = nucs[i];
                    int jnext = next_pair[nuci][j];

                    if (jnext != -1) {
                        int nuci1 = (i + 1) < seq_length ? nucs[i + 1] : -1;
                        int nucjnext = nucs[jnext];
                        int nucjnext_1 = (jnext - 1) > -1 ? nucs[jnext - 1] : -1;

                        // 1. extend h(i, j) to h(i, jnext)
                        double newscore;

                        if (use_vienna) {
                            int tetra_hex_tri = -1;
#ifdef SPECIAL_HP
                            // if (special_hp) {
                            if (jnext-i-1 == 4) // 6:tetra
                                tetra_hex_tri = if_tetraloops[i];
                            else if (jnext-i-1 == 6) // 8:hexa
                                tetra_hex_tri = if_hexaloops[i];
                            else if (jnext-i-1 == 3) // 5:tri
                                tetra_hex_tri = if_triloops[i];
                            // }
#endif
                            newscore = - v_score_hairpin(i, jnext, nuci, nuci1, nucjnext_1, nucjnext, tetra_hex_tri);
                        }
                        else
                            newscore = score_hairpin(i, jnext, nuci, nuci1, nucjnext_1, nucjnext);
                        // this candidate must be the best one at [i, jnext]
                        // so no need to check the score
                        update_if_better(bestH[jnext][i], newscore, MANNER_H);
                        ++nos_H;
                    }

                    // 2. generate p(i, j)
                    {
                        update_if_better(beamstepP[i], state.score, MANNER_HAIRPIN);
                        ++ nos_P;
                    }
                }
            }
        }
        if (j == 0) continue;
        //printf("H at %d\n", j); fflush(stdout);

        // beam of Multi
        {
            if (beam > 0 && beamstepMulti.size() > beam) beam_prune(beamstepMulti);

            // for every state in Multi[j]
            //   1. extend (i, j) to (i, jnext)
            //   2. generate P (i, j)
            for(auto& item : beamstepMulti) {
                int i = item.first;
                State& state = item.second;
                int nuci = nucs[i];
                int nuci1 = nucs[i+1];
                int jnext = next_pair[nuci][j];

                // 1. extend (i, j) to (i, jnext)
                {
                    char new_l1 = state.trace.paddings.l1;
                    int new_l2 = state.trace.paddings.l2 + jnext - j;
                    if (jnext != -1 && new_l1 + new_l2 <= SINGLE_MAX_LEN) {
                        // 1. extend (i, j) to (i, jnext)
                        double newscore;
                        if (use_vienna)
                            newscore = state.score - v_score_multi_unpaired(j, jnext - 1);
                        else
                            newscore = state.score + score_multi_unpaired(j, jnext - 1);
                        // this candidate must be the best one at [i, jnext]
                        // so no need to check the score
                        update_if_better(bestMulti[jnext][i], newscore, MANNER_MULTI,
                                         new_l1,
                                         static_cast<char>(new_l2)
                        );
                        ++nos_Multi;
                    }
                }

                // 2. generate P (i, j)
                {
                    double newscore;
                    if (use_vienna)
                        newscore = state.score -
                            v_score_multi(i, j, nuci, nuci1, nucs[j-1], nucj, seq_length);
                    else
                        newscore = state.score +
                            score_multi(i, j, nuci, nuci1, nucs[j-1], nucj, seq_length);
                    update_if_better(beamstepP[i], newscore, MANNER_P_eq_MULTI);
                    ++ nos_P;
                }
            }
        }

        // beam of P
        {
            if (beam > 0 && beamstepP.size() > beam) beam_prune(beamstepP);

            // for every state in P[j]
            //   1. generate new helix/bulge
            //   2. M = P
            //   3. M2 = M + P
            //   4. C = C + P
            bool use_cube_pruning = is_cube_pruning && beam > MIN_CUBE_PRUNING_SIZE
                                    && beamstepP.size() > MIN_CUBE_PRUNING_SIZE;
            for(auto& item : beamstepP) {
                int i = item.first;
                State& state = item.second;
                int nuci = nucs[i];
                int nuci_1 = (i-1>-1) ? nucs[i-1] : -1;

                // 1. generate new helix / single_branch
                // new state is of shape p..i..j..q
                if (i >0 && j<seq_length-1) {
                    double precomputed;
                    if (use_vienna)
                        precomputed = 0;
                    else
                        precomputed = score_junction_B(j, i, nucj, nucj1, nuci_1, nuci);
                    for (int p = i - 1; p > std::max(i - SINGLE_MAX_LEN, -1); --p) {
                        int nucp = nucs[p];
                        int q = next_pair[nucp][j];
                        while (q != -1 && ((i - p) + (q - j) <= SINGLE_MAX_LEN)) {
                            int nucq = nucs[q];
                            int nucp_1 = nucs[p - 1];
                            int nucp1 = nucs[p + 1];
                            int nucq_1 = nucs[q - 1];
                            int nucq1 = nucs[q + 1];
                            int nuci1 = nucs[i + 1];
                            int nucj_1 = nucs[j - 1];
                            // int nucq = nucs[q];
                            // int nucp1 = nucs[p + 1];
                            // int nucq_1 = nucs[q - 1];

                            if (p == i - 1 && q == j + 1) {
                                // helix
                                double newscore;
                                if (use_vienna)
                                    newscore = -v_score_single(p,q,i,j, nucp, nucp1, nucq_1, nucq,
                                                             nuci_1, nuci, nucj, nucj1)
                                        + state.score;
                                else
                                    newscore = score_helix(nucp, nucp1, nucq_1, nucq) + state.score;
                                update_if_better(bestP[q][p], newscore, MANNER_HELIX);
                                ++nos_P;
                            } else {
                                // single branch
                                double newscore;
                                if (use_vienna)
                                    newscore = - v_score_single(p,q,i,j, nucp, nucp1, nucq_1, nucq,
                                                   nuci_1, nuci, nucj, nucj1)
                                        + state.score;
                                else
                                    newscore = score_junction_B(p, q, nucp, nucp1, nucq_1, nucq) +
                                        precomputed +
                                        score_single_without_junctionB(p, q, i, j,
                                                                       nuci_1, nuci, nucj, nucj1) +
                                        state.score;
                                update_if_better(bestP[q][p], newscore, MANNER_SINGLE,
                                                 static_cast<char>(i - p),
                                                 static_cast<char>(q - j));
                                ++nos_P;
                            }

                            q = next_pair[nucp][q];
                        }
                    }
                }
                //printf(" helix / single at %d\n", j); fflush(stdout);

                // 2. M = P
                if(i > 0 && j < seq_length-1){
                    double newscore;
                    if (use_vienna)
                        newscore = - v_score_M1(i, j, j, nuci_1, nuci, nucj, nucj1, seq_length) + state.score;
                    else
                        newscore = score_M1(i, j, j, nuci_1, nuci, nucj, nucj1, seq_length) + state.score;
                    update_if_better(beamstepM[i], newscore, MANNER_M_eq_P);
                    ++ nos_M;
                }
                //printf(" M = P at %d\n", j); fflush(stdout);

                // 3. M2 = M + P
                if(!use_cube_pruning) {
                    int k = i - 1;
                    if ( k > 0 && !bestM[k].empty()) {
                        double M1_score;
                        if (use_vienna)
                            M1_score = - v_score_M1(i, j, j, nuci_1, nuci, nucj, nucj1, seq_length) + state.score;
                        else
                            M1_score = score_M1(i, j, j, nuci_1, nuci, nucj, nucj1, seq_length) + state.score;
                        // candidate list
                        auto bestM2_iter = beamstepM2.find(i);
                        if ((!is_candidate_list) || bestM2_iter==beamstepM2.end() || M1_score > bestM2_iter->second.score) {
                            for (auto &m : bestM[k]) {
                                int newi = m.first;
                                // eq. to first convert P to M1, then M2/M = M + M1
                                double newscore = M1_score + m.second.score;
                                update_if_better(beamstepM2[newi], newscore, MANNER_M2_eq_M_plus_P, k);
                                //update_if_better(bestM[j][newi], newscore, MANNER_M_eq_M_plus_P, k);
                                ++nos_M2;
                                //++nos_M;
                            }
                        }
                    }
                }
                //printf(" M/M2 = M + P at %d\n", j); fflush(stdout);

                // 4. C = C + P
                {
                    int k = i - 1;
                    if (k >= 0) {
                      State& prefix_C = bestC[k];
                      if (prefix_C.manner != MANNER_NONE) {
                        int nuck = nuci_1;
                        int nuck1 = nuci;
                        double newscore;
                        if (use_vienna)
                            newscore = - v_score_external_paired(k+1, j, nuck, nuck1,
                                                                 nucj, nucj1, seq_length) +
                                prefix_C.score + state.score;
                        else
                            newscore = score_external_paired(k+1, j, nuck, nuck1,
                                                             nucj, nucj1, seq_length) +
                                prefix_C.score + state.score;
                        update_if_better(beamstepC, newscore, MANNER_C_eq_C_plus_P, k);
                        ++ nos_C;
                      }
                    } else {
                        double newscore;
                        if (use_vienna)
                            newscore = - v_score_external_paired(0, j, -1, nucs[0],
                                                                 nucj, nucj1, seq_length) +
                                state.score;
                        else
                            newscore = score_external_paired(0, j, -1, nucs[0],
                                                             nucj, nucj1, seq_length) +
                                state.score;
                        update_if_better(beamstepC, newscore, MANNER_C_eq_C_plus_P, -1);
                        ++ nos_C;
                    }
                }
                //printf(" C = C + P at %d\n", j); fflush(stdout);
            }

            if (use_cube_pruning) {
                // 3. M2 = M + P with cube pruning
                vector<int> valid_Ps;
                vector<double> M1_scores;
                for (auto &item : beamstepP) {
                    int i = item.first;
                    State &state = item.second;
                    int nuci = nucs[i];
                    int nuci_1 = (i - 1 > -1) ? nucs[i - 1] : -1;
                    int k = i - 1;

                    // group candidate Ps
                    if (k > 0 && !bestM[k].empty()) {
                        assert(bestM[k].size() == sorted_bestM[k].size());
                        double M1_score;
                        if (use_vienna)
                            M1_score = - v_score_M1(i, j, j, nuci_1, nuci, nucj, nucj1, seq_length) + state.score;
                        else
                            M1_score = score_M1(i, j, j, nuci_1, nuci, nucj, nucj1, seq_length) + state.score;
                        auto bestM2_iter = beamstepM2.find(i);
                        if ((!is_candidate_list) || bestM2_iter == beamstepM2.end()
                            || M1_score > bestM2_iter->second.score) {
                            valid_Ps.push_back(i);
                            M1_scores.push_back(M1_score);
                        }
                    }
                }

                // build max heap
                // heap is of form (heuristic score, (index of i in valid_Ps, index of M in bestM[i-1]))
                vector<pair<double, pair<int, int>>> heap;
                for (int p = 0; p < valid_Ps.size(); ++p) {
                    int i = valid_Ps[p];
                    int k = i - 1;
                    heap.push_back(make_pair(M1_scores[p] + sorted_bestM[k][0].first,
                                             make_pair(p, 0)
                    ));
                    push_heap(heap.begin(), heap.end());
                }

                // start cube pruning
                // stop after beam size M2 states being filled
                int filled = 0;
                // exit when filled >= beam and current score < prev score
                double prev_score = DOUBLE_MIN;
                double current_score = DOUBLE_MIN;
                while ((filled < beam || current_score == prev_score) && !heap.empty()) {
                    auto &top = heap.front();
                    prev_score = current_score;
                    current_score = top.first;
                    int index_P = top.second.first;
                    int index_M = top.second.second;
                    int i = valid_Ps[top.second.first];
                    int k = i - 1;
                    int newi = sorted_bestM[k][index_M].second;
                    double newscore = M1_scores[index_P] + bestM[k][newi].score;
                    pop_heap(heap.begin(), heap.end());
                    heap.pop_back();

                    if (beamstepM2[newi].manner == MANNER_NONE) {
                        ++filled;
                        update_if_better(beamstepM2[newi], newscore, MANNER_M2_eq_M_plus_P, k);
                        ++nos_M2;
                    } else {
                        assert(beamstepM2[newi].score > newscore - 1e-8);
                    }

                    ++index_M;
                    while (index_M < sorted_bestM[k].size()) {
                        // candidate_score is a heuristic score
                        double candidate_score = M1_scores[index_P] + sorted_bestM[k][index_M].first;
                        int candidate_newi = sorted_bestM[k][index_M].second;
                        if (beamstepM2.find(candidate_newi) == beamstepM2.end()) {
                            heap.push_back(make_pair(candidate_score,
                                                     make_pair(index_P, index_M)));
                            push_heap(heap.begin(), heap.end());
                            break;
                        } else {
                            // based on the property of cube pruning, the new score must be worse
                            // than the state already inserted
                            // so we keep iterate through the candidate list to find the next
                            // candidate
                            ++index_M;
                            assert(beamstepM2[candidate_newi].score >
                                   M1_scores[index_P] + bestM[k][candidate_newi].score - 1e-8);
                        }
                    }
                }
            }
        }
        //printf("P at %d\n", j); fflush(stdout);

        // beam of M2
        {
            if (beam > 0 && beamstepM2.size() > beam) beam_prune(beamstepM2);

            // for every state in M2[j]
            //   1. multi-loop  (by extending M2 on the left)
            //   2. M = M2
            for(auto& item : beamstepM2) {
                int i = item.first;
                State& state = item.second;

                // 1. multi-loop
                {
                    for (int p = i-1; p > std::max(i - SINGLE_MAX_LEN, -1); --p) {
                        int nucp = nucs[p];
                        int q = next_pair[nucp][j];
                        if (q != -1 && ((i - p) + (q - j) <= SINGLE_MAX_LEN)) {
                            // the current shape is p..i M2 j ..q

                            double newscore;
                            if (use_vienna)
                                newscore = - v_score_multi_unpaired(p+1, i-1) -
                                    v_score_multi_unpaired(j+1, q-1) + state.score;
                            else
                                newscore = score_multi_unpaired(p+1, i-1) +
                                    score_multi_unpaired(j+1, q-1) + state.score;

                            update_if_better(bestMulti[q][p], newscore, MANNER_MULTI,
                                             static_cast<char>(i - p),
                                             static_cast<char>(q - j));
                            ++ nos_Multi;

                            //q = next_pair[nucp][q];
                        }
                    }
                }

                // 2. M = M2
                {
                    update_if_better(beamstepM[i], state.score, MANNER_M_eq_M2);
                    ++ nos_M;
                }
            }
        }
        //printf("M2 at %d\n", j); fflush(stdout);

        // beam of M
        {
            double threshold = DOUBLE_MIN;
            if (beam > 0 && beamstepM.size() > beam) threshold = beam_prune(beamstepM);

            if(is_cube_pruning) {
                sortM(threshold, beamstepM, sorted_bestM[j]);
            }

            // for every state in M[j]
            //   1. M = M + unpaired
            for(auto& item : beamstepM) {
                int i = item.first;
                State& state = item.second;
                if (j < seq_length-1) {
                    double newscore;
                    if (use_vienna)
                        newscore = - v_score_multi_unpaired(j + 1, j + 1) + state.score;
                    else
                        newscore = score_multi_unpaired(j + 1, j + 1) + state.score;
                    update_if_better(bestM[j+1][i], newscore, MANNER_M_eq_M_plus_U);
                    ++ nos_M;
                }
            }
        }
        //printf("M at %d\n", j); fflush(stdout);

        // beam of C
        {
            // C = C + U
            if (j < seq_length-1) {
                double newscore;
                if (use_vienna)
                    newscore = -v_score_external_unpaired(j+1, j+1) + beamstepC.score;
                else
                    newscore = score_external_unpaired(j+1, j+1) + beamstepC.score;
                update_if_better(bestC[j+1], newscore, MANNER_C_eq_C_plus_U);
                ++ nos_C;
            }
        }
        //printf("C at %d\n", j); fflush(stdout);

    }  // end of for-loo j

    State& viterbi = bestC[seq_length-1];

    char result[seq_length+1];
    get_parentheses(result);

    gettimeofday(&endtime, NULL);
    double elapsed_time = endtime.tv_sec - starttime.tv_sec + (endtime.tv_usec-starttime.tv_usec)/1000000.0;

    if (use_vienna)
        printf("Energy(kcal/mol): %.2f\n", viterbi.score / -100.0);
    else
        printf("Viterbi score: %f\n", viterbi.score);
    unsigned long nos_tot = nos_H + nos_P + nos_M2 + nos_Multi + nos_M + nos_C;
    printf("Time: %f len: %d score %f #states %lu H %lu P %lu M2 %lu Multi %lu M %lu C %lu\n",
           elapsed_time, seq_length, viterbi.score, nos_tot,
           nos_H, nos_P, nos_M2, nos_Multi, nos_M, nos_C);

    fflush(stdout);

    return {string(result), viterbi.score, nos_tot, elapsed_time};
}

BeamCKYParser::BeamCKYParser(int beam_size,
                             bool vienna,
                             bool candidate_list,
                             bool nosharpturn,
                             bool cube_pruning)
    : beam(beam_size), use_vienna(vienna), is_candidate_list(candidate_list),
          no_sharp_turn(nosharpturn), is_cube_pruning(cube_pruning) {
    if (use_vienna)
        initialize();
    else {
        initialize();
        initialize_cachesingle();
    }
}


// -------------------------------------------------------------

int main(int argc, char** argv){

    int beamsize = 0;
    bool use_vienna = false;
    bool is_cube_pruning = true;
    bool is_candidate_list = true;
    bool sharpturn = false;
    string seq_file_name;

    cxxopts::Options options(argv[0], "Left-to-right CKY parser with beam");

    try {
        options.add_options()
                ("b,beam", "beam size (default 100)", cxxopts::value<int>()->default_value("100"))
                // ("f,file", "input file", cxxopts::value<string>())
                ("v,vienna", "use vienna parameters (default false)",
                 cxxopts::value<bool>())
                ("no_cp", "disable cube pruning (default false)",
                 cxxopts::value<bool>())
                ("no_cl", "disable candidate list (default true)",
                 cxxopts::value<bool>())
                ("sharpturn", "enable sharp turn in prediction (default false)",
                 cxxopts::value<bool>());

        options.parse(argc, argv);

        beamsize = options["b"].as<int>();
        use_vienna = options["vienna"].as<bool>();
        is_candidate_list = !options["no_cl"].as<bool>();
        is_cube_pruning = !options["no_cp"].as<bool>();
        sharpturn = options["sharpturn"].as<bool>();
        // seq_file_name = options["f"].as<string>();

    } catch (const cxxopts::OptionException& e) {
        cout << "error parsing options: " << e.what() << endl;
        cout << options.help() << endl;
        exit(1);
    }

    // ifstream f_seq(seq_file_name);

    // variables for decoding
    int num=0, total_len = 0;
    unsigned long long total_states = 0;
    double total_score = .0;
    double total_time = .0;

    printf("Running configuration: beam size %d; use_vienna: %d; candidate list %d; sharpturn %d; cube pruning %d;\n",
           beamsize, use_vienna, is_candidate_list, sharpturn, is_cube_pruning
           //seq_file_name.c_str()
    ); fflush(stdout);

    BeamCKYParser parser(beamsize, use_vienna, is_candidate_list, !sharpturn, is_cube_pruning);

    // go through the seq file to decode each seq
    //for (string seq; getline(f_seq, seq);) {
    for (string seq; getline(cin, seq);) {
        if (seq.length() == 0)
            continue;

        if (seq[0] == ';' || seq[0] == '>') {
            printf("%s\n", seq.c_str());
            continue;
        }

        if (!isalpha(seq[0])){
            printf("Unrecognized sequence: %s\n", seq.c_str());
            continue;
        }

        printf("seq:\n%s\n", seq.c_str()); // passed

        BeamCKYParser::DecoderResult result = parser.parse(seq);

        printf(">structure\n%s\n\n", result.structure.c_str());

        ++num;
        total_len += seq.length();
        total_score += result.score;
        total_states += result.num_states;
        total_time += result.time;
    }

    // f_seq.close();

    double dnum = (double)num;
    printf("num_seq: %d; avg_len: %.1f ", num, total_len/dnum);
    printf("avg_score: %.4f; avg_time: %.3f; tot_time: %f; avg_states: %.1f\n",
           total_score/dnum, total_time/dnum, total_time, total_states/dnum);
    return 0;
}
