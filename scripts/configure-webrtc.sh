#!/bin/bash

set -e

set -v

export PATH=$DEPOT_TOOLS:$PATH

cd ${SOURCE_DIR}

# NOTE(mroberts): Running hooks generates this file, but running hooks also
# takes too long in CI; so do this manually.
(cd build/util && python3 lastchange.py -o LASTCHANGE)

gn gen ${BINARY_DIR} "--args=${GN_GEN_ARGS}"
