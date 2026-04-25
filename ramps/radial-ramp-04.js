(() => {
  if (!window.createConfiguredRampClass) {
    throw new Error("radial-ramp-core.js must be loaded before radial-ramp-04.js");
  }

  const RAMP4_CONFIG = {
    viewBox: "0 0 793.7 793.7",
    width: 793.7,
    height: 793.7,
    animation: {
      offsetSpeed: 6,
    },
    circle: {
      cx: 396.85,
      cy: 396.85,
      r: 396.85,
    },
    gradient: {
      id: "rampGradient4",
      cx: "396.85",
      cy: "396.85",
      fx: "396.85",
      fy: "396.85",
      r: "396.85",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "18%", color: "#f7b5aa" },
        { offset: "42%", color: "#fc9b88" },
        { offset: "56%", color: "#ff917b" },
        { offset: "62%", color: "#fd8c77" },
        { offset: "68%", color: "#f77f6c" },
        { offset: "75%", color: "#ee695a" },
        { offset: "82%", color: "#e14a42" },
        { offset: "85%", color: "#db3a35" },
        { offset: "96%", color: "#864596" },
      ],
    },
  };

  window.RampSvg4 = window.createConfiguredRampClass(RAMP4_CONFIG);
})();
