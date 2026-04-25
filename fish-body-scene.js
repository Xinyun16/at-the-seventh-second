const BG_COLOR = "#ffffff"; // 背景颜色决定整体画面的明暗和基调。
const BODY_COLOR = "#000000"; // 鱼身文字颜色决定主体与背景的对比强度。
const COVER_WIDTH = 5670;
const COVER_HEIGHT = 5670;
const QUADRANT_FONT_SCALES = {
  topLeft: 0.5,
  topRight: 1.2,
  bottomLeft: 2.0,
  bottomRight: 1,
};
const REFRACTION_OFFSET = 10; // 折射位移越大，跨轴时两侧文字分裂感越明显。
const QUADRANT_SHIFT_X = 50; // 上下象限在水平方向的整体错位量。
const QUADRANT_SHIFT_Y = 50; // 左右象限在垂直方向的整体错位量。
const RAMP_GLOBAL_SCALE = 0.75; // 控制所有ramp的等比例缩放大小，1.0为原始大小，0.5为缩小一半。
const TEXT_REVEAL_STEP_MS = 2000;
const MOBILE_TEXT_REVEAL_DELAY_MS = 1200;
const MOBILE_INTERACTIVE_TEXT_SCALE = 0.78;
const RAMP_CENTER_RATIOS = [
  { x: 0.672, y: 0.262 }, // 第一象限: 右上
  { x: 0.328, y: 0.262 }, // 第二象限: 左上
  { x: 0.328, y: 0.738 }, // 第三象限: 左下
  { x: 0.672, y: 0.738 }, // 第四象限: 右下
];

let fishSchool;
let rampOverlays = [];
let hoverTimer = 0;
let isTextRevealed = false;
let textOverlayLoadPromise = null;
let textRevealTimeoutIds = [];
let mobileRevealTimeoutId = null;
let hasBoundVisualViewportResize = false;
const TEXT_OVERLAY_FILES = ["text-overlay-primary.svg", "text-overlay-secondary.svg"];
const overlayRevealTargetCache = new WeakMap();

const ALL_RAMP_CLASS_NAMES = [
  "RampSvg0", "RampSvg1", "RampSvg2", "RampSvg3",
  "RampSvg4", "RampSvg5", "RampSvg6", "RampSvg7",
  "RampSvg8", "RampSvg9", "RampSvg10", "RampSvg11"
];

function getViewportSize() {
  const viewport = window.visualViewport;
  const viewportWidth =
    viewport && Number.isFinite(viewport.width) && viewport.width > 0
      ? viewport.width
      : window.innerWidth;
  const viewportHeight =
    viewport && Number.isFinite(viewport.height) && viewport.height > 0
      ? viewport.height
      : (
        typeof windowHeight === "number" && Number.isFinite(windowHeight) && windowHeight > 0
          ? windowHeight
          : window.innerHeight
      );

  return {
    width: max(1, round(viewportWidth || COVER_WIDTH)),
    height: max(1, round(viewportHeight || COVER_HEIGHT)),
  };
}

