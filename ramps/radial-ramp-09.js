(() => {
  if (!window.createConfiguredRampClass) {
    throw new Error("radial-ramp-core.js must be loaded before radial-ramp-09.js");
  }

  const RAMP9_CONFIG = {
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
      id: "rampGradient9",
      cx: "1091.17",
      cy: "-12169.09",
      fx: "1429.28",
      fy: "-11795.32",
      r: "566.93",
      gradientTransform: "translate(1658.1 -11602.16) rotate(-180)",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "1%", color: "#d0d8e3" },
        { offset: "7%", color: "#ccd5e2" },
        { offset: "8%", color: "#cad2df" },
        { offset: "13%", color: "#c6ccda" },
        { offset: "21%", color: "#c1c1d1" },
        { offset: "30%", color: "#b8b7c6" },
        { offset: "38%", color: "#b2a5be" },
        { offset: "48%", color: "#b0abbe" },
        { offset: "50%", color: "#b0aebf" },
        { offset: "64%", color: "#8b9ba9" },
        { offset: "78%", color: "#5e7990" },
        { offset: "86%", color: "#3f5970" },
        { offset: "95%", color: "#131e2a" },
      ],
    },
  };

  window.RampSvg9 = window.createConfiguredRampClass(RAMP9_CONFIG);
})();