import { InputCard } from './inputCard.js';
import { Token } from './token.js';
import { GroupToken } from './groupToken.js';
import { generateGroupName, checkThemeMatch, getThemeExplanation } from './nameGenerator.js';

const PLUS_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="12" y1="5" x2="12" y2="19"></line>
  <line x1="5" y1="12" x2="19" y2="12"></line>
</svg>`;

const BIN_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <line x1="4" y1="7" x2="20" y2="7"></line>
  <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"></path>
  <path d="M9 7V4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5V7"></path>
</svg>`;

class CanvasManager {
  constructor() {
    this.tokens = [];
    this.tokenIdCounter = 0;
    this.activeDragCount = 0;
    this.ignoredSuggestions = new Set();
    this.dismissedConnections = [];
    this.isSnapping = false;
    this.activeSuggestion = null;
    
    this.setupEdgeButtons();
    this.setupBackgroundDeselect();
    this.setupWindowResize();
    this.setupGroupPreviewLine();
    this.setupAISuggestionElements();
    
    // Add default initial tokens for immediate interaction
    this.spawnInitialTokens();
    this.updateAISuggestions();
  }
  
  setupGroupPreviewLine() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "group-preview-line-svg";
    svg.style.display = "none";
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    svg.appendChild(line);
    
    document.getElementById('canvas').appendChild(svg);
    this.previewSvg = svg;
    this.previewLine = line;
    this.previewCandidateA = null;
    this.previewCandidateB = null;
  }
  
  setupEdgeButtons() {
    const buttons = document.querySelectorAll('.edge-button');
    buttons.forEach(btn => {
      // pointerdown triggers faster than click for touch screens
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.spawnTokenFromButton(btn);
      });
    });
  }
  
  spawnTokenFromButton(btn) {
    const side = btn.dataset.side;
    const rect = btn.getBoundingClientRect();
    const btnX = rect.left + rect.width / 2;
    const btnY = rect.top + rect.height / 2;
    
    let spawnX = btnX;
    let spawnY = btnY;
    let rotation = 0;
    
    // Offset spawn position inwards and rotate to face the edge user
    const offset = 160;
    if (side === 'top') {
      spawnY = btnY + offset;
      rotation = 180;
    } else if (side === 'bottom') {
      spawnY = btnY - offset;
      rotation = 0;
    } else if (side === 'left') {
      spawnX = btnX + offset;
      rotation = 90;
    } else if (side === 'right') {
      spawnX = btnX - offset;
      rotation = 270;
    }
    
    const inputCardId = this.tokenIdCounter++;
    new InputCard(
      inputCardId,
      btnX,
      btnY,
      spawnX,
      spawnY,
      rotation,
      btn,
      (text) => {
        const tokenId = this.tokenIdCounter++;
        const token = new Token(tokenId, spawnX, spawnY, rotation, text, (t, type) => this.handleTokenStateChange(t, type));
        token.applyBoundaries();
        token.updateStyle();
        this.tokens.push(token);
        this.updateAISuggestions();
      },
      () => {
        // Cancel - do nothing
      }
    );
  }
  
  setupBackgroundDeselect() {
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('pointerdown', (e) => {
      if (e.target === canvas || e.target.id === 'token-container') {
        this.tokens.forEach(token => {
          if (token.selected) {
            token.selected = false;
            token.updateStyle();
          }
          if (token.type === 'group' && token.expanded) {
            token.collapse();
          }
        });
        this.collapseDot();
      }
    });
  }
  
  setupWindowResize() {
    // Keep tokens within canvas boundaries on window resize
    window.addEventListener('resize', () => {
      this.tokens.forEach(token => {
        token.applyBoundaries();
        token.updateStyle();
      });
    });
  }
  
  spawnInitialTokens() {
    // Spawn two central demo tokens facing different sides of the table
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    const id1 = this.tokenIdCounter++;
    const token1 = new Token(id1, w * 0.4, h * 0.5, 0, "Sleep mij naar een rand om te wissen", (t, type) => this.handleTokenStateChange(t, type));
    token1.applyBoundaries();
    token1.updateStyle();
    this.tokens.push(token1);
    
    const id2 = this.tokenIdCounter++;
    const token2 = new Token(id2, w * 0.6, h * 0.5, 180, "Dubbelklik om te bewerken", (t, type) => this.handleTokenStateChange(t, type));
    token2.applyBoundaries();
    token2.updateStyle();
    this.tokens.push(token2);
  }
  
  handleTokenStateChange(token, type) {
    if (type === 'dragstart') {
      this.activeDragCount++;
      this.updateBinMode();
    } else if (type === 'dragmove') {
      this.checkBinCollisions(token);
      this.resolveGroupCollisions(token);
      this.checkProximityGrouping(token);
      this.updateBinMode();
      this.updateAISuggestions();
    } else if (type === 'dragend') {
      this.activeDragCount = Math.max(0, this.activeDragCount - 1);
      token.isHoveringBin = false;
      token.updateStyle();
      this.updateBinMode();
      this.updateAISuggestions();
      
      const candidateA = this.previewCandidateA;
      const candidateB = this.previewCandidateB;
      this.clearProximityPreview();
      
      let grouped = false;
      if (candidateA && candidateB && candidateA === token) {
        let isInsideGroup = false;
        if (candidateB.type === 'group' && candidateB.expanded) {
          const dx = candidateA.x - candidateB.x;
          const dy = candidateA.y - candidateB.y;
          const angle = -candidateB.rotation * Math.PI / 180;
          const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
          const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
          
          const borderX = candidateB.expandedWidth / 2 + 10;
          const borderY = candidateB.expandedHeight / 2 + 10;
          
          if (Math.abs(localX) < borderX && Math.abs(localY) < borderY) {
            isInsideGroup = true;
          }
        }
        
        const dist = Math.hypot(candidateA.x - candidateB.x, candidateA.y - candidateB.y);
        if (dist < 150 || isInsideGroup) {
          grouped = true;
          if (candidateB.type === 'group') {
            this.addTokenToGroup(candidateA, candidateB);
          } else {
            this.mergeTokensToGroup(candidateA, candidateB);
          }
        }
      }
      
      if (!grouped) {
        this.handleDragEnd(token);
      }
    } else if (type === 'edit') {
      this.editToken(token);
    } else if (type === 'tap') {
      if (token.type === 'group') {
        token.toggleExpand();
      }
    }
  }
  
  checkProximityGrouping(draggedToken) {
    if (draggedToken.type === 'group' || draggedToken.isChild) return;
    
    const groupingThreshold = 150;
    let closestToken = null;
    let minDistance = Infinity;
    
    this.tokens.forEach(other => {
      if (other === draggedToken || other.isChild || other.isDragging) return;
      
      let dist = Math.hypot(draggedToken.x - other.x, draggedToken.y - other.y);
      if (other.type === 'group' && other.expanded) {
        const dx = draggedToken.x - other.x;
        const dy = draggedToken.y - other.y;
        const angle = -other.rotation * Math.PI / 180;
        const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
        
        const borderX = other.expandedWidth / 2 + 10;
        const borderY = other.expandedHeight / 2 + 10;
        
        if (Math.abs(localX) < borderX && Math.abs(localY) < borderY) {
          dist = 0;
        }
      }
      
      if (dist < minDistance) {
        minDistance = dist;
        closestToken = other;
      }
    });
    
    if (closestToken && minDistance < groupingThreshold) {
      const activePair = this.activeSuggestion;
      const isAISuggestionActive = activePair && 
        ((activePair.tA === draggedToken && activePair.tB === closestToken) ||
         (activePair.tA === closestToken && activePair.tB === draggedToken));
         
      this.previewCandidateA = draggedToken;
      this.previewCandidateB = closestToken;
      
      draggedToken.domElement.classList.add('group-preview-active');
      closestToken.domElement.classList.add('group-preview-active');
      
      if (this.previewSvg && this.previewLine) {
        if (isAISuggestionActive) {
          this.previewSvg.style.display = 'none';
        } else {
          this.previewLine.setAttribute('x1', draggedToken.x);
          this.previewLine.setAttribute('y1', draggedToken.y);
          this.previewLine.setAttribute('x2', closestToken.x);
          this.previewLine.setAttribute('y2', closestToken.y);
          this.previewSvg.style.display = 'block';
        }
      }
    } else {
      this.clearProximityPreview();
    }
  }

  clearProximityPreview() {
    if (this.previewCandidateA && this.previewCandidateA.domElement) {
      this.previewCandidateA.domElement.classList.remove('group-preview-active');
    }
    if (this.previewCandidateB && this.previewCandidateB.domElement) {
      this.previewCandidateB.domElement.classList.remove('group-preview-active');
    }
    
    if (this.previewSvg) {
      this.previewSvg.style.display = 'none';
    }
    
    this.previewCandidateA = null;
    this.previewCandidateB = null;
  }

  async mergeTokensToGroup(tokenA, tokenB) {
    this.hideAISuggestion(true);
    this.tokens = this.tokens.filter(t => t.id !== tokenA.id && t.id !== tokenB.id);
    
    const avgX = (tokenA.x + tokenB.x) / 2;
    const avgY = (tokenA.y + tokenB.y) / 2;
    const targetRotation = tokenA.rotation;
    
    if (tokenA.domElement) {
      tokenA.domElement.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
      tokenA.domElement.style.pointerEvents = 'none';
      tokenA.x = avgX;
      tokenA.y = avgY;
      tokenA.scale = 0.5;
      tokenA.rotation = targetRotation;
      tokenA.updateStyle();
    }
    if (tokenB.domElement) {
      tokenB.domElement.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
      tokenB.domElement.style.pointerEvents = 'none';
      tokenB.x = avgX;
      tokenB.y = avgY;
      tokenB.scale = 0.5;
      tokenB.rotation = targetRotation;
      tokenB.updateStyle();
    }
    
    const groupName = await generateGroupName(tokenA.title, tokenB.title);
    
    setTimeout(() => {
      tokenA.destroy();
      tokenB.destroy();
      
      const groupTokenId = this.tokenIdCounter++;
      const childData = [
        { id: tokenA.id, title: tokenA.title, borderRadius: tokenA.borderRadius, rotation: targetRotation },
        { id: tokenB.id, title: tokenB.title, borderRadius: tokenB.borderRadius, rotation: targetRotation }
      ];
      
      const groupToken = new GroupToken(
        groupTokenId,
        avgX,
        avgY,
        targetRotation,
        groupName,
        childData,
        (t, type) => this.handleTokenStateChange(t, type)
      );
      
      this.tokens.push(groupToken);
      this.resolveGroupCollisions(groupToken);
    }, 350);
  }

  addTokenToGroup(token, group) {
    this.hideAISuggestion(true);
    this.tokens = this.tokens.filter(t => t.id !== token.id);
    
    if (token.domElement) {
      token.domElement.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
      token.domElement.style.pointerEvents = 'none';
      token.x = group.x;
      token.y = group.y;
      token.scale = 0.5;
      token.rotation = group.rotation;
      token.updateStyle();
    }
    
    setTimeout(() => {
      token.destroy();
      
      group.addChildToken({
        id: token.id,
        title: token.title,
        borderRadius: token.borderRadius,
        rotation: group.rotation
      });
    }, 350);
  }
  
  editToken(token) {
    // Hide the token visually during editing
    if (token.domElement) {
      token.domElement.style.opacity = '0';
      token.domElement.style.pointerEvents = 'none';
    }
    
    // Calculate target position for InputCard (offset from token center)
    const cardOffset = 160;
    let targetX = token.x;
    let targetY = token.y;
    
    // Push card inward so it stays visible within canvas
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cardHalf = 175; // half of 350px card width
    const cardHalfH = 143; // half of 285px card height
    
    if (targetX - cardHalf < 0) targetX = cardHalf + 16;
    if (targetX + cardHalf > w) targetX = w - cardHalf - 16;
    if (targetY - cardHalfH < 0) targetY = cardHalfH + 16;
    if (targetY + cardHalfH > h) targetY = h - cardHalfH - 16;
    
    const inputCardId = this.tokenIdCounter++;
    new InputCard(
      inputCardId,
      token.x,
      token.y,
      targetX,
      targetY,
      token.rotation,
      null, // no edge button
      (text) => {
        // Confirm: update token title and restore visibility
        token.stopEditing(text);
        if (token.domElement) {
          token.domElement.style.opacity = '1';
          token.domElement.style.pointerEvents = 'auto';
        }
        this.updateAISuggestions();
      },
      () => {
        // Cancel: restore original text and visibility
        token.stopEditing();
        if (token.domElement) {
          token.domElement.style.opacity = '1';
          token.domElement.style.pointerEvents = 'auto';
        }
        this.updateAISuggestions();
      },
      token // pass source token for morph sizing
    );
  }
  
  updateBinMode() {
    const buttons = document.querySelectorAll('.edge-button');
    const sideRotation = { top: '180deg', bottom: '0deg', left: '90deg', right: '270deg' };
    
    // Find all currently dragged tokens
    const draggingTokens = this.tokens.filter(t => t.isDragging && !t.isChild);
    
    // Set of button elements that are closest to at least one dragging token
    const binTargetButtons = new Set();
    
    draggingTokens.forEach(token => {
      let closestBtn = null;
      let minDistance = Infinity;
      
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        const btnCenterX = rect.left + rect.width / 2;
        const btnCenterY = rect.top + rect.height / 2;
        
        const dist = Math.hypot(token.x - btnCenterX, token.y - btnCenterY);
        if (dist < minDistance) {
          minDistance = dist;
          closestBtn = btn;
        }
      });
      
      if (closestBtn) {
        binTargetButtons.add(closestBtn);
      }
    });
    
    buttons.forEach(btn => {
      const icon = btn.querySelector('.icon');
      if (binTargetButtons.has(btn)) {
        if (!btn.classList.contains('bin-mode')) {
          btn.classList.add('bin-mode');
          icon.innerHTML = BIN_ICON;
          icon.style.rotate = sideRotation[btn.dataset.side] || '0deg';
        }
      } else {
        if (btn.classList.contains('bin-mode')) {
          btn.classList.remove('bin-mode');
          btn.classList.remove('drag-over');
          icon.innerHTML = PLUS_ICON;
          icon.style.rotate = '';
        }
      }
    });
  }
  
  checkBinCollisions(draggedToken) {
    const buttons = document.querySelectorAll('.edge-button:not(.hidden-btn)');
    const threshold = 90; // Collision check distance
    let hoveringAny = false;
    
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;
      
      const dist = Math.hypot(draggedToken.x - btnCenterX, draggedToken.y - btnCenterY);
      
      if (dist < threshold) {
        btn.classList.add('drag-over');
        hoveringAny = true;
      } else {
        // Only remove drag-over highlight if no other active dragging token is overlapping it
        let otherOver = false;
        this.tokens.forEach(t => {
          if (t !== draggedToken && t.activePointers.length > 0) {
            const d = Math.hypot(t.x - btnCenterX, t.y - btnCenterY);
            if (d < threshold) otherOver = true;
          }
        });
        if (!otherOver) {
          btn.classList.remove('drag-over');
        }
      }
    });
    
    // Toggle token shrink state when entering or leaving any bin zone
    if (draggedToken.isHoveringBin !== hoveringAny) {
      draggedToken.isHoveringBin = hoveringAny;
      draggedToken.updateStyle();
    }
  }
  
  handleDragEnd(token) {
    const buttons = document.querySelectorAll('.edge-button:not(.hidden-btn)');
    const threshold = 90;
    let deleted = false;
    
    buttons.forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;
      
      const dist = Math.hypot(token.x - btnCenterX, token.y - btnCenterY);
      
      if (dist < threshold) {
        deleted = true;
        this.deleteToken(token);
        btn.classList.remove('drag-over');
      }
    });
    
    if (!deleted && this.activeDragCount === 0) {
      // Clear remaining hover highlights when all drags end
      buttons.forEach(btn => btn.classList.remove('drag-over'));
    }
  }
  
  deleteToken(token) {
    const el = token.domElement;
    if (el) {
      el.style.transition = 'all 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045)';
      // Shrink and rotate token while deleting for a organic feel
      el.style.scale = '0';
      el.style.rotate = `${token.rotation + 45}deg`;
      el.style.opacity = '0';
      
      setTimeout(() => {
        if (token.type === 'group') {
          token.collapse();
        }
        token.destroy();
        this.tokens = this.tokens.filter(t => t.id !== token.id);
      }, 300);
    } else {
      if (token.type === 'group') {
        token.collapse();
      }
      token.destroy();
      this.tokens = this.tokens.filter(t => t.id !== token.id);
    }
  }

  getOBBCorners(group) {
    const isExpanded = group.expanded;
    const baseW = group.selected ? group.baseWidth * 1.5 : group.baseWidth;
    const baseH = group.selected ? group.baseHeight * 1.5 : group.baseHeight;
    const w = isExpanded ? group.expandedWidth : baseW;
    const h = isExpanded ? group.expandedHeight : baseH;
    
    const scale = group.isHoveringBin ? group.scale * 0.45 : group.scale;
    const halfW = (w / 2) * scale;
    const halfH = (h / 2) * scale;
    
    const angleRad = (group.rotation * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    
    const ux = { x: cos, y: sin };
    const uy = { x: -sin, y: cos };
    
    const corners = [
      { x: group.x + halfW * ux.x + halfH * uy.x, y: group.y + halfW * ux.y + halfH * uy.y },
      { x: group.x - halfW * ux.x + halfH * uy.x, y: group.y - halfW * ux.y + halfH * uy.y },
      { x: group.x - halfW * ux.x - halfH * uy.x, y: group.y - halfW * ux.y - halfH * uy.y },
      { x: group.x + halfW * ux.x - halfH * uy.x, y: group.y + halfW * ux.y - halfH * uy.y }
    ];
    
    return {
      corners,
      axes: [ux, uy],
      center: { x: group.x, y: group.y }
    };
  }

  checkOBBCollision(obbA, obbB) {
    const axes = [...obbA.axes, ...obbB.axes];
    let minOverlap = Infinity;
    let collisionAxis = null;
    
    for (let i = 0; i < axes.length; i++) {
      const axis = axes[i];
      const len = Math.hypot(axis.x, axis.y);
      if (len === 0) continue;
      const normAxis = { x: axis.x / len, y: axis.y / len };
      
      let minA = Infinity, maxA = -Infinity;
      for (const p of obbA.corners) {
        const dot = p.x * normAxis.x + p.y * normAxis.y;
        if (dot < minA) minA = dot;
        if (dot > maxA) maxA = dot;
      }
      
      let minB = Infinity, maxB = -Infinity;
      for (const p of obbB.corners) {
        const dot = p.x * normAxis.x + p.y * normAxis.y;
        if (dot < minB) minB = dot;
        if (dot > maxB) maxB = dot;
      }
      
      if (maxA < minB || maxB < minA) {
        return null; // Separating axis found, no collision
      }
      
      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap < minOverlap) {
        minOverlap = overlap;
        collisionAxis = normAxis;
      }
    }
    
    const dirX = obbA.center.x - obbB.center.x;
    const dirY = obbA.center.y - obbB.center.y;
    const dotDir = dirX * collisionAxis.x + dirY * collisionAxis.y;
    
    const buffer = 8;
    const magnitude = minOverlap + buffer;
    
    const mtvX = collisionAxis.x * magnitude * (dotDir < 0 ? -1 : 1);
    const mtvY = collisionAxis.y * magnitude * (dotDir < 0 ? -1 : 1);
    
    return { x: mtvX, y: mtvY };
  }

  resolveGroupCollisions(activeGroupToken) {
    if (activeGroupToken.type !== 'group' || activeGroupToken.isChild) return;
    
    const otherGroups = this.tokens.filter(t => t.type === 'group' && t !== activeGroupToken && !t.isChild);
    
    for (let iter = 0; iter < 3; iter++) {
      let collisionResolved = false;
      
      for (const other of otherGroups) {
        const obbA = this.getOBBCorners(activeGroupToken);
        const obbB = this.getOBBCorners(other);
        
        const mtv = this.checkOBBCollision(obbA, obbB);
        if (mtv) {
          activeGroupToken.x += mtv.x;
          activeGroupToken.y += mtv.y;
          
          if (activeGroupToken.isDragging) {
            activeGroupToken.startTokenX += mtv.x;
            activeGroupToken.startTokenY += mtv.y;
          }
          
          activeGroupToken.applyBoundaries();
          activeGroupToken.updateStyle();
          collisionResolved = true;
        }
      }
      
      if (!collisionResolved) break;
    }
  }

  setupAISuggestionElements() {
    let svg = document.getElementById('ai-suggestion-svg');
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.id = "ai-suggestion-svg";
      
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.id = "ai-suggestion-path";
      path.style.opacity = '0';
      svg.appendChild(path);
      
      const hoverPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hoverPath.id = "ai-suggestion-hover-path";
      hoverPath.setAttribute('class', 'ai-suggestion-hover-path');
      svg.appendChild(hoverPath);
      
      document.getElementById('canvas').appendChild(svg);
    }
  }

  showAISuggestion(tA, tB) {
    if (this.isSnapping) return;
    
    const pairKey = Math.min(tA.id, tB.id) + '-' + Math.max(tA.id, tB.id);
    
    let path = document.getElementById('ai-suggestion-path');
    let hoverPath = document.getElementById('ai-suggestion-hover-path');
    let dot = document.getElementById('ai-suggestion-dot');
    
    if (this.activeSuggestion && this.activeSuggestion.pairKey !== pairKey) {
      this.hideAISuggestion(true);
      dot = null;
    }
    
    const dx = tB.x - tA.x;
    const dy = tB.y - tA.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    
    const midX = (tA.x + tB.x) / 2;
    const midY = (tA.y + tB.y) / 2;
    
    const nx = -dy / dist;
    const ny = dx / dist;
    
    const screenMidX = window.innerWidth / 2;
    const screenMidY = window.innerHeight / 2;
    const toCenterX = screenMidX - midX;
    const toCenterY = screenMidY - midY;
    
    const dotProduct = nx * toCenterX + ny * toCenterY;
    const directionMultiplier = dotProduct >= 0 ? 1 : -1;
    const finalNx = nx * directionMultiplier;
    const finalNy = ny * directionMultiplier;
    
    // Check if the user is dragging either token closer or further
    const isDraggingEither = tA.isDragging || tB.isDragging;
    
    // Dynamic physical thresholds
    const isClose = dist < 130;
    const matchesContent = checkThemeMatch(tA.title, tB.title);
    const softThreshold = matchesContent ? 280 : 200;
    const breakThreshold = matchesContent ? 440 : 320;
    
    // Snapping / Breaking Suggestion (snaps immediately when dragged past breakThreshold)
    if (dist > breakThreshold) {
      this.isSnapping = true;
      
      if (hoverPath) {
        hoverPath.onpointerdown = null;
      }
      if (dot) {
        dot.style.pointerEvents = 'none';
        dot.classList.remove('expanded');
      }
      
      if (path) {
        path.classList.add('ai-suggestion-snapping');
      }
      if (dot) {
        dot.classList.add('ai-dot-snapping');
      }
      
      this.dismissedConnections.push({
        sourceTokenId: tA.id,
        targetTokenId: tB.id,
        sourceTitle: tA.title,
        targetTitle: tB.title,
        status: "dismissed",
        dismissedAt: Date.now()
      });
      
      setTimeout(() => {
        this.hideAISuggestion(true);
        this.isSnapping = false;
        this.updateAISuggestions();
      }, 400);
      
      return;
    }
    
    // Calculate resistance progress value: clamp((currentDistance - startDistance) / (breakThreshold - startDistance), 0, 1)
    const startDistance = softThreshold;
    const progress = dist > startDistance ? Math.max(0, Math.min(1, (dist - startDistance) / (breakThreshold - startDistance))) : 0;
    
    // Curve straightens (gets tighter/strakker) under tension progress
    const curveOffset = Math.min(dist * 0.15, 60);
    const finalCurveOffset = Math.max(4, curveOffset * (1 - progress * 0.9));
    const cpX = midX - finalNx * finalCurveOffset;
    const cpY = midY - finalNy * finalCurveOffset;
    
    // Progress-driven vibration intensity (subtle jitter Amt to prevent over-jittering)
    const jitterAmt = progress * 1.5;
    
    // Apply jitter/vibration to control points under tension when actively dragging
    let finalCpX = cpX;
    let finalCpY = cpY;
    if (progress > 0 && isDraggingEither) {
      finalCpX += (Math.random() - 0.5) * jitterAmt;
      finalCpY += (Math.random() - 0.5) * jitterAmt;
    }
    
    // Midpoint on the curved path
    let dotX = 0.25 * tA.x + 0.5 * finalCpX + 0.25 * tB.x;
    let dotY = 0.25 * tA.y + 0.5 * finalCpY + 0.25 * tB.y;
    
    // Apply jitter/vibration directly to indicator dot
    if (progress > 0 && isDraggingEither) {
      dotX += (Math.random() - 0.5) * (jitterAmt * 0.5);
      dotY += (Math.random() - 0.5) * (jitterAmt * 0.5);
    }
    
    const pathD = `M ${tA.x} ${tA.y} Q ${finalCpX} ${finalCpY} ${tB.x} ${tB.y}`;
    if (path) {
      path.setAttribute('d', pathD);
      
      if (isClose && isDraggingEither) {
        // Dragged closer: stable, thick, glowing green line
        path.classList.add('ai-suggestion-glow-path');
        path.style.strokeWidth = '6.5px';
        path.style.strokeDasharray = '16 6';
        path.style.opacity = '1.0';
        path.style.stroke = '';
      } else {
        path.classList.remove('ai-suggestion-glow-path');
        
        if (progress > 0) {
          // Under tension: line gets thinner (min 2.5px), dashes shorter (min 4px), gap wider, opacity decreases slightly
          const strokeW = Math.max(2.5, 5.5 * (1 - progress * 0.5));
          const dashSize = Math.max(4.0, 12 * (1 - progress * 0.6));
          const gapSize = 8 + progress * 12;
          const opacityVal = 0.65 - progress * 0.15;
          
          path.style.strokeWidth = `${strokeW}px`;
          path.style.strokeDasharray = `${dashSize} ${gapSize}`;
          path.style.opacity = opacityVal.toString();
          path.style.stroke = '';
        } else {
          // Reset inline styles to default CSS
          path.style.strokeWidth = '';
          path.style.strokeDasharray = '';
          path.style.opacity = '0.65';
          path.style.stroke = '';
        }
      }
    }
    if (hoverPath) {
      hoverPath.setAttribute('d', pathD);
    }
    
    let rotation = 0;
    if (tA.isDragging || tA.selected) {
      rotation = tA.rotation;
    } else if (tB.isDragging || tB.selected) {
      rotation = tB.rotation;
    } else {
      rotation = tA.rotation;
    }
    
    // Midpoint indicator dot
    const isExpanded = dot && dot.classList.contains('expanded');
    
    if (!dot) {
      dot = document.createElement('div');
      dot.id = 'ai-suggestion-dot';
      dot.className = 'ai-indicator-dot';
      dot.style.opacity = '0';
      dot.style.scale = '0.5';
      
      // Question mark content (visible when collapsed)
      const qMark = document.createElement('span');
      qMark.className = 'ai-dot-question-mark';
      qMark.textContent = '+';
      dot.appendChild(qMark);
      
      // Expanded content (hidden until expanded)
      const expandedContent = document.createElement('div');
      expandedContent.className = 'ai-dot-expanded-content';
      
      const title = document.createElement('span');
      title.className = 'ai-dot-title';
      title.textContent = 'Verbinden';
      expandedContent.appendChild(title);
      
      const explanation = document.createElement('p');
      explanation.className = 'ai-dot-explanation';
      expandedContent.appendChild(explanation);
      
      dot.appendChild(expandedContent);
      
      // Click handler: expand the dot
      dot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dot.classList.contains('expanded')) {
          this.expandDot(tA, tB, dotX, dotY);
        }
      });
      
      document.getElementById('token-container').appendChild(dot);
      
      requestAnimationFrame(() => {
        dot.style.opacity = '1';
        dot.style.scale = '1';
      });
    } else {
      dot.style.opacity = '1';
      dot.style.scale = '1';
    }
    
    // Position the dot: when expanded, center the pill at the midpoint
    if (isExpanded) {
      const expandedW = 210;
      const expandedH = dot.offsetHeight || 60;
      dot.style.left = `${dotX - expandedW / 2}px`;
      dot.style.top = `${dotY - expandedH / 2}px`;
      // Continuously enforce repulsion while expanded
      this.repelTokensFromExpandedDot(tA, tB, dotX, dotY);
    } else {
      dot.style.left = `${dotX - 16}px`;
      dot.style.top = `${dotY - 16}px`;
    }
    dot.style.rotate = `${rotation}deg`;
    
    // Adjust pulse speed based on progress
    if (progress > 0 && !isExpanded) {
      const duration = Math.max(0.4, 2.0 * (1 - progress * 0.75));
      dot.style.animationDuration = `${duration}s`;
    } else if (!isExpanded) {
      dot.style.animationDuration = '';
    }
    
    if (hoverPath) {
      hoverPath.onpointerdown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dot || !dot.classList.contains('expanded')) {
          this.expandDot(tA, tB, dotX, dotY);
        }
      };
    }
    
    this.activeSuggestion = { pairKey, tA, tB, isClose };
  }

  expandDot(tA, tB, dotX, dotY) {
    const dot = document.getElementById('ai-suggestion-dot');
    if (!dot || dot.classList.contains('expanded')) return;
    
    // Fill explanation text
    const expl = getThemeExplanation(tA.title, tB.title);
    const explanationEl = dot.querySelector('.ai-dot-explanation');
    if (explanationEl) {
      explanationEl.textContent = expl;
    }
    
    // Expand the dot
    dot.classList.add('expanded');
    // Use actual rendered size for centering
    requestAnimationFrame(() => {
      const expandedW = 210;
      const expandedH = dot.offsetHeight || 60;
      dot.style.left = `${dotX - expandedW / 2}px`;
      dot.style.top = `${dotY - expandedH / 2}px`;
    });
    dot.style.animation = 'none'; // Stop pulsing
    
    // Push tokens away
    this.repelTokensFromExpandedDot(tA, tB, dotX, dotY);
  }

  collapseDot() {
    const dot = document.getElementById('ai-suggestion-dot');
    if (!dot || !dot.classList.contains('expanded')) return;
    
    dot.classList.remove('expanded');
    dot.style.animation = ''; // Resume pulsing
    dot.style.animationDuration = '';
    
    // Re-run positioning so the dot snaps back to collapsed offset
    this.updateAISuggestions();
  }

  repelTokensFromExpandedDot(tA, tB, midX, midY) {
    const expandedHalfW = 115; // ~half of 210px + margin
    const tokenRadius = 85;
    const minClearance = expandedHalfW + tokenRadius;
    
    [tA, tB].forEach(token => {
      if (token.isDragging) return; // Don't repel while user is holding it
      
      const dx = token.x - midX;
      const dy = token.y - midY;
      const dist = Math.hypot(dx, dy);
      
      if (dist < minClearance && dist > 0) {
        // Push token outward along the vector from midpoint to token center
        const pushDist = minClearance - dist + 5;
        const nx = dx / dist;
        const ny = dy / dist;
        
        token.x += nx * pushDist;
        token.y += ny * pushDist;
        token.applyBoundaries();
        token.updateStyle();
      } else if (dist === 0) {
        // Edge case: token is exactly at midpoint, push along line direction
        const lineDx = tB.x - tA.x;
        const lineDy = tB.y - tA.y;
        const lineDist = Math.hypot(lineDx, lineDy) || 1;
        const direction = token === tA ? -1 : 1;
        
        token.x += (lineDx / lineDist) * minClearance * direction;
        token.y += (lineDy / lineDist) * minClearance * direction;
        token.applyBoundaries();
        token.updateStyle();
      }
    });
  }

  hideAISuggestion(instant = false) {
    const path = document.getElementById('ai-suggestion-path');
    const hoverPath = document.getElementById('ai-suggestion-hover-path');
    const dot = document.getElementById('ai-suggestion-dot');
    
    if (path) {
      path.style.opacity = '0';
      path.classList.remove('ai-suggestion-glow-path');
    }
    if (hoverPath) {
      hoverPath.removeAttribute('d');
      hoverPath.onpointerdown = null;
    }
    
    if (dot) {
      dot.classList.remove('expanded');
      if (instant) {
        dot.remove();
      } else {
        dot.style.opacity = '0';
        dot.style.scale = '0.5';
        setTimeout(() => {
          if (dot.style.opacity === '0' && dot.parentNode) {
            dot.remove();
          }
        }, 300);
      }
    }
    
    this.activeSuggestion = null;
  }

  updateAISuggestions() {
    const ideas = this.tokens.filter(t => t.type !== 'group' && !t.isChild);
    
    let bestPair = null;
    let bestScore = Infinity;
    
    for (let i = 0; i < ideas.length; i++) {
      for (let j = i + 1; j < ideas.length; j++) {
        const tA = ideas[i];
        const tB = ideas[j];
        
        if (tA.editing || tB.editing) continue;
        
        const pairKey = Math.min(tA.id, tB.id) + '-' + Math.max(tA.id, tB.id);
        if (this.ignoredSuggestions.has(pairKey)) continue;
        
        const isDismissed = this.dismissedConnections.some(conn => {
          const matchId = (conn.sourceTokenId === tA.id && conn.targetTokenId === tB.id) ||
                          (conn.sourceTokenId === tB.id && conn.targetTokenId === tA.id);
          if (!matchId) return false;
          const titlesUnchanged = (conn.sourceTitle === tA.title && conn.targetTitle === tB.title) ||
                                  (conn.sourceTitle === tB.title && conn.targetTitle === tA.title);
          return titlesUnchanged;
        });
        if (isDismissed) continue;
        
        const dist = Math.hypot(tA.x - tB.x, tA.y - tB.y);
        const matchesContent = checkThemeMatch(tA.title, tB.title);
        
        let qualifies = false;
        let score = dist;
        
        const isActive = this.activeSuggestion && (this.activeSuggestion.pairKey === pairKey);
        
        if (isActive) {
          // Sticky: always keep the current suggestion unless it's broken/dismissed
          qualifies = true;
          score = -Infinity;
        } else if (dist < 280) {
          qualifies = true;
          if (matchesContent) {
            score -= 100;
          }
        } else if (matchesContent && dist < 420) {
          qualifies = true;
          score = dist - 100;
        }
        
        if (qualifies && score < bestScore) {
          bestScore = score;
          bestPair = { tA, tB, matchesContent, dist };
        }
      }
    }
    
    if (bestPair) {
      this.showAISuggestion(bestPair.tA, bestPair.tB);
    } else {
      this.hideAISuggestion();
    }
  }
}

// Instantiate manager on document load
window.addEventListener('DOMContentLoaded', () => {
  window.canvasManager = new CanvasManager();
  window.Token = Token;
  window.GroupToken = GroupToken;
});
