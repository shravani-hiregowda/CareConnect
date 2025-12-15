console.log("Loading custom LiveKit UMD...");

const script = document.createElement("script");
script.src = "/frontend/static/js/livekit-client.umd.js";
script.onload = () => {
    console.log("UMD Loaded. window.livekit=", window.livekit);
    window.LiveKit = window.livekit;
};
script.onerror = () => console.error("❌ Failed to load custom UMD!");

document.head.appendChild(script);
