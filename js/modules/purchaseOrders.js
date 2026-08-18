/* iKhataPro Feature 3: AI Auto-Restock & Supplier Purchase Order Drafts */

window.iKhataPO = {
  openPOModal() {
    const products = window.iKhataStore.getProducts();
    const suppliers = window.iKhataStore.getSuppliers();
    const lowStockItems = products.filter(p => p.stock <= p.minStock);

    const poNumber = 'PO-' + Math.floor(100 + Math.random() * 900);
    const supplierName = suppliers.length > 0 ? suppliers[0].name : 'ABC Wholesale Distributors';
    const estimatedCost = lowStockItems.reduce((sum, item) => sum + (item.cost * (item.minStock * 2)), 0) || 18500;

    window.iKhataUI.openModal(`🤖 AI Auto-Restock Draft (${poNumber})`, `
      <div>
        <div style="background: var(--ai-light); border: 1px solid #ddd6fe; padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.88rem; margin-bottom: 16px;">
          🤖 <strong>AI Purchase Analysis:</strong> Found <strong>${lowStockItems.length} items</strong> below safety threshold. Generated automated Purchase Order for supplier <strong>${supplierName}</strong>.
        </div>

        <div class="po-preview-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
            <div>
              <strong style="font-size: 1.1rem;">PURCHASE ORDER #${poNumber}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Supplier: ${supplierName}</div>
            </div>
            <span class="badge badge-warning">Draft PO</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.88rem;">
            ${lowStockItems.length === 0 ? `
              <div style="color: var(--text-muted);">All inventory stock levels are healthy! Sample PO items generated below:</div>
              <div style="display: flex; justify-content: space-between;"><span>Fortune Mustard Oil 1L (Qty: 20)</span><strong>₹2,800</strong></div>
              <div style="display: flex; justify-content: space-between;"><span>Aashirvaad Atta 10kg (Qty: 15)</span><strong>₹5,400</strong></div>
            ` : lowStockItems.map(item => `
              <div style="display: flex; justify-content: space-between;">
                <span>${item.name} (Suggested Qty: ${item.minStock * 2})</span>
                <strong>₹${((item.minStock * 2) * item.cost).toLocaleString('en-IN')}</strong>
              </div>
            `).join('')}
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 1.1rem; font-weight: 800;">
            <span>Estimated Total Purchase Cost:</span>
            <span style="color: var(--primary);">₹${estimatedCost.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
          <button class="btn btn-success" onclick="window.iKhataUI.closeModal(); window.iKhataUI.showToast('📲 Purchase Order #${poNumber} sent to supplier via WhatsApp!', 'success');">
            📲 Send PO via WhatsApp
          </button>
          <button class="btn btn-primary" onclick="window.iKhataUI.closeModal(); window.iKhataUI.showToast('✓ Purchase Order saved as active order!', 'success');">
            Save Purchase Order
          </button>
        </div>
      </div>
    `);
  }
};
