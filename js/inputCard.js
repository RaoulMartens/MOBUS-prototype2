class InputCard {
  constructor(id, btnX, btnY, targetX, targetY, rotation, btnElement, onConfirm, onCancel, sourceToken = null) {
    this.id = id;
    this.btnX = btnX;
    this.btnY = btnY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.rotation = rotation;
    this.btnElement = btnElement;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.sourceToken = sourceToken;
    
    this.typedText = this.sourceToken ? this.sourceToken.title : '';
    this.domElement = null;
    this.displayElement = null;
    this.letterKeys = [];
    
    if (this.sourceToken) {
      this.startWidth = this.sourceToken.baseWidth * this.sourceToken.scale;
      this.startHeight = this.sourceToken.baseHeight * this.sourceToken.scale;
      this.startBorderRadius = this.sourceToken.borderRadius;
    }
    
    this.createDom();
  }
  
  createDom() {
    const el = document.createElement('div');
    el.className = 'input-card';
    el.id = `input-card-${this.id}`;
    
    // Position card exactly on top of the plus button or source token initially
    if (this.sourceToken) {
      el.style.left = `${this.btnX - this.startWidth / 2}px`;
      el.style.top = `${this.btnY - this.startHeight / 2}px`;
      el.style.width = `${this.startWidth}px`;
      el.style.height = `${this.startHeight}px`;
      el.style.borderRadius = this.startBorderRadius;
      el.style.background = 'var(--token-bg)';
      el.style.borderColor = 'var(--token-border)';
      el.style.boxShadow = 'var(--token-shadow)';
    } else {
      el.style.left = `${this.btnX - 28}px`;
      el.style.top = `${this.btnY - 28}px`;
      el.style.width = '56px';
      el.style.height = '56px';
      el.style.borderRadius = '50%';
    }
    el.style.rotate = `${this.rotation}deg`;
    
    // Centered plus icon that fades out during morph (only for new tokens)
    if (!this.sourceToken) {
      const plusIcon = document.createElement('div');
      plusIcon.className = 'input-card-plus-icon';
      plusIcon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>`;
      el.appendChild(plusIcon);
    }
    
    // Inner content container that fades in after expansion
    const content = document.createElement('div');
    content.className = 'input-card-content';
    
    // Text display area with custom text and animated cursor caret
    const display = document.createElement('div');
    display.className = 'input-card-display';
    
    const placeholder = document.createElement('span');
    placeholder.className = 'input-card-placeholder';
    placeholder.innerText = 'Typ je idee…';
    display.appendChild(placeholder);
    
    const textSpan = document.createElement('span');
    textSpan.className = 'input-text';
    display.appendChild(textSpan);
    
    const cursor = document.createElement('span');
    cursor.className = 'custom-cursor';
    display.appendChild(cursor);
    
    this.displayElement = display;
    this.textElement = textSpan;
    this.placeholderElement = placeholder;
    content.appendChild(display);
    
    // Keyboard layout
    const keyboard = document.createElement('div');
    keyboard.className = 'input-card-keyboard';
    
    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '?']
    ];
    
    rows.forEach(keys => {
      const row = document.createElement('div');
      row.className = 'keyboard-row';
      keys.forEach(keyChar => {
        const key = document.createElement('div');
        key.className = 'keyboard-key';
        key.innerText = keyChar;
        
        const isLetter = /^[A-Z]$/.test(keyChar);
        if (isLetter) {
          this.letterKeys.push({
            element: key,
            baseChar: keyChar
          });
        }
        
        key.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const isShift = this.typedText.length === 0;
          const charToInsert = isLetter 
            ? (isShift ? keyChar.toUpperCase() : keyChar.toLowerCase())
            : keyChar;
            
          this.addChar(charToInsert);
        });
        row.appendChild(key);
      });
      keyboard.appendChild(row);
    });
    
    const bottomRow = document.createElement('div');
    bottomRow.className = 'keyboard-row';
    
    const spaceKey = document.createElement('div');
    spaceKey.className = 'keyboard-key space';
    spaceKey.innerText = 'Spatie';
    spaceKey.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.addChar(' ');
    });
    
    const backspaceKey = document.createElement('div');
    backspaceKey.className = 'keyboard-key backspace';
    backspaceKey.innerText = '⌫';
    backspaceKey.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.deleteChar();
    });
    
    bottomRow.appendChild(spaceKey);
    bottomRow.appendChild(backspaceKey);
    keyboard.appendChild(bottomRow);
    content.appendChild(keyboard);
    
    // Actions row
    const actions = document.createElement('div');
    actions.className = 'input-card-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'input-card-cancel';
    cancelBtn.innerText = 'Annuleren';
    cancelBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cancel();
    });
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'input-card-submit';
    submitBtn.innerText = this.sourceToken ? 'Opslaan' : 'Plaats idee';
    submitBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.confirm();
    });
    
    actions.appendChild(cancelBtn);
    actions.appendChild(submitBtn);
    content.appendChild(actions);
    
    el.appendChild(content);
    this.domElement = el;
    
    // Stop canvas events on touch
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    
    // Hide original edge button instantly (only when spawning from a button)
    if (this.btnElement) {
      this.btnElement.classList.add('hidden-btn');
    }
    
    this.updateDisplay();
    
    document.getElementById('token-container').appendChild(el);
    
    // Trigger morph grow transition on next paint frames
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.open();
      });
    });
  }
  
  open() {
    if (!this.domElement) return;
    this.domElement.classList.add('open');
    this.updateStyle();
  }
  
  updateStyle() {
    if (!this.domElement) return;
    
    if (this.domElement.classList.contains('open')) {
      const width = 350;
      const height = 285;
      const tx = this.targetX - width / 2;
      const ty = this.targetY - height / 2;
      
      this.domElement.style.left = `${tx}px`;
      this.domElement.style.top = `${ty}px`;
      this.domElement.style.width = `${width}px`;
      this.domElement.style.height = `${height}px`;
      this.domElement.style.borderRadius = '28px';
      
      if (this.sourceToken) {
        this.domElement.style.background = '';
        this.domElement.style.borderColor = '';
        this.domElement.style.boxShadow = '';
      }
    }
  }
  
  addChar(char) {
    if (char === ' ' && this.typedText.length === 0) return;
    this.typedText += char;
    this.updateDisplay();
  }
  
  deleteChar() {
    this.typedText = this.typedText.slice(0, -1);
    this.updateDisplay();
  }
  
  updateDisplay() {
    if (!this.displayElement || !this.textElement || !this.placeholderElement) return;
    
    if (this.typedText) {
      this.textElement.innerText = this.typedText;
      this.placeholderElement.style.display = 'none';
    } else {
      this.textElement.innerText = '';
      this.placeholderElement.style.display = 'inline';
    }
    
    // Update keyboard keys casing based on shifts
    const isShift = this.typedText.length === 0;
    if (this.letterKeys) {
      this.letterKeys.forEach(item => {
        item.element.innerText = isShift ? item.baseChar.toUpperCase() : item.baseChar.toLowerCase();
      });
    }
    
    this.displayElement.scrollTop = this.displayElement.scrollHeight;
  }
  
  confirm() {
    const text = this.typedText.trim();
    if (text) {
      this.destroy(true);
    } else {
      this.destroy(false);
    }
  }
  
  cancel() {
    this.destroy(false);
  }
  
  destroy(isConfirming) {
    if (this.domElement) {
      this.domElement.classList.remove('open');
      this.domElement.classList.add('destroying');
      
      // Morph back to starting position and size
      if (this.sourceToken) {
        this.domElement.style.left = `${this.btnX - this.startWidth / 2}px`;
        this.domElement.style.top = `${this.btnY - this.startHeight / 2}px`;
        this.domElement.style.width = `${this.startWidth}px`;
        this.domElement.style.height = `${this.startHeight}px`;
        this.domElement.style.borderRadius = this.startBorderRadius;
        this.domElement.style.background = 'var(--token-bg)';
        this.domElement.style.borderColor = 'var(--token-border)';
        this.domElement.style.boxShadow = 'var(--token-shadow)';
      } else {
        this.domElement.style.left = `${this.btnX - 28}px`;
        this.domElement.style.top = `${this.btnY - 28}px`;
        this.domElement.style.width = '56px';
        this.domElement.style.height = '56px';
        this.domElement.style.borderRadius = '50%';
      }
      
      setTimeout(() => {
        if (this.domElement) {
          this.domElement.remove();
          this.domElement = null;
        }
        
        // Restore edge button visibility instantly
        if (this.btnElement) {
          this.btnElement.classList.remove('hidden-btn');
        }
        
        // Handle callbacks after animation ends
        if (isConfirming) {
          this.onConfirm(this.typedText.trim());
        } else {
          this.onCancel();
        }
      }, 250); // Matches CSS transition duration
    }
  }
}