function isTouchDevice() {
  return Boolean(
    window.matchMedia?.("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

function getActivePointer() {
  if (Array.isArray(touches) && touches.length > 0) {
    const touchPoint = touches[0];
    if (
      Number.isFinite(touchPoint.x) &&
      Number.isFinite(touchPoint.y) &&
      touchPoint.x >= 0 &&
      touchPoint.x <= width &&
      touchPoint.y >= 0 &&
      touchPoint.y <= height
    ) {
      return {
        x: touchPoint.x,
        y: touchPoint.y,
        isPressed: true,
      };
    }
  }

  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    return {
      x: mouseX,
      y: mouseY,
      isPressed: mouseIsPressed,
    };
  }

  return null;
}

function queueMobileTextReveal() {
  if (!isTouchDevice() || isTextRevealed || mobileRevealTimeoutId !== null) {
    return;
  }

  mobileRevealTimeoutId = window.setTimeout(() => {
    mobileRevealTimeoutId = null;
    revealText();
  }, MOBILE_TEXT_REVEAL_DELAY_MS);
}

function getInteractiveTextScale() {
  return isTouchDevice() ? MOBILE_INTERACTIVE_TEXT_SCALE : 1;
}

function getCoverCanvasSize() {
  const viewport = getViewportSize();
  const scale = min(viewport.width / COVER_WIDTH, viewport.height / COVER_HEIGHT);
  return {
    width: max(1, round(COVER_WIDTH * scale)),
    height: max(1, round(COVER_HEIGHT * scale)),
  };
}

function setElementPixelSize(element, size) {
  if (!element) {
    return;
  }

  element.style.width = `${size.width}px`;
  element.style.height = `${size.height}px`;
}

function isPointerInsideCanvas() {
  return getActivePointer() !== null;
}

function syncStageSize() {
  const canvasSize = getCoverCanvasSize();
  const stage = document.getElementById("stage");

  setElementPixelSize(stage, canvasSize);
  setElementPixelSize(document.getElementById("coverOverlay"), canvasSize);
  setElementPixelSize(document.getElementById("text1Overlay"), canvasSize);
  setElementPixelSize(document.getElementById("text2Overlay"), canvasSize);

  return canvasSize;
}

function configureStageLayers(canvas) {
  canvas.style("position", "relative");
  canvas.style("z-index", "1");

  const coverOverlay = document.getElementById("coverOverlay");
  if (coverOverlay) {
    coverOverlay.style.zIndex = "3";
  }
}

function getTextOverlaySvgMarkup(fileName) {
  const inlineSvgs = window.TEXT_OVERLAY_SVGS;

  if (inlineSvgs && typeof inlineSvgs[fileName] === "string") {
    return inlineSvgs[fileName];
  }

  return null;
}

function ensureTextOverlayContainer(stage, containerId) {
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "absolute";
    container.style.inset = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.pointerEvents = "none";
    container.style.zIndex = "4";
    stage.appendChild(container);
  }

  container.replaceChildren();
  overlayRevealTargetCache.delete(container);
  return container;
}

function parseInlineSvgMarkup(svgText, fileName) {
  if (typeof svgText !== "string" || svgText.trim() === "") {
    return null;
  }

  const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const parserError = parsed.querySelector("parsererror");
  if (parserError) {
    console.error(`Failed to parse ${fileName} as SVG.`);
    return null;
  }

  const svgElement = parsed.documentElement;
  if (!svgElement || svgElement.tagName.toLowerCase() !== "svg") {
    console.error(`${fileName} did not produce a valid SVG root element.`);
    return null;
  }

  return document.importNode(svgElement, true);
}

function getOverlayRevealTargets(container) {
  const cachedTargets = overlayRevealTargetCache.get(container);
  if (cachedTargets) {
    return cachedTargets;
  }

  const groups = Array.from(container.querySelectorAll("g"));
  if (groups.length > 0) {
    const revealTargets = groups.reverse();
    overlayRevealTargetCache.set(container, revealTargets);
    return revealTargets;
  }

  const svgElement = container.querySelector("svg");
  const revealTargets = svgElement ? [svgElement] : [];
  overlayRevealTargetCache.set(container, revealTargets);
  return revealTargets;
}

function setRevealTargetState(target, isVisible) {
  target.style.opacity = isVisible ? "1" : "0";
  target.style.transition = "opacity 1s ease-in-out";

  const paths = target.querySelectorAll("path");
  paths.forEach((path) => {
    path.style.opacity = isVisible ? "1" : "0";
    path.style.transition = "opacity 1s ease-in-out, fill 1s ease-in-out";
    path.style.fill = isVisible ? BODY_COLOR : "transparent";
    path.removeAttribute("opacity");
  });
}

async function loadTextOverlayMarkup(fileName) {
  const inlineMarkup = getTextOverlaySvgMarkup(fileName);
  if (inlineMarkup) {
    return inlineMarkup;
  }

  const response = await fetch(`assets/${fileName}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading assets/${fileName}`);
  }

  return response.text();
}

function clearTextRevealTimeouts() {
  for (let i = 0; i < textRevealTimeoutIds.length; i += 1) {
    clearTimeout(textRevealTimeoutIds[i]);
  }

  textRevealTimeoutIds = [];
}

function loadAndSetupSVGs() {
  if (textOverlayLoadPromise) {
    return textOverlayLoadPromise;
  }

  textOverlayLoadPromise = (async () => {
    const stage = document.getElementById("stage");
    if (!stage) return;
    const canvasSize = syncStageSize();

    for (let i = 0; i < TEXT_OVERLAY_FILES.length; i++) {
      const fileName = TEXT_OVERLAY_FILES[i];
      const containerId = `text${i + 1}Overlay`;
      const container = ensureTextOverlayContainer(stage, containerId);

      try {
        const svgText = await loadTextOverlayMarkup(fileName);
        const svgElement = parseInlineSvgMarkup(svgText, fileName);
        if (!svgElement) {
          continue;
        }

        container.appendChild(svgElement);

        svgElement.style.width = "100%";
        svgElement.style.height = "100%";
        svgElement.style.display = "block";
        svgElement.style.position = "absolute";
        svgElement.style.inset = "0";
        svgElement.style.pointerEvents = "none";

        const revealTargets = getOverlayRevealTargets(container);
        revealTargets.forEach((target) => {
          setRevealTargetState(target, isTextRevealed);
        });

        if (revealTargets.length > 0) {
          void svgElement.offsetWidth;
        }

        setElementPixelSize(container, canvasSize);
      } catch (error) {
        console.error(`Failed to load ${fileName}:`, error);
      }
    }
  })();

  return textOverlayLoadPromise;
}

function getRampScale() {
  return constrain(min(width, height) / 3600, 0.16, 0.24) * RAMP_GLOBAL_SCALE;
}

function getRampCenter(index) {
  const ratio = RAMP_CENTER_RATIOS[index] ?? RAMP_CENTER_RATIOS[0];
  return {
    x: width * ratio.x,
    y: height * ratio.y,
  };
}

function syncRampOverlays() {
  if (rampOverlays.length === 0) {
    return;
  }

  const scale = getRampScale();
  for (let i = 0; i < rampOverlays.length; i += 1) {
    const center = getRampCenter(i);
    rampOverlays[i].updateLayout({
      scale,
      centerX: center.x,
      centerY: center.y,
    });
  }
}

function getRampBlendColorAt(x, y) {
  for (let i = 0; i < rampOverlays.length; i += 1) {
    const rampOverlay = rampOverlays[i];

    if (!rampOverlay || typeof rampOverlay.sampleColorAtCanvasPoint !== "function") {
      continue;
    }

    const sampledColor = rampOverlay.sampleColorAtCanvasPoint(x, y);
    if (sampledColor) {
      return sampledColor;
    }
  }

  return null;
}

