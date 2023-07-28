#!/usr/bin/env node
/* eslint no-console:0, no-process-env:0 */
'use strict';

const { spawnSync } = require('child_process');

const args = ['configure'];

if (process.env.DEBUG) {
  args.push(...[
    '--debug',
    '--CDCMAKE_EXPORT_COMPILE_COMMANDS=1',
  ]);
}

if (process.platform === 'win32') {
  args.push(...[
    '-G',
    'Ninja',
  ]);
}

if (process.env.TARGET_ARCH) {
  args.push(`--CDCMAKE_TOOLCHAIN_FILE=toolchains/${process.platform}-${process.env.TARGET_ARCH}.toolchain`);
}

function main() {
  console.log('Running cmake-js ' + args.join(' '));
  let { status } = spawnSync('cmake-js', args, {
    shell: true,
    stdio: 'inherit'
  });
  if (status) {
    throw new Error('cmake-js configure failed for wrtc');
  }

  console.log('Running cmake-js build');
  status = spawnSync('cmake-js', ['build'], {
    shell: true,
    stdio: 'inherit'
  }).status;
  if (status) {
    throw new Error('cmake-js build failed for wrtc');
  }

  console.log('Built wrtc');
}

module.exports = main;

if (require.main === module) {
  main();
}
