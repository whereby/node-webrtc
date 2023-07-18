'use strict';

// TODO(jack): error handling, cross-platform builds

const child_process = require('child_process');
const fs = require('fs');
const os = require('os');

// Run a fresh build
child_process.execSync('npm run build', { stdio: 'inherit' });

// Copy the resulting binary to the output folder
const input_folder = 'build/Release';
const output_folder = `prebuilds/${os.platform()}-${os.arch()}`;
fs.copyFileSync(
  `${input_folder}/wrtc.node`,
  `${output_folder}/wrtc.node`,
);