function setup() {
  const canvasSize = syncStageSize();
  pixelDensity(min(window.devicePixelRatio || 1, 2));
  const canvas = createCanvas(canvasSize.width, canvasSize.height);
  canvas.parent("stage");
  configureStageLayers(canvas);
  loadAndSetupSVGs();
  queueMobileTextReveal();
  frameRate(60);

  if (window.visualViewport && !hasBoundVisualViewportResize) {
    window.visualViewport.addEventListener("resize", windowResized);
    hasBoundVisualViewportResize = true;
  }

  fishSchool = new FishSchool(14); // 鱼的数量越多，画面会越密集。

  const availableRamps = ALL_RAMP_CLASS_NAMES.filter((name) => typeof window[name] === "function");
  const selectedRamps = [];

  for (let i = 0; i < 4; i += 1) {
    if (availableRamps.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableRamps.length);
      selectedRamps.push(availableRamps[randomIndex]);
      availableRamps.splice(randomIndex, 1); // 移除已选中的ramp，确保不重复
    }
  }

  rampOverlays = selectedRamps
    .map((className) => window[className])
    .map((RampClass) => new RampClass({
      scale: getRampScale(),
    }));

  if (rampOverlays.length > 0) {
    syncRampOverlays();
  }
}

function draw() {
  background(BG_COLOR);

  if (!fishSchool) {
    return;
  }

  const pointerInsideCanvas = isPointerInsideCanvas();
  if (pointerInsideCanvas) {
    hoverTimer += deltaTime;
  } else {
    hoverTimer = 0;
  }

  if (hoverTimer > 5000 && !isTextRevealed) {
    revealText();
  }

  const deltaSeconds = deltaTime / 1000;
  for (let i = 0; i < rampOverlays.length; i += 1) {
    rampOverlays[i].advance(deltaSeconds);
  }

  fishSchool.update();
  fishSchool.display("back");

  for (let i = 0; i < rampOverlays.length; i += 1) {
    rampOverlays[i].display(drawingContext);
  }

  fishSchool.display("front");
}

function windowResized() {
  const canvasSize = syncStageSize();
  if (typeof resizeCanvas === "function") {
    resizeCanvas(canvasSize.width, canvasSize.height);
  }
  syncRampOverlays();
  queueMobileTextReveal();
  if (fishSchool && typeof fishSchool.handleResize === "function") {
    fishSchool.handleResize();
  }
}

function revealText() {
  if (isTextRevealed) {
    return;
  }

  isTextRevealed = true;
  if (mobileRevealTimeoutId !== null) {
    clearTimeout(mobileRevealTimeoutId);
    mobileRevealTimeoutId = null;
  }
  clearTextRevealTimeouts();

  for (let i = 0; i < TEXT_OVERLAY_FILES.length; i++) {
    const containerId = `text${i + 1}Overlay`;
    const container = document.getElementById(containerId);
    
    if (container) {
      const revealTargets = getOverlayRevealTargets(container);

      revealTargets.forEach((target, index) => {
        const timeoutId = window.setTimeout(() => {
          setRevealTargetState(target, true);
        }, index * TEXT_REVEAL_STEP_MS);
        textRevealTimeoutIds.push(timeoutId);
      });
    }
  }
}

function touchStarted() {
  revealText();
  return false;
}

function touchMoved() {
  return false;
}

class FishSchool {
  constructor(count) {
    this.fishes = [];
    this.lexicon = [
      "echo",
      "follow",
      "obey",
      "they say",
      "most agree",
      "stay in line",
      "everyone knows",
    ];

    for (let i = 0; i < count; i += 1) {
      this.fishes.push(this.createFish(i, count));
    }
  }

  createFish(index, count) {
    const center = createVector(width * 0.5, height * 0.5);
    const spawnRadius = min(width, height) * 0.15; // 初始生成半径越大，鱼群开场越分散。
    const angle = (TWO_PI * index) / max(count, 1) + random(-0.25, 0.25);
    const offset = p5.Vector.fromAngle(angle).mult(random(spawnRadius * 0.25, spawnRadius));
    const textValue = this.lexicon[index % this.lexicon.length];
    return new SwimmingFishView(center.x + offset.x, center.y + offset.y, textValue, this.sampleRole());
  }

  update() {
    const activePointer = getActivePointer();
    const attractor = activePointer ? createVector(activePointer.x, activePointer.y) : null;
    const attractorStrength = activePointer?.isPressed ? 0.95 : 0.62; // 数值越大，鱼群追随鼠标的动作越明显。
    const snapshot = this.fishes.map((fish) => ({
      fish,
      position: fish.position.copy(),
      velocity: fish.velocity.copy()
    }));
    const schoolFrame = this.computeSchoolFrame(snapshot, attractor);

    for (const fish of this.fishes) {
      fish.update(snapshot, attractor, attractorStrength, schoolFrame);
    }
  }

  display(layerName = "front") {
    for (const fish of this.fishes) {
      fish.display(layerName);
    }
  }

  handleResize() {
    for (const fish of this.fishes) {
      fish.position.x = constrain(fish.position.x, 0, width);
      fish.position.y = constrain(fish.position.y, 0, height);
      fish.syncFontSizeToQuadrant();
      fish.headTrail = [fish.position.copy()];
      fish.backbone = fish.createBackbone();
    }
  }

