(() => {
  if (!window.createConfiguredLinearRampClass) {
    throw new Error("linear-ramp-core.js must be loaded before linear-ramp-07.js");
  }

  const RAMP7_CONFIG = {
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
      id: "rampGradient7",
      x1: "0",
      y1: "396.85",
      x2: "793.7",
      y2: "396.85",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "2%", color: "#040404" },
        { offset: "11%", color: "#2e1f1a" },
        { offset: "17%", color: "#633724" },
        { offset: "20%", color: "#7d432a" },
        { offset: "25%", color: "#8d5632" },
        { offset: "32%", color: "#a97740" },
        { offset: "33%", color: "#b08251" },
        { offset: "36%", color: "#bc956e" },
        { offset: "38%", color: "#c19d79" },
        { offset: "38%", color: "#c09c78" },
        { offset: "44%", color: "#7a6a65" },
        { offset: "46%", color: "#5f575e" },
        { offset: "49%", color: "#55515a" },
        { offset: "56%", color: "#3d4151" },
        { offset: "60%", color: "#343c4e" },
        { offset: "69%", color: "#3a444f" },
        { offset: "71%", color: "#3c4750" },
        { offset: "75%", color: "#38424b" },
        { offset: "81%", color: "#2e363d" },
        { offset: "84%", color: "#262c31" },
        { offset: "97%", color: "#212835" },
      ],
    },
  };

  window.RampSvg7 = window.createConfiguredLinearRampClass(RAMP7_CONFIG);
})();