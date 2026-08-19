const STICKERS_PER_PARTICIPANT = 3;
const stickerAsset = (participant) => `/assets/stickers/sticker-${Math.max(1, Math.min(6, participant))}.png`;

export class HarvestMarket {
  constructor({ canvas, getTokens, getToolbars, getParticipantCount, onChange, onComplete, onSound }) {
    this.canvas = canvas;
    this.getTokens = getTokens;
    this.getToolbars = getToolbars;
    this.getParticipantCount = getParticipantCount;
    this.onChange = onChange;
    this.onComplete = onComplete;
    this.onSound = onSound;
    this.hud = document.getElementById('harvest-market-hud');
    this.statusElement = document.getElementById('harvest-market-status');
    this.finishButton = document.getElementById('btn-finish-harvest');
    this.finishButtonHome = this.finishButton?.parentElement || null;
    this.headerElement = document.querySelector('.session-header-edge');
    this.headerTitle = document.querySelector('.session-header-title');
    this.defaultHeaderTitle = this.headerTitle?.textContent || 'Creatieve Groeisessie';
    this.active = false;
    this.complete = false;
    this.pendingFinish = false;
    this.stickers = [];
    this.stickerIdCounter = 0;
    this.dragState = null;

    this.canvas?.addEventListener('pointerdown', (event) => this.handlePointerDown(event), true);
    this.canvas?.addEventListener('dblclick', (event) => this.handleDoubleClick(event), true);
    this.canvas?.addEventListener('keydown', (event) => this.handleKeyDown(event), true);
    window.addEventListener('pointermove', (event) => this.handleStickerDragMove(event), true);
    window.addEventListener('pointerup', (event) => this.handleStickerDragEnd(event), true);
    window.addEventListener('pointercancel', (event) => this.handleStickerDragEnd(event), true);
    this.finishButton?.addEventListener('click', () => this.requestFinish());
  }

  enter() {
    if (this.complete) return;
    this.active = true;
    this.pendingFinish = false;
    this.canvas?.classList.add('harvest-market-active');
    this.canvas?.classList.remove('harvest-market-complete');
    this.hud?.classList.remove('visible');
    this.hud?.classList.remove('complete', 'warning');
    if (this.headerTitle) this.headerTitle.textContent = 'Oogstmarkt';
    if (this.finishButton) {
      this.headerElement?.appendChild(this.finishButton);
      this.finishButton.disabled = false;
      this.finishButton.textContent = 'Afronden';
    }
    this.syncToolbars();
    this.refreshAllTokens();
    this.updateInterface();
    this.onSound?.('enter');
  }

  reset() {
    this.cancelStickerDrag();
    this.stickers.forEach(sticker => sticker.element?.remove());
    this.stickers = [];
    this.stickerIdCounter = 0;
    this.active = false;
    this.complete = false;
    this.pendingFinish = false;
    this.getEligibleTokens().forEach(token => this.clearTokenState(token));
    this.getToolbars().forEach(toolbar => toolbar.setHarvestMode(false));
    this.canvas?.classList.remove('harvest-market-active', 'harvest-market-complete');
    this.hud?.classList.remove('visible', 'complete', 'warning');
    if (this.finishButton && this.finishButtonHome) this.finishButtonHome.appendChild(this.finishButton);
    if (this.headerTitle) this.headerTitle.textContent = this.defaultHeaderTitle;
  }

  syncToolbars() {
    const harvestVisible = this.active || this.complete;
    this.getToolbars().forEach(toolbar => {
      toolbar.setHarvestMode(harvestVisible);
      if (harvestVisible) this.updateToolbar(toolbar);
    });
  }

  handlePointerDown(event) {
    if (!this.active) return;

    const stickerElement = event.target.closest('.harvest-sticker');
    const tokenElement = event.target.closest('.idea-token');
    if (!stickerElement && !tokenElement) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (stickerElement) {
      const sticker = this.stickers.find(candidate => candidate.id === Number(stickerElement.dataset.stickerId));
      if (sticker) this.startPlacedStickerDrag(sticker, event);
    }
  }

