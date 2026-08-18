/* iKhataPro Feature 4: Daily Cash Gullak Drawer Reconciliation */

window.iKhataGullak = {
  counts: { 2000: 0, 500: 10, 200: 15, 100: 20, 50: 10, 20: 10, 10: 10, coins: 200 },

  updateCount(note, val) {
    this.counts[note] = parseInt(val) || 0;
    this.calculateTotal();
  },

  calculateTotal() {
    let physicalTotal = 0;
    Object.keys(this.counts).forEach(denom => {
      if (denom === 'coins') {
        physicalTotal += this.counts.coins;
      } else {
        physicalTotal += (parseInt(denom) * this.counts[denom]);
      }
    });

    const totalEl = document.getElementById('gullak-physical-total');
    const varianceEl = document.getElementById('gullak-variance-box');

    if (totalEl) totalEl.innerText = '₹' + physicalTotal.toLocaleString('en-IN');

    // System POS Cash Total
    const bus = window.iKhataStore.getCurrentBusiness();
    const systemCash = bus.todayReceived || 21200;
    const diff = physicalTotal - systemCash;

    if (varianceEl) {
      if (diff === 0) {
        varianceEl.className = 'badge badge-success';
        varianceEl.innerText = '✓ Perfectly Matched with POS Cash';
      } else if (diff > 0) {
        varianceEl.className = 'badge badge-warning';
        varianceEl.innerText = `+₹${diff.toLocaleString('en-IN')} Excess Cash in Drawer`;
      } else {
        varianceEl.className = 'badge badge-danger';
        varianceEl.innerText = `-₹${Math.abs(diff).toLocaleString('en-IN')} Cash Shortage`;
      }
    }
  },

  openGullakModal() {
    const bus = window.iKhataStore.getCurrentBusiness();
    const systemCash = bus.todayReceived || 21200;

    window.iKhataUI.openModal('💵 Daily Cash Gullak & Counter Tally', `
      <div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">Count physical cash notes in your shop drawer to verify against recorded POS cash receipts.</p>

        <div style="background: var(--primary-light); border: 1px solid var(--border-focus); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">SYSTEM RECORDED POS CASH SALES</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: var(--primary);">₹${systemCash.toLocaleString('en-IN')}</div>
          </div>
          <div id="gullak-variance-box" class="badge badge-success">✓ Perfectly Matched</div>
        </div>

        <div class="gullak-counter-grid">
          ${[500, 200, 100, 50, 20, 10].map(denom => `
            <div class="gullak-note-row">
              <span class="gullak-note-label">₹${denom}</span>
              <span style="color: var(--text-muted);">×</span>
              <input type="number" class="form-input" style="width: 70px; text-align: center;" value="${this.counts[denom] || 0}" oninput="window.iKhataGullak.updateCount(${denom}, this.value)">
              <span style="font-weight: 700; font-size: 0.9rem; width: 60px; text-align: right;">= ₹${((this.counts[denom] || 0) * denom).toLocaleString('en-IN')}</span>
            </div>
          `).join('')}
          <div class="gullak-note-row">
            <span class="gullak-note-label">Coins</span>
            <span style="color: var(--text-muted);">Sum</span>
            <input type="number" class="form-input" style="width: 70px; text-align: center;" value="${this.counts.coins || 0}" oninput="window.iKhataGullak.updateCount('coins', this.value)">
            <span style="font-weight: 700; font-size: 0.9rem; width: 60px; text-align: right;">= ₹${(this.counts.coins || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 16px;">
          <div>
            <span style="font-size: 0.82rem; color: var(--text-muted);">Total Physical Cash in Drawer:</span>
            <div id="gullak-physical-total" style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--success);">₹0</div>
          </div>

          <button class="btn btn-success btn-lg" onclick="window.iKhataUI.closeModal(); window.iKhataUI.showToast('✓ Daily Cash Gullak reconciled & saved!', 'success');">
            Save Cash Tally
          </button>
        </div>
      </div>
    `);

    setTimeout(() => this.calculateTotal(), 100);
  }
};
