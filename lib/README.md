# Building the folding engines

* Download & install `emscripten`: https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html#platform-notes-installation-instructions-sdk
* Install `cmake`: https://cmake.org/download/
* Download the tarballs for Vienna 1.8.5, Vienna 2.1.8, and nupack 3.0.4 into the corresponding directories
* Clone the LinearFold repository at commit 4d5a67b47b9dfcde66488f6c05b7583a4c9eff50
* `$ ./patch.sh`
    - This applies the patchfiles with eterna's modifications (eg, for getting substructure energies and some energetic
    modifications) to the energy libraries.
    - To generate fresh diffs, make sure you have a fresh copy of the energy model (so that the patched code is in `<enginefolder>` and the original is in `<enginefolder>_stock`) and run `diff -X .gitignore -ur <enginefolder>_stock <enginefolder> > <enginename>-eterna.patch`
* `$ source /path/to/emsdk/emsdk_env.sh`
    - This adds emscripten build tools to the path - do this once per shell
* `$ emconfigure cmake -DCMAKE_BUILD_TYPE=Release && emmake make clean && emmake make install`
    - Pass `-DCMAKE_BUILD_TYPE=Debug` for a debug build (-O0 optimizations), or `Release` for a release build (-O3 optimizations) (NOTE: when building/running EternaJS (ie via `npm start` or `npm run build:<dev|prod>`) with a debug build of these libraries, you will likely need to set NODE_OPTIONS=--max_old_space_size=4096 in order to increase the momory limit, since the debug build is quite large)
    - Built libraries are output in `nupack/dist`, `vienna/dist`, etc. When running `emmake make install`, they are automatically copied into `src/eterna/folding/engines`, but you can disable this functionality by running `emmake make` instead

Note that the build process currently relies on *nix-specific features (available on Mac and Linux distrobutions), and so is not able to be done on Windows natively. We suggest using Windows Subsystem for Linux, though it is possible that mingw or cygwin would work (please update this if you try it!).

# Emscripten notes

* C from JS: http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html
* "Embind": http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/embind.html#embind
* When is it safe to call compiled functions: https://kripken.github.io/emscripten-site/docs/getting_started/FAQ.html#faq-when-safe-to-call-compiled-functions
* Loading files: https://kripken.github.io/emscripten-site/docs/porting/files/packaging_files.html#packaging-files
* emcc flags: https://github.com/kripken/emscripten/blob/master/src/settings.js
