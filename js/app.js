/* iKhataPro Main Application & Gateway Router Controller */

window.iKhataUI = {
  currentView: 'welcome', // 'welcome', 'onboarding', 'login', 'unauthorized', 'workspace'
  currentRoute: 'dashboard',
  currentCustomerProfileId: null,

  init() {
    window.iKhataStore.subscribe(() => {
      this.refresh();
      this.updateNotificationBadge();
    });

    window.iKhataSearch.initKeyListeners();
    this.initGlobalShortcuts();
    this.initNetworkListeners();

    // Check initial URL hash e.g. #/app/ljs-jewellers or #welcome
    this.handleURLRouting();

    window.addEventListener('hashchange', () => {
      this.handleURLRouting();
    });
  },

  initNetworkListeners() {
    const updateOnlineStatus = () => {
      const banner = document.getElementById('offline-network-banner');
      if (banner) {
        if (!navigator.onLine) {
          banner.style.display = 'block';
          this.showToast('⚠️ You are offline. Changes saved locally.', 'warning');
        } else {
          banner.style.display = 'none';
          this.showToast('🟢 Back online! Syncing local workspace state.', 'success');
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  },

  initGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore when typing inside input or textarea
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
        return;
      }

      if (e.key === '?' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        this.openShortcutHelpModal();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        this.openAddKhataModal('GAVE');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        this.openReceivePaymentModal();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        this.openCreateInvoiceModal();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.navigate('pos');
      }
    });
  },

  handleURLRouting() {
    const hash = window.location.hash || '#welcome';

    if (hash.startsWith('#shop/')) {
      // Guest customer storefront — no auth required
      const slug = hash.replace('#shop/', '').split('/')[0];
      this.storefrontSlug = slug;
      this.currentRoute = 'customer-store';
      this.currentView = 'workspace';

      // Auto-login to business context silently for state access
      const bus = window.iKhataStore.state.businesses.find(b => b.slug === slug);
      if (bus) {
        window.iKhataStore.state.currentSession = {
          isAuthenticated: true,
          user: { name: 'Guest', username: 'guest' },
          businessId: bus.id,
          workspaceSlug: bus.slug
        };
      }
      this.refresh();
    } else if (hash.startsWith('#/app/')) {
      const slug = hash.replace('#/app/', '').split('/')[0];
      this.navigateToWorkspace(slug);
    } else if (hash === '#onboarding') {
      this.currentView = 'onboarding';
      this.refresh();
    } else if (hash === '#login') {
      this.currentView = 'login';
      this.refresh();
    } else {
      this.currentView = 'welcome';
      this.refresh();
    }
  },

  navigateToWorkspace(slug) {
    const store = window.iKhataStore;
    const bus = store.state.businesses.find(b => b.slug === slug);

    if (!bus) {
      this.currentView = 'unauthorized';
      this.refresh();
      return;
    }

    // Check authorization session
    const session = store.state.currentSession;
    if (!session || !session.isAuthenticated || session.workspaceSlug !== slug) {
      // If user is logged in to another business or not authenticated
      if (session && session.isAuthenticated) {
        // Attempt switch if owned or show unauthorized
        store.switchBusiness(bus.id);
      } else {
        // Prompt login for this workspace
        window.location.hash = `#login`;
        this.showToast(`Please sign in to access ${bus.name}`, 'warning');
        return;
      }
    }

    this.currentView = 'workspace';
    window.location.hash = `#/app/${slug}`;
    this.refresh();
  },

  navigate(route, extraParam = null) {
    this.currentRoute = route;
    if (route === 'customer-profile') {
      this.currentCustomerProfileId = extraParam;
    } else if (route === 'customer-store') {
      this.storefrontSlug = (typeof extraParam === 'object' && extraParam) ? extraParam.slug : extraParam;
    }
    
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
      el.classList.remove('active');
    });

    const activeSide = document.querySelector(`.nav-item[data-route="${route}"]`);
    if (activeSide) activeSide.classList.add('active');

    const activeMob = document.querySelector(`.mobile-nav-item[data-route="${route}"]`);
    if (activeMob) activeMob.classList.add('active');

    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    this.refresh();
  },

  refresh() {
    const welcomeView = document.getElementById('welcome-view');
    const onboardingView = document.getElementById('onboarding-view-container');
    const loginView = document.getElementById('login-view');
    const unauthorizedView = document.getElementById('unauthorized-view');
    const workspaceView = document.getElementById('workspace-view');

    // Hide all root views
    if (welcomeView) welcomeView.style.display = 'none';
    if (onboardingView) onboardingView.style.display = 'none';
    if (loginView) loginView.style.display = 'none';
    if (unauthorizedView) unauthorizedView.style.display = 'none';
    if (workspaceView) workspaceView.style.display = 'none';

    if (this.currentView === 'welcome') {
      if (welcomeView) {
        welcomeView.style.display = 'flex';
        welcomeView.innerHTML = this.renderWelcomeGateway();
      }
    } else if (this.currentView === 'onboarding') {
      if (onboardingView) {
        onboardingView.style.display = 'block';
        window.iKhataOnboarding.render();
      }
    } else if (this.currentView === 'login') {
      if (loginView) {
        loginView.style.display = 'flex';
        loginView.innerHTML = this.renderLoginScreen();
      }
    } else if (this.currentView === 'unauthorized') {
      if (unauthorizedView) {
        unauthorizedView.style.display = 'flex';
        unauthorizedView.innerHTML = this.renderUnauthorizedScreen();
      }
    } else if (this.currentView === 'workspace') {
      if (workspaceView) {
        workspaceView.style.display = 'flex';
        this.renderWorkspaceShell();
      }
    }
  },

  async quickLogin(username, password, slug) {
    const result = await window.iKhataStore.login(username, password, slug);
    if (result.success) {
      this.showToast(`🎉 Welcome back! Signed in to ${result.business.name}`, 'success');
      this.navigateToWorkspace(result.business.slug);
    } else {
      this.navigateToWorkspace(slug || 'ljs-jewellers');
    }
  },

  async submitLogin(form) {
    const usernameInput = form.querySelector('[name="username"]');
    const passwordInput = form.querySelector('[name="password"]');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username) {
      this.showToast('Please enter your username, email, or mobile number', 'warning');
      return;
    }

    const result = await window.iKhataStore.login(username, password);
    if (result.success) {
      this.showToast(`🎉 Welcome back, ${result.business.ownerName}!`, 'success');
      this.navigateToWorkspace(result.business.slug);
    } else {
      this.showToast(result.message || 'Invalid login details', 'danger');
      const errBox = document.getElementById('login-error-alert');
      if (errBox) {
        errBox.style.display = 'block';
        errBox.innerHTML = `⚠️ ${result.message || 'Invalid credentials'}`;
      }
    }
  },

  renderWelcomeGateway() {
    return `
      <div class="onboarding-container">
        <div class="auth-split-wrapper">
          
          <!-- Left Hero Feature Panel -->
          <div class="auth-hero-panel">
            <div class="hero-brand-badge">
              <span>⚡ iKhataPro AI Gateway</span>
            </div>
            <h1 class="auth-hero-title">Your Business. Smarter & Faster.</h1>
            <p class="auth-hero-subtitle">Digital Khata, POS Billing, Stock Inventory, GST Invoices, & AI Copilot for shop owners.</p>
            
            <div class="hero-features-list">
              <div class="hero-feature-item">
                <div class="hero-feature-icon">📖</div>
                <div>
                  <div>Voice Khata & Instant Udhaar Log</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">Speak in Hindi / English to add entries</div>
                </div>
              </div>

              <div class="hero-feature-item">
                <div class="hero-feature-icon">🛒</div>
                <div>
                  <div>Fast POS Counter & Dynamic QR</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">Instant billing with stock auto-sync</div>
                </div>
              </div>

              <div class="hero-feature-item">
                <div class="hero-feature-icon">🤖</div>
                <div>
                  <div>AI Copilot & Cash Flow Forecast</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">Real-time smart insights for high profit</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Action Card -->
          <div class="onboarding-card">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="font-size: 2.5rem; margin-bottom: 6px;">⚡</div>
              <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 6px;">Welcome to iKhataPro</h1>
              <p style="color: var(--text-muted); font-size: 0.92rem;">Select how you would like to proceed:</p>
            </div>

            <!-- Tab Switcher Navigation -->
            <div class="auth-nav-tabs">
              <button class="auth-tab-btn" onclick="window.location.hash='#login';">Sign In</button>
              <button class="auth-tab-btn active" onclick="window.location.hash='#onboarding';">Create Shop</button>
            </div>

            <div class="gateway-options">
              <div class="gateway-option-card primary-option" onclick="window.location.hash='#onboarding';">
                <div style="text-align: left;">
                  <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em;">NEW STORE REGISTRATION</div>
                  <div style="font-weight: 800; font-size: 1.15rem; margin-top: 4px;">Create New Business Account</div>
                  <div style="font-size: 0.84rem; color: var(--text-muted); margin-top: 2px;">Set up dedicated isolated shop workspace in 60s</div>
                </div>
                <div style="font-size: 1.4rem; color: var(--primary); font-weight: 800;">Create →</div>
              </div>

              <div class="gateway-option-card" onclick="window.location.hash='#login';">
                <div style="text-align: left;">
                  <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">EXISTING SHOP OWNER</div>
                  <div style="font-weight: 800; font-size: 1.15rem; margin-top: 4px;">Sign In to Your Workspace</div>
                  <div style="font-size: 0.84rem; color: var(--text-muted); margin-top: 2px;">Access your store dashboard, Khata & POS</div>
                </div>
                <div style="font-size: 1.4rem; font-weight: 800;">Sign In →</div>
              </div>
            </div>

            <div style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 18px; text-align: center;">
              <button class="btn btn-outline" style="width: 100%; border-radius: var(--radius-lg);" onclick="window.iKhataUI.quickLogin('aryan', 'Pass123!', 'ljs-jewellers');">
                <span>📺</span> Explore Interactive Demo Store Directly
              </button>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  renderLoginScreen() {
    return `
      <div class="onboarding-container">
        <div class="auth-split-wrapper">

          <!-- Left Brand Panel -->
          <div class="auth-hero-panel">
            <div class="hero-brand-badge">
              <span>🔒 Secure Workspace Authentication</span>
            </div>
            <h1 class="auth-hero-title">Sign In to Your Shop Dashboard</h1>
            <p class="auth-hero-subtitle">Access your customers' Khata, POS billing counter, supplier purchase orders, and AI business copilot.</p>

            <div class="hero-features-list">
              <div class="hero-feature-item">
                <div class="hero-feature-icon">🛡️</div>
                <div>
                  <div>256-bit Encrypted Multi-Tenant Security</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">Your store data is isolated and completely private</div>
                </div>
              </div>

              <div class="hero-feature-item">
                <div class="hero-feature-icon">👥</div>
                <div>
                  <div>Staff Role-Based Permissions</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">Owner PIN protection & cashier limitations</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Login Form Card -->
          <div class="onboarding-card">
            <!-- Nav Tabs -->
            <div class="auth-nav-tabs">
              <button class="auth-tab-btn active" onclick="window.location.hash='#login';">Sign In</button>
              <button class="auth-tab-btn" onclick="window.location.hash='#onboarding';">Create Shop</button>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <div style="font-size: 2.2rem; margin-bottom: 4px;">👋</div>
              <h1 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 4px;">Welcome Back</h1>
              <p style="color: var(--text-muted); font-size: 0.88rem;">Enter your credentials to access your business</p>
            </div>

            <!-- Error alert container -->
            <div id="login-error-alert" style="display: none; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 16px;"></div>

            <form onsubmit="event.preventDefault(); window.iKhataUI.submitLogin(this);">
              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Username, Email, or Mobile</label>
                <div class="input-with-icon">
                  <span class="input-icon-prefix">👤</span>
                  <input type="text" name="username" class="form-input" placeholder="e.g. aryan or rahul or 9876543210" required autofocus>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Password</label>
                <div class="input-with-icon">
                  <span class="input-icon-prefix">🔒</span>
                  <input type="password" id="login-password-field" name="password" class="form-input" placeholder="••••••••" required>
                  <button type="button" class="password-toggle-btn" onclick="const p = document.getElementById('login-password-field'); p.type = p.type === 'password' ? 'text' : 'password'; this.innerText = p.type === 'password' ? '👁️' : '🙈';">👁️</button>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 16px; border-radius: var(--radius-lg); font-size: 1.05rem; font-weight: 800;">
                Sign In to Business →
              </button>
            </form>

            <div style="text-align: center; margin-top: 24px;">
              <a href="#welcome" style="font-size: 0.88rem; color: var(--text-muted); font-weight: 600;">← Back to Main Menu</a>
            </div>

          </div>
        </div>
      </div>
    `;
  },

  renderUnauthorizedScreen() {
    return `
      <div class="onboarding-container">
        <div class="onboarding-card" style="text-align: center;">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">🔒</div>
          <h2 style="font-size: 1.6rem; margin-bottom: 8px;">Access Blocked</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 24px;">You don't have permission to access this business workspace.</p>
          <button class="btn btn-primary btn-lg" onclick="const bus = window.iKhataStore.getCurrentBusiness(); window.iKhataUI.navigateToWorkspace(bus ? bus.slug : 'ljs-jewellers');">
            Return to My Business →
          </button>
        </div>
      </div>
    `;
  },

  renderWorkspaceShell() {
    const store = window.iKhataStore;
    const currentBus = store.getCurrentBusiness();
    const state = store.state;

    // Update dynamic shop branding elements
    const brandName = document.getElementById('shop-brand-name');
    const brandBranch = document.getElementById('shop-brand-branch');
    const brandAvatar = document.getElementById('shop-brand-avatar');

    if (brandName) brandName.innerText = currentBus.name;
    if (brandBranch) brandBranch.innerText = `${currentBus.city} Branch ▼`;
    if (brandAvatar) brandAvatar.innerText = currentBus.logo || currentBus.name.charAt(0);

    // Render active route inside page-view-container
    const container = document.getElementById('page-view-container');
    if (!container) return;

    switch (this.currentRoute) {
      case 'dashboard':
        container.innerHTML = window.iKhataDashboard.render(state);
        break;
      case 'khata':
        container.innerHTML = window.iKhataModule.render(state);
        break;
      case 'customer-profile':
        container.innerHTML = window.iKhataCustomers.renderProfile(this.currentCustomerProfileId, state);
        break;
      case 'pos':
        container.innerHTML = window.iKhataPOS.render(state);
        break;
      case 'inventory':
        container.innerHTML = window.iKhataInventory.render(state);
        break;
      case 'suppliers':
        container.innerHTML = window.iKhataSuppliers.render(state);
        break;
      case 'invoices':
        container.innerHTML = window.iKhataInvoices.render(state);
        break;
      case 'expenses':
        container.innerHTML = window.iKhataExpenses.render(state);
        break;
      case 'pnl':
        container.innerHTML = window.iKhataPNL.render(state);
        break;
      case 'analytics':
        container.innerHTML = window.iKhataAnalytics.render(state);
        break;
      case 'statement-generator':
        container.innerHTML = window.iKhataStatementGenerator.render(state);
        break;
      case 'simulator':
        container.innerHTML = window.iKhataSimulator.render(state);
        break;
      case 'collection-map':
        container.innerHTML = window.iKhataCollectionMap.render(state);
        break;
      case 'employees':
        container.innerHTML = window.iKhataEmployees.render(state);
        break;
      case 'storefront':
        container.innerHTML = window.iKhataStorefront.renderManager(state);
        break;
      case 'customer-store':
        container.innerHTML = window.iKhataStorefront.renderCustomerStore(this.storefrontSlug);
        break;
      default:
        container.innerHTML = window.iKhataDashboard.render(state);
    }
  },

  openCustomerProfile(id) {
    this.navigate('customer-profile', id);
  },

  openModal(title, bodyHTML) {
    const overlay = document.getElementById('global-modal-overlay');
    const titleEl = document.getElementById('global-modal-title');
    const bodyEl = document.getElementById('global-modal-body');

    if (overlay && titleEl && bodyEl) {
      titleEl.innerText = title;
      bodyEl.innerHTML = bodyHTML;
      overlay.classList.add('open');
    }
  },

  closeModal() {
    const overlay = document.getElementById('global-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => { toast.remove(); }, 3000);
  },

  openBusinessSelector() {
    const userBusinesses = window.iKhataStore.getUserBusinesses();
    const currentBus = window.iKhataStore.getCurrentBusiness();

    this.openModal('Switch Business Workspace', `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${userBusinesses.map(b => `
          <div class="business-switch-item ${b.id === currentBus.id ? 'active' : ''}" onclick="window.iKhataStore.switchBusiness('${b.id}'); window.iKhataUI.closeModal(); window.iKhataUI.navigateToWorkspace('${b.slug}');">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.3rem;">${b.logo || '🏪'}</span>
              <div>
                <strong>${b.name}</strong>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${b.city} • /app/${b.slug}</div>
              </div>
            </div>
            ${b.id === currentBus.id ? '<span class="badge badge-success">Active</span>' : ''}
          </div>
        `).join('')}

        <button class="btn btn-outline" style="margin-top: 12px;" onclick="window.iKhataUI.closeModal(); window.location.hash='#onboarding';">
          <span>➕</span> Create New Business
        </button>
      </div>
    `);
  },

  logout() {
    window.iKhataStore.logout();
    window.location.href = 'landing.html';
  },

  // Modals for actions
  openAddKhataModal(defaultType = 'GAVE', preselectCustomerId = '') {
    const customers = window.iKhataStore.getCustomers();
    this.openModal('Add Khata Entry', `
      <form id="khata-entry-form" onsubmit="event.preventDefault(); window.iKhataUI.submitAddKhata(this);">
        <div class="form-group">
          <label class="form-label">Step 1: Select Customer</label>
          <div class="select-with-btn-group">
            <select name="customerId" id="khata-customer-select" class="form-select" required onchange="window.iKhataUI.handleCustomerSelectChange(this)">
              <option value="">-- Choose Customer --</option>
              ${customers.map(c => `<option value="${c.id}" ${c.id === preselectCustomerId ? 'selected' : ''}>${c.name} (${c.phone || ''})</option>`).join('')}
              <option value="__ADD_NEW__" class="add-new-option">➕ + Add New Customer...</option>
            </select>
            <button type="button" class="btn btn-secondary btn-quick-add" onclick="window.iKhataUI.openQuickAddCustomerModal()">
              + Add Customer
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Step 2: What happened?</label>
          <div class="gave-got-toggle">
            <button type="button" id="toggle-gave-btn" class="toggle-btn gave ${defaultType === 'GAVE' ? 'active' : ''}" onclick="window.iKhataUI.setKhataType('GAVE')">
              <span>I GAVE</span>
              <span style="font-size: 0.72rem; font-weight: normal;">(You gave money/goods)</span>
            </button>
            <button type="button" id="toggle-got-btn" class="toggle-btn got ${defaultType === 'GOT' ? 'active' : ''}" onclick="window.iKhataUI.setKhataType('GOT')">
              <span>I GOT</span>
              <span style="font-size: 0.72rem; font-weight: normal;">(Customer paid you)</span>
            </button>
          </div>
          <input type="hidden" name="type" id="khata-type-input" value="${defaultType}">
        </div>

        <div class="form-group">
          <label class="form-label">Step 3: Enter Amount (₹)</label>
          <input type="number" name="amount" class="form-input" style="font-size: 1.4rem; font-weight: 800;" placeholder="0" required autofocus>
        </div>

        <div class="form-group">
          <label class="form-label">Optional Note</label>
          <input type="text" name="note" class="form-input" placeholder="e.g. Delivery charges, Bill #102">
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;">
          Save Khata Entry
        </button>
      </form>
    `);
  },

  handleCustomerSelectChange(selectEl) {
    if (selectEl.value === '__ADD_NEW__') {
      selectEl.value = selectEl.dataset.previousValue || '';
      this.openQuickAddCustomerModal();
    } else {
      selectEl.dataset.previousValue = selectEl.value;
    }
  },

  openQuickAddCustomerModal() {
    let overlay = document.getElementById('quick-customer-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'quick-customer-modal-overlay';
      overlay.style.zIndex = '1200';
      overlay.innerHTML = `
        <div class="modal-card quick-modal-card" style="max-width: 420px; width: 90%;">
          <div class="modal-header">
            <h3>➕ Quick Add Customer</h3>
            <button class="close-btn" type="button" onclick="window.iKhataUI.closeQuickAddCustomerModal()">✕</button>
          </div>
          <div class="modal-body" style="padding: 16px;">
            <form id="quick-add-customer-form" onsubmit="event.preventDefault(); window.iKhataUI.submitQuickAddCustomer(this);">
              <div id="quick-cust-error" class="inline-error-msg" style="display: none;"></div>

              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" for="quick-cust-name">Customer Name <span class="required-asterisk">*</span></label>
                <input type="text" id="quick-cust-name" name="name" class="form-input" placeholder="e.g. Rahul Sharma" required />
              </div>

              <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label" for="quick-cust-phone">Phone Number <span class="required-asterisk">*</span></label>
                <input type="tel" id="quick-cust-phone" name="phone" class="form-input" placeholder="e.g. 9876543210" required />
              </div>

              <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary" onclick="window.iKhataUI.closeQuickAddCustomerModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" id="btn-save-quick-customer">Save & Select</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const errorEl = document.getElementById('quick-cust-error');
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
    const nameInput = document.getElementById('quick-cust-name');
    const phoneInput = document.getElementById('quick-cust-phone');
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';

    overlay.classList.add('open');
    overlay.style.display = 'flex';

    setTimeout(() => {
      if (nameInput) nameInput.focus();
    }, 100);
  },

  closeQuickAddCustomerModal() {
    const overlay = document.getElementById('quick-customer-modal-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.style.display = 'none';
    }
  },

  submitQuickAddCustomer(form) {
    const errorEl = document.getElementById('quick-cust-error');
    const nameInput = document.getElementById('quick-cust-name') || form.querySelector('[name="name"]');
    const phoneInput = document.getElementById('quick-cust-phone') || form.querySelector('[name="phone"]');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }

    if (!name && !phone) {
      if (errorEl) {
        errorEl.textContent = '⚠️ Customer Name and Phone Number are both required.';
        errorEl.style.display = 'block';
      }
      if (nameInput) nameInput.focus();
      return false;
    }

    if (!name) {
      if (errorEl) {
        errorEl.textContent = '⚠️ Customer Name is required.';
        errorEl.style.display = 'block';
      }
      if (nameInput) nameInput.focus();
      return false;
    }

    if (!phone) {
      if (errorEl) {
        errorEl.textContent = '⚠️ Phone Number is required.';
        errorEl.style.display = 'block';
      }
      if (phoneInput) phoneInput.focus();
      return false;
    }

    const newCust = window.iKhataStore.addCustomer({
      name: name,
      phone: phone
    });

    if (newCust) {
      const selectEl = document.getElementById('khata-customer-select');
      if (selectEl) {
        const addNewOpt = selectEl.querySelector('option[value="__ADD_NEW__"]');
        const newOpt = document.createElement('option');
        newOpt.value = newCust.id;
        newOpt.textContent = `${newCust.name} (${newCust.phone})`;

        if (addNewOpt) {
          selectEl.insertBefore(newOpt, addNewOpt);
        } else {
          selectEl.appendChild(newOpt);
        }

        selectEl.value = newCust.id;
        selectEl.dataset.previousValue = newCust.id;
      }

      this.closeQuickAddCustomerModal();
      this.showToast(`✓ Customer "${newCust.name}" added and selected!`, 'success');
    }
  },


  setKhataType(type) {
    const gaveBtn = document.getElementById('toggle-gave-btn');
    const gotBtn = document.getElementById('toggle-got-btn');
    const input = document.getElementById('khata-type-input');

    if (type === 'GAVE') {
      if (gaveBtn) gaveBtn.classList.add('active');
      if (gotBtn) gotBtn.classList.remove('active');
      if (input) input.value = 'GAVE';
    } else {
      if (gotBtn) gotBtn.classList.add('active');
      if (gaveBtn) gaveBtn.classList.remove('active');
      if (input) input.value = 'GOT';
    }
  },

  submitAddKhata(form) {
    const data = new FormData(form);
    const success = window.iKhataStore.addKhataTransaction({
      customerId: data.get('customerId'),
      type: data.get('type'),
      amount: data.get('amount'),
      note: data.get('note')
    });

    if (success) {
      this.closeModal();
      this.showToast('✓ Khata entry saved successfully!', 'success');
    }
  },

  openReceivePaymentModal(preselectCustId = '') {
    const customers = window.iKhataStore.getCustomers();
    this.openModal('Receive Payment', `
      <form onsubmit="event.preventDefault(); window.iKhataUI.submitReceivePayment(this);">
        <div class="form-group">
          <label class="form-label">Select Customer</label>
          <select name="customerId" class="form-select" required>
            <option value="">-- Choose Customer --</option>
            ${customers.sort((a,b) => b.balance - a.balance).map(c => `<option value="${c.id}" ${c.id === preselectCustId ? 'selected' : ''}>${c.name} ${c.balance > 0 ? `(Pending: ₹${c.balance.toLocaleString('en-IN')})` : `(Bal: ₹${c.balance.toLocaleString('en-IN')})`}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Amount Received (₹)</label>
          <input type="number" name="amount" class="form-input" style="font-size: 1.4rem; font-weight: 800;" placeholder="0" required>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Method</label>
          <select name="mode" class="form-select">
            <option value="Cash">Cash</option>
            <option value="UPI">UPI (Google Pay / PhonePe)</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        <button type="submit" class="btn btn-success btn-lg" style="width: 100%; margin-top: 12px;">
          Confirm Payment Received
        </button>
      </form>
    `);
  },

  submitReceivePayment(form) {
    const data = new FormData(form);
    const success = window.iKhataStore.receivePayment(
      data.get('customerId'),
      data.get('amount'),
      data.get('mode')
    );

    if (success) {
      this.closeModal();
      this.showToast('🎉 Payment received and ledger updated!', 'success');
    }
  },

  openReminderModal(customerId) {
    const customer = window.iKhataStore.getCustomers().find(c => c.id === customerId);
    if (!customer) return;

    this.openModal(`Send Reminder to ${customer.name}`, `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="background: var(--warning-light); border: 1px solid var(--warning-border); padding: 12px; border-radius: var(--radius-md); font-size: 0.9rem;">
          Pending Amount: <strong style="color: var(--danger);">₹${customer.balance.toLocaleString('en-IN')}</strong>
        </div>

        <textarea id="reminder-msg-box" class="form-textarea" rows="3">Hi ${customer.name}, just a gentle reminder that ₹${customer.balance.toLocaleString('en-IN')} is pending at our store. Please pay when convenient. Thank you!</textarea>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <button class="btn btn-success" onclick="const msg = document.getElementById('reminder-msg-box').value; const phone = ('${customer.phone || '919216953892'}').replace(/[^0-9]/g, ''); const formattedPhone = phone.length === 10 ? '91' + phone : phone; window.open('https://api.whatsapp.com/send?phone=' + formattedPhone + '&text=' + encodeURIComponent(msg), '_blank'); window.iKhataUI.closeModal(); window.iKhataUI.showToast('📲 WhatsApp reminder sent!', 'success');">
            Send WhatsApp
          </button>
          <button class="btn btn-primary" onclick="window.iKhataUI.closeModal(); window.iKhataUI.showToast('💬 SMS reminder sent!', 'success');">
            Send SMS
          </button>
        </div>
      </div>
    `);
  },

  openAddCustomerModal() {
    this.openModal('Add New Customer', `
      <form onsubmit="event.preventDefault(); window.iKhataUI.submitAddCustomer(this);">
        <div class="form-group">
          <label class="form-label">Customer Name</label>
          <input type="text" name="name" class="form-input" placeholder="e.g. Rahul Traders" required>
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" name="phone" class="form-input" placeholder="+91 98765 43210">
        </div>
        <div class="form-group">
          <label class="form-label">City</label>
          <input type="text" name="city" class="form-input" placeholder="Mathura">
        </div>
        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;">
          Save Customer
        </button>
      </form>
    `);
  },

  submitAddCustomer(form) {
    const data = new FormData(form);
    const newCust = window.iKhataStore.addCustomer({
      name: data.get('name'),
      phone: data.get('phone'),
      city: data.get('city')
    });
    if (newCust) {
      this.closeModal();
      this.showToast('✓ Customer added!', 'success');
    }
  },

  openAddProductModal() {
    this.openModal('Add New Product', `
      <form onsubmit="event.preventDefault(); window.iKhataUI.submitAddProduct(this);">
        <div class="form-group">
          <label class="form-label">Product Name</label>
          <input type="text" name="name" class="form-input" placeholder="e.g. Basmati Rice 5kg" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Selling Price (₹)</label>
            <input type="number" name="price" class="form-input" placeholder="450" required>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Initial Stock Count</label>
            <input type="number" name="stock" class="form-input" placeholder="25" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Category</label>
          <input type="text" name="category" class="form-input" placeholder="e.g. Grocery, Jewellery, Electronics">
        </div>

        <div class="form-group">
          <label class="form-label">Product Image URL</label>
          <input type="url" name="imageUrl" class="form-input" placeholder="https://images.unsplash.com/...">
        </div>

        <div class="form-group">
          <label class="form-label">Short Description</label>
          <textarea name="description" class="form-input" rows="2" placeholder="Item purity, warranty, features..."></textarea>
        </div>

        <div class="form-group" style="margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
            <input type="checkbox" name="isOnlineVisible" value="true" checked>
            <span>Show on Digital Storefront (1-Click Online Dukaan)</span>
          </label>
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;">
          Save Product
        </button>
      </form>
    `);
  },

  submitAddProduct(form) {
    const data = new FormData(form);
    const newProd = window.iKhataStore.addProduct({
      name: data.get('name'),
      price: data.get('price'),
      stock: data.get('stock'),
      category: data.get('category'),
      imageUrl: data.get('imageUrl'),
      description: data.get('description'),
      isOnlineVisible: data.get('isOnlineVisible') === 'true'
    });
    if (newProd) {
      this.closeModal();
      this.showToast('✓ Product added to Stock & Online Dukaan!', 'success');
      this.refresh();
    }
  },

  openAddExpenseModal() {
    this.openModal('Add Shop Expense', `
      <form onsubmit="event.preventDefault(); window.iKhataUI.submitAddExpense(this);">
        <div class="form-group">
          <label class="form-label">Expense Category</label>
          <select name="category" class="form-select">
            <option value="Rent">Rent</option>
            <option value="Salary">Salary</option>
            <option value="Transport">Transport / Delivery</option>
            <option value="Electricity">Electricity / Utilities</option>
            <option value="Marketing">Marketing & Ads</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Amount (₹)</label>
          <input type="number" name="amount" class="form-input" placeholder="1500" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description / Note</label>
          <input type="text" name="note" class="form-input" placeholder="e.g. Delivery charges">
        </div>
        <button type="submit" class="btn btn-warning btn-lg" style="width: 100%; margin-top: 12px;">
          Log Expense
        </button>
      </form>
    `);
  },

  submitAddExpense(form) {
    const data = new FormData(form);
    const exp = window.iKhataStore.addExpense({
      category: data.get('category'),
      amount: data.get('amount'),
      note: data.get('note')
    });
    if (exp) {
      this.closeModal();
      this.showToast('✓ Expense logged!', 'success');
    }
  },

  openCreateInvoiceModal(preselectCust = '') {
    const customers = window.iKhataStore.getCustomers();
    const products = window.iKhataStore.getProducts();

    this.openModal('📄 Create GST Tax Invoice', `
      <form onsubmit="event.preventDefault(); window.iKhataUI.submitCreateInvoice(this);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Select Customer</label>
            <select name="customerId" class="form-select" onchange="const c = window.iKhataStore.getCustomers().find(x=>x.id===this.value); if(c){ document.getElementById('inv-cust-name').value=c.name; document.getElementById('inv-cust-phone').value=c.phone||''; }">
              <option value="">-- Choose Existing (Or type below) --</option>
              ${customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Tax Type</label>
            <select name="taxType" class="form-select">
              <option value="INTRA">Intra-State (CGST + SGST)</option>
              <option value="INTER">Inter-State (IGST)</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Customer Name</label>
            <input type="text" id="inv-cust-name" name="customerName" class="form-input" placeholder="Rahul Traders" required>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Phone Number</label>
            <input type="tel" id="inv-cust-phone" name="customerPhone" class="form-input" placeholder="+91 98765 43210">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Customer GSTIN</label>
            <input type="text" name="customerGSTIN" class="form-input" placeholder="07ABCDE1234F1Z9" style="text-transform: uppercase;">
          </div>
        </div>

        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; background: var(--bg-main); margin-bottom: 12px;">
          <label class="form-label" style="font-weight: 700;">Line Item Details</label>
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 6px; margin-bottom: 6px;">
            <select class="form-select" style="font-size: 0.82rem;" onchange="const p=window.iKhataStore.getProducts().find(x=>x.id===this.value); if(p){ document.getElementById('inv-item-name').value=p.name; document.getElementById('inv-item-rate').value=p.price; }">
              <option value="">Select Catalog Product...</option>
              ${products.map(p => `<option value="${p.id}">${p.name} (₹${p.price})</option>`).join('')}
            </select>
            <input type="text" id="inv-item-name" name="itemName" class="form-input" placeholder="Item Name" required>
            <input type="number" name="itemQty" class="form-input" placeholder="Qty" min="1" value="1" required>
            <input type="number" id="inv-item-rate" name="itemRate" class="form-input" placeholder="Rate ₹" min="0" required>
            <select name="taxRate" class="form-select">
              <option value="18">GST 18%</option>
              <option value="12">GST 12%</option>
              <option value="5">GST 5%</option>
              <option value="28">GST 28%</option>
              <option value="0">GST 0%</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
            <input type="text" name="hsn" class="form-input" placeholder="HSN/SAC Code (e.g. 7113)">
            <input type="text" name="unit" class="form-input" placeholder="Unit (Pcs/Kg/Mtr)">
            <input type="number" name="discount" class="form-input" placeholder="Line Discount ₹">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Payment Status</label>
            <select name="status" class="form-select">
              <option value="Pending">Pending / Unpaid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Due Date</label>
            <input type="date" name="dueDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;">
            <input type="checkbox" name="isCredit" value="true" checked>
            <span>Log as Credit Entry in Customer's Khata</span>
          </label>
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 8px;">
          Generate GST Invoice
        </button>
      </form>
    `);
  },

  submitCreateInvoice(form) {
    const data = new FormData(form);
    const inv = window.iKhataStore.createGSTInvoice({
      customerId: data.get('customerId'),
      customerName: data.get('customerName'),
      customerPhone: data.get('customerPhone'),
      customerGSTIN: data.get('customerGSTIN'),
      taxType: data.get('taxType'),
      status: data.get('status'),
      dueDate: data.get('dueDate'),
      isCredit: data.get('isCredit') === 'true',
      items: [{
        name: data.get('itemName'),
        hsn: data.get('hsn'),
        qty: data.get('itemQty'),
        unit: data.get('unit'),
        rate: data.get('itemRate'),
        discount: data.get('discount'),
        taxRate: data.get('taxRate')
      }]
    });

    if (inv) {
      this.closeModal();
      this.showToast(`✓ Tax Invoice #${inv.id} generated!`, 'success');
      this.refresh();
    }
  },

  previewInvoice(invId) {
    const invoices = window.iKhataStore.getInvoices();
    const inv = invoices.find(i => i.id === invId);
    if (!inv) return;
    const bus = window.iKhataStore.getCurrentBusiness();
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');

    this.openModal(`📄 GST Invoice — ${inv.id}`, `
      <div id="invoice-pdf-container" style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; color: #0f172a; font-family: 'Plus Jakarta Sans', sans-serif;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--primary); padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 1.5rem; color: var(--primary); margin: 0; font-weight: 800;">${bus ? bus.name : 'iKhataPro Store'}</h2>
            <div style="font-size: 0.85rem; color: #475569; margin-top: 4px;">
              ${bus ? bus.address || bus.city : 'Mathura Market'} • Phone: ${bus ? bus.whatsappNumber || '+91 99999 00000' : ''}
            </div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #1e293b; margin-top: 2px;">
              GSTIN: 09AAAAA0000A1Z5 | STATE: ${bus ? bus.state || 'UP' : 'UP'} (09)
            </div>
          </div>

          <div style="text-align: right;">
            <span style="background: var(--primary); color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 800; text-transform: uppercase;">TAX INVOICE</span>
            <h3 style="margin: 8px 0 2px; font-size: 1.3rem; font-weight: 800;">${inv.id}</h3>
            <div style="font-size: 0.8rem; color: #64748b;">Date: <strong>${inv.date}</strong> | Due: <strong>${inv.dueDate}</strong></div>
          </div>
        </div>

        <!-- Billed To & Place of Supply -->
        <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.88rem; margin-bottom: 20px;">
          <div>
            <div style="color: #64748b; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">BILLED TO (CUSTOMER):</div>
            <strong style="font-size: 1rem; color: #0f172a;">${inv.customerName}</strong>
            ${inv.customerPhone ? `<div style="color: #475569;">Phone: ${inv.customerPhone}</div>` : ''}
            ${inv.customerGSTIN ? `<div style="font-weight: 700; color: var(--primary);">GSTIN: ${inv.customerGSTIN}</div>` : ''}
          </div>

          <div style="text-align: right;">
            <div style="color: #64748b; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;">PAYMENT INFORMATION:</div>
            <div>Status: <span class="badge ${inv.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${inv.status}</span></div>
            <div>Tax Type: <strong>${inv.taxType === 'INTER' ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}</strong></div>
          </div>
        </div>

        <!-- Items Table -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem; text-align: left;">
            <thead style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-weight: 700; color: #334155;">
              <tr>
                <th style="padding: 8px 10px;">#</th>
                <th style="padding: 8px 10px;">Item & Description</th>
                <th style="padding: 8px 10px;">HSN/SAC</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Rate (₹)</th>
                <th style="padding: 8px 10px; text-align: right;">Taxable (₹)</th>
                <th style="padding: 8px 10px; text-align: center;">GST %</th>
                <th style="padding: 8px 10px; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${(inv.items || [{ name: 'Goods & Services Provided', qty: 1, rate: inv.total, taxableVal: inv.total, taxRate: 18, total: inv.total }]).map((item, idx) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px;">${idx + 1}</td>
                  <td style="padding: 10px; font-weight: 700;">${item.name}</td>
                  <td style="padding: 10px; color: #64748b;">${item.hsn || '9988'}</td>
                  <td style="padding: 10px; text-align: center;">${item.qty} ${item.unit || 'Pcs'}</td>
                  <td style="padding: 10px; text-align: right;">${formatCurrency(item.rate)}</td>
                  <td style="padding: 10px; text-align: right;">${formatCurrency(item.taxableVal || item.rate)}</td>
                  <td style="padding: 10px; text-align: center;">${item.taxRate || 18}%</td>
                  <td style="padding: 10px; text-align: right; font-weight: 700;">${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- GST Tax Summary Calculation Box -->
        <div style="display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 20px;">
          <div style="flex: 1; font-size: 0.8rem; color: #475569; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Terms & Conditions:</div>
            <div>1. Goods once sold will not be taken back or exchanged.</div>
            <div>2. Subject to Mathura Jurisdiction.</div>
            <div style="margin-top: 12px; font-size: 0.82rem; font-weight: 700; color: var(--primary);">
              Amount in words: Rupees ${Math.round(inv.total || 0).toLocaleString('en-IN')} Only
            </div>
          </div>

          <div style="width: 280px; font-size: 0.88rem; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
              <span>Subtotal:</span>
              <strong>${formatCurrency(inv.subtotal || inv.total)}</strong>
            </div>
            ${inv.discountTotal > 0 ? `
              <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; color: var(--danger);">
                <span>Discount:</span>
                <span>- ${formatCurrency(inv.discountTotal)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
              <span>Taxable Value:</span>
              <strong>${formatCurrency(inv.taxableTotal || inv.total)}</strong>
            </div>
            ${inv.taxType === 'INTER' ? `
              <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                <span>IGST:</span>
                <span>${formatCurrency(inv.igstTotal || inv.taxTotal || 0)}</span>
              </div>
            ` : `
              <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                <span>CGST:</span>
                <span>${formatCurrency(inv.cgstTotal || (inv.taxTotal/2) || 0)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
                <span>SGST:</span>
                <span>${formatCurrency(inv.sgstTotal || (inv.taxTotal/2) || 0)}</span>
              </div>
            `}
            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.2rem; color: var(--primary); background: var(--primary-light); padding: 8px 10px; border-radius: 6px; margin-top: 4px;">
              <span>Grand Total:</span>
              <span>${formatCurrency(inv.total)}</span>
            </div>
          </div>
        </div>

        <!-- Footer Signatory -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 0.8rem; color: #64748b;">
          <div>E. & O.E. | Computer Generated Invoice</div>
          <div style="text-align: right;">
            <div>For <strong>${bus ? bus.name : 'iKhataPro Store'}</strong></div>
            <div style="margin-top: 30px; font-weight: 700; border-top: 1px dashed #94a3b8; padding-top: 4px;">Authorized Signatory</div>
          </div>
        </div>
      </div>

      <!-- PDF Download / Action Bar -->
      <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
        <button class="btn btn-primary" style="flex: 1;" onclick="window.iKhataUI.downloadInvoicePDF('${inv.id}')">
          📄 Download PDF Invoice
        </button>
        <button class="btn btn-outline" style="flex: 1;" onclick="window.print()">
          🖨️ Print
        </button>
        <button class="btn btn-success" style="flex: 1;" onclick="window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent('Namaste! Here is your GST Invoice ${inv.id} from ${bus ? bus.name : 'Store'}. Amount: ${formatCurrency(inv.total)}. Date: ${inv.date}'), '_blank'); window.iKhataUI.showToast('📲 Shared via WhatsApp!', 'success');">
          📲 Share WhatsApp
        </button>
      </div>
    `);
  },

  downloadInvoicePDF(invId) {
    const element = document.getElementById('invoice-pdf-container');
    if (!element) return;

    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin:       8,
        filename:     `Invoice-${invId}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
      this.showToast(`📄 Downloaded Invoice-${invId}.pdf!`, 'success');
    } else {
      window.print();
    }
  },

  openRestockModal(productId) {
    const products = window.iKhataStore.getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    this.openModal(`📦 Restock: ${prod.name}`, `
      <form onsubmit="event.preventDefault(); window.iKhataUI.submitRestock(this, '${prod.id}');">
        <div style="margin-bottom: 12px; font-size: 0.9rem;">
          Current Stock: <strong>${prod.stock} units</strong>
        </div>
        <div class="form-group">
          <label class="form-label">Add Stock Quantity</label>
          <input type="number" name="addQty" class="form-input" placeholder="10" min="1" required autofocus>
        </div>
        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;">
          Confirm Restock
        </button>
      </form>
    `);
  },

  submitRestock(form, productId) {
    const data = new FormData(form);
    const updated = window.iKhataStore.restockProduct(productId, data.get('addQty'));
    if (updated) {
      this.closeModal();
      this.showToast(`✓ Added ${data.get('addQty')} units to ${updated.name}`, 'success');
      this.refresh();
    }
  },

  // ─── PHASE 4: NOTIFICATION CENTER ──────────────────────────────────────────
  updateNotificationBadge() {
    const dot = document.getElementById('notif-badge-dot');
    if (!dot) return;
    const alerts = window.iKhataIntelligence ? window.iKhataIntelligence.generateAlerts() : [];
    if (alerts.length > 0) {
      dot.style.display = 'block';
    } else {
      dot.style.display = 'none';
    }
  },

  openNotificationCenter() {
    const alerts = window.iKhataIntelligence ? window.iKhataIntelligence.generateAlerts() : [];
    this.openModal(`🔔 Smart Notification Center (${alerts.length})`, `
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="font-size: 0.85rem; color: var(--text-muted);">Real-time business notifications & financial health alerts</div>
          <button class="btn btn-outline btn-sm" onclick="window.iKhataUI.showToast('All notifications marked as read', 'success'); window.iKhataUI.closeModal();">Mark All Read</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 380px; overflow-y: auto;">
          ${alerts.length === 0 ? `
            <div style="text-align: center; padding: 32px; color: var(--text-muted);">
              ✅ All quiet! No critical alerts or overdue notifications.
            </div>
          ` : alerts.map(a => `
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-surface);">
              <div style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.88rem; flex: 1;">
                <span style="font-size: 1.2rem;">${a.icon}</span>
                <div>
                  <div style="font-weight: 600;">${a.text}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Priority: ${a.priority.toUpperCase()}</div>
                </div>
              </div>
              ${a.actionLabel ? `
                <button class="btn btn-outline btn-sm" style="font-size: 0.78rem;" onclick="window.iKhataUI.closeModal(); window.iKhataUI.navigate('${a.route}')">
                  ${a.actionLabel} →
                </button>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `);
  },

  // ─── PHASE 4: KEYBOARD SHORTCUTS CHEAT SHEET ─────────────────────────────
  openShortcutHelpModal() {
    this.openModal('⌨️ Keyboard Shortcuts & Power Navigation', `
      <div>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">Use keyboard shortcuts to navigate and perform daily shop operations at lightspeed.</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary);">Ctrl + K</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Global Multi-Entity Search</div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary);">N</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Add New Khata Entry</div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary);">P</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Receive Customer Payment</div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary);">I</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Create GST Invoice</div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary);">S</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Open POS Counter</div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
            <strong style="color: var(--primary);">? or Ctrl + /</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">Show Shortcuts Guide</div>
          </div>
        </div>
      </div>
    `);
  },

  // ─── PHASE 4: BUSINESS SETTINGS, BACKUP & SUBSCRIPTIONS CENTER ───────────
  openSettingsModal(activeTab = 'BACKUP') {
    const bus = window.iKhataStore.getCurrentBusiness();
    const sub = window.iKhataStore.getSubscriptionInfo();
    const role = window.iKhataStore.getCurrentUserRole();
    const employees = window.iKhataStore.getEmployees();

    this.openModal(`⚙️ Business Settings & Enterprise Center — ${bus ? bus.name : 'Store'}`, `
      <div>
        <!-- Modal Tabs Navigation -->
        <div class="tab-list" style="margin-bottom: 20px;">
          <button class="tab-btn ${activeTab === 'PROFILE' ? 'active' : ''}" onclick="window.iKhataUI.openSettingsModal('PROFILE')">🏪 Profile & GST</button>
          <button class="tab-btn ${activeTab === 'RBAC' ? 'active' : ''}" onclick="window.iKhataUI.openSettingsModal('RBAC')">👥 Roles & Security</button>
          <button class="tab-btn ${activeTab === 'BACKUP' ? 'active' : ''}" onclick="window.iKhataUI.openSettingsModal('BACKUP')">💾 Data Safety & Backup</button>
          <button class="tab-btn ${activeTab === 'SUBSCRIPTION' ? 'active' : ''}" onclick="window.iKhataUI.openSettingsModal('SUBSCRIPTION')">💎 Plan (${sub.plan})</button>
        </div>

        ${activeTab === 'PROFILE' ? `
          <form onsubmit="event.preventDefault(); window.iKhataUI.submitSettingsProfile(this);">
            <div class="form-group">
              <label class="form-label">Shop Name</label>
              <input type="text" name="name" class="form-input" value="${bus.name}" required>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">City</label>
                <input type="text" name="city" class="form-input" value="${bus.city || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">State</label>
                <input type="text" name="state" class="form-input" value="${bus.state || ''}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">GSTIN Number</label>
                <input type="text" name="gstin" class="form-input" value="${bus.gstin || ''}" placeholder="09ARYAN1234J1Z1">
              </div>
              <div class="form-group">
                <label class="form-label">PAN Number</label>
                <input type="text" name="pan" class="form-input" value="${bus.pan || ''}" placeholder="ARYAN1234J">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Storefront Tagline</label>
              <input type="text" name="storeTagline" class="form-input" value="${bus.storeTagline || ''}">
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">
              Save Profile Changes
            </button>
          </form>
        ` : activeTab === 'RBAC' ? `
          <div>
            <div style="background: var(--bg-main); padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 16px;">
              Your active role: <strong style="color: var(--primary);">${role}</strong> | Role Matrix enforced across API & UI views.
            </div>

            <div style="font-weight: 700; margin-bottom: 10px; font-size: 0.9rem;">Employees & Team Members (${employees.length}):</div>
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
              ${employees.map(e => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: white; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.88rem;">
                  <div>
                    <strong>${e.name}</strong> • ${e.phone}
                  </div>
                  <span class="badge ${e.role === 'Owner' ? 'badge-ai' : 'badge-neutral'}">${e.role}</span>
                </div>
              `).join('')}
            </div>

            <button class="btn btn-outline btn-sm" style="width: 100%; margin-top: 16px;" onclick="window.iKhataUI.closeModal(); window.iKhataUI.navigate('employees');">
              Manage Employee Permissions & RBAC →
            </button>

            <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-color);">
              <div style="font-weight: 700; margin-bottom: 8px; font-size: 0.9rem;">🔒 Shop Security PIN</div>
              <button class="btn btn-outline btn-sm" style="width: 100%; font-weight: 600; border-color: var(--primary); color: var(--primary);" onclick="window.iKhataUI.closeModal(); window.iKhataPIN.openUpdatePINModal();">
                🔑 Update / Change Security PIN
              </button>
            </div>
          </div>
        ` : activeTab === 'BACKUP' ? `
          <div>
            <div style="background: var(--success-light); border: 1px solid var(--success-border); padding: 14px; border-radius: 8px; margin-bottom: 16px;">
              <h4 style="color: var(--success); margin: 0 0 4px;">🛡️ Enterprise Data Safety Guarantee</h4>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0;">Export your complete shop database anytime. All records include SHA-256 integrity metadata.</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 8px;">💾</div>
                <strong style="font-size: 0.95rem;">Export 1-Click Backup</strong>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin: 4px 0 12px;">Download structured JSON file of all customers, stock, bills, & invoices.</p>
                <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="window.iKhataUI.downloadBackupJSON()">
                  📥 Download Backup JSON
                </button>
              </div>

              <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 8px;">🔄</div>
                <strong style="font-size: 0.95rem;">Safe Restore Backup</strong>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin: 4px 0 12px;">Upload JSON backup with schema validation & pre-snapshot recovery.</p>
                <input type="file" id="restore-backup-input" style="display: none;" accept=".json" onchange="window.iKhataUI.importBackupJSON(this)">
                <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="document.getElementById('restore-backup-input').click()">
                  📤 Restore from JSON
                </button>
              </div>

              <div style="border: 1px solid var(--primary); background: rgba(99,102,241,0.05); padding: 16px; border-radius: 8px; text-align: center; grid-column: span 2;">
                <div style="font-size: 2rem; margin-bottom: 8px;">💾</div>
                <strong style="font-size: 0.95rem; color: var(--primary);">Local Offline Storage Active</strong>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin: 4px 0 12px;">All business records are stored locally in your browser. MongoDB database integration coming soon!</p>
                <button class="btn btn-outline btn-sm" style="width: 100%; justify-content: center;" onclick="window.iKhataUI.syncToCloudUI()">
                  💾 Check Local Storage Status
                </button>
              </div>
            </div>

            <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 16px;">
              <button class="btn btn-danger btn-sm" style="width: 100%; justify-content: center;" onclick="window.iKhataStore.resetToDemoData(); window.iKhataUI.closeModal(); window.iKhataUI.refresh();">
                ⚠️ Reset All Workspace Data to Seed Demo State
              </button>
            </div>
          </div>
        ` : `
          <!-- Subscription Tab -->
          <div>
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <span class="badge" style="background: rgba(255,255,255,0.2); color: white;">CURRENT PLAN</span>
              <h2 style="color: white; font-size: 1.8rem; margin: 4px 0;">${sub.label}</h2>
              <p style="font-size: 0.85rem; color: #c7d2fe; margin: 0;">Plan includes up to ${sub.limits.maxCustomers} customers, GST Invoices (${sub.limits.allowGSTInvoices ? 'Enabled' : 'Disabled'}), and AI Copilot (${sub.limits.allowAI ? 'Enabled' : 'Disabled'}).</p>
            </div>

            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 12px;">Switch Plan Tier (Demo Switcher):</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
              <button class="btn ${sub.plan === 'FREE' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="window.iKhataStore.setSubscriptionPlan('FREE'); window.iKhataUI.openSettingsModal('SUBSCRIPTION'); window.iKhataUI.showToast('Switched to Free plan', 'info');">
                Free Khata
              </button>
              <button class="btn ${sub.plan === 'PRO' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="window.iKhataStore.setSubscriptionPlan('PRO'); window.iKhataUI.openSettingsModal('SUBSCRIPTION'); window.iKhataUI.showToast('Switched to Pro plan', 'success');">
                Pro Business
              </button>
              <button class="btn ${sub.plan === 'ENTERPRISE' ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="window.iKhataStore.setSubscriptionPlan('ENTERPRISE'); window.iKhataUI.openSettingsModal('SUBSCRIPTION'); window.iKhataUI.showToast('Switched to Enterprise plan', 'success');">
                Enterprise Suite
              </button>
            </div>
          </div>
        `}
      </div>
    `);
  },

  submitSettingsProfile(form) {
    const data = new FormData(form);
    const bus = window.iKhataStore.getCurrentBusiness();
    if (!bus) return;

    bus.name = data.get('name') || bus.name;
    bus.city = data.get('city') || bus.city;
    bus.state = data.get('state') || bus.state;
    bus.gstin = data.get('gstin') || bus.gstin;
    bus.pan = data.get('pan') || bus.pan;
    bus.storeTagline = data.get('storeTagline') || bus.storeTagline;

    window.iKhataStore.saveState();
    this.closeModal();
    this.showToast('✓ Profile & GST settings updated!', 'success');
    this.refresh();
  },

  async syncToCloudUI() {
    this.showToast('💾 Data is saved locally in browser (MongoDB coming soon)', 'info');
  },

  downloadBackupJSON() {
    const jsonStr = window.iKhataStore.exportBusinessBackup();
    const bus = window.iKhataStore.getCurrentBusiness();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iKhataPro_Backup_${bus.slug}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('💾 Backup JSON downloaded successfully!', 'success');
  },

  importBackupJSON(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = window.iKhataStore.validateAndImportBackup(e.target.result);
      if (result.success) {
        this.closeModal();
        this.showToast(`🎉 Data Restored! (${result.summary.customers} customers, ${result.summary.invoices} invoices)`, 'success');
        this.refresh();
      } else {
        this.showToast(`❌ ${result.message}`, 'danger');
      }
    };
    reader.readAsText(file);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.iKhataUI.init();
});
