export function generateDisplayTitle(text, limit = 50) {
  if (!text) return '';
  if (text.length <= limit) return text;
  let truncated = text.substring(0, limit - 5);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) {
    truncated = truncated.substring(0, lastSpace);
  }
  return truncated + '...';
}

const SPROUT_ASSETS = Array.from({ length: 6 }, (_, index) => `/assets/farm/sprout-v${index + 1}.png`);

function createShapeProfile(width, height, horizontalRadii, verticalRadii) {
  return {
    width,
    height,
    horizontalRadii,
    verticalRadii,
    radius: `${horizontalRadii.join('% ')}% / ${verticalRadii.join('% ')}%`
  };
}

const ORGANIC_SHAPE_PROFILES = [
  createShapeProfile(222, 104, [56, 44, 52, 48], [58, 46, 54, 42]),
  createShapeProfile(174, 136, [48, 52, 57, 43], [52, 61, 39, 48]),
  createShapeProfile(202, 120, [63, 37, 48, 52], [47, 58, 42, 53]),
  createShapeProfile(188, 128, [44, 56, 39, 61], [62, 47, 53, 38]),
  createShapeProfile(228, 100, [42, 58, 60, 40], [52, 64, 36, 48]),
  createShapeProfile(182, 132, [60, 40, 55, 45], [59, 43, 57, 41]),
  createShapeProfile(212, 110, [51, 49, 64, 36], [45, 60, 40, 55]),
  createShapeProfile(176, 130, [38, 62, 47, 53], [56, 40, 60, 44])
];

function getEllipseOffset(position, center, radius) {
  const normalizedOffset = Math.max(-1, Math.min(1, (position - center) / radius));
  return Math.sqrt(1 - normalizedOffset ** 2);
}

function createBorderPoint(profile, x, y, centerX, centerY, radiusX, radiusY) {
  const deltaX = ((x - centerX) / 100) * profile.width;
  const deltaY = ((y - centerY) / 100) * profile.height;
  const pixelRadiusX = (radiusX / 100) * profile.width;
  const pixelRadiusY = (radiusY / 100) * profile.height;
  const gradientX = deltaX / pixelRadiusX ** 2;
  const gradientY = deltaY / pixelRadiusY ** 2;
  const gradientLength = Math.hypot(gradientX, gradientY) || 1;
  const normalX = gradientX / gradientLength;
  const normalY = gradientY / gradientLength;

  return {
    x,
    y,
    normalX,
    normalY,
    rotation: Math.atan2(normalY, normalX) * (180 / Math.PI) + 90
  };
}

function getBorderPoint(profile, side, position) {
  const [topLeftX, topRightX, bottomRightX, bottomLeftX] = profile.horizontalRadii;
  const [topLeftY, topRightY, bottomRightY, bottomLeftY] = profile.verticalRadii;

  if (side === 'top') {
    if (position <= topLeftX) {
      const y = topLeftY * (1 - getEllipseOffset(position, topLeftX, topLeftX));
      return createBorderPoint(profile, position, y, topLeftX, topLeftY, topLeftX, topLeftY);
    }
    const y = topRightY * (1 - getEllipseOffset(position, 100 - topRightX, topRightX));
    return createBorderPoint(profile, position, y, 100 - topRightX, topRightY, topRightX, topRightY);
  }

  if (side === 'bottom') {
    if (position <= bottomLeftX) {
      const y = 100 - bottomLeftY * (1 - getEllipseOffset(position, bottomLeftX, bottomLeftX));
      return createBorderPoint(profile, position, y, bottomLeftX, 100 - bottomLeftY, bottomLeftX, bottomLeftY);
    }
    const y = 100 - bottomRightY * (1 - getEllipseOffset(position, 100 - bottomRightX, bottomRightX));
    return createBorderPoint(profile, position, y, 100 - bottomRightX, 100 - bottomRightY, bottomRightX, bottomRightY);
  }

  if (side === 'left') {
    if (position <= topLeftY) {
      const x = topLeftX * (1 - getEllipseOffset(position, topLeftY, topLeftY));
      return createBorderPoint(profile, x, position, topLeftX, topLeftY, topLeftX, topLeftY);
    }
    const x = bottomLeftX * (1 - getEllipseOffset(position, 100 - bottomLeftY, bottomLeftY));
    return createBorderPoint(profile, x, position, bottomLeftX, 100 - bottomLeftY, bottomLeftX, bottomLeftY);
  }

  if (position <= topRightY) {
    const x = 100 - topRightX * (1 - getEllipseOffset(position, topRightY, topRightY));
    return createBorderPoint(profile, x, position, 100 - topRightX, topRightY, topRightX, topRightY);
  }
  const x = 100 - bottomRightX * (1 - getEllipseOffset(position, 100 - bottomRightY, bottomRightY));
  return createBorderPoint(profile, x, position, 100 - bottomRightX, 100 - bottomRightY, bottomRightX, bottomRightY);
}

