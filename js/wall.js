// MOBUS wall display: a passive living garden synced with the tabletop session.
let channel = null;
try {
  channel = new BroadcastChannel('mobus-session');
} catch (error) {
  console.info('Local wall sync is unavailable; remote sync will still be attempted.', error);
}

const WALL_SYNC_SESSION_ID = new URLSearchParams(window.location.search).get('session') || 'mobus-live';
const WALL_SYNC_STORAGE_KEY = `mobus-wall-state:${WALL_SYNC_SESSION_ID}`;
const PREVIEW_MODE = new URLSearchParams(window.location.search).get('preview') === '1';
const LOCAL_DEV = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('wall-canvas');
const ctx = canvas.getContext('2d');
const body = document.body;

const ui = {
  title: document.getElementById('wall-session-title'),
  phase: document.getElementById('wall-phase-label'),
  copy: document.getElementById('wall-session-copy'),
  ideaCount: document.getElementById('wall-idea-count'),
  ideaLabel: document.getElementById('wall-idea-label'),
  groupCount: document.getElementById('wall-group-count'),
  groupLabel: document.getElementById('wall-group-label'),
  stickerCount: document.getElementById('wall-sticker-count'),
  stickerLabel: document.getElementById('wall-sticker-label'),
  empty: document.getElementById('wall-empty-state'),
  emptyTitle: document.getElementById('wall-empty-title'),
  emptyCopy: document.getElementById('wall-empty-copy'),
  syncCopy: document.getElementById('wall-sync-copy')
};

const COLORS = {
  brown: '#70461f',
  brownDark: '#4b2d14',
  brownSoft: '#9a6b3a',
  soil: '#b97b45',
  soilLight: '#d39b64',
  soilDark: '#7b4a28',
  cream: '#edd1a4',
  creamLight: '#f8dfb6',
  green: '#66752f',
  greenDark: '#435126',
  leaf: ['#6f8037', '#839443', '#95a24c', '#738d3d', '#a2a653'],
  gold: '#efb62d',
  goldLight: '#ffe28a',
  blossom: ['#f6c651', '#f08b62', '#f4d78d', '#e7a5a1', '#fff0bd']
};

const state = {
  totalIdeas: 0,
  soloIdeas: [],
  groups: [],
  sessionTitle: 'Associatieveld',
  activeState: 'waiting',
  isInteracting: false,
  harvestMarket: { active: false, complete: false, stickers: [], leaders: [] },
  lastActivityTime: 0
};

const plants = new Map();
const particles = [];
const growthParticles = [];
const butterflies = [];
const stickerImages = Array.from({ length: 6 }, (_, index) => {
  const image = new Image();
  image.src = `/assets/stickers/sticker-${index + 1}.png`;
  return image;
});

let width = 0;
let height = 0;
let lastFrame = performance.now();
let elapsed = 0;
let lastStateAt = 0;
let lastRemoteVersion = 0;
let remoteUnavailableLogged = false;
let celebrationUntil = 0;
let previousComplete = false;

