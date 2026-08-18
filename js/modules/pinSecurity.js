/* iKhataPro Feature 9: 4-Digit Security PIN Lock System */

window.iKhataPIN = {
  currentPIN: '1234', // Default shop security PIN
  enteredDigits: '',
  pendingAction: null,
  pendingActionTitle: 'Protected Action',

  requirePIN(actionCallback, title = 'Security Verification Required') {
    this.enteredDigits = '';
    this.pendingAction = actionCallback;
    this.pendingActionTitle = title;
    this.renderPINModal();
  },

  pressDigit(digit) {
    if (this.enteredDigits.length < 4) {
      this.enteredDigits += digit;
      this.updateDots();
      if (this.enteredDigits.length === 4) {
        setTimeout(() => this.verifyPIN(), 150);
      }
    }
  },

  clearDigit() {
    if (this.enteredDigits.length > 0) {
      this.enteredDigits = this.enteredDigits.slice(0, -1);
      this.updateDots();
    }
  },

  updateDots() {
    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`pin-dot-${i}`);
      if (dot) {
        if (i <= this.enteredDigits.length) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      }
    }
  },

  verifyPIN() {
    if (this.enteredDigits === this.currentPIN) {
      window.iKhataUI.closeModal();
      window.iKhataUI.showToast('✓ Security PIN verified!', 'success');
      if (typeof this.pendingAction === 'function') {
        this.pendingAction();
      }
    } else {
      window.iKhataUI.showToast('❌ Incorrect PIN! Try default "1234"', 'danger');
      this.enteredDigits = '';
      this.updateDots();
    }
  },

  renderPINModal() {
    window.iKhataUI.openModal(`🔒 PIN Required: ${this.pendingActionTitle}`, `
      <div style="text-align: center; padding: 8px 0;">
        <div style="font-size: 2.2rem; margin-bottom: 4px;">🔒</div>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Enter your 4-digit shop Security PIN (Default: <strong>1234</strong>)</p>

        <div class="pin-dots-display">
          <div class="pin-dot" id="pin-dot-1"></div>
          <div class="pin-dot" id="pin-dot-2"></div>
          <div class="pin-dot" id="pin-dot-3"></div>
          <div class="pin-dot" id="pin-dot-4"></div>
        </div>

        <div class="pin-pad-grid">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
            <button class="pin-digit-btn" onclick="window.iKhataPIN.pressDigit('${n}')">${n}</button>
          `).join('')}
          <button class="pin-digit-btn" style="font-size: 1rem; color: var(--text-muted);" onclick="window.iKhataPIN.clearDigit()">⌫</button>
          <button class="pin-digit-btn" onclick="window.iKhataPIN.pressDigit('0')">0</button>
          <button class="pin-digit-btn" style="font-size: 0.9rem; color: var(--primary);" onclick="window.iKhataPIN.verifyPIN()">✓</button>
        </div>
      </div>
    `);
  }
};
