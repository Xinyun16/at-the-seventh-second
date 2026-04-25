(() => {
  if (!window.createConfiguredRampClass) {
    throw new Error("radial-ramp-core.js must be loaded before radial-ramp-02.js");
  }

  const RAMP2_CONFIG = {
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
      id: "rampGradient2",
      cx: "566.93",
      cy: "566.93",
      fx: "566.93",
      fy: "566.93",
      r: "566.93",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "0%", color: "#7881f1" },
        { offset: "1%", color: "#4438d4" },
        { offset: "5%", color: "#8e3bbd" },
        { offset: "6%", color: "#9a47aa" },
        { offset: "7%", color: "#bb6979" },
        { offset: "8%", color: "#d68452" },
        { offset: "9%", color: "#d58a52" },
        { offset: "11%", color: "#d59c54" },
        { offset: "14%", color: "#d5ba58" },
        { offset: "16%", color: "#d5d25b" },
        { offset: "22%", color: "#ddce5e" },
        { offset: "24%", color: "#dacf62" },
        { offset: "27%", color: "#d3d46e" },
        { offset: "30%", color: "#c7dc83" },
        { offset: "31%", color: "#c5de88" },
        { offset: "35%", color: "#c3da9e" },
        { offset: "41%", color: "#c1d7b9" },
        { offset: "49%", color: "#bfd4cd" },
        { offset: "56%", color: "#bed2dc" },
        { offset: "66%", color: "#bed1e5" },
        { offset: "81%", color: "#bed1e8" },
      ],
    },
  };

  window.RampSvg2 = window.createConfiguredRampClass(RAMP2_CONFIG);
})();