function getStableIndex(value, length) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function createSeededRandom(value) {
  let seed = 2166136261;
  for (const character of String(value)) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let result = seed;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export class Token {
  constructor(id, x, y, rotation, title = "Plant idee", onStateChange) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.rotation = rotation; // degrees
    this.scale = 1.0;
    this.baseWidth = 190;
    this.baseHeight = 108;
    this.title = title;
    this.displayTitle = generateDisplayTitle(title);
    this.selected = false;
    this.editing = false;
    this.isDragging = false;
    this.isRooted = true;
    this.dragLocked = false;
    this.isHoveringBin = false;
    this.isChild = false;
    this.parentGroup = null;
    this.downX = 0;
    this.downY = 0;
    
    // Stable random profile keeps every idea recognizably unique across re-renders.
    const random = createSeededRandom(id);
    const shapeProfile = ORGANIC_SHAPE_PROFILES[getStableIndex(id, ORGANIC_SHAPE_PROFILES.length)];
    this.shapeProfile = shapeProfile;
    this.borderRadius = shapeProfile.radius;
    this.baseWidth = shapeProfile.width;
    this.baseHeight = shapeProfile.height;
    this.sproutProfile = this.createSproutProfile(random, shapeProfile);
    
    // Callback to inform parent manager of updates (drag status, position, deleted)
    this.onStateChange = onStateChange;
    
    // Scale limits
    this.minScale = 0.6; // ~132px width (fully readable Outfit font)
    this.maxScale = 1.6; // ~352px width
    
    // Pointer tracking
    this.activePointers = [];
    
    // Initial tracking values for drag/gestures
    this.startX = 0;
    this.startY = 0;
    this.startTokenX = 0;
    this.startTokenY = 0;
    
    // Pinch / Rotate state
    this.startDistance = 0;
    this.startAngle = 0;
    this.startScale = 1.0;
    this.startRotation = 0;
    this.startMidpoint = { x: 0, y: 0 };
    
    // Double click/tap timing
    this.lastTapTime = 0;
    
    this.domElement = null;
    this.titleElement = null;
    
    // Nudge states
    this.isFlipped = false;
    this.reversedTitle = "";
    this.isExtreme = false;
    this.previousScale = 1.0;
    this.contextTag = "";
    this.extremeBadgeElement = null;
    this.contextTagElement = null;
    this.innerPromptElement = null;
    this.normalizeBtnElement = null;
    this.flipAffordanceElement = null;
    
    this.createDom();
    this.setRooted(true);
    this.setupEvents();
  }
  
  createDom() {
    const el = document.createElement('div');
    el.className = 'idea-token spawning';
    el.id = `token-${this.id}`;
    el.style.borderRadius = this.borderRadius; // Apply unique organic shape
    
    // Create token inner wrapper for 3D flip
    const inner = document.createElement('div');
    inner.className = 'token-inner';
    
    const front = document.createElement('div');
    front.className = 'token-front';
    front.style.borderRadius = this.borderRadius;
    
    const title = document.createElement('div');
    title.className = 'token-title';
    title.innerText = this.displayTitle;
    front.appendChild(title);
    
    const back = document.createElement('div');
    back.className = 'token-back';
    back.style.borderRadius = this.borderRadius;
    
    const backTitle = document.createElement('div');
    backTitle.className = 'token-title back-title';
    backTitle.innerText = '';
    back.appendChild(backTitle);
    
    // Small "keer terug" affordance
    const keerTerug = document.createElement('span');
    keerTerug.className = 'keer-terug-btn';
    keerTerug.innerText = 'Keer terug';
    keerTerug.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.flipBack();
    });
    back.appendChild(keerTerug);
    
    inner.appendChild(front);
    inner.appendChild(back);
    el.appendChild(inner);
    this.appendSprouts(el);

    this.domElement = el;
    this.innerElement = inner;
    this.titleElement = title;
    this.backTitleElement = backTitle;
    this.frontElement = front;

    // Flip affordance icon on front (small curved arrow)
    const flipAffordance = document.createElement('div');
    flipAffordance.className = 'flip-affordance';
    flipAffordance.style.display = 'none'; // hidden by default, shown by nudge
    flipAffordance.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
    flipAffordance.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.flip();
    });
    front.appendChild(flipAffordance);
    this.flipAffordanceElement = flipAffordance;

    // Apply coordinates and style BEFORE appending to DOM to prevent top-left flash
    this.updateStyle();

    // Remove spawning animation class after it completes
    setTimeout(() => {
      if (this.domElement) {
        this.domElement.classList.remove('spawning');
      }
    }, 400);

    document.getElementById('token-container').appendChild(el);
  }

  appendSprouts(element) {
    this.sproutProfile.forEach((sprout) => {
      const image = document.createElement('img');
      image.className = 'token-sprout';
      image.src = sprout.src;
      image.alt = '';
      image.draggable = false;
      image.style.setProperty('--sprout-x', `${sprout.x}%`);
      image.style.setProperty('--sprout-y', `${sprout.y}%`);
      image.style.setProperty('--sprout-rotation', `${sprout.rotation}deg`);
      image.style.setProperty('--sprout-size', `${sprout.size}px`);
      element.appendChild(image);
    });
  }

  createSproutProfile(random, shapeProfile) {
    const borderInset = 4;
    const slotDefinitions = [
      { side: 'top', position: 28 },
      { side: 'top', position: 50 },
      { side: 'top', position: 72 },
      { side: 'bottom', position: 29 },
      { side: 'bottom', position: 51 },
      { side: 'bottom', position: 73 },
      { side: 'left', position: 50 },
      { side: 'right', position: 50 }
    ];
    const slots = slotDefinitions.map((slot) => {
      const borderPoint = getBorderPoint(shapeProfile, slot.side, slot.position);
      return {
        x: borderPoint.x - (borderPoint.normalX * borderInset / shapeProfile.width) * 100,
        y: borderPoint.y - (borderPoint.normalY * borderInset / shapeProfile.height) * 100,
        rotation: borderPoint.rotation
      };
    });
    const count = 1 + Math.floor(random() * 3);
    const availableSlots = [...slots];
    return Array.from({ length: count }, () => {
      const slotIndex = Math.floor(random() * availableSlots.length);
      const slot = availableSlots.splice(slotIndex, 1)[0];
      return {
        x: slot.x + (random() - 0.5) * 2,
        y: slot.y + (random() - 0.5) * 2,
        rotation: slot.rotation + (random() - 0.5) * 4,
        size: 27 + Math.round(random() * 10),
        src: SPROUT_ASSETS[Math.floor(random() * SPROUT_ASSETS.length)]
      };
    });
  }
  
  updateStyle() {
    if (!this.domElement) return;
    
    // Toggle active dragging class to bypass CSS transitions
    if (this.isDragging) {
      this.domElement.classList.add('dragging');
    } else {
      this.domElement.classList.remove('dragging');
    }

    const currentWidth = this.selected ? this.baseWidth * 1.5 : this.baseWidth;
    const currentHeight = this.selected ? this.baseHeight * 1.5 : this.baseHeight;

    // Calculate final width and height by incorporating scale directly
    const finalWidth = currentWidth * this.scale;
    const finalHeight = currentHeight * this.scale;

    // Position coordinates: x and y represent the center of the token.
    const tx = this.x - finalWidth / 2;
    const ty = this.y - finalHeight / 2;
    
    this.domElement.style.left = `${tx}px`;
    this.domElement.style.top = `${ty}px`;
    this.domElement.style.width = `${finalWidth}px`;
    this.domElement.style.height = `${finalHeight}px`;
    this.domElement.style.rotate = `${this.rotation}deg`;
    
    // Scale is only used for hovering bin shrink effect
    const hoverScale = this.isHoveringBin ? 0.45 : 1.0;
    this.domElement.style.scale = `${hoverScale}`;
    this.domElement.style.opacity = this.isHoveringBin ? '0.5' : '1';

    // Calculate dynamic character limit based on scale
    let maxChars = 50;
    if (this.scale > 1.0) {
      maxChars = Math.floor(50 + (this.scale - 1.0) * 150);
    }
    this.displayTitle = generateDisplayTitle(this.title, maxChars);
    
    // Toggle active classes
    if (this.selected) {
      this.domElement.classList.add('selected');
      if (this.titleElement) {
        this.titleElement.innerText = this.title;
      }
    } else {
      this.domElement.classList.remove('selected');
      if (this.titleElement) {
        this.titleElement.innerText = this.displayTitle;
      }
    }

    // Dynamic line-clamp styling to fit more text on larger scale
    if (this.titleElement) {
      if (this.scale > 1.0 || this.selected) {
        this.titleElement.style.webkitLineClamp = '6';
        this.titleElement.style.lineClamp = '6';
      } else {
        this.titleElement.style.webkitLineClamp = '';
        this.titleElement.style.lineClamp = '';
      }
    }
    if (this.backTitleElement) {
      if (this.scale > 1.0) {
        this.backTitleElement.style.webkitLineClamp = '6';
        this.backTitleElement.style.lineClamp = '6';
      } else {
        this.backTitleElement.style.webkitLineClamp = '';
        this.backTitleElement.style.lineClamp = '';
      }
    }
    
    if (this.editing) {
      this.domElement.classList.add('editing');
    } else {
      this.domElement.classList.remove('editing');
    }

    // Render 10x magnification components
    if (this.isExtreme && this.frontElement) {
      this.domElement.classList.add('pulsing-outline');
      if (!this.extremeBadgeElement) {
        this.extremeBadgeElement = document.createElement('div');
        this.extremeBadgeElement.className = 'extreme-badge';
        this.extremeBadgeElement.innerText = '10x';
        this.frontElement.appendChild(this.extremeBadgeElement);
      }
      if (!this.innerPromptElement) {
        this.innerPromptElement = document.createElement('div');
        this.innerPromptElement.className = 'inner-prompt';
        this.innerPromptElement.innerText = 'Wat als dit idee 10x sterker was?';
        this.frontElement.appendChild(this.innerPromptElement);
      }
      if (!this.normalizeBtnElement) {
        this.normalizeBtnElement = document.createElement('span');
        this.normalizeBtnElement.className = 'normalize-btn';
        this.normalizeBtnElement.innerText = 'Normaliseren';
        this.normalizeBtnElement.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.normalize();
        });
        this.frontElement.appendChild(this.normalizeBtnElement);
      }
    } else {
      this.domElement.classList.remove('pulsing-outline');
      if (this.extremeBadgeElement) {
        this.extremeBadgeElement.remove();
        this.extremeBadgeElement = null;
      }
      if (this.innerPromptElement) {
        this.innerPromptElement.remove();
        this.innerPromptElement = null;
      }
      if (this.normalizeBtnElement) {
        this.normalizeBtnElement.remove();
        this.normalizeBtnElement = null;
      }
    }

    // Render context zone tags
    if (this.contextTag && this.frontElement) {
      this.domElement.classList.add('in-context');
      if (!this.contextTagElement) {
        this.contextTagElement = document.createElement('div');
        this.contextTagElement.className = 'context-tag';
        this.contextTagElement.innerText = this.contextTag;
        this.frontElement.insertBefore(this.contextTagElement, this.titleElement);
      } else {
        this.contextTagElement.innerText = this.contextTag;
      }
    } else {
      this.domElement.classList.remove('in-context');
      if (this.contextTagElement) {
        this.contextTagElement.remove();
        this.contextTagElement = null;
      }
    }
  }

  setRooted(rooted, animate = false) {
    this.isRooted = rooted;
    if (!this.domElement) return;
    let marker = this.domElement.querySelector('.token-root-state');
    if (!marker) {
      marker = document.createElement('span');
      marker.className = 'token-root-state';
      marker.setAttribute('aria-hidden', 'true');
      this.domElement.appendChild(marker);
    }
    this.domElement.classList.toggle('idea-rooted', rooted);
    this.domElement.classList.toggle('idea-loose', !rooted);
    this.domElement.dataset.rootState = rooted ? 'rooted' : 'loose';
    this.domElement.setAttribute('aria-description', rooted ? 'Vast in de grond' : 'Los en verplaatsbaar');
    if (animate) {
      const animationClass = rooted ? 'rooting-in' : 'uprooting';
      this.domElement.classList.remove('rooting-in', 'uprooting');
      this.domElement.classList.add(animationClass);
      setTimeout(() => this.domElement?.classList.remove(animationClass), 520);
    }
  }

  flip() {
    if (this.type === 'group' || this.isFlipped) return;
    this.isFlipped = true;
    
    const generateReversedTitle = (text) => {
      const lower = text.toLowerCase();
      let reversed = text;
      const replacements = [
        { r: /\\bmeer\\b/gi, w: "minder" },
        { r: /\\bminder\\b/gi, w: "meer" },
        { r: /\\bwel\\b/gi, w: "niet" },
        { r: /\\bniet\\b/gi, w: "wel" },
        { r: /\\bgroter\\b/gi, w: "kleiner" },
        { r: /\\bkleiner\\b/gi, w: "groter" },
        { r: /\\bbeter\\b/gi, w: "slechter" },
        { r: /\\bslechter\\b/gi, w: "beter" },
        { r: /\\baltijd\\b/gi, w: "nooit" },
        { r: /\\bnooit\\b/gi, w: "altijd" },
        { r: /\\bja\\b/gi, w: "nee" },
        { r: /\\bnee\\b/gi, w: "ja" },
        { r: /\\bgoed\\b/gi, w: "slecht" },
        { r: /\\bslecht\\b/gi, w: "goed" }
      ];
      let replaced = false;
      for (const rep of replacements) {
        if (rep.r.test(reversed)) {
          reversed = reversed.replace(rep.r, rep.w);
          replaced = true;
        }
      }
      return "Omgekeerd: " + reversed;
    };
    
    this.reversedTitle = generateReversedTitle(this.title);
    if (this.backTitleElement) {
      this.backTitleElement.innerText = this.reversedTitle;
    }
    
    if (this.domElement) {
      this.domElement.classList.add('flipped');
    }
    this.triggerChange('statechange');
  }

  flipBack() {
    if (this.type === 'group' || !this.isFlipped) return;
    this.isFlipped = false;
    if (this.domElement) {
      this.domElement.classList.remove('flipped');
    }
    this.triggerChange('statechange');
  }

  normalize() {
    if (!this.isExtreme) return;
    this.isExtreme = false;
    this.scale = this.previousScale;
    this.updateStyle();
    this.triggerChange('statechange');
  }
  
  setupEvents() {
    const el = this.domElement;
    
    el.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    el.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    el.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    el.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
    
    // Double click detection (failsafe for desktop)
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.startEditing();
    });
  }
  
  handlePointerDown(e) {
    if (this.editing) return; // Ignore gesture/drag if typing

    const pointerIntent = this.onStateChange ? this.onStateChange(this, 'pointerintent', e) : true;
    if (pointerIntent === false) {
      return;
    }
    this.dragLocked = pointerIntent === 'locked';
    
    e.stopPropagation();
    
    this.downX = e.clientX;
    this.downY = e.clientY;
    
    if (this.isChild && this.domElement) {
      this.domElement.classList.add('dragging-child');
    }
    
    // Push or update pointer details
    const ptrIndex = this.activePointers.findIndex(p => p.pointerId === e.pointerId);
    if (ptrIndex === -1) {
      this.activePointers.push({
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY
      });
    }
    
    elSetCapture(this.domElement, e.pointerId);
    
    // Selection state: touch token to select, multi-select is enabled
    if (!this.selected) {
      this.selected = true;
      this.updateStyle();
      this.triggerChange('select');
    }
    
    // Check for double click/tap
    const now = Date.now();
    if (now - this.lastTapTime < 300 && this.activePointers.length === 1) {
      this.startEditing();
      this.lastTapTime = 0; // prevent triple tap
      return;
    }
    this.lastTapTime = now;
    
    if (!this.isDragging && !this.dragLocked) {
      this.isDragging = true;
      this.triggerChange('dragstart');
    }
    
    if (this.activePointers.length === 1) {
      // Setup drag
      const p = this.activePointers[0];
      this.startX = p.clientX;
      this.startY = p.clientY;
      this.startTokenX = this.x;
      this.startTokenY = this.y;
    } else if (this.activePointers.length === 2) {
      // Setup two-finger gesture (pinch / rotate)
      const p0 = this.activePointers[0];
      const p1 = this.activePointers[1];
      
      this.startDistance = this.getDistance(p0, p1);
      this.startAngle = this.getAngle(p0, p1);
      
      this.startScale = this.scale;
      this.startRotation = this.rotation;
      
      this.startMidpoint = this.getMidpoint(p0, p1);
      this.startTokenX = this.x;
      this.startTokenY = this.y;
    }
  }
  
  handlePointerMove(e) {
    if (this.editing) return;
    
    const ptrIndex = this.activePointers.findIndex(p => p.pointerId === e.pointerId);
    if (ptrIndex === -1) return;
    
    e.stopPropagation();
    
    // Update pointer position
    this.activePointers[ptrIndex].clientX = e.clientX;
    this.activePointers[ptrIndex].clientY = e.clientY;

    if (this.dragLocked && this.activePointers.length === 1) return;
    
    if (this.activePointers.length === 1) {
      // Normal single finger drag
      const p = this.activePointers[0];
      const dx = p.clientX - this.startX;
      const dy = p.clientY - this.startY;
      
      this.x = this.startTokenX + dx;
      this.y = this.startTokenY + dy;
      
      this.applyBoundaries();
      this.updateStyle();
      
      this.triggerChange('dragmove');
    } else if (this.activePointers.length >= 2) {
      // Two-finger pinch and rotation
      const p0 = this.activePointers[0];
      const p1 = this.activePointers[1];
      
      const currentDistance = this.getDistance(p0, p1);
      const currentAngle = this.getAngle(p0, p1);
      const currentMidpoint = this.getMidpoint(p0, p1);
      
      // Calculate Scale
      if (this.startDistance > 0) {
        let newScale = this.startScale * (currentDistance / this.startDistance);
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
      }
      
      // Calculate Rotation (in degrees)
      const angleDiff = currentAngle - this.startAngle;
      this.rotation = this.startRotation + angleDiff * (180 / Math.PI);
      
      // Translate based on midpoint change
      const mx = currentMidpoint.x - this.startMidpoint.x;
      const my = currentMidpoint.y - this.startMidpoint.y;
      if (!this.dragLocked) {
        this.x = this.startTokenX + mx;
        this.y = this.startTokenY + my;
      }
      
      this.applyBoundaries();
      this.updateStyle();
      
      this.triggerChange(this.dragLocked ? 'statechange' : 'dragmove');
    }
  }
  
  handlePointerUp(e) {
    const ptrIndex = this.activePointers.findIndex(p => p.pointerId === e.pointerId);
    if (ptrIndex === -1) return;
    
    e.stopPropagation();
    
    const dx = e.clientX - this.downX;
    const dy = e.clientY - this.downY;
    const isTap = Math.hypot(dx, dy) < 6;
    
    this.activePointers.splice(ptrIndex, 1);
    elReleaseCapture(this.domElement, e.pointerId);
    
    if (this.isChild && this.domElement) {
      this.domElement.classList.remove('dragging-child');
    }
    
    if (this.activePointers.length === 0) {
      // All dragging complete
      const wasDragging = this.isDragging;
      this.isDragging = false;
      if (wasDragging) this.triggerChange('dragend');
      if (isTap) {
        this.triggerChange('tap');
      } else {
        this.selected = false;
        this.updateStyle();
        this.triggerChange('select');
      }
      this.dragLocked = false;
    } else if (this.activePointers.length === 1) {
      // Transited from multi-touch back to single finger drag.
      // Re-anchor coordinates with remaining pointer to prevent jump.
      const p = this.activePointers[0];
      this.startX = p.clientX;
      this.startY = p.clientY;
      this.startTokenX = this.x;
      this.startTokenY = this.y;
    }
  }
  
  applyBoundaries() {
    if (this.isChild) return;
    const w = this.baseWidth * this.scale;
    const h = this.baseHeight * this.scale;
    
    const minX = w / 2;
    const maxX = window.innerWidth - w / 2;
    const minY = h / 2;
    const maxY = window.innerHeight - h / 2;
    
    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));
  }
  
  startEditing() {
    if (this.editing) return;
    this.editing = true;
    this.activePointers = [];
    this.isDragging = false;
    this.updateStyle();
    this.triggerChange('edit');
  }
  
  stopEditing(newTitle) {
    if (!this.editing) return;
    this.editing = false;
    this.selected = false;
    this.activePointers = [];
    this.isDragging = false;
    if (newTitle !== undefined && newTitle !== null) {
      this.title = newTitle;
      this.displayTitle = generateDisplayTitle(newTitle);
    }
    this.updateStyle();
    this.triggerChange('select');
  }
  
  destroy() {
    if (this.domElement) {
      this.domElement.remove();
      this.domElement = null;
    }
  }
  
  // Mathematical helpers
  getDistance(p0, p1) {
    const dx = p1.clientX - p0.clientX;
    const dy = p1.clientY - p0.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  getAngle(p0, p1) {
    return Math.atan2(p1.clientY - p0.clientY, p1.clientX - p0.clientX);
  }
  
  getMidpoint(p0, p1) {
    return {
      x: (p0.clientX + p1.clientX) / 2,
      y: (p0.clientY + p1.clientY) / 2
    };
  }
  
  triggerChange(type) {
    if (this.onStateChange) {
      this.onStateChange(this, type);
    }
  }
}

// Helpers for pointer capture (IE/Safari/Firefox compatibility)
function elSetCapture(el, id) {
  if (el.setPointerCapture) {
    try { el.setPointerCapture(id); } catch(err) {}
  }
}

function elReleaseCapture(el, id) {
  if (el.releasePointerCapture) {
    try { el.releasePointerCapture(id); } catch(err) {}
  }
}
