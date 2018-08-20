/*
 *beamckypar.h*
 header file for beamckypar.

 author: Kai Zhao, Dezhong Deng
 edited by: 02/2018
*/

#ifndef FASTCKY_BEAMCKYPAR_H
#define FASTCKY_BEAMCKYPAR_H

#include <string>
#include <limits>
#include <vector>
#include <unordered_map>

#define DOUBLE_MIN std::numeric_limits<double>::lowest()
#define MIN_CUBE_PRUNING_SIZE 20

enum Manner {
  MANNER_NONE = 0,          // 0: empty
  MANNER_H,                 // 1: hairpin candidate
  MANNER_HAIRPIN,           // 2: hairpin
  MANNER_SINGLE,            // 3: single
  MANNER_HELIX,             // 4: helix
  MANNER_MULTI,             // 5: multi = ..M2.
  MANNER_P_eq_MULTI,        // 6: P = (..multi..)
  MANNER_M2_eq_M_plus_P,    // 7: M2 = M + P
  MANNER_M_eq_M2,           // 8: M = M2
  MANNER_M_eq_M_plus_U,     // 9: M = M + U
  MANNER_M_eq_P,            // 10: M = P
  /* MANNER_C_eq_U, */
  /* MANNER_C_eq_P, */
  MANNER_C_eq_C_plus_U,     // 11: C = C + U
  MANNER_C_eq_C_plus_P,     // 12: C = C + P
};

struct State {
    double score;
    Manner manner;

    union TraceInfo {
        int split;
        struct {
            char l1;
            char l2;
        } paddings;
    };

    TraceInfo trace;

    State(): manner(MANNER_NONE), score(DOUBLE_MIN) {};
    State(double s, Manner m): score(s), manner(m) {};

    void set(double score_, Manner manner_) {
        score = score_; manner = manner_;
    }

    void set(double score_, Manner manner_, int split_) {
        score = score_; manner = manner_; trace.split = split_;
    }

    void set(double score_, Manner manner_, char l1_, char l2_) {
        score = score_; manner = manner_;
        trace.paddings.l1 = l1_; trace.paddings.l2 = l2_;
    }
};


class BeamCKYParser {
public:
    int beam;

    bool use_vienna;
    bool is_candidate_list;
    bool is_cube_pruning;
    bool no_sharp_turn;

    struct DecoderResult {
        std::string structure;
        double score;
        unsigned long num_states;
        double time;
    };

    BeamCKYParser(int beam_size=0,
                  bool vienna=false,
                  bool candidate_list=true,
                  bool nosharpturn=true,
                  bool cube_pruning=true);

    DecoderResult parse(std::string& seq);

private:
    void get_parentheses(char* result);

    unsigned seq_length;

    std::vector<std::unordered_map<int, State>> bestH, bestP, bestM2, bestMulti, bestM;

    // same as bestM, but ordered
    std::vector<std::vector<std::pair<double, int>>> sorted_bestM;

    void sortM(double threshold,
               std::unordered_map<int, State> &beamstep,
               std::vector<std::pair<double, int>>& sorted_stepM);

    std::vector<State> bestC;

    std::vector<int> nucs;

    void prepare(unsigned len);

    void update_if_better(State &state, double newscore, Manner manner) {
        if (state.score < newscore || state.manner == MANNER_NONE)
            state.set(newscore, manner);
    };

    void update_if_better(State &state, double newscore, Manner manner, int split) {
        if (state.score < newscore || state.manner == MANNER_NONE)
            state.set(newscore, manner, split);
    };

    void update_if_better(State &state, double newscore, Manner manner, char l1, char l2) {
        if (state.score < newscore || state.manner == MANNER_NONE)
            state.set(newscore, manner, l1, l2);
    };

    double beam_prune(std::unordered_map<int, State>& beamstep);

    // vector to store the scores at each beam temporarily for beam pruning
    std::vector<std::pair<double, int>> scores;
};

#endif //FASTCKY_BEAMCKYPAR_H
