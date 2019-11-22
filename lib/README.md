# Building the folding engines

* Download & install `emscripten`: https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html#platform-notes-installation-instructions-sdk
* Install `cmake`: https://cmake.org/download/
* `$ source /path/to/emsdk/emsdk_env.sh`
    - (Adds emscripten build tools to the path; do this once per shell)
* `$ emconfigure cmake -DCMAKE_BUILD_TYPE=Release && emmake make clean && emmake make`
    - Pass `-DCMAKE_BUILD_TYPE=Debug` for a debug build (-O0 optimizations), or `Release` for a release build (-O3 optimizations) (NOTE: when building/running EternaJS, ie via `npm start` or `npm run build:<dev|prod>`, you will likely need to set NODE_OPTIONS=--max_old_space_size=4096 in order to increase the momory limit, since the debug build is quite large)
    - Built libraries are output in `nupack/dist`, `vienna/dist`, etc.
* Copy the built libraries into the typescript project:
    - `$ for ii in "NUPACK/nupack3.0.4" "Vienna1/ViennaRNA-1.8.5" "Vienna2/ViennaRNA-2.1.8" "LinearFold/LinearFold"; do cp "$ii"/dist/*.js ../src/eterna/folding/engines/; done`


# Emscripten notes

* C from JS: http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html
* "Embind": http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/embind.html#embind
* When is it safe to call compiled functions: https://kripken.github.io/emscripten-site/docs/getting_started/FAQ.html#faq-when-safe-to-call-compiled-functions
* Loading files: https://kripken.github.io/emscripten-site/docs/porting/files/packaging_files.html#packaging-files
* emcc flags: https://github.com/kripken/emscripten/blob/master/src/settings.js
