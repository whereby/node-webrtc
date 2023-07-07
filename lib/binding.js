'use strict';

try {
  module.exports = require('../build/Debug/wrtc.node');
} catch (error) {
  try {
    module.exports = require('../build/Release/wrtc.node');
  } catch (error) {
    module.exports = require('../build/wrtc.node');
  }
}
