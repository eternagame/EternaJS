# Building the folding engines

NOTE: If you have difficulty with this install process, especially if you are a Windows user, please feel free to get in
touch with us at support@eternagame.org and we'll be able to provide some additional assistance.

Please note that the build process currently relies on *nix-specific features (available on Mac and Linux distributions),
and so is not able to be done on Windows natively. We suggest using Windows Subsystem for Linux, though it is possible that
mingw or cygwin would work (please update this if you try it!).

Note that in order to have a functional installation of EternaJS, you do not necessarily need to build all libraries.
Namely, if a folding engine is not built, EternaJS will run with it disabled (and tests for that engine will be skipped).
However, naturally puzzles that require these features will not run.

## Prerequisites
* [emscripten](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html#platform-notes-installation-instructions-sdk) (for libraries except RibonanzaNet)
* [cmake](https://cmake.org/download/) (for libraries except RibonanzaNet)
* [anaconda or miniconda](https://docs.anaconda.com/free/distro-or-miniconda/) (for RibonanzaNet)

## Prepare libraries
Due to licensing and availability restrictions, we do not (and in some cases cannot) provide a way to automatically
download these third party libraries. Please make sure to review their licenses to ensure your usage is compliant.

As a general rule, the library code is cloned or extracted into the subfolder of this directory (lib/) for that library.
Eg, the Vienna2 tarball will be extracted into lib/Vienna2/ViennaRNA-2.1.8, and the LinearFold and LinearPartition repositories
are cloned into lib/LinearFold/LinearFold and lib/LinearFold/LinearPartition respectively.

* For Vienna1 and Vienna2, download Vienna 1.8.5 and Vienna 2.1.8 respectively from https://www.tbi.univie.ac.at/RNA/#old
    - Note that while Vienna 2.1.8 is the required download version, we apply patches that make it equivilent to version 2.1.9 (our patches should be updated to apply on 2.1.9 directly in the future)

* For NUPACK, download nupack 3.0.4 from http://nupack.org/downloads
    - Note that for NUPACK that while this version is not directly linked, exchanging the version number in the URL of the latest tarball will allow you to download the correct version)

* For Contrafold, download contrafold 2.02 from http://contra.stanford.edu/contrafold/contrafold_v2_02.tar.gz

* For LinearFold (including both the LinearFoldV and LinearFoldC models), clone [LinearFold](https://github.com/LinearFold/LinearFold.git) and (Linearpartition)[https://github.com/LinearFold/LinearPartition.git]
    - You can obtain the latest verified working revisions via:
      ```sh
	  git clone https://github.com/LinearFold/LinearFold.git
	  cd LinearFold
	  git reset --hard 05c9803ae700fc528c82e63cec12ec7c9d3b498a
      ```
      ```sh
	  git clone https://github.com/LinearFold/LinearPartition.git
	  cd LinearPartition
	  git reset --hard be39ec075cc48769230ce07eb53900493649b639
      ```
* For EternaFold (including both the EternaFold and LinearFoldE models), clone [EternaFold](https://github.com/eternagame/EternaFold) (note that LinearFoldE also requires LinearFold and LinearPartition set up as above)
    - You can obtain the latest verified working working revision via:
      ```sh
      git clone https://github.com/eternagame/EternaFold
      cd EternaFold
      git reset --hard 62fbb1ccc4c7e672a28d41ba1eef7fb796fd4f79
      ```

* For RibonanzaNet-SS, clone [RibonanzaNet](https://github.com/Shujun-He/RibonanzaNet) and download the pretrained weights
    - You can obtain the latest verified working revision of RibonanzaNet via:
      ```sh
      git clone https://github.com/Shujun-He/RibonanzaNet
      cd RibonanzaNet
      git reset --hard efebd44e79615fb23f685971875e8903b04cbdce
      ```
    - You can obtain the intended version of the pretrained weights from https://www.kaggle.com/datasets/shujun717/ribonanzanet-weights/versions/7

* Clone the [RNApuzzler repository]((https://github.com/dwiegreffe/RNApuzzler)) into the RNApuzzler directory.
    - You can obtain the latest verified working revision via:
      ```sh
	  git clone https://github.com/dwiegreffe/RNApuzzler.git
	  cd RNApuzzler
	  git reset --hard 0b365e31d2436d426858ed70f931da4fdced2397
	  ```

## Apply Patches

EternaJS maintains patchfiles with modifications to support our compilation and runtime processes as well as
some additional features and bugfixes. Apply these by calling `patch.sh`.

To generate fresh diffs, make sure you have a fresh copy of the energy model (so that the patched code is in `<enginefolder>` and the original is in `<enginefolder>_stock`) and run `diff -X .gitignore -ur <enginefolder>_stock <enginefolder> > <enginename>-eterna.patch`

## Compiling with Emscripten
* `$ source /path/to/emsdk/emsdk_env.sh`
    - This adds emscripten build tools to the path - do this once per shell
* `$ emcmake cmake -DCMAKE_BUILD_TYPE=Release && emmake make clean && emmake make install`
    - Pass `-DCMAKE_BUILD_TYPE=Debug` for a debug build (-O0 optimizations), or `Release` for a release build (-O3 optimizations) (NOTE: when building/running EternaJS (i.e. via `npm start` or `npm run build:<dev|prod>`) with a debug build of these libraries, you will likely need to set NODE_OPTIONS=--max_old_space_size=4096 in order to increase the memory limit, since the debug build is quite large)
    - Built libraries are output in `nupack/dist`, `vienna/dist`, etc. When running `emmake make install`, they are automatically copied into `src/eterna/folding/engines`, but you can disable this functionality by running `emmake make` instead

## Compiling RibonanzaNet
* Set up a conda environment for RibonanzaNet: `conda env create -f RibonanzaNet/env.yml -p .venv && ./.venv/bin/pip install onnx==1.16.1`
* Export the model as onnx via `./.venv/bin/python export_onnx.py`
