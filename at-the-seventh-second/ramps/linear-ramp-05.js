(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  if (!window.createConfiguredLinearRampClass) {
    function createSvgNode(tagName, attributes = {}) {
      const node = document.createElementNS(SVG_NS, tagName);

      for (const [key, value] of Object.entries(attributes)) {
        node.setAttribute(key, value);
      }

      return node;
    }

    function normalizeOffset(offset) {
      if (typeof offset === "number") {
        return offset <= 1 ? offset * 100 : offset;
      }

      const rawOffset = String(offset).trim();
      const numericOffset = Number.parseFloat(rawOffset);

      if (Number.isNaN(numericOffset)) {
        return 0;
      }

      return rawOffset.endsWith("%") || numericOffset > 1 ? numericOffset : numericOffset * 100;
    }

    function hexToRgb(hexColor) {
      const normalizedHex = hexColor.replace("#", "");
      return {
        r: Number.parseInt(normalizedHex.slice(0, 2), 16),
        g: Number.parseInt(normalizedHex.slice(2, 4), 16),
        b: Number.parseInt(normalizedHex.slice(4, 6), 16),
      };
    }

    function rgbToHex({ r, g, b }) {
      const toHex = (value) => Math.round(value).toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function rgbaToCss({ r, g, b, a }) {
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.max(0, Math.min(1, a))})`;
    }

    function getEdgeFade(fixedOffset) {
      if (fixedOffset < 80) {
        return 1;
      }

      const fadeProgress = Math.min(1, (fixedOffset - 80) / 20);
      return 0.5 * (1 + Math.cos(Math.PI * fadeProgress));
    }

    window.createConfiguredLinearRampClass = function createConfiguredLinearRampClass(baseConfig) {
      let rampInstanceCount = 0;

      const parsedOriginalStops = baseConfig.gradient.stops
        .map((stop) => {
          const rgb = hexToRgb(stop.color);
          return {
            offset: normalizeOffset(stop.offset),
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            a: stop.opacity !== undefined ? Number.parseFloat(String(stop.opacity)) : 1,
          };
        })
        .sort((a, b) => a.offset - b.offset);

      function sampleOriginalGradient(offset) {
        if (offset <= parsedOriginalStops[0].offset) {
          return parsedOriginalStops[0];
        }

        if (offset >= parsedOriginalStops[parsedOriginalStops.length - 1].offset) {
          return parsedOriginalStops[parsedOriginalStops.length - 1];
        }

        for (let i = 0; i < parsedOriginalStops.length - 1; i += 1) {
          const start = parsedOriginalStops[i];
          const end = parsedOriginalStops[i + 1];

          if (offset >= start.offset && offset <= end.offset) {
            const range = end.offset - start.offset;
            const t = range === 0 ? 0 : (offset - start.offset) / range;
            return {
              r: start.r + (end.r - start.r) * t,
              g: start.g + (end.g - start.g) * t,
              b: start.b + (end.b - start.b) * t,
              a: start.a + (end.a - start.a) * t,
            };
          }
        }

        return parsedOriginalStops[parsedOriginalStops.length - 1];
      }

      function createRampConfig(options = {}, instanceId = 0) {
        const gradientOptions = options.gradient ?? {};

        return {
          viewBox: options.viewBox ?? baseConfig.viewBox,
          width: options.width ?? baseConfig.width,
          height: options.height ?? baseConfig.height,
          animation: {
            ...baseConfig.animation,
            ...(options.animation ?? {}),
          },
          circle: {
            ...baseConfig.circle,
            ...(options.circle ?? {}),
          },
          gradient: {
            ...baseConfig.gradient,
            ...gradientOptions,
            id: gradientOptions.id ?? `${baseConfig.gradient.id}-${instanceId}`,
            stops: (gradientOptions.stops ?? baseConfig.gradient.stops).map((stop) => ({
              ...stop,
            })),
          },
        };
      }

      return class LinearRampSvg {
        constructor(options = {}) {
          this.instanceId = ++rampInstanceCount;
          this.config = createRampConfig(options, this.instanceId);
          this.scale = options.scale ?? 0.24;
          this.centerX = options.centerX ?? this.config.width * 0.5;
          this.centerY = options.centerY ?? this.config.height * 0.5;
          this.zIndex = options.zIndex ?? 2;
          this.parent = null;
          this.svg = null;
          this.stopElements = [];
          this.frameId = null;
          this.lastTimestamp = 0;
          this.shift = 0;
          this.currentStops = this.buildCurrentStops(0);

          this.tick = (timestamp) => {
            if (!this.svg) {
              this.frameId = null;
              return;
            }

            if (this.lastTimestamp === 0) {
              this.lastTimestamp = timestamp;
            }

            const deltaSeconds = (timestamp - this.lastTimestamp) / 1000;
            this.lastTimestamp = timestamp;
            this.shift = (this.shift + deltaSeconds * this.config.animation.offsetSpeed) % 100;
            this.currentStops = this.buildCurrentStops(this.shift);

            for (let i = 0; i < this.currentStops.length; i += 1) {
              const stopData = this.currentStops[i];
              const element = this.stopElements[i];
              element.setAttribute("offset", `${stopData.offset}%`);
              element.setAttribute("stop-color", rgbToHex(stopData));
              element.setAttribute("stop-opacity", String(stopData.a));
            }

            this.frameId = window.requestAnimationFrame(this.tick);
          };
        }

        buildCurrentStops(shift = 0) {
          const currentStops = [];

          for (let i = 0; i < parsedOriginalStops.length; i += 1) {
            const stop = parsedOriginalStops[i];
            const newOffset = (stop.offset + shift) % 100;
            currentStops.push({
              offset: newOffset,
              r: stop.r,
              g: stop.g,
              b: stop.b,
              a: stop.a * getEdgeFade(newOffset),
              originalIndex: i,
            });
          }

          const boundaryOriginalOffset = (100 - shift) % 100;
          const boundaryColor = sampleOriginalGradient(boundaryOriginalOffset);

          currentStops.push({
            offset: 0,
            r: boundaryColor.r,
            g: boundaryColor.g,
            b: boundaryColor.b,
            a: boundaryColor.a * getEdgeFade(0),
            originalIndex: -1,
          });

          currentStops.push({
            offset: 100,
            r: boundaryColor.r,
            g: boundaryColor.g,
            b: boundaryColor.b,
            a: boundaryColor.a * getEdgeFade(100),
            originalIndex: 999,
          });

          currentStops.sort((a, b) => {
            if (a.offset === b.offset) {
              return a.originalIndex - b.originalIndex;
            }

            return a.offset - b.offset;
          });

          return currentStops;
        }

        sampleStopsAtOffset(offset) {
          const clampedOffset = Math.max(0, Math.min(100, offset));
          const stops = this.currentStops;

          if (stops.length === 0) {
            return null;
          }

          if (clampedOffset <= stops[0].offset) {
            return stops[0];
          }

          if (clampedOffset >= stops[stops.length - 1].offset) {
            return stops[stops.length - 1];
          }

          for (let i = 0; i < stops.length - 1; i += 1) {
            const start = stops[i];
            const end = stops[i + 1];

            if (clampedOffset >= start.offset && clampedOffset <= end.offset) {
              const range = end.offset - start.offset;
              const t = range === 0 ? 0 : (clampedOffset - start.offset) / range;
              return {
                r: start.r + (end.r - start.r) * t,
                g: start.g + (end.g - start.g) * t,
                b: start.b + (end.b - start.b) * t,
                a: start.a + (end.a - start.a) * t,
              };
            }
          }

          return stops[stops.length - 1];
        }

        getRenderedCircle() {
          const renderedWidth = this.config.width * this.scale;
          const renderedHeight = this.config.height * this.scale;
          const left = this.centerX - renderedWidth * 0.5;
          const top = this.centerY - renderedHeight * 0.5;

          return {
            x: left + this.config.circle.cx * this.scale,
            y: top + this.config.circle.cy * this.scale,
            radius: this.config.circle.r * this.scale,
          };
        }

        sampleColorAtCanvasPoint(x, y) {
          const circle = this.getRenderedCircle();
          const hasValidGeometry = [circle.x, circle.y, circle.radius].every(Number.isFinite);
          if (!hasValidGeometry) {
            return null;
          }

          const dx = x - circle.x;
          const dy = y - circle.y;
          const distance = Math.hypot(dx, dy);

          if (distance > circle.radius || circle.radius <= 0) {
            return null;
          }

          // For linear gradient from left to right, offset depends on x position relative to the circle
          const linearOffset = ((dx + circle.radius) / (circle.radius * 2)) * 100;
          const sampled = this.sampleStopsAtOffset(linearOffset);

          if (!sampled || sampled.a <= 0.01) {
            return null;
          }

          return {
            r: sampled.r,
            g: sampled.g,
            b: sampled.b,
            a: sampled.a,
          };
        }

        advance(deltaSeconds = 0) {
          if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
            return;
          }

          this.shift = (this.shift + deltaSeconds * this.config.animation.offsetSpeed) % 100;
          this.currentStops = this.buildCurrentStops(this.shift);
        }

        display(targetContext) {
          if (!targetContext) {
            return;
          }

          if (this.currentStops.length === 0) {
            return;
          }

          const circle = this.getRenderedCircle();
          const hasValidGeometry = [circle.x, circle.y, circle.radius].every(Number.isFinite);
          if (!hasValidGeometry || circle.radius <= 0) {
            return;
          }

          const gradient = targetContext.createLinearGradient(
            circle.x - circle.radius,
            circle.y,
            circle.x + circle.radius,
            circle.y
          );

          for (let i = 0; i < this.currentStops.length; i += 1) {
            const stop = this.currentStops[i];
            const rawOffset = stop.offset / 100;
            const previousOffset = i > 0 ? this.currentStops[i - 1].offset / 100 : 0;
            const nextOffset = i < this.currentStops.length - 1 ? this.currentStops[i + 1].offset / 100 : 1;
            const minOffset = i > 0 ? previousOffset : 0;
            const maxOffset = i < this.currentStops.length - 1 ? nextOffset : 1;
            const safeOffset = Math.max(minOffset, Math.min(maxOffset, rawOffset));
            gradient.addColorStop(safeOffset, rgbaToCss(stop));
          }

          targetContext.save();
          targetContext.fillStyle = gradient;
          targetContext.beginPath();
          targetContext.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
          targetContext.fill();
          targetContext.restore();
        }

        buildSvg() {
          const svg = createSvgNode("svg", {
            viewBox: this.config.viewBox,
            width: "100%",
            height: "100%",
            xmlns: SVG_NS,
            preserveAspectRatio: "xMidYMid meet",
          });

          const defs = createSvgNode("defs");
          const linearGradient = createSvgNode("linearGradient", {
            id: this.config.gradient.id,
            x1: this.config.gradient.x1,
            y1: this.config.gradient.y1,
            x2: this.config.gradient.x2,
            y2: this.config.gradient.y2,
            gradientUnits: this.config.gradient.gradientUnits,
          });

          if (this.config.gradient.gradientTransform) {
             linearGradient.setAttribute("gradientTransform", this.config.gradient.gradientTransform);
          }

          const stopElements = [];
          const totalStops = parsedOriginalStops.length + 2;

          for (let i = 0; i < totalStops; i += 1) {
            const stop = createSvgNode("stop");
            linearGradient.appendChild(stop);
            stopElements.push(stop);
          }

          defs.appendChild(linearGradient);
          svg.appendChild(defs);

          const circle = createSvgNode("circle", {
            cx: this.config.circle.cx,
            cy: this.config.circle.cy,
            r: this.config.circle.r,
            fill: `url(#${this.config.gradient.id})`,
          });

          svg.appendChild(circle);

          return {
            svg,
            stopElements,
          };
        }

        mount(target) {
          const parent = typeof target === "string" ? document.querySelector(target) : target;

          if (!parent) {
            throw new Error(`Missing mount target: ${target}`);
          }

          if (this.svg) {
            this.unmount();
          }

          if (window.getComputedStyle(parent).position === "static") {
            parent.style.position = "relative";
          }

          const { svg, stopElements } = this.buildSvg();
          this.parent = parent;
          this.svg = svg;
          this.stopElements = stopElements;
          this.svg.style.position = "absolute";
          this.svg.style.display = "block";
          this.svg.style.pointerEvents = "none";
          this.svg.style.background = "transparent";
          this.svg.style.transform = "translate(-50%, -50%)";
          this.svg.style.transformOrigin = "center center";
          this.svg.style.zIndex = String(this.zIndex);
          this.parent.appendChild(this.svg);
          this.applyLayout();
          this.start();
          return this.svg;
        }

        applyLayout() {
          if (!this.svg) {
            return;
          }

          this.svg.style.width = `${this.config.width * this.scale}px`;
          this.svg.style.height = `${this.config.height * this.scale}px`;
          this.svg.style.left = `${this.centerX}px`;
          this.svg.style.top = `${this.centerY}px`;
        }

        updateLayout({ scale = this.scale, centerX = this.centerX, centerY = this.centerY } = {}) {
          this.scale = Number.isFinite(scale) ? scale : this.scale;
          this.centerX = Number.isFinite(centerX) ? centerX : this.centerX;
          this.centerY = Number.isFinite(centerY) ? centerY : this.centerY;
          this.applyLayout();
        }

        start() {
          if (!this.svg || this.frameId !== null) {
            return;
          }

          this.lastTimestamp = 0;
          this.shift = 0;
          this.frameId = window.requestAnimationFrame(this.tick);
        }

        stop() {
          if (this.frameId !== null) {
            window.cancelAnimationFrame(this.frameId);
            this.frameId = null;
          }
        }

        unmount() {
          this.stop();

          if (this.svg && this.svg.parentNode) {
            this.svg.parentNode.removeChild(this.svg);
          }

          this.svg = null;
          this.parent = null;
          this.stopElements = [];
        }
      };
    };
  }

  const RAMP5_CONFIG = {
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
      id: "rampGradient5",
      x1: "0",
      y1: "396.85",
      x2: "793.7",
      y2: "396.85",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "1%", color: "#3c3043" },
        { offset: "12%", color: "#352b3f" },
        { offset: "23%", color: "#99649a" },
        { offset: "26%", color: "#ab75a5" },
        { offset: "29%", color: "#be88b2" },
        { offset: "32%", color: "#c79bbe" },
        { offset: "37%", color: "#d6b9d1" },
        { offset: "42%", color: "#dfcbdd" },
        { offset: "45%", color: "#e3d2e2" },
        { offset: "54%", color: "#d2b1cd" },
        { offset: "56%", color: "#d0acca" },
        { offset: "57%", color: "#ceadcb" },
        { offset: "62%", color: "#cbb1d0" },
        { offset: "64%", color: "#c7aece" },
        { offset: "74%", color: "#b8a4ca" },
        { offset: "78%", color: "#b0a2ca" },
        { offset: "84%", color: "#9c9fca" },
        { offset: "88%", color: "#899dcb" },
        { offset: "99%", color: "#508bb9" },
      ],
    },
  };

  window.RampSvg5 = window.createConfiguredLinearRampClass(RAMP5_CONFIG);
})();