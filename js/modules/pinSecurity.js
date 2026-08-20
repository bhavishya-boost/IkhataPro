/* iKhataPro Feature 9: 4-Digit Security PIN Lock & Update PIN System */

window.iKhataPIN = {
  enteredDigits: '',
  pendingAction: null,
  pendingActionTitle: 'Protected Action',
  mode: 'VERIFY', // 'VERIFY' | 'CHANGE_OLD' | 'CHANGE_NEW'
  tempOldPINVerified: false,

  getCurrentPIN() {
    const bus = window.iKhataStore ? window.iKhataStore.getCurrentBusiness() : null;
    return (bus && bus.securityPIN) ? bus.securityPIN : '1234';
  },

  requirePIN(actionCallback, title = 'Security Verification Required') {
    this.mode = 'VERIFY';
    this.enteredDigits = '';
    this.pendingAction = actionCallback;
    this.pendingActionTitle = title;
    this.renderPINModal();
  },

  openUpdatePINModal() {
    this.mode = 'CHANGE_OLD';
    this.enteredDigits = '';
    this.tempOldPINVerified = false;
    this.pendingActionTitle = 'Update Security PIN';
    this.renderPINModal();
  },

  pressDigit(digit) {
    if (this.enteredDigits.length < 4) {
      this.enteredDigits += digit;
      this.updateDots();
      if (this.enteredDigits.length === 4) {
        setTimeout(() => this.handlePINCompletion(), 150);
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

  handlePINCompletion() {
    const currentPIN = this.getCurrentPIN();

    if (this.mode === 'VERIFY') {
      if (this.enteredDigits === currentPIN) {
        window.iKhataUI.closeModal();
        window.iKhataUI.showToast('✓ Security PIN verified!', 'success');
        if (typeof this.pendingAction === 'function') {
          this.pendingAction();
        }
      } else {
        window.iKhataUI.showToast(`❌ Incorrect PIN! Try default "${currentPIN}"`, 'danger');
        this.enteredDigits = '';
        this.updateDots();
      }
    } else if (this.mode === 'CHANGE_OLD') {
      if (this.enteredDigits === currentPIN) {
        window.iKhataUI.showToast('✓ Old PIN verified! Enter your NEW 4-digit PIN', 'info');
        this.mode = 'CHANGE_NEW';
        this.enteredDigits = '';
        this.renderPINModal();
      } else {
        window.iKhataUI.showToast('❌ Incorrect Old PIN! Please try again.', 'danger');
        this.enteredDigits = '';
        this.updateDots();
      }
    } else if (this.mode === 'CHANGE_NEW') {
      const newPin = this.enteredDigits;
      if (window.iKhataStore && typeof window.iKhataStore.updateSecurityPIN === 'function') {
        window.iKhataStore.updateSecurityPIN(newPin);
      }
      window.iKhataUI.closeModal();
      window.iKhataUI.showToast(`✅ Security PIN updated successfully to "${newPin}"!`, 'success');
      this.mode = 'VERIFY';
      this.enteredDigits = '';
    }
  },

  verifyPIN() {
    if (this.enteredDigits.length === 4) {
      this.handlePINCompletion();
    }
  },

  renderPINModal() {
    const currentPIN = this.getCurrentPIN();
    let modalTitle = `🔒 PIN Required: ${this.pendingActionTitle}`;
    let subtitleHTML = `Enter your 4-digit shop Security PIN (Default: <strong>${currentPIN}</strong>)`;
    let icon = '🔒';

    if (this.mode === 'CHANGE_OLD') {
      modalTitle = '🔑 Step 1: Enter Current (Old) PIN';
      subtitleHTML = 'Pehla (purana) 4-digit Security PIN daalein to verify.';
      icon = '🛡️';
    } else if (this.mode === 'CHANGE_NEW') {
      modalTitle = '✨ Step 2: Enter NEW 4-Digit PIN';
      subtitleHTML = 'Apna naya 4-digit Security PIN set karein.';
      icon = '🔑';
    }

    window.iKhataUI.openModal(modalTitle, `
      <div style="text-align: center; padding: 8px 0;">
        <div style="font-size: 2.2rem; margin-bottom: 4px;">${icon}</div>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 12px;">${subtitleHTML}</p>

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

        ${this.mode === 'VERIFY' ? `
          <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 10px;">
            <button class="btn btn-outline btn-sm" style="font-size: 0.82rem; width: 100%; border-style: dashed;" onclick="window.iKhataPIN.openUpdatePINModal()">
              ⚙️ Change / Update Security PIN
            </button>
          </div>
        ` : `
          <div style="margin-top: 16px;">
            <button class="btn btn-link btn-sm" style="font-size: 0.82rem; color: var(--text-muted);" onclick="window.iKhataPIN.requirePIN(null, 'Verify PIN')">
              ← Cancel & Back to PIN Verification
            </button>
          </div>
        `}
      </div>
    `);
  }
};
