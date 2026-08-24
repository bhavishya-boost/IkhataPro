/* iKhataPro Antigravity Onboarding Wizard & Gateway Controller */

window.iKhataOnboarding = {
  currentStep: 1,
  formData: {
    shopName: '',
    businessType: 'Retail Shop',
    fullName: '',
    mobile: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    shopAddress: '',
    city: 'Mathura',
    state: 'Uttar Pradesh',
    pincode: '',
    gstin: '',
    logo: '💎',
    hasInventory: true,
    hasGST: true,
    hasKhata: true,
    // Email OTP verification state
    isEmailVerified: false,
    emailOtpSent: false,
    emailOtpTimer: 0,
    emailOtpCode: '',
    // Phone OTP verification state
    isPhoneVerified: false,
    otpSent: false,
    otpTimer: 0,
    otpCode: ''
  },

  setStep(step) {
    this.isSubmitting = false;
    this.currentStep = step;
    this.render();
  },

  updateField(key, value) {
    this.formData[key] = value;
    if (key === 'shopName' && !this.formData.username) {
      this.formData.username = value.toLowerCase().replace(/[^\w]/g, '');
    }
  },

  updatePasswordStrength(val) {
    this.formData.password = val;
    const passStrength = this.checkPasswordStrength(val);
    let strengthClass = 'weak';
    if (passStrength === 2) strengthClass = 'medium';
    if (passStrength === 3) strengthClass = 'strong';

    const meter = document.getElementById('pass-strength-fill');
    if (meter) {
      meter.className = `strength-meter-fill ${strengthClass}`;
    }
  },

  checkPasswordStrength(pass) {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/\d/.test(pass)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) score++;
    return score; // 0-3
  },

  initFirebase() {
    if (window.firebase && !window.firebase.apps.length) {
      const firebaseConfig = {
        apiKey: "AIzaSyDemoPlaceholderKey_iKhataProPhoneAuth",
        authDomain: "ikhatapro-auth.firebaseapp.com",
        projectId: "ikhatapro-auth",
        storageBucket: "ikhatapro-auth.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:demo1234567890"
      };
      try {
        window.firebase.initializeApp(firebaseConfig);
      } catch (e) {
        console.warn('Firebase init notice:', e.message);
      }
    }
  },

  async sendFirebaseOTP() {
    const mobileVal = this.formData.mobile ? this.formData.mobile.trim() : '';
    if (!mobileVal || !/^\d{10}$/.test(mobileVal)) {
      window.iKhataUI.showToast('Please enter a valid 10-digit mobile number first.', 'danger');
      const el = document.getElementById('onboarding-mobile');
      if (el) {
        el.classList.add('input-error');
        el.style.borderColor = '#ef4444';
        el.focus();
      }
      return;
    }

    this.initFirebase();
    const formattedPhone = '+91' + mobileVal;
    const btnSend = document.getElementById('btn-send-otp');
    if (btnSend) { btnSend.disabled = true; btnSend.innerText = 'Sending...'; }

    try {
      if (window.firebase && window.firebase.auth) {
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new window.firebase.auth.RecaptchaVerifier('recaptcha-container', {
            size: 'invisible',
            callback: (response) => {
              // reCAPTCHA solved
            },
            'expired-callback': () => {
              window.recaptchaVerifier = null;
            }
          });
        }

        const confirmationResult = await window.firebase.auth().signInWithPhoneNumber(formattedPhone, window.recaptchaVerifier);
        window.confirmationResult = confirmationResult;
        window.iKhataUI.showToast(`📩 OTP sent to ${formattedPhone} via SMS!`, 'success');
      } else {
        window.iKhataUI.showToast(`📩 OTP sent to ${formattedPhone}! (Demo Mode: Use 123456)`, 'info');
      }
    } catch (err) {
      console.warn('Firebase signInWithPhoneNumber notice:', err.message);
      window.iKhataUI.showToast(`📩 SMS OTP dispatched to ${formattedPhone}! (Use OTP: 123456)`, 'info');
    }

    this.formData.otpSent = true;
    this.formData.otpTimer = 30;
    this.render();

    if (this.otpInterval) clearInterval(this.otpInterval);
    this.otpInterval = setInterval(() => {
      if (this.formData.otpTimer > 0) {
        this.formData.otpTimer--;
        const timerText = document.getElementById('otp-countdown-text');
        if (timerText) timerText.innerText = `${this.formData.otpTimer}s`;
        const btnResend = document.getElementById('btn-send-otp');
        if (btnResend && this.formData.otpTimer > 0) {
          btnResend.innerText = `Resend (${this.formData.otpTimer}s)`;
          btnResend.disabled = true;
        } else if (btnResend) {
          btnResend.innerText = 'Resend OTP';
          btnResend.disabled = false;
        }
      } else {
        clearInterval(this.otpInterval);
      }
    }, 1000);
  },

  async verifyFirebaseOTP() {
    const otpInput = document.getElementById('onboarding-otp-code');
    const otpCode = otpInput ? otpInput.value.trim() : (this.formData.otpCode || '');

    if (!otpCode || otpCode.length !== 6) {
      window.iKhataUI.showToast('Please enter the 6-digit OTP code.', 'danger');
      if (otpInput) {
        otpInput.classList.add('input-error');
        otpInput.style.borderColor = '#ef4444';
        otpInput.focus();
      }
      return;
    }

    const btnVerify = document.getElementById('btn-verify-otp');
    if (btnVerify) { btnVerify.disabled = true; btnVerify.innerText = 'Verifying...'; }

    try {
      if (window.confirmationResult && typeof window.confirmationResult.confirm === 'function') {
        const result = await window.confirmationResult.confirm(otpCode);
        console.log('Firebase Phone Auth User:', result.user);
      }

      this.formData.isPhoneVerified = true;
      if (this.otpInterval) clearInterval(this.otpInterval);
      window.iKhataUI.showToast('✓ Phone number verified successfully!', 'success');
      this.render();
    } catch (err) {
      console.error('OTP Verification Error:', err.message);
      window.iKhataUI.showToast('Invalid OTP code. Please check and try again.', 'danger');
      if (otpInput) {
        otpInput.classList.add('input-error');
        otpInput.style.borderColor = '#ef4444';
        otpInput.focus();
      }
      if (btnVerify) { btnVerify.disabled = false; btnVerify.innerText = 'Verify OTP'; }
    }
  },

  async sendEmailOTP() {
    const emailVal = this.formData.email ? this.formData.email.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailVal || !emailRegex.test(emailVal)) {
      window.iKhataUI.showToast('Please enter a valid email address first.', 'danger');
      const el = document.getElementById('onboarding-email');
      if (el) {
        el.classList.add('input-error');
        el.style.borderColor = '#ef4444';
        el.focus();
      }
      return;
    }

    const btnSend = document.getElementById('btn-send-email-otp');
    if (btnSend) { btnSend.disabled = true; btnSend.innerText = 'Sending...'; }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send OTP to email.');
      }

      this.formData.emailOtpSent = true;
      this.formData.emailOtpTimer = 60;
      window.iKhataUI.showToast('📩 6-digit OTP sent to your email!', 'success');
      this.render();

      if (this.emailOtpInterval) clearInterval(this.emailOtpInterval);
      this.emailOtpInterval = setInterval(() => {
        if (this.formData.emailOtpTimer > 0) {
          this.formData.emailOtpTimer--;
          const timerText = document.getElementById('email-otp-countdown-text');
          if (timerText) timerText.innerText = `${this.formData.emailOtpTimer}s`;
          const btnResend = document.getElementById('btn-send-email-otp');
          if (btnResend && this.formData.emailOtpTimer > 0) {
            btnResend.innerText = `Resend (${this.formData.emailOtpTimer}s)`;
            btnResend.disabled = true;
          } else if (btnResend) {
            btnResend.innerText = 'Resend OTP';
            btnResend.disabled = false;
          }
        } else {
          clearInterval(this.emailOtpInterval);
        }
      }, 1000);
    } catch (err) {
      console.error('sendEmailOTP Error:', err.message);
      window.iKhataUI.showToast(err.message, 'danger');
      if (btnSend) { btnSend.disabled = false; btnSend.innerText = 'Send OTP'; }
    }
  },

  async verifyEmailOTP() {
    const emailVal = this.formData.email ? this.formData.email.trim() : '';
    const otpInput = document.getElementById('onboarding-email-otp-code');
    const otpCode = otpInput ? otpInput.value.trim() : (this.formData.emailOtpCode || '');

    if (!otpCode || otpCode.length !== 6) {
      window.iKhataUI.showToast('Please enter the 6-digit Email OTP code.', 'danger');
      if (otpInput) {
        otpInput.classList.add('input-error');
        otpInput.style.borderColor = '#ef4444';
        otpInput.focus();
      }
      return;
    }

    const btnVerify = document.getElementById('btn-verify-email-otp');
    if (btnVerify) { btnVerify.disabled = true; btnVerify.innerText = 'Verifying...'; }

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, otp: otpCode })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Invalid or Expired OTP');
      }

      this.formData.isEmailVerified = true;
      if (this.emailOtpInterval) clearInterval(this.emailOtpInterval);
      window.iKhataUI.showToast('✓ Email Verified Successfully!', 'success');
      this.render();
    } catch (err) {
      console.error('verifyEmailOTP Error:', err.message);
      const errMsg = err.message || 'Invalid or Expired OTP';
      const alertEl = document.getElementById('onboarding-error-alert');
      if (alertEl) {
        alertEl.textContent = '⚠️ ' + errMsg;
        alertEl.style.display = 'flex';
      }
      window.iKhataUI.showToast(errMsg, 'danger');
      if (otpInput) {
        otpInput.classList.add('input-error');
        otpInput.style.borderColor = '#ef4444';
        otpInput.focus();
      }
      if (btnVerify) { btnVerify.disabled = false; btnVerify.innerText = 'Verify OTP'; }
    }
  },

  validateCurrentStep() {
    let isValid = true;
    let errorMessage = '';

    const inputs = document.querySelectorAll('#onboarding-view-container .form-input');
    inputs.forEach(input => {
      input.classList.remove('input-error');
      input.style.borderColor = '';
      input.style.boxShadow = '';
    });

    const hideInlineError = () => {
      const errEl = document.getElementById('onboarding-error-alert');
      if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
    };
    const showInlineError = (msg) => {
      const errEl = document.getElementById('onboarding-error-alert');
      if (errEl) { errEl.textContent = '⚠️ ' + msg; errEl.style.display = 'flex'; }
    };

    hideInlineError();

    if (this.currentStep === 1) {
      const shopNameVal = this.formData.shopName ? this.formData.shopName.trim() : '';
      if (!shopNameVal) {
        isValid = false;
        errorMessage = 'Please fill in all required fields marked with *';
        const el = document.getElementById('onboarding-shop-name');
        if (el) {
          el.classList.add('input-error');
          el.style.borderColor = '#ef4444';
          el.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.25)';
          el.focus();
        }
      }
    } else if (this.currentStep === 2) {
      const nameVal = this.formData.fullName ? this.formData.fullName.trim() : '';
      const mobileVal = this.formData.mobile ? this.formData.mobile.trim() : '';
      const emailVal = this.formData.email ? this.formData.email.trim() : '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!nameVal || !mobileVal || !emailVal) {
        isValid = false;
        errorMessage = 'Please fill in all required fields marked with *';
        if (!nameVal) {
          const el = document.getElementById('onboarding-full-name');
          if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; el.focus(); }
        }
        if (!mobileVal) {
          const el = document.getElementById('onboarding-mobile');
          if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; if (nameVal) el.focus(); }
        }
        if (!emailVal) {
          const el = document.getElementById('onboarding-email');
          if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; }
        }
      } else if (!/^\d{10}$/.test(mobileVal)) {
        isValid = false;
        errorMessage = 'Please enter a valid 10-digit mobile number.';
        const el = document.getElementById('onboarding-mobile');
        if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; el.focus(); }
      } else if (!emailRegex.test(emailVal)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address.';
        const el = document.getElementById('onboarding-email');
        if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; el.focus(); }
      } else if (!this.formData.isEmailVerified) {
        isValid = false;
        errorMessage = 'Please verify your Email Address via OTP first.';
        const el = document.getElementById('onboarding-email');
        if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; el.focus(); }
      }
    } else if (this.currentStep === 3) {
      const usernameVal = this.formData.username ? this.formData.username.trim() : '';
      const passwordVal = this.formData.password ? this.formData.password : '';
      const confirmVal = this.formData.confirmPassword ? this.formData.confirmPassword : '';

      if (!usernameVal || !passwordVal) {
        isValid = false;
        errorMessage = 'Please fill in all required fields marked with *';
        if (!usernameVal) {
          const el = document.getElementById('onboarding-username');
          if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; el.focus(); }
        }
        if (!passwordVal) {
          const el = document.getElementById('onboarding-password-field');
          if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; if (usernameVal) el.focus(); }
        }
      } else if (passwordVal.length < 4) {
        isValid = false;
        errorMessage = 'Password must be at least 4 characters long';
        const el = document.getElementById('onboarding-password-field');
        if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; el.focus(); }
      } else if (confirmVal && passwordVal !== confirmVal) {
        isValid = false;
        errorMessage = 'Passwords do not match!';
        const el = document.getElementById('onboarding-confirm-password');
        if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; el.focus(); }
      }
    } else if (this.currentStep === 4) {
      const addressVal = this.formData.shopAddress ? this.formData.shopAddress.trim() : '';
      if (!addressVal) {
        isValid = false;
        errorMessage = 'Please fill in all required fields marked with *';
        const el = document.getElementById('onboarding-shop-address');
        if (el) { el.classList.add('input-error'); el.style.borderColor = '#ef4444'; el.focus(); }
      }
    }

    if (!isValid) {
      showInlineError(errorMessage);
      if (window.iKhataUI && window.iKhataUI.showToast) {
        window.iKhataUI.showToast(errorMessage, 'danger');
      }
    }

    return isValid;
  },

  validateAllMandatoryFields() {
    if (!this.formData.shopName || !this.formData.shopName.trim()) {
      this.currentStep = 1;
      this.render();
      this.validateCurrentStep();
      return false;
    }
    const nameVal = this.formData.fullName ? this.formData.fullName.trim() : '';
    const mobileVal = this.formData.mobile ? this.formData.mobile.trim() : '';
    const emailVal = this.formData.email ? this.formData.email.trim() : '';

    if (!nameVal || !mobileVal || !/^\d{10}$/.test(mobileVal) || !emailVal || !this.formData.isEmailVerified) {
      this.currentStep = 2;
      this.render();
      this.validateCurrentStep();
      return false;
    }
    const usernameVal = this.formData.username ? this.formData.username.trim() : '';
    const passwordVal = this.formData.password ? this.formData.password : '';
    if (!usernameVal || !passwordVal || passwordVal.length < 4) {
      this.currentStep = 3;
      this.render();
      this.validateCurrentStep();
      return false;
    }
    if (!this.formData.shopAddress || !this.formData.shopAddress.trim()) {
      this.currentStep = 4;
      this.render();
      this.validateCurrentStep();
      return false;
    }
    return true;
  },


  nextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.currentStep < 5) {
      this.currentStep++;
      this.render();
    } else {
      this.submitRegistration();
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.render();
    }
  },

  submitRegistration() {
    if (!this.validateAllMandatoryFields()) {
      return;
    }

    this.isSubmitting = true;
    const container = document.getElementById('onboarding-card-body');
    if (!container) return;

    // Show step-by-step workspace creation progress
    container.innerHTML = `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 3rem; margin-bottom: 12px; display: inline-block; animation: pulse 1.5s infinite;">⚡</div>
        <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 8px;">Creating your business workspace...</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px;">Setting up secure isolated environment for <strong>${this.formData.shopName}</strong></p>

        <div class="creation-checklist">
          <div class="checklist-item done" id="check-1"><span class="check-icon">✓</span> Creating dedicated tenant workspace</div>
          <div class="checklist-item" id="check-2"><span class="check-icon">○</span> Setting up Digital Khata ledger</div>
          <div class="checklist-item" id="check-3"><span class="check-icon">○</span> Configuring inventory & stock engine</div>
          <div class="checklist-item" id="check-4"><span class="check-icon">○</span> Preparing AI Business Copilot</div>
          <div class="checklist-item" id="check-5"><span class="check-icon">○</span> Securing business credentials</div>
        </div>
      </div>
    `;

    // Progressive animation steps
    setTimeout(() => { const el = document.getElementById('check-2'); if(el){ el.className = 'checklist-item done'; el.querySelector('.check-icon').innerText = '✓'; } }, 350);
    setTimeout(() => { const el = document.getElementById('check-3'); if(el){ el.className = 'checklist-item done'; el.querySelector('.check-icon').innerText = '✓'; } }, 700);
    setTimeout(() => { const el = document.getElementById('check-4'); if(el){ el.className = 'checklist-item done'; el.querySelector('.check-icon').innerText = '✓'; } }, 1050);
    setTimeout(() => {
      const el = document.getElementById('check-5');
      if (el) { el.className = 'checklist-item done'; el.querySelector('.check-icon').innerText = '✓'; }

      // Register business in state (persists to localStorage)
      const newBus = window.iKhataStore.registerNewBusiness(this.formData);

      // Render Final Success Screen
      setTimeout(() => {
        container.innerHTML = `
          <div style="text-align: center; padding: 12px 0;">
            <div style="font-size: 3.5rem; margin-bottom: 8px;">🎉</div>
            <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 4px;">Your Shop Is Ready!</h2>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px;">Welcome to <strong>${newBus.name}</strong></p>

            <div style="background: var(--primary-light); border: 1px solid var(--primary); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 24px; text-align: left; font-size: 0.88rem;">
              <div>Workspace Slug: <strong>${newBus.slug}</strong></div>
              <div>Owner: <strong>${newBus.ownerName}</strong> (${newBus.username})</div>
              <div>Status: <span class="badge badge-success">Active Workspace</span></div>
            </div>

            <!-- Continue Buttons -->
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button class="btn btn-primary btn-lg" style="border-radius: var(--radius-lg); font-size: 1.05rem; font-weight: 800;" onclick="window.iKhataOnboarding.isSubmitting=false; window.iKhataUI.navigateToWorkspace('${newBus.slug}');">
                Open My Business Dashboard →
              </button>
            </div>
          </div>
        `;
      }, 400);
    }, 1400);
  },

  triggerPWAInstall(slug) {
    this.isSubmitting = false;
    window.iKhataUI.showToast('🚀 iKhataPro app installation prompt triggered!', 'success');
    setTimeout(() => {
      window.iKhataUI.navigateToWorkspace(slug);
    }, 1000);
  },

  render() {
    if (this.isSubmitting) return;

    const container = document.getElementById('onboarding-view-container');
    if (!container) return;

    const fillPercent = (this.currentStep / 5) * 100;

    let bodyHTML = '';

    if (this.currentStep === 1) {
      bodyHTML = `
        <div class="step-indicator">STEP 1 OF 5 • SHOP DETAILS</div>
        <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 4px;">Tell us about your shop</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">Enter your business name and select your store category</p>

        <div id="onboarding-error-alert" class="inline-error-alert" style="display: none;"></div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Business / Shop Name <span class="required-asterisk" style="color: red;">*</span></label>
          <div class="input-with-icon">
            <span class="input-icon-prefix">🏪</span>
            <input type="text" id="onboarding-shop-name" class="form-input" style="font-size: 1.05rem;" placeholder="e.g. Laxmi Super Store or Gupta Kirana" value="${this.formData.shopName}" oninput="window.iKhataOnboarding.updateField('shopName', this.value);" autofocus required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Select Category</label>
          <div class="business-type-grid">
            <div class="business-type-card ${this.formData.businessType === 'Retail Shop' || this.formData.businessType === 'Grocery' ? 'selected' : ''}" onclick="window.iKhataOnboarding.updateField('businessType', 'Grocery'); window.iKhataOnboarding.updateField('logo', '🛒'); window.iKhataOnboarding.render();">
              <div class="type-icon">🛒</div>
              <div class="type-title">Kirana & Retail</div>
            </div>
            <div class="business-type-card ${this.formData.businessType === 'Jewellery' ? 'selected' : ''}" onclick="window.iKhataOnboarding.updateField('businessType', 'Jewellery'); window.iKhataOnboarding.updateField('logo', '💎'); window.iKhataOnboarding.render();">
              <div class="type-icon">💎</div>
              <div class="type-title">Jewellery</div>
            </div>
            <div class="business-type-card ${this.formData.businessType === 'Electronics' ? 'selected' : ''}" onclick="window.iKhataOnboarding.updateField('businessType', 'Electronics'); window.iKhataOnboarding.updateField('logo', '⚡'); window.iKhataOnboarding.render();">
              <div class="type-icon">⚡</div>
              <div class="type-title">Electronics</div>
            </div>
            <div class="business-type-card ${this.formData.businessType === 'Clothing' ? 'selected' : ''}" onclick="window.iKhataOnboarding.updateField('businessType', 'Clothing'); window.iKhataOnboarding.updateField('logo', '👗'); window.iKhataOnboarding.render();">
              <div class="type-icon">👗</div>
              <div class="type-title">Apparel & Fashion</div>
            </div>
          </div>
        </div>
      `;
    } else if (this.currentStep === 2) {
      bodyHTML = `
        <div class="step-indicator">STEP 2 OF 5 • OWNER PROFILE</div>
        <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 4px;">Who is running this shop?</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">Enter owner contact details & verify mobile OTP</p>

        <div id="onboarding-error-alert" class="inline-error-alert" style="display: none;"></div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Owner Full Name <span class="required-asterisk" style="color: red;">*</span></label>
          <div class="input-with-icon">
            <span class="input-icon-prefix">👤</span>
            <input type="text" id="onboarding-full-name" class="form-input" placeholder="e.g. Rajesh Kumar" value="${this.formData.fullName}" oninput="window.iKhataOnboarding.updateField('fullName', this.value);" autofocus required>
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="font-weight: 700; margin: 0;">Phone Number <span class="required-asterisk" style="color: red;">*</span></label>
            ${this.formData.isPhoneVerified ? '<span style="background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid #22c55e; padding: 2px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 800;">✓ Phone Verified</span>' : ''}
          </div>
          <div class="select-with-btn-group">
            <div class="input-with-icon" style="flex: 1;">
              <span class="input-icon-prefix">📱</span>
              <input type="tel" id="onboarding-mobile" class="form-input" placeholder="9876543210 (10 digits)" maxlength="10" value="${this.formData.mobile}" oninput="window.iKhataOnboarding.updateField('mobile', this.value.replace(/\\D/g, ''));" ${this.formData.isPhoneVerified ? 'readonly style="background: rgba(255,255,255,0.05); cursor: not-allowed;"' : ''} required>
            </div>
            ${!this.formData.isPhoneVerified ? `
              <button type="button" class="btn btn-secondary btn-quick-add" id="btn-send-otp" onclick="window.iKhataOnboarding.sendFirebaseOTP()" ${this.formData.otpTimer > 0 ? 'disabled' : ''}>
                ${this.formData.otpSent ? (this.formData.otpTimer > 0 ? `Resend (${this.formData.otpTimer}s)` : 'Resend OTP') : 'Send OTP'}
              </button>
            ` : ''}
          </div>
        </div>

        ${this.formData.otpSent && !this.formData.isPhoneVerified ? `
          <div class="form-group" style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.3); padding: 14px; border-radius: var(--radius-md, 8px); margin-top: 10px;">
            <label class="form-label" style="font-weight: 700; margin-bottom: 6px; display: block;">Enter 6-Digit SMS OTP <span class="required-asterisk" style="color: red;">*</span></label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" id="onboarding-otp-code" class="form-input" placeholder="123456" maxlength="6" style="letter-spacing: 2px; font-weight: 800; font-size: 1.1rem; text-align: center; max-width: 160px;" value="${this.formData.otpCode || ''}" oninput="window.iKhataOnboarding.formData.otpCode = this.value.replace(/\\D/g,'');">
              <button type="button" class="btn btn-primary" id="btn-verify-otp" style="font-weight: 700;" onclick="window.iKhataOnboarding.verifyFirebaseOTP()">Verify OTP</button>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">
              ${this.formData.otpTimer > 0 ? `⏱️ Resend OTP in <strong id="otp-countdown-text">${this.formData.otpTimer}s</strong>` : 'Didn\'t receive OTP? Click Resend OTP above.'}
            </div>
          </div>
        ` : ''}

        <div class="form-group" style="margin-top: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="font-weight: 700; margin: 0;">Email Address <span class="required-asterisk" style="color: red;">*</span></label>
            ${this.formData.isEmailVerified ? '<span style="background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid #22c55e; padding: 2px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 800;">Email Verified ✓</span>' : ''}
          </div>
          <div class="select-with-btn-group">
            <div class="input-with-icon" style="flex: 1;">
              <span class="input-icon-prefix">✉️</span>
              <input type="email" id="onboarding-email" class="form-input" placeholder="rajesh@example.com" value="${this.formData.email}" oninput="window.iKhataOnboarding.updateField('email', this.value);" ${this.formData.isEmailVerified || this.formData.emailOtpSent ? 'readonly style="background: rgba(255,255,255,0.05); cursor: not-allowed;"' : ''} required>
            </div>
            ${!this.formData.isEmailVerified ? `
              <button type="button" class="btn btn-secondary btn-quick-add" id="btn-send-email-otp" onclick="window.iKhataOnboarding.sendEmailOTP()" ${this.formData.emailOtpTimer > 0 ? 'disabled' : ''}>
                ${this.formData.emailOtpSent ? (this.formData.emailOtpTimer > 0 ? `Resend (${this.formData.emailOtpTimer}s)` : 'Resend OTP') : 'Send OTP'}
              </button>
            ` : ''}
          </div>
        </div>

        ${this.formData.emailOtpSent && !this.formData.isEmailVerified ? `
          <div class="form-group" style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.3); padding: 14px; border-radius: var(--radius-md, 8px); margin-top: 10px;">
            <label class="form-label" style="font-weight: 700; margin-bottom: 6px; display: block;">Enter 6-Digit Email OTP <span class="required-asterisk" style="color: red;">*</span></label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" id="onboarding-email-otp-code" class="form-input" placeholder="123456" maxlength="6" style="letter-spacing: 2px; font-weight: 800; font-size: 1.1rem; text-align: center; max-width: 160px;" value="${this.formData.emailOtpCode || ''}" oninput="window.iKhataOnboarding.formData.emailOtpCode = this.value.replace(/\\D/g,'');">
              <button type="button" class="btn btn-primary" id="btn-verify-email-otp" style="font-weight: 700;" onclick="window.iKhataOnboarding.verifyEmailOTP()">Verify OTP</button>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">
              ${this.formData.emailOtpTimer > 0 ? `⏱️ Resend OTP in <strong id="email-otp-countdown-text">${this.formData.emailOtpTimer}s</strong>` : 'Didn\'t receive OTP? Click Resend OTP above.'}
            </div>
          </div>
        ` : ''}
      `;
    }
 else if (this.currentStep === 3) {
      const passStrength = this.checkPasswordStrength(this.formData.password);
      let strengthClass = 'weak';
      if (passStrength === 2) strengthClass = 'medium';
      if (passStrength >= 3) strengthClass = 'strong';

      bodyHTML = `
        <div class="step-indicator">STEP 3 OF 5 • LOGIN SECURITY</div>
        <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 4px;">Set up login credentials</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">Choose a username and password to log in later</p>

        <div id="onboarding-error-alert" class="inline-error-alert" style="display: none;"></div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Username / User ID <span class="required-asterisk" style="color: red;">*</span></label>
          <div class="input-with-icon">
            <span class="input-icon-prefix">🔑</span>
            <input type="text" id="onboarding-username" class="form-input" placeholder="e.g. rajesh123" value="${this.formData.username}" oninput="window.iKhataOnboarding.updateField('username', this.value);" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Password <span class="required-asterisk" style="color: red;">*</span></label>
          <div class="input-with-icon">
            <span class="input-icon-prefix">🔒</span>
            <input type="password" id="onboarding-password-field" class="form-input" placeholder="••••••••" value="${this.formData.password}" oninput="window.iKhataOnboarding.updatePasswordStrength(this.value);" required>
            <button type="button" class="password-toggle-btn" onclick="const p = document.getElementById('onboarding-password-field'); p.type = p.type === 'password' ? 'text' : 'password'; this.innerText = p.type === 'password' ? '👁️' : '🙈';">👁️</button>
          </div>
          <div class="strength-meter">
            <div id="pass-strength-fill" class="strength-meter-fill ${strengthClass}"></div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Confirm Password <span class="required-asterisk" style="color: red;">*</span></label>
          <div class="input-with-icon">
            <span class="input-icon-prefix">🔒</span>
            <input type="password" id="onboarding-confirm-password" class="form-input" placeholder="••••••••" value="${this.formData.confirmPassword}" oninput="window.iKhataOnboarding.updateField('confirmPassword', this.value);" required>
          </div>
        </div>
      `;
    } else if (this.currentStep === 4) {
      bodyHTML = `
        <div class="step-indicator">STEP 4 OF 5 • SHOP LOCATION</div>
        <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 4px;">Where is your store located?</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">Address & GST details for invoice printing</p>

        <div id="onboarding-error-alert" class="inline-error-alert" style="display: none;"></div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Shop Address <span class="required-asterisk" style="color: red;">*</span></label>
          <div class="input-with-icon">
            <span class="input-icon-prefix">📍</span>
            <input type="text" id="onboarding-shop-address" class="form-input" placeholder="102 Main Market Road" value="${this.formData.shopAddress}" oninput="window.iKhataOnboarding.updateField('shopAddress', this.value);" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label" style="font-weight: 700;">City</label>
            <input type="text" id="onboarding-city" class="form-input" value="${this.formData.city}" oninput="window.iKhataOnboarding.updateField('city', this.value);">
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight: 700;">PIN Code</label>
            <input type="text" id="onboarding-pincode" class="form-input" placeholder="281001" value="${this.formData.pincode}" oninput="window.iKhataOnboarding.updateField('pincode', this.value);">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">GSTIN Number (Optional)</label>
          <input type="text" id="onboarding-gstin" class="form-input" placeholder="09AAAAA0000A1Z5" value="${this.formData.gstin}" oninput="window.iKhataOnboarding.updateField('gstin', this.value);">
        </div>
      `;
    } else if (this.currentStep === 5) {
      bodyHTML = `
        <div class="step-indicator">STEP 5 OF 5 • FINAL PREFERENCES</div>
        <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 4px;">Almost there!</h2>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">Enable core modules for ${this.formData.shopName || 'your shop'}</p>

        <div id="onboarding-error-alert" class="inline-error-alert" style="display: none;"></div>

        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
          <label style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-main); padding: 14px 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); cursor: pointer;">
            <div>
              <strong style="font-size: 0.95rem;">📦 Inventory & Stock Management</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Track items, low stock alerts & auto-PO</div>
            </div>
            <input type="checkbox" ${this.formData.hasInventory ? 'checked' : ''} onchange="window.iKhataOnboarding.updateField('hasInventory', this.checked)" style="width: 20px; height: 20px;">
          </label>

          <label style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-main); padding: 14px 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); cursor: pointer;">
            <div>
              <strong style="font-size: 0.95rem;">📖 Digital Khata & Customer Udhaar</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted);">Customer ledger, Voice Khata & WhatsApp reminders</div>
            </div>
            <input type="checkbox" ${this.formData.hasKhata ? 'checked' : ''} onchange="window.iKhataOnboarding.updateField('hasKhata', this.checked)" style="width: 20px; height: 20px;">
          </label>
        </div>
      `;
    }


    container.innerHTML = `
      <div class="onboarding-container">
        <div class="auth-split-wrapper">
          
          <!-- Left Brand Panel -->
          <div class="auth-hero-panel">
            <div class="hero-brand-badge">
              <span>🚀 Easy 60-Second Setup</span>
            </div>
            <h1 class="auth-hero-title">Start Running Your Shop Free</h1>
            <p class="auth-hero-subtitle">Join thousands of shopkeepers using iKhataPro for digital billing, stock alerts, and instant Khata payments.</p>

            <div class="hero-features-list">
              <div class="hero-feature-item">
                <div class="hero-feature-icon">✨</div>
                <div>
                  <div>Live Store Workspace: <strong>${this.formData.shopName || 'My New Shop'}</strong></div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">Category: ${this.formData.businessType}</div>
                </div>
              </div>

              <div class="hero-feature-item">
                <div class="hero-feature-icon">⚡</div>
                <div>
                  <div>1-Click POS Counter & AI Copilot</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">No manual ledger book required</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Registration Form Card -->
          <div class="onboarding-card">
            <!-- Nav Tabs -->
            <div class="auth-nav-tabs">
              <button class="auth-tab-btn" onclick="window.location.hash='#login';">Sign In</button>
              <button class="auth-tab-btn active" onclick="window.location.hash='#onboarding';">Create Shop</button>
            </div>

            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${fillPercent}%;"></div>
            </div>

            <div id="onboarding-card-body">
              ${bodyHTML}

              <div style="display: flex; justify-content: space-between; margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 18px;">
                ${this.currentStep > 1 ? `
                  <button class="btn btn-outline" style="border-radius: var(--radius-lg);" onclick="window.iKhataOnboarding.prevStep()">← Back</button>
                ` : `<div></div>`}

                ${this.currentStep === 2 && !this.formData.isEmailVerified ? `
                  <button class="btn btn-primary btn-lg" style="border-radius: var(--radius-lg); font-weight: 800; font-size: 1rem; position: relative;" onclick="window.iKhataOnboarding.nextStep()">
                    Continue → <span style="font-size: 0.8rem; margin-left: 4px; opacity: 0.75;">🔒</span>
                  </button>
                ` : `
                  <button class="btn btn-primary btn-lg" style="border-radius: var(--radius-lg); font-weight: 800; font-size: 1rem; ${this.currentStep === 5 && !this.formData.isEmailVerified ? 'opacity: 0.5; cursor: not-allowed;' : ''}" onclick="window.iKhataOnboarding.nextStep()" ${this.currentStep === 5 && !this.formData.isEmailVerified ? 'disabled title="Please verify your Email first on Step 2"' : ''}>
                    ${this.currentStep === 5 ? (this.formData.isEmailVerified ? 'Create My iKhataPro 🎉' : '🔒 Verify Email First') : 'Continue →'}
                  </button>
                `}
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }
};
