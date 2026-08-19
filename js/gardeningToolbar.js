const TOOL_ICONS = {
  input: '<img class="farm-tool-icon" src="/assets/farm/seed-bag.png" alt="" draggable="false">',
  move: '<img class="farm-tool-icon" src="/assets/farm/shovel.png" alt="" draggable="false">',
  connect: '<img class="farm-tool-icon" src="/assets/farm/watering-can.png" alt="" draggable="false">'
};

export class GardeningToolbar {
  constructor({ side, positionPercent, participantIndex, activeTool, onToolChange, onHeldToolLift, onHeldToolGrab, onHeldToolMove, onHeldToolRelease, onHeldToolDock, onSeedExtracted, onHarvestStickerDragStart }) {
    this.side = side;
    this.positionPercent = positionPercent;
    this.participantIndex = participantIndex;
    this.activeTool = activeTool;
    this.onToolChange = onToolChange;
    this.onHeldToolLift = onHeldToolLift;
    this.onHeldToolGrab = onHeldToolGrab;
    this.onHeldToolMove = onHeldToolMove;
    this.onHeldToolRelease = onHeldToolRelease;
    this.onHeldToolDock = onHeldToolDock;
    this.onSeedExtracted = onSeedExtracted;
    this.onHarvestStickerDragStart = onHarvestStickerDragStart;
    this.domElement = null;
    this.contextElement = null;
    this.contextTimer = null;
    this.toolButtons = new Map();
    this.heldToolElement = null;
    this.heldTool = null;
    this.heldToolPosition = null;
    this.heldPointerId = null;
    this.heldDragOffset = { x: 0, y: 0 };
    this.heldDragOrigin = null;
    this.heldHasDragged = false;
    this.toolbarDragCleanup = null;
    this.dockTimer = null;
    this.dockNotified = false;
    this.harvestElement = null;
    this.harvestStickers = [];
    this.createDom();
  }

