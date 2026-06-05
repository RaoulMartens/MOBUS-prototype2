export class Token {
  constructor(id, x, y, rotation, title = "Nieuw idee", onStateChange) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.rotation = rotation; // degrees
    this.scale = 1.0;
    this.baseWidth = 220;
    this.baseHeight = 180;
    this.title = title;
    this.selected = false;
    this.editing = false;
    this.isDragging = false;
    this.isHoveringBin = false;
    
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
    
    this.createDom();
    this.setupEvents();
  }
  
  createDom() {
    const el = document.createElement('div');
    el.className = 'idea-token spawning';
    el.id = `token-${this.id}`;
    el.style.borderRadius = this.borderRadius; // Apply unique organic shape
    
    const title = document.createElement('div');
    title.className = 'token-title';
    title.innerText = this.title;
    
    el.appendChild(title);
    
    this.domElement = el;
    this.titleElement = title;
    
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
    
    // Position coordinates: x and y represent the center of the token.
    const tx = this.x - this.baseWidth / 2;
    const ty = this.y - this.baseHeight / 2;
    
    this.domElement.style.left = `${tx}px`;
    this.domElement.style.top = `${ty}px`;
    this.domElement.style.rotate = `${this.rotation}deg`;
    
    const displayScale = this.isHoveringBin ? this.scale * 0.45 : this.scale;
    this.domElement.style.scale = `${displayScale}`;
    this.domElement.style.opacity = this.isHoveringBin ? '0.5' : '1';
    
    // Toggle active classes
    if (this.selected) {
      this.domElement.classList.add('selected');
    } else {
      this.domElement.classList.remove('selected');
    }
    
    if (this.editing) {
      this.domElement.classList.add('editing');
    } else {
      this.domElement.classList.remove('editing');
    }
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
    
    this.activePointers.splice(ptrIndex, 1);
    elReleaseCapture(this.domElement, e.pointerId);
    
    if (this.activePointers.length === 0) {
      // All dragging complete
      this.isDragging = false;
      this.triggerChange('dragend');
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
    this.updateStyle();
    this.triggerChange('edit');
  }
  
  stopEditing(newTitle) {
    if (!this.editing) return;
    this.editing = false;
    if (newTitle !== undefined && newTitle !== null) {
      this.title = newTitle;
      this.titleElement.innerText = this.title;
    }
    this.updateStyle();
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
