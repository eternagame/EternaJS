cmake_minimum_required(VERSION 3.10)

# Conditionally compile external libraries only if the source is present

if (EXISTS "Vienna1/ViennaRNA-1.8.5")
	add_subdirectory(Vienna1)
endif()

if (EXISTS "Vienna2/ViennaRNA-2.1.8")
	add_subdirectory(Vienna2)
endif()

if (EXISTS "LinearFold/LinearFold")
	add_subdirectory(LinearFold)
endif()

if (EXISTS "NUPACK/nupack3.0.4")
	add_subdirectory(NUPACK)
endif()

if (EXISTS "RNApuzzler/RNApuzzler")
	add_subdirectory(RNApuzzler)
endif()

if (EXISTS "EternaFold/EternaFold")
	add_subdirectory(EternaFold)
endif()

if (EXISTS "contrafold/contrafold")
	add_subdirectory(contrafold)
endif()
