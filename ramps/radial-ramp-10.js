(() => {
  if (!window.createConfiguredRampClass) {
    throw new Error("radial-ramp-core.js must be loaded before radial-ramp-10.js");
  }

  const RAMP10_CONFIG = {
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
      id: "rampGradient10",
      cx: "-879.98",
      cy: "-15701.47",
      fx: "-559.86",
      fy: "-15936.03",
      r: "396.85",
      gradientTransform: "translate(1276.83 -15304.62) scale(1 -1)",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "19%", color: "#bed1e8" },
        { offset: "38%", color: "#bed1e5" },
        { offset: "51%", color: "#bed2dc" },
        { offset: "61%", color: "#bfd4cd" },
        { offset: "70%", color: "#c1d7b9" },
        { offset: "79%", color: "#c3da9e" },
        { offset: "85%", color: "#c5de88" },
        { offset: "85%", color: "#c7dc83" },
        { offset: "87%", color: "#d3d46e" },
        { offset: "89%", color: "#dacf62" },
        { offset: "92%", color: "#ddce5e" },
        { offset: "92%", color: "#d5d25b" },
        { offset: "92%", color: "#d5ba58" },
        { offset: "93%", color: "#d59c54" },
        { offset: "93%", color: "#d58a52" },
        { offset: "94%", color: "#d68452" },
        { offset: "94%", color: "#bb6979" },
        { offset: "95%", color: "#9a47aa" },
        { offset: "95%", color: "#8e3bbd" },
        { offset: "98%", color: "#4438d4" },
        { offset: "99%", color: "#7881f1" },
      ],
    },
  };

  window.RampSvg10 = window.createConfiguredRampClass(RAMP10_CONFIG);
})();