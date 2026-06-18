// Establish local cross-tab communication, plus live polling for deployed screens.
let channel = null;
try {
  channel = new BroadcastChannel('mobus-session');
} catch (error) {
  console.info('Local wall BroadcastChannel unavailable; live sync will still be attempted.', error);
}

const WALL_SYNC_SESSION_ID = new URLSearchParams(window.location.search).get('session') || 'mobus-live';
let lastRemoteWallVersion = 0;
let remoteSyncUnavailableNoted = false;

const canvas = document.getElementById('wall-canvas');
const ctx = canvas.getContext('2d');
let width, height;

const SKY_TOP = '#dbeaf0';
const SKY_MID = '#eef4ef';
const SKY_BOTTOM = '#fff8eb';
const STEM_COLORS = ['#4c5a2a', '#61733b', '#6f735d', '#7c8a46'];
const LEAF_COLORS = ['#7f9148', '#9a9f55', '#6f8b4a', '#b3a766'];
const BLOSSOM_COLORS = ['#d9c89f', '#e6bfa9', '#c7d3a2', '#b8c9d9', '#e2d7b8'];
const MEADOW_COLORS = ['rgba(127, 145, 72, 0.48)', 'rgba(154, 159, 85, 0.4)', 'rgba(111, 115, 93, 0.34)'];

