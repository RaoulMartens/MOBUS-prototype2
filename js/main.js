import { InputCard } from './inputCard.js';
import { Token } from './token.js';
import { GroupToken } from './groupToken.js';
import { generateGroupName, checkThemeMatch, getThemeExplanation } from './nameGenerator.js';

const PLANT_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M7 20h10"></path>
  <path d="M10 20c5.5-2.5.8-6.4 3-10"></path>
  <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.6-.3-1.2-.8-2-2.3-2.2-4.7 2.3-.1 3.9.3 4.5 1.3z"></path>
  <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.4 1.7-4.6-2.7.1-4 1-4.9 2z"></path>
</svg>`;

const PLANT_LABEL = 'Plant je idee';
const BIN_LABEL = 'Snoei';

const BIN_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="6" cy="6" r="3"></circle>
  <circle cx="6" cy="18" r="3"></circle>
  <path d="M20 4 8.12 15.88"></path>
  <path d="M14.47 14.48 20 20"></path>
  <path d="M8.12 8.12 12 12"></path>
</svg>`;

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
    this.sounds = new SubtleSoundEffects();
    this.sessionGoal = 'Creatieve groeisessie';
    this.participantCount = 3;
    
    // Empty state tracking
    this.emptyStateVisible = false;
    this.emptyStateOverlay = null;
    this.exampleTokenIds = new Set();
    
    this.setupEdgeButtons();
    this.setupBackgroundDeselect();
    this.setupWindowResize();
    this.setupGroupPreviewLine();
    this.setupAISuggestionElements();
    
    // Periodically tick pattern reader conditions
    this.suggestionTicker = setInterval(() => {
      if (this.currentState === 'tableSession') {
        this.updateAISuggestions();
      }
    }, 2000);
    
    // Setup state management for navigation flow
    this.setupStateManagement();
    this.transitionTo('welcome');
  }

  getEdgeButtonCenter(btn) {
    const target = btn.querySelector('.icon') || btn;
    const rect = target.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  getPlantButtonAriaLabel(btn) {
    const sideLabels = {
      top: 'boven',
      bottom: 'beneden',
      left: 'links',
      right: 'rechts'
    };
    const side = sideLabels[btn.dataset.side] || 'deze zijde';
    const participant = btn.dataset.participant ? ` deelnemer ${btn.dataset.participant}` : '';
    return `${PLANT_LABEL}${participant} vanaf ${side}`;
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
  }
  
  setupEdgeButtons() {
    const buttons = document.querySelectorAll('.edge-button');
    buttons.forEach(btn => {
      this.attachEdgeButton(btn);
    });
  }

  attachEdgeButton(btn) {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.spawnTokenFromButton(btn);
    });
  }

  createEdgeButton(side, positionPercent, participantIndex) {
    const btn = document.createElement('button');
    btn.className = `edge-button ${side}`;
    btn.dataset.side = side;
    btn.dataset.participant = String(participantIndex);
    btn.type = 'button';
    btn.setAttribute('aria-label', this.getPlantButtonAriaLabel(btn));

    if (side === 'bottom') {
      btn.style.left = `${positionPercent}%`;
    } else {
      btn.style.top = `${positionPercent}%`;
    }

    btn.innerHTML = `
      <span class="icon">${PLANT_ICON}</span>
      <span class="edge-button-label">${PLANT_LABEL}</span>
    `;

    this.attachEdgeButton(btn);
    return btn;
  }

  configureParticipantEdgeButtons(count = this.participantCount) {
    const canvas = document.getElementById('canvas');
    const tokenContainer = document.getElementById('token-container');
    if (!canvas || !tokenContainer) return;

    document.querySelectorAll('.edge-button').forEach(btn => btn.remove());

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
      const btn = this.createEdgeButton(side, position, index + 1);
      canvas.insertBefore(btn, tokenContainer);
    });
  }
  
  spawnTokenFromButton(btn) {
    if (this.silenceModeActive) return;
    const side = btn.dataset.side;
    const { x: btnX, y: btnY } = this.getEdgeButtonCenter(btn);
    
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
    
    // Dismiss empty state welcome text when user creates a new token
    this.dismissEmptyState();
    
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
        this.lastActivityTime = Date.now();
        this.updateAISuggestions();
        if (this.soundEffectsEnabled) {
          this.sounds.playPlant();
        }
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
  
  setupStateManagement() {
    this.currentState = 'welcome';
    this.nudgesClickedCount = 0;

    // Establish BroadcastChannel for local synchronization
    this.broadcastChannel = new BroadcastChannel('mobus-session');

    // Elements
    this.screensContainer = document.getElementById('app-screens');
    this.canvasElement = document.getElementById('canvas');
    this.finishBtn = document.getElementById('btn-finish-session');
    if (this.finishBtn) {
      this.finishBtn.addEventListener('click', () => {
        this.transitionTo('sessionSummary');
      });
    }

    // Buttons Setup
    document.getElementById('btn-start-session').addEventListener('click', () => {
      this.transitionTo('chooseExperience');
    });

    document.getElementById('card-growth-experience').addEventListener('click', () => {
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
        this.transitionTo('sessionSummary');
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
        this.showNudgeFeedback(this.soundEffectsEnabled ? "Geluidsfeedback aan" : "Geluidsfeedback uit");
      });
    }

    document.getElementById('btn-annuleren').addEventListener('click', () => {
      this.transitionTo('tableSession');
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
      this.configureParticipantEdgeButtons(this.participantCount);
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

    this.configureParticipantEdgeButtons(this.participantCount);
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

  transitionTo(state) {
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
      if (this.finishBtn) this.finishBtn.classList.add('visible');
      
      // If entering tabletop playground, spawn default tokens if empty
      if (this.tokens.length === 0) {
        this.spawnInitialTokens();
        this.updateAISuggestions();
      }
      this.updateGrowthVisualization();
    } else {
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
    const success = document.getElementById('email-success');

    // Reset state
    input.value = '';
    input.classList.remove('invalid');
    error.classList.remove('visible');
    sendBtn.classList.remove('loading');
    sendBtn.querySelector('span').textContent = 'Versturen';
    sendBtn.disabled = false;
    success.classList.remove('visible');
    success.textContent = '';

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
    const success = document.getElementById('email-success');
    const email = input.value.trim();

    // Validate
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      input.classList.add('invalid');
      error.classList.add('visible');
      return;
    }

    // Loading state
    sendBtn.classList.add('loading');
    sendBtn.querySelector('span').textContent = 'Versturen\u2026';
    sendBtn.disabled = true;

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

      // Show success
      success.textContent = `Resultaten verzonden naar ${email}`;
      success.classList.add('visible');
      sendBtn.style.display = 'none';
      input.style.display = 'none';
      document.getElementById('btn-email-skip').style.display = 'none';
      document.querySelector('.email-input-wrapper').style.display = 'none';

      // After delay, go to end screen
      setTimeout(() => {
        this.hideEmailModal();
        // Restore hidden elements for next use
        sendBtn.style.display = '';
        input.style.display = '';
        document.getElementById('btn-email-skip').style.display = '';
        document.querySelector('.email-input-wrapper').style.display = '';
        this.transitionTo('endSession');
      }, 1800);
    }, 800);
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

    // Reset session title hidden input
    const dateStr = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('summary-session-title').value = `Wachten als creatieve pauze - ${dateStr}`;

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
    if (this.silenceTimer) {
      clearInterval(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.silenceModeActive = false;
    document.querySelectorAll('.edge-button').forEach(btn => btn.classList.remove('muted'));
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
    this.syncSessionSetupForm();
    
    // Broadcast reset event to the separate wall screen
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'reset' });
    }
    
    this.hideAISuggestion(true);
    
    // Clean up empty state overlay
    if (this.emptyStateOverlay && this.emptyStateOverlay.parentNode) {
      this.emptyStateOverlay.remove();
    }
    this.emptyStateOverlay = null;
    this.emptyStateVisible = false;
    this.exampleTokenIds.clear();
  }

  updateGrowthVisualization() {
    const groups = this.tokens.filter(t => t.type === 'group').map(g => ({
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
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'state-update',
        data: {
          totalIdeas,
          soloIdeas,
          groups,
          sessionTitle,
          activeState: this.currentState,
          isInteracting,
          createdConnections: this.createdConnections,
          lastActivityTime: this.lastActivityTime
        }
      });
    }
  }

  spawnInitialTokens() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    this.updateSessionTitle();

    const overlay = document.createElement('div');
    overlay.className = 'empty-state-overlay';
    overlay.innerHTML = `
      <h2 class="empty-state-title">Fijn dat jullie er zijn!</h2>
      <p class="empty-state-subtitle">Voeg een idee toe of probeer een voorbeeldtoken.</p>
    `;
    document.getElementById('canvas').appendChild(overlay);
    this.emptyStateOverlay = overlay;
    this.emptyStateVisible = true;
    
    const id1 = this.tokenIdCounter++;
    const token1 = new Token(id1, w * 0.42, h * 0.55, 0, "Dubbel tik om mij te veranderen", (t, type) => this.handleTokenStateChange(t, type));
    token1.applyBoundaries();
    token1.updateStyle();
    this.tokens.push(token1);
    this.exampleTokenIds.add(id1);
    
    const id2 = this.tokenIdCounter++;
    const token2 = new Token(id2, w * 0.58, h * 0.55, 0, "Sleep mij naar een ander idee", (t, type) => this.handleTokenStateChange(t, type));
    token2.applyBoundaries();
    token2.updateStyle();
    this.tokens.push(token2);
    this.exampleTokenIds.add(id2);
  }
  dismissEmptyState() {
    if (!this.emptyStateVisible) return;
    this.emptyStateVisible = false;
    
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
  
  handleTokenStateChange(token, type) {
    this.lastActivityTime = Date.now();
    if (type === 'dragstart') {
      this.activeDragCount++;
      this.updateBinMode();
      this.updateGrowthVisualization();
    } else if (type === 'dragmove') {
      this.checkBinCollisions(token);
      this.resolveGroupCollisions(token);
      this.checkProximityGrouping(token);
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
      this.activeDragCount = Math.max(0, this.activeDragCount - 1);
      token.isHoveringBin = false;
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
    } else if (type === 'select') {
      if (token.selected) {
        this.tokenSelectedTime[token.id] = Date.now();
      } else {
        delete this.tokenSelectedTime[token.id];
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
    if (this.soundEffectsEnabled) {
      this.sounds.playGrowth();
    }
    
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
    }, 350);
  }

  addTokenToGroup(token, group) {
    this.hideAISuggestion(true);
    this.tokens = this.tokens.filter(t => t.id !== token.id);
    if (this.soundEffectsEnabled) {
      this.sounds.playGrowth();
    }
    
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
      
      this.createdConnections.push({
        type: 'add-to-group',
        source: token.title,
        target: group.title
      });
      
      const gObj = this.createdGroups.find(g => g.title === group.title);
      if (gObj) {
        gObj.childTitles.push(token.title);
      }
    }, 350);
  }
  
  editToken(token) {
    if (this.silenceModeActive) return;
    
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
        if (text && text.trim() !== "" && text !== "Dubbel tik om mij te veranderen" && text !== "Sleep mij naar een ander idee") {
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
    const feedback = document.createElement('div');
    feedback.className = 'nudge-feedback-toast';
    feedback.innerText = text;
    document.getElementById('canvas').appendChild(feedback);
    
    requestAnimationFrame(() => {
      feedback.classList.add('visible');
    });
    
    setTimeout(() => {
      feedback.classList.remove('visible');
      setTimeout(() => feedback.remove(), 400);
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
    
    document.querySelectorAll('.edge-button').forEach(btn => {
      btn.classList.add('muted');
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
      document.querySelectorAll('.edge-button').forEach(btn => {
        btn.classList.remove('muted');
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
    const buttons = document.querySelectorAll('.edge-button');
    
    // Find all currently dragged tokens
    const draggingTokens = this.tokens.filter(t => t.isDragging && !t.isChild);
    
    // Set of button elements that are closest to at least one dragging token
    const binTargetButtons = new Set();
    
    draggingTokens.forEach(token => {
      let closestBtn = null;
      let minDistance = Infinity;
      
      buttons.forEach(btn => {
        const { x: btnCenterX, y: btnCenterY } = this.getEdgeButtonCenter(btn);
        
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
      const label = btn.querySelector('.edge-button-label');
      if (binTargetButtons.has(btn)) {
        if (!btn.classList.contains('bin-mode')) {
          btn.classList.add('bin-mode');
          icon.innerHTML = BIN_ICON;
          if (label) label.textContent = BIN_LABEL;
          btn.setAttribute('aria-label', 'Snoei idee');
        }
      } else {
        if (btn.classList.contains('bin-mode')) {
          btn.classList.remove('bin-mode');
          btn.classList.remove('drag-over');
          icon.innerHTML = PLANT_ICON;
          if (label) label.textContent = PLANT_LABEL;
          btn.setAttribute('aria-label', this.getPlantButtonAriaLabel(btn));
        }
      }
    });
  }
  
  checkBinCollisions(draggedToken) {
    const buttons = document.querySelectorAll('.edge-button:not(.hidden-btn)');
    const threshold = 90; // Collision check distance
    let hoveringAny = false;
    
    buttons.forEach(btn => {
      const { x: btnCenterX, y: btnCenterY } = this.getEdgeButtonCenter(btn);
      
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
      const { x: btnCenterX, y: btnCenterY } = this.getEdgeButtonCenter(btn);
      
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
    this.exampleTokenIds.delete(token.id);
    const el = token.domElement;
    if (this.soundEffectsEnabled) {
      this.sounds.playSnoei();
    }
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

// Instantiate manager on document load
window.addEventListener('DOMContentLoaded', () => {
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
});
