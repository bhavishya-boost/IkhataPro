/* iKhataPro Inventory Module with Smart Intelligence Insights — Phase 3 */

window.iKhataInventory = {
  currentFilter: 'ALL',
  searchQuery: '',

  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const allProducts = window.iKhataStore.getProducts();
    const insights = window.iKhataIntelligence ? window.iKhataIntelligence.computeInventoryInsights() : { fastMovers: [], slowMovers: [], deadStock: [], reorderNeeded: [] };

    let products = allProducts;
    if (this.currentFilter === 'LOW') {
      products = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 0));
    } else if (this.currentFilter === 'OUT') {
      products = products.filter(p => p.stock === 0);
    } else if (this.currentFilter === 'FAST') {
      const fastIds = new Set(insights.fastMovers.map(p => p.id));
      products = products.filter(p => fastIds.has(p.id));
    } else if (this.currentFilter === 'REORDER') {
      const reorderIds = new Set(insights.reorderNeeded.map(p => p.id));
      products = products.filter(p => reorderIds.has(p.id));
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)));
    }

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Inventory & Intelligence</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Catalog management, stock intelligence, fast movers & automated reorder alerts</p>
        </div>
        <button class="btn btn-primary" onclick="window.iKhataUI.openAddProductModal()">
          <span>➕</span> Add Product
        </button>
      </div>

      <!-- Inventory Metrics Bar -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px;">
        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">TOTAL CATALOG</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800;">${allProducts.length}</div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.8rem; color: var(--warning); font-weight: 600;">LOW STOCK ALERTS</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--warning);">
            ${allProducts.filter(p => p.stock > 0 && p.stock <= (p.minStock||0)).length}
          </div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.8rem; color: var(--danger); font-weight: 600;">OUT OF STOCK</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--danger);">
            ${allProducts.filter(p => p.stock === 0).length}
          </div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.8rem; color: var(--ai); font-weight: 600;">REORDER SUGGESTIONS</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--ai);">
            ${insights.reorderNeeded.length}
          </div>
        </div>
      </div>

      <!-- Inventory Intelligence Card -->
      ${insights.reorderNeeded.length > 0 || insights.fastMovers.length > 0 ? `
        <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid var(--border-color);">
          <div class="card-header">
            <div class="card-title">🤖 AI Inventory Insights</div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            ${insights.reorderNeeded.length > 0 ? `
              <div>
                <strong style="color: var(--danger); font-size: 0.88rem;">⚠️ Urgent Reorder Needed:</strong>
                <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
                  ${insights.reorderNeeded.map(p => `• <strong>${p.name}</strong> (${p.stock} remaining)`).join('<br>')}
                </div>
              </div>
            ` : ''}
            ${insights.fastMovers.length > 0 ? `
              <div>
                <strong style="color: var(--success); font-size: 0.88rem;">🔥 Top Selling Products:</strong>
                <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
                  ${insights.fastMovers.slice(0, 3).map(p => `• <strong>${p.name}</strong> (${p.sold30} sold in 30 days)`).join('<br>')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Filters & Search -->
      <div class="card" style="margin-bottom: 20px; padding: 16px;">
        <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <input type="text" class="form-input" style="max-width: 320px;" placeholder="Search products by name or SKU..." value="${this.searchQuery}" oninput="window.iKhataInventory.searchQuery = this.value; window.iKhataUI.refresh();">

          <div class="tab-list" style="margin-bottom: 0; border-bottom: none;">
            <button class="tab-btn ${this.currentFilter === 'ALL' ? 'active' : ''}" onclick="window.iKhataInventory.currentFilter = 'ALL'; window.iKhataUI.refresh();">
              All (${allProducts.length})
            </button>
            <button class="tab-btn ${this.currentFilter === 'LOW' ? 'active' : ''}" onclick="window.iKhataInventory.currentFilter = 'LOW'; window.iKhataUI.refresh();">
              Low Stock (${allProducts.filter(p=>p.stock>0 && p.stock<=(p.minStock||0)).length})
            </button>
            <button class="tab-btn ${this.currentFilter === 'OUT' ? 'active' : ''}" onclick="window.iKhataInventory.currentFilter = 'OUT'; window.iKhataUI.refresh();">
              Out of Stock (${allProducts.filter(p=>p.stock===0).length})
            </button>
            <button class="tab-btn ${this.currentFilter === 'REORDER' ? 'active' : ''}" onclick="window.iKhataInventory.currentFilter = 'REORDER'; window.iKhataUI.refresh();">
              ⚡ Reorder Needed (${insights.reorderNeeded.length})
            </button>
          </div>
        </div>
      </div>

      <!-- Products Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        ${products.map(p => {
          let badgeClass = 'badge-success';
          let badgeText = 'In Stock';
          if (p.stock === 0) { badgeClass = 'badge-danger'; badgeText = 'Out of Stock'; }
          else if (p.stock <= (p.minStock||0)) { badgeClass = 'badge-warning'; badgeText = `Low Stock (${p.stock} left)`; }

          const marginPct = p.price > 0 ? Math.round(((p.price - (p.cost||0)) / p.price) * 100) : 0;

          return `
            <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=100&q=80'}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;">
                    <div>
                      <h3 style="font-size: 1rem; margin: 0;">${p.name}</h3>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${p.sku || 'SKU'} • ${p.category || 'General'}</div>
                    </div>
                  </div>
                  <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                ${p.description ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">${p.description}</p>` : ''}
              </div>

              <div style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Price (${marginPct}% margin)</div>
                  <div style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 800; color: var(--primary);">
                    ${formatCurrency(p.price)}
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="btn ${p.isOnlineVisible !== false ? 'btn-success' : 'btn-outline'} btn-sm" onclick="window.iKhataStore.toggleProductOnlineVisibility('${p.id}'); window.iKhataUI.refresh();" title="Toggle visibility on Digital Storefront">
                    ${p.isOnlineVisible !== false ? '🌐 Online' : '⚪ Hidden'}
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="window.iKhataUI.openRestockModal('${p.id}')">
                    📦 Restock
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
};
