(() => {
  if (!window.createConfiguredLinearRampClass) {
    throw new Error("linear-ramp-core.js must be loaded before linear-ramp-08.js");
  }

  const RAMP8_CONFIG = {
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
      id: "rampGradient8",
      x1: "-14228.13",
      y1: "-21230.16",
      x2: "-13434.43",
      y2: "-21230.16",
      gradientTransform: "translate(-13434.43 -20833.31) rotate(-180)",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "1%", color: "#6e8c83" },
        { offset: "12%", color: "#7e7d95" },
        { offset: "23%", color: "#827f70" },
        { offset: "26%", color: "#8b7e64" },
        { offset: "32%", color: "#9b7d52" },
        { offset: "40%", color: "#b67642" },
        { offset: "53%", color: "#cd623d" },
        { offset: "56%", color: "#ce5d42" },
        { offset: "62%", color: "#cf5a47" },
        { offset: "69%", color: "#cd5b60" },
        { offset: "74%", color: "#cd5d70" },
        { offset: "79%", color: "#cb5e77" },
        { offset: "88%", color: "#c7628b" },
        { offset: "88%", color: "#c7638e" },
        { offset: "99%", color: "#ba62ad" },
      ],
    },
  };

  window.RampSvg8 = window.createConfiguredLinearRampClass(RAMP8_CONFIG);
})();