// Hashing helper for stable horizontal positions
function hashStringToNum(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Seeded PRNG for stable plant structures
function SeededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawLeaf(cContext, scale, color, variant = 0) {
  cContext.beginPath();
  if (variant === 1) {
    cContext.ellipse(0, -8 * scale, 3.8 * scale, 9 * scale, 0, 0, Math.PI * 2);
  } else if (variant === 2) {
    cContext.moveTo(0, 0);
    cContext.quadraticCurveTo(-8 * scale, -7 * scale, -3 * scale, -17 * scale);
    cContext.quadraticCurveTo(2 * scale, -13 * scale, 7 * scale, -17 * scale);
    cContext.quadraticCurveTo(8 * scale, -7 * scale, 0, 0);
  } else {
    cContext.moveTo(0, 0);
    cContext.quadraticCurveTo(-6 * scale, -7 * scale, -4 * scale, -15 * scale);
    cContext.quadraticCurveTo(0, -18 * scale, 4 * scale, -15 * scale);
    cContext.quadraticCurveTo(6 * scale, -7 * scale, 0, 0);
  }
  cContext.fillStyle = color;
  cContext.fill();
  cContext.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  cContext.lineWidth = 0.7 * scale;
  cContext.stroke();
}

function drawSimpleFlower(cContext, scale, color, petalCount = 5) {
  const petalSize = 5 * scale;
  cContext.fillStyle = color;
  for (let i = 0; i < petalCount; i++) {
    cContext.save();
    cContext.rotate((Math.PI * 2 * i) / petalCount);
    cContext.beginPath();
    cContext.ellipse(0, -petalSize, petalSize * 0.62, petalSize, 0, 0, Math.PI * 2);
    cContext.fill();
    cContext.restore();
  }
  cContext.beginPath();
  cContext.arc(0, 0, petalSize * 0.34, 0, Math.PI * 2);
  cContext.fillStyle = '#fffdf6';
  cContext.fill();
}

// Spore / Seed particle drifting across the landscape
class SeedParticle {
  constructor(w, h, randomizeX = true) {
    this.x = randomizeX ? Math.random() * w : -20;
    this.y = Math.random() * h * 0.8;
    this.vx = Math.random() * 15 + 15; // drift velocity right
    this.vy = (Math.random() - 0.4) * 8; // slow vertical wander
    this.scale = Math.random() * 0.5 + 0.4;
    this.phase = Math.random() * Math.PI * 2;
    this.opacity = Math.random() * 0.35 + 0.15;
  }

  tick(dt, windVal, w, h) {
    const windMultiplier = 1.0 + windVal * 5.0;
    this.x += this.vx * windMultiplier * dt;
    this.y += (this.vy + Math.sin(this.phase + this.x * 0.015) * 8) * dt;
    
    if (this.x > w + 20) {
      this.x = -20;
      this.y = Math.random() * h * 0.8;
    }
  }

  draw(cContext) {
    cContext.save();
    cContext.translate(this.x, this.y);
    cContext.beginPath();
    cContext.moveTo(0, 0);
    cContext.lineTo(-8 * this.scale, 8 * this.scale);
    cContext.strokeStyle = `rgba(111, 115, 93, ${this.opacity * 0.6})`;
    cContext.lineWidth = 1 * this.scale;
    cContext.stroke();

    cContext.beginPath();
    cContext.arc(0, 0, 3 * this.scale, 0, Math.PI * 2);
    cContext.fillStyle = `rgba(154, 159, 85, ${this.opacity})`;
    cContext.fill();
    cContext.restore();
  }
}

class Cloud {
  constructor(w, h, index) {
    this.index = index;
    this.x = [0.18, 0.48, 0.78, 1.08][index % 4] * w;
    this.y = h * ([0.12, 0.2, 0.15, 0.25][index % 4]);
    this.scale = [0.95, 1.18, 0.86, 1.05][index % 4];
    this.speed = 3.5 + index * 1.35;
    this.opacity = 0.38 + index * 0.025;
  }

  tick(dt, w, h) {
    this.x += this.speed * dt;
    if (this.x > w + 180 * this.scale) {
      this.x = -180 * this.scale;
      this.y = h * (0.1 + Math.random() * 0.18);
      this.scale = 0.9 + Math.random() * 0.34;
    }
  }

  draw(cContext) {
    const drawCloudShape = () => {
      cContext.beginPath();
      cContext.moveTo(-112, 16);
      cContext.bezierCurveTo(-104, -4, -76, -14, -50, 1);
      cContext.bezierCurveTo(-35, -32, 14, -42, 40, -9);
      cContext.bezierCurveTo(65, -23, 101, -10, 111, 16);
      cContext.bezierCurveTo(94, 35, -86, 39, -112, 16);
      cContext.closePath();
    };

    cContext.save();
    cContext.translate(this.x, this.y);
    cContext.scale(this.scale, this.scale);

    cContext.save();
    cContext.translate(0, 10);
    drawCloudShape();
    cContext.fillStyle = `rgba(120, 148, 151, ${this.opacity * 0.12})`;
    cContext.fill();
    cContext.restore();

    const cloudFill = cContext.createLinearGradient(0, -42, 0, 36);
    cloudFill.addColorStop(0, `rgba(255, 255, 250, ${this.opacity + 0.34})`);
    cloudFill.addColorStop(0.62, `rgba(255, 253, 246, ${this.opacity + 0.24})`);
    cloudFill.addColorStop(1, `rgba(235, 244, 241, ${this.opacity + 0.14})`);
    drawCloudShape();
    cContext.fillStyle = cloudFill;
    cContext.fill();

    cContext.save();
    cContext.translate(-12, -7);
    cContext.scale(0.78, 0.62);
    drawCloudShape();
    cContext.fillStyle = `rgba(255, 255, 255, ${this.opacity * 0.16})`;
    cContext.fill();
    cContext.restore();

    cContext.beginPath();
    cContext.moveTo(-84, 2);
    cContext.bezierCurveTo(-55, -14, -24, -6, -5, -17);
    cContext.bezierCurveTo(25, -33, 48, -16, 66, -7);
    cContext.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.46})`;
    cContext.lineWidth = 1.4;
    cContext.lineCap = 'round';
    cContext.stroke();

    cContext.restore();
  }
}

// Cluster Plant representing an idea group / cluster
class ClusterPlant {
  constructor(title, childCount) {
    this.title = title;
    this.childCount = childCount;
    this.currentGrowth = 0;
    this.targetGrowth = 1;
    this.wiggleOffset = Math.random() * Math.PI * 2;
    this.x = 0;
    this.randomSeed = hashStringToNum(title) || 123;
    this.styleSeed = this.randomSeed % 5;
    this.stemColor = STEM_COLORS[this.randomSeed % STEM_COLORS.length];
    this.leafColor = LEAF_COLORS[(this.randomSeed >> 2) % LEAF_COLORS.length];
    this.branches = [];
    this.blossoms = [];
    this.generateStructure();
  }

  update(childCount) {
    if (this.childCount !== childCount) {
      this.childCount = childCount;
      this.generateStructure();
    }
    this.targetGrowth = 1;
  }

  generateStructure() {
    const rng = SeededRandom(this.randomSeed);
    this.branches = [];
    this.blossoms = [];

    // Trunk height matches count of children in cluster
    const mainHeight = 70 + Math.min(110, this.childCount * 18) + rng() * 25;
    const childRichness = clamp(this.childCount, 2, 8);
    
    // Main Trunk
    this.branches.push({
      id: 0,
      startX: 0, startY: 0,
      cpX: (rng() - 0.5) * 15, cpY: -mainHeight * 0.4,
      endX: (rng() - 0.5) * 10, endY: -mainHeight,
      width: 5 + Math.min(5, this.childCount * 0.7),
      growthDelay: 0,
      growthDuration: 0.5
    });

    const mainTrunk = this.branches[0];
    
    // Split into secondary stems
    const branchCount = 2 + Math.floor(rng() * 2) + Math.min(4, Math.floor(this.childCount / 2));
    for (let i = 0; i < branchCount; i++) {
      const angle = (-42 + (i / (branchCount - 1)) * 84 + (rng() - 0.5) * 10) * Math.PI / 180;
      const length = mainHeight * (0.45 + rng() * 0.35);
      const bX = mainTrunk.endX;
      const bY = mainTrunk.endY;
      const eX = bX + Math.sin(angle) * length;
      const eY = bY - Math.cos(angle) * length;
      const bIdx = this.branches.length;
      
      this.branches.push({
        id: bIdx,
        startX: bX, startY: bY,
        cpX: bX + Math.sin(angle) * length * 0.4 + (rng() - 0.5) * 8,
        cpY: bY - Math.cos(angle) * length * 0.4,
        endX: eX, endY: eY,
        width: mainTrunk.width * 0.6,
        growthDelay: 0.25,
        growthDuration: 0.4
      });

      // Twigs branching further
      const twigCount = 1 + Math.floor(rng() * 2) + (childRichness > 5 ? 1 : 0);
      for (let j = 0; j < twigCount; j++) {
        const tAngle = angle + (rng() - 0.5) * 55 * Math.PI / 180;
        const tLength = length * (0.45 + rng() * 0.25);
        const tRatio = 0.35 + rng() * 0.5;
        const sX = bX + (eX - bX) * tRatio;
        const sY = bY + (eY - bY) * tRatio;
        const teX = sX + Math.sin(tAngle) * tLength;
        const teY = sY - Math.cos(tAngle) * tLength;
        
        this.branches.push({
          id: this.branches.length,
          startX: sX, startY: sY,
          cpX: sX + Math.sin(tAngle) * tLength * 0.5,
          cpY: sY - Math.cos(tAngle) * tLength * 0.5,
          endX: teX, endY: teY,
          width: mainTrunk.width * 0.35,
          growthDelay: 0.45,
          growthDuration: 0.3,
          parentId: bIdx,
          parentRatio: tRatio
        });
      }
    }

    // Attach leaves and flower blossoms to the branch nodes
    this.branches.forEach((b, idx) => {
      if (idx === 0) return; // trunk stays clear
      
      // Leaves along branches
      const numLeaves = 2 + Math.floor(rng() * 3);
      for (let l = 0; l < numLeaves; l++) {
        const ratio = 0.3 + (l / numLeaves) * 0.65;
        const angleOffset = (rng() > 0.5 ? 42 : -42) + (rng() - 0.5) * 12;
        this.blossoms.push({
          type: 'leaf',
          branchId: b.id,
          ratio: ratio,
          angleOffset: angleOffset * Math.PI / 180,
          scale: 0.75 + rng() * 0.35,
          variant: Math.floor(rng() * 3),
          color: LEAF_COLORS[Math.floor(rng() * LEAF_COLORS.length)],
          growthDelay: b.growthDelay + 0.15 + rng() * 0.2
        });
      }

      // Blossoms opening at twig ends
      if (idx > 1 && rng() > 0.35) {
        this.blossoms.push({
          type: 'flower',
          branchId: b.id,
          ratio: 1.0,
          angleOffset: (rng() - 0.5) * 25 * Math.PI / 180,
          scale: 1.1 + rng() * 0.4,
          colorIdx: Math.floor(rng() * BLOSSOM_COLORS.length),
          petalCount: 4 + Math.floor(rng() * 3),
          growthDelay: b.growthDelay + 0.35 + rng() * 0.15
        });
      }
    });
  }

  tick(dt) {
    if (this.currentGrowth < this.targetGrowth) {
      this.currentGrowth = Math.min(this.targetGrowth, this.currentGrowth + dt * 0.9);
    } else if (this.currentGrowth > this.targetGrowth) {
      this.currentGrowth = Math.max(this.targetGrowth, this.currentGrowth - dt * 1.4);
    }
  }

  draw(cContext, w, h, windVal, time) {
    this.x = 0.15 * w + (hashStringToNum(this.title) % 100) / 100 * (0.7 * w);
    const groundY = h * 0.88;
    
    cContext.save();
    cContext.translate(this.x, groundY);
    
    // Label under the soil bed
    cContext.fillStyle = 'rgba(53, 64, 31, 0.4)';
    cContext.font = '500 11px Outfit, sans-serif';
    cContext.textAlign = 'center';
    cContext.fillText(this.title, 0, 24);

    const swayedNodes = {};

    this.branches.forEach(b => {
      let startX = b.startX;
      let startY = b.startY;
      
      if (b.parentId !== undefined) {
        const parentNode = swayedNodes[b.parentId];
        if (parentNode) {
          const t = b.parentRatio;
          startX = (1-t)*(1-t)*parentNode.startX + 2*(1-t)*t*parentNode.cpX + t*t*parentNode.endX;
          startY = (1-t)*(1-t)*parentNode.startY + 2*(1-t)*t*parentNode.cpY + t*t*parentNode.endY;
        }
      } else if (b.id > 0) {
        const parentNode = swayedNodes[0];
        if (parentNode) {
          startX = parentNode.endX;
          startY = parentNode.endY;
        }
      }
      
      // Calculate wind sway offset based on height
      const swayFactor = (-b.endY / 150) * 18;
      const sway = Math.sin(time * 2.2 + this.wiggleOffset) * windVal * swayFactor;
      
      const curEndX = b.endX + sway;
      const curEndY = b.endY;
      const curCpX = b.cpX + sway * 0.5;
      const curCpY = b.cpY;
      
      swayedNodes[b.id] = {
        startX: startX,
        startY: startY,
        cpX: curCpX,
        cpY: curCpY,
        endX: curEndX,
        endY: curEndY
      };
      
      const plantGrowth = this.currentGrowth;
      const branchGrowth = Math.max(0, Math.min(1, (plantGrowth - b.growthDelay) / b.growthDuration));
      
      if (branchGrowth <= 0) return;
      
      cContext.beginPath();
      cContext.moveTo(startX, startY);
      
      if (branchGrowth === 1) {
        cContext.quadraticCurveTo(curCpX, curCpY, curEndX, curEndY);
      } else {
        const t = branchGrowth;
        const xAtT = (1-t)*(1-t)*startX + 2*(1-t)*t*curCpX + t*t*curEndX;
        const yAtT = (1-t)*(1-t)*startY + 2*(1-t)*t*curCpY + t*t*curEndY;
        const cpXAtT = (1-t)*startX + t*curCpX;
        const cpYAtT = (1-t)*startY + t*curCpY;
        cContext.quadraticCurveTo(cpXAtT, cpYAtT, xAtT, yAtT);
      }
      
      cContext.strokeStyle = this.stemColor;
      cContext.lineWidth = b.width * (0.5 + 0.5 * branchGrowth);
      cContext.lineCap = 'round';
      cContext.stroke();
    });

    this.blossoms.forEach(bl => {
      const bNode = swayedNodes[bl.branchId];
      if (!bNode) return;
      
      const b = this.branches.find(br => br.id === bl.branchId);
      const plantGrowth = this.currentGrowth;
      const branchGrowth = Math.max(0, Math.min(1, (plantGrowth - b.growthDelay) / b.growthDuration));
      if (branchGrowth < bl.ratio) return;
      
      const t = bl.ratio * branchGrowth;
      const x = (1-t)*(1-t)*bNode.startX + 2*(1-t)*t*bNode.cpX + t*t*bNode.endX;
      const y = (1-t)*(1-t)*bNode.startY + 2*(1-t)*t*bNode.cpY + t*t*bNode.endY;
      
      const tx = 2*(1-t)*(bNode.cpX - bNode.startX) + 2*t*(bNode.endX - bNode.cpX);
      const ty = 2*(1-t)*(bNode.cpY - bNode.startY) + 2*t*(bNode.endY - bNode.cpY);
      const baseAngle = Math.atan2(ty, tx) + Math.PI/2;
      
      const blGrowth = Math.max(0, Math.min(1, (plantGrowth - bl.growthDelay) / 0.25));
      if (blGrowth <= 0) return;
      
      const finalScale = bl.scale * blGrowth;
      
      cContext.save();
      cContext.translate(x, y);
      cContext.rotate(baseAngle + bl.angleOffset);
      
      if (bl.type === 'leaf') {
        drawLeaf(cContext, finalScale, bl.color || this.leafColor, bl.variant || 0);
      } else {
        drawSimpleFlower(cContext, finalScale, BLOSSOM_COLORS[bl.colorIdx % BLOSSOM_COLORS.length], bl.petalCount || 5);
      }
      cContext.restore();
    });

    cContext.restore();
  }
}

// Solo Sprout representing individual ideas
class SoloSprout {
  constructor(title) {
    this.title = title;
    this.currentGrowth = 0;
    this.targetGrowth = 1;
    this.wiggleOffset = Math.random() * Math.PI * 2;
    this.x = 0;
    this.randomSeed = hashStringToNum(title) || 456;
    this.variant = this.randomSeed % 4;
    this.leafColor = LEAF_COLORS[this.randomSeed % LEAF_COLORS.length];
    this.stemColor = STEM_COLORS[(this.randomSeed >> 3) % STEM_COLORS.length];
    this.baseHeight = 24 + (this.randomSeed % 16);
  }

  tick(dt) {
    if (this.currentGrowth < this.targetGrowth) {
      this.currentGrowth = Math.min(this.targetGrowth, this.currentGrowth + dt * 1.1);
    } else if (this.currentGrowth > this.targetGrowth) {
      this.currentGrowth = Math.max(this.targetGrowth, this.currentGrowth - dt * 1.5);
    }
  }

  draw(cContext, w, h, windVal, time) {
    this.x = 0.15 * w + (hashStringToNum(this.title) % 100) / 100 * (0.7 * w);
    const groundY = h * 0.88;
    
    cContext.save();
    cContext.translate(this.x, groundY);

    // Label under the soil bed
    cContext.fillStyle = 'rgba(53, 64, 31, 0.3)';
    cContext.font = '500 10px Outfit, sans-serif';
    cContext.textAlign = 'center';
    cContext.fillText(this.title, 0, 18);

    const growth = this.currentGrowth;
    if (growth <= 0) {
      cContext.restore();
      return;
    }

    const sproutHeight = this.baseHeight * growth;
    const sway = Math.sin(time * 2.6 + this.wiggleOffset) * windVal * 6;
    
    // Draw sprout stem (thin light green curve)
    cContext.beginPath();
    cContext.moveTo(0, 0);
    cContext.quadraticCurveTo(sway * 0.5, -sproutHeight * 0.5, sway, -sproutHeight);
    cContext.strokeStyle = this.stemColor;
    cContext.lineWidth = 1.8 + (this.variant === 3 ? 0.5 : 0);
    cContext.stroke();

    cContext.translate(sway, -sproutHeight);

    if (this.variant === 0) {
      cContext.save();
      cContext.rotate(-Math.PI / 4 + sway * 0.05);
      drawLeaf(cContext, growth * 0.42, this.leafColor, 1);
      cContext.restore();

      cContext.save();
      cContext.rotate(Math.PI / 4 + sway * 0.05);
      drawLeaf(cContext, growth * 0.42, this.leafColor, 1);
      cContext.restore();
    } else if (this.variant === 1) {
      for (let i = 0; i < 3; i++) {
        cContext.save();
        cContext.translate((i - 1) * 4 * growth, i * 2 * growth);
        cContext.rotate((-0.35 + i * 0.35) + sway * 0.04);
        drawLeaf(cContext, growth * 0.32, this.leafColor, i % 2);
        cContext.restore();
      }
    } else if (this.variant === 2) {
      cContext.save();
      cContext.rotate(-0.18 + sway * 0.04);
      drawLeaf(cContext, growth * 0.34, this.leafColor, 2);
      cContext.restore();
      cContext.save();
      cContext.translate(0, -7 * growth);
      drawSimpleFlower(cContext, growth * 0.55, BLOSSOM_COLORS[this.randomSeed % BLOSSOM_COLORS.length], 4);
      cContext.restore();
    } else {
      for (let i = 0; i < 4; i++) {
        cContext.save();
        cContext.translate(0, -i * 4 * growth);
        cContext.rotate((i % 2 === 0 ? -0.58 : 0.58) + sway * 0.04);
        drawLeaf(cContext, growth * 0.26, this.leafColor, 0);
        cContext.restore();
      }
    }

    cContext.restore();
  }
}

// Global visual elements arrays
const activePlants = new Map();
const activeSprouts = new Map();
const activeConnections = new Map();
const particles = [];
const clouds = [];

let globalTime = 0;
let currentWind = 0.15;
let isInteracting = false;

// Look up horizontal coordinate of any plant / sprout
function getPlantX(title) {
  if (activePlants.has(title)) {
    return activePlants.get(title).x;
  }
  if (activeSprouts.has(title)) {
    return activeSprouts.get(title).x;
  }
  return null;
}

// Initialize particles pool
function initParticles() {
  particles.length = 0;
  for (let i = 0; i < 20; i++) {
    particles.push(new SeedParticle(width, height, true));
  }
}

function initClouds() {
  clouds.length = 0;
  for (let i = 0; i < 4; i++) {
    clouds.push(new Cloud(width, height, i));
  }
}

function drawSky(cContext, w, h) {
  const sky = cContext.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(0.42, SKY_MID);
  sky.addColorStop(0.82, SKY_BOTTOM);
  sky.addColorStop(1, '#efe5d2');
  cContext.fillStyle = sky;
  cContext.fillRect(0, 0, w, h);

  const glow = cContext.createRadialGradient(w * 0.18, h * 0.12, 0, w * 0.18, h * 0.12, w * 0.8);
  glow.addColorStop(0, 'rgba(255, 253, 246, 0.48)');
  glow.addColorStop(0.42, 'rgba(255, 253, 246, 0.16)');
  glow.addColorStop(1, 'rgba(255, 253, 246, 0)');
  cContext.fillStyle = glow;
  cContext.fillRect(0, 0, w, h);
}

function drawClouds(cContext, dt, w, h) {
  clouds.forEach(cloud => {
    cloud.tick(dt, w, h);
    cloud.draw(cContext);
  });
}

// Draw root connections and aerial vines
function drawConnections(cContext, w, h, time) {
  const groundY = h * 0.88;
  
  for (let [key, conn] of activeConnections.entries()) {
    if (conn.currentGrowth <= 0) continue;
    
    const x1 = getPlantX(conn.sourceTitle);
    const x2 = getPlantX(conn.targetTitle);
    
    if (x1 === null || x2 === null) continue;
    
    const grow = conn.currentGrowth;
    const midX = (x1 + x2) / 2;
    
    // Draw Root Line (below ground)
    cContext.save();
    cContext.beginPath();
    cContext.moveTo(x1, groundY);
    
    const depth = groundY + 25 + Math.min(70, Math.abs(x1 - x2) * 0.18);
    cContext.bezierCurveTo(x1, depth, x2, depth, x2, groundY);
    
    cContext.strokeStyle = 'rgba(76, 90, 42, 0.12)'; // roots color
    cContext.lineWidth = 2.5 * grow;
    cContext.stroke();
    cContext.restore();
    
    // Draw Vine connection (above ground)
    cContext.save();
    cContext.beginPath();
    cContext.moveTo(x1, groundY - 8);
    
    const vineCpX = midX + Math.sin(time * 1.1 + hashStringToNum(key)) * 12;
    const vineCpY = groundY - 50 - Math.min(85, Math.abs(x1 - x2) * 0.22);
    
    if (grow === 1) {
      cContext.quadraticCurveTo(vineCpX, vineCpY, x2, groundY - 8);
    } else {
      const t = grow;
      const xAtT = (1-t)*(1-t)*x1 + 2*(1-t)*t*vineCpX + t*t*x2;
      const yAtT = (1-t)*(1-t)*(groundY-8) + 2*(1-t)*t*vineCpY + t*t*(groundY-8);
      const cpXAtT = (1-t)*x1 + t*vineCpX;
      const cpYAtT = (1-t)*(groundY-8) + t*vineCpY;
      cContext.quadraticCurveTo(cpXAtT, cpYAtT, xAtT, yAtT);
    }
    
    cContext.strokeStyle = 'rgba(154, 159, 85, 0.26)'; // sage vine
    cContext.lineWidth = 1.6 * grow;
    cContext.stroke();
    cContext.restore();
  }
}

// Draw layered mossy hills
function drawGround(cContext, w, h) {
  const groundY = h * 0.88;
  cContext.save();
  
  // Back Ground Hill
  cContext.beginPath();
  cContext.moveTo(0, h);
  cContext.lineTo(0, groundY + 15);
  cContext.quadraticCurveTo(w * 0.25, groundY - 5, w * 0.5, groundY + 10);
  cContext.quadraticCurveTo(w * 0.75, groundY + 22, w, groundY + 5);
  cContext.lineTo(w, h);
  cContext.fillStyle = '#dfd9c8'; // Tan beige
  cContext.fill();

  // Mid Ground Hill
  cContext.beginPath();
  cContext.moveTo(0, h);
  cContext.lineTo(0, groundY + 5);
  cContext.quadraticCurveTo(w * 0.35, groundY + 14, w * 0.65, groundY - 8);
  cContext.quadraticCurveTo(w * 0.85, groundY + 5, w, groundY - 2);
  cContext.lineTo(w, h);
  cContext.fillStyle = '#ebd5c0'; // Clay color
  cContext.fill();

  // Foreground Hill
  cContext.beginPath();
  cContext.moveTo(0, h);
  cContext.lineTo(0, groundY);
  cContext.quadraticCurveTo(w * 0.2, groundY + 8, w * 0.45, groundY - 5);
  cContext.quadraticCurveTo(w * 0.7, groundY + 12, w, groundY);
  cContext.lineTo(w, h);
  cContext.fillStyle = '#dcd7c5'; // Sage mud
  cContext.fill();
  
  cContext.restore();
}

function drawMeadowDetails(cContext, w, h, time, windVal) {
  const groundY = h * 0.88;
  const detailCount = Math.max(42, Math.floor(w / 24));

  cContext.save();
  for (let i = 0; i < detailCount; i++) {
    const seed = (i * 92821 + 17) % 9973;
    const x = (i / detailCount) * w + ((seed % 37) - 18);
    const baseY = groundY + 8 + (seed % 54);
    const heightVal = 18 + (seed % 38);
    const sway = Math.sin(time * 1.4 + seed) * windVal * 4;
    const color = MEADOW_COLORS[seed % MEADOW_COLORS.length];

    cContext.strokeStyle = color;
    cContext.lineWidth = 1.15 + (seed % 3) * 0.22;
    cContext.lineCap = 'round';
    cContext.beginPath();
    cContext.moveTo(x, baseY);
    cContext.quadraticCurveTo(x + sway * 0.5, baseY - heightVal * 0.55, x + sway, baseY - heightVal);
    cContext.stroke();

    if (seed % 5 === 0) {
      cContext.save();
      cContext.translate(x + sway * 0.45, baseY - heightVal * 0.42);
      cContext.rotate(seed % 2 === 0 ? 0.62 : -0.62);
      drawLeaf(cContext, 0.24 + (seed % 4) * 0.035, LEAF_COLORS[(seed + 1) % LEAF_COLORS.length], 1);
      cContext.restore();
    }

    if (seed % 3 === 0) {
      cContext.save();
      cContext.translate(x + sway, baseY - heightVal * 0.68);
      cContext.rotate(seed % 2 === 0 ? -0.65 : 0.65);
      drawLeaf(cContext, 0.32 + (seed % 5) * 0.04, LEAF_COLORS[seed % LEAF_COLORS.length], seed % 3);
      cContext.restore();
    }

    if (seed % 9 === 0) {
      cContext.save();
      cContext.translate(x + sway, baseY - heightVal - 2);
      drawSimpleFlower(cContext, 0.42, BLOSSOM_COLORS[seed % BLOSSOM_COLORS.length], 4);
      cContext.restore();
    }
  }

  const tuftCount = Math.max(8, Math.floor(w / 150));
  for (let t = 0; t < tuftCount; t++) {
    const seed = (t * 7151 + 311) % 8191;
    const x = (t + 0.5) * (w / tuftCount) + ((seed % 61) - 30);
    const baseY = groundY + 28 + (seed % 34);
    const stems = 4 + (seed % 4);
    for (let s = 0; s < stems; s++) {
      const spread = (s - (stems - 1) / 2) * 7;
      const heightVal = 34 + ((seed + s * 13) % 42);
      const sway = Math.sin(time * 1.2 + seed + s) * windVal * 5;
      cContext.strokeStyle = MEADOW_COLORS[(seed + s) % MEADOW_COLORS.length];
      cContext.lineWidth = 1.6;
      cContext.beginPath();
      cContext.moveTo(x, baseY);
      cContext.quadraticCurveTo(x + spread * 0.4 + sway, baseY - heightVal * 0.55, x + spread + sway, baseY - heightVal);
      cContext.stroke();

      if (s % 2 === 0) {
        cContext.save();
        cContext.translate(x + spread + sway, baseY - heightVal * 0.72);
        cContext.rotate(spread < 0 ? -0.7 : 0.7);
        drawLeaf(cContext, 0.36, LEAF_COLORS[(seed + s) % LEAF_COLORS.length], (seed + s) % 3);
        cContext.restore();
      }
    }
  }
  cContext.restore();
}

// Draw sunbeams radiating from the sky
function drawSunrays(cContext, w, h, time) {
  cContext.save();
  const numRays = 4;
  cContext.fillStyle = 'rgba(255, 253, 246, 0.08)';
  
  for (let i = 0; i < numRays; i++) {
    const angleStart = 0.15 + (i * 0.15) + Math.sin(time * 0.15 + i) * 0.02;
    const widthAngle = 0.07 + Math.cos(time * 0.25 + i) * 0.01;
    
    cContext.beginPath();
    cContext.moveTo(0, 0);
    
    const x1 = Math.cos(angleStart * Math.PI) * w * 1.5;
    const y1 = Math.sin(angleStart * Math.PI) * h * 1.5;
    
    const x2 = Math.cos((angleStart + widthAngle) * Math.PI) * w * 1.5;
    const y2 = Math.sin((angleStart + widthAngle) * Math.PI) * h * 1.5;
    
    cContext.lineTo(x1, y1);
    cContext.lineTo(x2, y2);
    cContext.closePath();
    cContext.fill();
  }
  
  cContext.restore();
}

// Canvas size resize
function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
}

// State Synchronization from tabletop
function handleStateUpdate(data) {
  const { groups: newGroups = [], soloIdeas = [], createdConnections: newConns = [], isInteracting: interactionActive = false } = data;
  isInteracting = interactionActive;

  // Sync cluster plants
  const currentGroupTitles = new Set();
  newGroups.forEach(g => {
    currentGroupTitles.add(g.title);
    if (activePlants.has(g.title)) {
      activePlants.get(g.title).update(g.childCount);
    } else {
      activePlants.set(g.title, new ClusterPlant(g.title, g.childCount));
    }
  });

  for (let [title, plant] of activePlants.entries()) {
    if (!currentGroupTitles.has(title)) {
      plant.targetGrowth = 0;
    }
  }

  // Sync solo sprouts
  const currentSoloTitles = new Set();
  soloIdeas.forEach(s => {
    currentSoloTitles.add(s.title);
    if (activeSprouts.has(s.title)) {
      activeSprouts.get(s.title).targetGrowth = 1;
    } else {
      activeSprouts.set(s.title, new SoloSprout(s.title));
    }
  });

  for (let [title, sprout] of activeSprouts.entries()) {
    if (!currentSoloTitles.has(title)) {
      sprout.targetGrowth = 0;
    }
  }

  // Sync connections
  const currentConnKeys = new Set();
  newConns.forEach(c => {
    const key = `${c.source}->${c.target}`;
    currentConnKeys.add(key);
    if (!activeConnections.has(key)) {
      activeConnections.set(key, {
        key,
        sourceTitle: c.source,
        targetTitle: c.target,
        currentGrowth: 0,
        targetGrowth: 1
      });
    } else {
      activeConnections.get(key).targetGrowth = 1;
    }
  });

  for (let [key, conn] of activeConnections.entries()) {
    if (!currentConnKeys.has(key)) {
      conn.targetGrowth = 0;
    }
  }
}

// Reset the entire ecosystem
function resetEcosystem() {
  activePlants.forEach(plant => plant.targetGrowth = 0);
  activeSprouts.forEach(sprout => sprout.targetGrowth = 0);
  activeConnections.forEach(conn => conn.targetGrowth = 0);
  isInteracting = false;
}

function handleWallEvent(event) {
  if (!event || typeof event.type !== 'string') return;
  const { type, data } = event;

  if (type === 'state-update') {
    handleStateUpdate(data);
  } else if (type === 'reset') {
    resetEcosystem();
  }
}

// Listen for updates from Main tabletop screen in the same browser.
if (channel) {
  channel.onmessage = (event) => {
    handleWallEvent(event.data);
  };
}

async function pollRemoteWallState() {
  try {
    const response = await fetch(`/api/wall-state?session=${encodeURIComponent(WALL_SYNC_SESSION_ID)}`, {
      cache: 'no-store'
    });
    if (!response.ok) return;

    const payload = await response.json();
    if (!payload || payload.version <= lastRemoteWallVersion) return;

    lastRemoteWallVersion = payload.version;
    handleWallEvent(payload.event);
  } catch (error) {
    if (!remoteSyncUnavailableNoted) {
      console.info('Live wall sync unavailable; waiting for local BroadcastChannel updates.', error);
      remoteSyncUnavailableNoted = true;
    }
  }
}

// Main tick loop
let lastFrameTime = performance.now();
function loop(timestamp) {
  const dt = Math.min(0.1, (timestamp - lastFrameTime) / 1000);
  lastFrameTime = timestamp;
  globalTime += dt;

  // Dynamically calculate wind strength based on collaboration activity
  const windTarget = isInteracting ? 0.65 + Math.sin(globalTime * 3.8) * 0.22 : 0.14 + Math.sin(globalTime * 0.7) * 0.04;
  currentWind += (windTarget - currentWind) * dt * 2.2;

  ctx.clearRect(0, 0, width, height);

  drawSky(ctx, width, height);
  drawSunrays(ctx, width, height, globalTime);
  drawClouds(ctx, dt, width, height);

  // Maintain floating seed particles
  const maxParticles = isInteracting ? 36 : 16;
  while (particles.length < maxParticles) {
    particles.push(new SeedParticle(width, height, false));
  }
  while (particles.length > maxParticles) {
    particles.pop();
  }

  particles.forEach(p => {
    p.tick(dt, currentWind, width, height);
    p.draw(ctx);
  });

  // Tick entity objects
  for (let [title, plant] of activePlants.entries()) {
    plant.tick(dt);
    if (plant.currentGrowth <= 0 && plant.targetGrowth === 0) {
      activePlants.delete(title);
    }
  }

  for (let [title, sprout] of activeSprouts.entries()) {
    sprout.tick(dt);
    if (sprout.currentGrowth <= 0 && sprout.targetGrowth === 0) {
      activeSprouts.delete(title);
    }
  }

  for (let [key, conn] of activeConnections.entries()) {
    if (conn.currentGrowth < conn.targetGrowth) {
      conn.currentGrowth = Math.min(conn.targetGrowth, conn.currentGrowth + dt * 0.8);
    } else if (conn.currentGrowth > conn.targetGrowth) {
      conn.currentGrowth = Math.max(conn.targetGrowth, conn.currentGrowth - dt * 1.4);
    }
    if (conn.currentGrowth <= 0 && conn.targetGrowth === 0) {
      activeConnections.delete(key);
    }
  }

  // Draw roots and vines before the visible meadow layer.
  drawConnections(ctx, width, height, globalTime);

  // Layered terrain and small meadow details
  drawGround(ctx, width, height);
  drawMeadowDetails(ctx, width, height, globalTime, currentWind);

  // Draw active sprouts and cluster plants above the terrain.
  activePlants.forEach(plant => {
    plant.draw(ctx, width, height, currentWind, globalTime);
  });

  activeSprouts.forEach(sprout => {
    sprout.draw(ctx, width, height, currentWind, globalTime);
  });

  requestAnimationFrame(loop);
}

// Initial Setup with readyState check to handle module script deferred execution
function init() {
  resize();
  initParticles();
  initClouds();
  pollRemoteWallState();
  setInterval(pollRemoteWallState, 900);
  window.addEventListener('resize', () => {
    resize();
    initParticles();
    initClouds();
  });
  requestAnimationFrame(loop);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  window.addEventListener('DOMContentLoaded', init);
}
