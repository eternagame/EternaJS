cmake_minimum_required(VERSION 3.10)

add_subdirectory(Vienna1)
add_subdirectory(Vienna2)
add_subdirectory(LinearFold)
add_subdirectory(NUPACK)
add_subdirectory(contrafold)
add_subdirectory(RNApuzzler)

# Will only work if you can, in fact, clone EternaFold
if (EXISTS "EternaFold/EternaFold")
	add_subdirectory(EternaFold)
endif()
