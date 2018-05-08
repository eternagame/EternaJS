# Emscripten notes

* C from JS: http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html
* "Embind": http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/embind.html#embind
* When is it safe to call compiled functions: https://kripken.github.io/emscripten-site/docs/getting_started/FAQ.html#faq-when-safe-to-call-compiled-functions
* Loading files: https://kripken.github.io/emscripten-site/docs/porting/files/packaging_files.html#packaging-files

# Building folders

* Download & install `emscripten`: https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html#platform-notes-installation-instructions-sdk
* Install `cmake`: https://cmake.org/download/
* `$ source /path/to/emscripten/emsdk_env.sh`
    - (Adds emscripten build tools to the path; do this once per shell)
* `$ emconfigure cmake -DCMAKE_BUILD_TYPE=Release && emmake make clean && emmake make`
    - (From, eg, the nupack directory)
    - Pass `-DCMAKE_BUILD_TYPE=Debug` for a debug build (-O0 optimizations), or `Release` for a release build (-O3 optimizations)
