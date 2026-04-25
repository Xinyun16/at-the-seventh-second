(() => {
  if (!window.createConfiguredRampClass) {
    throw new Error("radial-ramp-core.js must be loaded before radial-ramp-11.js");
  }

  const RAMP11_CONFIG = {
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
      id: "rampGradient11",
      cx: "-879.98",
      cy: "-15761.99",
      fx: "-939.24",
      fy: "-15921.47",
      r: "396.85",
      gradientTransform: "translate(1276.83 -15365.14) scale(1 -1)",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "82%", color: "#397697" },
        { offset: "89%", color: "#009fd2" },
        { offset: "92%", color: "#73f7dc" },
        { offset: "92%", color: "#72f5d4" },
        { offset: "93%", color: "#72f0bf" },
        { offset: "93%", color: "#71e89d" },
        { offset: "94%", color: "#70dd6e" },
        { offset: "94%", color: "#6fcf32" },
        { offset: "95%", color: "#6ec403" },
        { offset: "96%", color: "#df9030" },
        { offset: "97%", color: "#db8d2f" },
        { offset: "97%", color: "#d0862c" },
        { offset: "97%", color: "#be7928" },
        { offset: "97%", color: "#a46723" },
        { offset: "98%", color: "#82501c" },
        { offset: "98%", color: "#5a3513" },
        { offset: "99%", color: "#4a2a10" },
      ],
    },
  };

  window.RampSvg11 = window.createConfiguredRampClass(RAMP11_CONFIG);
})();