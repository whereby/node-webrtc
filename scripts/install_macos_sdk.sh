#!/usr/bin/env bash

GIT_ROOT="$(git rev-parse --show-toplevel)"
xcodes install "$(cat "${GIT_ROOT}/.xcode-version")"