  createDom() {
    const root = document.createElement('div');
    root.className = `gardening-toolbar ${this.side}`;
    root.dataset.side = this.side;
    root.dataset.participant = String(this.participantIndex);
    root.style.setProperty('--toolbar-position', `${this.positionPercent}%`);
    root.setAttribute('aria-label', `Tuinman toolbar deelnemer ${this.participantIndex}`);

    const context = document.createElement('div');
    context.className = 'toolbar-context';
    context.setAttribute('aria-live', 'polite');
    root.appendChild(context);
    this.contextElement = context;

    const shell = document.createElement('div');
    shell.className = 'toolbar-shell';
    shell.setAttribute('role', 'toolbar');
    shell.setAttribute('aria-label', `Gereedschap deelnemer ${this.participantIndex}`);

    [
      ['input', 'Nieuw idee'],
      ['move', 'Verplaatsen'],
      ['connect', 'Verbinden']
    ].forEach(([tool, label]) => {
      const button = document.createElement('button');
      let lastPointerActivation = -Infinity;
      button.type = 'button';
      button.className = 'toolbar-tool';
      button.dataset.tool = tool;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(tool === this.activeTool));
      button.innerHTML = `${TOOL_ICONS[tool]}<span class="toolbar-tooltip">${label}</span>`;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        lastPointerActivation = performance.now();
        this.onToolChange(tool, this, event);
      });
      // Keyboard activation and a fallback for touch browsers that lose a
      // pointerdown after the previous tool used pointer capture.
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (performance.now() - lastPointerActivation < 500) return;
        this.onToolChange(tool, this, null);
      });
      shell.appendChild(button);
      this.toolButtons.set(tool, button);
    });

    const pruneOverlay = document.createElement('div');
    pruneOverlay.className = 'toolbar-prune-overlay';
    pruneOverlay.innerHTML = `
      <img class="toolbar-prune-icon" src="/assets/farm/pruning-shears.png" alt="" draggable="false">
      <span>Snoeien</span>`;
    shell.appendChild(pruneOverlay);

    const harvest = document.createElement('div');
    harvest.className = 'harvest-toolbar-content';
    harvest.innerHTML = Array.from({ length: 3 }, (_, slot) => `
      <button class="harvest-toolbar-sticker" type="button" data-slot="${slot}"
        aria-label="Sticker ${slot + 1} van deelnemer ${this.participantIndex}. Sleep naar een idee.">
        <img src="/assets/stickers/sticker-${this.participantIndex}.png" alt="" draggable="false">
      </button>`).join('');
    this.harvestStickers = [...harvest.querySelectorAll('.harvest-toolbar-sticker')];
    this.harvestStickers.forEach((sticker, slot) => {
      sticker.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        this.onHarvestStickerDragStart?.(this.participantIndex, slot, event, this);
      });
      sticker.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });
    shell.appendChild(harvest);
    this.harvestElement = harvest;

    root.appendChild(shell);
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.domElement = root;
    this.setActiveTool(this.activeTool);
  }

  setActiveTool(tool) {
    this.activeTool = tool;
    this.toolButtons.forEach((button, buttonTool) => {
      const active = buttonTool === tool;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  setHarvestMode(active) {
    this.domElement?.classList.toggle('harvest-mode', active);
    if (active) {
      this.returnHeldTool();
      this.hideContext();
    }
  }

  updateHarvestState({ placedSlots, complete }) {
    const usedSlots = new Set(placedSlots);
    this.domElement?.classList.toggle('harvest-empty', usedSlots.size === 3);
    this.domElement?.classList.toggle('harvest-complete', complete);
    this.harvestStickers.forEach((sticker, slot) => {
      const isPlaced = usedSlots.has(slot);
      sticker.classList.toggle('is-used', isPlaced);
      sticker.disabled = complete || isPlaced;
    });
  }

  playSeedBagOpening() {
    const button = this.toolButtons.get('input');
    const target = this.heldTool === 'input' ? this.heldToolElement : button;
    if (!target) return;
    target.classList.remove('seed-bag-opening');
    void target.offsetWidth;
    target.classList.add('seed-bag-opening');
    setTimeout(() => target?.classList.remove('seed-bag-opening'), 720);
  }

  liftTool(tool, sourceEvent = null) {
    this.returnHeldTool();
    const sourceButton = this.toolButtons.get(tool);
    const canvas = this.domElement?.closest('#canvas');
    if (!sourceButton || !canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const buttonRect = sourceButton.getBoundingClientRect();
    const startX = buttonRect.left + buttonRect.width / 2 - canvasRect.left;
    const startY = buttonRect.top + buttonRect.height / 2 - canvasRect.top;
    const inwardOffset = 88;
    const offsets = {
      top: { x: 0, y: inwardOffset },
      bottom: { x: 0, y: -inwardOffset },
      left: { x: inwardOffset, y: 0 },
      right: { x: -inwardOffset, y: 0 }
    };
    const rotations = { top: 180, bottom: 0, left: 90, right: -90 };
    const offset = offsets[this.side] || offsets.bottom;

    const heldTool = document.createElement('button');
    heldTool.type = 'button';
    heldTool.className = `held-gardening-tool held-${tool}`;
    heldTool.dataset.tool = tool;
    heldTool.dataset.participant = String(this.participantIndex);
    heldTool.setAttribute('aria-label', `${sourceButton.getAttribute('aria-label')} vastgehouden door deelnemer ${this.participantIndex}`);
    heldTool.style.left = `${startX}px`;
    heldTool.style.top = `${startY}px`;
    heldTool.style.setProperty('--held-tool-rotation', `${rotations[this.side] || 0}deg`);
    heldTool.innerHTML = TOOL_ICONS[tool];
    heldTool.addEventListener('pointerdown', (event) => this.startHeldToolDrag(event));
    heldTool.addEventListener('pointermove', (event) => this.moveHeldTool(event));
    heldTool.addEventListener('pointerup', (event) => this.endHeldToolDrag(event));
    heldTool.addEventListener('pointercancel', (event) => this.endHeldToolDrag(event));

    canvas.appendChild(heldTool);
    if (tool !== 'input') sourceButton.classList.add('is-held');
    this.heldToolElement = heldTool;
    this.heldTool = tool;
    this.dockNotified = false;
    this.heldToolPosition = { x: startX + offset.x, y: startY + offset.y };
    this.onHeldToolLift?.(tool, this, this.heldToolPosition);

    requestAnimationFrame(() => {
      heldTool.classList.add('visible');
      heldTool.style.left = `${this.heldToolPosition.x}px`;
      heldTool.style.top = `${this.heldToolPosition.y}px`;
    });

    if (sourceEvent) this.startToolbarToolDrag(sourceEvent);
  }

  startToolbarToolDrag(event) {
    if (!this.heldToolElement || !this.domElement) return;
    const pointerId = event.pointerId;
    const origin = { x: event.clientX, y: event.clientY };
    let hasDragged = false;

    const handleMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId || !this.heldToolElement) return;
      if (!hasDragged && Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y) < 6) return;
      hasDragged = true;
      this.heldPointerId = pointerId;
      this.heldDragOffset = { x: 0, y: 0 };
      this.markSeedExtracted();
      this.heldToolElement.classList.add('dragging');
      this.onHeldToolGrab?.(this.heldTool, this, this.heldToolPosition);
      this.moveHeldTool(moveEvent);
    };

    const finishDrag = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      endEvent.preventDefault();
      endEvent.stopPropagation();
      this.clearToolbarDragListeners();
      this.heldToolElement?.classList.remove('dragging');
      this.heldPointerId = null;
      this.onHeldToolRelease?.(this.heldTool, this, this.heldToolPosition, hasDragged);
      if (hasDragged && this.isHeldToolOverToolbar()) this.dockHeldTool();
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', finishDrag, true);
    window.addEventListener('pointercancel', finishDrag, true);
    this.toolbarDragCleanup = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', finishDrag, true);
      window.removeEventListener('pointercancel', finishDrag, true);
      this.toolbarDragCleanup = null;
    };
  }

  clearToolbarDragListeners() {
    this.toolbarDragCleanup?.();
  }

  startHeldToolDrag(event) {
    if (!this.heldToolElement) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = this.heldToolElement.getBoundingClientRect();
    this.heldPointerId = event.pointerId;
    this.heldDragOrigin = { x: event.clientX, y: event.clientY };
    this.heldHasDragged = false;
    this.heldDragOffset = {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2)
    };
    this.heldToolElement.setPointerCapture?.(event.pointerId);
    this.heldToolElement.classList.add('dragging');
    this.onHeldToolGrab?.(this.heldTool, this, this.heldToolPosition);
  }

  moveHeldTool(event) {
    if (!this.heldToolElement || event.pointerId !== this.heldPointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.heldDragOrigin && Math.hypot(event.clientX - this.heldDragOrigin.x, event.clientY - this.heldDragOrigin.y) >= 4) {
      this.heldHasDragged = true;
      this.markSeedExtracted();
    }
    const canvas = this.heldToolElement.closest('#canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const radius = this.heldToolElement.offsetWidth / 2;
    const x = Math.max(radius, Math.min(canvasRect.width - radius, event.clientX - canvasRect.left - this.heldDragOffset.x));
    const y = Math.max(radius, Math.min(canvasRect.height - radius, event.clientY - canvasRect.top - this.heldDragOffset.y));
    this.heldToolPosition = { x, y };
    this.heldToolElement.style.left = `${x}px`;
    this.heldToolElement.style.top = `${y}px`;
    this.domElement?.classList.toggle('tool-return-ready', this.isHeldToolOverToolbar());
    this.onHeldToolMove?.(this.heldTool, this, this.heldToolPosition, event);
  }

  markSeedExtracted() {
    if (this.heldTool !== 'input' || !this.heldToolElement) return;
    if (this.heldToolElement.classList.contains('seed-extracted')) return;
    this.heldToolElement.classList.add('seed-extracted');
    this.onSeedExtracted?.(this);
    const sourceButton = this.toolButtons.get('input');
    sourceButton?.classList.remove('seed-bag-opening');
    if (sourceButton) void sourceButton.offsetWidth;
    sourceButton?.classList.add('seed-bag-opening');
    setTimeout(() => sourceButton?.classList.remove('seed-bag-opening'), 720);
  }

  endHeldToolDrag(event) {
    if (!this.heldToolElement || event.pointerId !== this.heldPointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.heldToolElement.releasePointerCapture?.(event.pointerId);
    this.heldToolElement.classList.remove('dragging');
    this.domElement?.classList.remove('tool-return-ready');
    this.heldPointerId = null;
    this.heldDragOrigin = null;
    this.onHeldToolRelease?.(this.heldTool, this, this.heldToolPosition, this.heldHasDragged);
    if (this.heldHasDragged && this.isHeldToolOverToolbar()) this.dockHeldTool();
    this.heldHasDragged = false;
  }

  isHeldToolOverToolbar() {
    if (!this.heldToolElement || !this.domElement) return false;
    const heldRect = this.heldToolElement.getBoundingClientRect();
    const shellRect = (this.domElement.querySelector('.toolbar-shell') || this.domElement).getBoundingClientRect();
    const x = heldRect.left + heldRect.width / 2;
    const y = heldRect.top + heldRect.height / 2;
    const padding = 36;
    return x >= shellRect.left - padding && x <= shellRect.right + padding &&
      y >= shellRect.top - padding && y <= shellRect.bottom + padding;
  }

  dockHeldTool() {
    if (!this.heldToolElement || !this.domElement) return;
    const sourceButton = this.toolButtons.get(this.heldTool);
    this.onHeldToolDock?.(this.heldTool, this);
    this.dockNotified = true;
    this.domElement.classList.remove('tool-return-ready');
    this.returnHeldTool();
    if (sourceButton) {
      sourceButton.classList.remove('tool-pop-in');
      void sourceButton.offsetWidth;
      sourceButton.classList.add('tool-pop-in');
      setTimeout(() => sourceButton.classList.remove('tool-pop-in'), 380);
    }
  }

  returnHeldTool() {
    this.clearToolbarDragListeners();
    this.hideContext();
    if (this.dockTimer) clearTimeout(this.dockTimer);
    this.dockTimer = null;
    this.domElement?.classList.remove('tool-return-ready');
    if (this.heldTool) {
      if (!this.dockNotified) this.onHeldToolDock?.(this.heldTool, this);
      this.toolButtons.get(this.heldTool)?.classList.remove('is-held');
    }
    this.heldToolElement?.remove();
    this.heldToolElement = null;
    this.heldTool = null;
    this.heldToolPosition = null;
    this.heldPointerId = null;
    this.heldDragOrigin = null;
    this.heldHasDragged = false;
    this.dockNotified = false;
  }

  showSeedPlacementHint() {
    this.showContext('Zaadje klaar', 'Sleep het zaadje naar een plek op tafel.', 5600);
  }

  showContext(title, message, duration = 5200) {
    if (!this.contextElement) return;
    clearTimeout(this.contextTimer);
    const heading = document.createElement('strong');
    const detail = document.createElement('span');
    heading.textContent = title;
    detail.textContent = message;
    this.contextElement.replaceChildren(heading, detail);
    this.contextElement.className = 'toolbar-context visible';
    this.contextTimer = setTimeout(() => this.hideContext(), duration);
  }

  hideContext() {
    clearTimeout(this.contextTimer);
    this.contextTimer = null;
    this.contextElement.className = 'toolbar-context';
    this.contextElement.innerHTML = '';
  }

  destroy() {
    this.returnHeldTool();
    if (this.domElement) this.domElement.remove();
    this.domElement = null;
  }
}