  sampleRole() {
    const draw = random();

    if (draw < 0.08) {
      return "frontEdge";
    }

    if (draw < 0.42) {
      return "frontCentre";
    }

    if (draw < 0.84) {
      return "backCentre";
    }

    return "backEdge";
  }

  computeSchoolFrame(snapshot, attractor) {
    const center = createVector(0, 0);
    const averageVelocity = createVector(0, 0);

    for (const item of snapshot) {
      center.add(item.position);
      averageVelocity.add(item.velocity);
    }

    center.div(max(snapshot.length, 1));

    if (averageVelocity.magSq() > 0.0001) {
      averageVelocity.normalize();
    } else {
      averageVelocity.set(1, 0);
    }

    if (attractor) {
      const targetBias = p5.Vector.sub(attractor, center);
      if (targetBias.magSq() > 0.0001) {
        targetBias.normalize();
        averageVelocity.lerp(targetBias, 0.28);
        averageVelocity.normalize();
      }
    }

    const forward = averageVelocity.copy();
    const side = createVector(-forward.y, forward.x);

    let minS = Infinity;
    let maxS = -Infinity;
    let minQ = Infinity;
    let maxQ = -Infinity;

    for (const item of snapshot) {
      const relative = p5.Vector.sub(item.position, center);
      const s = relative.dot(forward);
      const q = relative.dot(side);
      minS = min(minS, s);
      maxS = max(maxS, s);
      minQ = min(minQ, q);
      maxQ = max(maxQ, q);
    }

    const halfLength = max((maxS - minS) * 0.5, min(width, height) * 0.09); // 影响鱼群整体在前后方向上的拉伸感。
    const halfWidth = max((maxQ - minQ) * 0.5, min(width, height) * 0.045); // 影响鱼群整体在左右方向上的松散或紧凑程度。

    return {
      center,
      forward,
      side,
      halfLength,
      halfWidth
    };
  }
}

class SwimmingFishView {
  constructor(x, y, textValue, role) {
    const interactiveTextScale = getInteractiveTextScale();
    this.segmentCount = 84; // 分段越多，鱼身曲线越平滑。
    this.maxAmplitude = random(20, 28); // 最大摆动幅度越大，身体左右扭动越明显。
    this.minAmplitude = 10; // 最小摆动幅度决定慢速时仍保留多少起伏。
    this.baseAmplitude = this.maxAmplitude * 0.85; // 基础摆动幅度决定默认状态下的波动感。
    this.waveCount = random(1.05, 1.35); // 波形数量影响身体沿长度方向有几段弯曲。
    this.maxWaveSpeed = 0.11; // 最大波动速度越高，游动节奏越活跃。
    this.minWaveSpeed = 0.05; // 最小波动速度决定慢速时的摆动柔和程度。
    this.waveSpeed = random(this.minWaveSpeed, this.maxWaveSpeed); // 当前波动速度直接影响身体起伏推进的快慢。
    this.baseFontSize = 16 * interactiveTextScale; // 基础字号决定进入不同象限前的原始体量。
    this.fontSize = this.baseFontSize; // 字号越大，鱼身整体视觉体量越大。
    this.characterSpacing = 4 * interactiveTextScale; // 字间距越大，文字鱼身看起来越松开。
    this.pathMargin = 18 * interactiveTextScale; // 路径留白影响头尾两端的空白比例。
    this.textValue = textValue;
    this.role = role;
    this.initiative = constrain(randomGaussian(0.5, 0.18), 0.08, 0.98); // 主动性越高，个体对鼠标的响应越积极。
    this.characterOffsets = [];
    this.textPathLength = 0;
    this.bodyLength = 0;
    this.segmentLength = 0;
    this.phase = random(TWO_PI);
    this.rampLayerPreference = random() < 0.5 ? "back" : "front";
    this.cachedDrawLayerFrame = -1;
    this.cachedDrawLayer = "front";
    this.backbone = [];
    this.updateTextMetrics();

    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D().mult(random(1.8, 3.2));
    this.acceleration = createVector(0, 0);
    this.maxSpeed = random(2.8, 4.6); // 最大速度越高，鱼群看起来越轻快。
    this.maxForce = random(0.045, 0.085); // 最大转向力越大，转弯动作越利落。
    this.motionEase = 0.08; // 过渡缓动越大，摆动和速度变化越柔和。
    this.heading = this.velocity.heading();
    this.headTrail = [this.position.copy()];
    this.maxTrailPoints = 320; // 轨迹点越多，身体路径越长且更顺滑。
    this.mouseSlowRadius = 260; // 减速半径越大，靠近鼠标时减速越提前。

    this.perceptionRadius = random(150, 190); // 感知范围越大，鱼群彼此动作越容易同步。
    this.separationRadius = max(this.bodyLength * 0.5, this.fontSize * 5); // 分离半径越大，鱼和鱼之间留白越明显。
    this.edgeMargin = 120; // 边缘留白越大，鱼群越不会贴近画布边界。
    this.attentionAngle = this.heading;
    this.attentionSigma = 0.9; // 注意力扩散范围影响鱼更聚焦前方还是更关注周围。
    this.wanderPhase = random(1000);
    this.slotForwardBias = this.sampleForwardBias();
    this.slotSideBias = this.sampleSideBias();
    this.slotTightness = this.sampleSlotTightness();

    this.separationWeight = 1.45; // 分离权重越大，鱼群越疏，重叠更少。
    this.alignmentWeight = 0.72; // 对齐权重越大，鱼群朝向越统一。
    this.cohesionWeight = 0.5; // 凝聚权重越大，鱼群越容易收拢成团。
    this.wanderWeight = 0.14; // 游走权重越大，随机漂移感越强。
    this.edgeWeight = 1.15; // 边缘回避权重越大，贴边时回弹越明显。
    this.slotWeight = this.role.includes("Edge") ? 1.18 : 1.05; // 队形权重越大，鱼越会维持自己在群体中的位置。
    this.currentQuadrant = this.getQuadrantForPosition(this.position); // 用画布中心划分四象限，记录鱼当前所在区域。
    this.syncFontSizeToQuadrant();
  }

