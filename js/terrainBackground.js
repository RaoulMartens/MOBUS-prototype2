const SURFACE = Object.freeze({
  GRASS: 'grass',
  DIRT: 'dirt'
});

const TERRAIN_ASSETS = Object.freeze({
  [SURFACE.GRASS]: [
    '/assets/terrain/grass-1.png',
    '/assets/terrain/grass-2.png',
    '/assets/terrain/grass-3.png'
  ],
  [SURFACE.DIRT]: [
    '/assets/terrain/dirt-1.png',
    '/assets/terrain/dirt-2.png',
    '/assets/terrain/dirt-3.png'
  ]
});

const DEFAULT_TILE_STATE = Object.freeze({ surface: SURFACE.GRASS, wetness: 0 });
const WET_GRASS_TINT = '#668c58';
const WET_DIRT_TINT = '#734b37';
const WET_HOLD_DURATION = 7000;
const WET_FADE_DURATION = 13000;
const WET_FADE_FRAME_INTERVAL = 120;
const ACTIVE_WET_RENDER_INTERVAL = 34;
const MAX_WET_SPOTS = 160;

function hash2D(x, y, seed) {
  let hash = Math.imul(x ^ seed, 0x45d9f3b) ^ Math.imul(y ^ (seed >>> 1), 0x27d4eb2d);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function hashString(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed) {
  let value = seed >>> 0;
  value += 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Terrain asset failed to load: ${source}`));
    image.src = source;
  });
}

export class TerrainBackground {
  constructor(host, options = {}) {
    this.host = host;
    this.canvas = host?.querySelector('#terrain-background') || null;
    this.context = this.canvas?.getContext('2d', { alpha: false }) || null;
    this.tileSize = options.tileSize || 160;
    this.seed = options.seed || 0x51f15e;
    this.tiles = new Map();
    this.dirtPatches = [];
    this.wetSpots = [];
    this.images = { [SURFACE.GRASS]: [], [SURFACE.DIRT]: [] };
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.wetPixelRatio = 0.75;
    this.patchCounter = 0;
    this.resizeFrame = null;
    this.renderFrame = null;
    this.renderTimer = null;
    this.lastRenderAt = 0;
    this.wetDryTimer = null;
    this.baseDirty = true;
    this.debug = new URLSearchParams(window.location.search).get('terrainDebug') === '1';

    if (!this.canvas || !this.context) {
      throw new Error('TerrainBackground requires #terrain-background inside its host.');
    }

    this.dirtBuffer = document.createElement('canvas');
    this.maskBuffer = document.createElement('canvas');
    this.hardMaskBuffer = document.createElement('canvas');
    this.inverseMaskBuffer = document.createElement('canvas');
    this.innerContourBuffer = document.createElement('canvas');
    this.erosionOuterBuffer = document.createElement('canvas');
    this.erosionInnerBuffer = document.createElement('canvas');
    this.baseBuffer = document.createElement('canvas');
    this.wetMaskBuffer = document.createElement('canvas');
    this.wetOverlayBuffer = document.createElement('canvas');
    this.variationBuffer = document.createElement('canvas');
    this.handleResize = () => this.scheduleResize();
    window.addEventListener('resize', this.handleResize, { passive: true });

    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.host);
    }

    this.resize();
    this.ready = this.loadAssets();
  }

  async loadAssets() {
    try {
      const [grass, dirt] = await Promise.all([
        Promise.all(TERRAIN_ASSETS[SURFACE.GRASS].map(loadImage)),
        Promise.all(TERRAIN_ASSETS[SURFACE.DIRT].map(loadImage))
      ]);
      this.images[SURFACE.GRASS] = grass;
      this.images[SURFACE.DIRT] = dirt;
      this.baseDirty = true;
      this.canvas.dataset.terrainReady = 'true';
      this.resize();
      if (this.debug && this.tiles.size === 0) {
        this.disturbAt(this.width * 0.5, this.height * 0.5, 'debug-preview');
      }
    } catch (error) {
      console.error(error);
      this.canvas.dataset.terrainError = error.message;
      this.renderFallback();
    }
  }

  scheduleResize() {
    if (this.resizeFrame !== null) return;
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = null;
      this.resize();
    });
  }

  scheduleRender() {
    if (this.renderFrame !== null || this.renderTimer !== null) return;
    const delay = Math.max(0, ACTIVE_WET_RENDER_INTERVAL - (performance.now() - this.lastRenderAt));
    if (delay > 1) {
      this.renderTimer = setTimeout(() => {
        this.renderTimer = null;
        this.scheduleRender();
      }, delay);
      return;
    }
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      this.lastRenderAt = performance.now();
      this.render();
    });
  }

  scheduleWetDrying() {
    if (this.wetDryTimer !== null) clearTimeout(this.wetDryTimer);
    this.wetDryTimer = null;
    if (!this.wetSpots.length) return;

    const now = performance.now();
    const nextFadeStart = Math.min(...this.wetSpots.map(spot => spot.lastWateredAt + WET_HOLD_DURATION));
    const delay = nextFadeStart > now
      ? Math.max(16, nextFadeStart - now)
      : WET_FADE_FRAME_INTERVAL;
    this.wetDryTimer = setTimeout(() => {
      this.wetDryTimer = null;
      this.scheduleRender();
    }, delay);
  }

  resize() {
    this.width = Math.max(1, this.host.clientWidth);
    this.height = Math.max(1, this.host.clientHeight);
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.wetPixelRatio = Math.min(this.pixelRatio, 0.75);

    const pixelWidth = Math.ceil(this.width * this.pixelRatio);
    const pixelHeight = Math.ceil(this.height * this.pixelRatio);
    [
      this.canvas,
      this.dirtBuffer,
      this.maskBuffer,
      this.hardMaskBuffer,
      this.inverseMaskBuffer,
      this.innerContourBuffer,
      this.erosionOuterBuffer,
      this.erosionInnerBuffer,
      this.baseBuffer
    ].forEach(canvas => {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    });
    const wetPixelWidth = Math.ceil(this.width * this.wetPixelRatio);
    const wetPixelHeight = Math.ceil(this.height * this.wetPixelRatio);
    [this.wetMaskBuffer, this.wetOverlayBuffer].forEach(canvas => {
      canvas.width = wetPixelWidth;
      canvas.height = wetPixelHeight;
    });
    const variationSize = Math.ceil(this.tileSize * 2.2 * this.pixelRatio);
    this.variationBuffer.width = variationSize;
    this.variationBuffer.height = variationSize;

    this.baseDirty = true;
    this.scheduleRender();
  }

  getTileState(column, row) {
    return this.tiles.get(`${column}:${row}`) || DEFAULT_TILE_STATE;
  }

  setTileState(column, row, nextState) {
    const current = this.getTileState(column, row);
    this.tiles.set(`${column}:${row}`, { ...current, ...nextState });
    this.baseDirty = true;
  }

  disturbAt(x, y, sourceId = this.patchCounter, footprint = {}) {
    const defaultRadii = [50, 50, 50, 50];
    this.dirtPatches.push({
      x,
      y,
      width: Number.isFinite(footprint.width) ? footprint.width : 190,
      height: Number.isFinite(footprint.height) ? footprint.height : 108,
      rotation: Number.isFinite(footprint.rotation) ? footprint.rotation : 0,
      horizontalRadii: this.normalizeRadii(footprint.horizontalRadii, defaultRadii),
      verticalRadii: this.normalizeRadii(footprint.verticalRadii, defaultRadii),
      seed: hashString(`${sourceId}:${this.patchCounter++}`)
    });
    this.baseDirty = true;
    this.scheduleRender();
  }

  normalizeRadii(radii, fallback) {
    if (!Array.isArray(radii) || radii.length !== 4 || radii.some(value => !Number.isFinite(value))) {
      return [...fallback];
    }
    return radii.map(value => Math.max(0, value));
  }

  wetAt(x, y, amount = 0.1) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(amount) || amount <= 0) {
      throw new TypeError('TerrainBackground.wetAt requires finite coordinates and a positive amount.');
    }
    const mergeDistance = 34;
    let closestSpot = null;
    let closestDistance = Infinity;
    this.wetSpots.forEach(spot => {
      const distance = Math.hypot(spot.x - x, spot.y - y);
      if (distance < mergeDistance && distance < closestDistance) {
        closestSpot = spot;
        closestDistance = distance;
      }
    });

    const now = performance.now();
    if (closestSpot) {
      const nextIntensity = Math.min(1, closestSpot.intensity + amount);
      const positionWeight = Math.min(0.28, amount / Math.max(0.01, nextIntensity));
      closestSpot.x += (x - closestSpot.x) * positionWeight;
      closestSpot.y += (y - closestSpot.y) * positionWeight;
      closestSpot.intensity = nextIntensity;
      closestSpot.radius = Math.min(92, closestSpot.radius + amount * 7);
      closestSpot.lastWateredAt = now;
    } else {
      const seed = hashString(`wet:${this.patchCounter++}:${Math.round(x)}:${Math.round(y)}`);
      this.wetSpots.push({
        x,
        y,
        intensity: Math.min(1, amount),
        radius: 72 + seededUnit(seed ^ 0x517cc1b7) * 10,
        lastWateredAt: now,
        seed
      });
    }
    if (this.wetSpots.length > MAX_WET_SPOTS) {
      this.wetSpots.sort((a, b) => b.lastWateredAt - a.lastWateredAt);
      this.wetSpots.length = MAX_WET_SPOTS;
    }
    this.scheduleRender();
    this.scheduleWetDrying();
  }

  reset() {
    this.tiles.clear();
    this.dirtPatches = [];
    this.wetSpots = [];
    if (this.wetDryTimer !== null) clearTimeout(this.wetDryTimer);
    this.wetDryTimer = null;
    this.patchCounter = 0;
    this.baseDirty = true;
    this.scheduleRender();
  }

  setDebug(enabled) {
    this.debug = Boolean(enabled);
    this.render();
  }

  renderFallback() {
    if (!this.context) return;
    const width = this.canvas.width || this.host.clientWidth || 1;
    const height = this.canvas.height || this.host.clientHeight || 1;
    this.context.fillStyle = '#b7b644';
    this.context.fillRect(0, 0, width, height);
  }

  render() {
    if (!this.images[SURFACE.GRASS].length || !this.width || !this.height) {
      this.renderFallback();
      return;
    }

    const now = performance.now();
    this.wetSpots = this.wetSpots.filter(spot => this.getWetFade(spot, now) > 0);
    const context = this.context;
    if (this.baseDirty) this.renderBase();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.drawImage(this.baseBuffer, 0, 0);

    if (this.hasVisibleWetness()) {
      this.drawWetnessMask();
      this.drawWetOverlay(context, WET_GRASS_TINT, null, 0.55);
    }

    if (this.hasVisibleDirt() && this.hasVisibleWetness()) {
      this.drawWetOverlay(context, WET_DIRT_TINT, this.maskBuffer, 0.82);
    }

    if (this.debug) {
      context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
      this.drawDebug(context);
    }
    this.scheduleWetDrying();
  }

  renderBase() {
    const context = this.baseBuffer.getContext('2d', { alpha: false });
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    this.drawSurface(context, SURFACE.GRASS);

    if (this.hasVisibleDirt()) {
      this.drawDirtLayer();
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.drawImage(this.dirtBuffer, 0, 0);
      context.restore();
    }

    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.fillStyle = 'rgba(238, 220, 128, 0.08)';
    context.fillRect(0, 0, this.width, this.height);
    this.baseDirty = false;
  }

  hasVisibleDirt() {
    return this.dirtPatches.length > 0;
  }

  hasVisibleWetness() {
    return this.wetSpots.length > 0;
  }

  drawWetnessMask() {
    const context = this.wetMaskBuffer.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, this.wetMaskBuffer.width, this.wetMaskBuffer.height);
    context.setTransform(this.wetPixelRatio, 0, 0, this.wetPixelRatio, 0, 0);
    const now = performance.now();
    this.wetSpots.forEach(spot => this.drawWetSpot(context, spot, this.getWetFade(spot, now)));
  }

  getWetFade(spot, now = performance.now()) {
    const fadeAge = now - spot.lastWateredAt - WET_HOLD_DURATION;
    if (fadeAge <= 0) return 1;
    return Math.max(0, 1 - fadeAge / WET_FADE_DURATION);
  }

  drawWetSpot(context, spot, fade = 1) {
    const drawBlob = (x, y, radius, alpha, seed) => {
      const radiusX = radius * (0.9 + seededUnit(seed ^ 0x68bc21eb) * 0.18);
      const radiusY = radius * (0.86 + seededUnit(seed ^ 0x02e5be93) * 0.2);
      const rotation = seededUnit(seed ^ 0x967a889b) * Math.PI;
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.scale(radiusX, radiusY);
      const gradient = context.createRadialGradient(0, 0, 0.08, 0, 0, 1);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
      gradient.addColorStop(0.48, `rgba(0, 0, 0, ${alpha * 0.84})`);
      gradient.addColorStop(0.78, `rgba(0, 0, 0, ${alpha * 0.34})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, 1, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const alpha = Math.min(0.64, 0.075 + spot.intensity * 0.565) * fade;
    drawBlob(spot.x, spot.y, spot.radius, alpha, spot.seed);
    const satelliteAngle = seededUnit(spot.seed ^ 0xb5297a4d) * Math.PI * 2;
    drawBlob(
      spot.x + Math.cos(satelliteAngle) * spot.radius * 0.48,
      spot.y + Math.sin(satelliteAngle) * spot.radius * 0.48,
      spot.radius * 0.46,
      alpha * 0.52,
      spot.seed ^ 0x1b56c4e9
    );
  }

  drawWetOverlay(targetContext, tint, terrainMask = null, opacity = 1) {
    const overlayContext = this.wetOverlayBuffer.getContext('2d');
    overlayContext.setTransform(1, 0, 0, 1, 0, 0);
    overlayContext.globalCompositeOperation = 'source-over';
    overlayContext.clearRect(0, 0, this.wetOverlayBuffer.width, this.wetOverlayBuffer.height);
    overlayContext.setTransform(this.wetPixelRatio, 0, 0, this.wetPixelRatio, 0, 0);
    overlayContext.fillStyle = tint;
    overlayContext.fillRect(0, 0, this.width, this.height);
    overlayContext.setTransform(1, 0, 0, 1, 0, 0);
    overlayContext.globalCompositeOperation = 'destination-in';
    overlayContext.drawImage(this.wetMaskBuffer, 0, 0);
    if (terrainMask) {
      overlayContext.drawImage(terrainMask, 0, 0, this.wetOverlayBuffer.width, this.wetOverlayBuffer.height);
    }
    overlayContext.globalCompositeOperation = 'source-over';

    targetContext.save();
    targetContext.setTransform(1, 0, 0, 1, 0, 0);
    targetContext.globalCompositeOperation = 'multiply';
    targetContext.globalAlpha = opacity;
    targetContext.drawImage(this.wetOverlayBuffer, 0, 0, this.canvas.width, this.canvas.height);
    targetContext.restore();
  }

  drawSurface(context, surface) {
    const images = this.images[surface];
    const baseSize = this.tileSize * 4;
    const baseColumns = Math.ceil(this.width / baseSize) + 1;
    const baseRows = Math.ceil(this.height / baseSize) + 1;
    for (let row = -1; row < baseRows; row++) {
      for (let column = -1; column < baseColumns; column++) {
        context.drawImage(images[0], column * baseSize - 0.5, row * baseSize - 0.5, baseSize + 1, baseSize + 1);
      }
    }

    const columns = Math.ceil(this.width / this.tileSize) + 1;
    const rows = Math.ceil(this.height / this.tileSize) + 1;

    for (let row = -1; row < rows; row++) {
      for (let column = -1; column < columns; column++) {
        const variantHash = hash2D(column, row, this.seed ^ hashString(surface));
        const image = images[variantHash % images.length];
        const centerX = column * this.tileSize + this.tileSize / 2 + (seededUnit(variantHash ^ 0x6a09e667) - 0.5) * this.tileSize * 0.42;
        const centerY = row * this.tileSize + this.tileSize / 2 + (seededUnit(variantHash ^ 0xbb67ae85) - 0.5) * this.tileSize * 0.42;
        this.drawFeatheredVariation(context, image, centerX, centerY, variantHash);
      }
    }
  }

  drawFeatheredVariation(context, image, centerX, centerY, variantHash) {
    const size = this.tileSize * 2.2;
    const bufferContext = this.variationBuffer.getContext('2d');
    bufferContext.setTransform(1, 0, 0, 1, 0, 0);
    bufferContext.clearRect(0, 0, this.variationBuffer.width, this.variationBuffer.height);
    bufferContext.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    bufferContext.save();
    bufferContext.translate(size / 2, size / 2);
    bufferContext.rotate(((variantHash >>> 4) % 4) * Math.PI / 2);
    bufferContext.scale((variantHash & 1) ? -1 : 1, (variantHash & 2) ? -1 : 1);
    bufferContext.drawImage(image, -size / 2, -size / 2, size, size);
    bufferContext.restore();

    bufferContext.globalCompositeOperation = 'destination-in';
    const mask = bufferContext.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.5);
    mask.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
    mask.addColorStop(0.48, 'rgba(0, 0, 0, 0.76)');
    mask.addColorStop(0.78, 'rgba(0, 0, 0, 0.28)');
    mask.addColorStop(1, 'rgba(0, 0, 0, 0)');
    bufferContext.fillStyle = mask;
    bufferContext.fillRect(0, 0, size, size);
    bufferContext.globalCompositeOperation = 'source-over';

    context.save();
    context.globalAlpha = 0.58;
    context.drawImage(this.variationBuffer, centerX - size / 2, centerY - size / 2, size, size);
    context.restore();
  }

  drawDirtLayer() {
    const dirtContext = this.dirtBuffer.getContext('2d');
    const maskContext = this.maskBuffer.getContext('2d');
    const hardMaskContext = this.hardMaskBuffer.getContext('2d');
    const inverseMaskContext = this.inverseMaskBuffer.getContext('2d');
    dirtContext.setTransform(1, 0, 0, 1, 0, 0);
    dirtContext.clearRect(0, 0, this.dirtBuffer.width, this.dirtBuffer.height);
    maskContext.setTransform(1, 0, 0, 1, 0, 0);
    maskContext.clearRect(0, 0, this.maskBuffer.width, this.maskBuffer.height);
    hardMaskContext.setTransform(1, 0, 0, 1, 0, 0);
    hardMaskContext.clearRect(0, 0, this.hardMaskBuffer.width, this.hardMaskBuffer.height);
    inverseMaskContext.setTransform(1, 0, 0, 1, 0, 0);
    inverseMaskContext.clearRect(0, 0, this.inverseMaskBuffer.width, this.inverseMaskBuffer.height);

    dirtContext.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.drawSurface(dirtContext, SURFACE.DIRT);
    hardMaskContext.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    this.dirtPatches.forEach(patch => this.drawFootprintMask(hardMaskContext, patch));

    // Feather the already-unified mask once. Applying a shadow to every patch
    // separately leaves dark seams wherever two disturbed areas overlap.
    maskContext.filter = `blur(${3.2 * this.pixelRatio}px)`;
    maskContext.globalAlpha = 0.78;
    maskContext.drawImage(this.hardMaskBuffer, 0, 0);
    maskContext.filter = 'none';
    maskContext.globalAlpha = 0.94;
    maskContext.drawImage(this.hardMaskBuffer, 0, 0);
    maskContext.globalAlpha = 1;

    inverseMaskContext.fillStyle = '#5b3925';
    inverseMaskContext.fillRect(0, 0, this.inverseMaskBuffer.width, this.inverseMaskBuffer.height);
    inverseMaskContext.globalCompositeOperation = 'destination-out';
    inverseMaskContext.drawImage(this.hardMaskBuffer, 0, 0);
    inverseMaskContext.globalCompositeOperation = 'source-over';
    this.drawUnifiedInnerContour();

    dirtContext.setTransform(1, 0, 0, 1, 0, 0);
    dirtContext.globalCompositeOperation = 'destination-in';
    dirtContext.drawImage(this.maskBuffer, 0, 0);
    dirtContext.globalCompositeOperation = 'source-over';
    this.drawDirtMaterialLayers(dirtContext);
  }

  drawFootprintMask(context, patch) {
    const { width, height, radii } = this.getFootprintGeometry(patch);
    const boundary = this.createOrganicFootprintBoundary(width, height, radii, patch.seed);
    context.save();
    context.translate(patch.x, patch.y);
    context.rotate(patch.rotation * Math.PI / 180);
    context.fillStyle = '#000';
    this.traceOrganicBoundary(context, boundary);
    context.fill();
    context.restore();
  }

  patchesOverlap(patchA, patchB) {
    const deltaX = patchB.x - patchA.x;
    const deltaY = patchB.y - patchA.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance < 1) return true;

    const direction = Math.atan2(deltaY, deltaX);
    const supportRadius = (patch, angle) => {
      const localAngle = angle - patch.rotation * Math.PI / 180;
      const radiusX = Math.max(1, patch.width * 0.49);
      const radiusY = Math.max(1, patch.height * 0.49);
      const cosine = Math.cos(localAngle);
      const sine = Math.sin(localAngle);
      return 1 / Math.sqrt((cosine / radiusX) ** 2 + (sine / radiusY) ** 2);
    };

    return distance <= supportRadius(patchA, direction) + supportRadius(patchB, direction + Math.PI) - 4;
  }

  getMergedPatches() {
    const merged = new Set();
    for (let first = 0; first < this.dirtPatches.length; first++) {
      for (let second = first + 1; second < this.dirtPatches.length; second++) {
        if (!this.patchesOverlap(this.dirtPatches[first], this.dirtPatches[second])) continue;
        merged.add(this.dirtPatches[first]);
        merged.add(this.dirtPatches[second]);
      }
    }
    return merged;
  }

  drawErodedMask(targetBuffer, inset) {
    const context = targetBuffer.getContext('2d');
    const radius = inset * this.pixelRatio;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, targetBuffer.width, targetBuffer.height);
    context.drawImage(this.hardMaskBuffer, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    for (let index = 0; index < 16; index++) {
      const angle = index / 16 * Math.PI * 2;
      context.drawImage(
        this.hardMaskBuffer,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      );
    }
    context.globalCompositeOperation = 'source-over';
  }

  drawUnifiedInnerContour() {
    this.drawErodedMask(this.erosionOuterBuffer, 7.5);
    this.drawErodedMask(this.erosionInnerBuffer, 10.5);

    const context = this.innerContourBuffer.getContext('2d');
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, this.innerContourBuffer.width, this.innerContourBuffer.height);
    context.drawImage(this.erosionOuterBuffer, 0, 0);
    context.globalCompositeOperation = 'destination-out';
    context.drawImage(this.erosionInnerBuffer, 0, 0);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = 'rgba(91, 57, 37, 0.16)';
    context.fillRect(0, 0, this.innerContourBuffer.width, this.innerContourBuffer.height);
    context.globalCompositeOperation = 'source-over';
  }

  getFootprintGeometry(patch) {
    const width = Math.max(1, patch.width);
    const height = Math.max(1, patch.height);
    const [topLeftX, topRightX, bottomRightX, bottomLeftX] = patch.horizontalRadii.map(value => width * value / 100);
    const [topLeftY, topRightY, bottomRightY, bottomLeftY] = patch.verticalRadii.map(value => height * value / 100);
    const radiusScale = Math.min(
      1,
      width / Math.max(1, topLeftX + topRightX),
      width / Math.max(1, bottomLeftX + bottomRightX),
      height / Math.max(1, topLeftY + bottomLeftY),
      height / Math.max(1, topRightY + bottomRightY)
    );
    const radii = {
      topLeftX: topLeftX * radiusScale,
      topLeftY: topLeftY * radiusScale,
      topRightX: topRightX * radiusScale,
      topRightY: topRightY * radiusScale,
      bottomRightX: bottomRightX * radiusScale,
      bottomRightY: bottomRightY * radiusScale,
      bottomLeftX: bottomLeftX * radiusScale,
      bottomLeftY: bottomLeftY * radiusScale
    };
    return { width, height, radii };
  }

  traceOrganicBoundary(context, boundary) {
    const first = boundary[0];
    const last = boundary[boundary.length - 1];
    context.beginPath();
    context.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
    boundary.forEach((point, index) => {
      const next = boundary[(index + 1) % boundary.length];
      context.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    });
    context.closePath();
  }

  drawDirtMaterialLayers(context) {
    context.save();
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = 'rgba(139, 88, 57, 0.055)';
    context.fillRect(0, 0, this.width, this.height);

    // The inverse of the union mask produces one continuous inner edge around
    // a cluster, instead of one edge per original idea footprint.
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.filter = `blur(${5.5 * this.pixelRatio}px)`;
    context.globalAlpha = 0.34;
    context.drawImage(this.inverseMaskBuffer, 0, 0);
    context.restore();
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-atop';
    context.drawImage(this.innerContourBuffer, 0, 0);
    context.restore();
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    const mergedPatches = this.getMergedPatches();

    this.dirtPatches.forEach(patch => {
      // Shared areas already get their texture and contour from the unified
      // terrain layer. Per-patch accents would reintroduce visible seams.
      if (mergedPatches.has(patch)) return;
      const { width, height, radii } = this.getFootprintGeometry(patch);
      const boundary = this.createOrganicFootprintBoundary(width, height, radii, patch.seed);
      context.save();
      context.translate(patch.x, patch.y);
      context.rotate(patch.rotation * Math.PI / 180);

      // Wide, quiet tonal pools keep the texture from reading as one flat fill.
      for (let index = 0; index < 4; index++) {
        const toneSeed = patch.seed ^ Math.imul(index + 1, 0x9e3779b1);
        const toneX = (seededUnit(toneSeed ^ 0x68bc21eb) - 0.5) * width * 0.48;
        const toneY = (seededUnit(toneSeed ^ 0x02e5be93) - 0.5) * height * 0.42;
        const radius = Math.max(width, height) * (0.18 + seededUnit(toneSeed ^ 0x967a889b) * 0.16);
        const gradient = context.createRadialGradient(toneX, toneY, 0, toneX, toneY, radius);
        const dark = index % 2 === 0;
        gradient.addColorStop(0, dark ? 'rgba(92, 55, 36, 0.12)' : 'rgba(244, 203, 143, 0.1)');
        gradient.addColorStop(0.58, dark ? 'rgba(106, 65, 42, 0.055)' : 'rgba(236, 188, 126, 0.04)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.globalCompositeOperation = dark ? 'multiply' : 'screen';
        context.fillStyle = gradient;
        context.fillRect(-width / 2, -height / 2, width, height);
      }

      // Fine, low-contrast grains add material detail without becoming rocks or speckles.
      context.globalCompositeOperation = 'multiply';
      for (let index = 0; index < 44; index++) {
        const grainSeed = patch.seed ^ Math.imul(index + 1, 0xc2b2ae35);
        const grainX = (seededUnit(grainSeed ^ 0x27d4eb2d) - 0.5) * width * 0.9;
        const grainY = (seededUnit(grainSeed ^ 0x165667b1) - 0.5) * height * 0.82;
        const grainSize = 0.35 + seededUnit(grainSeed ^ 0xd3a2646c) * 0.95;
        context.fillStyle = `rgba(91, 57, 37, ${0.035 + seededUnit(grainSeed ^ 0xfd7046c5) * 0.055})`;
        context.beginPath();
        context.ellipse(grainX, grainY, grainSize * 1.35, grainSize * 0.72, seededUnit(grainSeed) * Math.PI, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
    });
    context.restore();
  }

  createOrganicFootprintBoundary(width, height, radii, seed) {
    const points = [];
    const left = -width / 2;
    const top = -height / 2;
    const right = width / 2;
    const bottom = height / 2;
    const addPoint = (x, y, normalX, normalY) => {
      const previous = points[points.length - 1];
      if (previous && Math.hypot(previous.x - x, previous.y - y) < 0.2) return;
      points.push({ x, y, normalX, normalY });
    };
    const addLine = (startX, startY, endX, endY, normalX, normalY) => {
      for (let index = 0; index <= 8; index++) {
        const progress = index / 8;
        addPoint(
          startX + (endX - startX) * progress,
          startY + (endY - startY) * progress,
          normalX,
          normalY
        );
      }
    };
    const addArc = (centerX, centerY, radiusX, radiusY, startAngle, endAngle) => {
      for (let index = 0; index <= 26; index++) {
        const angle = startAngle + (endAngle - startAngle) * index / 26;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const gradientX = cosine / Math.max(1, radiusX);
        const gradientY = sine / Math.max(1, radiusY);
        const gradientLength = Math.hypot(gradientX, gradientY) || 1;
        addPoint(
          centerX + cosine * radiusX,
          centerY + sine * radiusY,
          gradientX / gradientLength,
          gradientY / gradientLength
        );
      }
    };

    addLine(left + radii.topLeftX, top, right - radii.topRightX, top, 0, -1);
    addArc(right - radii.topRightX, top + radii.topRightY, radii.topRightX, radii.topRightY, -Math.PI / 2, 0);
    addLine(right, top + radii.topRightY, right, bottom - radii.bottomRightY, 1, 0);
    addArc(right - radii.bottomRightX, bottom - radii.bottomRightY, radii.bottomRightX, radii.bottomRightY, 0, Math.PI / 2);
    addLine(right - radii.bottomRightX, bottom, left + radii.bottomLeftX, bottom, 0, 1);
    addArc(left + radii.bottomLeftX, bottom - radii.bottomLeftY, radii.bottomLeftX, radii.bottomLeftY, Math.PI / 2, Math.PI);
    addLine(left, bottom - radii.bottomLeftY, left, top + radii.topLeftY, -1, 0);
    addArc(left + radii.topLeftX, top + radii.topLeftY, radii.topLeftX, radii.topLeftY, Math.PI, Math.PI * 1.5);

    const phaseA = seededUnit(seed ^ 0x7f4a7c15) * Math.PI * 2;
    const phaseB = seededUnit(seed ^ 0x94d049bb) * Math.PI * 2;
    const notchCount = 7 + Math.floor(seededUnit(seed ^ 0x369dea0f) * 4);
    const notches = Array.from({ length: notchCount }, (_, index) => ({
      center: (index + 0.28 + seededUnit(seed ^ Math.imul(index + 1, 0x85ebca6b)) * 0.44) / notchCount,
      width: 0.024 + seededUnit(seed ^ Math.imul(index + 1, 0xc2b2ae35)) * 0.018,
      depth: 3 + seededUnit(seed ^ Math.imul(index + 1, 0x27d4eb2d)) * 4.5
    }));
    const bulges = Array.from({ length: 4 }, (_, index) => ({
      center: (index + seededUnit(seed ^ Math.imul(index + 1, 0x165667b1)) * 0.8) / 4,
      width: 0.04 + seededUnit(seed ^ Math.imul(index + 1, 0xd3a2646c)) * 0.025,
      depth: 1.5 + seededUnit(seed ^ Math.imul(index + 1, 0xfd7046c5)) * 2.6
    }));

    return points.map((point, index) => {
      const progress = index / points.length;
      let offset = Math.sin(progress * Math.PI * 6 + phaseA) * 2.15;
      offset += Math.sin(progress * Math.PI * 14 + phaseB) * 1.05;
      notches.forEach(notch => {
        const directDistance = Math.abs(progress - notch.center);
        const distance = Math.min(directDistance, 1 - directDistance);
        offset -= notch.depth * Math.exp(-0.5 * (distance / notch.width) ** 2);
      });
      bulges.forEach(bulge => {
        const directDistance = Math.abs(progress - bulge.center);
        const distance = Math.min(directDistance, 1 - directDistance);
        offset += bulge.depth * Math.exp(-0.5 * (distance / bulge.width) ** 2);
      });
      return {
        x: point.x + point.normalX * offset,
        y: point.y + point.normalY * offset
      };
    });
  }

  drawDebug(context) {
    const columns = Math.ceil(this.width / this.tileSize);
    const rows = Math.ceil(this.height / this.tileSize);
    context.save();
    context.strokeStyle = 'rgba(47, 57, 22, 0.45)';
    context.lineWidth = 1;
    for (let column = 0; column <= columns; column++) {
      context.beginPath();
      context.moveTo(column * this.tileSize, 0);
      context.lineTo(column * this.tileSize, this.height);
      context.stroke();
    }
    for (let row = 0; row <= rows; row++) {
      context.beginPath();
      context.moveTo(0, row * this.tileSize);
      context.lineTo(this.width, row * this.tileSize);
      context.stroke();
    }

    context.font = '600 11px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const state = this.getTileState(column, row);
        const variant = hash2D(column, row, this.seed ^ hashString(state.surface)) % 3;
        context.fillStyle = state.surface === SURFACE.DIRT ? '#5d3219' : '#354416';
        context.fillText(`${state.surface[0].toUpperCase()}${variant + 1}`, (column + 0.5) * this.tileSize, (row + 0.5) * this.tileSize);
      }
    }
    context.restore();
  }
}
