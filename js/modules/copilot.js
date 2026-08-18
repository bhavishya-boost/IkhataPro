/* iKhataPro AI Business Copilot Drawer — Phase 4 Data-Grounded & Action-Safe */

window.iKhataCopilot = {
  isOpen: false,
  messages: [
    { sender: 'ai', text: 'Namaste! I am your **iKhataPro Business Copilot**. Ask me anything about your shop sales, pending collections, low stock, profits, or type in plain language like *"Rahul se 5000 rupees aaye"*.' }
  ],

  toggle() {
    this.isOpen = !this.isOpen;
    const drawer = document.getElementById('ai-copilot-drawer');
    if (drawer) {
      if (this.isOpen) drawer.classList.add('open');
      else drawer.classList.remove('open');
    }
  },

  sendMessage(userText) {
    if (!userText || !userText.trim()) return;
    const text = userText.trim();
    this.messages.push({ sender: 'user', text });
    this.renderMessages();

    setTimeout(() => {
      // Check RBAC permission for AI Assistant
      if (!window.iKhataStore.checkFeatureLimit('AI_ASSISTANT')) {
        this.messages.push({
          sender: 'ai',
          text: '🔒 **AI Business Copilot** is a **Pro / Enterprise** feature. Please upgrade your business plan in Settings to unlock AI intelligence.'
        });
        this.renderMessages();
        return;
      }

      const result = window.iKhataIntelligence ? window.iKhataIntelligence.answerQuery(text) : { text: this.parseQueryFallback(text) };
      let formattedText = typeof result === 'string' ? result : result.text;
      
      // Convert markdown **bold** to HTML safely
      formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

      if (result.actionButton) {
        formattedText += `<br><br>${result.actionButton}`;
      }

      this.messages.push({ sender: 'ai', text: formattedText });
      this.renderMessages();
    }, 300);
  },

  // Explicit AI Action Safety Confirmation Dialog
  requestActionConfirmation(actionTitle, actionDetails, onConfirmCallback) {
    window.iKhataUI.openModal(`⚠️ Confirm Financial Action: ${actionTitle}`, `
      <div style="padding: 10px 0;">
        <div style="background: var(--warning-light); border: 1px solid var(--warning-border); padding: 12px; border-radius: 8px; font-size: 0.88rem; margin-bottom: 16px;">
          <strong>Security Safeguard:</strong> iKhataPro requires explicit confirmation before executing financial transactions suggested by AI.
        </div>
        <div style="font-size: 0.95rem; margin-bottom: 20px;">
          ${actionDetails}
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn btn-outline" onclick="window.iKhataUI.closeModal()">Cancel</button>
          <button class="btn btn-success" id="ai-confirm-btn">✅ Confirm & Save</button>
        </div>
      </div>
    `);

    setTimeout(() => {
      const btn = document.getElementById('ai-confirm-btn');
      if (btn) {
        btn.onclick = () => {
          window.iKhataUI.closeModal();
          onConfirmCallback();
        };
      }
    }, 100);
  },

  parseQueryFallback(input) {
    const bus = window.iKhataStore.getCurrentBusiness();
    return `Evaluated business state for "${input}". Total Receivables: ₹${(bus.toReceiveTotal || 0).toLocaleString('en-IN')}`;
  },

  renderMessages() {
    const container = document.getElementById('copilot-messages');
    if (!container) return;

    container.innerHTML = this.messages.map(m => `
      <div class="chat-bubble ${m.sender}">
        ${m.text}
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }
};
