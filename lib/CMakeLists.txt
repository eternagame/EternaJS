cmake_minimum_required(VERSION 3.10)

add_subdirectory(Vienna1)
add_subdirectory(Vienna2)
add_subdirectory(LinearFold)
add_subdirectory(NUPACK)
add_subdirectory(RNApuzzler)

# AMW: we are not going to support full-fledged EternaFold
# and ContraFold yet. You can use MFE-versions of both 
# as new LinearFold flavors.

## Will only work if you can, in fact, clone EternaFold
#if (EXISTS "EternaFold/EternaFold")
#	add_subdirectory(EternaFold)
#endif()

## Will only work if the user has decided to download contrafold
#if (EXISTS "contrafold/contrafold")
#	add_subdirectory(contrafold)
#endif()
