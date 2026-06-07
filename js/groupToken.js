import { Token } from './token.js';

export class GroupToken extends Token {
  constructor(id, x, y, rotation, title = "Nieuw cluster", childTokensData = [], onStateChange) {
    super(id, x, y, rotation, title, onStateChange);
    this.type = 'group';
    this.childTokensData = childTokensData; // Array of { id, title, borderRadius, rotation }
    this.childTokenInstances = []; // Active Token objects when expanded
    this.expanded = false;
    
    this.baseWidth = 160;
    this.baseHeight = 130;
    
    // Initialize temporary defaults for expanded dimensions
    this.expandedWidth = 400;
    this.expandedHeight = 234;
    this.expandedBorderRadius = '24px';
    
    if (this.badgeElement) {
      this.badgeElement.innerText = this.childTokensData ? this.childTokensData.length : 0;
    }
  }

  createDom() {
    const el = document.createElement('div');
    el.className = 'idea-token group-token spawning';
    el.id = `token-${this.id}`;
    el.style.borderRadius = this.borderRadius;
    
    // Stacked paper backgrounds for layered card look
    const layer1 = document.createElement('div');
    layer1.className = 'stack-layer stack-layer-1';
    el.appendChild(layer1);
    
    const layer2 = document.createElement('div');
    layer2.className = 'stack-layer stack-layer-2';
    el.appendChild(layer2);
    
    // Pill badge for child count
    const badge = document.createElement('div');
    badge.className = 'group-badge';
    badge.innerText = this.childTokensData ? this.childTokensData.length : 0;
    el.appendChild(badge);
    this.badgeElement = badge;
    
    // Title display
    const title = document.createElement('div');
    title.className = 'token-title';
    title.innerText = this.title;
    el.appendChild(title);
    
    this.domElement = el;
    this.titleElement = title;
    
    this.updateStyle();
    
    setTimeout(() => {
      if (this.domElement) {
        this.domElement.classList.remove('spawning');
      }
    }, 400);
    
    document.getElementById('token-container').appendChild(el);
  }

  calculateLayout() {
    const N = this.childTokensData.length;
    if (N === 0) {
      this.expandedWidth = this.baseWidth;
      this.expandedHeight = this.baseHeight;
      this.expandedBorderRadius = this.borderRadius;
      return {};
    }

    const wc = 120; // child token effective width (160 * 0.75)
    const hc = 98; // child token effective height (130 * 0.75)
    const hGap = 20;
    const vGap = 20;
    
    // Pack children in rows of maximum 3
    const maxPerRow = 3;
    const rows = [];
    let currentRow = [];
    
    this.childTokensData.forEach(child => {
      currentRow.push(child);
      if (currentRow.length === maxPerRow) {
        rows.push(currentRow);
        currentRow = [];
      }
    });
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    const R = rows.length;
    const padding = 24;
    const titleHeight = 75; // child row starts after title space
    
    // Height: padding + titleHeight + (rows * rowHeight) + gaps + padding
    const H = titleHeight + R * hc + (R - 1) * vGap + padding;
    
    // Width: max row width + 2 * padding (min 280 to fit title nicely)
    let maxRowWidth = 0;
    rows.forEach(row => {
      const M = row.length;
      const rowW = M * wc + (M - 1) * hGap;
      if (rowW > maxRowWidth) {
        maxRowWidth = rowW;
      }
    });
    const W = Math.max(maxRowWidth + padding * 2, 280);
    
    this.expandedWidth = W;
    this.expandedHeight = H;
    
    // Generate organic proportional border-radius
    const base = Math.min(W, H);
    const r1 = Math.round(base * 0.24);
    const r2 = Math.round(base * 0.32);
    const r3 = Math.round(base * 0.28);
    const r4 = Math.round(base * 0.26);
    this.expandedBorderRadius = `${r1}px ${r2}px ${r3}px ${r4}px / ${r4}px ${r3}px ${r2}px ${r1}px`;
    
    // Map child IDs to target local coordinates relative to the container center
    const targetOffsets = {};
    rows.forEach((row, r) => {
      const M = row.length;
      const rowW = M * wc + (M - 1) * hGap;
      const startX = (W - rowW) / 2;
      const yLocal = titleHeight + r * (hc + vGap) + hc/2;
      const dy = yLocal - H/2;
      
      row.forEach((child, j) => {
        const xLocal = startX + j * (wc + hGap) + wc/2;
        const dx = xLocal - W/2;
        targetOffsets[child.id] = { dx, dy };
      });
    });
    
    return targetOffsets;
  }