  updateTextMetrics() {
    push();
    textSize(this.fontSize);

    let cursor = 0;
    this.characterOffsets = [];

    for (let i = 0; i < this.textValue.length; i += 1) {
      const glyphWidth = textWidth(this.textValue[i]);
      this.characterOffsets.push(cursor + glyphWidth * 0.5);
      cursor += glyphWidth;

      if (i < this.textValue.length - 1) {
        cursor += this.characterSpacing;
      }
    }

    pop();

    this.textPathLength = max(cursor, 1);
    this.bodyLength = this.textPathLength + this.pathMargin * 2;
    this.segmentLength = this.bodyLength / (this.segmentCount - 1);
  }

  sampleForwardBias() {
    if (this.role === "frontEdge") {
      return random(0.34, 0.48);
    }

    if (this.role === "frontCentre") {
      return random(0.08, 0.24);
    }

    if (this.role === "backCentre") {
      return random(-0.22, -0.06);
    }

    return random(-0.5, -0.34);
  }

  sampleSideBias() {
    if (this.role === "frontCentre" || this.role === "backCentre") {
      return randomGaussian(0, 0.12);
    }

    return randomGaussian(0, 0.24);
  }

  sampleSlotTightness() {
    if (this.role === "frontEdge" || this.role === "backEdge") {
      return {
        longitudinal: random(0.7, 0.95),
        lateral: random(0.5, 0.8)
      };
    }

    return {
      longitudinal: random(0.42, 0.65),
      lateral: random(0.3, 0.55)
    };
  }

  getRoleMouseFactor() {
    if (this.role === "frontEdge") {
      return 1.18;
    }

    if (this.role === "frontCentre") {
      return 1.05;
    }

    if (this.role === "backCentre") {
      return 0.84;
    }

    return 0.7;
  }

  update(snapshot, attractor, attractorStrength, schoolFrame) {
    const neighbors = this.getNeighbors(snapshot);

    this.updateAttention(neighbors);

    const separation = this.computeSeparation(neighbors).mult(this.separationWeight);
    const alignment = this.computeAlignment(neighbors).mult(this.alignmentWeight);
    const cohesion = this.computeCohesion(neighbors).mult(this.cohesionWeight);
    const wander = this.computeWander().mult(this.wanderWeight);
    const edgeForce = this.computeEdgeForce().mult(this.edgeWeight);
    const slotForce = this.computeSlotForce(schoolFrame).mult(this.slotWeight);

    this.applyForce(separation);
    this.applyForce(alignment);
    this.applyForce(cohesion);
    this.applyForce(wander);
    this.applyForce(edgeForce);
    this.applyForce(slotForce);

    if (attractor) {
      const mouseWeight =
        attractorStrength * this.getRoleMouseFactor() * (0.7 + this.initiative * 0.95);
      this.applyForce(this.arrive(attractor, this.mouseSlowRadius).mult(mouseWeight));
    }

    const steeringLoad = this.acceleration.mag();
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
    this.updateQuadrantState();

    this.wrapAngleAndHeading();
    this.updateSwimmingMotion(steeringLoad);
    this.updateHeadTrail();
    this.backbone = this.createBackbone();
  }

  getQuadrantForPosition(position) {
    const isLeft = position.x < width * 0.5;
    const isTop = position.y < height * 0.5;

    if (isTop && isLeft) {
      return "topLeft";
    }

    if (isTop && !isLeft) {
      return "topRight";
    }

    if (!isTop && isLeft) {
      return "bottomLeft";
    }

    return "bottomRight";
  }

  updateQuadrantState() {
    const nextQuadrant = this.getQuadrantForPosition(this.position);

    if (nextQuadrant === this.currentQuadrant) {
      return;
    }

    this.currentQuadrant = nextQuadrant;
    this.syncFontSizeToQuadrant();
  }

  syncFontSizeToQuadrant() {
    const quadrant = this.getQuadrantForPosition(this.position);
    this.currentQuadrant = quadrant;
  }

  getNeighbors(snapshot) {
    const neighbors = [];

    for (const other of snapshot) {
      if (other.fish === this) {
        continue;
      }

      const offset = p5.Vector.sub(other.position, this.position);
      const distance = offset.mag();

      if (distance === 0 || distance > this.perceptionRadius) {
        continue;
      }

      const bearing = offset.heading();
      const attentionWeight = this.getAttentionWeight(bearing);
      const distanceWeight = 1 - distance / this.perceptionRadius;

      neighbors.push({
        fish: other.fish,
        position: other.position,
        velocity: other.velocity,
        offset,
        distance,
        bearing,
        attentionWeight,
        distanceWeight
      });
    }

    return neighbors;
  }

