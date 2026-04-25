(() => {
  if (!window.createConfiguredLinearRampClass) {
    throw new Error("linear-ramp-core.js must be loaded before linear-ramp-06.js");
  }

  const RAMP6_CONFIG = {
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
      id: "rampGradient6",
      x1: "-14262.42",
      y1: "-11913.01",
      x2: "-13468.72",
      y2: "-11913.01",
      gradientTransform: "translate(-13468.72 -11516.15) rotate(-180)",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "3%", color: "#4591b8" },
        { offset: "4%", color: "#448eb7" },
        { offset: "11%", color: "#3d7db2" },
        { offset: "19%", color: "#3a73af" },
        { offset: "28%", color: "#3970af" },
        { offset: "35%", color: "#4279ad" },
        { offset: "46%", color: "#5c94a7" },
        { offset: "49%", color: "#659da6" },
        { offset: "58%", color: "#97a398" },
        { offset: "65%", color: "#8eb19b" },
        { offset: "70%", color: "#85c2a0" },
        { offset: "74%", color: "#89cba7" },
        { offset: "79%", color: "#94e5ba" },
        { offset: "81%", color: "#98ecbf" },
      ],
    },
  };

  window.RampSvg6 = window.createConfiguredLinearRampClass(RAMP6_CONFIG);
})();