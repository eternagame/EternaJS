### VIENNA 1.8.5
################
## This is how the patch file was created.
## diff -X .gitignore -ur ViennaRNA-1.8.5_stock ViennaRNA-1.8.5 > vienna1-eterna.patch

pushd Vienna1
patch -t -p0 < vienna1-eterna.patch
pushd ViennaRNA-1.8.5
./configure
popd
popd

### VIENNA 2.1.8
################
## This is how the patch file was created.
## diff -X .gitignore -ur ViennaRNA-2.1.8_stock ViennaRNA-2.1.8 > vienna2-eterna.patch

pushd Vienna2
patch -t -p0 < vienna2-eterna.patch
pushd ViennaRNA-2.1.8
./configure
popd
popd

### NUPACK
##########
## This is how the patch file was created.
## diff -X .gitignore -ur nupack3.0.4_stock nupack3.0.4 > nupack-eterna.patch

# With your fresh download, unzipped into nupack3.0.4...
pushd NUPACK
patch -t -p0 < nupack-eterna.patch
popd


### LinearFold
##############
## This is how the patch file was created.
## diff -X .gitignore -ur LinearFold_stock LinearFold > linearfold-eterna.patch

# Note that the most recent definitely-working hash is:
# 05c9803ae700fc528c82e63cec12ec7c9d3b498a
# you can obtain this revision via:
# git clone https://github.com/LinearFold/LinearFold.git
# git reset --hard 05c9803ae700fc528c82e63cec12ec7c9d3b498a

# With your fresh git checkout of LinearFold/LinearFold...
pushd LinearFold
patch -t -p0 < linearfold-eterna.patch
popd
