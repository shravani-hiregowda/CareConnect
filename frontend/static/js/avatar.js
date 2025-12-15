/* ============================================================
   CareConnect – Doctor Avatar (Clean Final Version)
   Author: ChatGPT (for Boss)
   Purpose:
     - Render realistic 2D talking avatar inside a small canvas
     - Auto mouth sync with SpeechSynthesis events
     - Autonomous blinking every 3–6 seconds
   ============================================================ */

(function () {
  if (window.DoctorAvatar) {
    console.warn("DoctorAvatar already exists – using existing instance.");
    return;
  }

  const Avatar = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,

    assets: {
      faceMask: null,
      mouthClosed: null,
      mouthSmall: null,
      mouthMedium: null,
      mouthWide: null,
      eyesOpen: null,
      eyesClosed: null,
    },

    loaded: false,
    currentMouth: "closed",
    eyesClosed: false,
    speaking: false,
    blinkTimeout: null,

    /* ------------------------------------------
       INIT
       ------------------------------------------ */
    init({ canvasId, assets }) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) {
        console.error("DoctorAvatar: Canvas not found:", canvasId);
        return;
      }

      this.ctx = this.canvas.getContext("2d");
      this.resizeCanvas();

      // Load assets
      const loadImg = (src) =>
        new Promise((res) => {
          if (!src) return res(null);
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = () => {
            console.warn("[Avatar] Failed to load:", src);
            res(null);
          };
          img.src = src;
        });

      Promise.all([
        loadImg(assets.faceMask),
        loadImg(assets.mouthClosed),
        loadImg(assets.mouthSmall),
        loadImg(assets.mouthMed),
        loadImg(assets.mouthWide),
        loadImg(assets.eyesOpen),
        loadImg(assets.eyesClosed),
      ]).then(
        ([
          faceMask,
          mouthClosed,
          mouthSmall,
          mouthMed,
          mouthWide,
          eyesOpen,
          eyesClosed,
        ]) => {
          this.assets = {
            faceMask,
            mouthClosed,
            mouthSmall,
            mouthMed,
            mouthWide,
            eyesOpen,
            eyesClosed,
          };
          this.loaded = true;
          this.loop();
          this.startBlinking();
        }
      );

      console.log("DoctorAvatar initialized");
    },

    /* ------------------------------------------
       CANVAS RESIZE
       ------------------------------------------ */
    resizeCanvas() {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.width = rect.width;
      this.height = rect.height;
    },

    /* ------------------------------------------
       MOUTH CONTROL (amplitude-based or preset)
       ------------------------------------------ */
    setMouth(level) {
      if (level < 0.2) this.currentMouth = "closed";
      else if (level < 0.45) this.currentMouth = "small";
      else if (level < 0.7) this.currentMouth = "medium";
      else this.currentMouth = "wide";
    },

    /* ------------------------------------------
       BLINKING
       ------------------------------------------ */
    startBlinking() {
      if (this.blinkTimeout) clearTimeout(this.blinkTimeout);

      const nextBlink = 1500 + Math.random() * 3000;

      this.blinkTimeout = setTimeout(() => {
        this.eyesClosed = true;

        setTimeout(() => {
          this.eyesClosed = false;
          this.startBlinking();
        }, 180);
      }, nextBlink);
    },

    /* ------------------------------------------
       SPEAK TEXT (auto mouth sync)
       ------------------------------------------ */
    speak(text) {
      if (!("speechSynthesis" in window)) {
        console.warn("SpeechSynthesis not supported.");
        return;
      }

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);

      utter.rate = 1.05;
      utter.pitch = 1;
      utter.volume = 1;

      utter.onstart = () => {
        this.speaking = true;
      };

      utter.onend = () => {
        this.speaking = false;
        this.setMouth(0); // reset
      };

      utter.onboundary = () => {
        // Random mouth movement on each speech boundary event
        this.setMouth(Math.random());
      };

      speechSynthesis.speak(utter);
    },

    /* ------------------------------------------
       DRAW FRAME
       ------------------------------------------ */
    draw() {
      if (!this.loaded) return;

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      // FACE MASK
      if (this.assets.faceMask)
        ctx.drawImage(
          this.assets.faceMask,
          0,
          0,
          this.width,
          this.height
        );

      // EYES
      if (this.eyesClosed) {
        if (this.assets.eyesClosed)
          ctx.drawImage(
            this.assets.eyesClosed,
            0,
            0,
            this.width,
            this.height
          );
      } else {
        if (this.assets.eyesOpen)
          ctx.drawImage(
            this.assets.eyesOpen,
            0,
            0,
            this.width,
            this.height
          );
      }

      // MOUTH
      let mouthImg = null;
      if (this.currentMouth === "closed") mouthImg = this.assets.mouthClosed;
      if (this.currentMouth === "small") mouthImg = this.assets.mouthSmall;
      if (this.currentMouth === "medium") mouthImg = this.assets.mouthMed;
      if (this.currentMouth === "wide") mouthImg = this.assets.mouthWide;

      if (mouthImg)
        ctx.drawImage(
          mouthImg,
          0,
          0,
          this.width,
          this.height
        );
    },

    /* ------------------------------------------
       MAIN LOOP (60 FPS)
       ------------------------------------------ */
    loop() {
      this.draw();
      requestAnimationFrame(() => this.loop());
    },
  };

  window.DoctorAvatar = Avatar;
})();
