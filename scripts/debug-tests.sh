#!/usr/bin/env bash

NODE_ROOT="$(asdf where nodejs)"

lldb -- "$NODE_ROOT/bin/node" "$NODE_ROOT/lib/node_modules/npm/bin/npm-cli.js" test
