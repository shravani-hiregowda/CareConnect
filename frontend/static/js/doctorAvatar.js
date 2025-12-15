// doctorAvatar.js
// Video-based DoctorAvatar engine
// Replaces canvas + sprite lips with 2 <video> elements (idle + talking)
// Public API (kept for compatibility):
//   DoctorAvatar.init({ containerId, idleVideoSrc, talkingVideoSrc, width, height })
//   DoctorAvatar._startMouthAnimation()  -> startSpeaking()
//   DoctorAvatar._stopMouthAnimation()   -> stopSpeaking()
//   DoctorAvatar.setMouthFromAmplitude(a)
//   DoctorAvatar.speak(text)

(function () {
  if (window.DoctorAvatar) {
    console.log("DoctorAvatar already present — reusing instance.");
    return;
  }

  const Avatar = {
    container: null,
    idleVideo: null,
    talkVideo: null,

    width: 160,
    height: 160,

    isSpeaking: false,
    isReady: false,

    // store config for debugging
    _config: {},

    /* ---------------------- INIT ---------------------- */
    init(config = {}) {
      try {
        console.log("DoctorAvatar (video) init()", config);
        this._config = config || {};

        const containerId =
          config.containerId ||
          config.container ||
          "doctorAvatarContainer";

        // Resolve container
        this.container =
          document.getElementById(containerId) ||
          (typeof config.container === "string"
            ? document.querySelector(config.container)
            : config.container);

        if (!this.container) {
          console.error("DoctorAvatar.init: container not found:", containerId);
          return;
        }

        // Ensure container is positioned and not clipping the videos
        const style = getComputedStyle(this.container);
        if (style.position === "static") {
          this.container.style.position = "relative";
        }
        this.container.style.overflow = "hidden";

        // Prefer container size; fallback to config; fallback to 160x160
        const rect = this.container.getBoundingClientRect();
        this.width =
          typeof config.width === "number"
            ? config.width
            : (rect.width || 160);
        this.height =
          typeof config.height === "number"
            ? config.height
            : (rect.height || 160);

        this.container.style.width = this.width + "px";
        this.container.style.height = this.height + "px";

        // Clean old content (canvas, old videos, etc.)
        Array.from(this.container.querySelectorAll("canvas, video")).forEach(
          (el) => el.remove()
        );

        // Get video sources
        const idleSrc =
          config.idleVideoSrc ||
          (config.assets && (config.assets.idleVideo || config.assets.idle));
        const talkingSrc =
          config.talkingVideoSrc ||
          (config.assets &&
            (config.assets.talkingVideo || config.assets.talking));

        if (!idleSrc && !talkingSrc) {
          console.warn(
            "DoctorAvatar.init: no video sources provided (idleVideoSrc / talkingVideoSrc). Avatar will be blank."
          );
        }

        // Create and attach <video> elements
        this._createVideos(idleSrc, talkingSrc);

        this.isReady = true;
        window.DoctorAvatar = Avatar; // expose
        console.log("DoctorAvatar (video) ready:", {
          idleVideoSrc: idleSrc,
          talkingVideoSrc: talkingSrc,
        });
      } catch (e) {
        console.error("DoctorAvatar.init failed:", e);
      }
    },

    /* ---------------------- VIDEO CREATION ---------------------- */
    _createVideos(idleSrc, talkingSrc) {
      // Helper to make a base-styled video element
      const makeVideo = (src) => {
        const v = document.createElement("video");
        if (src) v.src = src;
        v.playsInline = true;
        v.muted = true; // required for autoplay in most browsers
        v.loop = true;
        v.autoplay = true;

        v.style.position = "absolute";
        v.style.inset = "0";
        v.style.width = "100%";
        v.style.height = "100%";
        v.style.objectFit = "cover";
        v.style.pointerEvents = "none";
        v.style.borderRadius = "12px";
        v.style.transition = "opacity 0.15s ease-out";
        v.style.opacity = "0";

        // try to play, but ignore autoplay errors
        v.addEventListener("canplay", () => {
          try {
            const p = v.play();
            if (p && typeof p.then === "function") {
              p.catch(() => {});
            }
          } catch (e) {}
        });

        return v;
      };

      // Idle video (default visible)
      if (idleSrc) {
        this.idleVideo = makeVideo(idleSrc);
        this.idleVideo.style.opacity = "1";
        this.container.appendChild(this.idleVideo);
      } else {
        this.idleVideo = null;
      }

      // Talking video (on top, hidden by default)
      if (talkingSrc) {
        this.talkVideo = makeVideo(talkingSrc);
        this.talkVideo.style.opacity = "0";
        this.container.appendChild(this.talkVideo);
      } else {
        this.talkVideo = null;
      }

      // If only one video exists, just keep it visible
      if (!this.idleVideo && this.talkVideo) {
        this.talkVideo.style.opacity = "1";
      }
      if (this.idleVideo && !this.talkVideo) {
        this.idleVideo.style.opacity = "1";
      }
    },

    /* ---------------------- SPEAKING STATE ---------------------- */
    startSpeaking() {
      if (!this.isReady) return;
      if (this.isSpeaking) return;
      this.isSpeaking = true;

      // Show talking video, hide idle
      if (this.talkVideo) {
        this.talkVideo.style.opacity = "1";
        try {
          const p = this.talkVideo.play();
          if (p && typeof p.then === "function") p.catch(() => {});
        } catch (e) {}
      }

      if (this.idleVideo) {
        this.idleVideo.style.opacity = "0";
        try {
          this.idleVideo.pause();
        } catch (e) {}
      }
    },

    stopSpeaking() {
      if (!this.isReady) return;
      if (!this.isSpeaking) return;
      this.isSpeaking = false;

      // Show idle, hide talking
      if (this.idleVideo) {
        this.idleVideo.style.opacity = "1";
        try {
          const p = this.idleVideo.play();
          if (p && typeof p.then === "function") p.catch(() => {});
        } catch (e) {}
      }

      if (this.talkVideo) {
        this.talkVideo.style.opacity = "0";
        try {
          this.talkVideo.pause();
          this.talkVideo.currentTime = 0; // restart from beginning next time
        } catch (e) {}
      }
    },

    /* ---------------------- COMPATIBILITY SHIMS ---------------------- */
    // These keep older code working (e.g. videoCall.js calling _startMouthAnimation)
    _startMouthAnimation() {
      this.startSpeaking();
    },

    _stopMouthAnimation() {
      this.stopSpeaking();
    },

    // Map amplitude to "is talking" or "idle"
    setMouthFromAmplitude(a = 0) {
      if (!this.isReady) return;

      // simple threshold; you can tune 0.28 if needed
      if (a >= 0.28) {
        this.startSpeaking();
      } else {
        this.stopSpeaking();
      }
    },

    /* ---------------------- Optional: speak helper ---------------------- */
    speak(text = "") {
      if (!("speechSynthesis" in window)) {
        console.warn("DoctorAvatar: speechSynthesis not supported.");
        return;
      }
      const u = new SpeechSynthesisUtterance(text);

      u.onstart = () => {
        try {
          this.startSpeaking();
        } catch (e) {
          console.warn("DoctorAvatar.speak start error", e);
        }
      };

      u.onend = () => {
        try {
          this.stopSpeaking();
        } catch (e) {
          console.warn("DoctorAvatar.speak end error", e);
        }
      };

      try {
        speechSynthesis.speak(u);
      } catch (e) {
        console.warn("DoctorAvatar.speak failed:", e);
      }
    },

    /* ---------------------- Helpers ---------------------- */
    getContainer() {
      return this.container;
    },
    // for old code that might expect a canvas
    getCanvas() {
      return null;
    },
  };

  // export singleton
  window.DoctorAvatar = Avatar;
})();