  updateAttention(neighbors) {
    if (neighbors.length === 0) {
      this.attentionAngle = this.lerpAngle(
        this.attentionAngle,
        this.velocity.magSq() > 0.0001 ? this.velocity.heading() : this.heading,
        0.03
      );
      return;
    }

    const attentionVector = createVector(0, 0);

    for (const neighbor of neighbors) {
      const stimulus = 1 / (neighbor.distance * neighbor.distance + 1);
      attentionVector.add(p5.Vector.fromAngle(neighbor.bearing).mult(stimulus));
    }

    if (attentionVector.magSq() > 0.0001) {
      this.attentionAngle = this.lerpAngle(this.attentionAngle, attentionVector.heading(), 0.12);
    }
  }

  getAttentionWeight(bearing) {
    const angleDelta = this.angleDelta(bearing, this.attentionAngle);
    return exp(-(angleDelta * angleDelta) / (2 * this.attentionSigma * this.attentionSigma));
  }

  computeSeparation(neighbors) {
    const steering = createVector(0, 0);
    let totalWeight = 0;

    for (const neighbor of neighbors) {
      if (neighbor.distance >= this.separationRadius) {
        continue;
      }

      const weight = (0.45 + neighbor.attentionWeight * 0.55) / max(neighbor.distance, 1);
      const away = neighbor.offset.copy().mult(-1);
      away.normalize();
      away.mult(weight);
      steering.add(away);
      totalWeight += weight;
    }

    return this.finalizeSteering(steering, totalWeight, this.maxForce * 1.35);
  }

  computeAlignment(neighbors) {
    const steering = createVector(0, 0);
    let totalWeight = 0;

    for (const neighbor of neighbors) {
      const weight = neighbor.distanceWeight * neighbor.attentionWeight;
      steering.add(neighbor.velocity.copy().normalize().mult(weight));
      totalWeight += weight;
    }

    return this.finalizeSteering(steering, totalWeight, this.maxForce);
  }

  computeCohesion(neighbors) {
    const center = createVector(0, 0);
    let totalWeight = 0;

    for (const neighbor of neighbors) {
      const weight = neighbor.distanceWeight * neighbor.attentionWeight;
      center.add(neighbor.position.copy().mult(weight));
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return createVector(0, 0);
    }

    center.div(totalWeight);
    return this.seek(center, 0.75);
  }

  computeWander() {
    this.wanderPhase += 0.01;
    const headingBase = this.velocity.magSq() > 0.0001 ? this.velocity.heading() : this.heading;
    const noiseTurn = map(noise(this.wanderPhase), 0, 1, -0.75, 0.75); // 随机转向范围越大，游动轨迹越蜿蜒。
    const target = p5.Vector.fromAngle(headingBase + noiseTurn).mult(this.maxSpeed);
    target.sub(this.velocity);
    target.limit(this.maxForce * 0.75);
    return target;
  }

  computeEdgeForce() {
    const desired = createVector(0, 0);

    if (this.position.x < this.edgeMargin) {
      desired.x = map(this.position.x, 0, this.edgeMargin, this.maxSpeed, 0);
    } else if (this.position.x > width - this.edgeMargin) {
      desired.x = -map(this.position.x, width - this.edgeMargin, width, 0, this.maxSpeed);
    }

    if (this.position.y < this.edgeMargin) {
      desired.y = map(this.position.y, 0, this.edgeMargin, this.maxSpeed, 0);
    } else if (this.position.y > height - this.edgeMargin) {
      desired.y = -map(this.position.y, height - this.edgeMargin, height, 0, this.maxSpeed);
    }

    if (desired.magSq() === 0) {
      return createVector(0, 0);
    }

    desired.sub(this.velocity);
    desired.limit(this.maxForce * 1.4);
    return desired;
  }

  computeSlotForce(schoolFrame) {
    const relative = p5.Vector.sub(this.position, schoolFrame.center);
    const s = relative.dot(schoolFrame.forward);
    const q = relative.dot(schoolFrame.side);

    const targetS = schoolFrame.halfLength * this.slotForwardBias;
    const targetQ = schoolFrame.halfWidth * this.slotSideBias;

    const longitudinalScale = max(schoolFrame.halfLength * this.slotTightness.longitudinal, 1);
    const lateralScale = max(schoolFrame.halfWidth * this.slotTightness.lateral, 1);

    const slotForce = createVector(0, 0);
    slotForce.add(
      schoolFrame.forward
        .copy()
        .mult((targetS - s) / longitudinalScale)
    );
    slotForce.add(
      schoolFrame.side
        .copy()
        .mult((targetQ - q) / lateralScale)
    );

    slotForce.limit(this.maxForce * 1.45);
    return slotForce;
  }

  finalizeSteering(steering, totalWeight, maxLimit) {
    if (totalWeight === 0 || steering.magSq() === 0) {
      return createVector(0, 0);
    }

    steering.div(totalWeight);
    steering.setMag(this.maxSpeed);
    steering.sub(this.velocity);
    steering.limit(maxLimit);
    return steering;
  }

  seek(target, desiredFactor = 1) {
    const force = p5.Vector.sub(target, this.position);

    if (force.magSq() === 0) {
      return createVector(0, 0);
    }

    force.setMag(this.maxSpeed * desiredFactor);
    force.sub(this.velocity);
    force.limit(this.maxForce);
    return force;
  }

