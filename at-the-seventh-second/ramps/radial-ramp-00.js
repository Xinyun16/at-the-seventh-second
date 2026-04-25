(() => {
  if (!window.createConfiguredRampClass) {
    throw new Error("radial-ramp-core.js must be loaded before radial-ramp-00.js");
  }

  const RAMP0_CONFIG = {
    viewBox: "0 0 1133.86 1133.86",
    width: 1133.86,
    height: 1133.86,
    animation: {
      offsetSpeed: 6,
    },
    circle: {
      cx: 566.93,
      cy: 566.93,
      r: 566.93,
    },
    gradient: {
      id: "rampGradient0",
      cx: "566.93",
      cy: "566.93",
      fx: "566.93",
      fy: "566.93",
      r: "566.93",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "1%", color: "#10161f" },
        { offset: "5%", color: "#10192c" },
        { offset: "15%", color: "#111f47" },
        { offset: "24%", color: "#122358" },
        { offset: "30%", color: "#13255f" },
        { offset: "41%", color: "#294891" },
        { offset: "53%", color: "#5e86ce" },
        { offset: "71%", color: "#7394cf" },
        { offset: "84%", color: "#799ad1" },
        { offset: "89%", color: "#7e9fd3" },
        { offset: "99%", color: "#8a9fd2" },
      ],
    },
  };

  window.RampSvg0 = window.createConfiguredRampClass(RAMP0_CONFIG);
})();