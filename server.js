'use strict';

const {RTCVideoSource, RTCAudioSource} = require('wrtc').nonstandard;
const beamcoder = require('beamcoder');
const {setIntervalAsync, clearIntervalAsync} = require('set-interval-async');
const fs = require('fs');

// Creates a MediaStream of a looping video/audio based on data stored in filename. Uses beamcoder to transcode the data from the file
// and wrtc to publish those to a created stream.
function createArtificialMediaStream(filename) {
  // Create empty sources and tracks
  const videoSource = new RTCVideoSource();
  const videoTrack = videoSource.createTrack();
  const audioSource = new RTCAudioSource();
  const audioTrack = audioSource.createTrack();

  // Create callbacks that will continuously push frames to those tracks
  // TODO(jack): add more configuration options besides just reading from file.
  beamcoder.demuxer(`file:${filename}`).then(demuxer => {
    let videoStreamIndex = -1;
    let audioStreamIndex = -1;
    let i = 0;
    for (const stream of demuxer.streams) {
      if (stream.codecpar.codec_type === 'video') {
        videoStreamIndex = i;
      } else if (stream.codecpar.codec_type === 'audio') {
        audioStreamIndex = i;
      }
      ++i;
    }
    const videoEncoderCodec = {name: "rawvideo", pix_fmt: "yuv420p"};
    let videoDecoder = beamcoder.decoder({demuxer, stream_index: videoStreamIndex});
    let videoEncoder = beamcoder.encoder(videoEncoderCodec);
    // const audioEncoderCodec = {name: "pcm_s16le", sample_fmt: "s16"};
    let audioDecoder = beamcoder.decoder({demuxer, stream_index: audioStreamIndex});
    // let audioEncoder = beamcoder.encoder(audioEncoderCodec);
    // TODO(jack): figure out why node-webrtc wants *exactly* this much data anyways
    // Not a problem here since the packets happen to be exactly the right size, but still
    const numberOfFrames = 480;
    const intSamples = new Int16Array(numberOfFrames * 2);
    async function nextFrames() {
      let packet = await demuxer.read();
      if (packet == null) {
        // Stream ended, loop back to beginning
        console.log(`createArtificialMediaStream: restarting stream for ${filename}`);
        await demuxer.seek({time: 0});
        await videoDecoder.flush();
        videoDecoder = beamcoder.decoder({demuxer, stream_index: videoStreamIndex});
        await audioDecoder.flush();
        audioDecoder = beamcoder.decoder({demuxer, stream_index: audioStreamIndex});
        return;
      }
      if (packet.stream_index === videoStreamIndex) {
        // The video stream. TODO: get this stream index better
        let dec_result = await videoDecoder.decode(packet);
        // TODO: handle multiple frame case
        const decoded_frame = dec_result.frames[0];
        if (decoded_frame === undefined) {
          return;
        }
        // TODO(jack): find a way to set these more smartly
        videoEncoder.time_base = [1, 25];
        videoEncoder.width = decoded_frame.width;
        videoEncoder.height = decoded_frame.height;
        const enc_result = await videoEncoder.encode(decoded_frame);
        // TODO: handle multiple packet case
        const enc_packet = enc_result.packets[0];
        const frame = {
          width: videoEncoder.width,
          height: videoEncoder.height,
          // Need to trim off some of the extra bytes, for some reason. TODO investigate
          data: (new Uint8Array(enc_packet.data)).slice(0, 1.5 * videoEncoder.width * videoEncoder.height),
        };
        videoSource.onFrame(frame);
      }
      if (packet.stream_index === audioStreamIndex) {
        // The audio stream. TODO: get this stream index better.
        let dec_result = await audioDecoder.decode(packet);
        // TODO: handle multiple frame case
        const decoded_frame = dec_result.frames[0];
        if (decoded_frame === undefined) {
          return;
        }
        // NOTE(jack): I couldn't get a beamcoder.encoder to work here, so doing the conversion
        // from a raw sample myself. I think this code should be pretty efficient after JIT
        const floatSamples = new Float32Array(decoded_frame.data[0].buffer);
        const sampleRate = decoded_frame.sample_rate;
        const maxValue = Math.pow(2, 15) - 1;
        for (let i = 0; i < floatSamples.length; ++i) {
          intSamples[i] = floatSamples[i] * maxValue;
        }
        for (let sampleOffset = 0; sampleOffset < intSamples.length; sampleOffset += numberOfFrames) {
          let data = {
            samples: intSamples.slice(sampleOffset, sampleOffset + numberOfFrames),
            sampleRate,
            numberOfFrames,
          };
          audioSource.onData(data);
        }
      }
    }

    // TODO(jack): set this interval more smartly. Probably something like:
    // 1) read framerate & sample rate from file (probably using the decoders somehow)
    // 2) create a worker interval to continuously fill up bounded queues with decoded data.
    //    this needs some sort of "blocking" (the awaits pause the coroutine) bounded queue.
    // 3) create an audio and video publisher interval to publish the results from the
    //    queue at the intervals we read from the file.
    // TODO(jack): find some way to clear this interval later
    setIntervalAsync(nextFrames, 5);
  });

  return [videoTrack, audioTrack];
  // Create stream that bundles all tracks we created
  // const stream = new MediaStream([videoTrack]);

  // return stream;
}

function beforeOffer(peerConnection) {
  const tracks = createArtificialMediaStream("C:/Users/Work/Downloads/rickroll.webm");
  tracks.map(track => peerConnection.addTrack(track));

  // NOTE(mroberts): This is a hack so that we can get a callback when the
  // RTCPeerConnection is closed. In the future, we can subscribe to
  // "connectionstatechange" events.
  const {close} = peerConnection;
  peerConnection.close = function () {
    tracks.map(track => track.stop());
    return close.apply(this, arguments);
  };
}

module.exports = {beforeOffer};