  arrive(target, slowRadius) {
    const force = p5.Vector.sub(target, this.position);
    const distance = force.mag();

    if (distance === 0) {
      return createVector(0, 0);
    }

    let desiredSpeed = this.maxSpeed;
    if (distance < slowRadius) {
      desiredSpeed = map(distance, 0, slowRadius, 0, this.maxSpeed);
    }

    force.setMag(desiredSpeed);
    force.sub(this.velocity);
    force.limit(this.maxForce * 1.75);
    return force;
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  wrapAngleAndHeading() {
    if (this.velocity.magSq() > 0.01) {
      this.heading = this.velocity.heading();
    }
  }

  updateSwimmingMotion(steeringLoad) {
    const speedFactor = constrain(this.velocity.mag() / this.maxSpeed, 0, 1);
    const turnFactor = constrain(steeringLoad / (this.maxForce * 4), 0, 1);
    const motionBlend = constrain(speedFactor * 0.75 + turnFactor * 0.45, 0, 1);
    const targetAmplitude = lerp(this.minAmplitude, this.maxAmplitude, motionBlend);
    const targetWaveSpeed = lerp(this.minWaveSpeed, this.maxWaveSpeed, speedFactor);

    this.baseAmplitude = lerp(this.baseAmplitude, targetAmplitude, this.motionEase);
    this.waveSpeed = lerp(this.waveSpeed, targetWaveSpeed, this.motionEase);
    this.phase += this.waveSpeed + this.velocity.mag() * 0.02;
  }

  angleDelta(a, b) {
    return atan2(sin(a - b), cos(a - b));
  }

  lerpAngle(start, end, amount) {
    return start + this.angleDelta(end, start) * amount;
  }

  display(layerName = "front") {
    this.drawTextPath(this.backbone, layerName);
  }

  createBackbone() {
    const points = [];

    for (let i = 0; i < this.segmentCount; i += 1) {
      const s = i / (this.segmentCount - 1);
      const trailSample = this.getTrailPointAtDistance(i * this.segmentLength);

      const amplitudeEnvelope =
        0.04 + 0.22 * s + 0.82 * s * s + 0.12 * s * s * s; // 让摆动从头到尾逐渐增强，形成更自然的尾部发力感。

      const primaryWave =
        sin(TWO_PI * this.waveCount * s - this.phase) *
        this.baseAmplitude *
        amplitudeEnvelope;

      const recoilWave =
        sin(TWO_PI * (this.waveCount * 2.1) * s - this.phase * 1.8 + 0.35) *
        this.baseAmplitude *
        0.1 *
        pow(s, 1.85);

      const tailAccent =
        sin(TWO_PI * (this.waveCount * 3.35) * s - this.phase * 2.55) *
        3.5 *
        pow(s, 2.7); // 给尾尖额外的小幅抖动，让尾巴更有弹性。

      const lateralOffset = primaryWave + recoilWave + tailAccent;
      const normal = createVector(
        -sin(trailSample.angle),
        cos(trailSample.angle)
      );

      points.push(
        p5.Vector.add(trailSample.position, normal.mult(lateralOffset))
      );
    }

    return points;
  }

  updateHeadTrail() {
    const current = this.position.copy();

    if (this.headTrail.length === 0) {
      this.headTrail.push(current);
      return;
    }

    if (p5.Vector.dist(current, this.headTrail[0]) > 0.75) {
      this.headTrail.unshift(current);
    } else {
      this.headTrail[0] = current;
    }

    if (this.headTrail.length > this.maxTrailPoints) {
      this.headTrail.pop();
    }
  }

  getTrailPointAtDistance(targetDistance) {
    if (this.headTrail.length === 0) {
      return {
        position: this.position.copy(),
        angle: this.getFallbackBackAngle(),
      };
    }

    let accumulated = 0;

    for (let i = 0; i < this.headTrail.length - 1; i += 1) {
      const start = this.headTrail[i];
      const end = this.headTrail[i + 1];
      const segmentLength = p5.Vector.dist(start, end);

      if (accumulated + segmentLength >= targetDistance) {
        const localT =
          (targetDistance - accumulated) / max(segmentLength, 0.0001);
        const position = p5.Vector.lerp(start, end, localT);
        const angle = atan2(end.y - start.y, end.x - start.x);
        return { position, angle };
      }

      accumulated += segmentLength;
    }

    const tail = this.headTrail[this.headTrail.length - 1].copy();
    const angle = this.getTailExtensionAngle();
    const extension = targetDistance - accumulated;
    const offset = p5.Vector.fromAngle(angle).mult(extension);

    return {
      position: tail.add(offset),
      angle,
    };
  }

  getTailExtensionAngle() {
    if (this.headTrail.length >= 2) {
      const beforeTail = this.headTrail[this.headTrail.length - 2];
      const tail = this.headTrail[this.headTrail.length - 1];
      const delta = p5.Vector.sub(tail, beforeTail);

      if (delta.magSq() > 0.0001) {
        return delta.heading();
      }
    }

    return this.getFallbackBackAngle();
  }

  getFallbackBackAngle() {
    if (this.velocity.magSq() > 0.0001) {
      return this.velocity.heading() + PI;
    }

    return this.heading + PI;
  }

  drawTextPath(points, layerName = "front") {
    noStroke();
    fill(BODY_COLOR);
    textAlign(CENTER, CENTER);
    const pieces = this.getRefractionPieces(this.position);
    const drawLayer = this.resolveDrawLayer(points, pieces);

    if (drawLayer !== layerName) {
      return;
    }

    for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex += 1) {
      this.drawRefractedLayer(points, pieces[pieceIndex]);
    }
  }

