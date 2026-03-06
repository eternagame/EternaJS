#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <string>
#include <sstream>
#include <iostream>

#include "Problem.hpp"
#include "Options.hpp"
#include "codon.hpp"
#include "fasta.hpp"

using namespace emscripten;

/**
 * Result structure returned by CDSfold calculation
 */
struct CDSfoldResult {
    std::string sequence;      // Optimized RNA/DNA sequence
    std::string structure;     // Secondary structure in dot-bracket notation
    float mfe;                 // Minimum free energy in kcal/mol
    std::string aminoAcids;    // Verified amino acid translation
    bool success;              // Whether calculation succeeded
    std::string error;         // Error message if failed
};

/**
 * Capture stdout during calculation to extract results
 */
class StdoutCapture {
public:
    StdoutCapture() : old_buf_(std::cout.rdbuf()) {
        std::cout.rdbuf(buffer_.rdbuf());
    }

    ~StdoutCapture() {
        std::cout.rdbuf(old_buf_);
    }

    std::string getOutput() const {
        return buffer_.str();
    }

private:
    std::streambuf* old_buf_;
    std::ostringstream buffer_;
};

/**
 * Parse the captured output from Problem::calculate()
 * Output format:
 *   M  V  K  ...       (amino acids with spacing)
 *   M  V  K  ...       (verified amino acids)
 *   AUGGUG...          (optimized sequence)
 *   (((...)))          (structure)
 *   MFE:-12.34 kcal/mol
 */
static CDSfoldResult parseOutput(const std::string& output) {
    CDSfoldResult result;
    result.success = false;
    result.mfe = 0.0f;

    std::istringstream stream(output);
    std::string line;
    std::vector<std::string> lines;

    while (std::getline(stream, line)) {
        if (!line.empty()) {
            lines.push_back(line);
        }
    }

    // Find the MFE line and work backwards
    for (size_t i = 0; i < lines.size(); i++) {
        if (lines[i].find("MFE:") == 0) {
            std::string mfeStr = lines[i].substr(4);
            size_t spacePos = mfeStr.find(' ');
            if (spacePos != std::string::npos) {
                mfeStr = mfeStr.substr(0, spacePos);
            }
            result.mfe = std::stof(mfeStr);

            if (i >= 1) result.structure = lines[i - 1];
            if (i >= 2) result.sequence = lines[i - 2];

            if (i >= 3) {
                std::string aaLine = lines[i - 3];
                result.aminoAcids = "";
                for (char c : aaLine) {
                    if (c != ' ') result.aminoAcids += c;
                }
            }

            result.success = true;
            break;
        }
    }

    if (!result.success) {
        result.error = "Failed to parse output";
    }

    return result;
}

/**
 * Core implementation: fold an amino acid sequence with the given Options.
 */
static CDSfoldResult foldImpl(const std::string& aaseq, const Options& options) {
    CDSfoldResult result;
    result.success = false;

    try {
        if (aaseq.empty()) {
            result.error = "Empty amino acid sequence";
            return result;
        }

        StdoutCapture capture;
        Problem problem(options, aaseq);
        problem.calculate();
        result = parseOutput(capture.getOutput());
    } catch (const std::exception& e) {
        result.error = std::string("Exception: ") + e.what();
    } catch (...) {
        result.error = "Unknown exception occurred";
    }

    return result;
}

/**
 * Get version information
 */
static std::string getVersion() {
    return "CDSfold_SU 1.0 (Emscripten build)";
}

// Embind bindings
EMSCRIPTEN_BINDINGS(cdsfold) {
    // Bind the result structure
    emscripten::value_object<CDSfoldResult>("CDSfoldResult")
        .field("sequence", &CDSfoldResult::sequence)
        .field("structure", &CDSfoldResult::structure)
        .field("mfe", &CDSfoldResult::mfe)
        .field("aminoAcids", &CDSfoldResult::aminoAcids)
        .field("success", &CDSfoldResult::success)
        .field("error", &CDSfoldResult::error);

    // Bind the Options structure
    emscripten::value_object<Options>("Options")
        .field("maxBpDistance", &Options::max_bp_distance)
        .field("codonsExcluded", &Options::codons_excluded)
        .field("showMemoryUse", &Options::show_memory_use)
        .field("estimateMemoryUse", &Options::estimate_memory_use)
        .field("randomBacktrack", &Options::random_backtrack)
        .field("maximizeMfe", &Options::maximize_mfe)
        .field("partialOpt", &Options::partial_opt)
        .field("optFrom", &Options::opt_from)
        .field("optTo", &Options::opt_to)
        .field("fixedSeed", &Options::fixed_seed)
        .field("temp", &Options::temp)
        .field("jitter", &Options::jitter);

    // fold(aaseq) or fold(aaseq, options) — options defaults to Options{} if omitted
    emscripten::function("fold",
        +[](const std::string& aaseq, emscripten::val optionsArg) -> CDSfoldResult {
            Options opts;
            if (!optionsArg.isNull() && !optionsArg.isUndefined()) {
                opts = optionsArg.as<Options>();
            }
            return foldImpl(aaseq, opts);
        });

    emscripten::function("getVersion",
        +[]() -> std::string {
            return getVersion();
        });

    emscripten::function("createOptions", +[]() -> Options {
        return Options();
    });
}