function readStoredWallState() {
  try {
    const value = localStorage.getItem(WALL_SYNC_STORAGE_KEY);
    if (value) handleWallEvent(JSON.parse(value));
  } catch (error) {
    console.info('Saved local wall state could not be read.', error);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function seededRandom(seed) {
  let current = seed || 1;
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

function roundedRect(context, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function plural(count, singular, pluralValue) {
  return count === 1 ? singular : pluralValue;
}

function phaseFor(nextState) {
  if (nextState.harvestMarket?.complete || nextState.activeState === 'sessionSummary') return 'complete';
  if (nextState.harvestMarket?.active || nextState.activeState === 'harvestMarket') return 'harvest';
  if (nextState.activeState && nextState.activeState !== 'waiting' && nextState.activeState !== 'sessionSetup') return 'growing';
  return 'waiting';
}

function setText(element, value) {
  if (element && element.textContent !== String(value)) element.textContent = String(value);
}

function updateInterface() {
  const phase = phaseFor(state);
  const stickerCount = state.harvestMarket?.stickers?.length || 0;
  const groupCount = state.groups.length;
  const hasIdeas = state.soloIdeas.length + groupCount > 0;
  const title = String(state.sessionTitle || '').trim();

  body.dataset.wallPhase = phase;
  setText(ui.title, title && title !== 'Wachten als creatieve pauze' ? title : 'Associatieveld');
  setText(ui.ideaCount, state.totalIdeas);
  setText(ui.ideaLabel, plural(state.totalIdeas, 'idee', 'ideeën'));
  setText(ui.groupCount, groupCount);
  setText(ui.groupLabel, plural(groupCount, 'groep', 'groepen'));
  setText(ui.stickerCount, stickerCount);
  setText(ui.stickerLabel, plural(stickerCount, 'sticker', 'stickers'));

  const phaseContent = {
    waiting: ['Wacht op de sessie', 'Zodra de sessie start, groeit hier jullie gezamenlijke ideeënveld.'],
    growing: ['Sessie in bloei', 'Elk nieuw idee en iedere groep laat jullie gezamenlijke tuin verder groeien.'],
    harvest: ['Oogstmarkt', stickerCount > 0
      ? 'Jullie kiezen samen. Meer stickers laten een idee zichtbaar verder opbloeien.'
      : 'Jullie kiezen samen welke ideeën mogen uitgroeien tot de hoofdoogst.'],
    complete: ['De oogst is binnen', 'De meest gedragen ideeën staan nu samen in volle bloei.']
  }[phase];

  setText(ui.phase, phaseContent[0]);
  setText(ui.copy, phaseContent[1]);
  ui.empty?.classList.toggle('is-hidden', hasIdeas);

  if (!hasIdeas) {
    const connected = body.dataset.wallConnected === 'true';
    setText(ui.emptyTitle, connected ? 'Klaar voor het eerste idee' : 'De tuin maakt zich klaar');
    setText(ui.emptyCopy, connected
      ? 'Plant een idee op het tafelblad en zie het hier meteen ontkiemen.'
      : 'Open de sessie op het tafelblad om samen te beginnen.');
  }
}

function voteDataByToken(nextState) {
  const tokenTitles = new Map();
  nextState.soloIdeas.forEach(idea => tokenTitles.set(String(idea.id), idea.title));
  nextState.groups.forEach(group => tokenTitles.set(String(group.id), group.title));

  const votes = new Map();
  (nextState.harvestMarket?.stickers || []).forEach(sticker => {
    const title = tokenTitles.get(String(sticker.tokenId));
    if (!title) return;
    const entry = votes.get(title) || [];
    entry.push(clamp(Number(sticker.participant) || 1, 1, 6));
    votes.set(title, entry);
  });

  (nextState.harvestMarket?.leaders || []).forEach(leader => {
    if (!votes.has(leader.title) && leader.votes > 0) {
      votes.set(leader.title, Array.from({ length: leader.votes }, (_, index) => (index % 6) + 1));
    }
  });
  return votes;
}

function synchronizePlants(nextState) {
  const votes = voteDataByToken(nextState);
  const leaders = new Set((nextState.harvestMarket?.leaders || []).map(leader => leader.title));
  const visibleKeys = new Set();

  nextState.groups.forEach(group => {
    const key = `group:${group.id ?? group.title}`;
    visibleKeys.add(key);
    const plant = plants.get(key) || new GardenPlant(key, group.title, 'group');
    plant.update({
      title: group.title,
      count: Math.max(2, Number(group.childCount) || 2),
      votes: votes.get(group.title) || [],
      leader: leaders.has(group.title)
    });
    plants.set(key, plant);
  });

  nextState.soloIdeas.forEach(idea => {
    const key = `idea:${idea.id ?? idea.title}`;
    visibleKeys.add(key);
    const plant = plants.get(key) || new GardenPlant(key, idea.title, 'solo');
    plant.update({
      title: idea.title,
      count: 1,
      votes: votes.get(idea.title) || [],
      leader: leaders.has(idea.title)
    });
    plants.set(key, plant);
  });

  plants.forEach((plant, key) => {
    if (!visibleKeys.has(key)) plant.targetGrowth = 0;
  });
}

function handleStateUpdate(payload = {}) {
  const nextState = {
    ...state,
    ...payload,
    totalIdeas: Number(payload.totalIdeas) || 0,
    soloIdeas: Array.isArray(payload.soloIdeas) ? payload.soloIdeas : [],
    groups: Array.isArray(payload.groups) ? payload.groups : [],
    harvestMarket: payload.harvestMarket || state.harvestMarket
  };

  const isNowComplete = Boolean(nextState.harvestMarket?.complete);
  if (isNowComplete && !previousComplete) celebrationUntil = performance.now() + 5000;
  previousComplete = isNowComplete;
  Object.assign(state, nextState);
  state.totalIdeas = state.totalIdeas || state.soloIdeas.length + state.groups.reduce((sum, group) => sum + (group.childCount || 0), 0);
  state.isInteracting = Boolean(payload.isInteracting);
  lastStateAt = Date.now();
  body.dataset.wallConnected = 'true';

  synchronizePlants(state);
  updateInterface();
  updateSyncStatus();
}

function resetGarden() {
  plants.forEach(plant => { plant.targetGrowth = 0; });
  Object.assign(state, {
    totalIdeas: 0,
    soloIdeas: [],
    groups: [],
    activeState: 'waiting',
    isInteracting: false,
    harvestMarket: { active: false, complete: false, stickers: [], leaders: [] }
  });
  previousComplete = false;
  updateInterface();
}

function handleWallEvent(event) {
  if (!event || typeof event.type !== 'string') return;
  if (event.type === 'state-update') handleStateUpdate(event.data);
  if (event.type === 'reset') resetGarden();
}

function updateSyncStatus() {
  // Updates are event-driven rather than a heartbeat, so an idle garden is still connected.
  const connected = lastStateAt > 0;
  body.dataset.wallConnected = connected ? 'true' : 'false';
  setText(ui.syncCopy, connected ? 'Live verbonden' : 'Wachten op verbinding');
}

class PollenParticle {
  constructor(randomX = true, celebration = false) {
    this.reset(randomX, celebration);
  }

  reset(randomX = false, celebration = false) {
    this.x = randomX ? Math.random() * width : -30;
    this.y = celebration ? height * (0.22 + Math.random() * 0.52) : height * (0.26 + Math.random() * 0.57);
    this.speed = 8 + Math.random() * 13;
    this.rise = -2 + Math.random() * 5;
    this.size = celebration ? 2 + Math.random() * 3.2 : 1.1 + Math.random() * 2;
    this.opacity = celebration ? 0.58 + Math.random() * 0.3 : 0.16 + Math.random() * 0.22;
    this.phase = Math.random() * Math.PI * 2;
    this.gold = celebration || Math.random() > 0.62;
  }

  tick(dt, wind, celebration) {
    this.x += this.speed * (1 + wind * 2.4) * dt;
    this.y += (this.rise + Math.sin(elapsed * 1.2 + this.phase) * 4) * dt;
    if (this.x > width + 30 || this.y < 170 || this.y > height + 20) this.reset(false, celebration);
  }

  draw(context) {
    context.save();
    context.globalAlpha = this.opacity;
    context.translate(this.x, this.y);
    context.rotate(Math.sin(elapsed + this.phase) * 0.8);
    context.fillStyle = this.gold ? COLORS.goldLight : '#e9dda6';
    context.beginPath();
    context.ellipse(0, 0, this.size * 0.65, this.size * 1.7, 0.35, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

class GrowthParticle {
  constructor(x, y, color, index) {
    const angle = Math.PI * (1.08 + Math.random() * 0.84);
    const speed = 32 + Math.random() * 62;
    this.x = x + (Math.random() - 0.5) * 42;
    this.y = y + 2 + Math.random() * 8;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 24;
    this.life = 0;
    this.duration = 0.55 + Math.random() * 0.42;
    this.size = 2.5 + Math.random() * 5.5;
    this.color = index % 4 === 0 ? color : (index % 2 === 0 ? COLORS.soilLight : COLORS.soil);
    this.leaf = index % 5 === 0;
    this.rotation = Math.random() * Math.PI;
  }

  tick(dt) {
    this.life += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 105 * dt;
    this.vx *= 0.985;
    this.rotation += dt * 4;
  }

  draw(context) {
    const progress = this.life / this.duration;
    if (progress >= 1) return;
    context.save();
    context.globalAlpha = (1 - progress) * 0.72;
    context.translate(this.x, this.y);
    context.rotate(this.rotation);
    context.fillStyle = this.color;
    context.beginPath();
    if (this.leaf) context.ellipse(0, 0, this.size * 0.55, this.size, 0, 0, Math.PI * 2);
    else context.arc(0, 0, this.size * (1 - progress * 0.35), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  get done() {
    return this.life >= this.duration;
  }
}

class Butterfly {
  constructor(index) {
    this.index = index;
    this.seed = hashString(`butterfly-${index}`);
    this.x = ((this.seed % 83) / 83) * width;
    this.y = height * (0.34 + ((this.seed >>> 4) % 30) / 100);
    this.speed = 7 + (this.seed % 9);
    this.phase = (this.seed % 628) / 100;
    this.color = COLORS.blossom[this.seed % COLORS.blossom.length];
  }

  tick(dt) {
    this.x += this.speed * dt;
    this.y += Math.sin(elapsed * 1.05 + this.phase) * 3.5 * dt;
    if (this.x > width + 30) this.x = -30;
  }

  draw(context) {
    const flap = 0.2 + Math.abs(Math.sin(elapsed * 7 + this.phase)) * 0.8;
    context.save();
    context.translate(this.x, this.y + Math.sin(elapsed * 1.7 + this.phase) * 13);
    context.globalAlpha = 0.54;
    context.fillStyle = this.color;
    context.strokeStyle = 'rgba(77, 61, 27, 0.42)';
    context.lineWidth = 0.8;
    [-1, 1].forEach(side => {
      context.beginPath();
      context.ellipse(side * 3.5, 0, 3.8 * flap, 6.2, side * 0.35, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });
    context.restore();
  }
}

function drawLeaf(context, x, y, angle, scale, color) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.scale(scale, scale);
  context.beginPath();
  context.moveTo(0, 0);
  context.bezierCurveTo(-4, -10, -3, -20, 1, -23);
  context.bezierCurveTo(9, -18, 10, -7, 0, 0);
  context.closePath();
  context.fillStyle = color;
  context.strokeStyle = COLORS.greenDark;
  context.lineWidth = 1.8;
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(0, -2);
  context.quadraticCurveTo(2, -10, 2, -19);
  context.strokeStyle = 'rgba(255, 244, 184, 0.44)';
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

function drawFlower(context, x, y, scale, color, angle = 0) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.scale(scale, scale);
  for (let petal = 0; petal < 5; petal += 1) {
    context.save();
    context.rotate((Math.PI * 2 * petal) / 5);
    context.beginPath();
    context.ellipse(0, -8, 4.5, 8, 0, 0, Math.PI * 2);
    context.fillStyle = color;
    context.strokeStyle = COLORS.brownSoft;
    context.lineWidth = 1;
    context.fill();
    context.stroke();
    context.restore();
  }
  context.beginPath();
  context.arc(0, 0, 3.2, 0, Math.PI * 2);
  context.fillStyle = COLORS.gold;
  context.fill();
  context.restore();
}

function traceOrganicOval(context, radiusX, radiusY, seed, inset = 0) {
  const random = seededRandom(seed + inset * 997);
  const points = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    const wobble = 0.92 + random() * 0.14;
    return {
      x: Math.cos(angle) * Math.max(1, radiusX - inset) * wobble,
      y: Math.sin(angle) * Math.max(1, radiusY - inset * 0.28) * (0.93 + random() * 0.12)
    };
  });
  context.beginPath();
  points.forEach((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const startX = (previous.x + point.x) / 2;
    const startY = (previous.y + point.y) / 2;
    const endX = (point.x + next.x) / 2;
    const endY = (point.y + next.y) / 2;
    if (index === 0) context.moveTo(startX, startY);
    context.quadraticCurveTo(point.x, point.y, endX, endY);
  });
  context.closePath();
}

class GardenPlant {
  constructor(key, title, kind) {
    this.key = key;
    this.title = title;
    this.kind = kind;
    this.count = kind === 'group' ? 2 : 1;
    this.visualCount = this.count;
    this.votes = [];
    this.visualVotes = 0;
    this.leader = false;
    this.currentGrowth = 0;
    this.targetGrowth = 1;
    this.age = 0;
    this.burstPlayed = false;
    this.x = width / 2;
    this.y = height * 0.78;
    this.targetX = this.x;
    this.targetY = this.y;
    this.layoutScale = 1;
    this.seed = hashString(key);
    this.phase = (this.seed % 628) / 100;
    this.leafColor = COLORS.leaf[this.seed % COLORS.leaf.length];
    this.flowerColor = COLORS.blossom[(this.seed >>> 4) % COLORS.blossom.length];
    this.branches = this.createBranches();
  }

  createBranches() {
    const random = seededRandom(this.seed);
    return Array.from({ length: 7 }, (_, index) => ({
      side: index % 2 === 0 ? -1 : 1,
      ratio: 0.24 + index * 0.095 + random() * 0.035,
      length: 34 + random() * 30,
      angle: 0.48 + random() * 0.42,
      leafScale: 0.65 + random() * 0.4,
      flower: index > 2 && random() > 0.5
    }));
  }

  update({ title, count, votes, leader }) {
    this.title = title;
    this.count = count;
    this.votes = votes;
    this.leader = leader;
    this.targetGrowth = 1;
  }

  tick(dt) {
    this.age += dt;
    const growSpeed = REDUCED_MOTION ? 20 : (this.targetGrowth > this.currentGrowth ? 1.55 : 2.1);
    this.currentGrowth += (this.targetGrowth - this.currentGrowth) * Math.min(1, dt * growSpeed);
    this.x += (this.targetX - this.x) * Math.min(1, dt * 4.2);
    this.y += (this.targetY - this.y) * Math.min(1, dt * 4.2);
    this.visualCount += (this.count - this.visualCount) * Math.min(1, dt * 1.5);
    this.visualVotes += (this.votes.length - this.visualVotes) * Math.min(1, dt * 2.1);
    if (!this.burstPlayed && this.currentGrowth > 0.1 && this.targetGrowth > 0) {
      this.burstPlayed = true;
      for (let index = 0; index < 18; index += 1) growthParticles.push(new GrowthParticle(this.x, this.y, this.leafColor, index));
    }
  }

  draw(context, wind) {
    const growth = clamp(this.currentGrowth, 0, 1);
    if (growth < 0.01) return;
    const supportScale = 1 + Math.min(0.2, this.visualVotes * 0.035) + (this.leader ? 0.07 : 0);
    const scale = this.layoutScale * supportScale;
    const sway = Math.sin(elapsed * 1.25 + this.phase) * wind * 10;

    context.save();
    context.translate(this.x, this.y);
    context.scale(scale, scale);
    this.drawAura(context, growth);
    this.drawSoil(context, growth);
    if (this.kind === 'group') this.drawFullPlant(context, growth, sway);
    else this.drawSprout(context, growth, sway);
    this.drawPlaque(context, growth);
    context.restore();
  }

  drawAura(context, growth) {
    if (this.votes.length === 0) return;
    const radius = (this.kind === 'group' ? 105 : 76) + this.votes.length * 7;
    const aura = context.createRadialGradient(0, -35, 8, 0, -35, radius);
    aura.addColorStop(0, `rgba(255, 225, 107, ${0.2 + (this.leader ? 0.18 : 0.06)})`);
    aura.addColorStop(0.52, 'rgba(244, 187, 47, 0.11)');
    aura.addColorStop(1, 'rgba(244, 187, 47, 0)');
    context.globalAlpha = growth;
    context.fillStyle = aura;
    context.beginPath();
    context.arc(0, -35, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  drawSoil(context, growth) {
    const soilWidth = (this.kind === 'group' ? 112 : 82) * growth;
    const soilHeight = (this.kind === 'group' ? 29 : 22) * growth;
    context.save();
    context.globalAlpha = growth;
    context.translate(0, 3);
    traceOrganicOval(context, soilWidth + 3, soilHeight + 2, this.seed + 51);
    context.fillStyle = 'rgba(62, 38, 17, 0.24)';
    context.fill();
    context.translate(0, -6);

    const soil = context.createLinearGradient(0, -20, 0, 28);
    soil.addColorStop(0, COLORS.soilLight);
    soil.addColorStop(0.64, COLORS.soil);
    soil.addColorStop(1, COLORS.soilDark);
    traceOrganicOval(context, soilWidth, soilHeight, this.seed);
    context.fillStyle = soil;
    context.strokeStyle = COLORS.brownSoft;
    context.lineWidth = 3;
    context.fill();
    context.stroke();

    traceOrganicOval(context, soilWidth * 0.83, soilHeight * 0.6, this.seed + 17);
    context.strokeStyle = 'rgba(255, 213, 153, 0.42)';
    context.lineWidth = 1.5;
    context.stroke();

    const random = seededRandom(this.seed + 88);
    for (let index = 0; index < 8; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * 0.72;
      const x = Math.cos(angle) * soilWidth * distance;
      const y = Math.sin(angle) * soilHeight * distance;
      const size = 1.1 + random() * 2.2;
      context.beginPath();
      context.ellipse(x, y, size * 1.35, size, angle, 0, Math.PI * 2);
      context.fillStyle = index % 3 === 0 ? 'rgba(100, 57, 28, 0.38)' : 'rgba(238, 181, 116, 0.34)';
      context.fill();
    }
    context.restore();
  }

  strokeStem(context, path, widthValue) {
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = COLORS.greenDark;
    context.lineWidth = widthValue + 3;
    context.stroke(path);
    context.strokeStyle = COLORS.green;
    context.lineWidth = widthValue;
    context.stroke(path);
    context.restore();
  }

  drawSprout(context, growth, sway) {
    const stemGrowth = clamp((growth - 0.08) / 0.72, 0, 1);
    const leafGrowth = clamp((growth - 0.38) / 0.5, 0, 1);
    const heightValue = (76 + Math.min(26, this.votes.length * 4)) * stemGrowth;
    const path = new Path2D();
    path.moveTo(0, -3);
    path.quadraticCurveTo(sway * 0.25, -heightValue * 0.55, sway, -heightValue);
    this.strokeStem(context, path, 5 * stemGrowth);
    const topX = sway;
    const topY = -heightValue;
    drawLeaf(context, topX, topY + 8, -0.86, 0.92 * leafGrowth, this.leafColor);
    drawLeaf(context, topX + 1, topY + 9, 0.82, 0.88 * leafGrowth, COLORS.leaf[(this.seed + 2) % COLORS.leaf.length]);
    const sideLeafGrowth = clamp((growth - 0.52) / 0.38, 0, 1);
    drawLeaf(context, sway * 0.55 - 1, -heightValue * 0.53, -1.15, 0.55 * sideLeafGrowth, COLORS.leaf[(this.seed + 3) % COLORS.leaf.length]);
    drawLeaf(context, sway * 0.62 + 1, -heightValue * 0.66, 1.12, 0.5 * sideLeafGrowth, this.leafColor);
    if (this.votes.length > 0) drawFlower(context, topX, topY - 7, 0.75 * leafGrowth, this.leader ? COLORS.goldLight : this.flowerColor);
    else {
      context.save();
      context.globalAlpha = leafGrowth;
      context.beginPath();
      context.ellipse(topX, topY - 3, 4.8 * leafGrowth, 7.2 * leafGrowth, 0.12, 0, Math.PI * 2);
      context.fillStyle = this.flowerColor;
      context.strokeStyle = COLORS.brownSoft;
      context.lineWidth = 1.2;
      context.fill();
      context.stroke();
      context.restore();
    }
  }

  drawFullPlant(context, growth, sway) {
    const trunkGrowth = clamp((growth - 0.05) / 0.7, 0, 1);
    const heightValue = (105 + Math.min(75, this.visualCount * 11) + Math.min(25, this.visualVotes * 5)) * trunkGrowth;
    const trunk = new Path2D();
    trunk.moveTo(0, -3);
    trunk.bezierCurveTo(sway * 0.12, -heightValue * 0.35, -sway * 0.12, -heightValue * 0.68, sway, -heightValue);
    this.strokeStem(context, trunk, (6 + Math.min(4, this.count * 0.45)) * trunkGrowth);

    const visibleBranches = Math.min(this.branches.length, 3 + Math.ceil(this.visualCount / 2) + Math.min(2, Math.ceil(this.visualVotes)));
    this.branches.slice(0, visibleBranches).forEach((branch, index) => {
      const branchGrowth = clamp((growth - 0.22 - index * 0.045) / 0.5, 0, 1);
      if (branchGrowth <= 0) return;
      const baseY = -heightValue * branch.ratio;
      const baseX = sway * branch.ratio;
      const reach = branch.length * branch.side * branchGrowth;
      const lift = branch.length * branch.angle * branchGrowth;
      const endX = baseX + reach + sway * 0.22;
      const endY = baseY - lift;
      const path = new Path2D();
      path.moveTo(baseX, baseY);
      path.quadraticCurveTo(baseX + reach * 0.52, baseY - lift * 0.2, endX, endY);
      this.strokeStem(context, path, (3.6 - index * 0.18) * branchGrowth);
      drawLeaf(context, endX, endY + 5, branch.side < 0 ? -0.75 : 0.75, branch.leafScale * branchGrowth, this.leafColor);
      if (branch.flower || (this.votes.length > 0 && index >= visibleBranches - Math.min(3, this.votes.length))) {
        drawFlower(context, endX, endY - 9, 0.66 * branchGrowth, this.leader ? COLORS.goldLight : this.flowerColor, branch.side * 0.15);
      }
    });

    const crownGrowth = clamp((growth - 0.56) / 0.38, 0, 1);
    drawFlower(context, sway, -heightValue - 5, (0.78 + Math.min(0.22, this.votes.length * 0.04)) * crownGrowth, this.leader ? COLORS.goldLight : this.flowerColor);
  }

  drawPlaque(context, growth) {
    context.save();
    context.globalAlpha = growth;
    context.font = '500 15px Fredoka, sans-serif';
    const maxWidth = this.kind === 'group' ? 236 : 190;
    const displayTitle = fitText(context, this.title, maxWidth - 32);
    const measured = context.measureText(displayTitle).width;
    const plaqueWidth = clamp(measured + 36 + (this.kind === 'group' ? 24 : 0), 112, maxWidth);
    const plaqueY = 36;
    const plaqueHeight = this.votes.length > 0 ? 50 : 42;

    roundedRect(context, -plaqueWidth / 2, plaqueY + 5, plaqueWidth, plaqueHeight, 17);
    context.fillStyle = 'rgba(75, 45, 20, 0.25)';
    context.fill();

    const plaqueFill = context.createLinearGradient(0, plaqueY, 0, plaqueY + plaqueHeight);
    plaqueFill.addColorStop(0, this.votes.length > 0 ? '#ffe39a' : COLORS.creamLight);
    plaqueFill.addColorStop(1, this.votes.length > 0 ? '#f2bd45' : COLORS.cream);
    roundedRect(context, -plaqueWidth / 2, plaqueY, plaqueWidth, plaqueHeight, 17);
    context.fillStyle = plaqueFill;
    context.strokeStyle = this.leader ? '#b57612' : COLORS.brownSoft;
    context.lineWidth = this.leader ? 3 : 2;
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(-plaqueWidth / 2 + 16, plaqueY + 5);
    context.lineTo(plaqueWidth / 2 - 16, plaqueY + 5);
    context.strokeStyle = 'rgba(255, 247, 213, 0.76)';
    context.lineWidth = 1.6;
    context.stroke();

    context.fillStyle = COLORS.brownDark;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '500 15px Fredoka, sans-serif';
    context.fillText(displayTitle, this.kind === 'group' ? -8 : 0, plaqueY + (this.votes.length > 0 ? 17 : 21));

    if (this.kind === 'group') {
      const badgeX = plaqueWidth / 2 - 17;
      const badgeY = plaqueY + 17;
      context.beginPath();
      context.arc(badgeX, badgeY, 13, 0, Math.PI * 2);
      context.fillStyle = COLORS.green;
      context.strokeStyle = COLORS.creamLight;
      context.lineWidth = 2;
      context.fill();
      context.stroke();
      context.fillStyle = '#fff2d0';
      context.font = '600 12px Fredoka, sans-serif';
      context.fillText(String(this.count), badgeX, badgeY + 0.5);
    }

    if (this.votes.length > 0) this.drawStickerRow(context, plaqueWidth, plaqueY + 31);
    if (this.leader) this.drawLeaderFlag(context, plaqueY, plaqueWidth);
    context.restore();
  }

  drawStickerRow(context, plaqueWidth, y) {
    const visibleVotes = this.votes.slice(0, 5);
    const size = 22;
    const startX = -plaqueWidth / 2 + 17;
    visibleVotes.forEach((participant, index) => {
      const image = stickerImages[participant - 1];
      const x = startX + index * 18;
      if (image?.complete) context.drawImage(image, x, y, size, size);
      else {
        context.beginPath();
        context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        context.fillStyle = COLORS.gold;
        context.fill();
      }
    });
    if (this.votes.length > visibleVotes.length) {
      context.fillStyle = COLORS.brownDark;
      context.textAlign = 'left';
      context.font = '600 10px Fredoka, sans-serif';
      context.fillText(`+${this.votes.length - visibleVotes.length}`, startX + visibleVotes.length * 18 + 2, y + 11);
    }
  }

  drawLeaderFlag(context, plaqueY, plaqueWidth) {
    const label = 'HOOFDOOGST';
    context.font = '600 9px Fredoka, sans-serif';
    const widthValue = context.measureText(label).width + 18;
    const x = -plaqueWidth / 2 + 12;
    const y = plaqueY - 13;
    roundedRect(context, x, y, widthValue, 19, 9);
    context.fillStyle = '#fff0bd';
    context.strokeStyle = '#b57612';
    context.lineWidth = 1.5;
    context.fill();
    context.stroke();
    context.fillStyle = '#765016';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, x + widthValue / 2, y + 9.8);
  }
}

function fitText(context, value, maxWidth) {
  const text = String(value || 'Naamloos idee');
  if (context.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 4 && context.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened.trim()}…`;
}

function layoutPlants() {
  const active = [...plants.values()].filter(plant => plant.targetGrowth > 0 || plant.currentGrowth > 0.03);
  if (active.length === 0) return;
  active.sort((a, b) => Number(a.kind === 'solo') - Number(b.kind === 'solo') || a.seed - b.seed);
  const useTwoRows = active.length > 7;
  const backCount = useTwoRows ? Math.ceil(active.length / 2) : active.length;
  const frontCount = useTwoRows ? active.length - backCount : 0;
  const horizontalInset = clamp(width * 0.065, 52, 130);

  active.forEach((plant, index) => {
    const row = useTwoRows && index >= backCount ? 1 : 0;
    const rowIndex = row === 0 ? index : index - backCount;
    const rowCount = row === 0 ? backCount : frontCount;
    const available = width - horizontalInset * 2;
    plant.targetX = horizontalInset + available * ((rowIndex + 0.5) / rowCount);
    plant.targetY = height * (useTwoRows ? (row === 0 ? 0.67 : 0.83) : 0.78);
    plant.layoutScale = clamp((available / rowCount) / 235, 0.56, 1.05) * (row === 0 && useTwoRows ? 0.82 : 1);
  });
}

function drawCloud(context, x, y, scale, opacity) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.globalAlpha = opacity;
  context.shadowColor = 'rgba(72, 92, 72, 0.18)';
  context.shadowBlur = 16;
  context.shadowOffsetY = 7;
  const cloudFill = context.createLinearGradient(0, -34, 0, 28);
  cloudFill.addColorStop(0, '#fff9e6');
  cloudFill.addColorStop(0.62, '#f5e9c8');
  cloudFill.addColorStop(1, '#ddd9b8');
  context.fillStyle = cloudFill;
  context.strokeStyle = 'rgba(111, 89, 51, 0.2)';
  context.lineWidth = 1.6;
  context.beginPath();
  context.moveTo(-72, 15);
  context.bezierCurveTo(-69, -6, -44, -16, -25, -6);
  context.bezierCurveTo(-16, -34, 27, -38, 42, -10);
  context.bezierCurveTo(66, -17, 83, -2, 82, 17);
  context.bezierCurveTo(54, 27, -46, 28, -72, 15);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowColor = 'transparent';
  context.beginPath();
  context.moveTo(-47, 5);
  context.bezierCurveTo(-22, -5, 2, -1, 36, -10);
  context.strokeStyle = 'rgba(255, 255, 246, 0.78)';
  context.lineWidth = 2.1;
  context.stroke();
  context.restore();
}

function drawCloudLayer(context, w, h) {
  const clouds = [
    { offset: 0.04, y: 0.16, scale: 0.72, speed: 1.25, opacity: 0.72 },
    { offset: 0.39, y: 0.27, scale: 1.02, speed: 0.92, opacity: 0.64 },
    { offset: 0.74, y: 0.12, scale: 0.84, speed: 1.08, opacity: 0.68 },
    { offset: 0.91, y: 0.33, scale: 0.58, speed: 0.74, opacity: 0.48 }
  ];
  clouds.forEach((cloud, index) => {
    const travel = w + 220;
    const x = ((cloud.offset * travel + elapsed * cloud.speed * 9) % travel) - 110;
    const bob = Math.sin(elapsed * 0.22 + index) * 4;
    drawCloud(context, x, h * cloud.y + bob, cloud.scale, cloud.opacity);
  });
}

function traceHill(context, w, h, baseline, points, phase = 0) {
  context.beginPath();
  context.moveTo(-40, h + 40);
  context.lineTo(-40, baseline);
  points.forEach((point, index) => {
    const previousX = index === 0 ? -40 : points[index - 1].x * w;
    const x = point.x * w;
    const y = baseline + point.y * h;
    const controlX = (previousX + x) / 2;
    const controlY = baseline + Math.sin(index + phase) * h * 0.014;
    context.quadraticCurveTo(controlX, controlY, x, y);
  });
  context.lineTo(w + 40, h + 40);
  context.closePath();
}

function drawDistantTrees(context, w, h, horizon) {
  const count = Math.max(28, Math.floor(w / 38));
  context.save();
  for (let index = 0; index < count; index += 1) {
    const seed = hashString(`tree-${index}`);
    const x = ((index + 0.2) / count) * w + (seed % 29) - 14;
    const y = horizon + 10 + Math.sin(index * 1.74) * 5;
    const size = 9 + (seed % 13);
    context.fillStyle = index % 4 === 0 ? 'rgba(76, 86, 39, 0.58)' : 'rgba(91, 101, 43, 0.62)';
    context.fillRect(x - 1.2, y - size * 0.3, 2.4, size * 0.7);
    for (let crown = 0; crown < 3; crown += 1) {
      context.beginPath();
      context.arc(x + (crown - 1) * size * 0.3, y - size * (0.48 + crown * 0.08), size * (0.36 + crown * 0.04), 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawFieldTexture(context, w, h) {
  context.save();
  context.lineCap = 'round';
  for (let index = 0; index < 90; index += 1) {
    const seed = hashString(`field-mark-${index}`);
    const x = ((seed % 1000) / 1000) * w;
    const y = h * (0.55 + (((seed >>> 10) % 450) / 1000));
    const length = 4 + ((seed >>> 18) % 13);
    const wave = Math.sin(elapsed * 0.55 + seed) * 1.5;
    context.strokeStyle = index % 5 === 0 ? 'rgba(244, 224, 137, 0.18)' : 'rgba(43, 60, 25, 0.17)';
    context.lineWidth = 0.8 + (seed % 3) * 0.35;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + wave, y - length * 0.55, x + wave * 1.6, y - length);
    context.stroke();
  }

  for (let row = 0; row < 4; row += 1) {
    const y = h * (0.68 + row * 0.085);
    context.beginPath();
    context.moveTo(-30, y);
    context.bezierCurveTo(w * 0.25, y - 22, w * 0.7, y + 24, w + 30, y - 8);
    context.strokeStyle = `rgba(247, 224, 140, ${0.08 + row * 0.015})`;
    context.lineWidth = 1.5 + row * 0.6;
    context.stroke();
  }
  context.restore();
}

function drawWildflowers(context, w, h) {
  const count = Math.max(12, Math.floor(w / 82));
  context.save();
  for (let index = 0; index < count; index += 1) {
    const seed = hashString(`wildflower-${index}`);
    const x = ((index + 0.45) / count) * w + (seed % 41) - 20;
    const y = h * (0.7 + ((seed >>> 6) % 24) / 100);
    const size = 0.32 + (seed % 30) / 100;
    const sway = Math.sin(elapsed * 0.7 + index) * 2;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + sway, y - 10, x + sway * 1.5, y - 18);
    context.strokeStyle = 'rgba(55, 76, 30, 0.36)';
    context.lineWidth = 1.2;
    context.stroke();
    if (index % 2 === 0) drawFlower(context, x + sway * 1.5, y - 19, size, COLORS.blossom[seed % COLORS.blossom.length]);
  }
  context.restore();
}

function drawGardenStage(context, w, h) {
  const horizon = h * 0.5;
  const sky = context.createLinearGradient(0, 0, 0, horizon + 90);
  sky.addColorStop(0, '#78afbb');
  sky.addColorStop(0.43, '#b8cfb5');
  sky.addColorStop(0.8, '#e7d998');
  sky.addColorStop(1, '#c6bc66');
  context.fillStyle = sky;
  context.fillRect(0, 0, w, horizon + 100);

  const sunX = w * 0.16;
  const sunY = h * 0.17;
  const sun = context.createRadialGradient(sunX, sunY, 2, sunX, sunY, Math.max(w, h) * 0.42);
  sun.addColorStop(0, 'rgba(255, 250, 206, 0.82)');
  sun.addColorStop(0.18, 'rgba(255, 239, 165, 0.34)');
  sun.addColorStop(1, 'rgba(255, 233, 160, 0)');
  context.fillStyle = sun;
  context.fillRect(0, 0, w, horizon + 100);
  context.save();
  context.globalAlpha = 0.42;
  context.beginPath();
  context.arc(sunX, sunY, clamp(w * 0.023, 18, 34), 0, Math.PI * 2);
  context.fillStyle = '#fff3b8';
  context.fill();
  context.restore();
  drawCloudLayer(context, w, h);

  context.save();
  traceHill(context, w, h, horizon - 8, [
    { x: 0.18, y: -0.045 }, { x: 0.37, y: 0.018 }, { x: 0.6, y: -0.032 }, { x: 0.82, y: 0.014 }, { x: 1.05, y: -0.025 }
  ], 0.2);
  const farHill = context.createLinearGradient(0, horizon - 45, 0, horizon + 100);
  farHill.addColorStop(0, '#aaa84e');
  farHill.addColorStop(1, '#858b38');
  context.fillStyle = farHill;
  context.fill();
  drawDistantTrees(context, w, h, horizon + 8);

  traceHill(context, w, h, h * 0.61, [
    { x: 0.15, y: -0.025 }, { x: 0.42, y: 0.022 }, { x: 0.66, y: -0.032 }, { x: 0.91, y: 0.018 }, { x: 1.05, y: -0.016 }
  ], 1.1);
  const middleHill = context.createLinearGradient(0, h * 0.56, 0, h * 0.86);
  middleHill.addColorStop(0, '#89903a');
  middleHill.addColorStop(1, '#72792f');
  context.fillStyle = middleHill;
  context.fill();

  traceHill(context, w, h, h * 0.79, [
    { x: 0.2, y: -0.02 }, { x: 0.43, y: 0.035 }, { x: 0.64, y: -0.04 }, { x: 0.86, y: 0.025 }, { x: 1.05, y: -0.012 }
  ], 2.3);
  const nearHill = context.createLinearGradient(0, h * 0.72, 0, h);
  nearHill.addColorStop(0, '#69732d');
  nearHill.addColorStop(1, '#4d5925');
  context.fillStyle = nearHill;
  context.fill();

  const foregroundShade = context.createLinearGradient(0, h * 0.68, 0, h);
  foregroundShade.addColorStop(0, 'rgba(255, 233, 150, 0.02)');
  foregroundShade.addColorStop(1, 'rgba(40, 45, 17, 0.3)');
  context.fillStyle = foregroundShade;
  context.fillRect(0, h * 0.62, w, h * 0.38);
  context.restore();

  drawFieldTexture(context, w, h);
  drawGrassTufts(context, w, h);
  drawWildflowers(context, w, h);
}

function drawGrassTufts(context, w, h) {
  const count = Math.max(34, Math.floor(w / 42));
  context.save();
  context.lineCap = 'round';
  for (let index = 0; index < count; index += 1) {
    const seed = hashString(`grass-${index}`);
    const x = ((index + 0.35) / count) * w + (seed % 27) - 13;
    const y = h * (0.62 + ((seed >>> 5) % 36) / 100);
    const size = 8 + (seed % 12);
    const sway = Math.sin(elapsed * 0.75 + index) * 2;
    context.strokeStyle = index % 3 === 0 ? 'rgba(238, 220, 137, 0.24)' : 'rgba(64, 77, 29, 0.28)';
    context.lineWidth = 1.3;
    [-1, 0, 1].forEach(offset => {
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + offset * 3, y - size * 0.55, x + offset * 7 + sway, y - size);
      context.stroke();
    });
  }
  context.restore();
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initializeParticles();
  layoutPlants();
}

function initializeParticles() {
  particles.length = 0;
  for (let index = 0; index < 22; index += 1) particles.push(new PollenParticle(true));
  butterflies.length = 0;
  for (let index = 0; index < 3; index += 1) butterflies.push(new Butterfly(index));
}

function drawFrame(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastFrame) / 1000 || 0);
  lastFrame = timestamp;
  elapsed += dt;
  const celebrating = timestamp < celebrationUntil;
  const wind = state.isInteracting ? 0.62 : 0.18;

  ctx.clearRect(0, 0, width, height);
  drawGardenStage(ctx, width, height);
  layoutPlants();

  const desiredParticles = celebrating ? 58 : (state.isInteracting ? 34 : 22);
  while (particles.length < desiredParticles) particles.push(new PollenParticle(false, celebrating));
  while (particles.length > desiredParticles) particles.pop();
  particles.forEach(particle => {
    particle.tick(dt, wind, celebrating);
    particle.draw(ctx);
  });
  butterflies.forEach(butterfly => {
    butterfly.tick(dt);
    butterfly.draw(ctx);
  });

  plants.forEach((plant, key) => {
    plant.tick(dt);
    if (plant.targetGrowth === 0 && plant.currentGrowth < 0.015) plants.delete(key);
  });

  [...plants.values()]
    .sort((a, b) => a.y - b.y)
    .forEach(plant => plant.draw(ctx, wind));

  for (let index = growthParticles.length - 1; index >= 0; index -= 1) {
    const particle = growthParticles[index];
    particle.tick(dt);
    particle.draw(ctx);
    if (particle.done) growthParticles.splice(index, 1);
  }

  requestAnimationFrame(drawFrame);
}

async function pollRemoteState() {
  try {
    const response = await fetch(`/api/wall-state?session=${encodeURIComponent(WALL_SYNC_SESSION_ID)}`, { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    if (!payload || payload.version <= lastRemoteVersion) return;
    lastRemoteVersion = payload.version;
    handleWallEvent(payload.event);
  } catch (error) {
    if (!remoteUnavailableLogged) {
      console.info('Remote wall sync unavailable; waiting for local tabletop updates.', error);
      remoteUnavailableLogged = true;
    }
  }
}

function previewState() {
  handleStateUpdate({
    totalIdeas: 9,
    sessionTitle: 'Hoe maken we de buurt groener?',
    activeState: 'harvestMarket',
    groups: [
      { id: 20, title: 'Samen tuinieren', childCount: 4 },
      { id: 21, title: 'Groene ontmoetingsplek', childCount: 3 }
    ],
    soloIdeas: [
      { id: 7, title: 'Regenton delen' },
      { id: 8, title: 'Stekjesbibliotheek' }
    ],
    harvestMarket: {
      active: true,
      complete: false,
      stickers: [
        { participant: 1, tokenId: 20 },
        { participant: 2, tokenId: 20 },
        { participant: 3, tokenId: 20 },
        { participant: 1, tokenId: 21 },
        { participant: 4, tokenId: 7 }
      ],
      leaders: [{ id: 20, title: 'Samen tuinieren', votes: 3 }]
    },
    lastActivityTime: Date.now()
  });
}

function init() {
  resize();
  updateInterface();
  updateSyncStatus();
  window.addEventListener('resize', resize);
  window.addEventListener('storage', event => {
    if (event.key !== WALL_SYNC_STORAGE_KEY || !event.newValue) return;
    try {
      handleWallEvent(JSON.parse(event.newValue));
    } catch (error) {
      console.info('A local wall update could not be read.', error);
    }
  });
  channel?.addEventListener('message', event => handleWallEvent(event.data));
  readStoredWallState();
  channel?.postMessage({ type: 'request-state', sentAt: Date.now() });
  window.setTimeout(() => {
    if (!lastStateAt) channel?.postMessage({ type: 'request-state', sentAt: Date.now() });
  }, 1200);
  setInterval(updateSyncStatus, 1000);
  if (PREVIEW_MODE) previewState();
  else if (!LOCAL_DEV) {
    pollRemoteState();
    setInterval(pollRemoteState, 900);
  }
  requestAnimationFrame(drawFrame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
