/* iKhataPro Ultra-Accurate Voice Khata Engine (English & Hinglish Smart NLP Parser) */

window.iKhataVoice = {
  isListening: false,
  recognitionInstance: null,

  startListening() {
    this.openListeningModal();

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      const statusEl = document.getElementById('voice-live-status');
      if (statusEl) statusEl.innerHTML = '⚠️ Browser mic direct access not supported. Please type your voice command below:';
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    try {
      if (this.recognitionInstance) {
        try { this.recognitionInstance.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      this.recognitionInstance = recognition;
      
      // Use English (India) so speech-to-text outputs in English / Hinglish letters
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.continuous = false;

      const statusEl = document.getElementById('voice-live-status');
      const transcriptEl = document.getElementById('voice-live-transcript');
      const waveEl = document.getElementById('voice-wave-animation');

      recognition.onstart = () => {
        this.isListening = true;
        if (statusEl) statusEl.innerHTML = '<span style="color: var(--primary); font-weight: 700;">🎙️ Listening... Boliye!</span><br><span style="font-size: 0.8rem; color: var(--text-muted);">Jaise: <em>"Bhavishya se 2000 rupees mile"</em> ya <em>"Aryan ko 1500 udhar diya"</em></span>';
        if (waveEl) waveEl.style.display = 'flex';
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (transcriptEl && currentText) {
          transcriptEl.value = currentText;
          transcriptEl.style.borderColor = 'var(--primary)';
        }

        if (finalTranscript) {
          setTimeout(() => {
            this.processVoiceCommand(finalTranscript);
          }, 350);
        }
      };

      recognition.onerror = (e) => {
        this.isListening = false;
        if (statusEl) statusEl.innerHTML = '⚠️ Mic timeout. Niche diye gaye example par click karein ya type karein:';
        if (waveEl) waveEl.style.display = 'none';
      };

      recognition.onend = () => {
        this.isListening = false;
        if (waveEl) waveEl.style.display = 'none';
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      const statusEl = document.getElementById('voice-live-status');
      if (statusEl) statusEl.innerHTML = 'Boliye ya niche box me command type karein:';
    }
  },

  stopListening() {
    if (this.recognitionInstance) {
      try { this.recognitionInstance.abort(); } catch (e) {}
      this.recognitionInstance = null;
    }
    this.isListening = false;
  },

  openListeningModal() {
    window.iKhataUI.openModal('🎙️ AI Voice Khata Assistant', `
      <div style="text-align: center; padding: 10px 0;">
        
        <!-- Pulsing Wave Animation -->
        <div id="voice-wave-animation" style="display: flex; justify-content: center; align-items: center; gap: 6px; height: 60px; margin-bottom: 12px;">
          <span class="voice-bar" style="width: 6px; height: 25px; background: linear-gradient(to top, #6366f1, #a855f7); border-radius: 4px; animation: voiceWave 1s ease-in-out infinite;"></span>
          <span class="voice-bar" style="width: 6px; height: 45px; background: linear-gradient(to top, #6366f1, #a855f7); border-radius: 4px; animation: voiceWave 0.8s ease-in-out infinite 0.2s;"></span>
          <span class="voice-bar" style="width: 6px; height: 60px; background: linear-gradient(to top, #6366f1, #a855f7); border-radius: 4px; animation: voiceWave 1.1s ease-in-out infinite 0.4s;"></span>
          <span class="voice-bar" style="width: 6px; height: 35px; background: linear-gradient(to top, #6366f1, #a855f7); border-radius: 4px; animation: voiceWave 0.9s ease-in-out infinite 0.1s;"></span>
          <span class="voice-bar" style="width: 6px; height: 20px; background: linear-gradient(to top, #6366f1, #a855f7); border-radius: 4px; animation: voiceWave 1.2s ease-in-out infinite 0.3s;"></span>
        </div>

        <div id="voice-live-status" style="font-size: 0.95rem; margin-bottom: 14px; min-height: 42px; line-height: 1.4;">
          <span style="color: var(--primary); font-weight: 700;">🎙️ Listening... Boliye!</span><br>
          <span style="font-size: 0.82rem; color: var(--text-muted);">Boliye: <em>"Bhavishya se 2000 rupees mile"</em> ya <em>"Aryan ko 1500 udhar diya"</em></span>
        </div>
        
        <div style="margin-top: 8px;">
          <input type="text" id="voice-live-transcript" class="form-input" style="font-size: 1.1rem; font-weight: 600; text-align: center; border: 2px solid var(--border-color); background: var(--bg-main);" placeholder="Aapka bola gaya sentence yahan aayega..." value="Bhavishya se 2000 rupees mile">
          
          <div style="margin-top: 14px; font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Quick Test Examples:</div>
          <div style="display: flex; gap: 8px; justify-content: center; margin-top: 8px; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('voice-live-transcript').value='Bhavishya se 2000 rupees mile';">
              "Bhavishya se 2000 rupees mile"
            </button>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('voice-live-transcript').value='Shalini se 4000 rupees mile';">
              "Shalini se 4000 rupees mile"
            </button>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('voice-live-transcript').value='Aryan ko 1500 udhar diya';">
              "Aryan ko 1500 udhar diya"
            </button>
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('voice-live-transcript').value='Rahul se 5000 jama hue';">
              "Rahul se 5000 jama hue"
            </button>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 18px;">
            <button class="btn btn-outline" style="flex: 1;" onclick="window.iKhataVoice.stopListening(); window.iKhataUI.closeModal();">
              Cancel
            </button>
            <button class="btn btn-ai" style="flex: 2; font-size: 1rem; padding: 12px; justify-content: center;" onclick="const text = document.getElementById('voice-live-transcript').value; window.iKhataVoice.stopListening(); window.iKhataVoice.processVoiceCommand(text);">
              ⚡ Process & Auto-Save →
            </button>
          </div>
        </div>
      </div>
    `);
  },

  simulateVoiceInput() {
    this.startListening();
  },

  processVoiceCommand(spokenText) {
    if (!spokenText || !spokenText.trim()) return;

    this.stopListening();
    const parsed = this.parseHinglishText(spokenText);
    this.showVoiceConfirmationModal(spokenText, parsed);
  },

  // ─── DEVANAGARI TO ENGLISH TRANSLITERATION ─────────────────────────────────
  devanagariToEnglish(str) {
    if (!str) return '';
    let text = str;

    // Common Hindi names dictionary for exact spellings
    const namesDict = {
      'भविष्य': 'Bhavishya', 'शालिनी': 'Shalini', 'आर्यन': 'Aryan', 'राहुल': 'Rahul',
      'विकास': 'Vikas', 'अमन': 'Aman', 'रोहित': 'Rohit', 'अमित': 'Amit',
      'दीपक': 'Deepak', 'सुरेश': 'Suresh', 'रमेश': 'Ramesh', 'मोहित': 'Mohit',
      'सोनू': 'Sonu', 'मोनू': 'Monu', 'पूजा': 'Pooja', 'नेहा': 'Neha',
      'प्रिया': 'Priya', 'अंकित': 'Ankit', 'शुभम': 'Shubham', 'गौरव': 'Gaurav',
      'शर्मा': 'Sharma', 'वर्मा': 'Verma', 'गुप्ता': 'Gupta', 'सिंह': 'Singh'
    };

    for (const [hi, en] of Object.entries(namesDict)) {
      if (text.includes(hi)) text = text.split(hi).join(en);
    }

    const charMap = {
      'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ऋ':'ri','ए':'e','ऐ':'ai','ओ':'o','औ':'au',
      'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ng',
      'च':'ch','छ':'chh','ज':'j','झ':'jh','ञ':'ny',
      'ट':'t','ठ':'th','ड':'d','ढ':'dh','ण':'n',
      'त':'t','थ':'th','द':'d','ध':'dh','न':'n',
      'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m',
      'य':'y','र':'r','ल':'l','व':'v','श':'sh','ष':'sh','स':'s','ह':'h',
      'ा':'aa','ि':'i','ी':'ee','ु':'u','ू':'oo','ृ':'ri','े':'e','ै':'ai','ो':'o','ौ':'au',
      'ं':'n','ः':'h','्':'','ँ':'n','़':'','।':''
    };

    let res = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      res += charMap[ch] !== undefined ? charMap[ch] : ch;
    }
    return res;
  },

  // ─── AMOUNT CONVERTER (ROMAN & DEVANAGARI NUMBERS) ──────────────────────────
  parseAmountFromText(rawText) {
    let text = this.devanagariToEnglish(rawText).toLowerCase().trim();

    // Convert Devanagari numerals if any
    const devanagariDigits = {'०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9'};
    text = text.replace(/[०-९]/g, d => devanagariDigits[d] || d);

    // 1. Direct Regex for '2.5k', '5k'
    const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/);
    if (kMatch) {
      return Math.round(parseFloat(kMatch[1]) * 1000);
    }

    // 2. Direct numeric digits: e.g. "2000", "₹ 2000", "2,000", "1500"
    const digitMatch = text.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/);
    if (digitMatch) {
      const num = parseFloat(digitMatch[0].replace(/,/g, ''));
      if (num > 0) {
        if (text.includes('hazar') || text.includes('hazaar') || text.includes('thousand')) {
          if (num < 1000) return num * 1000;
        } else if (text.includes('lakh') || text.includes('lac')) {
          if (num < 100) return num * 100000;
        }
        return num;
      }
    }

    // 3. Spoken number words mapping
    const numberWords = {
      'ek': 1, 'do': 2, 'teen': 3, 'tin': 3, 'char': 4, 'chaar': 4, 'paanch': 5, 'panch': 5,
      'chhe': 6, 'che': 6, 'chheh': 6, 'saat': 7, 'sat': 7, 'aath': 8, 'ath': 8, 'nau': 9, 'no': 9,
      'das': 10, 'dus': 10, 'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14, 'pandrah': 15, 'pandra': 15,
      'solah': 16, 'satrah': 17, 'atharah': 18, 'unnis': 19, 'bees': 20, 'bis': 20,
      'pachees': 25, 'pachis': 25, 'tees': 30, 'paintees': 35, 'chalis': 40, 'chalees': 40,
      'pachaas': 50, 'pachas': 50, 'saath': 60, 'sattar': 70, 'assi': 80, 'nabbe': 90
    };

    let total = 0;
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const w = words[i].replace(/[^a-z]/g, '');

      if (w === 'dedh' && (words[i+1]?.includes('hazar') || words[i+1]?.includes('hazaar'))) return 1500;
      if (w === 'dedh' && words[i+1]?.includes('sau')) return 150;
      if (w === 'dhai' && (words[i+1]?.includes('hazar') || words[i+1]?.includes('hazaar'))) return 2500;
      if (w === 'dhai' && words[i+1]?.includes('sau')) return 250;

      if (numberWords[w] !== undefined) {
        let val = numberWords[w];
        const next = words[i+1]?.replace(/[^a-z]/g, '') || '';
        if (next === 'hazar' || next === 'hazaar' || next === 'thousand') {
          total += val * 1000;
          i++;
        } else if (next === 'sau' || next === 'hundred') {
          total += val * 100;
          i++;
        } else if (next === 'lakh' || next === 'lac') {
          total += val * 100000;
          i++;
        } else {
          total += val;
        }
      } else if (w === 'hazar' || w === 'hazaar' || w === 'thousand') {
        if (total === 0) total = 1000;
      } else if (w === 'sau' || w === 'hundred') {
        if (total === 0) total = 100;
      } else if (w === 'lakh') {
        if (total === 0) total = 100000;
      }
    }

    return total;
  },

  // ─── PURE ENGLISH CUSTOMER NAME EXTRACTOR ──────────────────────────────────
  extractCleanEnglishName(rawText) {
    let text = this.devanagariToEnglish(rawText);
    
    // Remove symbols, digits, punctuation, currency
    text = text.replace(/[₹$!?,।.\-_/\\#@%&*()+=:;"']/g, ' ');
    text = text.replace(/\d+/g, ' ');

    const stopWords = new Set([
      'se', 'ko', 'ne', 'ka', 'ki', 'ke', 'pe', 'par', 'me', 'mai', 'mein', 'to', 'from', 'for', 'of', 'in', 'at',
      'mile', 'mila', 'mili', 'miley', 'mil', 'gaya', 'gaye', 'gayi', 'aaye', 'aaya', 'aayi', 'aa',
      'diye', 'diya', 'diyi', 'de', 'do', 'dijiye', 'bheje', 'bheja', 'bheji', 'send',
      'udhar', 'udhaar', 'jama', 'credit', 'debit', 'advance', 'khata', 'khate', 'account', 'entry',
      'payment', 'pay', 'cash', 'gpay', 'phonepe', 'paytm', 'online', 'balance', 'praapt', 'prapt', 'hue', 'hua', 'huye',
      'bhaiya', 'bhai', 'sethji', 'shri', 'shree', 'ji', 'sir', 'madam', 'mr', 'mrs',
      'please', 'likho', 'likh', 'likhdo', 'karo', 'kar', 'kardo', 'daal', 'daaldo', 'save',
      'hazar', 'hazaar', 'sau', 'dedh', 'dhai', 'lakh', 'thousand', 'hundred', 'lakhs', 'k',
      'aaj', 'kal', 'parso', 'today', 'yesterday', 'now', 'received', 'got', 'gave', 'given',
      'tha', 'the', 'thi', 'hai', 'hain', 'bhi', 'aur', 'and', 'with', 'rupaye', 'rupees', 'ruppes', 'rupya', 'rs', 'inr'
    ]);

    const words = text.toLowerCase().split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));
    if (words.length === 0) return 'Customer';
    
    // Capitalize each name token (e.g. "Bhavishya" or "Bhavishya Sharma")
    return words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  },

  // ─── ACCURATE HINGLISH NLP PARSER ─────────────────────────────────────────
  parseHinglishText(text) {
    const rawEnglish = this.devanagariToEnglish(text).toLowerCase().trim();
    const customers = window.iKhataStore ? (window.iKhataStore.getCustomers() || []) : [];

    // 1. Extract Amount
    const amount = this.parseAmountFromText(text) || 0;

    // 2. Transaction Type Determination (GOT = Jama / Received | GAVE = Udhar / Given)
    let type = 'GOT'; // Default assumption

    // Strong GAVE (Udhar) keywords
    const gaveKeywords = [
      'udhar', 'udhaar', 'credit', 'baaki', 'baki',
      'saman diya', 'maal diya', 'diya tha', 'diye the',
      'ko diye', 'ko diya', 'ko de do', 'ko bheje', 'ko bheja',
      'ko likho', 'ko khata', 'ke khate me daalo', 'ke naam pe likho'
    ];

    // Strong GOT (Jama / Payment) keywords
    const gotKeywords = [
      'mile', 'mila', 'mil gaya', 'mil gaye', 'prapt',
      'aaye', 'aaya', 'aa gaye',
      'jama', 'jama hua', 'jama hue', 'jama kiye',
      'pay kiya', 'payment mila', 'received', 'chuka diya', 'vaapas diya', 'wapas kiya',
      'se mile', 'se mila', 'se aaye', 'se jama',
      'ne diye', 'ne diya', 'ne pay kiya'
    ];

    const hasGave = gaveKeywords.some(k => rawEnglish.includes(k));
    const hasGot = gotKeywords.some(k => rawEnglish.includes(k));

    if (hasGave && !hasGot) {
      type = 'GAVE';
    } else if (hasGot && !hasGave) {
      type = 'GOT';
    } else if (rawEnglish.includes(' ko ') || rawEnglish.includes('ko ')) {
      type = 'GAVE';
    } else if (rawEnglish.includes(' se ') || rawEnglish.includes('se ') || rawEnglish.includes(' ne ') || rawEnglish.includes('ne ')) {
      type = 'GOT';
    }

    // 3. Extract Clean English Name
    let customerName = this.extractCleanEnglishName(text);
    let matchedCustomer = null;

    // 4. Search in existing customer database (case-insensitive)
    for (const c of customers) {
      const cFullName = (c.name || '').toLowerCase().trim();
      const cFirstName = cFullName.split(' ')[0];
      const parsedLower = customerName.toLowerCase();

      if (cFullName === parsedLower || cFirstName === parsedLower || cFullName.includes(parsedLower) || parsedLower.includes(cFirstName)) {
        matchedCustomer = c;
        customerName = c.name;
        break;
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
    const speechType = parsed.type === 'GOT' ? 'Jama' : 'Udhar';
    this.speakVoiceFeedback(`${parsed.customerName}, ${parsed.amount} rupaye ${speechType}`);

    window.iKhataUI.openModal('🎙️ Voice Khata — Confirm & Save', `
      <div>
        <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.88rem; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
          <span>🗣️</span> <span>Aapne Bola: <strong>"${spokenText}"</strong></span>
        </div>

        <div style="border: 2px solid ${parsed.type === 'GOT' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}; border-radius: var(--radius-lg); padding: 18px; background: var(--bg-surface); margin-bottom: 18px;">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="flex: 1; min-width: 180px;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">CUSTOMER NAME (ENGLISH)</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <input id="voice-cust-name-edit" type="text" class="form-input" style="font-size: 1.2rem; font-weight: 800; padding: 6px 10px; width: 100%; max-width: 220px;" value="${parsed.customerName}">
              </div>
              <div style="margin-top: 6px;">
                ${isNewCustomer 
                  ? '<span class="badge badge-warning" style="font-size: 0.75rem; padding: 3px 8px;">✨ Naya Khata Banega (Auto-Create)</span>' 
                  : '<span class="badge badge-success" style="font-size: 0.75rem; padding: 3px 8px;">✓ Registered Customer Found</span>'}
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">ENTRY TYPE</div>
              <select id="voice-type-edit" class="form-select" style="font-weight: 700; font-size: 0.95rem; color: ${parsed.type === 'GOT' ? '#16a34a' : '#ef4444'}; margin-top: 4px; padding: 6px 10px;">
                <option value="GOT" ${parsed.type === 'GOT' ? 'selected' : ''}>🟢 I GOT (Jama / Payment Mila)</option>
                <option value="GAVE" ${parsed.type === 'GAVE' ? 'selected' : ''}>🔴 I GAVE (Udhar / Sales Diya)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 14px; margin-top: 10px;">
            <div>
              <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 600;">Transaction Amount:</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 1.6rem; font-weight: 800; color: ${parsed.type === 'GOT' ? 'var(--success)' : 'var(--danger)'};">₹</span>
              <input id="voice-amount-edit" type="number" class="form-input" style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: ${parsed.type === 'GOT' ? 'var(--success)' : 'var(--danger)'}; width: 140px; text-align: right;" value="${parsed.amount}">
            </div>
          </div>

          ${isNewCustomer ? `
            <div style="margin-top: 14px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.85rem; color: #b45309; line-height: 1.4;">
              💡 <strong>${parsed.customerName}</strong> ka naya khata English me automatically create ho jayega aur usme ₹${parsed.amount.toLocaleString('en-IN')} ki entry jud jayegi.
            </div>
          ` : `
            <div style="margin-top: 14px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 0.85rem; color: #15803d; line-height: 1.4;">
              ✓ Existing registered customer mil gaya: <strong>${parsed.matchedCustomer.name}</strong><br>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Current Balance: <strong>₹${(parsed.matchedCustomer.balance || 0).toLocaleString('en-IN')}</strong></span>
            </div>
          `}
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="btn btn-outline" style="flex: 1;" onclick="window.iKhataUI.closeModal()">
            Cancel
          </button>
          <button class="btn btn-primary btn-lg" style="flex: 2; justify-content: center; font-size: 1rem;" onclick="window.iKhataVoice.submitConfirmedEntry('${parsed.matchedCustomer ? parsed.matchedCustomer.id : ''}')">
            ✓ Haan, Khate me Save Karein 🎉
          </button>
        </div>
      </div>
    `);
  },

  submitConfirmedEntry(existingCustId) {
    const nameInput = document.getElementById('voice-cust-name-edit');
    const typeInput = document.getElementById('voice-type-edit');
    const amountInput = document.getElementById('voice-amount-edit');

    const customerName = nameInput ? nameInput.value.trim() : 'Customer';
    const type = typeInput ? typeInput.value : 'GOT';
    const amount = parseFloat(amountInput ? amountInput.value : 0) || 0;

    if (!customerName || amount <= 0) {
      window.iKhataUI.showToast('❌ Please enter a valid Customer Name and Amount!', 'error');
      return;
    }

    this.confirmAndSaveVoiceEntry(customerName, type, amount, existingCustId);
  },

  confirmAndSaveVoiceEntry(customerName, type, amount, existingCustId) {
    let custId = existingCustId;
    const customers = window.iKhataStore ? (window.iKhataStore.getCustomers() || []) : [];

    // Re-verify if customer with this exact name already exists in store
    if (!custId) {
      const existing = customers.find(c => c.name.toLowerCase().trim() === customerName.toLowerCase().trim());
      if (existing) {
        custId = existing.id;
      }
    }

    // Auto-create customer in English if still not found
    if (!custId) {
      const newCust = window.iKhataStore.addCustomer({
        name: customerName,
        phone: '',
        city: 'Local',
        category: 'Regular',
        initialBalance: 0
      });
      custId = newCust ? newCust.id : null;
    }

    if (!custId) {
      window.iKhataUI.showToast('❌ Error finding or creating customer khata.', 'error');
      return;
    }

    // Save Khata transaction to customer ledger
    const success = window.iKhataStore.addKhataTransaction({
      customerId: custId,
      type: type,
      amount: amount,
      note: `Voice Khata: ${type === 'GOT' ? 'Payment Received (Jama)' : 'Money Given (Udhar)'}`,
      mode: type === 'GOT' ? 'Cash / UPI' : 'Credit/Khata'
    });

    if (success) {
      window.iKhataUI.closeModal();

      const typeLabel = type === 'GOT' ? 'Jama (Received)' : 'Udhar (Given)';
      window.iKhataUI.showToast(`🎉 ${customerName} ke khate me ₹${amount.toLocaleString('en-IN')} ${typeLabel} save ho gaye!`, 'success');

      // Voice Audio confirmation
      const voiceSpeech = `${customerName} ke khate me ${amount} rupaye ${type === 'GOT' ? 'Jama' : 'Udhar'} darj ho gaye hain.`;
      this.speakVoiceFeedback(voiceSpeech);

      // Open Customer profile directly so user sees the updated ledger
      if (window.iKhataUI && typeof window.iKhataUI.openCustomerProfile === 'function') {
        window.iKhataUI.openCustomerProfile(custId);
      } else if (window.iKhataUI && typeof window.iKhataUI.refresh === 'function') {
        window.iKhataUI.refresh();
      }
    }
  },

  speakVoiceFeedback(text) {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hi-IN';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Silently catch speech synthesis limitations
      }
    }
  }
};



