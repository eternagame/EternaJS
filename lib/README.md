# Building the folding engines

NOTE: If you have difficulty with this install process, especially if you are a Windows user, please feel free to get in touch with us at eternagame@gmail.com and we'll be able to provide some additional assistance.

Please note that the build process currently relies on *nix-specific features (available on Mac and Linux distributions), and so is not able to be done on Windows natively. We suggest using Windows Subsystem for Linux, though it is possible that mingw or cygwin would work (please update this if you try it!).

* Download & install `emscripten`: https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html#platform-notes-installation-instructions-sdk
* Install `cmake`: https://cmake.org/download/
* Download and extract the tarballs for Vienna 1.8.5, Vienna 2.1.8, and nupack 3.0.4 into the corresponding directories (within this lib directory) of each model (see https://www.tbi.univie.ac.at/RNA/#old and http://nupack.org/downloads - note that for NUPACK that while this version is not directly linked, exchanging the version number in the URL of the latest tarball will allow you to download the correct version)
* Download and extract [contrafold](http://contra.stanford.edu/contrafold/contrafold_v2_02.tar.gz) into the contrafold directory.
* Clone the [LinearFold repository]((https://github.com/LinearFold/LinearFold)).  Note that the most recent definitely-working hash is:  05c9803ae700fc528c82e63cec12ec7c9d3b498a
    - you can obtain this revision via:
      ```sh
	  git clone https://github.com/LinearFold/LinearFold.git
	  cd LinearFold
	  git reset --hard 05c9803ae700fc528c82e63cec12ec7c9d3b498a
      ```
* Clone the [LinearPartition repository]((https://github.com/LinearFold/LinearPartition)).  Note that the most recent definitely-working hash is:  be39ec075cc48769230ce07eb53900493649b639
    - you can obtain this revision via:
      ```sh
	  git clone https://github.com/LinearFold/LinearPartition.git
	  cd LinearPartition
	  git reset --hard be39ec075cc48769230ce07eb53900493649b639
      ```
* Clone the [RNApuzzler repository]((https://github.com/dwiegreffe/RNApuzzler)). Note that the most recent definitely-working hash is:  0b365e31d2436d426858ed70f931da4fdced2397
    - you can obtain this revision via:
      ```sh
	  git clone https://github.com/dwiegreffe/RNApuzzler.git
	  cd RNApuzzler
	  git reset --hard 0b365e31d2436d426858ed70f931da4fdced2397
	  ```
* If you have an appropriate license (academic or commercial) granting you permission, you can clone the [EternaFold repository](https://github.com/eternagame/EternaFold) to enable the EternaFold and LinearFoldE folders:
    - you can obtain a working revision via:
        ```sh
        git clone https://github.com/eternagame/EternaFold
        cd EternaFold
        git reset --hard 62fbb1ccc4c7e672a28d41ba1eef7fb796fd4f79
        ```
* `$ ./patch.sh`
    - This applies the patchfiles with Eterna's modifications (e.g., for getting substructure energies and some energetic
    modifications) to the energy libraries.
    - To generate fresh diffs, make sure you have a fresh copy of the energy model (so that the patched code is in `<enginefolder>` and the original is in `<enginefolder>_stock`) and run `diff -X .gitignore -ur <enginefolder>_stock <enginefolder> > <enginename>-eterna.patch`
* `$ source /path/to/emsdk/emsdk_env.sh`
    - This adds emscripten build tools to the path - do this once per shell
* `$ emcmake cmake -DCMAKE_BUILD_TYPE=Release && emmake make clean && emmake make install`
    - Pass `-DCMAKE_BUILD_TYPE=Debug` for a debug build (-O0 optimizations), or `Release` for a release build (-O3 optimizations) (NOTE: when building/running EternaJS (i.e. via `npm start` or `npm run build:<dev|prod>`) with a debug build of these libraries, you will likely need to set NODE_OPTIONS=--max_old_space_size=4096 in order to increase the memory limit, since the debug build is quite large)
    - Built libraries are output in `nupack/dist`, `vienna/dist`, etc. When running `emmake make install`, they are automatically copied into `src/eterna/folding/engines`, but you can disable this functionality by running `emmake make` instead

# Emscripten notes

* C from JS: http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html
* "Embind": http://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/embind.html#embind
* When is it safe to call compiled functions: https://kripken.github.io/emscripten-site/docs/getting_started/FAQ.html#faq-when-safe-to-call-compiled-functions
* Loading files: https://kripken.github.io/emscripten-site/docs/porting/files/packaging_files.html#packaging-files
* emcc flags: https://github.com/kripken/emscripten/blob/master/src/settings.js
