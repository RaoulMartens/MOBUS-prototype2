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

export class Token {
  constructor(id, x, y, rotation, title = "Plant idee", onStateChange) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.rotation = rotation; // degrees
    this.scale = 1.0;
    this.baseWidth = 160;
    this.baseHeight = 130;
    this.title = title;
    this.displayTitle = generateDisplayTitle(title);
    this.selected = false;
    this.editing = false;
    this.isDragging = false;
    this.isHoveringBin = false;
    this.isChild = false;
    this.parentGroup = null;
    this.downX = 0;
    this.downY = 0;
    
    // Generate a unique, subtle, smooth pebble-like organic shape dynamically
    const r = () => Math.floor(Math.random() * 14) + 43; // Radii between 43% and 56% for subtle curves
    const h1 = r();
    const h2 = r();
    const v1 = r();
    const v2 = r();
    this.borderRadius = `${h1}% ${100 - h1}% ${h2}% ${100 - h2}% / ${v1}% ${v2}% ${100 - v2}% ${100 - v1}%`;
    
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
    
    if (!this.isDragging) {
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
      this.x = this.startTokenX + mx;
      this.y = this.startTokenY + my;
      
      this.applyBoundaries();
      this.updateStyle();
      
      this.triggerChange('dragmove');
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
      this.isDragging = false;
      this.triggerChange('dragend');
      if (isTap) {
        this.triggerChange('tap');
      } else {
        this.selected = false;
        this.updateStyle();
        this.triggerChange('select');
      }
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
