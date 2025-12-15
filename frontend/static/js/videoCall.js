// videoCall.js
// CareConnect — Browser STT + TTS + LiveKit integration
// FINAL BUILD — Uses 2 video overlays for doctor avatar (idle + speaking)

(function () {
  if (window.__careconnect_videoCall_loaded) return;
  window.__careconnect_videoCall_loaded = true;

  const NS = "careconnect";
  window[NS] = window[NS] || {};
  const ns = window[NS];

  // state
  ns.room = null;
  ns.localTrack = null;
  ns.recognition = null;
  ns.sttRunning = false;
  ns.currentUserIdentity = null;
  ns.isDoctorSpeaking = false;
  ns.voiceList = [];
  ns.voicesLoaded = false;
  ns.manualStop = false;
  ns.localAudioTrack = null;
  ns.muted = false;
  ns.cameraOff = false;


  // DOM placeholders (may be present from HTML)
  let localVideo = document.getElementById("localVideo");
  let remoteVideo = document.getElementById("remoteVideo");
  let startCallBtn = document.getElementById("startCallBtn");
  let leaveCallBtn = document.getElementById("leaveCallBtn");

  function ensureElements() {
    if (!localVideo) {
      const v = document.createElement("video");
      v.id = "localVideo";
      v.autoplay = true;
      v.muted = true;
      v.playsInline = true;
      v.style.width = "320px";
      document.body.appendChild(v);
      localVideo = v;
    }
    if (!remoteVideo) {
      const v = document.createElement("video");
      v.id = "remoteVideo";
      v.autoplay = true;
      v.playsInline = true;
      v.style.width = "320px";
      document.body.appendChild(v);
      remoteVideo = v;
    }
    if (!startCallBtn) {
      const b = document.createElement("button");
      b.id = "startCallBtn";
      b.textContent = "Start Call";
      document.body.appendChild(b);
      startCallBtn = b;
    }
    if (!leaveCallBtn) {
      const b = document.createElement("button");
      b.id = "leaveCallBtn";
      b.textContent = "End Call";
      b.style.display = "none";
      document.body.appendChild(b);
      leaveCallBtn = b;
    }
  }
  ensureElements();

  function log(...args) { console.log("[videoCall]", ...args); }
  function warn(...args) { console.warn("[videoCall]", ...args); }
  function errlog(...args) { console.error("[videoCall]", ...args); }

  /* ------------------- LiveKit loader ------------------- */
  function loadLiveKitUMD() {
    if (window.LiveKit && window.LiveKit.connect) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "/frontend/static/js/livekit-client.umd.js";
      s.onload = () => {
        window.LiveKit = window.livekit || window.LiveKit;
        resolve();
      };
      s.onerror = (e) => {
        errlog("Failed to load LiveKit UMD", e);
        reject(e);
      };
      document.head.appendChild(s);
    });
  }

  /* ------------------- Voice management ------------------- */
  function loadVoicesOnce() {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length) {
        ns.voiceList = voices;
        ns.voicesLoaded = true;
        log("Voices loaded:", voices.map(v => `${v.name} (${v.lang})`).slice(0,8));
        return;
      }
    } catch (e) {
      warn("getVoices failed", e);
    }
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        ns.voiceList = window.speechSynthesis.getVoices() || [];
        ns.voicesLoaded = true;
        log("Voices changed/loaded:", ns.voiceList.map(v=>`${v.name}(${v.lang})`).slice(0,8));
      } catch (e) { warn("voiceschanged handler failed", e); }
    };
    try { window.speechSynthesis.getVoices(); } catch (e) {}
  }

  function detectLanguageForTTS(text, forced) {
    if (forced) return forced;
    if (!text) return "en-IN";
    if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN";
    if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
    return "en-IN";
  }

  /* ------------------- Speech Recognition ------------------- */
  function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      warn("SpeechRecognition not available in this browser.");
      return null;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-IN";

    rec.onstart = () => {
      ns.sttRunning = true;
      log("SpeechRecognition started");
    };

    rec.onresult = async (ev) => {
      if (ns.isDoctorSpeaking || ns.muted) {
    log("STT ignored (doctor speaking or muted)");
    return;
  }


      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        const r = ev.results[i];
        if (!r.isFinal) continue;
        const text = (r[0] && r[0].transcript) ? r[0].transcript.trim() : "";
        if (!text) continue;
        log("STT captured:", text);
        try { await onUserUtterance(text); } catch (e) { warn("onUserUtterance failed", e); }
      }
    };

    rec.onerror = (e) => {
      warn("SpeechRecognition error:", e && e.error ? e.error : e);
    };

    rec.onend = () => {
      ns.sttRunning = false;
      log("SpeechRecognition ended (manualStop=" + !!ns.manualStop + ")");
      if (!ns.isDoctorSpeaking && !ns.manualStop && !ns.muted) {
      try { rec.start(); } catch (e) { warn("SR restart failed", e); }
    }
 else {
        log("SR not restarted because TTS active or manualStop set");
      }
    };

    return rec;
  }

  /* -------------------------------------------------------------
   * VIDEO AVATAR (idle + speaking) — SINGLE RESPONSIBILITY
   * ------------------------------------------------------------- */

  function ensureVideoAvatar() {
    const container = document.getElementById("doctorAvatarContainer");
    if (!container) return;

    if (container.querySelector("video[data-avatar='idle']")) return;

    const idle = document.createElement("video");
    idle.setAttribute("data-avatar", "idle");
    idle.src = "/frontend/static/images/avatar/natural.mp4";
    idle.autoplay = true;
    idle.loop = true;
    idle.muted = true;
    idle.playsInline = true;
    idle.style.position = "absolute";
    idle.style.inset = "0";
    idle.style.width = "100%";
    idle.style.height = "100%";
    idle.style.objectFit = "cover";
    idle.style.transition = "opacity .25s";
    idle.style.opacity = "1";

    const talk = document.createElement("video");
    talk.setAttribute("data-avatar", "speaking");
    talk.src = "/frontend/static/images/avatar/speaking.mp4";
    talk.autoplay = true;
    talk.loop = true;
    talk.muted = true;
    talk.playsInline = true;
    talk.style.position = "absolute";
    talk.style.inset = "0";
    talk.style.width = "100%";
    talk.style.height = "100%";
    talk.style.objectFit = "cover";
    talk.style.transition = "opacity .25s";
    talk.style.opacity = "0";

    container.appendChild(idle);
    container.appendChild(talk);
  }

  function showIdleAvatar() {
    const idle = document.querySelector("#doctorAvatarContainer video[data-avatar='idle']");
    const talk = document.querySelector("#doctorAvatarContainer video[data-avatar='speaking']");
    if (idle) idle.style.opacity = "1";
    if (talk) talk.style.opacity = "0";
  }

  function showSpeakingAvatar() {
    const idle = document.querySelector("#doctorAvatarContainer video[data-avatar='idle']");
    const talk = document.querySelector("#doctorAvatarContainer video[data-avatar='speaking']");
    if (idle) idle.style.opacity = "0";
    if (talk) talk.style.opacity = "1";
  }

  /* ------------------- TTS CONTROL ------------------- */
  async function playDoctorAudio(text) {
    ns.isDoctorSpeaking = true;

    if (ns.recognition && ns.sttRunning) {
      try { ns.recognition.abort(); } catch {}
      ns.sttRunning = false;
    }

    ensureVideoAvatar();
    showSpeakingAvatar();

    const lang = detectLanguageForTTS(text);
    const voices = window.speechSynthesis.getVoices();
    let voice =
        voices.find(v => v.lang.toLowerCase() === lang.toLowerCase()) ||
        voices.find(v => v.lang.toLowerCase().startsWith(lang.split("-")[0])) ||
        voices.find(v => v.lang === "en-IN") ||
        voices.find(v => v.lang && v.lang.startsWith("en")) ||
        voices[0];

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    if (voice) utter.voice = voice;

    return new Promise(resolve => {

      utter.onend = () => {
        ns.isDoctorSpeaking = false;
        showIdleAvatar();

        if (!ns.manualStop) {
          setTimeout(() => {
            if (ns.recognition && !ns.sttRunning && !ns.manualStop) {
              try { ns.recognition.start(); } catch {}
            }
            resolve();
          }, 200);
        } else resolve();
      };

      utter.onerror = () => {
        ns.isDoctorSpeaking = false;
        showIdleAvatar();
        resolve();
      };

      try { window.speechSynthesis.speak(utter); }
      catch (e) {
        ns.isDoctorSpeaking = false;
        showIdleAvatar();
        resolve();
      }
    });
  }

  /* ------------------- STOP helpers (UNCHANGED) ------------------- */
  function stopDoctorTTS() {
    try { window.speechSynthesis.cancel(); } catch (e) {}
    ns.isDoctorSpeaking = false;
  }

  function stopRecognition() {
    if (ns.recognition) {
      try { ns.recognition.abort(); } catch (e) {}
      ns.sttRunning = false;
    }
  }

  function toggleListenMute() {
  ns.muted = !ns.muted;

  if (ns.muted) {
    // TURN LISTENING OFF
    stopRecognition();
    console.log("🔇 STT muted – not listening");
  } else {
    // TURN LISTENING BACK ON
    if (ns.recognition && !ns.isDoctorSpeaking && !ns.manualStop) {
      try { ns.recognition.start(); } catch {}
    }
    console.log("🎤 STT unmuted – listening resumed");
  }
}


  async function stopLocalTrack() {
    try {
      if (ns.localTrack && ns.localTrack.mediaStreamTrack) {
        try { ns.localTrack.stop?.(); } catch {}
        try { ns.localTrack.mediaStreamTrack.stop(); } catch {}
        ns.localTrack = null;
      }
      if (localVideo) {
        try { localVideo.srcObject = null; } catch {}
      }
    } catch (e) { warn("stopLocalTrack failed", e); }
  }

  async function stopLiveKitRoom() {
    try {
      if (ns.room) {
        try { await ns.room.disconnect(); } catch (e) { warn("room.disconnect failed", e); }
        ns.room = null;
      }
      if (remoteVideo) {
        try { remoteVideo.srcObject = null; } catch {}
      }
    } catch (e) { warn("stopLiveKitRoom failed", e); }
  }

  async function stopEverything() {
    log("Hard shutdown (stopEverything)");
    ns.manualStop = true;
    stopDoctorTTS();
    stopRecognition();
    await stopLocalTrack();
    await stopLiveKitRoom();

    try {
      document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
    } catch (e) {}

    try { if (startCallBtn) startCallBtn.style.display = "inline-block"; } catch {}
    try { if (leaveCallBtn) leaveCallBtn.style.display = "none"; } catch {}

    setTimeout(() => { ns.manualStop = false; }, 400);
  }

  /* ------------------- API call + Conversation ------------------- */
  async function sendMessageToAgent(identity, text) {
    log("Sending to agent:", text?.slice(0,160));
    if (ns.recognition && ns.sttRunning) {
      try { ns.recognition.abort(); } catch {}
      ns.sttRunning = false;
    }

    try {
      let res = await axios.post("/api/agent/message", { userId: identity, text });
      res = res?.data || {};
      const reply = res.reply || null;

      if (reply) {
        await playDoctorAudio(reply);
      } else {
        if (ns.recognition && !ns.sttRunning && !ns.isDoctorSpeaking && !ns.manualStop) {
          try { ns.recognition.start(); } catch {}
        }
      }
      return { reply };
    } catch (e) {
      warn("sendMessageToAgent error:", e);
      if (ns.recognition && !ns.sttRunning && !ns.isDoctorSpeaking && !ns.manualStop) {
        try { ns.recognition.start(); } catch {}
      }
      return {};
    }
  }

  async function onUserUtterance(text) {
    await sendMessageToAgent(ns.currentUserIdentity, text);
  }

  /* ------------------- Start / End Call (UNCHANGED) ------------------- */
  async function startCall() {
    try {
      ns.manualStop = false;

      const { data } = await axios.get("/api/livekit/session");
      const { token, livekitUrl, identity } = data || {};
      if (!token || !livekitUrl) throw new Error("Missing LiveKit session data");

      ns.currentUserIdentity = identity || ns.currentUserIdentity;

      await loadLiveKitUMD();
      const { connect, createLocalVideoTrack } = window.LiveKit;

      ns.room = await connect(livekitUrl, token, { audio: false, video: true });

      const localTrack = await createLocalVideoTrack();
      ns.localTrack = localTrack;

      if (localVideo) {
        localVideo.srcObject = new MediaStream([localTrack.mediaStreamTrack]);
        try { await localVideo.play(); } catch {}
      }

      await ns.room.localParticipant.publishTrack(localTrack);

      ns.room.on("trackSubscribed", (track) => {
        if (!track || !track.mediaStreamTrack) return;
        if (remoteVideo) {
          remoteVideo.srcObject = new MediaStream([track.mediaStreamTrack]);
          try { remoteVideo.play(); } catch {}
        }
      });

      if (!ns.recognition) ns.recognition = initSpeechRecognition();
      if (ns.recognition && !ns.sttRunning && !ns.isDoctorSpeaking && !ns.manualStop) {
        try { ns.recognition.start(); } catch {}
      }

      loadVoicesOnce();

      if (startCallBtn) startCallBtn.style.display = "none";
      if (leaveCallBtn) leaveCallBtn.style.display = "inline-block";

      ensureVideoAvatar();

    } catch (err) {
      console.error("startCall failed:", err);
      alert("Failed to start call. See console.");
    }
  }

  async function leaveCall() {
    try { await stopEverything(); } catch (e) { errlog("leaveCall failed:", e); }
  }

  // Wire buttons
  startCallBtn?.addEventListener("click", startCall);
  leaveCallBtn?.addEventListener("click", leaveCall);

  function wireCloseButtons() {
    try {
      document.querySelectorAll(".call-close-btn").forEach(btn => {
        btn.removeEventListener("click", handleCloseClick);
        btn.addEventListener("click", handleCloseClick);
      });
    } catch (e) { warn("wireCloseButtons failed", e); }
  }
  function handleCloseClick(e) {
    e.preventDefault();
    stopEverything();
  }
  wireCloseButtons();

  const obs = new MutationObserver(() => { wireCloseButtons(); });
  obs.observe(document.body, { childList: true, subtree: true });

  // Global Enter handler to stop everything while in input
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    const active = document.activeElement;
    if (!active) return;
    const tag = active.tagName ? active.tagName.toUpperCase() : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || active.id === "chatInput") {
      ev.preventDefault();
      stopEverything();
    }
  });

  // Expose API
  window.cc = window.cc || {};
  window.cc.videoCall = {
    startCall,
    leaveCall,
    playDoctorAudio,
    sendMessageToAgent,
    stopDoctorTTS,
    stopRecognition,
    stopEverything
  };

  log("videoCall client ready (video avatar).");
})();
