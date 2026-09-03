/* iKhataPro Digital Storefront (1-Click Online Dukaan) Module */

window.iKhataStorefront = {
  cart: [],
  customerSearchQuery: '',
  selectedCategory: 'ALL',
  viewMode: 'MANAGER', // 'MANAGER' or 'CUSTOMER'

  // --- MERCHANT DASHBOARD VIEW ---
  renderManager(state) {
    const bus = window.iKhataStore.getCurrentBusiness();
    const products = window.iKhataStore.getProducts();
    const orders = window.iKhataStore.getOnlineOrders();
    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const onlineProductsCount = products.filter(p => p.isOnlineVisible !== false).length;
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const storeUrl = `${window.location.origin}${window.location.pathname}#shop/${bus.slug}`;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <h1 style="font-size: 1.75rem; margin: 0;">🛍️ Digital Storefront</h1>
            <span class="badge ${bus.storeActive !== false ? 'badge-success' : 'badge-danger'}">
              ${bus.storeActive !== false ? '🟢 Store Live' : '🔴 Store Paused'}
            </span>
          </div>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">
            Your 1-Click Online Dukaan published directly from your inventory.
          </p>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-warning" onclick="window.iKhataPOS.openOnlineOrdersModal()">
            <span>📦</span> Online Orders ${pendingOrders.length > 0 ? `<span class="badge badge-danger" style="margin-left: 4px;">${pendingOrders.length} New</span>` : ''}
          </button>
          <button class="btn btn-outline" onclick="window.iKhataStorefront.openPrintQRModal()">
            <span>🖨️</span> Counter QR Standee
          </button>
          <button class="btn btn-primary" onclick="window.open('${storeUrl}', '_blank')">
            <span>👁️</span> Preview Public Shop
          </button>
        </div>
      </div>

      <!-- Store URL Link Share Card -->
      <div class="card" style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(147, 51, 234, 0.12) 100%); border: 1px solid var(--primary);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px;">YOUR PUBLIC ONLINE DUKAAN LINK</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 700; margin-top: 4px; word-break: break-all; color: var(--text-main);">
              ${storeUrl}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
              Share this link or QR code with customers on WhatsApp to take online orders 24/7.
            </div>
          </div>

          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${storeUrl}'); window.iKhataUI.showToast('✓ Link copied to clipboard!', 'success');">
              📋 Copy Link
            </button>
            <button class="btn btn-success btn-sm" onclick="window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent('Namaste! Aap ghar baithe hamaari dukan se online order kar sakte hain: ' + '${storeUrl}'), '_blank');">
              📲 Share on WhatsApp
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px; cursor: pointer;" onclick="window.iKhataPOS.openOnlineOrdersModal();">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">PENDING ORDERS</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: ${pendingOrders.length > 0 ? '#f59e0b' : 'var(--text-main)'}; margin-top: 4px;">
            ${pendingOrders.length} ${pendingOrders.length > 0 ? '⚠️' : '✓'}
          </div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">ONLINE ITEMS LISTED</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: var(--primary); margin-top: 4px;">
            ${onlineProductsCount} / ${products.length}
          </div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">DELIVERY CHARGE</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; margin-top: 4px;">
            ${formatCurrency(bus.deliveryFee || 0)}
          </div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">MINIMUM ORDER VALUE</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; margin-top: 4px;">
            ${formatCurrency(bus.minOrderAmount || 0)}
          </div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">WHATSAPP ORDER NO.</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 700; color: var(--success); margin-top: 6px;">
            +${bus.whatsappNumber || 'Not Set'}
          </div>
        </div>
      </div>

      <!-- Online Customer Orders Section -->
      <div class="card" style="margin-bottom: 24px; padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <h3 style="font-size: 1.1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>📦</span> Online Customer Orders (${orders.length})
          </h3>
          <button class="btn btn-outline btn-sm" onclick="window.iKhataPOS.openOnlineOrdersModal()">
            View Full Screen Orders
          </button>
        </div>

        ${orders.length === 0 ? `
          <div style="text-align: center; padding: 24px; background: var(--bg-subtle); border-radius: 8px;">
            <div style="font-size: 2rem; margin-bottom: 8px;">🛍️</div>
            <div style="font-weight: 600; color: var(--text-main);">No Online Orders Yet</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Orders placed by customers on your Online Dukaan link will appear here.</div>
          </div>
        ` : `
          <div style="display: grid; gap: 12px; max-height: 380px; overflow-y: auto;">
            ${orders.slice(0, 5).map(o => `
              <div style="padding: 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-subtle);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <div>
                    <strong>Order #${o.id}</strong> • <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(o.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <span class="badge ${o.status === 'Pending' ? 'badge-warning' : 'badge-success'}">${o.status}</span>
                </div>

                <div style="font-size: 0.85rem; font-weight: 700; margin-bottom: 4px;">
                  👤 ${o.customerName} (${o.customerPhone})
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
                  📍 ${o.address} • Payment: <strong>${o.paymentMethod}</strong>
                </div>

                <div style="font-size: 0.8rem; background: var(--surface-bg); padding: 8px; border-radius: 6px; margin-bottom: 10px;">
                  ${o.items.map(i => `<div>${i.name} x ${i.qty} = ${formatCurrency(i.price * i.qty)}</div>`).join('')}
                  <div style="font-weight: 800; margin-top: 4px; border-top: 1px solid var(--border-color); padding-top: 4px; display: flex; justify-content: space-between;">
                    <span>Total Payable:</span>
                    <span>${formatCurrency(o.total)}</span>
                  </div>
                </div>

                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="window.iKhataUI.navigate('pos'); setTimeout(() => window.iKhataPOS.loadOnlineOrderToCart('${o.id}'), 100);">
                    ⚡ Accept & Load into POS Cart
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="window.iKhataStore.updateOrderStatus('${o.id}', 'Dispatched'); window.iKhataUI.showToast('✓ Order #${o.id} marked as dispatched', 'success'); window.iKhataUI.refresh();">
                    🚚 Dispatch
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Grid Layout: Settings + Product Online Visibility Manager -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
        
        <!-- Store Settings Card -->
        <div class="card" style="padding: 20px; align-self: start;">
          <h3 style="font-size: 1.1rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span>⚙️</span> Store Settings
          </h3>

          <form onsubmit="event.preventDefault(); window.iKhataStorefront.saveSettings(this);">
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">Store Status</label>
              <select name="storeActive" class="form-input">
                <option value="true" ${bus.storeActive !== false ? 'selected' : ''}>🟢 Live & Accepting Orders</option>
                <option value="false" ${bus.storeActive === false ? 'selected' : ''}>🔴 Paused (Closed)</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">Store Tagline / Banner Text</label>
              <textarea name="storeTagline" class="form-input" rows="2">${bus.storeTagline || ''}</textarea>
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">Delivery Fee (₹)</label>
              <input type="number" name="deliveryFee" class="form-input" value="${bus.deliveryFee || 0}">
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">Min. Order Amount (₹)</label>
              <input type="number" name="minOrderAmount" class="form-input" value="${bus.minOrderAmount || 0}">
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label">WhatsApp Order Number</label>
              <input type="text" name="whatsappNumber" class="form-input" value="${bus.whatsappNumber || ''}" placeholder="e.g. 919876543210">
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%;">
              Save Storefront Settings
            </button>
          </form>
        </div>

        <!-- Product Online Catalog Selector -->
        <div class="card" style="padding: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <h3 style="font-size: 1.1rem; margin: 0;">📦 Manage Dukan Online Catalog</h3>
            <span style="font-size: 0.85rem; color: var(--text-muted);">Toggle items to publish online</span>
          </div>

          <div style="display: grid; gap: 12px; max-height: 520px; overflow-y: auto; padding-right: 4px;">
            ${products.map(p => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-subtle);">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&q=80'}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${p.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${formatCurrency(p.price)} • Stock: ${p.stock} • ${p.category}</div>
                  </div>
                </div>

                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                  <input type="checkbox" ${p.isOnlineVisible !== false ? 'checked' : ''} onchange="window.iKhataStore.toggleProductOnlineVisibility('${p.id}'); window.iKhataUI.refresh();">
                  <span>${p.isOnlineVisible !== false ? '🟢 Visible' : '⚪ Hidden'}</span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  },

  saveSettings(form) {
    const data = new FormData(form);
    window.iKhataStore.updateStorefrontSettings({
      storeActive: data.get('storeActive') === 'true',
      storeTagline: data.get('storeTagline'),
      deliveryFee: data.get('deliveryFee'),
      minOrderAmount: data.get('minOrderAmount'),
      whatsappNumber: data.get('whatsappNumber')
    });
    window.iKhataUI.showToast('✓ Storefront settings updated!', 'success');
    window.iKhataUI.refresh();
  },

  openPrintQRModal() {
    const bus = window.iKhataStore.getCurrentBusiness();
    const storeUrl = `${window.location.origin}${window.location.pathname}#shop/${bus.slug}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(storeUrl)}`;

    window.iKhataUI.openModal('Print Storefront Counter Standee', `
      <div style="text-align: center; padding: 10px;">
        <div style="font-size: 2.2rem;">${bus.logo || '🏪'}</div>
        <h2 style="font-size: 1.4rem; margin-top: 4px; color: var(--text-main);">${bus.name}</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem;">${bus.address}</p>

        <div style="margin: 20px auto; display: inline-block; padding: 16px; background: white; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);">
          <img src="${qrApiUrl}" alt="Store QR Code" style="width: 200px; height: 200px; display: block;">
        </div>

        <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary);">
          SCAN TO ORDER ONLINE
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
          Ghar baithe dukan se saaman mangwane ke liye scan karein
        </div>

        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
          <button class="btn btn-primary" onclick="window.print();">
            🖨️ Print Standee
          </button>
          <button class="btn btn-outline" onclick="window.iKhataUI.closeModal();">
            Close
          </button>
        </div>
      </div>
    `);
  },

  // --- GUEST CUSTOMER STANDALONE E-COMMERCE SHOP VIEW ---
  renderCustomerStore(slug) {
    const businesses = window.iKhataStore.state.businesses;
    const bus = businesses.find(b => b.slug === slug) || window.iKhataStore.getCurrentBusiness();
    const products = window.iKhataStore.state.products.filter(p => p.business_id === bus.id && p.isOnlineVisible !== false);
    
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const categories = ['ALL', ...new Set(products.map(p => p.category))];

    let filtered = products;
    if (this.selectedCategory !== 'ALL') {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }
    if (this.customerSearchQuery) {
      const q = this.customerSearchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    const cartCount = this.cart.reduce((sum, i) => sum + i.qty, 0);
    const cartSubtotal = this.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const storeUrl = `${window.location.origin}${window.location.pathname}#shop/${bus.slug}`;
    const waNumber = bus.whatsappNumber || '919216953892';

    return `
      <div style="max-width: 1000px; margin: 0 auto; padding-bottom: 90px;">
        
        <!-- Standalone E-Commerce Store Banner -->
        <div class="card" style="margin-bottom: 20px; padding: 24px; background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%); color: white; border-radius: var(--radius-xl);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="font-size: 2.5rem; background: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${bus.logo || '🏪'}
              </div>
              <div>
                <h1 style="font-size: 1.6rem; color: white; margin: 0; font-weight: 800;">${bus.name}</h1>
                <p style="font-size: 0.9rem; opacity: 0.95; margin-top: 2px;">${bus.storeTagline || bus.address}</p>
                <div style="font-size: 0.8rem; opacity: 0.85; margin-top: 4px; display: flex; align-items: center; gap: 8px;">
                  <span>📍 ${bus.city}, ${bus.state}</span>
                  <span>•</span>
                  <span>🚚 Delivery: ${formatCurrency(bus.deliveryFee || 0)}</span>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn" style="background: #25D366; color: white; border: none; font-weight: 700; border-radius: var(--radius-md);" onclick="window.open('https://api.whatsapp.com/send?phone=${waNumber}&text=${encodeURIComponent('Namaste ' + bus.name + '! I am viewing your online store.')}', '_blank')">
                📲 Chat on WhatsApp
              </button>
              <button class="btn" style="background: rgba(255,255,255,0.2); color: white; border: none; font-weight: 600; border-radius: var(--radius-md);" onclick="navigator.clipboard.writeText('${storeUrl}'); window.iKhataUI.showToast('✓ Shop link copied!', 'success');">
                📋 Share Shop
              </button>
            </div>
          </div>
        </div>

        <!-- Search Bar & Category Filters -->
        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; justify-content: space-between;">
          <input type="text" class="form-input" style="max-width: 320px;" placeholder="🔍 Search online items..." value="${this.customerSearchQuery}" oninput="window.iKhataStorefront.customerSearchQuery = this.value; window.iKhataUI.refresh();">

          <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
            ${categories.map(cat => `
              <button class="tab-btn ${this.selectedCategory === cat ? 'active' : ''}" onclick="window.iKhataStorefront.selectedCategory = '${cat}'; window.iKhataUI.refresh();" style="padding: 6px 14px; font-size: 0.85rem;">
                ${cat}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Online Products Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
          ${filtered.length === 0 ? `
            <div class="empty-state" style="grid-column: 1 / -1;">
              <div class="empty-state-icon">📦</div>
              <div class="empty-state-title">No products found</div>
              <div class="empty-state-desc">Try clearing your search or category filter.</div>
            </div>
          ` : filtered.map(p => {
            const inCart = this.cart.find(c => c.id === p.id);
            const qty = inCart ? inCart.qty : 0;

            return `
              <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; padding: 12px;">
                <div>
                  <div style="position: relative; width: 100%; height: 140px; border-radius: 8px; overflow: hidden; margin-bottom: 10px; background: var(--bg-subtle);">
                    <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80'}" style="width: 100%; height: 100%; object-fit: cover;">
                    ${p.stock <= 0 ? `<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">Out of Stock</div>` : ''}
                  </div>
                  
                  <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 2px; color: var(--text-main);">${p.name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; line-clamp: 2;">${p.description || p.category}</div>
                </div>

                <div style="border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; align-items: center; justify-content: space-between;">
                  <div style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 800; color: var(--primary);">
                    ${formatCurrency(p.price)}
                  </div>

                  ${p.stock <= 0 ? '' : (qty > 0 ? `
                    <div style="display: flex; align-items: center; gap: 8px; background: var(--primary); color: white; border-radius: 6px; padding: 4px 8px;">
                      <button style="background: none; border: none; color: white; font-weight: 800; cursor: pointer;" onclick="window.iKhataStorefront.updateCartQty('${p.id}', -1)">-</button>
                      <span style="font-weight: 700; font-size: 0.85rem;">${qty}</span>
                      <button style="background: none; border: none; color: white; font-weight: 800; cursor: pointer;" onclick="window.iKhataStorefront.updateCartQty('${p.id}', 1)">+</button>
                    </div>
                  ` : `
                    <button class="btn btn-outline btn-sm" onclick="window.iKhataStorefront.addToCart('${p.id}')">
                      + Add to Cart
                    </button>
                  `)}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Floating Cart Bar for Guest Customer -->
        ${cartCount > 0 ? `
          <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 600px; background: var(--bg-surface); border: 2px solid var(--primary); box-shadow: var(--shadow-xl); border-radius: 16px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 500;">
            <div>
              <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">${cartCount} ITEM(S) IN CART</div>
              <div style="font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 800; color: var(--primary);">
                ${formatCurrency(cartSubtotal)}
              </div>
            </div>

            <button class="btn btn-primary btn-lg" onclick="window.iKhataStorefront.openCheckoutModal('${bus.slug}')">
              🛒 Checkout & Order →
            </button>
          </div>
        ` : ''}

      </div>
    `;
  },

  addToCart(productId) {
    const prod = window.iKhataStore.state.products.find(p => p.id === productId);
    if (!prod) return;
    const existing = this.cart.find(c => c.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      this.cart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
    }
    window.iKhataUI.refresh();
  },

  updateCartQty(productId, delta) {
    const idx = this.cart.findIndex(c => c.id === productId);
    if (idx !== -1) {
      this.cart[idx].qty += delta;
      if (this.cart[idx].qty <= 0) {
        this.cart.splice(idx, 1);
      }
    }
    window.iKhataUI.refresh();
  },

  openCheckoutModal(slug) {
    const bus = (slug && window.iKhataStore.state.businesses ? window.iKhataStore.state.businesses.find(b => b.slug === slug) : null) || window.iKhataStore.getCurrentBusiness() || {};
    const busSlug = bus.slug || slug || '';
    const cartSubtotal = this.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const deliveryFee = bus.deliveryFee || 0;
    const total = cartSubtotal + deliveryFee;
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');

    window.iKhataUI.openModal('Complete Your Online Order', `
      <form onsubmit="event.preventDefault(); window.iKhataStorefront.submitOrder(this, '${busSlug}');">
        <div style="margin-bottom: 16px; padding: 14px; background: var(--bg-subtle); border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="font-weight: 700; margin-bottom: 8px; color: var(--text-main);">Order Summary</div>
          ${this.cart.map(i => `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px; color: var(--text-main);">
              <span>${i.name} x ${i.qty}</span>
              <span>${formatCurrency(i.price * i.qty)}</span>
            </div>
          `).join('')}
          <div style="border-top: 1px solid var(--border-color); margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
            <span>Delivery Fee</span>
            <span>${formatCurrency(deliveryFee)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; margin-top: 6px; color: var(--primary);">
            <span>Total Payable</span>
            <span>${formatCurrency(total)}</span>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label">Your Name</label>
          <input type="text" name="customerName" class="form-input" placeholder="e.g. Ramesh Kumar" required>
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label">Mobile Number</label>
          <input type="tel" name="customerPhone" class="form-input" placeholder="+91 98765 43210" required>
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label">Delivery Address / Notes</label>
          <textarea name="address" class="form-input" rows="2" placeholder="House no, Street, Landmark" required></textarea>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label">Payment Method</label>
          <select name="paymentMethod" class="form-input">
            <option value="WhatsApp">💬 Direct Order to Malik via WhatsApp</option>
            <option value="UPI">📲 Pay via Instant UPI QR</option>
            <option value="COD">💵 Cash on Delivery (COD)</option>
          </select>
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">
          Place Order Now (${formatCurrency(total)})
        </button>
      </form>
    `);
  },

  submitOrder(form, slug) {
    const data = new FormData(form);
    const bus = (slug && window.iKhataStore.state.businesses ? window.iKhataStore.state.businesses.find(b => b.slug === slug) : null) || window.iKhataStore.getCurrentBusiness() || {};
    const cartSubtotal = this.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const deliveryFee = bus.deliveryFee || 0;
    const total = cartSubtotal + deliveryFee;

    const order = window.iKhataStore.addOnlineOrder({
      business_id: bus.id,
      customerName: data.get('customerName'),
      customerPhone: data.get('customerPhone'),
      address: data.get('address'),
      items: [...this.cart],
      subtotal: cartSubtotal,
      deliveryFee: deliveryFee,
      total: total,
      paymentMethod: data.get('paymentMethod')
    });

    const paymentMethod = data.get('paymentMethod');
    this.cart = []; // clear cart
    window.iKhataUI.closeModal();

    const waNumber = bus.whatsappNumber || '919216953892';

    if (paymentMethod === 'WhatsApp') {
      const itemsList = order.items.map(i => `• ${i.name} (${i.qty}x) = ₹${i.price * i.qty}`).join('%0A');
      const waMsg = `*NEW ONLINE ORDER #${order.id}*%0A%0A*Customer:* ${order.customerName}%0A*Phone:* ${order.customerPhone}%0A*Address:* ${order.address}%0A%0A*Items:*%0A${itemsList}%0A%0A*Subtotal:* ₹${order.subtotal}%0A*Delivery:* ₹${order.deliveryFee}%0A*Total Payable:* ₹${order.total}%0A*Payment:* Direct Order`;
      window.open(`https://api.whatsapp.com/send?phone=${waNumber}&text=${waMsg}`, '_blank');
      window.iKhataUI.showToast('✓ Order placed & sent directly to Malik on WhatsApp!', 'success');
    } else if (paymentMethod === 'UPI') {
      const upiUrl = `upi://pay?pa=${waNumber}@paytm&pn=${encodeURIComponent(bus.name)}&am=${total}&cu=INR`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;

      window.iKhataUI.openModal('Pay via UPI QR', `
        <div style="text-align: center; padding: 12px;">
          <h3 style="margin-bottom: 4px; color: var(--text-main);">Scan & Pay ₹${total}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Order #${order.id} placed successfully!</p>
          <div style="margin: 16px auto; padding: 12px; background: white; border-radius: 12px; display: inline-block;">
            <img src="${qrApiUrl}" style="width: 180px; height: 180px; display: block;">
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted);">Pay using Paytm, GooglePay, PhonePe or BHIM</p>
          <button class="btn btn-primary" style="margin-top: 12px;" onclick="window.iKhataUI.closeModal(); window.iKhataUI.showToast('✓ Payment confirmed! Order sent to shop.', 'success');">
            I Have Completed Payment
          </button>
        </div>
      `);
    } else {
      window.iKhataUI.showToast(`✓ Order #${order.id} placed successfully!`, 'success');
    }

    window.iKhataUI.refresh();
  }
};