  updateStyle() {
    if (!this.domElement) return;
    
    if (this.expanded) {
      this.calculateLayout();
      this.domElement.classList.add('expanded');
    } else {
      this.domElement.classList.remove('expanded');
      this.domElement.style.width = `${this.baseWidth}px`;
      this.domElement.style.height = `${this.baseHeight}px`;
      this.domElement.style.borderRadius = this.borderRadius;
    }
    
    super.updateStyle();

    if (this.expanded) {
      const tx = this.x - this.expandedWidth / 2;
      const ty = this.y - this.expandedHeight / 2;
      this.domElement.style.left = `${tx}px`;
      this.domElement.style.top = `${ty}px`;
      this.domElement.style.width = `${this.expandedWidth}px`;
      this.domElement.style.height = `${this.expandedHeight}px`;
      this.domElement.style.borderRadius = this.expandedBorderRadius;
    }
    
    if (this.badgeElement) {
      this.badgeElement.innerText = this.childTokensData ? this.childTokensData.length : 0;
    }
    
    // Relayout active children if expanded (keeps them following group on drag/rotate)
    if (this.expanded && this.childTokenInstances && this.childTokenInstances.length > 0) {
      this.relayoutChildren();
    }
  }

  applyBoundaries() {
    if (this.isChild) return;
    const w = (this.expanded ? this.expandedWidth : this.baseWidth) * this.scale;
    const h = (this.expanded ? this.expandedHeight : this.baseHeight) * this.scale;
    
    const minX = w / 2;
    const maxX = window.innerWidth - w / 2;
    const minY = h / 2;
    const maxY = window.innerHeight - h / 2;
    
    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));
  }

  toggleExpand() {
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  expand() {
    if (this.expanded) return;
    this.expanded = true;
    
    if (this.domElement) {
      this.domElement.style.zIndex = '25';
    }
    
    this.updateStyle();
    if (window.canvasManager) {
      window.canvasManager.resolveGroupCollisions(this);
    }
    
    const offsets = this.calculateLayout();
    const rad = this.rotation * Math.PI / 180;
    
    this.childTokensData.forEach((data, index) => {
      const offset = offsets[data.id];
      if (!offset) return;
      
      const dx = offset.dx;
      const dy = offset.dy;
      
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
      
      const cx = this.x + rx;
      const cy = this.y + ry;
      
      // Create child token, starting from group center at scale 0
      const childToken = new Token(
        data.id,
        this.x,
        this.y,
        data.rotation !== undefined ? data.rotation : this.rotation,
        data.title,
        (t, type) => this.handleChildStateChange(t, type)
      );
      
      // Keep individual organic shapes
      childToken.borderRadius = data.borderRadius;
      if (childToken.domElement) {
        childToken.domElement.style.borderRadius = data.borderRadius;
        childToken.domElement.classList.add('child-token');
      }
      
      childToken.isChild = true;
      childToken.parentGroup = this;
      childToken.scale = 0;
      childToken.updateStyle();
      
      this.childTokenInstances.push(childToken);
      window.canvasManager.tokens.push(childToken);
      
      // Animate to position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          childToken.x = cx;
          childToken.y = cy;
          childToken.scale = 0.75;
          childToken.updateStyle();
        });
      });
    });
  }

  collapse() {
    if (!this.expanded) return;
    this.expanded = false;
    this.updateStyle();
    
    // Animate children back to center and shrink
    this.childTokenInstances.forEach(child => {
      child.x = this.x;
      child.y = this.y;
      child.scale = 0;
      child.updateStyle();
    });
    
    const instancesToDestroy = [...this.childTokenInstances];
    this.childTokenInstances = [];
    
    setTimeout(() => {
      instancesToDestroy.forEach(child => {
        child.destroy();
        window.canvasManager.tokens = window.canvasManager.tokens.filter(t => t.id !== child.id);
      });
    }, 300);
  }

  handleChildStateChange(child, type) {
    if (type === 'edit') {
      window.canvasManager.editToken(child);
    } else if (type === 'dragmove') {
      this.checkChildEjection(child);
    } else if (type === 'dragend') {
      this.handleChildDragEnd(child);
    }
    
    // Keep internal data text and rotation in sync
    const data = this.childTokensData.find(d => d.id === child.id);
    if (data) {
      if (data.title !== child.title) {
        data.title = child.title;
      }
      data.rotation = child.rotation;
    }
  }

  checkChildEjection(child) {
    const dx = child.x - this.x;
    const dy = child.y - this.y;
    const angle = -this.rotation * Math.PI / 180;
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
    
    // Boundary check using dynamic container dimensions plus buffer
    const buffer = 20;
    const borderX = this.expandedWidth / 2 + buffer;
    const borderY = this.expandedHeight / 2 + buffer;
    const isOutside = Math.abs(localX) > borderX || Math.abs(localY) > borderY;
    
    if (isOutside) {
      child.domElement.classList.add('eject-candidate');
    } else {
      child.domElement.classList.remove('eject-candidate');
    }
  }

  handleChildDragEnd(child) {
    const dx = child.x - this.x;
    const dy = child.y - this.y;
    const angle = -this.rotation * Math.PI / 180;
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
    
    const buffer = 20;
    const borderX = this.expandedWidth / 2 + buffer;
    const borderY = this.expandedHeight / 2 + buffer;
    const isOutside = Math.abs(localX) > borderX || Math.abs(localY) > borderY;
    
    if (isOutside) {
      child.domElement.classList.remove('eject-candidate');
      
      // Eject token state
      this.childTokensData = this.childTokensData.filter(d => d.id !== child.id);
      this.childTokenInstances = this.childTokenInstances.filter(inst => inst.id !== child.id);
      
      child.isChild = false;
      child.parentGroup = null;
      child.scale = 1.0;
      child.domElement.classList.remove('child-token');
      child.applyBoundaries();
      child.updateStyle();
      child.onStateChange = (t, type) => window.canvasManager.handleTokenStateChange(t, type);
      
      if (this.childTokensData.length <= 1) {
        this.dissolve();
      } else {
        this.relayoutChildren();
        this.updateStyle();
      }
    } else {
      // Snaps back
      this.relayoutChildren();
    }
  }

  relayoutChildren() {
    const offsets = this.calculateLayout();
    const rad = this.rotation * Math.PI / 180;
    
    this.childTokenInstances.forEach(child => {
      const offset = offsets[child.id];
      if (!offset) return;
      
      const dx = offset.dx;
      const dy = offset.dy;
      
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
      
      child.x = this.x + rx;
      child.y = this.y + ry;
      child.scale = 0.75;
      child.updateStyle();
    });
  }

  addChildToken(data) {
    this.childTokensData.push(data);
    
    if (this.expanded) {
      const childToken = new Token(
        data.id,
        this.x,
        this.y,
        data.rotation !== undefined ? data.rotation : this.rotation,
        data.title,
        (t, type) => this.handleChildStateChange(t, type)
      );
      
      childToken.borderRadius = data.borderRadius;
      if (childToken.domElement) {
        childToken.domElement.style.borderRadius = data.borderRadius;
        childToken.domElement.classList.add('child-token');
      }
      
      childToken.isChild = true;
      childToken.parentGroup = this;
      childToken.scale = 0;
      childToken.updateStyle();
      
      this.childTokenInstances.push(childToken);
      window.canvasManager.tokens.push(childToken);
      
      this.updateStyle();
      if (window.canvasManager) {
        window.canvasManager.resolveGroupCollisions(this);
      }
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.relayoutChildren();
        });
      });
    } else {
      this.updateStyle();
    }
  }

  dissolve() {
    if (this.childTokenInstances.length > 0) {
      const remainingChild = this.childTokenInstances[0];
      
      remainingChild.isChild = false;
      remainingChild.parentGroup = null;
      remainingChild.scale = 1.0;
      remainingChild.domElement.classList.remove('child-token');
      remainingChild.applyBoundaries();
      remainingChild.updateStyle();
      remainingChild.onStateChange = (t, type) => window.canvasManager.handleTokenStateChange(t, type);
      
      this.childTokenInstances = [];
    } else if (this.childTokensData.length > 0) {
      const data = this.childTokensData[0];
      const token = new Token(
        data.id,
        this.x,
        this.y,
        this.rotation,
        data.title,
        (t, type) => window.canvasManager.handleTokenStateChange(t, type)
      );
      token.borderRadius = data.borderRadius;
      if (token.domElement) {
        token.domElement.style.borderRadius = data.borderRadius;
      }
      token.applyBoundaries();
      token.updateStyle();
      window.canvasManager.tokens.push(token);
    }
    
    this.destroy();
    window.canvasManager.tokens = window.canvasManager.tokens.filter(t => t.id !== this.id);
  }
}
