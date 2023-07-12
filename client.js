'use strict';

const createExample = require('../../lib/browser/example');

const description = 'This example uses node-webrtc&rsquo;s RTCVideoSource \
along with <a href="https://www.npmjs.com/package/beamcoder">beamcoder</a> \
to send a looping video stream from a file.'


const remoteVideo = document.createElement('video');
remoteVideo.autoplay = true;

async function beforeAnswer(peerConnection) {
  const remoteStream = new MediaStream(peerConnection.getReceivers().map(receiver => receiver.track));
  remoteVideo.srcObject = remoteStream;

  // NOTE(mroberts): This is a hack so that we can get a callback when the
  // RTCPeerConnection is closed. In the future, we can subscribe to
  // "connectionstatechange" events.
  const { close } = peerConnection;
  peerConnection.close = function() {
    remoteVideo.srcObject = null;

    return close.apply(this, arguments);
  };
}

createExample('rickroll', description, { beforeAnswer });

const videos = document.createElement('div');
videos.className = 'grid';
videos.appendChild(remoteVideo);
document.body.appendChild(videos);