  drawRefractedLayer(points, piece) {
    const anchorDistance = this.pathMargin + this.textPathLength * 0.5;

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(piece.clipX, piece.clipY, piece.clipWidth, piece.clipHeight);
    drawingContext.clip();

    for (let i = 0; i < this.textValue.length; i += 1) {
      const baseDistance = this.pathMargin + this.characterOffsets[i];
      const scaledDistance =
        anchorDistance + (baseDistance - anchorDistance) * piece.scale;
      const pointData = this.getPointAtLength(points, scaledDistance);
      const drawX = pointData.position.x + piece.offsetX;
      const drawY = pointData.position.y + piece.offsetY;

      push();
      translate(drawX, drawY);
      rotate(pointData.angle - HALF_PI);
      textSize(this.baseFontSize * piece.scale);
      text(this.textValue[i], 0, 0);
      pop();
    }

    drawingContext.restore();
  }

  resolveDrawLayer(points, pieces) {
    if (this.cachedDrawLayerFrame === frameCount) {
      return this.cachedDrawLayer;
    }

    let intersectsRamp = false;
    const anchorDistance = this.pathMargin + this.textPathLength * 0.5;

    for (let pieceIndex = 0; pieceIndex < pieces.length && !intersectsRamp; pieceIndex += 1) {
      const piece = pieces[pieceIndex];

      for (let i = 0; i < this.textValue.length; i += 1) {
        const baseDistance = this.pathMargin + this.characterOffsets[i];
        const scaledDistance =
          anchorDistance + (baseDistance - anchorDistance) * piece.scale;
        const pointData = this.getPointAtLength(points, scaledDistance);
        const drawX = pointData.position.x + piece.offsetX;
        const drawY = pointData.position.y + piece.offsetY;

        if (getRampBlendColorAt(drawX, drawY)) {
          intersectsRamp = true;
          break;
        }
      }
    }

    this.cachedDrawLayerFrame = frameCount;
    this.cachedDrawLayer = intersectsRamp ? this.rampLayerPreference : "front";
    return this.cachedDrawLayer;
  }

  getRefractionPieces(position) {
    const centerX = width * 0.5;
    const centerY = height * 0.5;

    return [
      this.createRefractionPiece("topLeft", 0, 0, centerX, centerY, position, centerX, centerY),
      this.createRefractionPiece(
        "topRight",
        centerX,
        0,
        width - centerX,
        centerY,
        position,
        centerX,
        centerY
      ),
      this.createRefractionPiece(
        "bottomLeft",
        0,
        centerY,
        centerX,
        height - centerY,
        position,
        centerX,
        centerY
      ),
      this.createRefractionPiece(
        "bottomRight",
        centerX,
        centerY,
        width - centerX,
        height - centerY,
        position,
        centerX,
        centerY
      ),
    ];
  }

  createRefractionPiece(quadrant, clipX, clipY, clipWidth, clipHeight, position, centerX, centerY) {
    const scale = QUADRANT_FONT_SCALES[quadrant] ?? 1;
    const directionX = quadrant.includes("Left") ? -1 : 1;
    const directionY = quadrant.includes("top") ? -1 : 1;
    const offsetStrength = (scale - 1) * REFRACTION_OFFSET;
    const axisInfluenceX = this.getAxisInfluence(position.x - centerX, this.baseFontSize * 1.8);
    const axisInfluenceY = this.getAxisInfluence(position.y - centerY, this.baseFontSize * 1.8);
    const quadrantShift = this.getQuadrantShift(quadrant);

    return {
      clipX,
      clipY,
      clipWidth,
      clipHeight,
      scale,
      offsetX: quadrantShift.x + directionX * offsetStrength * axisInfluenceX,
      offsetY: quadrantShift.y + directionY * offsetStrength * axisInfluenceY,
    };
  }

  getAxisInfluence(distanceToAxis, influenceRadius) {
    return constrain(1 - abs(distanceToAxis) / max(influenceRadius, 1), 0, 1);
  }

  getQuadrantShift(quadrant) {
    const x = quadrant.includes("top") ? -QUADRANT_SHIFT_X : QUADRANT_SHIFT_X;
    const y = quadrant.includes("Left") ? -QUADRANT_SHIFT_Y : QUADRANT_SHIFT_Y;
    return createVector(x, y);
  }

  getPointAtLength(points, targetLength) {
    if (!Array.isArray(points) || points.length === 0) {
      return {
        position: this.position.copy(),
        angle: this.heading,
      };
    }

    if (points.length === 1) {
      return {
        position: points[0].copy(),
        angle: this.heading,
      };
    }

    let accumulated = 0;

    for (let i = 1; i < points.length; i += 1) {
      const start = points[i - 1];
      const end = points[i];
      const segmentLength = p5.Vector.dist(start, end);

      if (accumulated + segmentLength >= targetLength) {
        const localT = (targetLength - accumulated) / max(segmentLength, 0.0001);
        const position = p5.Vector.lerp(start, end, localT);
        const angle = atan2(end.y - start.y, end.x - start.x);
        return { position, angle };
      }

      accumulated += segmentLength;
    }

    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    return {
      position: last.copy(),
      angle: atan2(last.y - prev.y, last.x - prev.x),
    };
  }
}