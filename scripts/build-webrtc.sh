#!/bin/bash

set -e
set -v

export TARGETS="webrtc libjingle_peerconnection"
case "$(uname -s)" in
  Darwin*)
  export TARGETS="$TARGETS libc++ libc++abi"
esac

if [ -z "$PARALLELISM" ]; then
  ninja $TARGETS
else
  ninja $TARGETS -j $PARALLELISM
fi
