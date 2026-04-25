(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  if (!window.createConfiguredRampClass) {
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

    function parseSvgTransform(transformStr) {
      let a = 1, b = 0, c = 0, d = 1, e = 0, f = 0;
      if (!transformStr) return {a, b, c, d, e, f};
      
      const regex = /(\w+)\s*\(([^)]+)\)/g;
      let match;
      const transforms = [];
      while ((match = regex.exec(transformStr)) !== null) {
        transforms.push({ type: match[1], args: match[2].trim().split(/[\s,]+/).map(parseFloat) });
      }
      
      for (const t of transforms) {
        let na=1, nb=0, nc=0, nd=1, ne=0, nf=0;
        if (t.type === 'translate') {
          ne = t.args[0] || 0;
          nf = t.args[1] || 0;
        } else if (t.type === 'scale') {
          na = t.args[0] || 1;
          nd = t.args.length > 1 ? t.args[1] : na;
        } else if (t.type === 'rotate') {
          const angle = (t.args[0] || 0) * Math.PI / 180;
          na = Math.cos(angle);
          nb = Math.sin(angle);
          nc = -Math.sin(angle);
          nd = Math.cos(angle);
          if (t.args.length === 3) {
            const cx = t.args[1];
            const cy = t.args[2];
            ne = cx - na * cx - nc * cy;
            nf = cy - nb * cx - nd * cy;
          }
        } else if (t.type === 'matrix') {
          na = t.args[0]; nb = t.args[1]; nc = t.args[2];
          nd = t.args[3]; ne = t.args[4]; nf = t.args[5];
        }
        
        const ta = a * na + c * nb;
        const tb = b * na + d * nb;
        const tc = a * nc + c * nd;
        const td = b * nc + d * nd;
        const te = a * ne + c * nf + e;
        const tf = b * ne + d * nf + f;
        a = ta; b = tb; c = tc; d = td; e = te; f = tf;
      }
      return {a, b, c, d, e, f};
    }

    window.createConfiguredRampClass = function createConfiguredRampClass(baseConfig) {
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

      return class RampSvg {
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
            left,
            top
          };
        }

        getRenderedGradientParams() {
          const circle = this.getRenderedCircle();
          const m = parseSvgTransform(this.config.gradient.gradientTransform);
          
          const svgCx = parseFloat(this.config.gradient.cx ?? this.config.circle.cx);
          const svgCy = parseFloat(this.config.gradient.cy ?? this.config.circle.cy);
          const svgFx = parseFloat(this.config.gradient.fx ?? svgCx);
          const svgFy = parseFloat(this.config.gradient.fy ?? svgCy);
          const svgR = parseFloat(this.config.gradient.r ?? this.config.circle.r);

          const tCx = svgCx * m.a + svgCy * m.c + m.e;
          const tCy = svgCx * m.b + svgCy * m.d + m.f;
          const tFx = svgFx * m.a + svgFy * m.c + m.e;
          const tFy = svgFx * m.b + svgFy * m.d + m.f;
          
          const scaleFactor = Math.sqrt(m.a * m.a + m.b * m.b);
          const tR = svgR * scaleFactor;

          return {
            cx: circle.left + tCx * this.scale,
            cy: circle.top + tCy * this.scale,
            fx: circle.left + tFx * this.scale,
            fy: circle.top + tFy * this.scale,
            r: tR * this.scale,
            circleCx: circle.x,
            circleCy: circle.y,
            circleR: circle.radius
          };
        }

        sampleColorAtCanvasPoint(x, y) {
          const params = this.getRenderedGradientParams();
          const hasValidGeometry = [
            params.circleCx,
            params.circleCy,
            params.circleR,
            params.fx,
            params.fy,
            params.r,
          ].every(Number.isFinite);
          if (!hasValidGeometry || params.r <= 0) {
            return null;
          }

          const dx = x - params.circleCx;
          const dy = y - params.circleCy;
          const distanceToCenter = Math.hypot(dx, dy);

          if (distanceToCenter > params.circleR || params.circleR <= 0) {
            return null;
          }

          const fdx = x - params.fx;
          const fdy = y - params.fy;
          const distanceToFocal = Math.hypot(fdx, fdy);
          
          const offset = (distanceToFocal / params.r) * 100;
          const sampled = this.sampleStopsAtOffset(offset);

          if (!sampled || sampled.a <= 0.01) {
            return null;
          }

          const centerBoost = 0.45 + 0.55 * (1 - distanceToCenter / params.circleR);
          return {
            r: sampled.r,
            g: sampled.g,
            b: sampled.b,
            a: sampled.a * centerBoost,
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

          const params = this.getRenderedGradientParams();
          const hasValidGeometry = [
            params.fx,
            params.fy,
            params.cx,
            params.cy,
            params.r,
            params.circleCx,
            params.circleCy,
            params.circleR,
          ].every(Number.isFinite);
          if (!hasValidGeometry || params.circleR <= 0 || params.r <= 0) {
            return;
          }

          const gradient = targetContext.createRadialGradient(
            params.fx,
            params.fy,
            0,
            params.cx,
            params.cy,
            params.r
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
          targetContext.arc(params.circleCx, params.circleCy, params.circleR, 0, Math.PI * 2);
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
          const radialGradient = createSvgNode("radialGradient", {
            id: this.config.gradient.id,
            cx: this.config.gradient.cx,
            cy: this.config.gradient.cy,
            fx: this.config.gradient.fx,
            fy: this.config.gradient.fy,
            r: this.config.gradient.r,
            gradientUnits: this.config.gradient.gradientUnits,
          });

          if (this.config.gradient.gradientTransform) {
             radialGradient.setAttribute("gradientTransform", this.config.gradient.gradientTransform);
          }

          const stopElements = [];
          const totalStops = parsedOriginalStops.length + 2;

          for (let i = 0; i < totalStops; i += 1) {
            const stop = createSvgNode("stop");
            radialGradient.appendChild(stop);
            stopElements.push(stop);
          }

          defs.appendChild(radialGradient);
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

  const RAMP1_CONFIG = {
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
      id: "rampGradient1",
      cx: "566.93",
      cy: "566.93",
      fx: "566.93",
      fy: "566.93",
      r: "566.93",
      gradientUnits: "userSpaceOnUse",
      stops: [
        { offset: "0%", color: "#000000" },
        { offset: "3%", color: "#212835" },
        { offset: "16%", color: "#262c31", opacity: "0.5" },
        { offset: "18%", color: "#2b3238", opacity: "0.62" },
        { offset: "22%", color: "#343d45", opacity: "0.83" },
        { offset: "26%", color: "#3a444d", opacity: "0.96" },
        { offset: "29%", color: "#3c4750" },
        { offset: "31%", color: "#3a444f" },
        { offset: "40%", color: "#343c4e" },
        { offset: "44%", color: "#3d4151" },
        { offset: "51%", color: "#55515a" },
        { offset: "54%", color: "#5f575e" },
        { offset: "56%", color: "#7a6a65" },
        { offset: "62%", color: "#c09c78" },
        { offset: "62%", color: "#c19d79" },
        { offset: "64%", color: "#bc956e" },
        { offset: "67%", color: "#b08251" },
        { offset: "68%", color: "#a97740" },
        { offset: "75%", color: "#8d5632" },
        { offset: "80%", color: "#7d432a" },
        { offset: "82%", color: "#693a26", opacity: "0.88" },
        { offset: "87%", color: "#37231b", opacity: "0.56" },
        { offset: "88%", color: "#2e1f1a", opacity: "0.5" },
        { offset: "96%", color: "#120d0b", opacity: "0.17" },
        { offset: "99%", color: "#040404", opacity: "0" },
        { offset: "100%", color: "#000000" },
      ],
    },
  };

  const RampSvg1 = window.createConfiguredRampClass(RAMP1_CONFIG);
  window.RampSvg1 = RampSvg1;
  window.RampSvg = RampSvg1;
})();
