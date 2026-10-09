const http = require('http');

function postJSON(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- TESTING STAFF CREATION API ---');
  const createRes = await postJSON('/api/staff', {
    shopId: 'SHOP-10892',
    name: 'Suresh Sharma',
    phone: '9123456789',
    role: 'Sales Executive'
  });
  console.log('Create Staff Status:', createRes.status);
  console.log('Create Staff Body:', createRes.body);

  const staff = createRes.body.staff;

  console.log('\n--- TESTING VALID STAFF LOGIN API ---');
  const loginRes = await postJSON('/api/auth/staff-login', {
    shopId: 'SHOP-10892',
    staffUserId: staff.username,
    passcode: staff.passcode
  });
  console.log('Valid Login Status:', loginRes.status);
  console.log('Valid Login Body:', loginRes.body);

  console.log('\n--- TESTING INVALID STAFF LOGIN API ---');
  const invalidLoginRes = await postJSON('/api/auth/staff-login', {
    shopId: 'SHOP-10892',
    staffUserId: staff.username,
    passcode: 'wrongpass'
  });
  console.log('Invalid Login Status:', invalidLoginRes.status);
  console.log('Invalid Login Body:', invalidLoginRes.body);

  console.log('\n--- TESTING OWNER PIN VERIFICATION API ---');
  const ownerPinRes = await postJSON('/api/auth/verify-owner-pin', {
    pin: '1234',
    shopId: 'SHOP-10892'
  });
  console.log('Owner PIN Status:', ownerPinRes.status);
  console.log('Owner PIN Body:', ownerPinRes.body);
}

runTests().catch(console.error);
