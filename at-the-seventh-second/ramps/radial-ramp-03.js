(() => {
  if (!window.createConfiguredRampClass) {
    throw new Error("radial-ramp-core.js must be loaded before radial-ramp-03.js");
  }

  const RAMP3_CONFIG = {
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
      id: "rampGradient3",
      cx: "396.85",
      cy: "396.85",
      fx: "396.85",
      fy: "396.85",
      r: "396.85",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "1%", color: "#b4d6f2" },
        { offset: "11%", color: "#c2daec" },
        { offset: "35%", color: "#dce4e1" },
        { offset: "50%", color: "#e7e8dd" },
        { offset: "80%", color: "#88bfd5" },
        { offset: "99%", color: "#4aa5d0" },
      ],
    },
  };

  window.RampSvg3 = window.createConfiguredRampClass(RAMP3_CONFIG);
})();
