SRC = utils.c fold_vars.c params.c fold.c toy.c stringecho.c

CFLAGS = -O3 -Wall -combine -swc
CC = gcc

all: stringecho.swc
	$(CC) $(SRC) $(CFLAGS) -o stringecho.swc

 gcc utils.c fold_vars.c params.c fold.c toy.c stringecho.c -combine -O3 -Wall -swc -o stringecho.swc