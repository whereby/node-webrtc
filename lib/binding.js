'use strict';

const os = require('os');
const paths_to_try = [
  '../build/wrtc.node',
  '../build/Debug/wrtc.node',
  '../build/Release/wrtc.node',
  `@roamhq/wrtc-${os.platform()}-${os.arch()}`,
];

let succeeded = false;
for (const path of paths_to_try) {
  try {
    module.exports = require(path);
    succeeded = true;
    break;
  } catch (error) {
    ;
  }
}

if (!succeeded) {
  throw new Error(`Could not find wrtc binary on any of the paths: ${paths_to_try}`);
}
