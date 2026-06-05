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
    
    this.setupEdgeButtons();
    this.setupBackgroundDeselect();
    this.setupWindowResize();
    
    // Add default initial tokens for immediate interaction
    this.spawnInitialTokens();
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
        });
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
    } else if (type === 'dragend') {
      this.activeDragCount = Math.max(0, this.activeDragCount - 1);
      token.isHoveringBin = false;
      token.updateStyle();
      this.updateBinMode();
      this.handleDragEnd(token);
    } else if (type === 'edit') {
      this.editToken(token);
    }
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
      },
      () => {
        // Cancel: restore original text and visibility
        token.stopEditing();
        if (token.domElement) {
          token.domElement.style.opacity = '1';
          token.domElement.style.pointerEvents = 'auto';
        }
      },
      token // pass source token for morph sizing
    );
  }
  
  updateBinMode() {
    const buttons = document.querySelectorAll('.edge-button');
    const sideRotation = { top: '180deg', bottom: '0deg', left: '90deg', right: '270deg' };
    
    buttons.forEach(btn => {
      const icon = btn.querySelector('.icon');
      if (this.activeDragCount > 0) {
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
        token.destroy();
        this.tokens = this.tokens.filter(t => t.id !== token.id);
      }, 300);
    } else {
      token.destroy();
      this.tokens = this.tokens.filter(t => t.id !== token.id);
    }
  }
}

// Instantiate manager on document load
window.addEventListener('DOMContentLoaded', () => {
  window.canvasManager = new CanvasManager();
});
