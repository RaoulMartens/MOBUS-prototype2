import { InputCard } from './inputCard.js';
import { Token } from './token.js';
import { GroupToken } from './groupToken.js';
import { generateGroupName, checkThemeMatch, getThemeExplanation } from './nameGenerator.js';

const PLANT_ICON = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 21c3.7-2.4 5.8-5.4 5.8-8.8C17.8 8.4 15 5.2 12 3c-3 2.2-5.8 5.4-5.8 9.2 0 3.4 2.1 6.4 5.8 8.8z"></path>
  <path d="M12 17.5c-.1-3 .8-5.5 2.8-7.5"></path>
  <path d="M12.2 13.3c-1.7-.1-3.1-.8-4.2-2"></path>
</svg>`;

const PLANT_LABEL = 'plant idee';
const BIN_LABEL = 'snoei';

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
    return `Plant idee vanaf ${side}`;
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
      this.transitionTo('tableSession');
    });

    // Settings panel listeners
    const settingsBtn = document.getElementById('btn-open-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsCloseBtn = document.getElementById('btn-settings-close');
    const settingsFinishBtn = document.getElementById('btn-settings-finish');

    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.add('visible');
      });
    }

    if (settingsCloseBtn && settingsPanel) {
      settingsCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.remove('visible');
      });
    }

    if (settingsFinishBtn && settingsPanel) {
      settingsFinishBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.remove('visible');
        this.transitionTo('sessionSummary');
      });
    }

    if (settingsPanel) {
      settingsPanel.addEventListener('click', (e) => {
        if (e.target === settingsPanel) {
          settingsPanel.classList.remove('visible');
        }
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
        this.showNudgeFeedback(this.soundEffectsEnabled ? "Geluidseffecten aan" : "Geluidseffecten uit");
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

  transitionTo(state) {
    this.currentState = state;

    // Get all screen elements
    const screens = {
      welcome: document.getElementById('screen-welcome'),
      chooseExperience: document.getElementById('screen-choose'),
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
      console.log('Session result:', sessionResult);

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
    const sessionTitle = sessionTitleInput ? sessionTitleInput.value : 'Creatieve Groeisessie';

    let conclusion = "De groeisessie bleef vooral gericht op het vrij zaaien en ordenen.";
    if (this.usedNudges.length >= 3) {
      conclusion = "MOBUS heeft geholpen om de zaden met extra voeding te verrijken.";
    } else if (this.createdConnections.length > 0 || groups.length > 0) {
      conclusion = "Deze groeisessie bracht vooral wortelverbindingen tussen zaden naar voren.";
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
    
    // Compact stats row
    const statsRow = document.getElementById('summary-stats-row');
    if (statsRow) {
      statsRow.innerHTML = `Geplante ideeën: <strong>${totalIdeasCount}</strong> · Kluiten gevormd: <strong>${groups.length}</strong> · Losse zaden: <strong>${soloIdeas.length}</strong> · Voeding gebruikt: <strong>${this.usedNudges.length}</strong>`;
    }

    // Reset session title input
    const dateStr = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('summary-session-title').value = `Creatieve Groeisessie - ${dateStr}`;

    // Generate conclusion
    let conclusion;
    if (this.usedNudges.length > 0) {
      conclusion = "MOBUS voegde voeding toe om de zaden vanuit meerdere perspectieven te laten groeien.";
    } else if (groups.length > 0) {
      conclusion = "De groeisessie bracht vooral wortelverbindingen binnen de gevormde kluiten naar voren.";
    } else {
      conclusion = "De groeisessie leverde vooral losse zaden op. Een vervolgstap kan zijn om wortelverbindingen te maken, ze te laten botsen of te groeperen tot kluiten.";
    }
    const conclusionEl = document.getElementById('summary-conclusion');
    if (conclusionEl) {
      conclusionEl.textContent = conclusion;
    }

    // Populate nudge details
    const usedContainer = document.getElementById('summary-used-nudges');
    if (usedContainer) {
      usedContainer.innerHTML = '';
      if (this.usedNudges.length === 0) {
        usedContainer.innerHTML = '<span class="summary-empty-nudge">De sessie is vooral vrij verlopen zonder hulp van MOBUS.</span>';
      } else {
        this.usedNudges.forEach(n => {
          const pill = document.createElement('span');
          pill.className = 'nudge-summary-tag used';
          pill.textContent = n;
          usedContainer.appendChild(pill);
        });
      }
    }

    const skippedContainer = document.getElementById('summary-skipped-nudges');
    if (skippedContainer) {
      skippedContainer.innerHTML = '';
      if (this.skippedNudges.length === 0) {
        skippedContainer.innerHTML = '<span class="summary-empty-nudge">Geen nudges overgeslagen.</span>';
      } else {
        this.skippedNudges.forEach(n => {
          const pill = document.createElement('span');
          pill.className = 'nudge-summary-tag skipped';
          pill.textContent = n;
          skippedContainer.appendChild(pill);
        });
      }
    }

    // Populate right panel — structured into groups, ideas, interactions
    const listContainer = document.getElementById('summary-groups-list');
    listContainer.innerHTML = '';

    // Section: Gevormde kluiten
    const groupSection = document.createElement('div');
    groupSection.className = 'summary-output-section';
    const groupLabel = document.createElement('label');
    groupLabel.className = 'summary-label';
    groupLabel.textContent = 'Gevormde kluiten';
    groupSection.appendChild(groupLabel);

    if (groups.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'summary-output-empty';
      empty.textContent = 'Nog geen kluiten gevormd.';
      groupSection.appendChild(empty);
    } else {
      groups.forEach(g => {
        const groupEl = document.createElement('div');
        groupEl.className = 'summary-group-item';

        const header = document.createElement('div');
        header.className = 'summary-group-header';

        const title = document.createElement('span');
        title.className = 'summary-group-title';
        title.textContent = g.title;

        const badge = document.createElement('span');
        badge.className = 'summary-group-count';
        badge.textContent = `${g.childTokensData.length} zaden`;

        header.appendChild(title);
        header.appendChild(badge);
        groupEl.appendChild(header);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'summary-group-children';

        g.childTokensData.forEach(child => {
          const tag = document.createElement('span');
          tag.className = 'summary-child-tag';
          tag.textContent = child.title;
          childrenContainer.appendChild(tag);
        });

        groupEl.appendChild(childrenContainer);
        groupSection.appendChild(groupEl);
      });
    }
    listContainer.appendChild(groupSection);

    // Section: Losse zaden
    const ideasSection = document.createElement('div');
    ideasSection.className = 'summary-output-section';
    const ideasLabel = document.createElement('label');
    ideasLabel.className = 'summary-label';
    ideasLabel.textContent = 'Losse zaden';
    ideasSection.appendChild(ideasLabel);

    if (soloIdeas.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'summary-output-empty';
      empty.textContent = 'Alle zaden zijn in een kluit opgenomen.';
      ideasSection.appendChild(empty);
    } else {
      const ideasWrap = document.createElement('div');
      ideasWrap.style.display = 'flex';
      ideasWrap.style.flexWrap = 'wrap';
      ideasWrap.style.gap = '6px';
      soloIdeas.forEach(idea => {
        const tag = document.createElement('span');
        tag.className = 'summary-child-tag';
        tag.textContent = idea.title;
        ideasWrap.appendChild(tag);
      });
      ideasSection.appendChild(ideasWrap);
    }
    listContainer.appendChild(ideasSection);

    // Section: Wortelverbindingen & Interacties
    const interSection = document.createElement('div');
    interSection.className = 'summary-output-section';
    const interLabel = document.createElement('label');
    interLabel.className = 'summary-label';
    interLabel.textContent = 'Wortelverbindingen & Interacties';
    interSection.appendChild(interLabel);

    if (this.createdConnections.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'summary-output-empty';
      empty.textContent = 'Er zijn nog geen zaden actief gecombineerd.';
      interSection.appendChild(empty);
    } else {
      this.createdConnections.forEach(c => {
        const item = document.createElement('div');
        item.className = 'connection-summary-item';
        
        let text = '';
        if (c.type === 'merge') {
          text = `Kluit gevormd van "${c.source}" en "${c.target}"`;
        } else if (c.type === 'add-to-group') {
          text = `"${c.source}" toegevoegd aan kluit "${c.target}"`;
        } else if (c.type === 'botsen') {
          text = `Zaden gebotst: "${c.source}" en "${c.target}"`;
        } else {
          text = `Verbinding: "${c.source}" & "${c.target}"`;
        }
        item.textContent = text;
        interSection.appendChild(item);
      });
    }
    listContainer.appendChild(interSection);
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
    const sessionTitle = sessionTitleInput ? sessionTitleInput.value : 'Creatieve Groeisessie';
    
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
    
    // Create the welcome overlay
    const overlay = document.createElement('div');
    overlay.className = 'empty-state-overlay';
    overlay.innerHTML = `
      <h2 class="empty-state-title">Fijn dat jullie er zijn!</h2>
      <p class="empty-state-subtitle">Voeg een idee toe of probeer een voorbeeldtoken.</p>
    `;
    document.getElementById('canvas').appendChild(overlay);
    this.emptyStateOverlay = overlay;
    this.emptyStateVisible = true;
    
    // Spawn two example tokens – both rotation 0 so they're readable from the main direction
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
    
    this.showNudgeFeedback("Voeding toegepast");
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
    const oldHud = document.querySelector('.silence-timer-hud');
    if (oldHud) oldHud.remove();
    
    const hud = document.createElement('div');
    hud.className = 'silence-timer-hud';
    hud.innerHTML = `
      <svg class="silence-clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span class="silence-countdown">30</span>
      <span class="silence-copy">Alleen ordenen. Niet typen.</span>
    `;
    document.getElementById('canvas').appendChild(hud);
    
    requestAnimationFrame(() => {
      hud.classList.add('visible');
    });
    
    document.querySelectorAll('.edge-button').forEach(btn => {
      btn.classList.add('muted');
    });
    
    this.silenceModeActive = true;
    
    let timeLeft = 30;
    const countdownEl = hud.querySelector('.silence-countdown');
    
    this.silenceTimer = setInterval(() => {
      timeLeft--;
      if (countdownEl) {
        countdownEl.innerText = timeLeft.toString();
      }
      
      if (timeLeft <= 0) {
        clearInterval(this.silenceTimer);
        this.silenceTimer = null;
        this.silenceModeActive = false;
        
        document.querySelectorAll('.edge-button').forEach(btn => {
          btn.classList.remove('muted');
        });
        
        hud.classList.remove('visible');
        setTimeout(() => hud.remove(), 400);
        
        this.showNudgeFeedback("Stilte voorbij");
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
          btn.setAttribute('aria-label', 'Verwijder idee');
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
  }

  getNudgeText(type, tA, tB) {
    switch (type) {
      case 'verbinden':
        return 'Mogelijke verbinding gevonden';
      case 'botsen':
        return 'Wat schuurt hier?';
      case 'omkeren':
        return 'Draai deze aanname eens om';
      case 'vergroten':
        return 'Wat als dit idee 10x sterker was?';
      case 'verplaatsen':
        return 'Wat verandert er hier?';
      case 'stilte':
        return 'Alleen ordenen. Niet typen.';
      default:
        return 'Voeding';
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
      const text = type === 'verbinden' 
        ? getThemeExplanation(tA.title, tB ? tB.title : "")
        : this.getNudgeText(type, tA, tB);
        
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
    
    let dotX, dotY;
    let rotation = 0;
    let dist = 0;
    
    if (isOneTokenNudge || !tB) {
      // Hide SVG paths for single-token nudges
      if (path) path.style.opacity = '0';
      if (hoverPath) hoverPath.removeAttribute('d');
      
      rotation = tA.rotation;
      const rad = rotation * Math.PI / 180;
      dotX = tA.x - Math.sin(rad) * 115;
      dotY = tA.y + Math.cos(rad) * 115;
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
      
      // Snapping threshold checks
      if (dist > breakThreshold) {
        this.isSnapping = true;
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
        path.style.opacity = '0.65';
        if (dot && dot.classList.contains('expanded')) {
          path.classList.add('ai-suggestion-glow-path');
          path.style.strokeWidth = '6px';
          path.style.strokeDasharray = '10 6';
          path.style.opacity = '1.0';
          path.style.stroke = '#10b981';
        } else if (isClose && isDraggingEither) {
          path.classList.add('ai-suggestion-glow-path');
          path.style.strokeWidth = '6.5px';
          path.style.strokeDasharray = '16 6';
          path.style.opacity = '1.0';
          path.style.stroke = '';
        } else {
          path.classList.remove('ai-suggestion-glow-path');
          if (progress > 0) {
            const strokeW = Math.max(1.0, 5.5 * (1 - progress * 0.82));
            const dashSize = Math.max(2.0, 12 * (1 - progress * 0.85));
            const gapSize = 8 + progress * 24;
            const opacityVal = 0.65 - progress * 0.4;
            
            const r = Math.round(16 + progress * 140);
            const g = Math.round(185 - progress * 60);
            const b = Math.round(129 - progress * 30);
            
            path.style.strokeWidth = `${strokeW}px`;
            path.style.strokeDasharray = `${dashSize} ${gapSize}`;
            path.style.opacity = opacityVal.toString();
            path.style.stroke = `rgb(${r}, ${g}, ${b})`;
          } else {
            path.style.strokeWidth = '';
            path.style.strokeDasharray = '';
            path.style.stroke = '';
          }
        }
      }
      if (hoverPath) {
        hoverPath.setAttribute('d', pathD);
        hoverPath.onpointerdown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!dot || !dot.classList.contains('expanded')) {
            this.expandDot(tA, tB, dotX, dotY);
          }
        };
      }
      
      rotation = (tA.isDragging || tA.selected) ? tA.rotation : ((tB && (tB.isDragging || tB.selected)) ? tB.rotation : tA.rotation);
    }
    
    const isExpanded = dot && dot.classList.contains('expanded');
    
    // Create/update the indicator dot
    if (!dot) {
      dot = document.createElement('div');
      dot.id = 'ai-suggestion-dot';
      dot.className = 'ai-indicator-dot';
      dot.style.opacity = '0';
      dot.style.scale = '0.5';
      
      const qMark = document.createElement('span');
      qMark.className = 'ai-dot-question-mark';
      qMark.textContent = '+';
      dot.appendChild(qMark);
      
      const expandedContent = document.createElement('div');
      expandedContent.className = 'ai-dot-expanded-content';
      
      dot.appendChild(expandedContent);
      
      dot.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dot.classList.contains('sensing') && !dot.classList.contains('expanded')) {
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
    
    // Apply sensing vs normal modes
    if (isSensing) {
      dot.classList.add('sensing');
      dot.style.pointerEvents = 'none';
      const qMark = dot.querySelector('.ai-dot-question-mark');
      if (qMark) qMark.innerText = "MOBUS ziet voeding…";
    } else {
      dot.classList.remove('sensing');
      if (!isExpanded) {
        dot.style.pointerEvents = 'auto';
        const qMark = dot.querySelector('.ai-dot-question-mark');
        if (qMark) qMark.innerText = "+";
      }
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
        cutout.setAttribute('width', '32');
        cutout.setAttribute('height', '32');
        cutout.setAttribute('rx', '16');
        cutout.setAttribute('ry', '16');
      }
    }
    
    if (isExpanded && tB) {
      this.repelTokensFromExpandedDot(tA, tB, dotX, dotY);
    }
    
    this.activeSuggestion = { pairKey, tA, tB, isClose: tB ? (dist < 130) : false };
  }

  expandDot(tA, tB, dotX, dotY) {
    const dot = document.getElementById('ai-suggestion-dot');
    if (!dot || dot.classList.contains('expanded') || dot.classList.contains('sensing')) return;
    
    dot.classList.add('expanded');
    dot.style.opacity = '1';
    dot.style.scale = '1';
    dot.style.left = `${dotX}px`;
    dot.style.top = `${dotY}px`;
    dot.style.animation = 'none';
    
    const qMark = dot.querySelector('.ai-dot-question-mark');
    if (qMark) qMark.style.display = 'none';
    
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
      btnProbeer.innerText = 'Voeden';
      btnProbeer.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.applyActiveNudge();
      });
      
      const btnSlaOver = document.createElement('button');
      btnSlaOver.className = 'ai-dot-btn sla-over';
      btnSlaOver.innerText = 'Sla over';
      btnSlaOver.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.skipActiveNudge();
      });
      
      btnsContainer.appendChild(btnProbeer);
      btnsContainer.appendChild(btnSlaOver);
      expandedContent.appendChild(btnsContainer);
    }
    
    const cutout = document.getElementById('ai-mask-cutout');
    if (cutout) {
      const expandedW = 260;
      const expandedH = dot.offsetHeight || 120;
      cutout.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;
      cutout.setAttribute('width', expandedW.toString());
      cutout.setAttribute('height', expandedH.toString());
      cutout.setAttribute('rx', '20');
      cutout.setAttribute('ry', '20');
    }
    
    if (tB) {
      this.repelTokensFromExpandedDot(tA, tB, dotX, dotY);
    }
  }

  collapseDot() {
    const dot = document.getElementById('ai-suggestion-dot');
    if (!dot || !dot.classList.contains('expanded')) return;
    
    dot.classList.remove('expanded');
    dot.style.animation = '';
    dot.style.animationDuration = '';
    
    const qMark = dot.querySelector('.ai-dot-question-mark');
    if (qMark) qMark.style.display = 'block';
    
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
    
    // Check 1: One token selected for longer than 3 seconds -> suggest Vergroten
    const selectedToken = ideas.find(t => 
      t.selected && 
      this.tokenSelectedTime[t.id] && 
      (Date.now() - this.tokenSelectedTime[t.id] > 3000) && 
      !t.editing && 
      !this.ignoredSuggestions.has(t.id.toString())
    );
    if (selectedToken) {
      this.showAISuggestion(selectedToken, null, 'vergroten');
      return;
    }
    
    // Check 2: Tokens close together -> suggest Verbinden
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
      this.showAISuggestion(closestPair.tA, closestPair.tB, 'verbinden');
      return;
    }
    
    // Check 3: Tokens far apart with different words -> suggest Botsen
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
      this.showAISuggestion(farPair.tA, farPair.tB, 'botsen');
      return;
    }
    
    // Check 4: One token has a clear statement -> suggest Omkeren
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
      this.showAISuggestion(statementToken, null, 'omkeren');
      return;
    }
    
    // Check 5: Session feels static for 10 seconds -> suggest Verplaatsen or Stilte
    if (Date.now() - this.lastActivityTime >= 10000) {
      let type = 'verplaatsen';
      const hasUsedVerplaatsen = this.usedNudges.includes('verplaatsen') || this.skippedNudges.includes('verplaatsen');
      const hasUsedStilte = this.usedNudges.includes('stilte') || this.skippedNudges.includes('stilte');
      
      if (hasUsedVerplaatsen && !hasUsedStilte) {
        type = 'stilte';
      } else if (!hasUsedVerplaatsen && hasUsedStilte) {
        type = 'verplaatsen';
      } else {
        type = Math.random() < 0.5 ? 'verplaatsen' : 'stilte';
      }
      
      if (type === 'verplaatsen') {
        const tA = ideas.find(t => !t.editing && !this.ignoredSuggestions.has(t.id.toString()));
        if (tA) {
          this.showAISuggestion(tA, null, 'verplaatsen');
          return;
        }
      } else {
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
          this.showAISuggestion(bestPair.tA, bestPair.tB, 'stilte');
          return;
        } else {
          const tA = ideas.find(t => !t.editing && !this.ignoredSuggestions.has(t.id.toString()));
          if (tA) {
            this.showAISuggestion(tA, null, 'stilte');
            return;
          }
        }
      }
    }
    
    // No conditions met, hide suggestion
    this.hideAISuggestion();
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
