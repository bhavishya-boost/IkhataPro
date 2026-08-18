/* iKhataPro Voice Khata Module (Intelligent Hindi/Hinglish Customer & Entry Parser) */

window.iKhataVoice = {
  isListening: false,

  startListening() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.simulateVoiceInput();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Hindi / Hinglish voice recognition

    window.iKhataUI.showToast('🎙️ Listening... Speak command now (e.g. "Bhavishya se 5000 rupees aaye")', 'info');

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      this.processVoiceCommand(text);
    };

    recognition.onerror = () => {
      this.simulateVoiceInput();
    };

    recognition.start();
  },

  simulateVoiceInput() {
    window.iKhataUI.openModal('🎙️ Voice Khata Command', `
      <div style="text-align: center; padding: 12px 0;">
        <div style="font-size: 3rem; margin-bottom: 8px; animation: pulse 1.5s infinite;">🎙️</div>
        <h3>Voice Khata Intelligence</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem;">Speak or type your entry (e.g. <em>"Bhavishya se 5000 rupees aaye"</em> or <em>"Rahul ko 2000 diye"</em>)</p>
        
        <div style="margin-top: 16px;">
          <input type="text" id="voice-sim-input" class="form-input" placeholder="Type command..." value="Bhavishya se 5000 rupees aaye">
          <button class="btn btn-ai" style="width: 100%; margin-top: 12px;" onclick="const text = document.getElementById('voice-sim-input').value; window.iKhataUI.closeModal(); window.iKhataVoice.processVoiceCommand(text);">
            Process Voice Entry →
          </button>
        </div>
      </div>
    `);
  },

  processVoiceCommand(spokenText) {
    if (!spokenText || !spokenText.trim()) return;

    const parsed = this.parseHinglishText(spokenText);
    this.showVoiceConfirmationModal(spokenText, parsed);
  },

  parseHinglishText(text) {
    const raw = text.toLowerCase().trim();
    const customers = window.iKhataStore.getCustomers();

    // 1. Amount Extraction
    let amount = 0;
    const numMatch = raw.match(/\d[\d,.]*/);
    if (numMatch) {
      amount = parseFloat(numMatch[0].replace(/,/g, '')) || 0;
    }

    // 2. Transaction Type Determination (I GOT vs I GAVE)
    // Got keywords: aaye, mile, mila, pay kiya, received, mil gaye
    // Gave keywords: diye, diya, bheja, bheje, credit, udhar
    let type = 'GOT'; // Default
    if (raw.includes('diye') || raw.includes('diya') || raw.includes('bheja') || raw.includes('bheje') || raw.includes('udhar') || raw.includes('credit')) {
      // Check if "se ... diye" (e.g. Bhavishya se 5000 aaye vs Bhavishya ko 2000 diye)
      if (raw.includes(' ko ') || raw.includes('ko ')) {
        type = 'GAVE';
      } else if (raw.includes(' se ') || raw.includes('se ')) {
        type = 'GOT';
      } else {
        type = 'GAVE';
      }
    } else if (raw.includes('aaye') || raw.includes('mile') || raw.includes('mila') || raw.includes('got') || raw.includes('pay')) {
      type = 'GOT';
    }

    // 3. Customer Name Extraction
    let customerName = '';
    let matchedCustomer = null;

    // Try matching existing shop customer names first
    for (const c of customers) {
      const firstName = c.name.toLowerCase().split(' ')[0];
      if (raw.includes(c.name.toLowerCase()) || raw.includes(firstName)) {
        matchedCustomer = c;
        customerName = c.name;
        break;
      }
    }

    // If no existing customer matched, extract word before 'se' or 'ko'
    if (!matchedCustomer) {
      const parts = raw.split(/\s+(se|ko|ne)\s+/);
      if (parts.length > 0 && parts[0].trim()) {
        // Capitalize customer name
        const rawName = parts[0].trim().replace(/^(aaj|kal|please|bhaiya)\s+/g, '');
        customerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      } else {
        customerName = 'Bhavishya';
      }
    }

    return {
      customerName,
      matchedCustomer,
      type,
      amount,
      note: `Voice Entry: "${text}"`
    };
  },

  showVoiceConfirmationModal(spokenText, parsed) {
    const isNewCustomer = !parsed.matchedCustomer;

    window.iKhataUI.openModal('🎙️ Voice Khata Entry Confirmation', `
      <div>
        <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.88rem; margin-bottom: 16px;">
          Spoken Command: <em>"${spokenText}"</em>
        </div>

        <div style="border: 2px solid var(--border-focus); border-radius: var(--radius-lg); padding: 20px; background: white; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">PARSED CUSTOMER</div>
              <strong style="font-size: 1.3rem;">${parsed.customerName}</strong>
              ${isNewCustomer ? '<span class="badge badge-warning" style="margin-left: 8px;">New Customer</span>' : '<span class="badge badge-success" style="margin-left: 8px;">Existing Customer</span>'}
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">ENTRY TYPE</div>
              <span class="badge ${parsed.type === 'GOT' ? 'badge-success' : 'badge-danger'}" style="font-size: 0.9rem;">
                ${parsed.type === 'GOT' ? 'I GOT (Payment Received)' : 'I GAVE (Money Given / Credit)'}
              </span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 8px;">
            <span style="font-size: 1rem; color: var(--text-muted);">Amount to Record:</span>
            <span style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; color: ${parsed.type === 'GOT' ? 'var(--success)' : 'var(--danger)'};">
              ₹${parsed.amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="btn btn-outline" style="flex: 1;" onclick="window.iKhataUI.closeModal()">
            Cancel
          </button>
          <button class="btn btn-ai btn-lg" style="flex: 2;" onclick="window.iKhataVoice.confirmAndSaveVoiceEntry('${parsed.customerName}', '${parsed.type}', ${parsed.amount}, '${parsed.matchedCustomer ? parsed.matchedCustomer.id : ''}')">
            Confirm & Save to ${parsed.customerName}'s Khata 🎉
          </button>
        </div>
      </div>
    `);
  },

  confirmAndSaveVoiceEntry(customerName, type, amount, existingCustId) {
    let custId = existingCustId;

    // Auto-create customer if new
    if (!custId) {
      const newCust = window.iKhataStore.addCustomer({
        name: customerName,
        phone: '+91 90000 00000',
        city: 'Mathura',
        initialBalance: 0
      });
      custId = newCust.id;
    }

    // Save Khata transaction
    const success = window.iKhataStore.addKhataTransaction({
      customerId: custId,
      type,
      amount,
      note: 'Added via Voice Khata'
    });

    if (success) {
      window.iKhataUI.closeModal();
      window.iKhataUI.showToast(`🎉 ₹${amount.toLocaleString('en-IN')} saved to ${customerName}'s Khata!`, 'success');
      // Directly open customer profile
      window.iKhataUI.openCustomerProfile(custId);
    }
  }
};
