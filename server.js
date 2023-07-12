'use strict';

const { RTCVideoSource, RTCAudioSource } = require('wrtc').nonstandard;
const beamcoder = require('beamcoder');
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async');

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
    const videoDecoderCodec = { name: "vp9" };
    const videoEncoderCodec = { name: "rawvideo", pix_fmt: "yuv420p" };
    let videoDecoder = beamcoder.decoder(videoDecoderCodec);
    let videoEncoder = beamcoder.encoder(videoEncoderCodec);
    const audioDecoderCodec = { name: "opus" };
    const audioEncoderCodec = { name: "pcm_s16le", sample_fmt: "s16" };
    let audioDecoder = beamcoder.decoder(audioDecoderCodec);
    let audioEncoder = beamcoder.encoder(audioEncoderCodec);
    let videoFrames = [];
    let audioFrames = [];
    async function nextFrames() {
      let packet = await demuxer.read();
      if (packet == null) {
        // Stream ended, loop back to beginning
        console.log(`createArtificialMediaStream: restarting stream for ${filename}`);
        await videoDecoder.flush();
        videoDecoder = beamcoder.decoder(videoDecoderCodec);
        await audioDecoder.flush();
        audioDecoder = beamcoder.decoder(audioDecoderCodec);
        await demuxer.seek({ timestamp: 0 });
        return;
      }
      if (packet.stream_index === 0) {
        // The video stream. TODO: get this stream index better
        let dec_result = await videoDecoder.decode(packet);
        console.log(`I just received ${dec_result.frames.length} videoFrames!`);
        videoFrames = dec_result.frames;
        const decoded_frame = videoFrames.shift();
        if (decoded_frame === undefined) {
          // console.log(`createArtificialMediaStream: no decoded frame after just populating, huh??`);
          // throw new Error("die");
          return;
        }
        // TODO(jack): find a way to set these more smartly
        videoEncoder.time_base = [1, 25];
        videoEncoder.width = decoded_frame.width;
        videoEncoder.height = decoded_frame.height;
        const enc_result = await videoEncoder.encode(decoded_frame);
        console.log(`I just encoded ${enc_result.packets.length} packets from a videoFrame!`);
        const enc_packet = enc_result.packets[0];
        const frame = {
          width: videoEncoder.width,
          height: videoEncoder.height,
          // Need to trim off some of the extra bytes, for some reason
          data: (new Uint8Array(enc_packet.data)).slice(0, 1.5 * videoEncoder.width * videoEncoder.height),
        };
        videoSource.onFrame(frame);
      }
      if (packet.stream_index === 1) {
        // The audio stream. TODO: get this stream index better.
        let dec_result = await audioDecoder.decode(packet);
        console.log(`I just received ${dec_result.frames.length} audioFrames!`);
        audioFrames = dec_result.frames;
        const decoded_frame = audioFrames.shift();
        if (decoded_frame === undefined) {
          return;
        }
        audioEncoder.time_base = [1, audioDecoder.sample_rate];
        const enc_result = await audioEncoder.encode(decoded_frame);
        console.log(`I just encoded ${enc_result.packets.length} packets from an audioFrame!`);
        const enc_packet = enc_result.packets[0];
        // TODO(jack): why does it want this size? this is probably wrong since
        // there is no audio coming out
        const samples = new Int16Array(960);
        samples.set(enc_packet.data);
        const data = {
          samples: samples.slice(0, 960 / 2),
          sampleRate: audioDecoder.sample_rate,
        };
        audioSource.onData(data);
      }
    }

    // TODO(jack): set this interval more smartly. Probably something like:
    // 1) read framerate & sample rate from file (probably using the decoders somehow)
    // 2) create a worker interval to continuously fill up bounded queues with decoded data.
    //    this needs some sort of "blocking" (the awaits pause the coroutine) bounded queue.
    // 3) create an audio and video publisher interval to publish the results from the
    //    queue at the intervals we read from the file.
    // TODO(jack): find some way to clear this interval later
    setIntervalAsync(nextFrames, 5000 / 25);
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
  const { close } = peerConnection;
  peerConnection.close = function() {
    tracks.map(track => track.stop());
    return close.apply(this, arguments);
  };
}

module.exports = { beforeOffer };
