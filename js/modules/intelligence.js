/* iKhataPro Intelligence Engine — Phase 3
   Data-grounded AI Business Assistant + Health Score + Smart Alerts + Receivables Aging
   ALL answers computed from actual tenant data. ZERO hallucination.
*/

window.iKhataIntelligence = {

  // ─── BUSINESS HEALTH SCORE ──────────────────────────────────────────────────
  // Score: 100 points. Documented deductions below.
  computeBusinessHealth() {
    const bus = window.iKhataStore.getCurrentBusiness();
    const customers = window.iKhataStore.getCustomers();
    const products = window.iKhataStore.getProducts();
    const expenses = window.iKhataStore.getExpenses();
    const bills = window.iKhataStore.getBills();
    const invoices = window.iKhataStore.getInvoices();

    const today = new Date();
    const pnl = window.iKhataStore.getFinancialPNL('THIS_MONTH');

    let score = 100;
    const positives = [];
    const risks = [];
    const improvements = [];

    // 1. Receivables Risk: customers with balance>5000 and no activity in 60+ days (-20)
    const atRiskCust = customers.filter(c => c.balance > 5000 && (c.daysSinceLastActivity || 0) > 60);
    if (atRiskCust.length >= 3) {
      score -= 20;
      risks.push(`${atRiskCust.length} customers with high overdue balances (60+ days). Total at risk: ₹${atRiskCust.reduce((s,c)=>s+c.balance,0).toLocaleString('en-IN')}`);
      improvements.push('Follow up on overdue customers immediately to improve cash flow.');
    } else if (atRiskCust.length >= 1) {
      score -= 10;
      risks.push(`${atRiskCust.length} customer(s) have overdue balances beyond 60 days.`);
    } else {
      positives.push('No high-risk overdue customers — collections are healthy!');
    }

    // 2. Gross Margin: below 20% is concerning (-15)
    const grossMargin = pnl.grossMarginPct || 0;
    if (grossMargin > 0 && grossMargin < 15) {
      score -= 15;
      risks.push(`Gross margin is very low (${grossMargin}%). Costs are eating into profits.`);
      improvements.push('Review product pricing and negotiate better purchase rates.');
    } else if (grossMargin >= 15 && grossMargin < 25) {
      score -= 7;
      risks.push(`Gross margin (${grossMargin}%) is below ideal. Consider pricing review.`);
    } else if (grossMargin >= 25) {
      positives.push(`Strong gross margin of ${grossMargin}% — pricing is healthy.`);
    }

    // 3. Out of stock products (-10)
    const outOfStock = products.filter(p => p.stock === 0);
    const lowStockPct = products.length > 0 ? (products.filter(p => p.stock <= (p.minStock||0) && p.stock > 0).length / products.length) : 0;
    if (outOfStock.length > 3) {
      score -= 10;
      risks.push(`${outOfStock.length} products are out of stock — you may be losing sales.`);
      improvements.push('Reorder out-of-stock products urgently or contact suppliers.');
    } else if (outOfStock.length > 0) {
      score -= 5;
      risks.push(`${outOfStock.length} product(s) out of stock.`);
    } else {
      positives.push('All products are in stock — inventory is healthy.');
    }

    // 4. Expense ratio (expenses / revenue > 40% is risky) (-10)
    const revenue = pnl.netSales || 1;
    const expRatio = revenue > 0 ? Math.round((pnl.operatingExpenses / revenue) * 100) : 0;
    if (expRatio > 50) {
      score -= 10;
      risks.push(`Expense ratio is high at ${expRatio}% of revenue. Operating costs are very high.`);
      improvements.push('Audit recurring expenses and identify cost-saving opportunities.');
    } else if (expRatio > 35) {
      score -= 5;
      risks.push(`Expense ratio is ${expRatio}% — slightly elevated.`);
    } else if (pnl.operatingExpenses > 0) {
      positives.push(`Expense ratio is a healthy ${expRatio}% of revenue.`);
    }

    // 5. Sales activity: no bills in last 7 days (-15)
    const sevenDaysAgo = new Date(today - 7 * 86400000).toISOString().split('T')[0];
    const recentBills = bills.filter(b => b.date >= sevenDaysAgo);
    if (recentBills.length === 0) {
      score -= 15;
      risks.push('No POS sales recorded in the last 7 days. Business may be stagnant.');
      improvements.push('Consider promotions or outreach to drive sales activity.');
    } else if (recentBills.length < 3) {
      score -= 5;
      risks.push('Low sales activity in the past 7 days.');
    } else {
      positives.push(`Active sales — ${recentBills.length} bills recorded in the last 7 days.`);
    }

    // 6. Bad debt customers (-10)
    const badDebtCount = customers.filter(c => c.isBadDebt).length;
    if (badDebtCount > 0) {
      score -= 10;
      risks.push(`${badDebtCount} customer(s) marked as bad debt / credit frozen.`);
    }

    // 7. Overdue invoices (-5)
    const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
    if (overdueInvoices.length > 0) {
      score -= 5;
      risks.push(`${overdueInvoices.length} invoice(s) are overdue and unpaid.`);
    } else if (invoices.length > 0) {
      positives.push('No overdue invoices — great billing management!');
    }

    // 8. Net profit this month
    if (pnl.netProfit > 0) {
      positives.push(`Net profit this month: ₹${pnl.netProfit.toLocaleString('en-IN')} — business is profitable.`);
    } else if (pnl.netProfit < 0) {
      score -= 10;
      risks.push(`Business is running at a net loss of ₹${Math.abs(pnl.netProfit).toLocaleString('en-IN')} this month.`);
    }

    score = Math.max(0, Math.min(100, score));

    let label, color;
    if (score >= 80) { label = 'Excellent'; color = '#059669'; }
    else if (score >= 65) { label = 'Healthy'; color = '#16a34a'; }
    else if (score >= 50) { label = 'Moderate'; color = '#d97706'; }
    else if (score >= 35) { label = 'At Risk'; color = '#dc2626'; }
    else { label = 'Critical'; color = '#991b1b'; }

    return { score, label, color, positives, risks, improvements };
  },

  // ─── SMART ALERTS ───────────────────────────────────────────────────────────
  generateAlerts() {
    const alerts = [];
    const customers = window.iKhataStore.getCustomers();
    const products = window.iKhataStore.getProducts();
    const bills = window.iKhataStore.getBills();
    const invoices = window.iKhataStore.getInvoices();
    const pnl = window.iKhataStore.getFinancialPNL('THIS_MONTH');
    const prevPnl = window.iKhataStore.getFinancialPNL('ALL');

    // 🔴 Critical overdue customers
    const criticalOverdue = customers.filter(c => c.balance > 5000 && (c.daysSinceLastActivity||0) > 60);
    if (criticalOverdue.length > 0) {
      const totalAmt = criticalOverdue.reduce((s,c)=>s+c.balance, 0);
      alerts.push({ priority: 'critical', icon: '🔴', text: `₹${totalAmt.toLocaleString('en-IN')} overdue from ${criticalOverdue.length} customer(s) for 60+ days.`, action: 'follow-up', actionLabel: 'View Follow-Up List', route: 'khata' });
    }

    // 🔴 Out of stock products
    const outOfStock = products.filter(p => p.stock === 0);
    if (outOfStock.length > 0) {
      alerts.push({ priority: 'critical', icon: '🔴', text: `${outOfStock.length} product(s) are out of stock: ${outOfStock.slice(0,2).map(p=>p.name).join(', ')}${outOfStock.length > 2 ? ` + ${outOfStock.length - 2} more` : ''}.`, action: 'navigate', actionLabel: 'Restock Now', route: 'inventory' });
    }

    // 🔴 Overdue invoices
    const overdueInvs = invoices.filter(i => i.status === 'Overdue');
    if (overdueInvs.length > 0) {
      const overdueAmt = overdueInvs.reduce((s,i)=>s+(i.total||0),0);
      alerts.push({ priority: 'critical', icon: '🔴', text: `${overdueInvs.length} invoice(s) overdue — ₹${overdueAmt.toLocaleString('en-IN')} pending collection.`, action: 'navigate', actionLabel: 'View Invoices', route: 'invoices' });
    }

    // 🟠 Low stock warnings
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.minStock||0));
    if (lowStock.length > 0) {
      alerts.push({ priority: 'warning', icon: '🟠', text: `${lowStock.length} product(s) are running low on stock: ${lowStock.slice(0,2).map(p=>`${p.name} (${p.stock} left)`).join(', ')}.`, action: 'navigate', actionLabel: 'View Inventory', route: 'inventory' });
    }

    // 🟠 Bad debt customers
    const badDebt = customers.filter(c => c.isBadDebt);
    if (badDebt.length > 0) {
      alerts.push({ priority: 'warning', icon: '🟠', text: `${badDebt.length} customer(s) marked as bad debt with credit frozen.`, action: 'navigate', actionLabel: 'View Khata', route: 'khata' });
    }

    // 🟠 Month net loss
    if (pnl.netProfit < 0) {
      alerts.push({ priority: 'warning', icon: '🟠', text: `Business is running at a net loss of ₹${Math.abs(pnl.netProfit).toLocaleString('en-IN')} this month. Review expenses.`, action: 'navigate', actionLabel: 'View P&L', route: 'pnl' });
    }

    // 🟢 Positive: Recent collections
    const today = new Date().toISOString().split('T')[0];
    const todayGOT = window.iKhataStore.getTransactions().filter(t => t.type === 'GOT' && t.date === today);
    if (todayGOT.length > 0) {
      const collected = todayGOT.reduce((s,t)=>s+(t.amount||0), 0);
      alerts.push({ priority: 'positive', icon: '🟢', text: `Today's collections: ₹${collected.toLocaleString('en-IN')} received from ${todayGOT.length} payment(s).`, action: null });
    }

    // 🟢 Positive profit
    if (pnl.netProfit > 0) {
      alerts.push({ priority: 'positive', icon: '🟢', text: `This month's net profit: ₹${pnl.netProfit.toLocaleString('en-IN')} with ${pnl.grossMarginPct}% gross margin.`, action: 'navigate', actionLabel: 'View P&L', route: 'pnl' });
    }

    // 🔵 New customers this week
    const sevenDaysAgo = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
    const newCusts = customers.filter(c => c.category === 'New');
    if (newCusts.length > 0) {
      alerts.push({ priority: 'info', icon: '🔵', text: `${newCusts.length} new customer(s) added recently: ${newCusts.slice(0,2).map(c=>c.name).join(', ')}.`, action: null });
    }

    return alerts.sort((a,b) => {
      const order = { critical: 0, warning: 1, positive: 2, info: 3 };
      return (order[a.priority]||3) - (order[b.priority]||3);
    });
  },

  // ─── RECEIVABLES AGING ─────────────────────────────────────────────────────
  computeReceivablesAging() {
    const customers = window.iKhataStore.getCustomers().filter(c => c.balance > 0);
    const buckets = { current: [], watch: [], atRisk: [], critical: [] };

    customers.forEach(c => {
      const days = c.daysSinceLastActivity || 0;
      const entry = { id: c.id, name: c.name, phone: c.phone, balance: c.balance, daysOverdue: days, category: c.category, score: c.score };
      if (days <= 30) buckets.current.push(entry);
      else if (days <= 60) buckets.watch.push(entry);
      else if (days <= 90) buckets.atRisk.push(entry);
      else buckets.critical.push(entry);
    });

    const totalReceivable = customers.reduce((s,c)=>s+c.balance, 0);

    return {
      totalReceivable,
      buckets,
      summary: {
        current: { count: buckets.current.length, amount: buckets.current.reduce((s,c)=>s+c.balance,0), label: '0–30 days' },
        watch: { count: buckets.watch.length, amount: buckets.watch.reduce((s,c)=>s+c.balance,0), label: '31–60 days' },
        atRisk: { count: buckets.atRisk.length, amount: buckets.atRisk.reduce((s,c)=>s+c.balance,0), label: '61–90 days' },
        critical: { count: buckets.critical.length, amount: buckets.critical.reduce((s,c)=>s+c.balance,0), label: '90+ days' }
      }
    };
  },

  // ─── INVENTORY INTELLIGENCE ────────────────────────────────────────────────
  computeInventoryInsights() {
    const products = window.iKhataStore.getProducts();
    const bills = window.iKhataStore.getBills();
    const thirtyDaysAgo = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
    const ninetyDaysAgo = new Date(Date.now() - 90*86400000).toISOString().split('T')[0];

    // Compute sales quantity per product in last 30 and 90 days
    const salesQty30 = {};
    const salesQty90 = {};

    bills.forEach(bill => {
      (bill.items || []).forEach(item => {
        if (bill.date >= thirtyDaysAgo) salesQty30[item.id] = (salesQty30[item.id] || 0) + (item.qty || 0);
        if (bill.date >= ninetyDaysAgo) salesQty90[item.id] = (salesQty90[item.id] || 0) + (item.qty || 0);
      });
    });

    const enriched = products.map(p => {
      const sold30 = salesQty30[p.id] || 0;
      const sold90 = salesQty90[p.id] || 0;
      const avgDailySales = sold90 > 0 ? Math.round((sold90 / 90) * 10) / 10 : null;
      const estimatedDaysLeft = (avgDailySales && avgDailySales > 0 && p.stock > 0) ? Math.round(p.stock / avgDailySales) : null;
      const margin = p.price > 0 ? Math.round(((p.price - (p.cost||0)) / p.price) * 100) : 0;

      return {
        ...p,
        sold30, sold90,
        avgDailySales,
        estimatedDaysLeft,
        margin,
        isFastMover: sold30 >= 5,
        isSlowMover: sold30 === 0 && p.stock > 0,
        isDeadStock: sold90 === 0 && p.stock > 0,
        isHighMargin: margin >= 25,
        isLowMargin: margin < 12 && margin >= 0,
        needsReorder: estimatedDaysLeft !== null && estimatedDaysLeft <= 7 && p.stock > 0
      };
    });

    return {
      fastMovers: enriched.filter(p => p.isFastMover).sort((a,b) => b.sold30 - a.sold30).slice(0, 5),
      slowMovers: enriched.filter(p => p.isSlowMover && !p.isDeadStock).slice(0, 5),
      deadStock: enriched.filter(p => p.isDeadStock).slice(0, 5),
      reorderNeeded: enriched.filter(p => p.needsReorder || p.stock === 0).slice(0, 5),
      highMargin: enriched.filter(p => p.isHighMargin).sort((a,b) => b.margin - a.margin).slice(0, 5),
      lowMargin: enriched.filter(p => p.isLowMargin && p.price > 0).sort((a,b) => a.margin - b.margin).slice(0, 5),
      outOfStock: enriched.filter(p => p.stock === 0),
      lowStock: enriched.filter(p => p.stock > 0 && p.stock <= (p.minStock||0)),
      all: enriched
    };
  },

  // ─── CASH FLOW ANALYSIS ────────────────────────────────────────────────────
  computeCashFlow(period = 'THIS_MONTH') {
    const bills = window.iKhataStore.getBills();
    const invoices = window.iKhataStore.getInvoices();
    const transactions = window.iKhataStore.getTransactions();
    const expenses = window.iKhataStore.getExpenses();
    const supplierTransactions = window.iKhataStore.getSupplierTransactions();

    const now = new Date();
    let filterDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    if (period === 'TODAY') filterDate = now.toISOString().split('T')[0];
    else if (period === 'THIS_QUARTER') filterDate = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1).toISOString().split('T')[0];
    else if (period === 'THIS_YEAR') filterDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    else if (period === 'ALL') filterDate = '2000-01-01';

    // MONEY IN
    const cashSales = bills.filter(b => b.date >= filterDate && b.paymentMethod !== 'Credit').reduce((s,b)=>s+(b.grandTotal||0),0);
    const creditCollections = transactions.filter(t => t.date >= filterDate && t.type === 'GOT').reduce((s,t)=>s+(t.amount||0),0);
    const invoiceCollections = invoices.filter(i => i.date >= filterDate && i.status === 'Paid').reduce((s,i)=>s+(i.total||0),0);
    const totalIn = cashSales + creditCollections;

    // MONEY OUT
    const totalExpenses = expenses.filter(e => e.date >= filterDate).reduce((s,e)=>s+(e.amount||0),0);
    const supplierPayments = supplierTransactions.filter(st => st.date >= filterDate && st.type === 'PAYMENT').reduce((s,st)=>s+(st.amount||0),0);
    const creditGiven = transactions.filter(t => t.date >= filterDate && t.type === 'GAVE').reduce((s,t)=>s+(t.amount||0),0);
    const totalOut = totalExpenses + supplierPayments;

    const netMovement = totalIn - totalOut;

    return {
      totalIn, totalOut, netMovement,
      breakdown: {
        in: { cashSales, creditCollections, invoiceCollections },
        out: { totalExpenses, supplierPayments, creditGiven }
      }
    };
  },

  // ─── AI QUERY ENGINE (Data-Grounded, No Hallucination) ────────────────────
  answerQuery(userInput) {
    const q = userInput.toLowerCase().trim();
    const bus = window.iKhataStore.getCurrentBusiness();
    const customers = window.iKhataStore.getCustomers();
    const products = window.iKhataStore.getProducts();
    const transactions = window.iKhataStore.getTransactions();
    const bills = window.iKhataStore.getBills();
    const invoices = window.iKhataStore.getInvoices();
    const expenses = window.iKhataStore.getExpenses();
    const suppliers = window.iKhataStore.getSuppliers();
    const fmt = (n) => '₹' + Number(n||0).toLocaleString('en-IN');
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date();
    const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0];

    // ── Natural language Khata entry ──────────────────────────────────────────
    if (q.includes('aaye') || q.includes('diye') || q.includes('diya') || q.includes('mile') || (q.includes('ka') && (q.includes('rupay') || q.includes('rupee')))) {
      const parsed = window.iKhataVoice.parseHinglishText(userInput);
      return {
        type: 'khata-entry',
        text: `Samjha! Maine parse kiya:\n📋 **Customer**: ${parsed.customerName}${!parsed.matchedCustomer ? ' (Naya customer)' : ' (Existing customer)'}\n${parsed.type === 'GOT' ? '💚 **Aapko mila**' : '🔴 **Aapne diya**'}: **${fmt(parsed.amount)}**\n\nKya main yeh Khata mein save kar doon?`,
        parsed,
        actionButton: `<button class="btn btn-ai btn-sm" onclick="window.iKhataVoice.confirmAndSaveVoiceEntry('${parsed.customerName}', '${parsed.type}', ${parsed.amount}, '${parsed.matchedCustomer ? parsed.matchedCustomer.id : ''}')">✅ Haan, Save Kar Do</button>`
      };
    }

    // ── Today's sales / Aaj ki sale ──────────────────────────────────────────
    if (q.includes('aaj') || q.includes('today') || (q.includes('sale') && !q.includes('last') && !q.includes('month'))) {
      const todayBills = bills.filter(b => b.date === today);
      const todayInvs = invoices.filter(i => i.date === today);
      const todaySales = todayBills.reduce((s,b)=>s+(b.grandTotal||0), 0) + todayInvs.reduce((s,i)=>s+(i.total||0),0);
      const todayCollections = transactions.filter(t=>t.date===today&&t.type==='GOT').reduce((s,t)=>s+(t.amount||0),0);
      const todayExpenses = expenses.filter(e=>e.date===today).reduce((s,e)=>s+(e.amount||0),0);
      return {
        type: 'summary',
        text: `📊 **Aaj ka Business Summary — ${bus.name}**\n\n💰 **Sales**: ${fmt(todaySales)} (${todayBills.length} bills + ${todayInvs.length} invoices)\n✅ **Collections**: ${fmt(todayCollections)}\n🔴 **Expenses**: ${fmt(todayExpenses)}\n📈 **Net Movement**: ${fmt(todaySales + todayCollections - todayExpenses)}\n\nTotal receivables pending: **${fmt(bus.toReceiveTotal)}**`
      };
    }

    // ── This month's sales / profit ──────────────────────────────────────────
    if (q.includes('month') || q.includes('mahine') || q.includes('profit') || q.includes('loss')) {
      const pnl = window.iKhataStore.getFinancialPNL('THIS_MONTH');
      return {
        type: 'pnl',
        text: `📈 **Is Month ka Financial Report — ${bus.name}**\n\n💰 **Gross Revenue**: ${fmt(pnl.grossSales)}\n🏭 **COGS (Product Cost)**: - ${fmt(pnl.cogs)}\n📊 **Gross Profit**: ${fmt(pnl.grossProfit)} (${pnl.grossMarginPct}% margin)\n🧾 **Operating Expenses**: - ${fmt(pnl.operatingExpenses)}\n✨ **Net Profit**: **${fmt(pnl.netProfit)}**\n\n${pnl.netProfit > 0 ? '🟢 Business is profitable this month!' : '🔴 Business is running at a loss. Review expenses.'}`
      };
    }

    // ── Pending / receivables / market mein paisa ─────────────────────────────
    if (q.includes('pending') || q.includes('baki') || q.includes('market') || q.includes('kiske') || q.includes('receivable') || q.includes('udhaar')) {
      const pending = customers.filter(c=>c.balance>0).sort((a,b)=>b.balance-a.balance);
      const total = pending.reduce((s,c)=>s+c.balance, 0);
      const top5 = pending.slice(0,5);
      return {
        type: 'receivables',
        text: `💰 **Aapke Total Receivables: ${fmt(total)}**\n\nTop pending customers:\n${top5.map((c,i)=>`${i+1}. **${c.name}**: ${fmt(c.balance)} (${c.daysSinceLastActivity||0} days ago)`).join('\n')}\n\n${pending.length > 5 ? `...aur ${pending.length-5} aur customers hain.` : ''}\n\n⚡ ${pending.filter(c=>(c.daysSinceLastActivity||0)>30).length} customer(s) 30+ din se payment nahi kiya.`
      };
    }

    // ── Best selling products ────────────────────────────────────────────────
    if (q.includes('best sell') || q.includes('top product') || q.includes('sabse zyada bika') || q.includes('popular')) {
      const inv = this.computeInventoryInsights();
      if (inv.fastMovers.length === 0) {
        return { type: 'info', text: '📦 Abhi tak enough sales data nahi hai best sellers determine karne ke liye. Kuch POS bills record karo.' };
      }
      return {
        type: 'products',
        text: `🏆 **Top Selling Products (Last 30 Days)**\n\n${inv.fastMovers.map((p,i)=>`${i+1}. **${p.name}** — ${p.sold30} units sold | Margin: ${p.margin}%`).join('\n')}\n\n⚡ Ensure these stay in stock!`
      };
    }

    // ── Most profitable products ─────────────────────────────────────────────
    if (q.includes('profit') && (q.includes('product') || q.includes('item'))) {
      const inv = this.computeInventoryInsights();
      return {
        type: 'products',
        text: `💎 **Highest Margin Products**\n\n${inv.highMargin.map((p,i)=>`${i+1}. **${p.name}** — ${p.margin}% margin | Price: ${fmt(p.price)}`).join('\n')}\n\n📉 **Low Margin Products** (review pricing):\n${inv.lowMargin.map((p,i)=>`${i+1}. **${p.name}** — only ${p.margin}% margin`).join('\n')}`
      };
    }

    // ── Low stock / inventory ────────────────────────────────────────────────
    if (q.includes('stock') || q.includes('inventory') || q.includes('khatam') || q.includes('low')) {
      const inv = this.computeInventoryInsights();
      const outOfStock = products.filter(p=>p.stock===0);
      const lowStock = products.filter(p=>p.stock>0&&p.stock<=(p.minStock||0));
      return {
        type: 'inventory',
        text: `📦 **Inventory Alert Report**\n\n🔴 **Out of Stock** (${outOfStock.length}): ${outOfStock.map(p=>p.name).join(', ') || 'None'}\n🟠 **Low Stock** (${lowStock.length}): ${lowStock.map(p=>`${p.name} (${p.stock} left)`).join(', ') || 'None'}\n\n${inv.reorderNeeded.length > 0 ? `⚡ Reorder urgently: ${inv.reorderNeeded.map(p=>p.name).join(', ')}` : '✅ All products have adequate stock levels.'}`
      };
    }

    // ── Overdue customers / follow-up ────────────────────────────────────────
    if (q.includes('overdue') || q.includes('follow') || q.includes('reminder') || q.includes('attention')) {
      const overdue = customers.filter(c=>c.balance>0&&(c.daysSinceLastActivity||0)>30).sort((a,b)=>b.balance-a.balance);
      if (overdue.length === 0) {
        return { type: 'positive', text: '✅ Koi bhi overdue customer nahi hai! Aapki collections on track hain.' };
      }
      return {
        type: 'followup',
        text: `⚠️ **${overdue.length} Customers Need Follow-Up**\n\n${overdue.slice(0,5).map((c,i)=>`${i+1}. **${c.name}**: ${fmt(c.balance)} | ${c.daysSinceLastActivity} din se activity nahi`).join('\n')}\n\nTotal overdue amount: **${fmt(overdue.reduce((s,c)=>s+c.balance,0))}**\n\n💡 WhatsApp reminder bhejne ke liye customer profile mein jaao.`
      };
    }

    // ── Top customers ────────────────────────────────────────────────────────
    if (q.includes('top customer') || q.includes('best customer') || q.includes('vip') || q.includes('sabse achha customer')) {
      const top = customers.sort((a,b)=>(b.totalPurchaseVol||0)-(a.totalPurchaseVol||0)).slice(0,5);
      return {
        type: 'customers',
        text: `👑 **Top 5 Customers by Business Volume**\n\n${top.map((c,i)=>`${i+1}. **${c.name}** — ${fmt(c.totalPurchaseVol||c.balance)} | ${c.category} | Score: ${c.score}/100`).join('\n')}\n\n💡 VIP customers deserve priority service and special offers!`
      };
    }

    // ── Suppliers payable ────────────────────────────────────────────────────
    if (q.includes('supplier') || q.includes('dena') || q.includes('payable') || q.includes('purchase')) {
      const totalPayable = suppliers.reduce((s,sup)=>s+(sup.balance||0),0);
      return {
        type: 'suppliers',
        text: `🏭 **Supplier Payables — ${bus.name}**\n\nTotal aapko suppliers ko dena hai: **${fmt(totalPayable)}**\n\n${suppliers.filter(s=>(s.balance||0)>0).map((s,i)=>`${i+1}. **${s.name}**: ${fmt(s.balance)} pending`).join('\n')}\n\n💡 Supplier payments on time rakhne se better credit terms milte hain.`
      };
    }

    // ── Specific customer query ─────────────────────────────────────────────
    const custNameMatch = customers.find(c => q.includes(c.name.toLowerCase().split(' ')[0].toLowerCase()) || q.includes(c.name.toLowerCase()));
    if (custNameMatch) {
      const custTx = transactions.filter(t=>t.customerId===custNameMatch.id);
      return {
        type: 'customer',
        text: `👤 **${custNameMatch.name}** ki details:\n\n💰 Current Balance: **${fmt(custNameMatch.balance)}** (${custNameMatch.balance > 0 ? 'Aapko milna hai' : custNameMatch.balance < 0 ? 'Aapko dena hai' : 'Settled'})\n📱 Phone: ${custNameMatch.phone}\n📊 Category: ${custNameMatch.category} | Score: ${custNameMatch.score}/100\n📆 Last Activity: ${custNameMatch.lastActive || 'Unknown'}\n💳 Total Transactions: ${custTx.length}\n\n${custNameMatch.balance > 0 && (custNameMatch.daysSinceLastActivity||0) > 14 ? '⚠️ Payment overdue. Consider sending a reminder.' : '✅ Account is in good standing.'}`
      };
    }

    // ── Health score ─────────────────────────────────────────────────────────
    if (q.includes('health') || q.includes('score') || q.includes('kaisa chal') || q.includes('business kaisa')) {
      const health = this.computeBusinessHealth();
      return {
        type: 'health',
        text: `📊 **${bus.name} Business Health Score: ${health.score}/100 — ${health.label}**\n\n✅ **Positives**:\n${health.positives.map(p=>`• ${p}`).join('\n')}\n\n⚠️ **Risks**:\n${health.risks.map(r=>`• ${r}`).join('\n') || 'None identified'}\n\n💡 **Improvements**:\n${health.improvements.map(i=>`• ${i}`).join('\n') || 'Maintain current performance!'}`
      };
    }

    // ── Cash flow ────────────────────────────────────────────────────────────
    if (q.includes('cash') || q.includes('flow') || q.includes('paise aaye') || q.includes('paise gaye')) {
      const cf = this.computeCashFlow('THIS_MONTH');
      return {
        type: 'cashflow',
        text: `💵 **Cash Flow — This Month**\n\n📥 **Money In**: ${fmt(cf.totalIn)}\n  • Cash Sales: ${fmt(cf.breakdown.in.cashSales)}\n  • Collections: ${fmt(cf.breakdown.in.creditCollections)}\n\n📤 **Money Out**: ${fmt(cf.totalOut)}\n  • Expenses: ${fmt(cf.breakdown.out.totalExpenses)}\n  • Supplier Payments: ${fmt(cf.breakdown.out.supplierPayments)}\n\n🔄 **Net Cash Movement**: **${fmt(cf.netMovement)}** ${cf.netMovement >= 0 ? '✅ Positive' : '🔴 Negative'}`
      };
    }

    // ── Default smart response ────────────────────────────────────────────────
    const health = this.computeBusinessHealth();
    return {
      type: 'default',
      text: `Mujhe "${userInput}" ke baare mein specifically nahi samjha, lekin yeh raha aapka quick summary:\n\n📊 Business Health: **${health.score}/100 — ${health.label}**\n💰 Receivables: **${fmt(bus.toReceiveTotal)}**\n📉 Payables: **${fmt(bus.toGiveTotal)}**\n\nAap pooch sakte hain:\n• "Aaj ki sale kitni hai?"\n• "Kaunse customers overdue hain?"\n• "Is month profit kaisa raha?"\n• "Stock mein kya kam hai?"\n• "Suppliers ko kitna dena hai?"\n• "Top customers kaun hain?"`
    };
  }
};
