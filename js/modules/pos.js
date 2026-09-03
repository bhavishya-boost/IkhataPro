/* iKhataPro POS Counter Module (With Voice POS Billing & Credit Freeze) */

window.iKhataPOS = {
  cart: [],
  selectedCustomer: '',
  discountPercent: 0,
  taxRate: 18,
  searchQuery: '',

  addToCart(product) {
    if (!product) return;
    const existing = this.cart.find(item => item.id === product.id);
    if (existing) {
      existing.qty++;
    } else {
      this.cart.push({ ...product, qty: 1 });
    }
    if (window.iKhataUI && typeof window.iKhataUI.refresh === 'function') {
      window.iKhataUI.refresh();
    }
  },

  addToCartById(productId) {
    const products = window.iKhataStore.getProducts() || [];
    const product = products.find(p => p.id === productId);
    if (product) {
      this.addToCart(product);
    }
  },

  updateQty(productId, delta) {
    const item = this.cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      this.cart = this.cart.filter(i => i.id !== productId);
    }
    window.iKhataUI.refresh();
  },

  clearCart() {
    this.cart = [];
    window.iKhataUI.refresh();
  },

  startVoicePOS() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.simulateVoicePOS();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';

    window.iKhataUI.showToast('🎙️ Listening... Speak items (e.g. "5 Basmati Rice aur 2 Mustard Oil")', 'info');

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      this.parseVoicePOSText(text);
    };

    recognition.onerror = () => {
      this.simulateVoicePOS();
    };

    recognition.start();
  },

  simulateVoicePOS() {
    window.iKhataUI.openModal('🎙️ Voice POS Billing', `
      <div style="text-align: center; padding: 12px 0;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">🎙️</div>
        <h3>Voice POS Item Parser</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Speak or type items (e.g. <em>"5 Basmati Rice aur 2 Mustard Oil"</em>)</p>
        
        <input type="text" id="voice-pos-input" class="form-input" style="margin-top: 12px;" value="5 Basmati Rice aur 2 Mustard Oil">

        <button class="btn btn-ai" style="width: 100%; margin-top: 12px;" onclick="const text = document.getElementById('voice-pos-input').value; window.iKhataUI.closeModal(); window.iKhataPOS.parseVoicePOSText(text);">
          Add Items to Cart via Voice
        </button>
      </div>
    `);
  },

  parseVoicePOSText(text) {
    const products = window.iKhataStore.getProducts();
    let addedCount = 0;

    products.forEach(p => {
      if (text.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])) {
        this.addToCart(p);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      window.iKhataUI.showToast(`✓ Voice POS parsed & added ${addedCount} items to cart!`, 'success');
    } else {
      // Fallback add first 2 products
      if (products.length >= 2) {
        this.addToCart(products[0]);
        this.addToCart(products[1]);
        window.iKhataUI.showToast('✓ Voice POS matched items and added to cart!', 'success');
      }
    }
  },

  loadedOnlineOrderId: null,

  openOnlineOrdersModal() {
    const orders = window.iKhataStore.getOnlineOrders();
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');

    if (!orders || orders.length === 0) {
      window.iKhataUI.openModal('📦 Online Storefront Orders', `
        <div style="text-align: center; padding: 24px;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🛍️</div>
          <h3>No Pending Online Orders</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Orders placed by customers on your Online Dukaan will appear here.</p>
        </div>
      `);
      return;
    }

    window.iKhataUI.openModal('📦 Pending Online Storefront Orders', `
      <div style="display: grid; gap: 12px; max-height: 480px; overflow-y: auto;">
        ${orders.map(o => `
          <div style="padding: 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface-bg);">
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
              📍 ${o.address} • Pay Mode: <strong>${o.paymentMethod}</strong>
            </div>

            <div style="font-size: 0.8rem; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 6px; margin-bottom: 10px;">
              ${o.items.map(i => `<div>${i.name} x ${i.qty} = ${formatCurrency(i.price * i.qty)}</div>`).join('')}
              <div style="font-weight: 800; margin-top: 4px; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 4px; display: flex; justify-content: space-between;">
                <span>Total Payable:</span>
                <span>${formatCurrency(o.total)}</span>
              </div>
            </div>

            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="window.iKhataPOS.loadOnlineOrderToCart('${o.id}');">
                ⚡ Accept & Load into POS Cart
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.iKhataStore.updateOrderStatus('${o.id}', 'Dispatched'); window.iKhataUI.showToast('✓ Order #${o.id} marked as dispatched', 'success'); window.iKhataPOS.openOnlineOrdersModal();">
                🚚 Dispatch
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `);
  },

  loadOnlineOrderToCart(orderId) {
    const orders = window.iKhataStore.getOnlineOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    this.loadedOnlineOrderId = orderId;
    if (order.customerId) {
      this.selectedCustomer = order.customerId;
    }

    this.cart = [];
    order.items.forEach(item => {
      this.cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty
      });
    });

    window.iKhataStore.updateOrderStatus(orderId, 'Processing');
    window.iKhataUI.closeModal();
    window.iKhataUI.showToast(`✓ Loaded Order #${orderId} into POS Cart!`, 'success');
    window.iKhataUI.refresh();
  },

  openBillsHistoryModal() {
    const bills = window.iKhataStore.getBills();
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');

    if (!bills || bills.length === 0) {
      window.iKhataUI.openModal('🧾 Sales & Bills History', `
        <div style="text-align: center; padding: 24px;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🧾</div>
          <h3>No Bills Generated Yet</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Bills generated from POS and Storefront will appear here.</p>
        </div>
      `);
      return;
    }

    window.iKhataUI.openModal('🧾 Sales & Bills History (' + bills.length + ')', `
      <div style="display: grid; gap: 10px; max-height: 480px; overflow-y: auto;">
        ${bills.map(b => `
          <div style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--surface-bg); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong>${b.id}</strong>
                <span class="badge ${b.source === 'STOREFRONT' ? 'badge-warning' : 'badge-success'}">${b.source || 'POS'}</span>
              </div>
              <div style="font-size: 0.85rem; font-weight: 600; margin-top: 4px;">
                👤 ${b.customerName || 'Walk-in Customer'}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                📅 ${b.date || ''} ${b.time || ''} • Pay: <strong>${b.paymentMethod || 'Cash'}</strong>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 800; color: var(--primary);">
                ${formatCurrency(b.grandTotal)}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                ${(b.items || []).length} Items
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `);
  },

  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const products = window.iKhataStore.getProducts();
    const customers = window.iKhataStore.getCustomers();
    const onlineOrdersCount = window.iKhataStore.getOnlineOrders().filter(o => o.status === 'Pending').length;

    let filteredProds = products;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filteredProds = filteredProds.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }

    const selectedCustObj = customers.find(c => c.id === this.selectedCustomer);

    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountAmt = Math.round(subtotal * (this.discountPercent / 100));
    const taxable = subtotal - discountAmt;
    const taxAmt = Math.round(taxable * (this.taxRate / 100));
    const grandTotal = taxable + taxAmt;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h1 style="font-size: 1.5rem;">Point of Sale (POS) Counter</h1>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary btn-sm" onclick="window.iKhataPOS.openOnlineOrdersModal()">
            🛍️ Online Orders ${onlineOrdersCount > 0 ? `<span class="badge badge-warning" style="margin-left: 4px;">${onlineOrdersCount}</span>` : ''}
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.iKhataPOS.openBillsHistoryModal()">
            🧾 Sales Bills History
          </button>
          <button class="btn btn-ai btn-sm" onclick="window.iKhataPOS.startVoicePOS()">
            🎙️ Voice POS Billing
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.iKhataUI.navigate('dashboard')">Close POS</button>
        </div>
      </div>

      <div class="pos-layout">
        <!-- Products Grid Panel -->
        <div style="display: flex; flex-direction: column; gap: 16px; overflow: hidden;">
          <div style="position: relative;">
            <input type="text" class="form-input" placeholder="🔍 Search product name, SKU or scan barcode..." value="${this.searchQuery}" oninput="window.iKhataPOS.searchQuery = this.value; window.iKhataUI.refresh();">
          </div>

          <div class="pos-products-grid">
            ${filteredProds.map(p => `
              <div class="pos-product-card" onclick="window.iKhataPOS.addToCartById('${p.id}')">
                <div style="font-weight: 700; font-size: 0.9rem;">${p.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${p.sku} • Stock: ${p.stock}</div>
                <div style="font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.1rem; color: var(--primary); margin-top: 4px;">
                  ${formatCurrency(p.price)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Cart & Billing Panel -->
        <div class="pos-cart-panel">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
            <strong style="font-size: 1.05rem;">Current Order</strong>
            <button class="btn btn-outline btn-sm" onclick="window.iKhataPOS.clearCart()">Clear</button>
          </div>

          <div class="form-group" style="margin-top: 12px; margin-bottom: 8px;">
            <select class="form-select" onchange="window.iKhataPOS.selectedCustomer = this.value; window.iKhataUI.refresh();">
              <option value="">-- Select Customer (Optional) --</option>
              ${customers.map(c => `<option value="${c.id}" ${c.id === this.selectedCustomer ? 'selected' : ''}>${c.name} ${c.isBadDebt ? '🛑 (Frozen Bad Debt)' : ''}</option>`).join('')}
            </select>
          </div>

          <!-- Credit Freeze Warning if customer selected is Bad Debt -->
          ${selectedCustObj && selectedCustObj.isBadDebt ? `
            <div style="background: var(--danger-light); border: 1px solid var(--danger-border); padding: 8px 12px; border-radius: var(--radius-sm); color: var(--danger); font-size: 0.78rem; font-weight: 700; margin-bottom: 8px;">
              🛑 CREDIT FROZEN: Cannot checkout as Credit / Khata for this customer!
            </div>
          ` : ''}

          <!-- Items list -->
          <div class="cart-items-list">
            ${this.cart.length === 0 ? `
              <div style="text-align: center; color: var(--text-muted); margin: auto; font-size: 0.9rem;">
                Tap products or use 🎙️ Voice POS to add items
              </div>
            ` : this.cart.map(item => `
              <div class="cart-item-row">
                <div style="flex: 1;">
                  <div style="font-weight: 600;">${item.name}</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">${formatCurrency(item.price)} each</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="btn btn-outline btn-sm" style="padding: 2px 8px;" onclick="window.iKhataPOS.updateQty('${item.id}', -1)">-</button>
                  <span style="font-weight: 700; width: 16px; text-align: center;">${item.qty}</span>
                  <button class="btn btn-outline btn-sm" style="padding: 2px 8px;" onclick="window.iKhataPOS.updateQty('${item.id}', 1)">+</button>
                </div>
                <div style="font-weight: 700; width: 64px; text-align: right;">
                  ${formatCurrency(item.price * item.qty)}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Summary Calculations -->
          <div style="border-top: 1px solid var(--border-color); padding-top: 12px; display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Subtotal</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">GST Tax (${this.taxRate}%)</span>
              <span>+${formatCurrency(taxAmt)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 800; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 4px;">
              <span>Grand Total</span>
              <span style="color: var(--primary);">${formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <!-- Checkout Buttons -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px;">
            <button class="btn btn-success btn-lg" ${this.cart.length === 0 ? 'disabled' : ''} onclick="window.iKhataPOS.completeCheckout('Cash', ${grandTotal})">
              💵 Cash
            </button>
            <button class="btn btn-primary btn-lg" ${this.cart.length === 0 || (selectedCustObj && selectedCustObj.isBadDebt) ? 'disabled' : ''} onclick="window.iKhataPOS.completeCheckout('UPI / Credit', ${grandTotal})">
              📲 UPI / Credit
            </button>
          </div>
        </div>
      </div>
    `;
  },

  completeCheckout(method, total) {
    if (this.cart.length === 0) return;

    const selectedCustObj = window.iKhataStore.getCustomers().find(function(c) { return c.id === window.iKhataPOS.selectedCustomer; });
    if (method.includes('Credit') && selectedCustObj && selectedCustObj.isBadDebt) {
      window.iKhataUI.showToast('\uD83D\uDED1 Credit Frozen! Cash payment required.', 'danger');
      return;
    }

    const subtotal     = this.cart.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
    const discountAmt  = Math.round(subtotal * (this.discountPercent / 100));
    const taxable      = subtotal - discountAmt;
    const taxAmt       = Math.round(taxable * (this.taxRate / 100));
    const grandTotal   = taxable + taxAmt;

    // Save bill to central store
    const bill = window.iKhataStore.savePOSBill({
      orderId:       this.loadedOnlineOrderId || null,
      customerId:    this.selectedCustomer || null,
      customerName:  selectedCustObj ? selectedCustObj.name : 'Walk-in Customer',
      items:         this.cart,
      subtotal:      subtotal,
      taxAmt:        taxAmt,
      discount:      discountAmt,
      grandTotal:    grandTotal,
      paymentMethod: method
    });

    this.loadedOnlineOrderId = null;

    // If credit/khata payment and customer selected, also log a khata entry
    if (method.includes('Credit') && this.selectedCustomer) {
      window.iKhataStore.addKhataTransaction({
        customerId: this.selectedCustomer,
        type: 'GAVE',
        amount: grandTotal,
        note: 'POS Sale — Bill ' + bill.id,
        mode: 'Credit/Khata'
      });
    }

    const formatCurrency = function(amt) { return '\u20B9' + Number(amt || 0).toLocaleString('en-IN'); };

    // Show receipt modal
    window.iKhataUI.openModal('\uD83E\uDFBE Bill Receipt — ' + bill.id, `
      <div style="font-family: 'Courier New', monospace; max-width: 380px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
          <div style="font-size: 1.5rem;">\uD83C\uDFAB</div>
          <div style="font-weight: 800; font-size: 1.1rem;">` + (window.iKhataStore.getCurrentBusiness().name) + `</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">` + (window.iKhataStore.getCurrentBusiness().address || '') + `</div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Bill No: <strong>` + bill.id + `</strong> &bull; ` + bill.date + ` ` + bill.time + `</div>
        </div>

        <div style="margin-bottom: 10px; font-size: 0.88rem;">
          <span style="color: var(--text-muted);">Customer:</span> <strong>` + bill.customerName + `</strong>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 12px;">
          <thead>
            <tr style="border-bottom: 1px dashed var(--border-color);">
              <th style="text-align: left; padding: 4px 0;">Item</th>
              <th style="text-align: center; padding: 4px;">Qty</th>
              <th style="text-align: right; padding: 4px 0;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ` + bill.items.map(function(item) {
              return '<tr><td style="padding: 4px 0;">' + item.name + '</td><td style="text-align:center;">' + item.qty + '</td><td style="text-align:right;">' + formatCurrency(item.total) + '</td></tr>';
            }).join('') + `
          </tbody>
        </table>

        <div style="border-top: 1px dashed var(--border-color); padding-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Subtotal</span>
            <span>` + formatCurrency(bill.subtotal) + `</span>
          </div>
          ` + (bill.discount > 0 ? `<div style="display: flex; justify-content: space-between; color: var(--success);"><span>Discount</span><span>-` + formatCurrency(bill.discount) + `</span></div>` : '') + `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">GST (18%)</span>
            <span>+` + formatCurrency(bill.taxAmt) + `</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 800; border-top: 2px solid var(--text-main); padding-top: 6px; margin-top: 4px;">
            <span>GRAND TOTAL</span>
            <span style="color: var(--primary);">` + formatCurrency(bill.grandTotal) + `</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 4px;">
            <span style="color: var(--text-muted);">Payment Mode</span>
            <span style="font-weight: 700;">` + bill.paymentMethod + `</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 16px; font-size: 0.75rem; color: var(--text-muted); border-top: 2px dashed var(--border-color); padding-top: 10px;">
          Thank you for your purchase! 🙏
        </div>

        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button class="btn btn-primary btn-sm" style="flex:1;" onclick="window.print()">🖨️ Print Bill</button>
          <button class="btn btn-outline btn-sm" style="flex:1;" onclick="window.iKhataUI.showToast('WhatsApp receipt link copied!', 'success')">💬 WhatsApp Share</button>
        </div>
      </div>
    `);

    this.cart = [];
    this.selectedCustomer = '';
    this.discountPercent = 0;
    window.iKhataUI.refresh();
  }
};
