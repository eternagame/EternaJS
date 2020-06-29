### VIENNA 1.8.5
################
## This is how the patch file was created.
## diff -X .gitignore -ur ViennaRNA-1.8.5_stock ViennaRNA-1.8.5 > vienna1-eterna.patch

pushd Vienna1
patch -t -p0 --forward < vienna1-eterna.patch
pushd ViennaRNA-1.8.5
./configure
popd
popd

### VIENNA 2.1.8
################
## This is how the patch file was created.
## diff -X .gitignore -ur ViennaRNA-2.1.8_stock ViennaRNA-2.1.8 > vienna2-eterna.patch

pushd Vienna2
patch -t -p0 --forward < vienna2-eterna.patch
pushd ViennaRNA-2.1.8
./configure
popd
popd

### RNApuzzler layout engine
################
## This is how the patch file was created.
## diff -X .gitignore -ur RNApuzzler_stock RNApuzzler > rnapuzzler-eterna.patch

pushd RNApuzzler
patch -t -p0 --forward < rnapuzzler-eterna.patch
pushd RNApuzzler
./configure
popd
popd

### NUPACK
##########
## This is how the patch file was created.
## diff -X .gitignore -ur nupack3.0.4_stock nupack3.0.4 > nupack-eterna.patch

# With your fresh download, unzipped into nupack3.0.4...
pushd NUPACK
patch -t -p0 --forward < nupack-eterna.patch
popd


### LinearFold
##############
## This is how the patch file was created.
## diff -X .gitignore -ur LinearFold_stock LinearFold > linearfold-eterna.patch
## diff -X .gitignore -ur LinearPartition_stock LinearPartition > linearpartition-eterna.patch

# With your fresh git checkouts of LinearFold/LinearFold and LinearFold/LinearPartition...
pushd LinearFold
patch -t -p0 --forward < linearfold-eterna.patch
patch -t -p0 --forward < linearpartition-eterna.patch
popd

### ContraFold
##############
## This is how the patch file was created.
## diff -X .gitignore -ur contrafold_stock contrafold > contrafold-eterna.patch

# With your fresh download, which untars into contrafold/...
pushd contrafold 
pushd contrafold/src/
perl MakeDefaults.pl contrafold.params.complementary contrafold.params.noncomplementary contrafold.params.profile
popd
patch -t -p0 --forward < contrafold-eterna.patch
popd

### EternaFold
##############
## This is how the patch file was created.
## diff -X .gitignore -ur EternaFold_stock EternaFold > eternafold-eterna.patch

# With your fresh git checkout in EternaFold/EternaFold/...
pushd EternaFold 
patch -t -p0 --forward < eternafold-eterna.patch
popd
