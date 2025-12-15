/*!
 * Minimal LiveKit-Compatible UMD P2P SDK
 * Works offline, no CDN, no server signaling required
 * Exposes: connect(), createLocalVideoTrack(), createLocalAudioTrack()
 */

(function (global) {

  console.log("⚡ Loading Minimal LiveKit UMD...");

  // -----------------------------
  // Logger
  // -----------------------------
  const log = {
    info: (...a) => console.log("[LiveKit-UMD]", ...a),
    warn: (...a) => console.warn("[LiveKit-UMD]", ...a),
    error: (...a) => console.error("[LiveKit-UMD]", ...a),
  };

  // -----------------------------
  // Participant
  // -----------------------------
  class Participant {
    constructor(id) {
      this.id = id;
      this.tracks = [];
    }
    publishTrack(track) {
      this.tracks.push(track);
    }
  }

  // -----------------------------
  // Local Track Classes
  // -----------------------------
  class LocalVideoTrack {
    constructor(mediaStreamTrack) {
      this.mediaStreamTrack = mediaStreamTrack;
    }
    attach(videoElement) {
      const stream = new MediaStream([this.mediaStreamTrack]);
      videoElement.srcObject = stream;
    }
  }

  class LocalAudioTrack {
    constructor(mediaStreamTrack) {
      this.mediaStreamTrack = mediaStreamTrack;
    }
  }

  async function createLocalVideoTrack() {
    log.info("Requesting camera...");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    return new LocalVideoTrack(stream.getTracks()[0]);
  }

  async function createLocalAudioTrack() {
    log.info("Requesting microphone...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new LocalAudioTrack(stream.getTracks()[0]);
  }

  // -----------------------------
  // Remote Track Wrapper
  // -----------------------------
  class RemoteTrack {
    constructor(track) {
      this.mediaStreamTrack = track;
    }
    attach(videoElement) {
      const stream = new MediaStream([this.mediaStreamTrack]);
      videoElement.srcObject = stream;
    }
  }

  // -----------------------------
  // Room Implementation (P2P Mock)
  // -----------------------------
  class Room {
    constructor(url, token) {
      this.url = url;
      this.token = token;
      this.localParticipant = new Participant("local");
      this.remoteParticipant = new Participant("remote");
      this.events = {};
      this.pcLocal = null;
      this.pcRemote = null;
    }

    on(event, callback) {
      this.events[event] = callback;
    }

    async connect() {
      log.info("🔌 Connecting to mock room (P2P)...");

      // PeerConnection #1
      const pc1 = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      // PeerConnection #2 (remote side)
      const pc2 = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      // Attach local tracks to pc1
      for (const trackObj of this.localParticipant.tracks) {
        pc1.addTrack(trackObj.mediaStreamTrack);
      }

      // When pc2 gets tracks
      pc2.ontrack = (evt) => {
        log.info("📡 Remote track received");
        const track = new RemoteTrack(evt.streams[0].getTracks()[0]);
        if (this.events["trackSubscribed"]) {
          this.events["trackSubscribed"](track);
        }
      };

      // Link ICE
      pc1.onicecandidate = (e) => e.candidate && pc2.addIceCandidate(e.candidate);
      pc2.onicecandidate = (e) => e.candidate && pc1.addIceCandidate(e.candidate);

      const offer = await pc1.createOffer();
      await pc1.setLocalDescription(offer);
      await pc2.setRemoteDescription(offer);

      const answer = await pc2.createAnswer();
      await pc2.setLocalDescription(answer);
      await pc1.setRemoteDescription(answer);

      this.pcLocal = pc1;
      this.pcRemote = pc2;

      log.info("🎉 Room connected (P2P)");
      return this;
    }

    async disconnect() {
      this.pcLocal?.close();
      this.pcRemote?.close();
      log.info("🔌 Disconnected");
    }
  }

  // -----------------------------
  // Public connect() function
  // -----------------------------
  async function connect(url, token, opts = {}) {
    log.info("Connect called with token:", token.substring(0, 10) + "...");
    const room = new Room(url, token);
    await room.connect();
    return room;
  }

  // -----------------------------
  // Export public API
  // -----------------------------
  global.livekit = {
    connect,
    createLocalVideoTrack,
    createLocalAudioTrack,
    Participant,
    RemoteTrack,
    Room,
  };

  console.log("✅ Minimal LiveKit-Compatible UMD Loaded Successfully");

})(window);