  handleDoubleClick(event) {
    if ((!this.active && !this.complete) || !event.target.closest('.idea-token')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  handleKeyDown(event) {
    if ((!this.active && !this.complete) || !['Enter', ' '].includes(event.key)) return;
    const tokenElement = event.target.closest('.idea-token');
    if (!tokenElement) return;
    event.preventDefault();
    event.stopPropagation();
  }

  startToolbarStickerDrag(participant, slot, event) {
    if (!this.active || this.dragState || this.getStickerBySlot(participant, slot)) return;
    this.beginStickerDrag({ participant, slot, sticker: null, event });
  }

  startPlacedStickerDrag(sticker, event) {
    if (!this.active || this.dragState) return;
    this.beginStickerDrag({ participant: sticker.participant, slot: sticker.slot, sticker, event });
  }

  beginStickerDrag({ participant, slot, sticker, event }) {
    this.pendingFinish = false;
    this.hud?.classList.remove('warning');
    const preview = document.createElement('img');
    preview.className = 'harvest-drag-preview';
    preview.src = stickerAsset(participant);
    preview.alt = '';
    preview.draggable = false;
    document.body.appendChild(preview);
    const sourceButton = this.canvas?.querySelector(
      `.gardening-toolbar[data-participant="${participant}"] .harvest-toolbar-sticker[data-slot="${slot}"]`
    );
    sourceButton?.classList.add('is-dragging');
    sticker?.element.classList.add('is-dragging');
    this.dragState = {
      participant,
      slot,
      stickerId: sticker?.id ?? null,
      pointerId: event.pointerId,
      preview,
      sourceButton
    };
    this.positionDragPreview(event.clientX, event.clientY);
    this.onSound?.('peel');
  }

  handleStickerDragMove(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
    event.preventDefault();
    this.positionDragPreview(event.clientX, event.clientY);
    this.setDropTarget(this.getTokenAt(event.clientX, event.clientY));
  }

  handleStickerDragEnd(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const drag = this.dragState;
    const token = event.type === 'pointercancel' ? null : this.getTokenAt(event.clientX, event.clientY);
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const toolbar = target?.closest('.gardening-toolbar');
    const sticker = drag.stickerId === null
      ? null
      : this.stickers.find(candidate => candidate.id === drag.stickerId);

    this.cancelStickerDrag();
    if (token) {
      if (sticker) this.moveSticker(sticker, token);
      else this.addSticker(drag.participant, drag.slot, token);
    } else if (sticker && Number(toolbar?.dataset.participant) === sticker.participant) {
      this.removeSticker(sticker.id);
    }
  }

  positionDragPreview(clientX, clientY) {
    if (!this.dragState) return;
    this.dragState.preview.style.left = `${clientX}px`;
    this.dragState.preview.style.top = `${clientY}px`;
  }

  getTokenAt(clientX, clientY) {
    const tokenElement = document.elementFromPoint(clientX, clientY)?.closest('.idea-token');
    return this.getEligibleTokens().find(candidate => candidate.domElement === tokenElement) || null;
  }

  setDropTarget(token) {
    this.getEligibleTokens().forEach(candidate => {
      candidate.domElement.classList.toggle('harvest-drop-target', candidate === token);
    });
  }

  cancelStickerDrag() {
    if (!this.dragState) return;
    this.dragState.preview?.remove();
    this.dragState.sourceButton?.classList.remove('is-dragging');
    if (this.dragState.stickerId !== null) {
      this.stickers.find(candidate => candidate.id === this.dragState.stickerId)?.element.classList.remove('is-dragging');
    }
    this.setDropTarget(null);
    this.dragState = null;
  }

  addSticker(participant, slot, token) {
    const sticker = {
      id: this.stickerIdCounter++,
      participant,
      slot,
      tokenId: token.id,
      element: document.createElement('span')
    };
    sticker.element.className = 'harvest-sticker placing';
    sticker.element.dataset.stickerId = String(sticker.id);
    sticker.element.dataset.participant = String(participant);
    sticker.element.setAttribute('role', 'img');
    sticker.element.setAttribute('aria-label', `Sticker van deelnemer ${participant}. Sleep om te verplaatsen of terug te leggen.`);
    sticker.element.innerHTML = `<img src="${stickerAsset(participant)}" alt="" draggable="false">`;
    token.domElement.appendChild(sticker.element);
    this.stickers.push(sticker);
    requestAnimationFrame(() => sticker.element.classList.remove('placing'));
    this.refreshAllTokens();
    this.updateInterface();
    this.notifyChange();
    this.onSound?.('place');
  }

  moveSticker(sticker, token) {
    const previousTokenId = sticker.tokenId;
    sticker.tokenId = token.id;
    token.domElement.appendChild(sticker.element);
    this.refreshTokenById(previousTokenId);
    this.refreshAllTokens();
    this.updateInterface();
    this.notifyChange();
    this.onSound?.('place');
  }

  removeSticker(stickerId) {
    const sticker = this.stickers.find(candidate => candidate.id === stickerId);
    if (!sticker) return;
    sticker.element.remove();
    this.stickers = this.stickers.filter(candidate => candidate.id !== stickerId);
    this.refreshTokenById(sticker.tokenId);
    this.refreshAllTokens();
    this.updateInterface();
    this.notifyChange();
    this.onSound?.('return');
  }

  requestFinish() {
    if (!this.active) return;
    const placed = this.stickers.length;
    if (placed === 0) {
      this.pendingFinish = false;
      this.hud?.classList.add('warning');
      if (this.statusElement) this.statusElement.textContent = 'Plaats eerst minstens één sticker op een idee.';
      if (this.finishButton) {
        this.finishButton.disabled = true;
        this.finishButton.textContent = 'Afronden';
      }
      return;
    }
    const available = this.getParticipantCount() * STICKERS_PER_PARTICIPANT;
    if (placed < available && !this.pendingFinish) {
      this.pendingFinish = true;
      this.onSound?.('tap');
      this.hud?.classList.add('warning');
      if (this.statusElement) this.statusElement.textContent = `${available - placed} stickers zijn nog niet gebruikt. Willen jullie toch afronden?`;
      if (this.finishButton) this.finishButton.textContent = 'Weet je het zeker?';
      return;
    }
    this.completeMarket();
  }

  completeMarket() {
    this.cancelStickerDrag();
    this.active = false;
    this.complete = true;
    this.pendingFinish = false;
    this.canvas?.classList.remove('harvest-market-active');
    this.canvas?.classList.add('harvest-market-complete');
    this.hud?.classList.remove('warning');
    this.hud?.classList.add('complete');
    if (this.headerTitle) this.headerTitle.textContent = 'Hoofdoogst gekozen';
    if (this.finishButton) {
      this.finishButton.textContent = 'Oogst afgerond';
      this.finishButton.disabled = true;
    }
    this.refreshAllTokens();
    this.syncToolbars();
    this.updateInterface();
    this.notifyChange();
    this.onSound?.('complete');
    this.onComplete?.(this.getSnapshot());
  }

  updateInterface(message = '') {
    this.syncToolbars();
    const canFinish = this.active && this.stickers.length > 0;
    if (this.finishButton) {
      this.finishButton.disabled = !canFinish;
      this.finishButton.title = this.active && !canFinish
        ? 'Plaats eerst minstens één sticker op een idee.'
        : '';
      this.finishButton.setAttribute('aria-disabled', String(!canFinish));
      if (this.active && !this.pendingFinish) this.finishButton.textContent = 'Afronden';
    }
    if (!this.statusElement) return;
    if (message) {
      this.statusElement.textContent = message;
      return;
    }
    if (this.complete) {
      const leaders = this.getLeaderTokens();
      this.statusElement.textContent = leaders.length === 0
        ? 'De Oogstmarkt is afgerond zonder geplaatste stickers.'
        : `${leaders.length === 1 ? 'Dit idee vormt' : 'Deze ideeën vormen'} samen de hoofdopbrengst van jullie sessie.`;
      return;
    }
    this.statusElement.textContent = '';
  }

  updateToolbar(toolbar) {
    const participant = toolbar.participantIndex;
    toolbar.updateHarvestState({
      placedSlots: this.stickers
        .filter(sticker => sticker.participant === participant)
        .map(sticker => sticker.slot),
      complete: this.complete
    });
  }

  refreshAllTokens() {
    const tokens = this.getEligibleTokens();
    tokens.forEach(token => this.refreshToken(token));
    const maxVotes = tokens.reduce((max, token) => Math.max(max, this.getTokenVoteCount(token.id)), 0);
    tokens.forEach(token => {
      const votes = this.getTokenVoteCount(token.id);
      token.domElement.classList.toggle('harvest-leader', maxVotes > 0 && votes === maxVotes);
    });
  }

  refreshTokenById(tokenId) {
    const token = this.getEligibleTokens().find(candidate => candidate.id === tokenId);
    if (token) this.refreshToken(token);
  }

  refreshToken(token) {
    const tokenStickers = this.stickers
      .filter(sticker => sticker.tokenId === token.id)
      .sort((a, b) => a.participant - b.participant || a.id - b.id);
    const votes = tokenStickers.length;
    token.domElement.dataset.harvestVotes = String(votes);
    token.domElement.style.setProperty('--harvest-scale', String(1 + Math.min(0.18, votes * 0.035)));
    token.domElement.classList.toggle('harvest-supported', votes > 0);
    tokenStickers.forEach((sticker, index) => this.positionSticker(sticker.element, index, tokenStickers.length, token.domElement));
  }

  positionSticker(element, index, count, tokenElement) {
    const radiusX = Math.max(58, tokenElement.offsetWidth * 0.43);
    const radiusY = Math.max(40, tokenElement.offsetHeight * 0.43);
    const angle = count === 1 ? -0.72 : (-Math.PI / 2) + (index / count) * Math.PI * 2;
    const x = Math.cos(angle) * radiusX;
    const y = Math.sin(angle) * radiusY;
    element.style.left = `calc(50% + ${x}px)`;
    element.style.top = `calc(50% + ${y}px)`;
    element.style.setProperty('--sticker-size', `${count > 12 ? 32 : (count > 8 ? 38 : 46)}px`);
    element.style.setProperty('--sticker-tilt', `${((index * 29) % 15) - 7}deg`);
  }

  clearTokenState(token) {
    token.domElement.classList.remove('harvest-supported', 'harvest-leader');
    token.domElement.removeAttribute('data-harvest-votes');
    token.domElement.style.removeProperty('--harvest-scale');
  }

  getEligibleTokens() {
    return this.getTokens().filter(token => !token.isChild && token.domElement?.isConnected);
  }

  getStickerBySlot(participant, slot) {
    return this.stickers.find(sticker => sticker.participant === participant && sticker.slot === slot) || null;
  }

  getTokenVoteCount(tokenId) {
    return this.stickers.filter(sticker => sticker.tokenId === tokenId).length;
  }

  getLeaderTokens() {
    const tokens = this.getEligibleTokens();
    const maxVotes = tokens.reduce((max, token) => Math.max(max, this.getTokenVoteCount(token.id)), 0);
    return maxVotes === 0 ? [] : tokens.filter(token => this.getTokenVoteCount(token.id) === maxVotes);
  }

  getSnapshot() {
    return {
      active: this.active,
      complete: this.complete,
      stickers: this.stickers.map(sticker => ({ participant: sticker.participant, slot: sticker.slot, tokenId: sticker.tokenId })),
      leaders: this.getLeaderTokens().map(token => ({ id: token.id, title: token.title, votes: this.getTokenVoteCount(token.id) }))
    };
  }

  notifyChange() {
    this.onChange?.(this.getSnapshot());
  }
}
