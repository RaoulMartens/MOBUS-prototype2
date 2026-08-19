import { InputCard } from './inputCard.js?v=toolbar-keyboard-v1';
import { Token } from './token.js?v=organic-footprint-v4';
import { GroupToken } from './groupToken.js?v=organic-footprint-v4';
import { GardeningToolbar } from './gardeningToolbar.js?v=farm-sounds-v1';
import { TerrainBackground } from './terrainBackground.js?v=unified-contour-v4';
import { HarvestMarket } from './harvestMarket.js?v=farm-sounds-v1';
import { FarmSoundEffects } from './farmSoundEffects.js?v=cheerful-ambient-v7';
import { generateGroupName, checkThemeMatch, getThemeExplanation } from './nameGenerator.js';

class SubtleSoundEffects {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Pre-generate a 2-second white noise buffer for natural sounds (like leaf rustles / breeze)
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  playPlant() {
    // Sprout sound: Organic dewdrop water droplet "plop"
    this.init();
    if (!this.ctx) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    
    // Frequency sweeps upwards quickly to mimic the bubble physics of a water droplet
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    // Fast volume attack, quick decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playConnect() {
    // Connection sound: Resonant bamboo/wood chime clack
    this.init();
    if (!this.ctx) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const duration = 0.35;
    
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.07, now + 0.005);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    masterGain.connect(this.ctx.destination);

    // We synthesize a natural wood percussion sound using overtones characteristic of a wood bar
    const baseFreq = 320; // Soft resonance around E4
    const partials = [
      { ratio: 1.0, vol: 1.0, decay: duration },
      { ratio: 2.76, vol: 0.45, decay: duration * 0.35 }, // First overtone of wood bar
      { ratio: 5.4, vol: 0.2, decay: duration * 0.12 }     // Second overtone of wood bar
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const partGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * p.ratio, now);

      partGain.gain.setValueAtTime(p.vol, now);
      partGain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(partGain);
      partGain.connect(masterGain);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  playSnoei() {
    // Prune sound: Soft organic leaf rustle / wind breeze
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const duration = 0.45;

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.2, now);
    
    // Sweep the bandpass frequency downwards to simulate rustling leaf motion
    filter.frequency.setValueAtTime(1500, now);
    filter.frequency.exponentialRampToValueAtTime(380, now + duration);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.04); // Slightly soft attack for rustle
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + duration);
  }

  playEdit() {
    // Edit/confirm sound: Delicate tiny water ripple / drop
    this.init();
    if (!this.ctx) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.exponentialRampToValueAtTime(1300, now + 0.05);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.05, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playKeyTap() {
    // Keyboard key tap: Extremely soft organic wood block click
    this.init();
    if (!this.ctx) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    // Small pitch slide downwards for a soft hollow tap
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.015, now + 0.002); // Very low volume to be subtle
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  playConnectionSeed() {
    this.playPlant();
  }

  playConnectionWarmth(strength = 0.5) {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const safeStrength = Math.max(0, Math.min(1, strength));
    const now = this.ctx.currentTime;
    const duration = 0.18 + safeStrength * 0.08;
    const noiseNode = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    noiseNode.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.4 + safeStrength * 0.8, now);
    filter.frequency.setValueAtTime(980 - safeStrength * 360, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.012 + safeStrength * 0.018, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noiseNode.start(now, Math.random() * 1.2);
    noiseNode.stop(now + duration);
  }

  playConnectionConfirm() {
    this.playEdit();
  }

  playConnectionFade() {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const duration = 0.42;
    const noiseNode = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    noiseNode.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2, now);
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.036, now + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noiseNode.start(now, Math.random() * 1.1);
    noiseNode.stop(now + duration);
  }

  playGrowth() {
    this.playPlant();
    setTimeout(() => this.playConnect(), 70);
  }
}

class CanvasManager {
  constructor() {
    this.tokens = [];
    this.tokenIdCounter = 0;
    this.activeDragCount = 0;
    this.ignoredSuggestions = new Set();
    this.dismissedConnections = [];
    this.isSnapping = false;
    this.activeSuggestion = null;
    this.activeConnectionSoundKey = null;
    this.lastConnectionWarmthAt = 0;
    this.lastConnectionWarmthLevel = 0;
    
    // Nudge states
    this.activeNudge = null;
    this.usedNudges = [];
    this.skippedNudges = [];
    this.createdConnections = [];
    this.createdGroups = [];
    this.silenceModeActive = false;
    this.silenceTimer = null;
    this.activeCollisionPair = null;
    this.activeContextZone = null;
    this.twoTokensTime = null;
    this.tokenSelectedTime = {};
    this.lastActivityTime = Date.now();
    this.smellEffectsEnabled = false;
    this.soundEffectsEnabled = true;
    this.sounds = new FarmSoundEffects();
    this.nudgeFeedbackElement = null;
    this.nudgeFeedbackTimeout = null;
    this.sessionGoal = 'Creatieve groeisessie';
    this.participantCount = 3;
    this.activeTool = 'move';
    this.toolbars = [];
    this.participantToolModes = new Map();
    this.tokenInteractionTools = new Map();
    this.pendingSeeds = new Map();
    this.heldToolActionStates = new Map();
    this.shovelIntervals = new Map();
    this.discoveryPatches = [];
    this.discoveryPatchCounter = 0;
    this.wateringIntervals = new Map();
    this.terrainBackground = new TerrainBackground(document.getElementById('canvas'));
    this.harvestMarket = new HarvestMarket({
      canvas: document.getElementById('canvas'),
      getTokens: () => this.tokens,
      getToolbars: () => this.toolbars,
      getParticipantCount: () => this.participantCount,
      onChange: () => {
        this.lastActivityTime = Date.now();
        this.updateGrowthVisualization();
      },
      onSound: sound => {
        if (!this.soundEffectsEnabled) return;
        const soundHandlers = {
          tap: () => this.sounds.playUiTap(),
          enter: () => this.sounds.playHarvestEnter(),
          peel: () => this.sounds.playStickerPeel(),
          place: () => this.sounds.playStickerPlace(),
          return: () => this.sounds.playStickerReturn(),
          complete: () => this.sounds.playHarvestComplete()
        };
        soundHandlers[sound]?.();
      },
      onComplete: snapshot => {
        if (snapshot.complete) this.transitionTo('sessionSummary');
      }
    });
    
    // Empty state tracking
    this.emptyStateVisible = false;
    this.emptyStateOverlay = null;
    this.exampleTokenIds = new Set();
    
    this.configureParticipantToolbars(this.participantCount);
    this.setupBackgroundDeselect();
    this.setupWindowResize();
    this.setupGroupPreviewLine();
    this.disableLegacySuggestions();
    
    // Setup state management for navigation flow
    this.setupStateManagement();
    this.setupSoundFeedback();
    this.transitionTo('welcome');
  }

