/* iKhataPro Multi-Tenant Demo & Seed Data Generator — Phase 3 (Realistic Data) */

window.iKhataDemo = {
  getInitialState() {
    const today = new Date().toISOString().split('T')[0];
    const d = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

    // 1. Business Tenants
    const businesses = [
      {
        id: 'BUS_LJS', slug: 'ljs-jewellers', name: 'LJS Jewellers & General Store',
        ownerName: 'Aryan Soni', username: 'aryan', passwordHash: 'Pass123!',
        type: 'Jewellery & Retail', city: 'Mathura', state: 'Uttar Pradesh',
        address: '102 Main Market, Mathura - 281001', logo: '💎',
        gstin: '09ARYAN1234J1Z1', pan: 'ARYAN1234J',
        toReceiveTotal: 184500, toGiveTotal: 117000, todaySales: 38400, todayReceived: 21200,
        healthScore: 82, storeActive: true,
        storeTagline: 'Pure 22K Hallmark Jewellery & Premium Daily Essentials in Mathura',
        deliveryFee: 40, minOrderAmount: 300, whatsappNumber: '919216953892',
        email: 'aryan@ljsjewellers.com', mobile: '9216953892'
      },
      {
        id: 'BUS_SHARMA', slug: 'sharma-electronics', name: 'Sharma Electronics & Appliances',
        ownerName: 'Rahul Sharma', username: 'rahul', passwordHash: 'Pass123!',
        type: 'Electronics', city: 'Delhi', state: 'Delhi',
        address: '45 Connaught Place, New Delhi - 110001', logo: '⚡',
        gstin: '07RAHUL5678S1Z2', pan: 'RAHUL5678S',
        toReceiveTotal: 94000, toGiveTotal: 123000, todaySales: 65000, todayReceived: 42000,
        healthScore: 89, storeActive: true,
        storeTagline: 'Authorized Dealer for LG, Microtek & Premium Home Appliances',
        deliveryFee: 100, minOrderAmount: 1000, whatsappNumber: '919216953892',
        email: 'rahul@sharmaelectronics.com', mobile: '9999888877'
      }
    ];

    // 2. Customers — 20 for LJS, 8 for Sharma (realistic mix)
    const customers = [
      // BUS_LJS Customers — varied segments
      { id: 'c1', business_id: 'BUS_LJS', name: 'Rahul Traders', phone: '+91 98765 43210', balance: 12500, type: 'GET', lastActive: d(1), score: 87, category: 'VIP', city: 'Mathura' },
      { id: 'c2', business_id: 'BUS_LJS', name: 'Sharma General Store', phone: '+91 98123 45678', balance: 4500, type: 'GET', lastActive: today, score: 92, category: 'Regular', city: 'Mathura' },
      { id: 'c3', business_id: 'BUS_LJS', name: 'Amit Electronics', phone: '+91 97654 32109', balance: 18400, type: 'GET', lastActive: d(65), score: 55, category: 'At Risk', city: 'Delhi' },
      { id: 'c4', business_id: 'BUS_LJS', name: 'Gupta Provision', phone: '+91 96543 21098', balance: -8200, type: 'GIVE', lastActive: d(5), score: 85, category: 'Regular', city: 'Mathura' },
      { id: 'c5', business_id: 'BUS_LJS', name: 'Verma Textiles', phone: '+91 95432 10987', balance: 32000, type: 'GET', lastActive: today, score: 78, category: 'VIP', city: 'Agra' },
      { id: 'c6', business_id: 'BUS_LJS', name: 'Krishna Gold Palace', phone: '+91 94321 09876', balance: 22000, type: 'GET', lastActive: d(3), score: 82, category: 'High Value', city: 'Mathura' },
      { id: 'c7', business_id: 'BUS_LJS', name: 'Suresh Ornaments', phone: '+91 93210 98765', balance: 7800, type: 'GET', lastActive: d(7), score: 76, category: 'Regular', city: 'Vrindavan' },
      { id: 'c8', business_id: 'BUS_LJS', name: 'Patel Kirana Depot', phone: '+91 92109 87654', balance: 0, type: 'SETTLED', lastActive: d(2), score: 95, category: 'Regular', city: 'Mathura' },
      { id: 'c9', business_id: 'BUS_LJS', name: 'Bhagwati Sweet Shop', phone: '+91 91098 76543', balance: 3200, type: 'GET', lastActive: d(1), score: 90, category: 'Regular', city: 'Mathura' },
      { id: 'c10', business_id: 'BUS_LJS', name: 'Laxmi Dairy Farm', phone: '+91 90987 65432', balance: 9500, type: 'GET', lastActive: d(45), score: 60, category: 'Overdue', city: 'Mathura' },
      { id: 'c11', business_id: 'BUS_LJS', name: 'Om Prakash Hardware', phone: '+91 89876 54321', balance: 41000, type: 'GET', lastActive: d(92), score: 28, category: 'At Risk', city: 'Agra', isBadDebt: true },
      { id: 'c12', business_id: 'BUS_LJS', name: 'Meena Fashion House', phone: '+91 88765 43210', balance: 5600, type: 'GET', lastActive: d(14), score: 79, category: 'Regular', city: 'Mathura' },
      { id: 'c13', business_id: 'BUS_LJS', name: 'Sunita Electronics', phone: '+91 87654 32109', balance: 1200, type: 'GET', lastActive: d(4), score: 88, category: 'New', city: 'Delhi' },
      { id: 'c14', business_id: 'BUS_LJS', name: 'Rajesh Cloth House', phone: '+91 86543 21098', balance: 15000, type: 'GET', lastActive: d(38), score: 62, category: 'Overdue', city: 'Mathura' },
      { id: 'c15', business_id: 'BUS_LJS', name: 'Deepak Auto Parts', phone: '+91 85432 10987', balance: 0, type: 'SETTLED', lastActive: d(0), score: 96, category: 'Regular', city: 'Mathura' },
      { id: 'c16', business_id: 'BUS_LJS', name: 'Mohini Silk Sarees', phone: '+91 84321 09876', balance: -2500, type: 'GIVE', lastActive: d(8), score: 83, category: 'Regular', city: 'Agra' },
      { id: 'c17', business_id: 'BUS_LJS', name: 'Vishal Super Mart', phone: '+91 83210 98765', balance: 28000, type: 'GET', lastActive: d(80), score: 38, category: 'At Risk', city: 'Mathura' },
      { id: 'c18', business_id: 'BUS_LJS', name: 'Priya Fashion Boutique', phone: '+91 82109 87654', balance: 3800, type: 'GET', lastActive: d(6), score: 81, category: 'Regular', city: 'Mathura' },
      { id: 'c19', business_id: 'BUS_LJS', name: 'Anand Traders New', phone: '+91 81098 76543', balance: 2000, type: 'GET', lastActive: d(5), score: 91, category: 'New', city: 'Vrindavan' },
      { id: 'c20', business_id: 'BUS_LJS', name: 'Hari Om Kirana', phone: '+91 80987 65432', balance: 6700, type: 'GET', lastActive: d(10), score: 77, category: 'Regular', city: 'Mathura' },

      // BUS_SHARMA Customers
      { id: 'cs1', business_id: 'BUS_SHARMA', name: 'Vijay Sales Mathura', phone: '+91 91111 22222', balance: 42000, type: 'GET', lastActive: today, score: 94, category: 'VIP', city: 'Mathura' },
      { id: 'cs2', business_id: 'BUS_SHARMA', name: 'Bright Light Electricals', phone: '+91 92222 33333', balance: 28000, type: 'GET', lastActive: d(1), score: 81, category: 'Regular', city: 'Delhi' },
      { id: 'cs3', business_id: 'BUS_SHARMA', name: 'Rakesh Tech Services', phone: '+91 93333 44444', balance: 24000, type: 'GET', lastActive: d(3), score: 76, category: 'Regular', city: 'Delhi' },
      { id: 'cs4', business_id: 'BUS_SHARMA', name: 'Modern Electronics Hub', phone: '+91 94444 55555', balance: 0, type: 'SETTLED', lastActive: d(2), score: 98, category: 'VIP', city: 'Delhi' },
      { id: 'cs5', business_id: 'BUS_SHARMA', name: 'Deepa Home Appliances', phone: '+91 95555 66666', balance: 15000, type: 'GET', lastActive: d(55), score: 50, category: 'Overdue', city: 'Noida' }
    ];

    // 3. Products — 15 for LJS, 8 for Sharma
    const products = [
      // BUS_LJS Products
      { id: 'p1', business_id: 'BUS_LJS', name: 'Gold Coin 24K 5g', price: 38500, cost: 35000, stock: 12, minStock: 3, category: 'Jewellery', sku: 'SKU-GLD-01', barcode: '8901234567890', isOnlineVisible: true, description: 'Certified 999 Purity Hallmark Gold Coin', imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&q=80' },
      { id: 'p2', business_id: 'BUS_LJS', name: 'Silver Payal 100g', price: 8500, cost: 7200, stock: 4, minStock: 8, category: 'Jewellery', sku: 'SKU-SLV-02', barcode: '8901234567891', isOnlineVisible: true, description: 'Traditional Pure Silver Anklet set', imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&q=80' },
      { id: 'p3', business_id: 'BUS_LJS', name: 'Basmati Rice Premium 5kg', price: 450, cost: 380, stock: 24, minStock: 10, category: 'Grocery', sku: 'SKU-RIC-01', barcode: '8901234567892', isOnlineVisible: true, description: 'Long Grain Aged Royal Basmati Rice', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80' },
      { id: 'p4', business_id: 'BUS_LJS', name: 'Gold Ring 22K 3g', price: 24000, cost: 21500, stock: 8, minStock: 2, category: 'Jewellery', sku: 'SKU-GLD-02', barcode: '8901234567893', isOnlineVisible: true, description: 'Hallmark BIS 916 Gold Ring', imageUrl: 'https://images.unsplash.com/photo-1603561596112-0a132b757442?w=400&q=80' },
      { id: 'p5', business_id: 'BUS_LJS', name: 'Toor Dal 1kg', price: 145, cost: 120, stock: 60, minStock: 20, category: 'Grocery', sku: 'SKU-DAL-01', barcode: '8901234567894', isOnlineVisible: true, description: 'Premium Masoor / Toor Dal Grade A', imageUrl: '' },
      { id: 'p6', business_id: 'BUS_LJS', name: 'Mustard Oil 1L', price: 185, cost: 155, stock: 30, minStock: 15, category: 'Grocery', sku: 'SKU-OIL-01', barcode: '8901234567895', isOnlineVisible: true, description: 'Kachi Ghani Pure Mustard Oil', imageUrl: '' },
      { id: 'p7', business_id: 'BUS_LJS', name: 'Silver Chain 50g', price: 4200, cost: 3500, stock: 0, minStock: 5, category: 'Jewellery', sku: 'SKU-SLV-03', barcode: '8901234567896', isOnlineVisible: false, description: 'Sterling Silver 925 Chain', imageUrl: '' },
      { id: 'p8', business_id: 'BUS_LJS', name: 'Wheat Flour Atta 10kg', price: 380, cost: 320, stock: 18, minStock: 10, category: 'Grocery', sku: 'SKU-ATT-01', barcode: '8901234567897', isOnlineVisible: true, description: 'Chakki Fresh Atta 100% Whole Wheat', imageUrl: '' },
      { id: 'p9', business_id: 'BUS_LJS', name: 'Diamond Pendant Set', price: 85000, cost: 75000, stock: 3, minStock: 1, category: 'Jewellery', sku: 'SKU-DIA-01', barcode: '8901234567898', isOnlineVisible: true, description: 'Solitaire Diamond Pendant with 18K chain', imageUrl: '' },
      { id: 'p10', business_id: 'BUS_LJS', name: 'Ghee Pure Cow 500g', price: 320, cost: 265, stock: 25, minStock: 12, category: 'Grocery', sku: 'SKU-GHE-01', barcode: '8901234567899', isOnlineVisible: true, description: 'A2 Cow Ghee Pure Vedic Process', imageUrl: '' },
      { id: 'p11', business_id: 'BUS_LJS', name: 'Gold Bangle Set 18K', price: 52000, cost: 46000, stock: 5, minStock: 2, category: 'Jewellery', sku: 'SKU-BAN-01', barcode: '8901234567900', isOnlineVisible: true, description: 'Machine Cut 18K Gold Bangle Pair', imageUrl: '' },
      { id: 'p12', business_id: 'BUS_LJS', name: 'Sugar 5kg', price: 210, cost: 175, stock: 45, minStock: 20, category: 'Grocery', sku: 'SKU-SUG-01', barcode: '8901234567901', isOnlineVisible: true, description: 'Double Refined White Sugar', imageUrl: '' },
      { id: 'p13', business_id: 'BUS_LJS', name: 'Silver Glass Set (6pc)', price: 2800, cost: 2200, stock: 2, minStock: 4, category: 'Silverware', sku: 'SKU-SLV-04', barcode: '8901234567902', isOnlineVisible: true, description: 'Pure 999 Silver Drinking Glass Set', imageUrl: '' },
      { id: 'p14', business_id: 'BUS_LJS', name: 'Nariyal Pani (Coconut Water)', price: 35, cost: 22, stock: 80, minStock: 30, category: 'Beverages', sku: 'SKU-COC-01', barcode: '8901234567903', isOnlineVisible: true, description: 'Fresh packaged tender coconut water', imageUrl: '' },
      { id: 'p15', business_id: 'BUS_LJS', name: 'Pulses Mix Pack (Assorted)', price: 680, cost: 550, stock: 0, minStock: 8, category: 'Grocery', sku: 'SKU-PUL-01', barcode: '8901234567904', isOnlineVisible: false, description: 'Assorted Dal Gift Pack 4-in-1', imageUrl: '' },

      // BUS_SHARMA Products
      { id: 'ps1', business_id: 'BUS_SHARMA', name: 'LG Smart LED TV 43 Inch', price: 28990, cost: 24000, stock: 8, minStock: 2, category: 'Televisions', sku: 'SKU-TV-43', barcode: '8909876543210', isOnlineVisible: true, description: '4K Ultra HD Smart WebOS TV with Dolby Audio', imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&q=80' },
      { id: 'ps2', business_id: 'BUS_SHARMA', name: 'Microtek Inverter 1050VA', price: 6800, cost: 5500, stock: 15, minStock: 4, category: 'Power', sku: 'SKU-INV-01', barcode: '8909876543211', isOnlineVisible: true, description: 'Digital Heavy Duty Sine Wave Inverter', imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80' },
      { id: 'ps3', business_id: 'BUS_SHARMA', name: 'LG Refrigerator 260L', price: 24500, cost: 20800, stock: 4, minStock: 2, category: 'Refrigerators', sku: 'SKU-REF-01', barcode: '8909876543212', isOnlineVisible: true, description: 'Frost Free Double Door Smart Inverter Compressor', imageUrl: '' },
      { id: 'ps4', business_id: 'BUS_SHARMA', name: 'Ceiling Fan Havells 1200mm', price: 2800, cost: 2200, stock: 22, minStock: 5, category: 'Fans', sku: 'SKU-FAN-01', barcode: '8909876543213', isOnlineVisible: true, description: 'BLDC Motor Energy Saving Premium Ceiling Fan', imageUrl: '' },
      { id: 'ps5', business_id: 'BUS_SHARMA', name: 'Tubelight LED 20W', price: 280, cost: 210, stock: 1, minStock: 10, category: 'Lighting', sku: 'SKU-LED-01', barcode: '8909876543214', isOnlineVisible: true, description: 'Philips Batten LED Light 6500K', imageUrl: '' },
      { id: 'ps6', business_id: 'BUS_SHARMA', name: 'Washing Machine LG 7kg', price: 18500, cost: 15800, stock: 3, minStock: 1, category: 'Appliances', sku: 'SKU-WM-01', barcode: '8909876543215', isOnlineVisible: true, description: 'Top Load Fully Automatic with TurboDrum', imageUrl: '' }
    ];

    // 4. Transactions — 40+ entries spread over 90 days for LJS
    const transactions = [
      // LJS - Recent activity
      { id: 't1', business_id: 'BUS_LJS', customerId: 'c1', customerName: 'Rahul Traders', type: 'GAVE', amount: 15000, date: d(1), time: '10:30 AM', note: 'Gold coin purchase on credit', mode: 'Credit/Khata' },
      { id: 't2', business_id: 'BUS_LJS', customerId: 'c1', customerName: 'Rahul Traders', type: 'GOT', amount: 8000, date: d(2), time: '04:15 PM', note: 'UPI Payment received', mode: 'UPI' },
      { id: 't3', business_id: 'BUS_LJS', customerId: 'c1', customerName: 'Rahul Traders', type: 'GAVE', amount: 5500, date: d(8), time: '11:00 AM', note: 'Silver set on credit', mode: 'Credit/Khata' },
      { id: 't4', business_id: 'BUS_LJS', customerId: 'c2', customerName: 'Sharma General Store', type: 'GAVE', amount: 4500, date: today, time: '09:45 AM', note: 'Grocery goods supplied', mode: 'Credit/Khata' },
      { id: 't5', business_id: 'BUS_LJS', customerId: 'c3', customerName: 'Amit Electronics', type: 'GAVE', amount: 20000, date: d(70), time: '02:00 PM', note: 'Gold ring purchase', mode: 'Credit/Khata' },
      { id: 't6', business_id: 'BUS_LJS', customerId: 'c3', customerName: 'Amit Electronics', type: 'GOT', amount: 5000, date: d(65), time: '11:30 AM', note: 'Partial payment', mode: 'Cash' },
      { id: 't7', business_id: 'BUS_LJS', customerId: 'c3', customerName: 'Amit Electronics', type: 'GAVE', amount: 3400, date: d(65), time: '04:00 PM', note: 'Additional items', mode: 'Credit/Khata' },
      { id: 't8', business_id: 'BUS_LJS', customerId: 'c5', customerName: 'Verma Textiles', type: 'GAVE', amount: 50000, date: d(30), time: '10:00 AM', note: 'Diamond pendant wholesale', mode: 'Credit/Khata' },
      { id: 't9', business_id: 'BUS_LJS', customerId: 'c5', customerName: 'Verma Textiles', type: 'GOT', amount: 18000, date: d(20), time: '03:30 PM', note: 'Bank transfer received', mode: 'Bank Transfer' },
      { id: 't10', business_id: 'BUS_LJS', customerId: 'c5', customerName: 'Verma Textiles', type: 'GOT', amount: 32000, date: today, time: '11:00 AM', note: 'Cheque cleared', mode: 'Cheque' },
      { id: 't11', business_id: 'BUS_LJS', customerId: 'c6', customerName: 'Krishna Gold Palace', type: 'GAVE', amount: 45000, date: d(15), time: '10:30 AM', note: 'Wholesale gold coin order', mode: 'Credit/Khata' },
      { id: 't12', business_id: 'BUS_LJS', customerId: 'c6', customerName: 'Krishna Gold Palace', type: 'GOT', amount: 23000, date: d(3), time: '05:00 PM', note: 'NEFT received', mode: 'Bank Transfer' },
      { id: 't13', business_id: 'BUS_LJS', customerId: 'c7', customerName: 'Suresh Ornaments', type: 'GAVE', amount: 12000, date: d(12), time: '09:00 AM', note: 'Silver ornaments supplied', mode: 'Credit/Khata' },
      { id: 't14', business_id: 'BUS_LJS', customerId: 'c7', customerName: 'Suresh Ornaments', type: 'GOT', amount: 4200, date: d(7), time: '04:30 PM', note: 'GPay payment', mode: 'UPI' },
      { id: 't15', business_id: 'BUS_LJS', customerId: 'c8', customerName: 'Patel Kirana Depot', type: 'GAVE', amount: 8500, date: d(25), time: '10:00 AM', note: 'Grocery items', mode: 'Credit/Khata' },
      { id: 't16', business_id: 'BUS_LJS', customerId: 'c8', customerName: 'Patel Kirana Depot', type: 'GOT', amount: 8500, date: d(2), time: '12:00 PM', note: 'Full settlement', mode: 'Cash' },
      { id: 't17', business_id: 'BUS_LJS', customerId: 'c9', customerName: 'Bhagwati Sweet Shop', type: 'GAVE', amount: 5000, date: d(10), time: '08:30 AM', note: 'Festival gift items', mode: 'Credit/Khata' },
      { id: 't18', business_id: 'BUS_LJS', customerId: 'c9', customerName: 'Bhagwati Sweet Shop', type: 'GOT', amount: 1800, date: d(1), time: '06:00 PM', note: 'Partial payment', mode: 'UPI' },
      { id: 't19', business_id: 'BUS_LJS', customerId: 'c10', customerName: 'Laxmi Dairy Farm', type: 'GAVE', amount: 9500, date: d(50), time: '11:00 AM', note: 'Silver utensils on credit', mode: 'Credit/Khata' },
      { id: 't20', business_id: 'BUS_LJS', customerId: 'c11', customerName: 'Om Prakash Hardware', type: 'GAVE', amount: 41000, date: d(100), time: '10:00 AM', note: 'Bulk gold purchase', mode: 'Credit/Khata' },
      { id: 't21', business_id: 'BUS_LJS', customerId: 'c12', customerName: 'Meena Fashion House', type: 'GAVE', amount: 8000, date: d(20), time: '03:00 PM', note: 'Silver jewellery set', mode: 'Credit/Khata' },
      { id: 't22', business_id: 'BUS_LJS', customerId: 'c12', customerName: 'Meena Fashion House', type: 'GOT', amount: 2400, date: d(14), time: '05:00 PM', note: 'Partial payment', mode: 'Cash' },
      { id: 't23', business_id: 'BUS_LJS', customerId: 'c13', customerName: 'Sunita Electronics', type: 'GAVE', amount: 1200, date: d(4), time: '02:30 PM', note: 'First order - grocery items', mode: 'Credit/Khata' },
      { id: 't24', business_id: 'BUS_LJS', customerId: 'c14', customerName: 'Rajesh Cloth House', type: 'GAVE', amount: 20000, date: d(42), time: '10:00 AM', note: 'Diwali advance stock', mode: 'Credit/Khata' },
      { id: 't25', business_id: 'BUS_LJS', customerId: 'c14', customerName: 'Rajesh Cloth House', type: 'GOT', amount: 5000, date: d(38), time: '04:00 PM', note: 'Part payment', mode: 'Cash' },
      { id: 't26', business_id: 'BUS_LJS', customerId: 'c15', customerName: 'Deepak Auto Parts', type: 'GAVE', amount: 6000, date: d(15), time: '09:30 AM', note: 'Monthly grocery supply', mode: 'Credit/Khata' },
      { id: 't27', business_id: 'BUS_LJS', customerId: 'c15', customerName: 'Deepak Auto Parts', type: 'GOT', amount: 6000, date: today, time: '10:00 AM', note: 'Full monthly settlement', mode: 'UPI' },
      { id: 't28', business_id: 'BUS_LJS', customerId: 'c16', customerName: 'Mohini Silk Sarees', type: 'GOT', amount: 12500, date: d(8), time: '11:00 AM', note: 'Advance payment received', mode: 'Bank Transfer' },
      { id: 't29', business_id: 'BUS_LJS', customerId: 'c16', customerName: 'Mohini Silk Sarees', type: 'GAVE', amount: 10000, date: d(5), time: '02:00 PM', note: 'Silver items supplied', mode: 'Credit/Khata' },
      { id: 't30', business_id: 'BUS_LJS', customerId: 'c17', customerName: 'Vishal Super Mart', type: 'GAVE', amount: 35000, date: d(85), time: '10:00 AM', note: 'Wholesale gold purchase', mode: 'Credit/Khata' },
      { id: 't31', business_id: 'BUS_LJS', customerId: 'c17', customerName: 'Vishal Super Mart', type: 'GOT', amount: 7000, date: d(80), time: '06:00 PM', note: 'Partial cash payment', mode: 'Cash' },
      { id: 't32', business_id: 'BUS_LJS', customerId: 'c18', customerName: 'Priya Fashion Boutique', type: 'GAVE', amount: 6000, date: d(12), time: '03:00 PM', note: 'Silver bangles on credit', mode: 'Credit/Khata' },
      { id: 't33', business_id: 'BUS_LJS', customerId: 'c18', customerName: 'Priya Fashion Boutique', type: 'GOT', amount: 2200, date: d(6), time: '05:30 PM', note: 'UPI partial payment', mode: 'UPI' },
      { id: 't34', business_id: 'BUS_LJS', customerId: 'c19', customerName: 'Anand Traders New', type: 'GAVE', amount: 2000, date: d(5), time: '11:30 AM', note: 'First purchase - grocery', mode: 'Credit/Khata' },
      { id: 't35', business_id: 'BUS_LJS', customerId: 'c20', customerName: 'Hari Om Kirana', type: 'GAVE', amount: 9800, date: d(18), time: '10:00 AM', note: 'Monthly grocery supply', mode: 'Credit/Khata' },
      { id: 't36', business_id: 'BUS_LJS', customerId: 'c20', customerName: 'Hari Om Kirana', type: 'GOT', amount: 3100, date: d(10), time: '04:00 PM', note: 'Cash partial payment', mode: 'Cash' },
      { id: 't37', business_id: 'BUS_LJS', customerId: 'c4', customerName: 'Gupta Provision', type: 'GOT', amount: 12000, date: d(5), time: '02:00 PM', note: 'Advance payment received', mode: 'Bank Transfer' },
      { id: 't38', business_id: 'BUS_LJS', customerId: 'c4', customerName: 'Gupta Provision', type: 'GAVE', amount: 3800, date: d(3), time: '11:00 AM', note: 'Goods supplied against advance', mode: 'Credit/Khata' },

      // SHARMA transactions
      { id: 'ts1', business_id: 'BUS_SHARMA', customerId: 'cs1', customerName: 'Vijay Sales Mathura', type: 'GOT', amount: 42000, date: today, time: '11:00 AM', note: 'Bank Transfer for LED TVs', mode: 'Bank Transfer' },
      { id: 'ts2', business_id: 'BUS_SHARMA', customerId: 'cs1', customerName: 'Vijay Sales Mathura', type: 'GAVE', amount: 84000, date: d(5), time: '10:30 AM', note: 'Bulk TV & Appliance supply', mode: 'Credit/Khata' },
      { id: 'ts3', business_id: 'BUS_SHARMA', customerId: 'cs2', customerName: 'Bright Light Electricals', type: 'GAVE', amount: 28000, date: d(3), time: '09:00 AM', note: 'LED & Inverter supply', mode: 'Credit/Khata' },
      { id: 'ts4', business_id: 'BUS_SHARMA', customerId: 'cs3', customerName: 'Rakesh Tech Services', type: 'GAVE', amount: 24000, date: d(4), time: '02:00 PM', note: 'Washing machines wholesale', mode: 'Credit/Khata' },
      { id: 'ts5', business_id: 'BUS_SHARMA', customerId: 'cs5', customerName: 'Deepa Home Appliances', type: 'GAVE', amount: 15000, date: d(60), time: '11:00 AM', note: 'Appliances on credit', mode: 'Credit/Khata' }
    ];

    // 5. Bills (POS Sales) — 15 bills for LJS
    const bills = [
      { id: 'BILL-001', business_id: 'BUS_LJS', customerId: 'c2', customerName: 'Sharma General Store', items: [{ id: 'p3', name: 'Basmati Rice Premium 5kg', price: 450, qty: 3, total: 1350 }, { id: 'p5', name: 'Toor Dal 1kg', price: 145, qty: 4, total: 580 }], subtotal: 1930, taxAmt: 0, discount: 0, grandTotal: 1930, paymentMethod: 'Cash', date: today, time: '09:30 AM', createdAt: new Date().toISOString() },
      { id: 'BILL-002', business_id: 'BUS_LJS', customerId: 'c1', customerName: 'Rahul Traders', items: [{ id: 'p1', name: 'Gold Coin 24K 5g', price: 38500, qty: 1, total: 38500 }], subtotal: 38500, taxAmt: 0, discount: 0, grandTotal: 38500, paymentMethod: 'Credit', date: today, time: '10:30 AM', createdAt: new Date().toISOString() },
      { id: 'BILL-003', business_id: 'BUS_LJS', customerId: null, customerName: 'Walk-in Customer', items: [{ id: 'p6', name: 'Mustard Oil 1L', price: 185, qty: 2, total: 370 }, { id: 'p10', name: 'Ghee Pure Cow 500g', price: 320, qty: 1, total: 320 }], subtotal: 690, taxAmt: 0, discount: 0, grandTotal: 690, paymentMethod: 'UPI', date: d(1), time: '11:00 AM', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'BILL-004', business_id: 'BUS_LJS', customerId: 'c9', customerName: 'Bhagwati Sweet Shop', items: [{ id: 'p12', name: 'Sugar 5kg', price: 210, qty: 5, total: 1050 }, { id: 'p5', name: 'Toor Dal 1kg', price: 145, qty: 3, total: 435 }], subtotal: 1485, taxAmt: 0, discount: 50, grandTotal: 1435, paymentMethod: 'Credit', date: d(1), time: '03:00 PM', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'BILL-005', business_id: 'BUS_LJS', customerId: 'c5', customerName: 'Verma Textiles', items: [{ id: 'p4', name: 'Gold Ring 22K 3g', price: 24000, qty: 2, total: 48000 }], subtotal: 48000, taxAmt: 0, discount: 2000, grandTotal: 46000, paymentMethod: 'Cheque', date: d(3), time: '10:00 AM', createdAt: new Date(Date.now() - 3*86400000).toISOString() },
      { id: 'BILL-006', business_id: 'BUS_LJS', customerId: null, customerName: 'Walk-in Customer', items: [{ id: 'p14', name: 'Nariyal Pani', price: 35, qty: 12, total: 420 }], subtotal: 420, taxAmt: 0, discount: 0, grandTotal: 420, paymentMethod: 'Cash', date: d(2), time: '12:30 PM', createdAt: new Date(Date.now() - 2*86400000).toISOString() },
      { id: 'BILL-007', business_id: 'BUS_LJS', customerId: 'c6', customerName: 'Krishna Gold Palace', items: [{ id: 'p11', name: 'Gold Bangle Set 18K', price: 52000, qty: 1, total: 52000 }], subtotal: 52000, taxAmt: 0, discount: 0, grandTotal: 52000, paymentMethod: 'Bank Transfer', date: d(5), time: '11:30 AM', createdAt: new Date(Date.now() - 5*86400000).toISOString() },
      { id: 'BILL-008', business_id: 'BUS_LJS', customerId: 'c20', customerName: 'Hari Om Kirana', items: [{ id: 'p3', name: 'Basmati Rice Premium 5kg', price: 450, qty: 4, total: 1800 }, { id: 'p8', name: 'Wheat Flour Atta 10kg', price: 380, qty: 2, total: 760 }], subtotal: 2560, taxAmt: 0, discount: 0, grandTotal: 2560, paymentMethod: 'Credit', date: d(10), time: '10:00 AM', createdAt: new Date(Date.now() - 10*86400000).toISOString() },
      { id: 'BILL-009', business_id: 'BUS_LJS', customerId: 'c18', customerName: 'Priya Fashion Boutique', items: [{ id: 'p2', name: 'Silver Payal 100g', price: 8500, qty: 1, total: 8500 }], subtotal: 8500, taxAmt: 0, discount: 0, grandTotal: 8500, paymentMethod: 'Credit', date: d(7), time: '04:00 PM', createdAt: new Date(Date.now() - 7*86400000).toISOString() },
      { id: 'BILL-010', business_id: 'BUS_LJS', customerId: 'c7', customerName: 'Suresh Ornaments', items: [{ id: 'p13', name: 'Silver Glass Set (6pc)', price: 2800, qty: 2, total: 5600 }], subtotal: 5600, taxAmt: 0, discount: 0, grandTotal: 5600, paymentMethod: 'Credit', date: d(12), time: '01:30 PM', createdAt: new Date(Date.now() - 12*86400000).toISOString() },
      { id: 'BILL-011', business_id: 'BUS_LJS', customerId: null, customerName: 'Walk-in Customer', items: [{ id: 'p6', name: 'Mustard Oil 1L', price: 185, qty: 4, total: 740 }, { id: 'p12', name: 'Sugar 5kg', price: 210, qty: 2, total: 420 }], subtotal: 1160, taxAmt: 0, discount: 0, grandTotal: 1160, paymentMethod: 'Cash', date: d(4), time: '09:00 AM', createdAt: new Date(Date.now() - 4*86400000).toISOString() },
      { id: 'BILL-012', business_id: 'BUS_LJS', customerId: 'c9', customerName: 'Bhagwati Sweet Shop', items: [{ id: 'p10', name: 'Ghee Pure Cow 500g', price: 320, qty: 4, total: 1280 }], subtotal: 1280, taxAmt: 0, discount: 0, grandTotal: 1280, paymentMethod: 'UPI', date: d(6), time: '08:00 AM', createdAt: new Date(Date.now() - 6*86400000).toISOString() },

      // SHARMA bills
      { id: 'BILL-S01', business_id: 'BUS_SHARMA', customerId: 'cs1', customerName: 'Vijay Sales Mathura', items: [{ id: 'ps1', name: 'LG Smart LED TV 43 Inch', price: 28990, qty: 2, total: 57980 }], subtotal: 57980, taxAmt: 0, discount: 2000, grandTotal: 55980, paymentMethod: 'Credit', date: d(5), time: '11:00 AM', createdAt: new Date(Date.now() - 5*86400000).toISOString() },
      { id: 'BILL-S02', business_id: 'BUS_SHARMA', customerId: 'cs2', customerName: 'Bright Light Electricals', items: [{ id: 'ps2', name: 'Microtek Inverter 1050VA', price: 6800, qty: 4, total: 27200 }], subtotal: 27200, taxAmt: 0, discount: 0, grandTotal: 27200, paymentMethod: 'Credit', date: d(3), time: '10:00 AM', createdAt: new Date(Date.now() - 3*86400000).toISOString() },
      { id: 'BILL-S03', business_id: 'BUS_SHARMA', customerId: null, customerName: 'Walk-in Customer', items: [{ id: 'ps5', name: 'Tubelight LED 20W', price: 280, qty: 10, total: 2800 }], subtotal: 2800, taxAmt: 0, discount: 0, grandTotal: 2800, paymentMethod: 'Cash', date: today, time: '02:00 PM', createdAt: new Date().toISOString() }
    ];

    // 6. Invoices (GST Invoices) — 8 invoices for LJS
    const invoices = [
      {
        id: 'INV-1001', business_id: 'BUS_LJS', customerId: 'c5', customerName: 'Verma Textiles',
        customerPhone: '+91 95432 10987', customerGSTIN: '09VRTEX1234V1Z5',
        billingAddress: 'Agra, UP', date: d(3), dueDate: d(-7), status: 'Paid',
        taxType: 'INTRA', items: [{ name: 'Diamond Pendant Set', hsn: '7113', qty: 1, unit: 'Pcs', rate: 75000, discount: 0, taxRate: 3, taxableVal: 75000, cgst: 1125, sgst: 1125, igst: 0, total: 77250 }],
        subtotal: 75000, discountTotal: 0, taxableTotal: 75000, cgstTotal: 1125, sgstTotal: 1125, igstTotal: 0, taxTotal: 2250, roundOff: 0, total: 77250, note: 'Payment via NEFT'
      },
      {
        id: 'INV-1002', business_id: 'BUS_LJS', customerId: 'c1', customerName: 'Rahul Traders',
        customerPhone: '+91 98765 43210', customerGSTIN: '',
        billingAddress: 'Mathura', date: d(1), dueDate: d(-14), status: 'Pending',
        taxType: 'INTRA', items: [{ name: 'Gold Coin 24K 5g', hsn: '7108', qty: 2, unit: 'Pcs', rate: 38500, discount: 0, taxRate: 3, taxableVal: 77000, cgst: 1155, sgst: 1155, igst: 0, total: 79310 }],
        subtotal: 77000, discountTotal: 0, taxableTotal: 77000, cgstTotal: 1155, sgstTotal: 1155, igstTotal: 0, taxTotal: 2310, roundOff: 0, total: 79310, note: 'Credit invoice - 15 day term'
      },
      {
        id: 'INV-1003', business_id: 'BUS_LJS', customerId: 'c6', customerName: 'Krishna Gold Palace',
        customerPhone: '+91 94321 09876', customerGSTIN: '09KRGLD5678K1Z2',
        billingAddress: 'Mathura', date: d(10), dueDate: d(-5), status: 'Overdue',
        taxType: 'INTRA', items: [{ name: 'Gold Bangle Set 18K', hsn: '7113', qty: 2, unit: 'Set', rate: 52000, discount: 2000, taxRate: 3, taxableVal: 102000, cgst: 1530, sgst: 1530, igst: 0, total: 105060 }],
        subtotal: 104000, discountTotal: 2000, taxableTotal: 102000, cgstTotal: 1530, sgstTotal: 1530, igstTotal: 0, taxTotal: 3060, roundOff: 0, total: 105060, note: 'Overdue payment needed'
      },
      {
        id: 'INV-2001', business_id: 'BUS_SHARMA', customerId: 'cs1', customerName: 'Vijay Sales Mathura',
        customerPhone: '+91 91111 22222', customerGSTIN: '09VIJAY1234V1Z8',
        billingAddress: 'Mathura', date: today, dueDate: d(-30), status: 'Paid',
        taxType: 'INTRA', items: [{ name: 'LG Smart LED TV 43 Inch', hsn: '8528', qty: 3, unit: 'Pcs', rate: 28990, discount: 3000, taxRate: 18, taxableVal: 83970, cgst: 7557.3, sgst: 7557.3, igst: 0, total: 99084.6 }],
        subtotal: 86970, discountTotal: 3000, taxableTotal: 83970, cgstTotal: 7557, sgstTotal: 7557, igstTotal: 0, taxTotal: 15114, roundOff: 0, total: 99084, note: 'Bulk dealer order'
      }
    ];

    // 7. Expenses — 10+ for LJS
    const expenses = [
      { id: 'e1', business_id: 'BUS_LJS', category: 'Rent', amount: 35000, date: d(1), note: 'Shop Monthly Rent - Mathura Main Market' },
      { id: 'e2', business_id: 'BUS_LJS', category: 'Salary', amount: 18000, date: d(2), note: 'Staff Salary - Kamal Verma (October)' },
      { id: 'e3', business_id: 'BUS_LJS', category: 'Electricity', amount: 4800, date: d(5), note: 'PVVNL Electricity Bill October' },
      { id: 'e4', business_id: 'BUS_LJS', category: 'Transport', amount: 1200, date: d(3), note: 'Goods delivery via tempo' },
      { id: 'e5', business_id: 'BUS_LJS', category: 'Marketing', amount: 2500, date: d(8), note: 'Festival newspaper advertisement' },
      { id: 'e6', business_id: 'BUS_LJS', category: 'Maintenance', amount: 800, note: 'AC servicing & cleaning', date: d(15) },
      { id: 'e7', business_id: 'BUS_LJS', category: 'Packaging', amount: 1500, date: d(10), note: 'Festive gift boxes & carry bags' },
      { id: 'e8', business_id: 'BUS_LJS', category: 'Salary', amount: 12000, date: d(30), note: 'Helper staff wages September' },
      { id: 'e9', business_id: 'BUS_LJS', category: 'Rent', amount: 35000, date: d(32), note: 'Shop Rent September' },
      { id: 'e10', business_id: 'BUS_LJS', category: 'Electricity', amount: 3600, date: d(35), note: 'Electricity September' },
      // SHARMA expenses
      { id: 'es1', business_id: 'BUS_SHARMA', category: 'Electricity', amount: 12400, date: d(3), note: 'Commercial Showroom Electricity' },
      { id: 'es2', business_id: 'BUS_SHARMA', category: 'Rent', amount: 65000, date: d(2), note: 'Showroom Rent - Connaught Place' },
      { id: 'es3', business_id: 'BUS_SHARMA', category: 'Salary', amount: 45000, date: d(1), note: 'Sales Staff 3 employees' }
    ];

    // 8. Suppliers
    const suppliers = [
      { id: 's1', business_id: 'BUS_LJS', name: 'ABC Wholesale Distributors', businessName: 'ABC Bullion & Wholesale Ltd', phone: '+91 98111 22233', email: 'abc.wholesalers@gmail.com', address: 'Chandni Chowk, Delhi - 110006', gstin: '07ABCDE1234F1Z9', pan: 'ABCDE1234F', category: 'Gold & Bullion', balance: 45000, notes: 'Primary supplier for 24K Gold coins and bullion bars.', totalPurchases: 285000, totalPayments: 240000, lastTransaction: d(1), createdAt: '2026-01-15', active: true },
      { id: 's2', business_id: 'BUS_LJS', name: 'Shree Ram Silver Mart', businessName: 'Shree Ram Ornaments Wholesalers', phone: '+91 98222 33344', email: 'shreeram.silver@yahoo.com', address: 'Sarafa Bazar, Agra - 282003', gstin: '09SRSRM5678G1Z2', pan: 'SRSRM5678G', category: 'Silver Ornaments', balance: 27000, notes: 'Supplier for traditional silver payals and utensils.', totalPurchases: 145000, totalPayments: 118000, lastTransaction: d(2), createdAt: '2026-02-01', active: true },
      { id: 's3', business_id: 'BUS_LJS', name: 'Agro Traders Wholesale', businessName: 'Agro Mathura Distributors Pvt Ltd', phone: '+91 97333 44455', email: 'agro.mathura@gmail.com', address: 'Grain Mandi, Mathura - 281001', gstin: '09AGRTD1234A1Z5', pan: 'AGRTD1234A', category: 'Grocery & FMCG', balance: 8500, notes: 'Monthly grocery and FMCG goods supplier', totalPurchases: 96000, totalPayments: 87500, lastTransaction: d(5), createdAt: '2026-03-10', active: true },
      { id: 'ss1', business_id: 'BUS_SHARMA', name: 'LG India Electronics Dist', businessName: 'LG Electronics North India Regional Dist', phone: '+91 98999 88877', email: 'orders.north@lgdistributor.com', address: 'Sector 62, Noida - 201301', gstin: '09LGEIN9999P1Z4', pan: 'LGEIN9999P', category: 'Consumer Electronics', balance: 85000, notes: 'Official LG Brand Distributor for Delhi-NCR.', totalPurchases: 650000, totalPayments: 565000, lastTransaction: today, createdAt: '2026-01-10', active: true },
      { id: 'ss2', business_id: 'BUS_SHARMA', name: 'Microtek Power Systems', businessName: 'Microtek International Pvt Ltd', phone: '+91 11 4111 9999', email: 'dealers@microtek.in', address: 'Okhla Industrial Area, Delhi - 110020', gstin: '07MCRTK5555M1Z8', pan: 'MCRTK5555M', category: 'Power Electronics', balance: 38000, notes: 'Authorized Microtek distributor', totalPurchases: 280000, totalPayments: 242000, lastTransaction: d(7), createdAt: '2026-02-15', active: true }
    ];

    // 9. Purchases
    const purchases = [
      { id: 'PO-9001', business_id: 'BUS_LJS', supplierId: 's1', supplierName: 'ABC Wholesale Distributors', date: d(1), items: [{ productId: 'p1', name: 'Gold Coin 24K 5g', qty: 5, cost: 35000, total: 175000 }], subtotal: 175000, taxAmt: 5250, grandTotal: 180250, paidAmount: 135250, status: 'PARTIAL', isReturn: false, note: 'Batch #GLD-2026-08' },
      { id: 'PO-9002', business_id: 'BUS_LJS', supplierId: 's2', supplierName: 'Shree Ram Silver Mart', date: d(2), items: [{ productId: 'p2', name: 'Silver Payal 100g', qty: 8, cost: 7200, total: 57600 }], subtotal: 57600, taxAmt: 0, grandTotal: 57600, paidAmount: 30600, status: 'PARTIAL', isReturn: false, note: 'Festival season silver restock' },
      { id: 'PO-9003', business_id: 'BUS_LJS', supplierId: 's3', supplierName: 'Agro Traders Wholesale', date: d(5), items: [{ productId: 'p3', name: 'Basmati Rice Premium 5kg', qty: 30, cost: 380, total: 11400 }, { productId: 'p12', name: 'Sugar 5kg', qty: 20, cost: 175, total: 3500 }], subtotal: 14900, taxAmt: 745, grandTotal: 15645, paidAmount: 15645, status: 'PAID', isReturn: false, note: 'Monthly grocery restock' },
      { id: 'PO-4002', business_id: 'BUS_SHARMA', supplierId: 'ss1', supplierName: 'LG India Electronics Dist', date: today, items: [{ productId: 'ps1', name: 'LG Smart LED TV 43 Inch', qty: 4, cost: 24000, total: 96000 }], subtotal: 96000, taxAmt: 17280, grandTotal: 113280, paidAmount: 113280, status: 'PAID', isReturn: false, note: 'Invoice LG-DEL-882' }
    ];

    // 10. Supplier Transactions
    const supplierTransactions = [
      { id: 'st_1', business_id: 'BUS_LJS', supplierId: 's1', supplierName: 'ABC Wholesale Distributors', type: 'PURCHASE', amount: 180250, date: d(1), refNo: 'PO-9001', note: 'Gold Coins Batch Purchase' },
      { id: 'st_2', business_id: 'BUS_LJS', supplierId: 's1', supplierName: 'ABC Wholesale Distributors', type: 'PAYMENT', amount: 135250, date: d(1), refNo: 'UPI-982142', note: 'Payment via UPI' },
      { id: 'st_3', business_id: 'BUS_LJS', supplierId: 's2', supplierName: 'Shree Ram Silver Mart', type: 'PURCHASE', amount: 57600, date: d(2), refNo: 'PO-9002', note: 'Silver Payal Restock' },
      { id: 'st_4', business_id: 'BUS_LJS', supplierId: 's2', supplierName: 'Shree Ram Silver Mart', type: 'PAYMENT', amount: 30600, date: d(2), refNo: 'CASH-0082', note: 'Cash payment partial' },
      { id: 'st_5', business_id: 'BUS_LJS', supplierId: 's3', supplierName: 'Agro Traders Wholesale', type: 'PURCHASE', amount: 15645, date: d(5), refNo: 'PO-9003', note: 'Grocery monthly stock' },
      { id: 'st_6', business_id: 'BUS_LJS', supplierId: 's3', supplierName: 'Agro Traders Wholesale', type: 'PAYMENT', amount: 15645, date: d(5), refNo: 'NEFT-00125', note: 'Full payment NEFT' },
      { id: 'st_7', business_id: 'BUS_SHARMA', supplierId: 'ss1', supplierName: 'LG India Electronics Dist', type: 'PURCHASE', amount: 113280, date: today, refNo: 'PO-4002', note: 'TV Purchase LG' },
      { id: 'st_8', business_id: 'BUS_SHARMA', supplierId: 'ss1', supplierName: 'LG India Electronics Dist', type: 'PAYMENT', amount: 113280, date: today, refNo: 'RTGS-889901', note: 'RTGS payment full' }
    ];

    // 11. Employees
    const employees = [
      { id: 'emp1', business_id: 'BUS_LJS', name: 'Aryan Soni', role: 'Owner', phone: '+91 99999 11111', sales: 485000, collections: 390000, active: true },
      { id: 'emp2', business_id: 'BUS_LJS', name: 'Kamal Verma', role: 'Manager', phone: '+91 98888 22222', sales: 245000, collections: 210000, active: true },
      { id: 'emps1', business_id: 'BUS_SHARMA', name: 'Rahul Sharma', role: 'Owner', phone: '+91 97777 66666', sales: 650000, collections: 580000, active: true }
    ];

    // 12. Audit Logs
    const auditLogs = [
      { id: 'aud_1', business_id: 'BUS_LJS', action: 'SUPPLIER_CREATED', entity: 'Supplier', entityId: 's1', details: 'Added ABC Wholesale Distributors', timestamp: new Date(Date.now() - 30*86400000).toISOString() },
      { id: 'aud_2', business_id: 'BUS_LJS', action: 'PURCHASE_CREATED', entity: 'Purchase', entityId: 'PO-9001', details: 'Logged Purchase PO-9001 (₹1,80,250)', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'aud_3', business_id: 'BUS_LJS', action: 'INVOICE_CREATED', entity: 'Invoice', entityId: 'INV-1002', details: 'GST Invoice for Rahul Traders ₹79,310', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'aud_4', business_id: 'BUS_LJS', action: 'SUPPLIER_PAYMENT', entity: 'Supplier', entityId: 's1', details: 'Paid ₹1,35,250 to ABC Wholesale via UPI', timestamp: new Date(Date.now() - 86400000).toISOString() }
    ];

    return {
      businesses, customers, products, transactions, invoices,
      expenses, suppliers, purchases, supplierTransactions,
      employees, auditLogs, bills: bills,
      currentSession: {
        isAuthenticated: true,
        user: { name: 'Aryan Soni', username: 'aryan' },
        businessId: 'BUS_LJS',
        workspaceSlug: 'ljs-jewellers'
      }
    };
  }
};