  setupSoundFeedback() {
    document.addEventListener('click', event => {
      if (!this.soundEffectsEnabled) return;
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.closest('.gardening-toolbar, .virtual-keyboard')) return;
      if (button.matches('#btn-finish-harvest, #btn-session-setup-start, #btn-settings-finish, #btn-email-send')) return;
      this.sounds.playUiTap();
    });
  }

  getToolbarCenter(toolbarElement) {
    const target = toolbarElement.querySelector('.toolbar-shell') || toolbarElement;
    const rect = target.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  playConnectionAppearanceSound(pairKey) {
    if (!this.soundEffectsEnabled || this.activeConnectionSoundKey === pairKey) return;
    this.activeConnectionSoundKey = pairKey;
    this.lastConnectionWarmthAt = 0;
    this.lastConnectionWarmthLevel = 0;
    this.sounds.playConnectionSeed();
  }

  playConnectionWarmthCue(dist, softThreshold) {
    if (!this.soundEffectsEnabled) return;
    const warmth = Math.max(0, Math.min(1, 1 - ((dist - 105) / Math.max(1, softThreshold - 105))));
    if (warmth < 0.25) return;

    const now = Date.now();
    const changedEnough = Math.abs(warmth - this.lastConnectionWarmthLevel) > 0.18;
    if (now - this.lastConnectionWarmthAt < 520 || !changedEnough) return;

    this.lastConnectionWarmthAt = now;
    this.lastConnectionWarmthLevel = warmth;
    this.sounds.playConnectionWarmth(warmth);
  }

  clearConnectionSoundState(playFade = false) {
    if (playFade && this.soundEffectsEnabled && this.activeConnectionSoundKey) {
      this.sounds.playConnectionFade();
    }
    this.activeConnectionSoundKey = null;
    this.lastConnectionWarmthAt = 0;
    this.lastConnectionWarmthLevel = 0;
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

    const marks = document.createElement('div');
    marks.className = 'connection-feedforward';
    marks.innerHTML = '<span></span><span></span><span></span>';
    document.getElementById('canvas').appendChild(marks);
    this.connectionFeedforward = marks;
  }

  configureParticipantToolbars(count = this.participantCount) {
    const canvas = document.getElementById('canvas');
    const tokenContainer = document.getElementById('token-container');
    if (!canvas || !tokenContainer) return;

    this.cancelAllPendingSeeds();
    this.toolbars.forEach(toolbar => toolbar.destroy());
    this.toolbars = [];

    const layouts = {
      1: ['bottom'],
      2: ['left', 'right'],
      3: ['left', 'right', 'bottom'],
      4: ['left', 'right', 'bottom', 'bottom'],
      5: ['left', 'left', 'right', 'right', 'bottom'],
      6: ['left', 'left', 'right', 'right', 'bottom', 'bottom']
    };
    const sides = layouts[Math.max(1, Math.min(6, count))];
    const sideTotals = sides.reduce((acc, side) => {
      acc[side] = (acc[side] || 0) + 1;
      return acc;
    }, {});
    const sideSeen = {};

    sides.forEach((side, index) => {
      sideSeen[side] = (sideSeen[side] || 0) + 1;
      const total = sideTotals[side];
      const position = ((sideSeen[side]) / (total + 1)) * 100;
      const toolbar = new GardeningToolbar({
        side,
        positionPercent: position,
        participantIndex: index + 1,
        activeTool: this.participantToolModes.get(index + 1) || 'move',
        onToolChange: (tool, sourceToolbar, event) => this.setActiveTool(tool, sourceToolbar, event),
        onHeldToolLift: (tool, sourceToolbar, position) => this.handleHeldToolLift(tool, sourceToolbar, position),
        onHeldToolGrab: (tool, sourceToolbar, position) => this.handleHeldToolGrab(tool, sourceToolbar, position),
        onHeldToolMove: (tool, sourceToolbar, position) => this.handleHeldToolMove(tool, sourceToolbar, position),
        onHeldToolRelease: (tool, sourceToolbar, position, wasDragged) => this.handleHeldToolRelease(tool, sourceToolbar, position, wasDragged),
        onHeldToolDock: (tool, sourceToolbar) => this.handleHeldToolDock(tool, sourceToolbar),
        onSeedExtracted: () => {
          if (this.soundEffectsEnabled) this.sounds.playSeedPull();
        },
        onHarvestStickerDragStart: (participant, slot, event) => this.harvestMarket.startToolbarStickerDrag(participant, slot, event)
      });
      canvas.insertBefore(toolbar.domElement, tokenContainer);
      this.toolbars.push(toolbar);
      this.participantToolModes.set(index + 1, toolbar.activeTool);
    });
    this.harvestMarket.syncToolbars();
    this.updateCanvasToolState();
  }

  setActiveTool(tool, sourceToolbar = null, sourceEvent = null) {
    if (this.silenceModeActive || this.harvestMarket.active || this.harvestMarket.complete) return;
    if (!['input', 'move', 'connect'].includes(tool)) return;
    if (!sourceToolbar) return;

    this.dismissEmptyState();

    if (tool !== 'input' || this.pendingSeeds.has(sourceToolbar.participantIndex)) {
      this.cancelPendingSeed(sourceToolbar);
    }
    this.activeTool = tool;
    sourceToolbar.setActiveTool(tool);
    sourceToolbar.liftTool(tool, sourceEvent);
    this.participantToolModes.set(sourceToolbar.participantIndex, tool);
    if (tool === 'input') {
      sourceToolbar.showContext('Zaadjes', 'Sleep de zaadzak naar een plek op tafel en laat los om te planten.');
    }
    else if (tool === 'move') {
      sourceToolbar.showContext('Schep', 'Sleep de schep boven een idee en houd vast tot het loskomt.');
    } else {
      sourceToolbar.showContext('Gieter', 'Houd de gieter tussen twee ideeën tot ze samen een kluit vormen.');
    }
    this.updateCanvasToolState();
    this.clearProximityPreview();
  }

  updateCanvasToolState() {
    const modes = new Set(this.toolbars.map(toolbar => toolbar.activeTool));
    const canvasMode = modes.size === 1 ? [...modes][0] : 'mixed';
    document.getElementById('canvas')?.setAttribute('data-active-tool', canvasMode);
  }

  getToolbarForPoint(x, y) {
    let closestToolbar = null;
    let closestDistance = Infinity;
    this.toolbars.forEach(toolbar => {
      const center = this.getToolbarCenter(toolbar.heldToolElement || toolbar.domElement);
      const distance = Math.hypot(x - center.x, y - center.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestToolbar = toolbar;
      }
    });
    return closestToolbar;
  }

  getInteractionTool(token) {
    return this.tokenInteractionTools.get(token.id) || 'move';
  }

  handleHeldToolLift(tool, toolbar, position) {
    const participant = toolbar.participantIndex;
    this.clearHeldToolAction(participant);
    this.heldToolActionStates.set(participant, {
      tool,
      toolbar,
      position,
      hoveredToken: null,
      hoveredDiscovery: null,
      shovelHoverStartedAt: 0,
      lastUprootedToken: null,
      wateringPair: null,
      wateringPairKey: null,
      wateringPairMotion: null,
      wateringStartedAt: 0,
      lastTerrainWetAt: 0,
      lastTerrainWetPosition: null,
      isHeld: false,
      merging: false
    });
    if (this.soundEffectsEnabled) this.sounds.playToolLift(tool);
    if (tool === 'move') this.startShovel(toolbar);
  }

  handleHeldToolGrab(tool, toolbar, position) {
    const state = this.heldToolActionStates.get(toolbar.participantIndex);
    if (!state || state.tool !== tool) return;
    state.position = position;
    state.isHeld = true;
    if (tool === 'connect') this.startWatering(toolbar);
  }

  handleHeldToolMove(tool, toolbar, position) {
    const state = this.heldToolActionStates.get(toolbar.participantIndex);
    if (!state || state.tool !== tool) return;
    state.position = position;
    if (tool === 'move') this.updateShovelAction(state);
    if (tool === 'connect' && state.isHeld) {
      this.wetTerrainFromWateringCan(state);
      this.updateWateringConnection(state);
    }
  }

  handleHeldToolRelease(tool, toolbar, position, wasDragged = false) {
    const state = this.heldToolActionStates.get(toolbar.participantIndex);
    if (!state || state.tool !== tool) return;
    if (tool === 'input') {
      state.isHeld = false;
      if (!wasDragged) {
        toolbar.dockHeldTool();
        toolbar.showContext('Zaadjes', 'Sleep de zaadzak vanuit de toolbar naar een plek op tafel.');
        return;
      }
      if (!toolbar.isHeldToolOverToolbar()) this.plantSeedFromBag(toolbar, position);
      return;
    }
    if (tool === 'move') this.clearShovelTarget(state);
    if (tool === 'connect') {
      state.isHeld = false;
      this.stopWatering(toolbar.participantIndex);
    }
  }

  handleHeldToolDock(tool, toolbar) {
    const state = this.heldToolActionStates.get(toolbar.participantIndex);
    if (state?.tool === tool) this.clearHeldToolAction(toolbar.participantIndex);
    if (this.soundEffectsEnabled) this.sounds.playToolDock();
  }

  isDiscoveryPatchExposed(patch) {
    const sourceToken = patch?.sourceToken;
    if (!sourceToken?.domElement?.isConnected) return true;

    const mineralElement = patch.element?.querySelector('.buried-mineral');
    if (!mineralElement) return false;

    const tokenRect = sourceToken.domElement.getBoundingClientRect();
    const mineralRect = mineralElement.getBoundingClientRect();
    const overlapWidth = Math.max(0, Math.min(tokenRect.right, mineralRect.right) - Math.max(tokenRect.left, mineralRect.left));
    const overlapHeight = Math.max(0, Math.min(tokenRect.bottom, mineralRect.bottom) - Math.max(tokenRect.top, mineralRect.top));
    const mineralArea = mineralRect.width * mineralRect.height;

    if (mineralArea === 0) return false;
    return (overlapWidth * overlapHeight) / mineralArea <= 0.15;
  }

  updateShovelAction(state) {
    const { position } = state;
    if (!position) return;
    if (state.lastUprootedToken && Math.hypot(state.lastUprootedToken.x - position.x, state.lastUprootedToken.y - position.y) > 145) {
      state.lastUprootedToken = null;
    }

    const discovery = this.discoveryPatches
      .filter(patch => patch.hasGlimmer && !patch.revealed && patch.element?.isConnected && this.isDiscoveryPatchExposed(patch))
      .map(patch => ({ patch, distance: Math.hypot(patch.x - position.x, patch.y - position.y) }))
      .sort((a, b) => a.distance - b.distance)[0];
    const hoveredDiscovery = discovery && discovery.distance < 86 ? discovery.patch : null;

    if (hoveredDiscovery) {
      if (state.hoveredDiscovery !== hoveredDiscovery) {
        this.clearShovelTarget(state);
        state.hoveredDiscovery = hoveredDiscovery;
        state.shovelHoverStartedAt = Date.now();
        hoveredDiscovery.element.classList.add('shovel-discovery-target', 'shovel-digging');
        state.toolbar.heldToolElement?.classList.add('shovel-working');
        if (this.soundEffectsEnabled) this.sounds.startDigging(state.toolbar.participantIndex);
      }

      const progress = Math.min(1, (Date.now() - state.shovelHoverStartedAt) / 920);
      hoveredDiscovery.element.style.setProperty('--shovel-progress', String(progress));
      if (progress >= 1) this.revealDiscovery(state, hoveredDiscovery);
      return;
    }

    const candidates = this.tokens
      .filter(token => !token.isChild && token.isRooted && token !== state.lastUprootedToken && token.domElement && !token.editing)
      .map(token => ({ token, distance: Math.hypot(token.x - position.x, token.y - position.y) }))
      .sort((a, b) => a.distance - b.distance);
    const nearest = candidates[0];
    const hoveredToken = nearest && nearest.distance < 104 ? nearest.token : null;

    if (state.hoveredToken !== hoveredToken) {
      this.clearShovelTarget(state);
      state.hoveredToken = hoveredToken;
      state.shovelHoverStartedAt = hoveredToken ? Date.now() : 0;
      if (hoveredToken) {
        hoveredToken.domElement.classList.add('tool-scoop-target', 'shovel-digging');
        state.toolbar.heldToolElement?.classList.add('shovel-working');
        if (this.soundEffectsEnabled) this.sounds.startDigging(state.toolbar.participantIndex);
      }
    }

    if (!hoveredToken) {
      return;
    }

    const progress = Math.min(1, (Date.now() - state.shovelHoverStartedAt) / 920);
    hoveredToken.domElement.style.setProperty('--shovel-progress', String(progress));
    if (progress >= 1) this.uprootIdeaToken(state, hoveredToken);
  }

  startShovel(toolbar) {
    const participant = toolbar.participantIndex;
    this.stopShovel(participant);
    const tick = () => {
      const state = this.heldToolActionStates.get(participant);
      if (!state || state.tool !== 'move' || !toolbar.heldToolElement) return;
      this.updateShovelAction(state);
    };
    this.shovelIntervals.set(participant, setInterval(tick, 50));
  }

  stopShovel(participant) {
    const interval = this.shovelIntervals.get(participant);
    if (interval) clearInterval(interval);
    this.shovelIntervals.delete(participant);
    const state = this.heldToolActionStates.get(participant);
    if (state) this.clearShovelTarget(state);
  }

  clearShovelTarget(state) {
    if (state?.toolbar) this.sounds.stopDigging(state.toolbar.participantIndex);
    state.hoveredToken?.domElement?.classList.remove('tool-scoop-target');
    state.hoveredToken?.domElement?.classList.remove('shovel-digging');
    state.hoveredToken?.domElement?.style.removeProperty('--shovel-progress');
    state.hoveredToken = null;
    state.hoveredDiscovery?.element?.classList.remove('shovel-discovery-target', 'shovel-digging');
    state.hoveredDiscovery?.element?.style.removeProperty('--shovel-progress');
    state.hoveredDiscovery = null;
    state.shovelHoverStartedAt = 0;
    state.toolbar?.heldToolElement?.classList.remove('shovel-working');
  }

  uprootIdeaToken(state, token) {
    token.setRooted(false, true);
    token.selected = false;
    token.updateStyle();
    state.lastUprootedToken = token;
    this.terrainBackground.disturbAt(token.x, token.y, token.id, {
      width: token.baseWidth * token.scale,
      height: token.baseHeight * token.scale,
      rotation: token.rotation,
      horizontalRadii: token.shapeProfile.horizontalRadii,
      verticalRadii: token.shapeProfile.verticalRadii
    });
    this.createDiscoveryPatch(token, {
      x: token.x,
      y: token.y,
      rotation: token.rotation,
      width: token.baseWidth * token.scale,
      height: token.baseHeight * token.scale
    });
    this.emitSoilParticles(token);
    this.clearShovelTarget(state);
    if (navigator.vibrate) navigator.vibrate([14, 28, 20]);
    if (this.soundEffectsEnabled) this.sounds.playShovel();
    this.lastActivityTime = Date.now();
  }

  rootIdeaToken(token) {
    if (!token || token.isRooted || token.isChild || !token.domElement) return;
    token.setRooted(true, true);
    this.emitSoilParticles(token, true);
    if (navigator.vibrate) navigator.vibrate(12);
    if (this.soundEffectsEnabled) this.sounds.playPlant();
    this.lastActivityTime = Date.now();
    this.updateGrowthVisualization();
  }

  createDiscoveryPatch(token, origin) {
    const canvas = document.getElementById('canvas');
    if (!canvas || !token || !origin) return;

    const id = this.discoveryPatchCounter++;
    const hasGlimmer = id % 3 === 0;
    const goldSequence = Math.floor(id / 3);
    const goldAssetNumber = (goldSequence % 3) + 1;
    const suggestion = this.getDiscoverySuggestion(goldSequence);
    const patchRotation = origin.rotation + ((id % 5) - 2) * 1.5;
    const insightShiftX = Math.max(123, Math.min(window.innerWidth - 123, origin.x)) - origin.x;
    const element = document.createElement('div');
    element.className = `discovery-patch${hasGlimmer ? ' has-glimmer' : ''}`;
    element.style.left = `${origin.x}px`;
    element.style.top = `${origin.y}px`;
    element.style.width = `${Math.max(148, origin.width || 148)}px`;
    element.style.height = `${Math.max(92, origin.height || 92)}px`;
    element.style.rotate = `${patchRotation}deg`;
    element.style.setProperty('--insight-shift-x', `${insightShiftX}px`);
    element.style.setProperty('--insight-counter-rotation', `${-patchRotation}deg`);
    element.style.setProperty('--gold-rotation', `${((goldSequence * 53) % 71) - 35}deg`);
    element.style.setProperty('--gold-scale', `${0.82 + ((goldSequence * 17) % 14) / 100}`);
    element.setAttribute('aria-label', hasGlimmer ? 'Omgewoelde aarde met een zachte gouden glinstering' : 'Omgewoelde aarde');
    element.innerHTML = `
      <span class="buried-mineral" aria-hidden="true">${hasGlimmer ? `<img src="/assets/farm/gold-${goldAssetNumber}.png" alt="">` : ''}</span>
      <span class="discovery-sparkles" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="buried-insight" role="note" aria-live="polite" aria-hidden="true">
        <span class="insight-text"></span>
        <button class="insight-close" type="button" aria-label="Sluit suggestie">
          <img src="/assets/farm/suggestion-close.svg" alt="">
        </button>
      </span>`;
    element.querySelector('.insight-text').textContent = suggestion;
    element.querySelector('.insight-close').addEventListener('click', (event) => {
      event.stopPropagation();
      element.classList.add('dismissed');
      setTimeout(() => {
        element.remove();
        this.discoveryPatches = this.discoveryPatches.filter(candidate => candidate.id !== id);
      }, 180);
    });
    canvas.appendChild(element);

    const patch = { id, x: origin.x, y: origin.y, insightShiftX, hasGlimmer, suggestion, element, sourceToken: token, revealed: false };
    this.discoveryPatches.push(patch);
    if (this.discoveryPatches.length > 12) {
      const oldest = this.discoveryPatches.shift();
      oldest?.element?.remove();
    }
  }

  getDiscoverySuggestion(seed) {
    const suggestions = [
      'Wat kun je volledig weglaten?',
      'Wat gebeurt er als je het tegenovergestelde doet?',
      'Wat als je dit extreem overdrijft?',
      'Wat als je nog maar één handeling mag gebruiken?',
      'Wat als dit zonder scherm moet werken?',
      'Wat als je de volgorde volledig omdraait?',
      'Wat als de gebruiker niets hoeft te doen?',
      'Wat als dit alleen samen met iemand anders werkt?',
      'Wat als je twee onderdelen samenvoegt die normaal losstaan?',
      'Wat als je dit in een totaal andere omgeving gebruikt?',
      'Wat als je het belangrijkste onderdeel juist onbelangrijk maakt?',
      'Wat als je één regel bewust breekt?',
      'Wat als dit tien keer groter of kleiner wordt?',
      'Wat als het systeem reageert vóórdat de gebruiker iets doet?',
      'Wat als je dit idee vanuit het tegenovergestelde perspectief bekijkt?'
    ];
    return suggestions[seed % suggestions.length];
  }

  revealDiscovery(state, discovery) {
    if (!discovery || discovery.revealed) return;
    discovery.revealed = true;
    discovery.element.classList.add('revealed');
    discovery.element.setAttribute('aria-label', 'Opengegraven provocatie');
    discovery.element.querySelector('.buried-insight')?.setAttribute('aria-hidden', 'false');
    this.emitDiscoveryParticles(discovery);
    this.clearShovelTarget(state);
    this.usedNudges.push('ontdekken');
    this.nudgesClickedCount++;
    this.lastActivityTime = Date.now();
    this.updateGrowthVisualization();
    if (navigator.vibrate) navigator.vibrate([16, 24, 28]);
    if (this.soundEffectsEnabled) this.sounds.playGold();
  }

  emitDiscoveryParticles(discovery) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const particleCount = 18;
    const cardHalfWidth = 121;
    const cardHalfHeight = 53;
    const cardCenterX = discovery.x + (discovery.insightShiftX || 0);

    for (let index = 0; index < particleCount; index++) {
      const particle = document.createElement('span');
      const angle = (index / particleCount) * Math.PI * 2 + 0.12;
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);
      const edgeScale = 1 / Math.max(Math.abs(directionX) / cardHalfWidth, Math.abs(directionY) / cardHalfHeight);
      const edgeX = directionX * edgeScale;
      const edgeY = directionY * edgeScale;
      const distance = 18 + (index % 4) * 7;
      particle.className = index % 3 === 0 ? 'discovery-particle is-gold' : 'discovery-particle';
      particle.style.left = `${cardCenterX + edgeX}px`;
      particle.style.top = `${discovery.y + edgeY}px`;
      particle.style.setProperty('--discovery-x', `${directionX * distance}px`);
      particle.style.setProperty('--discovery-y', `${directionY * distance}px`);
      particle.style.setProperty('--discovery-delay', `${index * 18}ms`);
      canvas.appendChild(particle);
      setTimeout(() => particle.remove(), 1250);
    }
  }

  emitSoilParticles(token, settling = false) {
    const canvas = document.getElementById('canvas');
    if (!canvas || !token) return;
    const width = token.domElement?.offsetWidth || token.baseWidth * token.scale;
    const height = token.domElement?.offsetHeight || token.baseHeight * token.scale;
    const rotation = token.rotation * Math.PI / 180;
    const particleCount = 11;

    for (let index = 0; index < particleCount; index++) {
      const angle = (index / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.24;
      const localX = Math.cos(angle) * (width / 2 + 5);
      const localY = Math.sin(angle) * (height / 2 + 5);
      const edgeX = localX * Math.cos(rotation) - localY * Math.sin(rotation);
      const edgeY = localX * Math.sin(rotation) + localY * Math.cos(rotation);
      const edgeLength = Math.hypot(edgeX, edgeY) || 1;
      const normalX = edgeX / edgeLength;
      const normalY = edgeY / edgeLength;
      const outwardDistance = 10 + Math.random() * 20;
      const particle = document.createElement('span');
      particle.className = `soil-particle${settling ? ' settling' : ''}`;
      particle.style.left = `${token.x + edgeX}px`;
      particle.style.top = `${token.y + edgeY}px`;
      particle.style.setProperty('--soil-out-x', `${normalX * outwardDistance + (Math.random() - 0.5) * 7}px`);
      particle.style.setProperty('--soil-out-y', `${normalY * outwardDistance + (settling ? 8 + Math.random() * 9 : -13 - Math.random() * 22)}px`);
      particle.style.setProperty('--soil-in-x', `${-normalX * (7 + Math.random() * 8)}px`);
      particle.style.setProperty('--soil-delay', `${index * 16}ms`);
      canvas.appendChild(particle);
      setTimeout(() => particle.remove(), 720);
    }
  }

  startWatering(toolbar) {
    const participant = toolbar.participantIndex;
    this.stopWatering(participant);
    const activeState = this.heldToolActionStates.get(participant);
    if (!activeState?.isHeld) return;
    if (this.soundEffectsEnabled) this.sounds.startWater(participant);
    toolbar.heldToolElement?.classList.add('watering-active');
    const tick = () => {
      const state = this.heldToolActionStates.get(participant);
      if (!state?.isHeld || state.tool !== 'connect' || !toolbar.heldToolElement) return;
      this.emitWaterDrop(toolbar);
      this.wetTerrainFromWateringCan(state, true);
      this.updateWateringConnection(state);
    };
    tick();
    this.wateringIntervals.set(participant, setInterval(tick, 115));
  }

  emitWaterDrop(toolbar) {
    const position = toolbar.heldToolPosition;
    const canvas = document.getElementById('canvas');
    if (!position || !canvas || this.currentState !== 'tableSession') return;
    const geometry = this.getWateringGeometry(toolbar, position);
    const drop = document.createElement('img');
    const fallDistance = 116 + Math.random() * 34;
    const endSpread = 12 + fallDistance * 0.13;
    const sidewaysJitter = (Math.random() - 0.5) * endSpread * 2;
    const horizontalTravel = geometry.flow.x * (16 + Math.random() * 10) + sidewaysJitter;
    const startX = geometry.outlet.x + (Math.random() - 0.5) * 3;
    const startY = geometry.outlet.y + (Math.random() - 0.5) * 2;
    const delay = Math.random() * 16;
    const duration = 820 + Math.random() * 210;
    drop.className = 'watering-drop';
    drop.src = this.getWaterDropAsset();
    drop.alt = '';
    drop.draggable = false;
    drop.dataset.wateringParticipant = String(toolbar.participantIndex);
    drop.style.left = `${startX}px`;
    drop.style.top = `${startY}px`;
    drop.style.setProperty('--drop-size', `${14 + Math.random() * 6}px`);
    drop.style.setProperty('--drop-rotation', `${(Math.random() - 0.5) * 18}deg`);
    drop.style.setProperty('--drop-reflect', Math.random() < 0.5 ? '-1' : '1');
    drop.style.setProperty('--drop-mid-x', `${horizontalTravel * (0.24 + Math.random() * 0.12)}px`);
    drop.style.setProperty('--drop-mid-y', `${36 + Math.random() * 13}px`);
    drop.style.setProperty('--drop-x', `${horizontalTravel}px`);
    drop.style.setProperty('--drop-y', `${fallDistance}px`);
    drop.style.setProperty('--drop-duration', `${duration}ms`);
    drop.style.animationDelay = `${delay}ms`;
    canvas.appendChild(drop);
    setTimeout(() => {
      if (!drop.isConnected) return;
      this.emitWaterImpact(
        canvas,
        toolbar.participantIndex,
        startX + horizontalTravel,
        startY + fallDistance
      );
      drop.remove();
    }, duration + delay - 20);
  }

  getWaterDropAsset() {
    return `/assets/farm/driplets/driplet-${Math.floor(Math.random() * 6) + 1}.png`;
  }

  emitWaterImpact(canvas, participant, x, y) {
    const ripple = document.createElement('span');
    ripple.className = 'watering-impact-ripple';
    ripple.dataset.wateringParticipant = String(participant);
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.setProperty('--ripple-rotation', `${(Math.random() - 0.5) * 18}deg`);
    canvas.appendChild(ripple);
    setTimeout(() => ripple.remove(), 520);

    const splashCount = 1 + Math.floor(Math.random() * 3);
    for (let index = 0; index < splashCount; index++) {
      const splash = document.createElement('img');
      const angle = Math.PI * (1.08 + Math.random() * 0.84);
      const distance = 8 + Math.random() * 15;
      const impactX = Math.cos(angle) * distance;
      const impactY = Math.sin(angle) * distance;
      splash.className = 'watering-impact-drop';
      splash.src = this.getWaterDropAsset();
      splash.alt = '';
      splash.draggable = false;
      splash.dataset.wateringParticipant = String(participant);
      splash.style.left = `${x}px`;
      splash.style.top = `${y}px`;
      splash.style.setProperty('--impact-size', `${8 + Math.random() * 6}px`);
      splash.style.setProperty('--impact-mid-x', `${impactX * 0.46}px`);
      splash.style.setProperty('--impact-mid-y', `${impactY * 0.7 - 9}px`);
      splash.style.setProperty('--impact-x', `${impactX}px`);
      splash.style.setProperty('--impact-y', `${impactY}px`);
      splash.style.setProperty('--impact-rotation', `${(Math.random() - 0.5) * 70}deg`);
      splash.style.setProperty('--impact-reflect', Math.random() < 0.5 ? '-1' : '1');
      splash.style.animationDelay = `${index * 24}ms`;
      canvas.appendChild(splash);
      setTimeout(() => splash.remove(), 620 + index * 24);
    }
  }

  getWateringGeometry(toolbar, position = toolbar.heldToolPosition) {
    const baseRotations = { top: 180, bottom: 0, left: 90, right: -90 };
    const rotation = ((baseRotations[toolbar.side] || 0) - 45) * Math.PI / 180;
    const rotateOffset = (x, y) => ({
      x: x * Math.cos(rotation) - y * Math.sin(rotation),
      y: x * Math.sin(rotation) + y * Math.cos(rotation)
    });
    const spoutOffset = rotateOffset(-29, -7);
    const flow = rotateOffset(-1, -0.15);
    const flowLength = Math.hypot(flow.x, flow.y) || 1;
    const normalizedFlow = { x: flow.x / flowLength, y: flow.y / flowLength };
    const outlet = {
      x: position.x + spoutOffset.x,
      y: position.y + spoutOffset.y
    };
    return {
      outlet,
      flow: normalizedFlow,
      landing: {
        x: outlet.x + normalizedFlow.x * 21,
        y: outlet.y + 132
      }
    };
  }

  wetTerrainFromWateringCan(state, force = false) {
    if (!state.position || this.currentState !== 'tableSession') return;
    const now = performance.now();
    const target = this.getWateringGeometry(state.toolbar, state.position).landing;
    const previous = state.lastTerrainWetPosition;
    const distance = previous ? Math.hypot(target.x - previous.x, target.y - previous.y) : Infinity;
    if (!force && (now - state.lastTerrainWetAt < 55 || distance < 14)) return;
    this.terrainBackground.wetAt(target.x, target.y, force ? 0.11 : 0.075);
    state.lastTerrainWetAt = now;
    state.lastTerrainWetPosition = target;
  }

  updateWateringConnection(state) {
    if (!state.position || state.merging) return;
    const candidates = this.tokens.filter(token => !token.isChild && !token.isDragging && token.domElement);
    let bestPair = null;
    let bestScore = Infinity;

    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const tokenA = candidates[i];
        const tokenB = candidates[j];
        if (tokenA.type === 'group' && tokenB.type === 'group') continue;
        const tokenDistance = Math.hypot(tokenA.x - tokenB.x, tokenA.y - tokenB.y);
        if (tokenDistance > 520) continue;
        const distanceA = Math.hypot(tokenA.x - state.position.x, tokenA.y - state.position.y);
        const distanceB = Math.hypot(tokenB.x - state.position.x, tokenB.y - state.position.y);
        const midpointX = (tokenA.x + tokenB.x) / 2;
        const midpointY = (tokenA.y + tokenB.y) / 2;
        const midpointDistance = Math.hypot(midpointX - state.position.x, midpointY - state.position.y);
        if (distanceA > 260 || distanceB > 260 || midpointDistance > 135) continue;
        const score = distanceA + distanceB + midpointDistance * 1.6;
        if (score < bestScore) {
          bestScore = score;
          bestPair = { tokenA, tokenB };
        }
      }
    }

    if (!bestPair) {
      this.clearWateringPair(state);
      return;
    }

    const pairKey = [bestPair.tokenA.id, bestPair.tokenB.id].sort((a, b) => a - b).join(':');
    if (state.wateringPairKey !== pairKey) {
      this.clearWateringPair(state);
      state.wateringPair = bestPair;
      state.wateringPairKey = pairKey;
      state.wateringStartedAt = Date.now();
      const startA = { x: bestPair.tokenA.x, y: bestPair.tokenA.y, rotation: bestPair.tokenA.rotation };
      const startB = { x: bestPair.tokenB.x, y: bestPair.tokenB.y, rotation: bestPair.tokenB.rotation };
      const initialDx = startB.x - startA.x;
      const initialDy = startB.y - startA.y;
      const initialDistance = Math.max(1, Math.hypot(initialDx, initialDy));
      const unitX = initialDx / initialDistance;
      const unitY = initialDy / initialDistance;
      const desiredGap = 136;
      const midpoint = { x: (startA.x + startB.x) / 2, y: (startA.y + startB.y) / 2 };
      const targetA = bestPair.tokenA.type === 'group'
        ? { x: startA.x, y: startA.y }
        : bestPair.tokenB.type === 'group'
          ? { x: startB.x - unitX * desiredGap, y: startB.y - unitY * desiredGap }
          : { x: midpoint.x - unitX * desiredGap / 2, y: midpoint.y - unitY * desiredGap / 2 };
      const targetB = bestPair.tokenB.type === 'group'
        ? { x: startB.x, y: startB.y }
        : bestPair.tokenA.type === 'group'
          ? { x: startA.x + unitX * desiredGap, y: startA.y + unitY * desiredGap }
          : { x: midpoint.x + unitX * desiredGap / 2, y: midpoint.y + unitY * desiredGap / 2 };
      state.wateringPairMotion = {
        startA,
        startB,
        targetA,
        targetB,
        normalX: -unitY,
        normalY: unitX,
        curve: Math.min(44, Math.max(16, (initialDistance - desiredGap) * 0.16)),
        direction: (bestPair.tokenA.id + bestPair.tokenB.id) % 2 === 0 ? 1 : -1
      };
      bestPair.tokenA.domElement.classList.add('watering-grow-target');
      bestPair.tokenB.domElement.classList.add('watering-grow-target');
      bestPair.tokenA.domElement.classList.add('watering-organic-motion');
      bestPair.tokenB.domElement.classList.add('watering-organic-motion');
      if (bestPair.tokenA.type === 'group') bestPair.tokenA.domElement.classList.add('watering-group-target');
      if (bestPair.tokenB.type === 'group') bestPair.tokenB.domElement.classList.add('watering-group-target');
    }

    const { tokenA, tokenB } = state.wateringPair;
    const elapsed = Date.now() - state.wateringStartedAt;
    const progress = Math.min(1, elapsed / 1850);
    const easedProgress = progress * progress * (3 - 2 * progress);
    const motion = state.wateringPairMotion;
    if (motion) {
      const arc = Math.sin(Math.PI * easedProgress) * motion.curve * motion.direction;
      const settleWobble = Math.sin(easedProgress * Math.PI * 4) * (1 - easedProgress) * 1.4;
      if (tokenA.type !== 'group') {
        tokenA.x = motion.startA.x + (motion.targetA.x - motion.startA.x) * easedProgress + motion.normalX * arc;
        tokenA.y = motion.startA.y + (motion.targetA.y - motion.startA.y) * easedProgress + motion.normalY * arc;
        tokenA.rotation = motion.startA.rotation + Math.sin(Math.PI * easedProgress) * motion.direction * 4.5 + settleWobble;
        tokenA.applyBoundaries();
        tokenA.updateStyle();
      }
      if (tokenB.type !== 'group') {
        tokenB.x = motion.startB.x + (motion.targetB.x - motion.startB.x) * easedProgress - motion.normalX * arc;
        tokenB.y = motion.startB.y + (motion.targetB.y - motion.startB.y) * easedProgress - motion.normalY * arc;
        tokenB.rotation = motion.startB.rotation - Math.sin(Math.PI * easedProgress) * motion.direction * 4.5 - settleWobble;
        tokenB.applyBoundaries();
        tokenB.updateStyle();
      }
    }
    const dx = tokenB.x - tokenA.x;
    const dy = tokenB.y - tokenA.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    if (progress >= 1 || (distance < 145 && progress >= 0.72)) {
      state.merging = true;
      this.clearWateringPair(state);
      const group = tokenA.type === 'group' ? tokenA : (tokenB.type === 'group' ? tokenB : null);
      const idea = group === tokenA ? tokenB : tokenA;
      const finishConnection = () => {
        setTimeout(() => {
          state.merging = false;
        }, 420);
      };
      if (group) {
        this.addTokenToGroup(idea, group, true);
        finishConnection();
      } else {
        this.mergeTokensToGroup(tokenA, tokenB, true).finally(finishConnection);
      }
    }
  }

  clearWateringPair(state) {
    state.wateringPair?.tokenA?.domElement?.classList.remove('watering-grow-target');
    state.wateringPair?.tokenB?.domElement?.classList.remove('watering-grow-target');
    state.wateringPair?.tokenA?.domElement?.classList.remove('watering-group-target');
    state.wateringPair?.tokenB?.domElement?.classList.remove('watering-group-target');
    state.wateringPair?.tokenA?.domElement?.classList.remove('watering-organic-motion');
    state.wateringPair?.tokenB?.domElement?.classList.remove('watering-organic-motion');
    state.wateringPair = null;
    state.wateringPairKey = null;
    state.wateringPairMotion = null;
    state.wateringStartedAt = 0;
  }

  stopWatering(participant) {
    this.sounds.stopWater(participant);
    const interval = this.wateringIntervals.get(participant);
    if (interval) clearInterval(interval);
    this.wateringIntervals.delete(participant);
    const state = this.heldToolActionStates.get(participant);
    if (state) {
      state.toolbar?.heldToolElement?.classList.remove('watering-active');
      this.clearWateringPair(state);
    }
    document.querySelectorAll(`[data-watering-participant="${participant}"]`).forEach(drop => drop.remove());
  }

  clearHeldToolAction(participant) {
    const state = this.heldToolActionStates.get(participant);
    if (state) {
      this.clearShovelTarget(state);
      this.clearWateringPair(state);
    }
    this.stopShovel(participant);
    this.stopWatering(participant);
    this.heldToolActionStates.delete(participant);
  }

  plantSeedFromBag(toolbar, position) {
    if (!position || toolbar.heldTool !== 'input') return;
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const edgePadding = 38;
    const canvasRect = canvas.getBoundingClientRect();
    const targetX = Math.max(edgePadding, Math.min(canvasRect.width - edgePadding, position.x));
    const targetY = Math.max(edgePadding, Math.min(canvasRect.height - edgePadding, position.y));

    this.createPendingSeed('round', toolbar, {
      originX: targetX,
      originY: targetY,
      targetX,
      targetY,
      autoPlace: true,
      fromDrag: true
    });

    window.setTimeout(() => {
      if (toolbar.heldTool === 'input') toolbar.dockHeldTool();
    }, 60);
  }

  createPendingSeed(seedType, toolbar, placement = null) {
    this.cancelPendingSeed(toolbar);
    const side = toolbar.side;
    const { x: toolbarX, y: toolbarY } = this.getToolbarCenter(toolbar.heldToolElement || toolbar.domElement);
    let spawnX = toolbarX;
    let spawnY = toolbarY;
    let rotation = 0;
    const offset = 112;
    if (side === 'top') {
      spawnY = toolbarY + offset;
      rotation = 180;
    } else if (side === 'bottom') {
      spawnY = toolbarY - offset;
      rotation = 0;
    } else if (side === 'left') {
      spawnX = toolbarX + offset;
      rotation = 90;
    } else if (side === 'right') {
      spawnX = toolbarX - offset;
      rotation = 270;
    }
    if (placement) {
      spawnX = placement.targetX;
      spawnY = placement.targetY;
    }

    this.dismissEmptyState();

    const pendingElement = document.createElement('div');
    const launchX = (placement?.originX ?? toolbarX) - spawnX;
    const launchY = (placement?.originY ?? toolbarY) - spawnY;
    const launchDistance = Math.hypot(launchX, launchY) || 1;
    const arcDirection = toolbar.participantIndex % 2 === 0 ? -1 : 1;
    const arcX = (-launchY / launchDistance) * 14 * arcDirection;
    const arcY = (launchX / launchDistance) * 14 * arcDirection;
    const arrivalClass = placement?.fromDrag ? 'settling-from-drag' : 'launching-from-bag';
    pendingElement.className = `pending-seed-token seed-${seedType} ${arrivalClass}`;
    pendingElement.style.left = `${spawnX}px`;
    pendingElement.style.top = `${spawnY}px`;
    pendingElement.style.rotate = `${rotation}deg`;
    pendingElement.style.setProperty('--seed-launch-x', `${launchX}px`);
    pendingElement.style.setProperty('--seed-launch-y', `${launchY}px`);
    pendingElement.style.setProperty('--seed-launch-mid-x', `${launchX * 0.48 + arcX}px`);
    pendingElement.style.setProperty('--seed-launch-mid-y', `${launchY * 0.48 + arcY}px`);
    pendingElement.style.setProperty('--seed-launch-start-rotation', `${rotation - 32}deg`);
    pendingElement.style.setProperty('--seed-launch-end-rotation', `${rotation}deg`);
    pendingElement.setAttribute('role', 'button');
    pendingElement.setAttribute('tabindex', '0');
    pendingElement.setAttribute('aria-label', 'Sleep dit zaadje naar een plek op tafel');
    pendingElement.innerHTML = '<span class="pending-seed-shell"><i></i></span>';
    document.getElementById('token-container').appendChild(pendingElement);

    toolbar.hideContext();
    const pendingSeed = {
      seedType,
      toolbar,
      spawnX,
      spawnY,
      rotation,
      element: pendingElement,
      pointerId: null,
      dragOffset: { x: 0, y: 0 },
      dragOrigin: null,
      placed: false,
      autoPlace: Boolean(placement?.autoPlace),
      hintTimer: null,
      inputCard: null
    };
    this.pendingSeeds.set(toolbar.participantIndex, pendingSeed);
    pendingElement.addEventListener('pointerdown', (event) => this.startPendingSeedDrag(pendingSeed, event));
    pendingElement.addEventListener('pointermove', (event) => this.movePendingSeed(pendingSeed, event));
    pendingElement.addEventListener('pointerup', (event) => this.endPendingSeedDrag(pendingSeed, event));
    pendingElement.addEventListener('pointercancel', (event) => this.endPendingSeedDrag(pendingSeed, event));
    pendingElement.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !pendingSeed.placed) {
        event.preventDefault();
        this.finishPendingSeedPlacement(pendingSeed);
      }
    });
    pendingElement.addEventListener('animationend', () => {
      pendingElement.classList.remove('launching-from-bag', 'settling-from-drag');
      if (pendingSeed.autoPlace) this.finishPendingSeedPlacement(pendingSeed);
    }, { once: true });
    if (!pendingSeed.autoPlace) {
      pendingSeed.hintTimer = setTimeout(() => {
        if (this.pendingSeeds.get(toolbar.participantIndex) === pendingSeed && !pendingSeed.placed) {
          toolbar.showSeedPlacementHint();
        }
        pendingSeed.hintTimer = null;
      }, 680);
    }
  }

  startPendingSeedDrag(pendingSeed, event) {
    if (pendingSeed.placed || this.pendingSeeds.get(pendingSeed.toolbar.participantIndex) !== pendingSeed) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = pendingSeed.element.getBoundingClientRect();
    pendingSeed.pointerId = event.pointerId;
    pendingSeed.dragOrigin = { x: event.clientX, y: event.clientY };
    pendingSeed.dragOffset = {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2)
    };
    pendingSeed.element.setPointerCapture?.(event.pointerId);
    pendingSeed.element.classList.add('dragging');
  }

  movePendingSeed(pendingSeed, event) {
    if (pendingSeed.placed || event.pointerId !== pendingSeed.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const canvasRect = document.getElementById('canvas').getBoundingClientRect();
    const radius = pendingSeed.element.offsetWidth / 2;
    pendingSeed.spawnX = Math.max(radius, Math.min(canvasRect.width - radius, event.clientX - canvasRect.left - pendingSeed.dragOffset.x));
    pendingSeed.spawnY = Math.max(radius, Math.min(canvasRect.height - radius, event.clientY - canvasRect.top - pendingSeed.dragOffset.y));
    pendingSeed.element.style.left = `${pendingSeed.spawnX}px`;
    pendingSeed.element.style.top = `${pendingSeed.spawnY}px`;
  }

  endPendingSeedDrag(pendingSeed, event) {
    if (pendingSeed.placed || event.pointerId !== pendingSeed.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    pendingSeed.element.releasePointerCapture?.(event.pointerId);
    pendingSeed.element.classList.remove('dragging');
    pendingSeed.pointerId = null;
    pendingSeed.dragOrigin = null;
    this.finishPendingSeedPlacement(pendingSeed);
  }

  finishPendingSeedPlacement(pendingSeed) {
    if (pendingSeed.placed || this.pendingSeeds.get(pendingSeed.toolbar.participantIndex) !== pendingSeed) return;
    pendingSeed.placed = true;
    pendingSeed.element.classList.remove('dragging');
    pendingSeed.element.classList.add('placed');
    pendingSeed.element.setAttribute('tabindex', '-1');
    pendingSeed.element.setAttribute('aria-label', 'Geplaatst zaadje, voer je idee in');
    pendingSeed.toolbar.hideContext();

    const cardHalfWidth = 175;
    const cardHalfHeight = 143;
    const edgeGap = 18;
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const toolbarShell = pendingSeed.toolbar.domElement.querySelector('.toolbar-shell') || pendingSeed.toolbar.domElement;
    const toolbarRect = toolbarShell.getBoundingClientRect();
    const keyboardOriginX = toolbarRect.left + toolbarRect.width / 2 - canvasRect.left;
    const keyboardOriginY = toolbarRect.top + toolbarRect.height / 2 - canvasRect.top;
    let targetX = keyboardOriginX;
    let targetY = keyboardOriginY;

    if (pendingSeed.toolbar.side === 'bottom') {
      targetY = toolbarRect.top - canvasRect.top - cardHalfHeight - edgeGap;
    } else if (pendingSeed.toolbar.side === 'top') {
      targetY = toolbarRect.bottom - canvasRect.top + cardHalfHeight + edgeGap;
    } else if (pendingSeed.toolbar.side === 'left') {
      targetX = toolbarRect.right - canvasRect.left + cardHalfWidth + edgeGap;
    } else if (pendingSeed.toolbar.side === 'right') {
      targetX = toolbarRect.left - canvasRect.left - cardHalfWidth - edgeGap;
    }

    targetX = Math.max(cardHalfWidth + 16, Math.min(canvasRect.width - cardHalfWidth - 16, targetX));
    targetY = Math.max(cardHalfHeight + 16, Math.min(canvasRect.height - cardHalfHeight - 16, targetY));

    pendingSeed.inputCard = new InputCard(
      this.tokenIdCounter++,
      keyboardOriginX,
      keyboardOriginY,
      targetX,
      targetY,
      pendingSeed.rotation,
      null,
      (text) => this.confirmPendingSeed(pendingSeed.toolbar, text),
      () => this.cancelPendingSeed(pendingSeed.toolbar),
      null,
      { originKind: 'toolbar' }
    );
  }

  confirmPendingSeed(toolbar, text) {
    const pendingSeed = this.pendingSeeds.get(toolbar.participantIndex);
    if (!pendingSeed) return;
    const { spawnX, spawnY, rotation } = pendingSeed;
    pendingSeed.element.remove();
    this.pendingSeeds.delete(toolbar.participantIndex);

    const tokenId = this.tokenIdCounter++;
    const token = new Token(tokenId, spawnX, spawnY, rotation, text, (t, type, event) => this.handleTokenStateChange(t, type, event));
    token.applyBoundaries();
    token.updateStyle();
    this.tokens.push(token);
    toolbar.hideContext();
    this.lastActivityTime = Date.now();
    this.updateAISuggestions();
    this.updateGrowthVisualization();
    if (this.soundEffectsEnabled) this.sounds.playPlant();
  }

  cancelPendingSeed(toolbar) {
    if (!toolbar) return;
    const pendingSeed = this.pendingSeeds.get(toolbar.participantIndex);
    if (!pendingSeed) return;
    const { element, hintTimer, inputCard } = pendingSeed;
    if (hintTimer) clearTimeout(hintTimer);
    if (inputCard?.domElement && !inputCard.domElement.classList.contains('destroying')) {
      inputCard.onConfirm = () => {};
      inputCard.onCancel = () => {};
      inputCard.destroy(false);
    }
    element.remove();
    this.pendingSeeds.delete(toolbar.participantIndex);
    toolbar.hideContext();
  }

  cancelAllPendingSeeds() {
    [...this.pendingSeeds.values()].forEach(({ element, inputCard }) => {
      if (inputCard?.domElement && !inputCard.domElement.classList.contains('destroying')) {
        inputCard.onConfirm = () => {};
        inputCard.onCancel = () => {};
        inputCard.destroy(false);
      }
      element.remove();
    });
    this.pendingSeeds.clear();
  }
  
  setupBackgroundDeselect() {
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('pointerdown', (e) => {
      if (e.target === canvas || e.target.id === 'token-container') {
        this.tokenSelectedTime = {};
        this.lastActivityTime = Date.now();
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

  getWallSyncSessionId() {
    return new URLSearchParams(window.location.search).get('session') || 'mobus-live';
  }

  getWallSyncStorageKey() {
    return `mobus-wall-state:${this.wallSyncSessionId}`;
  }

  emitWallEvent(type, data = null, immediate = false) {
    const event = { type, data, sentAt: Date.now() };
    // Keep the latest garden snapshot available to wall tabs opened after this event.
    // BroadcastChannel only reaches tabs that are already listening.
    try {
      localStorage.setItem(this.getWallSyncStorageKey(), JSON.stringify(event));
    } catch (error) {
      if (!this.wallStorageUnavailableNoted) {
        console.info('Persistent local wall sync is unavailable; using live tab sync only.', error);
        this.wallStorageUnavailableNoted = true;
      }
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(event);
    }
    this.postWallEvent(event, immediate);
  }

  postWallEvent(event, immediate = false) {
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) return;
    if (!immediate && Date.now() - (this.lastWallSyncAt || 0) < 500) return;
    this.lastWallSyncAt = Date.now();

    fetch(`/api/wall-state?session=${encodeURIComponent(this.wallSyncSessionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: JSON.stringify(event).length < 60000
    }).catch((error) => {
      if (!this.wallSyncOfflineNoted) {
        console.info('Live wall sync unavailable; using local BroadcastChannel only.', error);
        this.wallSyncOfflineNoted = true;
      }
    });
  }
  
  setupStateManagement() {
    this.currentState = 'welcome';
    this.nudgesClickedCount = 0;
    this.wallSyncSessionId = this.getWallSyncSessionId();
    this.lastWallSyncAt = 0;
    this.wallSyncOfflineNoted = false;
    this.wallStorageUnavailableNoted = false;

    // Establish BroadcastChannel for local synchronization
    try {
      this.broadcastChannel = new BroadcastChannel('mobus-session');
      this.broadcastChannel.addEventListener('message', (event) => {
        if (event.data?.type === 'request-state') this.updateGrowthVisualization();
      });
    } catch (error) {
      this.broadcastChannel = null;
      console.info('Local wall BroadcastChannel unavailable; live sync will still be attempted.', error);
    }

    // Elements
    this.screensContainer = document.getElementById('app-screens');
    this.canvasElement = document.getElementById('canvas');
    this.finishBtn = document.getElementById('btn-finish-session');
    if (this.finishBtn) {
      this.finishBtn.addEventListener('click', () => {
        this.enterHarvestMarket();
      });
    }

    // Buttons Setup
    document.getElementById('btn-start-session').addEventListener('click', () => {
      this.transitionTo('chooseExperience');
    });

    document.getElementById('card-growth-experience').addEventListener('click', () => {
      if (this.soundEffectsEnabled) this.sounds.playUiTap();
      this.syncSessionSetupForm();
      this.transitionTo('sessionSetup');
    });

    const sessionGoalInput = document.getElementById('session-goal-input');
    const sessionGoalError = document.getElementById('session-goal-error');
    const participantsMinus = document.getElementById('session-participants-minus');
    const participantsPlus = document.getElementById('session-participants-plus');
    const settingsParticipantsMinus = document.getElementById('settings-participants-minus');
    const settingsParticipantsPlus = document.getElementById('settings-participants-plus');
    const setupStartBtn = document.getElementById('btn-session-setup-start');

    if (participantsMinus) {
      participantsMinus.addEventListener('click', () => {
        this.setParticipantCount(this.participantCount - 1);
      });
    }

    if (participantsPlus) {
      participantsPlus.addEventListener('click', () => {
        this.setParticipantCount(this.participantCount + 1);
      });
    }

    if (settingsParticipantsMinus) {
      settingsParticipantsMinus.addEventListener('click', () => {
        this.setParticipantCount(this.participantCount - 1);
      });
    }

    if (settingsParticipantsPlus) {
      settingsParticipantsPlus.addEventListener('click', () => {
        this.setParticipantCount(this.participantCount + 1);
      });
    }

    if (sessionGoalInput && sessionGoalError) {
      sessionGoalInput.addEventListener('input', () => {
        sessionGoalInput.classList.remove('invalid');
        sessionGoalError.classList.remove('visible');
      });
    }

    if (setupStartBtn) {
      setupStartBtn.addEventListener('click', () => {
        if (this.applySessionSetup()) {
          if (this.soundEffectsEnabled) {
            this.sounds.startAmbient();
            this.sounds.playStart();
          }
          this.transitionTo('tableSession');
        }
      });
    }

    // Settings panel listeners
    const settingsBtn = document.getElementById('btn-open-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsCloseBtn = document.getElementById('btn-settings-close');
    const settingsFinishBtn = document.getElementById('btn-settings-finish');
    const settingsHelpBtn = document.getElementById('btn-settings-help');
    const helpBackBtn = document.getElementById('btn-help-back');
    const settingsMainView = document.getElementById('settings-main-view');
    const settingsHelpView = document.getElementById('settings-help-view');

    const resetSettingsView = () => {
      if (settingsMainView && settingsHelpView) {
        settingsMainView.style.display = 'flex';
        settingsHelpView.style.display = 'none';
      }
    };

    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetSettingsView();
        this.setParticipantCount(this.participantCount);
        const harvestLocked = this.harvestMarket.active || this.harvestMarket.complete;
        if (settingsParticipantsMinus) settingsParticipantsMinus.disabled = harvestLocked;
        if (settingsParticipantsPlus) settingsParticipantsPlus.disabled = harvestLocked;
        const finishLabel = settingsFinishBtn?.querySelector('span');
        if (finishLabel) finishLabel.textContent = harvestLocked ? 'Terug naar Oogstmarkt' : 'Oogsten';
        settingsPanel.classList.add('visible');
      });
    }

    if (settingsCloseBtn && settingsPanel) {
      settingsCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.remove('visible');
        resetSettingsView();
      });
    }

    if (settingsFinishBtn && settingsPanel) {
      settingsFinishBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.remove('visible');
        resetSettingsView();
        this.enterHarvestMarket();
      });
    }

    if (settingsPanel) {
      settingsPanel.addEventListener('click', (e) => {
        if (e.target === settingsPanel) {
          settingsPanel.classList.remove('visible');
          resetSettingsView();
        }
      });
    }

    if (settingsHelpBtn && settingsMainView && settingsHelpView) {
      settingsHelpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMainView.style.display = 'none';
        settingsHelpView.style.display = 'flex';
      });
    }

    if (helpBackBtn && settingsMainView && settingsHelpView) {
      helpBackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetSettingsView();
      });
    }

    const toggleSmell = document.getElementById('toggle-smell-effects');
    if (toggleSmell) {
      toggleSmell.addEventListener('change', (e) => {
        this.smellEffectsEnabled = e.target.checked;
        this.showNudgeFeedback(this.smellEffectsEnabled ? "Geureffecten aan" : "Geureffecten uit");
      });
    }

    const toggleSound = document.getElementById('toggle-sound-effects');
    if (toggleSound) {
      toggleSound.addEventListener('change', (e) => {
        this.soundEffectsEnabled = e.target.checked;
        if (!this.soundEffectsEnabled) {
          this.sounds.stopAllWater();
          this.sounds.stopAllDigging();
          this.sounds.stopAmbient();
        } else {
          this.sounds.startAmbient();
          this.sounds.playUiTap();
        }
        this.showNudgeFeedback(this.soundEffectsEnabled ? "Geluidsfeedback aan" : "Geluidsfeedback uit");
      });
    }

    document.getElementById('btn-annuleren').addEventListener('click', () => {
      this.resetSession();
      this.transitionTo('welcome');
    });

    document.getElementById('btn-afronden').addEventListener('click', () => {
      this.showEmailModal();
    });

    // Email modal handlers
    document.getElementById('btn-email-send').addEventListener('click', () => {
      this.handleEmailSend();
    });

    document.getElementById('btn-email-skip').addEventListener('click', () => {
      this.hideEmailModal();
    });

    document.getElementById('email-input').addEventListener('input', () => {
      // Clear error on typing
      document.getElementById('email-input').classList.remove('invalid');
      document.getElementById('email-error').classList.remove('visible');
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.resetSession();
      this.transitionTo('welcome');
    });
  }

  setParticipantCount(nextCount) {
    this.participantCount = Math.max(1, Math.min(6, nextCount));

    const countEls = [
      document.getElementById('session-participants-count'),
      document.getElementById('settings-participants-count')
    ];
    countEls.forEach((countEl) => {
      if (countEl) {
        countEl.textContent = String(this.participantCount);
      }
    });

    const minusBtns = [
      document.getElementById('session-participants-minus'),
      document.getElementById('settings-participants-minus')
    ];
    const plusBtns = [
      document.getElementById('session-participants-plus'),
      document.getElementById('settings-participants-plus')
    ];
    minusBtns.forEach((minusBtn) => {
      if (minusBtn) minusBtn.disabled = this.participantCount <= 1;
    });
    plusBtns.forEach((plusBtn) => {
      if (plusBtn) plusBtn.disabled = this.participantCount >= 6;
    });

    if (this.currentState === 'tableSession') {
      this.configureParticipantToolbars(this.participantCount);
    }
  }

  syncSessionSetupForm() {
    const goalInput = document.getElementById('session-goal-input');
    if (goalInput) {
      goalInput.value = this.sessionGoal === 'Creatieve groeisessie' ? '' : this.sessionGoal;
      goalInput.classList.remove('invalid');
    }

    const goalError = document.getElementById('session-goal-error');
    if (goalError) {
      goalError.classList.remove('visible');
    }

    this.setParticipantCount(this.participantCount);

    const smellToggle = document.getElementById('session-toggle-smell');
    if (smellToggle) {
      smellToggle.checked = this.smellEffectsEnabled;
    }

    const soundToggle = document.getElementById('session-toggle-sound');
    if (soundToggle) {
      soundToggle.checked = this.soundEffectsEnabled;
    }
  }

  applySessionSetup() {
    const goalInput = document.getElementById('session-goal-input');
    const goalError = document.getElementById('session-goal-error');
    const goal = goalInput ? goalInput.value.trim() : '';

    if (!goal) {
      if (goalInput) {
        goalInput.classList.add('invalid');
        goalInput.focus();
      }
      if (goalError) {
        goalError.classList.add('visible');
      }
      return false;
    }

    this.sessionGoal = goal;

    const smellToggle = document.getElementById('session-toggle-smell');
    this.smellEffectsEnabled = smellToggle ? smellToggle.checked : false;
    const settingsSmellToggle = document.getElementById('toggle-smell-effects');
    if (settingsSmellToggle) {
      settingsSmellToggle.checked = this.smellEffectsEnabled;
    }

    const soundToggle = document.getElementById('session-toggle-sound');
    this.soundEffectsEnabled = soundToggle ? soundToggle.checked : true;
    const settingsSoundToggle = document.getElementById('toggle-sound-effects');
    if (settingsSoundToggle) {
      settingsSoundToggle.checked = this.soundEffectsEnabled;
    }

    this.configureParticipantToolbars(this.participantCount);
    this.updateSessionTitle();
    return true;
  }

  updateSessionTitle() {
    const headerTitle = document.querySelector('.session-header-title');
    if (headerTitle) {
      headerTitle.textContent = this.sessionGoal;
    }

    const sessionTitleInput = document.getElementById('summary-session-title');
    if (sessionTitleInput) {
      sessionTitleInput.value = this.sessionGoal;
    }
  }

  enterHarvestMarket() {
    if (this.harvestMarket.active || this.harvestMarket.complete) return;

    this.cancelAllPendingSeeds();
    this.toolbars.forEach(toolbar => toolbar.returnHeldTool());
    [...this.heldToolActionStates.keys()].forEach(participant => this.clearHeldToolAction(participant));
    this.tokens.forEach(token => {
      if (token.type === 'group' && token.expanded) token.collapse();
      if (token.selected) {
        token.selected = false;
        token.updateStyle();
      }
    });
    this.tokenSelectedTime = {};
    this.clearProximityPreview();
    this.hideAISuggestion(true);
    if (this.emptyStateOverlay) this.emptyStateOverlay.classList.add('hidden');
    this.currentState = 'harvestMarket';
    this.harvestMarket.enter();
    this.lastActivityTime = Date.now();
    this.updateGrowthVisualization();
  }

  transitionTo(state) {
    if (state === 'sessionSummary' && !this.harvestMarket.complete) return;
    this.currentState = state;

    // Get all screen elements
    const screens = {
      welcome: document.getElementById('screen-welcome'),
      chooseExperience: document.getElementById('screen-choose'),
      sessionSetup: document.getElementById('screen-session-setup'),
      tableSession: null, // table session is canvas itself
      sessionSummary: document.getElementById('screen-summary'),
      endSession: document.getElementById('screen-end')
    };

    // Remove active class from all screens
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        screens[key].classList.remove('active');
      }
    });

    // Dim background for overlays, remove dim for tableSession
    if (state === 'tableSession') {
      this.screensContainer.classList.remove('dimmed');
      this.canvasElement.classList.add('active');
      if (this.soundEffectsEnabled) this.sounds.startAmbient();
      this.updateCanvasToolState();
      if (this.finishBtn) this.finishBtn.classList.add('visible');
      
      // If entering tabletop playground, spawn default tokens if empty
      if (this.tokens.length === 0) {
        this.spawnInitialTokens();
        this.updateAISuggestions();
      }
      this.updateGrowthVisualization();
    } else {
      this.cancelAllPendingSeeds();
      this.toolbars.forEach(toolbar => toolbar.returnHeldTool());
      this.screensContainer.classList.add('dimmed');
      this.canvasElement.classList.remove('active');
      if (this.finishBtn) this.finishBtn.classList.remove('visible');

      // Make the transition target screen active
      if (screens[state]) {
        screens[state].classList.add('active');
      }

      if (state === 'sessionSummary') {
        // Collapse any expanded group tokens first
        this.tokens.forEach(t => {
          if (t.type === 'group' && t.expanded) {
            t.collapse();
          }
        });
        this.populateSummaryScreen();
      }
      
      // Broadcast state update when overlays are shown
      this.updateGrowthVisualization();
    }
  }

  showSummaryToast(message) {
    const toast = document.getElementById('summary-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    
    // Clear previous timeout if exists
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2500);
  }

  showEmailModal() {
    const modal = document.getElementById('email-modal');
    const input = document.getElementById('email-input');
    const error = document.getElementById('email-error');
    const sendBtn = document.getElementById('btn-email-send');
    const skipBtn = document.getElementById('btn-email-skip');

    // Reset state
    input.value = '';
    input.classList.remove('invalid');
    error.classList.remove('visible');
    sendBtn.classList.remove('loading');
    sendBtn.querySelector('span').textContent = 'Versturen';
    sendBtn.disabled = false;
    skipBtn.disabled = false;
    input.disabled = false;
    modal.removeAttribute('aria-busy');

    modal.classList.add('visible');
    setTimeout(() => input.focus(), 350);
  }

  hideEmailModal() {
    document.getElementById('email-modal').classList.remove('visible');
  }

  handleEmailSend() {
    const input = document.getElementById('email-input');
    const error = document.getElementById('email-error');
    const sendBtn = document.getElementById('btn-email-send');
    const skipBtn = document.getElementById('btn-email-skip');
    const modal = document.getElementById('email-modal');
    const email = input.value.trim();

    // Validate
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      input.classList.add('invalid');
      error.classList.add('visible');
      return;
    }

    if (this.soundEffectsEnabled) this.sounds.playSend();

    // Loading state
    sendBtn.classList.add('loading');
    sendBtn.querySelector('span').textContent = 'Oogst versturen\u2026';
    sendBtn.disabled = true;
    skipBtn.disabled = true;
    input.disabled = true;
    modal.setAttribute('aria-busy', 'true');

    // Simulate send delay
    setTimeout(() => {
      // Build session result
      const sessionResult = this.buildSessionResult(email);

      // Generate structured ASCII/Text email report of full results
      const emailReport = `
============================================================
ðŸŒ± MOBUS OOGST RAPPORT: ${sessionResult.sessionTitle.toUpperCase()}
============================================================
Verzonden naar: ${email}
Datum:          ${new Date().toLocaleDateString('nl-NL')}
------------------------------------------------------------
STATISTIEKEN SUMMARY:
- Totaal aantal ideeÃ«n: ${sessionResult.totalIdeas}
- Gevormde kluiten:     ${sessionResult.groups.length}
- Losse zaden:          ${sessionResult.looseIdeas.length}
- Wortelverbindingen:  ${this.createdConnections.length}
- Gebruikte voeding:    ${sessionResult.usedNudges.length}
------------------------------------------------------------
KERNINZICHT:
${sessionResult.conclusion}
------------------------------------------------------------
VOLLEDIGE OOGST DETAILS:

${sessionResult.groups.length === 0 ? 'â–  Geen kluiten gevormd.' : sessionResult.groups.map((g, idx) => `
â–  KLUIT ${idx + 1}: "${g.title}"
  Aantal zaden: ${g.children.length}
  Zaden:
  ${g.children.map(c => `  â””â”€ "${c}"`).join('\n')}`).join('\n')}

â–  LOSSE ZADEN (VRIJ GEZAAID):
${sessionResult.looseIdeas.length === 0 ? 'Geen losse zaden.' : sessionResult.looseIdeas.map(i => `  â€¢ "${i}"`).join('\n')}

------------------------------------------------------------
WORTELVERBINDINGEN & INTERACTIES:
${this.createdConnections.length === 0 ? 'Geen wortelverbindingen gelegd.' : this.createdConnections.map((c, idx) => `  ${idx + 1}. [${c.type.toUpperCase()}] "${c.source}" â”€â”€> "${c.target}"`).join('\n')}

------------------------------------------------------------
SUGGESTIES VAN MOBUS (AI VOEDING):
- Gebruikt (${sessionResult.usedNudges.length}):
${sessionResult.usedNudges.length === 0 ? '  (Geen)' : sessionResult.usedNudges.map(n => `  âœ“ "${n}"`).join('\n')}
- Overgeslagen (${sessionResult.skippedNudges.length}):
${sessionResult.skippedNudges.length === 0 ? '  (Geen)' : sessionResult.skippedNudges.map(n => `  âœ— "${n}"`).join('\n')}
============================================================
`;
      console.log('Session result:', sessionResult);
      console.log(emailReport);

      this.hideEmailModal();
      if (this.soundEffectsEnabled) this.sounds.playSuccess();
      this.transitionTo('endSession');
    }, 1100);
  }

  buildSessionResult(email) {
    const groups = this.tokens.filter(t => t.type === 'group');
    const soloIdeas = this.tokens.filter(t => t.type !== 'group' && !t.isChild);
    const totalIdeasCount = soloIdeas.length + groups.reduce((acc, g) => acc + g.childTokensData.length, 0);

    const sessionTitleInput = document.getElementById('summary-session-title');
    const sessionTitle = sessionTitleInput ? sessionTitleInput.value : 'Wachten als creatieve pauze';

    // Generate smart summary conclusion based on statistics
    let conclusion = "De groeisessie leverde vooral losse zaden op. Een vervolgstap kan zijn om wortelverbindingen te maken, ze te laten botsen of te groeperen tot kluiten.";
    if (this.usedNudges.length >= 3) {
      conclusion = "MOBUS voegde suggesties toe om de zaden vanuit meerdere perspectieven te laten groeien.";
    } else if (this.createdConnections.length > 0 || groups.length > 0) {
      conclusion = "De groeisessie bracht vooral wortelverbindingen binnen de gevormde kluiten naar voren.";
    }

    return {
      sessionTitle,
      totalIdeas: totalIdeasCount,
      looseIdeas: soloIdeas.map(t => t.title),
      groups: groups.map(g => ({
        title: g.title,
        children: g.childTokensData.map(c => c.title)
      })),
      usedNudges: [...this.usedNudges],
      skippedNudges: [...this.skippedNudges],
      conclusion,
      email
    };
  }

  populateSummaryScreen() {
    const groups = this.tokens.filter(t => t.type === 'group');
    const soloIdeas = this.tokens.filter(t => t.type !== 'group' && !t.isChild);
    const totalIdeasCount = soloIdeas.length + groups.reduce((acc, g) => acc + g.childTokensData.length, 0);
    
    // Set Stats numbers
    document.getElementById('stat-ideas-count').textContent = totalIdeasCount;
    document.getElementById('stat-groups-count').textContent = groups.length;
    document.getElementById('stat-connections-count').textContent = this.createdConnections.length;
    document.getElementById('stat-nudges-count').textContent = this.usedNudges.length;

    const placedStickerCount = this.harvestMarket.getSnapshot().stickers.length;
    const stickerCountElement = document.getElementById('harvest-summary-sticker-count');
    if (stickerCountElement) stickerCountElement.textContent = String(placedStickerCount);

    const ideaCountElement = document.getElementById('harvest-summary-idea-count');
    if (ideaCountElement) ideaCountElement.textContent = String(totalIdeasCount);

    const participantCountElement = document.getElementById('harvest-summary-participant-count');
    if (participantCountElement) participantCountElement.textContent = String(this.participantCount);

    // Keep the session name available for the mail report.
    const dateStr = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('summary-session-title').value = `${this.sessionGoal} - ${dateStr}`;
    const dateElement = document.getElementById('harvest-summary-date');
    if (dateElement) dateElement.textContent = dateStr;

    this.renderHarvestOverview();

    // Highlight 1: Sterkste kluit
    const strongestClusterEl = document.getElementById('highlight-strongest-cluster');
    const strongestSubEl = document.getElementById('highlight-strongest-sub');
    if (groups.length === 0) {
      strongestClusterEl.textContent = 'Geen kluiten';
      strongestSubEl.textContent = 'Probeer zaden te groeperen';
    } else {
      const strongest = groups.reduce((prev, current) => 
        (prev.childTokensData.length > current.childTokensData.length) ? prev : current
      );
      strongestClusterEl.textContent = strongest.title;
      strongestSubEl.textContent = `${strongest.childTokensData.length} ideeÃ«n`;
    }
    
    if (groups.length > 0) {
      const strongest = groups.reduce((prev, current) =>
        (prev.childTokensData.length > current.childTokensData.length) ? prev : current
      );
      strongestSubEl.textContent = `${strongest.childTokensData.length} ideeën`;
    }

    // Highlight 2: Meest actieve groeipad (Connected component analysis)
    const activePathEl = document.getElementById('highlight-active-path');
    const activeSubEl = document.getElementById('highlight-active-sub');

    // Build adjacency list for connected components graph
    const adj = {};
    const allNodes = new Set();
    this.tokens.forEach(t => {
      if (t.type === 'group') {
        allNodes.add(t.title);
      } else if (t.type !== 'group' && !t.isChild) {
        allNodes.add(t.title);
      }
    });
    this.createdConnections.forEach(c => {
      allNodes.add(c.source);
      allNodes.add(c.target);
      if (!adj[c.source]) adj[c.source] = [];
      if (!adj[c.target]) adj[c.target] = [];
      adj[c.source].push(c.target);
      adj[c.target].push(c.source);
    });

    const visited = new Set();
    const components = [];
    allNodes.forEach(node => {
      if (!visited.has(node)) {
        const compNodes = [];
        const queue = [node];
        visited.add(node);
        while (queue.length > 0) {
          const curr = queue.shift();
          compNodes.push(curr);
          const neighbors = adj[curr] || [];
          neighbors.forEach(nbr => {
            if (!visited.has(nbr)) {
              visited.add(nbr);
              queue.push(nbr);
            }
          });
        }
        // Count connections in this component
        let compEdges = 0;
        this.createdConnections.forEach(c => {
          if (compNodes.includes(c.source) && compNodes.includes(c.target)) {
            compEdges++;
          }
        });
        components.push({ nodes: compNodes, edges: compEdges });
      }
    });

    const componentsWithEdges = components.filter(c => c.edges > 0).sort((a, b) => b.edges - a.edges);
    if (componentsWithEdges.length === 0) {
      activePathEl.textContent = 'Geen groeipad';
      activeSubEl.textContent = 'Verbind meer ideeÃ«n';
    } else {
      const topComp = componentsWithEdges[0];
      const pathIndex = components.indexOf(topComp) + 1;
      activePathEl.textContent = `Pad ${pathIndex}`;
      activeSubEl.textContent = `${topComp.edges} verbindingen`;
    }
    
    if (componentsWithEdges.length === 0) {
      activeSubEl.textContent = 'Verbind meer ideeën';
    }

    // Highlight 3: Kerninzicht (Dynamic feedback based on session style)
    const insightEl = document.getElementById('highlight-insight');
    const insightSubEl = document.getElementById('highlight-insight-sub');
    if (this.usedNudges.length >= 3) {
      insightEl.textContent = "Verrijkte Verkenning";
      insightSubEl.textContent = "Externe voeding hielp zaden vanuit diverse hoeken te groeien.";
    } else if (groups.length >= 2 && this.createdConnections.length >= 5) {
      insightEl.textContent = "Sterke Samenhang";
      insightSubEl.textContent = "Hoge focus op samenhang en het smeden van thematische kluiten.";
    } else if (groups.length === 0) {
      insightEl.textContent = "Vrij Gezaaid";
      insightSubEl.textContent = "Veel losse zaden geplant; focus lag op brede ideegeneratie.";
    } else {
      insightEl.textContent = "Gefaseerde Groei";
      insightSubEl.textContent = "Mooie balans tussen zaaien van zaden en smeden van kluiten.";
    }

    // Render SVG infographic network
    this.renderInfographicSVG();
  }

  renderHarvestOverview() {
    const container = document.getElementById('harvest-overview-results');
    if (!container) return;

    container.replaceChildren();
    const votesByToken = new Map();
    this.harvestMarket.getSnapshot().stickers.forEach(sticker => {
      const voters = votesByToken.get(sticker.tokenId) || [];
      voters.push(sticker.participant);
      votesByToken.set(sticker.tokenId, voters);
    });

    const rankedTokens = this.tokens
      .filter(token => !token.isChild && token.domElement?.isConnected)
      .map(token => ({ token, voters: votesByToken.get(token.id) || [] }))
      .filter(result => result.voters.length > 0)
      .sort((a, b) => b.voters.length - a.voters.length || a.token.title.localeCompare(b.token.title, 'nl'));

    if (rankedTokens.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'harvest-overview-empty';
      empty.textContent = 'Er zijn geen stickers geplaatst.';
      container.appendChild(empty);
      return;
    }

    const highestVoteCount = rankedTokens[0].voters.length;
    rankedTokens.forEach(({ token, voters }, index) => {
      const card = document.createElement('article');
      card.className = 'harvest-result-card';
      if (voters.length === highestVoteCount) card.classList.add('is-main-harvest');

      const rank = document.createElement('span');
      rank.className = 'harvest-result-rank';
      rank.textContent = voters.length === highestVoteCount ? 'Meest gekozen' : `${index + 1}e plek`;

      const title = document.createElement('h3');
      title.className = 'harvest-result-title';
      title.textContent = token.title;

      const footer = document.createElement('div');
      footer.className = 'harvest-result-footer';

      const stickerStack = document.createElement('div');
      stickerStack.className = 'harvest-result-stickers';
      stickerStack.setAttribute('aria-label', `${voters.length} ${voters.length === 1 ? 'sticker' : 'stickers'}`);
      voters.forEach(participant => {
        const sticker = document.createElement('img');
        sticker.src = `/assets/stickers/sticker-${Math.max(1, Math.min(6, participant))}.png`;
        sticker.alt = '';
        stickerStack.appendChild(sticker);
      });

      const voteCount = document.createElement('span');
      voteCount.className = 'harvest-result-votes';
      voteCount.textContent = `${voters.length} ${voters.length === 1 ? 'sticker' : 'stickers'}`;

      footer.append(stickerStack, voteCount);
      card.append(rank, title, footer);
      container.appendChild(card);
    });
  }

  renderInfographicSVG() {
    const svg = document.getElementById('infographic-svg');
    if (!svg) return;
    svg.innerHTML = ''; // Clear existing contents

    const groups = this.tokens.filter(t => t.type === 'group');
    const soloIdeas = this.tokens.filter(t => t.type !== 'group' && !t.isChild);

    // Build node coordinates lookup
    const nodeCoords = {};

    // 1. Arrange groups in the center area
    if (groups.length === 1) {
      nodeCoords[groups[0].title] = { x: 300, y: 150, type: 'group', data: groups[0] };
    } else if (groups.length > 1) {
      groups.forEach((g, idx) => {
        const angle = (idx / groups.length) * Math.PI * 2;
        const rx = 110;
        const ry = 55;
        const x = 300 + Math.cos(angle) * rx;
        const y = 150 + Math.sin(angle) * ry;
        nodeCoords[g.title] = { x, y, type: 'group', data: g };
      });
    }

    // 2. Arrange solo ideas floating on left and right peripheries
    soloIdeas.forEach((s, idx) => {
      const isLeft = idx % 2 === 0;
      const xMin = isLeft ? 50 : 450;
      const xMax = isLeft ? 160 : 550;
      
      const x = xMin + (Math.abs(Math.sin(idx)) * (xMax - xMin));
      // Spread vertically
      const y = 40 + (idx / Math.max(1, soloIdeas.length - 1)) * 200 + (Math.cos(idx) * 12);
      nodeCoords[s.title] = { x, y, type: 'solo', data: s };
    });

    // 3. Draw connections (curved roots/vines)
    const drawnEdges = new Set();
    this.createdConnections.forEach(c => {
      const edgeKey = [c.source, c.target].sort().join('-');
      if (drawnEdges.has(edgeKey)) return;
      drawnEdges.add(edgeKey);

      const p1 = nodeCoords[c.source];
      const p2 = nodeCoords[c.target];

      if (p1 && p2) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const midX = (p1.x + p2.x) / 2;
        // Curve offset: curve roots downwards, vines upwards
        const curveOffset = c.type === 'merge' || c.type === 'add-to-group' ? 25 : -20;
        const midY = (p1.y + p2.y) / 2 + curveOffset;

        path.setAttribute('d', `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`);
        path.setAttribute('class', 'svg-edge');
        svg.appendChild(path);
      }
    });

    // 4. Draw group nodes (clusters of green overlapping circles)
    groups.forEach(g => {
      const coord = nodeCoords[g.title];
      if (!coord) return;

      const { x, y } = coord;
      const gEl = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const numCircles = 6;
      // Size proportional to the amount of ideas in the group
      const baseRadius = 8 + Math.min(10, g.childTokensData.length * 0.8);

      for (let i = 0; i < numCircles; i++) {
        const angle = (i / numCircles) * Math.PI * 2;
        const offset = baseRadius * 0.45;
        const cx = x + Math.cos(angle) * offset;
        const cy = y + Math.sin(angle) * offset;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', baseRadius);
        
        // Alternate colors between primary green (#4c5a2a) and sage green (#9a9f55)
        const isPrimary = i % 2 === 0;
        circle.setAttribute('fill', isPrimary ? 'rgba(76, 90, 42, 0.8)' : 'rgba(154, 159, 85, 0.8)');
        circle.setAttribute('stroke', '#fffdf7');
        circle.setAttribute('stroke-width', '1');
        gEl.appendChild(circle);
      }

      // Add text label
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute('x', x);
      text.setAttribute('y', y + baseRadius * 1.6 + 4);
      text.setAttribute('class', 'svg-node-text');
      
      let titleText = g.title;
      if (titleText.length > 15) titleText = titleText.substring(0, 13) + '...';
      text.textContent = titleText;
      gEl.appendChild(text);

      svg.appendChild(gEl);
    });

    // 5. Draw solo nodes (small dots representing loose ideas)
    soloIdeas.forEach(s => {
      const coord = nodeCoords[s.title];
      if (!coord) return;

      const { x, y } = coord;
      const gEl = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '5');
      circle.setAttribute('fill', 'rgba(154, 159, 85, 0.9)'); // sage green
      circle.setAttribute('stroke', '#fffdf7');
      circle.setAttribute('stroke-width', '1');
      gEl.appendChild(circle);

      // Add text label
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute('x', x);
      text.setAttribute('y', y - 8);
      text.setAttribute('class', 'svg-node-text');

      let titleText = s.title;
      if (titleText.length > 12) titleText = titleText.substring(0, 10) + '...';
      text.textContent = titleText;
      gEl.appendChild(text);

      svg.appendChild(gEl);
    });
  }

  resetSession() {
    this.sounds.stopAllWater();
    this.sounds.stopAllDigging();
    this.sounds.stopAmbient();
    this.harvestMarket.reset();
    if (this.silenceTimer) {
      clearInterval(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.silenceModeActive = false;
    document.querySelectorAll('.gardening-toolbar').forEach(toolbar => toolbar.classList.remove('muted'));
    const hud = document.querySelector('.silence-timer-hud');
    if (hud) hud.remove();
    
    if (this.activeCollisionPair) {
      this.clearCollisionPair();
    }
    
    if (this.activeContextZone) {
      this.activeContextZone.zone.remove();
      this.activeContextZone = null;
    }

    // Destroy all current tokens
    this.tokens.forEach(t => t.destroy());
    this.tokens = [];
    this.tokenIdCounter = 0;
    this.activeDragCount = 0;
    this.ignoredSuggestions.clear();
    this.dismissedConnections = [];
    this.activeSuggestion = null;
    this.nudgesClickedCount = 0;
    this.usedNudges = [];
    this.skippedNudges = [];
    this.createdConnections = [];
    this.createdGroups = [];
    this.discoveryPatches.forEach(patch => patch.element?.remove());
    this.discoveryPatches = [];
    this.discoveryPatchCounter = 0;
    this.terrainBackground.reset();
    this.cancelAllPendingSeeds();
    [...this.heldToolActionStates.keys()].forEach(participant => this.clearHeldToolAction(participant));
    this.activeTool = 'move';
    this.participantToolModes.clear();
    this.tokenInteractionTools.clear();
    this.smellEffectsEnabled = false;
    const toggleSmell = document.getElementById('toggle-smell-effects');
    if (toggleSmell) {
      toggleSmell.checked = false;
    }
    this.soundEffectsEnabled = true;
    const toggleSound = document.getElementById('toggle-sound-effects');
    if (toggleSound) {
      toggleSound.checked = true;
    }
    this.sessionGoal = 'Creatieve groeisessie';
    this.participantCount = 3;
    this.configureParticipantToolbars(this.participantCount);
    this.syncSessionSetupForm();
    
    // Broadcast reset event to the separate wall screen
    this.emitWallEvent('reset', null, true);
    
    this.hideAISuggestion(true);
    
    // Clean up empty state overlay
    if (this.emptyStateOverlay && this.emptyStateOverlay.parentNode) {
      this.emptyStateOverlay.remove();
    }
    this.emptyStateOverlay = null;
    this.emptyStateVisible = false;
    document.getElementById('canvas')?.classList.remove('toolbar-onboarding-active');
    this.exampleTokenIds.clear();
  }

  updateGrowthVisualization() {
    const groups = this.tokens.filter(t => t.type === 'group').map(g => ({
      id: g.id,
      title: g.title,
      childCount: g.childTokensData.length
    }));
    const soloIdeas = this.tokens.filter(t => t.type !== 'group' && !t.isChild).map(t => ({
      id: t.id,
      title: t.title
    }));
    
    // Count total child ideas + solo ideas
    const totalIdeas = soloIdeas.length + groups.reduce((acc, g) => acc + g.childCount, 0);
    
    // Get session title from input
    const sessionTitleInput = document.getElementById('summary-session-title');
    const sessionTitle = sessionTitleInput ? sessionTitleInput.value : 'Wachten als creatieve pauze';
    
    const isInteracting = this.activeDragCount > 0 || this.tokens.some(t => t.editing);
    
    // Broadcast state update to the separate wall screen
    this.emitWallEvent('state-update', {
      totalIdeas,
      soloIdeas,
      groups,
      sessionTitle,
      activeState: this.currentState,
      isInteracting,
      createdConnections: this.createdConnections,
      harvestMarket: this.harvestMarket.getSnapshot(),
      lastActivityTime: this.lastActivityTime
    });
  }

  spawnInitialTokens() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    this.updateSessionTitle();

    const overlay = document.createElement('div');
    overlay.className = 'empty-state-overlay';
    overlay.innerHTML = `
      <h2 class="empty-state-title">Welkom bij Associatieveld</h2>
      <p class="empty-state-subtitle">Iedere deelnemer heeft dezelfde drie gereedschappen aan de eigen tafelrand.</p>
      <div class="empty-state-tools" role="list" aria-label="Gereedschappen in de tuinman-toolbar">
        <div class="empty-state-tool" role="listitem">
          <img src="/assets/farm/seed-bag.png" alt="" draggable="false">
          <span><strong>Zaadjes</strong><small>Plant een idee</small></span>
        </div>
        <div class="empty-state-tool" role="listitem">
          <img src="/assets/farm/shovel.png" alt="" draggable="false">
          <span><strong>Schep</strong><small>Maak los en verplaats</small></span>
        </div>
        <div class="empty-state-tool" role="listitem">
          <img src="/assets/farm/watering-can.png" alt="" draggable="false">
          <span><strong>Gieter</strong><small>Verbind ideeën</small></span>
        </div>
      </div>
    `;
    document.getElementById('canvas').appendChild(overlay);
    document.getElementById('canvas').classList.add('toolbar-onboarding-active');
    this.emptyStateOverlay = overlay;
    this.emptyStateVisible = true;

    const id1 = this.tokenIdCounter++;
    const token1 = new Token(id1, w * 0.43, h * 0.61, 0, "Maak mij los met de schep", (t, type, event) => this.handleTokenStateChange(t, type, event));
    token1.applyBoundaries();
    token1.updateStyle();
    this.tokens.push(token1);
    this.exampleTokenIds.add(id1);
    
    const id2 = this.tokenIdCounter++;
    const token2 = new Token(id2, w * 0.57, h * 0.61, 0, "Houd de gieter tussen ons", (t, type, event) => this.handleTokenStateChange(t, type, event));
    token2.applyBoundaries();
    token2.updateStyle();
    this.tokens.push(token2);
    this.exampleTokenIds.add(id2);
  }
  dismissEmptyState() {
    if (!this.emptyStateVisible) return;
    this.emptyStateVisible = false;
    document.getElementById('canvas')?.classList.remove('toolbar-onboarding-active');
    
    if (this.emptyStateOverlay) {
      this.emptyStateOverlay.classList.add('hidden');
      // Remove from DOM after transition completes
      setTimeout(() => {
        if (this.emptyStateOverlay && this.emptyStateOverlay.parentNode) {
          this.emptyStateOverlay.remove();
        }
        this.emptyStateOverlay = null;
      }, 650);
    }
  }
  
  handleTokenStateChange(token, type, event = null) {
    this.lastActivityTime = Date.now();
    if (type === 'pointerintent') {
      if (this.currentState !== 'tableSession' || this.silenceModeActive) return false;
      this.dismissEmptyState();
      const toolbar = event ? this.getToolbarForPoint(event.clientX, event.clientY) : null;
      const interactionTool = toolbar?.activeTool || 'move';
      this.tokenInteractionTools.set(token.id, interactionTool);
      if (token.isChild) return interactionTool === 'move' || interactionTool === 'connect';
      if (token.isRooted || interactionTool !== 'move') return 'locked';
      return true;
    } else if (type === 'dragstart') {
      const interactionTool = this.getInteractionTool(token);
      this.activeDragCount++;
      token.domElement?.classList.toggle('connection-source', interactionTool === 'connect');
      this.updateBinMode();
      this.updateGrowthVisualization();
    } else if (type === 'dragmove') {
      const interactionTool = this.getInteractionTool(token);
      this.checkBinCollisions(token);
      this.resolveGroupCollisions(token);
      if (interactionTool === 'connect') {
        this.checkProximityGrouping(token);
      } else {
        this.clearProximityPreview();
      }
      this.updateBinMode();
      this.updateAISuggestions();
      
      // Forced silence trail dots
      if (this.silenceModeActive) {
        const trail = document.createElement('div');
        trail.className = 'trail-dot';
        trail.style.left = `${token.x}px`;
        trail.style.top = `${token.y}px`;
        document.getElementById('canvas').appendChild(trail);
        setTimeout(() => trail.remove(), 800);
      }
      
      // Update active collision tension line & label
      if (this.activeCollisionPair) {
        this.updateCollisionPairUI();
      }
      
      // Update active context zone overlap highlight
      if (this.activeContextZone) {
        this.updateContextZoneUI(token);
      }
    } else if (type === 'dragend') {
      const interactionTool = this.getInteractionTool(token);
      this.activeDragCount = Math.max(0, this.activeDragCount - 1);
      token.isHoveringBin = false;
      token.domElement?.classList.remove('connection-source');
      token.updateStyle();
      this.updateBinMode();
      this.updateAISuggestions();
      
      // Handle drag end context zone check (remove if dragged out)
      if (this.activeContextZone) {
        this.handleContextZoneDragEnd(token);
      }
      
      const candidateA = this.previewCandidateA;
      const candidateB = this.previewCandidateB;
      this.clearProximityPreview();
      
      let grouped = false;
      if (interactionTool === 'connect' && candidateA && candidateB && candidateA === token) {
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
        const deleted = this.handleDragEnd(token);
        if (!deleted && interactionTool === 'move') {
          this.rootIdeaToken(token);
        }
      }
      setTimeout(() => this.tokenInteractionTools.delete(token.id), 0);
    } else if (type === 'edit') {
      this.editToken(token);
    } else if (type === 'tap') {
      if (token.type === 'group') {
        if (this.getInteractionTool(token) === 'move') {
          token.scheduleToggle(() => token.toggleExpand());
        }
      }
    } else if (type === 'select') {
      if (token.selected) {
        this.tokenSelectedTime[token.id] = Date.now();
      } else {
        delete this.tokenSelectedTime[token.id];
      }
    }
  }
  
  checkProximityGrouping(draggedToken) {
    if (this.getInteractionTool(draggedToken) !== 'connect' || draggedToken.type === 'group' || draggedToken.isChild) return;
    
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
      if (this.connectionFeedforward) {
        const midX = (draggedToken.x + closestToken.x) / 2;
        const midY = (draggedToken.y + closestToken.y) / 2;
        const angle = Math.atan2(closestToken.y - draggedToken.y, closestToken.x - draggedToken.x) * 180 / Math.PI;
        this.connectionFeedforward.style.left = `${midX}px`;
        this.connectionFeedforward.style.top = `${midY}px`;
        this.connectionFeedforward.style.rotate = `${angle}deg`;
        this.connectionFeedforward.classList.add('visible');
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
    this.connectionFeedforward?.classList.remove('visible');
    
    this.previewCandidateA = null;
    this.previewCandidateB = null;
  }

  createGroupingGrowthEffect(sourcePoints, targetPoint) {
    const container = document.getElementById('token-container');
    if (!container) return;
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.classList.add('grouping-growth-roots');
    svg.setAttribute('aria-hidden', 'true');

    sourcePoints.forEach((source, index) => {
      const dx = targetPoint.x - source.x;
      const dy = targetPoint.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const curve = Math.min(52, Math.max(22, distance * 0.13));
      const direction = index % 2 === 0 ? 1 : -1;
      const middleX = (source.x + targetPoint.x) / 2 + (-dy / distance) * curve * direction;
      const middleY = (source.y + targetPoint.y) / 2 + (dx / distance) * curve * direction;
      const path = document.createElementNS(namespace, 'path');
      path.setAttribute('d', `M ${source.x} ${source.y} Q ${middleX} ${middleY} ${targetPoint.x} ${targetPoint.y}`);
      path.setAttribute('pathLength', '1');
      path.style.setProperty('--root-delay', `${index * 70}ms`);
      svg.appendChild(path);
    });

    const knot = document.createElement('div');
    knot.className = 'grouping-growth-knot';
    knot.style.left = `${targetPoint.x}px`;
    knot.style.top = `${targetPoint.y}px`;
    knot.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 3; index++) {
      knot.appendChild(document.createElement('i'));
    }

    container.append(svg, knot);
    window.setTimeout(() => {
      svg.remove();
      knot.remove();
    }, 1050);
  }

  animateTokenIntoGrowth(token, targetPoint, options = {}) {
    const element = token.domElement;
    if (!element) return Promise.resolve();
    const {
      curveDirection = 1,
      targetRotation = token.rotation,
      targetScale = 0.68,
      duration = 760
    } = options;
    const startRect = element.getBoundingClientRect();
    const startRotation = token.rotation;
    token.isDragging = false;
    token.x = targetPoint.x;
    token.y = targetPoint.y;
    token.rotation = targetRotation;
    token.scale = targetScale;
    element.classList.add('grouping-growth-source');
    element.style.pointerEvents = 'none';
    element.style.transition = 'none';
    token.updateStyle();

    const endRect = element.getBoundingClientRect();
    const offsetX = startRect.left + startRect.width / 2 - (endRect.left + endRect.width / 2);
    const offsetY = startRect.top + startRect.height / 2 - (endRect.top + endRect.height / 2);
    const distance = Math.max(1, Math.hypot(offsetX, offsetY));
    const bend = Math.min(48, Math.max(22, distance * 0.14)) * curveDirection;
    const bendX = (-offsetY / distance) * bend;
    const bendY = (offsetX / distance) * bend;
    const startScale = Math.max(1, startRect.width / Math.max(1, endRect.width));
    const rotationDelta = startRotation - targetRotation;

    const animation = element.animate([
      {
        transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotationDelta}deg) scale(${startScale})`,
        filter: 'drop-shadow(0 12px 12px rgba(55, 38, 16, 0.22))',
        offset: 0
      },
      {
        transform: `translate(${offsetX * 0.62 + bendX}px, ${offsetY * 0.62 + bendY}px) rotate(${rotationDelta * 0.52 + curveDirection * 2.5}deg) scale(${1 + (startScale - 1) * 0.62})`,
        filter: 'drop-shadow(0 16px 14px rgba(76, 90, 42, 0.2))',
        offset: 0.42
      },
      {
        transform: `translate(${offsetX * 0.16 - bendX * 0.18}px, ${offsetY * 0.16 - bendY * 0.18}px) rotate(${curveDirection * -1.4}deg) scale(${1 + (startScale - 1) * 0.15})`,
        filter: 'drop-shadow(0 7px 8px rgba(76, 90, 42, 0.16))',
        offset: 0.78
      },
      {
        transform: 'translate(0, 0) rotate(0deg) scale(0.92)',
        filter: 'drop-shadow(0 3px 4px rgba(76, 90, 42, 0.12))',
        offset: 0.9
      },
      {
        transform: 'translate(0, 0) rotate(0deg) scale(1)',
        filter: 'drop-shadow(0 2px 3px rgba(76, 90, 42, 0.08))',
        offset: 1
      }
    ], {
      duration,
      easing: 'cubic-bezier(0.2, 0.78, 0.25, 1)',
      fill: 'both'
    });

    return animation.finished.catch(() => undefined);
  }

  async mergeTokensToGroup(tokenA, tokenB, forceConnection = false) {
    if (!forceConnection && this.getInteractionTool(tokenA) !== 'connect' && !this.activeNudge) return;
    this.hideAISuggestion(true);
    this.tokens = this.tokens.filter(t => t.id !== tokenA.id && t.id !== tokenB.id);
    if (this.soundEffectsEnabled) {
      this.sounds.playGroup();
    }
    
    const avgX = (tokenA.x + tokenB.x) / 2;
    const avgY = (tokenA.y + tokenB.y) / 2;
    const targetRotation = tokenA.rotation;
    const targetPoint = { x: avgX, y: avgY };
    this.createGroupingGrowthEffect([
      { x: tokenA.x, y: tokenA.y },
      { x: tokenB.x, y: tokenB.y }
    ], targetPoint);

    const groupNamePromise = generateGroupName(tokenA.title, tokenB.title);
    const growthPromise = Promise.all([
      this.animateTokenIntoGrowth(tokenA, targetPoint, { curveDirection: 1, targetRotation }),
      this.animateTokenIntoGrowth(tokenB, targetPoint, { curveDirection: -1, targetRotation })
    ]);
    const [groupName] = await Promise.all([groupNamePromise, growthPromise]);

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
      (t, type, event) => this.handleTokenStateChange(t, type, event)
    );
    groupToken.domElement?.classList.remove('spawning');
    groupToken.domElement?.classList.add('grouping-growth-arrival');
    window.setTimeout(() => groupToken.domElement?.classList.remove('grouping-growth-arrival'), 900);

    this.tokens.push(groupToken);
    this.resolveGroupCollisions(groupToken);

    this.createdGroups.push({
      id: groupTokenId,
      title: groupName,
      childTitles: [tokenA.title, tokenB.title]
    });
    this.createdConnections.push({
      type: 'merge',
      source: tokenA.title,
      target: tokenB.title
    });
    this.updateGrowthVisualization();
  }

  async addTokenToGroup(token, group, forceConnection = false) {
    if (!forceConnection && this.getInteractionTool(token) !== 'connect' && !this.activeNudge) return;
    this.hideAISuggestion(true);
    this.tokens = this.tokens.filter(t => t.id !== token.id);
    if (this.soundEffectsEnabled) {
      this.sounds.playGroup();
    }
    
    const targetPoint = { x: group.x, y: group.y };
    this.createGroupingGrowthEffect([{ x: token.x, y: token.y }], targetPoint);
    group.domElement?.classList.add('grouping-growth-receiving');
    await this.animateTokenIntoGrowth(token, targetPoint, {
      curveDirection: token.x <= group.x ? 1 : -1,
      targetRotation: group.rotation,
      targetScale: 0.62,
      duration: 720
    });
    token.destroy();
      
    group.addChildToken({
      id: token.id,
      title: token.title,
      borderRadius: token.borderRadius,
      rotation: group.rotation
    });
    group.domElement?.classList.remove('grouping-growth-receiving');
    group.domElement?.classList.add('grouping-growth-settled');
    window.setTimeout(() => group.domElement?.classList.remove('grouping-growth-settled'), 620);
      
    this.createdConnections.push({
      type: 'add-to-group',
      source: token.title,
      target: group.title
    });
      
    const gObj = this.createdGroups.find(g => g.title === group.title);
    if (gObj) {
      gObj.childTitles.push(token.title);
    }
    this.updateGrowthVisualization();
  }
  
  editToken(token) {
    if (this.silenceModeActive) return;
    if (this.harvestMarket.active || this.harvestMarket.complete) {
      if (token.editing) token.stopEditing();
      return;
    }
    
    // Dismiss empty state welcome text when user edits any token
    this.dismissEmptyState();
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
        // Remove from example tokens since the user modified it
        if (text && text.trim() !== "" && text !== "Maak mij los met de schep" && text !== "Houd de gieter tussen ons") {
          this.exampleTokenIds.delete(token.id);
        }
        this.lastActivityTime = Date.now();
        this.updateAISuggestions();
        if (this.soundEffectsEnabled) {
          this.sounds.playEdit();
        }
      },
      () => {
        // Cancel: restore original text and visibility
        token.stopEditing();
        if (token.domElement) {
          token.domElement.style.opacity = '1';
          token.domElement.style.pointerEvents = 'auto';
        }
        this.lastActivityTime = Date.now();
        this.updateAISuggestions();
      },
      token // pass source token for morph sizing
    );
  }

  animateTokenTo(token, targetX, targetY, duration = 400, callback = null) {
    const startX = token.x;
    const startY = token.y;
    const startTime = Date.now();
    
    const wasDragging = token.isDragging;
    token.isDragging = false;
    
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      
      token.x = startX + (targetX - startX) * ease;
      token.y = startY + (targetY - startY) * ease;
      
      token.applyBoundaries();
      token.updateStyle();
      
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        token.isDragging = wasDragging;
        if (callback) callback();
      }
    };
    
    requestAnimationFrame(step);
  }

  updateCollisionPairUI() {
    if (!this.activeCollisionPair) return;
    const { tA, tB, pathEl, labelEl } = this.activeCollisionPair;
    
    if (!this.tokens.includes(tA) || !this.tokens.includes(tB)) {
      this.clearCollisionPair();
      return;
    }
    
    const dx = tB.x - tA.x;
    const dy = tB.y - tA.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 550) {
      this.clearCollisionPair();
      this.showNudgeFeedback("Botsing opgelost");
      return;
    }
    
    const pathD = `M ${tA.x} ${tA.y} L ${tB.x} ${tB.y}`;
    pathEl.setAttribute('d', pathD);
    
    const midX = (tA.x + tB.x) / 2;
    const midY = (tA.y + tB.y) / 2;
    labelEl.style.left = `${midX}px`;
    labelEl.style.top = `${midY}px`;
  }
  
  clearCollisionPair() {
    if (!this.activeCollisionPair) return;
    const { pathEl, labelEl } = this.activeCollisionPair;
    if (pathEl) pathEl.remove();
    if (labelEl) labelEl.remove();
    this.activeCollisionPair = null;
  }

  updateContextZoneUI(draggingToken) {
    if (!this.activeContextZone) return;
    const { zone, targetToken } = this.activeContextZone;
    if (draggingToken !== targetToken) return;
    
    const rect = zone.getBoundingClientRect();
    const zoneX = rect.left + rect.width / 2;
    const zoneY = rect.top + rect.height / 2;
    
    const dist = Math.hypot(draggingToken.x - zoneX, draggingToken.y - zoneY);
    if (dist < 160) {
      zone.classList.add('highlighted');
      if (!draggingToken.contextTag) {
        draggingToken.contextTag = "in andere context";
        draggingToken.updateStyle();
      }
    } else {
      zone.classList.remove('highlighted');
      if (draggingToken.contextTag) {
        draggingToken.contextTag = "";
        draggingToken.updateStyle();
      }
    }
  }
  
  handleContextZoneDragEnd(token) {
    if (!this.activeContextZone) return;
    const { zone, targetToken } = this.activeContextZone;
    if (token !== targetToken) return;
    
    const rect = zone.getBoundingClientRect();
    const zoneX = rect.left + rect.width / 2;
    const zoneY = rect.top + rect.height / 2;
    const dist = Math.hypot(token.x - zoneX, token.y - zoneY);
    
    if (dist >= 160) {
      token.contextTag = "";
      token.updateStyle();
      
      zone.classList.remove('visible');
      setTimeout(() => zone.remove(), 500);
      this.activeContextZone = null;
      this.showNudgeFeedback("Context hersteld");
    }
  }

  showNudgeFeedback(text) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    if (!this.nudgeFeedbackElement?.isConnected) {
      this.nudgeFeedbackElement = document.createElement('div');
      this.nudgeFeedbackElement.className = 'nudge-feedback-toast';
      this.nudgeFeedbackElement.setAttribute('role', 'status');
      this.nudgeFeedbackElement.setAttribute('aria-live', 'polite');
      canvas.appendChild(this.nudgeFeedbackElement);
    }

    const feedback = this.nudgeFeedbackElement;
    if (this.nudgeFeedbackTimeout) clearTimeout(this.nudgeFeedbackTimeout);
    feedback.textContent = text;
    feedback.classList.remove('updating');
    void feedback.offsetWidth;
    feedback.classList.add('visible', 'updating');

    this.nudgeFeedbackTimeout = setTimeout(() => {
      feedback.classList.remove('visible', 'updating');
      this.nudgeFeedbackTimeout = null;
    }, 1500);
  }

  getNextNudgeType(numTokens) {
    const allTypes = numTokens >= 2 
      ? ['verbinden', 'botsen', 'omkeren', 'vergroten', 'verplaatsen', 'stilte']
      : ['omkeren', 'vergroten', 'verplaatsen', 'stilte'];
      
    const pool = allTypes.filter(type => !this.usedNudges.includes(type) && !this.skippedNudges.includes(type));
    
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
    
    return allTypes[Math.floor(Math.random() * allTypes.length)];
  }

  applyActiveNudge() {
    if (!this.activeNudge) return;
    
    const { type, tA, tB } = this.activeNudge;
    
    this.showNudgeFeedback("Suggestie toegepast");
    this.nudgesClickedCount++;
    this.usedNudges.push(type);
    
    if (type === 'verbinden') {
      if (tB) {
        if (tB.type === 'group') {
          this.addTokenToGroup(tA, tB);
        } else {
          this.mergeTokensToGroup(tA, tB);
        }
      }
    } else if (type === 'botsen') {
      this.triggerBotsen(tA, tB);
      this.createdConnections.push({
        type: 'botsen',
        source: tA.title,
        target: tB.title
      });
    } else if (type === 'omkeren') {
      tA.flip();
    } else if (type === 'vergroten') {
      tA.previousScale = tA.scale;
      tA.scale = Math.min(tA.maxScale, tA.scale * 1.35);
      tA.isExtreme = true;
      tA.updateStyle();
    } else if (type === 'verplaatsen') {
      this.triggerVerplaatsen(tA);
    } else if (type === 'stilte') {
      this.triggerStilte();
    }
    
    this.hideAISuggestion(true);
    
    if (type === 'verbinden' || type === 'botsen') {
      if (tA && tB) {
        const pairKey = Math.min(tA.id, tB.id) + '-' + Math.max(tA.id, tB.id);
        this.ignoredSuggestions.add(pairKey);
      }
    } else {
      if (tA) {
        this.ignoredSuggestions.add(tA.id.toString());
      }
    }
    
    this.activeNudge = null;
    this.updateAISuggestions();
  }

  skipActiveNudge() {
    if (!this.activeNudge) return;
    
    const { type, tA, tB } = this.activeNudge;
    
    this.showNudgeFeedback("MOBUS denkt verder mee");
    this.skippedNudges.push(type);
    
    this.hideAISuggestion(true);
    
    if (tA && tB) {
      const pairKey = Math.min(tA.id, tB.id) + '-' + Math.max(tA.id, tB.id);
      this.ignoredSuggestions.add(pairKey);
    } else if (tA) {
      this.ignoredSuggestions.add(tA.id.toString());
    }
    
    this.activeNudge = null;
    this.updateAISuggestions();
  }

  triggerBotsen(tA, tB) {
    if (!tA || !tB) return;
    this.clearCollisionPair();
    
    const midX = (tA.x + tB.x) / 2;
    const midY = (tA.y + tB.y) / 2;
    const dx = tB.x - tA.x;
    const dy = tB.y - tA.y;
    const d = Math.hypot(dx, dy);
    
    if (d === 0) return;
    const nx = dx / d;
    const ny = dy / d;
    
    // Collision target (80px apart)
    const targetAx = midX - nx * 40;
    const targetAy = midY - ny * 40;
    const targetBx = midX + nx * 40;
    const targetBy = midY + ny * 40;
    
    this.animateTokenTo(tA, targetAx, targetAy, 300);
    this.animateTokenTo(tB, targetBx, targetBy, 300, () => {
      // Repel / Bounce (170px apart)
      const bounceAx = midX - nx * 85;
      const bounceAy = midY - ny * 85;
      const bounceBx = midX + nx * 85;
      const bounceBy = midY + ny * 85;
      
      this.animateTokenTo(tA, bounceAx, bounceAy, 200);
      this.animateTokenTo(tB, bounceBx, bounceBy, 200, () => {
        // Draw tension line and label
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.className = 'botszone-path';
        document.getElementById('ai-suggestion-svg').appendChild(pathEl);
        
        const labelEl = document.createElement('div');
        labelEl.className = 'tension-label';
        labelEl.innerText = 'Wat schuurt hier?';
        document.getElementById('token-container').appendChild(labelEl);
        
        this.activeCollisionPair = { tA, tB, pathEl, labelEl };
        this.updateCollisionPairUI();
      });
    });
  }

  triggerVerplaatsen(tA) {
    if (!tA) return;
    
    const oldZone = document.querySelector('.context-zone');
    if (oldZone) oldZone.remove();
    
    const zone = document.createElement('div');
    zone.className = 'context-zone';
    zone.innerHTML = `
      <span class="context-zone-label">Andere context</span>
      <span class="context-zone-prompt">Wat verandert er hier?</span>
    `;
    zone.style.right = '120px';
    zone.style.bottom = '120px';
    document.getElementById('canvas').appendChild(zone);
    
    requestAnimationFrame(() => {
      zone.classList.add('visible');
    });
    
    this.activeContextZone = { zone, targetToken: tA };
    
    const targetX = window.innerWidth - 240;
    const targetY = window.innerHeight - 200;
    this.animateTokenTo(tA, targetX, targetY, 500, () => {
      zone.classList.add('highlighted');
      tA.contextTag = "in andere context";
      tA.updateStyle();
    });
  }

  triggerStilte() {
    this.hideAISuggestion(true);
    document.getElementById('canvas').classList.add('silence-active');
    
    const oldOverlay = document.querySelector('.silence-overlay-container');
    if (oldOverlay) oldOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'silence-overlay-container';
    overlay.innerHTML = `
      <div class="silence-card">
        <div class="silence-progress-ring-container">
          <svg class="silence-progress-svg" viewBox="0 0 100 100">
            <circle class="silence-progress-bg" cx="50" cy="50" r="42"></circle>
            <circle class="silence-progress-bar" cx="50" cy="50" r="42"></circle>
          </svg>
          <div class="silence-countdown-text">20</div>
        </div>
        <h2 class="silence-title">Even stilte en focus</h2>
        <div class="silence-microcopy">
          <p>Neem 20 seconden om te kijken.</p>
          <p>Welke patronen vallen op?</p>
        </div>
        <button class="silence-skip-btn">Verder</button>
      </div>
    `;
    document.getElementById('canvas').appendChild(overlay);
    
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });
    
    document.querySelectorAll('.gardening-toolbar').forEach(toolbar => {
      toolbar.classList.add('muted');
    });
    
    this.silenceModeActive = true;
    
    let timeLeft = 20;
    const countdownEl = overlay.querySelector('.silence-countdown-text');
    const progressBar = overlay.querySelector('.silence-progress-bar');
    const skipBtn = overlay.querySelector('.silence-skip-btn');
    
    const circumference = 2 * Math.PI * 42; // ~263.89
    progressBar.style.strokeDasharray = circumference;
    progressBar.style.strokeDashoffset = 0;
    
    const updateProgress = () => {
      if (countdownEl) {
        countdownEl.innerText = timeLeft.toString();
      }
      const offset = circumference - (timeLeft / 20) * circumference;
      progressBar.style.strokeDashoffset = offset;
    };
    
    updateProgress();
    
    const endSilence = () => {
      if (this.silenceTimer) {
        clearInterval(this.silenceTimer);
        this.silenceTimer = null;
      }
      this.silenceModeActive = false;
      
      document.getElementById('canvas').classList.remove('silence-active');
      document.querySelectorAll('.gardening-toolbar').forEach(toolbar => {
        toolbar.classList.remove('muted');
      });
      
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.remove();
      }, 600);
      
      this.showNudgeFeedback("Stilte voorbij");
      this.updateAISuggestions();
    };
    
    skipBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      endSilence();
    });
    
    this.silenceTimer = setInterval(() => {
      timeLeft--;
      updateProgress();
      
      if (timeLeft <= 0) {
        endSilence();
      }
    }, 1000);
  }
  
  updateBinMode() {
    const buttons = document.querySelectorAll('.gardening-toolbar');
    
    // Find all currently dragged tokens
    const draggingTokens = this.tokens.filter(t => t.isDragging && !t.isChild);
    
    // Set of button elements that are closest to at least one dragging token
    const binTargetButtons = new Set();
    
    draggingTokens.forEach(token => {
      let closestBtn = null;
      let minDistance = Infinity;
      
      buttons.forEach(btn => {
        const { x: btnCenterX, y: btnCenterY } = this.getToolbarCenter(btn);
        
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
      if (binTargetButtons.has(btn)) {
        if (!btn.classList.contains('bin-mode')) {
          btn.classList.add('bin-mode');
          btn.setAttribute('aria-label', 'Snoei idee');
        }
      } else {
        if (btn.classList.contains('bin-mode')) {
          btn.classList.remove('bin-mode');
          btn.classList.remove('drag-over');
          btn.setAttribute('aria-label', `Tuinman toolbar deelnemer ${btn.dataset.participant}`);
        }
      }
    });
  }
  
  checkBinCollisions(draggedToken) {
    const buttons = document.querySelectorAll('.gardening-toolbar');
    const threshold = 90; // Collision check distance
    let hoveringAny = false;
    
    buttons.forEach(btn => {
      const { x: btnCenterX, y: btnCenterY } = this.getToolbarCenter(btn);
      
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
    const buttons = document.querySelectorAll('.gardening-toolbar');
    const threshold = 90;
    let deleted = false;
    
    buttons.forEach(btn => {
      const { x: btnCenterX, y: btnCenterY } = this.getToolbarCenter(btn);
      
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
    return deleted;
  }

  animateIdeaTokenCut(token, element, onComplete) {
    const canvas = document.getElementById('canvas');
    if (!canvas || !element) {
      onComplete();
      return;
    }

    // Tokens are visually reduced to 45% while hovering over the prune target.
    const displayedScale = 0.45;
    const stage = document.createElement('div');
    stage.className = 'token-cut-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.style.left = `${token.x}px`;
    stage.style.top = `${token.y}px`;
    stage.style.width = `${element.offsetWidth * displayedScale}px`;
    stage.style.height = `${element.offsetHeight * displayedScale}px`;
    stage.style.rotate = `${token.rotation}deg`;

    const scissors = document.createElement('img');
    scissors.className = 'token-cut-scissors';
    scissors.src = '/assets/farm/pruning-shears.png';
    scissors.alt = '';
    scissors.draggable = false;
    stage.appendChild(scissors);
    canvas.appendChild(stage);

    element.classList.remove('dragging', 'spawning', 'selected');
    element.classList.add('token-pruning');
    element.style.transition = 'none';
    element.style.scale = String(displayedScale);
    element.style.opacity = '1';
    element.style.zIndex = '109';
    element.style.pointerEvents = 'none';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => stage.classList.add('cutting'));
    setTimeout(() => {
      stage.classList.add('is-cut');
      element.classList.add('is-pruned');
    }, reducedMotion ? 30 : 210);
    setTimeout(() => {
      stage.remove();
      onComplete();
    }, reducedMotion ? 180 : 650);
  }
  
  deleteToken(token) {
    this.exampleTokenIds.delete(token.id);
    const el = token.domElement;
    if (this.soundEffectsEnabled) {
      this.sounds.playSnoei();
    }
    if (el && token.type !== 'group') {
      this.tokens = this.tokens.filter(t => t.id !== token.id);
      this.animateIdeaTokenCut(token, el, () => {
        token.destroy();
        this.updateAISuggestions();
      });
    } else if (el) {
      el.style.transition = 'all 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045)';
      // Groups keep the compact disappearance because they cannot be split cleanly.
      el.style.scale = '0';
      el.style.rotate = `${token.rotation + 45}deg`;
      el.style.opacity = '0';
      
      setTimeout(() => {
        if (token.type === 'group') {
          token.collapse();
        }
        token.destroy();
        this.tokens = this.tokens.filter(t => t.id !== token.id);
        this.updateAISuggestions();
      }, 300);
    } else {
      if (token.type === 'group') {
        token.collapse();
      }
      token.destroy();
      this.tokens = this.tokens.filter(t => t.id !== token.id);
      this.updateAISuggestions();
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
      
      // Create defs and mask for splitting the connection line at the dot/card boundary
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
      mask.setAttribute("id", "ai-suggestion-mask");
      
      const whiteRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      whiteRect.setAttribute("width", "100%");
      whiteRect.setAttribute("height", "100%");
      whiteRect.setAttribute("fill", "white");
      mask.appendChild(whiteRect);
      
      const blackRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      blackRect.setAttribute("id", "ai-mask-cutout");
      blackRect.setAttribute("fill", "black");
      blackRect.setAttribute("width", "32");
      blackRect.setAttribute("height", "32");
      blackRect.setAttribute("rx", "16");
      blackRect.setAttribute("ry", "16");
      mask.appendChild(blackRect);
      
      defs.appendChild(mask);
      svg.appendChild(defs);
      
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.id = "ai-suggestion-path";
      path.style.opacity = '0';
      path.setAttribute("mask", "url(#ai-suggestion-mask)");
      svg.appendChild(path);
      
      const hoverPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hoverPath.id = "ai-suggestion-hover-path";
      hoverPath.setAttribute('class', 'ai-suggestion-hover-path');
      hoverPath.setAttribute("mask", "url(#ai-suggestion-mask)");
      svg.appendChild(hoverPath);
      
      document.getElementById('canvas').appendChild(svg);
    }

    const silenceBtn = document.getElementById('silence-nudge-btn');
    if (silenceBtn) {
      silenceBtn.style.display = 'none';
    }
  }

  getNudgeText(type, tA, tB) {
    if (type === 'verbinden') {
      return 'Horen deze ideeën bij elkaar?';
    }
    if (type === 'botsen') {
      return 'Botsen deze ideeën?';
    }

    switch (type) {
      case 'verbinden':
        return 'Horen deze ideeÃ«n bij elkaar?';
      case 'botsen':
        return 'Botsen deze ideeÃ«n?';
      case 'omkeren':
        return 'Draai deze aanname om?';
      case 'vergroten':
        return 'Wat als dit idee 10x sterker was?';
      case 'verplaatsen':
        return 'Verplaatsen naar andere context?';
      case 'stilte':
        return 'Tijd voor een stiltemoment?';
      default:
        return 'Suggestie toepassen?';
    }
  }

  showAISuggestion(tA, tB, type) {
    if (this.isSnapping) return;
    
    // Choose sticky key based on tokens
    const pairKey = tB ? (Math.min(tA.id, tB.id) + '-' + Math.max(tA.id, tB.id)) : tA.id.toString();
    
    let path = document.getElementById('ai-suggestion-path');
    let hoverPath = document.getElementById('ai-suggestion-hover-path');
    let dot = document.getElementById('ai-suggestion-dot');
    
    if (this.activeSuggestion && this.activeSuggestion.pairKey !== pairKey) {
      this.hideAISuggestion(true);
      dot = null;
    }
    
    // Check if we need to initialize activeNudge
    if (!this.activeNudge || (this.activeNudge.tA !== tA || this.activeNudge.tB !== tB)) {
      const text = this.getNudgeText(type, tA, tB);
        
      this.activeNudge = {
        type,
        tA,
        tB,
        text,
        isSensing: true,
        createdAt: Date.now()
      };
      
      setTimeout(() => {
        if (this.activeNudge && this.activeNudge.tA === tA && this.activeNudge.tB === tB && this.activeNudge.isSensing) {
          this.activeNudge.isSensing = false;
          this.updateAISuggestions();
        }
      }, 1500);
    }
    
    const nudgeType = this.activeNudge.type;
    const isSensing = this.activeNudge.isSensing;
    
    // 1-token nudge positioning vs 2-token nudge positioning
    const isOneTokenNudge = nudgeType === 'omkeren' || nudgeType === 'vergroten' || nudgeType === 'verplaatsen';
    const isExpanded = dot && dot.classList.contains('expanded');
    
    let dotX, dotY;
    let rotation = 0;
    let dist = 0;
    
    if (nudgeType === 'stilte') {
      const silenceBtn = document.getElementById('silence-nudge-btn');
      if (silenceBtn) {
        silenceBtn.style.display = 'none';
        silenceBtn.classList.remove('sensing');
      }
      
      dotX = tA ? tA.x : window.innerWidth / 2;
      dotY = tA ? Math.max(120, tA.y - 110) : window.innerHeight / 2;
      rotation = tA ? tA.rotation : 0;
      if (dot) dot.style.display = 'flex';
      if (path) path.style.opacity = '0';
      if (hoverPath) hoverPath.removeAttribute('d');
    } else {
      // Hide top bar silence button if not active
      const silenceBtn = document.getElementById('silence-nudge-btn');
      if (silenceBtn) silenceBtn.style.display = 'none';

      if (isOneTokenNudge || !tB) {
        // Hide SVG paths for single-token nudges
        if (path) path.style.opacity = '0';
        if (hoverPath) hoverPath.removeAttribute('d');
        
        rotation = tA.rotation;
        if (nudgeType === 'omkeren' || nudgeType === 'vergroten') {
          // Position directly on the token
          dotX = tA.x;
          dotY = tA.y;
        } else {
          // verplaatsen (compass rose) - offset from token
          const rad = rotation * Math.PI / 180;
          dotX = tA.x - Math.sin(rad) * 115;
          dotY = tA.y + Math.cos(rad) * 115;
        }
      } else {
        // 2-token/Timer nudge: position at midpoint and show connection line
        const dx = tB.x - tA.x;
        const dy = tB.y - tA.y;
        dist = Math.hypot(dx, dy);
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
        
        const isDraggingEither = tA.isDragging || tB.isDragging;
        const isClose = dist < 130;
        const matchesContent = checkThemeMatch(tA.title, tB.title);
        const softThreshold = matchesContent ? 350 : 260;
        const breakThreshold = matchesContent ? 600 : 480;
        const isConnectionNudge = nudgeType === 'verbinden';
        
        // Snapping threshold checks
        if (dist > breakThreshold) {
          this.isSnapping = true;
          if (isConnectionNudge) {
            this.clearConnectionSoundState(true);
          }
          if (hoverPath) hoverPath.onpointerdown = null;
          if (dot) {
            dot.style.pointerEvents = 'none';
            dot.classList.remove('expanded');
          }
          if (path) path.classList.add('ai-suggestion-snapping');
          if (dot) dot.classList.add('ai-dot-snapping');
          
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
            this.activeNudge = null;
            this.updateAISuggestions();
          }, 400);
          
          return;
        }

        if (isConnectionNudge) {
          this.playConnectionAppearanceSound(pairKey);
          if (isDraggingEither) {
            this.playConnectionWarmthCue(dist, softThreshold);
          }
        }
        
        const progress = dist > softThreshold ? Math.max(0, Math.min(1, (dist - softThreshold) / (breakThreshold - softThreshold))) : 0;
        const curveOffset = Math.min(dist * 0.15, 60);
        const finalCurveOffset = Math.max(2, curveOffset * (1 - progress * 0.95));
        const cpX = midX - finalNx * finalCurveOffset;
        const cpY = midY - finalNy * finalCurveOffset;
        
        let finalCpX = cpX;
        let finalCpY = cpY;
        const jitterAmt = progress * progress * 8;
        if (progress > 0 && isDraggingEither) {
          finalCpX += (Math.random() - 0.5) * jitterAmt;
          finalCpY += (Math.random() - 0.5) * jitterAmt;
        }
        
        dotX = 0.25 * tA.x + 0.5 * finalCpX + 0.25 * tB.x;
        dotY = 0.25 * tA.y + 0.5 * finalCpY + 0.25 * tB.y;
        
        if (progress > 0 && isDraggingEither) {
          dotX += (Math.random() - 0.5) * (jitterAmt * 0.6);
          dotY += (Math.random() - 0.5) * (jitterAmt * 0.6);
        }
        
        const pathD = `M ${tA.x} ${tA.y} Q ${finalCpX} ${finalCpY} ${tB.x} ${tB.y}`;
        if (path) {
          path.setAttribute('d', pathD);
          if (dot && dot.classList.contains('expanded')) {
            path.classList.add('ai-suggestion-glow-path');
            path.style.strokeWidth = '';
            path.style.strokeDasharray = '';
            path.style.opacity = '';
            path.style.stroke = '';
          } else if (isClose && isDraggingEither) {
            path.classList.add('ai-suggestion-glow-path');
            path.style.strokeWidth = '';
            path.style.strokeDasharray = '';
            path.style.opacity = '';
            path.style.stroke = '';
          } else {
            path.classList.remove('ai-suggestion-glow-path');
            if (progress > 0) {
              const strokeW = Math.max(1.0, 3.5 * (1 - progress * 0.7));
              const dashSize = Math.max(2.0, 8 * (1 - progress * 0.7));
              const gapSize = 6 + progress * 24;
              const opacityVal = 0.65 - progress * 0.45;
              
              path.style.strokeWidth = `${strokeW}px`;
              path.style.strokeDasharray = `${dashSize} ${gapSize}`;
              path.style.opacity = opacityVal.toString();
              path.style.stroke = '';
            } else {
              path.style.strokeWidth = '';
              path.style.strokeDasharray = '';
              path.style.opacity = '';
              path.style.stroke = '';
            }
          }
        }
        if (hoverPath) {
          hoverPath.setAttribute('d', pathD);
          hoverPath.onpointerdown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isConnectionNudge && this.soundEffectsEnabled) {
              this.sounds.playConnectionConfirm();
            }
            if (!dot || !dot.classList.contains('expanded')) {
              this.expandDot(tA, tB, dotX, dotY);
            }
          };
        }
        
        rotation = (tA.isDragging || tA.selected) ? tA.rotation : ((tB && (tB.isDragging || tB.selected)) ? tB.rotation : tA.rotation);
      }
    }
    
    // Create/update the indicator dot
    let hintIcon = null;
    if (!dot) {
      dot = document.createElement('div');
      dot.id = 'ai-suggestion-dot';
      dot.className = 'ai-indicator-dot';
      dot.style.opacity = '0';
      dot.style.scale = '0.5';
      
      hintIcon = document.createElement('div');
      hintIcon.className = 'ai-dot-hint-icon';
      dot.appendChild(hintIcon);
      
      const expandedContent = document.createElement('div');
      expandedContent.className = 'ai-dot-expanded-content';
      dot.appendChild(expandedContent);
      
      dot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dot.classList.contains('sensing') && !dot.classList.contains('expanded')) {
          const xVal = parseFloat(dot.style.left);
          const yVal = parseFloat(dot.style.top);
          this.expandDot(tA, tB, xVal, yVal);
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
      hintIcon = dot.querySelector('.ai-dot-hint-icon');
    }
    
    dot.style.display = 'flex';
    
    // Set class lists dynamically based on type
    dot.className = 'ai-indicator-dot';
    dot.classList.add(`nudge-hint-${nudgeType}`);
    
    if (isExpanded) {
      dot.classList.add('expanded');
    }
    if (isSensing) {
      dot.classList.add('sensing');
    }
    
    if (hintIcon) {
      if (isExpanded) {
        hintIcon.style.display = 'none';
      } else {
        hintIcon.style.display = 'flex';
        // Render nudge-specific SVGs inside hintIcon
        if (isSensing) {
          hintIcon.innerHTML = `<span class="sensing-text">MOBUS suggestieâ€¦</span>`;
        } else {
          switch (nudgeType) {
            case 'verbinden':
              hintIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="12" r="3"></circle><line x1="9" y1="12" x2="15" y2="12"></line></svg>`;
              break;
            case 'botsen':
              hintIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h7m0 0l-3-3m3 3l-3 3M20 12h-7m0 0l3-3m-3 3l3 3"/></svg>`;
              break;
            case 'omkeren':
              hintIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
              break;
            case 'vergroten':
              hintIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
              break;
            case 'verplaatsen':
              hintIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`;
              break;
            case 'stilte':
              hintIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect></svg>`;
              break;
            default:
              hintIcon.innerHTML = `+`;
          }
        }
      }
    }
    
    if (hintIcon && isSensing && !isExpanded) {
      hintIcon.innerHTML = `<span class="sensing-text">MOBUS suggestie...</span>`;
    }

    dot.style.left = `${dotX}px`;
    dot.style.top = `${dotY}px`;
    dot.style.rotate = `${rotation}deg`;
    
    const cutout = document.getElementById('ai-mask-cutout');
    if (cutout) {
      cutout.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
      if (isExpanded) {
        const expandedW = 260; // Upgraded nudge UI width
        const expandedH = dot.offsetHeight || 120;
        cutout.setAttribute('width', expandedW.toString());
        cutout.setAttribute('height', expandedH.toString());
        cutout.setAttribute('rx', '20');
        cutout.setAttribute('ry', '20');
      } else if (isSensing) {
        const sensingW = dot.offsetWidth || 180;
        cutout.setAttribute('width', sensingW.toString());
        cutout.setAttribute('height', '38');
        cutout.setAttribute('rx', '19');
        cutout.setAttribute('ry', '19');
      } else {
        cutout.setAttribute('width', nudgeType === 'vergroten' ? '190' : '32');
        cutout.setAttribute('height', nudgeType === 'vergroten' ? '155' : '32');
        cutout.setAttribute('rx', nudgeType === 'vergroten' ? '80' : '16');
        cutout.setAttribute('ry', nudgeType === 'vergroten' ? '70' : '16');
      }
    }
    
    if (isExpanded && tB) {
      this.repelTokensFromExpandedDot(tA, tB, dotX, dotY);
    }
    
    this.activeSuggestion = { pairKey, tA, tB, type: nudgeType, isClose: tB ? (dist < 130) : false };
  }

  expandDot(tA, tB, dotX, dotY) {
    const dot = document.getElementById('ai-suggestion-dot');
    if (!dot || dot.classList.contains('expanded') || dot.classList.contains('sensing')) return;
    
    const nudgeType = this.activeNudge.type;
    
    // Offset card for single token nudges so they don't cover the token center entirely
    let targetX = dotX;
    let targetY = dotY;
    if (nudgeType === 'omkeren' || nudgeType === 'vergroten') {
      targetY = dotY + 115;
      if (targetY + 80 > window.innerHeight) {
        targetY = dotY - 115;
      }
    }
    
    dot.classList.add('expanded');
    dot.style.opacity = '1';
    dot.style.scale = '1';
    dot.style.left = `${targetX}px`;
    dot.style.top = `${targetY}px`;
    dot.style.animation = 'none';
    
    const hintIcon = dot.querySelector('.ai-dot-hint-icon');
    if (hintIcon) hintIcon.style.display = 'none';
    
    const expandedContent = dot.querySelector('.ai-dot-expanded-content');
    if (expandedContent) {
      expandedContent.innerHTML = '';
      expandedContent.style.display = 'flex';
      expandedContent.style.opacity = '1';
      
      const textEl = document.createElement('p');
      textEl.className = 'ai-dot-nudge-text';
      textEl.innerText = this.activeNudge.text;
      expandedContent.appendChild(textEl);
      
      const btnsContainer = document.createElement('div');
      btnsContainer.className = 'ai-dot-buttons';
      
      const btnProbeer = document.createElement('button');
      btnProbeer.className = 'ai-dot-btn probeer';
      btnProbeer.innerText = 'Probeer';
      btnProbeer.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.applyActiveNudge();
      });
      
      const btnNegeer = document.createElement('button');
      btnNegeer.className = 'ai-dot-btn sla-over';
      btnNegeer.innerText = 'Negeer';
      btnNegeer.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.skipActiveNudge();
      });
      
      btnsContainer.appendChild(btnProbeer);
      btnsContainer.appendChild(btnNegeer);
      expandedContent.appendChild(btnsContainer);
    }
    
    const cutout = document.getElementById('ai-mask-cutout');
    if (cutout) {
      const expandedW = 260;
      const expandedH = dot.offsetHeight || 120;
      cutout.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
      cutout.setAttribute('width', expandedW.toString());
      cutout.setAttribute('height', expandedH.toString());
      cutout.setAttribute('rx', '20');
      cutout.setAttribute('ry', '20');
    }
    
    if (tB) {
      this.repelTokensFromExpandedDot(tA, tB, targetX, targetY);
    }
  }

  collapseDot() {
    const dot = document.getElementById('ai-suggestion-dot');
    if (!dot || !dot.classList.contains('expanded')) return;
    
    dot.classList.remove('expanded');
    dot.style.animation = '';
    dot.style.animationDuration = '';
    
    const hintIcon = dot.querySelector('.ai-dot-hint-icon');
    if (hintIcon) hintIcon.style.display = 'flex';
    
    const expandedContent = dot.querySelector('.ai-dot-expanded-content');
    if (expandedContent) {
      expandedContent.innerHTML = '';
      expandedContent.style.display = 'none';
    }
    
    const cutout = document.getElementById('ai-mask-cutout');
    if (cutout) {
      cutout.setAttribute('width', '32');
      cutout.setAttribute('height', '32');
      cutout.setAttribute('rx', '16');
      cutout.setAttribute('ry', '16');
    }
    
    this.updateAISuggestions();
  }

  repelTokensFromExpandedDot(tA, tB, midX, midY) {
    const expandedHalfW = 140; // ~half of 260px + margin
    const tokenRadius = 85;
    const minClearance = expandedHalfW + tokenRadius;
    
    [tA, tB].forEach(token => {
      if (!token || token.isDragging) return;
      
      const dx = token.x - midX;
      const dy = token.y - midY;
      const dist = Math.hypot(dx, dy);
      
      if (dist < minClearance && dist > 0) {
        const pushDist = minClearance - dist + 5;
        const nx = dx / dist;
        const ny = dy / dist;
        
        token.x += nx * pushDist;
        token.y += ny * pushDist;
        token.applyBoundaries();
        token.updateStyle();
      }
    });
  }

  hideAISuggestion(instant = false) {
    const path = document.getElementById('ai-suggestion-path');
    const hoverPath = document.getElementById('ai-suggestion-hover-path');
    const dot = document.getElementById('ai-suggestion-dot');
    const shouldFadeConnectionSound = this.activeSuggestion?.type === 'verbinden' && !instant;
    this.clearConnectionSoundState(shouldFadeConnectionSound);
    
    // Hide silence nudge button in top bar
    const silenceBtn = document.getElementById('silence-nudge-btn');
    if (silenceBtn) {
      silenceBtn.style.display = 'none';
      silenceBtn.classList.remove('sensing');
    }

    if (path) {
      path.style.opacity = '0';
      path.classList.remove('ai-suggestion-glow-path');
      path.classList.remove('ai-suggestion-snapping');
    }
    if (hoverPath) {
      hoverPath.removeAttribute('d');
      hoverPath.onpointerdown = null;
    }
    
    if (dot) {
      dot.classList.remove('expanded');
      dot.classList.remove('sensing');
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

  hasUserAddedIdeas() {
    if (this.emptyStateVisible) return false;
    return this.tokens.some(t => t.type !== 'group' && !t.isChild && !this.exampleTokenIds.has(t.id));
  }

  updateAISuggestions() {
    this.disableLegacySuggestions();
    return;
  }

  disableLegacySuggestions() {
    document.getElementById('ai-suggestion-dot')?.remove();
    document.getElementById('ai-suggestion-svg')?.remove();
    document.querySelectorAll('.context-zone, .silence-overlay, .silence-timer-hud').forEach(element => element.remove());
    this.activeNudge = null;
    this.activeSuggestion = null;
    this.clearConnectionSoundState();
  }

  updateLegacyAISuggestions() {
    if (this.silenceModeActive) {
      this.hideAISuggestion();
      return;
    }

    this.updateGrowthVisualization();

    if (!this.hasUserAddedIdeas()) {
      this.twoTokensTime = null;
      this.hideAISuggestion();
      return;
    }

    const ideas = this.tokens.filter(t => t.type !== 'group' && !t.isChild);
    
    if (ideas.length < 2) {
      this.twoTokensTime = null;
      this.hideAISuggestion();
      return;
    }
    
    if (!this.twoTokensTime) {
      this.twoTokensTime = Date.now();
    }
    
    if (Date.now() - this.twoTokensTime < 4000) {
      this.hideAISuggestion();
      return;
    }
    
    // Keep active nudge sticky if it is valid
    if (this.activeNudge) {
      const tAValid = ideas.includes(this.activeNudge.tA);
      const tBValid = !this.activeNudge.tB || ideas.includes(this.activeNudge.tB);
      if (tAValid && tBValid) {
        this.showAISuggestion(this.activeNudge.tA, this.activeNudge.tB, this.activeNudge.type);
        return;
      } else {
        this.hideAISuggestion(true);
        this.activeNudge = null;
      }
    }
    
    // Gather all currently possible suggestion candidates
    const candidates = [];

    // 1. Check Vergroten candidate: One token selected for longer than 3 seconds
    const selectedToken = ideas.find(t => 
      t.selected && 
      this.tokenSelectedTime[t.id] && 
      (Date.now() - this.tokenSelectedTime[t.id] > 3000) && 
      !t.editing && 
      !this.ignoredSuggestions.has(t.id.toString())
    );
    if (selectedToken) {
      candidates.push({ type: 'vergroten', tA: selectedToken, tB: null });
    }
    
    // 2. Check Verbinden candidate: Tokens close together
    let closestPair = null;
    let minDistance = Infinity;
    for (let i = 0; i < ideas.length; i++) {
      for (let j = i + 1; j < ideas.length; j++) {
        const tA = ideas[i];
        const tB = ideas[j];
        if (tA.editing || tB.editing) continue;
        const pairKey = Math.min(tA.id, tB.id) + '-' + Math.max(tA.id, tB.id);
        if (this.ignoredSuggestions.has(pairKey)) continue;
        
        const dist = Math.hypot(tA.x - tB.x, tA.y - tB.y);
        if (dist < 280 && dist < minDistance) {
          minDistance = dist;
          closestPair = { tA, tB };
        }
      }
    }
    if (closestPair) {
      candidates.push({ type: 'verbinden', tA: closestPair.tA, tB: closestPair.tB });
    }
    
    // 3. Check Botsen candidate: Tokens far apart with different words
    let farPair = null;
    let maxDistance = -1;
    for (let i = 0; i < ideas.length; i++) {
      for (let j = i + 1; j < ideas.length; j++) {
        const tA = ideas[i];
        const tB = ideas[j];
        if (tA.editing || tB.editing) continue;
        const pairKey = Math.min(tA.id, tB.id) + '-' + Math.max(tA.id, tB.id);
        if (this.ignoredSuggestions.has(pairKey)) continue;
        
        const dist = Math.hypot(tA.x - tB.x, tA.y - tB.y);
        if (dist >= 350 && tA.title.trim().toLowerCase() !== tB.title.trim().toLowerCase()) {
          if (dist > maxDistance) {
            maxDistance = dist;
            farPair = { tA, tB };
          }
        }
      }
    }
    if (farPair) {
      candidates.push({ type: 'botsen', tA: farPair.tA, tB: farPair.tB });
    }
    
    // 4. Check Omkeren candidate: One token has a clear statement
    const isStatement = (title) => {
      if (!title) return false;
      const lower = title.toLowerCase().trim();
      const keywords = ["is", "moet", "niet", "wel", "altijd", "nooit", "meer", "minder", "slecht", "goed", "beter", "slechter"];
      const hasKeyword = keywords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(lower));
      return hasKeyword || lower.length > 12;
    };
    const statementToken = ideas.find(t => 
      !t.editing && 
      !this.ignoredSuggestions.has(t.id.toString()) && 
      isStatement(t.title)
    );
    if (statementToken) {
      candidates.push({ type: 'omkeren', tA: statementToken, tB: null });
    }
    
    // 5 & 6. Check Verplaatsen and Stilte candidates: Session feels static for 10 seconds
    if (Date.now() - this.lastActivityTime >= 10000) {
      // For verplaatsen candidate:
      const moveToken = ideas.find(t => !t.editing && !this.ignoredSuggestions.has(t.id.toString()));
      if (moveToken) {
        candidates.push({ type: 'verplaatsen', tA: moveToken, tB: null });
      }
      
      // For stilte candidate:
      let bestPair = null;
      let minP = Infinity;
      for (let i = 0; i < ideas.length; i++) {
        for (let j = i + 1; j < ideas.length; j++) {
          const tA = ideas[i];
          const tB = ideas[j];
          if (tA.editing || tB.editing) continue;
          const pairKey = Math.min(tA.id, tB.id) + '-' + Math.max(tA.id, tB.id);
          if (this.ignoredSuggestions.has(pairKey)) continue;
          const dist = Math.hypot(tA.x - tB.x, tA.y - tB.y);
          if (dist < minP) {
            minP = dist;
            bestPair = { tA, tB };
          }
        }
      }
      if (bestPair) {
        candidates.push({ type: 'stilte', tA: bestPair.tA, tB: bestPair.tB });
      } else if (moveToken) {
        candidates.push({ type: 'stilte', tA: moveToken, tB: null });
      }
    }
    
    if (candidates.length === 0) {
      this.hideAISuggestion();
      return;
    }

    // Calculate count of how often each nudge type has been used or skipped
    const getUsageCount = (type) => {
      const used = this.usedNudges.filter(t => t === type).length;
      const skipped = this.skippedNudges.filter(t => t === type).length;
      return used + skipped;
    };

    // Shuffle candidates to randomize tie-breakers
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Sort candidates so the least-used nudge type is first
    candidates.sort((a, b) => getUsageCount(a.type) - getUsageCount(b.type));

    // Show the best suggestion candidate
    const chosen = candidates[0];
    this.showAISuggestion(chosen.tA, chosen.tB, chosen.type);
  }
}

// Vite may evaluate this module after DOMContentLoaded during a preview refresh.
function initializeCanvasManager() {
  if (window.canvasManager) return;
  window.canvasManager = new CanvasManager();
  window.Token = Token;
  window.GroupToken = GroupToken;

  // Prevent double-tap to zoom on iOS/mobile devices
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Prevent pinch-to-zoom on iOS/mobile devices
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeCanvasManager, { once: true });
} else {
  initializeCanvasManager();
}
